'use client'
import { useState } from 'react'
import {
  Box, Paper, Typography, Button, Chip, Drawer, List, ListItem,
  ListItemText, Checkbox, Divider, CircularProgress, Alert,
} from '@mui/material'
import { useGmStore } from '@/lib/store/gm-store'
import type { ScenarioFull } from '../SessionRunner'

const TYPE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default' | 'secondary'> = {
  evidence: 'error', omen: 'warning', oracle: 'info', rumor: 'default', relationship: 'secondary',
}

interface Props {
  sessionId: string
  scenario: ScenarioFull
  characterMap: Record<string, string>
  assetMap: Record<string, string>
  onAction: (msg: string) => void
}

export default function DeckPanel({ sessionId, scenario, characterMap, onAction }: Props) {
  const unlockedAssets = useGmStore((s) => s.unlockedAssets)
  const players = useGmStore((s) => s.players)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sendAssetId, setSendAssetId] = useState<string | null>(null)
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Available: no triggerCondition OR triggerCondition.npcEvent is in unlockedAssets
  const available = scenario.assets.assets.filter(
    (a) => !a.triggerCondition || unlockedAssets.includes(a.triggerCondition.npcEvent),
  )
  const types = [...new Set(available.map((a) => a.type))]
  const filtered = typeFilter ? available.filter((a) => a.type === typeFilter) : available

  function sentCount(assetId: string) {
    return players.filter((p) => p.clues.includes(assetId)).length
  }

  function openSend(assetId: string) {
    const notYet = players.filter((p) => !p.clues.includes(assetId)).map((p) => p.uid)
    setSelectedUids(notYet)
    setSendAssetId(assetId)
  }

  async function handleSend() {
    if (!sendAssetId || selectedUids.length === 0) return
    setSending(true)
    setSendError(null)
    try {
      const characterIds = selectedUids
        .map((uid) => players.find((pl) => pl.uid === uid)?.characterId ?? '')
        .filter(Boolean)

      const res = await fetch('/api/game/distribute-clue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, clueId: sendAssetId, targetCharacterIds: characterIds }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setSendError(d.error ?? `Failed (${res.status})`)
      } else {
        onAction(`Clue sent to ${selectedUids.length} player(s)`)
        setSendAssetId(null)
      }
    } catch {
      setSendError('Network error')
    } finally {
      setSending(false)
    }
  }

  const sendAsset = sendAssetId ? scenario.assets.assets.find((a) => a.id === sendAssetId) : null

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Clue Deck</Typography>

      {/* Type filter chips */}
      <Box display="flex" gap={0.5} flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip label="All" size="small" variant={!typeFilter ? 'filled' : 'outlined'}
          onClick={() => setTypeFilter(null)} />
        {types.map((t) => (
          <Chip key={t} label={t} size="small"
            variant={typeFilter === t ? 'filled' : 'outlined'}
            color={TYPE_COLORS[t] ?? 'default'}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)} />
        ))}
      </Box>

      <List dense disablePadding>
        {filtered.map((asset) => {
          const n = sentCount(asset.id)
          const allHave = n === players.length && players.length > 0
          return (
            <ListItem key={asset.id} disablePadding sx={{ py: 0.25 }}
              secondaryAction={
                <Button size="small" disabled={allHave} onClick={() => openSend(asset.id)}>
                  {allHave ? 'Sent ✓' : 'Send →'}
                </Button>
              }>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Chip label={asset.type} size="small" color={TYPE_COLORS[asset.type] ?? 'default'} />
                    <Typography variant="body2">{asset.title}</Typography>
                  </Box>
                }
                secondary={n > 0 ? `Sent to ${n} player(s)` : undefined}
              />
            </ListItem>
          )
        })}
      </List>

      {/* Send Drawer */}
      <Drawer anchor="bottom" open={!!sendAssetId} onClose={() => !sending && setSendAssetId(null)}
        PaperProps={{ sx: { borderRadius: '16px 16px 0 0', p: 2 } }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Send: {sendAsset?.title}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List dense>
          {players.map((p) => (
            <ListItem key={p.uid} disablePadding>
              <Checkbox
                edge="start"
                checked={selectedUids.includes(p.uid)}
                onChange={(e) => {
                  setSelectedUids((prev) =>
                    e.target.checked ? [...prev, p.uid] : prev.filter((u) => u !== p.uid),
                  )
                }}
                disabled={p.clues.includes(sendAssetId ?? '')}
              />
              <ListItemText
                primary={`${characterMap[p.characterId] ?? p.characterId} — ${p.displayName}`}
                secondary={p.clues.includes(sendAssetId ?? '') ? 'Already has this clue' : undefined}
              />
            </ListItem>
          ))}
        </List>
        {sendError && <Alert severity="error" sx={{ mt: 1 }}>{sendError}</Alert>}
        <Button variant="contained" fullWidth disabled={selectedUids.length === 0 || sending}
          onClick={handleSend} sx={{ mt: 1 }}>
          {sending
            ? <CircularProgress size={20} color="inherit" />
            : `Send to ${selectedUids.length} player(s)`}
        </Button>
      </Drawer>
    </Paper>
  )
}
