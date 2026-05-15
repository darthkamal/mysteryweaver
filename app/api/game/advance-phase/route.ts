import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { advancePhase, AdvancePhaseSchema } from '@/lib/game/advance-phase'
import { broadcastAll } from '@/lib/sse/broadcast'

export async function POST(req: NextRequest) {
  try {
    const body = AdvancePhaseSchema.parse(await req.json())
    const { gmId } = await verifyGmToken(req)
    await advancePhase(db, gmId, body)
    broadcastAll(body.sessionId)
    return ok({ advanced: true })
  } catch (error) {
    return err(error)
  }
}
