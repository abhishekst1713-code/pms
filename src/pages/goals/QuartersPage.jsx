import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useUserGoals } from '../../hooks/useData'
import { QUARTER_LABELS } from '../../lib/constants'
import { calcProgress } from '../../lib/constants'
import { Calendar, ChevronRight, BarChart2, CheckCircle, Activity, AlertTriangle } from 'lucide-react'

const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  indigo: '#6366F1',
  violet: '#7C3AED',
}

const QUARTER_COLORS = [P.blue, P.indigo, P.violet, P.green]

export default function QuartersPage({ mine }) {
  const { year, empId } = useParams()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const targetId = mine ? user.id : empId
  const { data: goals = [], isLoading } = useUserGoals(targetId)
  const yr = parseInt(year)
  const base = mine ? `/my-goals/${yr}` : `/employees/${empId}/goals/${yr}`
  const today = new Date()

  const yearGoals = useMemo(
    () => goals.filter(g => g.year === yr),
    [goals, yr]
  )

  function quarterStats(q) {
    const qg        = yearGoals.filter(g => g.quarter === q)
    const completed = qg.filter(g => g.status === 'Completed').length
    const wp        = qg.filter(g => g.monthly_achievement != null)
    const avgP      = wp.length
      ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
      : 0
    const overdue   = qg.filter(g =>
      g.status === 'Active' && g.end_date && new Date(g.end_date) < today
    ).length
    return { total: qg.length, completed, avgP, overdue }
  }

  // Year-level summary across all quarters
  const totalGoals     = yearGoals.length
  const totalCompleted = yearGoals.filter(g => g.status === 'Completed').length
  const wp             = yearGoals.filter(g => g.monthly_achievement != null)
  const avgP           = wp.length
    ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
    : 0
  const overdue        = yearGoals.filter(g =>
    g.status === 'Active' && g.end_date && new Date(g.end_date) < today
  ).length
  const compRate       = totalGoals ? (totalCompleted / totalGoals * 100) : 0

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
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span
              onClick={() => navigate(mine ? '/my-goals' : `/employees/${empId}/goals`)}
              style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
            >
              My Goals
            </span>
            <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {yr}
            </span>
          </div>

          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Goal Tracker · {yr}
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Select Quarter
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
            {totalGoals} goal{totalGoals !== 1 ? 's' : ''} across {yr}
          </p>
        </div>
      </div>

      {/* ── Year Summary Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: 'var(--r-xl)', padding: '18px 24px', marginBottom: 24,
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
      }}>
        {[
          { label: 'Total Goals',  value: totalGoals,               icon: Calendar,      color: '#93C5FD' },
          { label: 'Completed',    value: totalCompleted,            icon: CheckCircle,   color: '#6EE7B7' },
          { label: 'Completion',   value: `${compRate.toFixed(1)}%`, icon: BarChart2,     color: compRate >= 70 ? '#6EE7B7' : '#FCD34D' },
          { label: 'Avg Progress', value: `${avgP.toFixed(1)}%`,    icon: Activity,      color: avgP >= 70 ? '#6EE7B7' : '#FCD34D' },
          { label: 'Overdue',      value: overdue,                   icon: AlertTriangle, color: overdue > 0 ? '#FCA5A5' : '#6EE7B7' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '0 18px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <s.icon size={13} color={s.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Section Label ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
          Select Quarter
        </div>
      </div>

      {/* ── Quarter Cards ── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--r-xl)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {[1, 2, 3, 4].map((q, idx) => {
            const s             = quarterStats(q)
            const color         = QUARTER_COLORS[idx]
            const progressColor = s.avgP >= 70 ? P.green : s.avgP >= 40 ? P.amber : s.avgP > 0 ? P.red : 'var(--text-4)'

            return (
              <div
                key={q}
                onClick={() => navigate(`${base}/q/${q}`)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid var(--border)`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 'var(--r-xl)',
                  padding: '22px 24px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, transform 0.18s',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.10)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                  e.currentTarget.style.transform = ''
                }}
              >
                {/* Background tint */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, borderRadius: '0 0 0 100px', background: `${color}07`, pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarChart2 size={16} color={color} />
                    <div>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color, letterSpacing: '-0.05em', lineHeight: 1 }}>Q{q}</span>
                    </div>
                  </div>
                  <ChevronRight size={17} color="var(--text-4)" style={{ marginTop: 4 }} />
                </div>

                {/* Quarter label */}
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 14 }}>
                  {QUARTER_LABELS[q]}
                </div>

                {/* Stats mini-grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Goals',     value: s.total,     color: color   },
                    { label: 'Done',      value: s.completed, color: P.green },
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