'use client'
import { useEffect } from 'react'
import { useGmStore } from '@/lib/store/gm-store'

export function useGmSession(sessionId: string) {
  const setSession = useGmStore((s) => s.setSession)
  const setRoster = useGmStore((s) => s.setRoster)
  const setAccusations = useGmStore((s) => s.setAccusations)
  const clear = useGmStore((s) => s.clear)

  useEffect(() => {
    if (!sessionId) return

    const es = new EventSource(`/api/sse/gm/${sessionId}`)

    es.addEventListener('session-updated', (e) => {
      try { setSession(JSON.parse((e as MessageEvent).data)) }
      catch { console.error('[useGmSession] Failed to parse session-updated') }
    })
    es.addEventListener('roster-updated', (e) => {
      try { setRoster(JSON.parse((e as MessageEvent).data)) }
      catch { console.error('[useGmSession] Failed to parse roster-updated') }
    })
    es.addEventListener('accusations-updated', (e) => {
      try { setAccusations(JSON.parse((e as MessageEvent).data)) }
      catch { console.error('[useGmSession] Failed to parse accusations-updated') }
    })
    es.onerror = () => es.close()

    return () => { es.close(); clear() }
  }, [sessionId, setSession, setRoster, setAccusations, clear])
}
