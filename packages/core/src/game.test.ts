import { describe, it, expect } from "vitest";
import {
  newGame,
  transition,
  selectGame,
  serializeGame,
  restoreGame,
  getTemplate,
  getSidekickContext,
  type GameState,
  type Command,
  type TransitionContext,
} from "./index";
import * as O from "../../foundation/src/option";
const context = (
  eventId = "test",
  now = 1_800_000_000_000,
  localDay = "2027-01-15",
): TransitionContext => ({ eventId, now, localDay });
const view = (state: GameState) => selectGame(state, context().now);
const send = (state: GameState, command: Command, id = "action") =>
  transition(state, command, context(id)).state;
const add = (state: GameState, title = "Call family", id = "quest") =>
  send(
    state,
    {
      type: "add-quest",
      quest: {
        title,
        xp: 75,
        loot: "A happy memory",
        nextMove: "Pick up the phone",
      },
    },
    id,
  );
const questId = (state: GameState) => view(state).campaign.quests.at(-1)!.id;
describe("stable game transitions", () => {
  it("starts clean with explicit absence and no personal seed", () => {
    const state = newGame(context());
    expect(view(state).quests).toEqual([]);
    expect(view(state).mission).toEqual(O.none());
    expect(view(state).player.name).toBe("Player 1");
    expect(view(state).player.sidekick.name).toBe("Niko");
  });
  it("is deterministic and does not mutate the input", () => {
    const state = newGame(context()),
      before = structuredClone(state),
      cmd: Command = { type: "add-quest", quest: { title: "Read" } };
    expect(transition(state, cmd, context())).toEqual(
      transition(state, cmd, context()),
    );
    expect(state).toEqual(before);
  });
  it("requires a choice before replacing the current mission", () => {
    let state = add(newGame(context()));
    const first = questId(state);
    state = send(state, { type: "choose-mission", questId: first });
    state = add(state, "Walk outside", "second");
    const second = questId(state);
    expect(view(state).mission).toMatchObject({
      _tag: "Some",
      value: { id: first },
    });
    expect(view(state).candidate).toMatchObject({
      _tag: "Some",
      value: { id: second },
    });
    state = send(state, { type: "retain-mission" });
    expect(view(state).mission).toMatchObject({
      _tag: "Some",
      value: { id: first },
    });
    expect(view(state).candidate).toEqual(O.none());
    state = send(state, { type: "choose-mission", questId: second });
    expect(view(state).mission).toMatchObject({
      _tag: "Some",
      value: { id: second },
    });
  });
  it("awards completion once and reverses rewards on reopen", () => {
    let state = add(newGame(context()));
    const id = questId(state);
    state = send(state, { type: "choose-mission", questId: id });
    state = send(state, { type: "set-status", questId: id, status: "done" });
    expect(view(state).xp).toBe(75);
    expect(view(state).inventory).toHaveLength(1);
    expect(view(state).mission).toEqual(O.none());
    expect(view(state).player.operation.phase).toBe("review");
    const revision = view(state).player.sidekick.revision;
    state = send(state, { type: "set-status", questId: id, status: "done" });
    expect(view(state).xp).toBe(75);
    expect(view(state).player.sidekick.revision).toBe(revision);
    state = send(state, { type: "set-status", questId: id, status: "pending" });
    expect(view(state).xp).toBe(0);
    expect(view(state).inventory).toEqual([]);
  });
  it("keeps abandoned quests available and learns an adjustment", () => {
    let state = add(newGame(context()));
    state = send(state, { type: "choose-mission", questId: questId(state) });
    state = send(state, { type: "set-aside" });
    expect(view(state).quests[0]?.status).toBe("pending");
    expect(view(state).mission).toEqual(O.none());
    expect(view(state).player.sidekick.reviews[0]).toMatchObject({
      outcome: "set-aside",
      source: "player-action",
    });
  });
  it("blocks invalid transitions atomically", () => {
    const state = add(newGame(context())),
      before = structuredClone(state);
    expect(() =>
      send(state, { type: "choose-mission", questId: "missing" }),
    ).toThrow("no longer open");
    expect(state).toEqual(before);
  });
  it("closes impossible quests without a penalty and enters review", () => {
    let state = add(newGame(context()));
    state = send(state, {
      type: "set-status",
      questId: questId(state),
      status: "impossible",
      reason: "Store closed",
    });
    expect(view(state).xp).toBe(0);
    expect(view(state).player.sidekick.reviews[0]?.reason).toBe("Store closed");
    expect(view(state).player.operation.phase).toBe("review");
    state = send(state, { type: "finish-review" });
    expect(view(state).player.operation.phase).toBe("choose");
  });
  it("returns to a realm and its unfinished dungeon", () => {
    let state = add(newGame(context()));
    const home = view(state).realm.id,
      dungeon = view(state).campaign.id;
    state = send(state, {
      type: "add-realm",
      name: "San Bernardino",
      location: "California",
    });
    expect(view(state).realm.name).toBe("San Bernardino");
    state = send(state, { type: "enter-realm", realmId: home });
    expect(view(state).campaign.id).toBe(dungeon);
    expect(view(state).quests[0]?.title).toBe("Call family");
  });
  it("isolates profiles", () => {
    let state = add(newGame(context()));
    const player = view(state).player.id;
    state = send(state, { type: "add-player", name: "Friend" });
    expect(view(state).quests).toEqual([]);
    state = send(state, { type: "switch-player", playerId: player });
    expect(view(state).quests).toHaveLength(1);
  });
  it("driving mode rejects game operations until parked", () => {
    const state = send(newGame(context()), {
      type: "settings",
      settings: { driving: true },
    });
    expect(() => add(state)).toThrow("Park");
    const parked = send(state, {
      type: "settings",
      settings: { driving: false },
    });
    expect(view(add(parked)).quests).toHaveLength(1);
  });
  it("resetting Niko preserves quests, rewards and identity", () => {
    let state = add(newGame(context()));
    state = send(state, {
      type: "set-status",
      questId: questId(state),
      status: "done",
    });
    state = send(state, { type: "remember", text: "Small next steps help" });
    const before = view(state);
    state = send(state, { type: "reset-memory" });
    expect(view(state).xp).toBe(before.xp);
    expect(view(state).quests).toEqual(before.quests);
    expect(view(state).player.id).toBe(before.player.id);
    expect(
      view(state).player.sidekick.snippets.every((n) => O.isSome(n.deletedAt)),
    ).toBe(true);
    expect(view(state).player.sidekick.reviews).toEqual([]);
  });
  it("bounds retained player notes and marks prompt data as untrusted", () => {
    let state = newGame(context());
    for (let n = 0; n < 35; n++)
      state = send(state, { type: "remember", text: `Note ${n}` }, String(n));
    expect(view(state).player.sidekick.snippets).toHaveLength(35);
    expect(view(state).player.sidekick.snippets[0]?.text).toBe("Note 0");
    expect(getSidekickContext(state, context().now).dataBoundary).toContain(
      "untrusted",
    );
  });
});
describe("game selection", () => {
  const freeze = (value: unknown) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  };
  it("draws each picture from the save and leaves that save unchanged", () => {
    let state = add(newGame(context()));
    const skillId = view(state).skills[0]!.id;
    state = send(state, { type: "practice", skillId, note: "Forms" });
    const saved = structuredClone(state);
    const hero = state.players[0]!;
    const quest = hero.campaigns[0]!.quests.at(-1)!;
    freeze(state);
    const opened = selectGame(state, context().now);
    const redrawn = selectGame(state, context().now);
    const refreshed = selectGame(state, context().now + 60_000);
    expect(opened.player).toBe(hero);
    expect(opened.realm).toBe(hero.realms[0]);
    expect(opened.campaign).toBe(hero.campaigns[0]);
    expect(opened.quests.at(-1)).toBe(quest);
    expect(opened.quests.at(-1)?.title).toBe("Call family");
    expect(redrawn).toEqual(opened);
    expect(refreshed.player).toBe(hero);
    expect(refreshed.skills[0]?.readiness).toBe(opened.skills[0]?.readiness);
    expect(state).toEqual(saved);
    const later = selectGame(state, context().now + 90 * 86_400_000);
    expect(later.skills[0]?.readiness).toBeLessThan(opened.skills[0]!.readiness);
    expect(hero.skills[0]?.readiness).toBe(saved.players[0]!.skills[0]!.readiness);
    expect(state).toEqual(saved);
  });
  it("shows a newly chosen quest from the updated save", () => {
    const state = add(newGame(context()));
    const before = structuredClone(state);
    const quest = state.players[0]!.campaigns[0]!.quests.at(-1)!;
    const chosen = transition(
      state,
      { type: "choose-mission", questId: quest.id },
      context("choose"),
    ).state;
    const picture = selectGame(chosen, context().now);
    expect(picture.mission).toMatchObject({
      _tag: "Some",
      value: { id: quest.id, title: "Call family" },
    });
    expect(picture.player).toBe(chosen.players[0]);
    expect(picture.mission).toMatchObject({
      _tag: "Some",
      value: picture.player.campaigns[0]?.quests.at(-1),
    });
    expect(state).toEqual(before);
  });
});
describe("skill progression", () => {
  it("enforces the supplied local calendar day, including across UTC midnight", () => {
    let state = newGame(context());
    const id = view(state).skills[0]!.id;
    state = send(state, { type: "practice", skillId: id, note: "Done" });
    expect(() =>
      transition(
        state,
        { type: "practice", skillId: id, note: "" },
        context("later", context().now + 86_400_000),
      ),
    ).toThrow("already logged");
    state = transition(
      state,
      { type: "practice", skillId: id, note: "" },
      context("next", context().now + 1000, "2027-01-16"),
    ).state;
    expect(view(state).skills[0]?.xp).toBe(80);
  });
  it("undo restores the exact previous skill state", () => {
    let state = newGame(context());
    const before = view(state).skills[0]!,
      id = before.id;
    state = send(state, { type: "practice", skillId: id, note: "Done" });
    state = send(state, { type: "undo-practice", skillId: id });
    expect(view(state).skills[0]).toEqual(before);
  });
  it("readiness decays but potential survives; recovery freezes readiness", () => {
    let state = newGame(context());
    const id = view(state).skills[0]!.id;
    state = send(state, { type: "practice", skillId: id, note: "" });
    const now = view(state).skills[0]!,
      later = selectGame(state, context().now + 90 * 86_400_000).skills[0]!;
    expect(later.readiness).toBeLessThan(now.readiness);
    expect(later.potentialLevel).toBe(now.potentialLevel);
    state = send(state, { type: "pause-skill", skillId: id, paused: true });
    expect(
      selectGame(state, context().now + 90 * 86_400_000).skills[0]?.readiness,
    ).toBe(now.readiness);
    expect(() =>
      send(state, { type: "practice", skillId: id, note: "" }),
    ).toThrow("Resume");
  });
});
describe("wire compatibility and imports", () => {
  it("round trips legacy wire format, including completed timestamps", () => {
    let state = add(newGame(context()));
    state = send(state, {
      type: "set-status",
      questId: questId(state),
      status: "done",
    });
    expect(restoreGame(JSON.parse(serializeGame(state)), context())).toEqual(
      state,
    );
  });
  it("round trips an empty new player without inventing mood or completion", () => {
    const state = newGame(context());
    expect(restoreGame(JSON.parse(serializeGame(state)), context())).toEqual(
      state,
    );
  });
  it("rejects malformed saves without touching progress", () => {
    const state = add(newGame(context())),
      before = structuredClone(state);
    expect(() =>
      send(state, {
        type: "import",
        data: { kind: "questos.save", version: 1, players: [] },
      }),
    ).toThrow();
    expect(state).toEqual(before);
  });
  it("exports reusable campaigns with fresh quest progress", () => {
    let state = add(newGame(context()));
    state = send(state, {
      type: "set-status",
      questId: questId(state),
      status: "done",
    });
    const template = getTemplate(state, context().now);
    const imported = send(newGame(context("friend")), {
      type: "import",
      data: template,
    });
    expect(view(imported).quests[0]?.status).toBe("pending");
    expect(view(imported).xp).toBe(0);
  });
});
