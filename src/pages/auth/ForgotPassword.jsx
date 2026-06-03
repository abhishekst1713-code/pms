import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPasswordResetToken } from '../../lib/api'
import { Spinner } from '../../components/ui/index.jsx'
import './LoginPage.css'

export default function ForgotPassword() {
  const [stage, setStage] = useState('email') // email | sent
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const t = await createPasswordResetToken(email)
      setToken(t)
      setStage('sent')
    } catch (err) {
      setError(err.message || 'Email not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🔑</span>
          <h1 className="login-title">Reset Password</h1>
          <p className="login-sub">Enter your email to receive a reset token</p>
        </div>

        {stage === 'email' ? (
          <form className="login-form" onSubmit={handleRequest}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary btn-wide btn-lg" disabled={loading}>
              {loading ? <Spinner size={18} /> : 'Send Reset Token'}
            </button>
            <Link to="/login" className="btn btn-ghost btn-wide" style={{ justifyContent: 'center' }}>← Back to Login</Link>
          </form>
        ) : (
          <div className="login-form">
            <div className="alert alert-success">
              ✅ Reset token generated! In production this is emailed to you.
            </div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 8 }}>Your reset token:</p>
              <code style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: 6, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{token}</code>
            </div>
            <Link to="/login" className="btn btn-primary btn-wide" style={{ justifyContent: 'center' }}>← Back to Login</Link>
          </div>
        )}
      </div>
    </div>
  )
}
