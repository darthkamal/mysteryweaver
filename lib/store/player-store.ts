import { create } from 'zustand'

export interface PrivateCharacterData {
  secretObjectives: string[]
  hiddenKnowledge: string[]
  roleplayingNotes: string
  startingInventory: Record<string, number>
}

export interface MyAccusation {
  suspectId: string
  motive: string
  evidenceIds: string[]
  submittedAt: number
}

interface PlayerData {
  characterId: string
  displayName: string
  currencies: Record<string, number>
  clues: string[]
  privateCharacter?: PrivateCharacterData | null
  myAccusation?: MyAccusation | null
}

interface PlayerState {
  characterId: string | null
  displayName: string | null
  currencies: Record<string, number>
  clues: string[]
  seenClues: string[]
  newClueCount: number
  privateCharacter: PrivateCharacterData | null
  myAccusation: MyAccusation | null
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
  privateCharacter: null,
  myAccusation: null,
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...EMPTY,
  setPlayer: (data) =>
    set((state) => ({
      ...data,
      // Preserve existing private data if the update doesn't include it
      privateCharacter: data.privateCharacter !== undefined ? data.privateCharacter : state.privateCharacter,
      myAccusation: data.myAccusation !== undefined ? data.myAccusation : state.myAccusation,
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
