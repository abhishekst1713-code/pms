import React from 'react'
import { cn, progressVariant } from '../../lib/utils'

/* ─── Stat Card ─── */
export function StatCard({ icon, value, label, variant, active, onClick }) {
  return (
    <div
      className={cn('card card-body stat-card', variant && `v-${variant}`, active && 'active')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ─── Progress Bar ─── */
export function ProgressBar({ value, showLabel = false, size = 'h6', className }) {
  const variant = progressVariant(value)
  return (
    <div className={cn(className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-muted mb-1" style={{ marginBottom: 4 }}>
          <span>Progress</span>
          <span className="font-600">{value.toFixed(1)}%</span>
        </div>
      )}
      <div className={`progress-bar-wrap ${size}`}>
        <div
          className={`progress-bar-fill ${variant}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Badge ─── */
export function Badge({ children, variant = 'gray', className }) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  )
}

export function RoleBadge({ role }) {
  return <span className={cn('badge', `role-${role}`)}>{role}</span>
}

export function StatusBadge({ status }) {
  const COLOR = { Completed: 'green', Active: 'blue', Overdue: 'red', 'On Hold': 'gray', Cancelled: 'gray' }
  const color = COLOR[status] || 'gray'
  return <span className={cn('badge', `badge-${color}`)}>{status}</span>
}

/* ─── Spinner ─── */
export function Spinner({ size = 20, className }) {
  return (
    <svg
      className={cn('spinner', className)}
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Empty State ─── */
export function EmptyState({ icon = '📭', title = 'Nothing here', description = '', action }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

/* ─── Skeleton ─── */
export function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i}><div className="skeleton sk-text" /></td>
      ))}
    </tr>
  )
}

export function SkeletonCards({ count = 5 }) {
  return (
    <div className="grid-5" style={{ marginBottom: 24 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-body">
          <div className="skeleton sk-stat" />
        </div>
      ))}
    </div>
  )
}

/* ─── Confirm Dialog ─── */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div className={`alert alert-${confirmVariant === 'danger' ? 'error' : 'warning'}`}>
            ⚠️ {message}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={14} /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Avatar ─── */
export function Avatar({ name, size = 40 }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: size * 0.4, fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

/* ─── Divider ─── */
export function Divider({ label }) {
  if (!label) return <div className="divider" />
  return (
    <div className="flex items-center gap-3" style={{ margin: '16px 0' }}>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
      <span className="text-sm text-muted">{label}</span>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
    </div>
  )
}

/* ─── Section Header ─── */
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ─── Filter Row ─── */
export function FilterRow({ children }) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      {children}
    </div>
  )
}

/* ─── Search Input ─── */
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-wrap" style={{ flex: 1, maxWidth: 280 }}>
      <span className="search-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        className="input input-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: 34 }}
      />
    </div>
  )
}

/* ─── Table Wrapper ─── */
export function TableWrap({ children, loading, isEmpty, emptyIcon, emptyTitle, emptyDesc }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <table>
          <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      </div>
    )
  }
  if (isEmpty) {
    return (
      <div className="card card-body">
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />
      </div>
    )
  }
  return <div className="table-wrap">{children}</div>
}