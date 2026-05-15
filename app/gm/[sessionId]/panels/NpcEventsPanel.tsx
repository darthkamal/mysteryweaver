'use client'
import { useState } from 'react'
import {
  Box, Paper, Typography, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useGmStore } from '@/lib/store/gm-store'
import type { ScenarioFull } from '../SessionRunner'

interface Props {
  sessionId: string
  scenario: ScenarioFull
  onAction: (msg: string) => void
}

export default function NpcEventsPanel({ sessionId, scenario, onAction }: Props) {
  const triggeredNpcEvents = useGmStore((s) => s.triggeredNpcEvents)
  const [confirmEvent, setConfirmEvent] = useState<(typeof scenario.gmScript.npcEvents)[0] | null>(null)
  const [triggering, setTriggering] = useState(false)

  const assetTitles = (ids: string[]) =>
    ids.map((id) => scenario.assets.assets.find((a) => a.id === id)?.title ?? id).join(', ')

  async function handleTrigger(eventId: string) {
    setTriggering(true)
    try {
      await fetch('/api/game/trigger-npc-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, npcEventId: eventId }),
      })
      onAction(`Event triggered: ${confirmEvent?.label}`)
    } finally {
      setTriggering(false)
      setConfirmEvent(null)
    }
  }

  if (scenario.gmScript.npcEvents.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>NPC Events</Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {scenario.gmScript.npcEvents.map((event) => {
          const triggered = triggeredNpcEvents.includes(event.id)
          return triggered ? (
            <Chip
              key={event.id}
              icon={<CheckCircleIcon />}
              label={event.label}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.5, justifyContent: 'flex-start' }}
            />
          ) : (
            <Button
              key={event.id}
              variant="outlined"
              size="small"
              sx={{ justifyContent: 'flex-start' }}
              onClick={() => setConfirmEvent(event)}
            >
              {event.label}
            </Button>
          )
        })}
      </Box>

      <Dialog open={!!confirmEvent} onClose={() => !triggering && setConfirmEvent(null)}>
        <DialogTitle>Trigger Event?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>{confirmEvent?.label}</strong></Typography>
          {confirmEvent?.unlocksAssets && confirmEvent.unlocksAssets.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              This will unlock: {assetTitles(confirmEvent.unlocksAssets)}
            </Typography>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEvent(null)} disabled={triggering}>Cancel</Button>
          <Button variant="contained" disabled={triggering}
            onClick={() => confirmEvent && handleTrigger(confirmEvent.id)}>
            {triggering ? <CircularProgress size={20} color="inherit" /> : 'Trigger'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
