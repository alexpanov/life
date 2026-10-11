import type { SupabaseClient } from "@supabase/supabase-js";
import { Effect } from "effect";
import { z } from "zod";
import {
  RepositoryError,
  type Persistence,
} from "../../application/src/persistence";
import * as O from "../../foundation/src/option";
import { unit } from "../../foundation/src/unit";

export type SaveSlot = "game" | "starter";
type SaveRow = {
  user_id: string;
  slot: SaveSlot;
  payload: string;
  backup_payload: string;
  backup_present: boolean;
  updated_at: string;
};

/** Matches the checked-in migration. Replace with generated types after provisioning. */
export type SupabaseDatabase = {
  public: {
    Tables: {
      game_saves: {
        Row: SaveRow;
        Insert: Omit<SaveRow, "updated_at">;
        Update: Partial<SaveRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_game: {
        Args: {
          p_slot: SaveSlot;
          p_payload: string;
          p_expected_present: boolean;
          p_expected_payload: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const savedPayload = z.object({
  payload: z.string(),
  backup_payload: z.string(),
  backup_present: z.boolean(),
});

/** The caller owns authentication; this adapter never silently creates an account. */
export function createSupabasePersistence(
  client: SupabaseClient<SupabaseDatabase>,
  slot: SaveSlot,
): Persistence {
  const authenticatedUser = async (): Promise<string> => {
    const result = await client.auth.getUser();
    if (result.error) throw result.error;
    const user = O.fromNullable(result.data.user);
    if (!O.isSome(user)) throw new Error("Sign in before using cloud saves.");
    return user.value.id;
  };

  const read = (backup: boolean) =>
    Effect.tryPromise({
      try: async () => {
        const userId = await authenticatedUser();
        const result = await client
          .from("game_saves")
          .select("payload,backup_payload,backup_present")
          .eq("user_id", userId)
          .eq("slot", slot)
          .maybeSingle();
        if (result.error) throw result.error;
        const row = O.fromNullable(result.data);
        if (!O.isSome(row)) return O.none<string>();
        const data = savedPayload.parse(row.value);
        return backup
          ? data.backup_present
            ? O.some(data.backup_payload)
            : O.none<string>()
          : O.some(data.payload);
      },
      catch: (cause) => new RepositoryError("cloud read", cause),
    });

  return {
    repository: { load: () => read(false), backup: () => read(true) },
    routines: {
      save: (value, previous) =>
        Effect.tryPromise({
          try: async () => {
            await authenticatedUser();
            const result = await client.rpc("save_game", {
              p_slot: slot,
              p_payload: value,
              p_expected_present: O.isSome(previous),
              p_expected_payload: O.getOrElse(previous, () => ""),
            });
            if (result.error) throw result.error;
            if (result.data !== true)
              throw new Error("Cloud save was not acknowledged.");
            return unit;
          },
          catch: (cause) => new RepositoryError("cloud write", cause),
        }),
    },
  };
}
