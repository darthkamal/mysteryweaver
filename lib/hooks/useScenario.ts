'use client'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { getClientDb } from '@/lib/firebase/firestore-client'
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
    getDoc(doc(getClientDb(), 'scenarios', scenarioId)).then((snap) => {
      if (!snap.exists()) return
      const d = snap.data()
      setScenario({
        characters: d['characters']['characters'] as ScenarioCharacter[],
        assets: d['assets']['assets'] as ScenarioAsset[],
      })
    })
  }, [scenarioId])

  return scenario
}
