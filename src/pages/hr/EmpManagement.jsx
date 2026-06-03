import React, { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import {
  useAllUsers, useCreateUser, useUpdateUser, useDeleteUser,
  useDeactivateUser, useReactivateUser, useBulkCreateUsers,
} from '../../hooks/useData'
import { useAuthStore, useUIStore } from '../../store'
import { RoleBadge, EmptyState, ConfirmDialog, Spinner } from '../../components/ui/index.jsx'
import * as XLSX from 'xlsx'
import {
  Pencil, Trash2, UserPlus, Users, Search,
  Shield, Building2, GitBranch, Check, X, ChevronDown,
  Upload, Download, FileSpreadsheet, UserX, UserCheck, Calendar,
} from 'lucide-react'

const P = {
  blue: '#2563EB', green: '#059669', amber: '#D97706',
  red:  '#DC2626', violet: '#7C3AED', indigo: '#6366F1',
}

const AVATAR_COLORS = [P.blue, P.violet, P.green, '#0891B2', P.amber, P.indigo]
function avatarColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }
function Avatar({ name, size = 32 }) {
  const ac = avatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${ac}, ${ac}99)`,
      color: '#fff', fontWeight: 700, fontSize: size * 0.28,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 2px 6px ${ac}35`,
    }}>
      {name?.[0] || '?'}
    </div>
  )
}

function SLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: P.blue }} />{children}
      </div>
      {action}
    </div>
  )
}

// ── Supervisor Cell ───────────────────────────────────────────
function SupervisorCell({ user, allUsers, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(user.manager_id || '')
  const [saving,  setSaving]  = useState(false)
  const mgr      = allUsers.find(u => u.id === user.manager_id)
  const eligible = allUsers.filter(u => u.id !== user.id && ['CMD', 'VP', 'HR', 'Manager'].includes(u.role))

  const handleSave = async () => {
    setSaving(true)
    await onSave(user, value || null)   // ← passes full user object now
    setSaving(false)
    setEditing(false)
  }

  if (!editing) return (
    <div
      onClick={() => setEditing(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 10px', borderRadius: 8, border: '1.5px dashed transparent', transition: 'background 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent' }}
    >
      {mgr
        ? <><Avatar name={mgr.name} size={22} /><span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{mgr.name}</span><ChevronDown size={11} color="var(--text-4)" /></>
        : <span style={{ fontSize: '0.8rem', color: 'var(--text-4)', fontStyle: 'italic' }}>Unassigned <ChevronDown size={11} style={{ verticalAlign: 'middle' }} /></span>
      }
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select className="select select-sm" style={{ minWidth: 160 }} value={value} onChange={e => setValue(e.target.value)} autoFocus>
        <option value="">No Supervisor</option>
        {eligible.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
      </select>
      <button onClick={handleSave} disabled={saving} style={{ width: 28, height: 28, borderRadius: 6, background: P.green, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {saving ? <Spinner size={11} /> : <Check size={13} />}
      </button>
      <button onClick={() => { setValue(user.manager_id || ''); setEditing(false) }} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <X size={13} color="var(--text-3)" />
      </button>
    </div>
  )
}

// ── Create User Form ──────────────────────────────────────────
function CreateUserForm({ allUsers, onSuccess }) {
  const createUser = useCreateUser()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { role: 'Employee', password: '' } })
  const managers = allUsers.filter(u => ['CMD', 'VP', 'HR', 'Manager'].includes(u.role))

  const onSubmit = async (data) => {
    await createUser.mutateAsync({
      name:        data.name,
      email:       data.email.toLowerCase().trim(),
      password:    data.password,
      designation: data.designation || '',
      role:        data.role,
      department:  data.department || '',
      manager_id:  data.manager_id || null,
    })
    reset()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { label: 'Full Name',    name: 'name',        type: 'text',     placeholder: 'Jane Doe',            required: true },
          { label: 'Email',        name: 'email',       type: 'email',    placeholder: 'jane@company.com',     required: true },
          { label: 'Password',     name: 'password',    type: 'password', placeholder: 'Min 6 characters',     required: true, minLength: 6 },
          { label: 'Designation',  name: 'designation', type: 'text',     placeholder: 'e.g. Sales Executive' },
          { label: 'Department',   name: 'department',  type: 'text',     placeholder: 'e.g. SALES' },
        ].map(f => (
          <div key={f.name} className="form-group">
            <label className="form-label">{f.label} {f.required && <span className="required">*</span>}</label>
            <input className={`input ${errors[f.name] ? 'error' : ''}`} type={f.type} placeholder={f.placeholder}
              {...register(f.name, { required: f.required, minLength: f.minLength })} />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Role <span className="required">*</span></label>
          <select className="select" {...register('role', { required: true })}>
            {['Employee', 'Manager', 'HR', 'VP', 'CMD'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Assign Supervisor</label>
          <select className="select" {...register('manager_id')}>
            <option value="">None</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" className="btn btn-secondary" onClick={() => reset()}>Reset</button>
        <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
          {createUser.isPending ? <Spinner size={14} /> : <><UserPlus size={14} /> Create Employee</>}
        </button>
      </div>
    </form>
  )
}

// ── Edit User Modal ───────────────────────────────────────────
function EditUserModal({ user, allUsers, onSave, onClose, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: user })
  const managers = allUsers.filter(u => ['CMD', 'VP', 'HR', 'Manager'].includes(u.role) && u.id !== user.id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={user.name} size={36} />
            <div>
              <div className="modal-title">Edit Employee</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 1 }}>{user.email}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group"><label className="form-label">Name</label><input className="input" {...register('name')} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="input" type="email" {...register('email')} /></div>
              <div className="form-group"><label className="form-label">Designation</label><input className="input" {...register('designation')} /></div>
              <div className="form-group"><label className="form-label">Department</label><input className="input" {...register('department')} /></div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="select" {...register('role')}>
                  {['Employee', 'Manager', 'HR', 'VP', 'CMD'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor</label>
                <select className="select" {...register('manager_id')}>
                  <option value="">None</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={14} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Bulk Upload Tab — uses useBulkCreateUsers ─────────────────
function BulkUploadUsersTab({ allUsers, onDone }) {
  const bulkCreate = useBulkCreateUsers()   // ← new hook — fires one summary notification
  const addToast   = useUIStore(s => s.addToast)
  const fileRef    = useRef()
  const [rows,     setRows]     = useState([])
  const [errors,   setErrors]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(null)
  const [fileName, setFileName] = useState('')

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'email', 'password', 'role', 'designation', 'department', 'supervisor_email'],
      ['John Smith', 'john@company.com', 'pass123', 'Employee', 'Sales Executive', 'SALES', 'manager@company.com'],
      ['Jane Doe',   'jane@company.com', 'pass123', 'Manager',  'Team Lead',       'HR',    'hr@company.com'],
    ])
    ws['!cols'] = [14, 24, 10, 10, 18, 12, 24].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'pms_bulk_upload_users_template.xlsx')
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name); setDone(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb   = XLSX.read(evt.target.result, { type: 'binary' })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const VALID_ROLES = ['Admin', 'CMD', 'VP', 'HR', 'Manager', 'Employee']
      const parsed = [], errs = []

      data.forEach((row, i) => {
        const rowNum   = i + 2
        const rowErrors = []
        const name      = String(row.name    || '').trim()
        const email     = String(row.email   || '').trim().toLowerCase()
        const password  = String(row.password || '').trim()
        const role      = String(row.role    || '').trim()
        const desig     = String(row.designation  || '').trim()
        const dept      = String(row.department   || '').trim()
        const supEmail  = String(row.supervisor_email || '').trim().toLowerCase()

        if (!name)                             rowErrors.push('Name required')
        if (!email || !email.includes('@'))    rowErrors.push('Valid email required')
        if (!password || password.length < 3)  rowErrors.push('Password too short')
        if (!VALID_ROLES.includes(role))        rowErrors.push(`Role must be: ${VALID_ROLES.join(', ')}`)
        if (allUsers.find(u => u.email === email)) rowErrors.push('Email already exists')

        let manager_id = null
        if (supEmail) {
          const sup = allUsers.find(u => u.email === supEmail) || parsed.find(p => p.email === supEmail)
          if (sup) manager_id = sup.id || sup._tempEmail
          else rowErrors.push(`Supervisor not found: ${supEmail}`)
        }

        parsed.push({ _row: rowNum, name, email, password, role, designation: desig, department: dept, manager_id, _supEmail: supEmail, _errors: rowErrors })
        if (rowErrors.length) errs.push({ row: rowNum, errors: rowErrors })
      })

      setRows(parsed); setErrors(errs)
    }
    reader.readAsBinaryString(file)
  }

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r._errors.length === 0)
    if (!validRows.length) return
    setLoading(true)

    // Resolve manager_ids for rows where we stored a temp email reference
    const resolved = validRows.map(row => {
      let manager_id = row.manager_id
      if (row._supEmail && !manager_id) {
        const sup = allUsers.find(u => u.email === row._supEmail)
        if (sup) manager_id = sup.id
      }
      return { name: row.name, email: row.email, password: row.password, role: row.role, designation: row.designation, department: row.department, manager_id: manager_id || null }
    })

    const { created, skipped } = await bulkCreate.mutateAsync({ rows: resolved })
    setLoading(false)
    setDone({ created, skipped })
    onDone()
  }

  const validCount   = rows.filter(r => r._errors.length === 0).length
  const invalidCount = rows.filter(r => r._errors.length > 0).length

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileSpreadsheet size={15} color={P.blue} /></div>
            <div><div className="card-title">Bulk Upload Users</div><div className="card-subtitle">Upload multiple employees at once using an Excel file</div></div>
          </div>
        </div>
        <div className="card-body">
          {/* Step 1 */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>Step 1 — Download the template</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Columns: name, email, password, role, designation, department, supervisor_email</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={downloadTemplate}><Download size={13} /> Download Template</button>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>Step 2 — Upload your filled Excel file</div>
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }) }}
            >
              <Upload size={28} color="var(--text-4)" style={{ margin: '0 auto 10px' }} />
              {fileName
                ? <div style={{ fontWeight: 600, color: P.blue }}>{fileName}</div>
                : <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Click to browse or drag &amp; drop Excel file</div>
              }
              <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: 6 }}>Supports .xlsx and .xls</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {/* Preview */}
          {rows.length > 0 && !done && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>{rows.length} rows</span>
                {validCount   > 0 && <span style={{ background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>✓ {validCount} valid</span>}
                {invalidCount > 0 && <span style={{ background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>✕ {invalidCount} errors</span>}
              </div>
              {errors.length > 0 && (
                <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: P.red, marginBottom: 8 }}>Issues — these rows will be skipped:</div>
                  {errors.map(e => <div key={e.row} style={{ fontSize: '0.78rem', color: '#7F1D1D', marginBottom: 4 }}><strong>Row {e.row}:</strong> {e.errors.join(' · ')}</div>)}
                </div>
              )}
              <div style={{ overflowX: 'auto', maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', marginBottom: 16 }}>
                <table style={{ minWidth: 600 }}>
                  <thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Supervisor</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r._row} style={{ background: r._errors.length ? '#FFF5F5' : '' }}>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{r._row}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ fontSize: '0.8rem' }}>{r.email}</td>
                        <td><span className={`badge badge-${r.role === 'Employee' ? 'green' : r.role === 'Manager' ? 'blue' : 'gray'}`}>{r.role}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{r.department || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>{r._supEmail || '—'}</td>
                        <td>
                          {r._errors.length > 0
                            ? <span style={{ color: P.red,   fontSize: '0.75rem', fontWeight: 600 }}>✕ Error</span>
                            : <span style={{ color: P.green, fontSize: '0.75rem', fontWeight: 600 }}>✓ Ready</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? <Spinner size={14} /> : <><Upload size={13} /> Upload {validCount} User{validCount !== 1 ? 's' : ''}</>}
                  </button>
                </div>
              )}
            </>
          )}

          {done && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 12 }}>Upload Complete</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <div style={{ background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '1rem', padding: '10px 20px', borderRadius: 10 }}>✓ {done.created} created</div>
                {done.skipped > 0 && <div style={{ background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: '1rem', padding: '10px 20px', borderRadius: 10 }}>✕ {done.skipped} skipped</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Assign Reporting Tab ──────────────────────────────────────
function AssignReportingTab({ allUsers, onAssign }) {
  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState('All')
  const [filterSuper, setFilterSuper] = useState('All')

  const display = useMemo(() => {
    let list = allUsers
    if (filterRole  !== 'All')        list = list.filter(u => u.role === filterRole)
    if (filterSuper === 'assigned')   list = list.filter(u => u.manager_id)
    if (filterSuper === 'unassigned') list = list.filter(u => !u.manager_id)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q))
    }
    return list
  }, [allUsers, filterRole, filterSuper, search])

  const unassignedCount = allUsers.filter(u => !u.manager_id).length

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',      value: allUsers.length,                    color: P.blue,                         bg: '#EFF6FF' },
          { label: 'Assigned',   value: allUsers.length - unassignedCount,  color: P.green,                        bg: '#D1FAE5' },
          { label: 'Unassigned', value: unassignedCount,                    color: unassignedCount > 0 ? P.amber : P.green, bg: unassignedCount > 0 ? '#FEF3C7' : '#D1FAE5' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--r-xl)', padding: '14px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--r-lg)', marginBottom: 16 }}>
        <GitBranch size={15} color={P.blue} />
        <p style={{ margin: 0, fontSize: '0.82rem', color: P.blue, fontWeight: 500 }}>Click any supervisor cell to reassign. Changes save instantly with the ✓ button.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} color="var(--text-4)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search employee or department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select select-sm" style={{ width: 140 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="All">All Roles</option>
          {['CMD', 'VP', 'HR', 'Manager', 'Employee'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="select select-sm" style={{ width: 150 }} value={filterSuper} onChange={e => setFilterSuper(e.target.value)}>
          <option value="All">All Status</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{display.length} employee{display.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GitBranch size={12} color="var(--text-3)" />
                    Reporting To
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-4)', fontStyle: 'italic' }}>(click to change)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {display.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No employees match filters</td></tr>
                : display.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} size={32} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ fontSize: '0.82rem' }}>{u.department || '—'}</td>
                    <td>
                      {/* SupervisorCell now receives full user object via onSave */}
                      <SupervisorCell user={u} allUsers={allUsers} onSave={onAssign} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Deactivate User Modal ─────────────────────────────────────
function DeactivateModal({ user, onConfirm, onClose, loading }) {
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0])
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserX size={16} color={P.red} />
            </div>
            <span className="modal-title">Mark Employee as Left</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 'var(--r-lg)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: P.red, marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#7F1D1D' }}>{user.role} · {user.department || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Exit Date <span className="required">*</span></label>
            <input className="input" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>
              This will deactivate the account and block login. Goals will remain visible.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => onConfirm(exitDate)} disabled={!exitDate || loading}>
            {loading ? <Spinner size={14} /> : <><UserX size={13} /> Mark as Left</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmpManagement() {
  const currentUser    = useAuthStore(s => s.user)
  const { data: allUsers = [], isLoading, refetch } = useAllUsers()
  const updateUser     = useUpdateUser()
  const deleteUser     = useDeleteUser()
  const deactivateUser = useDeactivateUser()
  const reactivateUser = useReactivateUser()

  const [activeTab,        setActiveTab]        = useState('all')
  const [search,           setSearch]           = useState('')
  const [editUser,         setEditUser]         = useState(null)
  const [deleteTarget,     setDeleteTarget]     = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [filterRole,       setFilterRole]       = useState('All')
  const [showInactive,     setShowInactive]     = useState(false)

  const activeUsers   = allUsers.filter(u => u.is_active !== false && u.role !== 'Admin')
  const inactiveUsers = allUsers.filter(u => u.is_active === false && u.role !== 'Admin')

  const displayUsers = useMemo(() => {
    const base = showInactive ? inactiveUsers : activeUsers
    const q    = search.toLowerCase()
    return base.filter(u =>
      (!q || u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q)) &&
      (filterRole === 'All' || u.role === filterRole)
    )
  }, [allUsers, filterRole, search, showInactive, activeUsers, inactiveUsers])

  // ── Edit — notifies employee + HR + CMD ──────────────────────
  const handleEdit = async (data) => {
    await updateUser.mutateAsync({
      id:      editUser.id,
      updates: {
        name:       data.name,
        email:      data.email.toLowerCase().trim(),
        designation: data.designation,
        department:  data.department,
        role:        data.role,
        manager_id:  data.manager_id || null,
      },
      notifyEmployee: true,
    })
    setEditUser(null)
  }

  // ── Assign supervisor — notifies employee + new manager + HR ─
  // user = full user object, supervisorId = new manager_id value
  const handleAssign = async (user, supervisorId) => {
    await updateUser.mutateAsync({
      id:      user.id,
      updates: { manager_id: supervisorId },
      notifyEmployee: true,
    })
  }

  // ── Deactivate — notifies employee + manager + HR + CMD ──────
  const handleDeactivate = async (exitDate) => {
    await deactivateUser.mutateAsync({
      id:       deactivateTarget.id,
      exitDate,
      employee: deactivateTarget,   // full object for notification
    })
    setDeactivateTarget(null)
  }

  // ── Reactivate — notifies employee + HR + CMD ────────────────
  const handleReactivate = async (user) => {
    await reactivateUser.mutateAsync({
      id:       user.id,
      employee: user,               // full object for notification
    })
  }

  // ── Delete — notifies HR + CMD ───────────────────────────────
  const handleDelete = async () => {
    await deleteUser.mutateAsync({
      id:   deleteTarget.id,
      name: deleteTarget.name,
      role: deleteTarget.role,
    })
    setDeleteTarget(null)
  }

  const managers   = allUsers.filter(u => ['CMD', 'VP', 'HR', 'Manager'].includes(u.role))
  const roleCounts = ['CMD', 'VP', 'HR', 'Manager', 'Employee'].map(r => ({
    role: r, count: allUsers.filter(u => u.role === r).length,
  }))

  const TABS = [
    { key: 'all',      label: 'All Employees',               icon: Users           },
    { key: 'inactive', label: `Left (${inactiveUsers.length})`, icon: UserX        },
    { key: 'create',   label: 'Create Employee',             icon: UserPlus        },
    { key: 'bulk',     label: 'Bulk Upload',                 icon: FileSpreadsheet },
    { key: 'assign',   label: 'Assign Reporting',            icon: GitBranch       },
    { key: 'teams',    label: 'Manage Teams',                icon: Building2       },
  ]

  return (
    <div>
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Admin · System Management</div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Employee Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>Create, edit, bulk upload, assign reporting lines and organise teams</p>
        </div>
      </div>

      {/* Role summary bar */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: 'var(--r-xl)', padding: '18px 24px', marginBottom: 20, display: 'grid', gridTemplateColumns: `repeat(${roleCounts.length + 1}, 1fr)`, gap: 0 }}>
        {[{ role: 'Total', count: allUsers.length }, ...roleCounts].map((s, i, arr) => (
          <div key={s.role} style={{ padding: '0 16px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
            <Shield size={12} color="rgba(255,255,255,0.4)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.count}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.role}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-wrap mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => { setActiveTab(t.key); setShowInactive(t.key === 'inactive') }}
          >
            <t.icon size={13} style={{ marginRight: 5 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ALL EMPLOYEES */}
      {activeTab === 'all' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} color="var(--text-4)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: 34 }} placeholder="Search name, email or department…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select select-sm" style={{ width: 150 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="All">All Roles</option>
              {['CMD', 'VP', 'HR', 'Manager', 'Employee'].map(r => <option key={r}>{r}</option>)}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{displayUsers.length} employee{displayUsers.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Employee</th><th>Role</th><th>Department</th><th>Designation</th><th>Supervisor</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton sk-text" /></td>)}</tr>)
                    : displayUsers.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No employees found</td></tr>
                      : displayUsers.map(u => {
                        const mgr = allUsers.find(m => m.id === u.manager_id)
                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={u.name} size={32} />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {u.name}
                                    {u.is_active === false && (
                                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase' }}>Left</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email}</div>
                                  {u.exit_date && (
                                    <div style={{ fontSize: '0.68rem', color: P.red, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                      <Calendar size={10} /> Exit: {u.exit_date}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td><RoleBadge role={u.role} /></td>
                            <td style={{ fontSize: '0.82rem' }}>{u.department || '—'}</td>
                            <td style={{ fontSize: '0.82rem' }}>{u.designation || '—'}</td>
                            <td>
                              {mgr
                                ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={mgr.name} size={20} /><span style={{ fontSize: '0.82rem' }}>{mgr.name}</span></div>
                                : <span style={{ fontSize: '0.78rem', color: 'var(--text-4)', fontStyle: 'italic' }}>Unassigned</span>
                              }
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="btn btn-icon sm" onClick={() => setEditUser(u)} title="Edit"><Pencil size={12} /></button>
                                <button className="btn btn-icon sm" onClick={() => setDeactivateTarget(u)} title="Mark as Left" style={{ color: P.amber }}><UserX size={12} /></button>
                                <button className="btn btn-icon sm danger" onClick={() => setDeleteTarget(u)} title="Delete"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* INACTIVE / LEFT EMPLOYEES */}
      {activeTab === 'inactive' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} color="var(--text-4)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="input" style={{ paddingLeft: 34 }} placeholder="Search name, email or department…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{displayUsers.length} employee{displayUsers.length !== 1 ? 's' : ''} left</div>
          </div>
          {displayUsers.length === 0 ? (
            <div className="card card-body"><EmptyState title="No former employees" description="Employees marked as left will appear here" /></div>
          ) : (
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Exit Date</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {displayUsers.map(u => (
                      <tr key={u.id} style={{ opacity: 0.8 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar name={u.name} size={32} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {u.name}
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase' }}>Left</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td style={{ fontSize: '0.82rem' }}>{u.department || '—'}</td>
                        <td>
                          {u.exit_date
                            ? <span style={{ fontSize: '0.82rem', fontWeight: 600, color: P.red, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {u.exit_date}</span>
                            : <span style={{ fontSize: '0.78rem', color: 'var(--text-4)', fontStyle: 'italic' }}>—</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => handleReactivate(u)}       // ← passes full object
                              disabled={reactivateUser.isPending}
                              title="Reactivate Employee"
                            >
                              <UserCheck size={12} /> Reactivate
                            </button>
                            <button className="btn btn-icon sm danger" onClick={() => setDeleteTarget(u)} title="Delete Permanently"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: 720 }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={15} color={P.blue} /></div>
                <div><div className="card-title">Create New Employee</div><div className="card-subtitle">Fill in the details to add a new system user</div></div>
              </div>
            </div>
            <div className="card-body">
              <CreateUserForm allUsers={allUsers} onSuccess={() => setActiveTab('all')} />
            </div>
          </div>
        </div>
      )}

      {/* BULK UPLOAD */}
      {activeTab === 'bulk' && (
        <BulkUploadUsersTab allUsers={allUsers} onDone={() => { refetch(); setActiveTab('all') }} />
      )}

      {/* ASSIGN REPORTING */}
      {activeTab === 'assign' && (
        <AssignReportingTab allUsers={allUsers} onAssign={handleAssign} />
      )}

      {/* MANAGE TEAMS */}
      {activeTab === 'teams' && (
        <>
          <SLabel>{managers.length} Team{managers.length !== 1 ? 's' : ''}</SLabel>
          {managers.length === 0 ? (
            <div className="card card-body"><EmptyState title="No managers yet" description="Create managers to build teams" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {managers.map(mgr => {
                const team = allUsers.filter(u => u.manager_id === mgr.id)
                return (
                  <div key={mgr.id} className="card">
                    <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', padding: '14px 20px', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={mgr.name} size={38} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{mgr.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{mgr.role}{mgr.department ? ` · ${mgr.department}` : ''}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)' }}>
                        {team.length} member{team.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {team.length === 0
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: 0 }}>No members assigned.</p>
                            <button className="btn btn-xs btn-secondary" onClick={() => setActiveTab('assign')}><GitBranch size={11} /> Assign Members</button>
                          </div>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {team.map(m => (
                              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                                <Avatar name={m.name} size={24} />
                                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{m.name}</span>
                                <RoleBadge role={m.role} />
                                <button
                                  onClick={() => handleAssign(m, null)}   // ← passes full object
                                  title="Remove"
                                  style={{ width: 18, height: 18, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)' }}
                                  onMouseEnter={e => e.currentTarget.style.color = P.red}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editUser && (
        <EditUserModal
          user={editUser}
          allUsers={allUsers}
          onSave={handleEdit}
          onClose={() => setEditUser(null)}
          loading={updateUser.isPending}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Employee"
          message={`Permanently delete "${deleteTarget.name}"? All their goals and feedback will also be removed. This cannot be undone.`}
          confirmLabel="Delete Employee"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteUser.isPending}
        />
      )}

      {deactivateTarget && (
        <DeactivateModal
          user={deactivateTarget}
          onConfirm={handleDeactivate}
          onClose={() => setDeactivateTarget(null)}
          loading={deactivateUser.isPending}
        />
      )}
    </div>
  )
}