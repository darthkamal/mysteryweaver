import { type NextRequest, NextResponse } from 'next/server'
import { eq, and, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scenarios, sessions } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> },
) {
  try {
    const { scenarioId } = await params
    const { gmId } = await verifyGmToken(req)

    const row = db.select().from(scenarios)
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.ownerId, gmId)))
      .get()
    if (!row) throw new GameError(404, 'Scenario not found')

    return NextResponse.json({
      id: row.id,
      name: row.name,
      manifest: JSON.parse(row.manifest),
      characters: JSON.parse(row.characters),
      assets: JSON.parse(row.assets),
      gmScript: JSON.parse(row.gmScript),
      relationships: JSON.parse(row.relationships),
    })
  } catch (error) {
    return err(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> },
) {
  try {
    const { scenarioId } = await params
    const { gmId } = await verifyGmToken(req)

    const scenario = db.select({ id: scenarios.id }).from(scenarios)
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.ownerId, gmId)))
      .get()
    if (!scenario) throw new GameError(404, 'Scenario not found')

    // Block deletion if active/lobby sessions reference this scenario
    const activeSession = db.select({ id: sessions.id }).from(sessions)
      .where(and(
        eq(sessions.scenarioId, scenarioId),
        or(eq(sessions.status, 'lobby'), eq(sessions.status, 'active')),
      ))
      .get()
    if (activeSession) throw new GameError(409, 'Cannot delete a scenario with active sessions')

    db.delete(scenarios).where(eq(scenarios.id, scenarioId)).run()
    return ok({ deleted: true })
  } catch (error) {
    return err(error)
  }
}
