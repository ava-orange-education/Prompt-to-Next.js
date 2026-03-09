/**
 * app/api/ingest/route.ts
 *
 * POST /api/ingest
 *   Starts an ingestion run. Accepts JSON body:
 *     { apiBaseUrl: string, pageSize?: number, apiKey?: string }
 *   Streams NDJSON log events as they are emitted by runIngestion().
 *   Each line is: { level, message, timestamp, meta? }
 *   The final line includes a "result" key with the IngestionResult summary.
 *
 * GET /api/ingest
 *   Returns the status of the most recent ingestion run:
 *     { status: "idle" | "running" | "done" | "error", result?, startedAt?, finishedAt? }
 *
 * Concurrency guard: a second POST while one is running returns 409.
 */

import { type NextRequest, NextResponse } from "next/server"
import { runIngestion, type IngestionLog, type IngestionResult } from "@/lib/ingestion"

// ---------------------------------------------------------------------------
// In-memory run state (single-instance; use Redis / KV for multi-replica)
// ---------------------------------------------------------------------------

interface RunState {
  status: "idle" | "running" | "done" | "error"
  startedAt?: string
  finishedAt?: string
  result?: IngestionResult
  lastError?: string
}

let runState: RunState = { status: "idle" }

// ---------------------------------------------------------------------------
// GET — return current run state
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json(runState)
}

// ---------------------------------------------------------------------------
// POST — start ingestion, stream logs as NDJSON
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (runState.status === "running") {
    return NextResponse.json(
      { error: "An ingestion run is already in progress." },
      { status: 409 },
    )
  }

  let body: { apiBaseUrl?: string; pageSize?: number; apiKey?: string } = {}
  try {
    body = await req.json()
  } catch {
    // body is optional
  }

  const apiBaseUrl =
    body.apiBaseUrl ??
    process.env.INGESTION_API_BASE_URL ??
    // Fall back to the built-in mock endpoint so the UI works without config
    `${req.nextUrl.origin}/api/ingest/mock`

  runState = { status: "running", startedAt: new Date().toISOString() }

  // Build a ReadableStream that drains the async generator and flushes NDJSON
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function send(payload: object) {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"))
      }

      try {
        const generator = runIngestion({
          apiBaseUrl,
          pageSize: body.pageSize ?? 20,
          apiKey: body.apiKey ?? process.env.INGESTION_API_KEY ?? "",
        })

        let result: IngestionResult | undefined

        while (true) {
          const { value, done } = await generator.next()

          if (done) {
            result = value as IngestionResult | undefined
            break
          }

          const log = value as IngestionLog
          send({ level: log.level, message: log.message, timestamp: log.timestamp, meta: log.meta })
        }

        runState = {
          status: "done",
          startedAt: runState.startedAt,
          finishedAt: new Date().toISOString(),
          result,
        }

        send({ level: "success", message: "Stream closed.", timestamp: new Date(), result })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        runState = {
          status: "error",
          startedAt: runState.startedAt,
          finishedAt: new Date().toISOString(),
          lastError: msg,
        }
        send({ level: "error", message: `Ingestion failed: ${msg}`, timestamp: new Date() })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}
