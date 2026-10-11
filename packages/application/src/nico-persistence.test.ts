import { expect, it } from "vitest";
import {
  createGameController,
  createMemoryPersistence,
} from "./controller";
import { selectGame } from "../../core/src/index";
import * as O from "../../foundation/src/option";

it("restores the hero, Niko, completed jobs and quest history after closing the game", async () => {
  const persistence = createMemoryPersistence();
  let sequence = 0;
  const context = () => ({
    now: 1800000000000 + sequence,
    eventId: `persist-${sequence++}`,
    localDay: "2027-01-15",
  });
  const first = createGameController(persistence, context);
  await first.load();
  first.send({ type: "meet-nico", text: "I want to spend more time outside." });
  first.send({ type: "name-hero", name: "Taylor" });
  first.send({ type: "set-nico-trait", text: "Keep encouragement brief." });
  first.send({
    type: "add-quest",
    quest: { title: "Walk around the block", xp: 10 },
  });
  const current = first.getSnapshot().game;
  if (O.isNone(current)) throw Error("Missing game");
  const quest = selectGame(current.value, context().now).quests[0]!;
  first.send({
    type: "quest-progress",
    questId: quest.id,
    text: "Put my shoes by the door.",
  });
  first.send({ type: "set-status", questId: quest.id, status: "done" });
  first.send({
    type: "reflect-quest",
    questId: quest.id,
    text: "Preparing ahead made it easy.",
  });
  await first.flush();
  const second = createGameController(persistence, context);
  await second.load();
  const restored = second.getSnapshot().game;
  expect(O.isSome(restored)).toBe(true);
  if (O.isNone(restored)) throw Error("Missing restored game");
  const player = selectGame(restored.value, context().now).player;
  expect(player.name).toBe("Taylor");
  expect(player.sidekick.heroName).toEqual(O.some("Taylor"));
  expect(player.sidekick.introduced).toBe(true);
  expect(player.sidekick.jobs.every((job) => job.status === "done")).toBe(true);
  expect(
    player.sidekick.traits.some(
      (trait) =>
        trait.source === "player" && trait.text === "Keep encouragement brief.",
    ),
  ).toBe(true);
  expect(
    player.sidekick.snippets.some(
      (note) => note.text === "Preparing ahead made it easy.",
    ),
  ).toBe(true);
  expect(
    player.events.some(
      (event) =>
        event.questId === quest.id &&
        event.text === "Put my shoes by the door.",
    ),
  ).toBe(true);
  expect(
    selectGame(restored.value, context().now).quests.find(
      (q) => q.id === quest.id,
    )?.status,
  ).toBe("done");
});
