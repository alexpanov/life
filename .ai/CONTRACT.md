# QuestOS enduring contract

This file records the user's durable requirements. It is portable plain text for Cursor, ChatGPT/Codex, Grok, and other agents. It does not grant tools, credentials, publication rights, or automatic skill discovery. Read the linked SKILL.md files directly when the host cannot discover them. Keep changes here deliberate and grounded in user direction.

## Stable core, replaceable interfaces

Build a real-world game around the player, realms, dungeons, quests, progress and a learning sidekick named Niko. Keep the domain independent of pages, React, navigation, storage vendors and model vendors. Use strongly typed TypeScript throughout app code, React interfaces, Effect for application effects, and small pure domain functions. Use the repository's own Option and Either types for explicit absence and recoverable results. Read through repositories; change state through routines. Keep clocks, IDs, randomness and external services injectable. Preserve save compatibility and player progress.

Use React Router and Tailwind on the web. Share rules and design tokens with the iPhone interface; use native React Native/Expo components. Support iPhone only on native platforms. Do not add Android or claim that web deployment publishes an App Store app. Treat UI compositions and pages as replaceable. Keep a coherent, accessible design system beneath them.

## Player experience

Make beginning obvious: ask how the player feels, help pick one quest, and offer “Pray for a quest” when none is available. Suggest quests very sparingly. Let players revisit realms and find their open quests. Track discovery internally without exposing “explored/unexplored territory” as explanatory mechanics.

Guide the player toward choosing one priority and acting. Run the choice loop when a quest arrives or an outcome creates a new decision; avoid forced interruptions for incidental edits. Learn after completed or abandoned quests through small, bounded after-action memories. Let players reset personalization without erasing progress. Keep observations tentative; do not present inferred character traits as fact. Keep OODA, AAR and prioritization machinery out of player-facing jargon.

Distinguish game messages from Niko with explicit sender labels, typography and icons; never rely on color alone. Give Niko a warm, concise personality. Keep spacecraft/military atmosphere fictional and useful. Borrow broad open-world mechanics without copying GTA characters, dialogue, artwork or branding.

## Honest, portable infrastructure

Use replaceable adapters for memory/local storage, Supabase and future models. Keep development and live separate. Stay within completely free infrastructure unless the user changes that constraint. Never ship server credentials in clients. Preserve ownership isolation and test it. Do not claim an LLM, cloud persistence, pipeline, website or native release works before checking it.

Retain versioned prompt snippets and bounded learning context behind a model boundary when implementing generation. Self-improvement means learning useful player preferences and adapting support, not autonomous source mutation or deployment.

Provide a shareable website with a prominent “play live” button, including lowercase “live”, and a small original Greek-inspired coin mark. Use GitHub source and Actions when available. Target at most 60 seconds from deployment trigger to verified live content. Measure the complete elapsed time, including queue and propagation; never promise a hosted runner guarantee or weaken checks to manufacture success.

## Verification and collaboration

Use pure unit tests, repository/routine integration tests, interactive React JSDOM tests, and exactly one Playwright test: website → “play live” → playable game. Test outcomes and important failures. Keep deterministic tests fast. Test real backend isolation when backend integration changes. Distinguish checks that ran from checks only configured.

Coordinate a legion with explicit file ownership and a single integration/release owner. Do not overwrite concurrent work or commit another agent's unfinished changes. Repository instructions are model-agnostic; adapters should point here rather than duplicate policy. Keep secrets, real saves and private player details out of source and prompts.
