import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { gms } from '@/lib/db/schema'
import { signGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = LoginSchema.parse(await req.json())
    const gm = db.select().from(gms).where(eq(gms.email, body.email)).get()
    if (!gm) throw new GameError(401, 'Invalid email or password')

    const valid = await bcrypt.compare(body.password, gm.passwordHash)
    if (!valid) throw new GameError(401, 'Invalid email or password')

    const token = await signGmToken(gm.id, gm.email)
    const res = ok({ loggedIn: true, displayName: gm.displayName })
    res.cookies.set('mw-gm-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (error) {
    return err(error)
  }
}
