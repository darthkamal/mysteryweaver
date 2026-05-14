import { z } from 'zod'

const CurrencySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  tradeable: z.boolean(),
})

const PhaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  yamsLocked: z.boolean(),
})

const AccusationMechanicSchema = z.object({
  allowedPhase: z.string().min(1),
  whoCanAccuse: z.enum(['any_player', 'gm_only']),
  requiresEvidence: z.boolean(),
  resolution: z.literal('gm_manual'),
})

export const ManifestSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+$/, 'must be semver like "1.0"'),
  name: z.string().min(1),
  theme: z.string().min(1),
  seedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a 6-digit hex color'),
  playerCount: z
    .object({ min: z.number().int().positive(), max: z.number().int().positive() })
    .refine((d) => d.min <= d.max, { message: 'min must be ≤ max' }),
  currencies: z.array(CurrencySchema).min(1),
  phases: z.array(PhaseSchema).min(2),
  accusationMechanic: AccusationMechanicSchema,
})

export type Manifest = z.infer<typeof ManifestSchema>
export type Currency = z.infer<typeof CurrencySchema>
export type Phase = z.infer<typeof PhaseSchema>
