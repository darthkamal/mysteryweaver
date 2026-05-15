export class GameError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
    message: string,
  ) {
    super(message)
    this.name = 'GameError'
  }
}

export type SessionData = {
  id: string
  roomCode: string
  hostId: string
  scenarioId: string
  phase: string
  phaseIndex: number
  status: 'lobby' | 'active' | 'ended'
  characterAssignments: Record<string, string>
  unlockedAssets: string[]
  triggeredNpcEvents: string[]
}

export type ScenarioData = {
  manifest: {
    phases: Array<{ id: string; yamsLocked: boolean }>
    currencies: Array<{ id: string; name: string; tradeable: boolean }>
    accusationMechanic: { allowedPhase: string; requiresEvidence: boolean }
  }
  characters: {
    characters: Array<{
      id: string
      private: { startingInventory: Record<string, number> }
    }>
  }
  assets: {
    assets: Array<{
      id: string
      triggerCondition: null | { npcEvent: string }
    }>
  }
  gmScript: {
    npcEvents: Array<{
      id: string
      label: string
      unlocksAssets: string[]
      autoDistribute: boolean
    }>
  }
}
