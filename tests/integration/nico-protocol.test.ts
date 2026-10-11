import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
import {
  mockNicoLayer,
  NicoModel,
  type NicoChatRequest,
} from "../../packages/application/src/nico-model";
import {
  NICO_ROUTINE_JSON_SCHEMA,
  runNicoChatRoutine,
  validateNicoProposal,
} from "../../packages/application/src/routine-protocol";
import * as O from "../../packages/foundation/src/option";

async function setup() {
  let n = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1800000000000 + n,
    eventId: `protocol-${n++}`,
    localDay: "2027-01-15",
  }));
  await controller.load();
  return controller;
}
function player(controller: Awaited<ReturnType<typeof setup>>) {
  const state = controller.getSnapshot().game;
  if (O.isNone(state)) throw Error("Expected game");
  const hero = state.value.players.find(
    (p) => p.id === state.value.activePlayerId,
  );
  if (!hero) throw Error("Expected hero");
  return hero;
}
const invoke = (routine: string, parameters: Record<string, unknown>) => ({
  version: 1,
  kind: "invoke",
  invocation: { routine, parameters },
});
const proposalLayer = (proposal: unknown) =>
  Layer.succeed(NicoModel)({
    reply: () => Effect.succeed("Unused"),
    propose: () => Effect.succeed(proposal),
  });

describe("Niko JSON routine boundary", () => {
  it("prefers explicitly named content over the previous reply and never guesses multiple targets", async () => {
    const controller = await setup();
    controller.send({ type: "remember", text: "Mornings work best" });
    const story = await Effect.runPromise(
      runNicoChatRoutine(controller, "Please tell me The Korean DMZ").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    const ambiguous = await Effect.runPromise(
      runNicoChatRoutine(
        controller,
        "Forget Mornings work best and The Korean DMZ",
        story.target,
      ).pipe(Effect.provide(mockNicoLayer)),
    );
    expect(ambiguous.invoked).toBe(false);
    await Effect.runPromise(
      runNicoChatRoutine(
        controller,
        "Forget Mornings work best",
        story.target,
      ).pipe(Effect.provide(mockNicoLayer)),
    );
    expect(player(controller).sidekick.snippets[0]?.deletedAt).toEqual(
      expect.objectContaining({ _tag: "Some" }),
    );
    expect(
      player(controller).sidekick.stories.find((s) => s.id === "dmz")
        ?.deletedAt,
    ).toEqual(O.none());
  });
  it("understands tell me some wisdom without treating it as a story request", async () => {
    const controller = await setup();
    const wisdom = await Effect.runPromise(
      runNicoChatRoutine(controller, "Tell me some wisdom").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(wisdom.invoked).toBe(true);
    expect(wisdom.target).toEqual(O.some({ kind: "wisdom", id: "one-step" }));
  });
  it("advertises a serializable strict schema and rejects unknown routines, extra IDs and invalid params", async () => {
    expect(JSON.parse(JSON.stringify(NICO_ROUTINE_JSON_SCHEMA))).toEqual(
      NICO_ROUTINE_JSON_SCHEMA,
    );
    for (const invalid of [
      invoke("eval", { code: "delete everything" }),
      invoke("remember", { text: "hello", playerId: "someone-else" }),
      invoke("tell-story", { storyId: "dmz", explicitRequest: false }),
      invoke("forget-memory", { id: 4 }),
      { ...invoke("remember", { text: "hello" }), heroId: "other" },
    ]) {
      await expect(
        Effect.runPromise(validateNicoProposal(invalid)),
      ).rejects.toThrow("invalid routine proposal");
    }
  });
  it("runs simulator memory actions through the controller and persists soft deletion", async () => {
    const controller = await setup();
    const result = await Effect.runPromise(
      runNicoChatRoutine(controller, "Remember I prefer mornings").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(result.invoked).toBe(true);
    expect(O.isSome(result.target)).toBe(true);
    const removed = await Effect.runPromise(
      runNicoChatRoutine(controller, "Forget that memory", result.target).pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(removed.invoked).toBe(true);
    expect(removed.target).toEqual(O.none());
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello", removed.target).pipe(
          Effect.provide(mockNicoLayer),
        ),
      ),
    ).resolves.toMatchObject({ invoked: false });
    expect(player(controller).sidekick.snippets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "I prefer mornings",
          deletedAt: expect.objectContaining({ _tag: "Some" }),
        }),
      ]),
    );
    await controller.flush();
  });
  it("asks for a target rather than guessing an ambiguous deletion", async () => {
    const controller = await setup();
    controller.send({ type: "remember", text: "First" });
    controller.send({ type: "remember", text: "Second" });
    const before = controller.getSnapshot().game;
    const result = await Effect.runPromise(
      runNicoChatRoutine(controller, "Let it go").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(result.invoked).toBe(false);
    expect(result.text).toContain("Which");
    expect(controller.getSnapshot().game).toBe(before);
  });
  it("keeps locked service identity protected even from a model invocation", async () => {
    const controller = await setup();
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello").pipe(
          Effect.provide(
            proposalLayer(
              invoke("forget-trait", { id: "delta-force-veteran" }),
            ),
          ),
        ),
      ),
    ).rejects.toThrow("locked");
    expect(
      player(controller).sidekick.traits.find(
        (t) => t.id === "delta-force-veteran",
      )?.deletedAt,
    ).toEqual(O.none());
  });
  it("never gives the model a hero or Niko identity", async () => {
    const controller = await setup();
    const hero = player(controller);
    let observed = "";
    const layer = Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: (request: NicoChatRequest) => {
        observed = JSON.stringify(request);
        return Effect.succeed({ version: 1, kind: "say", text: "Hello" });
      },
    });
    await Effect.runPromise(
      runNicoChatRoutine(controller, "Hello").pipe(Effect.provide(layer)),
    );
    expect(observed).not.toContain(hero.id);
    expect(observed).not.toContain(hero.sidekick.id);
    expect(observed).toContain('"routineSchema"');
  });
  it("rejects nonexistent scoped targets without changing state", async () => {
    const controller = await setup();
    const before = controller.getSnapshot().game;
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "Hello").pipe(
          Effect.provide(
            proposalLayer(
              invoke("forget-memory", { id: "other-heros-memory" }),
            ),
          ),
        ),
      ),
    ).rejects.toThrow("does not belong");
    expect(controller.getSnapshot().game).toBe(before);
  });
  it("rejects delayed proposals after switching heroes", async () => {
    const controller = await setup();
    const layer = Layer.succeed(NicoModel)({
      reply: () => Effect.succeed("unused"),
      propose: () =>
        Effect.sync(() => {
          controller.send({ type: "add-player", name: "Another hero" });
          return invoke("remember", { text: "Must not leak" });
        }),
    });
    await expect(
      Effect.runPromise(
        runNicoChatRoutine(controller, "remember something").pipe(
          Effect.provide(layer),
        ),
      ),
    ).rejects.toThrow("hero changed");
    expect(player(controller).sidekick.snippets).toHaveLength(0);
  });
  it("tells canonical stories only on explicit request and provides a feedback target", async () => {
    const controller = await setup();
    const first = await Effect.runPromise(
      runNicoChatRoutine(controller, "tell me a story").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(first.invoked).toBe(false);
    const next = await Effect.runPromise(
      runNicoChatRoutine(controller, "Please tell me The Korean DMZ").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(next.target).toEqual(O.some({ kind: "story", id: "dmz" }));
    expect(next.text).toContain("DMZ");
    expect(
      player(controller).sidekick.stories.find((s) => s.id === "dmz")
        ?.tellingCount,
    ).toBe(1);
  });
  it("keeps the farm upbringing private until the hero asks for that story", async () => {
    const controller = await setup();
    const asked = await Effect.runPromise(
      runNicoChatRoutine(controller, "Were you a farmer?").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(asked.invoked).toBe(false);
    expect(asked.text).toContain("grew up working a farm");
    expect(
      player(controller).sidekick.stories.find((s) => s.id === "farm")
        ?.tellingCount,
    ).toBe(0);
    const told = await Effect.runPromise(
      runNicoChatRoutine(controller, "Please tell me Growing up").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(told.target).toEqual(O.some({ kind: "story", id: "farm" }));
    expect(told.text).toContain("farm");
    expect(
      player(controller).sidekick.stories.find((s) => s.id === "farm")
        ?.tellingCount,
    ).toBe(1);
  });
  it("rotates wisdom once and records categorical feedback as a soft deletion", async () => {
    const controller = await setup();
    const wisdom = await Effect.runPromise(
      runNicoChatRoutine(controller, "Some wisdom please").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(O.isSome(wisdom.target)).toBe(true);
    if (O.isNone(wisdom.target)) throw Error("Expected target");
    const wisdomId = wisdom.target.value.id;
    await Effect.runPromise(
      runNicoChatRoutine(controller, "not for me").pipe(
        Effect.provide(
          proposalLayer(
            invoke("nico-feedback", {
              target: "wisdom",
              id: wisdomId,
              reason: "not-for-me",
              text: "Too obvious",
            }),
          ),
        ),
      ),
    );
    const next = await Effect.runPromise(
      runNicoChatRoutine(controller, "More wisdom").pipe(
        Effect.provide(mockNicoLayer),
      ),
    );
    expect(next.text).not.toBe(wisdom.text);
    expect(
      player(controller).sidekick.wisdom.find((w) => w.id === wisdomId)
        ?.deletedAt,
    ).toEqual(expect.objectContaining({ _tag: "Some" }));
  });
});
