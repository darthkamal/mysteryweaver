'use client'
import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getClientDb } from '@/lib/firebase/firestore-client'
import { usePlayerStore } from '@/lib/store/player-store'

export function usePlayer(sessionId: string, uid: string | null) {
  const setPlayer = usePlayerStore((s) => s.setPlayer)
  const clearPlayer = usePlayerStore((s) => s.clearPlayer)

  useEffect(() => {
    if (!sessionId || !uid) return
    const ref = doc(getClientDb(), 'sessions', sessionId, 'players', uid)
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const d = snap.data()
      setPlayer({
        characterId: d['characterId'],
        displayName: d['displayName'],
        currencies: d['currencies'] ?? {},
        clues: d['clues'] ?? [],
      })
    })
    return () => {
      unsubscribe()
      clearPlayer()
    }
  }, [sessionId, uid, setPlayer, clearPlayer])
}
