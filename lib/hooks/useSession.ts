'use client'
import { useEffect } from 'react'
import { useSessionStore } from '@/lib/store/session-store'
import { usePlayerStore } from '@/lib/store/player-store'

export function useSession(sessionId: string, uid: string | null) {
  const setSession = useSessionStore((s) => s.setSession)
  const clearSession = useSessionStore((s) => s.clearSession)
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const clearPlayer = usePlayerStore((s) => s.clearPlayer)

  useEffect(() => {
    if (!sessionId || !uid) return

    const token = localStorage.getItem(`mw-player-token-${sessionId}`)
    if (!token) return

    const es = new EventSource(
      `/api/sse/${sessionId}?token=${encodeURIComponent(token)}`,
    )

    es.addEventListener('session-updated', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setSession(data)
    })

    es.addEventListener('player-updated', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setPlayer(data)
    })

    es.onerror = () => es.close()

    return () => {
      es.close()
      clearSession()
      clearPlayer()
    }
  }, [sessionId, uid, setSession, clearSession, setPlayer, clearPlayer])
}
