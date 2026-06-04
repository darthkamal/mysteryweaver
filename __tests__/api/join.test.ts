import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { players, sessions } from '@/lib/db/schema'
import {
  createTestDb, insertScenario, insertSession, getPlayerRow, getSessionRow,
  HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, LOBBY_SESSION_DATA, ACTIVE_SESSION_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { joinGame } from '@/lib/game/join'

describe('joinGame', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, LOBBY_SESSION_DATA)
  })

  it('creates player row with correct starting inventory', async () => {
    await joinGame(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Warrior',
    })
    const row = getPlayerRow(db, PLAYER_1_UID)
    expect(row).not.toBeNull()
    expect(row!.characterId).toBe('okonkwo')
    expect(row!.displayName).toBe('Warrior')
    expect(row!.currencies).toEqual({ yams: 5, oracle_bones: 0 })
    expect(row!.clues).toEqual([])
    expect(row!.isOnline).toBe(true)
  })

  it('records character claim in session.characterAssignments', async () => {
    await joinGame(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, characterId: 'okonkwo', displayName: 'Warrior',
    })
    const sessionRow = getSessionRow(db)
    expect(sessionRow!.characterAssignments.okonkwo).toBe(PLAYER_1_UID)
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
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA)
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
