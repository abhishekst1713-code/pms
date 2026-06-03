import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../../store'
import { useNavigate } from 'react-router-dom'
import { useAllUsers, useAllGoals } from '../../hooks/useData'
import { calcProgress, MONTH_NAMES, MONTH_SHORT } from '../../lib/constants'
import { goalsToCSV } from '../../lib/utils'
import {
  StatusPieChart, GaugeChart,
  DeptBarChart, MonthlyTrendChart
} from '../../components/charts/index.jsx'
import { ProgressBar, RoleBadge, StatusBadge, EmptyState } from '../../components/ui/index.jsx'
import {
  Download, TrendingUp, TrendingDown, Minus,
  Users, Target, CheckCircle, AlertTriangle,
  Activity, BarChart2, Globe, Award, ChevronRight
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, ReferenceLine,
  LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts'


// ── Design tokens ────────────────────────────────────────────
const PALETTE = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  violet: '#7C3AED',
  slate:  '#475569',
  cyan:   '#0891B2',
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
  padding: '10px 14px',
}

// ── Helpers ──────────────────────────────────────────────────
function goalMetrics(goals, today = new Date()) {
  const total     = goals.length
  const completed = goals.filter(g => g.status === 'Completed').length
  const active    = goals.filter(g => g.status === 'Active').length
  const overdue   = goals.filter(g =>
    g.status === 'Active' && g.end_date && new Date(g.end_date) < today
  ).length
  const avgP = total ? goals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / total : 0
  const compRate  = total ? (completed / total) * 100 : 0
  const numericGoals = goals.filter(g => !isNaN(parseFloat(g.monthly_target)) && parseFloat(g.monthly_target) > 0)
  const totalTgt     = numericGoals.reduce((a, g) => a + parseFloat(g.monthly_target), 0)
  const totalAch     = numericGoals.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
  const numericRate  = totalTgt > 0 ? (totalAch / totalTgt) * 100 : null

  const textGoals  = goals.filter(g => isNaN(parseFloat(g.monthly_target)) && g.monthly_target)
  const textFilled = textGoals.filter(g => g.monthly_achievement != null && String(g.monthly_achievement).trim() !== '').length
  const textRate   = textGoals.length > 0 ? (textFilled / textGoals.length) * 100 : null

  const achRate = numericRate !== null && textRate !== null
    ? (numericGoals.length * numericRate + textGoals.length * textRate) / (numericGoals.length + textGoals.length)
    : numericRate !== null ? numericRate
    : textRate !== null   ? textRate
    : 0
  return { total, completed, active, overdue, avgP, compRate, totalTgt, totalAch, achRate }
}

function trendCalc(cur, prev) {
  if (prev == null || prev === 0) return { dir: 'neutral', label: '—' }
  const diff = cur - prev
  const pct  = Math.abs(diff / prev * 100).toFixed(1)
  return {
    dir:   diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    label: diff === 0 ? 'No change' : `${diff > 0 ? '↑' : '↓'} ${pct}% vs last month`,
  }
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, trend, trendVal, icon: Icon, onClick, active }) {
  const TrendIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#94A3B8'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--r-xl)',
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: active
          ? `0 0 0 3px ${color}20, 0 8px 24px rgba(0,0,0,0.10)`
          : '0 1px 4px rgba(0,0,0,0.05)',
        transform: active ? 'translateY(-2px)' : undefined,
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* background tint */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80, borderRadius: '0 0 0 80px',
        background: `${color}08`, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.09em',
        }}>
          {label}
        </div>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={15} color={color} />
          </div>
        )}
      </div>

      <div style={{
        fontSize: '2.1rem', fontWeight: 800, color,
        letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 8 }}>{sub}</div>
      )}

      {trendVal !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontSize: '0.73rem', fontWeight: 600, color: trendColor }}>{trendVal}</span>
        </div>
      )}
    </div>
  )
}

// ── Section label ────────────────────────────────────────────
function SLabel({ children, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 14,
    }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.09em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: PALETTE.blue }} />
        {children}
      </div>
      {action}
    </div>
  )
}

// ── Rank badge ───────────────────────────────────────────────
function RankBadge({ rank }) {
  const styles = [
    { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
    { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    { color: '#B45309', bg: '#FEF9C3', border: '#FDE68A' },
  ]
  const s = styles[rank - 1] || { color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' }
  return (
    <div style={{
      minWidth: 36, height: 24, borderRadius: 6, padding: '0 8px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: '0.7rem', flexShrink: 0,
    }}>
      {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
    </div>
  )
}

// ── Org-wide summary bar ─────────────────────────────────────
function OrgSummaryBar({ allGoals, allUsers, filterYear, visibleRoles }) {
  const today = new Date()
  const scopeUsers = allUsers.filter(u => visibleRoles.includes(u.role) && u.is_active !== false)
  const scopeGoals = allGoals.filter(g =>
    g.year === filterYear && scopeUsers.some(u => u.id === g.user_id)
  )
  const m = goalMetrics(scopeGoals, today)

  const depts     = [...new Set(scopeUsers.map(u => u.department).filter(Boolean))].length
  const activeEmp = scopeUsers.filter(u =>
    scopeGoals.some(g => g.user_id === u.id)
  ).length

  const stats = [
    { label: 'Total Employees',  value: scopeUsers.length, icon: Users,       color: PALETTE.slate },
    { label: 'Active This Year', value: activeEmp,          icon: Activity,    color: PALETTE.blue  },
    { label: 'Departments',      value: depts,              icon: Globe,       color: PALETTE.violet },
    { label: 'Total Goals',      value: m.total,            icon: Target,      color: PALETTE.cyan  },
    { label: 'Completed',        value: m.completed,        icon: CheckCircle, color: PALETTE.green },
    { label: 'Overdue',          value: m.overdue,          icon: AlertTriangle, color: m.overdue > 0 ? PALETTE.red : PALETTE.green },
    { label: 'Completion Rate',  value: `${m.compRate.toFixed(1)}%`, icon: BarChart2, color: m.compRate >= 70 ? PALETTE.green : PALETTE.amber },
    { label: 'Avg Progress',     value: `${m.avgP.toFixed(1)}%`,     icon: TrendingUp, color: m.avgP >= 70 ? PALETTE.green : PALETTE.amber },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
      borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative circles */}
      <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 80, bottom: -60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Globe size={16} color='rgba(255,255,255,0.6)' />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Organisation Overview · {filterYear}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0 }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            padding: '0 20px',
            borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <s.icon size={14} color={s.color} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dept leaderboard card ─────────────────────────────────────
function DeptLeaderboard({ allGoals, allUsers, filterYear, visibleRoles, onDeptClick }) {
  const scopeUsers = allUsers.filter(u => visibleRoles.includes(u.role))
  const depts = useMemo(() => {
    const map = {}
    allGoals.filter(g => g.year === filterYear && scopeUsers.some(u => u.id === g.user_id))
      .forEach(g => {
        const d = g.department || 'Unassigned'
        if (!map[d]) map[d] = { goals: 0, completed: 0, progress: [], employees: new Set() }
        map[d].goals++
        if (g.status === 'Completed') map[d].completed++
        if (g.monthly_achievement != null)
          map[d].progress.push(calcProgress(g.monthly_achievement, g.monthly_target))
        map[d].employees.add(g.user_id)
      })
    scopeUsers.forEach(u => {
      if (u.department && !map[u.department]) {
        map[u.department] = { goals: 0, completed: 0, progress: [], employees: new Set() }
      }
    })

    return Object.entries(map)
      .map(([dept, v]) => ({
        dept,
        goals: v.goals,
        employees: v.employees.size,
        compRate: v.goals ? +(v.completed / v.goals * 100).toFixed(1) : 0,
        avgP: v.progress.length ? +(v.progress.reduce((a, b) => a + b) / v.progress.length).toFixed(1) : 0,
        score: 0,
      }))
      .map(d => ({ ...d, score: d.compRate * 0.6 + d.avgP * 0.4 }))
      .sort((a, b) => b.score - a.score)
  }, [allGoals, allUsers, filterYear, visibleRoles])

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Department Rankings</div>
          <div className="card-subtitle">Sorted by composite score</div>
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        {depts.length === 0
          ? <div style={{ padding: 32 }}><EmptyState title="No department data" description="Goals with departments will appear here" /></div>
          : depts.map((d, i) => (
            <div key={d.dept} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 24px',
                borderBottom: i < depts.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.12s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={onDeptClick}
              >
              <RankBadge rank={i + 1} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>{d.dept}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{d.employees} employees · {d.goals} goals</div>
              </div>
              <div style={{ width: 120, textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Completion</div>
                <ProgressBar value={d.compRate} size="h6" />
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: d.compRate >= 70 ? PALETTE.green : d.compRate >= 40 ? PALETTE.amber : PALETTE.red, marginTop: 2 }}>{d.compRate}%</div>
              </div>
              <div style={{ width: 110, textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Avg Progress</div>
                <ProgressBar value={d.avgP} size="h6" />
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-2)', marginTop: 2 }}>{d.avgP}%</div>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                background: d.score >= 70 ? '#D1FAE5' : d.score >= 40 ? '#FEF3C7' : '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: d.score >= 70 ? PALETTE.green : d.score >= 40 ? PALETTE.amber : PALETTE.red, lineHeight: 1 }}>
                  {d.score.toFixed(0)}
                </div>
                <div style={{ fontSize: '0.55rem', color: d.score >= 70 ? '#065F46' : d.score >= 40 ? '#78350F' : '#7F1D1D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>score</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Risk panel ───────────────────────────────────────────────
function RiskPanel({ allGoals, allUsers, filterYear, visibleRoles }) {
  const today = new Date()
  const scopeUsers = allUsers.filter(u => visibleRoles.includes(u.role))
  const atRisk = useMemo(() => {
    return allGoals
      .filter(g =>
        g.year === filterYear &&
        g.status === 'Active' &&
        g.end_date && new Date(g.end_date) < today &&
        scopeUsers.some(u => u.id === g.user_id)
      )
      .slice(0, 8)
      .map(g => ({
        ...g,
        owner: allUsers.find(u => u.id === g.user_id),
        daysOverdue: Math.floor((today - new Date(g.end_date)) / 86400000),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
  }, [allGoals, allUsers, filterYear, visibleRoles, today])

  if (!atRisk.length) return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">At-Risk Goals</div>
      </div>
      <div className="card-body">
        <EmptyState title="No overdue goals" description="All active goals are within deadline" />
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color={PALETTE.red} />
            At-Risk Goals
          </div>
          <div className="card-subtitle">{atRisk.length} overdue active goals</div>
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {atRisk.map((g, i) => (
          <div key={g.goal_id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 24px',
            borderBottom: i < atRisk.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              minWidth: 52, height: 28, borderRadius: 6, background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 800, color: PALETTE.red,
            }}>
              +{g.daysOverdue}d
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.goal_title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                {g.owner?.name || '—'} · {g.department || '—'}
              </div>
            </div>
            <StatusBadge status={g.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bell Curve Tab ────────────────────────────────────────────
function BellCurveTab({ allGoals, allUsers, visibleRoles, curYear }) {
  const ORG_ROLES = ['CMD', 'VP', 'HR', 'Manager', 'Employee']
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const WEEKS  = ['All Weeks', 'Week 1', 'Week 2', 'Week 3', 'Week 4']

  const exportDrilldownCSV = (members, bandLabel, metricLabel) => {
    const rows = [
      ['Name', 'Role', 'Department', 'Designation', 'Score (%)', 'Manager Rating', 'Goals', 'Completed', 'Achievement Rate (%)', 'Band', 'Trend'],
      ...members.map(emp => {
        const isTop    = top15.some(t => t.user.id === emp.user.id)
        const isBottom = bottom15.some(b => b.user.id === emp.user.id)
        const band     = isTop ? 'Top 15%' : isBottom ? 'Bottom 15%' : 'Middle 70%'
        return [
          emp.user.name,
          emp.user.role,
          emp.user.department || '—',
          emp.user.designation || '—',
          emp.score,
          emp.avgRating || '—',
          emp.goals,
          emp.completed,
          emp.achRate,
          band,
          emp.trend > 0 ? `+${emp.trend.toFixed(1)}%` : emp.trend < 0 ? `${emp.trend.toFixed(1)}%` : 'No change',
        ]
      })
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `bell-curve-${bandLabel}-${metricLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [filterYear,   setFilterYear]   = useState(curYear)
  const [filterMonth,  setFilterMonth]  = useState(0) // 0 = all months
  const [filterWeek,   setFilterWeek]   = useState(0) // 0 = all weeks
  const [filterDept,   setFilterDept]   = useState('All')
  const [filterRole,   setFilterRole]   = useState('All')
  const [activeMetric, setActiveMetric] = useState('rating') // progress | completion | achievement

  const years = [...new Set(allGoals.map(g => g.year))].sort((a, b) => b - a)
  if (!years.includes(curYear)) years.unshift(curYear)

  const scopeUsers = useMemo(() =>
    allUsers.filter(u => visibleRoles.includes(u.role) &&
      (filterRole === 'All' || u.role === filterRole) &&
      (filterDept === 'All' || u.department === filterDept)
    ), [allUsers, visibleRoles, filterRole, filterDept])

  const depts = useMemo(() =>
    ['All', ...[...new Set(allUsers.filter(u => visibleRoles.includes(u.role)).map(u => u.department).filter(Boolean))].sort()],
    [allUsers, visibleRoles]
  )

  // Per-employee score based on active metric and filters
  const employeeScores = useMemo(() => {
    return scopeUsers
      .filter(u => u.role !== 'CMD') // CMD excluded from bell curve
      .map(u => {
        let goals = allGoals.filter(g =>
          g.user_id === u.id &&
          g.year === filterYear &&
          (filterMonth === 0 || g.month === filterMonth)
        )
        if (!goals.length) return null

        let score = 0

        if (activeMetric === 'rating') {
          // Only goals with manager_rating count
          const ratedGoals = goals.filter(g => g.manager_rating != null)
          if (!ratedGoals.length) return null
          // Average rating mapped to 0-100
          const avgRating = ratedGoals.reduce((a, g) => a + g.manager_rating, 0) / ratedGoals.length
          score = (avgRating / 5) * 100
        } else if (activeMetric === 'progress') {
          if (filterWeek > 0) {
            const weekGoals = goals.filter(g => g[`week${filterWeek}_target`] != null && g[`week${filterWeek}_target`] !== '')
            if (!weekGoals.length) return null
            score = weekGoals.reduce((a, g) => {
              const t = parseFloat(g[`week${filterWeek}_target`])
              const v = parseFloat(g[`week${filterWeek}_achievement`])
              if (isNaN(t) || t === 0 || isNaN(v)) return a
              return a + Math.min((v / t) * 100, 100)
            }, 0) / weekGoals.length
          } else {
            const wp = goals.filter(g => g.monthly_achievement != null)
            if (!wp.length) return null
            score = wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
          }
        } else if (activeMetric === 'completion') {
          score = goals.filter(g => g.status === 'Completed').length / goals.length * 100
        } else {
          const numGoals = goals.filter(g => !isNaN(parseFloat(g.monthly_target)))
          if (!numGoals.length) return null
          const tgt = numGoals.reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
          const ach = numGoals.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
          if (tgt === 0) return null
          score = Math.min((ach / tgt) * 100, 150)
        }

        // Attach goal details for drill-down
        const ratedGoals  = goals.filter(g => g.manager_rating != null)
        const avgRating   = ratedGoals.length
          ? (ratedGoals.reduce((a, g) => a + g.manager_rating, 0) / ratedGoals.length).toFixed(1)
          : null
        const completed   = goals.filter(g => g.status === 'Completed').length
        const numTgt      = goals.filter(g => !isNaN(parseFloat(g.monthly_target)))
        const totalTgt    = numTgt.reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
        const totalAch    = numTgt.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
        const achRate     = totalTgt ? (totalAch / totalTgt * 100).toFixed(1) : '—'

        // Trend: compare to previous month score
        let prevScore = null
        if (filterMonth > 0) {
          const prevM    = filterMonth === 1 ? 12 : filterMonth - 1
          const prevY    = filterMonth === 1 ? filterYear - 1 : filterYear
          const prevGoals = allGoals.filter(g =>
            g.user_id === u.id && g.year === prevY && g.month === prevM
          )
          if (prevGoals.length) {
            if (activeMetric === 'rating') {
              const pr = prevGoals.filter(g => g.manager_rating != null)
              if (pr.length) prevScore = (pr.reduce((a, g) => a + g.manager_rating, 0) / pr.length / 5) * 100
            } else if (activeMetric === 'progress') {
              const pw = prevGoals.filter(g => g.monthly_achievement != null)
              if (pw.length) prevScore = pw.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / pw.length
            } else if (activeMetric === 'completion') {
              prevScore = prevGoals.filter(g => g.status === 'Completed').length / prevGoals.length * 100
            } else {
              const pn  = prevGoals.filter(g => !isNaN(parseFloat(g.monthly_target)))
              const pt  = pn.reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
              const pa  = pn.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
              if (pt > 0) prevScore = Math.min((pa / pt) * 100, 150)
            }
          }
        }
        const trend = prevScore != null ? +(score - prevScore).toFixed(1) : null

        return {
          user: u,
          score: +score.toFixed(1),
          goals: goals.length,
          completed,
          avgRating,
          achRate,
          ratedGoals: ratedGoals.length,
          goalList: goals,
          trend,
          prevScore: prevScore != null ? +prevScore.toFixed(1) : null,
        }
      }).filter(Boolean)
  }, [scopeUsers, allGoals, filterYear, filterMonth, filterWeek, activeMetric])

  // Group into 10 bands: 0-10, 10-20, ... 90-100, and overflow 100+
  const BANDS = [
    '0–10','10–20','20–30','30–40','40–50',
    '50–60','60–70','70–80','80–90','90–100','100+'
  ]
  // Forced top 15% and bottom 15%
  const { top15, bottom15, middle70 } = useMemo(() => {
    if (!employeeScores.length) return { top15: [], bottom15: [], middle70: [] }
    const sorted   = [...employeeScores].sort((a, b) => a.score - b.score)
    const total    = sorted.length
    const b15count = Math.max(1, Math.ceil(total * 0.15))
    const t15count = Math.max(1, Math.ceil(total * 0.15))
    return {
      bottom15: sorted.slice(0, b15count),
      top15:    sorted.slice(total - t15count),
      middle70: sorted.slice(b15count, total - t15count),
    }
  }, [employeeScores])

  // Employees in bottom 15% for 2+ consecutive months
  const persistentBottom = useMemo(() => {
    if (filterMonth === 0) return new Set()
    const result = new Set()
    const prevM  = filterMonth === 1 ? 12 : filterMonth - 1
    const prevY  = filterMonth === 1 ? filterYear - 1 : filterYear

    // Compute bottom 15% for prev month too
    const prevScores = allUsers
      .filter(u => visibleRoles.includes(u.role) && u.role !== 'CMD')
      .map(u => {
        const pg = allGoals.filter(g => g.user_id === u.id && g.year === prevY && g.month === prevM)
        if (!pg.length) return null
        let ps = 0
        if (activeMetric === 'rating') {
          const pr = pg.filter(g => g.manager_rating != null)
          if (!pr.length) return null
          ps = (pr.reduce((a, g) => a + g.manager_rating, 0) / pr.length / 5) * 100
        } else if (activeMetric === 'progress') {
          const pw = pg.filter(g => g.monthly_achievement != null)
          if (!pw.length) return null
          ps = pw.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / pw.length
        } else if (activeMetric === 'completion') {
          ps = pg.filter(g => g.status === 'Completed').length / pg.length * 100
        } else {
          const pn = pg.filter(g => !isNaN(parseFloat(g.monthly_target)))
          const pt = pn.reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
          const pa = pn.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
          if (pt === 0) return null
          ps = Math.min((pa / pt) * 100, 150)
        }
        return { userId: u.id, score: ps }
      }).filter(Boolean)

    if (prevScores.length) {
      const sorted      = [...prevScores].sort((a, b) => a.score - b.score)
      const b15count    = Math.max(1, Math.ceil(sorted.length * 0.15))
      const prevBottom  = new Set(sorted.slice(0, b15count).map(e => e.userId))
      // Intersection with current bottom 15%
      bottom15.forEach(emp => {
        if (prevBottom.has(emp.user.id)) result.add(emp.user.id)
      })
    }
    return result
  }, [bottom15, allGoals, allUsers, visibleRoles, filterMonth, filterYear, activeMetric])

  const bandData = useMemo(() => {
    const counts  = Array(11).fill(0)
    const members = Array.from({ length: 11 }, () => [])
    // Push full employee objects (not just user+score) so drill-down has all data
    employeeScores.forEach(emp => {
      const idx = emp.score >= 100 ? 10 : Math.floor(emp.score / 10)
      counts[idx]++
      members[idx].push(emp)
    })
    const max = Math.max(...counts, 1)
    return BANDS.map((label, i) => ({
      label,
      count:   counts[i],
      members: members[i],
      pct:     +(counts[i] / Math.max(employeeScores.length, 1) * 100).toFixed(1),
      height:  counts[i] / max,
      color:   i <= 2 ? '#DC2626' : i <= 4 ? '#D97706' : i <= 6 ? '#0891B2' : i <= 8 ? '#2563EB' : i === 9 ? '#059669' : '#047857',
    }))
  }, [employeeScores])

  // Stats
  const scores = employeeScores.map(e => e.score)
  const mean   = scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
  const sorted = [...scores].sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const stdDev = scores.length
    ? +(Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)).toFixed(1)
    : 0
  const top10  = employeeScores.filter(e => e.score >= 80).length
  const bottom10 = employeeScores.filter(e => e.score < 30).length

  const [hoveredBand, setHoveredBand] = useState(null)
  const [selectedBand, setSelectedBand] = useState(null)

  const metricLabel = { rating: 'Manager Rating (★)', progress: 'Avg Progress', completion: 'Completion Rate', achievement: 'Achievement Rate' }[activeMetric]

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Metric toggle */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Metric</label>
          <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 3, gap: 2 }}>
            {[
              { key: 'rating',      label: 'Manager Rating' },
              { key: 'progress',    label: 'Progress'       },
              { key: 'completion',  label: 'Completion'     },
              { key: 'achievement', label: 'Achievement'    },
            ].map(m => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                background: activeMetric === m.key ? 'var(--surface)' : 'transparent',
                color: activeMetric === m.key ? PALETTE.blue : 'var(--text-3)',
                fontWeight: activeMetric === m.key ? 700 : 500,
                boxShadow: activeMetric === m.key ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.15s',
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Year</label>
          <select className="select select-sm" style={{ minWidth: 90 }} value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Month</label>
          <select className="select select-sm" style={{ minWidth: 110 }} value={filterMonth} onChange={e => { setFilterMonth(+e.target.value); setFilterWeek(0) }}>
            <option value={0}>All Months</option>
            {MONTHS.map((mn, i) => <option key={i+1} value={i+1}>{mn}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Week</label>
          <select className="select select-sm" style={{ minWidth: 110 }} value={filterWeek} onChange={e => setFilterWeek(+e.target.value)} disabled={filterMonth === 0 || activeMetric !== 'progress'}>
            {WEEKS.map((w, i) => <option key={i} value={i}>{w}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Department</label>
          <select className="select select-sm" style={{ minWidth: 140 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            {depts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Role</label>
          <select className="select select-sm" style={{ minWidth: 120 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All">All Roles</option>
            {ORG_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Employees',    value: employeeScores.length,    color: PALETTE.blue,   icon: Users   },
          { label: 'Mean Score',   value: `${mean}%`,               color: PALETTE.violet, icon: BarChart2 },
          { label: 'Median Score', value: `${median}%`,             color: PALETTE.cyan,   icon: Activity },
          { label: 'Std Deviation',value: `±${stdDev}%`,            color: PALETTE.amber,  icon: TrendingUp },
          { label: 'High (≥80%)',  value: top10,                    color: PALETTE.green,  icon: CheckCircle },
          { label: 'Low (<30%)',   value: bottom10,                 color: bottom10 > 0 ? PALETTE.red : PALETTE.green, icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--r-xl)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50, borderRadius: '0 0 0 50px', background: `${s.color}08`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={11} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bell curve chart */}
      <div className="card mb-5">
        <div className="card-header">
          <div>
            <div className="card-title">Performance Distribution — {metricLabel}</div>
            <div className="card-subtitle">
              {filterMonth > 0 ? MONTHS[filterMonth - 1] : 'Full Year'} {filterYear}
              {filterWeek > 0 && activeMetric === 'progress' ? ` · Week ${filterWeek}` : ''}
              {filterDept !== 'All' ? ` · ${filterDept}` : ''}
              {filterRole !== 'All' ? ` · ${filterRole}` : ''}
              {' · '}{employeeScores.length} employees
            </div>
          </div>
        </div>
        <div className="card-body">
          {employeeScores.length === 0 ? (
            <EmptyState title="No data" description="Adjust filters to see distribution" />
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Y-axis label */}
              <div style={{ position: 'absolute', left: -8, top: '40%', transform: 'rotate(-90deg) translateX(-50%)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                No. of Employees
              </div>

              {/* Chart area */}
              <div style={{ marginLeft: 32, marginRight: 8 }}>
                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 260, paddingBottom: 0 }}>
                  {bandData.map((b, i) => (
                    <div
                      key={b.label}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: b.count > 0 ? 'pointer' : 'default' }}
                      onMouseEnter={() => setHoveredBand(i)}
                      onMouseLeave={() => setHoveredBand(null)}
                      onClick={() => setSelectedBand(selectedBand === i ? null : i)}
                    >
                      {/* Count label on top */}
                      {b.count > 0 && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: hoveredBand === i || selectedBand === i ? b.color : 'var(--text-3)', marginBottom: 4, transition: 'color 0.15s' }}>
                          {b.count}
                        </div>
                      )}
                      {/* Bar */}
                      <div style={{
                        width: '100%',
                        height: b.count === 0 ? 4 : Math.max(b.height * 220, 8),
                        background: selectedBand === i
                          ? b.color
                          : hoveredBand === i
                            ? `${b.color}CC`
                            : `${b.color}66`,
                        borderRadius: '6px 6px 0 0',
                        transition: 'all 0.2s ease',
                        border: selectedBand === i ? `2px solid ${b.color}` : '2px solid transparent',
                        position: 'relative',
                      }}>
                        {/* Pct inside bar if tall enough */}
                        {b.count > 0 && b.height > 0.2 && (
                          <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                            {b.pct}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smooth bell curve SVG overlay */}
                {employeeScores.length >= 3 && (() => {
                  const pts  = bandData.map((b, i) => ({ x: i, y: b.height }))
                  const W    = 100
                  const H    = 100
                  const padX = W / (pts.length * 2)
                  // Map each band center to SVG x coordinate
                  const toX  = (i) => padX + (i / (pts.length - 1)) * (W - 2 * padX)
                  const toY  = (h) => H - 8 - h * (H - 16)

                  // Build smooth cubic bezier path through all points
                  const pathD = pts.reduce((acc, pt, i) => {
                    const x = toX(pt.x), y = toY(pt.y)
                    if (i === 0) return `M ${x} ${y}`
                    const px = toX(pts[i-1].x), py = toY(pts[i-1].y)
                    const cpx = (px + x) / 2
                    return `${acc} C ${cpx} ${py}, ${cpx} ${y}, ${x} ${y}`
                  }, '')

                  return (
                    <div style={{ position: 'relative', height: 0 }}>
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        preserveAspectRatio="none"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          width: '100%',
                          height: 220,
                          pointerEvents: 'none',
                          overflow: 'visible',
                        }}
                      >
                        <defs>
                          <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%"   stopColor="#DC2626" stopOpacity="0.9" />
                            <stop offset="30%"  stopColor="#D97706" stopOpacity="0.9" />
                            <stop offset="50%"  stopColor="#2563EB" stopOpacity="0.9" />
                            <stop offset="75%"  stopColor="#059669" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
                          </linearGradient>
                        </defs>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="url(#bellGrad)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.85"
                        />
                        {/* Dots at each band peak */}
                        {pts.map((pt, i) => pt.y > 0 && (
                          <circle
                            key={i}
                            cx={toX(pt.x)}
                            cy={toY(pt.y)}
                            r="1.5"
                            fill={bandData[i].color}
                            opacity="0.9"
                          />
                        ))}
                      </svg>
                    </div>
                  )
                })()}

                {/* X-axis line */}
                <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

                {/* X labels */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {bandData.map(b => (
                    <div key={b.label} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-4)' }}>
                      {b.label}
                    </div>
                  ))}
                </div>

                {/* X axis title */}
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {metricLabel} (%)
                </div>

                {/* Mean + Median markers */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
                  {[
                    { label: `Mean: ${mean}%`, color: PALETTE.violet },
                    { label: `Median: ${median}%`, color: PALETTE.cyan },
                    { label: `Std Dev: ±${stdDev}%`, color: PALETTE.amber },
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 3, background: m.color, borderRadius: 2 }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 15% / Bottom 15% bands */}
      {employeeScores.length >= 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Top 15% */}
          <div style={{ background: '#D1FAE5', border: '1.5px solid #6EE7B7', borderRadius: 'var(--r-xl)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#065F46' }}>Top 15% Performers</div>
                <div style={{ fontSize: '0.72rem', color: '#047857' }}>{top15.length} employees · Exceptional performance</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {top15.map(emp => (
                <div key={emp.user.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, padding: '6px 10px', border: '1px solid #6EE7B7' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {emp.user.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#065F46' }}>{emp.user.name}</div>
                    <div style={{ fontSize: '0.62rem', color: '#047857' }}>
                      {emp.score}% · {emp.avgRating ? `★ ${emp.avgRating}` : 'No rating'} · {emp.user.department || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 15% */}
          <div style={{ background: '#FEE2E2', border: '1.5px solid #FCA5A5', borderRadius: 'var(--r-xl)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991B1B' }}>Bottom 15% — Needs Support</div>
                <div style={{ fontSize: '0.72rem', color: '#B91C1C' }}>{bottom15.length} employees · Requires attention</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {bottom15.map(emp => (
                <div key={emp.user.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, padding: '6px 10px', border: '1px solid #FCA5A5' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#DC2626', color: '#fff', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {emp.user.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {emp.user.name}
                      {persistentBottom.has(emp.user.id) && (
                        <span title="Bottom 15% for 2+ months" style={{ fontSize: '0.65rem' }}>⚠️</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#B91C1C' }}>
                      {emp.score}% · {emp.avgRating ? `★ ${emp.avgRating}` : 'No rating'} · {emp.user.department || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected band drill-down */}
      {selectedBand !== null && bandData[selectedBand].members.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bandData[selectedBand].color }} />
                Band {bandData[selectedBand].label}% — {bandData[selectedBand].count} Employees
              </div>
              <div className="card-subtitle">{metricLabel} in this range · click a row for details</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-xs btn-secondary"
                onClick={() => exportDrilldownCSV(bandData[selectedBand].members, bandData[selectedBand].label, metricLabel)}
              >
                <Download size={11} /> Export CSV
              </button>
              <button className="modal-close-btn" onClick={() => setSelectedBand(null)}>✕</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Manager Rating</th>
                  <th>Score</th>
                  <th>Trend</th>
                  <th>Goals</th>
                  <th>Completed</th>
                  <th>Ach. Rate</th>
                  <th>Band</th>
                </tr>
              </thead>
              <tbody>
                {[...bandData[selectedBand].members].sort((a, b) => b.score - a.score).map(emp => {
                  const isTop    = top15.some(t => t.user.id === emp.user.id)
                  const isBottom = bottom15.some(b => b.user.id === emp.user.id)
                  const band     = isTop ? 'top' : isBottom ? 'bottom' : 'middle'
                  return (
                    <tr key={emp.user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontWeight: 700 }}>{emp.user.name}</div>
                          {persistentBottom.has(emp.user.id) && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#991B1B', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                              ⚠ 2+ months low
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{emp.user.designation || '—'}</div>
                      </td>
                      <td><RoleBadge role={emp.user.role} /></td>
                      <td style={{ fontSize: '0.82rem' }}>{emp.user.department || '—'}</td>
                      <td>
                        {emp.avgRating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ color: s <= Math.round(emp.avgRating) ? '#D97706' : 'var(--border)', fontSize: '0.9rem' }}>★</span>
                            ))}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 3 }}>{emp.avgRating}/5</span>
                          </div>
                        ) : <span className="val-muted">—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 70, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(emp.score, 100)}%`, background: bandData[selectedBand].color, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: bandData[selectedBand].color }}>{emp.score}%</span>
                        </div>
                      </td>
                      <td>
                        {emp.trend == null || filterMonth === 0 ? (
                          <span className="val-muted">—</span>
                        ) : emp.trend > 0 ? (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                            ▲ +{emp.trend.toFixed(1)}%
                          </span>
                        ) : emp.trend < 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                            ▼ {emp.trend.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.82rem' }}>→ No change</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>{emp.goals}</td>
                      <td><span className="badge badge-green">{emp.completed}</span></td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{emp.achRate}%</td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          background: band === 'top' ? '#D1FAE5' : band === 'bottom' ? '#FEE2E2' : '#DBEAFE',
                          color:      band === 'top' ? '#065F46' : band === 'bottom' ? '#991B1B' : '#1D4ED8',
                        }}>
                          {band === 'top' ? '⬆ Top 15%' : band === 'bottom' ? '⬇ Bottom 15%' : '● Middle 70%'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const user = useAuthStore(s => s.user)
  const { data: allUsers = [], isLoading: uLoad } = useAllUsers()
  const { data: allGoals = [], isLoading: gLoad } = useAllGoals()

  const today    = new Date()
  const role     = user.role
  const curYear  = today.getFullYear()
  const curMonth = today.getMonth() + 1

  // Who this user can see
  const isOrgRole = ['Admin', 'CMD', 'VP', 'HR'].includes(role)
  const visibleRoles = useMemo(() => ({
    Admin:    ['CMD', 'VP', 'HR', 'Manager', 'Employee'],
    CMD:      ['CMD', 'VP', 'HR', 'Manager', 'Employee'],
    VP:       ['CMD', 'VP', 'HR', 'Manager', 'Employee'],
    HR:       ['CMD', 'VP', 'HR', 'Manager', 'Employee'],
    Manager:  ['Employee'],
    Employee: [],
  }[role] || []), [role])

  const [viewMode,   setViewMode]   = useState(isOrgRole ? 'org' : 'personal')
  const [viewUserId, setViewUserId] = useState(user.id)
  const [filterYear, setFilterYear] = useState(curYear)
  const [activeTab,  setActiveTab]  = useState('overview')
  const [activeKpi,  setActiveKpi]  = useState(null)   
  const [activeCard, setActiveCard] = useState(null)     // ← ADD HERE
  const navigate = useNavigate() 

  const viewableUsers = useMemo(() => {
    if (isOrgRole) return allUsers
    if (role === 'Manager') return [user, ...allUsers.filter(u => u.manager_id === user.id)]
    return [user]
  }, [allUsers, role, user, isOrgRole])

  const viewUser = allUsers.find(u => u.id === viewUserId) || user

  // ── Goal slices ──────────────────────────────────────────
  const orgScopeUsers = allUsers.filter(u => visibleRoles.includes(u.role) && u.is_active !== false)

  const yearGoals = useMemo(() => {
    if (viewMode === 'org') {
      return allGoals.filter(g => g.year === filterYear && orgScopeUsers.some(u => u.id === g.user_id))
    }
    return allGoals.filter(g => g.user_id === viewUserId && g.year === filterYear)
  }, [allGoals, viewMode, viewUserId, filterYear, orgScopeUsers])

  const thisMonthGoals = yearGoals.filter(g => g.month === curMonth)
  const prevMonth      = curMonth === 1 ? 12 : curMonth - 1
  const prevYear       = curMonth === 1 ? curYear - 1 : curYear
  const prevMonthGoals = useMemo(() => {
    if (viewMode === 'org') {
      return allGoals.filter(g => g.year === prevYear && g.month === prevMonth && orgScopeUsers.some(u => u.id === g.user_id))
    }
    return allGoals.filter(g => g.user_id === viewUserId && g.year === prevYear && g.month === prevMonth)
  }, [allGoals, viewMode, viewUserId, prevYear, prevMonth, orgScopeUsers])

  const ym = goalMetrics(yearGoals)
  const mm = goalMetrics(thisMonthGoals)
  const pm = goalMetrics(prevMonthGoals)

  // Monthly breakdown
  const monthlyData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const mo = i + 1
      const mg = viewMode === 'org'
        ? allGoals.filter(g => g.year === filterYear && g.month === mo && orgScopeUsers.some(u => u.id === g.user_id))
        : allGoals.filter(g => g.user_id === viewUserId && g.year === filterYear && g.month === mo)
      const mc  = mg.filter(g => g.status === 'Completed').length
      const numG  = mg.filter(g => !isNaN(parseFloat(g.monthly_target)) && parseFloat(g.monthly_target) > 0)
      const tgt   = numG.reduce((a, g) => a + parseFloat(g.monthly_target), 0)
      const ach   = numG.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
      const txtG  = mg.filter(g => isNaN(parseFloat(g.monthly_target)) && g.monthly_target)
      const txtOk = txtG.filter(g => g.monthly_achievement != null && String(g.monthly_achievement).trim() !== '').length
      const avg = mg.length ? mg.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / mg.length : 0
      return {
        month:    MONTH_SHORT[mo],
        goals:    mg.length,
        completed: mc,
        target:   tgt,
        achievement: ach,
        textGoals: txtG.length,
        textFilled: txtOk,
        progress: +avg.toFixed(1),
        compRate: mg.length ? +(mc / mg.length * 100).toFixed(1) : 0,
      }
    }),
    [allGoals, viewMode, viewUserId, filterYear, orgScopeUsers]
  )

  // Pie
  const pieData = useMemo(() => {
    const counts = {}
    yearGoals.forEach(g => { counts[g.status] = (counts[g.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [yearGoals])

  // Leaderboard
  const leaderboard = useMemo(() => {
    const scope = isOrgRole
      ? allUsers.filter(u => visibleRoles.includes(u.role))
      : role === 'Manager' ? allUsers.filter(u => u.manager_id === user.id) : []
    return scope.map(u => {
      const ug  = allGoals.filter(g => g.user_id === u.id && g.year === filterYear)
      if (!ug.length) return null
      const wp  = ug.filter(g => g.monthly_achievement != null)
      const avg = wp.length
        ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
        : 0
      const cr = ug.filter(g => g.status === 'Completed').length / ug.length * 100
      return { user: u, goals: ug.length, avgP: avg, compRate: cr, score: avg * 0.5 + cr * 0.5 }
    }).filter(Boolean).sort((a, b) => b.score - a.score)
  }, [allUsers, allGoals, isOrgRole, role, user.id, filterYear, visibleRoles])

  const years = [...new Set(allGoals.map(g => g.year))].sort((a, b) => b - a)
  if (!years.includes(curYear)) years.unshift(curYear)

  const TABS = [
    { key: 'overview',    label: 'Overview' },
    { key: 'trends',      label: 'Monthly Trends' },
    { key: 'department',  label: 'Departments', hide: !isOrgRole },
    { key: 'leaderboard', label: 'Leaderboard', hide: !isOrgRole && role !== 'Manager' },
    { key: 'bellcurve',   label: 'Bell Curve', hide: !isOrgRole || viewMode !== 'org' },
    { key: 'goals',       label: 'Goal Details' },
  ].filter(t => !t.hide)

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text)' }}>
            Analytics
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.84rem', marginTop: 4 }}>
            {viewMode === 'org' ? 'Organisation-wide performance insights' : `${viewUser.name}'s performance metrics`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Org / Personal toggle — only for org roles */}
          {isOrgRole && (
            <div style={{
              display: 'flex', background: 'var(--surface-2)',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              padding: 3, gap: 2,
            }}>
              {[{ key: 'org', label: 'Organisation' }, { key: 'personal', label: 'Personal' }].map(m => (
                <button key={m.key}
                  onClick={() => { setViewMode(m.key); setActiveTab('overview') }}
                  style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: viewMode === m.key ? 'var(--surface)' : 'transparent',
                    color: viewMode === m.key ? 'var(--primary)' : 'var(--text-3)',
                    fontWeight: viewMode === m.key ? 700 : 500,
                    fontSize: '0.8rem', cursor: 'pointer',
                    boxShadow: viewMode === m.key ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* User selector — personal mode only */}
          {viewMode === 'personal' && viewableUsers.length > 1 && (
            <select className="select select-sm select-auto" style={{ minWidth: 180 }} value={viewUserId}
              onChange={e => setViewUserId(e.target.value)}>
              {viewableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          )}

          <select className="select select-sm select-auto" style={{ minWidth: 100 }} value={filterYear}
            onChange={e => setFilterYear(+e.target.value)}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>

          <button className="btn btn-sm btn-secondary" onClick={() => goalsToCSV(yearGoals, allUsers)}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      
      {/* ── Org Summary Bar (org mode only) ─────────────── */}
      {viewMode === 'org' && (
        <OrgSummaryBar
          allGoals={allGoals}
          allUsers={allUsers}
          filterYear={filterYear}
          visibleRoles={visibleRoles}
        />
      )}

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="tabs-wrap mb-6">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 8, width: '100%' }}>
            {[
              { key: 'total',     label: 'Total Goals',     value: ym.total,                     color: '#2563EB', sub: `${ym.completed} completed` },
              { key: 'completed', label: 'Completion Rate',  value: `${ym.compRate.toFixed(1)}%`, color: ym.compRate >= 70 ? '#10B981' : ym.compRate >= 40 ? '#F59E0B' : '#EF4444', sub: `${ym.completed} of ${ym.total}` },
              { key: 'active', label: 'Avg Progress', value: `${ym.avgP.toFixed(1)}%`, color: ym.avgP >= 70 ? '#10B981' : ym.avgP >= 40 ? '#F59E0B' : '#EF4444', trend: ym.avgP >= 70 ? 'up' : ym.avgP >= 40 ? 'neutral' : 'down', trendVal: ym.avgP >= 70 ? 'On Track' : ym.avgP >= 40 ? 'At Risk' : 'Critical', sub: 'Overall performance' },
              { key: 'overdue',   label: 'Overdue',          value: ym.overdue,                   color: ym.overdue > 0 ? '#EF4444' : '#10B981', sub: 'Active past deadline' },
            ].map(card => (
              <KpiCard key={card.key} label={card.label} value={card.value}
                color={card.color} sub={card.sub}
                active={activeCard === card.key}
                onClick={() => setActiveCard(activeCard === card.key ? null : card.key)} />
            ))}
          </div>

          {activeCard && (() => {
            const today = new Date()
            const drill = activeCard === 'completed' ? yearGoals.filter(g => g.status === 'Completed')
              : activeCard === 'overdue'   ? yearGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today)
              : activeCard === 'active'    ? yearGoals.filter(g => g.status === 'Active')
              : yearGoals
            return (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {activeCard === 'total' ? 'All Goals' : activeCard === 'completed' ? 'Completed Goals' : activeCard === 'active' ? 'Active Goals' : 'Overdue Goals'} ({drill.length})
                  </span>
                  <button className="modal-close-btn" onClick={() => setActiveCard(null)}>✕</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        {viewMode === 'org' && <th>Employee</th>}
                        <th>Goal</th><th>Dept</th><th>Period</th><th>Target</th><th>Achievement</th><th>Progress</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drill.slice(0, 100).map(g => {
                        const p = calcProgress(g.monthly_achievement ?? 0, g.monthly_target)
                        const owner = viewMode === 'org' ? allUsers.find(u => u.id === g.user_id) : null
                        const isOverdue = g.status === 'Active' && g.end_date && new Date(g.end_date) < today
                        return (
                          <tr key={g.goal_id} style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/employees/${g.user_id}/goals/${g.year}/q/${g.quarter}/m/${g.month}`)}
                            onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {viewMode === 'org' && <td style={{ fontWeight: 600 }}>{owner?.name || '—'}</td>}
                            <td style={{ fontWeight: 600, maxWidth: 200 }}><div className="truncate">{g.goal_title}</div></td>
                            <td><span className="badge badge-gray">{g.department || '—'}</span></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{MONTH_NAMES[g.month]} {g.year}</td>
                            <td>{g.monthly_target}</td>
                            <td>{g.monthly_achievement ?? <span className="val-muted">—</span>}</td>
                            <td style={{ minWidth: 130 }}><ProgressBar value={p} size="h4" /><span className="text-sm text-muted">{p.toFixed(1)}%</span></td>
                            <td><StatusBadge status={isOverdue ? 'Overdue' : g.status} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* Target Achievement */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            <KpiCard
              label="Target Achievement" value={`${ym.achRate.toFixed(1)}%`}
              color={ym.achRate >= 80 ? PALETTE.green : ym.achRate >= 50 ? PALETTE.amber : PALETTE.red}
              icon={Award} sub={`${ym.totalAch} of ${ym.totalTgt} total`}
            />
            <KpiCard
              label="Goals This Month" value={mm.total}
              color={PALETTE.cyan} icon={BarChart2}
              sub={MONTH_NAMES[curMonth]}
              trend={trendCalc(mm.total, pm.total).dir}
              trendVal={trendCalc(mm.total, pm.total).label}
            />
            <KpiCard
              label="Completed This Month" value={mm.completed}
              color={PALETTE.green} icon={CheckCircle}
              sub={`of ${mm.total} this month`}
              trend={trendCalc(mm.completed, pm.completed).dir}
              trendVal={trendCalc(mm.completed, pm.completed).label}
            />
            <KpiCard
              label="Month Progress" value={`${mm.avgP.toFixed(1)}%`}
              color={mm.avgP >= 60 ? PALETTE.green : PALETTE.amber} icon={TrendingUp}
              sub={MONTH_NAMES[curMonth]}
              trend={trendCalc(mm.avgP, pm.avgP).dir}
              trendVal={trendCalc(mm.avgP, pm.avgP).label}
            />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Performance Gauges</div>
                  <div className="card-subtitle">Full year · {filterYear}</div>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center', gap: 32, alignItems: 'center' }}>
                <GaugeChart value={ym.avgP} label="Avg Progress" />
                <GaugeChart value={ym.compRate} label="Completion Rate" />
                <GaugeChart value={ym.achRate} label="Achievement" />
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Goal Status Breakdown</div>
                  <div className="card-subtitle">{ym.total} total goals</div>
                </div>
              </div>
              <div className="card-body">
                {pieData.length > 0
                  ? <StatusPieChart data={pieData} />
                  : <EmptyState title="No goals yet" description="Create goals to see breakdown" />
                }
              </div>
            </div>
          </div>

          {/* Monthly activity bar */}
          <div className="card mb-5">
            <div className="card-header">
              <div>
                <div className="card-title">Monthly Goal Activity</div>
                <div className="card-subtitle">{filterYear} — goals created vs completed per month</div>
              </div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="goals"     name="Total Goals" fill="#DBEAFE" radius={[4,4,0,0]} />
                  <Bar dataKey="completed" name="Completed"   fill={PALETTE.blue} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employee Movement — Joined & Left this year */}
          {viewMode === 'org' && (() => {
            const movementData = Array.from({ length: 12 }, (_, i) => {
              const mo = i + 1
              const joined = allUsers.filter(u => {
                if (!u.created_at || !visibleRoles.includes(u.role)) return false
                const d = new Date(u.created_at)
                return d.getFullYear() === filterYear && d.getMonth() + 1 === mo
              }).length
              const left = allUsers.filter(u => {
                if (!u.exit_date || !visibleRoles.includes(u.role)) return false
                const d = new Date(u.exit_date)
                return d.getFullYear() === filterYear && d.getMonth() + 1 === mo
              }).length
              return { month: MONTH_SHORT[mo], joined, left, mo }
            })

            const totalJoined = movementData.reduce((a, d) => a + d.joined, 0)
            const totalLeft   = movementData.reduce((a, d) => a + d.left, 0)
            if (!totalJoined && !totalLeft) return null

            return (
              <div className="card mb-5">
                <div className="card-header">
                  <div>
                    <div className="card-title">Employee Movement — {filterYear}</div>
                    <div className="card-subtitle">
                      {totalJoined} joined · {totalLeft} left · net {totalJoined - totalLeft >= 0 ? '+' : ''}{totalJoined - totalLeft}
                    </div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th style={{ color: PALETTE.green }}>Joined</th>
                        <th style={{ color: PALETTE.red }}>Left</th>
                        <th>Net Change</th>
                        <th>Joined Names</th>
                        <th>Left Names</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementData.filter(d => d.joined > 0 || d.left > 0).map(d => {
                        const net = d.joined - d.left
                        const joinedUsers = allUsers.filter(u => {
                          if (!u.created_at || !visibleRoles.includes(u.role)) return false
                          const dt = new Date(u.created_at)
                          return dt.getFullYear() === filterYear && dt.getMonth() + 1 === d.mo
                        })
                        const leftUsers = allUsers.filter(u => {
                          if (!u.exit_date || !visibleRoles.includes(u.role)) return false
                          const dt = new Date(u.exit_date)
                          return dt.getFullYear() === filterYear && dt.getMonth() + 1 === d.mo
                        })
                        return (
                          <tr key={d.month}>
                            <td className="font-600">{d.month}</td>
                            <td>
                              {d.joined > 0
                                ? <span style={{ fontWeight: 700, color: PALETTE.green }}>+{d.joined}</span>
                                : <span className="val-muted">—</span>}
                            </td>
                            <td>
                              {d.left > 0
                                ? <span style={{ fontWeight: 700, color: PALETTE.red }}>-{d.left}</span>
                                : <span className="val-muted">—</span>}
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                color: net > 0 ? PALETTE.green : net < 0 ? PALETTE.red : 'var(--text-3)'
                              }}>
                                {net > 0 ? `+${net}` : net < 0 ? net : '0'}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                              {joinedUsers.length > 0
                                ? joinedUsers.map(u => u.name).join(', ')
                                : <span className="val-muted">—</span>}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                              {leftUsers.length > 0
                                ? leftUsers.map(u => u.name).join(', ')
                                : <span className="val-muted">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* Org mode: dept + risk */}
          {viewMode === 'org' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
              <DeptLeaderboard
                allGoals={allGoals} allUsers={allUsers}
                filterYear={filterYear} visibleRoles={visibleRoles}
                onDeptClick={() => setActiveTab('department')}
              />
              <RiskPanel
                allGoals={allGoals} allUsers={allUsers}
                filterYear={filterYear} visibleRoles={visibleRoles}
              />
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          TRENDS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'trends' && (
        <>
          <SLabel>
            {viewMode === 'org' ? 'Organisation' : viewUser.name} — Monthly Trends · {filterYear}
          </SLabel>

          <div className="card mb-5">
            <div className="card-header">
              <div>
                <div className="card-title">Completion Rate & Progress Trend</div>
                <div className="card-subtitle">12-month rolling view with 70% benchmark</div>
              </div>
            </div>
            <div className="card-body">
              {monthlyData.some(d => d.goals > 0) ? (
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gradComp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.blue}  stopOpacity={0.15} />
                        <stop offset="95%" stopColor={PALETTE.blue}  stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradProg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.green} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={PALETTE.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => `${v?.toFixed(1)}%`} />
                    <ReferenceLine y={70} stroke="#E5E7EB" strokeDasharray="4 2"
                      label={{ value: '70% target', position: 'right', fontSize: 10, fill: '#9CA3AF' }} />
                    <Area type="monotone" dataKey="compRate" name="Completion Rate"
                      stroke={PALETTE.blue} strokeWidth={2.5} fill="url(#gradComp)"
                      dot={{ r: 3, fill: PALETTE.blue }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="progress" name="Avg Progress"
                      stroke={PALETTE.green} strokeWidth={2.5} fill="url(#gradProg)"
                      dot={{ r: 3, fill: PALETTE.green }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No data for this period" description="Goals across multiple months will show trends" />
              )}
            </div>
          </div>

          <div className="card mb-5">
            <div className="card-header">
              <div>
                <div className="card-title">Target vs Achievement</div>
                <div className="card-subtitle">Monthly comparison of set targets vs actual results</div>
              </div>
            </div>
            <div className="card-body">
              <MonthlyTrendChart data={monthlyData} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Monthly Breakdown</div>
              <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(yearGoals, allUsers)}>
                <Download size={11} /> CSV
              </button>
            </div>
            <div style={{ padding: 0, overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Month</th><th>Goals</th><th>Completed</th>
                    <th>Target Sum</th><th>Achievement Sum</th>
                    <th>Achievement Rate</th><th>Completion Rate</th><th>Avg Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.filter(d => d.goals > 0).length === 0
                    ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No goals for {filterYear}</td></tr>
                    : monthlyData.filter(d => d.goals > 0).map(d => {
                      const numericRate = d.target > 0 ? (d.achievement / d.target * 100) : null
                      const textRate    = d.textGoals > 0 ? (d.textFilled / d.textGoals * 100) : null
                      const totalForRate = (d.target > 0 ? 1 : 0) * (numericRate ?? 0) + (d.textGoals > 0 ? d.textGoals : 0) * (textRate ?? 0)
                      const countForRate = (d.target > 0 ? 1 : 0) + (d.textGoals || 0)
                      const achRate = numericRate !== null && textRate !== null
                        ? (numericRate + textRate * d.textGoals) / (1 + d.textGoals)
                        : numericRate !== null ? numericRate
                        : textRate   !== null ? textRate
                        : 0
                      return (
                        <tr key={d.month}>
                          <td className="font-600">{d.month}</td>
                          <td>{d.goals}</td>
                          <td><span className="badge badge-green">{d.completed}</span></td>
                          <td>{d.target}</td>
                          <td>{d.achievement}</td>
                          <td style={{ minWidth: 160 }}>
                            <ProgressBar value={achRate} size="h6" />
                            <span className="text-sm text-muted">{achRate.toFixed(1)}%</span>
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <ProgressBar value={d.compRate} size="h6" />
                            <span className="text-sm text-muted">{d.compRate}%</span>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            <ProgressBar value={d.progress} size="h6" />
                            <span className="text-sm text-muted">{d.progress}%</span>
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

      {/* ══════════════════════════════════════════════════
          DEPARTMENTS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'department' && (
        <>
          <SLabel>Department Performance — {filterYear}</SLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 18, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Completion & Progress by Department</div>
                  <div className="card-subtitle">Grouped bar — completion rate vs avg progress</div>
                </div>
              </div>
              <div className="card-body">
                <DeptBarChart data={(() => {
                  const map = {}
                  allGoals.filter(g => g.year === filterYear && orgScopeUsers.some(u => u.id === g.user_id))
                    .forEach(g => {
                      const d = g.department || 'Unassigned'
                      if (!map[d]) map[d] = { goals: 0, completed: 0, progress: [] }
                      map[d].goals++
                      if (g.status === 'Completed') map[d].completed++
                      if (g.monthly_achievement != null)
                        map[d].progress.push(calcProgress(g.monthly_achievement, g.monthly_target))
                    })
                  return Object.entries(map)
                    .map(([dept, v]) => ({
                      dept: dept.length > 10 ? dept.slice(0, 10) + '…' : dept,
                      completion: v.goals ? +(v.completed / v.goals * 100).toFixed(1) : 0,
                      progress:   v.progress.length ? +(v.progress.reduce((a, b) => a + b) / v.progress.length).toFixed(1) : 0,
                    }))
                    .sort((a, b) => b.completion - a.completion)
                    .slice(0, 8)
                })()} />
              </div>
            </div>

            {/* Quick dept stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const map = {}
                allGoals.filter(g => g.year === filterYear && orgScopeUsers.some(u => u.id === g.user_id))
                  .forEach(g => {
                    const d = g.department || 'Unassigned'
                    if (!map[d]) map[d] = { goals: 0, completed: 0 }
                    map[d].goals++
                    if (g.status === 'Completed') map[d].completed++
                  })
                const sorted = Object.entries(map)
                  .map(([dept, v]) => ({ dept, cr: v.goals ? v.completed / v.goals * 100 : 0 }))
                  .sort((a, b) => b.cr - a.cr)
                const best  = sorted[0]
                const worst = sorted[sorted.length - 1]
                const total = Object.values(map).reduce((a, v) => a + v.goals, 0)
                return [
                  { label: 'Departments Tracked', value: Object.keys(map).length, color: PALETTE.blue, icon: Globe },
                  { label: 'Top Dept Completion', value: best ? `${best.cr.toFixed(0)}%` : '—', sub: best?.dept, color: PALETTE.green, icon: Award },
                  { label: 'Needs Attention', value: worst?.cr < 40 ? worst.dept : 'None', color: worst?.cr < 40 ? PALETTE.red : PALETTE.green, icon: AlertTriangle },
                ].map(s => <KpiCard key={s.label} {...s} />)
              })()}
            </div>
          </div>

          <DeptLeaderboard allGoals={allGoals} allUsers={allUsers} filterYear={filterYear} visibleRoles={visibleRoles} />
        </>
      )}

      {/* ══════════════════════════════════════════════════
          LEADERBOARD TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'leaderboard' && (
        <>
          <SLabel>Performance Leaderboard — {filterYear}</SLabel>

          {leaderboard.length === 0 ? (
            <div className="card card-body">
              <EmptyState title="No leaderboard data" description="Team members with goals will appear here" />
            </div>
          ) : (
            <>
              {/* Top 3 podium */}
              {leaderboard.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  {leaderboard.slice(0, 3).map((p, i) => {
                    const podiumColor = [PALETTE.amber, PALETTE.slate, '#B45309'][i]
                    const podiumLabel = ['1st Place', '2nd Place', '3rd Place'][i]
                    return (
                      <div key={p.user.id} style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderTop: `3px solid ${podiumColor}`,
                        borderRadius: 'var(--r-xl)',
                        padding: '24px 20px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `${podiumColor}04`, pointerEvents: 'none' }} />
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: podiumColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                          {podiumLabel}
                        </div>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${podiumColor}, ${podiumColor}88)`,
                          color: '#fff', fontWeight: 700, fontSize: '1.2rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 12px',
                          boxShadow: `0 4px 14px ${podiumColor}40`,
                        }}>
                          {p.user.name[0]}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{p.user.name}</div>
                        <RoleBadge role={p.user.role} />
                        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {[
                            { label: 'Progress', value: `${p.avgP.toFixed(0)}%`, color: PALETTE.blue },
                            { label: 'Completion', value: `${p.compRate.toFixed(0)}%`, color: PALETTE.green },
                            { label: 'Score', value: p.score.toFixed(0), color: podiumColor },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 4px' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Full table */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Full Rankings</div>
                  <div className="card-subtitle">{leaderboard.length} employees ranked</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th><th>Name</th><th>Role</th><th>Department</th>
                        <th>Goals</th><th>Avg Progress</th><th>Completion Rate</th>
                        <th>Achievement</th><th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((p, i) => {
                        const ug = allGoals.filter(g => g.user_id === p.user.id && g.year === filterYear)
                        const tgt = ug.reduce((a, g) => a + (g.monthly_target || 0), 0)
                        const ach = ug.reduce((a, g) => a + (g.monthly_achievement || 0), 0)
                        const achR = tgt ? (ach / tgt * 100) : 0
                        return (
                          <tr
                            key={p.user.id}
                            style={{ background: p.user.id === viewUserId && viewMode === 'personal' ? '#EFF6FF' : '', cursor: 'pointer', transition: 'background 0.12s' }}
                            onClick={() => navigate(`/employees/${p.user.id}/goals`)}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = p.user.id === viewUserId && viewMode === 'personal' ? '#EFF6FF' : ''}
                          >
                            <td><RankBadge rank={i + 1} /></td>
                            <td>
                              <div className="font-600">{p.user.name}</div>
                              {p.user.id === user.id && <span className="badge badge-blue" style={{ fontSize: '0.6rem', marginTop: 2 }}>You</span>}
                            </td>
                            <td><RoleBadge role={p.user.role} /></td>
                            <td style={{ fontSize: '0.82rem' }}>{p.user.department || '—'}</td>
                            <td>{p.goals}</td>
                            <td style={{ minWidth: 140 }}>
                              <ProgressBar value={p.avgP} size="h6" />
                              <span className="text-sm text-muted">{p.avgP.toFixed(1)}%</span>
                            </td>
                            <td style={{ minWidth: 140 }}>
                              <ProgressBar value={p.compRate} size="h6" />
                              <span className="text-sm text-muted">{p.compRate.toFixed(1)}%</span>
                            </td>
                            <td style={{ minWidth: 130 }}>
                              <ProgressBar value={achR} size="h6" />
                              <span className="text-sm text-muted">{achR.toFixed(1)}%</span>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 800, fontSize: '0.95rem',
                                color: i === 0 ? PALETTE.amber : i === 1 ? PALETTE.slate : i === 2 ? '#B45309' : 'var(--text)',
                              }}>
                                {p.score.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════ BELL CURVE TAB ══════════ */}
      {activeTab === 'bellcurve' && (
        <BellCurveTab
          allGoals={allGoals}
          allUsers={allUsers}
          visibleRoles={visibleRoles}
          curYear={curYear}
        />
      )}

      {/* ══════════════════════════════════════════════════
          GOAL DETAILS TAB
      ══════════════════════════════════════════════════ */}
      {activeTab === 'goals' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SLabel>
              {viewMode === 'org' ? 'Organisation' : viewUser.name} — {yearGoals.length} Goals · {filterYear}
            </SLabel>
            <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(yearGoals, allUsers)}>
              <Download size={11} /> Export CSV
            </button>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              {yearGoals.length === 0 ? (
                <div style={{ padding: 48 }}>
                  <EmptyState title="No goals for this period" description="Select a different user or year" />
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {viewMode === 'org' && <th>Employee</th>}
                      <th>Goal Title</th><th>Department</th><th>Period</th>
                      <th>Target</th><th>Achievement</th><th>Progress</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearGoals.map(g => {
                      const p     = calcProgress(g.monthly_achievement, g.monthly_target)
                      const owner = viewMode === 'org' ? allUsers.find(u => u.id === g.user_id) : null
                      return (
                        <tr
                          key={g.goal_id}
                          style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                          onClick={() => navigate(`/employees/${g.user_id}/goals/${g.year}/q/${g.quarter}/m/${g.month}`)}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          {viewMode === 'org' && (
                            <td>
                              <div className="font-600" style={{ fontSize: '0.84rem' }}>{owner?.name || '—'}</div>
                              {owner && <RoleBadge role={owner.role} />}
                            </td>
                          )}
                          <td className="font-600" style={{ maxWidth: 220 }}>
                            <div className="truncate">{g.goal_title}</div>
                          </td>
                          <td><span className="badge badge-gray">{g.department || '—'}</span></td>
                          <td className="text-muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {MONTH_NAMES[g.month]} {g.year}
                          </td>
                          <td className="font-600">{g.monthly_target}</td>
                          <td>
                            {g.monthly_achievement != null
                              ? <span className={p >= 100 ? 'val-success' : p >= 60 ? 'val-warning' : 'val-danger'}>
                                  {g.monthly_achievement}
                                </span>
                              : <span className="val-muted">—</span>
                            }
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <ProgressBar value={p} size="h6" />
                            <span className="text-sm text-muted">{p.toFixed(1)}%</span>
                          </td>
                          <td><StatusBadge status={g.status === 'Active' && g.end_date && new Date(g.end_date) < new Date() ? 'Overdue' : g.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}