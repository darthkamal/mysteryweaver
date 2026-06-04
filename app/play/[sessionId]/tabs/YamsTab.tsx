'use client'
import { useState } from 'react'
import {
  Box, Typography, Button, Drawer, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, CircularProgress, Stack, Divider,
} from '@mui/material'
import SavingsIcon from '@mui/icons-material/Savings'
import SectionCard from '@/app/_components/SectionCard'
import { usePlayerStore } from '@/lib/store/player-store'
import { useSessionStore } from '@/lib/store/session-store'
import { useGameApi } from '@/lib/hooks/useGameApi'
import { useScenario } from '@/lib/hooks/useScenario'

interface Props {
  sessionId: string
  uid: string
}

export default function YamsTab({ sessionId, uid: _uid }: Props) {
  const currencies = usePlayerStore((s) => s.currencies)
  const myCharacterId = usePlayerStore((s) => s.characterId)
  const characterAssignments = useSessionStore((s) => s.characterAssignments)
  const phase = useSessionStore((s) => s.phase)
  const scenario = useScenario()
  const { call } = useGameApi(sessionId)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toCharacterId, setToCharacterId] = useState('')
  const [amount, setAmount] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  const otherCharacters = Object.keys(characterAssignments).filter(
    (charId) => charId !== myCharacterId,
  )

  const getCharacterName = (charId: string) =>
    scenario?.characters.find((c) => c.id === charId)?.public.name ?? charId

  async function handleTransfer() {
    const parsedAmount = parseInt(amount, 10)
    if (!toCharacterId || !parsedAmount || parsedAmount <= 0) return
    setTransferring(true)
    setTransferError(null)
    try {
      await call('/api/game/transfer', {
        sessionId,
        toCharacterId,
        currencyType: 'yams',
        amount: parsedAmount,
      })
      setDrawerOpen(false)
      setToCharacterId('')
      setAmount('')
    } catch (e) {
      setTransferError(e instanceof Error ? e.message : 'Transfer failed.')
    } finally {
      setTransferring(false)
    }
  }

  const yamsLocked = phase === 'accusation' || phase === 'introduction' || phase === 'lobby'

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <SectionCard title="Your Currencies">
        <Stack spacing={2}>
          {Object.entries(currencies).length === 0 && (
            <Typography color="text.secondary">Loading…</Typography>
          )}
          {Object.entries(currencies).map(([type, balance]) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SavingsIcon color="primary" />
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {type.replace('_', ' ')}
                </Typography>
                <Typography variant="h4">
                  {balance}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </SectionCard>

      <Box>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={() => setDrawerOpen(true)}
          disabled={otherCharacters.length === 0 || (currencies['yams'] ?? 0) === 0 || yamsLocked}
        >
          Transfer Yams
        </Button>

        {yamsLocked && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: 'center' }}>
            Yam transfers are locked during {phase}.
          </Typography>
        )}
      </Box>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => !transferring && setDrawerOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px 16px 0 0', p: 3 } }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Transfer Yams
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Send to</InputLabel>
          <Select
            value={toCharacterId}
            label="Send to"
            onChange={(e) => setToCharacterId(e.target.value)}
          >
            {otherCharacters.map((charId) => (
              <MenuItem key={charId} value={charId}>
                {getCharacterName(charId)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          inputProps={{ min: 1, max: currencies['yams'] ?? 0 }}
          helperText={`You have ${currencies['yams'] ?? 0} yams`}
        />

        {transferError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {transferError}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleTransfer}
          disabled={!toCharacterId || !amount || parseInt(amount, 10) <= 0 || transferring}
        >
          {transferring ? <CircularProgress size={24} color="inherit" /> : 'Confirm Transfer'}
        </Button>
        <Button
          fullWidth
          sx={{ mt: 1 }}
          onClick={() => setDrawerOpen(false)}
          disabled={transferring}
        >
          Cancel
        </Button>
      </Drawer>
    </Box>
  )
}
