import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAllUsers, useUserGoals } from '../../hooks/useData'
import { EmptyState, RoleBadge } from '../../components/ui/index.jsx'
import { calcProgress } from '../../lib/constants'
import { ChevronLeft, Calendar, Target, CheckCircle, BarChart2, ChevronRight } from 'lucide-react'

const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  indigo: '#6366F1',
}

const AVATAR_COLORS = [P.blue, '#7C3AED', P.green, '#0891B2', P.amber, P.indigo]

export default function EmployeeGoals() {
  const { empId }  = useParams()
  const navigate   = useNavigate()
  const { data: allUsers = [] }                    = useAllUsers()
  const { data: goals = [], isLoading }            = useUserGoals(empId)

  const emp         = allUsers.find(u => u.id === empId)
  const avatarColor = emp ? AVATAR_COLORS[emp.name.charCodeAt(0) % AVATAR_COLORS.length] : P.blue

  const years = [...new Set(goals.map(g => g.year))].sort((a, b) => b - a)
  const currentYear = new Date().getFullYear()
  if (!years.includes(currentYear)) years.unshift(currentYear)

  // Per-year stats
  function yearStats(y) {
    const yg        = goals.filter(g => g.year === y)
    const completed = yg.filter(g => g.status === 'Completed').length
    const wp        = yg.filter(g => g.monthly_achievement != null)
    const avgP      = wp.length
      ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
      : 0
    const compRate  = yg.length ? (completed / yg.length * 100) : 0
    return { total: yg.length, completed, avgP, compRate }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '0.8rem' }}>
        <button
          onClick={() => navigate('/employees')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: P.blue, fontWeight: 600, padding: 0, fontSize: '0.8rem' }}
        >
          <ChevronLeft size={14} /> Employees
        </button>
        <span style={{ color: 'var(--text-4)' }}>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{emp?.name || empId}</span>
      </div>

      {/* Page Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)',
        borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -70, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
            color: '#fff', fontWeight: 800, fontSize: '1.4rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${avatarColor}50`,
            border: '2px solid rgba(255,255,255,0.2)',
          }}>
            {emp?.name?.[0] || '?'}
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Employee Goals
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
              {emp?.name || empId}
            </h1>
            {emp && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                {emp.designation}{emp.designation && emp.department ? ' · ' : ''}{emp.department}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* All-time summary strip */}
      {!isLoading && goals.length > 0 && (() => {
        const completed = goals.filter(g => g.status === 'Completed').length
        const wp        = goals.filter(g => g.monthly_achievement != null)
        const avgP      = wp.length
          ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
          : 0
        const compRate  = goals.length ? (completed / goals.length * 100) : 0

        return (
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
            borderRadius: 'var(--r-xl)', padding: '18px 24px', marginBottom: 24,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          }}>
            {[
              { label: 'Total Goals',   value: goals.length,           icon: Target,      color: '#93C5FD' },
              { label: 'Completed',     value: completed,              icon: CheckCircle, color: '#6EE7B7' },
              { label: 'Completion',    value: `${compRate.toFixed(1)}%`, icon: BarChart2,  color: compRate >= 70 ? '#6EE7B7' : '#FCD34D' },
              { label: 'Avg Progress',  value: `${avgP.toFixed(1)}%`,  icon: BarChart2,   color: avgP >= 70 ? '#6EE7B7' : '#FCD34D' },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ padding: '0 20px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <s.icon size={13} color={s.color} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Select Year
        </span>
      </div>

      {/* Year cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--r-xl)' }} />)}
        </div>
      ) : years.length === 0 ? (
        <div className="card card-body">
          <EmptyState title="No goals yet" description="No goals have been created for this employee" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {years.map((y, idx) => {
            const s           = yearStats(y)
            const isCurrent   = y === currentYear
            const cardColor   = isCurrent ? P.blue : idx === 1 ? P.indigo : P.slate
            const progressColor = s.avgP >= 70 ? P.green : s.avgP >= 40 ? P.amber : s.avgP > 0 ? P.red : 'var(--text-4)'

            return (
              <div
                key={y}
                onClick={() => navigate(`/employees/${empId}/goals/${y}`)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${cardColor}`,
                  borderRadius: 'var(--r-xl)',
                  padding: '20px 22px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, transform 0.18s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                  e.currentTarget.style.transform = ''
                }}
              >
                {/* bg tint */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${cardColor}08`, pointerEvents: 'none' }} />

                {/* Year + current badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} color={cardColor} />
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: cardColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{y}</span>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: P.blue, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Current
                    </span>
                  )}
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Goals',     value: s.total,     color: cardColor },
                    { label: 'Completed', value: s.completed, color: P.green   },
                  ].map(st => (
                    <div key={st.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: st.color, lineHeight: 1, marginBottom: 3 }}>{st.value}</div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '0.67rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Progress</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: progressColor }}>{s.avgP.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(s.avgP, 100)}%`, background: progressColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <ChevronRight size={15} color="var(--text-4)" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}