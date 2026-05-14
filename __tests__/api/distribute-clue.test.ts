import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, SCENARIO_ID, ACTIVE_SESSION, SCENARIO_DATA,
  PLAYER_1, PLAYER_2,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { distributeClue } from '@/lib/game/distribute-clue'

describe('distributeClue', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
      [`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`]: PLAYER_1,
      [`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`]: PLAYER_2,
    })
  })

  it('adds clue to a single target player', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    const snap = await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()
    expect(snap.data()!['clues']).toContain('evidence_1')
  })

  it('adds clue to multiple target players', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo', 'amadi'], clueId: 'oracle_1',
    })
    const p1 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()).data()!
    const p2 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`).get()).data()!
    expect(p1['clues']).toContain('oracle_1')
    expect(p2['clues']).toContain('oracle_1')
  })

  it('does not duplicate a clue already held', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    const snap = await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()
    const clues = snap.data()!['clues'] as string[]
    expect(clues.filter((c) => c === 'evidence_1')).toHaveLength(1)
  })

  it('rejects when caller is not the host', async () => {
    await expect(
      distributeClue(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, targetCharacterIds: ['amadi'], clueId: 'evidence_1',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects when a target character is not in the session', async () => {
    await expect(
      distributeClue(db, HOST_UID, {
        sessionId: SESSION_ID, targetCharacterIds: ['nobody'], clueId: 'evidence_1',
      }),
    ).rejects.toMatchObject({ status: 404 })
  })
})
