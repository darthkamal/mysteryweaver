import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import {
  ManifestSchema, CharactersSchema, AssetsSchema, GmScriptSchema, RelationshipsSchema,
} from '../lib/schemas'
import path from 'path'
import fs from 'fs'

// Loads every scenario folder under scenarios/future/, validates all five files
// against the same Zod schemas the dashboard upload route uses, and inserts each
// into the scenarios table so it appears in the GM dashboard. Idempotent: re-running
// refreshes existing rows (matched by the stable slug id).
//
// Owner resolution (in order): --owner=<gmId> flag, GM_OWNER_ID env, --email=<gm email>,
// else the first GM in the database.

const FUTURE_DIR = path.join(process.cwd(), 'scenarios', 'future')

const args = process.argv.slice(2)
const ownerArg = args.find((a) => a.startsWith('--owner='))?.split('=')[1]
const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1]

function loadScenario(slug: string) {
  const dir = path.join(FUTURE_DIR, slug)
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))

  const manifest = read('manifest.json')
  const characters = read('characters.json')
  const assets = read('assets.json')
  const gmScript = read('gm_script.json')
  const relationships = read('relationships.json')

  // Server-side validation, mirroring app/api/gm/scenarios/route.ts
  ManifestSchema.parse(manifest)
  CharactersSchema.parse(characters)
  AssetsSchema.parse(assets)
  GmScriptSchema.parse(gmScript)
  RelationshipsSchema.parse(relationships)

  return { manifest, characters, assets, gmScript, relationships }
}

function main() {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./data/mysteryweaver.db'
  const sqlite = new Database(dbUrl.replace('file:', ''))
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'lib/db/migrations') })

  // Resolve the owning GM
  let ownerId = ownerArg ?? process.env.GM_OWNER_ID
  if (!ownerId && emailArg) {
    ownerId = db.select({ id: schema.gms.id }).from(schema.gms).where(eq(schema.gms.email, emailArg)).get()?.id
    if (!ownerId) throw new Error(`No GM found with email ${emailArg}`)
  }
  if (!ownerId) {
    const first = db.select({ id: schema.gms.id, email: schema.gms.email }).from(schema.gms).all()[0]
    if (!first) throw new Error('No GM accounts exist. Create one with: pnpm seed-gm --email=... --password=...')
    ownerId = first.id
    console.log(`No owner specified; defaulting to first GM: ${first.email} (${first.id})`)
  }

  const slugs = fs
    .readdirSync(FUTURE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  if (slugs.length === 0) {
    console.log('No scenario folders found under scenarios/future/.')
    sqlite.close()
    return
  }

  for (const slug of slugs) {
    const { manifest, characters, assets, gmScript, relationships } = loadScenario(slug)
    const name = (manifest as { name: string }).name

    db.insert(schema.scenarios)
      .values({
        id: slug,
        ownerId,
        name,
        schemaVersion: '1.0',
        manifest,
        characters,
        assets,
        gmScript,
        relationships,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.scenarios.id,
        set: { ownerId, name, manifest, characters, assets, gmScript, relationships },
      })
      .run()

    const count = (characters as { characters: unknown[] }).characters.length
    console.log(`✓ ${name}  (id: ${slug}, ${count} characters)`)
  }

  console.log(`\nDone. ${slugs.length} scenario(s) finalized in the dashboard for owner ${ownerId}.`)
  sqlite.close()
}

main()
