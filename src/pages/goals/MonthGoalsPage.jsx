import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import {
  useMonthGoals, useCreateGoal, useUpdateGoal,
  useDeleteGoal, useAllUsers
} from '../../hooks/useData'
import { MONTH_NAMES, QUARTER_LABELS, calcProgress } from '../../lib/constants'
import { goalsToCSV, isDirectSupervisor, getMonthWeeks, getMonthBounds } from '../../lib/utils'
import GoalSheetTable from '../../components/charts/GoalSheetTable'
import { GoalFormModal, UpdateAchievementsModal, isTextTarget } from '../../components/modals/GoalModals'
import FeedbackSection from './FeedbackSection'
import { ProgressBar, EmptyState, ConfirmDialog, Spinner } from '../../components/ui/index.jsx'
import {
  Plus, Download, RefreshCw, Target, TrendingUp,
  TrendingDown, Minus, CheckCircle, AlertTriangle,
  BarChart2, Award, ChevronLeft, Activity, Edit2, Trash2
} from 'lucide-react'

const P = {
  blue: '#2563EB', green: '#059669', amber: '#D97706',
  red:  '#DC2626', violet: '#7C3AED', indigo: '#6366F1',
}

const TEXT_STATUS_STYLE = {
  'Completed':   { bg: '#D1FAE5', color: '#065F46' },
  'In Progress': { bg: '#DBEAFE', color: '#1D4ED8' },
  'On Hold':     { bg: '#FEF3C7', color: '#92400E' },
  'Cancelled':   { bg: '#FEE2E2', color: '#991B1B' },
}

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

function KpiCard({ label, value, sub, color, trend, trendVal, icon: Icon, onClick }) {
  const TrendIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? P.green : trend === 'down' ? P.red : '#94A3B8'
  return (
    <div
      onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: 'var(--r-xl)', padding: '18px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.18s, transform 0.18s' }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = '' }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '0 0 0 60px', background: `${color}07`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</div>
        {Icon && <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={12} color={color} /></div>}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>{sub}</div>}
      {trendVal !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <TrendIcon size={11} color={trendColor} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: trendColor }}>{trendVal}</span>
        </div>
      )}
    </div>
  )
}

function ratingStyle(r) {
  if (r === 4) return { bg: '#DCFCE7', color: '#166534', label: 'Excellent' }
  if (r === 3) return { bg: '#FEF9C3', color: '#713F12', label: 'Good'      }
  if (r === 2) return { bg: '#FEF3C7', color: '#92400E', label: 'Average'   }
  if (r === 1) return { bg: '#FEE2E2', color: '#991B1B', label: 'Poor'      }
  return { bg: 'var(--surface-2)', color: 'var(--text-4)', label: '—' }
}

// ── Week Goal Sheet ───────────────────────────────────────────
function WeekGoalSheet({ goals, weekNum, weekInfo, canEdit, canModify, onUpdate, onEdit, onDelete }) {
  if (goals.length === 0) return <EmptyState title="No goals" description="No goals found for this month" />

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table className="goal-sheet-table" style={{ minWidth: 900, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ minWidth: 100 }}>Dept</th>
            <th rowSpan={2} style={{ minWidth: 180 }}>Goal Title</th>
            <th rowSpan={2} style={{ minWidth: 90 }}>KPI</th>
            <th rowSpan={2} style={{ minWidth: 70, textAlign: 'center' }}>Monthly Target</th>
            <th style={{ textAlign: 'center', background: '#1E40AF', color: '#fff', minWidth: 80 }}>
              W{weekNum} Target
              {weekInfo && <div style={{ fontSize: '0.62rem', fontWeight: 400, opacity: 0.8 }}>{weekInfo.label}</div>}
            </th>
            <th style={{ textAlign: 'center', background: '#065F46', color: '#fff', minWidth: 110 }}>
              W{weekNum} Achievement
            </th>
            <th style={{ textAlign: 'center', background: '#6B21A8', color: '#fff', minWidth: 80 }}>Progress</th>
            <th rowSpan={2} style={{ minWidth: 90 }}>Status</th>
            {canEdit && <th rowSpan={2} style={{ minWidth: 90 }}>Actions</th>}
          </tr>
          <tr>
            <th className="wt" style={{ textAlign: 'center', fontSize: '0.68rem' }}>Value</th>
            <th className="wa" style={{ textAlign: 'center', fontSize: '0.68rem' }}>Value</th>
            <th style={{ background: '#4C1D95', color: '#fff', textAlign: 'center', fontSize: '0.68rem' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g, i) => {
            const isText   = isTextTarget(g.monthly_target)
            const wTarget  = g[`week${weekNum}_target`]
            const wAchieve = g[`week${weekNum}_achievement`]
            const wAchText = g[`week${weekNum}_achievement_text`]

            let p = 0, pColor = 'var(--text-4)'
            if (isText) {
              p = wAchieve || 0
              pColor = p >= 100 ? P.green : p >= 50 ? P.amber : p > 0 ? P.red : 'var(--text-4)'
            } else {
              p      = calcProgress(wAchieve, wTarget)
              pColor = p >= 100 ? P.green : p >= 60 ? P.amber : wAchieve != null ? P.red : 'var(--text-4)'
            }

            const AchDisplay = () => {
              if (isText) {
                if (!wAchText && wAchieve == null) return <span className="val-muted">—</span>
                const status = wAchText || (wAchieve != null ? `${wAchieve}%` : null)
                const s = TEXT_STATUS_STYLE[status] || { bg: 'var(--surface-2)', color: 'var(--text-3)' }
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                    {status}
                  </span>
                )
              }
              if (wAchieve == null) return <span className="val-muted">—</span>
              return <span style={{ fontWeight: 700, color: pColor }}>{wAchieve}</span>
            }

            return (
              <tr key={g.goal_id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                <td style={{ minWidth: 100 }}>
                  <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{g.department || '—'}</span>
                </td>
                <td style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 2 }}>{g.goal_title}</div>
                  {g.goal_description && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{g.goal_description}</div>
                  )}
                </td>
                <td style={{ fontSize: '0.82rem', minWidth: 90 }}>{g.kpi || '—'}</td>
                <td style={{ fontWeight: 700, color: isText ? '#D97706' : P.blue, fontStyle: isText ? 'italic' : 'normal', fontSize: isText ? '0.75rem' : 'inherit', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: isText ? 120 : 70 }}>
                  {g.monthly_target ?? '—'}
                </td>
                <td className="wt" style={{ fontWeight: 700, minWidth: isText ? 120 : 46 }}>
                  {isText
                    ? wTarget
                      ? <span style={{ fontSize: '0.72rem', color: '#D97706', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', display: 'block' }}>{wTarget}</span>
                      : <span className="val-muted">—</span>
                    : (wTarget ?? <span className="val-muted">—</span>)
                  }
                </td>
                <td className="wa" style={{ textAlign: 'center' }}><AchDisplay /></td>
                <td style={{ minWidth: 110, background: '#F5F3FF' }}>
                  {(wAchieve != null || (isText && wAchText)) ? (
                    <div style={{ padding: '0 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pColor }}>{p.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(p, 100)}%`, background: pColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ) : (
                    <span className="val-muted" style={{ display: 'block', textAlign: 'center' }}>—</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${g.status === 'Completed' ? 'green' : g.status === 'Active' ? 'blue' : 'gray'}`}>{g.status}</span>
                </td>
                {canEdit && (
                  <td>
                    <div className="td-action">
                      <button className="btn btn-icon sm" title="Update Achievements" onClick={() => onUpdate(g)}><BarChart2 size={12} /></button>
                      {canModify && (
                        <>
                          <button className="btn btn-icon sm" title="Edit Goal" onClick={() => onEdit(g)}><Edit2 size={12} /></button>
                          <button className="btn btn-icon sm danger" title="Delete" onClick={() => onDelete(g)}><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Week summary KPI strip ────────────────────────────────────
function WeekSummaryStrip({ goals, weekNum }) {
  const updated = goals.filter(g => g[`week${weekNum}_achievement`] != null || g[`week${weekNum}_achievement_text`])
  const hitTarget = updated.filter(g => {
    const p = isTextTarget(g.monthly_target)
      ? (g[`week${weekNum}_achievement`] || 0)
      : calcProgress(g[`week${weekNum}_achievement`], g[`week${weekNum}_target`])
    return p >= 100
  })
  const avgP = goals.length
    ? goals.reduce((a, g) => {
        const wAch = g[`week${weekNum}_achievement`]
        const wTgt = g[`week${weekNum}_target`]
        const p = isTextTarget(g.monthly_target)
          ? (parseFloat(wAch) || 0)
          : calcProgress(parseFloat(wAch), parseFloat(wTgt))
        return a + (isNaN(p) ? 0 : p)
      }, 0) / goals.length
    : 0
  const achRate = goals.length > 0
    ? goals.reduce((a, g) => {
        if (isTextTarget(g.monthly_target)) {
          const txt = g[`week${weekNum}_achievement_text`] || ''
          const p   = txt === 'Completed' ? 100 : txt === 'In Progress' ? 50 : (parseFloat(g[`week${weekNum}_achievement`]) || 0)
          return a + p
        }
        return a + calcProgress(parseFloat(g[`week${weekNum}_achievement`]), parseFloat(g[`week${weekNum}_target`]))
      }, 0) / goals.length
    : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      {[
        { label: 'Total Goals',      value: goals.length,           color: P.indigo, icon: Target      },
        { label: 'Updated',          value: updated.length,          color: P.blue,   icon: Activity    },
        { label: 'Hit Target',       value: hitTarget.length,        color: P.green,  icon: CheckCircle },
        { label: 'Achievement Rate', value: `${achRate.toFixed(0)}%`, color: achRate >= 80 ? P.green : achRate >= 50 ? P.amber : P.red, icon: Award },
      ].map(s => <KpiCard key={s.label} {...s} />)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function MonthGoalsPage({ mine }) {
  const { year, quarter, month, empId } = useParams()
  const user     = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)
  const navigate = useNavigate()

  const yr = parseInt(year), q = parseInt(quarter), m = parseInt(month)
  const targetUserId = mine ? user.id : empId

  // ── Real calendar weeks for this month ──────────────────────
  const calendarWeeks = useMemo(() => getMonthWeeks(yr, m), [yr, m])
  const weekCount     = calendarWeeks.length   // 4 or 5
  const monthBounds   = useMemo(() => getMonthBounds(yr, m), [yr, m])

  const { data: goals = [], isLoading, refetch } = useMonthGoals(targetUserId, yr, q, m)
  const { data: allUsers = [] } = useAllUsers()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [activeTab,     setActiveTab]     = useState('monthly')
  const [showCreate,    setShowCreate]    = useState(false)
  const [editGoal,      setEditGoal]      = useState(null)
  const [updateTarget,  setUpdateTarget]  = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [createWeekNum, setCreateWeekNum] = useState(null)

  const visibleGoals = useMemo(() => {
    if (mine && user.manager_id)
      return goals.filter(g => g.approval_status === 'approved')
    return goals
  }, [goals, mine, user.role])

  const pendingCount = (mine && user.manager_id)
    ? goals.filter(g => g.approval_status === 'pending').length
    : 0

  const isSupervisor = useMemo(() => isDirectSupervisor(user, targetUserId, allUsers), [user, targetUserId, allUsers])
  const canEdit   = mine || isSupervisor || user.role === 'Admin'
  const canModify = (isSupervisor && user.role !== 'Employee') || user.role === 'Admin'
  const canRate   = isSupervisor || user.role === 'Admin' || user.role === 'HR'

  const summary = useMemo(() => {
    const today = new Date()
    const numericGoals = visibleGoals.filter(g => !isTextTarget(g.monthly_target))
    const totalTarget  = numericGoals.reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
    const totalAch     = numericGoals.reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
    const numericRate  = totalTarget > 0 ? (totalAch / totalTarget * 100) : null
    const textGoals    = visibleGoals.filter(g => isTextTarget(g.monthly_target))
    const textFilled   = textGoals.filter(g => g.monthly_achievement != null && String(g.monthly_achievement).trim() !== '').length
    const textRate     = textGoals.length > 0 ? (textFilled / textGoals.length * 100) : null
    const achRate      = numericRate !== null && textRate !== null
      ? (numericGoals.length * numericRate + textGoals.length * textRate) / (numericGoals.length + textGoals.length)
      : numericRate !== null ? numericRate : textRate !== null ? textRate : 0
    const completed = visibleGoals.filter(g => g.status === 'Completed').length
    const avgP      = visibleGoals.length
      ? visibleGoals.reduce((a, g) => a + calcProgress(g.monthly_achievement ?? 0, g.monthly_target, g.status), 0) / visibleGoals.length
      : 0
    const overdue = visibleGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < today).length
    return { totalTarget, totalAch, completed, avgP, overdue, achRate, textGoals: textGoals.length, textFilled }
  }, [visibleGoals])

  // ── handleCreate — auto-fills dates, supports up to 5 weeks ──
  const handleCreate = async (data) => {
    const rawTarget = data.monthly_target
    const isText    = isTextTarget(rawTarget)
    const mt        = isText ? 0 : (parseFloat(rawTarget) || 0)
    const wDiv      = mt / weekCount

    // Auto-fill start/end if blank
    const startDate = data.start_date || monthBounds.firstDay
    const endDate   = data.end_date   || monthBounds.lastDay

    // Build week targets for all weeks (up to 5)
    const weekTargets = {}
    for (let w = 1; w <= 5; w++) {
      if (createWeekNum) {
        // Only the locked week gets a target; others null
        weekTargets[`week${w}_target`] = w === createWeekNum
          ? (isText ? (data[`week${w}_target`] || '') : mt)
          : (isText ? null : 0)
      } else if (isText) {
        weekTargets[`week${w}_target`] = data[`week${w}_target`] || null
      } else {
        const entered = data[`week${w}_target`]
        const allBlank = [1,2,3,4,5].every(wx => !data[`week${wx}_target`])
        // Only fill weeks that exist in this month's calendar
        weekTargets[`week${w}_target`] = w <= weekCount
          ? (allBlank ? +wDiv.toFixed(2) : (parseFloat(entered) || 0))
          : null
      }
    }

    await createGoal.mutateAsync({
      user_id: targetUserId, year: yr, quarter: q, month: m,
      department: data.department, goal_title: data.goal_title, kpi: data.kpi,
      monthly_target: isText ? rawTarget : mt,
      ...weekTargets,
      goal_description: data.goal_description || '',
      start_date: startDate,
      end_date:   endDate,
      status: 'Active',
      approval_status: mine && user.manager_id ? 'pending' : 'approved',
      created_by: user.id,
    })
    setShowCreate(false)
    setCreateWeekNum(null)
    if (mine && user.manager_id)
      addToast({ message: 'Goal submitted for approval', type: 'info' })
  }

  const handleEdit = async (data) => {
    await updateGoal.mutateAsync({
      goalId: editGoal.goal_id,
      updates: {
        department: data.department, goal_title: data.goal_title, kpi: data.kpi,
        monthly_target: data.monthly_target,
        week1_target: data.week1_target, week2_target: data.week2_target,
        week3_target: data.week3_target, week4_target: data.week4_target,
        week5_target: data.week5_target,
        goal_description: data.goal_description,
        start_date: data.start_date, end_date: data.end_date, status: data.status,
      },
    })
    setEditGoal(null)
  }

  const handleUpdate = async (updates) => {
    const isEmployee = mine && !!user.manager_id
    if (isEmployee) {
      const pendingUpdates = { achievement_approval_status: 'pending', remarks: updates.remarks ?? null, file_urls: updates.file_urls ?? [] }
      for (let w = 1; w <= 5; w++) {
        pendingUpdates[`week${w}_achievement_pending`] = updates[`week${w}_achievement`] ?? null
      }
      pendingUpdates.monthly_achievement_pending = updates.monthly_achievement ?? null
      await updateGoal.mutateAsync({ goalId: updateTarget.goal_id, updates: pendingUpdates, actor: user })
      setUpdateTarget(null)
      addToast({ message: 'Achievements submitted — awaiting approval', type: 'info' })
    } else {
      await updateGoal.mutateAsync({
        goalId: updateTarget.goal_id,
        updates: { ...updates, remarks: updates.remarks ?? null, file_urls: updates.file_urls ?? [] },
        actor: user,
      })
      setUpdateTarget(null)
      addToast({ message: 'Achievements saved', type: 'success' })
    }
  }

  const handleDelete = async () => {
    await deleteGoal.mutateAsync({ goalId: deleteTarget.goal_id, goalTitle: deleteTarget.goal_title, actor: user })
    setDeleteTarget(null)
  }

  const handleRate = async (goal, rating) => {
    await updateGoal.mutateAsync({ goalId: goal.goal_id, updates: { manager_rating: rating }, actor: user })
  }

  const viewerEmp     = !mine ? allUsers.find(u => u.id === empId) : null
  const basePath      = mine ? `/my-goals/${yr}/q/${q}` : `/employees/${empId}/goals/${yr}/q/${q}`
  const progressColor = summary.avgP >= 80 ? P.green : summary.avgP >= 50 ? P.amber : P.red

  // ── Dynamic tabs — real calendar weeks ──────────────────────
  const TABS = [
    { key: 'monthly', label: 'Monthly View' },
    ...calendarWeeks.map(w => ({
      key:   `week${w.weekNum}`,
      label: `W${w.weekNum}`,
      sub:   w.label,   // e.g. "Apr 1 – 6"
    })),
  ]

  const ActionsBar = () => (canEdit || canModify) ? (
    <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Actions</span>
      </div>
      {canEdit && (
        <select className="select select-sm select-auto" style={{ maxWidth: 240 }} defaultValue=""
          onChange={e => { const g = visibleGoals.find(g => g.goal_id === e.target.value); if (g) setUpdateTarget({ ...g, _lockedWeek: activeTab.startsWith('week') ? parseInt(activeTab.slice(-1)) : null }); e.target.value = '' }}>
          <option value="" disabled>{mine && user.role === 'Employee' ? 'Submit Achievements…' : 'Update Achievements…'}</option>
          {visibleGoals.map(g => <option key={g.goal_id} value={g.goal_id}>{g.goal_title}</option>)}
        </select>
      )}
      {canModify && (
        <>
          <select className="select select-sm select-auto" style={{ maxWidth: 200 }} defaultValue=""
            onChange={e => { const g = visibleGoals.find(g => g.goal_id === e.target.value); if (g) setEditGoal(g); e.target.value = '' }}>
            <option value="" disabled>Edit Goal…</option>
            {visibleGoals.map(g => <option key={g.goal_id} value={g.goal_id}>{g.goal_title}</option>)}
          </select>
          <select className="select select-sm select-auto" style={{ maxWidth: 200 }} defaultValue=""
            onChange={e => { const g = visibleGoals.find(g => g.goal_id === e.target.value); if (g) setDeleteTarget(g); e.target.value = '' }}>
            <option value="" disabled>Delete Goal…</option>
            {visibleGoals.map(g => <option key={g.goal_id} value={g.goal_id}>{g.goal_title}</option>)}
          </select>
        </>
      )}
      {mine && user.manager_id && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto', fontStyle: 'italic' }}>
          Achievements require approval before going live
        </span>
      )}
    </div>
  ) : null

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '0.8rem' }}>
        <button onClick={() => navigate(basePath)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: P.blue, fontWeight: 600, padding: 0, fontSize: '0.8rem' }}>
          <ChevronLeft size={14} /> {QUARTER_LABELS[q]}
        </button>
        <span style={{ color: 'var(--text-4)' }}>›</span>
        <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{MONTH_NAMES[m]} {yr}{viewerEmp ? ` — ${viewerEmp.name}` : ''}</span>
      </div>

      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{QUARTER_LABELS[q]} · {yr}</div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px' }}>{MONTH_NAMES[m]} Goal Sheet</h1>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
              {viewerEmp ? `${viewerEmp.name} · ${viewerEmp.department || viewerEmp.role}` : `${user.name} · ${user.designation || user.role}`}
            </div>
            {/* Week count badge */}
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '3px 12px' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {weekCount} weeks · {monthBounds.firstDay} to {monthBounds.lastDay}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {(mine || canModify) && (
              <button className="btn btn-sm" onClick={() => setShowCreate(true)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Plus size={14} /> New Goal
              </button>
            )}
            <button className="btn btn-sm" onClick={() => goalsToCSV(visibleGoals, allUsers)} style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Download size={14} /> Export
            </button>
            <button className="btn btn-icon" onClick={() => refetch()} title="Refresh" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', width: 34, height: 34 }}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {viewerEmp && viewerEmp.is_active === false && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️ <strong>{viewerEmp.name}</strong> left the organisation{viewerEmp.exit_date ? ` on ${viewerEmp.exit_date}` : ''}. Goals are read-only.</span>
        </div>
      )}
      {pendingCount > 0 && (
        <div className="alert alert-warning mb-4">
          {pendingCount} goal{pendingCount !== 1 ? 's' : ''} pending approval — not shown below
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 96, borderRadius: 'var(--r-xl)' }} className="skeleton" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          <KpiCard label="Total Goals"        value={visibleGoals.length}             color={P.indigo} icon={Target}      sub={`${summary.completed} completed`}     onClick={() => setActiveTab('monthly')} />
          <KpiCard label="Completed"          value={summary.completed}                color={P.green}  icon={CheckCircle} trend={summary.completed > 0 ? 'up' : 'neutral'} trendVal={visibleGoals.length ? `${(summary.completed / visibleGoals.length * 100).toFixed(0)}% of total` : undefined} onClick={() => setActiveTab('monthly')} />
          <KpiCard label="Avg Progress"       value={`${summary.avgP.toFixed(1)}%`}    color={progressColor} icon={BarChart2} trend={summary.avgP >= 80 ? 'up' : summary.avgP >= 50 ? 'neutral' : 'down'} trendVal={summary.avgP >= 80 ? 'On track' : summary.avgP >= 50 ? 'Needs attention' : 'At risk'} onClick={() => setActiveTab('monthly')} />
          <KpiCard label="Target Achievement" value={`${summary.achRate.toFixed(1)}%`} color={summary.achRate >= 80 ? P.green : summary.achRate >= 50 ? P.amber : P.red} icon={Award} sub={`${summary.totalAch} of ${summary.totalTarget}${summary.textGoals > 0 ? ` · ${summary.textFilled}/${summary.textGoals} text` : ''}`} onClick={() => setActiveTab('monthly')} />
          <KpiCard label="Overdue"            value={summary.overdue}                  color={summary.overdue > 0 ? P.red : P.green} icon={AlertTriangle} trend={summary.overdue > 0 ? 'down' : 'up'} trendVal={summary.overdue > 0 ? `${summary.overdue} past deadline` : 'All on time'} onClick={() => setActiveTab('monthly')} />
        </div>
      )}

      {/* ── Dynamic Tabs — real calendar weeks ─────────────────── */}
      <div className="tabs-wrap mb-5">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            {t.sub && (
              <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 400, opacity: 0.7, marginTop: 1 }}>
                {t.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Monthly View */}
      {activeTab === 'monthly' && (
        isLoading ? <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
        : visibleGoals.length === 0 ? (
          <div className="card card-body">
            <EmptyState title="No goals yet"
              description={(mine || canModify) ? 'Click "+ New Goal" to create your first goal for this month' : 'No goals have been set for this period'}
              action={(mine || canModify) && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Create Goal</button>}
            />
          </div>
        ) : (
          <div className="card" style={{ overflow: 'visible' }}>
            <ActionsBar />
            <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%' }}>
              <GoalSheetTable goals={visibleGoals} canEdit={canModify} onEdit={setEditGoal} onDelete={setDeleteTarget} onUpdate={setUpdateTarget} canRate={canRate} onRate={handleRate} />
            </div>
          </div>
        )
      )}

      {/* Week Tabs — dynamic, real calendar dates */}
      {calendarWeeks.map(wk => {
        const tabKey = `week${wk.weekNum}`
        if (activeTab !== tabKey) return null

        const weekGoals = visibleGoals.filter(g =>
          g[`week${wk.weekNum}_target`] != null &&
          g[`week${wk.weekNum}_target`] !== 0 &&
          g[`week${wk.weekNum}_target`] !== ''
        )

        return (
          <div key={tabKey}>
            {/* Week header bar */}
            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: 'var(--r-xl)', padding: '16px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${P.blue}30`, border: `1.5px solid ${P.blue}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#93C5FD' }}>W{wk.weekNum}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{MONTH_NAMES[m]} {yr}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    Week {wk.weekNum} — {wk.label}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {(mine || canModify) && (
                  <button className="btn btn-sm" onClick={() => { setCreateWeekNum(wk.weekNum); setShowCreate(true) }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Plus size={14} /> New W{wk.weekNum} Goal
                  </button>
                )}
                {[
                  { label: 'Goals',   value: visibleGoals.length },
                  { label: 'Updated', value: visibleGoals.filter(g => g[`week${wk.weekNum}_achievement`] != null || g[`week${wk.weekNum}_achievement_text`]).length },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {weekGoals.length > 0 && <WeekSummaryStrip goals={weekGoals} weekNum={wk.weekNum} />}

            {isLoading
              ? <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
              : visibleGoals.length === 0
                ? <div className="card card-body"><EmptyState title="No goals" description="No goals found for this month" /></div>
                : (
                  <div className="card" style={{ overflow: 'visible' }}>
                    <ActionsBar />
                    <WeekGoalSheet
                      goals={weekGoals.length > 0 ? weekGoals : visibleGoals}
                      weekNum={wk.weekNum}
                      weekInfo={wk}
                      canEdit={canEdit}
                      canModify={canModify}
                      onUpdate={g => setUpdateTarget({ ...g, _lockedWeek: wk.weekNum })}
                      onEdit={setEditGoal}
                      onDelete={setDeleteTarget}
                    />
                  </div>
                )
            }

            {visibleGoals.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <FeedbackSection goals={visibleGoals} viewerUser={user} targetUserId={targetUserId} allUsers={allUsers} weekNum={wk.weekNum} />
              </div>
            )}
          </div>
        )
      })}

      {activeTab === 'monthly' && visibleGoals.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <FeedbackSection goals={visibleGoals} viewerUser={user} targetUserId={targetUserId} allUsers={allUsers} />
        </div>
      )}

      {/* Modals — pass year+month for real week calculation */}
      {showCreate && (
        <GoalFormModal
          title={createWeekNum ? `New Goal — Week ${createWeekNum} (${calendarWeeks[createWeekNum - 1]?.label || ''})` : `Create Goal — ${MONTH_NAMES[m]} ${yr}`}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setCreateWeekNum(null) }}
          loading={createGoal.isPending}
          lockedWeek={createWeekNum}
          year={yr}
          month={m}
        />
      )}
      {editGoal && (
        <GoalFormModal
          title="Edit Goal"
          defaultValues={editGoal}
          onSubmit={handleEdit}
          onClose={() => setEditGoal(null)}
          loading={updateGoal.isPending}
          year={yr}
          month={m}
        />
      )}
      {updateTarget && (
        <UpdateAchievementsModal
          goal={updateTarget}
          onSave={handleUpdate}
          onClose={() => setUpdateTarget(null)}
          loading={updateGoal.isPending}
          year={yr}
          month={m}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Goal"
          message={`Delete "${deleteTarget.goal_title}"? This cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteGoal.isPending}
        />
      )}
    </div>
  )
}