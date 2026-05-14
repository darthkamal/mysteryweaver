import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, getScenario } from './helpers'
import { writeLog } from './log'

export const JoinGameSchema = z.object({
  sessionId: z.string().min(1),
  characterId: z.string().min(1),
  displayName: z.string().min(1),
})

export type JoinGameData = z.infer<typeof JoinGameSchema>

export async function joinGame(
  db: Firestore,
  uid: string,
  data: JoinGameData,
): Promise<void> {
  const { sessionId, characterId, displayName } = data

  const session = await getSession(db, sessionId)
  if (session.status !== 'lobby') throw new GameError(422, 'Session is not in lobby phase')

  const scenario = await getScenario(db, session.scenarioId)
  const character = scenario.characters.characters.find((c) => c.id === characterId)
  if (!character) throw new GameError(404, `Character ${characterId} not found in scenario`)

  if (session.characterAssignments[characterId])
    throw new GameError(409, `Character ${characterId} is already taken`)

  const sessionRef = db.doc(`sessions/${sessionId}`)
  const playerRef = db.doc(`sessions/${sessionId}/players/${uid}`)

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef)
    if (!sessionSnap.exists) throw new GameError(404, `Session ${sessionId} not found`)

    const freshAssignments = (sessionSnap.data()!['characterAssignments'] ?? {}) as Record<string, string>
    if (freshAssignments[characterId])
      throw new GameError(409, `Character ${characterId} is already taken`)

    tx.set(playerRef, {
      characterId,
      displayName,
      currencies: character.private.startingInventory,
      clues: [],
      joinedAt: new Date().toISOString(),
      isOnline: true,
    })
    tx.update(sessionRef, {
      [`characterAssignments.${characterId}`]: uid,
    })
  })

  await writeLog(db, sessionId, {
    type: 'join',
    message: `${displayName} joined as ${characterId}`,
    actorId: uid,
  })
}
