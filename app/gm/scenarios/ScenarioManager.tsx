'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, AppBar, Toolbar, Typography, Button, TextField, Paper, Alert,
  CircularProgress, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useGmAuth } from '@/lib/hooks/useGmAuth'
import {
  ManifestSchema, CharactersSchema, AssetsSchema, GmScriptSchema, RelationshipsSchema,
} from '@/lib/schemas'

const MODULES = [
  { key: 'manifest', label: 'manifest.json', schema: ManifestSchema },
  { key: 'characters', label: 'characters.json', schema: CharactersSchema },
  { key: 'assets', label: 'assets.json', schema: AssetsSchema },
  { key: 'gmScript', label: 'gm_script.json', schema: GmScriptSchema },
  { key: 'relationships', label: 'relationships.json', schema: RelationshipsSchema },
] as const

type ModuleKey = typeof MODULES[number]['key']
type ModuleState = { status: 'idle' | 'valid' | 'error'; data: unknown; error: string | null }

interface ScenarioRow { id: string; name: string; characterCount: number; createdAt: number }

export default function ScenarioManager() {
  const router = useRouter()
  const { gm, loading } = useGmAuth()
  const [scenarioName, setScenarioName] = useState('')
  const [modules, setModules] = useState<Record<ModuleKey, ModuleState>>({
    manifest: { status: 'idle', data: null, error: null },
    characters: { status: 'idle', data: null, error: null },
    assets: { status: 'idle', data: null, error: null },
    gmScript: { status: 'idle', data: null, error: null },
    relationships: { status: 'idle', data: null, error: null },
  })
  const [existing, setExisting] = useState<ScenarioRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchScenarios = useCallback(async () => {
    const res = await fetch('/api/gm/scenarios')
    if (res.ok) setExisting((await res.json()).scenarios)
  }, [])

  useEffect(() => { if (gm) fetchScenarios() }, [gm, fetchScenarios])

  function handleFileSelect(moduleKey: ModuleKey, schema: (typeof MODULES)[number]['schema']) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as unknown
          schema.parse(parsed)
          setModules((prev) => ({ ...prev, [moduleKey]: { status: 'valid', data: parsed, error: null } }))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Invalid file'
          setModules((prev) => ({ ...prev, [moduleKey]: { status: 'error', data: null, error: msg } }))
        }
      }
      reader.readAsText(file)
    }
  }

  const allValid = MODULES.every((m) => modules[m.key].status === 'valid') && scenarioName.trim()

  async function handleSubmit() {
    if (!allValid) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/gm/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenarioName.trim(),
          ...Object.fromEntries(MODULES.map((m) => [m.key, modules[m.key].data])),
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setSubmitError(data.error ?? 'Upload failed'); return }
      router.push('/gm')
    } catch {
      setSubmitError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    const res = await fetch(`/api/gm/scenarios/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setDeleteError(data.error ?? 'Delete failed')
    } else {
      await fetchScenarios()
    }
    setConfirmDelete(null)
  }

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton onClick={() => router.push('/gm')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold" color="primary" sx={{ flex: 1 }}>
            Upload Scenario
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        {/* Upload Form */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <TextField
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            required
          />

          <Typography variant="overline" color="text.secondary">Scenario Files</Typography>
          <Box sx={{ mt: 1 }}>
            {MODULES.map((mod) => {
              const state = modules[mod.key]
              return (
                <Box key={mod.key} sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 160, fontFamily: 'monospace' }}>
                      {mod.label}
                    </Typography>
                    <Box component="label" sx={{ cursor: 'pointer' }}>
                      <Button variant="outlined" size="small" component="span">
                        Choose File
                      </Button>
                      <input type="file" accept=".json" hidden
                        onChange={handleFileSelect(mod.key, mod.schema)} />
                    </Box>
                    {state.status === 'idle' && <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} fontSize="small" />}
                    {state.status === 'valid' && <CheckCircleIcon sx={{ color: 'success.main' }} fontSize="small" />}
                    {state.status === 'error' && <ErrorIcon sx={{ color: 'error.main' }} fontSize="small" />}
                  </Box>
                  {state.status === 'error' && state.error && (
                    <Typography variant="caption" color="error" sx={{ ml: '180px', display: 'block', mt: 0.5 }}>
                      {state.error.slice(0, 200)}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>

          {submitError && <Alert severity="error" sx={{ mt: 2 }}>{submitError}</Alert>}

          <Button
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={!allValid || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Create Scenario'}
          </Button>
        </Paper>

        {/* Existing Scenarios */}
        {existing.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom>
              Your Scenarios
            </Typography>
            {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Characters</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {existing.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell>{sc.name}</TableCell>
                    <TableCell>{sc.characterCount}</TableCell>
                    <TableCell>{new Date(sc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(sc.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Box>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete Scenario?</DialogTitle>
        <DialogContent>
          <Typography>This cannot be undone. Sessions using this scenario will be unaffected.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained"
            onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
