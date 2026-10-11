import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { z } from "zod";
import * as E from "../../foundation/src/either";
import { unit, type Unit } from "../../foundation/src/unit";
import {
  readCloudConfig,
  type PublicSupabaseConfig,
} from "./public-supabase";
import type { SupabaseDatabase } from "./supabase";

export const PLAYER_SESSION_KEY = "life-player-session";

const email = z
  .string()
  .trim()
  .max(320)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

/** Test seam. Production uses the browser session store and does not pass this. */
export interface PlayerTransport {
  readonly fetch: typeof fetch;
  readonly storage: SupportedStorage;
}

const flights = new WeakMap<object, Promise<E.Either<string, string>>>();

export function createPlayerClient(
  config: PublicSupabaseConfig,
  transport?: PlayerTransport,
): E.Either<string, SupabaseClient<SupabaseDatabase>> {
  const checked = readCloudConfig(config);
  if (checked._tag !== "ready")
    return E.left(
      checked._tag === "refused"
        ? checked.reason
        : "Cloud save is not configured.",
    );
  return E.right(
    createClient<SupabaseDatabase>(
      checked.config.url,
      checked.config.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: !transport,
          detectSessionInUrl: false,
          storageKey: PLAYER_SESSION_KEY,
          ...(transport ? { storage: transport.storage } : {}),
        },
        ...(transport ? { global: { fetch: transport.fetch } } : {}),
      },
    ),
  );
}

async function ensureOnce(
  client: SupabaseClient<SupabaseDatabase>,
): Promise<E.Either<string, string>> {
  const existing = await client.auth.getSession();
  const stored = existing.data.session?.user.id;
  if (stored) return E.right(stored);
  const created = await client.auth.signInAnonymously();
  const player = created.data.user?.id;
  if (created.error || !player) return E.left("Could not open your save.");
  return E.right(player);
}

/** Opens an anonymous session when this browser does not already have one, and stores that id. */
export function ensurePlayerSession(
  client: SupabaseClient<SupabaseDatabase>,
): Promise<E.Either<string, string>> {
  const existing = flights.get(client);
  if (existing) return existing;
  const flight = ensureOnce(client).then((result) => {
    if (result._tag === "Left") flights.delete(client);
    return result;
  });
  flights.set(client, flight);
  return flight;
}

export interface EmailReturnAuth {
  updateUser(credentials: {
    readonly email: string;
  }): Promise<{ error: { message: string } | null }>;
}

/**
 * Future seam. Nico may ask for an email later so this player can come back
 * on another device. Nothing in the game calls this yet.
 */
export async function attachEmailForReturn(
  auth: EmailReturnAuth,
  input: unknown,
): Promise<E.Either<string, Unit>> {
  const parsed = email.safeParse(input);
  if (!parsed.success) return E.left("That email is not usable.");
  const result = await auth.updateUser({ email: parsed.data });
  if (result.error) return E.left("The email was not saved.");
  return E.right(unit);
}
