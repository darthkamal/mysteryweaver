import { type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { ok, err } from '@/lib/api/respond'
import { joinGame, JoinGameSchema } from '@/lib/game/join'

export async function POST(req: NextRequest) {
  try {
    const body = JoinGameSchema.parse(await req.json())
    const playerToken = randomUUID()
    await joinGame(db, playerToken, body)
    return ok({ joined: true, playerToken })
  } catch (error) {
    return err(error)
  }
}
