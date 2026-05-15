import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPlayerToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { transferCurrency, TransferCurrencySchema } from '@/lib/game/transfer'

export async function POST(req: NextRequest) {
  try {
    const body = TransferCurrencySchema.parse(await req.json())
    const uid = verifyPlayerToken(req, body.sessionId)
    await transferCurrency(db, uid, body)
    return ok({ transferred: true })
  } catch (error) {
    return err(error)
  }
}
