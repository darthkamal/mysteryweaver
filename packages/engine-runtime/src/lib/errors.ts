import { HttpsError } from 'firebase-functions/v2/https'

export const unauthenticated = (msg = 'Must be signed in') =>
  new HttpsError('unauthenticated', msg)

export const notFound = (msg: string) =>
  new HttpsError('not-found', msg)

export const badRequest = (msg: string) =>
  new HttpsError('invalid-argument', msg)

export const alreadyExists = (msg: string) =>
  new HttpsError('already-exists', msg)

export const failedPrecondition = (msg: string) =>
  new HttpsError('failed-precondition', msg)

export const permissionDenied = (msg = 'Not authorized') =>
  new HttpsError('permission-denied', msg)
