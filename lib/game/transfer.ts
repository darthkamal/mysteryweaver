import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/lib/db'
import { sessions, players } from '@/lib/db/schema'
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

export async function transferCurrency(db: Db, uid: string, data: TransferCurrencyData): Promise<void> {
  const { sessionId, toCharacterId, currencyType, amount } = data

  if (amount <= 0) throw new GameError(400, 'Amount must be a positive integer')

  const session = getSession(db, sessionId)
  verifyActiveSession(session)

  const scenario = getScenario(db, session.scenarioId)
  const currentPhase = getPhaseConfig(scenario, session.phase)

  const currency = scenario.manifest.currencies.find((c) => c.id === currencyType)
  if (!currency) throw new GameError(404, `Currency '${currencyType}' not found in this scenario`)
  if (!currency.tradeable) throw new GameError(422, `${currency.name} cannot be traded`)

  if (currentPhase.yamsLocked) {
    throw new GameError(422, 'Transfers are locked during this phase')
  }

  const recipientUid = session.characterAssignments[toCharacterId]
  if (!recipientUid) throw new GameError(404, `Character ${toCharacterId} is not in this session`)
  if (recipientUid === uid) throw new GameError(400, 'Cannot transfer to yourself')

  db.transaction((tx) => {
    const senderRow = tx.select().from(players)
      .where(and(eq(players.sessionId, sessionId), eq(players.uid, uid)))
      .get()
    if (!senderRow) throw new GameError(404, 'You are not a player in this session')

    const recipientRow = tx.select().from(players)
      .where(and(eq(players.sessionId, sessionId), eq(players.uid, recipientUid)))
      .get()
    if (!recipientRow) throw new GameError(404, 'Recipient player not found')

    const senderCurrencies: Record<string, number> = JSON.parse(senderRow.currencies)
    const recipientCurrencies: Record<string, number> = JSON.parse(recipientRow.currencies)

    const senderBalance = senderCurrencies[currencyType] ?? 0
    const recipientBalance = recipientCurrencies[currencyType] ?? 0

    if (senderBalance < amount) {
      throw new GameError(422, `Insufficient ${currencyType}: have ${senderBalance}, need ${amount}`)
    }

    tx.update(players)
      .set({ currencies: JSON.stringify({ ...senderCurrencies, [currencyType]: senderBalance - amount }) })
      .where(and(eq(players.sessionId, sessionId), eq(players.uid, uid)))
      .run()

    tx.update(players)
      .set({ currencies: JSON.stringify({ ...recipientCurrencies, [currencyType]: recipientBalance + amount }) })
      .where(and(eq(players.sessionId, sessionId), eq(players.uid, recipientUid)))
      .run()
  })

  writeLog(db, sessionId, {
    type: 'transaction',
    message: `${uid} transferred ${amount} ${currencyType} to ${toCharacterId}`,
    actorId: uid,
  })
}
