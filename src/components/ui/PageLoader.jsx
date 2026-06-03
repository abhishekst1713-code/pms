import React from 'react'

export default function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: '50%',
        border: '4px solid var(--border)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Loading…</p>
    </div>
  )
}
