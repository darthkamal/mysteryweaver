'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, AppBar, Toolbar, Typography, IconButton, Chip, CircularProgress,
  Tabs, Tab, Snackbar, Alert, useMediaQuery, useTheme,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useGmAuth } from '@/lib/hooks/useGmAuth'
import { useGmSession } from '@/lib/hooks/useGmSession'
import { useGmStore } from '@/lib/store/gm-store'
import ScriptPanel from './panels/ScriptPanel'
import ControlsPanel from './panels/ControlsPanel'

export interface ScenarioFull {
  id: string
  manifest: {
    phases: Array<{ id: string; name: string; yamsLocked: boolean }>
    accusationMechanic: { allowedPhase: string; requiresEvidence: boolean }
  }
  characters: {
    characters: Array<{ id: string; public: { name: string; title: string; bio: string } }>
  }
  assets: {
    assets: Array<{ id: string; type: string; title: string; content: string; triggerCondition: null | { npcEvent: string } }>
  }
  gmScript: {
    timeline: Array<{ phaseId: string; entries: Array<{ time: string; label: string; type: string; npcId?: string; script: string; gmTip: string }> }>
    npcRoster: Array<{ id: string; name: string; description: string; playingNotes: string }>
    npcEvents: Array<{ id: string; label: string; description: string; unlocksAssets: string[]; autoDistribute: boolean }>
  }
}

interface SnackbarState {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
}

export default function SessionRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const { loading: authLoading } = useGmAuth()
  useGmSession(sessionId)

  const phase = useGmStore((s) => s.phase)
  const phaseIndex = useGmStore((s) => s.phaseIndex)
  const status = useGmStore((s) => s.status)

  const [scenario, setScenario] = useState<ScenarioFull | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' })

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  useEffect(() => {
    fetch('/api/gm/sessions')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { sessions: Array<{ id: string; scenarioId: string; roomCode: string }> } | null) => {
        if (!data) return null
        const sess = data.sessions.find((s) => s.id === sessionId)
        if (!sess) return null
        setRoomCode(sess.roomCode)
        return fetch(`/api/gm/scenarios/${sess.scenarioId}`)
      })
      .then((r) => r?.ok ? r.json() : null)
      .then((data) => { if (data) setScenario(data as ScenarioFull) })
      .catch(console.error)
  }, [sessionId])

  const characterMap: Record<string, string> = {}
  scenario?.characters.characters.forEach((c) => { characterMap[c.id] = c.public.name })

  const assetMap: Record<string, string> = {}
  scenario?.assets.assets.forEach((a) => { assetMap[a.id] = a.title })

  const totalCharacters = scenario?.characters.characters.length ?? 0
  const nextPhase = scenario?.manifest.phases[phaseIndex + 1]

  const scenarioName = scenario
    ? scenario.manifest.phases.length > 0
      ? (() => {
          // Try to derive scenario name from ID (fallback display)
          return scenario.id
        })()
      : scenario.id
    : null

  const statusColor = status === 'active' ? 'success' : status === 'ended' ? 'error' : 'default'

  if (authLoading || !phase) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  const currentPhaseEntry = scenario?.manifest.phases.find((p) => p.id === phase)
  const phaseName = currentPhaseEntry?.name ?? phase

  const sharedProps = {
    scenario,
    phase,
    phaseIndex,
    status,
    characterMap,
    assetMap,
    totalCharacters,
    nextPhase,
    onAction: setSnackbar,
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => router.push('/gm')}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold" component="div">
              {scenarioName ?? 'Loading…'}
            </Typography>
          </Box>
          {roomCode && (
            <Typography
              variant="h5"
              fontFamily="monospace"
              fontWeight="bold"
              color="primary"
              sx={{ letterSpacing: 4, mr: 1 }}
            >
              {roomCode}
            </Typography>
          )}
          <Chip label={phaseName} size="small" variant="outlined" sx={{ mr: 0.5 }} />
          <Chip
            label={status ?? 'connecting'}
            size="small"
            color={statusColor as 'success' | 'error' | 'default'}
          />
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="fullWidth">
            <Tab label="Script" />
            <Tab label="Controls" />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {tabIndex === 0 && <ScriptPanel {...sharedProps} />}
            {tabIndex === 1 && <ControlsPanel {...sharedProps} />}
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', p: 2, gap: 2, overflow: 'auto' }}>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <ScriptPanel {...sharedProps} />
          </Box>
          <Box sx={{ width: 360, flexShrink: 0, overflow: 'auto' }}>
            <ControlsPanel {...sharedProps} />
          </Box>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
