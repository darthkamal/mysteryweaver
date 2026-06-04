import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { accusations } from '@/lib/db/schema'
import {
  createTestDb, insertScenario, insertSession,
  HOST_UID, PLAYER_1_UID,
  SESSION_ID, ACTIVE_SESSION_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { submitAccusation } from '@/lib/game/submit-accusation'

const ACCUSATION_SESSION = { ...ACTIVE_SESSION_DATA, phase: 'accusation', phaseIndex: 3 }

describe('submitAccusation', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACCUSATION_SESSION)
  })

  it('stores accusation row in accusations table', async () => {
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'amadi',
      motive: 'Jealousy and shame', evidenceIds: ['evidence_1'],
    })
    const row = db.select().from(accusations)
      .where(and(eq(accusations.sessionId, SESSION_ID), eq(accusations.accuserId, PLAYER_1_UID)))
      .get()
    expect(row).not.toBeNull()
    expect(row!.suspectId).toBe('amadi')
    expect(row!.motive).toBe('Jealousy and shame')
    expect(row!.evidenceIds).toEqual(['evidence_1'])
    expect(row!.accuserId).toBe(PLAYER_1_UID)
  })

  it('overwrites a prior accusation from the same player', async () => {
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'amadi', motive: 'first', evidenceIds: ['evidence_1'],
    })
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'chielo', motive: 'changed mind', evidenceIds: ['oracle_1'],
    })
    const row = db.select().from(accusations)
      .where(and(eq(accusations.sessionId, SESSION_ID), eq(accusations.accuserId, PLAYER_1_UID)))
      .get()
    expect(row!.suspectId).toBe('chielo')
  })

  it('rejects when session is not in accusation phase', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA) // phase: investigation
    await expect(
      submitAccusation(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, suspectId: 'amadi', motive: 'greed', evidenceIds: ['evidence_1'],
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when evidenceIds is empty and requiresEvidence is true', async () => {
    await expect(
      submitAccusation(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, suspectId: 'amadi', motive: 'greed', evidenceIds: [],
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('two different players can each submit an accusation', async () => {
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'amadi', motive: 'first', evidenceIds: ['evidence_1'],
    })
    await submitAccusation(db, HOST_UID, {
      sessionId: SESSION_ID, suspectId: 'chielo', motive: 'second', evidenceIds: ['oracle_1'],
    })
    const a1 = db.select().from(accusations)
      .where(and(eq(accusations.sessionId, SESSION_ID), eq(accusations.accuserId, PLAYER_1_UID)))
      .get()
    const a2 = db.select().from(accusations)
      .where(and(eq(accusations.sessionId, SESSION_ID), eq(accusations.accuserId, HOST_UID)))
      .get()
    expect(a1).not.toBeNull()
    expect(a2).not.toBeNull()
    expect(a1!.suspectId).toBe('amadi')
    expect(a2!.suspectId).toBe('chielo')
  })
})
