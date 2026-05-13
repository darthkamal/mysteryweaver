import { describe, it, expect } from 'vitest'
import { RelationshipsSchema } from '../src/relationships.schema.js'

const validRelationships = {
  edges: [
    { from: 'okonkwo', to: 'nwakibie', label: 'Debt', public: false },
    { from: 'okonkwo', to: 'obierika', label: 'Friend', public: true },
    { from: 'amadi', to: 'ojiugo', label: 'Forbidden love', public: false },
  ],
  relationshipCards: [
    {
      assetId: 'rel_card_1',
      content: 'Ojiugo often seeks out Amadi for herbal remedies.',
      revealsEdge: { from: 'ojiugo', to: 'amadi' },
    },
  ],
}

describe('RelationshipsSchema', () => {
  it('accepts a valid relationships object', () => {
    expect(() => RelationshipsSchema.parse(validRelationships)).not.toThrow()
  })

  it('rejects an empty edges array', () => {
    const result = RelationshipsSchema.safeParse({ ...validRelationships, edges: [] })
    expect(result.success).toBe(false)
  })

  it('accepts an empty relationshipCards array', () => {
    const result = RelationshipsSchema.safeParse({ ...validRelationships, relationshipCards: [] })
    expect(result.success).toBe(true)
  })

  it('rejects an edge with empty label', () => {
    const bad = { ...validRelationships, edges: [{ from: 'a', to: 'b', label: '', public: true }] }
    const result = RelationshipsSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('rejects a relationship card with empty assetId', () => {
    const bad = {
      ...validRelationships,
      relationshipCards: [{ assetId: '', content: 'x', revealsEdge: { from: 'a', to: 'b' } }],
    }
    const result = RelationshipsSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })
})
