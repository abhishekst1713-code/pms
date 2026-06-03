import React, { useState } from 'react'
import { useGoalFeedback, useCreateFeedback, useDeleteFeedback } from '../../hooks/useData'
import { FeedbackModal } from '../../components/modals/GoalModals'
import { EmptyState, ConfirmDialog } from '../../components/ui/index.jsx'
import { timeAgo, canGiveFeedbackTo } from '../../lib/utils'
import { createFeedbackReply, fetchFeedbackReplies, updateFeedback } from '../../lib/api'
import {
  MessageSquare, Star, ChevronUp,
  Send, CornerDownRight, Trash2, Edit2, Check, X
} from 'lucide-react'

const P = {
  blue: '#2563EB', green: '#059669', amber: '#D97706',
  red: '#DC2626', violet: '#7C3AED', indigo: '#6366F1',
}

const TYPE_STYLE = {
  'CMD Feedback':     { color: '#DC2626', bg: '#FEE2E2', border: '#DC2626' },
  'VP Feedback':      { color: '#7C3AED', bg: '#EDE9FE', border: '#7C3AED' },
  'HR Feedback':      { color: '#059669', bg: '#D1FAE5', border: '#059669' },
  'Manager Feedback': { color: '#2563EB', bg: '#EFF6FF', border: '#2563EB' },
}

function StarRating({ rating, max = 5, interactive = false, onChange }) {
  const [hover, setHover] = useState(null)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={interactive ? 18 : 14}
          fill={(hover ?? rating) > i ? P.amber : 'none'}
          color={(hover ?? rating) > i ? P.amber : 'var(--border)'}
          style={{ cursor: interactive ? 'pointer' : 'default', transition: 'all 0.1s' }}
          onMouseEnter={() => interactive && setHover(i + 1)}
          onMouseLeave={() => interactive && setHover(null)}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
      {!interactive && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', marginLeft: 4 }}>
          {rating}/{max}
        </span>
      )}
    </div>
  )
}

function FeedbackCard({ fb, viewerUser, canAct, onDelete, onEdited }) {
  const [showReply,      setShowReply]      = useState(false)
  const [replyText,      setReplyText]      = useState('')
  const [replies,        setReplies]        = useState(null)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [submitting,     setSubmitting]     = useState(false)

  // Inline edit state
  const [editing,      setEditing]      = useState(false)
  const [editRating,   setEditRating]   = useState(fb.rating || 0)
  const [editComment,  setEditComment]  = useState(fb.comment || '')
  const [savingEdit,   setSavingEdit]   = useState(false)

  const ts = TYPE_STYLE[fb.feedback_type] || { color: '#64748B', bg: 'var(--surface-2)', border: '#64748B' }

  const loadReplies = async () => {
    if (replies !== null) { setShowReply(v => !v); return }
    setLoadingReplies(true)
    const r = await fetchFeedbackReplies(fb.feedback_id)
    setReplies(r)
    setLoadingReplies(false)
    setShowReply(true)
  }

  const submitReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const r = await createFeedbackReply({
        feedback_id: fb.feedback_id, reply_by: viewerUser.id, reply_text: replyText.trim()
      })
      setReplies(prev => [...(prev || []), r])
      setReplyText('')
    } catch {}
    setSubmitting(false)
  }

  const saveEdit = async () => {
    if (!editComment.trim() || editRating < 1) return
    setSavingEdit(true)
    try {
      await updateFeedback(fb.feedback_id, { rating: editRating, comment: editComment.trim() })
      onEdited?.({ ...fb, rating: editRating, comment: editComment.trim() })
      setEditing(false)
    } catch (e) { console.error(e) }
    setSavingEdit(false)
  }

  const cancelEdit = () => {
    setEditRating(fb.rating || 0)
    setEditComment(fb.comment || '')
    setEditing(false)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${ts.border}`, borderRadius: 'var(--r-xl)',
      overflow: 'hidden', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Card header */}
      <div style={{ padding: '14px 18px 12px', background: ts.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, color: ts.color,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            background: 'rgba(255,255,255,0.6)', padding: '3px 10px',
            borderRadius: 99, border: `1px solid ${ts.border}30`,
          }}>
            {fb.feedback_type}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 500 }}>
              {timeAgo(fb.created_at)}
            </span>
            {/* Edit & Delete — only for the feedback giver or Admin/HR */}
            {canAct && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  title="Edit feedback"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer', color: P.blue, flexShrink: 0 }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => onDelete(fb)}
                  title="Delete feedback"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', color: P.red, flexShrink: 0 }}
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>
        {!editing && <StarRating rating={fb.rating || 0} />}
      </div>

      {/* Comment / inline edit */}
      <div style={{ padding: '14px 18px' }}>
        {editing ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>
                Rating
              </label>
              <StarRating rating={editRating} interactive onChange={setEditRating} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Comment
              </label>
              <textarea
                className="input"
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', padding: '10px 12px', fontSize: '0.875rem', lineHeight: 1.6 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm btn-primary"
                onClick={saveEdit}
                disabled={savingEdit || !editComment.trim() || editRating < 1}
              >
                <Check size={12} /> {savingEdit ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
            {fb.comment}
          </p>
        )}
      </div>

      {/* Replies */}
      {showReply && replies && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', background: 'var(--surface-2)' }}>
          {replies.length > 0 ? (
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {replies.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <CornerDownRight size={13} color="var(--text-4)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '9px 13px' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{r.reply_text}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 4, marginBottom: 0 }}>{timeAgo(r.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 10, marginTop: 0 }}>No replies yet.</p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input input-sm"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              onKeyDown={e => e.key === 'Enter' && submitReply()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm btn-primary" onClick={submitReply} disabled={submitting || !replyText.trim()} style={{ flexShrink: 0 }}>
              <Send size={12} /> Send
            </button>
          </div>
        </div>
      )}

      {/* Footer — reply toggle */}
      <div style={{ borderTop: showReply ? 'none' : '1px solid var(--border)', padding: '8px 18px' }}>
        <button onClick={loadReplies} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: ts.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {loadingReplies ? 'Loading…'
            : showReply
              ? <><ChevronUp size={13} /> Hide Replies</>
              : <><MessageSquare size={13} /> Reply</>
          }
          {replies && replies.length > 0 && !showReply && (
            <span style={{ background: ts.bg, color: ts.color, fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, border: `1px solid ${ts.border}30` }}>
              {replies.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Main Feedback Section ─────────────────────────────────────
export default function FeedbackSection({ goals, viewerUser, targetUserId, allUsers = [], weekNum = null }) {
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.goal_id || '')
  const [showModal,      setShowModal]      = useState(false)
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  // Local overrides for edited feedback (until refetch)
  const [editedMap,      setEditedMap]      = useState({})

  const createFeedback = useCreateFeedback()
  const deleteFeedback = useDeleteFeedback()
  const { data: feedbacks = [], refetch } = useGoalFeedback(selectedGoalId)

  const role         = viewerUser?.role
  const feedbackType = {
    CMD: 'CMD Feedback', VP: 'VP Feedback',
    HR: 'HR Feedback', Manager: 'Manager Feedback', Admin: 'HR Feedback',
  }[role]

  const canGiveFeedback = !!feedbackType && canGiveFeedbackTo(viewerUser, targetUserId, allUsers)

  // Can edit/delete: whoever gave the feedback, or Admin/HR
  const canActOnFeedback = (fb) =>
    fb.feedback_by === viewerUser.id || ['Admin', 'HR'].includes(viewerUser.role)

  const officialFeedbacks = feedbacks
    .filter(f => ['CMD Feedback', 'VP Feedback', 'HR Feedback', 'Manager Feedback'].includes(f.feedback_type))
    .filter(f => weekNum ? (f.week_num != null && parseInt(f.week_num) === parseInt(weekNum)) : true)
    .map(f => editedMap[f.feedback_id] ? { ...f, ...editedMap[f.feedback_id] } : f)

  const selectedGoal = goals.find(g => g.goal_id === selectedGoalId)

  const handleSubmit = async (data) => {
    await createFeedback.mutateAsync({
      goal_id: selectedGoalId, user_id: targetUserId,
      feedback_by: viewerUser.id, feedback_type: feedbackType,
      rating: 0, comment: data.comment,
      level: weekNum ? 'week' : 'month',
      week_num: weekNum || null,
    })
    setShowModal(false)
  }

  const handleDelete = async () => {
    await deleteFeedback.mutateAsync(deleteTarget.feedback_id)
    setDeleteTarget(null)
    refetch()
  }

  const handleEdited = (updated) => {
    setEditedMap(prev => ({ ...prev, [updated.feedback_id]: updated }))
  }

  const avgRating   = officialFeedbacks.length
    ? officialFeedbacks.reduce((a, f) => a + (f.rating || 0), 0) / officialFeedbacks.length : 0
  const ratingColor = avgRating >= 4 ? P.green : avgRating >= 3 ? P.amber : avgRating > 0 ? P.red : 'var(--text-4)'

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={15} color={P.blue} />
          </div>
          <div>
            <div className="card-title">Feedback</div>
            <div className="card-subtitle">Official feedback and replies</div>
          </div>
        </div>
        {canGiveFeedback && (
          <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
            <MessageSquare size={13} /> Add Feedback
          </button>
        )}
      </div>

      <div className="card-body">
        {/* Summary strip */}
        {officialFeedbacks.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Feedback', value: officialFeedbacks.length,    color: P.blue },
              { label: 'Avg Rating',     value: `${avgRating.toFixed(1)}/5`, color: ratingColor },
              { label: 'This Goal',      value: selectedGoal?.goal_title?.slice(0, 18) + (selectedGoal?.goal_title?.length > 18 ? '…' : '') || '—', color: P.indigo, small: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}>
                <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: s.small ? '0.82rem' : '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1.2, letterSpacing: s.small ? 0 : '-0.03em' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Goal selector */}
        <div className="form-group mb-5">
          <label className="form-label">Select Goal</label>
          <select className="select" value={selectedGoalId} onChange={e => setSelectedGoalId(e.target.value)}>
            {goals.map(g => <option key={g.goal_id} value={g.goal_id}>{g.goal_title}</option>)}
          </select>
        </div>

        {/* Section label — only show in week tabs, monthly uses group labels */}
        {weekNum && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Week {weekNum} Feedback ({officialFeedbacks.length})
            </span>
          </div>
        )}

        {/* Feedback list */}
        {officialFeedbacks.length === 0 ? (
          <EmptyState
            title="No feedback yet"
            description={canGiveFeedback
              ? 'Click "Add Feedback" to give your first feedback on this goal'
              : 'Official feedback from your assigned supervisor will appear here'}
          />
        ) : weekNum ? (
          // Week tab — show directly
          officialFeedbacks.map(fb => (
            <FeedbackCard
              key={fb.feedback_id}
              fb={fb}
              viewerUser={viewerUser}
              canAct={canActOnFeedback(fb)}
              onDelete={setDeleteTarget}
              onEdited={handleEdited}
            />
          ))
        ) : (
          // Monthly view — group by week_num
          (() => {
            const groups = {
              null: { label: 'Monthly Feedback', items: [] },
              1:    { label: 'Week 1 Feedback',  items: [] },
              2:    { label: 'Week 2 Feedback',  items: [] },
              3:    { label: 'Week 3 Feedback',  items: [] },
              4:    { label: 'Week 4 Feedback',  items: [] },
            }
            officialFeedbacks.forEach(fb => {
              const key = fb.week_num ?? null
              if (groups[key]) groups[key].items.push(fb)
              else groups[null].items.push(fb)
            })
            return Object.entries(groups).map(([key, group]) => {
              if (group.items.length === 0) return null
              return (
                <div key={key} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 3, height: 12, borderRadius: 2, background: key === 'null' || key === null ? P.blue : P.violet }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      {group.label} ({group.items.length})
                    </span>
                  </div>
                  {group.items.map(fb => (
                    <FeedbackCard
                      key={fb.feedback_id}
                      fb={fb}
                      viewerUser={viewerUser}
                      canAct={canActOnFeedback(fb)}
                      onDelete={setDeleteTarget}
                      onEdited={handleEdited}
                    />
                  ))}
                </div>
              )
            })
          })()
        )}
      </div>

      {/* Add feedback modal */}
      {showModal && (
        <FeedbackModal
          goal={selectedGoal}
          feedbackType={feedbackType}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          loading={createFeedback.isPending}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Feedback"
          message="Delete this feedback entry? This cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteFeedback.isPending}
        />
      )}
    </div>
  )
}