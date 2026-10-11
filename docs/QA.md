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
