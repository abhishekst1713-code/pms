import React, { useState, useMemo, useEffect, useRef } from 'react'
import { calcProgress, MONTH_NAMES, MONTH_SHORT } from '../../lib/constants'
import { Download } from 'lucide-react'

// ─── Design tokens (match AnalyticsPage palette) ─────────────────────────────
const P = {
  blue:   '#2563EB',
  green:  '#059669',
  amber:  '#D97706',
  red:    '#DC2626',
  violet: '#7C3AED',
  slate:  '#475569',
  cyan:   '#0891B2',
}

const TIER_CONFIG = [
  { key: 'exceptional',   label: 'Exceptional',        color: '#7C3AED', sigmaLo:  1.04, sigmaHi: Infinity,  pctLabel: 'Top 15%'    },
  { key: 'strong',        label: 'Strong performer',   color: '#2563EB', sigmaLo:  0.39, sigmaHi:  1.04,     pctLabel: '15–35%'     },
  { key: 'solid',         label: 'Solid contributor',  color: '#059669', sigmaLo: -0.39, sigmaHi:  0.39,     pctLabel: 'Middle 30%' },
  { key: 'developing',    label: 'Developing',         color: '#D97706', sigmaLo: -1.04, sigmaHi: -0.39,     pctLabel: '65–85%'     },
  { key: 'atrisk',        label: 'Needs support',      color: '#DC2626', sigmaLo: -Infinity, sigmaHi: -1.04, pctLabel: 'Bottom 15%' },
]

const METRIC_OPTIONS = [
  { value: 'progress',  label: 'Avg Progress',       unit: '%' },
  { value: 'compRate',  label: 'Completion Rate',     unit: '%' },
  { value: 'achRate',   label: 'Achievement Rate',    unit: '%' },
  { value: 'score',     label: 'Performance Score',   unit: 'pts' },
]

const HIGHLIGHT_OPTIONS = [
  { value: 'none',       label: 'No highlight' },
  { value: 'top15',      label: 'Top 15%' },
  { value: 'bottom15',   label: 'Bottom 15%' },
  { value: 'outliers',   label: 'Outliers (>2σ)' },
  { value: 'tiers',      label: 'All tiers' },
]

// ─── Math helpers ─────────────────────────────────────────────────────────────
function normalPDF(x, mu, sigma) {
  if (sigma === 0) return 0
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI))
}

function computeStats(vals) {
  const n = vals.length
  if (n === 0) return { n: 0, mu: 0, sigma: 0, median: 0, skew: 0, min: 0, max: 0, p10: 0, p25: 0, p75: 0, p90: 0 }
  const mu = vals.reduce((a, b) => a + b, 0) / n
  const variance = vals.reduce((a, v) => a + Math.pow(v - mu, 2), 0) / n
  const sigma = Math.sqrt(variance)
  const sorted = [...vals].sort((a, b) => a - b)
  const pct = (p) => {
    const idx = (p / 100) * (n - 1)
    const lo = Math.floor(idx), hi = Math.ceil(idx)
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
  }
  const skewNum = sigma > 0
    ? vals.reduce((a, v) => a + Math.pow((v - mu) / sigma, 3), 0) / n
    : 0
  return {
    n, mu, sigma,
    median: pct(50),
    skew: skewNum,
    min: sorted[0],
    max: sorted[n - 1],
    p10: pct(10), p15: pct(15), p25: pct(25),
    p75: pct(75), p85: pct(85), p90: pct(90),
  }
}

// ─── Per-employee score computation ──────────────────────────────────────────
function buildEmployeeScores(allGoals, allUsers, filterYear, filterMonth, visibleRoles) {
  const scopeUsers = allUsers.filter(u => visibleRoles.includes(u.role))
  return scopeUsers.map(u => {
    const ug = allGoals.filter(g =>
      g.user_id === u.id &&
      g.year === filterYear &&
      (filterMonth === 0 || g.month === filterMonth)
    )
    if (!ug.length) return null

    const wp  = ug.filter(g => g.monthly_achievement != null)
    const avgP = wp.length
      ? wp.reduce((a, g) => a + calcProgress(g.monthly_achievement, g.monthly_target), 0) / wp.length
      : 0
    const compRate = (ug.filter(g => g.status === 'Completed').length / ug.length) * 100
    const tgt = ug.filter(g => !isNaN(parseFloat(g.monthly_target))).reduce((a, g) => a + (parseFloat(g.monthly_target) || 0), 0)
    const ach = ug.filter(g => !isNaN(parseFloat(g.monthly_achievement))).reduce((a, g) => a + (parseFloat(g.monthly_achievement) || 0), 0)
    const achRate  = tgt ? (ach / tgt) * 100 : 0
    const score    = Math.min(100, avgP * 0.5 + compRate * 0.5)

    return {
      userId: u.id,
      name:   u.name,
      dept:   u.department || 'Unassigned',
      role:   u.role,
      goals:  ug.length,
      avgP:   Math.min(100, avgP),
      compRate: Math.min(100, compRate),
      achRate:  Math.min(100, achRate),
      score,
    }
  }).filter(Boolean)
}

function getTierForEmployee(val, st, metric) {
  if (st.sigma === 0) return TIER_CONFIG[2]
  const z = (val - st.mu) / st.sigma
  return TIER_CONFIG.find(t => z >= t.sigmaLo && z < t.sigmaHi) || TIER_CONFIG[2]
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(employees, metricKey, st) {
  const unit = METRIC_OPTIONS.find(m => m.value === metricKey)?.unit || ''
  const rows = [
    ['Name', 'Department', 'Role', 'Goals', 'Value', 'Unit', 'Z-Score', 'Tier', 'Percentile'].join(','),
    ...employees.map(e => {
      const val = e[metricKey]
      const z   = st.sigma > 0 ? ((val - st.mu) / st.sigma).toFixed(2) : '0.00'
      const tier = getTierForEmployee(val, st).label
      const sorted = [...employees].sort((a, b) => a[metricKey] - b[metricKey])
      const rank   = sorted.findIndex(x => x.userId === e.userId)
      const pct    = ((rank / (employees.length - 1)) * 100).toFixed(0)
      return [e.name, e.dept, e.role, e.goals, val.toFixed(1), unit, z, tier, `${pct}%`].join(',')
    })
  ].join('\n')
  const blob = new Blob([rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `bell-curve-${metricKey}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 'var(--r)',
      padding: '12px 14px', minWidth: 0,
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color || 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function TierBadge({ tier }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
      background: tier.color + '18', color: tier.color,
      border: `1px solid ${tier.color}30`,
    }}>
      {tier.label}
    </span>
  )
}

// ─── Canvas bell curve renderer ───────────────────────────────────────────────
function useBellCanvas(canvasRef, employees, metricKey, bins, bands, highlight, dept) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W   = canvas.offsetWidth
    const H   = canvas.offsetHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const filtered = dept === 'all' ? employees : employees.filter(e => e.dept === dept)
    if (!filtered.length) {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'var(--text-3, #94a3b8)'
      ctx.font = '13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No data for selected filters', W / 2, H / 2)
      return
    }

    const vals = filtered.map(e => e[metricKey])
    const st   = computeStats(vals)

    // layout
    const pad  = { top: 28, right: 24, bottom: 52, left: 44 }
    const cW   = W - pad.left - pad.right
    const cH   = H - pad.top  - pad.bottom

    // domain
    const xMin = Math.max(0,   st.mu - Math.max(bands + 1, 2) * st.sigma - 4)
    const xMax = Math.min(100, st.mu + Math.max(bands + 1, 2) * st.sigma + 4)
    const xRange = xMax - xMin || 1

    // histogram bins
    const binW   = (xMax - xMin) / bins
    const counts = Array(bins).fill(0)
    vals.forEach(v => {
      let b = Math.floor((v - xMin) / binW)
      b = Math.max(0, Math.min(bins - 1, b))
      counts[b]++
    })
    const maxCount = Math.max(...counts, 1)

    // normal curve Y-scaling: peak of curve scaled to maxCount
    const curvePoints = 200
    const curveStep   = xRange / curvePoints
    const curveY      = Array.from({ length: curvePoints + 1 }, (_, i) =>
      normalPDF(xMin + i * curveStep, st.mu, st.sigma || 0.001)
    )
    const peakCurve = Math.max(...curveY, 0.001)
    const scaleY    = (y) => (y / peakCurve) * maxCount

    // helpers
    const toX = v => pad.left + ((v - xMin) / xRange) * cW
    const toY = v => pad.top  + cH - (v / maxCount) * cH

    ctx.clearRect(0, 0, W, H)

    // ── σ bands ──────────────────────────────────────────────────
    const bandDefs = [
      { s: 1, fill: 'rgba(5,150,105,0.06)',  stroke: 'rgba(5,150,105,0.25)'  },
      { s: 2, fill: 'rgba(217,119,6,0.06)',  stroke: 'rgba(217,119,6,0.25)'  },
      { s: 3, fill: 'rgba(220,38,38,0.06)',  stroke: 'rgba(220,38,38,0.25)'  },
    ]
    for (let s = Math.min(bands, 3); s >= 1; s--) {
      const lo = Math.max(xMin, st.mu - s * st.sigma)
      const hi = Math.min(xMax, st.mu + s * st.sigma)
      const bd = bandDefs[s - 1]
      ctx.fillStyle = bd.fill
      ctx.fillRect(toX(lo), pad.top, toX(hi) - toX(lo), cH)
      // dashed lines
      ;[lo, hi].forEach(xv => {
        ctx.beginPath()
        ctx.setLineDash([4, 3])
        ctx.strokeStyle = bd.stroke
        ctx.lineWidth   = 1
        ctx.moveTo(toX(xv), pad.top)
        ctx.lineTo(toX(xv), pad.top + cH)
        ctx.stroke()
        ctx.setLineDash([])
      })
      // σ label
      ctx.fillStyle   = bd.stroke.replace('0.25', '0.9')
      ctx.font        = '9px system-ui'
      ctx.textAlign   = 'center'
      ctx.fillText(`-${s}σ`, toX(lo), pad.top + cH + 14)
      ctx.fillText(`+${s}σ`, toX(hi), pad.top + cH + 14)
    }

    // ── top/bottom 15% shading ────────────────────────────────────
    if (highlight === 'top15' || highlight === 'bottom15' || highlight === 'tiers') {
      const t15 = st.p85, b15 = st.p15
      if (highlight !== 'bottom15') {
        ctx.fillStyle = 'rgba(37,99,235,0.10)'
        ctx.fillRect(toX(Math.max(xMin, t15)), pad.top, toX(xMax) - toX(Math.max(xMin, t15)), cH)
      }
      if (highlight !== 'top15') {
        ctx.fillStyle = 'rgba(220,38,38,0.10)'
        ctx.fillRect(toX(xMin), pad.top, toX(Math.min(xMax, b15)) - toX(xMin), cH)
      }
    }

    // ── histogram bars ────────────────────────────────────────────
    for (let i = 0; i < bins; i++) {
      const bLo  = xMin + i * binW
      const bHi  = bLo + binW
      const bMid = (bLo + bHi) / 2
      const bx   = toX(bLo)
      const bxR  = toX(bHi)
      const by   = toY(counts[i])
      const bH2  = pad.top + cH - by

      // colour logic
      let fill = 'rgba(71,85,105,0.25)'
      let stroke = 'rgba(71,85,105,0.4)'

      if (highlight === 'tiers') {
        const z = st.sigma > 0 ? (bMid - st.mu) / st.sigma : 0
        const tier = TIER_CONFIG.find(t => z >= t.sigmaLo && z < t.sigmaHi) || TIER_CONFIG[2]
        fill   = tier.color + '55'
        stroke = tier.color + 'aa'
      } else if (highlight === 'top15' && bMid >= st.p85) {
        fill = P.blue + '88'; stroke = P.blue
      } else if (highlight === 'bottom15' && bMid <= st.p15) {
        fill = P.red + '88'; stroke = P.red
      } else if (highlight === 'outliers' && (bMid < st.mu - 2 * st.sigma || bMid > st.mu + 2 * st.sigma)) {
        fill = P.amber + '88'; stroke = P.amber
      } else {
        const z = st.sigma > 0 ? Math.abs((bMid - st.mu) / st.sigma) : 0
        fill   = z <= 1 ? 'rgba(5,150,105,0.35)' : z <= 2 ? 'rgba(217,119,6,0.25)' : 'rgba(220,38,38,0.22)'
        stroke = z <= 1 ? 'rgba(5,150,105,0.7)'  : z <= 2 ? 'rgba(217,119,6,0.6)'  : 'rgba(220,38,38,0.55)'
      }

      const r = 3
      ctx.beginPath()
      ctx.moveTo(bx + r, by)
      ctx.lineTo(bxR - r, by)
      ctx.quadraticCurveTo(bxR, by, bxR, by + r)
      ctx.lineTo(bxR, by + bH2)
      ctx.lineTo(bx,  by + bH2)
      ctx.lineTo(bx,  by + r)
      ctx.quadraticCurveTo(bx, by, bx + r, by)
      ctx.closePath()
      ctx.fillStyle   = fill
      ctx.strokeStyle = stroke
      ctx.lineWidth   = 0.8
      ctx.fill()
      ctx.stroke()

      // count label on bar
      if (counts[i] > 0 && (bxR - bx) > 16) {
        ctx.fillStyle = 'var(--text-3, #64748b)'
        ctx.font      = '9px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(counts[i], (bx + bxR) / 2, by - 4)
      }
    }

    // ── normal distribution curve ─────────────────────────────────
    ctx.beginPath()
    ctx.setLineDash([])
    ctx.strokeStyle = P.blue
    ctx.lineWidth   = 2.5
    for (let i = 0; i <= curvePoints; i++) {
      const xv = xMin + i * curveStep
      const yv = toY(scaleY(curveY[i]))
      i === 0 ? ctx.moveTo(toX(xv), yv) : ctx.lineTo(toX(xv), yv)
    }
    ctx.stroke()

    // ── mean line ─────────────────────────────────────────────────
    ctx.beginPath()
    ctx.setLineDash([5, 3])
    ctx.strokeStyle = P.blue
    ctx.lineWidth   = 1.5
    ctx.moveTo(toX(st.mu), pad.top)
    ctx.lineTo(toX(st.mu), pad.top + cH)
    ctx.stroke()
    ctx.setLineDash([])

    // mean label
    ctx.fillStyle   = '#fff'
    const muLblW    = 58, muLblH = 18
    const muLblX    = Math.min(toX(st.mu) - muLblW / 2, W - pad.right - muLblW)
    ctx.beginPath()
    ctx.roundRect(muLblX, pad.top - 2, muLblW, muLblH, 4)
    ctx.fillStyle = P.blue
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font      = '10px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(`μ = ${st.mu.toFixed(1)}`, muLblX + muLblW / 2, pad.top + 11)

    // ── median line ───────────────────────────────────────────────
    if (Math.abs(st.median - st.mu) > 0.5) {
      ctx.beginPath()
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = P.violet
      ctx.lineWidth   = 1.5
      ctx.moveTo(toX(st.median), pad.top + 20)
      ctx.lineTo(toX(st.median), pad.top + cH)
      ctx.stroke()
      ctx.setLineDash([])
      // median label
      ctx.beginPath()
      const mdW = 62, mdH = 18
      const mdX = Math.min(toX(st.median) - mdW / 2, W - pad.right - mdW)
      ctx.roundRect(mdX, pad.top + 22, mdW, mdH, 4)
      ctx.fillStyle = P.violet
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font      = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`Md = ${st.median.toFixed(1)}`, mdX + mdW / 2, pad.top + 34)
    }

    // ── X axis ────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth   = 1
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top + cH)
    ctx.lineTo(pad.left + cW, pad.top + cH)
    ctx.stroke()

    // X ticks
    const tickCount = 6
    for (let i = 0; i <= tickCount; i++) {
      const v  = xMin + (i / tickCount) * xRange
      const tx = toX(v)
      ctx.fillStyle = 'var(--text-3, #94a3b8)'
      ctx.font      = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`${v.toFixed(0)}`, tx, pad.top + cH + 14)
    }

    // Y ticks
    const yStep = Math.ceil(maxCount / 5)
    for (let i = 0; i <= 5; i++) {
      const v  = i * yStep
      const ty = toY(v)
      if (ty < pad.top) continue
      ctx.fillStyle = 'var(--text-3, #94a3b8)'
      ctx.font      = '10px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(v, pad.left - 6, ty + 3)
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(148,163,184,0.12)'
      ctx.lineWidth   = 1
      ctx.moveTo(pad.left, ty)
      ctx.lineTo(pad.left + cW, ty)
      ctx.stroke()
    }

    // axis labels
    ctx.fillStyle = 'var(--text-3, #94a3b8)'
    ctx.font      = '11px system-ui'
    ctx.textAlign = 'center'
    const metricLabel = METRIC_OPTIONS.find(m => m.value === metricKey)?.label || ''
    ctx.fillText(metricLabel, pad.left + cW / 2, H - 4)
    ctx.save()
    ctx.translate(11, pad.top + cH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Employees', 0, 0)
    ctx.restore()
  })
}

// ─── Employee dot plot (scatter by value) ─────────────────────────────────────
function EmployeeDotRow({ employees, metricKey, st, highlight }) {
  if (!employees.length) return null
  const sorted = [...employees].sort((a, b) => a[metricKey] - b[metricKey])
  const xMin = Math.max(0,   st.mu - 3.5 * st.sigma - 4)
  const xMax = Math.min(100, st.mu + 3.5 * st.sigma + 4)
  const xRange = xMax - xMin || 1

  return (
    <div style={{ position: 'relative', height: 36, marginTop: 4 }}>
      {/* baseline */}
      <div style={{ position: 'absolute', top: 17, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
      {sorted.map(e => {
        const val  = e[metricKey]
        const pct  = ((val - xMin) / xRange) * 100
        const tier = getTierForEmployee(val, st)
        const z    = st.sigma > 0 ? (val - st.mu) / st.sigma : 0
        let color  = tier.color
        let size   = 8
        if (highlight === 'top15'    && val < st.p85)   { color = 'var(--border)'; size = 6 }
        if (highlight === 'bottom15' && val > st.p15)   { color = 'var(--border)'; size = 6 }
        if (highlight === 'outliers' && Math.abs(z) < 2){ color = 'var(--border)'; size = 6 }
        return (
          <div key={e.userId}
            title={`${e.name} — ${val.toFixed(1)}`}
            style={{
              position: 'absolute',
              left: `${Math.min(98, Math.max(0, pct))}%`,
              top: '50%', transform: 'translate(-50%,-50%)',
              width: size, height: size, borderRadius: '50%',
              background: color, border: '1px solid #fff',
              cursor: 'default', transition: 'all 0.15s',
              zIndex: highlight !== 'none' && color !== 'var(--border)' ? 2 : 1,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Tier table ───────────────────────────────────────────────────────────────
function TierBreakdown({ employees, metricKey, st }) {
  const unit = METRIC_OPTIONS.find(m => m.value === metricKey)?.unit || ''
  const tiers = TIER_CONFIG.map(t => {
    const members = employees.filter(e => {
      const z = st.sigma > 0 ? (e[metricKey] - st.mu) / st.sigma : 0
      return z >= t.sigmaLo && z < t.sigmaHi
    })
    const avg = members.length
      ? members.reduce((a, e) => a + e[metricKey], 0) / members.length
      : 0
    return { ...t, members, avg }
  })
  const maxCount = Math.max(...tiers.map(t => t.members.length), 1)

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr 60px 70px 70px',
        fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r) var(--r) 0 0',
      }}>
        <div>Tier</div><div>Distribution</div><div>Count</div><div>% Team</div><div>Avg</div>
      </div>
      {tiers.map((t, i) => (
        <div key={t.key} style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 60px 70px 70px',
          padding: '11px 16px', alignItems: 'center',
          borderBottom: i < tiers.length - 1 ? '1px solid var(--border)' : 'none',
          background: 'var(--surface)',
          borderRadius: i === tiers.length - 1 ? '0 0 var(--r) var(--r)' : 0,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: t.color }}>{t.label}</div>
          <div style={{ paddingRight: 16 }}>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${(t.members.length / maxCount) * 100}%`,
                background: t.color, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.members.length}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            {employees.length ? ((t.members.length / employees.length) * 100).toFixed(0) : 0}%
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: t.color }}>
            {t.members.length ? `${t.avg.toFixed(1)}${unit}` : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Employee list for selected tier ─────────────────────────────────────────
function TierEmployeeList({ employees, metricKey, st, unit }) {
  const [selectedTier, setSelectedTier] = useState(null)
  const tierMembers = selectedTier
    ? employees.filter(e => {
        const z = st.sigma > 0 ? (e[metricKey] - st.mu) / st.sigma : 0
        const t = TIER_CONFIG.find(t => t.key === selectedTier)
        return t && z >= t.sigmaLo && z < t.sigmaHi
      })
    : []

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Drill into tier
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TIER_CONFIG.map(t => (
          <button key={t.key}
            onClick={() => setSelectedTier(selectedTier === t.key ? null : t.key)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
              border: `1px solid ${t.color}40`,
              background: selectedTier === t.key ? t.color : t.color + '15',
              color: selectedTier === t.key ? '#fff' : t.color,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {selectedTier && tierMembers.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
            padding: '7px 14px', fontSize: '0.65rem', fontWeight: 700,
            color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
            background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
          }}>
            <div>Employee</div><div>Department</div><div>Score</div><div>Z-Score</div>
          </div>
          {tierMembers.sort((a, b) => b[metricKey] - a[metricKey]).map((e, i) => {
            const z = st.sigma > 0 ? ((e[metricKey] - st.mu) / st.sigma).toFixed(2) : '0.00'
            return (
              <div key={e.userId} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
                padding: '9px 14px', fontSize: '0.82rem',
                borderBottom: i < tierMembers.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'var(--surface)',
              }}>
                <div style={{ fontWeight: 600 }}>{e.name}</div>
                <div style={{ color: 'var(--text-3)' }}>{e.dept}</div>
                <div style={{ fontWeight: 700 }}>{e[metricKey].toFixed(1)}{unit}</div>
                <div style={{ color: parseFloat(z) >= 0 ? P.green : P.red, fontWeight: 700 }}>
                  {parseFloat(z) >= 0 ? '+' : ''}{z}σ
                </div>
              </div>
            )
          })}
        </div>
      )}
      {selectedTier && tierMembers.length === 0 && (
        <div style={{ padding: '16px', color: 'var(--text-3)', fontSize: '0.82rem' }}>No employees in this tier.</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function BellCurveChart({
  allGoals = [],
  allUsers = [],
  filterYear,
  visibleRoles = [],
  viewMode = 'org',
  viewUserId,
}) {
  const canvasRef = useRef(null)

  const today    = new Date()
  const curYear  = filterYear || today.getFullYear()

  const [metric,    setMetric]    = useState('score')
  const [filterMo,  setFilterMo]  = useState(0)
  const [bins,      setBins]      = useState(12)
  const [bands,     setBands]     = useState(2)
  const [highlight, setHighlight] = useState('tiers')
  const [deptFilter,setDeptFilter]= useState('all')
  const [activeTab, setActiveTab] = useState('curve')

  // ── Compute employee scores ────────────────────────────────────
  const employees = useMemo(() =>
    buildEmployeeScores(allGoals, allUsers, curYear, filterMo, visibleRoles),
    [allGoals, allUsers, curYear, filterMo, visibleRoles]
  )

  const filtered = useMemo(() =>
    deptFilter === 'all' ? employees : employees.filter(e => e.dept === deptFilter),
    [employees, deptFilter]
  )

  const vals = useMemo(() => filtered.map(e => e[metric]), [filtered, metric])
  const st   = useMemo(() => computeStats(vals), [vals])

  const depts = useMemo(() =>
    ['all', ...Array.from(new Set(employees.map(e => e.dept))).sort()],
    [employees]
  )

  const unit = METRIC_OPTIONS.find(m => m.value === metric)?.unit || ''

  // ── Canvas draw ───────────────────────────────────────────────
  useBellCanvas(canvasRef, filtered, metric, bins, bands, highlight, 'all')

  // redraw on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (canvasRef.current) {
        // force re-render by touching state
        setActiveTab(t => t)
      }
    })
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement)
    return () => ro.disconnect()
  }, [])

  // ── Derived headline stats ────────────────────────────────────
  const top15    = filtered.filter(e => e[metric] >= st.p85)
  const bottom15 = filtered.filter(e => e[metric] <= st.p15)
  const isNormal = Math.abs(st.skew) < 0.5

  if (!employees.length) {
    return (
      <div className="card card-body" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
        No employee data available for the selected period.
      </div>
    )
  }

  return (
    <div>
      {/* ── Controls ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '16px 20px', marginBottom: 18,
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
      }}>
        {/* Metric */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Metric
          </div>
          <select className="select select-sm" value={metric} onChange={e => setMetric(e.target.value)} style={{ minWidth: 170 }}>
            {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Month */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Month
          </div>
          <select className="select select-sm" value={filterMo} onChange={e => setFilterMo(+e.target.value)} style={{ minWidth: 130 }}>
            <option value={0}>All months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{MONTH_NAMES[i + 1]}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Department
          </div>
          <select className="select select-sm" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ minWidth: 140 }}>
            {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>)}
          </select>
        </div>

        {/* Highlight */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Highlight
          </div>
          <select className="select select-sm" value={highlight} onChange={e => setHighlight(e.target.value)} style={{ minWidth: 160 }}>
            {HIGHLIGHT_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
        </div>

        {/* Bins */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Bins — {bins}
          </div>
          <input type="range" min={5} max={20} step={1} value={bins}
            onChange={e => setBins(+e.target.value)}
            style={{ width: 90, display: 'block', marginTop: 6 }}
          />
        </div>

        {/* Std Dev bands */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            σ bands — ±{bands}
          </div>
          <input type="range" min={1} max={3} step={1} value={bands}
            onChange={e => setBands(+e.target.value)}
            style={{ width: 70, display: 'block', marginTop: 6 }}
          />
        </div>

        {/* Export */}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-sm btn-secondary"
            onClick={() => exportCSV(filtered, metric, st)}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Employees"  value={st.n}                        color={P.slate}  />
        <StatCard label="Mean (μ)"   value={`${st.mu.toFixed(1)}${unit}`} color={P.blue}  />
        <StatCard label="Std Dev (σ)" value={`${st.sigma.toFixed(1)}${unit}`} color={P.cyan} />
        <StatCard label="Median"     value={`${st.median.toFixed(1)}${unit}`} color={P.violet} />
        <StatCard label="Skewness"   value={st.skew.toFixed(2)}
          sub={isNormal ? 'Near-normal' : st.skew > 0 ? 'Right-skewed' : 'Left-skewed'}
          color={isNormal ? P.green : P.amber} />
        <StatCard label="Top 15%"    value={top15.length}
          sub={`≥ ${st.p85.toFixed(1)}${unit}`}  color={P.blue}  />
        <StatCard label="Bottom 15%" value={bottom15.length}
          sub={`≤ ${st.p15.toFixed(1)}${unit}`}  color={P.red}   />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="tabs-wrap mb-4">
        {[
          { key: 'curve',  label: 'Bell Curve'        },
          { key: 'tiers',  label: 'Performance Tiers' },
          { key: 'detail', label: 'Employee Detail'   },
        ].map(t => (
          <button key={t.key}
            className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Bell Curve tab ────────────────────────────────────── */}
      {activeTab === 'curve' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Performance Distribution — {curYear}{filterMo ? ` · ${MONTH_NAMES[filterMo]}` : ''}</div>
              <div className="card-subtitle">
                {filtered.length} employees · {METRIC_OPTIONS.find(m => m.value === metric)?.label}
                {deptFilter !== 'all' ? ` · ${deptFilter}` : ''}
              </div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {/* Canvas */}
            <div style={{ position: 'relative', width: '100%', height: 320 }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>

            {/* Employee dot strip */}
            <EmployeeDotRow
              employees={filtered}
              metricKey={metric}
              st={st}
              highlight={highlight}
            />

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {/* σ band legend */}
              {[1, 2, 3].slice(0, bands).map((s, i) => {
                const colors = [P.green, P.amber, P.red]
                const pcts   = ['68.3%', '95.4%', '99.7%']
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i], opacity: 0.7 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>±{s}σ · {pcts[i]}</span>
                  </div>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 24, height: 2, background: P.blue, borderTop: '2px dashed ' + P.blue }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Mean</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 24, height: 2, borderTop: '2px dashed ' + P.violet }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Median</span>
              </div>
              {highlight === 'top15' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: P.blue, opacity: 0.5 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Top 15%</span>
                </div>
              )}
              {highlight === 'bottom15' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: P.red, opacity: 0.5 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Bottom 15%</span>
                </div>
              )}
              {highlight === 'tiers' && TIER_CONFIG.map(t => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tiers tab ─────────────────────────────────────────── */}
      {activeTab === 'tiers' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Performance Tiers — {curYear}</div>
              <div className="card-subtitle">
                Bottom 15% · Developing · Middle 30% · Strong · Top 15% — derived from σ offsets
              </div>
            </div>
          </div>
          <div className="card-body">
            {/* Tier definition pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {TIER_CONFIG.map(t => (
                <div key={t.key} style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: t.color + '15', border: `1px solid ${t.color}30`,
                  fontSize: '0.75rem', fontWeight: 700, color: t.color,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{t.label}</span>
                  <span style={{ fontWeight: 400, opacity: 0.7 }}>{t.pctLabel}</span>
                </div>
              ))}
            </div>
            <TierBreakdown employees={filtered} metricKey={metric} st={st} />
          </div>
        </div>
      )}

      {/* ── Employee detail tab ───────────────────────────────── */}
      {activeTab === 'detail' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Employee Detail</div>
              <div className="card-subtitle">Drill into any tier to see individual employees</div>
            </div>
          </div>
          <div className="card-body">
            <TierEmployeeList employees={filtered} metricKey={metric} st={st} unit={unit} />
          </div>
        </div>
      )}
    </div>
  )
}