import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { joinGame, JoinGameSchema } from '@/lib/game/join'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = JoinGameSchema.parse(await req.json())
    await joinGame(getAdminDb(), uid, body)
    return ok({ joined: true })
  } catch (error) {
    return err(error)
  }
}
