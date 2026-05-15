import { text, integer, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core'

export const gms = sqliteTable('gms', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  schemaVersion: text('schema_version').notNull(),
  manifest: text('manifest').notNull(),
  characters: text('characters').notNull(),
  assets: text('assets').notNull(),
  gmScript: text('gm_script').notNull(),
  relationships: text('relationships').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').unique().notNull(),
  hostId: text('host_id').notNull(),
  scenarioId: text('scenario_id').notNull(),
  phase: text('phase').notNull(),
  phaseIndex: integer('phase_index').notNull(),
  status: text('status').notNull(),
  characterAssignments: text('character_assignments').notNull(),
  unlockedAssets: text('unlocked_assets').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const players = sqliteTable(
  'players',
  {
    sessionId: text('session_id').notNull(),
    uid: text('uid').notNull(),
    characterId: text('character_id').notNull(),
    displayName: text('display_name').notNull(),
    currencies: text('currencies').notNull(),
    clues: text('clues').notNull(),
    isOnline: integer('is_online', { mode: 'boolean' }).notNull().default(false),
    joinedAt: integer('joined_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.uid] })],
)

export const accusations = sqliteTable(
  'accusations',
  {
    sessionId: text('session_id').notNull(),
    accuserId: text('accuser_id').notNull(),
    suspectId: text('suspect_id').notNull(),
    motive: text('motive').notNull(),
    evidenceIds: text('evidence_ids').notNull(),
    submittedAt: integer('submitted_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.accuserId] })],
)

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  actorId: text('actor_id').notNull(),
  timestamp: integer('timestamp').notNull(),
})
