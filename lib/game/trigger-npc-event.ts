import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, getScenario, verifyHost } from './helpers'
import { writeLog } from './log'

export const TriggerNpcEventSchema = z.object({
  sessionId: z.string().min(1),
  npcEventId: z.string().min(1),
})

export type TriggerNpcEventData = z.infer<typeof TriggerNpcEventSchema>

export async function triggerNpcEvent(
  db: Firestore,
  uid: string,
  data: TriggerNpcEventData,
): Promise<void> {
  const { sessionId, npcEventId } = data

  const session = await getSession(db, sessionId)
  verifyHost(session, uid)

  const scenario = await getScenario(db, session.scenarioId)
  const npcEvent = scenario.gmScript.npcEvents.find((e) => e.id === npcEventId)
  if (!npcEvent) throw new GameError(404, `NPC event ${npcEventId} not found in scenario`)

  const currentUnlocked = session.unlockedAssets ?? []
  const newUnlocked = [...new Set([...currentUnlocked, ...npcEvent.unlocksAssets])]
  await db.doc(`sessions/${sessionId}`).update({ unlockedAssets: newUnlocked })

  if (npcEvent.autoDistribute && npcEvent.unlocksAssets.length > 0) {
    const playersSnap = await db.collection(`sessions/${sessionId}/players`).get()
    const batch = db.batch()
    for (const playerDoc of playersSnap.docs) {
      const currentClues = (playerDoc.data()['clues'] ?? []) as string[]
      const newClues = [...new Set([...currentClues, ...npcEvent.unlocksAssets])]
      batch.update(playerDoc.ref, { clues: newClues })
    }
    await batch.commit()
  }

  await writeLog(db, sessionId, {
    type: 'npc_event',
    message: `NPC event triggered: ${npcEvent.label}`,
    actorId: uid,
  })
}
