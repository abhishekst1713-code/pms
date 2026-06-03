import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useUserGoals } from '../../hooks/useData'
import { MONTH_NAMES, QUARTER_LABELS } from '../../lib/constants'
import { calcProgress } from '../../lib/constants'
import {
  Target, CheckCircle, AlertTriangle, Activity,
  Search, X, ChevronRight, Calendar, BarChart2
} from 'lucide-react'

// ── Palette ───────────────────────────────────────────────────
const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  indigo: '#6366F1',
  violet: '#7C3AED',
}

const YEAR_COLORS = [P.blue, P.violet, P.indigo, P.green]

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

export default function MyGoalsPage() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [searchMonth, setSearchMonth] = useState('')

  const { data: goals = [], isLoading } = useUserGoals(user.id)

  const visibleGoals = user.manager_id
    ? goals.filter(g => g.approval_status === 'approved')
    : goals

  const years = useMemo(() => {
    const ys  = [...new Set(visibleGoals.map(g => g.year))].sort((a, b) => b - a)
    const cur = new Date().getFullYear()
    if (!ys.includes(cur)) ys.unshift(cur)
    return ys
  }, [visibleGoals])

  const filteredByMonth = searchMonth
    ? visibleGoals.filter(g => g.month === parseInt(searchMonth))
    : []

  const today       = new Date()
  const currentYear = today.getFullYear()

  // All-time summary
  const totalGoals    = visibleGoals.length
  const totalCompleted = visibleGoals.filter(g => g.status === 'Completed').length
  const avgP = visibleGoals.length
    ? visibleGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / visibleGoals.length
    : 0
  const overdue = visibleGoals.filter(g =>
    g.status === 'Active' && g.end_date && new Date(g.end_date) < today
  ).length
  const compRate = totalGoals ? (totalCompleted / totalGoals * 100) : 0

  function yearStats(y) {
    const yg        = visibleGoals.filter(g => g.year === y)
    const completed = yg.filter(g => g.status === 'Completed').length
    const avgY = yg.length
      ? yg.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / yg.length
      : 0
    const overdueY  = yg.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
    return { total: yg.length, completed, avgP: avgY, overdue: overdueY }
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
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {user.role} · Goal Tracker
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            My Goals
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
            {user.name}{user.designation ? ` · ${user.designation}` : ''}
          </p>
        </div>
      </div>

      {/* ── All-time summary dark bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: 'var(--r-xl)', padding: '18px 24px', marginBottom: 24,
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
      }}>
        {[
          { label: 'Total Goals',    value: totalGoals,              icon: Target,        color: '#93C5FD' },
          { label: 'Completed',      value: totalCompleted,           icon: CheckCircle,   color: '#6EE7B7' },
          { label: 'Completion',     value: `${compRate.toFixed(1)}%`, icon: BarChart2,     color: compRate >= 70 ? '#6EE7B7' : '#FCD34D' },
          { label: 'Avg Progress',   value: `${avgP.toFixed(1)}%`,    icon: Activity,      color: avgP >= 70 ? '#6EE7B7' : '#FCD34D' },
          { label: 'Overdue',        value: overdue,                  icon: AlertTriangle, color: overdue > 0 ? '#FCA5A5' : '#6EE7B7' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '0 18px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <s.icon size={13} color={s.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Month Search ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={14} color={P.blue} />
            </div>
            <div>
              <div className="card-title">Quick Month Search</div>
              <div className="card-subtitle">Jump directly to a specific month's goals</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="select"
              style={{ maxWidth: 220 }}
              value={searchMonth}
              onChange={e => setSearchMonth(e.target.value)}
            >
              <option value="">Select a month…</option>
              {MONTH_NAMES.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            {searchMonth && (
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => setSearchMonth('')}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Search results */}
          {searchMonth && (
            <div style={{ marginTop: 16 }}>
              {filteredByMonth.length === 0 ? (
                <div style={{ padding: '16px 0', fontSize: '0.84rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  No goals found in {MONTH_NAMES[parseInt(searchMonth)]}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    {filteredByMonth.length} goal{filteredByMonth.length !== 1 ? 's' : ''} in {MONTH_NAMES[parseInt(searchMonth)]}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredByMonth.map(g => {
                      const p = calcProgress(g.monthly_achievement, g.monthly_target)
                      const progressColor = p >= 80 ? P.green : p >= 50 ? P.amber : P.red
                      return (
                        <div
                          key={g.goal_id}
                          onClick={() => navigate(`/my-goals/${g.year}/q/${g.quarter}/m/${g.month}`)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', background: 'var(--surface-2)',
                            border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                            cursor: 'pointer', transition: 'background 0.12s, box-shadow 0.12s',
                            gap: 12,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--primary-border)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.goal_title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                              {MONTH_NAMES[g.month]} {g.year} · {QUARTER_LABELS[g.quarter]}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: progressColor }}>{p.toFixed(0)}%</div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', textTransform: 'uppercase' }}>Progress</div>
                            </div>
                            <ChevronRight size={14} color="var(--text-4)" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Year Cards ── */}
      <SLabel>Select Year</SLabel>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--r-xl)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {years.map((y, idx) => {
            const s           = yearStats(y)
            const isCurrent   = y === currentYear
            const color       = YEAR_COLORS[idx % YEAR_COLORS.length]
            const progressColor = s.avgP >= 70 ? P.green : s.avgP >= 40 ? P.amber : s.avgP > 0 ? P.red : 'var(--text-4)'

            return (
              <div
                key={y}
                onClick={() => navigate(`/my-goals/${y}`)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isCurrent ? color : 'var(--border)'}`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 'var(--r-xl)',
                  padding: '22px 24px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, transform 0.18s',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isCurrent ? `0 0 0 2px ${color}25, 0 2px 8px rgba(0,0,0,0.06)` : '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.10)`
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = isCurrent ? `0 0 0 2px ${color}25` : '0 1px 4px rgba(0,0,0,0.05)'
                  e.currentTarget.style.transform = ''
                }}
              >
                {/* bg tint */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, borderRadius: '0 0 0 100px', background: `${color}07`, pointerEvents: 'none' }} />

                {/* Year + current badge + arrow */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} color={color} />
                    <span style={{ fontSize: '2rem', fontWeight: 900, color, letterSpacing: '-0.05em', lineHeight: 1 }}>{y}</span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: P.blue, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Current
                      </span>
                    )}
                  </div>
                  <ChevronRight size={17} color="var(--text-4)" style={{ marginTop: 4 }} />
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Goals',     value: s.total,     color: color   },
                    { label: 'Completed', value: s.completed, color: P.green },
                    { label: 'Overdue',   value: s.overdue,   color: s.overdue > 0 ? P.red : P.green },
                  ].map(st => (
                    <div key={st.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '9px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: st.color, lineHeight: 1, marginBottom: 3 }}>{st.value}</div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Progress</span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: progressColor }}>
                      {s.total > 0 ? `${s.avgP.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(s.avgP, 100)}%`, background: progressColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                {s.total === 0 && (
                  <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-4)', fontStyle: 'italic' }}>
                    No goals yet — click to start
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}