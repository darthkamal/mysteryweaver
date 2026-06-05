'use client'
import { useState } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Badge, Typography, Button, Paper } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import SavingsIcon from '@mui/icons-material/Savings'
import SearchIcon from '@mui/icons-material/Search'
import EditNoteIcon from '@mui/icons-material/EditNote'
import GavelIcon from '@mui/icons-material/Gavel'
import { usePlayerToken } from '@/lib/hooks/usePlayerToken'
import { useSession } from '@/lib/hooks/useSession'
import { usePlayerStore } from '@/lib/store/player-store'
import { useSessionStore } from '@/lib/store/session-store'
import ProfileTab from './tabs/ProfileTab'
import YamsTab from './tabs/YamsTab'
import CluesTab from './tabs/CluesTab'
import NotesTab from './tabs/NotesTab'
import ColorSchemeToggle from '@/app/_components/ColorSchemeToggle'
import { useScenario } from '@/lib/hooks/useScenario'
import AccusationSheet from './AccusationSheet'

interface Props {
  sessionId: string
}

export default function PlayerBinder({ sessionId }: Props) {
  const { uid, loading } = usePlayerToken(sessionId)
  const [activeTab, setActiveTab] = useState(0)
  const newClueCount = usePlayerStore((s) => s.newClueCount)
  const phase = useSessionStore((s) => s.phase)
  const scenario = useScenario()
  const myAccusation = usePlayerStore((s) => s.myAccusation)
  const [accuseOpen, setAccuseOpen] = useState(false)
  const inAccusationPhase = !!scenario?.accusationMechanic && phase === scenario.accusationMechanic.allowedPhase

  useSession(sessionId, uid)

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100dvh">
        <Typography color="text.secondary">Connecting…</Typography>
      </Box>
    )
  }

  const tabs = [
    <ProfileTab key="profile" sessionId={sessionId} uid={uid ?? ''} />,
    <YamsTab key="yams" sessionId={sessionId} uid={uid ?? ''} />,
    <CluesTab key="clues" sessionId={sessionId} uid={uid ?? ''} />,
    <NotesTab key="notes" sessionId={sessionId} uid={uid ?? ''} />,
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 600, mx: 'auto', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          {phase ?? '—'}
        </Typography>
        <ColorSchemeToggle size="small" />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>{tabs[activeTab]}</Box>

      {inAccusationPhase && (
        <Paper square elevation={0} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Button fullWidth size="large" variant="contained" startIcon={<GavelIcon />} onClick={() => setAccuseOpen(true)}>
            {myAccusation ? 'Accusation submitted — tap to revise' : 'Make Your Accusation'}
          </Button>
        </Paper>
      )}

      <BottomNavigation
        value={activeTab}
        onChange={(_, newValue: number) => {
          if (newValue === 2) usePlayerStore.getState().markCluesSeen()
          setActiveTab(newValue)
        }}
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <BottomNavigationAction label="Profile" icon={<PersonIcon />} />
        <BottomNavigationAction label="Yams" icon={<SavingsIcon />} />
        <BottomNavigationAction
          label="Clues"
          icon={<Badge badgeContent={newClueCount} color="error" max={9}><SearchIcon /></Badge>}
        />
        <BottomNavigationAction label="Notes" icon={<EditNoteIcon />} />
      </BottomNavigation>

      <AccusationSheet sessionId={sessionId} open={accuseOpen} onClose={() => setAccuseOpen(false)} />
    </Box>
  )
}
