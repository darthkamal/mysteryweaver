import { type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { addGmClient, removeGmClient } from '@/lib/sse/registry'
import { broadcastGmFull } from '@/lib/sse/broadcast'
import type { SseClient } from '@/lib/sse/registry'

const encoder = new TextEncoder()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  let gmId: string
  try {
    const gm = await verifyGmToken(req)
    gmId = gm.gmId
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const sessionRow = db.select({ hostId: sessions.hostId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get()
  if (!sessionRow) return new Response('Session not found', { status: 404 })
  if (sessionRow.hostId !== gmId) return new Response('Forbidden', { status: 403 })

  let client: SseClient | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = { sessionId, uid: gmId, controller }
      addGmClient(client)

      try {
        broadcastGmFull(sessionId)
      } catch (e) {
        removeGmClient(sessionId)
        client = null
        controller.error(e)
        return
      }

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
          removeGmClient(sessionId)
          client = null
        }
      }, 30_000)
    },
    cancel() {
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
      if (client) { removeGmClient(sessionId); client = null }
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
