import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import './TopBar.css'
import { useAuthStore, useUIStore } from '../../store'
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/useData'
import { timeAgo, getNotifIcon, getNotifColor } from '../../lib/utils'
import './TopBar.css'

function NotificationPanel({ userId, onClose }) {
  const { data: notifs = [], isLoading } = useNotifications(userId)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notifications</span>
        {unread > 0 && (
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => markAll.mutate(userId)}
          >
            Mark all read
          </button>
        )}
        <button className="modal-close-btn" onClick={onClose}><X size={14}/></button>
      </div>

      <div className="notif-panel-body">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="notif-item">
              <div className="skeleton sk-text" style={{ height: 40 }} />
            </div>
          ))
        ) : notifs.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="icon">✨</div>
            <p>All caught up!</p>
          </div>
        ) : (
          notifs.slice(0, 30).map(n => (
            <div
              key={n.id}
              className={`notif-item${n.is_read ? ' read' : ''}`}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
            >
              <div
                className="notif-dot"
                style={{ background: n.is_read ? 'var(--ink-200)' : getNotifColor(n.action_type) }}
              />
              <div className="notif-content">
                <div className="title">
                  {getNotifIcon(n.action_type)}{' '}
                  {n.action_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                <div className="msg">{n.details}</div>
                <div className="time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function TopBar() {
  const user = useAuthStore(s => s.user)
  const [showNotifs, setShowNotifs] = useState(false)
  const [search, setSearch] = useState('')
  const panelRef = useRef()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: notifs = [] } = useNotifications(user?.id)
  const unreadCount = notifs.filter(n => !n.is_read).length

  // Close panel on outside click
  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Build breadcrumb from path
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map(p => p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="topbar-sep">›</span>}
            <span className={i === crumbs.length - 1 ? 'topbar-crumb active' : 'topbar-crumb'}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-right">
        {/* Notification Bell */}
        <div className="topbar-notif-wrap" ref={panelRef}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowNotifs(v => !v)}
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="topbar-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          {showNotifs && (
            <NotificationPanel userId={user?.id} onClose={() => setShowNotifs(false)} />
          )}
        </div>

        {/* User chip */}
        <button className="topbar-user-chip" onClick={() => navigate('/profile')}>
          <div className="topbar-avatar">{user?.name?.[0]}</div>
          <span className="topbar-username">{user?.name}</span>
        </button>
      </div>
    </header>
  )
}
