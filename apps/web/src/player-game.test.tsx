import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Effect } from "effect";
import {
  createGameController,
  type GameController,
} from "../../../packages/application/src/controller";
import {
  createMemoryPersistence,
  type Persistence,
} from "../../../packages/application/src/persistence";
import * as E from "../../../packages/foundation/src/either";
import * as O from "../../../packages/foundation/src/option";
import { PlayerGame, type PlayerSessionPort } from "./player-game";

function port(
  id: string,
  persistence: Persistence,
  opened: string[],
): PlayerSessionPort & { controller: () => GameController } {
  let controller: GameController | null = null;
  return {
    ensure: async () => E.right(id),
    open(ownerId) {
      opened.push(ownerId);
      if (!controller) {
        controller = createGameController(persistence, () => ({
          now: 1,
          eventId: ownerId,
          localDay: "2026-10-11",
        }));
        void controller.load();
      }
      return controller;
    },
    openLocal() {
      throw new Error("The cloud session should open.");
    },
    controller() {
      if (!controller) throw new Error("The game has not opened.");
      return controller;
    },
  };
}

describe("player game", () => {
  it("opens the game for the stored player without asking for an email", async () => {
    const opened: string[] = [];
    const session = port("first-player", createMemoryPersistence(), opened);
    render(
      <MemoryRouter>
        <PlayerGame session={session} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Opening your game.")).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeVisible();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
    expect(opened).toEqual(["first-player"]);
  });

  it("does not let the second player read the first player's save", async () => {
    const firstStore = createMemoryPersistence();
    const secondStore = createMemoryPersistence();
    const first = port("first-player", firstStore, []);
    const second = port("second-player", secondStore, []);
    const firstView = render(
      <MemoryRouter>
        <PlayerGame session={first} />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Home" });
    await first.controller().flush();
    const firstSave = await Effect.runPromise(firstStore.repository.load());
    firstView.unmount();
    render(
      <MemoryRouter>
        <PlayerGame session={second} />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Home" });
    await second.controller().flush();
    const firstAfter = await Effect.runPromise(firstStore.repository.load());
    const secondSave = await Effect.runPromise(secondStore.repository.load());
    expect(firstAfter).toEqual(firstSave);
    expect(O.isSome(firstSave)).toBe(true);
    expect(secondSave).not.toEqual(firstSave);
  });
});
