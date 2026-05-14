import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, getScenario, verifyHost } from './helpers'
import { writeLog } from './log'

export const AdvancePhaseSchema = z.object({
  sessionId: z.string().min(1),
})

export type AdvancePhaseData = z.infer<typeof AdvancePhaseSchema>

export async function advancePhase(
  db: Firestore,
  uid: string,
  data: AdvancePhaseData,
): Promise<void> {
  const { sessionId } = data

  const session = await getSession(db, sessionId)
  verifyHost(session, uid)

  const scenario = await getScenario(db, session.scenarioId)
  const phases = scenario.manifest.phases
  const currentIndex = phases.findIndex((p) => p.id === session.phase)

  if (currentIndex === -1 || currentIndex >= phases.length - 1) {
    throw new GameError(422, 'Already on the last phase — cannot advance further')
  }

  const nextPhase = phases[currentIndex + 1]!
  const nextIndex = currentIndex + 1
  const isLastPhase = nextIndex === phases.length - 1
  const newStatus = isLastPhase
    ? 'ended'
    : session.status === 'lobby'
      ? 'active'
      : session.status

  await db.doc(`sessions/${sessionId}`).update({
    phase: nextPhase.id,
    phaseIndex: nextIndex,
    status: newStatus,
  })

  await writeLog(db, sessionId, {
    type: 'phase_change',
    message: `Phase advanced to: ${nextPhase.id}`,
    actorId: uid,
  })
}
