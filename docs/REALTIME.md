# Supabase save invalidation

Status: implemented adapter and fake channel transport tests. No provisioned project, live subscription, or live two-user isolation test. Production remains local storage. This module does not create accounts or enable cloud mode.

`packages/infrastructure/src/realtime.ts` exposes `observeSupabaseSave(client, slot, repository, observer)`, an Effect requiring Scope. The authenticated session owns the subscription. Keep the scope alive for that session/screen; closing it removes the channel and auth listener. Sign-out/account change stops delivery immediately. Start a fresh scope after a new sign-in. Channel failure is delivered through `onError`, not reported as successful synchronization.

INSERT/UPDATE notifications are invalidations only: owner and slot are checked, the repository re-reads the save with authentication and ownership filters, and auth is checked again before delivery. Payload JSON is never merged into application state. Reconnection triggers a fresh read. Late callbacks and in-flight results after cleanup are ignored. Hard DELETE notifications are deliberately not used: the domain soft-deletes entities inside the save, producing UPDATE. Supabase does not support filtering DELETE events.

The observer's `onSave` hook is an optional controller integration point. The future cloud controller must compare the received save to its pending local version and use the existing optimistic-concurrency routine. Do not overwrite unsaved local work from this callback. The web/native local controllers are not connected to this adapter until cloud auth and conflict handling are configured.

## Provisioning gate

The `game_saves` migration adds that table to the `supabase_realtime` publication. Apply it to development first, then live. Do not add the table by hand when the migration has run. Confirm membership:

```sql
select * from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public' and tablename = 'game_saves';
```

Do not modify the protected `realtime` schema. Use only a public publishable client key plus the player's session; never a service-role key in a client. The server RLS policy is the authorization boundary; event filters are only a routing optimization.

Before enabling live: test two authenticated users on a real development database, each observing their own game and starter slots; verify cross-user events/read access fail, updates propagate, sign-out stops delivery, reconnection re-reads, and pending local writes surface conflicts. Run database advisors. Repeat verified publication/RLS setup for live. No such checks have yet been run against a live database.

## References checked

- https://supabase.com/changelog.md
- https://supabase.com/changelog/realtime-schema-locked-down-against-modification (July 14, 2026)
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/reference/javascript/removechannel

The channel tests exercise a real Supabase client with mocked channel transport and auth; they do not validate network delivery or server RLS.
