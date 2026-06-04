import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../lib/db/schema'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'

async function main() {
  const sqlite = new Database('./data/mysteryweaver.db')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })

  const scenariosDir = './scenarios/broken-kola-nut'
  const manifest = JSON.parse(fs.readFileSync(`${scenariosDir}/manifest.json`, 'utf-8'))
  const characters = JSON.parse(fs.readFileSync(`${scenariosDir}/characters.json`, 'utf-8'))
  const assets = JSON.parse(fs.readFileSync(`${scenariosDir}/assets.json`, 'utf-8'))
  const gmScript = JSON.parse(fs.readFileSync(`${scenariosDir}/gm_script.json`, 'utf-8'))
  const relationships = JSON.parse(fs.readFileSync(`${scenariosDir}/relationships.json`, 'utf-8'))

  const scenarioId = 'broken-kola-nut'
  const hostId = '286cdc96-d256-4a7b-a6eb-8b09191115b7'

  db.insert(schema.scenarios).values({
    id: scenarioId,
    ownerId: hostId,
    name: 'The Broken Kola Nut',
    schemaVersion: '1.0',
    manifest,
    characters,
    assets,
    gmScript,
    relationships,
    createdAt: Date.now(),
  }).onConflictDoUpdate({
    target: schema.scenarios.id,
    set: { name: 'The Broken Kola Nut' }
  }).run()
  console.log('✓ Scenario inserted')

  const sessionId = randomUUID()
  db.insert(schema.sessions).values({
    id: sessionId,
    roomCode: 'TEST01',
    hostId,
    scenarioId,
    phase: 'lobby',
    phaseIndex: 0,
    status: 'lobby',
    characterAssignments: {},
    unlockedAssets: [],
    createdAt: Date.now(),
  }).run()

  console.log(`✓ Session created: roomCode=TEST01, id=${sessionId}`)
  sqlite.close()
}

main().catch(console.error)
