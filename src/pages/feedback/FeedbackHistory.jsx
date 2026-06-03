import React, { useState, useMemo } from 'react'
import { useAuthStore } from '../../store'
import { useAllUsers, useAllFeedback, useUserFeedback, useCreateFeedback } from '../../hooks/useData'
import { useAllGoals } from '../../hooks/useData'
import { EmptyState, StatusBadge, SearchInput, Spinner } from '../../components/ui/index.jsx'
import { timeAgo } from '../../lib/utils'
import { Plus, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'

function AddFeedbackModal({ allGoals, allUsers, feedbackType, onSubmit, onClose, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { rating: 3, goal_id: '', comment: '' } })
  const rating = parseInt(watch('rating') || 3)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">➕ Add Feedback</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-group mb-4">
              <label className="form-label">Select Goal <span className="required">*</span></label>
              <select className="select" {...register('goal_id', { required: 'Please select a goal' })}>
                <option value="">— Select a goal —</option>
                {allGoals.map(g => {
                  const owner = allUsers.find(u => u.id === g.user_id)
                  return <option key={g.goal_id} value={g.goal_id}>{owner?.name} — {g.goal_title}</option>
                })}
              </select>
              {errors.goal_id && <span className="form-error">{errors.goal_id.message}</span>}
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(r => (
                  <label key={r} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--r)',
                    background: rating === r ? 'var(--primary-light)' : 'var(--surface-2)',
                    border: `1.5px solid ${rating === r ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <input type="radio" value={r} {...register('rating')} style={{ display: 'none' }} />
                    <span style={{ fontSize: '1.1rem' }}>{'⭐'.repeat(r)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Comment <span className="required">*</span></label>
              <textarea className="textarea" placeholder="Write your feedback…"
                {...register('comment', { required: 'Comment is required' })} />
              {errors.comment && <span className="form-error">{errors.comment.message}</span>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={14} /> : '📤 Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FeedbackHistory() {
  const user = useAuthStore(s => s.user)
  const role = user.role
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const { data: allUsers = [] } = useAllUsers()
  const { data: allGoals = [] } = useAllGoals()
  const { data: allFeedback = [] } = useAllFeedback()
  const { data: myFeedback = [] } = useUserFeedback(user.id)
  const createFeedback = useCreateFeedback()

  const feedbackType = { CMD: 'CMD Feedback', VP: 'VP Feedback', Manager: 'Manager Feedback' }[role]

  // Determine which feedback to show
  const rawFeedback = role === 'HR' ? allFeedback : myFeedback

  const displayFeedback = useMemo(() => {
    let list = [...rawFeedback].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (filter !== 'All') list = list.filter(f => f.feedback_type === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => {
        const owner = allUsers.find(u => u.id === f.user_id)
        const goal = allGoals.find(g => g.goal_id === f.goal_id)
        return (
          owner?.name?.toLowerCase().includes(q) ||
          goal?.goal_title?.toLowerCase().includes(q) ||
          f.comment?.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [rawFeedback, filter, search, allUsers, allGoals])

  const handleSubmit = async (data) => {
    const goal = allGoals.find(g => g.goal_id === data.goal_id)
    if (!goal) return
    await createFeedback.mutateAsync({
      goal_id: data.goal_id,
      user_id: goal.user_id,
      feedback_by: user.id,
      feedback_type: feedbackType,
      rating: parseInt(data.rating),
      comment: data.comment,
      level: 'general',
    })
    setShowAdd(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>💬 Feedback History</h1>
            <p className="sub">Review and manage performance feedback</p>
          </div>
          {feedbackType && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add Feedback
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search feedback…" />
        <select className="select select-sm" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="All">All Types</option>
          <option value="Manager Feedback">Manager Feedback</option>
          <option value="VP Feedback">VP Feedback</option>
          <option value="CMD Feedback">CMD Feedback</option>
        </select>
        <span className="text-sm text-muted">{displayFeedback.length} entries</span>
      </div>

      {/* Feedback list */}
      {displayFeedback.length === 0
        ? (
          <div className="card card-body">
            <EmptyState
              icon="💬"
              title="No feedback found"
              description={feedbackType ? 'Use the Add Feedback button to submit feedback on a goal' : 'Feedback from your manager will appear here'}
            />
          </div>
        )
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayFeedback.map(fb => {
              const giver = allUsers.find(u => u.id === fb.feedback_by)
              const owner = allUsers.find(u => u.id === fb.user_id)
              const goal = allGoals.find(g => g.goal_id === fb.goal_id)
              return (
                <div key={fb.feedback_id} className="card">
                  <div className="card-header">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="card-title" style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal?.goal_title || 'Goal'}
                      </div>
                      <div className="card-subtitle">
                        For: <strong>{owner?.name || '—'}</strong>
                        &nbsp;·&nbsp;
                        By: <strong>{giver?.name || '—'}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge badge-blue">{fb.feedback_type}</span>
                      <div className="text-sm text-muted mt-1">{timeAgo(fb.created_at)}</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ paddingTop: 10 }}>
                    <div className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#F59E0B', fontSize: '1rem', letterSpacing: 2 }}>
                        {'★'.repeat(fb.rating || 0)}{'☆'.repeat(5 - (fb.rating || 0))}
                      </span>
                      <span className="text-sm text-muted">({fb.rating}/5)</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.65 }}>{fb.comment}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {showAdd && (
        <AddFeedbackModal
          allGoals={allGoals}
          allUsers={allUsers}
          feedbackType={feedbackType}
          onSubmit={handleSubmit}
          onClose={() => setShowAdd(false)}
          loading={createFeedback.isPending}
        />
      )}
    </div>
  )
}

