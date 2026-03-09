"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { format } from "date-fns"
import { AnalyticsRecord } from "@/lib/types"

interface MetricLineChartProps {
  records: AnalyticsRecord[]
  category: string
}

interface TooltipPayload {
  payload: { rawDate: Date; value: number }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  category: string
}

export function formatValue(value: number, category: string): string {
  if (category === "Revenue")
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (category === "Latency") return `${value.toFixed(0)} ms`
  if (category === "Conversions") return `${value.toFixed(1)}%`
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
}

function CustomTooltip({ active, payload, category }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { rawDate, value } = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground">{format(rawDate, "HH:mm:ss")}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {formatValue(value, category)}
      </p>
    </div>
  )
}

export function MetricLineChart({ records, category }: MetricLineChartProps) {
  const data = useMemo(
    () =>
      records.map((r) => ({
        time: format(r.collectedAt, "HH:mm:ss"),
        value: parseFloat(r.metric.toFixed(2)),
        rawDate: r.collectedAt,
      })),
    [records]
  )

  const average = useMemo(() => {
    if (!data.length) return 0
    return data.reduce((s, d) => s + d.value, 0) / data.length
  }, [data])

  const tickInterval = Math.max(1, Math.floor(data.length / 8))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{category} over time</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Updates every 3 s</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v, category)}
            width={62}
          />
          <Tooltip
            content={<CustomTooltip category={category} />}
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <ReferenceLine
            y={average}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 3"
            strokeOpacity={0.5}
            label={{
              value: `Avg ${formatValue(average, category)}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--color-muted-foreground)",
              opacity: 0.8,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-chart-line)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-chart-line)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
