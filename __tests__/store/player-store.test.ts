import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from '@/lib/store/player-store'

describe('usePlayerStore', () => {
  beforeEach(() => {
    usePlayerStore.getState().clearPlayer()
  })

  it('starts with empty state', () => {
    const s = usePlayerStore.getState()
    expect(s.characterId).toBeNull()
    expect(s.clues).toEqual([])
    expect(s.newClueCount).toBe(0)
    expect(s.seenClues).toEqual([])
  })

  it('setPlayer stores character data', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo',
      displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 },
      clues: [],
    })
    const s = usePlayerStore.getState()
    expect(s.characterId).toBe('okonkwo')
    expect(s.displayName).toBe('Warrior')
    expect(s.currencies.yams).toBe(5)
  })

  it('newClueCount is 0 when player has no clues', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: [],
    })
    expect(usePlayerStore.getState().newClueCount).toBe(0)
  })

  it('newClueCount increments when first clues arrive', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    expect(usePlayerStore.getState().newClueCount).toBe(1)
  })

  it('markCluesSeen resets newClueCount to 0', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    usePlayerStore.getState().markCluesSeen()
    expect(usePlayerStore.getState().newClueCount).toBe(0)
  })

  it('does not count already-seen clues as new', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    usePlayerStore.getState().markCluesSeen()
    // Firestore snapshot fires again with same clue
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    expect(usePlayerStore.getState().newClueCount).toBe(0)
  })

  it('counts only genuinely new clue when second clue arrives', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    usePlayerStore.getState().markCluesSeen()
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1', 'oracle_1'],
    })
    expect(usePlayerStore.getState().newClueCount).toBe(1)
  })

  it('clearPlayer resets all fields', () => {
    usePlayerStore.getState().setPlayer({
      characterId: 'okonkwo', displayName: 'Warrior',
      currencies: { yams: 5, oracle_bones: 0 }, clues: ['evidence_1'],
    })
    usePlayerStore.getState().clearPlayer()
    const s = usePlayerStore.getState()
    expect(s.characterId).toBeNull()
    expect(s.clues).toEqual([])
    expect(s.newClueCount).toBe(0)
  })
})
