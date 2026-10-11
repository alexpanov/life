# Verification

The TypeScript migration replaces the retired JavaScript engine and fake-DOM test harness. New tests target public transitions, repository/routine behavior, and real React components in JSDOM.

- Unit: Option/Either algebra, transitions, determinism, immutable input, reward reversal, skill practice/decay, Niko memory and save migration.
- Integration: Effect routine failure channels, ordered writes, corrupt primary/backup recovery, storage failure, Supabase adapter ownership/conflict contracts.
- JSDOM: launch, mood selection, quest switching, interactive realm selection, dialogs and game/Niko separation.
- Playwright: exactly one website → play live → game smoke test. Configured for Actions; not executed in the current managed container because its supported browser capability is unavailable.
- Native: Expo Metro export verifies bundling. It does not replace iPhone device checks, signing or App Store review.

Database SQL isolation tests must be run against the development Supabase project after provisioning. Mocked adapter tests do not establish deployed RLS behavior. Offline worker behavior, speech, real iPhone interactions and live GitHub propagation remain separate verification surfaces.
