import type { Firestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { GameError } from './types'
import { getSession, getScenario, verifyActiveSession, getPhaseConfig } from './helpers'
import { writeLog } from './log'

export const TransferCurrencySchema = z.object({
  sessionId: z.string().min(1),
  toCharacterId: z.string().min(1),
  currencyType: z.string().min(1),
  amount: z.number().int(),
})

export type TransferCurrencyData = z.infer<typeof TransferCurrencySchema>

export async function transferCurrency(
  db: Firestore,
  uid: string,
  data: TransferCurrencyData,
): Promise<void> {
  const { sessionId, toCharacterId, currencyType, amount } = data

  if (amount <= 0) throw new GameError(400, 'Amount must be a positive integer')

  const session = await getSession(db, sessionId)
  verifyActiveSession(session)

  const scenario = await getScenario(db, session.scenarioId)
  const currentPhase = getPhaseConfig(scenario, session.phase)

  if (currencyType === 'yams' && currentPhase.yamsLocked) {
    throw new GameError(422, 'Yam transfers are locked during this phase')
  }

  const recipientUid = session.characterAssignments[toCharacterId]
  if (!recipientUid)
    throw new GameError(404, `Character ${toCharacterId} is not in this session`)
  if (recipientUid === uid) throw new GameError(400, 'Cannot transfer to yourself')

  const callerRef = db.doc(`sessions/${sessionId}/players/${uid}`)
  const recipientRef = db.doc(`sessions/${sessionId}/players/${recipientUid}`)

  await db.runTransaction(async (tx) => {
    const [callerSnap, recipientSnap] = await Promise.all([
      tx.get(callerRef),
      tx.get(recipientRef),
    ])

    if (!callerSnap.exists) throw new GameError(404, 'Caller is not a player in this session')
    if (!recipientSnap.exists) throw new GameError(404, 'Recipient player not found')

    const callerCurrencies = callerSnap.data()!['currencies'] as Record<string, number>
    const recipientCurrencies = recipientSnap.data()!['currencies'] as Record<string, number>

    const callerBalance = callerCurrencies[currencyType] ?? 0
    const recipientBalance = recipientCurrencies[currencyType] ?? 0

    if (callerBalance < amount) {
      throw new GameError(
        422,
        `Insufficient ${currencyType}: have ${callerBalance}, need ${amount}`,
      )
    }

    tx.update(callerRef, { [`currencies.${currencyType}`]: callerBalance - amount })
    tx.update(recipientRef, { [`currencies.${currencyType}`]: recipientBalance + amount })
  })

  await writeLog(db, sessionId, {
    type: 'transaction',
    message: `${uid} transferred ${amount} ${currencyType} to ${toCharacterId}`,
    actorId: uid,
  })
}
