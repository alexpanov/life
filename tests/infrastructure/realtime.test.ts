import {
  createClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
  AuthSessionMissingError,
  type AuthChangeEvent,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { Effect, Scope, Exit } from "effect";
import { describe, it, expect, vi, afterEach } from "vitest";
import { observeSupabaseSave } from "../../packages/infrastructure/src/realtime";
import type { SupabaseDatabase } from "../../packages/infrastructure/src/supabase";
import {
  RepositoryError,
  type GameRepository,
} from "../../packages/application/src/persistence";
import * as O from "../../packages/foundation/src/option";

afterEach(() => vi.restoreAllMocks());

const player: User = {
  id: "owner",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01",
};
async function fixture() {
  const client = createClient<SupabaseDatabase>(
    "https://example.supabase.co",
    "test",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const getUser = vi
    .spyOn(client.auth, "getUser")
    .mockResolvedValue({ data: { user: player }, error: null });
  const handlers: Array<{
    filter: Record<string, unknown>;
    callback: (payload: unknown) => void;
  }> = [];
  let status: (
    value: "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED" | "TIMED_OUT",
  ) => void = () => {};
  let authChange: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {};
  const unsubscribe = vi.fn();
  vi.spyOn(client.auth, "onAuthStateChange").mockImplementation((callback) => {
    authChange = callback;
    return { data: { subscription: { id: "test", callback, unsubscribe } } };
  });
  vi.spyOn(RealtimeChannel.prototype, "on").mockImplementation(function (
    this: RealtimeChannel,
    _type,
    filter,
    callback,
  ) {
    handlers.push({ filter, callback });
    return this;
  });
  vi.spyOn(RealtimeChannel.prototype, "subscribe").mockImplementation(function (
    this: RealtimeChannel,
    callback,
  ) {
    status = (value) => callback?.(REALTIME_SUBSCRIBE_STATES[value]);
    return this;
  });
  const remove = vi.spyOn(client, "removeChannel").mockResolvedValue("ok");
  const load = vi.fn<GameRepository["load"]>(() =>
    Effect.succeed(O.some("repository-save")),
  );
  const onSave = vi.fn(),
    onError = vi.fn();
  const scope = await Effect.runPromise(Scope.make());
  const open = () =>
    Effect.runPromise(
      Scope.provide(scope)(
        observeSupabaseSave(
          client,
          "game",
          { load, backup: load },
          { onSave, onError },
        ),
      ),
    );
  const close = () =>
    Effect.runPromise(Scope.close(scope, Exit.succeed("done")));
  return {
    open,
    close,
    handlers,
    load,
    onSave,
    onError,
    getUser,
    remove,
    unsubscribe,
    status: (value: Parameters<typeof status>[0]) => status(value),
    signOut: () => authChange("SIGNED_OUT", null),
  };
}
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
describe("Realtime contract with fake channel transport (not live Supabase)", () => {
  it("filters owner and slot and reloads repository instead of trusting event data", async () => {
    const f = await fixture();
    await f.open();
    expect(f.handlers[0]!.filter).toMatchObject({
      filter: "user_id=eq.owner",
      table: "game_saves",
    });
    f.handlers[0]!.callback({ new: { user_id: "other", slot: "game" } });
    f.handlers[0]!.callback({ new: { user_id: "owner", slot: "starter" } });
    f.handlers[0]!.callback({ new: { payload: "bad" } });
    await flush();
    expect(f.load).not.toHaveBeenCalled();
    f.handlers[0]!.callback({
      new: { user_id: "owner", slot: "game", payload: "untrusted" },
    });
    await flush();
    expect(f.onSave).toHaveBeenCalledWith(O.some("repository-save"));
    await f.close();
    expect(f.remove).toHaveBeenCalledTimes(1);
    expect(f.unsubscribe).toHaveBeenCalled();
  });
  it("reloads on subscription/reconnection and reports channel failures", async () => {
    const f = await fixture();
    await f.open();
    f.status("SUBSCRIBED");
    await flush();
    expect(f.load).toHaveBeenCalledTimes(1);
    f.status("TIMED_OUT");
    expect(f.onError).toHaveBeenCalled();
    await f.close();
  });
  it("stops on signout and ignores queued callbacks", async () => {
    const f = await fixture();
    await f.open();
    f.status("SUBSCRIBED");
    f.signOut();
    await flush();
    expect(f.load).not.toHaveBeenCalled();
    expect(f.remove).toHaveBeenCalledTimes(1);
    expect(f.unsubscribe).toHaveBeenCalled();
    await f.close();
    f.status("SUBSCRIBED");
    await flush();
    expect(f.onSave).not.toHaveBeenCalled();
  });
  it("rejects setup without authentication", async () => {
    const f = await fixture();
    f.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    await expect(f.open()).rejects.toThrow("realtime setup");
    expect(f.handlers).toHaveLength(0);
    await f.close();
  });
  it("does not deliver a read completed after scope release", async () => {
    const f = await fixture();
    let resolveRead: (value: O.Option<string>) => void = () => {};
    f.load.mockImplementation(() =>
      Effect.promise(
        () =>
          new Promise((resolve) => {
            resolveRead = resolve;
          }),
      ),
    );
    await f.open();
    f.status("SUBSCRIBED");
    await flush();
    await f.close();
    resolveRead(O.some("late"));
    await flush();
    expect(f.onSave).not.toHaveBeenCalled();
  });
  it("blocks delivery after account switch even before auth callback arrives", async () => {
    const f = await fixture();
    await f.open();
    f.getUser.mockResolvedValue({
      data: { user: { ...player, id: "another-owner" } },
      error: null,
    });
    f.status("SUBSCRIBED");
    await flush();
    expect(f.load).not.toHaveBeenCalled();
    expect(f.remove).toHaveBeenCalledTimes(1);
    await f.close();
  });
  it("reports failed repository reads without delivering a save", async () => {
    const f = await fixture();
    f.load.mockImplementation(() =>
      Effect.fail(new RepositoryError("cloud read", "offline")),
    );
    await f.open();
    f.status("SUBSCRIBED");
    await flush();
    expect(f.onError).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "cloud read" }),
    );
    expect(f.onSave).not.toHaveBeenCalled();
    await f.close();
  });
  it("surfaces channel cleanup failure", async () => {
    const f = await fixture();
    f.remove.mockResolvedValue("timed out");
    await f.open();
    await f.close();
    expect(f.onError).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "realtime" }),
    );
  });
});
