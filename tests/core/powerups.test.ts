import { expect, it } from "vitest";
import {
  newGame,
  transition,
  restoreGame,
  serializeGame,
  activeNicoPowerup,
  POWERUP_DURATION_MS,
} from "../../packages/core/src/index";
import * as O from "../../packages/foundation/src/option";
const ctx = { now: 1800000000000, eventId: "power", localDay: "2027-01-15" };
const fresh = () => newGame(ctx);
it("grants three once-only default boosts and preserves inventory across saves", () => {
  const game = fresh();
  const nico = game.players[0]!.sidekick;
  expect(nico.powerups.instances).toHaveLength(3);
  expect(
    nico.powerups.instances.every(
      (x) => x.charges === 1 && x.nicoId === nico.id,
    ),
  ).toBe(true);
  expect(
    restoreGame(JSON.parse(serializeGame(game)), ctx).players[0]!.sidekick
      .powerups,
  ).toEqual(nico.powerups);
});
it("activates one boost, charges only a successful response and replay is harmless", () => {
  const game = fresh();
  const id = game.players[0]!.sidekick.powerups.instances[0]!.id;
  const active = transition(game, { type: "activate-powerup", id }, ctx).state;
  expect(game.players[0]!.sidekick.powerups.active).toEqual(O.none());
  expect(
    O.isSome(activeNicoPowerup(active.players[0]!.sidekick, ctx.now)),
  ).toBe(true);
  const used = transition(
    active,
    {
      type: "consume-powerup",
      expectedActivatedAt: ctx.now,
      instanceId: id,
      requestId: "reply",
    },
    ctx,
  ).state;
  expect(used.players[0]!.sidekick.powerups.instances[0]!.charges).toBe(0);
  expect(
    transition(
      used,
      {
        type: "consume-powerup",
        expectedActivatedAt: ctx.now,
        instanceId: id,
        requestId: "reply",
      },
      ctx,
    ).state,
  ).toEqual(used);
  expect(() => transition(used, { type: "activate-powerup", id }, ctx)).toThrow(
    "unavailable",
  );
});
it("expiry, cancellation and replacing a boost do not spend charges", () => {
  let game = fresh();
  const [first, second] = game.players[0]!.sidekick.powerups.instances;
  game = transition(
    game,
    { type: "activate-powerup", id: first!.id },
    ctx,
  ).state;
  expect(
    activeNicoPowerup(game.players[0]!.sidekick, ctx.now + POWERUP_DURATION_MS),
  ).toEqual(O.none());
  expect(() =>
    transition(
      game,
      {
        type: "consume-powerup",
        expectedActivatedAt: ctx.now,
        instanceId: first!.id,
        requestId: "late",
      },
      { ...ctx, now: ctx.now + POWERUP_DURATION_MS },
    ),
  ).toThrow("expired");
  game = transition(
    game,
    { type: "activate-powerup", id: second!.id },
    ctx,
  ).state;
  expect(() =>
    transition(
      game,
      {
        type: "consume-powerup",
        expectedActivatedAt: ctx.now,
        instanceId: first!.id,
        requestId: "stale",
      },
      ctx,
    ),
  ).toThrow("changed");
  game = transition(game, { type: "deactivate-powerup" }, ctx).state;
  expect(
    game.players[0]!.sidekick.powerups.instances.every((x) => x.charges === 1),
  ).toBe(true);
});
it("custom instructions remain portable data, validate at boundary and cannot target another Niko", () => {
  const game = fresh();
  const command = {
    type: "create-powerup" as const,
    name: "Focus",
    description: "A calmer minute",
    context: "Too much work",
    instructions: "Choose one small action.",
  };
  const next = transition(game, command, ctx).state;
  expect(
    next.players[0]!.sidekick.powerups.instances[3]!.template,
  ).toMatchObject({ kind: "life.powerup", version: 1, name: "Focus" });
  expect(
    transition(next, command, ctx).state.players[0]!.sidekick.powerups
      .instances,
  ).toHaveLength(4);
  expect(() =>
    transition(game, { ...command, instructions: " " }, ctx),
  ).toThrow();
  expect(() =>
    transition(game, { type: "activate-powerup", id: "another-nico" }, ctx),
  ).toThrow("unavailable");
});
it("old saves migrate once; malformed inventories reject without resetting charges", () => {
  const raw = JSON.parse(serializeGame(fresh()));
  delete raw.players[0].sidekick.powerups;
  const migrated = restoreGame(raw, ctx);
  expect(migrated.players[0]!.sidekick.powerups.instances).toHaveLength(3);
  raw.players[0].sidekick.powerups = { version: 1, instances: "bad" };
  expect(() => restoreGame(raw, ctx)).toThrow("history");
});
it("imports cannot restore consumed charges or mint charges for a new hero", () => {
  const original = fresh();
  const id = original.players[0]!.sidekick.powerups.instances[0]!.id;
  const active = transition(
    original,
    { type: "activate-powerup", id },
    ctx,
  ).state;
  const used = transition(
    active,
    {
      type: "consume-powerup",
      expectedActivatedAt: ctx.now,
      instanceId: id,
      requestId: "used",
    },
    ctx,
  ).state;
  const imported = transition(
    used,
    { type: "import", data: JSON.parse(serializeGame(original)) },
    ctx,
  ).state;
  expect(imported.players[0]!.sidekick.powerups.instances[0]!.charges).toBe(0);
  const other = newGame({ ...ctx, eventId: "other" });
  const added = transition(
    used,
    { type: "import", data: JSON.parse(serializeGame(other)) },
    ctx,
  ).state;
  expect(
    added.players[0]!.sidekick.powerups.instances.every((x) => x.charges === 0),
  ).toBe(true);
});

it("rejects a response from a previous activation of the same boost", () => {
  const original = fresh();
  const id = original.players[0]!.sidekick.powerups.instances[0]!.id;
  const active = transition(
    original,
    { type: "activate-powerup", id },
    ctx,
  ).state;
  const again = transition(
    active,
    { type: "activate-powerup", id },
    { ...ctx, now: ctx.now + 1 },
  ).state;
  expect(() =>
    transition(
      again,
      {
        type: "consume-powerup",
        instanceId: id,
        requestId: "stale",
        expectedActivatedAt: ctx.now,
      },
      { ...ctx, now: ctx.now + 2 },
    ),
  ).toThrow("changed");
  expect(again.players[0]!.sidekick.powerups.instances[0]!.charges).toBe(1);
});
