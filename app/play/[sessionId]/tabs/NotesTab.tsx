'use client'
import { useState, useEffect } from 'react'
import { Box, Typography, TextField } from '@mui/material'

interface Props {
  sessionId: string
  uid: string
}

function notesKey(sessionId: string, uid: string) {
  return `mw-notes-${sessionId}-${uid}`
}

export default function NotesTab({ sessionId, uid }: Props) {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid) return
    const saved = localStorage.getItem(notesKey(sessionId, uid))
    if (saved !== null) setNotes(saved)
    setLoaded(true)
  }, [sessionId, uid])

  function handleChange(value: string) {
    setNotes(value)
    localStorage.setItem(notesKey(sessionId, uid), value)
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight="bold">
        Notes
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Your private notes — only visible to you, saved on this device.
      </Typography>
      {loaded && (
        <TextField
          multiline
          minRows={14}
          maxRows={30}
          fullWidth
          variant="outlined"
          placeholder="Write your clues, suspicions, and observations here…"
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
        />
      )}
    </Box>
  )
}
