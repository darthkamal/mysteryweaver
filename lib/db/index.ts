import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

// Fail hard at startup if JWT_SECRET is missing — better than silent runtime 500s
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL ?? 'file:./data/mysteryweaver.db'
if (!dbUrl.startsWith('file:')) {
  console.error('[FATAL] DATABASE_URL must use the file: scheme.')
  process.exit(1)
}
const dbPath = path.resolve(dbUrl.slice(5))

const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

let sqlite: Database.Database
try {
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
} catch (e) {
  console.error('[FATAL] Failed to open SQLite database:', e)
  process.exit(1)
}

export const db = drizzle(sqlite, { schema })
export type Db = typeof db

try {
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })
} catch (e) {
  console.error('[FATAL] Database migration failed:', e)
  process.exit(1)
}
