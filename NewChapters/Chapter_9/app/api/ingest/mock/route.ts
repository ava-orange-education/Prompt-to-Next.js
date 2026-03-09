/**
 * app/api/ingest/mock/route.ts
 *
 * A lightweight mock external API that the ingestion engine calls when no
 * real INGESTION_API_BASE_URL is configured. Returns paginated analytics
 * records so the full ingestion pipeline (rate-limit handling, batching,
 * Firestore writes) can be exercised end-to-end without a real upstream API.
 *
 * Query params:
 *   pageSize  number  (default 20)
 *   cursor    string  opaque page token (base-64 encoded offset)
 */

import { type NextRequest, NextResponse } from "next/server"

const CATEGORIES = ["Revenue", "Sessions", "Errors", "Latency", "Signups"]
const TOTAL_RECORDS = 85 // simulate 85 upstream records across pages

function makeRecord(index: number) {
  const category = CATEGORIES[index % CATEGORIES.length]
  const baseValues: Record<string, number> = {
    Revenue: 4200,
    Sessions: 1800,
    Errors: 12,
    Latency: 250,
    Signups: 340,
  }
  const base = baseValues[category] ?? 100
  const jitter = Math.sin(index * 0.7) * base * 0.3 + (Math.random() * base * 0.1)
  const metric = Math.round((base + jitter) * 100) / 100

  const now = Date.now()
  const collectedAt = new Date(now - (TOTAL_RECORDS - index) * 60_000).toISOString()

  return { category, metric, collectedAt }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20", 10), 100)
  const cursorRaw = searchParams.get("cursor")

  let offset = 0
  if (cursorRaw) {
    try {
      offset = parseInt(Buffer.from(cursorRaw, "base64url").toString("utf8"), 10)
    } catch {
      offset = 0
    }
  }

  const records = Array.from({ length: Math.min(pageSize, TOTAL_RECORDS - offset) }, (_, i) =>
    makeRecord(offset + i),
  )

  const nextOffset = offset + records.length
  const nextCursor =
    nextOffset < TOTAL_RECORDS
      ? Buffer.from(String(nextOffset)).toString("base64url")
      : null

  // Simulate a small network delay
  await new Promise((r) => setTimeout(r, 120))

  return NextResponse.json({
    records,
    nextCursor,
    total: TOTAL_RECORDS,
    page: { offset, size: records.length },
  })
}
