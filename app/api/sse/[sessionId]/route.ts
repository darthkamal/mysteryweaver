import { type NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions, players } from '@/lib/db/schema'
import { addClient, removeClient } from '@/lib/sse/registry'
import type { SseClient } from '@/lib/sse/registry'

const encoder = new TextEncoder()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const token = req.nextUrl.searchParams.get('token')

  if (!token) return new Response('Missing token', { status: 401 })

  const playerRow = db
    .select()
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.uid, token)))
    .get()

  if (!playerRow) return new Response('Invalid token', { status: 401 })

  const uid = token
  let client: SseClient | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = { sessionId, uid, controller }
      addClient(client)

      // Send current session state immediately on connect
      const sessionRow = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
      if (sessionRow) {
        const sessionData = {
          sessionId: sessionRow.id,
          scenarioId: sessionRow.scenarioId,
          phase: sessionRow.phase,
          phaseIndex: sessionRow.phaseIndex,
          status: sessionRow.status,
          hostId: sessionRow.hostId,
          characterAssignments: JSON.parse(sessionRow.characterAssignments),
          unlockedAssets: JSON.parse(sessionRow.unlockedAssets),
        }
        controller.enqueue(
          encoder.encode(`event: session-updated\ndata: ${JSON.stringify(sessionData)}\n\n`),
        )
      }

      // Send current player state immediately on connect
      const playerData = {
        characterId: playerRow.characterId,
        displayName: playerRow.displayName,
        currencies: JSON.parse(playerRow.currencies),
        clues: JSON.parse(playerRow.clues),
      }
      controller.enqueue(
        encoder.encode(`event: player-updated\ndata: ${JSON.stringify(playerData)}\n\n`),
      )

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
