import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  newGame,
  transition,
  selectGame,
  serializeGame,
  restoreGame,
  getSidekickContext,
  nextNicoJob,
  type Command,
  type GameState,
} from "./index";
import {
  NicoModel,
  ModelError,
  mockNicoLayer,
  nicoReplyRoutine,
} from "../../application/src/nico-model";
import * as O from "../../foundation/src/option";
const now = 1800000000000;
const context = (id = "test", at = now) => ({
  now: at,
  eventId: id,
  localDay: "2027-01-15",
});
const send = (s: GameState, c: Command, id = "action", at = now) =>
  transition(s, c, context(id, at)).state;
const player = (s: GameState) => selectGame(s, now).player;
function complete(s: GameState, id: string, at = now) {
  s = send(s, { type: "add-quest", quest: { title: id } }, id, at);
  const q = player(s)
    .campaigns.flatMap((c) => c.quests)
    .at(-1)!;
  s = send(
    s,
    { type: "set-status", questId: q.id, status: "done" },
    `done-${id}`,
    at,
  );
  return { s, id: q.id };
}
describe("Niko's private job queue", () => {
  it("creates separate Niko identities and onboarding jobs per hero", () => {
    let s = newGame(context());
    s = send(s, { type: "add-player", name: "Other" });
    expect(new Set(s.players.map((p) => p.sidekick.id)).size).toBe(2);
    expect(s.players[0]!.sidekick.jobs[0]!.id).not.toBe(
      s.players[1]!.sidekick.jobs[0]!.id,
    );
    expect(O.map(nextNicoJob(player(s).sidekick), (j) => j.kind)).toEqual(
      O.some("meet-hero"),
    );
    const other = structuredClone(s.players[0]);
    s = send(s, { type: "meet-nico", text: "Going for a walk" });
    s = send(s, { type: "name-hero", name: " Alex " });
    expect(player(s).sidekick.heroName).toEqual(O.some("Alex"));
    expect(s.players[0]).toEqual(other);
    expect(player(s).sidekick.jobs.every((j) => j.status === "done")).toBe(
      true,
    );
  });
  it("migrates old sidekicks without losing memories or progress", () => {
    const s = newGame(context());
    const wire = JSON.parse(serializeGame(s));
    wire.players[0].sidekick = {
      version: 1,
      name: "Niko",
      snippets: [
        { id: "old", text: "Keep it small", at: now, source: "player" },
      ],
      reviews: [],
      revision: 1,
    };
    const restored = restoreGame(wire, context());
    expect(player(restored).sidekick.name).toBe("Niko");
    expect(player(restored).sidekick.snippets[0]!.text).toBe("Keep it small");
    expect(player(restored).sidekick.jobs).toHaveLength(2);
    expect(restoreGame(JSON.parse(serializeGame(restored)), context())).toEqual(
      restored,
    );
  });
  it("completes, reflects, remembers and replays without duplicate work", () => {
    const initial = newGame(context());
    const before = structuredClone(initial);
    let { s, id } = complete(initial, "walk");
    expect(initial).toEqual(before);
    const completed = structuredClone(s);
    s = send(s, { type: "set-status", questId: id, status: "done" });
    expect(s).toEqual(completed);
    expect(
      player(s).sidekick.jobs.filter((j) => j.kind === "reflect-outcome"),
    ).toHaveLength(1);
    s = send(s, {
      type: "reflect-quest",
      questId: id,
      text: "Starting small worked",
    });
    const reflected = structuredClone(s);
    expect(
      send(s, { type: "reflect-quest", questId: id, text: "Duplicate" }),
    ).toEqual(reflected);
    expect(player(s).sidekick.snippets.at(-1)!.text).toBe(
      "Starting small worked",
    );
    expect(player(s).sidekick.reviews.at(-1)!.adjustment).toBe(
      "Starting small worked",
    );
    s = send(s, { type: "reset-memory" });
    expect(player(s).campaigns[0]!.quests[0]!.status).toBe("done");
    expect(player(s).sidekick.jobs).toHaveLength(3);
    expect(
      player(s).sidekick.snippets.every((n) => O.isSome(n.deletedAt)),
    ).toBe(true);
  });
  it("keeps every hero line and Nico's line on that quest", () => {
    let s = newGame(context());
    s = send(s, { type: "add-quest", quest: { title: "Walk" } }, "add");
    const id = player(s).campaigns[0]!.quests[0]!.id;
    s = send(s, { type: "choose-mission", questId: id }, "focus");
    for (let n = 0; n < 301; n++)
      s = send(
        s,
        { type: "quest-progress", questId: id, text: `Step ${n}` },
        `step-${n}`,
        now + n,
      );
    s = send(
      s,
      {
        type: "record-line",
        questId: id,
        speaker: "nico",
        text: "Good. Keep walking.",
      },
      "nico-line",
      now + 400,
    );
    const lines = player(s).campaigns[0]!.quests[0]!.lines;
    expect(lines.filter((line) => line.speaker === "hero")).toHaveLength(301);
    expect(lines[0]).toMatchObject({ speaker: "hero", text: "Step 0" });
    expect(lines.at(-1)).toMatchObject({
      speaker: "nico",
      text: "Good. Keep walking.",
    });
    expect(
      player(s).events.filter((event) => event.questId === id),
    ).toHaveLength(300);
    const restored = restoreGame(JSON.parse(serializeGame(s)), context("load"));
    expect(player(restored).campaigns[0]!.quests[0]!.lines).toEqual(lines);
    const other = send(s, { type: "add-player", name: "Second" }, "other");
    const second = other.players.find((hero) => hero.name === "Second");
    expect(second?.lines).toEqual([]);
    expect(
      second?.campaigns.some((campaign) =>
        campaign.quests.some((quest) => quest.lines.length > 0),
      ),
    ).toBe(false);
  });
  it("logs progress without completing or awarding rewards, replay safe", () => {
    let s = newGame(context());
    s = send(s, { type: "add-quest", quest: { title: "Walk" } });
    const id = player(s).campaigns[0]!.quests[0]!.id;
    s = send(
      s,
      { type: "quest-progress", questId: id, text: "Shoes on" },
      "progress",
    );
    const before = structuredClone(s);
    expect(
      send(
        s,
        { type: "quest-progress", questId: id, text: "Shoes on" },
        "progress",
      ),
    ).toEqual(before);
    expect(player(s).campaigns[0]!.quests[0]!.status).toBe("pending");
    expect(selectGame(s, now).xp).toBe(0);
  });
  it("learns a bounded support trait from recent distinct completions, once", () => {
    let s = newGame(context());
    for (const key of ["a", "b", "c"]) {
      const done = complete(s, key);
      s = send(
        done.s,
        { type: "reflect-quest", questId: done.id, text: "Small steps" },
        key,
      );
    }
    expect(
      player(s).sidekick.traits.filter((t) => t.source === "learned"),
    ).toHaveLength(1);
    expect(send(s, { type: "evolve-nico" })).toEqual(s);
    let old = newGame(context());
    for (const key of ["a", "b", "c"]) {
      const done = complete(old, key, now - 6 * 86400000);
      old = send(
        done.s,
        { type: "reflect-quest", questId: done.id, text: "Small steps" },
        key,
        now - 6 * 86400000,
      );
    }
    old.players[0]!.sidekick.traits = old.players[0]!.sidekick.traits.filter(
      (t) => t.source !== "learned",
    );
    old = send(old, { type: "evolve-nico" });
    expect(
      player(old).sidekick.traits.filter((t) => t.source === "learned"),
    ).toHaveLength(0);
  });
  it("keeps explicit player traits distinct from system and learned traits", () => {
    let s = newGame(context());
    s = send(s, { type: "set-nico-trait", text: "Be playful" });
    expect(player(s).sidekick.traits.map((t) => t.source)).toEqual([
      "system",
      "system",
      "player",
    ]);
    expect(send(s, { type: "set-nico-trait", text: "Be playful" })).toEqual(s);
  });
  it("uses a replaceable Effect model and propagates typed provider failure", async () => {
    const s = send(newGame(context()), { type: "name-hero", name: "Alex" });
    const ctx = getSidekickContext(s, now);
    expect(JSON.stringify(ctx)).not.toContain(s.activePlayerId);
    expect(
      await Effect.runPromise(
        nicoReplyRoutine(ctx, "celebrate").pipe(Effect.provide(mockNicoLayer)),
      ),
    ).toContain("Alex");
    const failed = nicoReplyRoutine(ctx, "meet").pipe(
      Effect.provideService(NicoModel, {
        reply: () => Effect.fail(new ModelError("offline")),
        propose: () => Effect.fail(new ModelError("offline")),
      }),
      Effect.result,
    );
    expect((await Effect.runPromise(failed))._tag).toBe("Failure");
  });
});
