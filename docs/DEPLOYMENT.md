# Deployment

## GitHub Pages

Target repository: `alexpanov/life`, public for free GitHub Pages. Target URL: `https://alexpanov.github.io/life/`.

1. Create the repository and grant the connected GitHub app access to it. Repository creation and Pages administration are not exposed by the current connector.
2. Push a clean source snapshot. Do not publish historical private seed data, old saves, credentials or QA screenshots from the original private repository history.
3. In repository Settings → Pages, choose **GitHub Actions** as the source.
4. Push `main`. `.github/workflows/live.yml` runs checks and deploys the generated `dist` artifact.
5. Inspect the Actions summary for the live commit and elapsed seconds. A URL in a document is not deployment evidence.

The runtime website is a static React application. Supabase hosts authentication/database services, not this frontend.

## One-minute budget

The pipeline caches dependency installations by exact lockfile, runs typecheck/lint/tests/build concurrently, uses the Ubuntu runner's existing Chrome, and has one release job. It retains checks on all deployments.

`verify-deployment.mjs` measures from GitHub workflow creation time, including queue time, until the deployed commit is returned by the public website. It fails above 60 seconds even if deployment succeeded, reporting the distinction explicitly. This is a measured budget, not a guarantee of GitHub infrastructure latency. The five-minute job timeout permits a useful diagnosis of cold-run overruns; it is not the performance budget.

The measured scope ends at verified availability and excludes final GitHub runner cleanup. User click-to-workflow-creation delay is not observable from the workflow. No remote run is claimed until GitHub access is available.

## Existing Sites deployment

The `.openai/hosting.json` manifest retains the current hosted project. Sites uses `/` as its base; GitHub Actions builds with `SITE_BASE=/life/`. Hash routing avoids deep-link server rewrites. Both paths share the domain and source. Service workers scope caches independently.

## Environments

Only development and live database environments are intended. A local browser-only save is a persistence adapter, not another hosted environment. See `supabase.md` for auth and migration steps.

On a push to `main`, after the smoke tests, the workflow applies `supabase/migrations` to the development project and then the live project. Pull requests do not touch either database. The migration creates `game_saves`, `save_game`, owner policies, and the Realtime publication. Required Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_DEV_DB_PASSWORD`, `SUPABASE_LIVE_PROJECT_REF`, `SUPABASE_LIVE_DB_PASSWORD`.

## Source of deployment truth

Record actual deployment IDs, source SHAs, test outputs and Actions URLs in release reports. Never label a prepared workflow, generated bundle, simulated adapter test or proposed URL as a live deployment.
