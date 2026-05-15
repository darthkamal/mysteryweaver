const encoder = new TextEncoder()

export interface SseClient {
  sessionId: string
  uid: string
  controller: ReadableStreamDefaultController<Uint8Array>
}

const clients = new Set<SseClient>()

function send(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
): void {
  try {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  } catch {
    // Client disconnected
  }
}

export function addClient(client: SseClient): void {
  clients.add(client)
}

export function removeClient(client: SseClient): void {
  clients.delete(client)
}

export function clearRegistry(): void {
  clients.clear()
}

export function broadcastSession(sessionId: string, data: unknown): void {
  for (const client of clients) {
    if (client.sessionId === sessionId) {
      send(client.controller, 'session-updated', data)
    }
  }
}

export function broadcastPlayer(sessionId: string, uid: string, data: unknown): void {
  for (const client of clients) {
    if (client.sessionId === sessionId && client.uid === uid) {
      send(client.controller, 'player-updated', data)
    }
  }
}

export function getConnectedUids(sessionId: string): string[] {
  return [...clients].filter((c) => c.sessionId === sessionId).map((c) => c.uid)
}
