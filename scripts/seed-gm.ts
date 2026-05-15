import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../lib/db/schema'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import path from 'path'

const args = process.argv.slice(2)
const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1]
const passwordArg = args.find((a) => a.startsWith('--password='))?.split('=')[1]
const displayNameArg = args.find((a) => a.startsWith('--name='))?.split('=')[1]

if (!emailArg || !passwordArg) {
  console.error('Usage: pnpm seed-gm --email=gm@example.com --password=secret [--name="Game Master"]')
  process.exit(1)
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./data/mysteryweaver.db'
  const sqlite = new Database(dbUrl.replace('file:', ''))
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })

  const passwordHash = await bcrypt.hash(passwordArg!, 12)
  const id = randomUUID()

  db.insert(schema.gms).values({
    id,
    email: emailArg!,
    passwordHash,
    displayName: displayNameArg ?? 'Game Master',
    createdAt: Date.now(),
  }).run()

  console.log(`✓ GM created: ${emailArg} (id: ${id})`)
  sqlite.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
