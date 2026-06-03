import cron from 'node-cron'
import { supabase } from '../lib/supabase.js'   // your existing supabase client
import { sendGoalReminderEmail } from '../lib/email.js'

// Runs at 9:00 AM on the 26th of every month
// Format: minute hour day month weekday
cron.schedule('0 9 26 * *', async () => {
  console.log('[GoalReminder] Running monthly reminder job...')

  try {
    const today     = new Date()
    const month     = today.getMonth() + 1
    const year      = today.getFullYear()

    // 1. Fetch all active employees
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .neq('role', 'Admin')

    if (error) throw error

    // 2. Get all HR emails for CC
    const hrEmails = users
      .filter(u => u.role === 'HR')
      .map(u => u.email)
      .filter(Boolean)

    // 3. Send reminder to every user
    const results = await Promise.allSettled(
      users
        .filter(u => u.email)   // skip users with no email
        .map(u =>
          sendGoalReminderEmail({
            to:       u.email,
            ccList:   hrEmails.filter(e => e !== u.email),  // don't CC yourself
            userName: u.name,
            month,
            year,
          })
        )
    )

    const sent   = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    console.log(`[GoalReminder] Done — ${sent} sent, ${failed} failed`)

  } catch (err) {
    console.error('[GoalReminder] Job failed:', err)
  }
}, {
  timezone: 'Asia/Kolkata'   // IST — change if needed
})

console.log('[GoalReminder] Cron scheduled — runs 9:00 AM on 26th every month (IST)')