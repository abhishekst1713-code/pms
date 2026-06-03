import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { calcProgress } from '../../lib/utils'
import { getMonthWeeks, getMonthBounds } from '../../lib/utils'
import { GOAL_STATUSES } from '../../lib/constants'
import { ProgressBar, Spinner } from '../ui/index.jsx'

// ── Helpers ───────────────────────────────────────────────────
export function isTextTarget(val) {
  if (val == null || val === '') return false
  const n = parseFloat(String(val))
  return isNaN(n) || !isFinite(n)
}

const TEXT_STATUSES = [
  { label: 'Completed',   value: 'Completed',   progress: 100, color: '#059669', bg: '#D1FAE5' },
  { label: 'In Progress', value: 'In Progress',  progress: 50,  color: '#2563EB', bg: '#DBEAFE' },
  { label: 'On Hold',     value: 'On Hold',      progress: 25,  color: '#D97706', bg: '#FEF3C7' },
  { label: 'Cancelled',   value: 'Cancelled',    progress: 0,   color: '#DC2626', bg: '#FEE2E2' },
]

function statusToProgress(status) {
  return TEXT_STATUSES.find(s => s.value === status)?.progress ?? 0
}

function progressColor(p) {
  return p >= 100 ? '#059669' : p >= 60 ? '#D97706' : p > 0 ? '#DC2626' : '#94A3B8'
}

/* ════════════════════════════════════════
   CREATE / EDIT GOAL MODAL
   — auto-fills start/end dates from year+month if left blank
   — shows 4 or 5 week targets based on real calendar
════════════════════════════════════════ */
export function GoalFormModal({
  title,
  defaultValues,
  onSubmit,
  onClose,
  loading,
  lockedWeek = null,
  // Pass year + month so we can compute real weeks & auto-fill dates
  year,
  month,
}) {
  // Compute real calendar weeks for this month
  const weeks      = year && month ? getMonthWeeks(year, month) : null
  const weekCount  = weeks ? weeks.length : 4  // fallback to 4

  // Auto-fill dates: first and last day of month
  const bounds = year && month ? getMonthBounds(year, month) : null

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: defaultValues || {
      goal_title: '', department: '', kpi: '', monthly_target: '',
      goal_description: '',
      start_date: bounds?.firstDay || '',
      end_date:   bounds?.lastDay  || '',
      week1_target: '', week2_target: '', week3_target: '',
      week4_target: '', week5_target: '',
      status: 'Active',
    },
  })

  // When modal opens for a NEW goal, pre-fill the date fields
  useEffect(() => {
    if (!defaultValues && bounds) {
      setValue('start_date', bounds.firstDay)
      setValue('end_date',   bounds.lastDay)
    }
  }, [])

  const monthlyTargetVal = watch('monthly_target')
  const isText           = isTextTarget(monthlyTargetVal)
  const monthly          = parseFloat(monthlyTargetVal) || 0

  const autoFill = () => {
    if (monthly > 0) {
      const q = +(monthly / weekCount).toFixed(2)
      for (let w = 1; w <= weekCount; w++) setValue(`week${w}_target`, q)
    }
  }

  // Week numbers to render — if lockedWeek, only that one
  const weekNums = lockedWeek
    ? [lockedWeek]
    : Array.from({ length: weekCount }, (_, i) => i + 1)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="grid-2 gap-4">

              <div className="form-group">
                <label className="form-label">Goal Title <span className="required">*</span></label>
                <input className={`input ${errors.goal_title ? 'error' : ''}`} placeholder="e.g. Q1 Sales Revenue"
                  {...register('goal_title', { required: 'Required' })} />
                {errors.goal_title && <span className="form-error">{errors.goal_title.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Department <span className="required">*</span></label>
                <input className={`input ${errors.department ? 'error' : ''}`} placeholder="e.g. SALES"
                  {...register('department', { required: 'Required' })} />
                {errors.department && <span className="form-error">{errors.department.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">KPI <span className="required">*</span></label>
                <input className={`input ${errors.kpi ? 'error' : ''}`} placeholder="e.g. Revenue (₹ Lakhs)"
                  {...register('kpi', { required: 'Required' })} />
                {errors.kpi && <span className="form-error">{errors.kpi.message}</span>}
              </div>

              {/* Monthly target */}
              <div className="form-group">
                <label className="form-label">Monthly Target <span className="required">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. 100000  or  'Launch product'"
                  {...register('monthly_target', { required: 'Required' })}
                />
                {monthlyTargetVal && (
                  <div style={{ fontSize: '0.7rem', marginTop: 4, fontWeight: 600,
                    color: isText ? '#D97706' : '#059669' }}>
                    {isText
                      ? 'Text target — achievement tracked by status'
                      : 'Numeric target — achievement tracked with progress %'}
                  </div>
                )}
              </div>

              {/* Dates — auto-filled, user can override */}
              <div className="form-group">
                <label className="form-label">
                  Start Date
                  {bounds && <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>auto-filled</span>}
                </label>
                <input className="input" type="date" {...register('start_date')} />
              </div>

              <div className="form-group">
                <label className="form-label">
                  End Date
                  {bounds && <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>auto-filled</span>}
                </label>
                <input className="input" type="date" {...register('end_date')} />
              </div>

              {defaultValues?.status !== undefined && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" {...register('status')}>
                    {GOAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="textarea" placeholder="Brief goal description…" {...register('goal_description')} />
              </div>

              {/* Weekly targets — dynamic 4 or 5 */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Weekly Targets
                    {weeks && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                        {weekCount} weeks this month
                      </span>
                    )}
                  </label>
                  {!lockedWeek && !isText && (
                    <button type="button" className="btn btn-xs btn-secondary" onClick={autoFill}>
                      Auto-divide equally
                    </button>
                  )}
                </div>

                {isText && (
                  <div style={{ fontSize: '0.78rem', color: '#D97706', background: '#FEF3C7', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>
                    Text target — weekly targets are optional milestone descriptions
                  </div>
                )}

                {/* Week columns — 4 or 5 */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekNums.length}, 1fr)`, gap: 12 }}>
                  {weekNums.map(w => {
                    const weekInfo = weeks?.[w - 1]
                    return (
                      <div key={w} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          Week {w}
                          {weekInfo && (
                            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-3)', marginTop: 1 }}>
                              {weekInfo.label}
                            </div>
                          )}
                        </label>
                        <input
                          className="input input-sm"
                          placeholder={isText ? 'e.g. Research done' : '0'}
                          {...register(`week${w}_target`)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={14} /> : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   UPDATE ACHIEVEMENTS MODAL
   — dynamic weeks (4 or 5)
   — rating removed
════════════════════════════════════════ */
export function UpdateAchievementsModal({ goal, onSave, onClose, loading, year, month }) {
  const lockedWeek = goal._lockedWeek || null
  const isText     = isTextTarget(goal.monthly_target)

  // Real calendar weeks
  const weeks     = year && month ? getMonthWeeks(year, month) : null
  const weekCount = weeks ? weeks.length : 4
  const weekNums  = lockedWeek ? [lockedWeek] : Array.from({ length: weekCount }, (_, i) => i + 1)

  // ── Numeric state ─────────────────────────────────────────
  const initNum = {}
  for (let w = 1; w <= 5; w++) initNum[`w${w}`] = goal[`week${w}_achievement`] ?? ''
  const [numVals, setNumVals] = useState(initNum)

  // ── Text state ────────────────────────────────────────────
  const initText = { monthly: goal.monthly_achievement_text || '', customPct: '', useCustomPct: false }
  for (let w = 1; w <= 5; w++) initText[`w${w}`] = goal[`week${w}_achievement_text`] || ''
  const [textVals, setTextVals] = useState(initText)

  const [remarks,       setRemarks]       = useState(goal.remarks || '')
  const [existingFiles, setExistingFiles] = useState(goal.file_urls || [])
  const [newFiles,      setNewFiles]      = useState([])
  const [uploading,     setUploading]     = useState(false)

  const handleFileSelect  = e => { setNewFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }
  const removeNewFile     = idx => setNewFiles(prev => prev.filter((_, i) => i !== idx))
  const removeExistingFile = idx => setExistingFiles(prev => prev.filter((_, i) => i !== idx))

  // ── Numeric totals ────────────────────────────────────────
  const numTotal    = weekNums.reduce((a, w) => a + (parseFloat(numVals[`w${w}`]) || 0), 0)
  const numProgress = calcProgress(numTotal, goal.monthly_target)

  // ── Text progress ─────────────────────────────────────────
  const textProgress = (() => {
    if (textVals.useCustomPct) {
      const p = parseFloat(textVals.customPct)
      return isNaN(p) ? 0 : Math.min(Math.max(p, 0), 100)
    }
    if (textVals.monthly) return statusToProgress(textVals.monthly)
    const filled = weekNums.map(w => textVals[`w${w}`]).filter(Boolean)
    if (!filled.length) return 0
    return filled.reduce((a, s) => a + statusToProgress(s), 0) / filled.length
  })()

  // ── Save handlers ─────────────────────────────────────────
  async function uploadFiles() {
    if (!newFiles.length) return []
    const { uploadGoalFile } = await import('../../lib/api')
    const uploaded = []
    for (const file of newFiles) uploaded.push(await uploadGoalFile(goal.goal_id, file))
    return uploaded
  }

  const handleSaveNumeric = async () => {
    setUploading(true)
    let uploadedFiles = [], uploadError = null
    try { uploadedFiles = await uploadFiles() }
    catch (e) { uploadError = e.message; console.error(e) }
    setUploading(false)
    if (uploadError) alert('File upload failed: ' + uploadError)

    const updates = { monthly_achievement: numTotal > 0 ? numTotal : null, remarks: remarks || null, file_urls: [...existingFiles, ...uploadedFiles], status: numTotal >= goal.monthly_target ? 'Completed' : goal.status }
    for (let w = 1; w <= 5; w++) {
      updates[`week${w}_achievement`] = numVals[`w${w}`] === '' ? null : parseFloat(numVals[`w${w}`])
    }
    onSave(updates)
  }

  const handleSaveText = async () => {
    setUploading(true)
    let uploadedFiles = [], uploadError = null
    try { uploadedFiles = await uploadFiles() }
    catch (e) { uploadError = e.message; console.error(e) }
    setUploading(false)
    if (uploadError) alert('File upload failed: ' + uploadError)

    const pct = Math.round(textProgress)
    const updates = {
      monthly_achievement_text: textVals.monthly || null,
      monthly_achievement:      pct > 0 ? pct : null,
      status:    textVals.monthly === 'Completed' || pct === 100 ? 'Completed' : goal.status,
      remarks:   remarks || null,
      file_urls: [...existingFiles, ...uploadedFiles],
    }
    for (let w = 1; w <= 5; w++) {
      updates[`week${w}_achievement_text`] = textVals[`w${w}`] || null
      updates[`week${w}_achievement`]      = textVals[`w${w}`] ? statusToProgress(textVals[`w${w}`]) : null
    }
    onSave(updates)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Update Achievements</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Goal info */}
          <div className="alert alert-info mb-4">
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{goal.goal_title}</div>
            <div style={{ fontSize: '0.82rem' }}>
              Target: <strong>{goal.monthly_target}</strong> · KPI: {goal.kpi}
              {isText && (
                <span style={{ marginLeft: 8, background: '#FEF3C7', color: '#D97706', padding: '1px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
                  Text Target
                </span>
              )}
            </div>
          </div>

          {/* ══════ NUMERIC MODE ══════ */}
          {!isText && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(weekNums.length, 3)}, 1fr)`, gap: 12, marginBottom: 16 }}>
                {weekNums.map(w => {
                  const weekInfo = weeks?.[w - 1]
                  return (
                    <div key={w} className="form-group">
                      <label className="form-label">
                        Week {w} Achievement
                        {weekInfo && <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 400 }}>{weekInfo.label}</div>}
                        {goal[`week${w}_target`] > 0 && (
                          <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: '0.68rem', marginLeft: 4 }}>
                            (target: {goal[`week${w}_target`]})
                          </span>
                        )}
                      </label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder="Leave blank for —"
                        value={numVals[`w${w}`]}
                        onChange={e => setNumVals(v => ({ ...v, [`w${w}`]: e.target.value }))}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Live progress */}
              <div className="card card-body mb-4" style={{ background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>Monthly Achievement: {numTotal.toFixed(2)}</span>
                  <span style={{ fontWeight: 700, color: progressColor(numProgress) }}>{numProgress.toFixed(1)}%</span>
                </div>
                <ProgressBar value={numProgress} size="h8" />
                {numTotal > 0 && numTotal >= goal.monthly_target && (
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: 6 }}>
                    Goal will be marked Completed
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════ TEXT MODE ══════ */}
          {isText && (
            <>
              {/* Overall monthly status */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Overall Monthly Status</label>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => setTextVals(v => ({ ...v, useCustomPct: !v.useCustomPct, customPct: '' }))}
                  >
                    {textVals.useCustomPct ? 'Use Status Cards' : 'Enter % Manually'}
                  </button>
                </div>

                {textVals.useCustomPct ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0 – 100"
                      value={textVals.customPct}
                      onChange={e => setTextVals(v => ({ ...v, customPct: e.target.value }))}
                      style={{ maxWidth: 140 }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>%</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {TEXT_STATUSES.map(s => {
                      const selected = textVals.monthly === s.value
                      return (
                        <div
                          key={s.value}
                          onClick={() => setTextVals(v => ({ ...v, monthly: v.monthly === s.value ? '' : s.value }))}
                          style={{
                            padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                            border: selected ? `2px solid ${s.color}` : '2px solid var(--border)',
                            background: selected ? s.bg : 'var(--surface-2)',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: selected ? s.color : 'var(--text-1)' }}>{s.label}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{s.progress}% progress</div>
                          </div>
                          {selected && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Per-week status — only show when not locked to a single week */}
              {weekNums.length > 1 && (
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ marginBottom: 8 }}>Weekly Status (optional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(weekNums.length, 3)}, 1fr)`, gap: 12 }}>
                    {weekNums.map(w => {
                      const weekInfo = weeks?.[w - 1]
                      return (
                        <div key={w} className="form-group">
                          <label className="form-label">
                            Week {w}
                            {weekInfo && <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 400 }}>{weekInfo.label}</div>}
                            {goal[`week${w}_target`] && (
                              <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.68rem', marginLeft: 4 }}>
                                ({goal[`week${w}_target`]})
                              </span>
                            )}
                          </label>
                          <select
                            className="select select-sm"
                            value={textVals[`w${w}`]}
                            onChange={e => setTextVals(v => ({ ...v, [`w${w}`]: e.target.value }))}
                          >
                            <option value="">— Not updated —</option>
                            {TEXT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Progress preview */}
              <div className="card card-body mb-4" style={{ background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                    {textVals.useCustomPct ? `Custom: ${textVals.customPct || 0}%` : textVals.monthly ? `Status: ${textVals.monthly}` : 'Progress (from weekly)'}
                  </span>
                  <span style={{ fontWeight: 700, color: progressColor(textProgress) }}>{textProgress.toFixed(0)}%</span>
                </div>
                <ProgressBar value={textProgress} size="h8" />
              </div>
            </>
          )}

          {/* ── Remarks ── */}
          <div className="form-group mb-4">
            <label className="form-label">Remarks</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Add any remarks or notes…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          {/* ── File Upload ── */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Supporting Files</label>
            {existingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {existingFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span>{f.type?.includes('pdf') ? '📄' : f.type?.includes('image') ? '🖼️' : '📎'}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </div>
                    <button onClick={() => removeExistingFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {newFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {newFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span>📎</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button onClick={() => removeNewFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-2)', border: '1.5px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-3)' }}>
              <span>📎</span> Click to attach files (PDF, Images, Excel, Word)
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={isText ? handleSaveText : handleSaveNumeric}
            disabled={loading || uploading}
          >
            {loading || uploading ? <Spinner size={14} /> : 'Save Achievements'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   FEEDBACK MODAL — rating removed
════════════════════════════════════════ */
export function FeedbackModal({ goal, feedbackType, onSubmit, onClose, loading, inline = false }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { comment: '' }
  })

  const FormBody = () => (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={inline ? '' : 'modal-body'} style={inline ? { padding: 0 } : {}}>
        {goal && (
          <div className="alert alert-info mb-4">
            <span>Goal: <strong>{goal.goal_title}</strong></span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Comment <span className="required">*</span></label>
          <textarea className="textarea" placeholder="Write your feedback…"
            {...register('comment', { required: 'Comment is required' })} />
          {errors.comment && <span className="form-error">{errors.comment.message}</span>}
        </div>
      </div>
      <div className={inline ? 'flex gap-3 mt-4' : 'modal-footer'}>
        {onClose && <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner size={14} /> : 'Submit Feedback'}
        </button>
      </div>
    </form>
  )

  if (inline) return <FormBody />

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Feedback</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <FormBody />
      </div>
    </div>
  )
}