---
name: quest-release
description: Test, measure and release QuestOS. Use for GitHub Actions, the one-minute deploy budget, development and live Supabase projects, smoke tests, builds and deployment changes.
---

# Tests and release

Read `../../CONTRACT.md` relative to this file's directory. Inspect current package scripts, workflow files, hosting configuration and credentials availability. Do not infer that a configured provider is deployed.

## Verification layers

| Layer | Verify |
| --- | --- |
| Unit | Pure function behavior, Option/Either composition, transition invariants and deterministic edge cases. |
| Integration | Effect routine/repository contracts, serialization, corruption recovery, ordering and failure propagation. Test real development database ownership isolation for backend changes. |
| JSDOM | Render React, interact with controls and observe meaningful state or text changes; do not replace the component with a hand-written fake. |
| Playwright | Run one or two smoke tests. The required test opens the share website, clicks “play live”, and confirms the game is usable. Do not add a third. |

The test file sits next to the code it tests. `model-gateway.test.ts` sits beside `model-gateway.ts`. Do not put a test under a distant `tests/` tree.

Read scripts before running them. Run lint, typecheck, affected tests and production build; run the full required release gates before publishing. When native code changes, verify the iOS bundle. Report unavailable checks without inventing pass counts. Never substitute a mocked backend result for a real integration pass.

## Fast deployment

The whole release, from workflow creation through checks, one or two smoke tests, the development database deploy, the live database deploy, and verified live content, must take about one minute. Measure that full path, including queue time and propagation. A run past one minute missed the budget even when the deploy itself succeeded. Record trigger, runner start, build and test completion, each database deploy, and the first verified live revision. Report cold and warm-cache runs separately. Do not drop row policies, migrations, or smoke tests to buy time.

Use pinned dependencies and reproducible installs, dependency caches keyed by lockfile and runtime, independent checks in parallel where safe, minimal artifacts and cancellation of obsolete runs. Verify the exact tested revision is deployed. Do not skip safety gates, RLS checks or tests to force the timer under budget. When the live page matches the commit, verification succeeds and still prints how long it took. Missing the minute does not fail the deploy.

Keep two free Supabase projects: development and live. Do not create a paid project or a paid preview branch. On the main branch, after the smoke tests pass, apply the checked-in migrations to development and then to live. If those secrets are not set, skip the database. Still publish the website. Those migrations hold the save table, the `save_game` database function, owner policies, and the Realtime publication. This application has no Edge Function; do not invent one. Store the account access token, each project reference, and each database password in GitHub Actions secrets. A publishable client key may be configured later for the browser. A service-role key never enters a client or the repository. Apply the same migration to both projects. Verify owner isolation on the development database before calling the live database ready. Inspect real provider capabilities before choosing a static host; a database project does not host this website.

Publish through the configured authorized workflow, observe its result, and verify the live revision. Never claim CI passed from a local build alone. Report links, commit, checks that ran, elapsed time and concrete blockers. Keep the previous working release recoverable.
