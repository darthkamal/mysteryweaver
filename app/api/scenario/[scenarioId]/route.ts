import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scenarios } from '@/lib/db/schema'
import { err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> },
) {
  try {
    const { scenarioId } = await params
    const row = db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).get()
    if (!row) throw new GameError(404, `Scenario ${scenarioId} not found`)
    return NextResponse.json({
      characters: JSON.parse(row.characters),
      assets: JSON.parse(row.assets),
    })
  } catch (error) {
    return err(error)
  }
}
