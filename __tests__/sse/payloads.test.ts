import { describe, it, expect, beforeEach } from 'vitest'
import { accusations } from '@/lib/db/schema'
import { buildPlayerPayload } from '@/lib/sse/payloads'
import {
  createTestDb, insertScenario, insertSession, insertPlayer,
  ACTIVE_SESSION_DATA, PLAYER_1_DATA, PLAYER_1_UID, SESSION_ID,
} from '../api/helpers'

describe('buildPlayerPayload', () => {
  let db: ReturnType<typeof createTestDb>
  beforeEach(() => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA)
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
  })

  it('includes myAccusation: null when the player has not accused', () => {
    const payload = buildPlayerPayload(db, SESSION_ID, PLAYER_1_UID)
    expect(payload?.myAccusation).toBeNull()
  })

  it("includes the player's own accusation when one exists", () => {
    db.insert(accusations).values({
      sessionId: SESSION_ID, accuserId: PLAYER_1_UID,
      suspectId: 'amadi', motive: 'jealousy', evidenceIds: ['evidence_1'],
      submittedAt: Date.now(),
    }).run()
    const payload = buildPlayerPayload(db, SESSION_ID, PLAYER_1_UID)
    expect(payload?.myAccusation).toMatchObject({
      suspectId: 'amadi', motive: 'jealousy', evidenceIds: ['evidence_1'],
    })
  })
})
