import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useUserGoals, useAllUsers } from '../../hooks/useData'
import { QUARTER_MONTHS, MONTH_NAMES, QUARTER_LABELS } from '../../lib/constants'
import { calcProgress } from '../../lib/constants'
import { ChevronLeft, ChevronRight, Target, CheckCircle, AlertTriangle } from 'lucide-react'

const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  indigo: '#6366F1',
  violet: '#7C3AED',
}

// Distinct color per month position in quarter
const MONTH_COLORS = [P.blue, P.violet, P.indigo]

export default function MonthsPage({ mine }) {
  const { year, quarter, empId } = useParams()
  const user      = useAuthStore(s => s.user)
  const navigate  = useNavigate()
  const { data: allUsers = [] } = useAllUsers()

  const targetId = mine ? user.id : empId
  const yr = parseInt(year)
  const q  = parseInt(quarter)
  const months = QUARTER_MONTHS[q] || []

  const { data: goals = [] } = useUserGoals(targetId)

  const viewerEmp = !mine ? allUsers.find(u => u.id === empId) : null
  const backPath  = mine
    ? `/my-goals/${yr}`
    : `/employees/${empId}/goals/${yr}`
  const base = mine
    ? `/my-goals/${yr}/q/${q}`
    : `/employees/${empId}/goals/${yr}/q/${q}`

  const today = new Date()

  function monthStats(m) {
    const mg        = goals.filter(g => g.year === yr && g.quarter === q && g.month === m)
    const completed = mg.filter(g => g.status === 'Completed').length
    const wp        = mg.filter(g => g.monthly_achievement != null)
    const avgP      = wp.length
      ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
      : 0
    const overdue   = mg.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
    const isCurrent = new Date().getMonth() + 1 === m && new Date().getFullYear() === yr
    return { total: mg.length, completed, avgP, overdue, isCurrent }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '0.8rem' }}>
        <button
          onClick={() => navigate(backPath)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: P.blue, fontWeight: 600, padding: 0, fontSize: '0.8rem' }}
        >
          <ChevronLeft size={14} /> Year {yr}
        </button>
        <span style={{ color: 'var(--text-4)' }}>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>Q{q} — {QUARTER_LABELS[q]}</span>
      </div>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)',
        borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {mine ? 'My Goals' : viewerEmp?.name} · Q{q} · {yr}
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            {QUARTER_LABELS[q]} — Select Month
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
            Choose a month to view or manage goals
          </p>
        </div>
      </div>

      {/* Month Cards — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {months.map((m, idx) => {
          const s     = monthStats(m)
          const color = MONTH_COLORS[idx % MONTH_COLORS.length]
          const progressColor = s.avgP >= 70 ? P.green : s.avgP >= 40 ? P.amber : s.avgP > 0 ? P.red : 'var(--text-4)'

          return (
            <div
              key={m}
              onClick={() => navigate(`${base}/m/${m}`)}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${s.isCurrent ? color : 'var(--border)'}`,
                borderTop: `3px solid ${color}`,
                borderRadius: 'var(--r-xl)',
                padding: '22px 22px 18px',
                cursor: 'pointer',
                transition: 'box-shadow 0.18s, transform 0.18s',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: s.isCurrent ? `0 0 0 2px ${color}30` : '0 1px 4px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.10)`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = s.isCurrent ? `0 0 0 2px ${color}30` : '0 1px 4px rgba(0,0,0,0.05)'
                e.currentTarget.style.transform = ''
              }}
            >
              {/* bg tint */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${color}07`, pointerEvents: 'none' }} />

              {/* Month name + current badge + arrow */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                    {MONTH_NAMES[m]}
                  </div>
                  {s.isCurrent && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: P.blue, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Current
                    </span>
                  )}
                </div>
                <ChevronRight size={15} color="var(--text-4)" style={{ marginTop: 2 }} />
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Goals',     value: s.total,     color: color    },
                  { label: 'Done',      value: s.completed, color: P.green  },
                  { label: 'Overdue',   value: s.overdue,   color: s.overdue > 0 ? P.red : P.green },
                ].map(st => (
                  <div key={st.label} style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '7px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: st.color, lineHeight: 1, marginBottom: 2 }}>{st.value}</div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Progress</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: progressColor }}>
                    {s.total > 0 ? `${s.avgP.toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(s.avgP, 100)}%`, background: progressColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>

              {s.total === 0 && (
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-4)', fontStyle: 'italic' }}>No goals yet</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}