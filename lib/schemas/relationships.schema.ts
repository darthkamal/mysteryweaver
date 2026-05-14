import { z } from 'zod'

const EdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1),
  public: z.boolean(),
})

const RelationshipCardSchema = z.object({
  assetId: z.string().min(1),
  content: z.string().min(1),
  revealsEdge: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
  }),
})

export const RelationshipsSchema = z.object({
  edges: z.array(EdgeSchema).min(1),
  relationshipCards: z.array(RelationshipCardSchema),
})

export type Relationships = z.infer<typeof RelationshipsSchema>
export type Edge = z.infer<typeof EdgeSchema>
export type RelationshipCard = z.infer<typeof RelationshipCardSchema>
