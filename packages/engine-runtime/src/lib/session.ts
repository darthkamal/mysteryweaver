import type { Firestore } from 'firebase-admin/firestore'
import { notFound, failedPrecondition, permissionDenied } from './errors.js'

export type SessionData = {
  roomCode: string
  hostId: string
  scenarioId: string
  phase: string
  phaseIndex: number
  status: 'lobby' | 'active' | 'ended'
  startedAt: FirebaseFirestore.Timestamp
  accusation: null | Record<string, unknown>
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
}

export type ScenarioData = {
  ownerId: string
  manifest: {
    phases: Array<{ id: string; yamsLocked: boolean }>
    accusationMechanic: { allowedPhase: string; whoCanAccuse: string; requiresEvidence: boolean }
  }
  characters: { characters: Array<{ id: string; private: { startingInventory: Record<string, number> } }> }
  assets: { assets: Array<{ id: string; triggerCondition: null | { npcEvent: string } }> }
  gmScript: { npcEvents: Array<{ id: string; label: string; unlocksAssets: string[]; autoDistribute: boolean }> }
}

export async function getSession(db: Firestore, sessionId: string): Promise<SessionData> {
  const snap = await db.doc(`sessions/${sessionId}`).get()
  if (!snap.exists) throw notFound(`Session ${sessionId} not found`)
  return snap.data() as SessionData
}

export async function getScenario(db: Firestore, scenarioId: string): Promise<ScenarioData> {
  const snap = await db.doc(`scenarios/${scenarioId}`).get()
  if (!snap.exists) throw notFound(`Scenario ${scenarioId} not found`)
  return snap.data() as ScenarioData
}

export function verifyHost(session: SessionData, uid: string): void {
  if (session.hostId !== uid) throw permissionDenied('Only the host can perform this action')
}

export function verifyActiveSession(session: SessionData): void {
  if (session.status !== 'active') throw failedPrecondition('Session is not active')
}

export function verifyPhaseIs(session: SessionData, phaseId: string): void {
  if (session.phase !== phaseId) throw failedPrecondition(`Action requires phase: ${phaseId}`)
}

export function getPhaseConfig(
  scenario: ScenarioData,
  phaseId: string
): { id: string; yamsLocked: boolean } {
  const phase = scenario.manifest.phases.find((p) => p.id === phaseId)
  if (!phase) throw notFound(`Phase ${phaseId} not found in scenario`)
  return phase
}
