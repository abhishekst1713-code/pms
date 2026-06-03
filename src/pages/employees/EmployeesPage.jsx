import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../../store'
import { useAllUsers, useAllGoals, useCreateGoal } from '../../hooks/useData'
import { calcProgress } from '../../lib/constants'
import { RoleBadge, EmptyState, ProgressBar, Spinner } from '../../components/ui/index.jsx'
import * as XLSX from 'xlsx'
import {
  Target, Users, TrendingUp, CheckCircle,
  AlertTriangle, Search, BarChart2, X,
  Upload, Download, FileSpreadsheet,
} from 'lucide-react'
import './EmployeesPage.css'

const P = {
  blue: '#2563EB', green: '#059669', amber: '#D97706',
  red:  '#DC2626', violet: '#7C3AED', indigo: '#6366F1',
}

const ROLE_TABS = {
  Admin:   [{ label: 'All',          roles: ['CMD','VP','HR','Manager','Employee'] },
            { label: 'CMD',          roles: ['CMD']      },
            { label: 'VP',           roles: ['VP']       },
            { label: 'HR',           roles: ['HR']       },
            { label: 'Managers',     roles: ['Manager']  },
            { label: 'Employees',    roles: ['Employee'] }],
  CMD:     [{ label: 'VPs',          roles: ['VP']       },
            { label: 'HR',           roles: ['HR']       },
            { label: 'Managers',     roles: ['Manager']  },
            { label: 'All Employees',roles: ['Employee'] },
            { label: 'My Team',      mine: true          }],
  VP:      [{ label: 'HR',           roles: ['HR']       },
            { label: 'Managers',     roles: ['Manager']  },
            { label: 'All Employees',roles: ['Employee'] },
            { label: 'My Team',      mine: true          }],
  HR:      [{ label: 'Managers',     roles: ['Manager']  },
            { label: 'All Employees',roles: ['Employee'] },
            { label: 'My Team',      mine: true          }],
  Manager: [{ label: 'My Team',      mine: true          }],
}

// ── Employee Card ─────────────────────────────────────────────
function EmployeeCard({ emp, goals, onViewGoals, onViewTeam, hasTeam }) {
  const [hovered, setHovered] = useState(false)
  const empGoals  = goals.filter(g => g.user_id === emp.id)
  const completed = empGoals.filter(g => g.status === 'Completed').length
  const withP     = empGoals.filter(g => g.monthly_achievement != null)
  const avgP      = withP.length ? withP.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / withP.length : 0
  const overdue   = empGoals.filter(g => g.status === 'Active' && g.end_date && new Date(g.end_date) < new Date()).length
  const progressColor = avgP >= 80 ? P.green : avgP >= 50 ? P.amber : avgP > 0 ? P.red : 'var(--text-4)'
  const avatarColors  = [P.blue, P.violet, P.green, '#0891B2', P.amber, P.indigo]
  const avatarColor   = avatarColors[emp.name.charCodeAt(0) % avatarColors.length]

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${avatarColor}`, borderRadius: 'var(--r-xl)', padding: '22px 20px 18px', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.18s, transform 0.18s', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.05)', transform: hovered ? 'translateY(-2px)' : undefined, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${avatarColor}07`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, color: '#fff', fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${avatarColor}35` }}>{emp.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.925rem', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
            {emp?.is_active === false && (
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.designation || emp.department || '—'}</div>
          <RoleBadge role={emp.role} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
        {[{ label: 'Goals', value: empGoals.length, color: P.indigo }, { label: 'Completed', value: completed, color: P.green }, { label: 'Overdue', value: overdue, color: overdue > 0 ? P.red : P.green }].map(s => (
          <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Progress</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: progressColor }}>{avgP.toFixed(0)}%</span>
        </div>
        <ProgressBar value={avgP} size="h6" />
      </div>
      {emp.department && <div style={{ marginBottom: 14 }}><span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)' }}>{emp.department}</span></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="btn btn-sm btn-primary" onClick={onViewGoals} style={{ flex: 1, justifyContent: 'center' }}><Target size={13} /> Goals</button>
        {hasTeam && <button className="btn btn-sm btn-secondary" onClick={onViewTeam} style={{ flex: 1, justifyContent: 'center' }}><Users size={13} /> Team</button>}
      </div>
    </div>
  )
}

// ── Team Drawer ───────────────────────────────────────────────
function TeamDrawer({ manager, allUsers, goals, onViewGoals, onClose }) {
  const team = allUsers.filter(u => u.manager_id === manager.id)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{manager.name[0]}</div>
          <div><div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{manager.name}'s Team</div><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{team.length} member{team.length !== 1 ? 's' : ''}</div></div>
        </div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
      </div>
      <div style={{ padding: '20px 24px', background: 'var(--surface)' }}>
        {team.length === 0 ? <EmptyState title="No team members" description="No employees assigned to this manager" /> : <div className="emp-grid">{team.map(emp => <EmployeeCard key={emp.id} emp={emp} goals={goals} onViewGoals={() => onViewGoals(emp)} hasTeam={false} />)}</div>}
      </div>
    </div>
  )
}

// ── Org Summary Bar ───────────────────────────────────────────
function OrgBar({ users, goals }) {
  const total = users.length, withGoals = users.filter(u => goals.some(g => g.user_id === u.id)).length
  const depts = [...new Set(users.map(u => u.department).filter(Boolean))].length
  const empGoals = goals.filter(g => users.some(u => u.id === g.user_id))
  const completed = empGoals.filter(g => g.status === 'Completed').length
  const compRate = empGoals.length ? (completed / empGoals.length * 100) : 0
  const wp = empGoals.filter(g => g.monthly_achievement != null)
  const avgP = wp.length ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length : 0
  const stats = [
    { label: 'Total', value: total, color: '#93C5FD' }, { label: 'With Goals', value: withGoals, color: '#A5B4FC' },
    { label: 'Departments', value: depts, color: '#6EE7B7' }, { label: 'Goals', value: empGoals.length, color: '#93C5FD' },
    { label: 'Completed', value: completed, color: '#6EE7B7' }, { label: 'Completion', value: `${compRate.toFixed(1)}%`, color: compRate >= 70 ? '#6EE7B7' : '#FCD34D' },
    { label: 'Avg Progress', value: `${avgP.toFixed(1)}%`, color: avgP >= 70 ? '#6EE7B7' : '#FCD34D' },
  ]
  return (
    <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', borderRadius: 'var(--r-xl)', padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
      <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Team Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 0 }}>
        {stats.map((s, i) => <div key={s.label} style={{ padding: '0 16px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}><div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 3 }}>{s.value}</div><div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div></div>)}
      </div>
    </div>
  )
}

// ── Bulk Upload Goals Modal ───────────────────────────────────
function BulkUploadGoalsModal({ allUsers, onClose, onDone }) {
  const createGoal = useCreateGoal()
  const addToast   = useUIStore(s => s.addToast)
  const fileRef    = useRef()
  const [rows, setRows]         = useState([])
  const [errors, setErrors]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(null)
  const [fileName, setFileName] = useState('')

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['employee_email','goal_title','department','kpi','monthly_target','week1_target','week2_target','week3_target','week4_target','start_date','end_date','month','year','quarter'],
      ['john@company.com','Increase Sales Revenue','SALES','Revenue (INR)','100000','25000','25000','25000','25000','2026-03-01','2026-03-31','3','2026','4'],
      ['jane@company.com','Customer Satisfaction Score','HR','CSAT Score','90','22','22','23','23','2026-03-01','2026-03-31','3','2026','4'],
    ])
    ws['!cols'] = [24,28,12,18,14,12,12,12,12,12,12,6,6,6].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Goals')
    XLSX.writeFile(wb, 'pms_bulk_upload_goals_template.xlsx')
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name); setDone(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb   = XLSX.read(evt.target.result, { type: 'binary' })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const parsed = [], errs = []
      data.forEach((row, i) => {
        const rowNum = i + 2, rowErrors = []
        const empEmail    = String(row.employee_email || '').trim().toLowerCase()
        const goal_title  = String(row.goal_title     || '').trim()
        const department  = String(row.department     || '').trim()
        const kpi         = String(row.kpi            || '').trim()
        const monthlyTgt  = row.monthly_target !== '' ? row.monthly_target : null
        const w1 = row.week1_target !== '' ? row.week1_target : null
        const w2 = row.week2_target !== '' ? row.week2_target : null
        const w3 = row.week3_target !== '' ? row.week3_target : null
        const w4 = row.week4_target !== '' ? row.week4_target : null
        const startDate   = String(row.start_date     || '').trim()
        const endDate     = String(row.end_date       || '').trim()
        const month       = parseInt(row.month)
        const year        = parseInt(row.year)
        const quarter     = parseInt(row.quarter)

        if (!empEmail)              rowErrors.push('employee_email required')
        if (!goal_title)            rowErrors.push('goal_title required')
        if (!monthlyTgt)            rowErrors.push('monthly_target required')
        if (isNaN(month) || month < 1 || month > 12) rowErrors.push('month must be 1-12')
        if (isNaN(year))            rowErrors.push('year required')
        if (isNaN(quarter) || quarter < 1 || quarter > 4) rowErrors.push('quarter must be 1-4')

        const emp = allUsers.find(u => u.email === empEmail)
        if (!emp) rowErrors.push(`Employee not found: ${empEmail}`)

        parsed.push({ _row: rowNum, empEmail, goal_title, department, kpi, monthly_target: monthlyTgt, week1_target: w1 || monthlyTgt, week2_target: w2 || monthlyTgt, week3_target: w3 || monthlyTgt, week4_target: w4 || monthlyTgt, start_date: startDate || null, end_date: endDate || null, month, year, quarter, user_id: emp?.id || null, _errors: rowErrors })
        if (rowErrors.length) errs.push({ row: rowNum, errors: rowErrors })
      })
      setRows(parsed); setErrors(errs)
    }
    reader.readAsBinaryString(file)
  }

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r._errors.length === 0); if (!validRows.length) return
    setLoading(true); let created = 0, skipped = 0
    for (const row of validRows) {
      try {
        await createGoal.mutateAsync({ user_id: row.user_id, year: row.year, quarter: row.quarter, month: row.month, department: row.department, goal_title: row.goal_title, kpi: row.kpi, monthly_target: row.monthly_target, week1_target: row.week1_target, week2_target: row.week2_target, week3_target: row.week3_target, week4_target: row.week4_target, start_date: row.start_date, end_date: row.end_date, status: 'Active', approval_status: 'approved' })
        created++
      } catch { skipped++ }
    }
    setLoading(false); setDone({ created, skipped })
    addToast({ message: `${created} goals created successfully`, type: 'success' })
    onDone()
  }

  const validCount = rows.filter(r => r._errors.length === 0).length
  const invalidCount = rows.filter(r => r._errors.length > 0).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileSpreadsheet size={16} color={P.blue} /></div>
            <div><span className="modal-title">Bulk Upload Goals</span><div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 1 }}>Upload goals for multiple employees at once</div></div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Step 1 */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 3 }}>Step 1 — Download the template</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Columns: employee_email, goal_title, department, kpi, monthly_target, week1-4_target, start_date, end_date, month, year, quarter</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={downloadTemplate}><Download size={13} /> Download Template</button>
            </div>
          </div>
          {/* Step 2 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10 }}>Step 2 — Upload your filled Excel file</div>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }) }}>
              <Upload size={28} color="var(--text-4)" style={{ margin: '0 auto 10px' }} />
              {fileName ? <div style={{ fontWeight: 600, color: P.blue }}>{fileName}</div> : <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Click to browse or drag & drop Excel file</div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: 6 }}>Supports .xlsx and .xls</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          {/* Preview */}
          {rows.length > 0 && !done && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>{rows.length} rows found</span>
                {validCount > 0 && <span style={{ background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>✓ {validCount} valid</span>}
                {invalidCount > 0 && <span style={{ background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99 }}>✕ {invalidCount} errors</span>}
              </div>
              {errors.length > 0 && (
                <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 'var(--r-lg)', padding: '14px 16px', marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: P.red, marginBottom: 8 }}>Issues — these rows will be skipped:</div>
                  {errors.map(e => <div key={e.row} style={{ fontSize: '0.78rem', color: '#7F1D1D', marginBottom: 4 }}><strong>Row {e.row}:</strong> {e.errors.join(' · ')}</div>)}
                </div>
              )}
              <div style={{ overflowX: 'auto', maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                <table style={{ minWidth: 700 }}>
                  <thead><tr><th>Row</th><th>Employee</th><th>Goal Title</th><th>Dept</th><th>Target</th><th>Month/Year</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r._row} style={{ background: r._errors.length ? '#FFF5F5' : '' }}>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{r._row}</td>
                        <td style={{ fontSize: '0.82rem' }}>{r.empEmail}</td>
                        <td style={{ fontWeight: 600, maxWidth: 180 }}><div className="truncate">{r.goal_title}</div></td>
                        <td style={{ fontSize: '0.8rem' }}>{r.department || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{r.monthly_target}</td>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{r.month}/{r.year} Q{r.quarter}</td>
                        <td>{r._errors.length > 0 ? <span style={{ color: P.red, fontSize: '0.75rem', fontWeight: 600 }}>✕ Error</span> : <span style={{ color: P.green, fontSize: '0.75rem', fontWeight: 600 }}>✓ Ready</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {done && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 12 }}>Upload Complete</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <div style={{ background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '1rem', padding: '10px 20px', borderRadius: 10 }}>✓ {done.created} goals created</div>
                {done.skipped > 0 && <div style={{ background: '#FEE2E2', color: '#991B1B', fontWeight: 700, fontSize: '1rem', padding: '10px 20px', borderRadius: 10 }}>✕ {done.skipped} skipped</div>}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
          {!done && validCount > 0 && <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size={14} /> : <><Upload size={13} /> Upload {validCount} Goal{validCount !== 1 ? 's' : ''}</>}</button>}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmployeesPage() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [tabIndex,   setTabIndex]   = useState(0)
  const [search,     setSearch]     = useState('')
  const [teamDrawer, setTeamDrawer] = useState(null)
  const [viewMode,   setViewMode]   = useState('grid')
  const [showUpload, setShowUpload] = useState(false)

  const { data: allUsers = [], isLoading, refetch } = useAllUsers()
  const { data: allGoals = [] }                      = useAllGoals()

  const tabs       = ROLE_TABS[user.role] || []
  const currentTab = tabs[tabIndex]

  const displayUsers = useMemo(() => {
    if (!currentTab) return []
    let list = currentTab.mine
      ? allUsers.filter(u => u.manager_id === user.id)
      : allUsers.filter(u => currentTab.roles?.includes(u.role))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.department||'').toLowerCase().includes(q))
    }
    return list
  }, [allUsers, currentTab, user.id, search])

  const usersWithTeam = new Set(allUsers.filter(u => u.manager_id).map(u => u.manager_id))

  if (!tabs.length) return <div className="card card-body"><EmptyState title="No team view available" description="Your role does not have a team view configured" /></div>

  return (
    <div>
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{user.role} · People Management</div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 4px' }}>{user.role === 'Manager' ? 'My Team' : 'Team Overview'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0 }}>Manage and track performance across your organisation</p>
          </div>
          {/* Bulk Upload Goals — visible to Admin, HR, CMD, VP */}
          {['Admin','HR','CMD','VP'].includes(user.role) && (
            <button className="btn btn-sm" onClick={() => setShowUpload(true)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', alignSelf: 'flex-start', flexShrink: 0 }}>
              <FileSpreadsheet size={14} /> Bulk Upload Goals
            </button>
          )}
        </div>
      </div>

      <OrgBar users={displayUsers} goals={allGoals} />

      {tabs.length > 1 && (
        <div className="tabs-wrap mb-5">
          {tabs.map((t, i) => <button key={i} className={`tab-btn${tabIndex === i ? ' active' : ''}`} onClick={() => { setTabIndex(i); setSearch(''); setTeamDrawer(null) }}>{t.label}</button>)}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-4)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 34 }} placeholder="Search name, email or department…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{displayUsers.length} member{displayUsers.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 3, gap: 2 }}>
          {[{ key: 'grid', label: 'Grid' }, { key: 'list', label: 'List' }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === v.key ? 'var(--surface)' : 'transparent', color: viewMode === v.key ? 'var(--primary)' : 'var(--text-3)', fontWeight: viewMode === v.key ? 700 : 500, fontSize: '0.78rem', boxShadow: viewMode === v.key ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}>{v.label}</button>
          ))}
        </div>
      </div>

      {teamDrawer && <TeamDrawer manager={teamDrawer} allUsers={allUsers} goals={allGoals} onViewGoals={(emp) => navigate(`/employees/${emp.id}/goals`)} onClose={() => setTeamDrawer(null)} />}

      {isLoading ? (
        <div className="emp-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 'var(--r-xl)' }} />)}</div>
      ) : displayUsers.length === 0 ? (
        <div className="card card-body"><EmptyState title="No members found" description={search ? 'Try adjusting your search' : 'No users in this category yet'} /></div>
      ) : viewMode === 'grid' ? (
        <div className="emp-grid">
          {displayUsers.map(emp => <EmployeeCard key={emp.id} emp={emp} goals={allGoals} onViewGoals={() => navigate(`/employees/${emp.id}/goals`)} onViewTeam={() => setTeamDrawer(emp)} hasTeam={usersWithTeam.has(emp.id)} />)}
        </div>
      ) : (
        <div className="card"><div style={{ overflowX: 'auto' }}><table>
          <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Goals</th><th>Completed</th><th>Avg Progress</th><th>Completion Rate</th><th></th></tr></thead>
          <tbody>
            {displayUsers.map(emp => {
              const empGoals = allGoals.filter(g => g.user_id === emp.id)
              const completed = empGoals.filter(g => g.status === 'Completed').length
              const withP = empGoals.filter(g => g.monthly_achievement != null)
              const avgP = withP.length ? withP.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / withP.length : 0
              const compRate = empGoals.length ? (completed / empGoals.length * 100) : 0
              const avatarColors = [P.blue, P.violet, P.green, '#0891B2', P.amber, P.indigo]
              const avatarColor = avatarColors[emp.name.charCodeAt(0) % avatarColors.length]
              return (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, color: '#fff', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{emp.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {emp.name}
                          {emp?.is_active === false && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', padding: '1px 5px', borderRadius: 99, textTransform: 'uppercase', flexShrink: 0 }}>Left</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{emp.designation||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={emp.role} /></td>
                  <td style={{ fontSize: '0.82rem' }}>{emp.department||'—'}</td>
                  <td style={{ fontWeight: 700 }}>{empGoals.length}</td>
                  <td><span className="badge badge-green">{completed}</span></td>
                  <td style={{ minWidth: 150 }}><ProgressBar value={avgP} size="h6" /><span className="text-sm text-muted">{avgP.toFixed(1)}%</span></td>
                  <td style={{ minWidth: 140 }}><ProgressBar value={compRate} size="h6" /><span className="text-sm text-muted">{compRate.toFixed(1)}%</span></td>
                  <td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-xs btn-primary" onClick={() => navigate(`/employees/${emp.id}/goals`)}><Target size={11} /> Goals</button>{usersWithTeam.has(emp.id) && <button className="btn btn-xs btn-secondary" onClick={() => setTeamDrawer(emp)}><Users size={11} /> Team</button>}</div></td>
                </tr>
              )
            })}
          </tbody>
        </table></div></div>
      )}

      {showUpload && <BulkUploadGoalsModal allUsers={allUsers} onClose={() => setShowUpload(false)} onDone={() => { refetch(); setShowUpload(false) }} />}
    </div>
  )
}