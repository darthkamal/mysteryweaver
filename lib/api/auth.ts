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
  const row = db
    .select({ uid: players.uid })
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.uid, token)))
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
