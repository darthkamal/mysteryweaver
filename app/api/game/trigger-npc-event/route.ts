import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { triggerNpcEvent, TriggerNpcEventSchema } from '@/lib/game/trigger-npc-event'

export async function POST(req: NextRequest) {
  try {
    const body = TriggerNpcEventSchema.parse(await req.json())
    const { gmId } = await verifyGmToken(req)
    await triggerNpcEvent(db, gmId, body)
    return ok({ triggered: true })
  } catch (error) {
    return err(error)
  }
}
