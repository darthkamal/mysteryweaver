# Scenario Authoring Guide

Scenarios are five JSON files validated against Zod schemas on load. Each file is one module with a single responsibility. Together they define a fully playable mystery game.

Broken Kola Nut (in `scenarios/`) is the reference implementation.

---

## Module 1 — `manifest.json`

Global rules and configuration.

```jsonc
{
  "schemaVersion": "1.0",
  "name": "The Broken Kola Nut",
  "theme": "african-village",
  "seedColor": "#C2623A",
  "playerCount": { "min": 6, "max": 7 },
  "currencies": [
    {
      "id": "yams",
      "name": "Yams",
      "icon": "yam.png",
      "tradeable": true
    },
    {
      "id": "oracle_bones",
      "name": "Oracle Bones",
      "icon": "bone.png",
      "tradeable": false
    }
  ],
  "phases": [
    { "id": "lobby",         "name": "Lobby",          "yamsLocked": true },
    { "id": "introduction",  "name": "Introduction",   "yamsLocked": true },
    { "id": "investigation", "name": "Investigation",  "yamsLocked": false },
    { "id": "accusation",    "name": "The Accusation", "yamsLocked": true },
    { "id": "debrief",       "name": "Debrief",        "yamsLocked": true }
  ],
  "accusationMechanic": {
    "allowedPhase": "accusation",
    "whoCanAccuse": "any_player",
    "requiresEvidence": true,
    "resolution": "gm_manual"
  }
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | string | Schema version for future compatibility checks |
| `name` | string | Display name of the scenario |
| `seedColor` | string | Hex color — drives MUI M3 Dynamic Color |
| `playerCount.min/max` | number | Enforced on session create |
| `currencies[].id` | string | Unique ID referenced in character inventories and transfer calls |
| `currencies[].tradeable` | boolean | Whether players can transfer this currency |
| `phases[].id` | string | Phase ID used in `allowedPhase` and `gm_script` |
| `phases[].yamsLocked` | boolean | Whether yam transfers are blocked in this phase |
| `accusationMechanic.allowedPhase` | string | Must match a phase ID |
| `accusationMechanic.requiresEvidence` | boolean | If true, `submitAccusation` requires at least one `evidenceId` |

---

## Module 2 — `characters.json`

Public profiles and private secrets. The engine enforces asymmetric information — players only see their own private data.

```jsonc
{
  "characters": [
    {
      "id": "okonkwo",
      "variantFlag": { "includedIn": ["6-player", "7-player"] },
      "public": {
        "name": "Okonkwo",
        "title": "The Fearless Warrior",
        "avatarUrl": "okonkwo.png",
        "bio": "A man of titles and hard-won reputation who would sooner die than show weakness."
      },
      "private": {
        "secretObjectives": [
          "Maintain your reputation — let no one question your strength.",
          "Repay your debt to Nwakibie before the accusation phase.",
          "Shape Nwoye's future, even if it requires harshness."
        ],
        "startingInventory": { "yams": 5, "oracle_bones": 0 },
        "hiddenKnowledge": [
          "You owe Nwakibie a large debt of yams.",
          "You suspect someone is betraying Umuofia to Mbaino."
        ],
        "roleplayingNotes": "Speak with a firm, commanding voice. Be quick to anger when challenged."
      }
    }
  ]
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier — used in `characterAssignments`, `distributeClue`, `transfer` |
| `variantFlag.includedIn` | string[] | Which player-count variants include this character. Characters without this field are always included. |
| `public.*` | — | Visible to all players in the join flow |
| `private.startingInventory` | Record\<currencyId, number\> | Currency IDs must match `manifest.json` currencies |
| `private.secretObjectives` | string[] | Shown only to the player who claimed this character |
| `private.hiddenKnowledge` | string[] | Shown only to the player who claimed this character |

---

## Module 3 — `assets.json`

All clue cards the GM can distribute. Supports conditional assets that only become available after specific NPC events.

```jsonc
{
  "assets": [
    {
      "id": "evidence_1",
      "type": "evidence",
      "title": "The Thorn",
      "content": "A small, sharp thorn found near the body. It doesn't match any plants in the area.",
      "imageUrl": null,
      "visibility": "hidden",
      "triggerCondition": null
    },
    {
      "id": "evidence_4",
      "type": "evidence",
      "title": "The Ceremonial Knife",
      "content": "A ceremonial knife with a missing blade fragment, found near Ikemefuna's body.",
      "imageUrl": null,
      "visibility": "hidden",
      "triggerCondition": {
        "npcEvent": "ikemefuna_dies"
      }
    },
    {
      "id": "rel_card_1",
      "type": "relationship",
      "title": "Ojiugo's Visits",
      "content": "Ojiugo often seeks out Amadi for herbal remedies, even for minor ailments.",
      "imageUrl": null,
      "visibility": "hidden",
      "triggerCondition": null
    }
  ]
}
```

**Asset types:**

| Type | Description |
|---|---|
| `evidence` | Physical or testimonial clue |
| `omen` | Supernatural or contextual clue |
| `oracle` | A message from the Oracle |
| `rumor` | Unverified gossip circulating in the village |
| `relationship` | A relationship card revealing a connection |

**`triggerCondition.npcEvent`:** The asset is not available in the GM's distribution deck until the named NPC event is triggered. The event ID must match an entry in `gm_script.json → npcEvents[].id`.

---

## Module 4 — `gm_script.json`

The GM's complete run-of-show document: timeline, NPC roster, and NPC events.

```jsonc
{
  "timeline": [
    {
      "phaseId": "introduction",
      "entries": [
        {
          "time": "0:00",
          "label": "Introduction & Welcome",
          "type": "gm_monologue",
          "script": "Welcome, everyone, to Umuofia! Tonight, we step back in time...",
          "gmTip": "Speak slowly and evocatively. Make eye contact with each player."
        },
        {
          "time": "0:15",
          "label": "Ezeudu's Summons",
          "type": "npc_dialogue",
          "npcId": "ezeudu",
          "script": "Children of Umuofia, a great darkness has fallen upon our land...",
          "gmTip": "Play Ezeudu as frail but authoritative. Do not give direct clues."
        }
      ]
    }
  ],
  "npcRoster": [
    {
      "id": "ezeudu",
      "name": "Ezeudu",
      "description": "Frail, authoritative elder. Knows about the land dispute and the deaths.",
      "portraitUrl": null,
      "playingNotes": "Speak slowly, voice slightly trembling. Emphasise gravity."
    }
  ],
  "npcEvents": [
    {
      "id": "ikemefuna_dies",
      "label": "Ikemefuna Dies",
      "description": "GM triggers this when the narrative reaches Ikemefuna's death.",
      "unlocksAssets": ["evidence_4"],
      "autoDistribute": false
    }
  ]
}
```

**Timeline entry types:**

| Type | Fields |
|---|---|
| `gm_monologue` | `script`, `gmTip` |
| `npc_dialogue` | `npcId`, `script`, `gmTip` |
| `player_action` | `script`, `gmTip` |
| `scene_break` | `gmTip` |

**NPC events:**

| Field | Description |
|---|---|
| `id` | Unique event ID — referenced by `assets.json` trigger conditions and the `triggerNpcEvent` API call |
| `unlocksAssets` | Asset IDs that become distributable after this event fires |
| `autoDistribute` | If `true`, unlocked assets are automatically pushed to all players |

---

## Module 5 — `relationships.json`

The relationship graph. Powers the GM's relationship map view (V2) and provides the source of truth for relationship card assets.

```jsonc
{
  "edges": [
    { "from": "okonkwo",  "to": "nwakibie", "label": "Debt",           "public": false },
    { "from": "okonkwo",  "to": "obierika", "label": "Friend",         "public": true  },
    { "from": "amadi",    "to": "ojiugo",   "label": "Forbidden love", "public": false },
    { "from": "nwakibie", "to": "ojiugo",   "label": "Affair",         "public": false }
  ],
  "relationshipCards": [
    {
      "assetId": "rel_card_1",
      "content": "Ojiugo often seeks out Amadi for herbal remedies, even for minor ailments.",
      "revealsEdge": { "from": "ojiugo", "to": "amadi" }
    }
  ]
}
```

**Edge fields:**

| Field | Description |
|---|---|
| `from` / `to` | Character IDs — must match entries in `characters.json` |
| `label` | Short relationship description |
| `public` | Whether this edge is visible on the public relationship map |

**Relationship cards:** The `assetId` must match an asset in `assets.json` with `type: "relationship"`.

---

## Loading a scenario into the database

Scenarios are stored in the `scenarios` table. Currently this is done by inserting the JSON directly via the API or a custom seed script. A GM dashboard for scenario upload is planned for V2.

Each JSON module is serialised as a string in its respective column. The engine parses and Zod-validates each module on first access via `getScenario()`.

---

## Validation rules

All modules are validated with Zod at load time. Key cross-module rules:

- Currency IDs in `characters[].private.startingInventory` must appear in `manifest.currencies`
- NPC IDs in `gm_script.timeline[].npcId` must appear in `gm_script.npcRoster`
- `triggerCondition.npcEvent` values in `assets` must appear in `gm_script.npcEvents`
- `accusationMechanic.allowedPhase` must appear in `manifest.phases`
