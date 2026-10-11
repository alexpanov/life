# life handoff

## Purpose and current release

Help the hero live a good life, the life the Lord has for him, with less friction and pressure. Companion: **Niko Gonzalez**, a fictional veteran. Read AGENTS.md and .ai/CONTRACT.md before changing code.

The downloadable export is generated from the same Git commit pushed and deployed through Sites. The export filename and delivery message identify the exact commit. Current production: https://questos.mangomint-5316.chatgpt.site . Telegram entry: /telegram/ . Starter saves: /starter/ . Stable game routes include /#/nico, /#/powerups and /#/notifications.

## Start locally

Node 22+: `corepack enable`, `pnpm install`, then `pnpm start`. Development explicitly uses the simulator. `pnpm run check` runs TypeScript, ESLint, unit/integration/JSDOM tests, production build and encrypted-environment guard. `pnpm run env:test` tests dotenvx without real credentials. `pnpm run ios:bundle` checks the native bundle. The single Playwright launch test is configured, but has not run in this managed environment.

## Implemented

- Functional TypeScript core; Option/Either; Effect routines/repositories; central controller; strict frontend and model JSON catalogs; shared React Hook Form definitions for Niko forms and custom power-ups.
- Quests, realms, prioritization, completion reflection, local player memories/jobs, canonical stories, locked service trait, soft deletion and nonrepeating wisdom.
- Internal typed snippet preparation and per-hero raw prompt/output archive; internal Person/Hero/environment-based thought simulator with 20 thoughts.
- Background simulated insights over 24 hours and the latest 5 chats, persisted/deduplicated per hero while active. No focus/navigation changes.
- Three default power-ups and custom creation; one successful reply per activation,30-minute expiry, atomic energy/charge consumption. Portable templates; no payments or public sharing system.
- Offline shell, local progress, draft preservation, browser-signal conversation pause, in-game/native-notification routing and circular Port control.
- Surface-aware model context and Telegram HTML entry/bridge. Native iPhone source remains included.
- Server gateway for Anthropic or OpenAI-compatible protocols; server-owned prompts, schema validation, owner-only pilot authorization, timeout, bounded requests/responses, endpoint allowlist. No keys in clients.
- Dotenvx development/live tooling. Generated private keys stay out of Git. No real environment values encrypted or added yet.

## Not connected or verified

**Real models:** no API key, selected live model, or allowed pilot-user ID. Set LIFE_LLM_PROTOCOL, LIFE_LLM_ENDPOINT, LIFE_LLM_MODEL, secret LIFE_LLM_API_KEY and LIFE_LLM_ALLOWED_USER_ID as hosted runtime variables, then redeploy. A compatible endpoint must support the selected protocol. OpenAI Developers connection was attempted by the user and did not connect. Do not claim live model output from mocked provider tests. Onboarding, completion replies, thoughts and insights remain simulated even after configuring the conversation gateway unless their adapters are explicitly changed.

**Supabase:** the migration creates the save table, `save_game`, owner policies, and the Realtime publication. The main-branch workflow applies it to development, then live, once the five Actions secrets exist. No project is provisioned yet, and there is no live authentication, ownership test, cloud save, phone verification, or scheduler. Local storage is not cross-device persistence. Game exports omit separate chat/insight archives. No durable backend usage or billing enforcement.

**Telegram:** Mini App entry page exists, but no BotFather registration/bot token, verified initData, account linking, cloud routines or Telegram payments. Configure the deployed /telegram/ URL through BotFather. The Sites owner-only model gate does not authenticate Telegram identity. Instagram/WhatsApp are domain surface concepts only.

**Distribution/CI:** source is pushed to Sites' Git repository. Personal alexpanov/life GitHub access and remote Actions execution remain unverified. The legacy Pages workflow is not the deployment path for the new Worker gateway; adapt hosting before enabling it. The one-minute target has not been demonstrated on GitHub Actions. No signed App Store release exists.

**Verification limits:** no browser visual/device QA in this environment, no real OS push delivery test, no closed-app push backend. Test on your iPhone next. No analytics telemetry or checkout is running.

## Deployment shape

`pnpm run build` produces the Vite app, service workers, Telegram entry and `dist/server/index.js`. The latter bundles static assets and routes /api/nico/* to the server gateway. `.openai/hosting.json` preserves Sites identity. Keep provider secrets in runtime settings. `docs/ENVIRONMENT.md` explains dotenvx for local server processes; the Worker does not decrypt dotenvx files itself.

The gateway depends on Sites stripping/injecting authenticated-user headers. A different host must replace that identity adapter. Never expose the paid model endpoint by trusting client-supplied IDs. Before opening it to multiple players, add durable server quotas and authenticated account/persistence mapping.
