# QuestOS enduring contract

This file records the user's durable requirements. It is portable plain text for Cursor, ChatGPT/Codex, Grok, and other agents. It does not grant tools, credentials, publication rights, or automatic skill discovery. Read the linked SKILL.md files directly when the host cannot discover them. Keep changes here deliberate and grounded in user direction.

## Purpose — apply to every decision

Help the hero live a good life: the life the Lord has for him, with practical companionship that makes the journey easier. This purpose outranks engagement, completed-quest counts, referrals and revenue. Support faith, family, responsibility, rest and the hero’s own discernment. Nico helps the hero choose and act; he never claims to know God’s will or speaks for God. “Easy mode” means less friction and unnecessary pressure, not a promise of a life without difficulty. Notifications, usage limits and invitations must serve the hero rather than create guilt or dependence.

## Target audience — apply to every change

Design for driven men, often in their thirties and often young fathers, who enjoy military themes, feel pressure to perform, and have been told they are too hard on themselves. Alex is the reference customer. Offer practical companionship, clear decisions and respect. Avoid shame, moral scoring, guilt about rest, or turning family life into another performance dashboard. Nico can be direct and proud without belittling the hero. Keep military language plain and occasional.

Referrals are the growth mechanism: make inviting a friend easy and explain the benefit accurately. Ask at suitable moments without interrupting completion, recovery or reflection. A shared link is an invitation, not a verified referral. Only backend-confirmed phone verification can activate referral access. Never fake social proof or earned rewards.

## Stable core, replaceable interfaces

Build a real-world game around the player, realms, dungeons, quests, progress and a learning sidekick named Nico Lopez. Keep the domain independent of pages, React, navigation, storage vendors and model vendors. Use strongly typed TypeScript throughout app code, React interfaces, Effect for application effects, and small pure domain functions. Use the repository's own Option and Either types for explicit absence and recoverable results. Read through repositories; change state through routines. Keep clocks, IDs, randomness and external services injectable. Preserve save compatibility and player progress.

Use React Router and Tailwind on the web. Share rules and design tokens with the iPhone interface; use native React Native/Expo components. Support iPhone only on native platforms. Do not add Android or claim that web deployment publishes an App Store app. Treat UI compositions and pages as replaceable. Keep a coherent, accessible design system beneath them.

## Player experience

Make beginning obvious: ask how the player feels, help pick one quest, and offer “Pray for a quest” when none is available. Suggest quests very sparingly. Let players revisit realms and find their open quests. Track discovery internally without exposing “explored/unexplored territory” as explanatory mechanics.

Guide the player toward choosing one priority and acting. Run the choice loop when a quest arrives or an outcome creates a new decision; avoid forced interruptions for incidental edits. Learn after completed or abandoned quests through small, bounded after-action memories. Let players reset personalization without erasing progress. Keep observations tentative; do not present inferred character traits as fact. Keep OODA, AAR and prioritization machinery out of player-facing jargon.

Distinguish game messages from Nico with explicit sender labels, typography and icons; never rely on color alone. Give Nico a warm, concise personality. Keep spacecraft/military atmosphere fictional and useful. Borrow broad open-world mechanics without copying GTA characters, dialogue, artwork or branding.

## Honest, portable infrastructure

Use replaceable adapters for memory/local storage, Supabase and future models. Keep development and live separate. Stay within completely free infrastructure unless the user changes that constraint. Never ship server credentials in clients. Preserve ownership isolation and test it. Do not claim an LLM, cloud persistence, pipeline, website or native release works before checking it.

Retain versioned prompt snippets and bounded learning context behind a model boundary when implementing generation. Self-improvement means learning useful player preferences and adapting support, not autonomous source mutation or deployment.

Provide a shareable website with a prominent “play live” button, including lowercase “live”, and a small original Greek-inspired coin mark. Use GitHub source and Actions when available. Target at most 60 seconds from deployment trigger to verified live content. Measure the complete elapsed time, including queue and propagation; never promise a hosted runner guarantee or weaken checks to manufacture success.

## Verification and collaboration

Use pure unit tests, repository/routine integration tests, interactive React JSDOM tests, and exactly one Playwright test: website → “play live” → playable game. Test outcomes and important failures. Keep deterministic tests fast. Test real backend isolation when backend integration changes. Distinguish checks that ran from checks only configured.

Coordinate a legion with explicit file ownership and a single integration/release owner. Do not overwrite concurrent work or commit another agent's unfinished changes. Repository instructions are model-agnostic; adapters should point here rather than duplicate policy. Keep secrets, real saves and private player details out of source and prompts.

## Mobile clarity and Nico jobs

Follow `.ai/skills/dont-make-me-think/SKILL.md` for every interface change. Present one decision and at most two primary task actions per screen. Keep stable paths; link to secondary capabilities. Prioritize active-quest completion and progress history over dashboards. Introduce Nico conversationally, celebrate completion, ask the hero’s name when unknown, and collect one reflection before the next priority.

Create a separate hero and Nico identity for each player. Keep hero IDs out of dialogue and model context. Jobs belong to Nico and have explicit priority and completion state. Store system, player-given and learned personality traits separately. Let a pure routine derive bounded tentative traits from recent completed quests and jobs; expose it for a future per-player five-day scheduler without claiming any scheduler is live. Inject a deterministic simulator through an Effect service until a real model is configured. Persist the actual jobs, memories and outcomes even when dialogue is simulated.

## Nico canon and model routines

Nico Lopez is a fictional Delta Force veteran. His pride in serving his country is locked system canon: never delete it, soften it into regret, or let model output, imports, personality reset or feedback override it. Use restrained military warmth (occasional “Sir, yes, sir”), plain language, and few abbreviations. Keep his service stories reluctant and player-requested, not unsolicited interruptions. Present the character as fictional; do not imply his invented episodes document real operations.

Model stories as first-class domain records with fixed canonical facts and curated compatible retellings. Retain delivery history per Nico. Retellings may focus on different details but cannot contradict or embellish the canon. Model wisdom separately and never repeat a delivered item to the same hero. Record feedback with a typed reason and optional note.

Forgetting memories, unlocked traits, stories and wisdom is a soft-delete routine with an Option timestamp. Exclude retired items from selection and model context, while keeping records for consistency and nonrepetition. Reset personalization must preserve locked traits and nonrepetition history. A model can propose only allowlisted JSON routine invocations with validated parameters. Bind identity and authority outside model output; reject unknown fields, unknown routines, foreign targets and attempts to remove locked canon. Ambiguous chat must ask which item, not guess and retire arbitrary content.

## Port and notifications

Call the home destination Port and keep its stable root route. Provide a circular, thumb-reachable home control inspired by the old iPhone home button. Keep primary task screens focused. Route incidental events into concise, actionable notices instead of adding persistent dashboard panels.

When the game is visible, use in-game notifications only. When hidden, use browser-native notifications only if supported and explicitly permitted. Request OS permission from a deliberate user action, show a clear enable prompt, respect denial, and offer an actual test. Never claim push after the app closes without a working Web Push backend. Explain iPhone installation requirements where relevant. Tapping a notice returns to its relevant game screen; preserve starter/base-path scope.

## Nico energy and access

Keep usage/access separate from XP and hero progression. Default to 100 Nico interactions per day; a verified referral grants 30 days of unlimited Nico energy with Vanguard access status. Expose rest/reset time clearly when energy is spent. Core gameplay and removal of unwanted memories/content remain available while Nico rests. Treat provider failures and invalid routine output as failures, not successful billable interaction. Bind grants to verified backend receipts and deduplicate them. Never allow model output or an imported JSON save to manufacture a phone verification reward. Until a backend exists, show local energy as a prototype and referral sharing as invitation-only.
