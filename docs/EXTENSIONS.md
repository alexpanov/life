# Extension contract, version 1

## Data modules

The safe default is declarative JSON. In Workshop, choose Install JSON, paste or select a file, review, and apply.

```json
{
  "kind": "questos.extension",
  "version": 1,
  "id": "my-module",
  "name": "My module",
  "description": "What this adds to the game",
  "quests": [
    {
      "title": "Finish one real task",
      "detail": "Constraints and context",
      "nextMove": "One specific action",
      "category": "side",
      "xp": 60,
      "loot": "",
      "destination": ""
    }
  ],
  "skills": [{ "name": "Focus", "halfLifeDays": 21 }],
  "calls": [{ "caller": "OPERATOR", "text": "One task. One next move." }]
}
```

`id` must contain only lowercase letters, digits, and hyphens. An ID cannot be installed twice in one player profile. A module supports up to 50 quests, 10 skills, and 30 messages. The profile limits are checked before mutation.

The active dungeon receives module quests. New skills are added to the active player; a skill with an existing case-insensitive name is not duplicated. Operator scripts join the random transmission pool. A message does not create an objective by itself.

Text is displayed as text, never executed. Unknown executable fields are ignored. Installing a module does not make stock, place, legal, or health statements true. Review imported content.

## ChatGPT patches

```json
{
  "kind": "questos.patch",
  "version": 1,
  "operations": [
    {
      "type": "addQuest",
      "quest": {
        "title": "Verify the next destination",
        "nextMove": "Check the address and current hours.",
        "category": "side",
        "xp": 40
      }
    }
  ]
}
```

Supported operations:

| Type | Fields |
| --- | --- |
| `addQuest` | `quest` with the quest fields above |
| `createCampaign` | `name`, `subtitle` |
| `addSkill` | `name`, optional `halfLifeDays` |
| `setStatus` | `questId`, `status` (`pending`, `done`, `impossible`), optional `reason` |
| `installExtension` | `extension` with a valid module |

A patch is applied to a cloned player and committed only when every operation validates. The UI previews the changes before applying. Use exact quest IDs from the handoff for status changes. The UI flags status patches because they may change XP.

## Trusted developer hooks

The HTML exposes a deliberately small, read-oriented interface:

```js
const unsubscribe = window.QuestOS.on('quest:completed', ({ player, at }) => {
  console.log('New game snapshot', player, at);
});

const snapshot = window.QuestOS.getSnapshot();
const brief = window.QuestOS.getAgentBrief();

// Open the ordinary review dialog; this does not silently apply the patch.
window.QuestOS.previewJSON(JSON.stringify({
  kind: 'questos.patch',
  version: 1,
  operations: [{ type: 'addQuest', quest: { title: 'A new objective', xp: 50 } }]
}));

unsubscribe();
```

The current UI emits `state:changed`, `quest:completed`, and `skill:practiced`. The pure engine exports `EventBus` for broader integrations. Hook errors are isolated from the game.

For new executable modules, edit trusted source rather than allowing arbitrary imported scripts. Keep mutations in `engine.mjs`, add unit tests, and call `commit()` after UI actions so storage and hooks remain consistent.

## Next extension points

The following are design directions, not implemented integrations:

- Calendar-backed objectives, with explicit user permission and real event IDs.
- A location-verification adapter that records provider, source URL, and verification time.
- Cloud saves scoped to an authenticated account, with conflict detection.
- An authenticated MCP adapter that uses the same engine functions.
- Cooperative objectives with server-authoritative completion and reward rules.

Keep these separate from the core engine. Do not infer completed training, purchases, location, or legal permission from a generated narrative.
