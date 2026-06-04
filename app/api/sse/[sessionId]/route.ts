import { type NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions, players, scenarios } from '@/lib/db/schema'
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

      try {
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
            characterAssignments: sessionRow.characterAssignments,
            unlockedAssets: sessionRow.unlockedAssets,
          }
          controller.enqueue(
            encoder.encode(`event: session-updated\ndata: ${JSON.stringify(sessionData)}\n\n`),
          )
        }

        // Include the player's own private character data
        let privateCharacter = null
        const sessionForScenario = sessionRow ?? db.select({ scenarioId: sessions.scenarioId }).from(sessions).where(eq(sessions.id, sessionId)).get()
        if (sessionForScenario) {
          const scenarioRow = db.select({ characters: scenarios.characters }).from(scenarios).where(eq(scenarios.id, sessionForScenario.scenarioId)).get()
          if (scenarioRow) {
            const chars = scenarioRow.characters as { characters: Array<{ id: string; private: unknown }> }
            privateCharacter = chars.characters.find((c) => c.id === playerRow.characterId)?.private ?? null
          }
        }

        // Send current player state immediately on connect
        const playerData = {
          characterId: playerRow.characterId,
          displayName: playerRow.displayName,
          currencies: playerRow.currencies,
          clues: playerRow.clues,
          privateCharacter,
        }
        controller.enqueue(
          encoder.encode(`event: player-updated\ndata: ${JSON.stringify(playerData)}\n\n`),
        )
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
