# Local Development

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| pnpm | ≥ 11 |

Install pnpm if needed:

```bash
corepack enable
corepack prepare pnpm@11.1.1 --activate
```

---

## Setup

```bash
git clone https://github.com/darthkamal/mysteryweaver
cd mysteryweaver
pnpm install
```

---

## Environment variables

Copy the example and fill in values:

```bash
cp .env.local.example .env.local
```

`.env.local`:

```env
# Path to the SQLite database file (created automatically on first run)
DATABASE_URL=file:./data/mysteryweaver.db

# Secret for signing GM JWT tokens — generate with: openssl rand -hex 32
JWT_SECRET=your-secret-here
```

`DATABASE_URL` defaults to `file:./data/mysteryweaver.db` if not set. `JWT_SECRET` must be set; GM login will fail without it.

---

## Database migrations

Generate the initial migration (only needed once, or after schema changes):

```bash
pnpm drizzle-kit generate
```

Migrations run automatically when the app starts — no manual `migrate` command needed in dev or production.

To inspect or manage the database interactively:

```bash
pnpm drizzle-kit studio
```

---

## Create a GM account

```bash
pnpm seed-gm --email=gm@example.com --password=secret --name="Game Master"
```

The `--name` flag is optional (defaults to "Game Master").

---

## Run the development server

```bash
pnpm dev
```

Starts Next.js on [http://localhost:3000](http://localhost:3000) with Turbopack. Hot reload is enabled.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build (Next.js standalone output) |
| `pnpm start` | Serve the production build locally |
| `pnpm test` | Run all 88 Vitest tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type check without emitting |
| `pnpm lint` | ESLint |
| `pnpm seed-gm` | Create a GM account (see above) |
| `pnpm drizzle-kit generate` | Generate SQL migrations from schema changes |
| `pnpm drizzle-kit studio` | Open Drizzle Studio (database browser) |

---

## Testing

Tests use Vitest with an in-memory SQLite database. No external services or environment variables are required to run tests.

```bash
pnpm test
```

Test coverage:
- `__tests__/schemas/` — 35 Zod schema validation tests
- `__tests__/api/` — 33 API / game logic tests (real in-memory SQLite)
- `__tests__/store/` — 14 Zustand store tests
- `__tests__/sse/` — 6 SSE registry tests

All 88 tests run in under 1 second.

---

## Project structure

```
app/
  api/auth/           GM login + logout
  api/game/           Game action endpoints (join, transfer, distribute-clue, etc.)
  api/scenario/       Scenario data fetch (characters + assets only)
  api/session/        Room code lookup
  api/sse/            Server-Sent Events stream
  join/               Player join flow (JoinFlow.tsx)
  play/[sessionId]/   Player binder (PlayerBinder.tsx + 4 tab components)

lib/
  db/                 Drizzle schema + singleton + migrations
  game/               Pure game logic functions (no HTTP, no SSE)
  hooks/              React hooks: useSession, usePlayerToken, useGameApi, useScenario
  schemas/            Zod validators for all 5 scenario JSON modules
  sse/                In-memory SSE registry + broadcastAll()
  store/              Zustand: session-store, player-store
  api/                Auth helpers (verifyGmToken, verifyPlayerToken) + respond helpers

scripts/
  seed-gm.ts          Creates a GM account via CLI

__tests__/
  api/                API + game logic tests
  schemas/            Zod schema tests
  store/              Store tests
  sse/                SSE registry tests
```

---

## Adding a scenario

Currently scenarios are inserted directly into the database. Until a GM dashboard is built, use a custom seed script or Drizzle Studio.

The five JSON modules must each pass Zod validation (see `lib/schemas/`). Each module is stored as a serialised JSON string in its column.

---

## Schema changes

1. Edit `lib/db/schema.ts`
2. Run `pnpm drizzle-kit generate` — this creates a new SQL file in `lib/db/migrations/`
3. Restart the dev server — migrations run automatically on startup
4. Commit both `schema.ts` and the new migration file
