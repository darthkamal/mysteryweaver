import { describe, it, expect, beforeEach } from 'vitest'
import { accusations } from '@/lib/db/schema'
import { buildPlayerPayload, buildSessionPayload, buildPlayerSessionPayload } from '@/lib/sse/payloads'
import {
  createTestDb, insertScenario, insertSession, insertPlayer,
  ACTIVE_SESSION_DATA, PLAYER_1_DATA, PLAYER_1_UID, PLAYER_2_DATA, PLAYER_2_UID, SESSION_ID,
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

describe('session payloads — player token exposure', () => {
  let db: ReturnType<typeof createTestDb>
  beforeEach(() => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA) // characterAssignments: { okonkwo: PLAYER_1_UID, amadi: PLAYER_2_UID }
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
  })

  it('GM session payload retains the characterId -> uid map', () => {
    const payload = buildSessionPayload(db, SESSION_ID)
    expect(payload?.characterAssignments).toEqual({
      okonkwo: PLAYER_1_UID,
      amadi: PLAYER_2_UID,
    })
  })

  it('player session payload never exposes any player uid (bearer token)', () => {
    const payload = buildPlayerSessionPayload(db, SESSION_ID)
    const values = Object.values(payload?.characterAssignments ?? {})
    // Keys (which characters are taken) are still present...
    expect(Object.keys(payload?.characterAssignments ?? {}).sort()).toEqual(['amadi', 'okonkwo'])
    // ...but no value is a player uid / bearer token.
    expect(values).not.toContain(PLAYER_1_UID)
    expect(values).not.toContain(PLAYER_2_UID)
    // Values are display names, not secrets.
    expect(payload?.characterAssignments).toEqual({
      okonkwo: PLAYER_1_DATA.displayName,
      amadi: PLAYER_2_DATA.displayName,
    })
  })
})
