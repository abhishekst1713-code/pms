import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store'
import { useAllUsers, useAllGoals, useUpdateReviewMeeting, useDeleteReviewMeeting, useReviewMeetings } from '../../hooks/useData'
import { MONTH_NAMES, calcProgress } from '../../lib/constants'
import { EmptyState, Spinner } from '../../components/ui/index.jsx'
import {
  ChevronLeft, FileText, Target, CheckCircle,
  BarChart2, Edit2, Trash2, Star, X
} from 'lucide-react'
import { FilesCell } from '../../components/ui/FileViewer.jsx'

const P = {
  blue: '#2563EB', green: '#059669',
  amber: '#D97706', red: '#DC2626',
  indigo: '#6366F1', violet: '#7C3AED',
}

function StarDisplay({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(r => (
        <Star key={r} size={13}
          fill={rating >= r ? P.amber : 'none'}
          color={rating >= r ? P.amber : 'var(--border)'}
        />
      ))}
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: P.amber, marginLeft: 4 }}>{rating}/5</span>
    </div>
  )
}

function KpiCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)',
      padding: '16px 18px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50, borderRadius: '0 0 0 50px', background: `${color}07`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        {Icon && <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={11} color={color} /></div>}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

// ── Edit Meeting Modal ────────────────────────────────────────
function EditMeetingModal({ meeting, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    title:          meeting.title          || '',
    meeting_date:   meeting.meeting_date   || '',
    summary:        meeting.summary        || '',
    overall_rating: meeting.overall_rating || 0,
    week_num:       meeting.week_num       || '',
  })
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Review Meeting</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Meeting Title <span className="required">*</span></label>
              <input className="input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Meeting Date <span className="required">*</span></label>
                <input className="input" type="date" value={form.meeting_date}
                  onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Week</label>
                <select className="select" value={form.week_num}
                  onChange={e => setForm(p => ({ ...p, week_num: e.target.value }))}>
                  <option value="">Monthly Review</option>
                  <option value="1">Week 1</option>
                  <option value="2">Week 2</option>
                  <option value="3">Week 3</option>
                  <option value="4">Week 4</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Summary / Notes <span className="required">*</span></label>
              <textarea className="textarea" rows={4} value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Overall Rating</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {[1,2,3,4,5].map(r => (
                  <Star key={r} size={24}
                    fill={(hoverRating || form.overall_rating) >= r ? P.amber : 'none'}
                    color={(hoverRating || form.overall_rating) >= r ? P.amber : 'var(--border)'}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverRating(r)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setForm(p => ({ ...p, overall_rating: r }))}
                  />
                ))}
                {form.overall_rating > 0 && (
                  <span style={{ fontSize: '0.82rem', color: P.amber, fontWeight: 700, marginLeft: 8, alignSelf: 'center' }}>
                    {form.overall_rating}/5
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
            disabled={!form.title || !form.meeting_date || !form.summary || loading}
            onClick={() => onSave(form)}>
            {loading ? <Spinner size={14} /> : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────
function DeleteConfirmModal({ meeting, onConfirm, onClose, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Delete Meeting</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', margin: 0 }}>
            Are you sure you want to delete <strong>"{meeting.title}"</strong>? This cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={14} /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewMeetingDetail() {
  const { meetingId } = useParams()
  const navigate      = useNavigate()
  const user          = useAuthStore(s => s.user)
  const isAdmin       = user.role === 'Admin'

  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers()
  const { data: allGoals = [], isLoading: goalsLoading  } = useAllGoals()
  const { data: allMeetings = [] }                        = useReviewMeetings()
  const updateMeeting = useUpdateReviewMeeting()
  const deleteMeeting = useDeleteReviewMeeting()

  // Find this meeting's record (for edit/delete)
  const meetingRecord = useMemo(() =>
    allMeetings.find(m => String(m.id) === String(meetingId)),
    [allMeetings, meetingId]
  )

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear]                  = useState(new Date().getFullYear())
  const [filterUser,  setFilterUser]  = useState('all')
  const [editModal,   setEditModal]   = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const isLoading = usersLoading || goalsLoading

  const visibleUsers = useMemo(() => {
    if (['Admin', 'CMD', 'VP', 'HR'].includes(user.role)) return allUsers
    if (user.role === 'Manager') return allUsers.filter(u => u.manager_id === user.id)
    return [user]
  }, [allUsers, user])

  const reviewedGoals = useMemo(() => {
    let goals = allGoals.filter(g => g.year === filterYear && g.month === filterMonth)
    if (filterUser !== 'all') goals = goals.filter(g => g.user_id === filterUser)
    else goals = goals.filter(g => visibleUsers.some(u => u.id === g.user_id))
    return goals
  }, [allGoals, filterYear, filterMonth, filterUser, visibleUsers])

  const goalsByEmployee = useMemo(() => {
    const map = {}
    reviewedGoals.forEach(g => {
      if (!map[g.user_id]) map[g.user_id] = []
      map[g.user_id].push(g)
    })
    return map
  }, [reviewedGoals])

  const summary = useMemo(() => {
    const total       = reviewedGoals.length
    const completed   = reviewedGoals.filter(g => g.status === 'Completed').length
    const avgP = reviewedGoals.length ? reviewedGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / reviewedGoals.length : 0
    const withFiles   = reviewedGoals.filter(g => g.file_urls?.length > 0).length
    return { total, completed, avgP, withFiles }
  }, [reviewedGoals])

  const handleEditSave = async (form) => {
    await updateMeeting.mutateAsync({
      id: meetingId,
      updates: {
        title:          form.title,
        meeting_date:   form.meeting_date,
        summary:        form.summary,
        overall_rating: form.overall_rating || null,
        week_num:       form.week_num ? parseInt(form.week_num) : null,
      },
    })
    setEditModal(false)
  }

  const handleDelete = async () => {
    await deleteMeeting.mutateAsync(meetingId)
    navigate(-1)
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spinner size={32} /></div>

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: P.blue, fontWeight: 600, fontSize: '0.8rem', padding: 0, marginBottom: 20 }}>
        <ChevronLeft size={14} /> Back
      </button>

      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              Goal Review — {MONTH_NAMES[filterMonth]} {filterYear}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
              View goal achievements, remarks and supporting files
            </p>
            {meetingRecord && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  📅 {meetingRecord.meeting_date}
                </span>
                {meetingRecord.overall_rating > 0 && (
                  <span style={{ fontSize: '0.78rem', color: P.amber, fontWeight: 700 }}>
                    ★ {meetingRecord.overall_rating}/5
                  </span>
                )}
                {meetingRecord.week_num && (
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                    Week {meetingRecord.week_num}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Admin edit/delete buttons */}
          {isAdmin && meetingRecord && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-sm"
                onClick={() => setEditModal(true)}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit2 size={13} /> Edit
              </button>
              <button className="btn btn-sm"
                onClick={() => setDeleteModal(true)}
                style={{ background: 'rgba(220,38,38,0.3)', color: '#fff', border: '1px solid rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meeting summary note */}
      {meetingRecord?.summary && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">Meeting Notes</div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
              {meetingRecord.summary}
            </p>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, width: '100%' }}>
        <KpiCard label="Total Goals"  value={summary.total}                 color={P.blue}   icon={Target}      />
        <KpiCard label="Completed"    value={summary.completed}             color={P.green}  icon={CheckCircle} />
        <KpiCard label="Avg Progress" value={`${summary.avgP.toFixed(1)}%`} color={summary.avgP >= 70 ? P.green : P.amber} icon={BarChart2} />
        <KpiCard label="With Files"   value={summary.withFiles}             color={P.violet} icon={FileText}    />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Month</label>
          <select className="select select-sm select-auto" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
            {MONTH_NAMES.slice(1).map((mn, i) => <option key={i+1} value={i+1}>{mn}</option>)}
          </select>
        </div>
        {visibleUsers.length > 1 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Employee</label>
            <select className="select select-sm select-auto" style={{ minWidth: 180 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="all">All Employees</option>
              {visibleUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
        )}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', alignSelf: 'center' }}>
          {reviewedGoals.length} goals
        </span>
      </div>

      {/* Goals by employee */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Goals with Remarks & Files</div>
          <div className="card-subtitle">{MONTH_NAMES[filterMonth]} {filterYear}</div>
        </div>

        {reviewedGoals.length === 0 ? (
          <div className="card-body">
            <EmptyState title="No goals found" description="No goals for the selected period" />
          </div>
        ) : (
          <div className="card-body" style={{ padding: 0 }}>
            {Object.entries(goalsByEmployee).map(([uid, empGoals]) => {
              const emp      = allUsers.find(u => u.id === uid)
              const wp       = empGoals.filter(g => g.monthly_achievement != null)
              const empAvgP  = wp.length ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length : 0
              const empColor = empAvgP >= 80 ? P.green : empAvgP >= 50 ? P.amber : P.red

              return (
                <div key={uid} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: '12px 20px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: P.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                        {emp?.name?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {emp?.name || '—'}
                          {emp?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{emp?.role} · {emp?.department}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)' }}>{empGoals.length} goal{empGoals.length !== 1 ? 's' : ''}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: empColor }}>{empAvgP.toFixed(0)}% avg</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                      <thead>
                        <tr>
                          {['Goal','KPI','Target','Achievement','Progress','Remarks','Files','Status'].map((h, i) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: ['Target','Achievement','Progress','Status'].includes(h) ? 'center' : 'left', fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingLeft: h === 'Goal' ? 20 : 12, minWidth: h === 'Progress' ? 120 : h === 'Remarks' ? 160 : h === 'Files' ? 120 : 'auto' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {empGoals.map((g, i) => {
                          const p      = calcProgress(g.monthly_achievement, g.monthly_target)
                          const pColor = p >= 80 ? P.green : p >= 50 ? P.amber : g.monthly_achievement != null ? P.red : 'var(--text-4)'
                          return (
                            <tr key={g.goal_id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.goal_title}</div>
                                {g.goal_description && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{g.goal_description}</div>}
                              </td>
                              <td style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-2)' }}>{g.kpi || '—'}</td>
                               <td style={{ padding: '12px', fontWeight: 700, color: P.blue, whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 100 }}>{g.monthly_target ?? '—'}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: pColor }}>
                                {g.monthly_achievement ?? <span style={{ color: 'var(--text-4)' }}>—</span>}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pColor }}>
                                    {g.monthly_achievement != null ? `${p.toFixed(0)}%` : '—'}
                                  </span>
                                  {g.monthly_achievement != null && (
                                    <div style={{ height: 4, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden', width: 100 }}>
                                      <div style={{ height: '100%', width: `${Math.min(p, 100)}%`, background: pColor, borderRadius: 99 }} />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                {g.remarks
                                  ? <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{g.remarks}</span>
                                  : <span style={{ color: 'var(--text-4)', fontSize: '0.78rem' }}>—</span>}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <FilesCell files={g.file_urls} />
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span className={`badge badge-${g.status === 'Completed' ? 'green' : 'blue'}`}>{g.status}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {editModal && meetingRecord && (
        <EditMeetingModal
          meeting={meetingRecord}
          onSave={handleEditSave}
          onClose={() => setEditModal(false)}
          loading={updateMeeting.isPending}
        />
      )}
      {deleteModal && meetingRecord && (
        <DeleteConfirmModal
          meeting={meetingRecord}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(false)}
          loading={deleteMeeting.isPending}
        />
      )}
    </div>
  )
}