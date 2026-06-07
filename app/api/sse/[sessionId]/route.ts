import { type NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { addClient, removeClient } from '@/lib/sse/registry'
import type { SseClient } from '@/lib/sse/registry'
import { buildPlayerSessionPayload, buildPlayerPayload } from '@/lib/sse/payloads'

const encoder = new TextEncoder()

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const token = req.nextUrl.searchParams.get('token')

  if (!token) return new Response('Missing token', { status: 401 })

  // Authenticate by the secret token; the connection is keyed by the player's uid.
  const playerRow = db
    .select()
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.token, token)))
    .get()

  if (!playerRow) return new Response('Invalid token', { status: 401 })

  const uid = playerRow.uid
  let client: SseClient | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = { sessionId, uid, controller }
      addClient(client)

      try {
        // Send current session + player state immediately on connect, reusing the
        // same payload builders as live broadcasts so the shapes never drift.
        // Player-facing payload — no uids (see buildPlayerSessionPayload).
        const sessionData = buildPlayerSessionPayload(db, sessionId)
        if (sessionData) controller.enqueue(sseEvent('session-updated', sessionData))

        const playerData = buildPlayerPayload(db, sessionId, uid)
        if (playerData) controller.enqueue(sseEvent('player-updated', playerData))
      } catch (e) {
        // On any error during init, clean up and close the stream
        if (client) { removeClient(client); client = null }
        controller.error(e)
        return
      }

      // Keep connection alive with periodic pings
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
          if (client) { removeClient(client); client = null }
        }
      }, 30_000)
    },
    cancel() {
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
      if (client) { removeClient(client); client = null }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
