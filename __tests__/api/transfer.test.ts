import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, SCENARIO_ID, ACTIVE_SESSION, SCENARIO_DATA,
  PLAYER_1, PLAYER_2,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { transferCurrency } from '@/lib/game/transfer'

function makeDb() {
  return createMockDb({
    [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
    [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
    [`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`]: PLAYER_1,
    [`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`]: PLAYER_2,
  })
}

describe('transferCurrency', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = makeDb()
  })

  it('decrements sender balance and increments recipient balance', async () => {
    await transferCurrency(db, PLAYER_1_UID, {
      sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 3,
    })
    const p1 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()).data()!
    const p2 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`).get()).data()!
    expect(p1['currencies']['yams']).toBe(2)
    expect(p2['currencies']['yams']).toBe(9)
  })

  it('rejects when balance is insufficient', async () => {
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 99,
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when yams are locked in the current phase', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: { ...ACTIVE_SESSION, phase: 'accusation' },
      [`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`]: PLAYER_1,
      [`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`]: PLAYER_2,
    })
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
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: { ...ACTIVE_SESSION, status: 'ended' },
      [`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`]: PLAYER_1,
    })
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID, toCharacterId: 'amadi', currencyType: 'yams', amount: 1,
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects when player tries to transfer to themselves', async () => {
    // PLAYER_1_UID controls 'okonkwo'; transferring to 'okonkwo' while being okonkwo
    await expect(
      transferCurrency(db, PLAYER_1_UID, {
        sessionId: SESSION_ID,
        toCharacterId: 'okonkwo',
        currencyType: 'yams',
        amount: 1,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })
})
