import { create } from 'zustand'

interface PlayerData {
  characterId: string
  displayName: string
  currencies: Record<string, number>
  clues: string[]
}

interface PlayerState {
  characterId: string | null
  displayName: string | null
  currencies: Record<string, number>
  clues: string[]
  seenClues: string[]
  newClueCount: number
  setPlayer: (data: PlayerData) => void
  markCluesSeen: () => void
  clearPlayer: () => void
}

const EMPTY: Omit<PlayerState, 'setPlayer' | 'markCluesSeen' | 'clearPlayer'> = {
  characterId: null,
  displayName: null,
  currencies: {},
  clues: [],
  seenClues: [],
  newClueCount: 0,
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...EMPTY,
  setPlayer: (data) =>
    set((state) => ({
      ...data,
      seenClues: state.seenClues,
      newClueCount: data.clues.filter((c) => !state.seenClues.includes(c)).length,
    })),
  markCluesSeen: () =>
    set((state) => ({
      seenClues: [...state.clues],
      newClueCount: 0,
    })),
  clearPlayer: () => set(EMPTY),
}))
