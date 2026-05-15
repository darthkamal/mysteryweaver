import { type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'
import { broadcastAll } from '@/lib/sse/broadcast'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const { gmId } = await verifyGmToken(req)

    const session = db.select({ hostId: sessions.hostId, status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get()
    if (!session) throw new GameError(404, 'Session not found')
    if (session.hostId !== gmId) throw new GameError(403, 'Only the session host can end this session')
    if (session.status === 'ended') throw new GameError(422, 'Session is already ended')

    db.update(sessions).set({ status: 'ended' }).where(eq(sessions.id, sessionId)).run()
    broadcastAll(sessionId)

    return ok({ ended: true })
  } catch (error) {
    return err(error)
  }
}
