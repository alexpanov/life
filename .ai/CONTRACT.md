# QuestOS enduring contract

This file records the user's durable requirements. It is portable plain text for Cursor, ChatGPT/Codex, Grok, and other agents. It does not grant tools, credentials, publication rights, or automatic skill discovery. Read the linked SKILL.md files directly when the host cannot discover them. Keep changes here deliberate and grounded in user direction.

## Purpose — apply to every decision

Help the hero live a good life: the life the Lord has for him, with practical companionship that makes the journey easier. This purpose outranks engagement, completed-quest counts, referrals and revenue. Support faith, family, responsibility, rest and the hero’s own discernment. Niko helps the hero choose and act; he never claims to know God’s will or speaks for God. “Easy mode” means less friction and unnecessary pressure, not a promise of a life without difficulty. Notifications, usage limits and invitations must serve the hero rather than create guilt or dependence.

## Target audience — apply to every change

Design for driven men, often in their thirties and often young fathers, who enjoy military themes, feel pressure to perform, and have been told they are too hard on themselves. Alex is the reference customer. Offer practical companionship, clear decisions and respect. Avoid shame, moral scoring, guilt about rest, or turning family life into another performance dashboard. Niko can be direct and proud without belittling the hero. Keep military language plain and occasional.

Referrals are the growth mechanism: make inviting a friend easy and explain the benefit accurately. Ask at suitable moments without interrupting completion, recovery or reflection. A shared link is an invitation, not a verified referral. Only backend-confirmed phone verification can activate referral access. Never fake social proof or earned rewards.

## Stable core, replaceable interfaces

Build a real-world game around the player, realms, dungeons, quests, progress and a learning sidekick named Niko Gonzalez. Keep the domain independent of pages, React, navigation, storage vendors and model vendors. Use strongly typed TypeScript throughout app code, React interfaces, Effect for application effects, and small pure domain functions. Use the repository's own Option and Either types for explicit absence and recoverable results. Read through repositories; change state through routines. Keep clocks, IDs, randomness and external services injectable. Preserve save compatibility and player progress.

Use React Router and Tailwind on the web. Share rules and design tokens with the iPhone interface; use native React Native/Expo components. Set player-facing type through the typography module: Libre Baskerville for reading, Libre Bodoni for headers, and IBM Plex Sans for controls. A page has one optional header one. The subject is header one, header two, or header three. Cards use header four and header five. Support iPhone only on native platforms. Do not add Android or claim that web deployment publishes an App Store app. Treat UI compositions and pages as replaceable. Keep a coherent, accessible design system beneath them.

## Player experience

Make beginning obvious: ask how the player feels, help pick one quest, and offer “Pray for a quest” when none is available. Suggest quests very sparingly. Let players revisit realms and find their open quests. Track discovery internally without exposing “explored/unexplored territory” as explanatory mechanics.

Guide the player toward choosing one priority and acting. Run the choice loop when a quest arrives or an outcome creates a new decision; avoid forced interruptions for incidental edits. Learn after completed or abandoned quests through small, bounded after-action memories. Let players reset personalization without erasing progress. Keep observations tentative; do not present inferred character traits as fact. Keep OODA, AAR and prioritization machinery out of player-facing jargon.

Distinguish game messages from Niko with explicit sender labels, typography and icons; never rely on color alone. Give Niko a warm, concise personality. Keep spacecraft/military atmosphere fictional and useful. Borrow broad open-world mechanics without copying GTA characters, dialogue, artwork or branding.

## Honest, portable infrastructure

Use replaceable adapters for memory/local storage, Supabase and future models. Keep development and live separate. Stay within completely free infrastructure unless the user changes that constraint. Never ship server credentials in clients. Preserve ownership isolation and test it. Do not claim an LLM, cloud persistence, pipeline, website or native release works before checking it.

Retain versioned prompt snippets and bounded learning context behind a model boundary when implementing generation. Self-improvement means learning useful player preferences and adapting support, not autonomous source mutation or deployment.

Provide a shareable website with a prominent “play live” button, including lowercase “live”, and a small original Greek-inspired coin mark. Use GitHub source and Actions when available. Target about 60 seconds from deployment trigger to verified live content, including checks, one or two smoke tests, and the development then live database deploy. Measure the complete elapsed time, including queue and propagation; never promise a hosted runner guarantee or weaken checks to manufacture success.

## Verification and collaboration

Use pure unit tests, repository/routine integration tests, interactive React JSDOM tests, and one or two Playwright smoke tests. The required smoke test is website → “play live” → playable game. Test outcomes and important failures. Keep deterministic tests fast. Test real backend isolation when backend integration changes. Distinguish checks that ran from checks only configured.

Coordinate a legion with explicit file ownership and a single integration/release owner. Do not overwrite concurrent work or commit another agent's unfinished changes. The primary checkout stays on the main line. Put every other git worktree in a sibling directory named `worktrees`, each one named `<checkout>-<relevant-part>`. The same layout applies to every repository. Move a worktree that sits outside that directory into it, and do not discard its uncommitted work. After the pull request for a worktree merges, follow `.ai/skills/quest-remove-worktree/SKILL.md`. Open a pull request from a worktree, not from the primary checkout. Run the release check in that worktree before pushing. Squash-merge the pull request once the check passes. Repository instructions are model-agnostic; adapters should point here rather than duplicate policy. Keep secrets, real saves and private player details out of source and prompts.

## Mobile clarity and Niko jobs

Follow `.ai/skills/dont-make-me-think/SKILL.md` for every interface change. Present one decision and at most two primary task actions per screen. Keep stable paths; link to secondary capabilities. Prioritize active-quest completion and progress history over dashboards. Introduce Niko conversationally, celebrate completion, ask the hero’s name when unknown, and collect one reflection before the next priority.

Create a separate hero and Niko identity for each player. Keep hero IDs out of dialogue and model context. Jobs belong to Niko and have explicit priority and completion state. Store system, player-given and learned personality traits separately. Let a pure routine derive bounded tentative traits from recent completed quests and jobs; expose it for a future per-player five-day scheduler without claiming any scheduler is live. Inject a deterministic simulator through an Effect service until a real model is configured. Persist the actual jobs, memories and outcomes even when dialogue is simulated.

## Niko canon and model routines

Niko Gonzalez is a fictional Delta Force veteran. He introduces himself as Niko. He is very apprehensive about disclosing his last name and does not say it. His pride in serving his country is locked system canon: never delete it, soften it into regret, or let model output, imports, personality reset or feedback override it. Use restrained military warmth (occasional “Sir, yes, sir”), plain language, and few abbreviations. Keep his service stories reluctant and player-requested, not unsolicited interruptions. Present the character as fictional; do not imply his invented episodes document real operations.

Model stories as first-class domain records with fixed canonical facts and curated compatible retellings. Retain delivery history per Niko. Retellings may focus on different details but cannot contradict or embellish the canon. Model wisdom separately and never repeat a delivered item to the same hero. Record feedback with a typed reason and optional note.

Forgetting memories, unlocked traits, stories and wisdom is a soft-delete routine with an Option timestamp. Exclude retired items from selection and model context, while keeping records for consistency and nonrepetition. Reset personalization must preserve locked traits and nonrepetition history. A model can propose only allowlisted JSON routine invocations with validated parameters. Bind identity and authority outside model output; reject unknown fields, unknown routines, foreign targets and attempts to remove locked canon. Ambiguous chat must ask which item, not guess and retire arbitrary content.

## Home

Call the home destination Home and keep its stable root route. Home lists the hero's open quests. When none are open, Niko asks what they are up to. That answer becomes a quest, and the quest cannot start until the hero picks a realm. Put Home in the bottom navigation. Do not label Home as Port, and do not use a circular home button. Do not route to an Explore menu, a Niko lore page, inventory, settings and saves, notifications, invite, power-ups, or driving mode.

Keep primary task screens focused. Do not add a stay-in-touch block or an enable-notifications prompt.

## Niko energy and access

Keep usage/access separate from XP and hero progression. Default to 100 Niko interactions per day; a verified referral grants 30 days of unlimited Niko energy with Vanguard access status. Expose rest/reset time clearly when energy is spent. Core gameplay and removal of unwanted memories/content remain available while Niko rests. Treat provider failures and invalid routine output as failures, not successful billable interaction. Bind grants to verified backend receipts and deduplicate them. Never allow model output or an imported JSON save to manufacture a phone verification reward. Until a backend exists, show local energy as a prototype and referral sharing as invitation-only.

## Evidence, forms and model readiness

Err toward retaining useful history rather than silently discarding it. Preserve original model prompts and outputs separately from prepared snippets, including source and prompt version. Archive retention is not prompt context: select only relevant active information for future model calls. Soft deletion preserves evidence but removes it from active recall. Report storage failures; never silently evict history to make a write succeed. Local storage is currently a prototype, not unlimited storage or a cross-device database.

Expose user-facing routines through strict, versioned JSON request/result contracts. Central application state remains the source of truth; UI components submit intent and subscribe to results. Internal snippet preparation, thinking, provider credentials, usage accounting and verified referral grants do not belong in the public routine catalog. Future network hosts must authenticate ownership independently of request fields. Local idempotency is not a durable server guarantee.

Forms are first-class, versioned domain definitions with typed input validation. React Hook Form is a replaceable web adapter; do not import React or React Hook Form into the core. Model domain questions and values, not component layout, in the form contract.

Keep the mind provider-neutral. The internal thinkThought routine accepts a readonly environment containing readonly Person[]; Hero is structurally a Person. It produces a concise assessment and next action. A real-model connection is now requested; keep the curated simulator available until a secure provider credential and authenticated server configuration are verified. Support Anthropic-compatible and OpenAI-compatible providers through adapters without claiming endpoint compatibility or Claude Code integration has been tested. Store actual provider/model provenance when a live adapter is configured. Never present generated assessments as divine authority or private model reasoning.

## Power-ups, active insights and offline use

Keep Niko Gonzalez as the companion’s canonical name while preserving saved identities and stable API names. Power-ups are temporary, optional context and instructions, separate from Nico personality canon and entitlements. Give each Niko three single-use defaults and let the hero create a custom power-up. Consume only after successful output; failures, cancellation and expiration do not burn a charge. Keep templates portable for later sharing. Do not add sales prompts or paid packs now. Follow the monetization and realtime UX skills.

Run insights over the last 24 hours and latest five chats quietly while active. Keep per-hero evidence and deduplication, no auto-navigation, and no claim of a server schedule. Offline quests and saved progress remain usable after the app has first been cached; Niko rests, conversation drafts remain, and reconnect does not silently resend.

Use dotenvx for encrypted development/live environment files. Commit only ciphertext and public encryption keys; never private keys, plaintext credentials, or client-bundled secrets. The passphrase shared in chat is not a production credential.

## Surfaces and distribution

Use InteractionSurface for the window through which Niko sees the hero (iPhone, web, Telegram, Instagram, WhatsApp). Keep it distinct from Home (game home) and transaction channel (commercial access). Primary native surface is iPhone; secondary planned distribution is Telegram. Android users can play through web/Telegram. Surface-specific guidance should reduce cognitive load and unnecessary social use. It is a context hint, never proof of identity, permission or access to private social data. Bot registration, authenticated cross-device persistence and social messaging require their own verified adapters.
