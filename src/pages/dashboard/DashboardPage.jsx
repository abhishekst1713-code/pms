import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import {
  useAllGoals, useAllUsers, useNotifications,
  useMarkRead, useMarkAllRead
} from '../../hooks/useData'
import { ProgressBar, RoleBadge, StatusBadge, EmptyState } from '../../components/ui/index.jsx'
import {
  Download, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus,
  Target, CheckCircle, Activity, AlertTriangle,
  Users, Globe, Bell, Award, BarChart2
} from 'lucide-react'
import { StatusPieChart } from '../../components/charts/index.jsx'
import { calcProgress, MONTH_NAMES } from '../../lib/constants'
import { timeAgo, goalsToCSV } from '../../lib/utils'
import './DashboardPage.css'

const P = {
  blue:   '#2563EB', green:  '#059669', amber:  '#D97706',
  red:    '#DC2626', violet: '#7C3AED', slate:  '#475569', indigo: '#6366F1',
}

const NOTIF_COLOR = {
  goal_created: P.blue, goal_approved: P.green, goal_rejected: P.red,
  goal_edited: P.amber, goal_deleted: P.red, achievement: P.green,
  goal_not_completed: P.red, update: P.blue, goal_not_updated: '#F97316',
  feedback: P.violet, feedback_given: P.indigo, feedback_reply: P.violet,
  deadline: P.amber, overdue: P.red, assignment: P.blue,
}

function notifLabel(actionType) {
  return (actionType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
        {children}
      </div>
      {action}
    </div>
  )
}

function KpiCard({ label, value, sub, color, trend, trendVal, icon: Icon, active, onClick }) {
  const TrendIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? P.green : trend === 'down' ? P.red : '#94A3B8'
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)',
      padding: '20px 22px', cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s, transform 0.15s',
      boxShadow: active ? `0 0 0 3px ${color}28, 0 8px 24px rgba(0,0,0,0.10)` : '0 1px 4px rgba(0,0,0,0.05)',
      transform: active ? 'translateY(-2px)' : undefined,
      outline: active ? `2px solid ${color}` : 'none', outlineOffset: 2,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 72, height: 72, borderRadius: '0 0 0 72px', background: `${color}07`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
        {Icon && (
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={13} color={color} />
          </div>
        )}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginBottom: 6 }}>{sub}</div>}
      {trendVal !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: trendColor }}>{trendVal}</span>
        </div>
      )}
    </div>
  )
}

function RankBadge({ rank }) {
  const s = [
    { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    { color: '#B45309', bg: '#FEF9C3', border: '#FDE68A' },
  ][rank - 1] || { color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' }
  return (
    <div style={{ minWidth: 36, height: 22, borderRadius: 6, padding: '0 8px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.68rem', flexShrink: 0 }}>
      {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
    </div>
  )
}

function useGoalMetrics(goals) {
  return useMemo(() => {
    const today     = new Date()
    const total     = goals.length
    const completed = goals.filter(g => g.status === 'Completed').length
    const active    = goals.filter(g => g.status === 'Active').length
    const avgP = goals.length ? goals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / goals.length : 0
    const overdue   = goals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
    const compRate  = total ? (completed / total * 100) : 0
    return { total, completed, active, avgP, overdue, compRate }
  }, [goals])
}

// ── Drill-down table ─────────────────────────────────────────
// Each goal row is clickable — navigates directly to that month's goal sheet
function DetailTable({ title, goals, users, showEmployee, onClose, navigate, currentUserId }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{title} ({goals.length})</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Click any row to open goal sheet</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(goals, users)}><Download size={11} /> Export CSV</button>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 640 }}>
          <thead>
            <tr>
              {showEmployee && <><th>Employee</th><th>Role</th></>}
              <th>Goal Title</th><th>Dept</th><th>Period</th><th>Target</th><th>Achievement</th><th>Progress</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {goals.length === 0
              ? <tr><td colSpan={showEmployee ? 9 : 7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No goals in this category</td></tr>
              : goals.slice(0, 300).map(g => {
                const p     = calcProgress(g.monthly_achievement, g.monthly_target)
                const owner = showEmployee ? users?.find(u => u.id === g.user_id) : null

                // Navigate to the correct goal sheet:
                // - If viewing own goal (showEmployee=false) → /my-goals/:year/q/:quarter/m/:month
                // - If viewing someone else's goal → /employees/:userId/goals/:year/q/:quarter/m/:month
                const handleRowClick = () => {
                  if (!navigate || !g.year || !g.quarter || !g.month) return
                  const path = !showEmployee
                    ? `/my-goals/${g.year}/q/${g.quarter}/m/${g.month}`
                    : `/employees/${g.user_id}/goals/${g.year}/q/${g.quarter}/m/${g.month}`
                  navigate(path)
                }

                return (
                  <tr
                    key={g.goal_id}
                    onClick={handleRowClick}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light, #EFF6FF)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}
                  >
                    {showEmployee && (
                      <>
                        <td className="font-600">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {owner?.name || '—'}
                            {owner?.is_active === false && (
                              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                            )}
                          </span>
                        </td>
                        <td><RoleBadge role={owner?.role} /></td>
                      </>
                    )}
                    <td style={{ maxWidth: 200 }}>
                      <div className="truncate" style={{ fontWeight: 600, color: P.blue }}>{g.goal_title}</div>
                    </td>
                    <td><span className="badge badge-gray">{g.department}</span></td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{MONTH_NAMES[g.month]} {g.year}</td>
                    <td>{g.monthly_target}</td>
                    <td>{g.monthly_achievement ?? <span className="val-muted">—</span>}</td>
                    <td style={{ minWidth: 130 }}>
                      <ProgressBar value={p} size="h4" />
                      <span className="text-sm text-muted">{p.toFixed(1)}%</span>
                    </td>
                    <td><StatusBadge status={g.status} /></td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Metric row ───────────────────────────────────────────────
function MetricRow({ goals, users, showEmployee = false, navigate, currentUserId }) {
  const [active, setActive] = useState(null)
  const m     = useGoalMetrics(goals)
  const today = new Date()

  const drillGoals = useMemo(() => {
    if (!active || active === 'progress') return []
    if (active === 'completed') return goals.filter(g => g.status === 'Completed')
    if (active === 'active')    return goals.filter(g => g.status === 'Active')
    if (active === 'overdue')   return goals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today)
    return goals
  }, [active, goals])

  const CARDS = [
    { key: 'total',     value: m.total,                 label: 'Total Goals',  color: P.indigo, icon: Target,        trend: 'neutral',                                             trendVal: `${m.compRate.toFixed(0)}% completion` },
    { key: 'completed', value: m.completed,             label: 'Completed',    color: P.green,  icon: CheckCircle,   trend: m.completed > 0 ? 'up' : 'neutral',                    trendVal: `${m.compRate.toFixed(1)}% of total` },
    { key: 'active',    value: m.active,                label: 'Active',       color: P.blue,   icon: Activity,      trend: 'neutral',                                             trendVal: m.active > 0 ? `${m.active} in progress` : 'None active' },
    { key: 'progress',  value: `${m.avgP.toFixed(1)}%`, label: 'Avg Progress', color: m.avgP >= 80 ? P.green : m.avgP >= 50 ? P.amber : P.red, icon: BarChart2, trend: m.avgP >= 80 ? 'up' : m.avgP >= 50 ? 'neutral' : 'down', trendVal: m.avgP >= 80 ? 'On track' : m.avgP >= 50 ? 'Needs attention' : 'At risk' },
    { key: 'overdue',   value: m.overdue,               label: 'Overdue',      color: m.overdue > 0 ? P.red : P.green, icon: AlertTriangle, trend: m.overdue > 0 ? 'down' : 'up', trendVal: m.overdue > 0 ? `${m.overdue} past deadline` : 'All on time' },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 16 }}>
        {CARDS.map(c => (
          <KpiCard key={c.key} value={c.value} label={c.label} color={c.color} icon={c.icon}
            trend={c.trend} trendVal={c.trendVal} active={active === c.key}
            onClick={() => setActive(active === c.key ? null : c.key)} />
        ))}
      </div>
      {active && active !== 'progress' && (
        <DetailTable
          title={active === 'total' ? 'All Goals' : active === 'completed' ? 'Completed Goals' : active === 'active' ? 'Active Goals' : 'Overdue Goals'}
          goals={drillGoals}
          users={users}
          showEmployee={showEmployee}
          onClose={() => setActive(null)}
          navigate={navigate}
          currentUserId={currentUserId}
        />
      )}
    </>
  )
}

function OrgSummaryBar({ allGoals, allUsers, visibleRoles, currentYear, filterMonth }) {
  const today      = new Date()
  const scopeUsers = allUsers.filter(u => visibleRoles.includes(u.role) && u.is_active !== false)
  const scopeGoals = allGoals.filter(g => g.year === currentYear && g.month === filterMonth && scopeUsers.some(u => u.id === g.user_id))
  const total      = scopeGoals.length
  const completed  = scopeGoals.filter(g => g.status === 'Completed').length
  const active     = scopeGoals.filter(g => g.status === 'Active').length
  const overdue    = scopeGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
  const compRate   = total ? (completed / total * 100) : 0
  const avgP = scopeGoals.length ? scopeGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / scopeGoals.length : 0
  const activeEmp  = scopeUsers.filter(u => scopeGoals.some(g => g.user_id === u.id)).length

  const stats = [
    { label: 'Employees',    value: scopeUsers.length,         icon: Users,         color: '#93C5FD' },
    { label: 'Active',       value: activeEmp,                 icon: Activity,      color: '#6EE7B7' },
    { label: 'Total Goals',  value: total,                     icon: Target,        color: '#A5B4FC' },
    { label: 'Completed',    value: completed,                 icon: CheckCircle,   color: '#6EE7B7' },
    { label: 'Active Goals', value: active,                    icon: BarChart2,     color: '#93C5FD' },
    { label: 'Overdue',      value: overdue,                   icon: AlertTriangle, color: overdue > 0 ? '#FCA5A5' : '#6EE7B7' },
    { label: 'Completion',   value: `${compRate.toFixed(1)}%`, icon: Award,         color: compRate >= 70 ? '#6EE7B7' : '#FCD34D' },
    { label: 'Avg Progress', value: `${avgP.toFixed(1)}%`,     icon: TrendingUp,    color: avgP >= 70 ? '#6EE7B7' : '#FCD34D' },
  ]

  return (
    <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: 'var(--r-xl)', padding: '22px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Globe size={13} color="rgba(255,255,255,0.5)" />
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Organisation · {MONTH_NAMES[filterMonth]} {currentYear}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0 }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ padding: '0 14px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <s.icon size={12} color={s.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrgDistribution({ filteredGoals }) {
  const m = useGoalMetrics(filteredGoals)
  const pieData = useMemo(() => {
    const onTrack = m.active - m.overdue
    return [
      { name: 'Completed',         value: m.completed },
      { name: 'Active (On Track)', value: onTrack > 0 ? onTrack : 0 },
      { name: 'Overdue',           value: m.overdue },
      { name: 'Other',             value: m.total - m.completed - m.active },
    ].filter(d => d.value > 0)
  }, [m])

  if (filteredGoals.length === 0) return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 20 }}>
      <SLabel>Goals Distribution</SLabel>
      <EmptyState title="No goals for selected filters" description="Adjust Team, User or Month above" />
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 24 }}>
      <SLabel>Goals Distribution</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24, alignItems: 'start' }}>
        <StatusPieChart data={pieData} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Total Goals', value: m.total,     bg: '#EFF6FF', color: '#1D4ED8' },
            { label: 'Completed',   value: m.completed, bg: '#D1FAE5', color: '#047857' },
            { label: 'Active',      value: m.active,    bg: '#DBEAFE', color: '#2563EB' },
            { label: 'Overdue',     value: m.overdue,   bg: '#FEE2E2', color: '#DC2626' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: s.bg, borderRadius: 'var(--r)' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 5 }}>
              <span>Completion Rate</span><span style={{ fontWeight: 700 }}>{m.compRate.toFixed(1)}%</span>
            </div>
            <ProgressBar value={m.compRate} size="h8" />
          </div>
        </div>
      </div>
    </div>
  )
}

function TopPerformers({ allUsers, allGoals, visibleRoles, filterMonth, currentYear, count = 5, navigate }) {
  const performers = useMemo(() =>
    allUsers.filter(u => visibleRoles.includes(u.role)).map(u => {
      const ug  = allGoals.filter(g => g.user_id === u.id && g.year === currentYear && g.month === filterMonth)
      if (!ug.length) return null
      const avg = ug.length ? ug.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / ug.length : 0
      const cr  = ug.filter(g => g.status === 'Completed').length / ug.length * 100
      const quarter = ug[0]?.quarter || Math.ceil(filterMonth / 3)
      return { user: u, goals: ug.length, avgP: avg, compRate: cr, score: avg * 0.5 + cr * 0.5, quarter }
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, count),
    [allUsers, allGoals, visibleRoles, filterMonth, currentYear, count]
  )

  if (!performers.length) return null

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 24 }}>
      <SLabel>Top {count} Performers — {MONTH_NAMES[filterMonth]}</SLabel>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Rank</th><th>Name</th><th>Role</th><th>Department</th><th>Goals</th><th>Avg Progress</th><th>Completion Rate</th></tr>
          </thead>
          <tbody>
            {performers.map((p, i) => (
              <tr key={p.user.id}
                onClick={() => navigate(`/employees/${p.user.id}/goals/${currentYear}/q/${p.quarter}/m/${filterMonth}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light, #EFF6FF)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <td><RankBadge rank={i + 1} /></td>
                <td className="font-600">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {p.user.name}
                    {p.user?.is_active === false && (
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                    )}
                  </span>
                </td>
                <td><RoleBadge role={p.user.role} /></td>
                <td style={{ fontSize: '0.82rem' }}>{p.user.department || '—'}</td>
                <td>{p.goals}</td>
                <td style={{ minWidth: 140 }}><ProgressBar value={p.avgP} size="h6" /><span className="text-sm text-muted">{p.avgP.toFixed(1)}%</span></td>
                <td style={{ minWidth: 140 }}><ProgressBar value={p.compRate} size="h6" /><span className="text-sm text-muted">{p.compRate.toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrgOverview({ allGoals, allUsers, role, navigate }) {
  const today       = new Date()
  const currentYear = today.getFullYear()
  const visibleRoles = ['CMD','VP','HR','Manager','Employee']

  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const [filterTeam,  setFilterTeam]  = useState('All')
  const [filterUser,  setFilterUser]  = useState('All')

  const teams = useMemo(() => [...new Set(allUsers.filter(u => visibleRoles.includes(u.role)).map(u => u.department || 'Unassigned'))].sort(), [allUsers, visibleRoles])
  const usersInTeam = useMemo(() => {
    let list = allUsers.filter(u => visibleRoles.includes(u.role) && u.is_active !== false)

    // VP and HR can see CMD's team members but not CMD themselves
    if (role === 'VP' || role === 'HR') {
      list = list.filter(u => u.role !== 'CMD')
    }

    if (filterTeam !== 'All') list = list.filter(u => (u.department || 'Unassigned') === filterTeam)
    return list
  }, [allUsers, visibleRoles, filterTeam, role])

  const filteredGoals = useMemo(() => {
    let baseUsers = usersInTeam
    if ((role === 'VP' || role === 'HR') && filterUser === 'All') {
      // Include CMD's team goals but not CMD's own goals
      const cmdIds = new Set(allUsers.filter(u => u.role === 'CMD').map(u => u.id))
      baseUsers = allUsers.filter(u =>
        visibleRoles.includes(u.role) && !cmdIds.has(u.id)
      )
    }
    const eligible = new Set(filterUser === 'All' ? baseUsers.map(u => u.id) : [filterUser])
    return allGoals.filter(g => g.year === currentYear && g.month === filterMonth && eligible.has(g.user_id))
  }, [allGoals, usersInTeam, filterMonth, filterUser, currentYear, role, allUsers, visibleRoles])

  return (
    <div className="card mb-6">
      <div className="card-header">
        <div>
          <div className="card-title">Organisation Overview</div>
          <div className="card-subtitle">{MONTH_NAMES[filterMonth]} {currentYear}</div>
        </div>
        <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(filteredGoals, allUsers)}>
          <Download size={11} /> Export
        </button>
      </div>
      <div className="card-body">
        <OrgSummaryBar allGoals={allGoals} allUsers={allUsers} visibleRoles={visibleRoles} currentYear={currentYear} filterMonth={filterMonth} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Team',  value: filterTeam,  onChange: e => { setFilterTeam(e.target.value); setFilterUser('All') }, options: [<option key="all" value="All">All Teams</option>, ...teams.map(t => <option key={t}>{t}</option>)], width: 160 },
            { label: 'User',  value: filterUser,  onChange: e => setFilterUser(e.target.value), options: [<option key="all" value="All">All Users</option>, ...usersInTeam.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)], width: 200 },
            { label: 'Month', value: filterMonth, onChange: e => setFilterMonth(+e.target.value), options: MONTH_NAMES.slice(1).map((mn, i) => <option key={i + 1} value={i + 1}>{mn}</option>), width: 140 },
          ].map(f => (
            <div key={f.label} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{f.label}</label>
              <select className="select select-sm" style={{ minWidth: f.width }} value={f.value} onChange={f.onChange}>{f.options}</select>
            </div>
          ))}
        </div>
        <MetricRow goals={filteredGoals} users={allUsers} showEmployee navigate={navigate} />
        <OrgDistribution filteredGoals={filteredGoals} />
        <TopPerformers allUsers={allUsers} allGoals={allGoals} visibleRoles={visibleRoles} filterMonth={filterMonth} currentYear={currentYear} count={5} navigate={navigate} />
      </div>
    </div>
  )
}

function TeamSection({ title, members, allGoals, allUsers, currentYear, navigate }) {
  const today = new Date()
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const [showMembers, setShowMembers] = useState(false)
  const teamGoals = useMemo(() => allGoals.filter(g => members.some(m => m.id === g.user_id) && g.year === currentYear && g.month === filterMonth), [allGoals, members, filterMonth, currentYear])
  if (!members.length) return null
  return (
    <div className="card mb-6">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{members.length} member{members.length !== 1 ? 's' : ''} · {MONTH_NAMES[filterMonth]} {currentYear}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select select-sm" style={{ width: 140 }} value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
            {MONTH_NAMES.slice(1).map((mn, i) => <option key={i + 1} value={i + 1}>{mn}</option>)}
          </select>
          <button className="btn btn-xs btn-secondary" onClick={() => navigate('/employees')}>View All</button>
        </div>
      </div>
      <div className="card-body">
        <MetricRow goals={teamGoals} users={allUsers} showEmployee navigate={navigate} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, padding: 0 }} onClick={() => setShowMembers(v => !v)}>
          {showMembers ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showMembers ? 'Hide Members' : 'Show Members'}
        </button>
        {showMembers && (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Goals</th><th>Completed</th><th>Avg Progress</th><th></th></tr></thead>
              <tbody>
                {members.map(m => {
                  const mg  = allGoals.filter(g => g.user_id === m.id && g.year === currentYear && g.month === filterMonth)
                  const mc  = mg.filter(g => g.status === 'Completed').length
                  const avg = mg.length ? mg.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / mg.length : 0
                  return (
                    <tr key={m.id}
                      onClick={() => navigate(`/employees/${m.id}/goals`)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light, #EFF6FF)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >
                      <td className="font-600">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {m.name}
                          {m?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                          )}
                        </span>
                      </td>
                      <td><RoleBadge role={m.role} /></td>
                      <td style={{ fontSize: '0.82rem' }}>{m.department || '—'}</td>
                      <td>{mg.length}</td>
                      <td><span className="badge badge-green">{mc}</span></td>
                      <td style={{ minWidth: 140 }}><ProgressBar value={avg} size="h4" /><span className="text-sm text-muted">{avg.toFixed(1)}%</span></td>
                      <td onClick={e => e.stopPropagation()}><button className="btn btn-xs btn-secondary" onClick={() => navigate(`/employees/${m.id}/goals`)}>View Goals</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PersonalSection({ user, allGoals, allUsers, navigate }) {
  const today       = new Date()
  const currentYear = today.getFullYear()
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const myGoals = useMemo(() => {
    const base = allGoals.filter(g => g.user_id === user.id && g.year === currentYear && g.month === filterMonth)
    return user.role === 'Employee' ? base.filter(g => g.approval_status === 'approved') : base
  }, [allGoals, user, filterMonth, currentYear])
  const pendingCount = user.manager_id ? allGoals.filter(g => g.user_id === user.id && g.approval_status === 'pending').length : 0

  return (
    <div className="card mb-6">
      <div className="card-header">
        <div>
          <div className="card-title">Your Performance</div>
          <div className="card-subtitle">{MONTH_NAMES[filterMonth]} {currentYear}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select select-sm" style={{ width: 140 }} value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
            {MONTH_NAMES.slice(1).map((mn, i) => <option key={i + 1} value={i + 1}>{mn}</option>)}
          </select>
          <button className="btn btn-xs btn-secondary" onClick={() => navigate('/my-goals')}>View Goals</button>
        </div>
      </div>
      <div className="card-body">
        {pendingCount > 0 && (
          <div className="alert alert-warning mb-4">
            {pendingCount} goal{pendingCount !== 1 ? 's' : ''} pending manager approval — not shown in metrics
          </div>
        )}
        {/* showEmployee=false → navigates to /my-goals/:year/q/:quarter/m/:month */}
        <MetricRow goals={myGoals} users={allUsers} showEmployee={false} navigate={navigate} currentUserId={user.id} />
      </div>
    </div>
  )
}

function ManagerTeamSection({ user, allGoals, allUsers, navigate }) {
  const today       = new Date()
  const currentYear = today.getFullYear()
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const teamMembers = useMemo(() => allUsers.filter(u => u.manager_id === user.id), [allUsers, user.id])
  const teamGoals   = useMemo(() => allGoals.filter(g => teamMembers.some(m => m.id === g.user_id) && g.year === currentYear && g.month === filterMonth), [allGoals, teamMembers, filterMonth, currentYear])
  const topPerformers = useMemo(() =>
    teamMembers.map(m => {
      const mg  = allGoals.filter(g => g.user_id === m.id && g.year === currentYear && g.month === filterMonth)
      if (!mg.length) return null
      const avg = mg.length ? mg.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / mg.length : 0
      const cr  = mg.filter(g => g.status === 'Completed').length / mg.length * 100
      return { user: m, goals: mg.length, avgP: avg, compRate: cr, score: avg * 0.5 + cr * 0.5 }
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3),
    [teamMembers, allGoals, filterMonth, currentYear]
  )

  return (
    <div className="card mb-6">
      <div className="card-header">
        <div>
          <div className="card-title">Team Overview</div>
          <div className="card-subtitle">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} · {MONTH_NAMES[filterMonth]} {currentYear}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select select-sm" style={{ width: 140 }} value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
            {MONTH_NAMES.slice(1).map((mn, i) => <option key={i + 1} value={i + 1}>{mn}</option>)}
          </select>
          <button className="btn btn-xs btn-secondary" onClick={() => navigate('/employees')}>View Team</button>
        </div>
      </div>
      <div className="card-body">
        {/* showEmployee=true → navigates to /employees/:userId/goals/:year/q/:quarter/m/:month */}
        <MetricRow goals={teamGoals} users={allUsers} showEmployee navigate={navigate} />

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
          <SLabel>Team Members</SLabel>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Goals</th><th>Completed</th><th>Avg Progress</th><th></th></tr></thead>
              <tbody>
                {teamMembers.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No members assigned</td></tr>
                  : teamMembers.map(m => {
                    const mg  = allGoals.filter(g => g.user_id === m.id && g.year === currentYear && g.month === filterMonth)
                    const mc  = mg.filter(g => g.status === 'Completed').length
                    const avg = mg.length ? mg.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / mg.length : 0
                    return (
                      <tr key={m.id}
                        onClick={() => navigate(`/employees/${m.id}/goals`)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light, #EFF6FF)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '' }}
                      >
                        <td className="font-600">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {m.name}
                            {m?.is_active === false && (
                              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                            )}
                          </span>
                        </td>
                        <td><RoleBadge role={m.role} /></td>
                        <td style={{ fontSize: '0.82rem' }}>{m.department || '—'}</td>
                        <td>{mg.length}</td>
                        <td><span className="badge badge-green">{mc}</span></td>
                        <td style={{ minWidth: 140 }}><ProgressBar value={avg} size="h4" /><span className="text-sm text-muted">{avg.toFixed(1)}%</span></td>
                        <td onClick={e => e.stopPropagation()}><button className="btn btn-xs btn-secondary" onClick={() => navigate(`/employees/${m.id}/goals`)}>View Goals</button></td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>

        {topPerformers.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
            <SLabel>Top 3 Team Performers</SLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {topPerformers.map((p, i) => {
                const podiumColor = [P.amber, P.slate, '#B45309'][i]
                return (
                  <div key={p.user.id}
                    onClick={() => navigate(`/employees/${p.user.id}/goals/${currentYear}/q/${p.quarter}/m/${filterMonth}`)}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderTop: `3px solid ${podiumColor}`, borderRadius: 'var(--r-xl)', padding: '16px 18px', textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: podiumColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      {['🥇 1st Place','🥈 2nd Place','🥉 3rd Place'][i]}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${podiumColor}, ${podiumColor}88)`, color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', boxShadow: `0 3px 10px ${podiumColor}40` }}>
                      {p.user.name[0]}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {p.user.name}
                      {p.user?.is_active === false && (
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 10 }}>{p.user.department || '—'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[{ label: 'Progress', value: `${p.avgP.toFixed(0)}%`, color: P.blue }, { label: 'Completion', value: `${p.compRate.toFixed(0)}%`, color: P.green }].map(s => (
                        <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '6px 4px' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivitySection({ userId, notifications, markRead, markAllRead }) {
  const [showAll, setShowAll] = useState(false)
  const unread    = notifications.filter(n => !n.is_read)
  const displayed = showAll ? notifications : notifications.slice(0, 5)

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={14} color={P.blue} />
          </div>
          <div>
            <div className="card-title">Activity & Reminders</div>
            <div className="card-subtitle">{unread.length} unread notification{unread.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-xs btn-secondary" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show Less' : 'View All'}</button>
          {unread.length > 0 && <button className="btn btn-xs btn-secondary" onClick={() => markAllRead.mutate(userId)}>Mark All Read</button>}
        </div>
      </div>
      <div style={{ padding: '0 24px' }}>
        {notifications.length === 0
          ? <div style={{ padding: '24px 0' }}><EmptyState title="All caught up" description="No notifications yet" /></div>
          : displayed.map((n, i) => {
            const color = NOTIF_COLOR[n.action_type] || '#64748B'
            return (
              <div key={n.id} onClick={() => !n.is_read && markRead.mutate(n.id)} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none', cursor: n.is_read ? 'default' : 'pointer', opacity: n.is_read ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                <div style={{ flexShrink: 0, marginTop: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--ink-200)' : color }} />
                </div>
                <div style={{ width: 3, borderRadius: 2, background: n.is_read ? 'var(--border)' : `${color}40`, flexShrink: 0, alignSelf: 'stretch' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{notifLabel(n.action_type)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>{n.details}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-4)', marginTop: 4 }}>{timeAgo(n.created_at)} IST</div>
                </div>
                {!n.is_read && (
                  <button className="btn btn-xs btn-ghost" style={{ flexShrink: 0, alignSelf: 'center' }} onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }}>
                    Mark Read
                  </button>
                )}
              </div>
            )
          })
        }
        {!showAll && notifications.length > 5 && (
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <button className="btn btn-xs btn-ghost" onClick={() => setShowAll(true)}>View all {notifications.length} notifications</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user        = useAuthStore(s => s.user)
  const navigate    = useNavigate()
  const role        = user.role
  const today       = new Date()
  const currentYear = today.getFullYear()

  const { data: allGoals = [] }      = useAllGoals()
  const { data: allUsers = [] }      = useAllUsers()
  const { data: notifications = [] } = useNotifications(user.id)
  const markRead    = useMarkRead()
  const markAllRead = useMarkAllRead()

  const teamGroups = useMemo(() => {
    if (role === 'CMD') return [{ title: 'VP Team Performance',       members: allUsers.filter(u => u.role === 'VP') }]
    if (role === 'VP')  return [{ title: 'HR & Managers Performance', members: allUsers.filter(u => ['HR','Manager'].includes(u.role)) }]
    if (role === 'HR')  return [{ title: 'Managers Performance',      members: allUsers.filter(u => u.role === 'Manager') }]
    return []
  }, [role, allUsers])

  const showOrg    = ['CMD','VP','HR'].includes(role)
  const showTeams  = showOrg
  const showMyTeam = role === 'Manager'
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '28px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{role} Dashboard</div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px' }}>Welcome back, {user.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', margin: 0 }}>
            {user.designation}{user.designation && ' · '}{today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} IST
          </p>
          {unreadCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px' }}>
              <Bell size={12} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {showOrg   && <OrgOverview allGoals={allGoals} allUsers={allUsers} role={role} navigate={navigate} />}
      {showTeams && teamGroups.map(tg => <TeamSection key={tg.title} title={tg.title} members={tg.members} allGoals={allGoals} allUsers={allUsers} currentYear={currentYear} navigate={navigate} />)}
      <PersonalSection user={user} allGoals={allGoals} allUsers={allUsers} navigate={navigate} />
      {showMyTeam && <ManagerTeamSection user={user} allGoals={allGoals} allUsers={allUsers} navigate={navigate} />}
      <ActivitySection userId={user.id} notifications={notifications} markRead={markRead} markAllRead={markAllRead} />
    </div>
  )
}