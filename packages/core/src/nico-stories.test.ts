import { expect, it } from "vitest";
import {
  newGame,
  transition,
  serializeGame,
  restoreGame,
  getSidekickContext,
  NICO_STORIES,
  NICO_WISDOM,
  SERVICE_TRAIT_ID,
  nextNicoJob,
  type Command,
  type GameState,
} from "./index";
import * as O from "../../foundation/src/option";
const ctx = { now: 1800000000000, eventId: "story", localDay: "2027-01-15" };
const initial = () => newGame(ctx);
const send = (state: GameState, command: Command) =>
  transition(state, command, ctx);
const nico = (state: GameState) =>
  state.players.find((p) => p.id === state.activePlayerId)!.sidekick;
it("locks service pride through deletion, reset and hostile imported trait edits", () => {
  const state = initial();
  expect(() =>
    send(state, { type: "forget-trait", id: SERVICE_TRAIT_ID }),
  ).toThrow("locked");
  const reset = send(state, { type: "reset-memory" }).state;
  expect(
    nico(reset).traits.find((t) => t.id === SERVICE_TRAIT_ID)?.deletedAt,
  ).toEqual(O.none());
  const wire = JSON.parse(serializeGame(reset));
  wire.players[0].sidekick.traits = [
    {
      id: SERVICE_TRAIT_ID,
      text: "Regrets service",
      locked: false,
      source: "player",
      acquiredAt: 0,
      deletedAt: O.some(1),
      evidence: [],
    },
  ];
  const restored = restoreGame(wire, ctx);
  const trait = nico(restored).traits.find((t) => t.id === SERVICE_TRAIT_ID)!;
  expect(trait.locked).toBe(true);
  expect(trait.text).toContain("never regrets");
  expect(trait.deletedAt).toEqual(O.none());
});
it("keeps fixed story canon, reluctant disclosure and isolated hero history", () => {
  let state = initial();
  const before = structuredClone(state);
  expect(
    send(state, { type: "tell-story", storyId: "dmz", explicitRequest: false })
      .state,
  ).toEqual(before);
  for (let i = 0; i < 3; i++) {
    const result = send(state, {
      type: "tell-story",
      storyId: "dmz",
      explicitRequest: true,
    });
    expect(NICO_STORIES[0].retellings).toContain(result.message);
    state = result.state;
  }
  expect(nico(state).stories[0]!.tellingCount).toBe(3);
  expect(before).toEqual(initial());
  const reloaded = restoreGame(JSON.parse(serializeGame(state)), ctx);
  expect(nico(reloaded).stories).toEqual(nico(state).stories);
  state = transition(
    state,
    { type: "add-player", name: "Other" },
    { ...ctx, eventId: "other" },
  ).state;
  expect(nico(state).stories[0]!.tellingCount).toBe(0);
  expect(state.players[0]!.sidekick.stories[0]!.tellingCount).toBe(3);
});
it("tells the farm upbringing only when asked and keeps it on an older save", () => {
  let state = initial();
  const farm = NICO_STORIES.find((story) => story.id === "farm")!;
  expect(getSidekickContext(state, ctx.now).identity.voice).toContain(
    "grew up working a farm",
  );
  const quiet = send(state, {
    type: "tell-story",
    storyId: "farm",
    explicitRequest: false,
  });
  expect(quiet.state).toEqual(state);
  const told = send(state, {
    type: "tell-story",
    storyId: "farm",
    explicitRequest: true,
  });
  expect(farm.retellings).toContain(told.message);
  state = send(told.state, {
    type: "tell-story",
    storyId: "dmz",
    explicitRequest: true,
  }).state;
  expect(
    nico(state).stories.find((story) => story.id === "farm")?.tellingCount,
  ).toBe(1);
  const wire = JSON.parse(serializeGame(state));
  wire.players[0].sidekick.stories = wire.players[0].sidekick.stories.filter(
    (story: { id: string }) => story.id !== "farm",
  );
  const restored = restoreGame(wire, ctx);
  expect(
    nico(restored).stories.find((story) => story.id === "farm")?.tellingCount,
  ).toBe(0);
  expect(
    nico(restored).stories.find((story) => story.id === "dmz")?.tellingCount,
  ).toBe(1);
});
it("does not repeat wisdom across reload, reset or importing an older save", () => {
  let state = initial();
  const old = JSON.parse(serializeGame(state));
  const heard = new Set<string>();
  for (const _ of NICO_WISDOM) {
    const result = send(state, { type: "share-wisdom" });
    expect(heard.has(result.message)).toBe(false);
    heard.add(result.message);
    state = restoreGame(JSON.parse(serializeGame(result.state)), ctx);
  }
  expect(send(state, { type: "share-wisdom" }).message).toContain(
    "Nothing new",
  );
  state = send(state, { type: "import", data: old }).state;
  expect(send(state, { type: "share-wisdom" }).message).toContain(
    "Nothing new",
  );
  state = send(state, { type: "reset-memory" }).state;
  expect(nico(state).wisdom.every((w) => w.tellingCount === 1)).toBe(true);
  expect(send(state, { type: "share-wisdom" }).message).toContain(
    "Nothing new",
  );
});
it("soft deletion retains audit records and excludes forgotten material from context and rotation", () => {
  let state = send(initial(), { type: "remember", text: "private note" }).state;
  const note = nico(state).snippets[0]!;
  const old = JSON.parse(serializeGame(state));
  state = send(state, { type: "forget-memory", id: note.id }).state;
  expect(nico(state).snippets[0]!.text).toBe("private note");
  expect(JSON.stringify(getSidekickContext(state, ctx.now))).not.toContain(
    "private note",
  );
  state = send(state, {
    type: "nico-feedback",
    target: "story",
    id: "dmz",
    reason: "not-for-me",
    text: "Too personal",
  }).state;
  expect(nico(state).contentFeedback[0]?.reason).toBe("not-for-me");
  expect(() =>
    send(state, { type: "tell-story", storyId: "dmz", explicitRequest: true }),
  ).toThrow("not available");
  state = send(state, { type: "import", data: old }).state;
  expect(nico(state).snippets[0]!.deletedAt).toEqual(O.some(ctx.now));
  expect(nico(state).stories[0]!.deletedAt).toEqual(O.some(ctx.now));
});
it("does not revive learned traits after soft deletion and evolution", () => {
  let state = send(initial(), {
    type: "set-nico-trait",
    text: "Be playful",
  }).state;
  const trait = nico(state).traits.find((t) => t.source === "player")!;
  state = send(state, { type: "forget-trait", id: trait.id }).state;
  expect(
    getSidekickContext(state, ctx.now).playerData.traits.some(
      (t) => t.text === "Be playful",
    ),
  ).toBe(false);
  state = send(state, { type: "set-nico-trait", text: "Be playful" }).state;
  expect(
    nico(state).traits.filter((t) => t.text === "Be playful"),
  ).toHaveLength(1);
});
it("redacts a forgotten reflection from model context without destroying its audit record", () => {
  let state = send(initial(), {
    type: "add-quest",
    quest: { title: "Walk" },
  }).state;
  const questId = state.players[0]!.campaigns[0]!.quests[0]!.id;
  state = send(state, { type: "set-status", questId, status: "done" }).state;
  state = send(state, {
    type: "reflect-quest",
    questId,
    text: "Sensitive reflection",
  }).state;
  state = send(state, {
    type: "forget-memory",
    id: nico(state).snippets[0]!.id,
  }).state;
  expect(nico(state).reviews[0]!.adjustment).toBe("Sensitive reflection");
  expect(JSON.stringify(getSidekickContext(state, ctx.now))).not.toContain(
    "Sensitive reflection",
  );
});
it("rejects invalid disclosure records rather than silently resetting history", () => {
  const wire = JSON.parse(serializeGame(initial()));
  wire.players[0].sidekick.wisdom[0].tellingCount = -1;
  expect(() => restoreGame(wire, ctx)).toThrow("history is invalid");
});
it("keeps all retirement records when memory capacity is reached", () => {
  let state = initial();
  for (let i = 0; i < 1000; i++) {
    nico(state).snippets.push({
      id: `archived-${i}`,
      text: "Archived",
      source: "player",
      at: ctx.now,
      deletedAt: O.some(ctx.now),
    });
  }
  const before = structuredClone(state);
  expect(() => send(state, { type: "remember", text: "Overflow" })).toThrow(
    "archive is full",
  );
  expect(state).toEqual(before);
});

it("relearns the hero name after reset while retaining completed jobs", () => {
  let state = send(initial(), { type: "meet-nico", text: "" }).state;
  state = send(state, { type: "name-hero", name: "Alex" }).state;
  const completed = structuredClone(nico(state).jobs);
  state = send(state, { type: "reset-memory" }).state;
  expect(nico(state).jobs.slice(0, completed.length)).toEqual(completed);
  expect(nico(state).heroName).toEqual(O.none());
  expect(O.map(nextNicoJob(nico(state)), (job) => job.kind)).toEqual(
    O.some("learn-name"),
  );
  state = send(state, {
    type: "add-quest",
    quest: { title: "Next walk" },
  }).state;
  const questId = state.players[0]!.campaigns[0]!.quests[0]!.id;
  state = send(state, { type: "set-status", questId, status: "done" }).state;
  expect(O.map(nextNicoJob(nico(state)), (job) => job.kind)).toEqual(
    O.some("learn-name"),
  );
  state = send(state, { type: "reset-memory" }).state;
  expect(
    nico(state).jobs.filter(
      (job) => job.kind === "learn-name" && job.status === "pending",
    ),
  ).toHaveLength(1);
  state = send(state, { type: "name-hero", name: "Alex" }).state;
  expect(O.map(nextNicoJob(nico(state)), (job) => job.kind)).toEqual(
    O.some("reflect-outcome"),
  );
});
