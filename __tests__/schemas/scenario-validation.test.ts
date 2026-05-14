import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ManifestSchema } from '@/lib/schemas/manifest.schema'
import { CharactersSchema } from '@/lib/schemas/characters.schema'
import { AssetsSchema } from '@/lib/schemas/assets.schema'
import { GmScriptSchema } from '@/lib/schemas/gm-script.schema'
import { RelationshipsSchema } from '@/lib/schemas/relationships.schema'

// Tests run from the repo root (where vitest.config.ts lives)
const scenarioDir = resolve(process.cwd(), 'scenarios/broken-kola-nut')

function loadJson(file: string): unknown {
  return JSON.parse(readFileSync(resolve(scenarioDir, file), 'utf-8'))
}

describe('Broken Kola Nut scenario — schema validation', () => {
  it('manifest.json is valid', () => {
    const result = ManifestSchema.safeParse(loadJson('manifest.json'))
    if (!result.success) console.error(result.error.format())
    expect(result.success).toBe(true)
  })

  it('characters.json is valid', () => {
    const result = CharactersSchema.safeParse(loadJson('characters.json'))
    if (!result.success) console.error(result.error.format())
    expect(result.success).toBe(true)
  })

  it('assets.json is valid', () => {
    const result = AssetsSchema.safeParse(loadJson('assets.json'))
    if (!result.success) console.error(result.error.format())
    expect(result.success).toBe(true)
  })

  it('gm_script.json is valid', () => {
    const result = GmScriptSchema.safeParse(loadJson('gm_script.json'))
    if (!result.success) console.error(result.error.format())
    expect(result.success).toBe(true)
  })

  it('relationships.json is valid', () => {
    const result = RelationshipsSchema.safeParse(loadJson('relationships.json'))
    if (!result.success) console.error(result.error.format())
    expect(result.success).toBe(true)
  })

  it('manifest phases include the accusation phase referenced in accusationMechanic', () => {
    const manifest = ManifestSchema.parse(loadJson('manifest.json'))
    const phaseIds = manifest.phases.map((p) => p.id)
    expect(phaseIds).toContain(manifest.accusationMechanic.allowedPhase)
  })

  it('conditional assets reference NPC event IDs defined in gm_script', () => {
    const assets = AssetsSchema.parse(loadJson('assets.json'))
    const gmScript = GmScriptSchema.parse(loadJson('gm_script.json'))
    const eventIds = new Set(gmScript.npcEvents.map((e) => e.id))
    for (const asset of assets.assets.filter((a) => a.triggerCondition !== null)) {
      expect(eventIds.has(asset.triggerCondition!.npcEvent)).toBe(true)
    }
  })

  it('relationship card assetIds reference valid assets', () => {
    const assets = AssetsSchema.parse(loadJson('assets.json'))
    const relationships = RelationshipsSchema.parse(loadJson('relationships.json'))
    const assetIds = new Set(assets.assets.map((a) => a.id))
    for (const card of relationships.relationshipCards) {
      expect(assetIds.has(card.assetId)).toBe(true)
    }
  })

  it('7-player scenario has at least one 7-player-only character (Ikemefuna)', () => {
    const characters = CharactersSchema.parse(loadJson('characters.json'))
    const sevenOnly = characters.characters.filter(
      (c) =>
        c.variantFlag.includedIn.includes('7-player') &&
        !c.variantFlag.includedIn.includes('6-player')
    )
    expect(sevenOnly.length).toBeGreaterThanOrEqual(1)
    expect(sevenOnly.map((c) => c.id)).toContain('ikemefuna')
  })
})
