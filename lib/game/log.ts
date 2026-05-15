import type { Db } from '@/lib/db'
import { logs } from '@/lib/db/schema'

export type LogType =
  | 'join'
  | 'transaction'
  | 'clue_given'
  | 'phase_change'
  | 'npc_event'
  | 'accusation'

export function writeLog(
  db: Db,
  sessionId: string,
  entry: { type: LogType; message: string; actorId: string },
): void {
  db.insert(logs).values({
    sessionId,
    type: entry.type,
    message: entry.message,
    actorId: entry.actorId,
    timestamp: Date.now(),
  }).run()
}
