import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLAYER_SESSION_KEY,
  attachEmailForReturn,
  createPlayerClient,
  ensurePlayerSession,
} from "./player-session";
import * as E from "../../foundation/src/either";

const url = "https://example.supabase.co";
const anonKey = "sb_publishable_test_key";
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

function jwt(userId: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      is_anonymous: true,
    }),
  ).toString("base64url");
  return `${header}.${body}.sig`;
}

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

function sessionBody(userId: string) {
  return {
    access_token: jwt(userId),
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: `refresh-${userId}`,
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "",
      is_anonymous: true,
      app_metadata: { provider: "anonymous", providers: ["anonymous"] },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

function clientFor(
  userId: string,
  storage: ReturnType<typeof memoryStorage>,
  requests: Request[],
) {
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path.endsWith("/signup")) {
      return new Response(JSON.stringify(sessionBody(userId)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "unexpected" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };
  const created = createPlayerClient(
    { url, anonKey },
    { fetch: fetcher, storage },
  );
  if (created._tag === "Left") throw new Error(created.left);
  return created.right;
}

function webSource(): string {
  const dir = "apps/web/src";
  const files: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(readFileSync(path, "utf8"));
    }
  };
  walk(dir);
  return files.join("\n");
}

describe("anonymous player session", () => {
  it("creates a session, stores that player id, and does not ask for an email", async () => {
    const storage = memoryStorage();
    const requests: Request[] = [];
    const client = clientFor(firstId, storage, requests);
    expect(await ensurePlayerSession(client)).toEqual(E.right(firstId));
    expect(storage.items.get(PLAYER_SESSION_KEY)).toContain(firstId);
    expect(requests).toHaveLength(1);
    const body: unknown = await requests[0]!.json();
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("password");
    expect(requests[0]!.headers.get("apikey")).toBe(anonKey);
    expect(requests[0]!.headers.get("apikey")).not.toContain("service_role");
    await client.auth.stopAutoRefresh();
  });

  it("gives a second player a different stored id", async () => {
    const firstStorage = memoryStorage();
    const secondStorage = memoryStorage();
    const firstRequests: Request[] = [];
    const secondRequests: Request[] = [];
    const first = clientFor(firstId, firstStorage, firstRequests);
    const second = clientFor(secondId, secondStorage, secondRequests);
    expect(await ensurePlayerSession(first)).toEqual(E.right(firstId));
    expect(await ensurePlayerSession(second)).toEqual(E.right(secondId));
    const firstSaved = firstStorage.items.get(PLAYER_SESSION_KEY) ?? "";
    const secondSaved = secondStorage.items.get(PLAYER_SESSION_KEY) ?? "";
    expect(firstSaved).toContain(firstId);
    expect(firstSaved).not.toContain(secondId);
    expect(secondSaved).toContain(secondId);
    expect(secondSaved).not.toContain(firstId);
    await first.auth.stopAutoRefresh();
    await second.auth.stopAutoRefresh();
  });

  it("reuses the stored id instead of creating another player", async () => {
    const storage = memoryStorage();
    const firstRequests: Request[] = [];
    const secondRequests: Request[] = [];
    const first = clientFor(firstId, storage, firstRequests);
    expect(await ensurePlayerSession(first)).toEqual(E.right(firstId));
    const second = clientFor(secondId, storage, secondRequests);
    expect(await ensurePlayerSession(second)).toEqual(E.right(firstId));
    expect(secondRequests).toHaveLength(0);
    await first.auth.stopAutoRefresh();
    await second.auth.stopAutoRefresh();
  });

  it("leaves email attachment for later and does not call it from the page", async () => {
    const calls: string[] = [];
    const auth = {
      updateUser: async ({ email: value }: { email: string }) => {
        calls.push(value);
        return { error: null };
      },
    };
    expect(await attachEmailForReturn(auth, "not-an-email")).toMatchObject({
      _tag: "Left",
    });
    expect(calls).toEqual([]);
    expect(await attachEmailForReturn(auth, "  hero@example.com ")).toEqual(
      E.right({ _tag: "Unit" }),
    );
    expect(calls).toEqual(["hero@example.com"]);
    const page = webSource();
    expect(page).not.toContain("attachEmailForReturn");
    expect(page).not.toContain("signInWithPassword");
    expect(page).not.toContain("signInWithOtp");
    expect(page).not.toContain('type="password"');
    expect(page).not.toContain('type="email"');
  });
});
