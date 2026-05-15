import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scenarios } from '@/lib/db/schema'
import {
  createTestDb, insertScenario, insertSession, insertPlayer, getPlayerRow, getSessionRow,
  HOST_UID, PLAYER_1_UID, PLAYER_2_UID,
  SESSION_ID, SCENARIO_ID, SCENARIO_DATA, ACTIVE_SESSION_DATA, PLAYER_1_DATA, PLAYER_2_DATA,
} from './helpers'

vi.mock('@/lib/game/log', () => ({ writeLog: vi.fn() }))

import { triggerNpcEvent } from '@/lib/game/trigger-npc-event'

describe('triggerNpcEvent', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createTestDb()
    insertScenario(db)
    insertSession(db, ACTIVE_SESSION_DATA)
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
  })

  it('adds unlocked assets to session.unlockedAssets (deduplicated)', async () => {
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const row = getSessionRow(db)!
    expect(JSON.parse(row.unlockedAssets)).toContain('evidence_4')
  })

  it('does not duplicate if triggered twice', async () => {
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const unlocked = JSON.parse(getSessionRow(db)!.unlockedAssets) as string[]
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
    db = createTestDb()
    db.insert(scenarios).values({
      id: SCENARIO_ID, ownerId: HOST_UID, name: 'Test', schemaVersion: '1.0',
      manifest: JSON.stringify(autoScenario.manifest),
      characters: JSON.stringify(autoScenario.characters),
      assets: JSON.stringify(autoScenario.assets),
      gmScript: JSON.stringify(autoScenario.gmScript),
      relationships: JSON.stringify({ edges: [] }),
      createdAt: Date.now(),
    }).run()
    insertSession(db, ACTIVE_SESSION_DATA)
    insertPlayer(db, PLAYER_1_UID, PLAYER_1_DATA)
    insertPlayer(db, PLAYER_2_UID, PLAYER_2_DATA)
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    expect(JSON.parse(getPlayerRow(db, PLAYER_1_UID)!.clues)).toContain('evidence_4')
    expect(JSON.parse(getPlayerRow(db, PLAYER_2_UID)!.clues)).toContain('evidence_4')
  })

  it('records the triggered event id in session.triggeredNpcEvents', async () => {
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const row = getSessionRow(db)!
    const triggered = JSON.parse(row.triggeredNpcEvents) as string[]
    expect(triggered).toContain('ikemefuna_dies')
  })

  it('does not duplicate triggeredNpcEvents when called twice', async () => {
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    await triggerNpcEvent(db, HOST_UID, { sessionId: SESSION_ID, npcEventId: 'ikemefuna_dies' })
    const triggered = JSON.parse(getSessionRow(db)!.triggeredNpcEvents) as string[]
    expect(triggered.filter((e) => e === 'ikemefuna_dies')).toHaveLength(1)
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
