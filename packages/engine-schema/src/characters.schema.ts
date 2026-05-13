import { z } from 'zod'

const InventorySchema = z.record(z.string(), z.number().int().nonnegative())

const PublicProfileSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().min(1),
})

const PrivateProfileSchema = z.object({
  secretObjectives: z.array(z.string().min(1)).min(1),
  startingInventory: InventorySchema,
  hiddenKnowledge: z.array(z.string().min(1)),
  roleplayingNotes: z.string().min(1),
})

const VariantFlagSchema = z.object({
  includedIn: z
    .array(z.enum(['6-player', '7-player']))
    .min(1, 'character must be included in at least one variant'),
})

const CharacterSchema = z.object({
  id: z.string().min(1),
  variantFlag: VariantFlagSchema,
  public: PublicProfileSchema,
  private: PrivateProfileSchema,
})

export const CharactersSchema = z.object({
  characters: z.array(CharacterSchema).min(1),
})

export type Characters = z.infer<typeof CharactersSchema>
export type Character = z.infer<typeof CharacterSchema>
export type PublicProfile = z.infer<typeof PublicProfileSchema>
export type PrivateProfile = z.infer<typeof PrivateProfileSchema>
