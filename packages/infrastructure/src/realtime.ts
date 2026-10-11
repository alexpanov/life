import type { SupabaseClient } from "@supabase/supabase-js";
import { Effect, Result } from "effect";
import { z } from "zod";
import {
  RepositoryError,
  type GameRepository,
} from "../../application/src/persistence";
import * as O from "../../foundation/src/option";
import { unit } from "../../foundation/src/unit";
import type { SaveSlot, SupabaseDatabase } from "./supabase";

export interface SaveInvalidationObserver {
  /** A repository result, never the untrusted realtime payload. Consumer handles conflicts. */
  readonly onSave: (save: O.Option<string>) => void;
  readonly onError: (error: RepositoryError) => void;
}
const ownerSlot = z.object({
  user_id: z.string(),
  slot: z.enum(["game", "starter"]),
});

/** Keep the surrounding Effect scope alive for the screen/session lifetime. */
export function observeSupabaseSave(
  client: SupabaseClient<SupabaseDatabase>,
  slot: SaveSlot,
  repository: GameRepository,
  observer: SaveInvalidationObserver,
) {
  return Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const initial = await client.auth.getUser();
        if (initial.error) throw initial.error;
        const user = O.fromNullable(initial.data.user);
        if (!O.isSome(user))
          throw new Error("Sign in before observing cloud saves.");
        const owner = user.value.id;
        let active = true;
        let queued = Promise.resolve();
        let removal = O.none<Promise<void>>();
        let unsubscribeAuth = () => {};
        const channel = client.channel(`life-save:${owner}:${slot}`);
        const report = (cause: unknown) =>
          observer.onError(new RepositoryError("realtime", cause));
        const stop = (): Promise<void> => {
          active = false;
          unsubscribeAuth();
          if (O.isSome(removal)) return removal.value;
          const pending = client
            .removeChannel(channel)
            .then((status) => {
              if (status !== "ok")
                report(new Error(`Channel cleanup: ${status}`));
            })
            .catch(report);
          removal = O.some(pending);
          return pending;
        };
        const stillOwner = async () => {
          const result = await client.auth.getUser();
          if (result.error) throw result.error;
          return result.data.user?.id === owner;
        };
        const invalidate = () => {
          queued = queued
            .then(async () => {
              if (!active) return;
              if (!(await stillOwner())) {
                await stop();
                return;
              }
              const result = await Effect.runPromise(
                Effect.result(repository.load()),
              );
              if (!active) return;
              if (!(await stillOwner())) {
                await stop();
                return;
              }
              if (Result.isFailure(result)) observer.onError(result.failure);
              else observer.onSave(result.success);
            })
            .catch((cause: unknown) => {
              if (active) report(cause);
            });
        };
        const auth = client.auth.onAuthStateChange((_event, session) => {
          if (session?.user.id !== owner) {
            // Supabase auth callbacks must not await another auth operation.
            void stop();
          }
        });
        unsubscribeAuth = () => auth.data.subscription.unsubscribe();
        if (!active) unsubscribeAuth();
        const cleanup = stop;
        try {
          if (!active) return cleanup;
          for (const event of ["INSERT", "UPDATE"] as const) {
            channel.on(
              "postgres_changes",
              {
                event,
                schema: "public",
                table: "game_saves",
                filter: `user_id=eq.${owner}`,
              },
              (payload) => {
                const parsed = ownerSlot.safeParse(payload.new);
                if (
                  active &&
                  parsed.success &&
                  parsed.data.user_id === owner &&
                  parsed.data.slot === slot
                )
                  invalidate();
              },
            );
          }
          channel.subscribe((status, error) => {
            if (!active) return;
            if (status === "SUBSCRIBED") invalidate();
            else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            )
              report(error ?? new Error(`Channel status: ${status}`));
          });
        } catch (cause) {
          await cleanup();
          throw cause;
        }
        return cleanup;
      },
      catch: (cause) => new RepositoryError("realtime setup", cause),
    }),
    (cleanup) => Effect.promise(cleanup),
  ).pipe(Effect.map(() => unit));
}
