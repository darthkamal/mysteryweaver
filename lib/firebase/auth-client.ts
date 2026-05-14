import { getAuth, signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { clientApp } from './client'

export function getClientAuth() {
  return getAuth(clientApp)
}

export async function signInAnon(): Promise<User> {
  const credential = await signInAnonymously(getClientAuth())
  return credential.user
}

export async function getToken(): Promise<string> {
  const user = getClientAuth().currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}
