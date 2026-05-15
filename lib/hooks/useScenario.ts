'use client'
import { useEffect, useState } from 'react'
import { useSessionStore } from '@/lib/store/session-store'

export interface ScenarioCharacter {
  id: string
  public: { name: string; title: string; bio: string; avatarUrl: string | null }
  private: {
    secretObjectives: string[]
    hiddenKnowledge: string[]
    roleplayingNotes: string
    startingInventory: Record<string, number>
  }
}

export interface ScenarioAsset {
  id: string
  type: string
  title: string
  content: string
}

export interface ScenarioCache {
  characters: ScenarioCharacter[]
  assets: ScenarioAsset[]
}

export function useScenario(): ScenarioCache | null {
  const scenarioId = useSessionStore((s) => s.scenarioId)
  const [scenario, setScenario] = useState<ScenarioCache | null>(null)

  useEffect(() => {
    if (!scenarioId) return
    fetch(`/api/scenario/${scenarioId}`)
      .then((r) => r.json())
      .then(
        (data: {
          characters: { characters: ScenarioCharacter[] }
          assets: { assets: ScenarioAsset[] }
        }) => {
          setScenario({
            characters: data.characters.characters,
            assets: data.assets.assets,
          })
        },
      )
      .catch(() => {})
  }, [scenarioId])

  return scenario
}
