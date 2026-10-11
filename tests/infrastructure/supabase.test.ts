import {
  createClient,
  AuthSessionMissingError,
  type User,
} from "@supabase/supabase-js";
import { Effect, Result } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  createSupabasePersistence,
  type SupabaseDatabase,
} from "../../packages/infrastructure/src/supabase";
import * as O from "../../packages/foundation/src/option";

const player: User = {
  id: "662226fb-c2e4-4edf-b312-f4dac5dfd61d",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

function fixture(
  body: unknown,
  status = 200,
  slot: "game" | "starter" = "game",
) {
  const requests: Request[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createClient<SupabaseDatabase>(
    "https://example.supabase.co",
    "sb_publishable_test",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetcher },
    },
  );
  const auth = vi
    .spyOn(client.auth, "getUser")
    .mockResolvedValue({ data: { user: player }, error: null });
  return {
    persistence: createSupabasePersistence(client, slot),
    requests,
    auth,
  };
}

describe("Supabase persistence HTTP contract (not a live database test)", () => {
  it("uses the authenticated owner and independent starter slot when reading", async () => {
    const f = fixture(
      { payload: '{"version":1}', backup_payload: "", backup_present: false },
      200,
      "starter",
    );
    expect(await Effect.runPromise(f.persistence.repository.load())).toEqual(
      O.some('{"version":1}'),
    );
    expect(f.requests).toHaveLength(1);
    const url = new URL(f.requests[0]!.url);
    expect(url.searchParams.get("user_id")).toBe(`eq.${player.id}`);
    expect(url.searchParams.get("slot")).toBe("eq.starter");
  });

  it("represents a missing row as None", async () => {
    const f = fixture(null);
    expect(await Effect.runPromise(f.persistence.repository.load())).toEqual(
      O.none(),
    );
  });

  it("distinguishes absent backup from an existing backup", async () => {
    const empty = fixture({
      payload: "{}",
      backup_payload: "",
      backup_present: false,
    });
    const saved = fixture({
      payload: "{}",
      backup_payload: '{"old":true}',
      backup_present: true,
    });
    expect(
      await Effect.runPromise(empty.persistence.repository.backup()),
    ).toEqual(O.none());
    expect(
      await Effect.runPromise(saved.persistence.repository.backup()),
    ).toEqual(O.some('{"old":true}'));
  });

  it("sends the expected prior save for atomic compare-and-swap", async () => {
    const f = fixture(true);
    await Effect.runPromise(
      f.persistence.routines.save('{"new":true}', O.some('{"old":true}')),
    );
    const request = f.requests[0]!;
    expect(new URL(request.url).pathname).toBe("/rest/v1/rpc/save_game");
    expect(await request.json()).toEqual({
      p_slot: "game",
      p_payload: '{"new":true}',
      p_expected_present: true,
      p_expected_payload: '{"old":true}',
    });
  });

  it("does not conflate a first save with an existing save", async () => {
    const f = fixture(true);
    await Effect.runPromise(f.persistence.routines.save("{}", O.none()));
    expect(await f.requests[0]!.json()).toMatchObject({
      p_expected_present: false,
      p_expected_payload: "",
    });
  });

  it("fails without issuing a database request when there is no authenticated player", async () => {
    const f = fixture(true);
    f.auth.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    const result = await Effect.runPromise(
      Effect.result(f.persistence.routines.save("{}", O.none())),
    );
    expect(Result.isFailure(result)).toBe(true);
    expect(f.requests).toHaveLength(0);
  });

  it("retains conflict errors instead of silently overwriting cloud state", async () => {
    const f = fixture(
      {
        code: "40001",
        message: "Save changed on another device",
        details: "",
        hint: "",
      },
      409,
    );
    const result = await Effect.runPromise(
      Effect.result(f.persistence.routines.save("{}", O.some("old"))),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure.operation).toBe("cloud write");
      expect(result.failure.cause).toMatchObject({ code: "40001" });
    }
  });

  it("rejects malformed server rows", async () => {
    const f = fixture({ payload: 42, backup_present: false });
    const result = await Effect.runPromise(
      Effect.result(f.persistence.repository.load()),
    );
    expect(Result.isFailure(result)).toBe(true);
  });

  it("rejects unacknowledged writes", async () => {
    const f = fixture(false);
    expect(
      Result.isFailure(
        await Effect.runPromise(
          Effect.result(f.persistence.routines.save("{}", O.none())),
        ),
      ),
    ).toBe(true);
  });
});
