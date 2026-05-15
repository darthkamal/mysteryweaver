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

    let token: string | null = null
    try {
      token = localStorage.getItem(`mw-player-token-${sessionId}`)
    } catch {
      return
    }
    if (!token) return

    const es = new EventSource(
      `/api/sse/${sessionId}?token=${encodeURIComponent(token)}`,
    )

    es.addEventListener('session-updated', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setSession(data)
      } catch {
        console.error('[useSession] Failed to parse session-updated payload')
      }
    })

    es.addEventListener('player-updated', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setPlayer(data)
      } catch {
        console.error('[useSession] Failed to parse player-updated payload')
      }
    })

    es.onerror = () => es.close()

    return () => {
      es.close()
      clearSession()
      clearPlayer()
    }
  }, [sessionId, uid, setSession, clearSession, setPlayer, clearPlayer])
}
