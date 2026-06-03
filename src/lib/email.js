import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g. smtp.gmail.com
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,     // your sender email
    pass: process.env.SMTP_PASS,     // app password or SMTP key
  },
})

export async function sendGoalReminderEmail({ to, ccList, userName, month, year }) {
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(year, month - 1))

  await transporter.sendMail({
    from: `"PMS - Performance Manager" <${process.env.SMTP_USER}>`,
    to,
    cc: ccList.join(','),
    subject: `Reminder: Update Your ${monthName} ${year} Goal Sheet`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8faff; padding: 24px; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #1D4ED8, #1E1B4B); padding: 28px 32px; border-radius: 10px; margin-bottom: 24px;">
          <h1 style="color: #fff; font-size: 22px; margin: 0 0 6px;">PMS — Goal Sheet Reminder</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 14px;">${monthName} ${year}</p>
        </div>

        <p style="font-size: 15px; color: #1e293b;">Hi <strong>${userName}</strong>,</p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7;">
          This is a friendly reminder to update your <strong>${monthName} ${year}</strong> goal sheet
          with your weekly achievements and progress.
        </p>

        <div style="background: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 600;">
            📅 Please update your goals before the end of this month.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569;">
          Log in to PMS and navigate to <strong>My Goals → ${monthName} ${year}</strong> to submit your achievements.
        </p>

        <a href="${process.env.APP_URL}/my-goals"
          style="display: inline-block; background: #2563EB; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 10px 0 20px;">
          Open My Goals →
        </a>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This is an automated reminder from PMS. Please do not reply to this email.
        </p>
      </div>
    `,
  })
}