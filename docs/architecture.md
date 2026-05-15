# Architecture — MysteryWeaver

**Stack:** Next.js 15 · SQLite (Drizzle ORM) · Server-Sent Events · JWT + UUID tokens · Docker

---

## Overview

MysteryWeaver is a single Next.js application. All backend logic runs inside Next.js API route handlers. There are no separate services, no message queues, and no external databases. The entire stack ships as one Docker container with a mounted SQLite volume.

```
Browser (player/GM)
      │  HTTP + SSE
      ▼
Next.js App (port 3000)
  ├── /app/api/**      API route handlers
  ├── /lib/game/**     Pure game logic (no I/O)
  ├── /lib/db/**       SQLite via Drizzle ORM
  └── /lib/sse/**      In-memory SSE registry
      │
      ▼
SQLite database  (/app/data/mysteryweaver.db)
```

---

## File structure

```
lib/
├── api/
│   ├── auth.ts          verifyGmToken(), verifyPlayerToken(), signGmToken()
│   └── respond.ts       ok() and err() response helpers
├── db/
│   ├── schema.ts        Drizzle table definitions (6 tables)
│   ├── index.ts         db singleton, auto-migrate on startup
│   └── migrations/      Generated SQL migration files
├── game/
│   ├── types.ts         GameError, SessionData, ScenarioData
│   ├── helpers.ts       getSession(), getScenario(), verifyHost(), etc.
│   ├── log.ts           writeLog()
│   ├── join.ts          joinGame()
│   ├── transfer.ts      transferCurrency()
│   ├── distribute-clue.ts  distributeClue()
│   ├── advance-phase.ts    advancePhase()
│   ├── trigger-npc-event.ts  triggerNpcEvent()
│   └── submit-accusation.ts  submitAccusation()
├── hooks/
│   ├── useSession.ts    SSE client — merges session + player events
│   ├── usePlayerToken.ts  reads localStorage token
│   ├── useGameApi.ts    fetch wrapper with Bearer token
│   └── useScenario.ts   fetches scenario data once
├── schemas/
│   ├── manifest.schema.ts
│   ├── characters.schema.ts
│   ├── assets.schema.ts
│   ├── gm-script.schema.ts
│   └── relationships.schema.ts
├── sse/
│   ├── registry.ts      in-memory Set<SseClient>, broadcast functions
│   └── broadcast.ts     broadcastAll(sessionId) — reads DB, fans out
└── store/
    ├── session-store.ts  Zustand — phase, assignments, unlocked assets
    └── player-store.ts   Zustand — currencies, clues, characterId
```

---

## Database schema

Six tables in SQLite. JSON columns store structured data as serialised strings, parsed on read by `getSession()` and `getScenario()`.

### `gms`
```
id            text  PRIMARY KEY  (UUID)
email         text  UNIQUE NOT NULL
passwordHash  text  NOT NULL     (bcrypt, 12 rounds)
displayName   text  NOT NULL
createdAt     integer NOT NULL   (unix ms)
```

### `scenarios`
```
id            text  PRIMARY KEY
ownerId       text  NOT NULL  → gms.id
name          text  NOT NULL
schemaVersion text  NOT NULL
manifest      text  NOT NULL  (JSON)
characters    text  NOT NULL  (JSON)
assets        text  NOT NULL  (JSON)
gmScript      text  NOT NULL  (JSON)
relationships text  NOT NULL  (JSON)
createdAt     integer NOT NULL
```

### `sessions`
```
id                   text  PRIMARY KEY  (UUID)
roomCode             text  UNIQUE NOT NULL  (6-char alphanumeric)
hostId               text  NOT NULL  → gms.id
scenarioId           text  NOT NULL  → scenarios.id
phase                text  NOT NULL
phaseIndex           integer NOT NULL
status               text  NOT NULL  ('lobby'|'active'|'ended')
characterAssignments text  NOT NULL  (JSON: { characterId: playerUid })
unlockedAssets       text  NOT NULL  (JSON array of asset IDs)
createdAt            integer NOT NULL
```

### `players`
```
sessionId   text     NOT NULL  → sessions.id   ┐ composite PK
uid         text     NOT NULL  (UUID token)     ┘
characterId text     NOT NULL
displayName text     NOT NULL
currencies  text     NOT NULL  (JSON: { yams: number, oracle_bones: number })
clues       text     NOT NULL  (JSON array of asset IDs)
isOnline    integer  NOT NULL  DEFAULT 0
joinedAt    integer  NOT NULL
```

### `accusations`
```
sessionId   text     NOT NULL  → sessions.id   ┐ composite PK
accuserId   text     NOT NULL  (player uid)     ┘
suspectId   text     NOT NULL
motive      text     NOT NULL
evidenceIds text     NOT NULL  (JSON array)
submittedAt integer  NOT NULL
```

### `logs`
```
id        integer  PRIMARY KEY AUTOINCREMENT
sessionId text     NOT NULL  → sessions.id
type      text     NOT NULL  ('join'|'transaction'|'clue_given'|'phase_change'|'npc_event'|'accusation')
message   text     NOT NULL
actorId   text     NOT NULL
timestamp integer  NOT NULL  (unix ms)
```

---

## Authentication

### GM authentication

GMs log in with email + password. The server verifies the bcrypt hash, issues a signed JWT (HS256, 7-day expiry), and sets it as an httpOnly cookie `mw-gm-token`.

```
POST /api/auth/login  { email, password }
  → sets cookie mw-gm-token (httpOnly, 7d)

POST /api/auth/logout
  → clears cookie
```

All GM-only API routes call `verifyGmToken(req)` which reads the cookie and verifies the JWT with `jose`. Returns `{ gmId, email }` or throws `GameError(401)`.

GM accounts are created with the seed script — there is no self-registration UI:

```bash
pnpm seed-gm --email=gm@example.com --password=secret
```

### Player authentication

Players have no accounts. On join, the server generates a UUID and stores it as the player's `uid` in the `players` table. The UUID is returned in the join response and stored in `localStorage` as `mw-player-token-${sessionId}`.

Every subsequent player request sends `Authorization: Bearer {token}`. The server calls `verifyPlayerToken(req, sessionId)` which looks up `(sessionId, token)` in the `players` table and returns the `uid`.

There is no async auth loading state — the token is read from `localStorage` synchronously on component mount.

---

## Real-time: Server-Sent Events

### Registry (`lib/sse/registry.ts`)

An in-memory `Set<SseClient>` at module level. Each client record holds:

```typescript
interface SseClient {
  sessionId: string
  uid: string
  controller: ReadableStreamDefaultController<Uint8Array>
}
```

The registry exposes:
- `addClient(client)` / `removeClient(client)`
- `broadcastSession(sessionId, data)` — sends `event: session-updated` to all clients for that session
- `broadcastPlayer(sessionId, uid, data)` — sends `event: player-updated` to the specific client
- `getConnectedUids(sessionId)` — returns list of online UIDs

### SSE endpoint (`GET /api/sse/[sessionId]?token=...`)

1. Verifies the player token against the `players` table
2. Opens a `ReadableStream` and registers the client
3. Immediately sends current session state and player state
4. Sends `: ping` every 30 seconds to keep the connection alive through proxies
5. On client disconnect, removes from registry

### Broadcast pattern

Every game route handler calls `broadcastAll(sessionId)` after the mutation succeeds. `broadcastAll` re-reads session + all players from the DB, then calls `broadcastSession` and `broadcastPlayer` for each connected client.

The game functions themselves do not broadcast — that stays in the route handler, keeping game logic pure.

### Client hook

`useSession(sessionId, uid)` opens one `EventSource` per session and handles both `session-updated` and `player-updated` events, merging both into the Zustand stores.

---

## Game logic layer

All game functions in `lib/game/` are pure in the sense that they take `(db, uid, data)` and perform synchronous Drizzle queries with no side effects beyond the database. They do not broadcast or send HTTP responses.

`better-sqlite3` is a synchronous SQLite driver — all Drizzle calls return values directly with no `await`.

Each function:
1. Reads required state (session, scenario, player)
2. Validates business rules (phase checks, balance checks, host checks)
3. Writes mutations
4. Calls `writeLog()`

`GameError` carries an HTTP status code and is caught by the route handler's `err()` helper, which sends the appropriate JSON error response.

---

## Request lifecycle

```
POST /api/game/transfer
  ↓
verifyPlayerToken(req, sessionId)   → uid or 401
  ↓
TransferSchema.parse(body)          → typed data or 400
  ↓
transferCurrency(db, uid, data)     → void or GameError
  ↓
broadcastAll(sessionId)             → fans out to SSE clients
  ↓
return ok({ transferred: true })
```

---

## Zod validation

All five scenario JSON modules are validated against Zod schemas in `lib/schemas/`. The schemas enforce required fields, array shapes, and cross-field constraints (e.g. currency IDs in character inventories must match currencies declared in the manifest).

---

## Migrations

Drizzle migrations are generated with `pnpm drizzle-kit generate` and stored as SQL files in `lib/db/migrations/`. The db singleton in `lib/db/index.ts` runs `migrate()` automatically at startup before the first query — no manual migration step on redeploy.

---

## Docker architecture

Three-stage build:

| Stage | Base | Purpose |
|---|---|---|
| deps | node:22-alpine | `pnpm install --frozen-lockfile` (all deps including devDeps for tsx) |
| builder | node:22-alpine | `pnpm build` → Next.js standalone output |
| runner | node:22-alpine | Standalone server + full node_modules + migrations + seed script |

The runner runs as a non-root `nextjs` user (uid 1001). SQLite data is persisted at `/app/data` via a named Docker volume declared with `VOLUME ["/app/data"]`.

The full `node_modules` (from deps stage) is copied to the runner so that `tsx` (a devDependency) is available to run the seed script after deployment.
