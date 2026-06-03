import { clsx } from 'clsx'
import { format } from 'date-fns'
import { ROLE_HIERARCHY } from './constants'

// ─── className merger ───
export function cn(...inputs) { return clsx(inputs) }

// ─── Direct supervisor permission helpers ───────────────────
export function isDirectSupervisor(viewerUser, targetUserId, allUsers) {
  if (!viewerUser || !targetUserId) return false
  if (viewerUser.role === 'Admin') return true
  if (viewerUser.id === targetUserId) return true
  const target = allUsers?.find(u => u.id === targetUserId)
  return target?.manager_id === viewerUser.id
}

export function canGiveFeedbackTo(viewerUser, targetUserId, allUsers) {
  if (!viewerUser || !targetUserId) return false
  if (viewerUser.id === targetUserId) return false
  if (viewerUser.role === 'Admin') return true
  const target = allUsers?.find(u => u.id === targetUserId)
  return target?.manager_id === viewerUser.id
}

// ─── Legacy helpers ─────────────────────────────────────────
export function canModifyUser(currentRole, targetRole) {
  if (currentRole === 'Admin') return true
  return (ROLE_HIERARCHY[currentRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0)
}

export function getModifiableRoles(userRole) {
  if (userRole === 'Admin') return ['CMD', 'VP', 'HR', 'Manager', 'Employee']
  const level = ROLE_HIERARCHY[userRole] || 0
  return Object.entries(ROLE_HIERARCHY).filter(([, l]) => l < level).map(([r]) => r)
}

// ─── IST Date helpers ────────────────────────────────────────
const IST_OFFSET = 5.5 * 60 * 60 * 1000

function toIST(isoString) {
  if (!isoString) return null
  try { return new Date(new Date(isoString).getTime() + IST_OFFSET) }
  catch { return null }
}

export function timeAgo(isoString) {
  if (!isoString) return ''
  try {
    const ist  = toIST(isoString)
    const now  = new Date(new Date().getTime() + IST_OFFSET)
    const diff = now - ist
    if (diff < 0) return 'just now'
    const secs = Math.floor(diff / 1000)
    if (secs < 60) return 'just now'
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatIST(isoString)
  } catch { return '' }
}

export function formatIST(isoString, fmt = 'dd MMM yyyy, hh:mm a') {
  if (!isoString) return '—'
  try { return format(toIST(isoString), fmt) + ' IST' }
  catch { return isoString }
}

// ─── ID generator ───────────────────────────────────────────
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Progress ───────────────────────────────────────────────
export function calcProgress(achievement, target) {
  if (achievement == null || target == null) return 0
  const a = parseFloat(String(achievement).replace(/[^0-9.-]/g, ''))
  const t = parseFloat(String(target).replace(/[^0-9.-]/g, ''))
  if (isNaN(a) || isNaN(t) || t === 0) return 0
  return Math.min(100, (a / t) * 100)
}

export function progressVariant(p) {
  if (p >= 100) return 'success'
  if (p >= 60)  return 'warning'
  return 'danger'
}

// ─── Goal helpers ────────────────────────────────────────────
export function calcMonthlyAchievement(w1, w2, w3, w4) {
  const sum = [w1, w2, w3, w4].reduce((acc, v) => {
    const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''))
    return acc + (isNaN(n) ? 0 : n)
  }, 0)
  return sum || null
}

// ─── Month bounds ────────────────────────────────────────────
// Returns { firstDay: 'YYYY-MM-DD', lastDay: 'YYYY-MM-DD' }
export function getMonthBounds(year, month) {
  const first = new Date(year, month - 1, 1)
  const last  = new Date(year, month, 0)   // day 0 of next month = last day of this month

  const pad = n => String(n).padStart(2, '0')
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  return { firstDay: fmt(first), lastDay: fmt(last) }
}

// ─── Real calendar weeks ─────────────────────────────────────
// Returns an array of week objects for a given year+month.
// Each week is { weekNum, start: Date, end: Date, label: 'Apr 1–7' }
// Weeks always start on Monday, end on Sunday.
// The first week may start before the 1st of the month (clamped to 1st).
// The last week may end after the last day (clamped to last day).
// A month has 4 or 5 weeks depending on where it falls.
export function getMonthWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)

  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const fmt = d => `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`

  // Find the first weekday (Mon–Fri) of the month
  // If month starts on Sat → skip to Mon (day+2), Sun → skip to Mon (day+1)
  const getFirstWeekday = () => {
    const d = new Date(firstDay)
    const dow = d.getDay()
    if (dow === 6) d.setDate(d.getDate() + 2) // Sat → Mon
    if (dow === 0) d.setDate(d.getDate() + 1) // Sun → Mon
    return d
  }

  // Given any date, find the Friday of its week
  const getFriday = (d) => {
    const f = new Date(d)
    const dow = f.getDay() // 1=Mon … 5=Fri
    const daysToFriday = dow <= 5 ? 5 - dow : 7 - dow + 5
    f.setDate(f.getDate() + daysToFriday)
    return f
  }

  // Given any date, find the Monday of NEXT week
  const getNextMonday = (d) => {
    const m = new Date(d)
    const dow = m.getDay()
    const daysToNextMon = dow === 1 ? 7 : (8 - dow) % 7
    m.setDate(m.getDate() + daysToNextMon)
    return m
  }

  const weeks  = []
  let cursor   = getFirstWeekday()
  let weekNum  = 1

  while (cursor <= lastDay) {
    const weekStart = new Date(cursor)

    // End of week = Friday, clamped to last day of month
    let weekEnd = getFriday(cursor)
    if (weekEnd > lastDay) weekEnd = new Date(lastDay)

    // If weekEnd landed on a weekend (e.g. last day of month is Sat/Sun), clamp back
    const endDow = weekEnd.getDay()
    if (endDow === 6) weekEnd.setDate(weekEnd.getDate() - 1) // Sat → Fri
    if (endDow === 0) weekEnd.setDate(weekEnd.getDate() - 2) // Sun → Fri

    // Only push if weekStart is still within month and is a weekday
    const startDow = weekStart.getDay()
    if (weekStart <= lastDay && startDow !== 0 && startDow !== 6) {
      weeks.push({
        weekNum,
        start:    weekStart,
        end:      weekEnd,
        label:    `${fmt(weekStart)} – ${fmt(weekEnd)}`,
        startISO: toISODate(weekStart),
        endISO:   toISODate(weekEnd),
      })
      weekNum++
    }

    // Move to next Monday
    cursor = getNextMonday(weekStart)
  }

  return weeks
}

function toISODate(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Legacy — kept for backward compat
export function getWeekDateRange(year, month, weekNum) {
  const weeks = getMonthWeeks(year, month)
  const w     = weeks[weekNum - 1]
  if (!w) return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0) }
  return { start: w.start, end: w.end }
}

// ─── Notification helpers ────────────────────────────────────
export function getNotifIcon(actionType) {
  const map = {
    goal_created:'📝', goal_approved:'✅', goal_rejected:'❌',
    goal_edited:'✏️', goal_deleted:'🗑️', goal_completed:'🎉',
    goal_not_completed:'⚠️', weekly_achievement_updated:'📊',
    feedback_received:'💬', feedback_given:'✍️', feedback_reply:'↩️',
    goal_due_soon:'⏰', goal_overdue:'🚨',
    achievement_approved:'✅', achievement_rejected:'❌',
  }
  return map[actionType] || 'ℹ️'
}

export function getNotifColor(actionType) {
  const reds   = ['goal_not_completed','goal_overdue','goal_deleted','achievement_rejected','goal_rejected']
  const greens = ['goal_approved','goal_completed','achievement_approved']
  const ambers = ['goal_due_soon','goal_edited','deadline_reminder']
  if (reds.includes(actionType))   return 'var(--danger)'
  if (greens.includes(actionType)) return 'var(--success)'
  if (ambers.includes(actionType)) return 'var(--warning)'
  return 'var(--primary)'
}

// ─── Team helpers ────────────────────────────────────────────
export function getUserDisplayName(users, id) {
  return users?.find(u => u.id === id)?.name || 'Unknown'
}

export function getTeamMemberIds(users, managerId) {
  return (users || []).filter(u => u.manager_id === managerId).map(u => u.id)
}

// ─── CSV export ──────────────────────────────────────────────
export function goalsToCSV(goals, users) {
  const header = ['Employee','Goal Title','Department','KPI','Month','Year','Target','Achievement','Progress%','Status']
  const rows = goals.map(g => {
    const owner = users?.find(u => u.id === g.user_id)
    const p = calcProgress(g.monthly_achievement, g.monthly_target)
    return [owner?.name||'', g.goal_title, g.department, g.kpi, g.month, g.year, g.monthly_target, g.monthly_achievement??'', p.toFixed(1), g.status]
  })
  const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `goals_export_${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Dept normalizer ─────────────────────────────────────────
export function normalizeDept(dept) {
  if (!dept || !dept.trim()) return 'Unassigned'
  const n = dept.trim().toUpperCase()
  if (['N/A','NA','NONE','-'].includes(n)) return 'Unassigned'
  return n
}

// ─── Debounce ────────────────────────────────────────────────
export function debounce(fn, ms) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }
}