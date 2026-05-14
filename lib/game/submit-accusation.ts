import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, getScenario, verifyPhaseIs } from './helpers'
import { writeLog } from './log'

export const SubmitAccusationSchema = z.object({
  sessionId: z.string().min(1),
  suspectId: z.string().min(1),
  motive: z.string().min(1),
  evidenceIds: z.array(z.string()),
})

export type SubmitAccusationData = z.infer<typeof SubmitAccusationSchema>

export async function submitAccusation(
  db: Firestore,
  uid: string,
  data: SubmitAccusationData,
): Promise<void> {
  const { sessionId, suspectId, motive, evidenceIds } = data

  const session = await getSession(db, sessionId)
  const scenario = await getScenario(db, session.scenarioId)
  const mechanic = scenario.manifest.accusationMechanic

  verifyPhaseIs(session, mechanic.allowedPhase)

  if (mechanic.requiresEvidence && evidenceIds.length === 0) {
    throw new GameError(400, 'At least one evidence card ID is required to make an accusation')
  }

  await db.doc(`sessions/${sessionId}/accusations/${uid}`).set({
    accuserId: uid,
    suspectId,
    motive,
    evidenceIds,
    submittedAt: new Date().toISOString(),
  })

  await writeLog(db, sessionId, {
    type: 'accusation',
    message: `Player ${uid} accused ${suspectId}`,
    actorId: uid,
  })
}
