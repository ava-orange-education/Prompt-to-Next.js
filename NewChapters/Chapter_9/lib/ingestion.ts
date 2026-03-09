/**
 * lib/ingestion.ts
 *
 * Core data-ingestion engine.
 *
 * Design principles:
 *  - Each "page" of API results is fetched as a discrete unit with a minimum
 *    1-second gap between requests to respect rate limits.
 *  - HTTP 429 responses are detected, logged, and retried after a back-off
 *    delay (default 10 s, honouring Retry-After when present).
 *  - Firestore writes use set() with { merge: false } only on documents that
 *    do not already exist, preventing duplicates across overlapping ingestion
 *    cycles.
 *  - The caller receives a structured log stream via an async generator so the
 *    API route can forward events to the client in real time.
 */

import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { AnalyticsRecord } from "@/lib/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "warn" | "error" | "success"

export interface IngestionLog {
  level: LogLevel
  message: string
  timestamp: Date
  meta?: Record<string, unknown>
}

export interface PageResult {
  records: Omit<AnalyticsRecord, "id">[]
  nextCursor: string | null
  total: number
}

export interface IngestionOptions {
  /** Base URL of the external API, e.g. "https://api.example.com" */
  apiBaseUrl: string
  /** Maximum records to fetch per page (default: 50) */
  pageSize?: number
  /** Minimum ms to wait between requests (default: 1000) */
  minDelayMs?: number
  /** How many times to retry a rate-limited request (default: 5) */
  maxRetries?: number
  /** Base back-off ms on 429 (default: 10000) */
  rateLimitBackoffMs?: number
  /** Firestore collection to write into (default: "analytics") */
  collection?: string
  /** Optional Bearer token for the external API */
  apiKey?: string
}

export interface IngestionResult {
  fetched: number
  written: number
  skipped: number
  pages: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfter(headers: Headers, fallbackMs: number): number {
  const raw = headers.get("Retry-After")
  if (!raw) return fallbackMs
  const seconds = parseFloat(raw)
  if (!isNaN(seconds)) return seconds * 1000
  const date = new Date(raw).getTime()
  if (!isNaN(date)) return Math.max(date - Date.now(), 1000)
  return fallbackMs
}

// ---------------------------------------------------------------------------
// Step: fetch one page from the external API
// ---------------------------------------------------------------------------

async function fetchPage(
  url: string,
  options: Required<IngestionOptions>,
  logs: IngestionLog[],
  requestStart: number,
): Promise<PageResult> {
  let attempt = 0

  while (attempt <= options.maxRetries) {
    // Enforce minimum delay from the last request start
    const elapsed = Date.now() - requestStart
    const remaining = options.minDelayMs - elapsed
    if (remaining > 0) await sleep(remaining)

    const fetchStart = Date.now()

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (options.apiKey) headers["Authorization"] = `Bearer ${options.apiKey}`

    let res: Response
    try {
      res = await fetch(url, { headers })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logs.push({ level: "error", message: `Network error fetching ${url}: ${msg}`, timestamp: new Date() })
      throw err
    }

    // Rate limited — back off and retry
    if (res.status === 429) {
      attempt++
      const backoff = parseRetryAfter(res.headers, options.rateLimitBackoffMs)
      logs.push({
        level: "warn",
        message: `Rate limited (429) on attempt ${attempt}/${options.maxRetries}. Retrying after ${Math.round(backoff / 1000)}s.`,
        timestamp: new Date(),
        meta: { attempt, backoffMs: backoff, url },
      })
      if (attempt > options.maxRetries) {
        throw new Error(`Exceeded max retries (${options.maxRetries}) due to rate limiting on ${url}`)
      }
      await sleep(backoff)
      continue
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      logs.push({
        level: "error",
        message: `API error ${res.status} fetching ${url}`,
        timestamp: new Date(),
        meta: { status: res.status, body: body.slice(0, 200) },
      })
      throw new Error(`API responded with ${res.status} for ${url}`)
    }

    const json = await res.json()
    const elapsed2 = Date.now() - fetchStart

    logs.push({
      level: "info",
      message: `Fetched page (${json.records?.length ?? 0} records) in ${elapsed2}ms`,
      timestamp: new Date(),
      meta: { url, records: json.records?.length ?? 0, durationMs: elapsed2 },
    })

    return {
      records: (json.records ?? []) as Omit<AnalyticsRecord, "id">[],
      nextCursor: json.nextCursor ?? null,
      total: json.total ?? 0,
    }
  }

  throw new Error("fetchPage: exceeded retry loop without returning")
}

// ---------------------------------------------------------------------------
// Step: write one batch to Firestore (dedup by externalId)
// ---------------------------------------------------------------------------

async function writeBatch(
  records: Omit<AnalyticsRecord, "id">[],
  collectionName: string,
  logs: IngestionLog[],
): Promise<{ written: number; skipped: number }> {
  if (!isFirebaseConfigured || !db) {
    // Mock mode — simulate a write
    logs.push({
      level: "info",
      message: `[Mock] Would write ${records.length} records to Firestore (no Firebase config).`,
      timestamp: new Date(),
    })
    return { written: records.length, skipped: 0 }
  }

  const { collection, doc, getDoc, setDoc, writeBatch: fsWriteBatch } = await import("firebase/firestore")

  const colRef = collection(db, collectionName)

  // Check which IDs already exist to prevent duplicates
  const existsChecks = await Promise.all(
    records.map(async (r) => {
      const id = generateId(r)
      const snap = await getDoc(doc(colRef, id))
      return { id, exists: snap.exists(), record: r }
    }),
  )

  const toWrite = existsChecks.filter((e) => !e.exists)
  const skipped = existsChecks.length - toWrite.length

  if (toWrite.length === 0) {
    logs.push({
      level: "info",
      message: `Batch skipped — all ${records.length} records already exist in Firestore.`,
      timestamp: new Date(),
      meta: { skipped },
    })
    return { written: 0, skipped }
  }

  // Firestore batch writes are limited to 500 ops; chunk if needed
  const BATCH_LIMIT = 490
  let written = 0

  for (let i = 0; i < toWrite.length; i += BATCH_LIMIT) {
    const chunk = toWrite.slice(i, i + BATCH_LIMIT)
    const batch = fsWriteBatch(db)
    for (const { id, record } of chunk) {
      batch.set(doc(colRef, id), {
        category: record.category,
        metric: record.metric,
        collectedAt: record.collectedAt,
      })
    }
    await batch.commit()
    written += chunk.length
  }

  logs.push({
    level: "success",
    message: `Wrote ${written} records to Firestore (skipped ${skipped} duplicates).`,
    timestamp: new Date(),
    meta: { written, skipped },
  })

  return { written, skipped }
}

// ---------------------------------------------------------------------------
// Deterministic ID to enable dedup across ingestion runs
// ---------------------------------------------------------------------------

function generateId(record: Omit<AnalyticsRecord, "id">): string {
  const ts =
    record.collectedAt instanceof Date
      ? record.collectedAt.getTime()
      : new Date(record.collectedAt).getTime()
  return `${record.category}-${ts}-${record.metric}`.replace(/[^a-zA-Z0-9-]/g, "_")
}

// ---------------------------------------------------------------------------
// Orchestrator: page-through the API and write batches
// ---------------------------------------------------------------------------

export async function* runIngestion(
  opts: IngestionOptions,
): AsyncGenerator<IngestionLog, IngestionResult> {
  const options: Required<IngestionOptions> = {
    pageSize: 50,
    minDelayMs: 1000,
    maxRetries: 5,
    rateLimitBackoffMs: 10_000,
    collection: "analytics",
    apiKey: "",
    ...opts,
  }

  const startTime = Date.now()
  let cursor: string | null = null
  let page = 0
  let totalFetched = 0
  let totalWritten = 0
  let totalSkipped = 0
  const logs: IngestionLog[] = []
  let lastRequestStart = Date.now() - options.minDelayMs // allow immediate first request

  yield { level: "info", message: "Ingestion started.", timestamp: new Date() }

  do {
    page++
    logs.length = 0 // reset per-step log buffer

    const pageUrl = `${options.apiBaseUrl}?pageSize=${options.pageSize}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`

    yield { level: "info", message: `Fetching page ${page}...`, timestamp: new Date(), meta: { page, cursor } }

    let pageResult: PageResult
    const reqStart = Date.now()
    lastRequestStart = reqStart

    try {
      pageResult = await fetchPage(pageUrl, options, logs, lastRequestStart)
    } catch (err) {
      for (const log of logs) yield log
      yield {
        level: "error",
        message: `Fatal error on page ${page}: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      }
      return { fetched: totalFetched, written: totalWritten, skipped: totalSkipped, pages: page, durationMs: Date.now() - startTime }
    }

    // Flush per-step logs collected inside fetchPage
    for (const log of logs) yield log
    logs.length = 0

    totalFetched += pageResult.records.length

    if (pageResult.records.length > 0) {
      yield {
        level: "info",
        message: `Writing batch of ${pageResult.records.length} records...`,
        timestamp: new Date(),
        meta: { page, batchSize: pageResult.records.length },
      }

      let batchResult: { written: number; skipped: number }
      try {
        batchResult = await writeBatch(pageResult.records, options.collection, logs)
      } catch (err) {
        for (const log of logs) yield log
        yield {
          level: "error",
          message: `Failed to write batch for page ${page}: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date(),
        }
        return { fetched: totalFetched, written: totalWritten, skipped: totalSkipped, pages: page, durationMs: Date.now() - startTime }
      }

      for (const log of logs) yield log
      logs.length = 0

      totalWritten += batchResult.written
      totalSkipped += batchResult.skipped
    }

    cursor = pageResult.nextCursor

    yield {
      level: "info",
      message: `Page ${page} complete. Total fetched: ${totalFetched}, written: ${totalWritten}.`,
      timestamp: new Date(),
      meta: { page, totalFetched, totalWritten, totalSkipped, hasMore: cursor !== null },
    }
  } while (cursor !== null)

  const durationMs = Date.now() - startTime

  yield {
    level: "success",
    message: `Ingestion complete in ${(durationMs / 1000).toFixed(1)}s — ${totalFetched} fetched, ${totalWritten} written, ${totalSkipped} skipped.`,
    timestamp: new Date(),
    meta: { totalFetched, totalWritten, totalSkipped, pages: page, durationMs },
  }

  return { fetched: totalFetched, written: totalWritten, skipped: totalSkipped, pages: page, durationMs }
}
