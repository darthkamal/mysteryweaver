import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions, scenarios, players } from '@/lib/db/schema'
import { GameError } from './types'
import { writeLog } from './log'

export const JoinGameSchema = z.object({
  sessionId: z.string().uuid(),
  characterId: z.string().min(1).max(64),
  displayName: z.string().min(1).max(64),
})

export type JoinGameData = z.infer<typeof JoinGameSchema>

// `uid` is the player's identity (used in characterAssignments, rosters);
// `token` is their secret bearer credential (used only for auth, never broadcast).
export async function joinGame(db: Db, uid: string, token: string, data: JoinGameData): Promise<void> {
  const { sessionId, characterId, displayName } = data

  const sessionRow = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!sessionRow) throw new GameError(404, `Session ${sessionId} not found`)
  if (sessionRow.status !== 'lobby') throw new GameError(422, 'Session is not in lobby phase')

  if (sessionRow.characterAssignments[characterId]) throw new GameError(409, `Character ${characterId} is already taken`)

  const scenarioRow = db.select().from(scenarios).where(eq(scenarios.id, sessionRow.scenarioId)).get()
  if (!scenarioRow) throw new GameError(404, 'Scenario not found')

  const chars = (scenarioRow.characters as { characters: Array<{ id: string; private: { startingInventory: Record<string, number> } }> }).characters
  const character = chars.find((c) => c.id === characterId)
  if (!character) throw new GameError(404, `Character ${characterId} not found in scenario`)

  db.transaction((tx) => {
    const fresh = tx.select({ characterAssignments: sessions.characterAssignments })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get()
    if (!fresh) throw new GameError(404, `Session ${sessionId} not found`)

    const freshAssignments = fresh.characterAssignments
    if (freshAssignments[characterId]) throw new GameError(409, `Character ${characterId} is already taken`)

    freshAssignments[characterId] = uid

    tx.insert(players).values({
      sessionId,
      uid,
      token,
      characterId,
      displayName,
      currencies: character.private.startingInventory,
      clues: [],
      isOnline: true,
      joinedAt: Date.now(),
    }).run()

    tx.update(sessions)
      .set({ characterAssignments: freshAssignments })
      .where(eq(sessions.id, sessionId))
      .run()
  })

  writeLog(db, sessionId, {
    type: 'join',
    message: `${displayName} joined as ${characterId}`,
    actorId: uid,
  })
}
