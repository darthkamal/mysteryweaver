import { describe, it, expect } from 'vitest'
import { RelationshipsSchema } from '@/lib/schemas/relationships.schema'

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
    expect(RelationshipsSchema.safeParse({ ...validRelationships, edges: [] }).success).toBe(false)
  })

  it('accepts an empty relationshipCards array', () => {
    expect(
      RelationshipsSchema.safeParse({ ...validRelationships, relationshipCards: [] }).success
    ).toBe(true)
  })

  it('rejects an edge with empty label', () => {
    expect(
      RelationshipsSchema.safeParse({
        ...validRelationships,
        edges: [{ from: 'a', to: 'b', label: '', public: true }],
      }).success
    ).toBe(false)
  })

  it('rejects a relationship card with empty assetId', () => {
    expect(
      RelationshipsSchema.safeParse({
        ...validRelationships,
        relationshipCards: [{ assetId: '', content: 'x', revealsEdge: { from: 'a', to: 'b' } }],
      }).success
    ).toBe(false)
  })
})
