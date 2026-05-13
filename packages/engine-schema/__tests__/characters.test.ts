import { describe, it, expect } from 'vitest'
import { CharactersSchema } from '../src/characters.schema.js'

const validCharacter = {
  id: 'okonkwo',
  variantFlag: { includedIn: ['6-player', '7-player'] },
  public: {
    name: 'Okonkwo',
    title: 'The Fearless Warrior',
    avatarUrl: null,
    bio: 'A man of titles and hard-won reputation in Umuofia.',
  },
  private: {
    secretObjectives: [
      'Maintain your reputation — let no one question your strength.',
      'Repay your debt to Nwakibie before the accusation phase.',
    ],
    startingInventory: { yams: 5, oracle_bones: 0 },
    hiddenKnowledge: ['You owe Nwakibie a large debt of yams.'],
    roleplayingNotes: 'Speak with a firm, commanding voice.',
  },
}

describe('CharactersSchema', () => {
  it('accepts a valid characters object', () => {
    expect(() => CharactersSchema.parse({ characters: [validCharacter] })).not.toThrow()
  })

  it('rejects a character with empty secretObjectives', () => {
    const bad = { ...validCharacter, private: { ...validCharacter.private, secretObjectives: [] } }
    const result = CharactersSchema.safeParse({ characters: [bad] })
    expect(result.success).toBe(false)
  })

  it('rejects a character with empty variantFlag includedIn', () => {
    const bad = { ...validCharacter, variantFlag: { includedIn: [] } }
    const result = CharactersSchema.safeParse({ characters: [bad] })
    expect(result.success).toBe(false)
  })

  it('rejects negative starting inventory', () => {
    const bad = {
      ...validCharacter,
      private: { ...validCharacter.private, startingInventory: { yams: -1 } },
    }
    const result = CharactersSchema.safeParse({ characters: [bad] })
    expect(result.success).toBe(false)
  })

  it('rejects an empty characters array', () => {
    const result = CharactersSchema.safeParse({ characters: [] })
    expect(result.success).toBe(false)
  })
})
