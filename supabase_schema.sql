-- ============================================================
-- PMS — Performance Management System
-- Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── EXTENSIONS ──
create extension if not exists "uuid-ossp";

-- ── USERS ──
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text not null unique,
  password      text not null,
  role          text not null check (role in ('CMD','VP','HR','Manager','Employee')),
  designation   text,
  department    text,
  manager_id    uuid references users(id) on delete set null,
  joining_date  date,
  exit_date     date,
  created_at    timestamptz default now()
);

create index if not exists idx_users_email       on users(email);
create index if not exists idx_users_role        on users(role);
create index if not exists idx_users_manager_id  on users(manager_id);

-- ── GOALS ──
create table if not exists goals (
  goal_id                   uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references users(id) on delete cascade,
  year                      int  not null,
  quarter                   int  check (quarter between 1 and 4),
  month                     int  check (month between 1 and 12),
  week                      int  check (week between 1 and 5),

  department                text,
  goal_title                text not null,
  goal_description          text,
  kpi                       text,

  -- Targets
  monthly_target            numeric default 0,
  week1_target              numeric default 0,
  week2_target              numeric default 0,
  week3_target              numeric default 0,
  week4_target              numeric default 0,

  -- Achievements (actual)
  monthly_achievement       numeric,
  week1_achievement         numeric,
  week2_achievement         numeric,
  week3_achievement         numeric,
  week4_achievement         numeric,

  -- Ratings
  week1_rating              int default 0 check (week1_rating between 0 and 4),
  week2_rating              int default 0 check (week2_rating between 0 and 4),
  week3_rating              int default 0 check (week3_rating between 0 and 4),
  week4_rating              int default 0 check (week4_rating between 0 and 4),

  -- Achievements (pending employee submission)
  monthly_achievement_pending   numeric,
  week1_achievement_pending     numeric,
  week2_achievement_pending     numeric,
  week3_achievement_pending     numeric,
  week4_achievement_pending     numeric,
  week1_rating_pending          int default 0,
  week2_rating_pending          int default 0,
  week3_rating_pending          int default 0,
  week4_rating_pending          int default 0,
  achievement_approval_status   text default 'none' check (achievement_approval_status in ('none','pending','approved','rejected')),
  achievement_approved_by       uuid references users(id),
  achievement_approved_at       timestamptz,
  achievement_rejection_reason  text,

  -- Goal approval
  approval_status           text default 'approved' check (approval_status in ('pending','approved','rejected')),
  approved_by               uuid references users(id),
  approved_by_name          text,
  approved_at               timestamptz,
  rejected_by               uuid references users(id),
  rejected_at               timestamptz,
  rejection_reason          text,

  -- Lifecycle
  status                    text default 'Active' check (status in ('Active','Completed','On Hold','Cancelled')),
  start_date                date,
  end_date                  date,
  completed_at              timestamptz,
  completion_remarks        text,

  created_by                uuid references users(id),
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create index if not exists idx_goals_user_id       on goals(user_id);
create index if not exists idx_goals_year_month    on goals(year, month);
create index if not exists idx_goals_approval      on goals(approval_status);
create index if not exists idx_goals_status        on goals(status);
create index if not exists idx_goals_user_period   on goals(user_id, year, quarter, month);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists goals_updated_at on goals;
create trigger goals_updated_at
  before update on goals
  for each row execute function update_updated_at();

-- ── FEEDBACK ──
create table if not exists feedback (
  feedback_id    uuid primary key default uuid_generate_v4(),
  goal_id        uuid not null references goals(goal_id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  feedback_by    uuid not null references users(id),
  feedback_type  text not null check (feedback_type in ('Manager Feedback','VP Feedback','CMD Feedback','HR Feedback','Self Appraisal')),
  rating         int  not null check (rating between 1 and 5),
  comment        text not null,
  level          text default 'month',
  created_at     timestamptz default now()
);

create index if not exists idx_feedback_goal_id  on feedback(goal_id);
create index if not exists idx_feedback_user_id  on feedback(user_id);
create index if not exists idx_feedback_by       on feedback(feedback_by);

-- ── FEEDBACK REPLIES ──
create table if not exists feedback_replies (
  id           uuid primary key default uuid_generate_v4(),
  feedback_id  uuid not null references feedback(feedback_id) on delete cascade,
  reply_by     uuid not null references users(id),
  reply_text   text not null,
  created_at   timestamptz default now()
);

create index if not exists idx_feedback_replies_feedback_id on feedback_replies(feedback_id);

-- ── NOTIFICATIONS ──
create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references users(id) on delete cascade,
  action_by       uuid references users(id),
  action_by_name  text,
  action_type     text not null,
  details         text,
  is_read         boolean default false,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_notifications_user_id   on notifications(user_id);
create index if not exists idx_notifications_is_read   on notifications(user_id, is_read);
create index if not exists idx_notifications_created   on notifications(created_at desc);

-- ── PASSWORD RESETS ──
create table if not exists password_resets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  used        boolean default false,
  created_at  timestamptz default now()
);

create index if not exists idx_password_resets_token on password_resets(token);

-- ── TEAM RANKINGS (optional, for ranking history) ──
create table if not exists team_rankings (
  id              uuid primary key default uuid_generate_v4(),
  manager_id      uuid not null references users(id) on delete cascade,
  employee_id     uuid not null references users(id) on delete cascade,
  year            int  not null,
  month           int  not null,
  rank            int,
  total_goals     int  default 0,
  completed_goals int  default 0,
  completion_rate numeric default 0,
  avg_progress    numeric default 0,
  score           numeric default 0,
  created_at      timestamptz default now(),
  unique (manager_id, employee_id, year, month)
);

-- ── ROW LEVEL SECURITY ──
-- Enable RLS on all tables
alter table users           enable row level security;
alter table goals           enable row level security;
alter table feedback        enable row level security;
alter table feedback_replies enable row level security;
alter table notifications   enable row level security;
alter table password_resets enable row level security;

-- For the PMS app we use the anon key + application-level auth (password stored in users table).
-- We grant full access to the anon role so the app can do all operations.
-- In production you should switch to Supabase Auth + proper RLS policies.

create policy "full_access_users"           on users           for all using (true) with check (true);
create policy "full_access_goals"           on goals           for all using (true) with check (true);
create policy "full_access_feedback"        on feedback        for all using (true) with check (true);
create policy "full_access_feedback_replies" on feedback_replies for all using (true) with check (true);
create policy "full_access_notifications"   on notifications   for all using (true) with check (true);
create policy "full_access_password_resets" on password_resets for all using (true) with check (true);

-- ── SEED DATA — Demo accounts ──
insert into users (id, name, email, password, role, designation, department) values
  ('11111111-1111-1111-1111-111111111111', 'Arjun Mehta',   'cmd@pms.com', 'pass', 'CMD',      'Chief Managing Director', 'EXECUTIVE'),
  ('22222222-2222-2222-2222-222222222222', 'Priya Sharma',  'vp@pms.com',  'pass', 'VP',       'Vice President',          'OPERATIONS'),
  ('33333333-3333-3333-3333-333333333333', 'Ravi Kumar',    'hr@pms.com',  'pass', 'HR',       'HR Manager',              'HUMAN RESOURCES'),
  ('44444444-4444-4444-4444-444444444444', 'Sneha Patel',   'mgr@pms.com', 'pass', 'Manager',  'Team Manager',            'SALES'),
  ('55555555-5555-5555-5555-555555555555', 'Amit Singh',    'emp@pms.com', 'pass', 'Employee', 'Sales Executive',         'SALES'),
  ('66666666-6666-6666-6666-666666666666', 'Kavya Reddy',   'emp2@pms.com','pass', 'Employee', 'Marketing Analyst',       'MARKETING'),
  ('77777777-7777-7777-7777-777777777777', 'Rahul Gupta',   'emp3@pms.com','pass', 'Employee', 'Frontend Developer',      'TECH')
on conflict (email) do nothing;

-- Set manager assignments
update users set manager_id = '11111111-1111-1111-1111-111111111111' where email = 'vp@pms.com';
update users set manager_id = '22222222-2222-2222-2222-222222222222' where email = 'hr@pms.com';
update users set manager_id = '22222222-2222-2222-2222-222222222222' where email = 'mgr@pms.com';
update users set manager_id = '44444444-4444-4444-4444-444444444444' where email in ('emp@pms.com','emp2@pms.com','emp3@pms.com');

-- Seed some goals
insert into goals (user_id, year, quarter, month, department, goal_title, kpi, monthly_target,
  week1_target, week2_target, week3_target, week4_target,
  week1_achievement, week2_achievement, week3_achievement, week4_achievement, monthly_achievement,
  week1_rating, week2_rating, week3_rating, week4_rating,
  start_date, end_date, status, approval_status)
values
  ('55555555-5555-5555-5555-555555555555', 2025, 4, 1, 'SALES', 'Q1 Sales Revenue', 'Revenue (₹ Lakhs)',
   40, 10, 10, 10, 10, 12, 9, 11, 8, 40, 4, 3, 4, 3,
   '2025-01-01', '2025-01-31', 'Completed', 'approved'),

  ('55555555-5555-5555-5555-555555555555', 2025, 4, 2, 'SALES', 'Client Acquisition', 'New Clients',
   8, 2, 2, 2, 2, 3, null, null, null, null, 0, 0, 0, 0,
   '2025-02-01', '2025-02-28', 'Active', 'approved'),

  ('66666666-6666-6666-6666-666666666666', 2025, 4, 1, 'MARKETING', 'Lead Generation', 'Qualified Leads',
   120, 30, 30, 30, 30, 35, 28, 32, 30, 125, 4, 3, 4, 4,
   '2025-01-01', '2025-01-31', 'Completed', 'approved'),

  ('44444444-4444-4444-4444-444444444444', 2025, 4, 1, 'SALES', 'Team Revenue Target', 'Team Revenue (₹ Lakhs)',
   100, 25, 25, 25, 25, 28, 22, 26, 24, 100, 4, 3, 4, 3,
   '2025-01-01', '2025-01-31', 'Completed', 'approved')
on conflict do nothing;

-- Seed feedback
insert into feedback (goal_id, user_id, feedback_by, feedback_type, rating, comment)
select g.goal_id, g.user_id, '44444444-4444-4444-4444-444444444444', 'Manager Feedback', 4,
  'Excellent performance! Target achieved consistently across all weeks.'
from goals g where g.goal_title = 'Q1 Sales Revenue' and g.user_id = '55555555-5555-5555-5555-555555555555'
on conflict do nothing;

-- Seed notifications
insert into notifications (user_id, action_by, action_by_name, action_type, details, is_read)
values
  ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'Amit Singh',
   'goal_created', 'Amit Singh created a new goal: Client Acquisition (Pending Approval)', false),
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Sneha Patel',
   'goal_approved', 'Your goal Q1 Sales Revenue has been approved', true)
on conflict do nothing;
