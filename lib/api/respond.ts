import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { GameError } from '@/lib/game/types'

export function ok(data: unknown = {}) {
  return NextResponse.json(data, { status: 200 })
}

export function err(error: unknown): NextResponse {
  if (error instanceof GameError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid request body', details: error.flatten() },
      { status: 400 },
    )
  }
  console.error('[API Error]', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
