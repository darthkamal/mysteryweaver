import type { Firestore } from 'firebase-admin/firestore'
import { GameError } from './types'
import type { SessionData, ScenarioData } from './types'

export async function getSession(db: Firestore, sessionId: string): Promise<SessionData> {
  const snap = await db.doc(`sessions/${sessionId}`).get()
  if (!snap.exists) throw new GameError(404, `Session ${sessionId} not found`)
  return snap.data() as SessionData
}

export async function getScenario(db: Firestore, scenarioId: string): Promise<ScenarioData> {
  const snap = await db.doc(`scenarios/${scenarioId}`).get()
  if (!snap.exists) throw new GameError(404, `Scenario ${scenarioId} not found`)
  return snap.data() as ScenarioData
}

export function verifyHost(session: SessionData, uid: string): void {
  if (session.hostId !== uid) throw new GameError(403, 'Only the host can perform this action')
}

export function verifyActiveSession(session: SessionData): void {
  if (session.status !== 'active') throw new GameError(422, 'Session is not active')
}

export function verifyPhaseIs(session: SessionData, phaseId: string): void {
  if (session.phase !== phaseId)
    throw new GameError(422, `Action requires phase: ${phaseId}`)
}

export function getPhaseConfig(
  scenario: ScenarioData,
  phaseId: string,
): { id: string; yamsLocked: boolean } {
  const phase = scenario.manifest.phases.find((p) => p.id === phaseId)
  if (!phase) throw new GameError(404, `Phase ${phaseId} not found in scenario`)
  return phase
}
