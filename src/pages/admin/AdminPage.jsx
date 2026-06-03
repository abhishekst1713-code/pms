import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import { useMailEnabled, useSetMailEnabled } from '../../hooks/useData'
import { getAppSetting, setAppSetting, triggerTestEmail } from '../../lib/api'
import { Mail, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  useAllUsers, useAllGoals, useAllFeedback,
  useAllNotificationsAdmin,
  useCreateUser, useUpdateUser, useDeleteUser,
  useUpdateGoal, useDeleteGoal,
  useApproveGoal, useRejectGoal,
  useDeleteFeedback,
  useMarkRead,
} from '../../hooks/useData'
import {
  ProgressBar, RoleBadge, StatusBadge,
  EmptyState, ConfirmDialog, Spinner, Avatar
} from '../../components/ui/index.jsx'
import { StatusPieChart } from '../../components/charts/index.jsx'
import { calcProgress, MONTH_NAMES, GOAL_STATUSES } from '../../lib/constants'
import { timeAgo, formatIST, goalsToCSV } from '../../lib/utils'
import { useForm } from 'react-hook-form'
import {
  Download, Plus, Pencil, Trash2, CheckCircle,
  XCircle, RefreshCw, Eye, Users, Target,
  BarChart2, Bell, Activity, Shield,
} from 'lucide-react'

// ── Palette ──────────────────────────────────────────────────
const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  violet: '#7C3AED',
  indigo: '#4F46E5',
  slate:  '#475569',
}

// ── Notification type config ──────────────────────────────────
const NOTIF_MAP = {
  goal_created:       { color: '#3B82F6' },
  goal_approved:      { color: '#10B981' },
  goal_rejected:      { color: '#EF4444' },
  goal_edited:        { color: '#F59E0B' },
  goal_deleted:       { color: '#EF4444' },
  goal_completed:     { color: '#10B981' },
  goal_not_completed: { color: '#EF4444' },
  goal_updated:       { color: '#3B82F6' },
  feedback_given:     { color: '#6366F1' },
  feedback_reply:     { color: '#8B5CF6' },
  deadline_reminder:  { color: '#F59E0B' },
  overdue:            { color: '#EF4444' },
  overdue_critical:   { color: '#DC2626' },
  monthly_reminder:   { color: '#2563EB' },
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, value, label, color, sub }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)',
      padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '0 0 0 60px', background: `${color}08` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────
function SLabel({ children }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 13, borderRadius: 2, background: P.blue }} />
      {children}
    </div>
  )
}

// ── Search Input ──────────────────────────────────────────────
function SearchBox({ value, onChange, placeholder }) {
  return (
    <input
      className="input input-sm"
      style={{ minWidth: 220 }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Search…'}
    />
  )
}

// ── User Create/Edit Modal ────────────────────────────────────
function UserModal({ user, allUsers, onSave, onClose, loading, isCreate }) {
  const { register, handleSubmit } = useForm({ defaultValues: user || { role: 'Employee', password: '' } })
  const supervisors = allUsers.filter(u => u.id !== user?.id)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isCreate ? 'Create New User' : `Edit — ${user?.name}`}</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            <div className="grid-2 gap-4">
              <div className="form-group"><label className="form-label">Full Name *</label><input className="input" {...register('name', { required: true })} placeholder="Jane Doe" /></div>
              <div className="form-group"><label className="form-label">Email *</label><input className="input" type="email" {...register('email', { required: true })} placeholder="jane@company.com" /></div>
              <div className="form-group"><label className="form-label">{isCreate ? 'Password *' : 'New Password (blank = keep)'}</label><input className="input" type="password" {...register('password', { required: isCreate })} placeholder="Min 6 chars" /></div>
              <div className="form-group"><label className="form-label">Designation</label><input className="input" {...register('designation')} placeholder="e.g. Sales Executive" /></div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="select" {...register('role', { required: true })}>
                  {['Admin', 'CMD', 'VP', 'HR', 'Manager', 'Employee'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Department</label><input className="input" {...register('department')} placeholder="e.g. SALES" /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Supervisor (Assigned Person)</label>
                <select className="select" {...register('manager_id')}>
                  <option value="">None</option>
                  {supervisors.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={14} /> : isCreate ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Goal Edit Modal ───────────────────────────────────────────
function GoalEditModal({ goal, allUsers, onSave, onClose, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: goal })
  const owner = allUsers.find(u => u.id === goal.user_id)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Goal — {goal.goal_title}</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            <div className="alert alert-info mb-4" style={{ fontSize: '0.84rem' }}>
              Owner: <strong>{owner?.name || '—'}</strong> · {owner?.role} · {MONTH_NAMES[goal.month]} {goal.year}
            </div>
            <div className="grid-2 gap-4">
              <div className="form-group"><label className="form-label">Goal Title</label><input className="input" {...register('goal_title')} /></div>
              <div className="form-group"><label className="form-label">Department</label><input className="input" {...register('department')} /></div>
              <div className="form-group"><label className="form-label">KPI</label><input className="input" {...register('kpi')} /></div>
              <div className="form-group"><label className="form-label">Monthly Target</label><input className="input" type="number" step="any" {...register('monthly_target')} /></div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="select" {...register('status')}>
                  {['Active', 'Completed', 'On Hold', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Approval Status</label>
                <select className="select" {...register('approval_status')}>
                  {['approved', 'pending', 'rejected'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Monthly Achievement</label><input className="input" type="number" step="any" {...register('monthly_achievement')} /></div>
              <div className="form-group"><label className="form-label">Start Date</label><input className="input" type="date" {...register('start_date')} /></div>
              <div className="form-group"><label className="form-label">End Date</label><input className="input" type="date" {...register('end_date')} /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Weekly Targets</label>
                <div className="grid-4 gap-3">{[1, 2, 3, 4].map(w => <input key={w} className="input" type="number" step="any" placeholder={`W${w} Target`} {...register(`week${w}_target`)} />)}</div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Weekly Achievements</label>
                <div className="grid-4 gap-3">{[1, 2, 3, 4].map(w => <input key={w} className="input" type="number" step="any" placeholder={`W${w} Achievement`} {...register(`week${w}_achievement`)} />)}</div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label><textarea className="textarea" {...register('goal_description')} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <Spinner size={14} /> : 'Save All Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MailSettingsTab({ allUsers }) {
  const { data: mailEnabled, isLoading } = useMailEnabled()
  const setMail   = useSetMailEnabled()
  const addToast  = useUIStore(s => s.addToast)
  const isOn      = mailEnabled === 'true'

  const [testEmail,    setTestEmail]    = useState('')
  const [testLoading,  setTestLoading]  = useState(null)  // 'reminder' | 'top' | null
  const [testResult,   setTestResult]   = useState(null)  // { type, name, success }

  const orgUsers = (allUsers || []).filter(u => u.role !== 'Admin' && u.email)

  const toggle = () => setMail.mutate(!isOn)

  const runTest = async (type) => {
    if (!testEmail) { addToast({ message: 'Select a user to test', type: 'error' }); return }
    setTestLoading(type)
    setTestResult(null)
    try {
      const result = await triggerTestEmail(type, testEmail)
      setTestResult({ type, name: result.user, success: true })
      addToast({ message: `Test ${type} logged for ${result.user}`, type: 'success' })
    } catch (err) {
      setTestResult({ type, success: false, error: err.message })
      addToast({ message: err.message, type: 'error' })
    }
    setTestLoading(null)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mail size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Email Notifications</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
            Controls all automated emails — reminders and top performer announcements
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Spinner size={24} /></div>
      ) : (
        <>
          {/* Toggle card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Master toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>All Emails</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 3 }}>
                    Master switch — turning OFF stops all automated emails
                  </div>
                </div>
                <button onClick={toggle} disabled={setMail.isPending}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                  {isOn
                    ? <ToggleRight size={40} color="#059669" />
                    : <ToggleLeft  size={40} color="#94A3B8" />}
                  <span style={{ fontWeight: 700, color: isOn ? '#059669' : '#94A3B8', fontSize: '0.85rem', minWidth: 30 }}>
                    {isOn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Email descriptions */}
              {[
                { title: '26th Monthly Reminder', desc: 'Sent to all employees on the 26th — reminder to update their goal sheet.', icon: '📅', schedule: 'Every month on the 26th at 10:00 AM', cmd: 'node send-monthly-reminder.js' },
                { title: 'Top Performer Email',   desc: 'Sent on the last day of the month to the top performer, CC\'ing the entire organisation.', icon: '🏆', schedule: 'Last day of every month at 10:00 AM', cmd: 'node send-monthly-reminder.js top' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 14, padding: '18px 0', borderBottom: '1px solid var(--border)', opacity: isOn ? 1 : 0.45 }}>
                  <div style={{ fontSize: '1.5rem', flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 8 }}>{item.desc}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                        🕙 {item.schedule}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', color: 'var(--text-4)', fontFamily: 'monospace' }}>
                        {item.cmd}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Status banner */}
              <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: isOn ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${isOn ? '#6EE7B7' : '#FCA5A5'}` }}>
                <div style={{ fontWeight: 700, color: isOn ? '#065F46' : '#991B1B', fontSize: '0.875rem' }}>
                  {isOn ? '✅ Emails are active' : '🚫 All emails are disabled'}
                </div>
                <div style={{ fontSize: '0.78rem', color: isOn ? '#047857' : '#B91C1C', marginTop: 4 }}>
                  {isOn ? 'Both emails will send on their scheduled dates.' : 'No emails will be sent until this is turned back on.'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Test Section ── */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  🧪 Test Emails
                </div>
                <div className="card-subtitle">Send a test email to one person to verify templates look correct</div>
              </div>
            </div>
            <div className="card-body">

              {/* User picker */}
              <div className="form-group mb-5">
                <label className="form-label">Send test to</label>
                <select className="select" value={testEmail} onChange={e => { setTestEmail(e.target.value); setTestResult(null) }}>
                  <option value="">— Select a user —</option>
                  {orgUsers.map(u => (
                    <option key={u.id} value={u.email}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Test buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Reminder test */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>📅</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Test Reminder</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
                    Sends the monthly reminder email template to the selected user only.
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ width: '100%' }}
                    disabled={!testEmail || testLoading === 'reminder'}
                    onClick={() => runTest('reminder')}
                  >
                    {testLoading === 'reminder' ? <><Spinner size={12} /> Sending…</> : '📤 Send Test Reminder'}
                  </button>
                  <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-4)', fontFamily: 'monospace', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6 }}>
                    node script.js test-reminder &lt;email&gt;
                  </div>
                </div>

                {/* Top performer test */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🏆</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Test Top Performer</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
                    Sends the top performer email with dummy stats to the selected user only.
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ width: '100%' }}
                    disabled={!testEmail || testLoading === 'top'}
                    onClick={() => runTest('top')}
                  >
                    {testLoading === 'top' ? <><Spinner size={12} /> Sending…</> : '📤 Send Test Top Performer'}
                  </button>
                  <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-4)', fontFamily: 'monospace', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 6 }}>
                    node script.js test-top &lt;email&gt;
                  </div>
                </div>
              </div>

              {/* Result banner */}
              {testResult && (
                <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: testResult.success ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${testResult.success ? '#6EE7B7' : '#FCA5A5'}` }}>
                  {testResult.success ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#065F46', fontSize: '0.875rem' }}>
                        ✅ Test logged for {testResult.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 4 }}>
                        An in-app notification was created. To actually send the email, run the node command shown above in your terminal.
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '0.875rem' }}>
                      ❌ {testResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Note about actual sending */}
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--r-lg)' }}>
                <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600, marginBottom: 4 }}>⚠️ Note on testing</div>
                <div style={{ fontSize: '0.78rem', color: '#78350F', lineHeight: 1.6 }}>
                  The buttons above log a test notification in-app. To actually send the email to your inbox, run these commands in your terminal from the project root:
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'node send-monthly-reminder.js test-reminder emp@pms.com',
                    'node send-monthly-reminder.js test-top emp@pms.com',
                  ].map(cmd => (
                    <code key={cmd} style={{ display: 'block', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 12px', fontSize: '0.75rem', color: '#713F12', fontFamily: 'monospace' }}>
                      {cmd}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── MAIN ADMIN PAGE ───────────────────────────────────────────
export default function AdminPage() {
  const user     = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)
  const navigate = useNavigate()

  const [activeTab,      setActiveTab]      = useState('overview')
  const [userSearch,     setUserSearch]     = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('All')
  const [goalSearch,     setGoalSearch]     = useState('')
  const [goalStatus,     setGoalStatus]     = useState('All')
  const [goalApproval,   setGoalApproval]   = useState('All')
  const [goalRoleFilter, setGoalRoleFilter] = useState('All')
  const [goalMonth,      setGoalMonth]      = useState('All')
  const [fbSearch,       setFbSearch]       = useState('')
  const [fbTypeFilter,   setFbTypeFilter]   = useState('All')
  const [notifSearch,    setNotifSearch]    = useState('')
  const [notifFilter,    setNotifFilter]    = useState('All')

  const [createUser,   setCreateUser]   = useState(false)
  const [editUser,     setEditUser]     = useState(null)
  const [delUser,      setDelUser]      = useState(null)
  const [editGoalData, setEditGoalData] = useState(null)
  const [delGoal,      setDelGoal]      = useState(null)
  const [delFeedback,  setDelFeedback]  = useState(null)
  const [approveGoal,  setApproveGoal]  = useState(null)
  const [rejectGoal,   setRejectGoal]   = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: allUsers    = [], isLoading: uLoad, refetch: rUsers  } = useAllUsers()
  const { data: allGoals    = [], isLoading: gLoad, refetch: rGoals  } = useAllGoals()
  const { data: allFeedback = [], isLoading: fLoad, refetch: rFB     } = useAllFeedback()
  const { data: allNotifs   = [], isLoading: nLoad, refetch: rNotifs } = useAllNotificationsAdmin()

  const createUserMut  = useCreateUser()
  const updateUserMut  = useUpdateUser()
  const deleteUserMut  = useDeleteUser()
  const updateGoalMut  = useUpdateGoal()
  const deleteGoalMut  = useDeleteGoal()
  const approveGoalMut = useApproveGoal()
  const rejectGoalMut  = useRejectGoal()
  const deleteFbMut    = useDeleteFeedback()
  const markReadMut    = useMarkRead()

  const today       = new Date()
  const unreadCount = useMemo(() => allNotifs.filter(n => !n.is_read).length, [allNotifs])

  const stats = useMemo(() => {
    const completed = allGoals.filter(g => g.status === 'Completed').length
    const active    = allGoals.filter(g => g.status === 'Active').length
    const pending   = allGoals.filter(g => g.approval_status === 'pending').length
    const overdue   = allGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length

    // ── FIX: blank achievement counts as 0, all goals included in denominator ──
    const avgP = allGoals.length
      ? allGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target), 0) / allGoals.length
      : 0

    const roleBreak = ['Admin','CMD','VP','HR','Manager','Employee']
      .map(r => ({ role: r, count: allUsers.filter(u => u.role === r).length }))
      .filter(r => r.count > 0)

    return { total: allGoals.length, completed, active, pending, overdue, avgP, roleBreak }
  }, [allGoals, allUsers])

  const pieData = useMemo(() => [
    { name: 'Completed', value: stats.completed },
    { name: 'Active',    value: stats.active },
    { name: 'Pending',   value: stats.pending },
    { name: 'Overdue',   value: stats.overdue },
  ].filter(d => d.value > 0), [stats])

  // Filtered lists
  const displayUsers = useMemo(() => {
    const q = userSearch.toLowerCase()
    return allUsers.filter(u => {
      const ms = !q || u.name.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.department||'').toLowerCase().includes(q)
      const mr = userRoleFilter === 'All' || u.role === userRoleFilter
      return ms && mr
    })
  }, [allUsers, userSearch, userRoleFilter])

  const displayGoals = useMemo(() => {
    const q = goalSearch.toLowerCase()
    return allGoals.filter(g => {
      const owner = allUsers.find(u => u.id === g.user_id)
      const ms  = !q || g.goal_title.toLowerCase().includes(q) || (owner?.name||'').toLowerCase().includes(q) || (g.department||'').toLowerCase().includes(q)
      const mst = goalStatus   === 'All' || g.status          === goalStatus
      const map = goalApproval === 'All' || g.approval_status === goalApproval
      const mro = goalRoleFilter === 'All' || owner?.role      === goalRoleFilter
      const mmo = goalMonth    === 'All' || g.month           === +goalMonth
      return ms && mst && map && mro && mmo
    })
  }, [allGoals, allUsers, goalSearch, goalStatus, goalApproval, goalRoleFilter, goalMonth])

  const displayFeedback = useMemo(() => {
    const q = fbSearch.toLowerCase()
    return allFeedback.filter(fb => {
      const owner = allUsers.find(u => u.id === fb.user_id)
      const giver = allUsers.find(u => u.id === fb.feedback_by)
      const goal  = allGoals.find(g => g.goal_id === fb.goal_id)
      const ms = !q || (owner?.name||'').toLowerCase().includes(q) || (giver?.name||'').toLowerCase().includes(q) || (goal?.goal_title||'').toLowerCase().includes(q)
      const mt = fbTypeFilter === 'All' || fb.feedback_type === fbTypeFilter
      return ms && mt
    })
  }, [allFeedback, allUsers, allGoals, fbSearch, fbTypeFilter])

  const displayNotifs = useMemo(() => {
    const q = notifSearch.toLowerCase()
    return allNotifs.filter(n => {
      const owner = allUsers.find(u => u.id === n.user_id)
      const ms = !q || (owner?.name||'').toLowerCase().includes(q) || (n.details||'').toLowerCase().includes(q) || (n.action_type||'').toLowerCase().includes(q)
      const mr = notifFilter === 'All' || (notifFilter === 'Unread' ? !n.is_read : n.is_read)
      return ms && mr
    })
  }, [allNotifs, allUsers, notifSearch, notifFilter])

  // Handlers
  const handleCreateUser = async d => {
    await createUserMut.mutateAsync({ name: d.name, email: d.email.toLowerCase().trim(), password: d.password, designation: d.designation||'', role: d.role, department: d.department||'', manager_id: d.manager_id||null })
    setCreateUser(false)
    addToast({ message: `User ${d.name} created`, type: 'success' })
  }

  const handleEditUser = async d => {
    const updates = { name: d.name, email: d.email.toLowerCase().trim(), designation: d.designation, role: d.role, department: d.department, manager_id: d.manager_id||null }
    if (d.password) updates.password = d.password
    await updateUserMut.mutateAsync({ id: editUser.id, updates })
    setEditUser(null)
    addToast({ message: 'User updated', type: 'success' })
  }

  const handleDeleteUser = async () => {
    await deleteUserMut.mutateAsync(delUser.id)
    setDelUser(null)
    addToast({ message: 'User deleted', type: 'success' })
  }

  const handleEditGoal = async d => {
    await updateGoalMut.mutateAsync({
      goalId: editGoalData.goal_id,
      updates: {
        goal_title: d.goal_title, department: d.department, kpi: d.kpi,
        monthly_target: parseFloat(d.monthly_target)||0,
        monthly_achievement: d.monthly_achievement ? parseFloat(d.monthly_achievement) : null,
        week1_target: parseFloat(d.week1_target)||0, week2_target: parseFloat(d.week2_target)||0,
        week3_target: parseFloat(d.week3_target)||0, week4_target: parseFloat(d.week4_target)||0,
        week1_achievement: d.week1_achievement ? parseFloat(d.week1_achievement) : null,
        week2_achievement: d.week2_achievement ? parseFloat(d.week2_achievement) : null,
        week3_achievement: d.week3_achievement ? parseFloat(d.week3_achievement) : null,
        week4_achievement: d.week4_achievement ? parseFloat(d.week4_achievement) : null,
        status: d.status, approval_status: d.approval_status,
        start_date: d.start_date||null, end_date: d.end_date||null,
        goal_description: d.goal_description,
      },
    })
    setEditGoalData(null)
    addToast({ message: 'Goal updated', type: 'success' })
  }

  const handleDeleteGoal = async () => {
    await deleteGoalMut.mutateAsync({ goalId: delGoal.goal_id, goalTitle: delGoal.goal_title, actor: user })
    setDelGoal(null)
    addToast({ message: 'Goal deleted', type: 'success' })
  }

  const handleApproveGoal = async () => {
    await approveGoalMut.mutateAsync({ goalId: approveGoal.goal_id, approverId: user.id, approverName: user.name })
    setApproveGoal(null)
    addToast({ message: 'Goal approved', type: 'success' })
  }

  const handleRejectGoal = async () => {
    await rejectGoalMut.mutateAsync({ goalId: rejectGoal.goal_id, reason: rejectReason, rejecterId: user.id, rejectorName: user.name })
    setRejectGoal(null)
    setRejectReason('')
    addToast({ message: 'Goal rejected', type: 'info' })
  }

  const handleDeleteFeedback = async () => {
    await deleteFbMut.mutateAsync(delFeedback.feedback_id)
    setDelFeedback(null)
    addToast({ message: 'Feedback deleted', type: 'success' })
  }

  const TABS = [
    { key: 'overview',      label: 'Overview',      icon: BarChart2 },
    { key: 'users',         label: 'Users',         icon: Users,    badge: allUsers.length },
    { key: 'goals',         label: 'Goals',         icon: Target,   badge: stats.pending > 0 ? `${stats.pending} pending` : null, badgeRed: false },
    { key: 'feedback',      label: 'Feedback',      icon: Activity, badge: allFeedback.length },
    { key: 'notifications', label: 'Notifications', icon: Bell,     badge: unreadCount > 0 ? `${unreadCount} unread` : null, badgeRed: true },
    { key: 'activity',      label: 'Live Activity', icon: Shield },
    { key: 'mail',          label: 'Mail Settings', icon: Mail },
  ]

  return (
    <div>
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)',
        borderRadius: 'var(--r-xl)', padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={26} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '1.4rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Admin Control Panel
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 5, margin: '5px 0 0' }}>
            Full system access · All users, goals, feedback & notifications · {user.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[
            { label: 'Users',   value: allUsers.length,  color: '#1D4ED8' },
            { label: 'Goals',   value: allGoals.length,  color: '#065F46' },
            { label: 'Pending', value: stats.pending,    color: '#92400E' },
            { label: 'Unread',  value: unreadCount,      color: unreadCount > 0 ? '#991B1B' : '#374151' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: s.color, borderRadius: 10, padding: '8px 14px', minWidth: 68 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', alignSelf: 'center' }}
            onClick={() => { rUsers(); rGoals(); rFB(); rNotifs() }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs-wrap mb-6">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 5 }} />
            {t.label}
            {t.badge && (
              <span className={`badge ${t.badgeRed ? 'badge-red' : 'badge-amber'}`} style={{ marginLeft: 6, fontSize: '0.63rem' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          OVERVIEW
      ════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24, width: '100%' }}>
            <KpiCard icon={Users}       value={allUsers.length}             label="Total Users"      color={P.blue}   sub="All roles" />
            <KpiCard icon={Target}      value={allGoals.length}             label="Total Goals"      color={P.indigo} sub={`${stats.completed} completed`} />
            <KpiCard icon={CheckCircle} value={stats.pending}               label="Pending Approval" color={P.amber}  sub="Awaiting review" />
            {/* avgP now counts blank achievements as 0 */}
            <KpiCard 
              icon={Activity}
              value={`${stats.avgP.toFixed(1)}%`}
              label="Org Avg Progress"
              color={stats.avgP >= 80 ? P.green : stats.avgP >= 50 ? P.amber : P.red}
              sub={
                stats.avgP >= 80
                  ? "On track · All goals"
                  : stats.avgP >= 50
                  ? "Needs attention · Some lag"
                  : "At risk · Immediate action needed"
              }
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28, width: '100%' }}>
            <KpiCard icon={BarChart2}   value={stats.active}                label="Active Goals"     color={P.blue}   />
            <KpiCard icon={CheckCircle} value={stats.completed}             label="Completed Goals"  color={P.green}  />
            <KpiCard icon={XCircle}     value={stats.overdue}               label="Overdue Goals"    color={P.red}    />
            <KpiCard icon={Bell}        value={allFeedback.length}          label="Total Feedback"   color={P.violet} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Goal Status Distribution</div></div>
              <div className="card-body">
                {pieData.length > 0 ? <StatusPieChart data={pieData} /> : <EmptyState title="No goals yet" />}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Users by Role</div></div>
              <div className="card-body">
                {stats.roleBreak.map(r => {
                  const pct = allUsers.length ? (r.count / allUsers.length) * 100 : 0
                  return (
                    <div key={r.role} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <RoleBadge role={r.role} />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.count}</span>
                      </div>
                      <ProgressBar value={pct} size="h6" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {stats.pending > 0 && (
            <div className="alert alert-warning mb-5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><strong>{stats.pending}</strong> goal{stats.pending !== 1 ? 's' : ''} waiting for approval</span>
              <button className="btn btn-sm btn-secondary" onClick={() => { setGoalApproval('pending'); setActiveTab('goals') }}>
                Review Now →
              </button>
            </div>
          )}

          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => { setActiveTab('users'); setCreateUser(true) }}><Plus size={14} /> Create User</button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('users')}>Manage Users</button>
                <button className="btn btn-secondary" onClick={() => { setGoalApproval('pending'); setActiveTab('goals') }}>Review Pending Goals</button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('activity')}>Live Activity</button>
                <button className="btn btn-secondary" onClick={() => goalsToCSV(allGoals, allUsers)}><Download size={14} /> Export All Goals</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          USERS
      ════════════════════════════════ */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Search name, email, dept…" />
              <select className="select select-sm select-auto" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="All">All Roles</option>
                {['Admin','CMD','VP','HR','Manager','Employee'].map(r => <option key={r}>{r}</option>)}
              </select>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{displayUsers.length} / {allUsers.length} users</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateUser(true)}><Plus size={14} /> Create User</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Designation</th><th>Department</th><th>Supervisor</th><th>Goals</th><th>Done</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {uLoad
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>
                  ))
                  : displayUsers.map(u => {
                    const mgr = allUsers.find(m => m.id === u.manager_id)
                    const ug  = allGoals.filter(g => g.user_id === u.id)
                    const uc  = ug.filter(g => g.status === 'Completed').length
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.87rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {u.name}
                                {u?.is_active === false && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                                )}
                              </div>
                              {u.id === user.id && <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>You</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{u.email}</td>
                        <td><RoleBadge role={u.role} /></td>
                        <td>{u.designation || '—'}</td>
                        <td>{u.department || '—'}</td>
                        <td>{mgr?.name || '—'}</td>
                        <td><span className="badge badge-blue">{ug.length}</span></td>
                        <td><span className="badge badge-green">{uc}</span></td>
                        <td>
                          <div className="td-action">
                            <button className="btn btn-icon sm" title="View Goals" onClick={() => navigate(`/employees/${u.id}/goals`)}><Eye size={12} /></button>
                            <button className="btn btn-icon sm" title="Edit" onClick={() => setEditUser(u)}><Pencil size={12} /></button>
                            {u.id !== user.id && <button className="btn btn-icon sm danger" title="Delete" onClick={() => setDelUser(u)}><Trash2 size={12} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          GOALS
      ════════════════════════════════ */}
      {activeTab === 'goals' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <SearchBox value={goalSearch} onChange={setGoalSearch} placeholder="Search goal, employee, dept…" />
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select className="select select-sm select-auto" value={goalStatus} onChange={e => setGoalStatus(e.target.value)}>
                <option value="All">All</option>
                {['Active','Completed','On Hold','Cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Approval</label>
              <select className="select select-sm select-auto" value={goalApproval} onChange={e => setGoalApproval(e.target.value)}>
                <option value="All">All</option>
                {['approved','pending','rejected'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role</label>
              <select className="select select-sm select-auto" value={goalRoleFilter} onChange={e => setGoalRoleFilter(e.target.value)}>
                <option value="All">All Roles</option>
                {['Admin','CMD','VP','HR','Manager','Employee'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Month</label>
              <select className="select select-sm select-auto" value={goalMonth} onChange={e => setGoalMonth(e.target.value)}>
                <option value="All">All Months</option>
                {MONTH_NAMES.slice(1).map((mn, i) => <option key={i + 1} value={i + 1}>{mn}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{displayGoals.length} goals</span>
              <button className="btn btn-xs btn-secondary" onClick={() => goalsToCSV(displayGoals, allUsers)}><Download size={11} /> CSV</button>
            </div>
          </div>

          {stats.pending > 0 && goalApproval !== 'approved' && (
            <div className="alert alert-warning mb-4">
              <strong>{stats.pending}</strong> goal{stats.pending !== 1 ? 's' : ''} pending approval — highlighted below.
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 1100 }}>
              <thead>
                <tr><th>Employee</th><th>Role</th><th>Goal Title</th><th>Dept</th><th>Period</th><th>Target</th><th>Achievement</th><th>Progress</th><th>Status</th><th>Approval</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {gLoad
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 11 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>
                  ))
                  : displayGoals.slice(0, 300).map(g => {
                    const owner = allUsers.find(u => u.id === g.user_id)
                    // ── FIX: blank achievement treated as 0 ──
                    const p = calcProgress(g.monthly_achievement ?? 0, g.monthly_target)
                    return (
                      <tr key={g.goal_id} style={{ background: g.approval_status === 'pending' ? '#FFFBEB' : '' }}>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {owner?.name || '—'}
                            {owner?.is_active === false && (
                              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                            )}
                          </span>
                        </td>
                        <td><RoleBadge role={owner?.role} /></td>
                        <td style={{ maxWidth: 180 }}><div className="truncate font-600">{g.goal_title}</div></td>
                        <td><span className="badge badge-gray">{g.department}</span></td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-3)' }}>{MONTH_NAMES[g.month]} {g.year}</td>
                        <td style={{ fontWeight: 600 }}>{g.monthly_target}</td>
                        <td>{g.monthly_achievement ?? <span className="val-muted">—</span>}</td>
                        <td style={{ minWidth: 110 }}>
                          <ProgressBar value={p} size="h4" />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{p.toFixed(1)}%</span>
                        </td>
                        <td><StatusBadge status={g.status} /></td>
                        <td>
                          <span className={`badge badge-${g.approval_status === 'approved' ? 'green' : g.approval_status === 'rejected' ? 'red' : 'amber'}`}>
                            {g.approval_status}
                          </span>
                        </td>
                        <td>
                          <div className="td-action">
                            {g.approval_status === 'pending' && (
                              <>
                                <button className="btn btn-icon sm" style={{ color: 'var(--success)' }} title="Approve" onClick={() => setApproveGoal(g)}><CheckCircle size={12} /></button>
                                <button className="btn btn-icon sm danger" title="Reject" onClick={() => setRejectGoal(g)}><XCircle size={12} /></button>
                              </>
                            )}
                            <button className="btn btn-icon sm" title="Edit" onClick={() => setEditGoalData(g)}><Pencil size={12} /></button>
                            <button className="btn btn-icon sm danger" title="Delete" onClick={() => setDelGoal(g)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
                {displayGoals.length > 300 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    Showing 300 of {displayGoals.length}. Use filters or export CSV.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          FEEDBACK
      ════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBox value={fbSearch} onChange={setFbSearch} placeholder="Search employee, goal, comment…" />
            <select className="select select-sm select-auto" value={fbTypeFilter} onChange={e => setFbTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              {['CMD Feedback','VP Feedback','HR Feedback','Manager Feedback'].map(t => <option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{displayFeedback.length} entries</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>For Employee</th><th>Role</th><th>Goal</th><th>Type</th><th>Comment</th><th>Given By</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {fLoad
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>
                  ))
                  : displayFeedback.length === 0
                    ? <tr><td colSpan={8}><EmptyState title="No feedback found" /></td></tr>
                    : displayFeedback.map(fb => {
                      const owner = allUsers.find(u => u.id === fb.user_id)
                      const giver = allUsers.find(u => u.id === fb.feedback_by)
                      const goal  = allGoals.find(g => g.goal_id === fb.goal_id)
                      return (
                        <tr key={fb.feedback_id}>
                          <td>
                            <span style={{ fontWeight: 600, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {owner?.name || '—'}
                              {owner?.is_active === false && (
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                              )}
                            </span>
                          </td>
                          <td><RoleBadge role={owner?.role} /></td>
                          <td style={{ maxWidth: 160 }}><div className="truncate">{goal?.goal_title || '—'}</div></td>
                          <td><span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{fb.feedback_type}</span></td>
                          <td style={{ maxWidth: 220 }}><div className="truncate">{fb.comment}</div></td>
                          <td style={{ fontWeight: 500 }}>{giver?.name || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-3)' }}>{formatIST(fb.created_at, 'dd MMM yy')}</td>
                          <td><button className="btn btn-icon sm danger" onClick={() => setDelFeedback(fb)}><Trash2 size={12} /></button></td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          NOTIFICATIONS
      ════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBox value={notifSearch} onChange={setNotifSearch} placeholder="Search user, message, type…" />
            <select className="select select-sm select-auto" value={notifFilter} onChange={e => setNotifFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Unread">Unread only</option>
              <option value="Read">Read only</option>
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{displayNotifs.length} · {unreadCount} unread</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Type</th><th>Message</th><th>Time</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {nLoad
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>
                  ))
                  : displayNotifs.length === 0
                    ? <tr><td colSpan={7}><EmptyState title="No notifications found" /></td></tr>
                    : displayNotifs.slice(0, 400).map(n => {
                      const owner = allUsers.find(u => u.id === n.user_id)
                      const color = (NOTIF_MAP[n.action_type] || {}).color || '#64748B'
                      return (
                        <tr key={n.id} style={{ opacity: n.is_read ? 0.6 : 1 }}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {owner?.name || '—'}
                              {owner?.is_active === false && (
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                              )}
                            </span>
                          </td>
                          <td><RoleBadge role={owner?.role} /></td>
                          <td>
                            <span style={{ display: 'inline-block', padding: '3px 8px', background: `${color}18`, color, borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {(n.action_type || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ maxWidth: 280 }}><div className="truncate">{n.details}</div></td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-3)' }}>{formatIST(n.created_at, 'dd MMM yy, hh:mm a')}</td>
                          <td><span className={`badge badge-${n.is_read ? 'gray' : 'red'}`}>{n.is_read ? 'Read' : 'Unread'}</span></td>
                          <td>{!n.is_read && <button className="btn btn-xs btn-secondary" onClick={() => markReadMut.mutate(n.id)}>Mark Read</button>}</td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          LIVE ACTIVITY
      ════════════════════════════════ */}
      {activeTab === 'activity' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24, width: '100%' }}>
            <KpiCard icon={Bell}        value={unreadCount}                  label="Unread Alerts"     color={P.red}   />
            <KpiCard icon={CheckCircle} value={stats.pending}                label="Pending Approvals" color={P.amber} />
            <KpiCard icon={XCircle}     value={stats.overdue}                label="Overdue Goals"     color={P.red}   />
            {/* avgP now counts blank achievements as 0 */}
            <KpiCard icon={BarChart2}   value={`${stats.avgP.toFixed(1)}%`}  label="Org Avg Progress"  color={P.green} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">System Activity Feed</div>
                {unreadCount > 0 && <span className="badge badge-red">{unreadCount} unread</span>}
              </div>
              <div className="card-body" style={{ padding: 0, maxHeight: 480, overflowY: 'auto' }}>
                {allNotifs.length === 0
                  ? <div style={{ padding: 20 }}><EmptyState title="No activity yet" /></div>
                  : allNotifs.slice(0, 60).map(n => {
                    const owner = allUsers.find(u => u.id === n.user_id)
                    const color = (NOTIF_MAP[n.action_type] || {}).color || '#64748B'
                    return (
                      <div key={n.id} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : '#EFF6FF', opacity: n.is_read ? 0.65 : 1 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.83rem', fontWeight: 600 }}>
                            {owner?.name || '—'} <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({owner?.role})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>{n.details}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 3 }}>{timeAgo(n.created_at)} IST</div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Overdue Goals</div>
                <span className="badge badge-red">{stats.overdue}</span>
              </div>
              <div className="card-body" style={{ padding: 0, maxHeight: 480, overflowY: 'auto' }}>
                {stats.overdue === 0
                  ? <div style={{ padding: 20 }}><EmptyState title="No overdue goals" description="All active goals are within deadline" /></div>
                  : allGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).map(g => {
                    const owner    = allUsers.find(u => u.id === g.user_id)
                    // ── FIX: blank achievement = 0 ──
                    const p        = calcProgress(g.monthly_achievement ?? 0, g.monthly_target)
                    const daysPast = Math.floor((today - new Date(g.end_date)) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={g.goal_id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FFF5F5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{g.goal_title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{owner?.name} · {MONTH_NAMES[g.month]} {g.year}</div>
                          </div>
                          <span className="badge badge-red" style={{ flexShrink: 0 }}>{daysPast}d overdue</span>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <ProgressBar value={p} size="h4" />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{p.toFixed(1)}% of {g.monthly_target}</span>
                        </div>
                        <button className="btn btn-xs btn-secondary" style={{ marginTop: 8 }} onClick={() => setEditGoalData(g)}>Edit Goal</button>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </div>

          {stats.pending > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Pending Goal Approvals</div>
                <span className="badge badge-amber">{stats.pending} waiting</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {allGoals.filter(g => g.approval_status === 'pending').map(g => {
                  const owner = allUsers.find(u => u.id === g.user_id)
                  return (
                    <div key={g.goal_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{g.goal_title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{owner?.name} ({owner?.role}) · {MONTH_NAMES[g.month]} {g.year} · Target: {g.monthly_target}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-sm btn-success" onClick={() => setApproveGoal(g)}><CheckCircle size={13} /> Approve</button>
                        <button className="btn btn-sm btn-danger"  onClick={() => setRejectGoal(g)}><XCircle size={13} /> Reject</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'mail' && <MailSettingsTab allUsers={allUsers} />}

      {/* ════════════════════════════════
          MODALS
      ════════════════════════════════ */}
      {createUser   && <UserModal allUsers={allUsers} onSave={handleCreateUser} onClose={() => setCreateUser(false)} loading={createUserMut.isPending} isCreate />}
      {editUser     && <UserModal user={editUser} allUsers={allUsers} onSave={handleEditUser} onClose={() => setEditUser(null)} loading={updateUserMut.isPending} />}
      {editGoalData && <GoalEditModal goal={editGoalData} allUsers={allUsers} onSave={handleEditGoal} onClose={() => setEditGoalData(null)} loading={updateGoalMut.isPending} />}

      {approveGoal && (
        <ConfirmDialog
          title="Approve Goal"
          message={`Approve "${approveGoal.goal_title}" for ${allUsers.find(u => u.id === approveGoal.user_id)?.name}?`}
          confirmLabel="Approve" confirmVariant="success"
          onConfirm={handleApproveGoal} onCancel={() => setApproveGoal(null)} loading={approveGoalMut.isPending}
        />
      )}

      {rejectGoal && (
        <div className="modal-overlay" onClick={() => setRejectGoal(null)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Reject Goal</span>
              <button className="modal-close-btn" onClick={() => setRejectGoal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-error mb-4">Rejecting: <strong>{rejectGoal.goal_title}</strong></div>
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea className="textarea" placeholder="Provide a clear reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectGoal(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={!rejectReason.trim() || rejectGoalMut.isPending} onClick={handleRejectGoal}>
                {rejectGoalMut.isPending ? <Spinner size={14} /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {delUser     && <ConfirmDialog title="Delete User"     message={`Permanently delete ${delUser.name}? All their goals and feedback will also be deleted.`} confirmLabel="Delete User" confirmVariant="danger" onConfirm={handleDeleteUser}     onCancel={() => setDelUser(null)}     loading={deleteUserMut.isPending} />}
      {delGoal     && <ConfirmDialog title="Delete Goal"     message={`Delete "${delGoal.goal_title}"? This cannot be undone.`}                               confirmLabel="Delete"      confirmVariant="danger" onConfirm={handleDeleteGoal}     onCancel={() => setDelGoal(null)}     loading={deleteGoalMut.isPending} />}
      {delFeedback && <ConfirmDialog title="Delete Feedback" message="Delete this feedback entry? This cannot be undone."                                       confirmLabel="Delete"      confirmVariant="danger" onConfirm={handleDeleteFeedback} onCancel={() => setDelFeedback(null)} loading={deleteFbMut.isPending} />}
    </div>
  )
}