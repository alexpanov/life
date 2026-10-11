# Supabase persistence

The adapter is implemented but no hosted project is provisioned. The connected
Supabase account returned no projects and project cost lookup was unavailable.
The user authorized proceeding without the broken cost lookup, but the exposed creation API still requires a confirmation ID. Provisioning can continue once projects are created in the dashboard or the API is repaired.

Use two independent free projects: development and live. Do not use paid preview
branches. The website belongs on static hosting (GitHub Pages); Supabase provides
Auth and Postgres save storage. No Edge Function or privileged browser key is
needed for this adapter.

## Boundary

`createSupabasePersistence(client, slot)` implements the application's `Persistence`
interface. The caller supplies an authenticated `SupabaseClient<SupabaseDatabase>`
and either `game` or `starter`. Authentication is validated with `getUser` on each
operation. It does not create accounts, upload local progress, or choose an
environment implicitly. Application setup must explicitly select this adapter.

Reads are Effect repositories; writes are Effect routines. Missing rows and
backups return `Option`. Network, authentication, malformed row, and conflict
errors fail with `RepositoryError`. The public publishable key is appropriate in
web/native environment configuration. Service-role keys must never ship in either
client. Anonymous sign-in may be enabled deliberately as an onboarding policy;
the adapter still requires its authenticated user identity.

Snapshots use the existing v1 serialized format. The SQL routine atomically saves
the current and prior snapshots. It compares the expected prior snapshot and
fails on concurrent changes; the interface should offer reload/export, never
blindly retry with an overwrite. Main and starter remain separate per owner.
RLS protects every operation, including ownership changes. The primary key
supports owner-and-slot queries without another index. Saves are limited to 1 MiB.

## Provisioning and verification

1. Create development and live in the explicitly selected owner organization. Prefer the free plan. The user authorized skipping the broken cost check, but an actual API confirmation ID must never be invented.
2. Discover the installed Supabase CLI commands with `--help`, link development,
   and apply the checked-in migration. Use the same migration for live after tests.
3. Generate database types from the actual development schema and compare with
   `SupabaseDatabase`. Configure project URL and publishable key separately for
   development and production; keep administrative credentials in CI secrets only.
4. With two separate authenticated test users, verify insert/read/update isolation,
   starter isolation, backup recovery, first-write conflicts and stale-update
   rejection. Verify unauthenticated access and cross-owner changes are denied.
5. Run Supabase security/performance advisors and address actionable findings.
6. Enable the cloud adapter in the application only once authenticated onboarding,
   conflict handling, migration checks, and those real-project tests pass.

`tests/infrastructure/supabase.test.ts` exercises the real JavaScript client's
HTTP contract against a controlled transport. These tests verify request scoping,
Option decoding, optimistic-save parameters, and errors. They do **not** establish
that Postgres policies or SQL execute correctly. Live SQL verification and advisors
remain pending project provisioning; they must not be reported as passing.

The migration file was created using `supabase migration new game_saves` before
editing, and has not been applied to any database.
