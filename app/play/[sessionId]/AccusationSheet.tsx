'use client'
import { useState } from 'react'
import {
  Dialog, AppBar, Toolbar, Typography, IconButton, Box, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Chip, Alert, CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { usePlayerStore } from '@/lib/store/player-store'
import { useScenario } from '@/lib/hooks/useScenario'
import { useGameApi } from '@/lib/hooks/useGameApi'

interface Props {
  sessionId: string
  open: boolean
  onClose: () => void
}

export default function AccusationSheet({ sessionId, open, onClose }: Props) {
  const scenario = useScenario()
  const characterId = usePlayerStore((s) => s.characterId)
  const clues = usePlayerStore((s) => s.clues)
  const myAccusation = usePlayerStore((s) => s.myAccusation)
  const { call } = useGameApi(sessionId)

  const [suspectId, setSuspectId] = useState(myAccusation?.suspectId ?? '')
  const [motive, setMotive] = useState(myAccusation?.motive ?? '')
  const [evidenceIds, setEvidenceIds] = useState<string[]>(myAccusation?.evidenceIds ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiresEvidence = scenario?.accusationMechanic?.requiresEvidence ?? false
  const suspects = (scenario?.characters ?? []).filter((c) => c.id !== characterId)
  const assetTitle = (id: string) => scenario?.assets.find((a) => a.id === id)?.title ?? id
  const canSubmit = !!suspectId && motive.trim().length > 0 && (!requiresEvidence || evidenceIds.length > 0)

  function toggleEvidence(id: string) {
    setEvidenceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await call('/api/game/submit-accusation', { sessionId, suspectId, motive, evidenceIds })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit accusation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar position="relative">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close"><CloseIcon /></IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>Name the Killer</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: 'background.default', flex: 1, overflow: 'auto' }}>
        <Typography variant="body2" color="text.secondary">
          Accuse one suspect. You may change your answer until the accusation phase ends.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <FormControl fullWidth>
          <InputLabel id="suspect-label">Suspect</InputLabel>
          <Select labelId="suspect-label" label="Suspect" value={suspectId} onChange={(e) => setSuspectId(e.target.value)}>
            {suspects.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.public.name} — {c.public.title}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Motive" multiline minRows={3} fullWidth
          value={motive} onChange={(e) => setMotive(e.target.value.slice(0, 500))}
          helperText={`${motive.length}/500`}
        />

        <Box>
          <Typography variant="overline" color="text.secondary">
            Evidence{requiresEvidence ? ' (at least one)' : ''}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {clues.length === 0 && (
              <Typography variant="body2" color="text.secondary">You hold no clues to cite.</Typography>
            )}
            {clues.map((id) => (
              <Chip
                key={id} label={assetTitle(id)} onClick={() => toggleEvidence(id)}
                color={evidenceIds.includes(id) ? 'primary' : 'default'}
                variant={evidenceIds.includes(id) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <Button
          variant="contained" size="large" disabled={!canSubmit || submitting} onClick={handleSubmit}
          sx={{ mt: 1 }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : myAccusation ? 'Update Accusation' : 'Submit Accusation'}
        </Button>
      </Box>
    </Dialog>
  )
}
