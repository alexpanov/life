import { describe, expect, it } from "vitest";
import { assertBrowserBuildEnv, readCloudConfig } from "./public-supabase";

const url = "https://example.supabase.co";
const publishable = "sb_publishable_test_key";

function jwt(payload: unknown): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("public Supabase config", () => {
  it("stays local when the public values are absent", () => {
    expect(readCloudConfig({ url: "", anonKey: undefined })).toEqual({
      _tag: "local",
    });
  });

  it("accepts the public anon key", () => {
    expect(readCloudConfig({ url, anonKey: publishable })).toEqual({
      _tag: "ready",
      config: { url, anonKey: publishable },
    });
    expect(
      readCloudConfig({
        url,
        anonKey: jwt({ role: "anon" }),
      })._tag,
    ).toBe("ready");
  });

  it("refuses a service-role key, a secret key, and a database URL", () => {
    expect(
      readCloudConfig({ url, anonKey: jwt({ role: "service_role" }) }),
    ).toMatchObject({
      _tag: "refused",
      reason: "The browser key is a service-role key.",
    });
    expect(
      readCloudConfig({ url, anonKey: "sb_secret_not_for_the_browser" }),
    ).toMatchObject({ _tag: "refused" });
    expect(
      readCloudConfig({
        url,
        anonKey: "postgresql://postgres:secret@db.example.supabase.co/postgres",
      }),
    ).toMatchObject({
      _tag: "refused",
      reason: "The browser key is a database URL.",
    });
    expect(
      readCloudConfig({
        url: "https://postgres:db-password@example.supabase.co",
        anonKey: publishable,
      }),
    ).toMatchObject({
      _tag: "refused",
      reason: "The project URL contains a password.",
    });
  });

  it("refuses a half-set public config", () => {
    expect(readCloudConfig({ url, anonKey: "" })).toMatchObject({
      _tag: "refused",
    });
  });

  it("refuses to build when a browser variable carries a server secret", () => {
    const password = "db-password-sentinel-7c1e4b8a";
    const serviceRole = jwt({ role: "service_role" });
    expect(
      assertBrowserBuildEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: password,
        SUPABASE_DB_PASSWORD: password,
      })._tag,
    ).toBe("Left");
    expect(
      assertBrowserBuildEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: serviceRole,
      })._tag,
    ).toBe("Left");
    const allowed = assertBrowserBuildEnv({
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_ANON_KEY: publishable,
      SUPABASE_DB_PASSWORD: password,
      SUPABASE_SERVICE_ROLE_KEY: serviceRole,
      DATABASE_URL: `postgresql://postgres:${password}@db.example.supabase.co:5432/postgres`,
      LIFE_LLM_API_KEY: "llm-key-sentinel-8d2a4c6e",
    });
    expect(allowed._tag).toBe("Right");
  });

  it("refuses to put the model key in a browser variable", () => {
    const modelKey = "llm-key-sentinel-8d2a4c6e";
    expect(
      assertBrowserBuildEnv({
        VITE_LIFE_LLM_API_KEY: modelKey,
        LIFE_LLM_API_KEY: modelKey,
      })._tag,
    ).toBe("Left");
    expect(
      assertBrowserBuildEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: modelKey,
        LIFE_LLM_API_KEY: modelKey,
      })._tag,
    ).toBe("Left");
  });
});
