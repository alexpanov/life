import "@testing-library/jest-dom/vitest";
import { it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { MemoryRouter } from "react-router";
import { PowerupsPage } from "../../apps/web/src/pages/PowerupsPage";
import * as O from "../../packages/foundation/src/option";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
async function setup() {
  let id = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1000,
    eventId: `powerup-ui-${id++}`,
    localDay: "2026-10-10",
  }));
  await controller.load();
  const player = () => {
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw Error("Missing game");
    return game.value.players[0]!;
  };
  function Harness() {
    useSyncExternalStore(controller.subscribe, controller.getSnapshot);
    return (
      <PowerupsPage
        player={player()}
        now={1000}
        send={(command) => {
          controller.send(command);
          return true;
        }}
      />
    );
  }
  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
  return { user: userEvent.setup(), player };
}
it("opens a power-up then activates and cancels without spending a use", async () => {
  const { user, player } = await setup();
  expect(
    screen.queryByRole("button", { name: "Activate" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Balkan smile" }));
  expect(screen.getByRole("heading", { name: "Balkan smile" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Activate" }));
  expect(player().sidekick.powerups.active._tag).toBe("Some");
  expect(screen.getByRole("link", { name: "Talk to Niko" })).toHaveAttribute(
    "href",
    "/nico",
  );
  await user.click(screen.getByRole("button", { name: "Cancel power-up" }));
  expect(player().sidekick.powerups.active._tag).toBe("None");
  expect(
    player().sidekick.powerups.instances.every((item) => item.charges === 1),
  ).toBe(true);
});
it("validates a custom power-up and saves trimmed instructions for this Niko", async () => {
  const { user, player } = await setup();
  await user.click(screen.getByRole("button", { name: "Make a power-up" }));
  await user.click(screen.getByRole("button", { name: "Save power-up" }));
  expect(await screen.findAllByRole("alert")).toHaveLength(2);
  expect(player().sidekick.powerups.instances).toHaveLength(3);
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "  Family first  " },
  });
  fireEvent.change(screen.getByLabelText("How should Niko help?"), {
    target: { value: "  Suggest one way to include my children.  " },
  });
  await user.click(screen.getByRole("button", { name: "Save power-up" }));
  await screen.findByRole("button", { name: "Family first" });
  const saved = player().sidekick.powerups.instances.at(-1)!;
  expect(saved.nicoId).toBe(player().sidekick.id);
  expect(saved.template.instructions).toBe(
    "Suggest one way to include my children.",
  );
  expect(saved.charges).toBe(1);
  expect(player().sidekick.powerups.active._tag).toBe("None");
});
