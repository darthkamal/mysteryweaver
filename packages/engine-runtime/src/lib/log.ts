import { FieldValue } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

export type LogType = 'join' | 'transaction' | 'clue_given' | 'phase_change' | 'npc_event' | 'accusation'

export async function writeLog(
  db: Firestore,
  sessionId: string,
  entry: { type: LogType; message: string; actorId: string }
): Promise<void> {
  await db.collection(`sessions/${sessionId}/logs`).add({
    ...entry,
    timestamp: FieldValue.serverTimestamp(),
  })
}
