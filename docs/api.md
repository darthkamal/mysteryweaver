# API Reference — MysteryWeaver

All endpoints return JSON. Errors follow the shape `{ "error": "message" }` with an appropriate HTTP status code.

---

## Authentication

### `POST /api/auth/login`

Authenticate as a GM. Sets an httpOnly cookie `mw-gm-token` (7-day JWT).

**Request body:**
```json
{ "email": "gm@example.com", "password": "secret" }
```

**Response `200`:**
```json
{ "ok": true }
```

**Errors:** `400` invalid body · `401` wrong credentials

---

### `POST /api/auth/logout`

Clear the GM session cookie.

**Response `200`:**
```json
{ "ok": true }
```

---

## Session utilities

### `GET /api/session/lookup?roomCode=ABCD12`

Find a session by room code. Called by the player join flow.

**Response `200`:**
```json
{
  "id": "session-uuid",
  "scenarioId": "scenario-uuid",
  "status": "lobby",
  "characterAssignments": { "okonkwo": "player-uid-1" }
}
```

**Errors:** `400` missing roomCode · `404` no session with that code · `409` session not in lobby (already started)

---

### `GET /api/scenario/[scenarioId]`

Fetch the public-facing scenario data (characters + assets). Does not expose `gmScript` or `manifest`.

**Response `200`:**
```json
{
  "characters": { "characters": [ ... ] },
  "assets": { "assets": [ ... ] }
}
```

**Errors:** `404` scenario not found

---

## Game actions

All game action endpoints require a valid player token as `Authorization: Bearer {token}` unless noted.

---

### `POST /api/game/join`

Join a game session. No auth token required — issues a new player token.

**Request body:**
```json
{
  "sessionId": "session-uuid",
  "characterId": "okonkwo",
  "displayName": "Tobi"
}
```

**Response `200`:**
```json
{ "joined": true, "playerToken": "player-uuid" }
```

The client must store `playerToken` in `localStorage` as `mw-player-token-${sessionId}`.

**Errors:** `400` invalid body · `404` session not found · `409` session not in lobby or character already taken · `422` character not in this scenario

---

### `POST /api/game/transfer`

Transfer a tradeable currency from the authenticated player to another character.

**Auth:** Player token required.

**Request body:**
```json
{
  "sessionId": "session-uuid",
  "toCharacterId": "nwakibie",
  "currencyType": "yams",
  "amount": 3
}
```

**Response `200`:**
```json
{ "transferred": true }
```

**Errors:** `400` invalid body or amount ≤ 0 · `401` bad token · `403` insufficient balance · `404` session or player not found · `409` currency is not tradeable · `422` session not active, phase locks yams, or target character not in session

---

### `POST /api/game/distribute-clue`

Push one or more clue asset IDs to one or more players. GM only.

**Auth:** GM cookie required.

**Request body:**
```json
{
  "sessionId": "session-uuid",
  "assetIds": ["evidence_1", "evidence_2"],
  "characterIds": ["okonkwo", "obierika"]
}
```

**Response `200`:**
```json
{ "distributed": true }
```

**Errors:** `400` invalid body · `401` not authenticated as GM · `403` not the session host · `404` session not found · `422` session not active

---

### `POST /api/game/advance-phase`

Move the session to the next phase in the manifest. GM only.

**Auth:** GM cookie required.

**Request body:**
```json
{ "sessionId": "session-uuid" }
```

**Response `200`:**
```json
{ "advanced": true, "phase": "investigation" }
```

**Errors:** `401` · `403` · `404` · `422` already on last phase or session ended

---

### `POST /api/game/trigger-npc-event`

Fire a named NPC event. Unlocks conditional assets. GM only.

**Auth:** GM cookie required.

**Request body:**
```json
{
  "sessionId": "session-uuid",
  "eventId": "ikemefuna_dies"
}
```

**Response `200`:**
```json
{ "triggered": true }
```

**Errors:** `401` · `403` · `404` session or event not found · `422` session not active

---

### `POST /api/game/submit-accusation`

Submit a formal accusation. Player only. Re-submitting replaces the previous accusation.

**Auth:** Player token required.

**Request body:**
```json
{
  "sessionId": "session-uuid",
  "suspectId": "amadi",
  "motive": "He owed the Ndichie a blood debt",
  "evidenceIds": ["evidence_1", "evidence_4"]
}
```

**Response `200`:**
```json
{ "submitted": true }
```

**Errors:** `400` · `401` · `404` · `422` session not in accusation phase, or `requiresEvidence` is true and no evidence IDs provided

---

## Server-Sent Events

### `GET /api/sse/[sessionId]?token={playerToken}`

Open an SSE stream for a session. Receives real-time updates whenever game state changes.

**Headers set on response:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Events emitted:**

| Event | When | Data shape |
|---|---|---|
| `session-updated` | On connect + after any GM action | `SessionData` (phase, assignments, unlocked assets) |
| `player-updated` | On connect + after any action affecting this player | Player record (currencies, clues, characterId) |
| `ping` (comment) | Every 30 seconds | `: ping` — no data, keeps connection alive |

**Errors:** `401` bad token · `400` session not found

**Client usage:**
```typescript
const es = new EventSource(`/api/sse/${sessionId}?token=${token}`)
es.addEventListener('session-updated', (e) => setSession(JSON.parse(e.data)))
es.addEventListener('player-updated', (e) => setPlayer(JSON.parse(e.data)))
```

The browser `EventSource` API reconnects automatically on network interruption.
