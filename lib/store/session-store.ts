import { create } from 'zustand'

type SessionStatus = 'lobby' | 'active' | 'ended'

interface SessionData {
  sessionId: string
  scenarioId: string
  phase: string
  status: SessionStatus
  hostId: string
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
}

interface SessionState {
  sessionId: string | null
  scenarioId: string | null
  phase: string | null
  status: SessionStatus | null
  hostId: string | null
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
  setSession: (data: SessionData) => void
  clearSession: () => void
  isCharacterTaken: (characterId: string) => boolean
}

const EMPTY: Omit<SessionState, 'setSession' | 'clearSession' | 'isCharacterTaken'> = {
  sessionId: null,
  scenarioId: null,
  phase: null,
  status: null,
  hostId: null,
  characterAssignments: {},
  unlockedAssets: [],
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...EMPTY,
  setSession: (data) => set(data),
  clearSession: () => set(EMPTY),
  isCharacterTaken: (characterId) => characterId in get().characterAssignments,
}))
