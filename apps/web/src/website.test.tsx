import "@testing-library/jest-dom/vitest";
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Website } from "./Website";
import {
  createGameController,
  createMemoryPersistence,
} from "../../../packages/application/src/controller";
it("starts the actual game from the lowercase play live button", async () => {
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: Date.now(),
    eventId: "website",
    localDay: "2026-10-10",
  }));
  await controller.load();
  await controller.flush();
  render(
    <MemoryRouter>
      <Website controller={controller} />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole("navigation", { name: "Main navigation" }),
  ).not.toBeInTheDocument();
  const play = screen.getByRole("button", { name: "play live" });
  expect(play.querySelector("sup svg")).toHaveAttribute("aria-hidden", "true");
  await userEvent.setup().click(play);
  expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
  expect(
    screen.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});
