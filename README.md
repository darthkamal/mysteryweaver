# MysteryWeaver

A JSON-driven engine for live-action tabletop mystery games. Write a scenario in five JSON files; the engine handles sessions, real-time state, currency economy, clue distribution, and accusation resolution — no code required to create new games.

**Broken Kola Nut** — a pre-colonial Igbo murder mystery — ships as the first scenario.

---

## What it does

- **GM dashboard** — run a session: advance phases, push clues to players, trigger NPC events, watch the live roster
- **Player binder** — mobile-first four-tab view: profile + secret objectives, yam economy, clue cards, notes
- **Room codes** — players join by entering a six-character code; no accounts needed
- **Real-time** — Server-Sent Events push state to all connected players instantly
- **Self-hosted** — single Docker container, SQLite database, no external services

---

## Quick start (local development)

**Requirements:** Node ≥ 22 (a `.nvmrc` is provided — run `nvm use`), pnpm ≥ 11

```bash
git clone https://github.com/darthkamal/mysteryweaver
cd mysteryweaver
pnpm install

# Copy and fill in env vars
cp .env.local.example .env.local
# Edit .env.local — set DATABASE_URL and JWT_SECRET (see docs/development.md)

# Generate and run migrations
pnpm drizzle-kit generate
pnpm dev
```

App is available at [http://localhost:3000](http://localhost:3000).

Create the first GM account:

```bash
pnpm seed-gm --email=gm@example.com --password=secret --name="Game Master"
```

---

## Deploy to Coolify

Point Coolify at this repo, set `JWT_SECRET`, deploy. Full guide: [docs/deployment.md](docs/deployment.md).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) |
| UI | MUI v6 — Material Design 3 Expressive, seed `#C2623A` |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| Auth | GM: JWT in httpOnly cookie · Player: UUID in localStorage |
| Real-time | Server-Sent Events |
| Validation | Zod 3 |
| State | Zustand |
| Tests | Vitest — 88 tests, in-memory SQLite |
| Container | Docker (multi-stage Alpine build) |

---

## Documentation

| Doc | Description |
|---|---|
| [docs/prd.md](docs/prd.md) | Product requirements — vision, personas, features |
| [docs/architecture.md](docs/architecture.md) | Technical design — stack, data model, auth, SSE |
| [docs/api.md](docs/api.md) | API reference — all routes, request/response shapes |
| [docs/scenarios.md](docs/scenarios.md) | Scenario authoring — the five JSON modules |
| [docs/development.md](docs/development.md) | Local development setup |
| [docs/deployment.md](docs/deployment.md) | Production deployment via Coolify |

---

## Repository layout

```
mysteryweaver/
├── app/
│   ├── api/                  # Next.js route handlers
│   │   ├── auth/             # GM login/logout
│   │   ├── game/             # Game action endpoints
│   │   ├── scenario/         # Scenario data fetch
│   │   ├── session/          # Room code lookup
│   │   └── sse/              # Server-Sent Events stream
│   ├── join/                 # Player join flow
│   └── play/[sessionId]/     # Player binder (4 tabs)
├── lib/
│   ├── db/                   # Drizzle schema, singleton, migrations
│   ├── game/                 # Pure game logic functions
│   ├── hooks/                # React hooks (SSE, token, scenario)
│   ├── schemas/              # Zod validators for 5 scenario modules
│   ├── sse/                  # SSE registry + broadcast helpers
│   ├── store/                # Zustand stores
│   └── api/                  # Auth helpers + response helpers
├── scripts/
│   └── seed-gm.ts            # Create a GM account
├── __tests__/                # Vitest tests (88 total)
├── Dockerfile
├── docker-compose.yml
└── docs/                     # Full documentation
```

---

## Running tests

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
pnpm typecheck     # TypeScript only
```

All API tests use an in-memory SQLite database — no external services or mocks required.
