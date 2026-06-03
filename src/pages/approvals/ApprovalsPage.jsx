import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../../store'
import {
  useAllUsers, useAllGoals,
  useApproveGoal, useRejectGoal, useUpdateGoal
} from '../../hooks/useData'
import { MONTH_NAMES } from '../../lib/constants'
import { StatusBadge, EmptyState, Spinner } from '../../components/ui/index.jsx'
import {
  CheckCircle, XCircle, CheckSquare, BarChart2,
  Clock, User, Target, Calendar, AlertTriangle
} from 'lucide-react'

// ── Palette ───────────────────────────────────────────────────
const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  indigo: '#6366F1',
}

const AVATAR_COLORS = [P.blue, '#7C3AED', P.green, '#0891B2', P.amber, P.indigo]
function avatarColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

// ── Section label ─────────────────────────────────────────────
function SLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{children}</span>
    </div>
  )
}

// ── Goal Approval Card ────────────────────────────────────────
function GoalApprovalCard({ goal, allUsers, onApprove, onReject, approving, rejecting }) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason,         setReason]         = useState('')
  const emp = allUsers.find(u => u.id === goal.user_id)
  const ac  = emp ? avatarColor(emp.name) : P.blue

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${P.blue}`,
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      marginBottom: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Card header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {/* Employee avatar */}
          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${ac}, ${ac}99)`, color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${ac}35` }}>
            {emp?.name?.[0] || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.goal_title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <User size={11} /> {emp?.name || '—'}
                {emp?.is_active === false && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                )}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <Calendar size={11} /> {MONTH_NAMES[goal.month]} {goal.year} · Q{goal.quarter}
              </span>
              {goal.department && (
                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{goal.department}</span>
              )}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: P.amber, background: '#FEF3C7', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
          Pending
        </span>
      </div>

      {/* Goal details */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'KPI',            value: goal.kpi || '—'           },
            { label: 'Monthly Target', value: goal.monthly_target,       bold: true },
            { label: 'Period',         value: `${MONTH_NAMES[goal.month]} ${goal.year}` },
          ].map(f => (
            <div key={f.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: f.bold ? 800 : 500, color: f.bold ? P.blue : 'var(--text)' }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Weekly targets */}
        <SLabel>Weekly Targets</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(w => {
            const wt = goal[`week${w}_target`]
            const isText = wt && isNaN(parseFloat(wt))
            return (
              <div key={w} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Week {w}</div>
                {isText
                  ? <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}>{wt}</div>
                  : <div style={{ fontSize: '1.1rem', fontWeight: 800, color: P.indigo }}>{wt || <span style={{ color: 'var(--text-4)', fontSize: '0.8rem' }}>—</span>}</div>
                }
              </div>
            )
          })}
        </div>

        {goal.goal_description && (
          <div style={{ background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: P.indigo, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{goal.goal_description}</p>
          </div>
        )}

        {/* Reject form */}
        {showRejectForm ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: P.red, marginBottom: 8 }}>Rejection Reason <span style={{ color: P.red }}>*</span></div>
            <textarea
              className="textarea"
              placeholder="Please provide a clear reason for rejection…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ minHeight: 72, marginBottom: 10, background: '#fff' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { if (reason.trim()) onReject(goal.goal_id, reason) }}
                disabled={!reason.trim() || rejecting}
              >
                {rejecting ? <Spinner size={13} /> : <><XCircle size={13} /> Confirm Reject</>}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRejectForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              className="btn btn-success btn-sm"
              onClick={() => onApprove(goal.goal_id)}
              disabled={approving}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {approving ? <Spinner size={13} /> : <><CheckCircle size={13} /> Approve Goal</>}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowRejectForm(true)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <XCircle size={13} /> Reject Goal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Achievement Approval Card ─────────────────────────────────
function AchievementApprovalCard({ goal, allUsers, onApprove, onReject }) {
  const [showReject, setShowReject] = useState(false)
  const [reason,     setReason]     = useState('')
  const emp = allUsers.find(u => u.id === goal.user_id)
  const ac  = emp ? avatarColor(emp.name) : P.amber

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${P.amber}`,
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      marginBottom: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Card header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${ac}, ${ac}99)`, color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${ac}35` }}>
            {emp?.name?.[0] || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.goal_title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <User size={11} /> {emp?.name || '—'}
                {emp?.is_active === false && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                )}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <Calendar size={11} /> {MONTH_NAMES[goal.month]} {goal.year}
              </span>
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: P.amber, background: '#FEF3C7', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
          Achievement Pending
        </span>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Target info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, marginBottom: 16 }}>
          <Target size={14} color={P.blue} />
          <span style={{ fontSize: '0.84rem', color: P.blue, fontWeight: 600 }}>
            Monthly Target: <strong>{goal.monthly_target}</strong>
          </span>
        </div>

        {/* Weekly achievements */}
        <SLabel>Weekly Achievements (Submitted)</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(w => {
            const val = goal[`week${w}_achievement_pending`]
            return (
              <div key={w} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Week {w}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: val != null ? P.amber : 'var(--text-4)' }}>
                  {val ?? <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Monthly total */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 16 }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-2)' }}>Monthly Total (Pending)</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: P.amber, letterSpacing: '-0.03em' }}>
            {goal.monthly_achievement_pending ?? '—'}
          </span>
        </div>

        {/* Actions */}
        {showReject ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: P.red, marginBottom: 8 }}>Rejection Reason</div>
            <textarea
              className="textarea"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ minHeight: 60, marginBottom: 10, background: '#fff' }}
              placeholder="Explain why the achievement is being rejected…"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger btn-sm" onClick={() => onReject(goal.goal_id, reason)} disabled={!reason.trim()}>
                <XCircle size={13} /> Confirm Reject
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowReject(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-success btn-sm" onClick={() => onApprove(goal.goal_id)} style={{ flex: 1, justifyContent: 'center' }}>
              <CheckCircle size={13} /> Approve Achievements
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowReject(true)} style={{ flex: 1, justifyContent: 'center' }}>
              <XCircle size={13} /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ApprovalsPage() {
  const user       = useAuthStore(s => s.user)
  const [activeTab, setActiveTab] = useState('goals')

  const { data: allUsers = [] } = useAllUsers()
  const { data: allGoals = [] } = useAllGoals()
  const approveGoal = useApproveGoal()
  const rejectGoal  = useRejectGoal()
  const updateGoal  = useUpdateGoal()

  const teamIds = useMemo(() => {
    return new Set(allUsers.filter(u => u.manager_id === user.id).map(u => u.id))
  }, [allUsers, user])

  const pendingGoals        = allGoals.filter(g => g.approval_status === 'pending' && teamIds.has(g.user_id))
  const pendingAchievements = allGoals.filter(g => g.achievement_approval_status === 'pending' && teamIds.has(g.user_id))

  const handleApproveGoal = (goalId) =>
    approveGoal.mutate({ goalId, approverId: user.id, approverName: user.name })
  const handleRejectGoal = (goalId, reason) =>
    rejectGoal.mutate({ goalId, reason, rejecterId: user.id })

  const handleApproveAchievement = (goalId) => {
    const goal = allGoals.find(g => g.goal_id === goalId)
    if (!goal) return
    updateGoal.mutate({
      goalId,
      updates: {
        week1_achievement: goal.week1_achievement_pending,
        week2_achievement: goal.week2_achievement_pending,
        week3_achievement: goal.week3_achievement_pending,
        week4_achievement: goal.week4_achievement_pending,
        monthly_achievement: goal.monthly_achievement_pending,
        week1_rating: goal.week1_rating_pending,
        week2_rating: goal.week2_rating_pending,
        week3_rating: goal.week3_rating_pending,
        week4_rating: goal.week4_rating_pending,
        achievement_approval_status:  'approved',
        achievement_approved_by:      user.id,
        achievement_approved_at:      new Date().toISOString(),
      },
    })
  }
  const handleRejectAchievement = (goalId, reason) =>
    updateGoal.mutate({
      goalId,
      updates: {
        achievement_approval_status:    'rejected',
        achievement_rejection_reason:   reason,
        achievement_rejected_by:        user.id,
      },
    })

  const TABS = [
    { key: 'goals',        label: 'Goal Approvals',        icon: CheckSquare, count: pendingGoals.length,        countColor: P.red   },
    { key: 'achievements', label: 'Achievement Approvals', icon: BarChart2,   count: pendingAchievements.length,  countColor: P.amber },
  ]

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
            {user.role} · Review & Approve
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Approval Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>
            Review and approve pending goals and achievement submissions
          </p>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        borderRadius: 'var(--r-xl)', padding: '16px 24px', marginBottom: 20,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
      }}>
        {[
          { label: 'Goal Approvals',        value: pendingGoals.length,        icon: CheckSquare, color: pendingGoals.length > 0 ? '#FCA5A5' : '#6EE7B7' },
          { label: 'Achievement Approvals', value: pendingAchievements.length, icon: BarChart2,   color: pendingAchievements.length > 0 ? '#FCD34D' : '#6EE7B7' },
          { label: 'Total Pending',         value: pendingGoals.length + pendingAchievements.length, icon: Clock, color: (pendingGoals.length + pendingAchievements.length) > 0 ? '#FCA5A5' : '#6EE7B7' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ padding: '0 20px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <s.icon size={13} color={s.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs-wrap mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <t.icon size={13} />
            {t.label}
            {t.count > 0 && (
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', background: t.countColor, padding: '1px 7px', borderRadius: 99, marginLeft: 2 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Goal Approvals ── */}
      {activeTab === 'goals' && (
        pendingGoals.length === 0 ? (
          <div className="card card-body">
            <EmptyState
              title="No pending goal approvals"
              description="All submitted goals have been reviewed. New submissions will appear here."
            />
          </div>
        ) : (
          <>
            <SLabel>{pendingGoals.length} Goal{pendingGoals.length !== 1 ? 's' : ''} Awaiting Approval</SLabel>
            {pendingGoals.map(g => (
              <GoalApprovalCard
                key={g.goal_id}
                goal={g}
                allUsers={allUsers}
                onApprove={handleApproveGoal}
                onReject={handleRejectGoal}
                approving={approveGoal.isPending}
                rejecting={rejectGoal.isPending}
              />
            ))}
          </>
        )
      )}

      {/* ── Achievement Approvals ── */}
      {activeTab === 'achievements' && (
        pendingAchievements.length === 0 ? (
          <div className="card card-body">
            <EmptyState
              title="No pending achievement approvals"
              description="Submitted achievements will appear here for your review."
            />
          </div>
        ) : (
          <>
            <SLabel>{pendingAchievements.length} Achievement{pendingAchievements.length !== 1 ? 's' : ''} Awaiting Approval</SLabel>
            {pendingAchievements.map(g => (
              <AchievementApprovalCard
                key={g.goal_id}
                goal={g}
                allUsers={allUsers}
                onApprove={handleApproveAchievement}
                onReject={handleRejectAchievement}
              />
            ))}
          </>
        )
      )}
    </div>
  )
}