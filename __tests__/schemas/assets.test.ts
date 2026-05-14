import { describe, it, expect } from 'vitest'
import { AssetsSchema } from '@/lib/schemas/assets.schema'

const validAsset = {
  id: 'evidence_1',
  type: 'evidence',
  title: 'The Thorn',
  content: 'A small, sharp thorn found near the body.',
  imageUrl: null,
  visibility: 'hidden',
  triggerCondition: null,
}

const conditionalAsset = {
  id: 'evidence_4',
  type: 'evidence',
  title: 'The Ceremonial Knife',
  content: 'A knife found near Ikemefuna.',
  imageUrl: null,
  visibility: 'hidden',
  triggerCondition: { npcEvent: 'ikemefuna_dies' },
}

describe('AssetsSchema', () => {
  it('accepts a valid assets object with hidden and conditional assets', () => {
    expect(() => AssetsSchema.parse({ assets: [validAsset, conditionalAsset] })).not.toThrow()
  })

  it('rejects an invalid asset type', () => {
    expect(AssetsSchema.safeParse({ assets: [{ ...validAsset, type: 'weapon' }] }).success).toBe(false)
  })

  it('rejects an invalid visibility value', () => {
    expect(AssetsSchema.safeParse({ assets: [{ ...validAsset, visibility: 'secret' }] }).success).toBe(false)
  })

  it('accepts all valid asset types', () => {
    for (const type of ['evidence', 'omen', 'oracle', 'rumor', 'relationship']) {
      expect(() => AssetsSchema.parse({ assets: [{ ...validAsset, id: type, type }] })).not.toThrow()
    }
  })

  it('rejects empty assets array', () => {
    expect(AssetsSchema.safeParse({ assets: [] }).success).toBe(false)
  })
})
