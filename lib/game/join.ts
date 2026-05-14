import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
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

  const sessionRef = db.doc(`sessions/${sessionId}`)
  const playerRef = db.doc(`sessions/${sessionId}/players/${uid}`)

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef)
    if (!sessionSnap.exists) throw new GameError(404, `Session ${sessionId} not found`)

    const session = sessionSnap.data() as Record<string, unknown>
    if (session['status'] !== 'lobby')
      throw new GameError(422, 'Session is not in lobby phase')

    const assignments = (session['characterAssignments'] ?? {}) as Record<string, string>
    if (assignments[characterId])
      throw new GameError(409, `Character ${characterId} is already taken`)

    const scenarioSnap = await db.doc(`scenarios/${session['scenarioId']}`).get()
    if (!scenarioSnap.exists) throw new GameError(404, 'Scenario not found')

    const characters = (
      (scenarioSnap.data() as Record<string, unknown>)['characters'] as Record<string, unknown>
    )['characters'] as Array<{
      id: string
      private: { startingInventory: Record<string, number> }
    }>

    const character = characters.find((c) => c.id === characterId)
    if (!character) throw new GameError(404, `Character ${characterId} not found in scenario`)

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
