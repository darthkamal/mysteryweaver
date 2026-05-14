'use client'
import { useState } from 'react'
import { Box, BottomNavigation, BottomNavigationAction, Badge, Typography } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import SavingsIcon from '@mui/icons-material/Savings'
import SearchIcon from '@mui/icons-material/Search'
import EditNoteIcon from '@mui/icons-material/EditNote'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSession } from '@/lib/hooks/useSession'
import { usePlayer } from '@/lib/hooks/usePlayer'
import { usePlayerStore } from '@/lib/store/player-store'
import { useSessionStore } from '@/lib/store/session-store'
import ProfileTab from './tabs/ProfileTab'
import YamsTab from './tabs/YamsTab'
import CluesTab from './tabs/CluesTab'
import NotesTab from './tabs/NotesTab'

interface Props {
  sessionId: string
}

export default function PlayerBinder({ sessionId }: Props) {
  const { uid, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const newClueCount = usePlayerStore((s) => s.newClueCount)
  const phase = useSessionStore((s) => s.phase)

  useSession(sessionId)
  usePlayer(sessionId, uid)

  if (authLoading) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 600, mx: 'auto' }}>
      {phase && (
        <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 0.75 }}>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {phase}
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: 'auto' }}>{tabs[activeTab]}</Box>

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
          icon={
            <Badge badgeContent={newClueCount} color="error" max={9}>
              <SearchIcon />
            </Badge>
          }
        />
        <BottomNavigationAction label="Notes" icon={<EditNoteIcon />} />
      </BottomNavigation>
    </Box>
  )
}
