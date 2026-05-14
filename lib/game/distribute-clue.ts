import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, verifyHost } from './helpers'
import { writeLog } from './log'

export const DistributeClueSchema = z.object({
  sessionId: z.string().min(1),
  targetCharacterIds: z.array(z.string().min(1)).min(1),
  clueId: z.string().min(1),
})

export type DistributeClueData = z.infer<typeof DistributeClueSchema>

export async function distributeClue(
  db: Firestore,
  uid: string,
  data: DistributeClueData,
): Promise<void> {
  const { sessionId, targetCharacterIds, clueId } = data

  const session = await getSession(db, sessionId)
  verifyHost(session, uid)

  const batch = db.batch()

  for (const charId of targetCharacterIds) {
    const playerId = session.characterAssignments[charId]
    if (!playerId) throw new GameError(404, `Character ${charId} is not in this session`)

    const playerRef = db.doc(`sessions/${sessionId}/players/${playerId}`)
    const playerSnap = await playerRef.get()
    if (!playerSnap.exists)
      throw new GameError(404, `Player document for ${charId} not found`)

    const currentClues = (playerSnap.data()!['clues'] ?? []) as string[]
    const newClues = currentClues.includes(clueId) ? currentClues : [...currentClues, clueId]
    batch.update(playerRef, { clues: newClues })
  }

  await batch.commit()

  await writeLog(db, sessionId, {
    type: 'clue_given',
    message: `GM distributed ${clueId} to [${targetCharacterIds.join(', ')}]`,
    actorId: uid,
  })
}
