import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPlayerToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { submitAccusation, SubmitAccusationSchema } from '@/lib/game/submit-accusation'

export async function POST(req: NextRequest) {
  try {
    const body = SubmitAccusationSchema.parse(await req.json())
    const uid = verifyPlayerToken(req, body.sessionId)
    await submitAccusation(db, uid, body)
    return ok({ submitted: true })
  } catch (error) {
    return err(error)
  }
}
