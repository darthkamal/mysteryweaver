import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'

export async function GET(req: NextRequest) {
  try {
    const roomCode = req.nextUrl.searchParams.get('roomCode')
    if (!roomCode) throw new GameError(400, 'roomCode query parameter is required')

    const row = db
      .select()
      .from(sessions)
      .where(eq(sessions.roomCode, roomCode.toUpperCase()))
      .get()
    if (!row) throw new GameError(404, 'No game found with that room code')
    if (row.status !== 'lobby') {
      throw new GameError(409, 'This game has already started. Ask the GM to add you.')
    }

    const assignments = JSON.parse(row.characterAssignments) as Record<string, string>

    return NextResponse.json({
      id: row.id,
      scenarioId: row.scenarioId,
      status: row.status,
      // Return only which character IDs are taken — not the player UIDs (those are bearer tokens)
      takenCharacterIds: Object.keys(assignments),
    })
  } catch (error) {
    return err(error)
  }
}
