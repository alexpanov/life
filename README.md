# life · QuestOS

A real-world RPG: choose a quest, make one move, learn with Niko, and return to familiar realms.

The web interface is React, React Router and Tailwind. The iPhone interface is native Expo/React Native. Both use one deterministic TypeScript domain and Effect application layer. Android is intentionally unsupported.

## Run

Node 22 or newer:

```sh
npm ci
npm start
```

For iPhone, see [native setup](apps/iphone/README.md). `npm run ios:bundle` checks Metro compilation; it does not produce a signed App Store release.

## Source

| Directory | Responsibility |
| --- | --- |
| `packages/foundation` | Explicit Option, Either, Unit |
| `packages/core` | Types, pure transitions, validation, Niko learning, Effect routines |
| `packages/application` | Controller and replaceable persistence contracts |
| `packages/infrastructure` | Supabase repository and save routines |
| `packages/design` | Shared design tokens |
| `apps/web` | React pages and Tailwind primitives |
| `apps/iphone` | Native iPhone interface |
| `tests` | Unit, integration, JSDOM, one browser smoke test |
| `.ai` | Model-agnostic agent contract and portable skills |

Read [AGENTS.md](AGENTS.md) for engineering instructions. Cursor's entry point points to the same contract. Other agents can read the portable skills directly; no model vendor is required by the application.

## Verify

```sh
npm run check
npm run test:unit
npm run test:integration
npm run test:dom
SITE_BASE=/life/ npm run build
npm run test:browser
npm run ios:bundle
```

The single Playwright test requires Chrome and checks website → **play live** → game. Unit/integration tests run in Node; interactive React tests run in JSDOM. Supabase adapter contract tests use controlled transport responses and are not proof of deployed database isolation.

## Deploy

Existing hosted version: https://questos.mangomint-5316.chatgpt.site

Intended GitHub Pages address: `https://alexpanov.github.io/life/`. This address is a deployment target, not confirmation of a live site. [Deployment instructions](docs/DEPLOYMENT.md) describe required access and the workflow.

The Actions workflow caches dependencies, runs independent quality checks concurrently, executes exactly one browser test, deploys, then verifies the live commit. It reports workflow creation → verified live elapsed time and fails the timing gate above 60 seconds. Hosted runner queues and cold installs can exceed this budget; no successful remote timing measurement has been recorded yet.

## Data and Niko

Existing v1 saves migrate without resetting progress. New players start clean. Root and starter use separate storage keys. Local saves include backup/recovery and full import/export. Moving to another website origin does not move browser storage: export on the original website, then import on the new one.

Niko learns bounded preferences from player choices and quest outcomes. Resetting memory preserves quests and rewards. There is **no live LLM connection**: the ChatGPT handoff is manual. A typed provider boundary and versioned prompt snippets allow a future server-side model adapter.

Supabase schema and adapters are supplied for separate development/live projects, with authenticated ownership and optimistic save conflict detection. They are not enabled in the UI until projects and authentication are configured. See [Supabase setup](docs/supabase.md). No service credentials belong in client builds.

Game rewards and skill decay are fictional mechanics. Completion remains under player control. Driving mode locks interactions. No location tracking or analytics is included.
