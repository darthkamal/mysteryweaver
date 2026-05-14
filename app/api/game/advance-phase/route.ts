import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { advancePhase, AdvancePhaseSchema } from '@/lib/game/advance-phase'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = AdvancePhaseSchema.parse(await req.json())
    await advancePhase(getAdminDb(), uid, body)
    return ok({ advanced: true })
  } catch (error) {
    return err(error)
  }
}
