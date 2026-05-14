import { vi } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'

// ── Shared test constants ─────────────────────────────────────────────────────

export const HOST_UID = 'uid_host'
export const PLAYER_1_UID = 'uid_p1'
export const PLAYER_2_UID = 'uid_p2'
export const SESSION_ID = 'TEST01'
export const SCENARIO_ID = 'kola_nut_test'

export const SCENARIO_DATA = {
  manifest: {
    phases: [
      { id: 'lobby', yamsLocked: true },
      { id: 'introduction', yamsLocked: true },
      { id: 'investigation', yamsLocked: false },
      { id: 'accusation', yamsLocked: true },
      { id: 'debrief', yamsLocked: true },
    ],
    accusationMechanic: { allowedPhase: 'accusation', requiresEvidence: true },
  },
  characters: {
    characters: [
      { id: 'okonkwo', private: { startingInventory: { yams: 5, oracle_bones: 0 } } },
      { id: 'amadi', private: { startingInventory: { yams: 6, oracle_bones: 0 } } },
    ],
  },
  assets: {
    assets: [
      { id: 'evidence_1', triggerCondition: null },
      { id: 'evidence_4', triggerCondition: { npcEvent: 'ikemefuna_dies' } },
    ],
  },
  gmScript: {
    npcEvents: [
      {
        id: 'ikemefuna_dies',
        label: 'Ikemefuna Dies',
        unlocksAssets: ['evidence_4'],
        autoDistribute: false,
      },
    ],
  },
}

export const LOBBY_SESSION = {
  roomCode: SESSION_ID,
  hostId: HOST_UID,
  scenarioId: SCENARIO_ID,
  phase: 'lobby',
  phaseIndex: 0,
  status: 'lobby',
  characterAssignments: {},
  unlockedAssets: [],
  accusation: null,
}

export const ACTIVE_SESSION = {
  ...LOBBY_SESSION,
  phase: 'investigation',
  phaseIndex: 2,
  status: 'active',
  characterAssignments: { okonkwo: PLAYER_1_UID, amadi: PLAYER_2_UID },
}

export const PLAYER_1 = {
  characterId: 'okonkwo',
  displayName: 'Player One',
  currencies: { yams: 5, oracle_bones: 0 },
  clues: [],
  isOnline: true,
}

export const PLAYER_2 = {
  characterId: 'amadi',
  displayName: 'Player Two',
  currencies: { yams: 6, oracle_bones: 0 },
  clues: [],
  isOnline: true,
}

// ── In-memory Firestore mock ──────────────────────────────────────────────────

type DocData = Record<string, unknown>

export function createMockDb(
  initialDocs: Record<string, object> = {},
): Firestore & { _store: Map<string, DocData> } {
  const store = new Map<string, DocData>(
    Object.entries(initialDocs).map(([k, v]) => [k, v as DocData]),
  )

  function applyDotNotation(target: DocData, updates: DocData): DocData {
    const result = { ...target }
    for (const [key, value] of Object.entries(updates)) {
      if (key.includes('.')) {
        const dotIdx = key.indexOf('.')
        const top = key.slice(0, dotIdx)
        const rest = key.slice(dotIdx + 1)
        result[top] = applyDotNotation(
          (result[top] as DocData) ?? {},
          { [rest]: value },
        )
      } else {
        result[key] = value
      }
    }
    return result
  }

  function makeRef(path: string) {
    return {
      path,
      id: path.split('/').pop() ?? '',
      get: () =>
        Promise.resolve({
          exists: store.has(path),
          id: path.split('/').pop() ?? '',
          data: () => store.get(path),
          ref: makeRef(path),
        }),
      set: (data: DocData) => {
        store.set(path, data)
        return Promise.resolve()
      },
      update: (updates: DocData) => {
        const existing = store.get(path) ?? {}
        store.set(path, applyDotNotation(existing, updates))
        return Promise.resolve()
      },
    }
  }

  const db = {
    _store: store,

    doc: vi.fn().mockImplementation(makeRef),

    collection: vi.fn().mockImplementation((colPath: string) => ({
      path: colPath,
      add: vi.fn().mockImplementation((data: DocData) => {
        const id = `auto-${Math.random().toString(36).slice(2, 8)}`
        store.set(`${colPath}/${id}`, data)
        return Promise.resolve({ id })
      }),
      get: vi.fn().mockImplementation(() => {
        const prefix = colPath + '/'
        const docs = []
        for (const [docPath, docData] of store) {
          const afterPrefix = docPath.slice(prefix.length)
          if (docPath.startsWith(prefix) && !afterPrefix.includes('/')) {
            docs.push({
              id: afterPrefix,
              ref: makeRef(docPath),
              data: () => docData,
              exists: true,
            })
          }
        }
        return Promise.resolve({ docs, empty: docs.length === 0, size: docs.length })
      }),
    })),

    runTransaction: vi.fn().mockImplementation(
      async (fn: (tx: object) => Promise<unknown>) => {
        const tx = {
          get: (ref: ReturnType<typeof makeRef>) => ref.get(),
          set: (ref: ReturnType<typeof makeRef>, data: DocData) => ref.set(data),
          update: (ref: ReturnType<typeof makeRef>, updates: DocData) => ref.update(updates),
        }
        return fn(tx)
      },
    ),

    batch: vi.fn().mockImplementation(() => {
      const ops: Array<() => void> = []
      return {
        update: vi.fn().mockImplementation(
          (ref: ReturnType<typeof makeRef>, updates: DocData) => {
            ops.push(() => ref.update(updates))
          },
        ),
        set: vi.fn().mockImplementation((ref: ReturnType<typeof makeRef>, data: DocData) => {
          ops.push(() => ref.set(data))
        }),
        commit: vi.fn().mockImplementation(() => {
          for (const op of ops) op()
          return Promise.resolve()
        }),
      }
    }),
  }

  return db as unknown as Firestore & { _store: Map<string, DocData> }
}
