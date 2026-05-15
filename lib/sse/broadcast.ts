import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessions, players } from '@/lib/db/schema'
import { broadcastSession, broadcastPlayer, getConnectedUids } from './registry'

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
    characterAssignments: JSON.parse(row.characterAssignments) as Record<string, string>,
    unlockedAssets: JSON.parse(row.unlockedAssets) as string[],
  }
}

function buildPlayerPayload(sessionId: string, uid: string) {
  const row = db
    .select()
    .from(players)
    .where(and(eq(players.sessionId, sessionId), eq(players.uid, uid)))
    .get()
  if (!row) return null
  return {
    characterId: row.characterId,
    displayName: row.displayName,
    currencies: JSON.parse(row.currencies) as Record<string, number>,
    clues: JSON.parse(row.clues) as string[],
  }
}

export function broadcastAll(sessionId: string): void {
  const sessionData = buildSessionPayload(sessionId)
  if (sessionData) broadcastSession(sessionId, sessionData)

  const uids = getConnectedUids(sessionId)
  for (const uid of uids) {
    const playerData = buildPlayerPayload(sessionId, uid)
    if (playerData) broadcastPlayer(sessionId, uid, playerData)
  }
}
