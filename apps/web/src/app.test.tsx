import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
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
  const rendered = render(
    <MemoryRouter initialEntries={[route]}>
      <App controller={controller} />
    </MemoryRouter>,
  );
  return {
    controller,
    user: userEvent.setup(),
    persistence,
    context,
    rendered,
  };
}
function questTitles(controller: ReturnType<typeof createGameController>) {
  const game = controller.getSnapshot().game;
  if (O.isNone(game)) return [];
  return game.value.players.flatMap((player) =>
    player.campaigns.flatMap((campaign) =>
      campaign.quests.map((quest) => quest.title),
    ),
  );
}
const upTo = "What's up, boss? What are we up to?";
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
describe("quest interactions", () => {
  it("submits onboarding with Enter and keeps the answer after reload", async () => {
    const { user, controller, persistence, context, rendered } = await setup();
    await user.type(screen.getByRole("textbox", { name: upTo }), "Walk the block");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Walk the block" })).toBeVisible();
    await controller.flush();
    rendered.unmount();
    const restored = createGameController(persistence, context);
    await restored.load();
    render(
      <MemoryRouter>
        <App controller={restored} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Walk the block" })).toBeVisible();
  });
  it("inserts a newline for Shift+Enter and ignores IME and held Enter", async () => {
    const { user } = await setup();
    const field = screen.getByRole("textbox", { name: upTo });
    await user.type(field, "Line");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(field).toHaveValue("Line\n");
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    fireEvent.keyDown(field, { key: "Enter", repeat: true });
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Line" })).not.toBeInTheDocument();
  });
  it("keeps an empty answer off the board", async () => {
    const { user } = await setup();
    const field = screen.getByRole("textbox", { name: upTo });
    field.focus();
    await user.keyboard("{Enter}");
    expect(field).toBeInvalid();
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
  });
  it("shows the prayer when check-in has no offer and opens quest creation", async () => {
    const { user, controller } = await setup();
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    await user.selectOptions(screen.getByLabelText("Today I feel"), "ready");
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    expect(
      screen.getByRole("heading", { name: "One good next step." }),
    ).toBeVisible();
    expect(
      screen.getByText(/Lord Jesus Christ, guide me toward what is good/),
    ).toBeVisible();
    expect(
      screen.getByText(/What is one good thing you can do next/),
    ).toBeVisible();
    expect(questTitles(controller)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Today I feel")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    await user.click(screen.getByRole("button", { name: "Add my own quest" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeVisible();
    expect(screen.getByLabelText("Objective")).toBeVisible();
    expect(questTitles(controller)).toEqual([]);
  });
  it("shows a new offer and an existing quest offer until he takes one", async () => {
    const { user, controller } = await setup();
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    await user.selectOptions(screen.getByLabelText("Today I feel"), "curious");
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    expect(
      screen.getByRole("heading", { name: "Find one place worth returning to" }),
    ).toBeVisible();
    expect(screen.getByText(/note one nearby place/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Complete quest" }),
    ).not.toBeInTheDocument();
    expect(questTitles(controller)).not.toContain(
      "Find one place worth returning to",
    );
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.getByLabelText("Today I feel")).toBeVisible();
    expect(questTitles(controller)).not.toContain(
      "Find one place worth returning to",
    );
    cleanup();
    const next = await setup();
    await next.user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    await act(async () => {
      next.controller.send({
        type: "add-quest",
        quest: { title: "Drink water", nextMove: "Fill a glass", xp: 10 },
      });
      await next.controller.flush();
    });
    await next.user.selectOptions(screen.getByLabelText("Today I feel"), "ready");
    await next.user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    expect(screen.getByRole("heading", { name: "Drink water" })).toBeVisible();
    expect(screen.getByText("Fill a glass")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Complete quest" }),
    ).not.toBeInTheDocument();
    await next.user.click(screen.getByRole("button", { name: "Take quest" }));
    expect(screen.getByRole("button", { name: "Complete quest" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Take quest" }),
    ).not.toBeInTheDocument();
  });
  it("keeps check-in on the player who started it", async () => {
    const { user, controller } = await setup();
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw new Error("No game");
    const first = game.value.activePlayerId;
    await act(async () => {
      controller.send({ type: "add-player", name: "Other" });
      await controller.flush();
    });
    expect(screen.getByText(upTo)).toBeVisible();
    expect(screen.queryByLabelText("Today I feel")).not.toBeInTheDocument();
    await act(async () => {
      controller.send({ type: "switch-player", playerId: first });
      await controller.flush();
    });
    expect(screen.getByLabelText("Today I feel")).toBeVisible();
  });
  it("submits a takeaway with Enter and leaves other notes alone", async () => {
    const { user, controller } = await setup();
    await act(async () => {
      controller.send({
        type: "add-quest",
        quest: { title: "Drink water", nextMove: "Fill a glass", xp: 10 },
      });
      await controller.flush();
    });
    await user.click(screen.getByRole("link", { name: "Make progress" }));
    const note = screen.getByLabelText("What progress did you make?");
    await user.type(note, "Filled");
    await user.keyboard("{Enter}");
    expect(note).toHaveValue("Filled\n");
    expect(screen.queryByText("Filled")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Back home" }));
    await user.click(screen.getByRole("button", { name: "Complete quest" }));
    const takeaway = screen.getByLabelText("Your takeaway");
    await user.type(takeaway, "Keep a glass nearby");
    await user.keyboard("{Enter}");
    expect(screen.getByText(upTo)).toBeVisible();
    const game = controller.getSnapshot().game;
    expect(
      O.isSome(game) &&
        game.value.players[0]!.sidekick.snippets.some((snippet) =>
          snippet.text.includes("Keep a glass nearby"),
        ),
    ).toBe(true);
  });
});
