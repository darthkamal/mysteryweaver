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
// `file::memory:` → a throwaway in-memory database (used during `next build`,
// where route modules are imported but no real persistence is wanted).
const rawPath = dbUrl.slice(5)
const isMemory = rawPath === ':memory:'
const dbPath = isMemory ? ':memory:' : path.resolve(rawPath)

if (!isMemory) {
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

let sqlite: Database.Database
try {
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  // Wait for the write lock instead of throwing SQLITE_BUSY under concurrency
  // (concurrent SSE-driven writes at runtime; parallel route imports at build).
  sqlite.pragma('busy_timeout = 5000')
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
