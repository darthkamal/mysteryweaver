import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions, players } from '@/lib/db/schema'
import { GameError } from './types'
import { getSession, getScenario, verifyHost } from './helpers'
import { writeLog } from './log'

export const TriggerNpcEventSchema = z.object({
  sessionId: z.string().min(1),
  npcEventId: z.string().min(1),
})

export type TriggerNpcEventData = z.infer<typeof TriggerNpcEventSchema>

export async function triggerNpcEvent(db: Db, uid: string, data: TriggerNpcEventData): Promise<void> {
  const { sessionId, npcEventId } = data

  const session = getSession(db, sessionId)
  verifyHost(session, uid)

  const scenario = getScenario(db, session.scenarioId)
  const npcEvent = scenario.gmScript.npcEvents.find((e: { id: string }) => e.id === npcEventId)
  if (!npcEvent) throw new GameError(404, `NPC event ${npcEventId} not found in scenario`)

  const newUnlocked = [...new Set([...session.unlockedAssets, ...npcEvent.unlocksAssets])]
  db.update(sessions)
    .set({ unlockedAssets: JSON.stringify(newUnlocked) })
    .where(eq(sessions.id, sessionId))
    .run()

  if (npcEvent.autoDistribute && npcEvent.unlocksAssets.length > 0) {
    const allPlayers = db.select().from(players).where(eq(players.sessionId, sessionId)).all()
    for (const p of allPlayers) {
      const currentClues: string[] = JSON.parse(p.clues)
      const newClues = [...new Set([...currentClues, ...npcEvent.unlocksAssets])]
      db.update(players)
        .set({ clues: JSON.stringify(newClues) })
        .where(and(eq(players.sessionId, sessionId), eq(players.uid, p.uid)))
        .run()
    }
  }

  writeLog(db, sessionId, {
    type: 'npc_event',
    message: `NPC event triggered: ${npcEvent.label}`,
    actorId: uid,
  })
}
