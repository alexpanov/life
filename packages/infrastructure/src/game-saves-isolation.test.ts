import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const hero = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const heroPayload =
  '{"lines":[{"speaker":"hero","text":"I walked the block"},{"speaker":"nico","text":"Good. One block."}]}';
const otherPayload = '{"owner":"second"}';

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20261011045425_game_saves.sql",
);

async function applyMigration(db: PGlite) {
  const sql = readFileSync(migrationPath, "utf8");
  let publicationReady = true;
  try {
    await db.exec("create publication supabase_realtime;");
  } catch {
    publicationReady = false;
  }
  const statement = publicationReady
    ? sql
    : sql.replace(
        "alter publication supabase_realtime add table public.game_saves;",
        "",
      );
  await db.exec(statement);
  if (!publicationReady)
    expect(sql).toContain(
      "alter publication supabase_realtime add table public.game_saves;",
    );
}

async function database(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    grant usage on schema public to authenticated, anon;
    grant authenticated, anon to current_user;
  `);
  await applyMigration(db);
  await db.exec("alter table public.game_saves force row level security;");
  await db.query("insert into auth.users (id) values ($1), ($2)", [
    hero,
    other,
  ]);
  return db;
}

describe("game save owner policies", () => {
  it(
    "refuses the second player the first player's row",
    async () => {
      const db = await database();
      await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
          hero,
        ]);
        const role = await tx.query<{ current_user: string }>(
          "select current_user",
        );
        expect(role.rows[0]?.current_user).toBe("authenticated");
        await tx.query("select public.save_game($1, $2, $3, $4)", [
          "game",
          heroPayload,
          false,
          "",
        ]);
      });

      const seenByOther = await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
          other,
        ]);
        const read = await tx.query<{ payload: string }>(
          "select payload from public.game_saves where user_id = $1",
          [hero],
        );
        const all = await tx.query<{ payload: string }>(
          "select payload from public.game_saves",
        );
        await tx.query(
          "update public.game_saves set payload = '{\"stolen\":true}' where user_id = $1",
          [hero],
        );
        return { read: read.rows, all: all.rows };
      });
      expect(seenByOther.read).toEqual([]);
      expect(seenByOther.all).toEqual([]);

      await expect(
        db.transaction(async (tx) => {
          await tx.exec("set local role authenticated");
          await tx.query(
            "select set_config('request.jwt.claim.sub', $1, true)",
            [other],
          );
          await tx.query(
            "insert into public.game_saves (user_id, slot, payload) values ($1, 'starter', '{\"no\":true}')",
            [hero],
          );
        }),
      ).rejects.toThrow();

      const own = await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
          other,
        ]);
        await tx.query("select public.save_game($1, $2, $3, $4)", [
          "game",
          otherPayload,
          false,
          "",
        ]);
        return tx.query<{ payload: string }>(
          "select payload from public.game_saves",
        );
      });
      expect(own.rows).toEqual([{ payload: otherPayload }]);

      const stored = await db.query<{ user_id: string; payload: string }>(
        "select user_id, payload from public.game_saves order by user_id",
      );
      expect(stored.rows).toEqual([
        { user_id: hero, payload: heroPayload },
        { user_id: other, payload: otherPayload },
      ]);

      await expect(
        db.transaction(async (tx) => {
          await tx.exec("set local role anon");
          await tx.query("select payload from public.game_saves");
        }),
      ).rejects.toThrow(/permission denied/i);

      await db.close();
    },
    60000,
  );
});
