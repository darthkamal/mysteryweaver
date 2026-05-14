import 'server-only'
import { NextRequest } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { GameError } from '@/lib/game/types'

export async function verifyIdToken(req: NextRequest): Promise<string> {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new GameError(401, 'Missing or invalid Authorization header')
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7))
    return decoded.uid
  } catch {
    throw new GameError(401, 'Invalid or expired token')
  }
}
