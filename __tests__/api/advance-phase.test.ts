import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestDb, insertScenario, insertSession, getSessionRow,
  HOST_UID, PLAYER_1_UID,
  SESSION_ID, LOBBY_SESSION_DATA, ACTIVE_SESSION_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { advancePhase } from '@/lib/game/advance-phase'

describe('advancePhase', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA) // phase: investigation, phaseIndex: 2
  })

  it('advances from investigation to accusation', async () => {
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const row = getSessionRow(db)!
    expect(row.phase).toBe('accusation')
    expect(row.phaseIndex).toBe(3)
  })

  it('sets status to ended when advancing to the last phase', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, { ...ACTIVE_SESSION_DATA, phase: 'accusation', phaseIndex: 3 })
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const row = getSessionRow(db)!
    expect(row.phase).toBe('debrief')
    expect(row.status).toBe('ended')
  })

  it('sets status to active when advancing from lobby', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, { ...LOBBY_SESSION_DATA, phase: 'lobby', phaseIndex: 0, status: 'lobby' })
    await advancePhase(db, HOST_UID, { sessionId: SESSION_ID })
    const row = getSessionRow(db)!
    expect(row.phase).toBe('introduction')
    expect(row.status).toBe('active')
  })

  it('rejects when caller is not the host', async () => {
    await expect(
      advancePhase(db, PLAYER_1_UID, { sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects when already on the last phase', async () => {
    db = createTestDb()
    insertScenario(db)
    insertSession(db, { ...ACTIVE_SESSION_DATA, phase: 'debrief', phaseIndex: 4 })
    await expect(
      advancePhase(db, HOST_UID, { sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ status: 422 })
  })
})
