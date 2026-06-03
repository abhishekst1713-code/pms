import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = join(__dirname, '..', '.env')

// ── Parse .env manually ───────────────────────────────────────
const env = {}
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '').trim()
    env[key] = val
  })
}

// ── Hard-code keys directly (since .env parsing is unreliable) ─
// Copy your exact values from test.js that worked
const SUPABASE_URL              = env.SUPABASE_URL              || env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const SMTP_HOST                 = env.SMTP_HOST
const SMTP_PORT                 = env.SMTP_PORT   || '587'
const SMTP_SECURE               = env.SMTP_SECURE || 'false'
const SMTP_USER                 = env.SMTP_USER
const SMTP_PASS                 = env.SMTP_PASS
const APP_URL                   = env.APP_URL     || 'http://localhost:5173'

console.log('── Config ──────────────────────────────')
console.log('SUPABASE_URL             :', SUPABASE_URL       ? '✅ ' + SUPABASE_URL : '❌ missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ ' + SUPABASE_SERVICE_ROLE_KEY.slice(0,30) + '...' : '❌ missing')
console.log('SMTP_HOST                :', SMTP_HOST          ? '✅ ' + SMTP_HOST    : '❌ missing')
console.log('SMTP_USER                :', SMTP_USER          ? '✅ ' + SMTP_USER    : '❌ missing')
console.log('SMTP_PASS                :', SMTP_PASS          ? '✅ set'             : '❌ missing')
console.log('────────────────────────────────────────\n')

const missing = []
if (!SUPABASE_URL)              missing.push('SUPABASE_URL')
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (!SMTP_HOST)                 missing.push('SMTP_HOST')
if (!SMTP_USER)                 missing.push('SMTP_USER')
if (!SMTP_PASS)                 missing.push('SMTP_PASS')

if (missing.length) {
  console.error('❌ Still missing:', missing.join(', '))
  console.error('   Open your .env file and make sure these keys exist with no extra spaces.')
  process.exit(1)
}

// ── Clients ───────────────────────────────────────────────────
const supabase    = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const transporter = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   parseInt(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
})

const MONTHS = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December']

function buildHTML({ name, role, monthName, year, appUrl }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Top accent bar -->
  <tr><td style="background:#2563EB;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid #F1F5F9;">
    <div style="width:56px;height:56px;background:#EFF6FF;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
      <span style="font-size:26px;">📋</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Goal Sheet Reminder</h1>
    <p style="margin:0;font-size:14px;color:#64748B;font-weight:500;">${monthName} ${year} &nbsp;·&nbsp; Performance Management</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 48px;">
    <p style="margin:0 0 6px;font-size:16px;color:#0F172A;font-weight:600;">Hi ${name},</p>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">
      This is a reminder to update your <strong style="color:#0F172A;">${monthName} ${year}</strong> goal sheet before the month ends. Keeping your goals up to date helps your manager and leadership track progress accurately.
    </p>

    <!-- Checklist -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:32px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;">What to update</p>
        ${[
          'Weekly achievements (W1 – W4)',
          'Monthly achievement total',
          'Mark completed goals as Completed',
          'Review any overdue goals',
        ].map(item => `
        <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td style="width:22px;vertical-align:top;padding-top:1px;">
              <div style="width:18px;height:18px;background:#DBEAFE;border-radius:5px;text-align:center;line-height:18px;font-size:11px;color:#2563EB;font-weight:700;">✓</div>
            </td>
            <td style="font-size:14px;color:#334155;padding-left:10px;line-height:1.5;">${item}</td>
          </tr>
        </table>`).join('')}
      </td></tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td align="center">
        <a href="${appUrl}/my-goals" style="display:inline-block;background:#2563EB;color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.1px;">
          Update My Goal Sheet →
        </a>
      </td></tr>
    </table>

    <!-- Warning note -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:4px;background:#FCD34D;border-radius:4px;">&nbsp;</td>
        <td style="padding:12px 16px;font-size:13px;color:#78350F;line-height:1.6;">
          Please complete your updates by <strong>end of ${monthName}</strong>. Late submissions may affect your monthly performance review.
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 48px;border-top:1px solid #F1F5F9;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;">
      ${role} &nbsp;·&nbsp; Performance Management System<br>
      This is an automated reminder. Please do not reply to this email.
    </p>
  </td></tr>

  <!-- Bottom accent bar -->
  <tr><td style="background:#2563EB;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

</table>
</td></tr></table>
</body></html>`
}

function buildTopPerformerHTML({ name, role, department, monthName, year, goals, completed, avgProgress, appUrl }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Top accent bar -->
  <tr><td style="background:linear-gradient(90deg,#B45309,#D97706,#F59E0B);height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid #F1F5F9;">
    <div style="width:64px;height:64px;background:#FEF3C7;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
      <span style="font-size:32px;">🏆</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Top Performer — ${monthName} ${year}</h1>
    <p style="margin:0;font-size:14px;color:#64748B;font-weight:500;">Outstanding performance recognition</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 48px;">
    <p style="margin:0 0 6px;font-size:16px;color:#0F172A;font-weight:600;">Congratulations, ${name}! 🎉</p>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">
      You have been recognised as the <strong style="color:#0F172A;">Top Performer for ${monthName} ${year}</strong>. Your dedication and results this month stand out across the entire organisation. This is a well-deserved recognition.
    </p>

    <!-- Stats card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin-bottom:32px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.08em;">Your ${monthName} Performance</p>
        ${[
          { icon: '🎯', label: 'Goals Set',     value: goals,              color: '#0F172A' },
          { icon: '✅', label: 'Completed',      value: completed,          color: '#059669' },
          { icon: '📈', label: 'Avg Progress',   value: avgProgress + '%',  color: '#2563EB' },
          { icon: '🏢', label: 'Department',     value: department || '—',  color: '#92400E' },
        ].map((s, i, arr) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="${i < arr.length - 1 ? 'border-bottom:1px solid #FDE68A;' : ''}padding:10px 0;margin:0;">
          <tr>
            <td style="font-size:14px;color:#78350F;padding:8px 0;">
              ${s.icon} &nbsp; ${s.label}
            </td>
            <td style="font-size:15px;font-weight:700;color:${s.color};text-align:right;padding:8px 0;">
              ${s.value}
            </td>
          </tr>
        </table>`).join('')}
      </td></tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td align="center">
        <a href="${appUrl}" style="display:inline-block;background:#D97706;color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.1px;">
          View My Dashboard →
        </a>
      </td></tr>
    </table>

    <!-- Closing note -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:4px;background:#D97706;border-radius:4px;">&nbsp;</td>
        <td style="padding:12px 16px;font-size:13px;color:#78350F;line-height:1.6;">
          Keep up the excellent work. Your consistency and commitment set a great example for the entire team.
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 48px;border-top:1px solid #F1F5F9;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;">
      ${role} &nbsp;·&nbsp; Performance Management System<br>
      This is an automated recognition email. Please do not reply.
    </p>
  </td></tr>

  <!-- Bottom accent bar -->
  <tr><td style="background:linear-gradient(90deg,#B45309,#D97706,#F59E0B);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

</table>
</td></tr></table>
</body></html>`
}


async function sendTopPerformer() {
  const now   = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const monthName = MONTHS[month]

  console.log(`\n🏆 Calculating top performer for ${monthName} ${year}...`)

  // Fetch all goals for this month
  const { data: goals, error: gErr } = await supabase
    .from('goals')
    .select('user_id, monthly_target, monthly_achievement, status')
    .eq('year', year)
    .eq('month', month)
    .neq('approval_status', 'pending')

  if (gErr || !goals?.length) {
    console.log('⚠️  No goals found for this month, skipping top performer email.')
    return
  }

  // Fetch all non-admin users with emails
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, name, email, role, department')
    .neq('role', 'Admin')
    .eq('is_active', true)
    .not('email', 'is', null)
    .neq('email', '')

  if (uErr || !users?.length) {
    console.log('⚠️  No active users found.')
    return
  }

  // Score each user
  const scored = users.map(u => {
    const ug = goals.filter(g => g.user_id === u.id)
    if (!ug.length) return null

    const completed = ug.filter(g => g.status === 'Completed').length
    const avgProgress = ug.reduce((a, g) => {
      const t = parseFloat(g.monthly_target)  || 0
      const v = parseFloat(g.monthly_achievement) || 0
      if (!t) return a
      return a + Math.min((v / t) * 100, 100)
    }, 0) / ug.length

    const compRate = (completed / ug.length) * 100
    const score    = avgProgress * 0.5 + compRate * 0.5

    return {
      user: u,
      goals: ug.length,
      completed,
      avgProgress: +avgProgress.toFixed(1),
      score,
    }
  }).filter(Boolean).sort((a, b) => b.score - a.score)

  if (!scored.length) {
    console.log('⚠️  No users with goals this month.')
    return
  }

  const winner = scored[0]
  console.log(`🥇 Top performer: ${winner.user.name} (score: ${winner.score.toFixed(1)})`)

  // CC list = all other users (excluding winner)
  const ccEmails = users
    .filter(u => u.id !== winner.user.id && u.email)
    .map(u => u.email)
    .join(', ')

  // Send to winner, CC everyone else
  try {
    await transporter.sendMail({
      from:    `"PMS Recognition" <${SMTP_USER}>`,
      to:      winner.user.email,
      cc:      ccEmails,
      subject: `🏆 Top Performer of ${monthName} ${year} — ${winner.user.name}`,
      html:    buildTopPerformerHTML({
        name:        winner.user.name,
        role:        winner.user.role,
        department:  winner.user.department,
        monthName,
        year,
        goals:       winner.goals,
        completed:   winner.completed,
        avgProgress: winner.avgProgress,
        appUrl:      APP_URL,
      }),
    })

    // Save in-app notification for all users
    const notifRows = users.map(u => ({
      user_id:        u.id,
      action_by:      null,
      action_by_name: 'System',
      action_type:    'top_performer',
      details:        `🏆 ${winner.user.name} is the Top Performer for ${monthName} ${year} with ${winner.avgProgress}% avg progress and ${winner.completed}/${winner.goals} goals completed!`,
      is_read:        false,
      created_at:     new Date().toISOString(),
    }))
    await supabase.from('notifications').insert(notifRows)

    console.log(`  ✅ Email sent to ${winner.user.email}, CC'd ${ccEmails.split(',').length} others`)
  } catch (err) {
    console.error(`  ❌ Failed: ${err.message}`)
  }
}

async function main() {
  const now       = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  const month     = now.getMonth() + 1
  const year      = now.getFullYear()
  const monthName = MONTHS[month]

  console.log(`📧 Sending ${monthName} ${year} reminders...\n`)


  // Check if emails are enabled in admin settings
  const { data: mailSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'mail_enabled')
    .single()

  if (mailSetting?.value === 'false') {
    console.log('⏸  Emails are disabled in Admin → Mail Settings. Skipping.')
    process.exit(0)
  }

  // Fetch users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .not('email', 'is', null)
    .neq('email', '')

  if (error) {
    console.error('❌ DB error:', error.message)
    process.exit(1)
  }

  if (!users?.length) {
    console.log('⚠️  No users with email found in database')
    process.exit(0)
  }

  console.log(`Found ${users.length} user(s)\n`)

  let sent = 0, failed = 0
  for (const user of users) {
    try {
      await transporter.sendMail({
        from:    `"PMS Reminder" <${SMTP_USER}>`,
        to:      user.email,
        subject: `Reminder: Update Your ${monthName} ${year} Goal Sheet`,
        html:    buildHTML({ name: user.name, role: user.role, monthName, year, appUrl: APP_URL }),
      })
      await supabase.from('notifications').insert({
        user_id: user.id, action_by: null, action_by_name: 'System',
        action_type: 'monthly_reminder',
        details: `Reminder: Please update your ${monthName} ${year} goal sheet before month end.`,
        is_read: false, created_at: new Date().toISOString(),
      })
      console.log(`  ✅  ${user.name} <${user.email}>`)
      sent++
    } catch (err) {
      console.error(`  ❌  ${user.name} <${user.email}> — ${err.message}`)
      failed++
    }
  }

  console.log(`\n──────────────────────────`)
  console.log(`✅ Sent:   ${sent}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📅 Month:  ${monthName} ${year}`)
  console.log(`──────────────────────────\n`)
}

async function sendTestReminder(targetEmail) {
  const now       = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  const month     = now.getMonth() + 1
  const year      = now.getFullYear()
  const monthName = MONTHS[month]

  console.log(`\n🧪 TEST: Sending reminder to ${targetEmail}...`)

  const { data: user } = await supabase
    .from('users').select('name, role').eq('email', targetEmail).single()

  if (!user) {
    console.error(`❌ No user found with email: ${targetEmail}`)
    process.exit(1)
  }

  await transporter.sendMail({
    from:    `"PMS Reminder [TEST]" <${SMTP_USER}>`,
    to:      targetEmail,
    subject: `[TEST] Reminder: Update Your ${monthName} ${year} Goal Sheet`,
    html:    buildHTML({ name: user.name, role: user.role, monthName, year, appUrl: APP_URL }),
  })
  console.log(`✅ Test reminder sent to ${targetEmail}`)
}

async function sendTestTopPerformer(targetEmail) {
  const now       = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  const month     = now.getMonth() + 1
  const year      = now.getFullYear()
  const monthName = MONTHS[month]

  console.log(`\n🧪 TEST: Sending top performer email to ${targetEmail}...`)

  const { data: user } = await supabase
    .from('users').select('name, role, department').eq('email', targetEmail).single()

  if (!user) {
    console.error(`❌ No user found with email: ${targetEmail}`)
    process.exit(1)
  }

  await transporter.sendMail({
    from:    `"PMS Recognition [TEST]" <${SMTP_USER}>`,
    to:      targetEmail,
    subject: `[TEST] 🏆 Top Performer of ${monthName} ${year} — ${user.name}`,
    html:    buildTopPerformerHTML({
      name:        user.name,
      role:        user.role,
      department:  user.department,
      monthName,
      year,
      goals:       8,
      completed:   6,
      avgProgress: 87.5,
      appUrl:      APP_URL,
    }),
  })
  console.log(`✅ Test top performer email sent to ${targetEmail}`)
}

// Determine what to run based on CLI arg:
// node send-monthly-reminder.js          → sends reminder emails (run on 26th)
// node send-monthly-reminder.js top      → sends top performer email (run on last day)
const mode        = process.argv[2]
const testEmail   = process.argv[3]  // e.g. node script.js test-reminder someone@email.com

async function run() {
  // Verify SMTP first for all modes
  try {
    await transporter.verify()
    console.log('✅ SMTP connected\n')
  } catch (err) {
    console.error('❌ SMTP failed:', err.message)
    process.exit(1)
  }

  if (mode === 'test-reminder') {
    if (!testEmail) { console.error('❌ Usage: node script.js test-reminder <email>'); process.exit(1) }
    await sendTestReminder(testEmail)

  } else if (mode === 'test-top') {
    if (!testEmail) { console.error('❌ Usage: node script.js test-top <email>'); process.exit(1) }
    await sendTestTopPerformer(testEmail)

  } else if (mode === 'top') {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'mail_enabled').single()
    if (data?.value === 'false') { console.log('⏸  Emails disabled. Skipping.'); process.exit(0) }
    await sendTopPerformer()

  } else {
    // Default: full reminder run (checks mail_enabled)
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'mail_enabled').single()
    if (data?.value === 'false') { console.log('⏸  Emails disabled. Skipping.'); process.exit(0) }
    await main()
  }
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1) })