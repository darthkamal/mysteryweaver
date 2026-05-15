'use client'
import { Box, Typography, Divider, Paper, List, ListItem, ListItemText } from '@mui/material'
import { usePlayerStore } from '@/lib/store/player-store'
import { useScenario } from '@/lib/hooks/useScenario'

interface Props {
  sessionId: string
  uid: string
}

export default function ProfileTab({ sessionId: _sessionId, uid: _uid }: Props) {
  const characterId = usePlayerStore((s) => s.characterId)
  const displayName = usePlayerStore((s) => s.displayName)
  const privateCharacter = usePlayerStore((s) => s.privateCharacter)
  const scenario = useScenario()

  if (!characterId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading character…</Typography>
      </Box>
    )
  }

  const character = scenario?.characters.find((c) => c.id === characterId)
  if (!character) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Loading scenario…</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="overline" color="text.secondary">
        Playing as
      </Typography>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {character.public.name}
      </Typography>
      <Typography variant="subtitle1" color="primary" gutterBottom>
        {character.public.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Known as: <strong>{displayName}</strong>
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ mb: 3 }}>
        {character.public.bio}
      </Typography>

      {privateCharacter && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
              Your Secret Objectives
            </Typography>
            <List dense disablePadding>
              {privateCharacter.secretObjectives.map((obj, i) => (
                <ListItem key={i} sx={{ py: 0.25, alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={`${i + 1}. ${obj}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
              What You Know
            </Typography>
            <List dense disablePadding>
              {privateCharacter.hiddenKnowledge.map((fact, i) => (
                <ListItem key={i} sx={{ py: 0.25, alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={`• ${fact}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
              How to Play This Character
            </Typography>
            <Typography variant="body2" fontStyle="italic">
              {privateCharacter.roleplayingNotes}
            </Typography>
          </Paper>
        </>
      )}
    </Box>
  )
}
