import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq, and } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { sessions, scenarios, players } from '@/lib/db/schema'
import path from 'path'

// ── Shared test constants ─────────────────────────────────────────────────────

export const HOST_UID = 'uid_host'
export const PLAYER_1_UID = 'uid_p1'
export const PLAYER_2_UID = 'uid_p2'
export const SESSION_ID = 'TEST01'
export const SCENARIO_ID = 'kola_nut_test'

export const SCENARIO_DATA = {
  manifest: {
    phases: [
      { id: 'lobby', yamsLocked: true },
      { id: 'introduction', yamsLocked: true },
      { id: 'investigation', yamsLocked: false },
      { id: 'accusation', yamsLocked: true },
      { id: 'debrief', yamsLocked: true },
    ],
    currencies: [
      { id: 'yams', name: 'Yams', tradeable: true },
      { id: 'oracle_bones', name: 'Oracle Bones', tradeable: false },
    ],
    accusationMechanic: { allowedPhase: 'accusation', requiresEvidence: true },
  },
  characters: {
    characters: [
      { id: 'okonkwo', private: { startingInventory: { yams: 5, oracle_bones: 0 } } },
      { id: 'amadi', private: { startingInventory: { yams: 6, oracle_bones: 0 } } },
    ],
  },
  assets: {
    assets: [
      { id: 'evidence_1', triggerCondition: null },
      { id: 'evidence_4', triggerCondition: { npcEvent: 'ikemefuna_dies' } },
    ],
  },
  gmScript: {
    npcEvents: [
      {
        id: 'ikemefuna_dies',
        label: 'Ikemefuna Dies',
        unlocksAssets: ['evidence_4'],
        autoDistribute: false,
      },
    ],
  },
}

export const LOBBY_SESSION_DATA = {
  id: SESSION_ID,
  roomCode: SESSION_ID,
  hostId: HOST_UID,
  scenarioId: SCENARIO_ID,
  phase: 'lobby',
  phaseIndex: 0,
  status: 'lobby',
  characterAssignments: {} as Record<string, string>,
  unlockedAssets: [] as string[],
  triggeredNpcEvents: [] as string[],
}

export const ACTIVE_SESSION_DATA = {
  ...LOBBY_SESSION_DATA,
  phase: 'investigation',
  phaseIndex: 2,
  status: 'active',
  characterAssignments: { okonkwo: PLAYER_1_UID, amadi: PLAYER_2_UID },
}

export const PLAYER_1_DATA = {
  characterId: 'okonkwo',
  displayName: 'Player One',
  currencies: { yams: 5, oracle_bones: 0 },
  clues: [] as string[],
}

export const PLAYER_2_DATA = {
  characterId: 'amadi',
  displayName: 'Player Two',
  currencies: { yams: 6, oracle_bones: 0 },
  clues: [] as string[],
}

// ── In-memory SQLite test database ───────────────────────────────────────────

export function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })
  return db
}

export type TestDb = ReturnType<typeof createTestDb>

export function insertScenario(db: TestDb) {
  db.insert(scenarios).values({
    id: SCENARIO_ID,
    ownerId: HOST_UID,
    name: 'Test Scenario',
    schemaVersion: '1.0',
    manifest: SCENARIO_DATA.manifest,
    characters: SCENARIO_DATA.characters,
    assets: SCENARIO_DATA.assets,
    gmScript: SCENARIO_DATA.gmScript,
    relationships: { edges: [{ from: 'okonkwo', to: 'amadi', label: 'Rivals', public: true }] },
    createdAt: Date.now(),
  }).run()
}

export function insertSession(
  db: TestDb,
  data: typeof LOBBY_SESSION_DATA | typeof ACTIVE_SESSION_DATA,
) {
  db.insert(sessions).values({
    id: data.id,
    roomCode: data.roomCode,
    hostId: data.hostId,
    scenarioId: data.scenarioId,
    phase: data.phase,
    phaseIndex: data.phaseIndex,
    status: data.status,
    characterAssignments: data.characterAssignments,
    unlockedAssets: data.unlockedAssets,
    triggeredNpcEvents: data.triggeredNpcEvents,
    createdAt: Date.now(),
  }).run()
}

export function insertPlayer(
  db: TestDb,
  uid: string,
  data: typeof PLAYER_1_DATA | typeof PLAYER_2_DATA,
) {
  db.insert(players).values({
    sessionId: SESSION_ID,
    uid,
    characterId: data.characterId,
    displayName: data.displayName,
    currencies: data.currencies,
    clues: data.clues,
    isOnline: true,
    joinedAt: Date.now(),
  }).run()
}

export function getPlayerRow(db: TestDb, uid: string) {
  return db.select().from(players)
    .where(and(eq(players.sessionId, SESSION_ID), eq(players.uid, uid)))
    .get()
}

export function getSessionRow(db: TestDb) {
  return db.select().from(sessions).where(eq(sessions.id, SESSION_ID)).get()
}
