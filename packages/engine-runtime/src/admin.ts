import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  // In Cloud Functions, credentials are auto-injected via GOOGLE_CLOUD_PROJECT.
  // In tests, FIRESTORE_EMULATOR_HOST routes traffic to the local emulator.
  initializeApp({ projectId: process.env['GCLOUD_PROJECT'] ?? 'mysteryweaver-test' })
}

export const db = getFirestore()
