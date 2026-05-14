import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockDb, HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, SCENARIO_ID, ACTIVE_SESSION, SCENARIO_DATA,
  PLAYER_1, PLAYER_2,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }))

import { triggerNpcEvent } from '@/lib/game/trigger-npc-event'

describe('triggerNpcEvent', () => {
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

  it('adds unlocked assets to session.unlockedAssets (deduplicated)', async () => {
    await triggerNpcEvent(db, HOST_UID, {
      sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies',
    })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    expect(snap.data()!['unlockedAssets']).toContain('evidence_4')
  })

  it('does not duplicate if triggered twice', async () => {
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const snap = await db.doc(`sessions/${SESSION_ID}`).get()
    const unlocked = snap.data()!['unlockedAssets'] as string[]
    expect(unlocked.filter((a) => a === 'evidence_4')).toHaveLength(1)
  })

  it('auto-distributes clues to all players when autoDistribute is true', async () => {
    const autoScenario = {
      ...SCENARIO_DATA,
      gmScript: {
        npcEvents: [
          { id: 'ikemefuna_dies', label: 'Ikemefuna Dies', unlocksAssets: ['evidence_4'], autoDistribute: true },
        ],
      },
    }
    db = createMockDb({
      [`scenarios/${SCENARIO_ID}`]: autoScenario,
      [`sessions/${SESSION_ID}`]: ACTIVE_SESSION,
      [`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`]: PLAYER_1,
      [`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`]: PLAYER_2,
    })
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const p1 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_1_UID}`).get()).data()!
    const p2 = (await db.doc(`sessions/${SESSION_ID}/players/${PLAYER_2_UID}`).get()).data()!
    expect(p1['clues']).toContain('evidence_4')
    expect(p2['clues']).toContain('evidence_4')
  })

  it('rejects when caller is not the host', async () => {
    await expect(
      triggerNpcEvent(db, PLAYER_1_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects when npcEventId does not exist in scenario', async () => {
    await expect(
      triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'bad_event' }),
    ).rejects.toMatchObject({ status: 404 })
  })
})
