"use client"

/**
 * useAnalytics — real-time data hook.
 *
 * MODE A — Mock (default, no config needed):
 *   Generates seed data and streams new records every 3 s via setInterval.
 *   Useful while you're setting up Firebase credentials.
 *
 * MODE B — Live Firestore:
 *   Set NEXT_PUBLIC_FIREBASE_* env vars (see lib/firebase.ts for the full list).
 *   The hook automatically detects the vars and switches to onSnapshot.
 *   Your Firestore collection must be named "analytics" with documents shaped:
 *     { category: string, metric: number, collectedAt: Timestamp }
 */

import { useState, useEffect, useRef } from "react"
import { AnalyticsRecord } from "@/lib/types"
import { isFirebaseConfigured, db } from "@/lib/firebase"

// ─── Categories & realistic baselines ────────────────────────────────────────

export const CATEGORIES = ["Revenue", "Sessions", "Conversions", "Latency"] as const
export type Category = (typeof CATEGORIES)[number]

const CATEGORY_PARAMS: Record<string, { base: number; variance: number }> = {
  Revenue:     { base: 4200,  variance: 800  },
  Sessions:    { base: 1350,  variance: 300  },
  Conversions: { base: 87,    variance: 20   },
  Latency:     { base: 142,   variance: 40   },
}

// ─── Mock data helpers ────────────────────────────────────────────────────────

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
    collectedAt: new Date(now - (count - 1 - i) * 3_000),
  }))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(selectedCategory: string) {
  const [records, setRecords] = useState<AnalyticsRecord[]>(() =>
    seedRecords(selectedCategory)
  )
  const categoryRef = useRef(selectedCategory)

  useEffect(() => {
    categoryRef.current = selectedCategory
    setRecords(seedRecords(selectedCategory))
  }, [selectedCategory])

  useEffect(() => {
    // ── Live Firestore path ──────────────────────────────────────────────────
    if (isFirebaseConfigured && db) {
      // Dynamic import so firebase/firestore is tree-shaken when not configured.
      let unsubscribe: (() => void) | undefined

      import("firebase/firestore").then(({ collection, query, where, orderBy, limit, onSnapshot }) => {
        const q = query(
          collection(db!, "analytics"),
          where("category", "==", selectedCategory),
          orderBy("collectedAt", "asc"),
          limit(60)
        )

        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs: AnalyticsRecord[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            category: doc.data().category as string,
            metric: doc.data().metric as number,
            collectedAt: (doc.data().collectedAt as { toDate(): Date }).toDate(),
          }))
          setRecords(docs)
        })
      })

      return () => unsubscribe?.()
    }

    // ── Mock / simulation path ───────────────────────────────────────────────
    const interval = setInterval(() => {
      setRecords((prev) => [...prev.slice(-59), makeRecord(categoryRef.current)])
    }, 3_000)

    return () => clearInterval(interval)
  }, [selectedCategory])

  return {
    records,
    categories: CATEGORIES as unknown as string[],
    isMock: !isFirebaseConfigured,
  }
}
