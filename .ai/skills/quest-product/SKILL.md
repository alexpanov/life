---
name: quest-product
description: Preserve QuestOS gameplay and player experience when changing onboarding, realms, quests, Nico, messages or interface design. Use for product behavior and web or iPhone UI changes.
---

# Product invariants

Read `../../CONTRACT.md` relative to this file's directory. Trace the current player journey and save behavior before changing presentation.

- Make the next action clear: mood → an appropriate quest → one chosen priority → action → outcome → the next choice. Keep suggestions rare and dismissible. Use the empty-state invitation “Pray for a quest”.
- Keep realms persistent places the player can return to. Preserve their open quests and dungeon associations. Model discovery internally without exposing a tutorial about hidden exploration state.
- Keep completed and abandoned quest outcomes distinct. Let Nico learn useful, bounded context from both; feed it into later suggestions without asserting psychological diagnoses. Reset Nico's learning independently of player progress.
- Label who speaks. Give game/system, Nico and fictional dispatch distinct presentation. Use text labels plus icon and typography differences. Keep domain process names out of player copy.
- Preserve agency when switching priorities. Explain the proposed next step, permit declining it, and avoid nagging. Do not silently turn an optional side quest into the player's active mission.
- Use shared tokens, accessible controls, reduced-motion support and touch-friendly layouts. Keep motion brief and purposeful. Test interactive behavior through actual rendered components.
- Maintain a clear website entrance labeled “play live” with the original coin mark. Keep fresh-player defaults free of the creator's personal history. Preserve existing players' local saves.
- Keep native support iPhone-only. Treat App Store distribution, web distribution and opening a URL from ChatGPT as distinct capabilities. Never imply native ChatGPT integration merely because a link opens.

Validate the affected journey in JSDOM and the relevant pure transition tests. Use the single existing Playwright launch test for the website entrance; do not add browser cases for every UI change.
