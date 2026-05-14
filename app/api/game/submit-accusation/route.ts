import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { submitAccusation, SubmitAccusationSchema } from '@/lib/game/submit-accusation'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = SubmitAccusationSchema.parse(await req.json())
    await submitAccusation(getAdminDb(), uid, body)
    return ok({ submitted: true })
  } catch (error) {
    return err(error)
  }
}
