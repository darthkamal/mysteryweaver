import { z } from 'zod'
import type { Db } from '@/lib/db'
import { accusations } from '@/lib/db/schema'
import { GameError } from './types'
import { getSession, getScenario, verifyPhaseIs } from './helpers'
import { writeLog } from './log'

export const SubmitAccusationSchema = z.object({
  sessionId: z.string().uuid(),
  suspectId: z.string().min(1).max(64),
  motive: z.string().min(1).max(500),
  evidenceIds: z.array(z.string().max(64)).max(20),
})

export type SubmitAccusationData = z.infer<typeof SubmitAccusationSchema>

export async function submitAccusation(db: Db, uid: string, data: SubmitAccusationData): Promise<void> {
  const { sessionId, suspectId, motive, evidenceIds } = data

  const session = getSession(db, sessionId)
  const scenario = getScenario(db, session.scenarioId)
  const mechanic = scenario.manifest.accusationMechanic

  verifyPhaseIs(session, mechanic.allowedPhase)

  if (mechanic.requiresEvidence && evidenceIds.length === 0) {
    throw new GameError(400, 'At least one evidence card ID is required to make an accusation')
  }

  db.insert(accusations)
    .values({
      sessionId,
      accuserId: uid,
      suspectId,
      motive,
      evidenceIds: JSON.stringify(evidenceIds),
      submittedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [accusations.sessionId, accusations.accuserId],
      set: {
        suspectId,
        motive,
        evidenceIds: JSON.stringify(evidenceIds),
        submittedAt: Date.now(),
      },
    })
    .run()

  writeLog(db, sessionId, {
    type: 'accusation',
    message: `Player ${uid} accused ${suspectId}`,
    actorId: uid,
  })
}
