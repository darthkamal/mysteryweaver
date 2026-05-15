import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { GameError } from './types'
import { getSession, getScenario, verifyHost } from './helpers'
import { writeLog } from './log'

export const AdvancePhaseSchema = z.object({
  sessionId: z.string().min(1),
})

export type AdvancePhaseData = z.infer<typeof AdvancePhaseSchema>

export async function advancePhase(db: Db, uid: string, data: AdvancePhaseData): Promise<void> {
  const { sessionId } = data

  const session = getSession(db, sessionId)
  verifyHost(session, uid)

  const scenario = getScenario(db, session.scenarioId)
  const phases = scenario.manifest.phases
  const currentIndex = phases.findIndex((p: { id: string }) => p.id === session.phase)

  if (currentIndex === -1 || currentIndex >= phases.length - 1) {
    throw new GameError(422, 'Already on the last phase — cannot advance further')
  }

  const nextPhase = phases[currentIndex + 1]!
  const nextIndex = currentIndex + 1
  const isLastPhase = nextIndex === phases.length - 1
  const newStatus: 'lobby' | 'active' | 'ended' = isLastPhase
    ? 'ended'
    : session.status === 'lobby'
      ? 'active'
      : session.status

  db.update(sessions)
    .set({ phase: nextPhase.id, phaseIndex: nextIndex, status: newStatus })
    .where(eq(sessions.id, sessionId))
    .run()

  writeLog(db, sessionId, {
    type: 'phase_change',
    message: `Phase advanced to: ${nextPhase.id}`,
    actorId: uid,
  })
}
