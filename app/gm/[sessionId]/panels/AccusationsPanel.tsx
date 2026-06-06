'use client'
import { Box, Typography, Chip, Divider } from '@mui/material'
import SectionCard from '@/app/_components/SectionCard'
import { useGmStore } from '@/lib/store/gm-store'
import type { ScenarioFull } from '../SessionRunner'

interface Props {
  scenario: ScenarioFull | null
  characterMap?: Record<string, string>
  assetMap?: Record<string, string>
  sessionId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction?: (msgOrState: any) => void
}

export default function AccusationsPanel({ characterMap = {}, assetMap = {} }: Props) {
  const accusations = useGmStore((s) => s.accusations)
  const players = useGmStore((s) => s.players)

  // Build uid → characterId lookup
  const uidToCharId: Record<string, string> = {}
  players.forEach((p) => { uidToCharId[p.uid] = p.characterId })

  return (
    <SectionCard title={`Accusations (${accusations.length})`}>
      {accusations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No accusations submitted yet.</Typography>
      ) : (
        accusations.map((acc, i) => {
          const accuserCharId = uidToCharId[acc.accuserId]
          const accuserName = accuserCharId ? (characterMap[accuserCharId] ?? accuserCharId) : acc.accuserId
          const suspectName = characterMap[acc.suspectId] ?? acc.suspectId

          return (
            <Box key={i}>
              {i > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="body2" fontWeight="bold">
                {accuserName} → {suspectName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
                &quot;{acc.motive}&quot;
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap" sx={{ mb: 0.5 }}>
                {acc.evidenceIds.map((id) => (
                  <Chip key={id} label={assetMap[id] ?? id} size="small" variant="outlined" />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(acc.submittedAt).toLocaleTimeString()}
              </Typography>
            </Box>
          )
        })
      )}
    </SectionCard>
  )
}
