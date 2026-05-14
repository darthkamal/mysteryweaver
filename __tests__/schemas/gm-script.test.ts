import { describe, it, expect } from 'vitest'
import { GmScriptSchema } from '@/lib/schemas/gm-script.schema'

const validScript = {
  timeline: [
    {
      phaseId: 'introduction',
      entries: [
        {
          time: '0:00',
          label: 'Introduction & Welcome',
          type: 'gm_monologue',
          script: 'Welcome, everyone, to Umuofia!',
          gmTip: 'Speak slowly and evocatively.',
        },
        {
          time: '0:15',
          label: "The Ndichie's Summons",
          type: 'npc_dialogue',
          npcId: 'ezeudu',
          script: 'Children of Umuofia, you have been summoned.',
          gmTip: 'Play Ezeudu as frail but authoritative.',
        },
      ],
    },
  ],
  npcRoster: [
    {
      id: 'ezeudu',
      name: 'Ezeudu',
      description: 'Frail, authoritative elder.',
      portraitUrl: null,
      playingNotes: 'Speak slowly, voice slightly trembling.',
    },
  ],
  npcEvents: [
    {
      id: 'ikemefuna_dies',
      label: 'Ikemefuna Dies',
      description: 'GM triggers when narrative reaches this point.',
      unlocksAssets: ['evidence_4'],
      autoDistribute: false,
    },
  ],
}

describe('GmScriptSchema', () => {
  it('accepts a valid GM script', () => {
    expect(() => GmScriptSchema.parse(validScript)).not.toThrow()
  })

  it('accepts an entry with no npcId (gm_monologue)', () => {
    expect(GmScriptSchema.safeParse(validScript).success).toBe(true)
  })

  it('rejects an empty timeline', () => {
    expect(GmScriptSchema.safeParse({ ...validScript, timeline: [] }).success).toBe(false)
  })

  it('rejects a phase with empty entries', () => {
    expect(
      GmScriptSchema.safeParse({
        ...validScript,
        timeline: [{ phaseId: 'introduction', entries: [] }],
      }).success
    ).toBe(false)
  })

  it('rejects an invalid entry type', () => {
    const badEntry = { ...validScript.timeline[0]!.entries[0]!, type: 'song' }
    expect(
      GmScriptSchema.safeParse({
        ...validScript,
        timeline: [{ phaseId: 'introduction', entries: [badEntry] }],
      }).success
    ).toBe(false)
  })

  it('accepts npcEvents as an empty array', () => {
    expect(GmScriptSchema.safeParse({ ...validScript, npcEvents: [] }).success).toBe(true)
  })
})
