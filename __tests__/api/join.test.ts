import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, SCENARIO_ID, LOBBY_SESSION, ACTIVE_SESSION, SCENARIO_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { joinGame } from '@/lib/game/join'

describe('joinGame', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: LOBBY_SESSION,
    })
  })

  it('creates player doc with correct starting inventory', async () => {
    await joinGame(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Warrior',
    })
    const snap = await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()
    expect(snap.exists).toBe(true)
    expect(snap.data()!['characterId']).toBe('okonkwo')
    expect(snap.data()!['displayName']).toBe('Warrior')
    expect(snap.data()!['currencies']).toEqual({ yams: 5, oracle_bones: 0 })
    expect(snap.data()!['clues']).toEqual([])
    expect(snap.data()!['isOnline']).toBe(true)
  })

  it('records character claim in session.characterAssignments', async () => {
    await joinGame(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Warrior',
    })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    expect(snap.data()!['characterAssignments']).toMatchObject({ okonkwo: PLAYER_1_UID })
  })

  it('rejects when character is already claimed', async () => {
    await joinGame(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'First',
    })
    await expect(
      joinGame(db, PLAYER_2_UID, {
        sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Second',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('rejects when session is not in lobby', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
    })
    await expect(
      joinGame(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Late',
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when character is not in scenario', async () => {
    await expect(
      joinGame(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, characterId: 'nobody', displayName: 'Ghost',
      }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('rejects when session does not exist', async () => {
    await expect(
      joinGame(db, PLAYER_1_UID, {
        sessionId: 'MISSING', characterId: 'okonkwo', displayName: 'Nobody',
      }),
    ).rejects.toMatchObject({ status: 404 })
  })
})
