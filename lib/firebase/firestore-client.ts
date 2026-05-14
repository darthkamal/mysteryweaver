import { getFirestore } from 'firebase/firestore'
import { clientApp } from './client'

let db: ReturnType<typeof getFirestore> | null = null

export function getClientDb() {
  if (!db) db = getFirestore(clientApp)
  return db
}
