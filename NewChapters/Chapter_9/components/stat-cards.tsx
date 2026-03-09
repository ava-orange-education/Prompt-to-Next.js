"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { ResponsiveContainer, LineChart, Line } from "recharts"
import { cn } from "@/lib/utils"
import { AnalyticsRecord } from "@/lib/types"
import { formatValue } from "@/components/metric-line-chart"

interface StatCardsProps {
  records: AnalyticsRecord[]
  category: string
}

function getDelta(records: AnalyticsRecord[]): number | null {
  if (records.length < 2) return null
  const latest = records[records.length - 1].metric
  const previous = records[records.length - 2].metric
  if (previous === 0) return null
  return ((latest - previous) / previous) * 100
}

export function StatCards({ records, category }: StatCardsProps) {
  const latest = records[records.length - 1]?.metric ?? 0
  const delta = getDelta(records)
  const avg = useMemo(
    () => (records.length ? records.reduce((s, r) => s + r.metric, 0) / records.length : 0),
    [records]
  )
  const peak = useMemo(
    () => (records.length ? Math.max(...records.map((r) => r.metric)) : 0),
    [records]
  )

  // Sparkline data — last 15 points only
  const sparkData = useMemo(
    () => records.slice(-15).map((r, i) => ({ i, v: r.metric })),
    [records]
  )

  const isUp = delta !== null && delta > 0
  const isDown = delta !== null && delta < 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Latest value */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Latest Value
          </p>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              isUp && "bg-emerald-500/10 text-emerald-600",
              isDown && "bg-rose-500/10 text-rose-600",
              !isUp && !isDown && "bg-muted text-muted-foreground"
            )}
          >
            {isUp ? (
              <TrendingUp className="size-3" />
            ) : isDown ? (
              <TrendingDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {delta !== null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%` : "—"}
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
          {formatValue(latest, category)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">vs previous record</p>
        {/* Sparkline */}
        <div className="mt-4 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--color-chart-line)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Window average */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Window Avg
        </p>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
          {formatValue(avg, category)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Across {records.length} data points
        </p>
        <div className="mt-4 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--color-chart-line)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Peak
        </p>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
          {formatValue(peak, category)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Highest in current window</p>
        <div className="mt-4 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--color-chart-line)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
