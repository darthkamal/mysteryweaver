import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID,
  SESSION_ID, SCENARIO_ID, ACTIVE_SESSION, SCENARIO_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { submitAccusation } from '@/lib/game/submit-accusation'

const ACCUSATION_SESSION = { ...ACTIVE_SESSION, phase: 'accusation', phaseIndex: 3 }

describe('submitAccusation', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: ACCUSATION_SESSION,
    })
  })

  it('stores accusation in /accusations/{uid}', async () => {
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID,
      suspectId: 'amadi',
      motive: 'Jealousy and shame',
      evidenceIds: ['evidence_1'],
    })
    const snap = await db.doc(`sessions/${SESSION_ID}/accusations/${PLAYER_1_UID}`).get()
    expect(snap.exists).toBe(true)
    expect(snap.data()!['suspectId']).toBe('amadi')
    expect(snap.data()!['motive']).toBe('Jealousy and shame')
    expect(snap.data()!['evidenceIds']).toEqual(['evidence_1'])
    expect(snap.data()!['accuserId']).toBe(PLAYER_1_UID)
  })

  it('overwrites a prior accusation from the same player', async () => {
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'amadi', motive: 'first', evidenceIds: ['evidence_1'],
    })
    await submitAccusation(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, suspectId: 'chielo', motive: 'changed mind', evidenceIds: ['oracle_1'],
    })
    const snap = await db.doc(`sessions/${SESSION_ID}/accusations/${PLAYER_1_UID}`).get()
    expect(snap.data()!['suspectId']).toBe('chielo')
  })

  it('rejects when session is not in accusation phase', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
    })
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
    const a1 = await db.doc(`sessions/${SESSION_ID}/accusations/${PLAYER_1_UID}`).get()
    const a2 = await db.doc(`sessions/${SESSION_ID}/accusations/${HOST_UID}`).get()
    expect(a1.exists).toBe(true)
    expect(a2.exists).toBe(true)
    expect(a1.data()!['suspectId']).toBe('amadi')
    expect(a2.data()!['suspectId']).toBe('chielo')
  })
})
