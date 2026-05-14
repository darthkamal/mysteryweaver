import { type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { verifyIdToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { transferCurrency, TransferCurrencySchema } from '@/lib/game/transfer'

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req)
    const body = TransferCurrencySchema.parse(await req.json())
    await transferCurrency(getAdminDb(), uid, body)
    return ok({ transferred: true })
  } catch (error) {
    return err(error)
  }
}
