import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import * as O from "../../../packages/foundation/src/option";
import {
  createGameController,
  createMemoryPersistence,
} from "../../../packages/application/src/controller";
async function setup(route = "/") {
  let n = 0;
  const persistence = createMemoryPersistence();
  const context = () => ({
    now: Date.now(),
    eventId: `dom-${n++}`,
    localDay: "2026-10-10",
  });
  const controller = createGameController(persistence, context);
  await controller.load();
  await controller.flush();
  render(
    <MemoryRouter initialEntries={[route]}>
      <App controller={controller} />
    </MemoryRouter>,
  );
  return { controller, user: userEvent.setup() };
}
describe("home navigation", () => {
  it("lists open quests and keeps removed screens closed", async () => {
    const { controller, user } = await setup();
    await act(async () => {
      controller.send({
        type: "add-quest",
        quest: { title: "Drink water", nextMove: "Fill a glass", xp: 10 },
      });
      await controller.flush();
    });
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Drink water/ })).toBeVisible();
    expect(screen.queryByLabelText("Today I feel")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pray for a quest" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explore" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Return to Port" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Stay in touch.")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toHaveTextContent(
      "Home",
    );
    await user.click(screen.getByRole("link", { name: /Drink water/ }));
    await user.type(
      screen.getByLabelText("What progress did you make?"),
      "Filled the glass",
    );
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(screen.getByText(/Filled the glass/)).toBeVisible();
  });
  it("asks what is up and will not start until a realm is picked", async () => {
    const { user } = await setup();
    expect(screen.getByText("What's up, boss? What are we up to?")).toBeVisible();
    await user.type(screen.getByLabelText("What are we up to?"), "Walk the block");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toBeDisabled();
    const realm = screen.getByRole("option", { name: "Home" });
    await user.selectOptions(screen.getByLabelText("Which realm?"), realm);
    expect(start).toBeEnabled();
    await user.click(start);
    expect(screen.getByRole("link", { name: /Walk the block/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });
  it("opens Home instead of a removed screen", async () => {
    for (const route of [
      "/explore",
      "/nico",
      "/inventory",
      "/workshop",
      "/notifications",
      "/invite",
      "/powerups",
    ]) {
      await setup(route);
      expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
      expect(screen.queryByRole("heading", { name: "Explore." })).not.toBeInTheDocument();
      expect(screen.queryByText("Stories & a little wisdom")).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Stay in touch." })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Inventory." })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Workshop." })).not.toBeInTheDocument();
      cleanup();
    }
  });
  it("keeps the hero line when the quest starts", async () => {
    const { controller, user } = await setup();
    await user.type(screen.getByLabelText("What are we up to?"), "Call home");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.selectOptions(
      screen.getByLabelText("Which realm?"),
      screen.getByRole("option", { name: "Home" }),
    );
    await user.click(screen.getByRole("button", { name: "Start" }));
    await controller.flush();
    const game = controller.getSnapshot().game;
    expect(
      O.isSome(game) &&
        game.value.players[0]!.campaigns.some((campaign) =>
          campaign.quests.some(
            (quest) =>
              quest.title === "Call home" &&
              quest.lines.some((line) => line.text === "Call home"),
          ),
        ),
    ).toBe(true);
  });
});
