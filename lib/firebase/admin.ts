import 'server-only'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function ensureAdminApp() {
  if (getApps().length > 0) return

  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS)
    initializeApp({ credential: cert(serviceAccount) })
  } else {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'mysteryweaver-dev',
    })
  }
}

export function getAdminDb() {
  ensureAdminApp()
  return getFirestore()
}

export function getAdminAuth() {
  ensureAdminApp()
  return getAuth()
}
