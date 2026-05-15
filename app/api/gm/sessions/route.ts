import { type NextRequest, NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sessions, scenarios } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import { GameError } from '@/lib/game/types'

function randomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(req: NextRequest) {
  try {
    const { gmId } = await verifyGmToken(req)

    const rows = db.select({
      id: sessions.id,
      roomCode: sessions.roomCode,
      scenarioId: sessions.scenarioId,
      scenarioName: scenarios.name,
      phase: sessions.phase,
      phaseIndex: sessions.phaseIndex,
      status: sessions.status,
      characterAssignments: sessions.characterAssignments,
      createdAt: sessions.createdAt,
    })
      .from(sessions)
      .leftJoin(scenarios, eq(sessions.scenarioId, scenarios.id))
      .where(eq(sessions.hostId, gmId))
      .orderBy(desc(sessions.createdAt))
      .all()

    return NextResponse.json({
      sessions: rows.map((row) => ({
        id: row.id,
        roomCode: row.roomCode,
        scenarioId: row.scenarioId,
        scenarioName: row.scenarioName ?? 'Unknown',
        phase: row.phase,
        phaseIndex: row.phaseIndex,
        status: row.status,
        playerCount: Object.keys(
          (JSON.parse(row.characterAssignments) as Record<string, string> | null) ?? {}
        ).length,
        createdAt: row.createdAt,
      })),
    })
  } catch (error) {
    return err(error)
  }
}

const CreateSessionSchema = z.object({
  // NOTE: not uuid() — SCENARIO_ID in tests is 'kola_nut_test'
  scenarioId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { gmId } = await verifyGmToken(req)
    const body = CreateSessionSchema.parse(await req.json())

    const scenario = db.select({ id: scenarios.id })
      .from(scenarios)
      .where(and(eq(scenarios.id, body.scenarioId), eq(scenarios.ownerId, gmId)))
      .get()
    if (!scenario) throw new GameError(404, 'Scenario not found or does not belong to you')

    const sessionId = randomUUID()
    let inserted = false

    for (let i = 0; i < 5; i++) {
      const candidate = randomRoomCode()
      try {
        db.insert(sessions).values({
          id: sessionId,
          roomCode: candidate,
          hostId: gmId,
          scenarioId: body.scenarioId,
          phase: 'lobby',
          phaseIndex: 0,
          status: 'lobby',
          characterAssignments: JSON.stringify({}),
          unlockedAssets: JSON.stringify([]),
          triggeredNpcEvents: JSON.stringify([]),
          createdAt: Date.now(),
        }).run()
        inserted = true
        return ok({ sessionId, roomCode: candidate })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!msg.includes('UNIQUE')) throw e
        // Otherwise loop and try a new code
      }
    }

    if (!inserted) throw new GameError(500, 'Failed to generate unique room code after 5 attempts')
  } catch (error) {
    return err(error)
  }
}
