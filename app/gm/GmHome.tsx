'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, AppBar, Toolbar, Typography, Button, Card, CardContent, CardActions,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress, Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import LogoutIcon from '@mui/icons-material/Logout'
import AddIcon from '@mui/icons-material/Add'
import { useGmAuth } from '@/lib/hooks/useGmAuth'

interface SessionSummary {
  id: string; roomCode: string; scenarioName: string; phase: string
  status: string; playerCount: number; createdAt: number
}

interface ScenarioSummary {
  id: string; name: string; characterCount: number; createdAt: number
}

export default function GmHome() {
  const router = useRouter()
  const { gm, loading } = useGmAuth()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [creating, setCreating] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [sessRes, scRes] = await Promise.all([
      fetch('/api/gm/sessions'),
      fetch('/api/gm/scenarios'),
    ])
    if (sessRes.ok) setSessions((await sessRes.json()).sessions)
    if (scRes.ok) setScenarios((await scRes.json()).scenarios)
  }, [])

  useEffect(() => { if (gm) fetchData() }, [gm, fetchData])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/auth')
  }

  async function handleCreateSession(scenarioId: string) {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/gm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      })
      const data = await res.json() as { sessionId?: string; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to create session'); return }
      router.push(`/gm/${data.sessionId}`)
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
      setNewSessionOpen(false)
    }
  }

  async function handleEndSession(sessionId: string) {
    setEndingId(sessionId)
    try {
      await fetch(`/api/gm/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      })
      await fetchData()
    } finally {
      setEndingId(null)
      setConfirmEndId(null)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  const activeSessions = sessions.filter((s) => s.status !== 'ended')

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ flex: 1 }}>
            MysteryWeaver
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {gm?.displayName}
          </Typography>
          <Button startIcon={<AddIcon />} variant="contained" sx={{ mr: 2 }}
            onClick={() => setNewSessionOpen(true)}>
            New Session
          </Button>
          <Button startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Active Sessions */}
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Active Sessions
        </Typography>
        {activeSessions.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            No active sessions. Start one from your scenario library below.
          </Typography>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {activeSessions.map((s) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">{s.scenarioName}</Typography>
                    <Typography variant="h4" fontFamily="monospace" color="primary" sx={{ my: 1 }}>
                      {s.roomCode}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip label={s.phase} size="small" />
                      <Chip label={`${s.playerCount} players`} size="small" variant="outlined" />
                      <Chip label={s.status} size="small"
                        color={s.status === 'active' ? 'success' : 'default'} />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" variant="contained" onClick={() => router.push(`/gm/${s.id}`)}>
                      Continue →
                    </Button>
                    <Button size="small" color="error" onClick={() => setConfirmEndId(s.id)}>
                      End Session
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Scenario Library */}
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">Your Scenarios</Typography>
          <Button variant="outlined" onClick={() => router.push('/gm/scenarios')}>
            Upload Scenario
          </Button>
        </Box>
        {scenarios.length === 0 ? (
          <Typography color="text.secondary">
            No scenarios yet. Upload one to get started.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {scenarios.map((sc) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={sc.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">{sc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sc.characterCount} characters
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" variant="contained"
                      onClick={() => handleCreateSession(sc.id)} disabled={creating}>
                      Start Session →
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* New Session Dialog */}
      <Dialog open={newSessionOpen} onClose={() => setNewSessionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Session</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Choose Scenario</InputLabel>
            <Select value={selectedScenarioId} label="Choose Scenario"
              onChange={(e) => setSelectedScenarioId(e.target.value)}>
              {scenarios.map((sc) => (
                <MenuItem key={sc.id} value={sc.id}>{sc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSessionOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!selectedScenarioId || creating}
            onClick={() => handleCreateSession(selectedScenarioId)}>
            {creating ? <CircularProgress size={20} color="inherit" /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Session Confirm Dialog */}
      <Dialog open={!!confirmEndId} onClose={() => setConfirmEndId(null)}>
        <DialogTitle>End Session?</DialogTitle>
        <DialogContent>
          <Typography>This will end the game for all players. This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEndId(null)}>Cancel</Button>
          <Button color="error" variant="contained"
            disabled={endingId === confirmEndId}
            onClick={() => confirmEndId && handleEndSession(confirmEndId)}>
            {endingId ? <CircularProgress size={20} color="inherit" /> : 'End Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
