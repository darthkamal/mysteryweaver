'use client'
import { useEffect, useState } from 'react'
import { useSessionStore } from '@/lib/store/session-store'

export interface ScenarioCharacter {
  id: string
  public: { name: string; title: string; bio: string; avatarUrl: string | null }
  variantFlag?: { includedIn: string[] }
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
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { characters: { characters: ScenarioCharacter[] }; assets: { assets: ScenarioAsset[] } }) => {
        setScenario({
          characters: data.characters.characters,
          assets: data.assets.assets,
        })
      })
      .catch((e) => {
        console.error('[useScenario] Failed to load scenario:', e)
      })
  }, [scenarioId])

  return scenario
}
