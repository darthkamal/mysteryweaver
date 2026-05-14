'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getClientAuth, signInAnon } from '@/lib/firebase/auth-client'

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getClientAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
      } else {
        const newUser = await signInAnon()
        setUid(newUser.uid)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { uid, loading }
}
