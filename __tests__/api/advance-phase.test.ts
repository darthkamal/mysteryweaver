import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID,
  SESSION_ID, SCENARIO_ID, ACTIVE_SESSION, SCENARIO_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { advancePhase } from '@/lib/game/advance-phase'

describe('advancePhase', () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
    })
  })

  it('advances from investigation to accusation', async () => {
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    expect(snap.data()!['phase']).toBe('accusation')
    expect(snap.data()!['phaseIndex']).toBe(3)
  })

  it('sets status to ended when advancing to the last phase', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: { ...ACTIVE_SESSION, phase: 'accusation', phaseIndex: 3 },
    })
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    expect(snap.data()!['phase']).toBe('debrief')
    expect(snap.data()!['status']).toBe('ended')
  })

  it('sets status to active when advancing from lobby for the first time', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: { ...ACTIVE_SESSION, phase: 'lobby', phaseIndex: 0, status: 'lobby' },
    })
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    expect(snap.data()!['phase']).toBe('introduction')
    expect(snap.data()!['status']).toBe('active')
  })

  it('rejects when caller is not the host', async () => {
    await expect(
      advancePhase(db, PLAYER_1_UID, { sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects when already on the last phase', async () => {
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: SCENARIO_DATA,
      [`sessions/${SESSION_ID}`]: { ...ACTIVE_SESSION, phase: 'debrief', phaseIndex: 4 },
    })
    await expect(
      advancePhase(db, HOST_UID, { sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ status: 422 })
  })
})
