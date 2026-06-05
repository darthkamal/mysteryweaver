import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import type { Db } from '@/lib/db'
import { sessions, players, scenarios, accusations } from '@/lib/db/schema'

// Shared payload builders for both live broadcasts (broadcast.ts) and the
// initial state pushed when a client first connects (the SSE route handlers).
// Keeping them here ensures connect-time and update-time payloads stay identical.

export function buildSessionPayload(sessionId: string) {
  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!row) return null
  return {
    sessionId: row.id,
    scenarioId: row.scenarioId,
    phase: row.phase,
    phaseIndex: row.phaseIndex,
    status: row.status,
    hostId: row.hostId,
    characterAssignments: row.characterAssignments,
    unlockedAssets: row.unlockedAssets,
    triggeredNpcEvents: row.triggeredNpcEvents,
  }
}

export function buildPlayerPayload(database: Db, sessionId: string, uid: string) {
  const playerRow = database
    .select()
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.uid, uid)))
    .get()
  if (!playerRow) return null

  // Include the player's own private character data so the client never needs to
  // fetch the full scenario (which no longer includes private fields)
  let privateCharacter = null
  const sessionRow = database.select({ scenarioId: sessions.scenarioId }).from(sessions).where(eq(sessions.id, sessionId)).get()
  if (sessionRow) {
    const scenarioRow = database.select({ characters: scenarios.characters }).from(scenarios).where(eq(scenarios.id, sessionRow.scenarioId)).get()
    if (scenarioRow) {
      const chars = scenarioRow.characters as { characters: Array<{ id: string; private: unknown }> }
      privateCharacter = chars.characters.find((c) => c.id === playerRow.characterId)?.private ?? null
    }
  }

  const accusationRow = database
    .select()
    .from(accusations)
    .where(and(eq(accusations.sessionId, sessionId), eq(accusations.accuserId, uid)))
    .get()
  const myAccusation = accusationRow
    ? {
        suspectId: accusationRow.suspectId,
        motive: accusationRow.motive,
        evidenceIds: accusationRow.evidenceIds,
        submittedAt: accusationRow.submittedAt,
      }
    : null

  return {
    characterId: playerRow.characterId,
    displayName: playerRow.displayName,
    currencies: playerRow.currencies,
    clues: playerRow.clues,
    privateCharacter,
    myAccusation,
  }
}

export function buildRosterPayload(sessionId: string) {
  const rows = db.select().from(players).where(eq(players.sessionId, sessionId)).all()
  return {
    players: rows.map((row) => ({
      uid: row.uid,
      characterId: row.characterId,
      displayName: row.displayName,
      currencies: row.currencies,
      clues: row.clues,
      isOnline: row.isOnline,
    })),
  }
}

export function buildAccusationsPayload(sessionId: string) {
  const rows = db.select().from(accusations).where(eq(accusations.sessionId, sessionId)).all()
  return {
    accusations: rows.map((row) => ({
      accuserId: row.accuserId,
      suspectId: row.suspectId,
      motive: row.motive,
      evidenceIds: row.evidenceIds,
      submittedAt: row.submittedAt,
    })),
  }
}
