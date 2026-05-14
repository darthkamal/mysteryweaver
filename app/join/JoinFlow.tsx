'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import {
  Box, Container, TextField, Button, Typography, Card, CardContent,
  Alert, CircularProgress, Avatar, Chip, Stack,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import { getClientDb } from '@/lib/firebase/firestore-client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useGameApi } from '@/lib/hooks/useGameApi'

type JoinStep = 'code' | 'character' | 'joining'

interface CharacterOption {
  id: string
  name: string
  title: string
  bio: string
}

interface SessionInfo {
  id: string
  scenarioId: string
  characterAssignments: Record<string, string>
}

export default function JoinFlow() {
  const router = useRouter()
  const { uid, loading: authLoading } = useAuth()
  const { call } = useGameApi()

  const [step, setStep] = useState<JoinStep>('code')
  const [roomCode, setRoomCode] = useState('')
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [characters, setCharacters] = useState<CharacterOption[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFindGame() {
    setLoading(true)
    setError(null)
    try {
      const db = getClientDb()
      const snap = await getDocs(
        query(collection(db, 'sessions'), where('roomCode', '==', roomCode.trim().toUpperCase())),
      )
      if (snap.empty) throw new Error('No game found with that room code.')

      const sessionDoc = snap.docs[0]!
      const sd = sessionDoc.data()
      if (sd['status'] !== 'lobby')
        throw new Error('This game has already started. Ask the GM to add you.')

      const info: SessionInfo = {
        id: sessionDoc.id,
        scenarioId: sd['scenarioId'],
        characterAssignments: sd['characterAssignments'] ?? {},
      }

      const scenarioSnap = await getDoc(doc(db, 'scenarios', info.scenarioId))
      if (!scenarioSnap.exists()) throw new Error('Scenario data not found.')

      const allChars = (
        scenarioSnap.data()['characters']['characters'] as Array<{
          id: string
          public: { name: string; title: string; bio: string }
        }>
      ).map((c) => ({
        id: c.id,
        name: c.public.name,
        title: c.public.title,
        bio: c.public.bio,
      }))

      setSessionInfo(info)
      setCharacters(allChars)
      setStep('character')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to find game.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!selectedCharacterId || !displayName.trim() || !sessionInfo || !uid) return
    setStep('joining')
    setError(null)
    try {
      await call('/api/game/join', {
        sessionId: sessionInfo.id,
        characterId: selectedCharacterId,
        displayName: displayName.trim(),
      })
      router.push(`/play/${sessionInfo.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join. Try again.')
      setStep('character')
    }
  }

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
        MysteryWeaver
      </Typography>

      {step === 'code' && (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleFindGame()
          }}
        >
          <Typography variant="body1" gutterBottom color="text.secondary" sx={{ mb: 3 }}>
            Enter your room code to join a game.
          </Typography>
          <TextField
            label="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 6 }}
            fullWidth
            variant="outlined"
            sx={{ mb: 2, letterSpacing: '0.3em' }}
            autoFocus
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || roomCode.trim().length < 4}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Find Game'}
          </Button>
        </Box>
      )}

      {(step === 'character' || step === 'joining') && sessionInfo && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Choose Your Character
          </Typography>
          <TextField
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ mb: 3 }}
            placeholder="How should other players know you?"
            autoFocus
          />
          <Stack spacing={2} sx={{ mb: 3 }}>
            {characters.map((char) => {
              const taken = char.id in sessionInfo.characterAssignments
              const selected = selectedCharacterId === char.id
              return (
                <Card
                  key={char.id}
                  variant="outlined"
                  onClick={() => !taken && setSelectedCharacterId(char.id)}
                  sx={{
                    cursor: taken ? 'not-allowed' : 'pointer',
                    opacity: taken ? 0.5 : 1,
                    border: selected ? '2px solid' : '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mt: 0.5 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {char.name}
                        </Typography>
                        {taken && <Chip label="Taken" size="small" color="error" />}
                        {selected && !taken && (
                          <Chip label="Selected" size="small" color="primary" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {char.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {char.bio}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleJoin}
            disabled={!selectedCharacterId || !displayName.trim() || step === 'joining'}
            sx={{ mb: 1 }}
          >
            {step === 'joining' ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Join as ${characters.find((c) => c.id === selectedCharacterId)?.name ?? '...'}`
            )}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setStep('code')
              setError(null)
            }}
            disabled={step === 'joining'}
          >
            ← Back
          </Button>
        </Box>
      )}
    </Container>
  )
}
