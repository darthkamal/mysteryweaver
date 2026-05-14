'use client'
import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getClientDb } from '@/lib/firebase/firestore-client'
import { useSessionStore } from '@/lib/store/session-store'

export function useSession(sessionId: string) {
  const setSession = useSessionStore((s) => s.setSession)
  const clearSession = useSessionStore((s) => s.clearSession)

  useEffect(() => {
    if (!sessionId) return
    const ref = doc(getClientDb(), 'sessions', sessionId)
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const d = snap.data()
      setSession({
        sessionId: snap.id,
        scenarioId: d['scenarioId'],
        phase: d['phase'],
        status: d['status'],
        hostId: d['hostId'],
        characterAssignments: d['characterAssignments'] ?? {},
        unlockedAssets: d['unlockedAssets'] ?? [],
      })
    })
    return () => {
      unsubscribe()
      clearSession()
    }
  }, [sessionId, setSession, clearSession])
}
