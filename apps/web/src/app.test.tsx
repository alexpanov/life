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
    expect(screen.queryByRole("heading", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Drink water" })).toBeVisible();
    expect(screen.getByText("Fill a glass")).toBeVisible();
    expect(screen.getByRole("button", { name: "Complete quest" })).toBeVisible();
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
    await user.click(screen.getByRole("link", { name: "Make progress" }));
    await user.type(
      screen.getByLabelText("What progress did you make?"),
      "Filled the glass",
    );
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(screen.getByText(/Filled the glass/)).toBeVisible();
  });
  it("asks once and starts in the only place", async () => {
    const { user } = await setup();
    expect(screen.getByText("What's up, boss? What are we up to?")).toBeVisible();
    expect(
      screen.queryByText("What are we up to?", { exact: true }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Which realm?")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", {
        name: "What's up, boss? What are we up to?",
      }),
      "Walk the block",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Walk the block" })).toBeVisible();
    expect(screen.getByText("Do this one. Then tell me how it went.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });
  it("starts the quest when a realm is tapped", async () => {
    const { controller, user } = await setup();
    await act(async () => {
      controller.send({ type: "add-realm", name: "Church", location: "" });
      controller.send({ type: "add-realm", name: "Work", location: "" });
      await controller.flush();
    });
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Which realm?")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", {
        name: "What's up, boss? What are we up to?",
      }),
      "Pray",
    );
    await user.click(screen.getByRole("button", { name: "Church" }));
    expect(screen.getByRole("heading", { name: "Pray" })).toBeVisible();
    expect(screen.getByText("Do this one. Then tell me how it went.")).toBeVisible();
  });
  it("lists several quests he can open", async () => {
    const { controller, user } = await setup();
    await act(async () => {
      controller.send({
        type: "add-quest",
        quest: { title: "Drink water", nextMove: "Fill a glass", xp: 10 },
      });
      controller.send({
        type: "add-quest",
        quest: { title: "Walk", nextMove: "Step outside", xp: 10 },
      });
      await controller.flush();
    });
    expect(screen.queryByRole("heading", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Drink water/ })).toBeVisible();
    expect(screen.getByText("Fill a glass")).toBeVisible();
    expect(screen.getByText("Step outside")).toBeVisible();
    await user.click(screen.getByRole("link", { name: /Walk/ }));
    expect(screen.getByRole("heading", { name: "Walk" })).toBeVisible();
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
    await user.type(
      screen.getByRole("textbox", {
        name: "What's up, boss? What are we up to?",
      }),
      "Call home",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
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
