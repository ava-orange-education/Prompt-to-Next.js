"use client"

/**
 * useAnalytics — real-time data hook with buffered, debounced state updates.
 *
 * Incoming records (from mock setInterval or Firestore onSnapshot) are pushed
 * into a pendingBuffer ref immediately, but React state is only updated on a
 * stable FLUSH_INTERVAL cadence. This prevents excessive re-renders during
 * bursts of rapid updates while keeping the dashboard feeling live.
 *
 * MODE A — Mock (default, no config needed):
 *   Generates seed data and streams new records every MOCK_EMIT_INTERVAL ms.
 *
 * MODE B — Live Firestore:
 *   Set NEXT_PUBLIC_FIREBASE_* env vars (see lib/firebase.ts).
 *   Collection: "analytics", document shape: { category, metric, collectedAt }
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { AnalyticsRecord } from "@/lib/types"
import { isFirebaseConfigured, db } from "@/lib/firebase"

// ─── Tuning constants ─────────────────────────────────────────────────────────

/** Max data points rendered in the chart. */
const MAX_POINTS = 60

/** How often the buffer is flushed into React state (ms). */
const FLUSH_INTERVAL = 1_000

/** How often the mock emitter fires a new record (ms). */
const MOCK_EMIT_INTERVAL = 800

// ─── Categories & baselines ───────────────────────────────────────────────────

export const CATEGORIES = ["Revenue", "Sessions", "Conversions", "Latency"] as const
export type Category = (typeof CATEGORIES)[number]

const CATEGORY_PARAMS: Record<string, { base: number; variance: number }> = {
  Revenue:     { base: 4200,  variance: 800  },
  Sessions:    { base: 1350,  variance: 300  },
  Conversions: { base: 87,    variance: 20   },
  Latency:     { base: 142,   variance: 40   },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(category: string): AnalyticsRecord {
  const { base, variance } = CATEGORY_PARAMS[category] ?? { base: 100, variance: 20 }
  return {
    id: crypto.randomUUID(),
    category,
    metric: Math.max(0, base + (Math.random() - 0.5) * variance * 2),
    collectedAt: new Date(),
  }
}

function seedRecords(category: string, count = 40): AnalyticsRecord[] {
  const { base, variance } = CATEGORY_PARAMS[category] ?? { base: 100, variance: 20 }
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    category,
    metric: Math.max(0, base + (Math.random() - 0.5) * variance * 2),
    collectedAt: new Date(now - (count - 1 - i) * MOCK_EMIT_INTERVAL),
  }))
}

/**
 * Merge new records into an existing list, dedupe by id, sort by collectedAt,
 * and trim to the last MAX_POINTS entries.
 */
function mergeRecords(existing: AnalyticsRecord[], incoming: AnalyticsRecord[]): AnalyticsRecord[] {
  if (incoming.length === 0) return existing
  const map = new Map<string, AnalyticsRecord>()
  for (const r of existing) map.set(r.id, r)
  for (const r of incoming) map.set(r.id, r)
  const merged = Array.from(map.values()).sort(
    (a, b) => a.collectedAt.getTime() - b.collectedAt.getTime()
  )
  return merged.slice(-MAX_POINTS)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(selectedCategory: string) {
  const [records, setRecords] = useState<AnalyticsRecord[]>(() =>
    seedRecords(selectedCategory)
  )

  // Mutable refs — never trigger renders on their own
  const categoryRef    = useRef(selectedCategory)
  const pendingBuffer  = useRef<AnalyticsRecord[]>([])
  const baseRecordsRef = useRef<AnalyticsRecord[]>(records)

  // Reset on category change
  useEffect(() => {
    categoryRef.current = selectedCategory
    const seed = seedRecords(selectedCategory)
    baseRecordsRef.current = seed
    pendingBuffer.current = []
    setRecords(seed)
  }, [selectedCategory])

  // Flush loop — merges pending buffer into state at a stable cadence
  const flushBuffer = useCallback(() => {
    if (pendingBuffer.current.length === 0) return
    const incoming = pendingBuffer.current.splice(0)          // drain atomically
    setRecords((prev) => {
      const next = mergeRecords(prev, incoming)
      baseRecordsRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    const flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL)
    return () => clearInterval(flushTimer)
  }, [flushBuffer])

  // Data source — pushes into buffer, never directly into state
  useEffect(() => {
    // ── Live Firestore path ──────────────────────────────────────────────────
    if (isFirebaseConfigured && db) {
      let unsubscribe: (() => void) | undefined

      import("firebase/firestore").then(
        ({ collection, query, where, orderBy, limit, onSnapshot }) => {
          const q = query(
            collection(db!, "analytics"),
            where("category", "==", selectedCategory),
            orderBy("collectedAt", "asc"),
            limit(MAX_POINTS)
          )

          unsubscribe = onSnapshot(q, (snapshot) => {
            const docs: AnalyticsRecord[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              category: doc.data().category as string,
              metric: doc.data().metric as number,
              collectedAt: (doc.data().collectedAt as { toDate(): Date }).toDate(),
            }))
            // Firestore snapshots are already complete datasets — replace buffer
            pendingBuffer.current = docs
          })
        }
      )

      return () => unsubscribe?.()
    }

    // ── Mock / simulation path ───────────────────────────────────────────────
    // Emits frequently to simulate bursts; flush loop throttles renders.
    const emitter = setInterval(() => {
      pendingBuffer.current.push(makeRecord(categoryRef.current))
    }, MOCK_EMIT_INTERVAL)

    return () => clearInterval(emitter)
  }, [selectedCategory])

  return {
    records,
    categories: CATEGORIES as unknown as string[],
    isMock: !isFirebaseConfigured,
  }
}
