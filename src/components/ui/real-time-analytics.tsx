"use client"

import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area,
} from "recharts"

type SeriesKey = "submitted" | "accepted" | "rejected"
type TimeWindow = "this-month" | "last-month" | "this-quarter" | "last-quarter"

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "submitted", label: "Submitted", color: "hsl(222, 100%, 47%)" },
  { key: "accepted", label: "Accepted", color: "hsl(152, 60%, 42%)" },
  { key: "rejected", label: "Rejected", color: "hsl(0, 51%, 44%)" },
]

const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
  { key: "this-quarter", label: "This Quarter" },
  { key: "last-quarter", label: "Last Quarter" },
]

const fmt = (n: number) => `$${n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString()}`

function getQuarterMonths() {
  const now = new Date()
  const qStart = Math.floor(now.getMonth() / 3) * 3 // 0, 3, 6, or 9
  const months: { year: number; month: number }[] = []
  for (let i = 0; i <= now.getMonth() - qStart; i++) {
    months.push({ year: now.getFullYear(), month: qStart + i })
  }
  return months
}

function getLastQuarterMonths() {
  const now = new Date()
  const thisQStart = Math.floor(now.getMonth() / 3) * 3
  const lastQStart = thisQStart - 3
  const year = lastQStart < 0 ? now.getFullYear() - 1 : now.getFullYear()
  const start = lastQStart < 0 ? lastQStart + 12 : lastQStart
  const months: { year: number; month: number }[] = []
  for (let i = 0; i < 3; i++) {
    const m = start + i
    months.push({ year: m > 11 ? year + 1 : year, month: m % 12 })
  }
  return months
}

function generateMultiMonthData(months: { year: number; month: number }[]) {
  const allPoints: { day: string; submitted: number; accepted: number; rejected: number }[] = []
  for (const { year, month } of months) {
    allPoints.push(...generateMonthData(year, month))
  }
  return allPoints
}

function getMonthYear(window: TimeWindow) {
  const now = new Date()
  const offset = window === "this-month" ? 0 : window === "last-month" ? 1 : 0
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function generateMonthData(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth

  let seed = year * 100 + month
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646 }

  const points: { day: string; submitted: number; accepted: number; rejected: number }[] = []
  let sub = 800 + rand() * 600, acc = sub * 0.82, rej = sub * 0.06

  for (let d = 1; d <= lastDay; d++) {
    sub = Math.max(300, sub + (rand() - 0.45) * 200)
    acc = Math.max(200, Math.min(sub * 0.95, acc + (rand() - 0.42) * 180))
    rej = Math.max(10, Math.min(sub * 0.15, rej + (rand() - 0.5) * 30))
    const date = new Date(year, month, d)
    points.push({
      day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      submitted: Math.round(sub),
      accepted: Math.round(acc),
      rejected: Math.round(rej),
    })
  }
  return points
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number; color: string }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg">
      <p className="text-[10px] text-muted-foreground font-medium mb-1.5">{label}</p>
      {payload.map((entry) => {
        const cfg = SERIES.find(s => s.key === entry.dataKey)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{cfg?.label}</span>
            <span className="font-bold text-foreground ml-auto">{fmt(entry.value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function RealTimeAnalytics() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("this-month")
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(new Set(["submitted", "accepted", "rejected"]))

  const { year, month } = getMonthYear(timeWindow)
  const data = useMemo(() => {
    if (timeWindow === "this-quarter") return generateMultiMonthData(getQuarterMonths())
    if (timeWindow === "last-quarter") return generateMultiMonthData(getLastQuarterMonths())
    return generateMonthData(year, month)
  }, [year, month, timeWindow])

  const periodLabel = (() => {
    if (timeWindow === "this-quarter" || timeWindow === "last-quarter") {
      const months = timeWindow === "this-quarter" ? getQuarterMonths() : getLastQuarterMonths()
      const first = new Date(months[0].year, months[0].month)
      const last = new Date(months[months.length - 1].year, months[months.length - 1].month)
      return `${first.toLocaleDateString("en-US", { month: "long" })} – ${last.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
    }
    return new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  })()

  const totals = data.reduce((a, d) => ({
    submitted: a.submitted + d.submitted,
    accepted: a.accepted + d.accepted,
    rejected: a.rejected + d.rejected,
  }), { submitted: 0, accepted: 0, rejected: 0 })

  const acceptanceRate = totals.submitted > 0 ? ((totals.accepted / totals.submitted) * 100).toFixed(1) : "0"

  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) } else next.add(key)
      return next
    })
  }

  const lastDay = data[data.length - 1]

  return (
    <Card className="w-full rounded-2xl shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Claim Volume</p>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {WINDOWS.map(w => (
              <button
                key={w.key}
                onClick={() => setTimeWindow(w.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeWindow === w.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Balance row */}
        <div className="flex items-baseline gap-3 mb-1">
          <h3 className="text-3xl font-extrabold font-display text-foreground tracking-tight">
            {fmt(totals.submitted)}
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-billing-healthy/10 text-billing-healthy">
            <TrendingUp className="h-3 w-3" />
            +{acceptanceRate}%
          </span>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {SERIES.map(s => {
              const isActive = activeSeries.has(s.key)
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  className={`flex items-center gap-1.5 text-xs transition-all ${isActive ? "" : "opacity-30"}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.label}:</span>
                  <span className="font-bold text-foreground">{lastDay ? fmt(lastDay[s.key]) : "—"}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span>High: <span className="font-semibold text-foreground">{fmt(Math.max(...data.map(d => d.submitted)))}</span></span>
            <span>Low: <span className="font-semibold text-foreground">{fmt(Math.min(...data.map(d => d.rejected)))}</span></span>
            <span>Acceptance: <span className="font-semibold text-billing-healthy">{acceptanceRate}%</span></span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                {SERIES.map(s => (
                  <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
                <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.3" />
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                vertical={false}
              />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickMargin={12}
                interval={4}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => fmt(v)}
                tickMargin={8}
                width={50}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.4 }}
              />

              {SERIES.map(s => activeSeries.has(s.key) && (
                <Area
                  key={`area-${s.key}`}
                  type="monotone"
                  dataKey={s.key}
                  fill={`url(#gradient-${s.key})`}
                  stroke="none"
                />
              ))}

              {SERIES.map(s => activeSeries.has(s.key) && (
                <Line
                  key={`line-${s.key}`}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: s.color,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  style={{ filter: "url(#lineShadow)" }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary footer */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {SERIES.map(s => (
            <div key={s.key} className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total {s.label}</p>
              <p className="text-lg font-bold font-display text-foreground">{fmt(totals[s.key])}</p>
            </div>
          ))}
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Acceptance Rate</p>
            <p className="text-lg font-bold font-display text-billing-healthy">{acceptanceRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
