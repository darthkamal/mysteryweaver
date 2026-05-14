import { describe, it, expect } from 'vitest'
import { ManifestSchema } from '@/lib/schemas/manifest.schema'

const validManifest = {
  schemaVersion: '1.0',
  name: 'The Broken Kola Nut',
  theme: 'african-village',
  seedColor: '#C2623A',
  playerCount: { min: 6, max: 7 },
  currencies: [
    { id: 'yams', name: 'Yams', icon: 'yam.png', tradeable: true },
    { id: 'oracle_bones', name: 'Oracle Bones', icon: 'bone.png', tradeable: false },
  ],
  phases: [
    { id: 'lobby', name: 'Lobby', yamsLocked: true },
    { id: 'introduction', name: 'Introduction', yamsLocked: true },
    { id: 'investigation', name: 'Investigation', yamsLocked: false },
    { id: 'accusation', name: 'The Accusation', yamsLocked: true },
    { id: 'debrief', name: 'Debrief', yamsLocked: true },
  ],
  accusationMechanic: {
    allowedPhase: 'accusation',
    whoCanAccuse: 'any_player',
    requiresEvidence: true,
    resolution: 'gm_manual',
  },
}

describe('ManifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(() => ManifestSchema.parse(validManifest)).not.toThrow()
  })

  it('rejects an invalid seedColor', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, seedColor: 'red' })
    expect(result.success).toBe(false)
  })

  it('rejects playerCount where min > max', () => {
    const result = ManifestSchema.safeParse({
      ...validManifest,
      playerCount: { min: 8, max: 6 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing accusationMechanic', () => {
    const { accusationMechanic: _, ...rest } = validManifest
    const result = ManifestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects empty phases array', () => {
    const result = ManifestSchema.safeParse({ ...validManifest, phases: [] })
    expect(result.success).toBe(false)
  })
})
