import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import * as O from "../../../packages/foundation/src/option";
import {
  createGameController,
  createMemoryPersistence,
} from "../../../packages/application/src/controller";
async function setup(route = "/", introduced = true) {
  let n = 0;
  const persistence = createMemoryPersistence();
  const context = () => ({
    now: Date.now(),
    eventId: `dom-${n++}`,
    localDay: "2026-10-10",
  });
  const controller = createGameController(persistence, context);
  await controller.load();
  if (introduced)
    controller.send({ type: "meet-nico", text: "I want to get outside." });
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
async function addMission(controller: ReturnType<typeof createGameController>) {
  await act(async () => {
    controller.send({
      type: "add-quest",
      quest: { title: "Drink water", nextMove: "Fill a glass", xp: 10 },
    });
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw Error("No game");
    const player = game.value.players[0]!;
    controller.send({
      type: "choose-mission",
      questId: player.campaigns[0]!.quests[0]!.id,
    });
    await controller.flush();
  });
}
describe("calm mobile React journey", () => {
  it("introduces Niko once and persists the hero's first memory", async () => {
    const { user, controller, persistence, context, rendered } = await setup(
      "/",
      false,
    );
    expect(screen.getByRole("heading", { name: "Meet Niko." })).toBeVisible();
    expect(screen.getByText(/Hi, I’m Niko\./)).toBeVisible();
    expect(screen.queryByText(/Gonzalez/)).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("What are you up to?"),
      "Exploring a new city",
    );
    await user.click(screen.getByRole("button", { name: "Meet Niko" }));
    expect(
      screen.getByRole("heading", { name: "How are you feeling?" }),
    ).toBeVisible();
    await controller.flush();
    rendered.unmount();
    const restored = createGameController(persistence, context);
    await restored.load();
    render(
      <MemoryRouter>
        <App controller={restored} />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("heading", { name: "Meet Niko." }),
    ).not.toBeInTheDocument();
    const game = restored.getSnapshot().game;
    expect(
      O.isSome(game) &&
        game.value.players[0]!.sidekick.snippets.some((s) =>
          s.text.includes("Exploring a new city"),
        ),
    ).toBe(true);
  });
  it("selects mood through one input and a single decision", async () => {
    const { user } = await setup();
    await user.selectOptions(screen.getByLabelText("Today I feel"), "quiet");
    expect(screen.getByLabelText("Today I feel")).toHaveValue("quiet");
    await user.click(screen.getByRole("button", { name: "Pray for a quest" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("creates a quest and confirms the priority before showing two main actions", async () => {
    const { user } = await setup("/board");
    await user.click(screen.getByRole("button", { name: "Add quest" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Objective"),
      "Walk to the park",
    );
    await user.type(
      within(dialog).getByLabelText("One next move"),
      "Put shoes on",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Take this quest" }));
    expect(
      screen.getByRole("heading", { name: "Walk to the park" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Complete quest" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Make progress" })).toBeVisible();
    expect(
      document.querySelectorAll(".mission-strip,.niko-panel"),
    ).toHaveLength(0);
  });
  it("completes, learns the name and reflection, then returns to choosing", async () => {
    const { controller, user } = await setup();
    await addMission(controller);
    await user.click(screen.getByRole("button", { name: "Complete quest" }));
    expect(
      screen.getByRole("heading", { name: "Great job, boss." }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Your name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Tell Niko" }));
    await user.type(
      screen.getByLabelText("Your takeaway"),
      "Keep a glass nearby",
    );
    await user.click(screen.getByRole("button", { name: "Remember this" }));
    await user.click(screen.getByRole("button", { name: "Pick next quest" }));
    expect(
      screen.getByRole("heading", { name: "How are you feeling?" }),
    ).toBeVisible();
    const game = controller.getSnapshot().game;
    expect(
      O.isSome(game) &&
        O.getOrElse(game.value.players[0]!.sidekick.heroName, () => "missing"),
    ).toBe("Alex");
  });
  it("known names skip the question and unfinished reflection survives reload", async () => {
    const { controller, user, persistence, context, rendered } = await setup();
    await act(async () => {
      controller.send({ type: "name-hero", name: "Alex" });
    });
    await addMission(controller);
    await user.click(screen.getByRole("button", { name: "Complete quest" }));
    await controller.flush();
    rendered.unmount();
    const restored = createGameController(persistence, context);
    await restored.load();
    render(
      <MemoryRouter>
        <App controller={restored} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "What did we learn?" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
  });
  it("opens a dedicated progress screen and records real history", async () => {
    const { controller, user } = await setup();
    await addMission(controller);
    await user.click(screen.getByRole("link", { name: "Make progress" }));
    await user.type(
      screen.getByLabelText("What progress did you make?"),
      "Filled the glass",
    );
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(screen.getByText(/Filled the glass/)).toBeVisible();
    expect(screen.getByLabelText("What progress did you make?")).toHaveValue(
      "",
    );
  });
  it("keeps driving mode accessible through Explore", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("link", { name: "Explore" }));
    await user.click(screen.getByRole("button", { name: "Driving mode" }));
    expect(document.querySelector("[inert]")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I’m parked" }));
    expect(document.querySelector("[inert]")).not.toBeInTheDocument();
  });
});
