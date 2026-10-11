---
name: quest-product
description: Preserve QuestOS gameplay and player experience when changing onboarding, realms, quests, Niko, messages or interface design. Use for product behavior and web or iPhone UI changes.
---

# Product invariants

Apply the enduring purpose first: help the hero live a good life, the life the Lord has for him. Reduce friction and pressure. Preserve personal discernment; Niko must never claim divine authority. Evaluate each mechanic by whether it serves the hero’s life, not simply engagement.

Read `../../CONTRACT.md` relative to this file's directory. Trace the current player journey and save behavior before changing presentation.

- Make the next action clear: mood → an appropriate quest → one chosen priority → action → outcome → the next choice. Keep suggestions rare and dismissible. Use the empty-state invitation “Pray for a quest”.
- Keep realms persistent places the player can return to. Preserve their open quests and dungeon associations. Model discovery internally without exposing a tutorial about hidden exploration state.
- Keep completed and abandoned quest outcomes distinct. Let Niko learn useful, bounded context from both; feed it into later suggestions without asserting psychological diagnoses. Reset Niko's learning independently of player progress.
- Label who speaks. Give game/system, Niko and fictional dispatch distinct presentation. Use text labels plus icon and typography differences. Keep domain process names out of player copy.
- Preserve agency when switching priorities. Explain the proposed next step, permit declining it, and avoid nagging. Do not silently turn an optional side quest into the player's active mission.
- Use shared tokens, accessible controls, reduced-motion support and touch-friendly layouts. Keep motion brief and purposeful. Test interactive behavior through actual rendered components.
- Maintain a clear website entrance labeled “play live” with the original coin mark. Keep fresh-player defaults free of the creator's personal history. Preserve existing players' local saves.
- Keep native support iPhone-only. Treat App Store distribution, web distribution and opening a URL from ChatGPT as distinct capabilities. Never imply native ChatGPT integration merely because a link opens.

Validate the affected journey in JSDOM and the relevant pure transition tests. Use the single existing Playwright launch test for the website entrance; do not add browser cases for every UI change.

Keep Niko's locked Delta Force pride, reluctant story canon, and delivery history consistent. Retire unwanted content through soft deletion, preserving nonrepetition records. Use the model routine schema as an adapter contract, never as permission for arbitrary commands. Keep fiction identifiable in Niko's profile/about context. Do not turn war stories into combat instruction or spontaneous hero task assignments.

Design for the target audience in the always-loaded contract: driven men and young fathers who already feel pressure to perform. Use plain military warmth, never shame. Separate Niko energy and Vanguard access from hero XP. Make invitations easy; never represent a copied link as a verified signup. Keep feedback and forgetting available even when conversation energy is exhausted.

Separate InteractionSurface (iPhone/web/Telegram/Instagram/WhatsApp), the in-game Port home, and commercial transaction channels. Surface hints inform Niko's relevant guidance but never grant account access or identity. Keep adapters on the periphery and preserve shared forms/routines. Support Android through web/Telegram without adding an Android native app. Reduce social-media cognitive load with sparse, voluntary actions, never claims that Niko can see unconnected feeds or contacts. Read docs/SURFACES.md before channel work.
