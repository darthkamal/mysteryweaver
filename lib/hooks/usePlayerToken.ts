'use client'
import { useEffect, useState } from 'react'

export function usePlayerToken(sessionId: string) {
  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(`mw-player-token-${sessionId}`)
    setUid(token)
    setLoading(false)
  }, [sessionId])

  return { uid, loading }
}
