"use client"

/**
 * components/ingestion-panel.tsx
 *
 * Collapsible panel that:
 *  - Triggers POST /api/ingest and streams NDJSON log lines in real time
 *  - Shows per-log entries with colour-coded level badges
 *  - Displays a summary card (fetched / written / skipped / pages) when done
 *  - Prevents concurrent runs via the 409 guard on the API
 */

import { useState, useRef, useCallback } from "react"
import { ChevronDown, ChevronUp, Play, RefreshCw, DatabaseZap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { IngestionResult, LogLevel } from "@/lib/ingestion"

// ---------------------------------------------------------------------------
// Types mirroring the streamed NDJSON shape
// ---------------------------------------------------------------------------

interface StreamedLog {
  level: LogLevel
  message: string
  timestamp: string
  meta?: Record<string, unknown>
  result?: IngestionResult
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const levelStyles: Record<LogLevel, string> = {
  info: "bg-secondary text-secondary-foreground",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-destructive/15 text-destructive",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const levelDot: Record<LogLevel, string> = {
  info: "bg-muted-foreground",
  warn: "bg-amber-500",
  error: "bg-destructive",
  success: "bg-emerald-500",
}

function StatusBadge({ status }: { status: "idle" | "running" | "done" | "error" }) {
  const map = {
    idle: "bg-secondary text-secondary-foreground",
    running: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    error: "bg-destructive/15 text-destructive",
  }
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", map[status])}>
      {status === "running" ? "Running…" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IngestionPanel() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [logs, setLogs] = useState<StreamedLog[]>([])
  const [result, setResult] = useState<IngestionResult | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [])

  const appendLog = useCallback(
    (log: StreamedLog) => {
      setLogs((prev) => [...prev, log])
      // Defer scroll so DOM has updated
      setTimeout(scrollToBottom, 30)
    },
    [scrollToBottom],
  )

  const runIngestion = useCallback(async () => {
    setLogs([])
    setResult(null)
    setStatus("running")
    setOpen(true)

    try {
      const res = await fetch("/api/ingest", { method: "POST" })

      if (res.status === 409) {
        appendLog({ level: "warn", message: "An ingestion run is already in progress.", timestamp: new Date().toISOString() })
        setStatus("idle")
        return
      }

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed: StreamedLog = JSON.parse(line)
            appendLog(parsed)
            if (parsed.result) setResult(parsed.result)
          } catch {
            // skip malformed lines
          }
        }
      }

      setStatus((prev) => (prev === "running" ? "done" : prev))
    } catch (err) {
      appendLog({
        level: "error",
        message: `Client error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      })
      setStatus("error")
    }
  }, [appendLog])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header row */}
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 select-none"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
        aria-controls="ingestion-panel-body"
      >
        <div className="flex items-center gap-2.5">
          <DatabaseZap className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Data Ingestion</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={runIngestion}
            disabled={status === "running"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              status === "running"
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {status === "running" ? (
              <>
                <RefreshCw className="size-3 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play className="size-3" />
                {status === "done" || status === "error" ? "Run Again" : "Run Ingestion"}
              </>
            )}
          </button>
          <span className="text-muted-foreground">
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </div>
      </div>

      {/* Collapsible body */}
      <div id="ingestion-panel-body" className={open ? "block" : "hidden"}>
        <div className="border-t border-border">
          {/* Result summary */}
          {result && (
            <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
              {[
                { label: "Fetched", value: result.fetched },
                { label: "Written", value: result.written },
                { label: "Skipped", value: result.skipped },
                { label: "Pages", value: result.pages },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 bg-card px-5 py-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Log stream */}
          <div
            ref={logRef}
            className="h-56 overflow-y-auto bg-muted/30 p-3 font-mono text-[11px] leading-5"
          >
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No logs yet. Press &quot;Run Ingestion&quot; to start.</p>
            ) : (
              <ul className="space-y-0.5">
                {logs.map((log, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 inline-block size-1.5 shrink-0 rounded-full",
                        levelDot[log.level],
                      )}
                    />
                    <span
                      className={cn(
                        "mr-1.5 shrink-0 rounded px-1 py-px text-[10px] font-medium",
                        levelStyles[log.level],
                      )}
                    >
                      {log.level}
                    </span>
                    <span className="break-all text-foreground/80">{log.message}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
