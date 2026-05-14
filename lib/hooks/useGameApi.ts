'use client'
import { getToken } from '@/lib/firebase/auth-client'

export function useGameApi() {
  async function call(endpoint: string, body: unknown): Promise<unknown> {
    const token = await getToken()
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({ error: 'Unknown error' }))
    if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
    return data
  }
  return { call }
}
