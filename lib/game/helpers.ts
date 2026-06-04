import { eq, and } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { sessions, scenarios, players } from '@/lib/db/schema'
import { GameError } from './types'
import type { SessionData, ScenarioData } from './types'

// The composite-key predicate for the players table, repeated across every
// per-player read/write. Works against both `db` and a transaction handle.
export function playerKey(sessionId: string, uid: string) {
  return and(eq(players.sessionId, sessionId), eq(players.uid, uid))
}

export function getSession(db: Db, sessionId: string): SessionData {
  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!row) throw new GameError(404, `Session ${sessionId} not found`)
  return {
    id: row.id,
    roomCode: row.roomCode,
    hostId: row.hostId,
    scenarioId: row.scenarioId,
    phase: row.phase,
    phaseIndex: row.phaseIndex,
    status: row.status as 'lobby' | 'active' | 'ended',
    characterAssignments: row.characterAssignments,
    unlockedAssets: row.unlockedAssets,
    triggeredNpcEvents: row.triggeredNpcEvents,
  }
}

export function getScenario(db: Db, scenarioId: string): ScenarioData {
  const row = db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).get()
  if (!row) throw new GameError(404, `Scenario ${scenarioId} not found`)
  return {
    manifest: row.manifest as ScenarioData['manifest'],
    characters: row.characters as ScenarioData['characters'],
    assets: row.assets as ScenarioData['assets'],
    gmScript: row.gmScript as ScenarioData['gmScript'],
  }
}

export function verifyHost(session: SessionData, uid: string): void {
  if (session.hostId !== uid) throw new GameError(403, 'Only the host can perform this action')
}

export function verifyActiveSession(session: SessionData): void {
  if (session.status !== 'active') throw new GameError(422, 'Session is not active')
}

export function verifyPhaseIs(session: SessionData, phaseId: string): void {
  if (session.phase !== phaseId)
    throw new GameError(422, 'This action is not available in the current phase')
}

export function getPhaseConfig(
  scenario: ScenarioData,
  phaseId: string,
): { id: string; yamsLocked: boolean } {
  const phase = scenario.manifest.phases.find((p) => p.id === phaseId)
  if (!phase) throw new GameError(404, `Phase ${phaseId} not found in scenario`)
  return phase
}
