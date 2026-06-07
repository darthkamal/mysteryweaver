import { describe, it, expect, beforeAll } from 'vitest'

// getJwtSecret() reads JWT_SECRET at call time; set it before signing/verifying.
beforeAll(() => {
  process.env.JWT_SECRET ||= 'test-secret-for-sse-tickets'
})

import { signSseTicket, verifySseTicket } from '@/lib/api/auth'

describe('SSE ticket', () => {
  const sessionId = '11111111-1111-4111-8111-111111111111'

  it('round-trips: a valid ticket resolves back to the uid for its session', async () => {
    const ticket = await signSseTicket('uid-abc', sessionId)
    expect(await verifySseTicket(ticket, sessionId)).toBe('uid-abc')
  })

  it('rejects a ticket presented for a different session', async () => {
    const ticket = await signSseTicket('uid-abc', sessionId)
    await expect(
      verifySseTicket(ticket, '22222222-2222-4222-8222-222222222222'),
    ).rejects.toMatchObject({ status: 401 })
  })

  it('rejects a garbage/tampered ticket', async () => {
    await expect(verifySseTicket('not-a-real-jwt', sessionId)).rejects.toMatchObject({ status: 401 })
  })
})
