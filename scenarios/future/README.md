# Future Scenarios

Draft scenarios that are **not yet active**. Each folder is a complete, schema-valid
scenario ready to be loaded into MysteryWeaver whenever you want to run it.

Each scenario folder contains the same five files the engine expects:

| File                  | Validated by                       | Purpose                                              |
| --------------------- | ---------------------------------- | ---------------------------------------------------- |
| `manifest.json`       | `lib/schemas/manifest.schema.ts`     | Name, theme, seed color, player count, currencies, phases, accusation rules |
| `characters.json`     | `lib/schemas/characters.schema.ts`   | Public profiles + private objectives / secrets / inventory |
| `relationships.json`  | `lib/schemas/relationships.schema.ts`| The relationship graph + reveal cards                |
| `gm_script.json`      | `lib/schemas/gm-script.schema.ts`    | Phase-by-phase GM timeline, NPC roster, triggerable events |
| `assets.json`         | `lib/schemas/assets.schema.ts`       | Evidence / omen / oracle / rumor / relationship cards |

## How to use one

These are designed to be uploaded through the **GM dashboard** (`/gm/scenarios`),
which validates all five files against the same Zod schemas as the live engine before
saving. To activate a scenario, either:

1. Upload the five JSON files via the GM dashboard, or
2. Move the scenario folder up into `scenarios/<slug>/` and seed it.

## Schema rules worth remembering when editing these

- `variantFlag.includedIn` only accepts `"6-player"` and `"7-player"` — so every
  scenario here is built for **6–7 players** (the 7th character is `7-player`-only).
- Every `*Url` field (`avatarUrl`, `imageUrl`, `portraitUrl`) must be a valid URL or `null`.
- `seedColor` must be a 6-digit hex string.
- `triggerCondition` is either `null` or `{ "npcEvent": "<id>" }`, and that id must
  exist in `gm_script.json`'s `npcEvents`.
- The phase lock field is named `yamsLocked` regardless of theme — it's the generic
  "currencies are locked this phase" flag.

## The scenarios

| Folder                  | Title                              | Setting                         | Players | The killer (spoiler) |
| ----------------------- | ---------------------------------- | ------------------------------- | ------- | -------------------- |
| `last-voyage-aurelia`   | The Last Voyage of the Aurelia     | 1928 transatlantic ocean liner  | 6–7     | Dr. Julian Pierce, the ship's surgeon |
| `blackout-helix-tower`  | Blackout at Helix Tower            | Near-future corporate arcology  | 6–7     | Dr. Aria Sol, the chief neuro-engineer |
| `carnival-of-masks`     | A Carnival of Masks                | 1600s Venice, during Carnival   | 6–7     | Vittore, the apothecary |
