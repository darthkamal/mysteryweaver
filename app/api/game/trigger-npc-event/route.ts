import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { triggerNpcEvent, TriggerNpcEventSchema } from '@/lib/game/trigger-npc-event'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = TriggerNpcEventSchema.parse(await req.json())
    await triggerNpcEvent(getAdminDb(), uid, body)
    return ok({ triggered: true })
  } catch (error) {
    return err(error)
  }
}
