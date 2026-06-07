import { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { GameError } from '@/lib/game/types'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return new TextEncoder().encode(secret)
}

export function verifyPlayerToken(req: NextRequest, sessionId: string): string {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new GameError(401, 'Missing or invalid Authorization header')
  }
  const token = header.slice(7)
  // Authenticate by the secret token; return the player's uid (identity).
  const row = db
    .select({ uid: players.uid })
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.token, token)))
    .get()
  if (!row) throw new GameError(401, 'Invalid or expired player token')
  return row.uid
}

export async function verifyGmToken(req: NextRequest): Promise<{ gmId: string; email: string }> {
  const cookie = req.cookies.get('mw-gm-token')?.value
  if (!cookie) throw new GameError(401, 'GM authentication required')
  try {
    const { payload } = await jwtVerify(cookie, getJwtSecret())
    return { gmId: payload.sub as string, email: payload.email as string }
  } catch {
    throw new GameError(401, 'Invalid or expired GM token')
  }
}

export async function signGmToken(gmId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(gmId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

// Short-lived, single-purpose ticket for opening an SSE stream. The browser
// EventSource API can't send headers, so instead of putting the long-lived
// player token in the URL (where it lands in access logs), the client exchanges
// its token (via header) for this ~60s signed ticket and passes it as ?ticket=.
export async function signSseTicket(uid: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId, typ: 'sse' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(getJwtSecret())
}

// Verifies an SSE ticket is validly signed, unexpired, of type 'sse', and bound
// to this session. Returns the player uid. Throws GameError(401) otherwise.
export async function verifySseTicket(ticket: string, sessionId: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(ticket, getJwtSecret())
    if (payload.typ !== 'sse' || payload.sid !== sessionId || typeof payload.sub !== 'string') {
      throw new Error('invalid ticket claims')
    }
    return payload.sub
  } catch {
    throw new GameError(401, 'Invalid or expired SSE ticket')
  }
}
