import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllUsers, useAllGoals, useAllFeedback, useDeleteUser } from '../../hooks/useData'
import { calcProgress, MONTH_NAMES } from '../../lib/constants'
import { goalsToCSV } from '../../lib/utils'
import { StatusPieChart, DeptBarChart } from '../../components/charts/index.jsx'
import {
  RoleBadge, StatusBadge, EmptyState,
  ConfirmDialog, ProgressBar
} from '../../components/ui/index.jsx'
import {
  Download, Trash2, Users, Target, CheckCircle,
  AlertTriangle, Activity, BarChart2, Search,
  Building2, MessageSquare, Globe, Star, TrendingUp,
  TrendingDown, Minus, Award
} from 'lucide-react'

// ── Palette ──────────────────────────────────────────────────
const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  violet: '#7C3AED',
  indigo: '#6366F1',
  slate:  '#475569',
}

const AVATAR_COLORS = [P.blue, P.violet, P.green, '#0891B2', P.amber, P.indigo]
function avatarColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

// ── Section label ─────────────────────────────────────────────
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

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, trend, trendVal, icon: Icon, onClick }) {
  const TrendIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? P.green : trend === 'down' ? P.red : '#94A3B8'
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)',
        padding: '20px 22px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = '' }}
    >
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

// ── Rank badge ────────────────────────────────────────────────
function RankBadge({ rank }) {
  const s = [
    { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    { color: '#B45309', bg: '#FEF9C3', border: '#FDE68A' },
  ][rank - 1] || { color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' }
  return (
    <div style={{ minWidth: 32, height: 22, borderRadius: 6, padding: '0 7px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.68rem', flexShrink: 0 }}>
      {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
    </div>
  )
}

// ── Star rating ───────────────────────────────────────────────
function StarRating({ rating, max = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={12} fill={i < rating ? P.amber : 'none'} color={i < rating ? P.amber : 'var(--border)'} />
      ))}
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', marginLeft: 3 }}>{rating}/{max}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function HRInfoPage() {
  const navigate = useNavigate()
  const { data: allUsers = [],    isLoading: uLoading } = useAllUsers()
  const { data: allGoals = [],    isLoading: gLoading } = useAllGoals()
  const { data: allFeedback = [] }                      = useAllFeedback()
  const deleteUser = useDeleteUser()

  const [activeTab,    setActiveTab]    = useState('overview')
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('All')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [goalFilter,   setGoalFilter]   = useState('All')

  const today = new Date()
  const isLoading = uLoading || gLoading

  // ── Metrics ──────────────────────────────────────────────
  const nonAdminUserIds = useMemo(() =>
    new Set(allUsers.filter(u => u.role !== 'Admin' && u.is_active !== false).map(u => u.id))
  , [allUsers])

  const nonAdminGoals = useMemo(() =>
    allGoals.filter(g => nonAdminUserIds.has(g.user_id))
  , [allGoals, nonAdminUserIds])

  const metrics = useMemo(() => {
    const total     = nonAdminGoals.length
    const completed = nonAdminGoals.filter(g => g.status === 'Completed').length
    const active    = nonAdminGoals.filter(g => g.status === 'Active').length
    const overdue   = nonAdminGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
    const avgP = nonAdminGoals.length ? nonAdminGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / nonAdminGoals.length : 0
    const compRate = total ? (completed / total * 100) : 0
    const numericGoals = nonAdminGoals.filter(g => {
      const n = parseFloat(String(g.monthly_target ?? '').replace(/[^0-9.-]/g, ''))
      return !isNaN(n) && n > 0
    })
    const totalTgt = numericGoals.reduce((a, g) => a + parseFloat(String(g.monthly_target).replace(/[^0-9.-]/g, '')), 0)
    const totalAch = numericGoals.reduce((a, g) => {
      const n = parseFloat(String(g.monthly_achievement ?? '').replace(/[^0-9.-]/g, ''))
      return a + (isNaN(n) ? 0 : n)
    }, 0)
    const numericRate = totalTgt > 0 ? (totalAch / totalTgt * 100) : null

    const textGoals  = nonAdminGoals.filter(g => {
      const n = parseFloat(String(g.monthly_target ?? '').replace(/[^0-9.-]/g, ''))
      return isNaN(n) && g.monthly_target
    })
    const textFilled = textGoals.filter(g => g.monthly_achievement != null && String(g.monthly_achievement).trim() !== '').length
    const textRate   = textGoals.length > 0 ? (textFilled / textGoals.length * 100) : null

    const achRate = numericRate !== null && textRate !== null
      ? (numericGoals.length * numericRate + textGoals.length * textRate) / (numericGoals.length + textGoals.length)
      : numericRate !== null ? numericRate
      : textRate   !== null ? textRate
      : 0
    return { total, completed, active, overdue, avgP, compRate, achRate }
  }, [allGoals])

  // ── Filtered users ────────────────────────────────────────
  const displayUsers = useMemo(() => {
    let list = allUsers.filter(u => u.role !== 'Admin')
    if (filterRole !== 'All') list = list.filter(u => u.role === filterRole)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allUsers, filterRole, search])

  // ── Dept stats ────────────────────────────────────────────
  const deptStats = useMemo(() => {
    const map = {}
    allUsers.forEach(u => {
      const d = u.department || 'Unassigned'
      if (!map[d]) map[d] = { users: 0, goals: 0, completed: 0, progress: [] }
      map[d].users++
    })
    nonAdminGoals.forEach(g => {
      const d = g.department || 'Unassigned'
      if (!map[d]) map[d] = { users: 0, goals: 0, completed: 0, progress: [] }
      map[d].goals++
      if (g.status === 'Completed') map[d].completed++
      map[d].progress.push(calcProgress(g.monthly_achievement ?? 0, g.monthly_target))
    })
    return Object.entries(map).map(([dept, v]) => ({
      dept,
      users: v.users,
      goals: v.goals,
      completed: v.completed,
      rate: v.goals ? +(v.completed / v.goals * 100).toFixed(1) : 0,
      avgP: v.progress.length ? +(v.progress.reduce((a, b) => a + b) / v.progress.length).toFixed(1) : 0,
      score: 0,
    })).map(d => ({ ...d, score: d.rate * 0.6 + d.avgP * 0.4 }))
      .sort((a, b) => b.users - a.users)
  }, [allUsers, allGoals])

  const deptBarData = deptStats.map(d => ({
    dept: d.dept.length > 10 ? d.dept.slice(0, 10) + '…' : d.dept,
    completion: d.rate, progress: d.avgP,
  }))

  // ── Filtered goals ────────────────────────────────────────
  const displayGoals = useMemo(() => {
    if (goalFilter === 'All')     return nonAdminGoals
    if (goalFilter === 'Overdue') return nonAdminGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today)
    return nonAdminGoals.filter(g => g.status === goalFilter)
  }, [nonAdminGoals, goalFilter])

  // ── Pie data ──────────────────────────────────────────────
  const pieData = [
    { name: 'Completed', value: metrics.completed },
    { name: 'Active',    value: metrics.active    },
    { name: 'On Hold',   value: nonAdminGoals.filter(g => g.status === 'On Hold').length    },
    { name: 'Cancelled', value: nonAdminGoals.filter(g => g.status === 'Cancelled').length  },
  ].filter(d => d.value > 0)

  // ── Role counts for summary bar ───────────────────────────
  const roleCounts = ['CMD','VP','HR','Manager','Employee'].map(r => ({
    role: r, count: allUsers.filter(u => u.role === r && u.is_active !== false).length,
  }))

  const TABS = [
    { key: 'overview',    label: 'Overview',    icon: Globe       },
    { key: 'users',       label: 'Users',       icon: Users       },
    { key: 'goals',       label: 'Goals',       icon: Target      },
    { key: 'departments', label: 'Departments', icon: Building2   },
    { key: 'feedback',    label: 'Feedback',    icon: MessageSquare },
  ]

  const handleDeleteUser = async () => {
    await deleteUser.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)',
        borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -70, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Admin · System Overview
            </div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
              Organisation Info
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
              System-wide performance, users, goals and feedback
            </p>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => goalsToCSV(allGoals, allUsers)}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
          >
            <Download size={13} /> Export All Goals
          </button>
        </div>
      </div>

      {/* ── Org dark summary bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: 'var(--r-xl)', padding: '18px 24px', marginBottom: 24,
        display: 'grid', gridTemplateColumns: `repeat(${roleCounts.length + 2}, 1fr)`, gap: 0,
      }}>
        {[
          { label: 'Total Users',  value: allUsers.filter(u => u.role !== 'Admin' && u.is_active !== false).length, icon: Users },
          { label: 'Total Goals',  value: metrics.total,     icon: Target   },
          ...roleCounts.map(r => ({ label: r.role, value: r.count, icon: Users })),
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '0 14px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <s.icon size={12} color="rgba(255,255,255,0.4)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs-wrap mb-6">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 5 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI row 1 */}
          <SLabel>Goal Performance — All Time</SLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <KpiCard label="Total Goals"    value={metrics.total}                   color={P.indigo} icon={Target}        sub={`${metrics.active} active`}
              onClick={() => setActiveTab('goals')} />
            <KpiCard label="Completion Rate" value={`${metrics.compRate.toFixed(1)}%`} color={metrics.compRate >= 70 ? P.green : metrics.compRate >= 40 ? P.amber : P.red} icon={CheckCircle} sub={`${metrics.completed} completed`} trend={metrics.compRate >= 70 ? 'up' : 'down'} trendVal={metrics.compRate >= 70 ? 'On target' : 'Below target'}
              onClick={() => { setActiveTab('goals'); setGoalFilter('Completed') }} />
            <KpiCard label="Avg Progress"   value={`${metrics.avgP.toFixed(1)}%`}   color={metrics.avgP >= 70 ? P.green : metrics.avgP >= 40 ? P.amber : P.red} icon={Activity} trend={metrics.avgP >= 70 ? 'up' : metrics.avgP >= 40 ? 'neutral' : 'down'} trendVal={metrics.avgP >= 70 ? 'On track' : metrics.avgP >= 40 ? 'Needs attention' : 'At risk'}
              onClick={() => setActiveTab('goals')} />
            <KpiCard label="Overdue Goals"  value={metrics.overdue}                 color={metrics.overdue > 0 ? P.red : P.green} icon={AlertTriangle} trend={metrics.overdue > 0 ? 'down' : 'up'} trendVal={metrics.overdue > 0 ? 'Action required' : 'All on schedule'}
              onClick={() => { setActiveTab('goals'); setGoalFilter('Overdue') }} />
          </div>

          {/* KPI row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Target Achievement" value={`${metrics.achRate.toFixed(1)}%`} color={metrics.achRate >= 80 ? P.green : metrics.achRate >= 50 ? P.amber : P.red} icon={Award} trend={metrics.achRate >= 80 ? 'up' : 'down'} trendVal={metrics.achRate >= 80 ? 'Excellent' : 'Needs improvement'}
              onClick={() => setActiveTab('goals')} />
            <KpiCard label="Total Feedback" value={allFeedback.length} color={P.violet} icon={MessageSquare} sub="Official feedback given"
              onClick={() => setActiveTab('feedback')} />
            <KpiCard label="Departments"    value={deptStats.length}   color={P.slate}  icon={Building2} sub="Active departments"
              onClick={() => setActiveTab('departments')} />
            <KpiCard label="Active Users"   value={allUsers.filter(u => allGoals.some(g => g.user_id === u.id)).length} color={P.cyan || P.blue} icon={Users} sub="With goals this year"
              onClick={() => setActiveTab('users')} />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Goal Status Distribution</div>
                  <div className="card-subtitle">{metrics.total} total goals</div>
                </div>
              </div>
              <div className="card-body">
                {pieData.length > 0
                  ? <StatusPieChart data={pieData} />
                  : <EmptyState title="No goals yet" />
                }
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Department Performance</div>
                  <div className="card-subtitle">Completion rate vs avg progress</div>
                </div>
              </div>
              <div className="card-body">
                {deptBarData.length > 0
                  ? <DeptBarChart data={deptBarData} />
                  : <EmptyState title="No department data" />
                }
              </div>
            </div>
          </div>

          {/* Dept rankings */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Department Rankings</div>
                <div className="card-subtitle">Sorted by composite score (completion × 0.6 + progress × 0.4)</div>
              </div>
            </div>
            <div style={{ padding: '6px 0' }}>
              {[...deptStats].sort((a, b) => b.score - a.score).map((d, i) => (
                <div key={d.dept} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 24px',
                  borderBottom: i < deptStats.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <RankBadge rank={i + 1} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{d.dept}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{d.users} employees · {d.goals} goals</div>
                  </div>
                  <div style={{ width: 120 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 4 }}>Completion</div>
                    <ProgressBar value={d.rate} size="h6" />
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: d.rate >= 70 ? P.green : d.rate >= 40 ? P.amber : P.red, marginTop: 2 }}>{d.rate}%</div>
                  </div>
                  <div style={{ width: 110 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 4 }}>Avg Progress</div>
                    <ProgressBar value={d.avgP} size="h6" />
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)', marginTop: 2 }}>{d.avgP}%</div>
                  </div>
                  <div style={{
                    width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                    background: d.score >= 70 ? '#D1FAE5' : d.score >= 40 ? '#FEF3C7' : '#FEE2E2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: d.score >= 70 ? P.green : d.score >= 40 ? P.amber : P.red, lineHeight: 1 }}>{d.score.toFixed(0)}</div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════
          USERS TAB
      ════════════════════════════════════ */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} color="var(--text-4)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: 34 }} placeholder="Search name, email or department…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select select-sm" style={{ width: 150 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="All">All Roles</option>
              {['CMD','VP','HR','Manager','Employee'].map(r => <option key={r}>{r}</option>)}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {displayUsers.length} of {allUsers.length}
            </div>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Employee</th><th>Role</th><th>Department</th><th>Supervisor</th><th>Goals</th><th>Completed</th><th>Avg Progress</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>
                    ))
                    : displayUsers.length === 0
                      ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No users found</td></tr>
                      : displayUsers.map(u => {
                        const mgr    = allUsers.find(m => m.id === u.manager_id)
                        const ug     = allGoals.filter(g => g.user_id === u.id)
                        const uc     = ug.filter(g => g.status === 'Completed').length
                        const avgP = ug.length ? ug.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / ug.length : 0
                        const ac     = avatarColor(u.name)
                        return (
                          <tr
                            key={u.id}
                            style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                            onClick={() => navigate(`/employees/${u.id}/goals`)}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${ac}, ${ac}99)`, color: '#fff', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 6px ${ac}30` }}>{u.name[0]}</div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {u.name}
                                    {u?.is_active === false && (
                                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><RoleBadge role={u.role} /></td>
                            <td style={{ fontSize: '0.82rem' }}>{u.department || '—'}</td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {mgr ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${avatarColor(mgr.name)}22`, color: avatarColor(mgr.name), fontWeight: 700, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{mgr.name[0]}</div>
                                  {mgr.name}
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ fontWeight: 700 }}>{ug.length}</td>
                            <td><span className="badge badge-green">{uc}</span></td>
                            <td style={{ minWidth: 130 }}>
                              <ProgressBar value={avgP} size="h6" />
                              <span className="text-sm text-muted">{avgP.toFixed(1)}%</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="btn btn-xs btn-secondary" onClick={() => navigate(`/employees/${u.id}/goals`)}>Goals</button>
                                <button className="btn btn-icon sm danger" onClick={() => setConfirmDelete(u)}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════
          GOALS TAB
      ════════════════════════════════════ */}
      {activeTab === 'goals' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="select select-sm" style={{ width: 160 }} value={goalFilter} onChange={e => setGoalFilter(e.target.value)}>
              {['All','Active','Completed','On Hold','Cancelled','Overdue'].map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>{displayGoals.length} goals</div>
            <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(displayGoals, allUsers)}>
              <Download size={12} /> Export
            </button>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Employee</th><th>Goal Title</th><th>Dept</th><th>Period</th><th>Target</th><th>Achievement</th><th>Progress</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {displayGoals.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No goals found</td></tr>
                    : displayGoals.slice(0, 100).map(g => {
                      const owner = allUsers.find(u => u.id === g.user_id)
                      const p     = calcProgress(g.monthly_achievement, g.monthly_target)
                      const ac    = owner ? avatarColor(owner.name) : P.slate
                      return (
                        <tr
                          key={g.goal_id}
                          style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                          onClick={() => navigate(`/employees/${g.user_id}/goals/${g.year}/q/${g.quarter}/m/${g.month}`)}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${ac}, ${ac}99)`, color: '#fff', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{owner?.name?.[0] || '?'}</div>
                              <span style={{ fontWeight: 600, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {owner?.name || '—'}
                                {owner?.is_active === false && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td style={{ maxWidth: 200 }}><div className="truncate" style={{ fontWeight: 500 }}>{g.goal_title}</div></td>
                          <td><span className="badge badge-gray">{g.department || '—'}</span></td>
                          <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{MONTH_NAMES[g.month]} {g.year}</td>
                          <td style={{ fontWeight: 600 }}>{g.monthly_target}</td>
                          <td>{g.monthly_achievement ?? <span className="val-muted">—</span>}</td>
                          <td style={{ minWidth: 140 }}>
                            <ProgressBar value={p} size="h6" />
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
            {displayGoals.length > 100 && (
              <div className="alert alert-info" style={{ margin: 12 }}>
                Showing first 100 of {displayGoals.length} goals. Export CSV for full list.
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════
          DEPARTMENTS TAB
      ════════════════════════════════════ */}
      {activeTab === 'departments' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">Completion & Progress by Department</div>
              </div>
              <div className="card-body">
                {deptBarData.length > 0 ? <DeptBarChart data={deptBarData} /> : <EmptyState title="No data" />}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Departments', value: deptStats.length, color: P.blue,  icon: Building2   },
                { label: 'Best Completion', value: deptStats.length ? `${[...deptStats].sort((a,b)=>b.rate-a.rate)[0]?.rate}%` : '—', color: P.green, icon: Award, sub: [...deptStats].sort((a,b)=>b.rate-a.rate)[0]?.dept },
                { label: 'Needs Attention', value: [...deptStats].filter(d=>d.rate<40).length > 0 ? `${[...deptStats].filter(d=>d.rate<40).length} dept${[...deptStats].filter(d=>d.rate<40).length!==1?'s':''}` : 'None', color: [...deptStats].filter(d=>d.rate<40).length > 0 ? P.red : P.green, icon: AlertTriangle },
              ].map(s => <KpiCard key={s.label} {...s} />)}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Department Details</div>
                <div className="card-subtitle">{deptStats.length} departments tracked</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Rank</th><th>Department</th><th>Employees</th><th>Goals</th><th>Completed</th><th>Completion Rate</th><th>Avg Progress</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {[...deptStats].sort((a, b) => b.score - a.score).map((d, i) => (
                    <tr
                      key={d.dept}
                      style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => setActiveTab('departments')}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td><RankBadge rank={i + 1} /></td>
                      <td style={{ fontWeight: 700 }}>{d.dept}</td>
                      <td>{d.users}</td>
                      <td>{d.goals}</td>
                      <td><span className="badge badge-green">{d.completed}</span></td>
                      <td style={{ minWidth: 160 }}>
                        <ProgressBar value={d.rate} size="h6" />
                        <span className="text-sm text-muted">{d.rate}%</span>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <ProgressBar value={d.avgP} size="h6" />
                        <span className="text-sm text-muted">{d.avgP}%</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: d.score >= 70 ? P.green : d.score >= 40 ? P.amber : P.red }}>
                          {d.score.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════
          FEEDBACK TAB
      ════════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <>
          {/* Feedback summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {(() => {
              const avgRating = allFeedback.length ? allFeedback.reduce((a, f) => a + (f.rating || 0), 0) / allFeedback.length : 0
              const byType = ['CMD Feedback','VP Feedback','Manager Feedback'].map(t => ({
                type: t, count: allFeedback.filter(f => f.feedback_type === t).length
              }))
              return [
                { label: 'Total Feedback',  value: allFeedback.length,        color: P.violet, icon: MessageSquare },
                { label: 'Avg Rating',      value: `${avgRating.toFixed(1)}/5`, color: avgRating >= 4 ? P.green : avgRating >= 3 ? P.amber : P.red, icon: Star },
                { label: 'Goals Reviewed',  value: new Set(allFeedback.map(f => f.goal_id)).size, color: P.blue, icon: Target, sub: 'Unique goals with feedback' },
              ].map(s => <KpiCard key={s.label} {...s} />)
            })()}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">All Feedback</div>
                <div className="card-subtitle">{allFeedback.length} records</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Employee</th><th>Goal</th><th>Type</th><th>Rating</th><th>Comment</th><th>Given By</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {allFeedback.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No feedback yet</td></tr>
                    : allFeedback.slice(0, 100).map(fb => {
                      const owner = allUsers.find(u => u.id === fb.user_id)
                      const giver = allUsers.find(u => u.id === fb.feedback_by)
                      const goal  = allGoals.find(g => g.goal_id === fb.goal_id)
                      const TYPE_COLOR = {
                        'CMD Feedback':     { color: P.red,    bg: '#FEE2E2' },
                        'VP Feedback':      { color: P.violet, bg: '#EDE9FE' },
                        'Manager Feedback': { color: P.blue,   bg: '#EFF6FF' },
                      }[fb.feedback_type] || { color: P.slate, bg: 'var(--surface-2)' }
                      return (
                        <tr key={fb.feedback_id}>
                          <td>
                            {owner ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${avatarColor(owner.name)}, ${avatarColor(owner.name)}99)`, color: '#fff', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{owner.name[0]}</div>
                                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{owner.name}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ maxWidth: 160, fontSize: '0.82rem' }}>
                            <div className="truncate">{goal?.goal_title || '—'}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: TYPE_COLOR.color, background: TYPE_COLOR.bg, padding: '3px 9px', borderRadius: 99 }}>
                              {fb.feedback_type}
                            </span>
                          </td>
                          <td><StarRating rating={fb.rating || 0} /></td>
                          <td style={{ maxWidth: 200 }}>
                            <div className="truncate" style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{fb.comment}</div>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{giver?.name || '—'}</td>
                          <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{fb.created_at?.slice(0, 10) || '—'}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
            {allFeedback.length > 100 && (
              <div className="alert alert-info" style={{ margin: 12 }}>Showing first 100 of {allFeedback.length} feedback records.</div>
            )}
          </div>
        </>
      )}

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete User"
          message={`Permanently delete ${confirmDelete.name} and all their goals? This cannot be undone.`}
          confirmLabel="Delete User" confirmVariant="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteUser.isPending}
        />
      )}
    </div>
  )
}