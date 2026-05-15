import { describe, it, expect, beforeEach } from 'vitest'
import {
  addClient, removeClient, clearRegistry,
  broadcastSession, broadcastPlayer, getConnectedUids,
} from '@/lib/sse/registry'

const decoder = new TextDecoder()

function makeController() {
  const chunks: string[] = []
  return {
    enqueue: (data: Uint8Array) => { chunks.push(decoder.decode(data)) },
    getChunks: () => chunks,
  }
}

describe('SSE registry', () => {
  let ctrl1: ReturnType<typeof makeController>
  let ctrl2: ReturnType<typeof makeController>

  beforeEach(() => {
    clearRegistry()
    ctrl1 = makeController()
    ctrl2 = makeController()
  })

  it('broadcastSession sends session-updated to all clients in the session', () => {
    addClient({ sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any })
    addClient({ sessionId: 'TEST01', uid: 'uid_p2', controller: ctrl2 as any })
    broadcastSession('TEST01', { phase: 'investigation' })
    expect(ctrl1.getChunks()[0]).toContain('event: session-updated')
    expect(ctrl1.getChunks()[0]).toContain('investigation')
    expect(ctrl2.getChunks()[0]).toContain('event: session-updated')
  })

  it('broadcastSession does not send to a different session', () => {
    const other = makeController()
    addClient({ sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any })
    addClient({ sessionId: 'OTHER', uid: 'uid_p3', controller: other as any })
    broadcastSession('TEST01', { phase: 'accusation' })
    expect(ctrl1.getChunks()).toHaveLength(1)
    expect(other.getChunks()).toHaveLength(0)
  })

  it('broadcastPlayer sends player-updated only to matching uid', () => {
    addClient({ sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any })
    addClient({ sessionId: 'TEST01', uid: 'uid_p2', controller: ctrl2 as any })
    broadcastPlayer('TEST01', 'uid_p1', { currencies: { yams: 5 } })
    expect(ctrl1.getChunks()).toHaveLength(1)
    expect(ctrl1.getChunks()[0]).toContain('event: player-updated')
    expect(ctrl2.getChunks()).toHaveLength(0)
  })

  it('removeClient stops receiving events', () => {
    const client = { sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any }
    addClient(client)
    removeClient(client)
    broadcastSession('TEST01', { phase: 'lobby' })
    expect(ctrl1.getChunks()).toHaveLength(0)
  })

  it('getConnectedUids returns uids for the session', () => {
    addClient({ sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any })
    addClient({ sessionId: 'TEST01', uid: 'uid_p2', controller: ctrl2 as any })
    const uids = getConnectedUids('TEST01')
    expect(uids).toContain('uid_p1')
    expect(uids).toContain('uid_p2')
  })

  it('getConnectedUids excludes other sessions', () => {
    addClient({ sessionId: 'TEST01', uid: 'uid_p1', controller: ctrl1 as any })
    addClient({ sessionId: 'OTHER', uid: 'uid_p2', controller: ctrl2 as any })
    const uids = getConnectedUids('TEST01')
    expect(uids).toContain('uid_p1')
    expect(uids).not.toContain('uid_p2')
  })
})
