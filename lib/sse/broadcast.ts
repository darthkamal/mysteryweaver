import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions, players, scenarios } from '@/lib/db/schema'
import { broadcastSession, broadcastPlayer, getConnectedUids } from './registry'

function safeParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T } catch { return null }
}

function buildSessionPayload(sessionId: string) {
  const row = db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!row) return null
  return {
    sessionId: row.id,
    scenarioId: row.scenarioId,
    phase: row.phase,
    phaseIndex: row.phaseIndex,
    status: row.status,
    hostId: row.hostId,
    characterAssignments: safeParse<Record<string, string>>(row.characterAssignments) ?? {},
    unlockedAssets: safeParse<string[]>(row.unlockedAssets) ?? [],
    triggeredNpcEvents: safeParse<string[]>(row.triggeredNpcEvents) ?? [],
  }
}

function buildPlayerPayload(sessionId: string, uid: string) {
  const playerRow = db
    .select()
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.uid, uid)))
    .get()
  if (!playerRow) return null

  // Include the player's own private character data so the client never needs to
  // fetch the full scenario (which no longer includes private fields)
  let privateCharacter = null
  const sessionRow = db.select({ scenarioId: sessions.scenarioId }).from(sessions).where(eq(sessions.id, sessionId)).get()
  if (sessionRow) {
    const scenarioRow = db.select({ characters: scenarios.characters }).from(scenarios).where(eq(scenarios.id, sessionRow.scenarioId)).get()
    if (scenarioRow) {
      const chars = safeParse<{ characters: Array<{ id: string; private: unknown }> }>(scenarioRow.characters)
      privateCharacter = chars?.characters.find((c) => c.id === playerRow.characterId)?.private ?? null
    }
  }

  return {
    characterId: playerRow.characterId,
    displayName: playerRow.displayName,
    currencies: safeParse<Record<string, number>>(playerRow.currencies) ?? {},
    clues: safeParse<string[]>(playerRow.clues) ?? [],
    privateCharacter,
  }
}

export function broadcastAll(sessionId: string): void {
  try {
    const sessionData = buildSessionPayload(sessionId)
    if (sessionData) broadcastSession(sessionId, sessionData)
  } catch (e) {
    console.error('[broadcast] session payload failed for', sessionId, e)
  }

  const uids = getConnectedUids(sessionId)
  for (const uid of uids) {
    try {
      const playerData = buildPlayerPayload(sessionId, uid)
      if (playerData) broadcastPlayer(sessionId, uid, playerData)
    } catch (e) {
      console.error('[broadcast] player payload failed for', sessionId, uid, e)
    }
  }
}
