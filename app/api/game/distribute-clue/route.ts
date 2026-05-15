import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { distributeClue, DistributeClueSchema } from '@/lib/game/distribute-clue'
import { broadcastAll } from '@/lib/sse/broadcast'

export async function POST(req: NextRequest) {
  try {
    const body = DistributeClueSchema.parse(await req.json())
    const { gmId } = await verifyGmToken(req)
    await distributeClue(db, gmId, body)
    broadcastAll(body.sessionId)
    return ok({ distributed: true })
  } catch (error) {
    return err(error)
  }
}
