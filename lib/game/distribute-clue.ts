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

  const playerRefs = targetCharacterIds.map((charId) => {
    const playerId = session.characterAssignments[charId]
    if (!playerId) throw new GameError(404, `Character ${charId} is not in this session`)
    return { charId, playerRef: db.doc(`sessions/${sessionId}/players/${playerId}`) }
  })

  const playerSnaps = await Promise.all(playerRefs.map(({ playerRef }) => playerRef.get()))

  const batch = db.batch()
  for (let i = 0; i < playerRefs.length; i++) {
    const snap = playerSnaps[i]!
    if (!snap.exists)
      throw new GameError(404, `Player document for ${playerRefs[i]!.charId} not found`)
    const currentClues = (snap.data()!['clues'] ?? []) as string[]
    const newClues = currentClues.includes(clueId) ? currentClues : [...currentClues, clueId]
    batch.update(playerRefs[i]!.playerRef, { clues: newClues })
  }

  await batch.commit()

  await writeLog(db, sessionId, {
    type: 'clue_given',
    message: `GM distributed ${clueId} to [${targetCharacterIds.join(', ')}]`,
    actorId: uid,
  })
}
