'use client'
import { useEffect, useRef } from 'react'
import {
  Box, Typography, Chip, Paper,
} from '@mui/material'
import SectionCard from '@/app/_components/SectionCard'
import type { ScenarioFull } from '../SessionRunner'

type ChipColor = 'primary' | 'secondary' | 'default' | 'info' | 'success' | 'warning' | 'error'

function getTypeColor(type: string): ChipColor {
  switch (type) {
    case 'gm_monologue': return 'primary'
    case 'npc_dialogue': return 'secondary'
    case 'scene_break': return 'default'
    case 'player_action': return 'info'
    default: return 'default'
  }
}

interface ScriptPanelProps {
  scenario: ScenarioFull | null
  phase: string | null
  phaseIndex: number
  status: string | null
  characterMap: Record<string, string>
  assetMap: Record<string, string>
  totalCharacters: number
  nextPhase: { id: string; name: string; yamsLocked: boolean } | undefined
  onAction: (state: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => void
}

export default function ScriptPanel({ scenario, phase }: ScriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [phase])

  if (!scenario || !phase) {
    return (
      <Box>
        <Typography color="text.secondary">Loading script…</Typography>
      </Box>
    )
  }

  const timelineEntry = scenario.gmScript.timeline.find((t) => t.phaseId === phase)
  const entries = timelineEntry?.entries ?? []

  const npcMap: Record<string, string> = {}
  scenario.gmScript.npcRoster.forEach((npc) => { npcMap[npc.id] = npc.name })

  return (
    <Box ref={scrollRef} sx={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard title="Script">
      {entries.length === 0 ? (
        <Typography color="text.secondary">No script entries for this phase.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {entries.map((entry, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Chip
                  label={entry.type.replace('_', ' ')}
                  size="small"
                  color={getTypeColor(entry.type)}
                />
                <Typography variant="caption" color="text.secondary">
                  {entry.time}
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ ml: 0.5 }}>
                  {entry.label}
                </Typography>
              </Box>

              {entry.type === 'npc_dialogue' && entry.npcId && (
                <Typography variant="body2" fontWeight="bold" color="secondary.main" gutterBottom>
                  {npcMap[entry.npcId] ?? entry.npcId}
                </Typography>
              )}

              <Typography variant="body2" sx={{ fontStyle: 'italic', mb: entry.gmTip ? 1 : 0 }}>
                {entry.script}
              </Typography>

              {entry.gmTip && (
                <Typography variant="caption" color="text.secondary">
                  💡 {entry.gmTip}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}
      </SectionCard>

      <SectionCard title="NPC Roster">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {scenario.gmScript.npcRoster.map((npc) => (
          <Paper key={npc.id} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {npc.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {npc.description}
            </Typography>
            {npc.playingNotes && (
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {npc.playingNotes}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
      </SectionCard>
    </Box>
  )
}
