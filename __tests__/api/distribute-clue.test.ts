import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestDb, insertScenario, insertSession, insertPlayer, getPlayerRow,
  HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, ACTIVE_SESSION_DATA, PLAYER_1_DATA, PLAYER_2_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { distributeClue } from '@/lib/game/distribute-clue'

describe('distributeClue', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA)
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
  })

  it('adds clue to a single target player', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    const row = getPlayerRow(db, PLAYER_1_UID)!
    expect(row.clues).toContain('evidence_1')
  })

  it('adds clue to multiple target players', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo', 'amadi'], clueId: 'oracle_1',
    })
    expect(getPlayerRow(db, PLAYER_1_UID)!.clues).toContain('oracle_1')
    expect(getPlayerRow(db, PLAYER_2_UID)!.clues).toContain('oracle_1')
  })

  it('does not duplicate a clue already held', async () => {
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    await distributeClue(db, HOST_UID, {
      sessionId: SESSION_ID, targetCharacterIds: ['okonkwo'], clueId: 'evidence_1',
    })
    const clues = getPlayerRow(db, PLAYER_1_UID)!.clues
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
