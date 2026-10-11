import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
import {
  mockNicoLayer,
  NicoModel,
  ModelError,
} from "../../packages/application/src/nico-model";
import { runNicoChatRoutine } from "../../packages/application/src/routine-protocol";
import * as O from "../../packages/foundation/src/option";
const setup = async () => {
  let n = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1800000000000 + n,
    eventId: `power-${n++}`,
    localDay: "2027-01-15",
  }));
  await controller.load();
  const state = controller.getSnapshot().game;
  if (O.isNone(state)) throw Error("missing");
  const boost = state.value.players[0]!.sidekick.powerups.instances[1]!;
  controller.send({ type: "activate-powerup", id: boost.id });
  return { controller, boost };
};
describe("power-up conversation", () => {
  it("uses the active power-up context and consumes it only after a successful reply", async () => {
    const { controller } = await setup();
    const result = await Effect.runPromise(
      runNicoChatRoutine(controller, "Help me choose").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(result.text).toContain("Zero smiles");
    expect(O.isNone(controller.readActiveNicoPowerup())).toBe(true);
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw Error("missing");
    expect(game.value.players[0]!.sidekick.powerups.instances[1]!.charges).toBe(
      0,
    );
    expect(game.value.players[0]!.energy.requestIds).toHaveLength(1);
  });
  it("keeps a power-up and energy when the provider fails", async () => {
    const { controller } = await setup();
    const layer = Layer.succeed(NicoModel)({
      propose: () => Effect.fail(new ModelError("offline")),
      reply: () => Effect.succeed("unused"),
    });
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Help").pipe(Effect.provide(layer)),
      ),
    ).rejects.toMatchObject({ _tag: "ModelError" });
    const boost = controller.readActiveNicoPowerup();
    expect(O.isSome(boost) && boost.value.charges).toBe(1);
  });
  it("does not consume a power-up for free memory management", async () => {
    const { controller } = await setup();
    controller.send({ type: "remember", text: "test memory" });
    await Effect.runPromise(
      runNicoChatRoutine(controller, "Forget test memory").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(O.isSome(controller.readActiveNicoPowerup())).toBe(true);
  });
});
