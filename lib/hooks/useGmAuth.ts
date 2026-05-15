'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface GmInfo {
  gmId: string
  email: string
  displayName: string
}

export function useGmAuth() {
  const router = useRouter()
  const [gm, setGm] = useState<GmInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) { router.replace('/auth'); return null }
        return r.json() as Promise<GmInfo>
      })
      .then((data) => { if (data) setGm(data) })
      .catch(() => router.replace('/auth'))
      .finally(() => setLoading(false))
  }, [router])

  return { gm, loading }
}
