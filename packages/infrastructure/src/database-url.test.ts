import { describe, expect, it } from "vitest";
import { directDatabaseUrl, readDirectDatabaseUrl } from "./database-url";

describe("direct database address", () => {
  it("builds the direct Postgres address for a normal reference", () => {
    expect(
      readDirectDatabaseUrl({
        SUPABASE_PROJECT_REF: "abc123",
        SUPABASE_DB_PASSWORD: "secret",
      }),
    ).toEqual({
      _tag: "Right",
      right: "postgresql://postgres:secret@db.abc123.supabase.co:5432/postgres",
    });
  });

  it("encodes a password that contains @ and /", () => {
    const result = directDatabaseUrl({
      projectReference: "abc123",
      password: "p@ss/word",
    });
    expect(result).toEqual({
      _tag: "Right",
      right:
        "postgresql://postgres:p%40ss%2Fword@db.abc123.supabase.co:5432/postgres",
    });
    if (result._tag !== "Right") return;
    const parsed = new URL(result.right);
    expect(parsed.username).toBe("postgres");
    expect(decodeURIComponent(parsed.password)).toBe("p@ss/word");
    expect(parsed.hostname).toBe("db.abc123.supabase.co");
    expect(parsed.port).toBe("5432");
    expect(parsed.pathname).toBe("/postgres");
  });

  it("rejects a reference that is not letters and digits", () => {
    const rejected = directDatabaseUrl({
      projectReference: "ab-cd",
      password: "super-secret-marker",
    });
    expect(rejected).toEqual({
      _tag: "Left",
      left: { _tag: "InvalidProjectReference" },
    });
    expect(JSON.stringify(rejected)).not.toContain("super-secret-marker");
    expect(
      directDatabaseUrl({ projectReference: "   ", password: "secret" }),
    ).toEqual({ _tag: "Left", left: { _tag: "BlankProjectReference" } });
    expect(readDirectDatabaseUrl({ SUPABASE_DB_PASSWORD: "secret" })).toEqual({
      _tag: "Left",
      left: { _tag: "MissingProjectReference" },
    });
  });

  it("rejects a missing password", () => {
    expect(readDirectDatabaseUrl({ SUPABASE_PROJECT_REF: "abc123" })).toEqual({
      _tag: "Left",
      left: { _tag: "MissingPassword" },
    });
    expect(
      directDatabaseUrl({ projectReference: "abc123", password: "" }),
    ).toEqual({ _tag: "Left", left: { _tag: "BlankPassword" } });
  });
});
