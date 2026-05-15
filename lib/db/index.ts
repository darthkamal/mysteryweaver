import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const dbUrl = process.env.DATABASE_URL ?? 'file:./data/mysteryweaver.db'
const dbPath = dbUrl.replace('file:', '')

const dataDir = path.dirname(path.resolve(dbPath))
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export type Db = typeof db

migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })
