# Verification

The TypeScript migration replaces the retired JavaScript engine and fake-DOM test harness. New tests target public transitions, repository/routine behavior, and real React components in JSDOM.

- Unit: Option/Either algebra, transitions, determinism, immutable input, reward reversal, skill practice/decay, Niko memory and save migration.
- Integration: Effect routine failure channels, ordered writes, corrupt primary/backup recovery, storage failure, Supabase adapter ownership/conflict contracts.
- JSDOM: launch, mood selection, quest switching, interactive realm selection, dialogs and game/Niko separation.
- Playwright: exactly one website → play live → game smoke test. Configured for Actions; not executed in the current managed container because its supported browser capability is unavailable.
- Native: Expo Metro export verifies bundling. It does not replace iPhone device checks, signing or App Store review.

Database SQL isolation tests must be run against the development Supabase project after provisioning. Mocked adapter tests do not establish deployed RLS behavior. Offline worker behavior, speech, real iPhone interactions and live GitHub propagation remain separate verification surfaces.

## Nico mobile update

76 unit, integration and React JSDOM checks passed, including persisted jobs/name/traits/history, save migration, provider failure and the completion conversation. Typecheck, ESLint and production web build passed; local combined gate took 4.46 seconds. Shared-core iPhone export passed (924 modules). Browser visual QA and the single Playwright test remain unexecuted in this managed environment. Supabase projects still return an empty list; no live database test or scheduler ran.

## Stories, Port and energy update

128 unit, integration and React JSDOM tests passed across 17 files. Typecheck, ESLint and production web build passed; the combined local gate took 5.95 seconds. Checks cover locked canon, story history, wisdom nonrepetition, soft deletion, model routine validation, energy reservations, verified-referral boundaries, stable migrated invitation codes, notification routing and mocked Realtime transport. A reload regression caught unnecessary backup rotation caused by JSON property ordering; comparison now ignores property order while persisting actual migrations.

Expo iOS export passed (928 modules); browser/device delivery remains unverified. No Supabase project, real model endpoint, phone verification or closed-app push service is connected. These checks do not establish live database security or referral enforcement. The single Playwright launch test remains unexecuted because the supported browser capability is unavailable.

## Handoff release

193 tests passed across 33 files: pure domain, Effect/repository integration, provider/gateway transport and React JSDOM. TypeScript, ESLint, production Vite/Worker build and encrypted-environment guard passed; combined local gate 9.46 seconds. Dotenvx round trips, missing-key rejection and source guards passed. Direct execution of the built Worker served main, starter and Telegram entries and reported unconfigured model status. No real model call ran. Browser visual QA, the single Playwright test, physical iPhone behavior and registered Telegram Mini App launch remain unverified.

The final iPhone export also passed (934 modules). Native signing and App Store publication remain separate.
