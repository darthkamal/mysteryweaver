import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyPlayerToken, signSseTicket } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'

const TicketSchema = z.object({ sessionId: z.string().uuid() })

// Exchange a player's secret token (sent in the Authorization header) for a
// short-lived SSE ticket. Keeps the long-lived token out of the SSE URL/logs.
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = TicketSchema.parse(await req.json())
    const uid = verifyPlayerToken(req, sessionId)
    const ticket = await signSseTicket(uid, sessionId)
    return ok({ ticket })
  } catch (error) {
    return err(error)
  }
}
