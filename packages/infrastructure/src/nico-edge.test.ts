import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleNicoEdge, type EdgeEnvName } from "./nico-edge";
import type { ModelFetch, ModelGatewayEnv } from "./model-gateway";

const env: ModelGatewayEnv = {
  LIFE_LLM_PROTOCOL: "anthropic",
  LIFE_LLM_ENDPOINT: "https://api.anthropic.com/v1/messages",
  LIFE_LLM_MODEL: "test-model",
  LIFE_LLM_API_KEY: "secret-only-server",
  LIFE_LLM_ALLOWED_USER_ID: "owner",
};

const readEnv =
  (source: ModelGatewayEnv) =>
  (name: EdgeEnvName): string | undefined =>
    source[name];

const forbiddenFetch: ModelFetch = async () => {
  throw new Error("provider called");
};

describe("Supabase model function", () => {
  it("answers status on the function path and hides the model key", async () => {
    const response = await handleNicoEdge(
      new Request("https://example.supabase.co/functions/v1/nico/status", {
        headers: {
          "oai-authenticated-user-id": "owner",
          Authorization: "Bearer owner",
        },
      }),
      readEnv(env),
      forbiddenFetch,
    );
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      configured: true,
      available: false,
      authenticated: false,
      authorized: false,
    });
    expect(body).not.toContain("secret-only-server");
  });

  it("accepts the worker path and a bare function path", async () => {
    for (const url of [
      "https://life.test/api/nico/status",
      "https://example.supabase.co/nico/status/",
    ]) {
      const response = await handleNicoEdge(
        new Request(url),
        readEnv(env),
        forbiddenFetch,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ configured: true });
    }
  });

  it("refuses propose when the caller is only a header or a body field", async () => {
    const response = await handleNicoEdge(
      new Request("https://example.supabase.co/functions/v1/nico/propose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "oai-authenticated-user-id": "owner",
          Authorization: "Bearer owner",
        },
        body: JSON.stringify({ userId: "owner", LIFE_LLM_API_KEY: "forged" }),
      }),
      readEnv(env),
      forbiddenFetch,
    );
    expect(response.status).toBe(403);
  });

  it("reports no model when the project secret is absent", async () => {
    const response = await handleNicoEdge(
      new Request("https://example.supabase.co/functions/v1/nico/status"),
      () => undefined,
      forbiddenFetch,
    );
    expect(await response.json()).toEqual({
      configured: false,
      available: false,
      authenticated: false,
      authorized: false,
    });
  });

  it("rejects an unknown function route", async () => {
    const response = await handleNicoEdge(
      new Request("https://example.supabase.co/functions/v1/nico"),
      readEnv(env),
      forbiddenFetch,
    );
    expect(response.status).toBe(404);
  });
});

describe("model function bundle", () => {
  it("keeps the model key out of the generated function", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nico-edge-"));
    const outfile = join(directory, "index.js");
    const modelKey = "llm-key-sentinel-8d2a4c6e";
    try {
      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn("node", ["scripts/build-edge-function.mjs"], {
          env: {
            ...process.env,
            NICO_EDGE_OUTFILE: outfile,
            LIFE_LLM_API_KEY: modelKey,
            SUPABASE_DB_PASSWORD: "db-password-sentinel-7c1e4b8a",
            SUPABASE_SERVICE_ROLE_KEY: "service-role-sentinel-9f3c2a6d",
          },
        });
        child.on("error", reject);
        child.on("exit", (status) => resolve(status ?? 1));
      });
      expect(code).toBe(0);
      const bundle = await readFile(outfile, "utf8");
      expect(bundle).toContain("Deno.serve");
      expect(bundle).not.toContain(modelKey);
      expect(bundle).not.toContain("db-password-sentinel-7c1e4b8a");
      expect(bundle).not.toContain("service-role-sentinel-9f3c2a6d");
      expect(bundle).not.toContain("from\"effect\"");
      expect(bundle).not.toContain("VITE_");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 60000);
});
