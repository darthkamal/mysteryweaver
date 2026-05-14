import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from '@/lib/store/session-store'

const MOCK_SESSION = {
  sessionId: 'TEST01',
  scenarioId: 'kola_nut_test',
  phase: 'investigation',
  status: 'active' as const,
  hostId: 'uid_host',
  characterAssignments: { okonkwo: 'uid_p1' },
  unlockedAssets: ['evidence_4'],
}

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession()
  })

  it('starts with null session state', () => {
    const state = useSessionStore.getState()
    expect(state.sessionId).toBeNull()
    expect(state.phase).toBeNull()
    expect(state.status).toBeNull()
    expect(state.characterAssignments).toEqual({})
    expect(state.unlockedAssets).toEqual([])
  })

  it('setSession populates all fields', () => {
    useSessionStore.getState().setSession(MOCK_SESSION)
    const s = useSessionStore.getState()
    expect(s.sessionId).toBe('TEST01')
    expect(s.scenarioId).toBe('kola_nut_test')
    expect(s.phase).toBe('investigation')
    expect(s.status).toBe('active')
    expect(s.hostId).toBe('uid_host')
    expect(s.characterAssignments).toEqual({ okonkwo: 'uid_p1' })
    expect(s.unlockedAssets).toEqual(['evidence_4'])
  })

  it('clearSession resets to null state', () => {
    useSessionStore.getState().setSession(MOCK_SESSION)
    useSessionStore.getState().clearSession()
    const s = useSessionStore.getState()
    expect(s.sessionId).toBeNull()
    expect(s.phase).toBeNull()
    expect(s.characterAssignments).toEqual({})
  })

  it('isCharacterTaken returns true for an assigned character', () => {
    useSessionStore.getState().setSession(MOCK_SESSION)
    expect(useSessionStore.getState().isCharacterTaken('okonkwo')).toBe(true)
  })

  it('isCharacterTaken returns false for an unassigned character', () => {
    useSessionStore.getState().setSession(MOCK_SESSION)
    expect(useSessionStore.getState().isCharacterTaken('amadi')).toBe(false)
  })

  it('isCharacterTaken returns false on empty assignments', () => {
    expect(useSessionStore.getState().isCharacterTaken('okonkwo')).toBe(false)
  })
})
