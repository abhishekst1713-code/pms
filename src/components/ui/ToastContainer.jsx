import React from 'react'
import { useUIStore } from '../../store'

export default function ToastContainer() {
  const toasts = useUIStore(s => s.toasts)
  const removeToast = useUIStore(s => s.removeToast)

  if (!toasts.length) return null

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.type ? ` ${t.type}` : ''}`}>
          <span>{icons[t.type] || 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
