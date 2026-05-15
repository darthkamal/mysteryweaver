'use client'
import { useEffect, useState } from 'react'

export function usePlayerToken(sessionId: string) {
  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem(`mw-player-token-${sessionId}`)
      setUid(token)
    } catch (e) {
      console.error('[usePlayerToken] localStorage unavailable:', e)
      setUid(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  return { uid, loading }
}
