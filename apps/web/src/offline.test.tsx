import { mockNicoLayer } from "../../../packages/application/src/nico-model";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import * as protocol from "../../../packages/application/src/routine-protocol";
import * as O from "../../../packages/foundation/src/option";
import {
  createGameController,
  createMemoryPersistence,
} from "../../../packages/application/src/controller";

function connectivity(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  act(() => window.dispatchEvent(new Event(online ? "online" : "offline")));
}

afterEach(() => vi.restoreAllMocks());

async function setup() {
  connectivity(true);
  let id = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1000 + id,
    eventId: `offline-${id++}`,
    localDay: "2026-10-10",
  }));
  await controller.load();
  render(
    <MemoryRouter initialEntries={["/nico"]}>
      <App modelLayer={mockNicoLayer} controller={controller} />
    </MemoryRouter>,
  );
  return { controller, user: userEvent.setup() };
}

it("keeps draft, input identity and focus across offline/reconnect without invoking Niko", async () => {
  const { user } = await setup();
  const run = vi.spyOn(protocol, "runNicoChatRoutine");
  const input = screen.getByLabelText("Talk to Niko");
  await user.type(input, "Remember my quiet morning");
  connectivity(false);
  expect(input).toHaveFocus();
  expect(input).toHaveValue("Remember my quiet morning");
  expect(input).toHaveAttribute("readonly");
  expect(screen.getByText(/You’re offline/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  fireEvent.submit(input.closest("form")!);
  await user.click(screen.getByText("Stories & a little wisdom"));
  expect(screen.getByRole("button", { name: "The Korean DMZ" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "A little wisdom" }),
  ).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
  input.focus();
  connectivity(true);
  expect(screen.getByLabelText("Talk to Niko")).toBe(input);
  expect(input).toHaveFocus();
  expect(input).toHaveValue("Remember my quiet morning");
  expect(input).not.toHaveAttribute("readonly");
  expect(run).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Feedback on Niko’s reply" });
  expect(run).toHaveBeenCalledTimes(1);
});

it("lets the hero retire a memory locally while offline", async () => {
  const { user, controller } = await setup();
  await user.type(
    screen.getByLabelText("Talk to Niko"),
    "Remember short walks",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Feedback on Niko’s reply" });
  connectivity(false);
  await user.click(
    screen.getByRole("button", { name: "Feedback on Niko’s reply" }),
  );
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  const game = controller.getSnapshot().game;
  expect(O.isSome(game)).toBe(true);
  if (O.isSome(game)) {
    expect(
      game.value.players[0]!.sidekick.snippets.find((item) =>
        item.text.includes("short walks"),
      )?.deletedAt._tag,
    ).toBe("Some");
  }
  expect(screen.getByText(/You’re offline/)).toBeVisible();
});
