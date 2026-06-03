import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '5rem' }}>404</div>
      <h1>Page not found</h1>
      <p style={{ color: 'var(--text-3)', maxWidth: 300 }}>The page you're looking for doesn't exist or you don't have permission to view it.</p>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
    </div>
  )
}
