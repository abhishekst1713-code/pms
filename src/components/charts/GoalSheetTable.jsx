import React, { memo } from 'react'
import { calcProgress } from '../../lib/utils'
import { StatusBadge } from '../ui/index.jsx'
import { FilesCell } from '../ui/FileViewer.jsx'
import { Edit2, Trash2, BarChart2 } from 'lucide-react'
import { isTextTarget } from '../modals/GoalModals'

// ── Helpers ───────────────────────────────────────────────────
function ratingClass(r) {
  if (r === 1) return 'rat1'
  if (r === 2) return 'rat2'
  if (r === 3) return 'rat3'
  if (r === 4) return 'rat4'
  return ''
}

const TEXT_STATUS_STYLE = {
  'Completed':   { bg: '#D1FAE5', color: '#065F46' },
  'In Progress': { bg: '#DBEAFE', color: '#1D4ED8' },
  'On Hold':     { bg: '#FEF3C7', color: '#92400E' },
  'Cancelled':   { bg: '#FEE2E2', color: '#991B1B' },
}

function TextAchBadge({ status }) {
  if (!status) return <span className="val-muted">—</span>
  const s = TEXT_STATUS_STYLE[status] || { bg: 'var(--surface-2)', color: 'var(--text-3)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  )
}

function AchCell({ value, target, textValue }) {
  if (isTextTarget(target)) {
    if (!textValue && value == null) return <span className="val-muted">—</span>
    return <TextAchBadge status={textValue || (value != null ? `${value}%` : null)} />
  }
  if (value == null) return <span className="val-muted">—</span>
  const p   = calcProgress(value, target)
  const cls = p >= 100 ? 'val-success' : p >= 60 ? 'val-warning' : 'val-danger'
  return <span className={cls}>{value}</span>
}

// Monthly target — same style as KPI column for text targets
function TargetCell({ value }) {
  if (value == null || value === '') return <span className="val-muted">—</span>
  if (isTextTarget(value)) {
    return (
      <div style={{ fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120 }}>
        {value}
      </div>
    )
  }
  return <span className="font-600">{value}</span>
}

// ── Goal row ──────────────────────────────────────────────────
const GoalRow = memo(function GoalRow({ goal, canEdit, onEdit, onDelete, onUpdate, canRate, onRate }) {
  const [showDesc, setShowDesc] = React.useState(false)
  const isText    = isTextTarget(goal.monthly_target)
  const monthlyP  = isText
    ? (goal.monthly_achievement || 0)
    : calcProgress(goal.monthly_achievement, goal.monthly_target, goal.status)
  const monthlyClass = monthlyP >= 100 ? 'val-success' : monthlyP >= 60 ? 'val-warning' : 'val-danger'

  return (
    <tr>
      <td style={{ minWidth: 100 }}><div className="truncate font-500">{goal.department}</div></td>

      {/* Goal Title — click to toggle description */}
      <td style={{ minWidth: 180 }}>
        <div
          onClick={() => goal.goal_description && setShowDesc(v => !v)}
          style={{ fontWeight: 700, fontSize: '0.85rem', cursor: goal.goal_description ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span>{goal.goal_title}</span>
          {goal.goal_description && (
            <span style={{ fontSize: '0.62rem', color: '#2563EB', fontWeight: 600, flexShrink: 0 }}>
              {showDesc ? '▲' : '▼'}
            </span>
          )}
        </div>
        {showDesc && goal.goal_description && (
          <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-2)', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '6px 10px', lineHeight: 1.5, maxWidth: 260 }}>
            {goal.goal_description}
          </div>
        )}
      </td>

      <td style={{ minWidth: 100 }}><div className="truncate">{goal.kpi}</div></td>

      {/* Monthly Target */}
      <td style={{ minWidth: 80 }}><TargetCell value={goal.monthly_target} /></td>

      <td style={{ minWidth: 90, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{goal.start_date}</td>
      <td style={{ minWidth: 90, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{goal.end_date}</td>

      {/* Weekly Targets — same font/color as KPI for text goals */}
      {[1,2,3,4].map(w => {
        const wt = goal[`week${w}_target`]
        return (
          <td key={w} className="wt" style={{ minWidth: isText ? 90 : 46, textAlign: 'center' }}>
            {isText
              ? wt
                ? <div style={{ fontSize: '0.78rem', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 100 }}>{wt}</div>
                : <span className="val-muted">—</span>
              : (wt || <span className="val-muted">—</span>)
            }
          </td>
        )
      })}

      {/* Weekly Achievements */}
      {[1,2,3,4].map(w => (
        <td key={w} className="wa" style={{ minWidth: 60, textAlign: 'center' }}>
          <AchCell
            value={goal[`week${w}_achievement`]}
            target={goal[`week${w}_target`] ?? goal.monthly_target}
            textValue={goal[`week${w}_achievement_text`]}
          />
        </td>
      ))}

      {/* Monthly Achievement */}
      <td className="ma" style={{ minWidth: 100, textAlign: 'center' }}>
        {isText
          ? <TextAchBadge status={goal.monthly_achievement_text || (goal.monthly_achievement != null ? `${goal.monthly_achievement}%` : null)} />
          : goal.monthly_achievement == null
            ? <span className="val-muted">—</span>
            : <span className={monthlyClass}>{goal.monthly_achievement}</span>
        }
      </td>

      {/* Ratings W1-W4 */}
      {[1,2,3,4].map(w => {
        const r = goal[`week${w}_rating`] || 0
        return (
          <td key={w} className={ratingClass(r)} style={{ minWidth: 46, textAlign: 'center' }}>
            {r || <span className="val-muted">—</span>}
          </td>
        )
      })}

      {/* Manager Rating */}
      <td style={{ minWidth: 120, textAlign: 'center' }}>
        {canRate ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                onClick={() => onRate(goal, star === goal.manager_rating ? null : star)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: star <= (goal.manager_rating || 0) ? '#D97706' : 'var(--border)',
                  fontSize: '1rem', lineHeight: 1, transition: 'color 0.1s',
                }}
                title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              >★</button>
            ))}
          </div>
        ) : goal.manager_rating ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {[1,2,3,4,5].map(star => (
              <span key={star} style={{ color: star <= goal.manager_rating ? '#D97706' : 'var(--border)', fontSize: '0.85rem' }}>★</span>
            ))}
          </div>
        ) : (
          <span className="val-muted">—</span>
        )}
      </td>

      {/* Remarks */}
      <td style={{ minWidth: 140 }}>
        {goal.remarks
          ? <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{goal.remarks}</span>
          : <span className="val-muted">—</span>
        }
      </td>

      {/* Files */}
      <td style={{ minWidth: 100, overflow: 'visible' }}>
        <FilesCell files={goal.file_urls} />
      </td>

      <td style={{ minWidth: 90 }}><StatusBadge status={goal.status} /></td>

      {canEdit && (
        <td style={{ minWidth: 100 }}>
          <div className="td-action">
            <button className="btn btn-icon sm" title="Update Achievements" onClick={() => onUpdate(goal)}>
              <BarChart2 size={13} />
            </button>
            <button className="btn btn-icon sm" title="Edit Goal" onClick={() => onEdit(goal)}>
              <Edit2 size={13} />
            </button>
            <button className="btn btn-icon sm danger" title="Delete" onClick={() => onDelete(goal)}>
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
})

export default function GoalSheetTable({
  goals = [],
  canEdit = false,
  onEdit,
  onDelete,
  onUpdate,
  onRate,
  canRate = false,
  users,
  showEmployee = false,
}) {
  const totalMinWidth = canEdit ? 1700 : 1600

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'visible' }}>
      <table className="goal-sheet-table" style={{ minWidth: totalMinWidth, borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {showEmployee && <th rowSpan={2} style={{ minWidth: 120, whiteSpace: 'nowrap' }}>Employee</th>}
            <th rowSpan={2} style={{ minWidth: 100 }}>Dept</th>
            <th rowSpan={2} style={{ minWidth: 180 }}>Goal Title</th>
            <th rowSpan={2} style={{ minWidth: 100 }}>KPI</th>
            <th rowSpan={2} style={{ minWidth: 80  }}>Monthly Target</th>
            <th rowSpan={2} style={{ minWidth: 90  }}>Start</th>
            <th rowSpan={2} style={{ minWidth: 90  }}>End</th>
            <th colSpan={4} style={{ textAlign: 'center', background: '#1E40AF', minWidth: 184 }}>Weekly Target</th>
            <th colSpan={4} style={{ textAlign: 'center', background: '#065F46', minWidth: 240 }}>Weekly Achievement</th>
            <th rowSpan={2} style={{ minWidth: 100, background: '#92400E', color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>Monthly Achievement</th>
            <th colSpan={4} style={{ textAlign: 'center', background: '#581C87', minWidth: 184 }}>Rating</th>
            <th rowSpan={2} style={{ minWidth: 120, textAlign: 'center' }}>Manager Rating</th>
            <th rowSpan={2} style={{ minWidth: 140 }}>Remarks</th>
            <th rowSpan={2} style={{ minWidth: 100 }}>Files</th>
            <th rowSpan={2} style={{ minWidth: 90  }}>Status</th>
            {canEdit && <th rowSpan={2} style={{ minWidth: 100 }}>Actions</th>}
          </tr>
          <tr>
            {[1,2,3,4].map(w => <th key={`wt${w}`} className="wt" style={{ minWidth: 46, textAlign: 'center' }}>W{w}</th>)}
            {[1,2,3,4].map(w => <th key={`wa${w}`} className="wa" style={{ minWidth: 60, textAlign: 'center' }}>W{w}</th>)}
            {[1,2,3,4].map(w => <th key={`rt${w}`} className="rat" style={{ minWidth: 46, textAlign: 'center' }}>W{w}</th>)}
          </tr>
        </thead>
        <tbody>
          {goals.length === 0 ? (
            <tr>
              <td colSpan={canEdit ? (showEmployee ? 27 : 26) : (showEmployee ? 26 : 25)}
                style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                No goals found
              </td>
            </tr>
          ) : (
            goals.map(g => {
              const owner = showEmployee && users ? users.find(u => u.id === g.user_id) : null
              return (
                <React.Fragment key={g.goal_id}>
                  {showEmployee && owner && (
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={canEdit ? 27 : 26} style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-3)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {owner.name}
                          {owner?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase' }}>Left</span>
                          )}
                        </span>
                        {` — ${owner.role} — ${owner.department}`}
                      </td>
                    </tr>
                  )}
                  <GoalRow goal={g} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} onUpdate={onUpdate} canRate={canRate} onRate={onRate} />
                </React.Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}