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

    let es: EventSource | null = null
    let cancelled = false

    // Exchange the long-lived token (sent as a header) for a short-lived ticket,
    // then open the stream with ?ticket= — keeps the token out of the URL/logs.
    ;(async () => {
      try {
        const res = await fetch('/api/sse/ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        })
        if (!res.ok || cancelled) return
        const { ticket } = (await res.json()) as { ticket: string }
        if (cancelled) return

        es = new EventSource(`/api/sse/${sessionId}?ticket=${encodeURIComponent(ticket)}`)

        es.addEventListener('session-updated', (e) => {
          try { setSession(JSON.parse((e as MessageEvent).data)) }
          catch { console.error('[useSession] Failed to parse session-updated payload') }
        })

        es.addEventListener('player-updated', (e) => {
          try { setPlayer(JSON.parse((e as MessageEvent).data)) }
          catch { console.error('[useSession] Failed to parse player-updated payload') }
        })

        es.onerror = () => es?.close()
      } catch {
        console.error('[useSession] Failed to open SSE stream')
      }
    })()

    return () => {
      cancelled = true
      es?.close()
      clearSession()
      clearPlayer()
    }
  }, [sessionId, uid, setSession, clearSession, setPlayer, clearPlayer])
}
