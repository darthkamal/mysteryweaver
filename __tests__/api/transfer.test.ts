import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestDb, insertScenario, insertSession, insertPlayer, getPlayerRow,
  HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, ACTIVE_SESSION_DATA, PLAYER_1_DATA, PLAYER_2_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { transferCurrency } from '@/lib/game/transfer'

describe('transferCurrency', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA)
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
  })

  it('decrements sender balance and increments recipient balance', async () => {
    await transferCurrency(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 3,
    })
    const p1 = getPlayerRow(db, PLAYER_1_UID)!
    const p2 = getPlayerRow(db, PLAYER_2_UID)!
    expect(JSON.parse(p1.currencies).yams).toBe(2)
    expect(JSON.parse(p2.currencies).yams).toBe(9)
  })

  it('rejects when balance is insufficient', async () => {
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 99,
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when yams are locked in the current phase', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, { ...ACTIVE_SESSION_DATA, phase: 'accusation', phaseIndex: 3 })
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 1,
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when amount is zero or negative', async () => {
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 0,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects when recipient character is not in the session', async () => {
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'nobody', currencyType: 'yams', amount: 1,
      }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('rejects when session is not active', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, { ...ACTIVE_SESSION_DATA, status: 'ended' })
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 1,
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when player tries to transfer to themselves', async () => {
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'okonkwo', currencyType: 'yams', amount: 1,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })
})
