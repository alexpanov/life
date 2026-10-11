# v0.3 verification

52 Node checks passed, including outcome review, legacy learning migration, sidekick memory round trips, player-isolated persistence adapters, bounded prompt context, and reset without progress loss. Both main and starter builds passed their distributed-script checks.

No fresh browser or physical iPhone visual test was available for this update.

# v0.2 verification

45 Node checks cover engine behavior, realm migration and return, sparse suggestions, isolated starter storage, distributed script boot, mission-switch decisions, persisted outcome review, and bounded local learning. Build completed for both distributions.

No browser or physical iPhone verification was performed for this update because the supported browser QA capability was unavailable. The earlier browser checks below describe the previous build only.

# QA scope

## Historical checks (before v0.2) 

- 25 Node rule tests: seeded objectives, exact remaining loot, completion idempotency, undo, impossible closure, zero-XP rewards, daily practice caps, two-month level loss, grace periods, recovery mode, return practice, templates, save validation, import limits, data-only extensions, atomic patches, isolated players, and hooks.
- 15 inline Chromium interaction checks: desktop layout, completion and restored state, dialogs and editing, escaped user text, new players and dungeons, practice controls, recovery, simulator isolation, extension installation, reviewed ChatGPT patches, save download/import, simulated call flow, driving lock, mobile layouts, blocked storage, and corrupt-save preservation.
- Rendered desktop at 1440px and touch/mobile layout at 390px. No horizontal overflow was detected on any of the four main screens.

Reports and screenshots are in `qa/`. The game HTML is unmodified in the inline render test. Its test page supplies a Storage-compatible in-memory adapter; that adapter is NOT distributed with the application.

## Environment limitation

The installed Chromium rejected both localhost and file URL navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. No browser restrictions were changed. The alternate test path rendered the HTML directly instead of navigating to a blocked URL.

Accordingly, these are **not** verified by the completed test run:

- Opening the attachment on a physical iPhone or in Safari.
- Actual file URL execution in the installed browser.
- Real localStorage persistence across browser restarts.
- Service-worker offline navigation on a live host.
- A deployed URL or a native ChatGPT app.
- Audible text-to-speech output.

The full URL-based acceptance suite remains in `tests/ui_test.py` for a normal development machine. It is not counted as passed here.

## Runtime properties

No external library, font, account, token, API key, or build dependency is needed to run the app. Core state transitions and import validation are deterministic except for IDs, current timestamps, and randomized operator messages. Simulated calls are not actual calls. No medical or athletic assessment is inferred from skill scores.
