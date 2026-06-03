import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useAuthStore, useUIStore } from '../../store'
import { useAllUsers, useAllGoals, useCreateFeedback, useCreateReviewMeeting } from '../../hooks/useData'
import { MONTH_NAMES, calcProgress } from '../../lib/constants'
import { FeedbackModal } from '../../components/modals/GoalModals'
import { EmptyState, Spinner } from '../../components/ui/index.jsx'
import {
  BarChart2, Target, CheckCircle, AlertTriangle,
  Users, Filter, MessageSquare, Star,
  Paperclip, Download, X
} from 'lucide-react'
import { FilesCell } from '../../components/ui/FileViewer.jsx'

const P = {
  blue: '#2563EB', green: '#059669',
  amber: '#D97706', red: '#DC2626', indigo: '#6366F1',
}

function KpiCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)',
      padding: '18px 20px', position: 'relative', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '0 0 0 60px', background: `${color}07`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        {Icon && <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={12} color={color} /></div>}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

const CURRENT_YEAR  = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

export default function HRReviewPage() {
  const user     = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)

  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers()
  const { data: allGoals = [], isLoading: goalsLoading  } = useAllGoals()
  const createFeedback      = useCreateFeedback()
  const createReviewMeeting = useCreateReviewMeeting()

  const [filterYear,   setFilterYear]   = useState(CURRENT_YEAR)
  const [filterMonth,  setFilterMonth]  = useState(CURRENT_MONTH)
  const [filterWeek,   setFilterWeek]   = useState('all')
  const [filterDept,   setFilterDept]   = useState('all')
  const [filterRole,   setFilterRole]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [feedbackGoal, setFeedbackGoal] = useState(null)
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingForm, setMeetingForm] = useState({
    title: '', meeting_date: new Date().toISOString().split('T')[0],
    summary: '', overall_rating: 0, week_num: '',
  })
  const [hoverRating, setHoverRating] = useState(0)
  const [absentIds,   setAbsentIds]   = useState([])

  const toggleAbsent = (uid) =>
    setAbsentIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

  const canGiveFeedback = ['HR', 'Admin'].includes(user.role)
  const feedbackType = { CMD: 'CMD Feedback', VP: 'VP Feedback', HR: 'HR Feedback', Admin: 'HR Feedback' }[user.role]

  const departments = useMemo(() => [...new Set(allUsers.map(u => u.department).filter(Boolean))].sort(), [allUsers])
  const roles       = useMemo(() => [...new Set(allUsers.map(u => u.role).filter(Boolean))].sort(), [allUsers])
  const years       = useMemo(() => [...new Set(allGoals.map(g => g.year))].sort((a, b) => b - a), [allGoals])

  const filteredGoals = useMemo(() => {
    return allGoals.filter(g => {
      const owner = allUsers.find(u => u.id === g.user_id)
      if (!owner) return false
      if (['CMD', 'Admin'].includes(owner.role)) return false
      if (g.year  !== parseInt(filterYear))  return false
      if (g.month !== parseInt(filterMonth)) return false
      if (filterDept   !== 'all' && owner.department !== filterDept)   return false
      if (filterRole   !== 'all' && owner.role       !== filterRole)   return false
      if (filterStatus !== 'all' && g.status         !== filterStatus) return false
      if (filterWeek !== 'all') {
        const wn = parseInt(filterWeek)
        if (!g[`week${wn}_target`] || g[`week${wn}_target`] === 0) return false
      }
      return true
    })
  }, [allGoals, allUsers, filterYear, filterMonth, filterDept, filterRole, filterStatus, filterWeek])

  const summary = useMemo(() => {
    const total     = filteredGoals.length
    const completed = filteredGoals.filter(g => g.status === 'Completed').length
    const avgP = filteredGoals.length ? filteredGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / filteredGoals.length : 0
    const overdue   = filteredGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < new Date()).length
    const empCount  = new Set(filteredGoals.map(g => g.user_id)).size
    const withRemarks = filteredGoals.filter(g => g.remarks).length
    const withFiles   = filteredGoals.filter(g => g.file_urls?.length > 0).length
    return { total, completed, avgP, overdue, empCount, withRemarks, withFiles }
  }, [filteredGoals])

  const handleMeetingSubmit = async () => {
    if (!meetingForm.title || !meetingForm.meeting_date || !meetingForm.summary) return
    await createReviewMeeting.mutateAsync({
      title:             meetingForm.title,
      meeting_date:      meetingForm.meeting_date,
      year:              parseInt(filterYear),
      month:             parseInt(filterMonth),
      week_num:          meetingForm.week_num ? parseInt(meetingForm.week_num) : null,
      summary:           meetingForm.summary,
      overall_rating:    meetingForm.overall_rating || null,
      reviewed_user_ids: [...new Set(filteredGoals.map(g => g.user_id))],
      absent_user_ids:   absentIds,
      conducted_by:      user.id,
      status:            'completed',
    })
    setShowMeetingForm(false)
    setMeetingForm({ title: '', meeting_date: new Date().toISOString().split('T')[0], summary: '', overall_rating: 0, week_num: '' })
    setAbsentIds([])
  }

  const handleFeedbackSubmit = async (data) => {
    await createFeedback.mutateAsync({
      goal_id: feedbackGoal.goal_id, user_id: feedbackGoal.user_id,
      feedback_by: user.id, feedback_type: feedbackType,
      rating: parseInt(data.rating), comment: data.comment,
      level: 'month', week_num: null,
    })
    setFeedbackGoal(null)
    addToast({ message: 'Feedback submitted', type: 'success' })
  }

  const isLoading = usersLoading || goalsLoading

  return (
    <div>
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>HR · Review Dashboard</div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Weekly & Monthly Review</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>All employee goals, progress, remarks and files in one view</p>
          {['HR', 'Admin'].includes(user.role) && (
            <button className="btn btn-sm" onClick={() => setShowMeetingForm(true)}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', marginTop: 12 }}>
              <CheckCircle size={14} /> Mark Meeting as Completed
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24, width: '100%' }}>
        <KpiCard label="Employees"    value={summary.empCount}              color={P.blue}   icon={Users}         />
        <KpiCard label="Total Goals"  value={summary.total}                 color={P.indigo} icon={Target}        />
        <KpiCard label="Completed"    value={summary.completed}             color={P.green}  icon={CheckCircle}   />
        <KpiCard label="Avg Progress" value={`${summary.avgP.toFixed(1)}%`} color={summary.avgP >= 70 ? P.green : P.amber} icon={BarChart2} />
        <KpiCard label="Overdue"      value={summary.overdue}               color={summary.overdue > 0 ? P.red : P.green} icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={13} color={P.blue} />
            </div>
            <div>
              <div className="card-title">Filters</div>
              <div className="card-subtitle">Narrow down by period, department or role</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Year</label>
              <select className="select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
                {!years.includes(CURRENT_YEAR) && <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Month</label>
              <select className="select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {MONTH_NAMES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Week</label>
              <select className="select" value={filterWeek} onChange={e => setFilterWeek(e.target.value)}>
                <option value="all">All Weeks</option>
                <option value="1">Week 1</option>
                <option value="2">Week 2</option>
                <option value="3">Week 3</option>
                <option value="4">Week 4</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Department</label>
              <select className="select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Role</label>
              <select className="select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {MONTH_NAMES[parseInt(filterMonth)]} {filterYear}
              {filterWeek !== 'all' ? ` — Week ${filterWeek}` : ' — All Weeks'}
            </div>
            <div className="card-subtitle">{filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''} · {summary.withRemarks} with remarks · {summary.withFiles} with files</div>
          </div>
        </div>

        {isLoading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
        ) : filteredGoals.length === 0 ? (
          <div className="card-body"><EmptyState title="No goals found" description="Try adjusting the filters above" /></div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <table className="goal-sheet-table" style={{ minWidth: 1300, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 130 }}>Employee</th>
                  <th style={{ minWidth: 80  }}>Role</th>
                  <th style={{ minWidth: 100 }}>Department</th>
                  <th style={{ minWidth: 180 }}>Goal Title</th>
                  <th style={{ minWidth: 100 }}>KPI</th>
                  <th style={{ minWidth: 180 }}>Target</th>
                  <th style={{ minWidth: 80,  textAlign: 'center' }}>Achievement</th>
                  <th style={{ minWidth: 120, textAlign: 'center' }}>Progress</th>
                  {/* ── NEW COLUMNS ── */}
                  <th style={{ minWidth: 160 }}>Remarks</th>
                  <th style={{ minWidth: 100 }}>Files</th>
                  <th style={{ minWidth: 80,  textAlign: 'center' }}>Status</th>
                  {canGiveFeedback && <th style={{ minWidth: 80, textAlign: 'center' }}>Feedback</th>}
                </tr>
              </thead>
              <tbody>
                {filteredGoals.map((g, i) => {
                  const owner  = allUsers.find(u => u.id === g.user_id)
                  const p      = calcProgress(g.monthly_achievement, g.monthly_target)
                  const pColor = p >= 80 ? P.green : p >= 50 ? P.amber : g.monthly_achievement != null ? P.red : 'var(--text-4)'
                  return (
                    <tr key={g.goal_id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                      <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {owner?.name || '—'}
                          {owner?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                          )}
                        </span>
                      </td>
                      <td><span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{owner?.role || '—'}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>{owner?.department || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.goal_title}</div>
                        {g.goal_description && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{g.goal_description}</div>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{g.kpi || '—'}</td>
                      <td style={{ fontWeight: 700, color: P.blue, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 180, maxWidth: 220 }}>{g.monthly_target ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: pColor }}>
                        {g.monthly_achievement ?? <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pColor }}>
                            {g.monthly_achievement != null ? `${p.toFixed(0)}%` : '—'}
                          </span>
                          {g.monthly_achievement != null && (
                            <div style={{ height: 4, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden', width: 80 }}>
                              <div style={{ height: '100%', width: `${Math.min(p, 100)}%`, background: pColor, borderRadius: 99 }} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ── Remarks ── */}
                      <td style={{ minWidth: 160 }}>
                        {g.remarks
                          ? <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{g.remarks}</span>
                          : <span style={{ color: 'var(--text-4)', fontSize: '0.78rem' }}>—</span>
                        }
                      </td>

                      {/* ── Files ── */}
                      <td style={{ minWidth: 100, overflow: 'visible' }}>
                        <FilesCell files={g.file_urls} />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${g.status === 'Completed' ? 'green' : 'blue'}`}>{g.status}</span>
                      </td>
                      {canGiveFeedback && (
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-icon sm" title="Add Feedback" onClick={() => setFeedbackGoal(g)} style={{ color: P.blue }}>
                            <MessageSquare size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {feedbackGoal && (
        <FeedbackModal
          goal={feedbackGoal}
          feedbackType={feedbackType}
          onSubmit={handleFeedbackSubmit}
          onClose={() => setFeedbackGoal(null)}
          loading={createFeedback.isPending}
        />
      )}

      {/* Meeting Modal */}
      {showMeetingForm && (
        <div className="modal-overlay" onClick={() => setShowMeetingForm(false)}>
          <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Mark Review Meeting as Completed</span>
              <button className="modal-close-btn" onClick={() => setShowMeetingForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Meeting Title <span className="required">*</span></label>
                  <input className="input" placeholder="e.g. March Week 1 Review" value={meetingForm.title} onChange={e => setMeetingForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Meeting Date <span className="required">*</span></label>
                    <input className="input" type="date" value={meetingForm.meeting_date} onChange={e => setMeetingForm(p => ({ ...p, meeting_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Week (optional)</label>
                    <select className="select" value={meetingForm.week_num} onChange={e => setMeetingForm(p => ({ ...p, week_num: e.target.value }))}>
                      <option value="">Monthly Review</option>
                      <option value="1">Week 1</option><option value="2">Week 2</option>
                      <option value="3">Week 3</option><option value="4">Week 4</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Summary / Notes <span className="required">*</span></label>
                  <textarea className="textarea" rows={4} placeholder="What was discussed, key outcomes, action items…" value={meetingForm.summary} onChange={e => setMeetingForm(p => ({ ...p, summary: e.target.value }))} />
                </div>

                {/* Absent employees */}
                {filteredGoals.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Mark Absent Employees</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {[...new Set(filteredGoals.map(g => g.user_id))].map(uid => {
                        const emp      = allUsers.find(u => u.id === uid)
                        const isAbsent = absentIds.includes(uid)
                        if (!emp) return null
                        return (
                          <div key={uid} onClick={() => toggleAbsent(uid)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--r-lg)', cursor: 'pointer', background: isAbsent ? '#FEF2F2' : 'var(--surface-2)', border: `1px solid ${isAbsent ? '#FECACA' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAbsent ? '#FCA5A5' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: isAbsent ? '#DC2626' : P.blue, flexShrink: 0 }}>{emp.name?.[0]}</div>
                              <div>
                                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isAbsent ? '#DC2626' : 'var(--text)' }}>{emp.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{emp.role} · {emp.department}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isAbsent && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>Absent</span>}
                              <div style={{ width: 18, height: 18, borderRadius: 4, background: isAbsent ? '#DC2626' : 'var(--surface)', border: `2px solid ${isAbsent ? '#DC2626' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isAbsent && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✕</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {absentIds.length > 0 && <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>{absentIds.length} employee{absentIds.length !== 1 ? 's' : ''} marked absent</div>}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Overall Rating</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {[1,2,3,4,5].map(r => (
                      <Star key={r} size={24}
                        fill={(hoverRating || meetingForm.overall_rating) >= r ? P.amber : 'none'}
                        color={(hoverRating || meetingForm.overall_rating) >= r ? P.amber : 'var(--border)'}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoverRating(r)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setMeetingForm(p => ({ ...p, overall_rating: r }))}
                      />
                    ))}
                    {meetingForm.overall_rating > 0 && <span style={{ fontSize: '0.82rem', color: P.amber, fontWeight: 700, marginLeft: 8, alignSelf: 'center' }}>{meetingForm.overall_rating}/5</span>}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                    Covering <strong>{new Set(filteredGoals.map(g => g.user_id)).size}</strong> employees · <strong>{filteredGoals.length}</strong> goals from current filters
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMeetingForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMeetingSubmit}
                disabled={!meetingForm.title || !meetingForm.meeting_date || !meetingForm.summary || createReviewMeeting.isPending}>
                {createReviewMeeting.isPending ? <Spinner size={14} /> : '✓ Save Meeting Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}