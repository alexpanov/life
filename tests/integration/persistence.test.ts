import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { createGameController } from "../../packages/application/src/controller";
import {
  createMemoryPersistence,
  persistenceFromStorage,
} from "../../packages/application/src/persistence";
import {
  newGame,
  serializeGame,
  selectGame,
} from "../../packages/core/src/index";
import { executeRoutine, DomainError } from "../../packages/core/src/routines";
import * as O from "../../packages/foundation/src/option";
const context = () => ({
  now: 1_800_000_000_000,
  eventId: "integration",
  localDay: "2027-01-15",
});
const player = (controller: ReturnType<typeof createGameController>) => {
  const game = controller.getSnapshot().game;
  if (!O.isSome(game)) throw Error("Expected loaded game");
  return selectGame(game.value, context().now).player;
};
describe("Effect routine boundary", () => {
  it("executes lazily and reports domain errors through the failure channel", async () => {
    const state = newGame(context()),
      effect = executeRoutine(
        state,
        { type: "choose-mission", questId: "missing" },
        context(),
      );
    expect(selectGame(state, context().now).quests).toEqual([]);
    await expect(Effect.runPromise(effect)).rejects.toBeInstanceOf(DomainError);
  });
  it("returns successful transitions without changing input", async () => {
    const state = newGame(context()),
      result = await Effect.runPromise(
        executeRoutine(state, { type: "add-loot", name: "Compass" }, context()),
      );
    expect(result.state.players[0]?.bonusLoot).toEqual(["Compass"]);
    expect(state.players[0]?.bonusLoot).toEqual([]);
  });
});
describe("repository and write routine contract", () => {
  it("memory repository exposes absence then current and previous saves", async () => {
    const persistence = createMemoryPersistence();
    expect(await Effect.runPromise(persistence.repository.load())).toEqual(
      O.none(),
    );
    await Effect.runPromise(persistence.routines.save("first", O.none()));
    await Effect.runPromise(
      persistence.routines.save("second", O.some("first")),
    );
    expect(await Effect.runPromise(persistence.repository.load())).toEqual(
      O.some("second"),
    );
    expect(await Effect.runPromise(persistence.repository.backup())).toEqual(
      O.some("first"),
    );
  });
  it("storage adapter backs up before replacing a save", async () => {
    const writes: string[] = [],
      storage = {
        getItem: async () => null,
        setItem: async (key: string, value: string) => {
          writes.push(`${key}:${value}`);
        },
      };
    await Effect.runPromise(
      persistenceFromStorage(storage, "game").routines.save(
        "new",
        O.some("old"),
      ),
    );
    expect(writes).toEqual(["game.backup:old", "game:new"]);
  });
  it("does not replace current data if backup write fails", async () => {
    const setItem = vi.fn(async () => {
        throw Error("quota");
      }),
      p = persistenceFromStorage(
        { getItem: async () => null, setItem },
        "game",
      );
    await expect(
      Effect.runPromise(p.routines.save("new", O.some("old"))),
    ).rejects.toMatchObject({ _tag: "RepositoryError", operation: "write" });
    expect(setItem).toHaveBeenCalledTimes(1);
  });
});
describe("controller persistence lifecycle", () => {
  it("reloads the last saved player and serializes ordered writes", async () => {
    const persistence = createMemoryPersistence(),
      controller = createGameController(persistence, context);
    await controller.load();
    controller.send({ type: "add-loot", name: "Compass" });
    controller.send({ type: "add-loot", name: "Map" });
    await controller.flush();
    const restarted = createGameController(persistence, context);
    await restarted.load();
    expect(player(restarted).bonusLoot).toEqual(["Compass", "Map"]);
    const backup = await Effect.runPromise(persistence.repository.backup());
    expect(
      O.isSome(backup) && JSON.parse(backup.value).players[0].bonusLoot,
    ).toEqual(["Compass"]);
  });
  it("preserves corrupt original and valid backup until recovery is accepted", async () => {
    const data = new Map([
        ["game", "{broken"],
        ["game.backup", serializeGame(newGame(context(), "Recovered"))],
      ]),
      p = persistenceFromStorage(
        {
          getItem: async (key) => data.get(key) ?? null,
          setItem: async (key, value) => {
            data.set(key, value);
          },
        },
        "game",
      ),
      controller = createGameController(p, context);
    await controller.load();
    expect(controller.getSnapshot().storage).toBe("recovery");
    expect(player(controller).name).toBe("Recovered");
    controller.send({ type: "add-loot", name: "Map" });
    await controller.flush();
    expect(data.get("game")).toBe("{broken");
    controller.acceptRecovery();
    await controller.flush();
    expect(controller.getSnapshot().storage).toBe("saved");
    expect(JSON.parse(data.get("game")!).players[0].bonusLoot).toEqual(["Map"]);
  });
  it("retains in-session progress if the persistence layer is unavailable", async () => {
    const p = persistenceFromStorage(
        {
          getItem: async () => {
            throw Error("offline");
          },
          setItem: async () => {
            throw Error("offline");
          },
        },
        "game",
      ),
      controller = createGameController(p, context);
    await controller.load();
    expect(controller.getSnapshot().storage).toBe("session");
    controller.send({ type: "add-loot", name: "Map" });
    await controller.flush();
    expect(player(controller).bonusLoot).toEqual(["Map"]);
    expect(controller.getSnapshot().notice).toContain("Export before closing");
  });
  it("does not publish or persist a failed command", async () => {
    const persistence = createMemoryPersistence(),
      controller = createGameController(persistence, context);
    await controller.load();
    await controller.flush();
    const before = await Effect.runPromise(persistence.repository.load()),
      listener = vi.fn(),
      unsubscribe = controller.subscribe(listener);
    expect(() =>
      controller.send({ type: "choose-mission", questId: "missing" }),
    ).toThrow("no longer open");
    await controller.flush();
    expect(await Effect.runPromise(persistence.repository.load())).toEqual(
      before,
    );
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
