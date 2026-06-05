import { db } from '@/lib/db'
import { broadcastSession, broadcastPlayer, getConnectedUids, broadcastGm } from './registry'
import {
  buildSessionPayload,
  buildPlayerPayload,
  buildRosterPayload,
  buildAccusationsPayload,
} from './payloads'

export function broadcastGmFull(sessionId: string): void {
  try {
    const sessionData = buildSessionPayload(sessionId)
    if (sessionData) broadcastGm(sessionId, 'session-updated', sessionData)
  } catch (e) {
    console.error('[broadcast] GM session payload failed for', sessionId, e)
  }
  try {
    broadcastGm(sessionId, 'roster-updated', buildRosterPayload(sessionId))
  } catch (e) {
    console.error('[broadcast] GM roster payload failed for', sessionId, e)
  }
  try {
    broadcastGm(sessionId, 'accusations-updated', buildAccusationsPayload(sessionId))
  } catch (e) {
    console.error('[broadcast] GM accusations payload failed for', sessionId, e)
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
      const playerData = buildPlayerPayload(db, sessionId, uid)
      if (playerData) broadcastPlayer(sessionId, uid, playerData)
    } catch (e) {
      console.error('[broadcast] player payload failed for', sessionId, uid, e)
    }
  }
  broadcastGmFull(sessionId)
}
