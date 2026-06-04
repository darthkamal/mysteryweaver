'use client'
import { useState } from 'react'
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Stack,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SectionCard from '@/app/_components/SectionCard'
import { usePlayerStore } from '@/lib/store/player-store'
import { useScenario } from '@/lib/hooks/useScenario'

const CLUE_TYPE_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
> = {
  evidence: 'error',
  omen: 'warning',
  oracle: 'info',
  rumor: 'default',
  relationship: 'secondary',
}

interface Props {
  sessionId: string
  uid: string
}

export default function CluesTab({ sessionId: _sessionId, uid: _uid }: Props) {
  const clues = usePlayerStore((s) => s.clues)
  const seenClues = usePlayerStore((s) => s.seenClues)
  const scenario = useScenario()
  const [expanded, setExpanded] = useState<string | false>(false)

  const newClueIds = clues.filter((c) => !seenClues.includes(c))

  const clueAssets = clues
    .map((clueId) => scenario?.assets.find((a) => a.id === clueId))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  if (clues.length === 0) {
    return (
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SectionCard title="Your Clues">
          <Typography color="text.secondary">
            You have no clues yet. The GM will distribute them as the investigation unfolds.
          </Typography>
        </SectionCard>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard
        title="Your Clues"
        action={<Chip label={`${clues.length}`} size="small" color="primary" />}
      >
      <Stack spacing={1}>
        {clueAssets.map((asset) => {
          const isNew = newClueIds.includes(asset.id)
          return (
            <Accordion
              key={asset.id}
              expanded={expanded === asset.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? asset.id : false)}
              variant="outlined"
              sx={{ '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Chip
                    label={asset.type}
                    size="small"
                    color={CLUE_TYPE_COLORS[asset.type] ?? 'default'}
                  />
                  <Typography variant="subtitle2" flex={1}>
                    {asset.title}
                  </Typography>
                  {isNew && (
                    <Chip label="NEW" size="small" color="error" variant="outlined" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{asset.content}</Typography>
              </AccordionDetails>
            </Accordion>
          )
        })}

        {/* Clues whose asset data isn't loaded yet */}
        {clues
          .filter((id) => !scenario?.assets.find((a) => a.id === id))
          .map((id) => (
            <Accordion key={id} disabled variant="outlined">
              <AccordionSummary>
                <Typography variant="subtitle2" color="text.secondary">
                  {id} (loading…)
                </Typography>
              </AccordionSummary>
            </Accordion>
          ))}
      </Stack>
      </SectionCard>
    </Box>
  )
}
