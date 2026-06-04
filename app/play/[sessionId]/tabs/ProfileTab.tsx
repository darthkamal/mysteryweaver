'use client'
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material'
import { usePlayerStore } from '@/lib/store/player-store'
import { useScenario } from '@/lib/hooks/useScenario'
import SectionCard from '@/app/_components/SectionCard'

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
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Playing as</Typography>
        <Typography variant="h4" gutterBottom>{character.public.name}</Typography>
        <Typography variant="subtitle1" color="primary" gutterBottom>{character.public.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          Known as: <strong>{displayName}</strong>
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>{character.public.bio}</Typography>
      </Box>

      {privateCharacter && (
        <>
          <SectionCard title="Your Secret Objectives">
            <List dense disablePadding>
              {privateCharacter.secretObjectives.map((obj, i) => (
                <ListItem key={i} sx={{ py: 0.25, alignItems: 'flex-start' }}>
                  <ListItemText primary={`${i + 1}. ${obj}`} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </SectionCard>

          <SectionCard title="What You Know">
            <List dense disablePadding>
              {privateCharacter.hiddenKnowledge.map((fact, i) => (
                <ListItem key={i} sx={{ py: 0.25, alignItems: 'flex-start' }}>
                  <ListItemText primary={`• ${fact}`} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              ))}
            </List>
          </SectionCard>

          <SectionCard title="How to Play This Character">
            <Typography variant="body2" fontStyle="italic">{privateCharacter.roleplayingNotes}</Typography>
          </SectionCard>
        </>
      )}
    </Box>
  )
}
