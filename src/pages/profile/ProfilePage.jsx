import React, { useState } from 'react'
import { useAuthStore } from '../../store'
import { useUpdateUser, useAllUsers } from '../../hooks/useData'
import { resetPasswordWithToken } from '../../lib/api'
import { useUIStore } from '../../store'
import { RoleBadge, Avatar, Spinner } from '../../components/ui/index.jsx'
import { useForm } from 'react-hook-form'

function PasswordStrength({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score += 25
  if (/[A-Z]/.test(password)) score += 25
  if (/[0-9]/.test(password)) score += 25
  if (/[^A-Za-z0-9]/.test(password)) score += 25

  const label = score >= 75 ? 'Strong 💪' : score >= 50 ? 'Medium ⚡' : 'Weak ⚠️'
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ marginTop: 8 }}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted">Password strength</span>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
      </div>
      <div className="progress-bar-wrap h4">
        <div className="progress-bar-fill" style={{ width: `${score}%`, background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const addToast = useUIStore(s => s.addToast)
  const updateUser = useUpdateUser()
  const { data: allUsers = [] } = useAllUsers()
  const reportingManager = allUsers.find(u => u.id === user.manager_id)
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const { register: regProfile, handleSubmit: submitProfile, formState: { errors: profileErrors } } = useForm({
    defaultValues: { name: user.name, email: user.email, designation: user.designation || '', department: user.department || '' }
  })

  // Password form
  const { register: regPw, handleSubmit: submitPw, watch: watchPw, reset: resetPw, formState: { errors: pwErrors } } = useForm()
  const newPassword = watchPw('newPassword', '')

  // Forgot password state
  const [fpStage, setFpStage] = useState('idle') // idle | sent
  const [resetToken, setResetToken] = useState('')
  const [fpLoading, setFpLoading] = useState(false)

  const handleProfileSave = async (data) => {
    const updated = await updateUser.mutateAsync({
      id: user.id,
      updates: { name: data.name, email: data.email.trim().toLowerCase(), designation: data.designation, department: data.department }
    })
    setUser({ ...user, ...data })
    addToast({ message: 'Profile updated', type: 'success' })
  }

  const handlePasswordChange = async (data) => {
    if (data.currentPassword !== user.password) {
      addToast({ message: 'Current password is incorrect', type: 'error' }); return
    }
    if (data.newPassword !== data.confirmPassword) {
      addToast({ message: "Passwords don't match", type: 'error' }); return
    }
    await updateUser.mutateAsync({ id: user.id, updates: { password: data.newPassword } })
    setUser({ ...user, password: data.newPassword })
    resetPw()
    addToast({ message: 'Password changed', type: 'success' })
  }

  const handleResetWithToken = async (data) => {
    setFpLoading(true)
    try {
      await resetPasswordWithToken(data.token, data.tokenNewPassword)
      addToast({ message: 'Password reset successfully', type: 'success' })
      setFpStage('idle')
    } catch (e) {
      addToast({ message: e.message, type: 'error' })
    }
    setFpLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>👤 My Profile</h1>
      </div>

      <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
        {/* Left card */}
        <div className="card" style={{ width: 220, flexShrink: 0 }}>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Avatar name={user.name} size={72} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>{user.designation}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{user.department}</div>
            <div style={{ marginTop: 10 }}><RoleBadge role={user.role} /></div>
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-4)' }}>{user.email}</div>
            {reportingManager && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Reporting To
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{reportingManager.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{reportingManager.designation || reportingManager.role}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right form area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tabs-wrap mb-5">
            <button className={`tab-btn${activeTab === 'profile' ? ' active' : ''}`} onClick={() => setActiveTab('profile')}>📝 Edit Profile</button>
            <button className={`tab-btn${activeTab === 'password' ? ' active' : ''}`} onClick={() => setActiveTab('password')}>🔒 Change Password</button>
          </div>

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Personal Information</div></div>
              <form onSubmit={submitProfile(handleProfileSave)}>
                <div className="card-body">
                  <div className="grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Full Name <span className="required">*</span></label>
                      <input className="input" {...regProfile('name', { required: true })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span className="required">*</span></label>
                      <input className="input" type="email" {...regProfile('email', { required: true })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input className="input" {...regProfile('designation')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <input className="input" {...regProfile('department')} />
                    </div>
                  </div>
                </div>
                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={updateUser.isPending}>
                    {updateUser.isPending ? <Spinner size={14} /> : '💾 Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PASSWORD */}
          {activeTab === 'password' && (
            <>
              <div className="card mb-4">
                <div className="card-header"><div className="card-title">Change Password</div></div>
                <form onSubmit={submitPw(handlePasswordChange)}>
                  <div className="card-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                      <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input className="input" type="password" {...regPw('currentPassword', { required: true })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input className="input" type="password" {...regPw('newPassword', { required: true, minLength: 6 })} />
                        {pwErrors.newPassword?.type === 'minLength' && <span className="form-error">Minimum 6 characters</span>}
                        <PasswordStrength password={newPassword} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input className="input" type="password" {...regPw('confirmPassword', { required: true })} />
                      </div>
                    </div>
                  </div>
                  <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={updateUser.isPending}>
                      {updateUser.isPending ? <Spinner size={14} /> : '🔒 Change Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Forgot password token */}
              <div className="card">
                <div className="card-header"><div className="card-title">🔑 Reset via Token</div></div>
                <div className="card-body">
                  {fpStage === 'idle' ? (
                    <div>
                      <p className="text-sm text-muted mb-4">If you forgot your current password, request a reset token and use it below.</p>
                      <button className="btn btn-secondary" onClick={() => setFpStage('form')}>Request Reset Token</button>
                    </div>
                  ) : (
                    <form onSubmit={submitPw(handleResetWithToken)}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                        <div className="form-group">
                          <label className="form-label">Reset Token</label>
                          <input className="input font-mono" placeholder="Enter 8-char token" {...regPw('token', { required: true })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">New Password</label>
                          <input className="input" type="password" {...regPw('tokenNewPassword', { required: true, minLength: 6 })} />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="btn btn-primary" disabled={fpLoading}>
                            {fpLoading ? <Spinner size={14} /> : 'Reset Password'}
                          </button>
                          <button type="button" className="btn btn-ghost" onClick={() => setFpStage('idle')}>Cancel</button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
