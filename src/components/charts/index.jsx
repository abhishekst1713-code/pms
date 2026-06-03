import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { MONTH_SHORT } from '../../lib/constants'

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#7C3AED', '#06B6D4']

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: 'var(--shadow)',
}

/* ─── Status Distribution Donut ─── */
export function StatusPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={60} outerRadius={90}
          dataKey="value"
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/* ─── Monthly Trend Bar ─── */
export function MonthlyTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="target" name="Target" fill="#DBEAFE" radius={[4, 4, 0, 0]} />
        <Bar dataKey="achievement" name="Achievement" fill="#2563EB" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── Progress Trend Line ─── */
export function ProgressTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `${v.toFixed(1)}%`} />
        <Legend iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="completion" name="Completion Rate" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="progress" name="Avg Progress" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ─── Department Bar ─── */
export function DeptBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fill: 'var(--text-2)' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `${v.toFixed(1)}%`} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="completion" name="Completion %" fill="#2563EB" radius={[0, 4, 4, 0]} />
        <Bar dataKey="progress" name="Avg Progress %" fill="#10B981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─── Gauge ring ─── */
export function GaugeChart({ value, label }) {
  const c = value >= 80 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444'
  const pct = Math.min(100, value)
  const r = 54, cx = 70, cy = 70
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={14} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={c} strokeWidth={14}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.8s var(--ease)' }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="var(--text)">{value.toFixed(0)}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="var(--text-3)">{label}</text>
      </svg>
    </div>
  )
}

/* ─── Weekly Bars for month view ─── */
export function WeeklyBarChart({ goals }) {
  const data = [1, 2, 3, 4].map(w => ({
    week: `W${w}`,
    target: goals.reduce((a, g) => a + (g[`week${w}_target`] || 0), 0),
    achievement: goals.reduce((a, g) => a + (g[`week${w}_achievement`] || 0), 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="target" name="Target" fill="#DBEAFE" radius={[4, 4, 0, 0]} />
        <Bar dataKey="achievement" name="Achievement" fill="#2563EB" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
