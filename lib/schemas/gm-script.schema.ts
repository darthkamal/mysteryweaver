import { z } from 'zod'

const EntryTypeSchema = z.enum([
  'gm_monologue',
  'npc_dialogue',
  'player_prompt',
  'clue_distribution',
  'gm_note',
])

const ScriptEntrySchema = z.object({
  time: z.string().min(1),
  label: z.string().min(1),
  type: EntryTypeSchema,
  npcId: z.string().min(1).optional(),
  script: z.string().min(1),
  gmTip: z.string().optional(),
})

const PhaseTimelineSchema = z.object({
  phaseId: z.string().min(1),
  entries: z.array(ScriptEntrySchema).min(1),
})

const NpcRosterEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  portraitUrl: z.string().url().nullable(),
  playingNotes: z.string().min(1),
})

const NpcEventSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  unlocksAssets: z.array(z.string()),
  autoDistribute: z.boolean(),
})

export const GmScriptSchema = z.object({
  timeline: z.array(PhaseTimelineSchema).min(1),
  npcRoster: z.array(NpcRosterEntrySchema).min(1),
  npcEvents: z.array(NpcEventSchema),
})

export type GmScript = z.infer<typeof GmScriptSchema>
export type ScriptEntry = z.infer<typeof ScriptEntrySchema>
export type NpcRosterEntry = z.infer<typeof NpcRosterEntrySchema>
export type NpcEvent = z.infer<typeof NpcEventSchema>
