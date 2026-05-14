import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { distributeClue, DistributeClueSchema } from '@/lib/game/distribute-clue'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = DistributeClueSchema.parse(await req.json())
    await distributeClue(getAdminDb(), uid, body)
    return ok({ distributed: true })
  } catch (error) {
    return err(error)
  }
}
