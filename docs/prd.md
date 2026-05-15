# Product Requirements Document — MysteryWeaver

**Version:** 1.0  
**Status:** Implemented  
**Scenario:** Broken Kola Nut — A Umuofia Mystery

---

## Vision

MysteryWeaver is a JSON-driven engine and web platform for live-action, freeform tabletop mystery games. A writer fills out five JSON scenario files; the engine loads them and generates a fully playable real-time experience. No code required to create new games.

The first scenario, **Broken Kola Nut**, is set in pre-colonial Igbo society. Players investigate the murder of Ezeudu's son during the sacred Ozo ceremony, navigating secrets, debts, and the village's social hierarchy.

---

## User Personas

### Game Master (GM)
- Runs the session from a laptop or tablet
- Needs a GM dashboard to: advance phases, push clue cards to players, trigger NPC events, and observe the live roster
- Authenticates with email + password; has a persistent account
- Owns scenarios and creates sessions

### Player
- Joins from a mobile phone using a six-character room code
- No account or app install needed — browser only
- Needs a mobile-first interface showing their character profile, currency balance, received clues, and a notes area
- Identified by a UUID token stored in their browser; token is issued on join and lasts the session

---

## Core Features

### Session lifecycle

| Phase | Description |
|---|---|
| Lobby | Players join and claim characters. GM waits until all seats filled. |
| Introduction | GM narrates the scene. Yam transfers locked. |
| Investigation | Players trade yams, receive clue cards, interrogate NPCs. |
| Accusation | Players each submit a formal accusation with suspect, motive, and evidence. Yam transfers locked. |
| Debrief | GM reveals the solution. Session ends. |

Phases are defined in `manifest.json` — the engine reads them dynamically, so custom phase counts and names are fully supported.

### Room code join flow

1. Player navigates to `/join`
2. Enters a six-character room code
3. Sees available characters and their public bios
4. Picks a character and enters a display name
5. Submits — server issues a UUID player token, player is redirected to `/play/[sessionId]`

Character selection uses a server-side transaction to prevent two players from claiming the same character simultaneously.

### Player binder (four tabs)

| Tab | Content |
|---|---|
| Profile | Character name, title, bio, secret objectives, starting hidden knowledge, roleplay notes |
| Yams | Current currency balances; Transfer Yams drawer (send to another character) |
| Clues | Clue cards received from the GM, with new-clue badge count |
| Notes | Free-text scratchpad, local only |

### GM dashboard *(not yet built — V2)*

The backend supports all GM actions via API. The GM dashboard UI is planned for a future release. GMs currently interact via the API directly or a postman-equivalent tool.

### Currency economy

Scenarios define one or more currencies in `manifest.json`. Each currency is either tradeable (players can transfer it) or non-tradeable. Transfer validation is enforced server-side:

- Sender must have sufficient balance
- Receiving character must exist in the session
- Transfer must not happen during a yams-locked phase

### Clue distribution (GM only)

The GM pushes one or more clue asset IDs to one or more players in a single API call. Clues appear immediately in the player's Clues tab via SSE. The server logs every distribution.

### NPC events (GM only)

Scenarios define named NPC events in `gm_script.json`. Triggering an event:
- Unlocks conditional assets (makes them available to distribute)
- Optionally auto-distributes to all players (`autoDistribute: true`)
- Logs the event

### Accusation submission

During the accusation phase, any player can submit a formal accusation: suspect character ID, motive text, and one or more evidence asset IDs. The GM sees all accusations and resolves the outcome manually.

### Real-time updates

All game state changes are broadcast to connected players via Server-Sent Events. The client reconnects automatically if the connection drops. A 30-second ping keeps the connection alive through proxies.

---

## Scenario format

Scenarios are five JSON modules validated against Zod schemas on load:

| Module | Purpose |
|---|---|
| `manifest.json` | Global rules: phases, currencies, accusation mechanic |
| `characters.json` | Public profiles + private secrets per character |
| `assets.json` | Clue cards: evidence, omens, oracles, rumors, relationship cards |
| `gm_script.json` | GM timeline, NPC roster, NPC events |
| `relationships.json` | Character relationship graph + relationship cards |

See [docs/scenarios.md](scenarios.md) for the full authoring guide.

---

## Non-goals (V1)

- GUI scenario builder — scenarios are authored as JSON
- Multi-instance / horizontal scaling — SQLite is single-writer; one container is the design
- Email delivery (invites, password reset)
- S3/object storage for assets — all content in SQLite columns
- GM dashboard UI — API-only for now
- Push notifications
- End-game animated reveal screen
- Audio / soundboard
