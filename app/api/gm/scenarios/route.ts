import { type NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { scenarios } from '@/lib/db/schema'
import { verifyGmToken } from '@/lib/api/auth'
import { ok, err } from '@/lib/api/respond'
import {
  ManifestSchema, CharactersSchema, AssetsSchema, GmScriptSchema, RelationshipsSchema,
} from '@/lib/schemas'

export async function GET(req: NextRequest) {
  try {
    const { gmId } = await verifyGmToken(req)
    const rows = db.select({
      id: scenarios.id,
      name: scenarios.name,
      characters: scenarios.characters,
      createdAt: scenarios.createdAt,
    })
      .from(scenarios)
      .where(eq(scenarios.ownerId, gmId))
      .orderBy(desc(scenarios.createdAt))
      .all()

    return NextResponse.json({
      scenarios: rows.map((row) => {
        let characterCount = 0
        try {
          const parsed = JSON.parse(row.characters) as { characters?: unknown[] }
          if (Array.isArray(parsed?.characters)) characterCount = parsed.characters.length
        } catch {}
        return { id: row.id, name: row.name, characterCount, createdAt: row.createdAt }
      }),
    })
  } catch (error) {
    return err(error)
  }
}

const UploadScenarioSchema = z.object({
  name: z.string().min(1).max(100),
  manifest: z.record(z.unknown()),
  characters: z.record(z.unknown()),
  assets: z.record(z.unknown()),
  gmScript: z.record(z.unknown()),
  relationships: z.record(z.unknown()),
})

export async function POST(req: NextRequest) {
  try {
    const { gmId } = await verifyGmToken(req)
    const body = UploadScenarioSchema.parse(await req.json())

    // Server-side re-validation against domain schemas
    ManifestSchema.parse(body.manifest)
    CharactersSchema.parse(body.characters)
    AssetsSchema.parse(body.assets)
    GmScriptSchema.parse(body.gmScript)
    RelationshipsSchema.parse(body.relationships)

    const scenarioId = randomUUID()
    db.insert(scenarios).values({
      id: scenarioId,
      ownerId: gmId,
      name: body.name,
      schemaVersion: '1.0',
      manifest: JSON.stringify(body.manifest),
      characters: JSON.stringify(body.characters),
      assets: JSON.stringify(body.assets),
      gmScript: JSON.stringify(body.gmScript),
      relationships: JSON.stringify(body.relationships),
      createdAt: Date.now(),
    }).run()

    return ok({ scenarioId })
  } catch (error) {
    return err(error)
  }
}
