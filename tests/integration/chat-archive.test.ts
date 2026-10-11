import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
import { createSnippetArchive } from "../../packages/application/src/snippet-archive";
import {
  mockNicoLayer,
  NicoModel,
} from "../../packages/application/src/nico-model";
import { runNicoChatRoutine } from "../../packages/application/src/routine-protocol";
import * as O from "../../packages/foundation/src/option";

const setup = async (failWrites = false) => {
  let index = 0;
  const data = new Map<string, string>();
  const storage = {
    read: (key: string) => O.fromNullable(data.get(key)),
    write: (key: string, value: string) => {
      if (failWrites) throw Error("quota");
      data.set(key, value);
    },
  };
  const persistence = createMemoryPersistence();
  const context = () => ({
    now: 1800000000000,
    eventId: `archive-${index++}`,
    localDay: "2027-01-15",
  });
  const controller = createGameController(
    persistence,
    context,
    createSnippetArchive(storage),
  );
  await controller.load();
  return {
    controller,
    restart: async () => {
      await controller.flush();
      const next = createGameController(
        persistence,
        context,
        createSnippetArchive(storage),
      );
      await next.load();
      return next;
    },
  };
};
describe("Niko conversation archive", () => {
  it("persists prompt and response across reload without feeding history back into the model", async () => {
    const { controller, restart } = await setup();
    await Effect.runPromise(
      runNicoChatRoutine(controller, "Remember my morning walks").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    const reloaded = await restart();
    const records = await Effect.runPromise(reloaded.listNicoGenerations());
    expect(records).toHaveLength(1);
    expect(JSON.parse(records[0]!.originalPrompt).chat).toBe(
      "Remember my morning walks",
    );
    expect(JSON.parse(records[0]!.originalText).invocation.routine).toBe(
      "remember",
    );
    expect(records[0]!.preparedText).toBe(records[0]!.originalText);
    reloaded.send({ type: "add-player", name: "Second" });
    expect(await Effect.runPromise(reloaded.listNicoGenerations())).toEqual([]);
  });
  it("retains rejected model output without applying it", async () => {
    const { controller } = await setup();
    const layer = Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: () =>
        Effect.succeed({
          version: 1,
          kind: "invoke",
          invocation: { routine: "grant-referral", parameters: {} },
        }),
    });
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello").pipe(Effect.provide(layer)),
      ),
    ).rejects.toMatchObject({ _tag: "RoutineProtocolError" });
    expect(
      await Effect.runPromise(controller.listNicoGenerations()),
    ).toHaveLength(1);
  });
  it("reports archive storage failure and leaves the proposed mutation unapplied", async () => {
    const { controller } = await setup(true);
    const before = controller.getSnapshot().game;
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Remember morning walks").pipe(
          Effect.provide(mockNicoLayer),
        ),
      ),
    ).rejects.toMatchObject({ _tag: "SnippetArchiveError" });
    expect(controller.getSnapshot().game).toEqual(before);
  });
});
