// Fiscal quarter mapping (April = Q1 start)
export const QUARTER_MONTHS = {
  1: [4, 5, 6],
  2: [7, 8, 9],
  3: [10, 11, 12],
  4: [1, 2, 3],
}

export const QUARTER_LABELS = {
  1: 'Q1 — Apr to Jun',
  2: 'Q2 — Jul to Sep',
  3: 'Q3 — Oct to Dec',
  4: 'Q4 — Jan to Mar',
}

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const ROLES = ['CMD', 'VP', 'HR', 'Manager', 'Employee']

export const ROLE_HIERARCHY = {
  CMD: 5, VP: 4, HR: 3, Manager: 2, Employee: 1,
}

// Who gives feedback to whom
export const FEEDBACK_GIVER_MAP = {
  VP: 'CMD',
  HR: 'VP',
  Manager: 'VP',
  Employee: 'Manager',
}

// Who can approve goals submitted by a given role
export const APPROVAL_CHAIN = {
  Employee: 'Manager',
  Manager: 'VP',
  HR: 'VP',
  VP: 'CMD',
}

export const GOAL_STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled']

export const RATING_LABELS = {
  0: '—',
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Excellent',
}

export const RATING_COLORS = {
  0: '',
  1: '#FEE2E2',
  2: '#FEF3C7',
  3: '#FEF9C3',
  4: '#DCFCE7',
}

export const STATUS_COLORS = {
  Active: '#3B82F6',
  Completed: '#10B981',
  'On Hold': '#F59E0B',
  Cancelled: '#EF4444',
}

// Stale-time for React Query caches (ms)
export const CACHE_TIMES = {
  USERS: 5 * 60 * 1000,       // 5 min
  GOALS: 60 * 1000,            // 1 min
  NOTIFICATIONS: 30 * 1000,    // 30s
  FEEDBACK: 2 * 60 * 1000,     // 2 min
}

export const PAGE_SIZE = 50

export function getFiscalQuarter(month) {
  if (month >= 4 && month <= 6) return 1
  if (month >= 7 && month <= 9) return 2
  if (month >= 10 && month <= 12) return 3
  return 4 // Jan–Mar
}

export function calcProgress(achievement, target) {
  if (achievement == null || target == null) return 0
  const a = parseFloat(String(achievement).replace(/[^0-9.-]/g, ''))
  const t = parseFloat(String(target).replace(/[^0-9.-]/g, ''))
  if (isNaN(a) || isNaN(t) || t === 0) return 0
  return Math.min(100, (a / t) * 100)
}

export function progressVariant(p) {
  if (p >= 100) return 'success'
  if (p >= 60) return 'warning'
  return 'danger'
}