"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Activity, FlaskConical } from "lucide-react"
import { useAnalytics } from "@/hooks/use-analytics"
import { StatCards } from "@/components/stat-cards"
import { CategoryFilter } from "@/components/category-filter"
import { MetricLineChart } from "@/components/metric-line-chart"
import { formatValue } from "@/components/metric-line-chart"
import { IngestionPanel } from "@/components/ingestion-panel"

export function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState("Revenue")
  const { records, categories, isMock } = useAnalytics(selectedCategory)

  const lastUpdated = records[records.length - 1]?.collectedAt

  return (
    <div className="min-h-screen bg-background">
      {/* Mock data banner */}
      {isMock && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700">
          <FlaskConical className="size-3.5 shrink-0" />
          <span>
            Running with simulated mock data — add your Firebase env vars to switch to live
            Firestore. See{" "}
            <code className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-[11px]">
              lib/firebase.ts
            </code>{" "}
            for setup instructions.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Activity className="size-4 text-foreground" />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Analytics
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Updated</span>
            <span className="font-medium text-foreground tabular-nums">
              {lastUpdated ? format(lastUpdated, "HH:mm:ss") : "--:--:--"}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Title row */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground text-balance">
              Real-time Metrics
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isMock ? "Simulated data stream" : "Live from Firestore"} — {records.length} records in view
            </p>
          </div>
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* KPI cards */}
        <div className="mb-6">
          <StatCards records={records} category={selectedCategory} />
        </div>

        {/* Line chart */}
        <MetricLineChart records={records} category={selectedCategory} />

        {/* Ingestion panel */}
        <div className="mt-6">
          <IngestionPanel />
        </div>

        {/* Recent records table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Recent Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["ID", "Category", "Metric", "Collected At"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-muted-foreground ${i > 1 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...records]
                  .reverse()
                  .slice(0, 8)
                  .map((record, i) => (
                    <tr
                      key={record.id}
                      className={
                        i === 0
                          ? "bg-chart-line/5 text-foreground"
                          : "border-t border-border text-foreground"
                      }
                    >
                      <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                        {record.id.slice(0, 8)}…
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {record.category}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium">
                        {formatValue(record.metric, record.category)}
                      </td>
                      <td className="px-5 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                        {format(record.collectedAt, "HH:mm:ss")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
