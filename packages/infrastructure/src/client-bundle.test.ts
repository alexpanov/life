import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { build } from "vite";

const password = "db-password-sentinel-7c1e4b8a";
const serviceRole = "service-role-sentinel-9f3c2a6d";
const anonKey = "sb_publishable_bundle_test_key";

function jwt(payload: unknown): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

async function filesIn(dir: string): Promise<string[]> {
  const found: string[] = [];
  const walk = async (current: string) => {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else found.push(await readFile(path, "utf8"));
    }
  };
  await walk(dir);
  return found;
}

async function withEnv(
  extra: Record<string, string | undefined>,
  run: () => Promise<void>,
) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(extra)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("browser bundle secrets", () => {
  it(
    "keeps the database password and the service-role key out of the built site",
    async () => {
      const outDir = await mkdtemp(join(tmpdir(), "life-bundle-"));
      const databaseUrl = `postgresql://postgres:${password}@db.example.supabase.co:5432/postgres`;
      try {
        await withEnv(
          {
            VITE_SUPABASE_URL: "https://example.supabase.co",
            VITE_SUPABASE_ANON_KEY: anonKey,
            SUPABASE_DB_PASSWORD: password,
            SUPABASE_DEV_DB_PASSWORD: password,
            SUPABASE_LIVE_DB_PASSWORD: password,
            SUPABASE_SERVICE_ROLE_KEY: serviceRole,
            DATABASE_URL: databaseUrl,
          },
          async () => {
            await build({
              configFile: join(process.cwd(), "vite.config.ts"),
              build: { outDir, emptyOutDir: true },
              logLevel: "silent",
            });
          },
        );
        const built = (await filesIn(outDir)).join("\n");
        expect(built).toContain(anonKey);
        expect(built).not.toContain(password);
        expect(built).not.toContain(serviceRole);
        expect(built).not.toContain("db.example.supabase.co");
        expect(built).not.toContain("postgresql://");
      } finally {
        await rm(outDir, { recursive: true, force: true });
      }
    },
    120000,
  );

  it(
    "does not emit a bundle when the anon key is a service-role key",
    async () => {
      const outDir = await mkdtemp(join(tmpdir(), "life-bundle-refused-"));
      const serviceJwt = jwt({ role: "service_role" });
      try {
        await withEnv(
          {
            VITE_SUPABASE_URL: "https://example.supabase.co",
            VITE_SUPABASE_ANON_KEY: serviceJwt,
            SUPABASE_SERVICE_ROLE_KEY: serviceJwt,
            SUPABASE_DB_PASSWORD: password,
          },
          async () => {
            await expect(
              build({
                configFile: join(process.cwd(), "vite.config.ts"),
                build: { outDir, emptyOutDir: true },
                logLevel: "silent",
              }),
            ).rejects.toThrow(/service-role key|Refusing to build/);
          },
        );
        const built = (await filesIn(outDir)).join("\n");
        expect(built).not.toContain(serviceJwt);
        expect(built).not.toContain(password);
      } finally {
        await rm(outDir, { recursive: true, force: true });
      }
    },
    120000,
  );
});
