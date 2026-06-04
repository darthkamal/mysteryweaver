import { z } from 'zod'
import type { Db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { GameError } from './types'
import { getSession, verifyHost, verifyActiveSession, playerKey } from './helpers'
import { writeLog } from './log'

export const DistributeClueSchema = z.object({
  sessionId: z.string().uuid(),
  targetCharacterIds: z.array(z.string().min(1).max(64)).min(1).max(20),
  clueId: z.string().min(1).max(64),
})

export type DistributeClueData = z.infer<typeof DistributeClueSchema>

export async function distributeClue(db: Db, uid: string, data: DistributeClueData): Promise<void> {
  const { sessionId, targetCharacterIds, clueId } = data

  const session = getSession(db, sessionId)
  verifyHost(session, uid)
  verifyActiveSession(session)

  for (const charId of targetCharacterIds) {
    const playerId = session.characterAssignments[charId]
    if (!playerId) throw new GameError(404, `Character ${charId} is not in this session`)

    const playerRow = db.select().from(players)
      .where(playerKey(sessionId, playerId))
      .get()
    if (!playerRow) throw new GameError(404, `Player document for ${charId} not found`)

    const currentClues = playerRow.clues
    const newClues = currentClues.includes(clueId) ? currentClues : [...currentClues, clueId]

    db.update(players)
      .set({ clues: newClues })
      .where(playerKey(sessionId, playerId))
      .run()
  }

  writeLog(db, sessionId, {
    type: 'clue_given',
    message: `GM distributed ${clueId} to [${targetCharacterIds.join(', ')}]`,
    actorId: uid,
  })
}
