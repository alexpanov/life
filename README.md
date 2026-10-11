# QUEST/OS

**Your world. Your quest.** A local-first, extensible real-world RPG with terminal colors and raised retro controls.

This is working application source and a self-contained browser build, not a wireframe. It is hosted as a private Site. No live model or native ChatGPT app is connected.

## Play

Play at https://questos.mangomint-5316.chatgpt.site/. The clean starter is at https://questos.mangomint-5316.chatgpt.site/starter/. Both run in a browser; file previews show a launch link. The private Site requires authorized ChatGPT access. Progress remains in each browser.

The alternative is a local server. Node.js 20 or later is required; no package installation or API key is needed:

```sh
npm run build
npm start
```

Open `http://127.0.0.1:4173` in your browser. The development server binds only to localhost by default.

The personal build starts with the October 10 San Bernardino handoff: all five shopping objectives complete following the player’s confirmation, two bonus inventory items, the closed Walmart search, and the remaining side quests. No store inventory, parking rule, church address, or flight time has been verified by the application.

## What works

- Quest completion, undo, editing, custom objectives, and impossible/no-penalty closure.
- Persistent realms → dungeons → quests, with Croatia as home and Dino as the current travel realm.
- Mood check-in, sparse optional leads, and a single active mission with explicit switch confirmation and outcome review.
- Bounded local preference learning from choices and results; no generative model or self-modifying code.
- Multiple reusable dungeons and independent local player profiles.
- Earned XP, permanent field rank, and inventory derived from confirmed completion.
- Practice logs, skill potential, inactivity-based readiness loss, current-level loss, and recovery mode.
- A 0-120 day skill-decay simulator that never changes your save.
- Manual operator transmissions and optional silent automatic calls while the game remains visible.
- Optional browser speech after explicitly answering a transmission.
- Driving mode that locks the board and stops calls.
- Local save and backup handling, full-save import/export, and corrupt-save recovery.
- Campaign templates, data-only extension packs, a developer event bus, and reviewed JSON patches.
- A manual ChatGPT handoff that includes only the active player's state.
- Responsive desktop and mobile layouts, a manifest, icons, and an offline-cache service worker for hosting.

The service worker and native speech features are implemented but were not end-to-end verified in a live hosted browser. See `docs/QA.md` for the exact test scope.

## Share with colleagues

The included `starter.html` is a clean standalone game for colleagues. To rebuild it without the personal San Bernardino seed:

```sh
npm run build:share
```

This produces a clean `dist/` with a new player and an empty everyday dungeon. Share its HTML file, or host the directory with a static-site provider. A `vercel.json` configuration is included; change its build command to `node build.mjs --share` before deploying the clean version through that configuration.

The public assets of the clean build omit the personal campaign. The full source archive still contains the original seed in `src/engine.mjs` for the owner; review the source before publishing a source repository.

The app is hosted as a private ChatGPT Site. No App Store submission is needed. Site access and game progress are separate: authorized visitors keep their own browser-local saves.

Every browser has independent progress. The game does **not** provide online multiplayer, shared cloud saves, or a leaderboard. Site access uses ChatGPT authentication. Local profiles are save slots, not private accounts. Someone with access to the browser can switch between them.

## Reuse a quest

In **Workshop > Reusable campaigns > Export template**, export the current dungeon. The template contains objective text, next moves, map-search text, and rewards. It excludes completion status, player names, practice history, and XP balances. Review the objective text before sharing.

A colleague imports that JSON through **Workshop > Save and restore > Import file**. All template objectives start pending. Impossible objectives are omitted from templates.

## ChatGPT workflow

In **Workshop > ChatGPT bridge**, select **Copy agent handoff**. Copy the text into a ChatGPT conversation and describe the desired change. Paste the returned JSON into **Import a reply**, review the proposed changes, and apply them.

This is an explicit copy/paste bridge. ChatGPT cannot silently read or change the game. A native ChatGPT app would require a separately connected hosting and MCP integration. See `docs/CHATGPT.md` for the handoff to that next stage.

## Progression rules

Field rank is a historical record:

```text
fieldRank = 1 + floor(sqrt(totalXP / 100))
```

Skill potential is earned through completed practice. A session awards 40 XP, at most once per local calendar day per skill:

```text
potential = min(99, 1 + floor(sqrt(skillXP / 40)))
```

Unpracticed skills have no level. Readiness starts at 75% for the first session. Later sessions add up to 25 percentage points, capped at 100%.

```text
elapsedDays = max(0, daysSinceAnchor - graceDays)
readiness = readinessAtAnchor * 2 ^ (-elapsedDays / halfLifeDays)
currentLevel = max(1, ceil(potential * readiness / 100))
```

Default grace: three days. Default half-lives: Strength 21 days, Taekwondo 30 days, Fieldcraft 45 days, custom skills 28 days. These are editable game parameters, not physiology, medical advice, or measurements of actual ability. Recovery mode freezes readiness. Completed quest records do not decay.

Readiness is recalculated from timestamps. No background task is needed to apply inactivity when the player returns.

## Extensions

Import a JSON module to add objectives, skills, and operator messages. Use `examples/morning-signal.extension.json` as the starting point. Imported files cannot execute JavaScript or HTML. Imports are validated before application; reviewed patches apply atomically.

For trusted source-code extensions, `window.QuestOS.on(event, callback)` provides read-only snapshots on `state:changed`, `quest:completed`, and `skill:practiced`. See `docs/EXTENSIONS.md`.

## Data and privacy

All game state is kept in browser storage when available. The UI warns when only session storage in memory is possible. Export a save before clearing browser data, moving devices, or using an untrusted preview.

Full-save exports include **every local player**. Campaign exports do not. Do not send a full save as a public template.

There is no analytics, location tracking, camera access, microphone capture, actual telephone calling, or AI network request. Clicking a map-search link intentionally opens an external map search. Browser speech availability and processing depend on the selected browser/OS voice; text-only mode is the default.

## Source layout

```text
src/engine.mjs       Pure game rules and import validation
src/app.mjs          Browser UI, local storage, and interaction handlers
src/styles.css      Responsive terminal/retro design
src/shell.html      Accessible app shell and modal
public/             Manifest, icons, and service worker
build.mjs           Self-contained HTML builder; --share strips personal seed
server.mjs          Dependency-free localhost development server
dist/               Built application, ready for static hosting
examples/           Importable campaign, extension, and patch examples
tests/              Rules and browser interaction tests
docs/               Extension, hosting/ChatGPT, and QA notes
vercel.json         Static deployment configuration (not deployed)
```

## Test

```sh
npm test
```

Optional full browser acceptance test, on a machine that permits localhost browser navigation:

```sh
python tests/ui_test.py --chromium /path/to/chromium
```

Python Playwright and a Chromium executable are required only for browser tests. They are not runtime dependencies of the game.

For an environment that blocks browser URL navigation, `tests/inline_ui_test.py` renders the unmodified HTML inline with an explicitly mocked Storage adapter. The report distinguishes this from live browser persistence and hosting tests.

## v0.2 architecture

`src/engine.mjs` owns save validation, world memory, rewards and realm transitions. `src/systems/prioritize.mjs` owns the human-controlled choose/execute/review cycle. `src/systems/learning.mjs` maintains bounded mood/category preferences and the latest 200 feedback events. Suggestions adapt through a score callback; world memory prevents repeated discovery leads, with a 48-hour global new-lead cooldown.

`src/ui/tokens.css`, `console.css`, and `motion.css` provide shared semantic tokens, spacecraft console components and reduced-motion-aware transitions. `src/ui/icons.mjs` provides dependency-free MIT-licensed SVG icons. Both personal and clean starter builds use these same modules, with isolated save keys and offline caches. Legacy v1 saves migrate without replacing unrelated progress.

## v0.3 / Niko

Niko is a first-class companion model at `player.sidekick`. It owns bounded preferences, outcome observations, and explicit player notes. Old `player.learning` saves migrate into it. `src/sidekick/model.mjs` contains pure domain rules, versioned prompt fragments, a structured future-model context, and local guidance. Completion, impossible closure, and setting an attempt aside each trigger an internal after-action review. Setting aside leaves the underlying quest open; it abandons the current attempt. Reviews retain the reported result, mood, realm, explicit obstacle (when supplied), and one adjustment. They do not infer personality or moral character from sparse observations.

The implicit observe/orient/decide/act cycle is implemented through mood and realm check-in → relevant preferences and outcome memory → one suggested action → explicit player selection and result → review. No loop labels appear in play. Ranking uses bounded category preferences; guidance shortens a repeated abandoned attempt or checks a previously blocked route. New evidence improves these limited local decisions, not the application code itself.

`src/sidekick/repository.mjs` defines the async `load(playerId)`, `save(playerId, model)`, and `remove(playerId)` persistence port. In-memory and game-document adapters implement the same contract. The app uses the document adapter for explicit memory management; ordinary domain updates are included in the existing game-save checkpoint. A database implementation can replace that persistence boundary. Browser game records remain local and are not remotely synchronized.

Prompt fragments are versioned code, while user-authored snippets and outcome observations are persisted player data. They are kept separate in `sidekickContext()` and included in the manual ChatGPT handoff. Free-form notes are retained verbatim; the local rules do not interpret them. A provider port exposes `respond(context)`; only a local implementation is included. Future LLM integration still needs a server provider, credential management, validation, and any desired prompt/response audit storage. No API call, model key, database, or automatic code update is present.

Reset from **Niko → Memory → Reset memory**. This clears the current companion's learned preferences, reviews, and notes; quests, inventory, XP and skills remain. Older exported saves and recovery backups can still contain older memory snapshots. Bounds: 100 reviews, 200 feedback events, 30 notes of 600 characters each.
