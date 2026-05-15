import { create } from 'zustand'

export interface GmPlayerRecord {
  uid: string
  characterId: string
  displayName: string
  currencies: Record<string, number>
  clues: string[]
  isOnline: boolean
}

export interface GmAccusationRecord {
  accuserId: string
  suspectId: string
  motive: string
  evidenceIds: string[]
  submittedAt: number
}

interface SessionUpdatedData {
  sessionId: string
  phase: string
  phaseIndex: number
  status: 'lobby' | 'active' | 'ended'
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
  triggeredNpcEvents: string[]
}

interface GmState {
  sessionId: string | null
  phase: string | null
  phaseIndex: number
  status: 'lobby' | 'active' | 'ended' | null
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
  triggeredNpcEvents: string[]
  players: GmPlayerRecord[]
  accusations: GmAccusationRecord[]
  setSession: (data: SessionUpdatedData) => void
  setRoster: (data: { players: GmPlayerRecord[] }) => void
  setAccusations: (data: { accusations: GmAccusationRecord[] }) => void
  clear: () => void
}

const EMPTY = {
  sessionId: null,
  phase: null,
  phaseIndex: 0,
  status: null as 'lobby' | 'active' | 'ended' | null,
  characterAssignments: {} as Record<string, string>,
  unlockedAssets: [] as string[],
  triggeredNpcEvents: [] as string[],
  players: [] as GmPlayerRecord[],
  accusations: [] as GmAccusationRecord[],
}

export const useGmStore = create<GmState>((set) => ({
  ...EMPTY,
  setSession: (data) => set({
    sessionId: data.sessionId,
    phase: data.phase,
    phaseIndex: data.phaseIndex,
    status: data.status,
    characterAssignments: data.characterAssignments,
    unlockedAssets: data.unlockedAssets,
    triggeredNpcEvents: data.triggeredNpcEvents,
  }),
  setRoster: (data) => set({ players: data.players }),
  setAccusations: (data) => set({ accusations: data.accusations }),
  clear: () => set(EMPTY),
}))
