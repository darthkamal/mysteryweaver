const encoder = new TextEncoder()

export interface SseClient {
  sessionId: string
  uid: string
  controller: ReadableStreamDefaultController<Uint8Array>
}

const clients = new Set<SseClient>()
const gmClients = new Map<string, SseClient>() // sessionId → one GM per session

function send(client: SseClient, event: string, data: unknown): void {
  try {
    client.controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  } catch {
    clients.delete(client)
  }
}

function sendGm(sessionId: string, event: string, data: unknown): void {
  const client = gmClients.get(sessionId)
  if (!client) return
  try {
    client.controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  } catch {
    gmClients.delete(sessionId)
  }
}

export function addClient(client: SseClient): void { clients.add(client) }
export function removeClient(client: SseClient): void { clients.delete(client) }
export function clearRegistry(): void { clients.clear(); gmClients.clear() }

export function addGmClient(client: SseClient): void {
  // Replace previous connection for this session (handles page reload)
  const existing = gmClients.get(client.sessionId)
  if (existing) {
    try { existing.controller.close() } catch { /* already closed */ }
  }
  gmClients.set(client.sessionId, client)
}

export function removeGmClient(sessionId: string): void {
  gmClients.delete(sessionId)
}

export function broadcastSession(sessionId: string, data: unknown): void {
  for (const client of clients) {
    if (client.sessionId === sessionId) send(client, 'session-updated', data)
  }
}

export function broadcastPlayer(sessionId: string, uid: string, data: unknown): void {
  for (const client of clients) {
    if (client.sessionId === sessionId && client.uid === uid) send(client, 'player-updated', data)
  }
}

export function broadcastGm(sessionId: string, event: string, data: unknown): void {
  sendGm(sessionId, event, data)
}

export function getConnectedUids(sessionId: string): string[] {
  return [...clients].filter((c) => c.sessionId === sessionId).map((c) => c.uid)
}
