import { z } from 'zod'

const AssetTypeSchema = z.enum(['evidence', 'omen', 'oracle', 'rumor', 'relationship'])
const VisibilitySchema = z.enum(['hidden', 'public', 'held'])

const TriggerConditionSchema = z.object({
  npcEvent: z.string().min(1),
})

const AssetSchema = z.object({
  id: z.string().min(1),
  type: AssetTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  visibility: VisibilitySchema,
  triggerCondition: TriggerConditionSchema.nullable(),
})

export const AssetsSchema = z.object({
  assets: z.array(AssetSchema).min(1),
})

export type Assets = z.infer<typeof AssetsSchema>
export type Asset = z.infer<typeof AssetSchema>
export type AssetType = z.infer<typeof AssetTypeSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
