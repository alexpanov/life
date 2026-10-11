import { describe, it, expect } from "vitest";
import { Effect, Result } from "effect";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
import {
  executeFrontendRoutine,
  frontendRoutineRequest,
  FRONTEND_ROUTINE_JSON_SCHEMA,
} from "../../packages/application/src/frontend-routines";
import * as O from "../../packages/foundation/src/option";
async function setup() {
  let n = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1800000000000,
    eventId: `front-${n++}`,
    localDay: "2027-01-15",
  }));
  await controller.load();
  return controller;
}
const request = (
  routine: string,
  parameters: object,
  requestId = "request-1",
) => ({ version: 1, requestId, routine, parameters });
const run = (controller: Awaited<ReturnType<typeof setup>>, input: unknown) =>
  Effect.runSync(executeFrontendRoutine(controller, input));
const hero = (controller: Awaited<ReturnType<typeof setup>>) => {
  const game = controller.getSnapshot().game;
  if (O.isNone(game)) throw Error("No game");
  const p = game.value.players.find((p) => p.id === game.value.activePlayerId);
  if (!p) throw Error("No hero");
  return p;
};
describe("frontend JSON routines", () => {
  it("creates and activates a custom power-up while keeping consumption internal", async () => {
    const controller = await setup();
    run(
      controller,
      request(
        "create-powerup",
        {
          name: "Clarity",
          description: "One next step",
          context: "A difficult day",
          instructions: "Offer one practical next action.",
        },
        "create-powerup",
      ),
    );
    const created = hero(controller).sidekick.powerups.instances.find(
      (p) => p.template.name === "Clarity",
    );
    if (!created) throw Error("Power-up missing");
    expect(created.charges).toBe(1);
    run(
      controller,
      request("activate-powerup", { id: created.id }, "activate"),
    );
    expect(hero(controller).sidekick.powerups.active._tag).toBe("Some");
    run(controller, request("deactivate-powerup", {}, "deactivate"));
    expect(hero(controller).sidekick.powerups.active._tag).toBe("None");
    expect(
      hero(controller).sidekick.powerups.instances.find(
        (p) => p.id === created.id,
      )?.charges,
    ).toBe(1);
    const before = controller.getSnapshot();
    expect(() =>
      run(
        controller,
        request(
          "create-powerup",
          {
            name: "Clarity",
            description: "",
            context: "",
            instructions: "x".repeat(2001),
          },
          "oversized",
        ),
      ),
    ).toThrow("Invalid");
    expect(controller.getSnapshot()).toBe(before);
  });
  it("updates the subscribed central store and persists quest progress and completion", async () => {
    const controller = await setup();
    let changes = 0;
    controller.subscribe(() => changes++);
    run(controller, request("add-quest", { quest: { title: "Be present" } }));
    const quest = hero(controller)
      .campaigns.flatMap((c) => c.quests)
      .find((q) => q.title === "Be present");
    if (!quest) throw Error("No quest");
    run(
      controller,
      request(
        "quest-progress",
        { questId: quest.id, text: "Put the phone down" },
        "progress",
      ),
    );
    run(
      controller,
      request("set-status", { questId: quest.id, status: "done" }, "complete"),
    );
    expect(
      hero(controller)
        .campaigns.flatMap((c) => c.quests)
        .find((q) => q.id === quest.id)?.status,
    ).toBe("done");
    expect(changes).toBeGreaterThanOrEqual(3);
    await controller.flush();
    expect(controller.getSnapshot().storage).toBe("saved");
  });
  it("rejects private routines, authority injection, unknown fields and invalid parameters without mutation", async () => {
    const controller = await setup();
    const before = controller.getSnapshot();
    for (const input of [
      request("prepareLLMGeneratedSnippetForStorage", {}),
      request("consume-powerup", { instanceId: "x", requestId: "x" }),
      request("thinkThought", { text: "x" }),
      request("consume-nico-energy", { requestId: "spoof" }),
      request("grantVerifiedReferralRoutine", {}),
      request("import", { data: {} }),
      { ...request("remember", { text: "Hi" }), heroId: "other" },
      request("remember", { text: "Hi", authority: "system" }),
      request("set-status", { questId: "x", status: "bogus" }),
    ]) {
      const result = Effect.runSync(
        Effect.result(executeFrontendRoutine(controller, input)),
      );
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result))
        expect(result.failure.code).toBe("invalid-request");
    }
    expect(controller.getSnapshot()).toBe(before);
    expect(JSON.stringify(FRONTEND_ROUTINE_JSON_SCHEMA)).not.toContain(
      "prepareLLMGeneratedSnippetForStorage",
    );
  });
  it("replays once without a second mutation and rejects reused IDs with changed parameters", async () => {
    const controller = await setup();
    const input = request("remember", { text: "Rest matters" });
    expect(run(controller, input).replayed).toBe(false);
    const snapshot = controller.getSnapshot();
    expect(run(controller, input).replayed).toBe(true);
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(() =>
      run(controller, request("remember", { text: "Other" })),
    ).toThrow("different action");
  });
  it("isolates receipts between controllers and refuses replay into another hero", async () => {
    const controller = await setup(),
      other = await setup();
    const input = request("remember", { text: "Family first" });
    run(controller, input);
    expect(run(other, input).replayed).toBe(false);
    controller.send({ type: "add-player", name: "Another hero" });
    expect(() => run(controller, input)).toThrow("hero changed");
    expect(
      hero(controller).sidekick.snippets.some((s) => s.text === "Family first"),
    ).toBe(false);
  });
  it("returns typed domain failures and leaves failed IDs retryable", async () => {
    const controller = await setup();
    const result = Effect.runSync(
      Effect.result(
        executeFrontendRoutine(
          controller,
          request("quest-progress", { questId: "missing", text: "Progress" }),
        ),
      ),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result))
      expect(result.failure.code).toBe("execution-failed");
    expect(
      run(
        controller,
        frontendRoutineRequest("request-1", {
          type: "name-hero",
          name: "Alex",
        }),
      ).replayed,
    ).toBe(false);
    expect(hero(controller).name).toBe("Alex");
  });
});
