import { eq } from 'drizzle-orm'
import type { Db } from '@/lib/db'
import { sessions, scenarios } from '@/lib/db/schema'
import { GameError } from './types'
import type { SessionData, ScenarioData } from './types'

function safeJsonParse<T>(raw: string, field: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new GameError(500, `Corrupt data in field: ${field}`)
  }
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
    characterAssignments: safeJsonParse(row.characterAssignments, 'characterAssignments'),
    unlockedAssets: safeJsonParse(row.unlockedAssets, 'unlockedAssets'),
  }
}

export function getScenario(db: Db, scenarioId: string): ScenarioData {
  const row = db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).get()
  if (!row) throw new GameError(404, `Scenario ${scenarioId} not found`)
  return {
    manifest: safeJsonParse(row.manifest, 'manifest'),
    characters: safeJsonParse(row.characters, 'characters'),
    assets: safeJsonParse(row.assets, 'assets'),
    gmScript: safeJsonParse(row.gmScript, 'gmScript'),
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
