import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions, scenarios, players } from '@/lib/db/schema'
import { GameError } from './types'
import { writeLog } from './log'

export const JoinGameSchema = z.object({
  sessionId: z.string().min(1),
  characterId: z.string().min(1),
  displayName: z.string().min(1),
})

export type JoinGameData = z.infer<typeof JoinGameSchema>

export async function joinGame(db: Db, uid: string, data: JoinGameData): Promise<void> {
  const { sessionId, characterId, displayName } = data

  const sessionRow = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!sessionRow) throw new GameError(404, `Session ${sessionId} not found`)
  if (sessionRow.status !== 'lobby') throw new GameError(422, 'Session is not in lobby phase')

  const assignments: Record<string, string> = JSON.parse(sessionRow.characterAssignments)
  if (assignments[characterId]) throw new GameError(409, `Character ${characterId} is already taken`)

  const scenarioRow = db.select().from(scenarios).where(eq(scenarios.id, sessionRow.scenarioId)).get()
  if (!scenarioRow) throw new GameError(404, 'Scenario not found')

  const chars = (JSON.parse(scenarioRow.characters) as { characters: Array<{ id: string; private: { startingInventory: Record<string, number> } }> }).characters
  const character = chars.find((c) => c.id === characterId)
  if (!character) throw new GameError(404, `Character ${characterId} not found in scenario`)

  db.transaction((tx) => {
    const fresh = tx.select({ characterAssignments: sessions.characterAssignments })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get()
    if (!fresh) throw new GameError(404, `Session ${sessionId} not found`)

    const freshAssignments: Record<string, string> = JSON.parse(fresh.characterAssignments)
    if (freshAssignments[characterId]) throw new GameError(409, `Character ${characterId} is already taken`)

    freshAssignments[characterId] = uid

    tx.insert(players).values({
      sessionId,
      uid,
      characterId,
      displayName,
      currencies: JSON.stringify(character.private.startingInventory),
      clues: JSON.stringify([]),
      isOnline: true,
      joinedAt: Date.now(),
    }).run()

    tx.update(sessions)
      .set({ characterAssignments: JSON.stringify(freshAssignments) })
      .where(eq(sessions.id, sessionId))
      .run()
  })

  writeLog(db, sessionId, {
    type: 'join',
    message: `${displayName} joined as ${characterId}`,
    actorId: uid,
  })
}
