import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../../store'
import { useReviewMeetings, useAllUsers } from '../../hooks/useData'
import { MONTH_NAMES } from '../../lib/constants'
import { EmptyState, Spinner } from '../../components/ui/index.jsx'
import { Star, Calendar, Users, FileText, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const P = {
  blue: '#2563EB', green: '#059669',
  amber: '#D97706', red: '#DC2626', indigo: '#6366F1',
}

function StarDisplay({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(r => (
        <Star
          key={r} size={13}
          fill={rating >= r ? P.amber : 'none'}
          color={rating >= r ? P.amber : 'var(--border)'}
        />
      ))}
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: P.amber, marginLeft: 4 }}>{rating}/5</span>
    </div>
  )
}

export default function ReviewMeetingsPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { data: allMeetings = [], isLoading } = useReviewMeetings()
  const { data: allUsers = [] } = useAllUsers()

  const [filterYear,  setFilterYear]  = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState('')
  const [filterWeek,  setFilterWeek]  = useState('all')

  // Role-based filtering of meetings
  const visibleMeetings = useMemo(() => {
    return allMeetings.filter(m => {
      // Year filter
      if (m.year !== parseInt(filterYear)) return false
      // Month filter
      if (filterMonth && m.month !== parseInt(filterMonth)) return false
      // Week filter
      if (filterWeek === 'monthly' && m.week_num != null) return false
      if (filterWeek !== 'all' && filterWeek !== 'monthly' && parseInt(m.week_num) !== parseInt(filterWeek)) return false

      // Role-based access
      if (['HR', 'Admin', 'CMD', 'VP'].includes(user.role)) return true

      if (user.role === 'Manager') {
        // Manager sees meetings where they or their team were reviewed
        const teamIds = allUsers.filter(u => u.manager_id === user.id).map(u => u.id)
        const relevantIds = [user.id, ...teamIds]
        return (m.reviewed_user_ids || []).some(id => relevantIds.includes(id))
      }

      if (user.role === 'Employee') {
        // Employee sees only meetings where they were reviewed
        return (m.reviewed_user_ids || []).includes(user.id)
      }

      return false
    })
  }, [allMeetings, allUsers, user, filterYear, filterMonth, filterWeek])

  const years = useMemo(() =>
    [...new Set(allMeetings.map(m => m.year))].sort((a, b) => b - a)
  , [allMeetings])

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)',
        borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Review History
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Past Review Meetings
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
            All completed review meetings and their summaries
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <select className="select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
                {!years.includes(new Date().getFullYear()) && (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                )}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <select className="select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">All Months</option>
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Review Type</label>
              <select className="select" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}>
                <option value="all">All Reviews</option>
                <option value="monthly">Monthly Only</option>
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Meetings List ── */}
      {isLoading ? (
        <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
          <Spinner size={32} />
        </div>
      ) : visibleMeetings.length === 0 ? (
        <div className="card card-body">
          <EmptyState
            title="No review meetings found"
            description="Completed review meetings will appear here"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visibleMeetings.map(m => {
            const conductor  = allUsers.find(u => u.id === m.conducted_by)
            const empCount   = (m.reviewed_user_ids || []).length
            const isWeekly   = m.week_num != null
            const typeColor  = isWeekly ? P.indigo : P.blue
            const typeLabel  = isWeekly ? `Week ${m.week_num} Review` : 'Monthly Review'

            return (
              <div
                key={m.id}
                onClick={() => navigate(`/hr/meetings/${m.id}`)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderTop: `3px solid ${typeColor}`,
                  borderRadius: 'var(--r-xl)',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, transform 0.18s',
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
                {/* Card Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, color: typeColor,
                        background: `${typeColor}10`, border: `1px solid ${typeColor}30`,
                        padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>
                        {typeLabel}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, color: P.green,
                        background: '#DCFCE7', border: '1px solid #BBF7D0',
                        padding: '2px 10px', borderRadius: 99,
                      }}>
                        Completed
                      </span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                        <Calendar size={11} /> {m.meeting_date} · {MONTH_NAMES[m.month]} {m.year}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                        <Users size={11} /> {empCount} employee{empCount !== 1 ? 's' : ''} reviewed
                        {(m.absent_user_ids || []).length > 0 && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, color: '#DC2626',
                            background: '#FEE2E2', border: '1px solid #FECACA',
                            padding: '1px 7px', borderRadius: 99, marginLeft: 4,
                          }}>
                            {m.absent_user_ids.length} absent
                          </span>
                        )}
                      </span>
                      {conductor && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                          <FileText size={11} /> Conducted by {conductor.name}
                          {conductor?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.overall_rating && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Overall Rating</div>
                      <StarDisplay rating={m.overall_rating} />
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Summary / Notes
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {m.summary}
                  </p>
                </div>

                {/* Reviewed employees */}
                {(m.reviewed_user_ids || []).length > 0 && (
                  <div style={{ padding: '10px 20px 14px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Employees Reviewed
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {m.reviewed_user_ids.map(uid => {
                        const emp      = allUsers.find(u => u.id === uid)
                        const isAbsent = (m.absent_user_ids || []).includes(uid)
                        if (!emp) return null
                        return (
                          <span key={uid} style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            background: isAbsent ? '#FEF2F2' : 'var(--surface-2)',
                            border: `1px solid ${isAbsent ? '#FECACA' : 'var(--border)'}`,
                            borderRadius: 99, padding: '3px 10px',
                            color: isAbsent ? '#DC2626' : 'var(--text-2)',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                          }}>
                            {emp.name}
                            {emp?.is_active === false && (
                              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase' }}>Left</span>
                            )}
                            {isAbsent && (
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700, color: '#DC2626',
                                background: '#FEE2E2', padding: '1px 5px',
                                borderRadius: 99, textTransform: 'uppercase',
                              }}>
                                Absent
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
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