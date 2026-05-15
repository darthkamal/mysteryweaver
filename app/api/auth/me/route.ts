import { type NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { gms } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'

export async function GET(req: NextRequest) {
  try {
    const { gmId, email } = await verifyGmToken(req)
    const gm = db.select({ displayName: gms.displayName })
      .from(gms)
      .where(eq(gms.id, gmId))
      .get()
    if (!gm) throw new Error('GM not found')
    return ok({ gmId, email, displayName: gm.displayName })
  } catch (error) {
    return err(error)
  }
}
