import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  restoreGame,
  selectGame,
  serializeGame,
  newGame,
  transition,
} from "./index";
const context = {
  now: 1_800_000_000_000,
  eventId: "migration",
  localDay: "2027-01-15",
};
const fixture = () =>
  JSON.parse(
    readFileSync(new URL("./legacy-save.json", import.meta.url), "utf8"),
  );
describe("v0.3 save migration", () => {
  it("retains existing quest identity, statuses, rewards and active realm", () => {
    const raw = fixture(),
      state = restoreGame(raw, context),
      player = raw.players[0],
      actual = selectGame(state, context.now);
    expect(actual.player.id).toBe(player.id);
    expect(actual.player.activeRealmId).toBe(player.activeRealmId);
    expect(
      actual.player.campaigns
        .flatMap((c) => c.quests)
        .map((q) => ({ id: q.id, status: q.status, xp: q.xp })),
    ).toEqual(
      player.campaigns
        .flatMap((c: { quests: unknown[] }) => c.quests)
        .map((q: { id: string; status: string; xp: number }) => ({
          id: q.id,
          status: q.status,
          xp: q.xp,
        })),
    );
    expect(actual.xp).toBeGreaterThan(0);
  });
  it("can be exported and restored repeatedly without losing progress", () => {
    const first = restoreGame(fixture(), context),
      second = restoreGame(JSON.parse(serializeGame(first)), context);
    expect(selectGame(second, context.now).xp).toBe(
      selectGame(first, context.now).xp,
    );
    expect(second.players[0]?.campaigns).toEqual(first.players[0]?.campaigns);
    expect(second.players[0]?.sidekick).toEqual(first.players[0]?.sidekick);
  });
  it("rejects duplicate player identifiers", () => {
    const raw = fixture();
    raw.players.push(structuredClone(raw.players[0]));
    expect(() => restoreGame(raw, context)).toThrow();
  });
  it("rejects tampered practice rewards", () => {
    const state = newGame(context),
      id = state.players[0]!.skills[0]!.id,
      practiced = transition(
        state,
        { type: "practice", skillId: id, note: "" },
        context,
      ).state,
      raw = JSON.parse(serializeGame(practiced));
    raw.players[0].skills[0].xp = 99999;
    expect(() => restoreGame(raw, context)).toThrow("Skill XP");
  });
  it("rolls back an entire multi-operation patch when a later operation fails", () => {
    const state = newGame(context),
      before = structuredClone(state);
    expect(() =>
      transition(
        state,
        {
          type: "import",
          data: {
            kind: "questos.patch",
            version: 1,
            operations: [
              { type: "addQuest", quest: { title: "Should never survive" } },
              { type: "setStatus", questId: "missing", status: "done" },
            ],
          },
        },
        context,
      ),
    ).toThrow();
    expect(state).toEqual(before);
  });
});
