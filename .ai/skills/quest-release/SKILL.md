---
name: quest-release
description: Test, measure and release QuestOS using unit, Effect integration, React JSDOM and the single Playwright launch test. Use for CI, GitHub Actions, Supabase environments, builds and deployment changes.
---

# Tests and release

Read `../../CONTRACT.md` relative to this file's directory. Inspect current package scripts, workflow files, hosting configuration and credentials availability. Do not infer that a configured provider is deployed.

## Verification layers

| Layer | Verify |
| --- | --- |
| Unit | Pure function behavior, Option/Either composition, transition invariants and deterministic edge cases. |
| Integration | Effect routine/repository contracts, serialization, corruption recovery, ordering and failure propagation. Test real development database ownership isolation for backend changes. |
| JSDOM | Render React, interact with controls and observe meaningful state or text changes; do not replace the component with a hand-written fake. |
| Playwright | Keep exactly one test: open the share website, click “play live”, confirm the game is usable. Reuse that test across permitted environments. |

Read scripts before running them. Run lint, typecheck, affected tests and production build; run the full required release gates before publishing. When native code changes, verify the iOS bundle. Report unavailable checks without inventing pass counts. Never substitute a mocked backend result for a real integration pass.

## Fast deployment

Treat 60 seconds from trigger to verified live content as a measured budget, not a claim guaranteed by GitHub. Record trigger, runner start, build/test completion, deployment completion and first verified live revision. Include queue time and propagation. Report cold and warm-cache behavior separately.

Use pinned dependencies and reproducible installs, dependency caches keyed by lockfile and runtime, independent checks in parallel where safe, minimal artifacts and cancellation of obsolete runs. Verify the exact tested revision is deployed. Do not skip safety gates, RLS checks or tests to force the timer under budget. A timeout proves failure to meet the target, not successful fast deployment.

Keep development and live configuration distinct. Apply versioned migrations deliberately and verify RLS ownership isolation. Use only publishable client credentials; keep privileged values in provider secrets. Do not create paid resources. Inspect real provider capabilities before choosing a static host; a backend project is not proof that arbitrary website hosting is supported.

Publish through the configured authorized workflow, observe its result, and verify the live revision. Never claim CI passed from a local build alone. Report links, commit, checks that ran, elapsed time and concrete blockers. Keep the previous working release recoverable.
