'use client'

export function useGameApi(sessionId: string) {
  async function call(endpoint: string, body: unknown): Promise<unknown> {
    let token: string | null = null
    try {
      token = localStorage.getItem(`mw-player-token-${sessionId}`)
    } catch {
      throw new Error('Storage unavailable — cannot authenticate')
    }
    if (!token) throw new Error('Not authenticated — please rejoin the game')

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
