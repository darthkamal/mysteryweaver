import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions, players } from '@/lib/db/schema'
import { GameError } from './types'
import { getSession, getScenario, verifyHost, verifyActiveSession, playerKey } from './helpers'
import { writeLog } from './log'

export const TriggerNpcEventSchema = z.object({
  sessionId: z.string().uuid(),
  npcEventId: z.string().min(1).max(64),
})

export type TriggerNpcEventData = z.infer<typeof TriggerNpcEventSchema>

export async function triggerNpcEvent(db: Db, uid: string, data: TriggerNpcEventData): Promise<void> {
  const { sessionId, npcEventId } = data

  const session = getSession(db, sessionId)
  verifyHost(session, uid)
  verifyActiveSession(session)

  const scenario = getScenario(db, session.scenarioId)
  const npcEvent = scenario.gmScript.npcEvents.find((e: { id: string }) => e.id === npcEventId)
  if (!npcEvent) throw new GameError(404, `NPC event ${npcEventId} not found in scenario`)

  const newUnlocked = [...new Set([...session.unlockedAssets, ...npcEvent.unlocksAssets])]
  const newTriggered = [...new Set([...session.triggeredNpcEvents, npcEventId])]
  db.update(sessions)
    .set({
      unlockedAssets: newUnlocked,
      triggeredNpcEvents: newTriggered,
    })
    .where(eq(sessions.id, sessionId))
    .run()

  if (npcEvent.autoDistribute && npcEvent.unlocksAssets.length > 0) {
    const allPlayers = db.select().from(players).where(eq(players.sessionId, sessionId)).all()
    for (const p of allPlayers) {
      const newClues = [...new Set([...p.clues, ...npcEvent.unlocksAssets])]
      db.update(players)
        .set({ clues: newClues })
        .where(playerKey(sessionId, p.uid))
        .run()
    }
  }

  writeLog(db, sessionId, {
    type: 'npc_event',
    message: `NPC event triggered: ${npcEvent.label}`,
    actorId: uid,
  })
}
