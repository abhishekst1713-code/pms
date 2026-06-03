import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import { loginUser } from '../../lib/api'
import { Spinner } from '../../components/ui/index.jsx'
import infopaceLogo from '../../assets/infopace-logo.png'
import './LoginPage.css'

export default function LoginPage() {
  const setUser  = useAuthStore(s => s.setUser)
  const addToast = useUIStore(s => s.addToast)
  const navigate = useNavigate()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!form.email || !form.password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await loginUser(form.email, form.password)
      setUser(user)
      addToast({ message: `Welcome back, ${user.name}!`, type: 'success' })
      navigate('/dashboard')
    } catch (err) {
      if (err.message?.includes('deactivated')) {
        setError(err.message)
      } else {
        setError('Invalid credentials. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-grid" />

      <div className="login-card">
        {/* Infopace logo */}
        <div className="login-header">
          <div className="login-logo-wrap">
            <img
              src={infopaceLogo}
              alt="Infopace"
              className="login-logo-img"
            />
          </div>
          <h1 className="login-title">Performance Management</h1>
          <p className="login-sub">Sign in to your workspace</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleLogin}>
          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center">
              <label className="form-label">Password</label>
              <Link to="/forgot-password" className="login-forgot">Forgot password?</Link>
            </div>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-wide btn-lg"
            disabled={loading}
          >
            {loading ? <Spinner size={18} /> : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}