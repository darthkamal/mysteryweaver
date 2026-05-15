import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createTestDb, insertScenario, insertSession,
  HOST_UID, SCENARIO_ID, LOBBY_SESSION_DATA, ACTIVE_SESSION_DATA,
} from './helpers'

// ── Mocks (must be before imports that use them) ─────────────────────────────

vi.mock('@/lib/api/auth', () => ({
  verifyGmToken: vi.fn().mockResolvedValue({ gmId: HOST_UID, email: 'gm@test.com' }),
}))

// Property-getter pattern: ensures the route always uses the current testDb instance
let testDb: ReturnType<typeof createTestDb>

vi.mock('@/lib/db', () => ({
  get db() { return testDb },
}))

// ── Route imports (after mocks) ───────────────────────────────────────────────

import { GET as listScenarios, POST as uploadScenario } from '@/app/api/gm/scenarios/route'
import { GET as getScenario, DELETE as deleteScenario } from '@/app/api/gm/scenarios/[scenarioId]/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

// Minimal valid payload matching all Zod domain schemas
const VALID_MANIFEST = {
  schemaVersion: '1.0',
  name: 'The Broken Kola Nut',
  theme: 'Igbo Mystery',
  seedColor: '#8B4513',
  playerCount: { min: 6, max: 7 },
  currencies: [
    { id: 'yams', name: 'Yams', icon: '🍠', tradeable: true },
    { id: 'oracle_bones', name: 'Oracle Bones', icon: '🦴', tradeable: false },
  ],
  phases: [
    { id: 'lobby', name: 'Lobby', yamsLocked: true },
    { id: 'investigation', name: 'Investigation', yamsLocked: false },
  ],
  accusationMechanic: {
    allowedPhase: 'accusation',
    whoCanAccuse: 'any_player' as const,
    requiresEvidence: true,
    resolution: 'gm_manual' as const,
  },
}

const VALID_CHARACTERS = {
  characters: [
    {
      id: 'okonkwo',
      variantFlag: { includedIn: ['6-player' as const] },
      public: {
        name: 'Okonkwo',
        title: 'The Wrestler',
        avatarUrl: null,
        bio: 'A great man of Umuofia.',
      },
      private: {
        secretObjectives: ['Find who poisoned the Kola Nut'],
        startingInventory: { yams: 5, oracle_bones: 0 },
        hiddenKnowledge: [],
        roleplayingNotes: 'Play with pride and dignity.',
      },
    },
  ],
}

const VALID_ASSETS = {
  assets: [
    {
      id: 'evidence_1',
      type: 'evidence' as const,
      title: 'The Broken Kola Nut',
      content: 'A kola nut split in two, a bad omen.',
      imageUrl: null,
      visibility: 'hidden' as const,
      triggerCondition: null,
    },
  ],
}

const VALID_GM_SCRIPT = {
  timeline: [
    {
      phaseId: 'introduction',
      entries: [
        {
          time: '00:00',
          label: 'Welcome',
          type: 'gm_monologue' as const,
          script: 'Welcome to Umuofia. A tragedy has occurred...',
        },
      ],
    },
  ],
  npcRoster: [
    {
      id: 'chielo',
      name: 'Chielo',
      description: 'The priestess of Agbala.',
      portraitUrl: null,
      playingNotes: 'Speak in a mysterious, prophetic tone.',
    },
  ],
  npcEvents: [
    {
      id: 'ikemefuna_dies',
      label: 'Ikemefuna Dies',
      description: 'The tragic death of Ikemefuna shakes the village.',
      unlocksAssets: ['evidence_1'],
      autoDistribute: false,
    },
  ],
}

const VALID_RELATIONSHIPS = {
  edges: [
    { from: 'okonkwo', to: 'chielo', label: 'Fears', public: false },
  ],
  relationshipCards: [],
}

const VALID_UPLOAD_BODY = {
  name: 'The Broken Kola Nut',
  manifest: VALID_MANIFEST,
  characters: VALID_CHARACTERS,
  assets: VALID_ASSETS,
  gmScript: VALID_GM_SCRIPT,
  relationships: VALID_RELATIONSHIPS,
}

// ── GET /api/gm/scenarios ────────────────────────────────────────────────────

describe('GET /api/gm/scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
  })

  it('returns an empty array when GM has no scenarios', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios')
    const res = await listScenarios(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenarios).toEqual([])
  })

  it('returns scenarios owned by this GM with characterCount', async () => {
    insertScenario(testDb)
    const req = makeRequest('http://localhost/api/gm/scenarios')
    const res = await listScenarios(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenarios).toHaveLength(1)
    const s = body.scenarios[0]
    expect(s.id).toBe(SCENARIO_ID)
    expect(s.name).toBe('Test Scenario')
    expect(typeof s.characterCount).toBe('number')
    expect(s.characterCount).toBe(2) // okonkwo + amadi from helpers
    expect(typeof s.createdAt).toBe('number')
  })

  it('does not return scenarios owned by a different GM', async () => {
    const { scenarios } = await import('@/lib/db/schema')
    testDb.insert(scenarios).values({
      id: 'other_scenario',
      ownerId: 'uid_other_gm',
      name: 'Other Scenario',
      schemaVersion: '1.0',
      manifest: JSON.stringify({}),
      characters: JSON.stringify({ characters: [] }),
      assets: JSON.stringify({}),
      gmScript: JSON.stringify({}),
      relationships: JSON.stringify({ edges: [{ from: 'okonkwo', to: 'amadi', label: 'Rivals', public: true }] }),
      createdAt: Date.now(),
    }).run()

    const req = makeRequest('http://localhost/api/gm/scenarios')
    const res = await listScenarios(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenarios).toHaveLength(0)
  })
})

// ── POST /api/gm/scenarios ───────────────────────────────────────────────────

describe('POST /api/gm/scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
  })

  it('creates a scenario with valid data and returns scenarioId', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_UPLOAD_BODY),
    })
    const res = await uploadScenario(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.scenarioId).toBe('string')
    expect(body.scenarioId.length).toBeGreaterThan(0)
  })

  it('persists the new scenario in the database', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_UPLOAD_BODY),
    })
    const res = await uploadScenario(req as any)
    const { scenarioId } = await res.json()

    const { scenarios } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const row = testDb.select().from(scenarios).where(eq(scenarios.id, scenarioId)).get()
    expect(row).not.toBeUndefined()
    expect(row!.ownerId).toBe(HOST_UID)
    expect(row!.name).toBe('The Broken Kola Nut')
  })

  it('returns 400 when manifest fails domain schema validation', async () => {
    const badBody = {
      ...VALID_UPLOAD_BODY,
      manifest: {
        // Missing required fields: schemaVersion, name, theme, seedColor, etc.
        phases: [{ id: 'lobby', yamsLocked: true }],
        currencies: [],
      },
    }
    const req = makeRequest('http://localhost/api/gm/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badBody),
    })
    const res = await uploadScenario(req as any)
    // ZodError from domain schema re-validation → err() returns 400
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is missing', async () => {
    const { name: _name, ...bodyWithoutName } = VALID_UPLOAD_BODY
    const req = makeRequest('http://localhost/api/gm/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithoutName),
    })
    const res = await uploadScenario(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is empty string', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_UPLOAD_BODY, name: '' }),
    })
    const res = await uploadScenario(req as any)
    expect(res.status).toBe(400)
  })
})

// ── GET /api/gm/scenarios/[scenarioId] ──────────────────────────────────────

describe('GET /api/gm/scenarios/[scenarioId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
    insertScenario(testDb)
  })

  it('returns full scenario data including gmScript', async () => {
    const req = makeRequest(`http://localhost/api/gm/scenarios/${SCENARIO_ID}`)
    const res = await getScenario(req as any, {
      params: Promise.resolve({ scenarioId: SCENARIO_ID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(SCENARIO_ID)
    expect(body.name).toBe('Test Scenario')
    expect(body.manifest).toBeDefined()
    expect(body.characters).toBeDefined()
    expect(body.assets).toBeDefined()
    expect(body.gmScript).toBeDefined()
    expect(body.relationships).toBeDefined()
    // gmScript should be parsed JSON, not a raw string
    expect(typeof body.gmScript).toBe('object')
  })

  it('returns 404 when scenario is not found', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios/nonexistent')
    const res = await getScenario(req as any, {
      params: Promise.resolve({ scenarioId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/scenario not found/i)
  })

  it('returns 404 when scenario is owned by a different GM', async () => {
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
      relationships: JSON.stringify({ edges: [{ from: 'okonkwo', to: 'amadi', label: 'Rivals', public: true }] }),
      createdAt: Date.now(),
    }).run()

    const req = makeRequest('http://localhost/api/gm/scenarios/other_scenario')
    const res = await getScenario(req as any, {
      params: Promise.resolve({ scenarioId: 'other_scenario' }),
    })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/gm/scenarios/[scenarioId] ───────────────────────────────────

describe('DELETE /api/gm/scenarios/[scenarioId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testDb = createTestDb()
    insertScenario(testDb)
  })

  it('successfully deletes a scenario with no active sessions', async () => {
    const req = makeRequest(`http://localhost/api/gm/scenarios/${SCENARIO_ID}`, {
      method: 'DELETE',
    })
    const res = await deleteScenario(req as any, {
      params: Promise.resolve({ scenarioId: SCENARIO_ID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)

    // Verify it's gone from db
    const { scenarios } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const row = testDb.select().from(scenarios).where(eq(scenarios.id, SCENARIO_ID)).get()
    expect(row).toBeUndefined()
  })

  it('returns 409 when a lobby session references this scenario', async () => {
    insertSession(testDb, LOBBY_SESSION_DATA) // status: 'lobby' — not ended

    const req = makeRequest(`http://localhost/api/gm/scenarios/${SCENARIO_ID}`, {
      method: 'DELETE',
    })
    const res = await deleteScenario(req as any, {
      params: Promise.resolve({ scenarioId: SCENARIO_ID }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/active session/i)
  })

  it('returns 409 when an active session references the scenario', async () => {
    insertSession(testDb, ACTIVE_SESSION_DATA) // status: 'active'

    const req = makeRequest(`http://localhost/api/gm/scenarios/${SCENARIO_ID}`, {
      method: 'DELETE',
    })
    const res = await deleteScenario(req as any, {
      params: Promise.resolve({ scenarioId: SCENARIO_ID }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/active session/i)
  })

  it('allows deletion after all sessions have ended', async () => {
    insertSession(testDb, { ...LOBBY_SESSION_DATA, status: 'ended' })

    const req = makeRequest(`http://localhost/api/gm/scenarios/${SCENARIO_ID}`, {
      method: 'DELETE',
    })
    const res = await deleteScenario(req as any, {
      params: Promise.resolve({ scenarioId: SCENARIO_ID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })

  it('returns 404 when scenario is not found or not owned by GM', async () => {
    const req = makeRequest('http://localhost/api/gm/scenarios/nonexistent', {
      method: 'DELETE',
    })
    const res = await deleteScenario(req as any, {
      params: Promise.resolve({ scenarioId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
  })
})
