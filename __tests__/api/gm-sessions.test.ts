import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestDb, insertScenario, insertSession,
  HOST_UID, SESSION_ID, SCENARIO_ID, ACTIVE_SESSION_DATA,
} from './helpers'
import { broadcastAll } from '@/lib/sse/broadcast'

// ── Mocks (must be before imports that use them) ─────────────────────────────

vi.mock('@/lib/sse/broadcast', () => ({
  broadcastAll: vi.fn(),
  broadcastGmFull: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  verifyGmToken: vi.fn().mockResolvedValue({ gmId: HOST_UID, email: 'gm@test.com' }),
}))

// Property-getter pattern: ensures the route always uses the current testDb instance
let testDb: ReturnType<typeof createTestDb>

vi.mock('@/lib/db', () => ({
  get db() { return testDb },
}))

// ── Route imports (after mocks) ───────────────────────────────────────────────

import { GET, POST } from '@/app/api/gm/sessions/route'
import { PATCH } from '@/app/api/gm/sessions/[sessionId]/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

// ── GET /api/gm/sessions ─────────────────────────────────────────────────────

describe('GET /api/gm/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
    insertScenario(testDb)
  })

  it('returns an empty sessions array when GM has no sessions', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toEqual([])
  })

  it('returns sessions belonging to the authenticated GM', async () => {
    insertSession(testDb, ACTIVE_SESSION_DATA)
    const req = makeRequest('http://localhost/api/gm/sessions')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(1)
    const s = body.sessions[0]
    expect(s.id).toBe(SESSION_ID)
    expect(s.scenarioId).toBe(SCENARIO_ID)
    expect(s.scenarioName).toBe('Test Scenario')
    expect(s.status).toBe('active')
    expect(s.phase).toBe('investigation')
    expect(typeof s.playerCount).toBe('number')
    expect(typeof s.createdAt).toBe('number')
  })

  it('does not return sessions belonging to a different GM', async () => {
    // Insert session owned by a different host
    testDb.insert((await import('@/lib/db/schema')).sessions).values({
      id: 'other-session',
      roomCode: 'OTHER1',
      hostId: 'uid_other_gm',
      scenarioId: SCENARIO_ID,
      phase: 'lobby',
      phaseIndex: 0,
      status: 'lobby',
      characterAssignments: JSON.stringify({}),
      unlockedAssets: JSON.stringify([]),
      triggeredNpcEvents: JSON.stringify([]),
      createdAt: Date.now(),
    }).run()

    const req = makeRequest('http://localhost/api/gm/sessions')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(0)
  })
})

// ── POST /api/gm/sessions ────────────────────────────────────────────────────

describe('POST /api/gm/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
    insertScenario(testDb)
  })

  it('creates a session and returns sessionId + roomCode', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: SCENARIO_ID }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.sessionId).toBe('string')
    expect(body.sessionId.length).toBeGreaterThan(0)
    expect(typeof body.roomCode).toBe('string')
    expect(body.roomCode).toHaveLength(6)
  })

  it('persists the new session in the database', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: SCENARIO_ID }),
    })
    const res = await POST(req as any)
    const { sessionId } = await res.json()

    const { sessions } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const row = testDb.select().from(sessions).where(eq(sessions.id, sessionId)).get()
    expect(row).not.toBeUndefined()
    expect(row!.hostId).toBe(HOST_UID)
    expect(row!.scenarioId).toBe(SCENARIO_ID)
    expect(row!.status).toBe('lobby')
    expect(row!.phase).toBe('lobby')
    expect(row!.phaseIndex).toBe(0)
  })

  it('returns 404 when scenario does not exist', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'nonexistent_scenario' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/scenario not found/i)
  })

  it('returns 404 when scenario is owned by a different GM', async () => {
    // Insert a scenario owned by someone else
    const { scenarios } = await import('@/lib/db/schema')
    testDb.insert(scenarios).values({
      id: 'other_scenario',
      ownerId: 'uid_other_gm',
      name: 'Other Scenario',
      schemaVersion: '1.0',
      manifest: JSON.stringify({}),
      characters: JSON.stringify({}),
      assets: JSON.stringify({}),
      gmScript: JSON.stringify({}),
      relationships: JSON.stringify({ edges: [] }),
      createdAt: Date.now(),
    }).run()

    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'other_scenario' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
  })

  it('returns 400 when scenarioId is missing', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 500 when all 5 room code attempts collide', async () => {
    // With Math.random() always returning 0, chars[Math.floor(0 * 32)] = chars[0] = 'A'
    // So randomRoomCode() will always produce 'AAAAAA'
    const mathRandom = vi.spyOn(Math, 'random').mockReturnValue(0)

    const { sessions } = await import('@/lib/db/schema')
    // Pre-insert a session with the room code that will always be generated
    const existingRoomCode = 'AAAAAA'
    testDb.insert(sessions).values({
      id: 'existing-session',
      roomCode: existingRoomCode,
      hostId: HOST_UID,
      scenarioId: SCENARIO_ID,
      phase: 'lobby',
      phaseIndex: 0,
      status: 'lobby',
      characterAssignments: JSON.stringify({}),
      unlockedAssets: JSON.stringify([]),
      triggeredNpcEvents: JSON.stringify([]),
      createdAt: Date.now(),
    }).run()

    const req = makeRequest('http://localhost/api/gm/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: SCENARIO_ID }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(500)

    mathRandom.mockRestore()
  })
})

// ── PATCH /api/gm/sessions/[sessionId] ───────────────────────────────────────

describe('PATCH /api/gm/sessions/[sessionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
    insertScenario(testDb)
    insertSession(testDb, ACTIVE_SESSION_DATA)
  })

  it('force-ends an active session', async () => {
    const req = makeRequest(`http://localhost/api/gm/sessions/${SESSION_ID}`, {
      method: 'PATCH',
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ sessionId: SESSION_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ended).toBe(true)
    expect(vi.mocked(broadcastAll)).toHaveBeenCalledWith(SESSION_ID)
  })

  it('persists status=ended in the database', async () => {
    const req = makeRequest(`http://localhost/api/gm/sessions/${SESSION_ID}`, {
      method: 'PATCH',
    })
    await PATCH(req as any, { params: Promise.resolve({ sessionId: SESSION_ID }) })

    const { sessions } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const row = testDb.select().from(sessions).where(eq(sessions.id, SESSION_ID)).get()
    expect(row!.status).toBe('ended')
  })

  it('returns 404 when session does not exist', async () => {
    const req = makeRequest('http://localhost/api/gm/sessions/NO_SUCH_SESSION', {
      method: 'PATCH',
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ sessionId: 'NO_SUCH_SESSION' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not the session host', async () => {
    // Override verifyGmToken to return a different GM
    const { verifyGmToken } = await import('@/lib/api/auth')
    vi.mocked(verifyGmToken).mockResolvedValueOnce({ gmId: 'uid_other_gm', email: 'other@test.com' })

    const req = makeRequest(`http://localhost/api/gm/sessions/${SESSION_ID}`, {
      method: 'PATCH',
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ sessionId: SESSION_ID }) })
    expect(res.status).toBe(403)
  })

  it('returns 422 when session is already ended', async () => {
    // End it first
    const req1 = makeRequest(`http://localhost/api/gm/sessions/${SESSION_ID}`, { method: 'PATCH' })
    await PATCH(req1 as any, { params: Promise.resolve({ sessionId: SESSION_ID }) })

    // Try again
    const req2 = makeRequest(`http://localhost/api/gm/sessions/${SESSION_ID}`, { method: 'PATCH' })
    const res = await PATCH(req2 as any, { params: Promise.resolve({ sessionId: SESSION_ID }) })
    expect(res.status).toBe(422)
  })
})
