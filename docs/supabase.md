# Supabase persistence

The adapter is implemented. Two free projects, development and live, are the
only hosted databases. They are not provisioned until an account access token
exists and GitHub Actions secrets are set. Do not use paid preview branches.
The website stays on static hosting. Supabase provides Auth, the save table,
the `save_game` function, and Realtime. No Edge Function is used.

## Boundary

`createSupabasePersistence(client, slot, ownerId)` implements the application's
`Persistence` interface. The browser uses the public anon key. On play, it
creates an anonymous session when this device does not already have one, stores
that player id, and binds the save to it. Each quest in that save keeps
the hero's lines and Nico's lines. There is no email, magic link, or
password on that path. `attachEmailForReturn` is the later seam for Nico to ask
for an email so the player can come back on another device. Nothing in the game
calls it yet. A previous local save is not uploaded.

Reads are Effect repositories; writes are Effect routines. Missing rows and
backups return `Option`. Network, authentication, malformed row, and conflict
errors fail with `RepositoryError`. The public publishable key is appropriate in
web/native environment configuration. Service-role keys must never ship in either
client. The page session is an anonymous authenticated user. The project must
allow anonymous sign-ins. The save still requires that user id.

Snapshots use the existing v1 serialized format. The SQL routine atomically saves
the current and prior snapshots. It compares the expected prior snapshot and
fails on concurrent changes; the interface should offer reload/export, never
blindly retry with an overwrite. Main and starter remain separate per owner.
RLS protects every operation, including ownership changes. The primary key
supports owner-and-slot queries without another index. Saves are limited to 1 MiB.

## Provisioning and verification

1. Create development and live on the free plan in the selected organization. Do not invent a confirmation identifier.
2. Store `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_DEV_DB_PASSWORD`, `SUPABASE_LIVE_PROJECT_REF`, and `SUPABASE_LIVE_DB_PASSWORD` as GitHub Actions secrets. The main-branch workflow applies the checked-in migration to development, then live, after the smoke tests. The site build may also receive the public `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Those two are the only database values that may enter the browser. The database password and the service-role key stay out of that build. Enable anonymous sign-ins on the project, or the page keeps the save on the device.
3. Generate database types from the actual development schema and compare with
   `SupabaseDatabase`. Configure project URL and publishable key separately for
   development and production; keep administrative credentials in CI secrets only.
4. With two separate authenticated test users, verify insert/read/update isolation,
   starter isolation, backup recovery, first-write conflicts and stale-update
   rejection. Verify unauthenticated access and cross-owner changes are denied.
5. Run Supabase security/performance advisors and address actionable findings.
6. The page uses the cloud save when the public URL and anon key are present.
   Without them it stays on the local save. Do not ask the player to finish a
   sign-in form.

`packages/infrastructure/src/supabase.test.ts` exercises the JavaScript client's
HTTP contract against a controlled transport. `game-saves-isolation.test.ts`
runs the checked-in policies on a local Postgres and checks that a second
player cannot read the first player's row. Neither test connects to the hosted
project. Hosted verification and advisors stay pending until that project is
reachable, and must not be reported as passing.

The migration file was created using `supabase migration new game_saves` before
editing, and has not been applied to any database.
