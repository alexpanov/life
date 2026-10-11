import "@testing-library/jest-dom/vitest";
import { it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "../../apps/web/src/App";
import { Website } from "../../apps/web/src/Website";
import { InvitePage } from "../../apps/web/src/pages/InvitePage";
import { incomingInvitationRepository } from "../../apps/web/src/invitation";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
import * as O from "../../packages/foundation/src/option";
afterEach(() => {
  window.history.replaceState({}, "", "/");
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it("retains invitation context across play and copies an honest invitation", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const page = render(
    <MemoryRouter>
      <InvitePage code="inv_opaque_123456" />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "Share invitation" }));
  expect(write).toHaveBeenCalledWith(
    `${location.origin}/?ref=inv_opaque_123456`,
  );
  await user.click(screen.getByText("About referral rewards"));
  expect(
    screen.getByText(/Phone verification is not connected yet/),
  ).toBeVisible();
  page.unmount();
  window.history.replaceState({}, "", "/?ref=inv_opaque_123456");
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: Date.now(),
    eventId: "invite-player",
    localDay: "2026-10-11",
  }));
  await controller.load();
  render(
    <MemoryRouter>
      <Website controller={controller} />
    </MemoryRouter>,
  );
  expect(
    screen.getByText("A friend invited you. Welcome to life."),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "play live" }));
  expect(screen.getByRole("heading", { name: "Meet Nico." })).toBeVisible();
  window.history.replaceState({}, "", "/");
  expect(O.getOrElse(incomingInvitationRepository(), () => "missing")).toBe(
    "inv_opaque_123456",
  );
  const game = controller.getSnapshot().game;
  expect(
    O.isSome(game) && O.isNone(game.value.players[0]!.energy.accessUntil),
  ).toBe(true);
});
it("shows exhausted energy while keeping memory removal available", async () => {
  let event = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: Date.now(),
    eventId: `energy-ui-${event++}`,
    localDay: "2026-10-11",
  }));
  await controller.load();
  controller.send({ type: "remember", text: "I prefer evenings" });
  for (let i = 0; i < 100; i++)
    controller.send({ type: "consume-nico-energy", requestId: `request-${i}` });
  render(
    <MemoryRouter initialEntries={["/nico"]}>
      <App controller={controller} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  expect(screen.getByText("Nico energy 0/100")).toBeVisible();
  expect(screen.getByText(/Nico is resting until/)).toBeVisible();
  await user.click(screen.getByText("Stories & a little wisdom"));
  expect(
    screen.getByRole("button", { name: "A little wisdom" }),
  ).toBeDisabled();
  await user.click(screen.getByText("What Nico remembers"));
  await user.click(
    screen.getByRole("button", { name: "Forget memory: I prefer evenings" }),
  );
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  const game = controller.getSnapshot().game;
  expect(
    O.isSome(game) &&
      game.value.players[0]!.sidekick.snippets.some(
        (item) => item.text === "I prefer evenings" && O.isSome(item.deletedAt),
      ),
  ).toBe(true);
  await act(async () => {
    await controller.flush();
  });
});
