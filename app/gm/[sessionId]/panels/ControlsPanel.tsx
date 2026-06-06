'use client'
import { useState } from 'react'
import {
  Box, Typography, Button, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, CircularProgress,
} from '@mui/material'
import SectionCard from '@/app/_components/SectionCard'
import { useGmStore } from '@/lib/store/gm-store'
import type { ScenarioFull } from '../SessionRunner'
import NpcEventsPanel from './NpcEventsPanel'
import DeckPanel from './DeckPanel'
import AccusationsPanel from './AccusationsPanel'

interface ControlsPanelProps {
  scenario: ScenarioFull | null
  phase: string | null
  phaseIndex: number
  status: string | null
  characterMap: Record<string, string>
  assetMap: Record<string, string>
  totalCharacters: number
  nextPhase: { id: string; name: string; yamsLocked: boolean } | undefined
  sessionId: string
  onAction: (state: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => void
}

export default function ControlsPanel({
  scenario,
  phase,
  phaseIndex,
  status,
  characterMap,
  assetMap,
  totalCharacters,
  nextPhase,
  sessionId,
  onAction,
}: ControlsPanelProps) {
  const players = useGmStore((s) => s.players)
  const characterAssignments = useGmStore((s) => s.characterAssignments)

  const [confirmAdvance, setConfirmAdvance] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  const totalPhases = scenario?.manifest.phases.length ?? 0
  const stepNumber = phaseIndex + 1
  const phaseName = scenario?.manifest.phases[phaseIndex]?.name ?? phase ?? ''
  const progress = totalPhases > 0 ? (stepNumber / totalPhases) * 100 : 0

  async function handleAdvancePhase() {
    setAdvancing(true)
    try {
      const res = await fetch('/api/game/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        onAction({ open: true, message: 'Phase advanced successfully', severity: 'success' })
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        onAction({ open: true, message: data.error ?? 'Failed to advance phase', severity: 'error' })
      }
    } catch {
      onAction({ open: true, message: 'Network error', severity: 'error' })
    } finally {
      setAdvancing(false)
      setConfirmAdvance(false)
    }
  }

  // Build joined players list (characterAssignments maps characterId → uid)
  // Players from store have uid and characterId
  const joinedCharacterIds = new Set(players.map((p) => p.characterId))

  // All characters from the scenario (the authoritative list of every character slot)
  const allCharacterIds = scenario?.characters.characters.map((c) => c.id) ?? []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Phase Section */}
      <SectionCard title="Phase Progress">
        <Typography variant="body2" color="text.secondary">
          Step {stepNumber} of {totalPhases}
        </Typography>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {phaseName}
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />

        {status === 'ended' ? (
          <Typography variant="body1" color="success.main" fontWeight="bold">
            Session Complete
          </Typography>
        ) : nextPhase ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setConfirmAdvance(true)}
            disabled={advancing}
            fullWidth
          >
            → Advance to {nextPhase.name}
          </Button>
        ) : null}
      </SectionCard>

      {/* Players Section */}
      <SectionCard title={`Players (${players.length} / ${totalCharacters})`}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Joined players */}
          {players.map((player) => {
            const charName = characterMap[player.characterId] ?? player.characterId
            const currency = Object.values(player.currencies).reduce((a, b) => a + b, 0)
            return (
              <Box key={player.uid} display="flex" alignItems="center" gap={1}>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: player.isOnline ? 'success.main' : 'text.disabled',
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {charName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {player.displayName} · {currency} coins · {player.clues.length} clues
                  </Typography>
                </Box>
              </Box>
            )
          })}

          {/* Unjoined characters */}
          {allCharacterIds
            .filter((cid) => !joinedCharacterIds.has(cid))
            .map((cid) => {
              const charName = characterMap[cid] ?? cid
              return (
                <Box key={cid} display="flex" alignItems="center" gap={1}>
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      border: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {charName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (not joined)
                    </Typography>
                  </Box>
                </Box>
              )
            })}
        </Box>
      </SectionCard>

      <Divider />

      {scenario && (
        <>
          <NpcEventsPanel
            sessionId={sessionId}
            scenario={scenario}
            onAction={(msg: string) => onAction({ open: true, message: msg, severity: 'info' })}
          />
          <DeckPanel
            sessionId={sessionId}
            scenario={scenario}
            characterMap={characterMap}
            assetMap={assetMap}
            onAction={(msg: string) => onAction({ open: true, message: msg, severity: 'info' })}
          />
          <AccusationsPanel
            sessionId={sessionId}
            scenario={scenario}
            onAction={(msg: string) => onAction({ open: true, message: msg, severity: 'info' })}
          />
        </>
      )}

      {/* Advance Phase Confirmation Dialog */}
      <Dialog open={confirmAdvance} onClose={() => setConfirmAdvance(false)}>
        <DialogTitle>Advance Phase?</DialogTitle>
        <DialogContent>
          <Typography>
            Move from <strong>{phaseName}</strong> to <strong>{nextPhase?.name}</strong>?
            This will update the game state for all players.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAdvance(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAdvancePhase}
            disabled={advancing}
          >
            {advancing ? <CircularProgress size={20} color="inherit" /> : 'Advance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
