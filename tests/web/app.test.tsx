import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "../../apps/web/src/App";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
async function setup(route = "/") {
  let n = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: Date.now(),
    eventId: `dom-${n++}`,
    localDay: "2026-10-10",
  }));
  await controller.load();
  await controller.flush();
  render(
    <MemoryRouter initialEntries={[route]}>
      <App controller={controller} />
    </MemoryRouter>,
  );
  return { controller, user: userEvent.setup() };
}
describe("interactive React game in JSDOM", () => {
  it("changing mood updates the visible pressed state", async () => {
    const { user } = await setup();
    const ready = screen.getByRole("button", { name: /Ready.*A mission/ }),
      quiet = screen.getByRole("button", { name: /Quiet.*Room/ });
    await user.click(ready);
    expect(ready).toHaveAttribute("aria-pressed", "true");
    await user.click(quiet);
    expect(quiet).toHaveAttribute("aria-pressed", "true");
    expect(ready).toHaveAttribute("aria-pressed", "false");
  });
  it("creates a quest through a real form and asks before focusing it", async () => {
    const { user } = await setup("/board");
    await user.click(screen.getByRole("button", { name: "Add quest" }));
    let dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Objective"),
      "Walk to the park",
    );
    await user.type(
      within(dialog).getByLabelText("One next move"),
      "Put shoes on",
    );
    await user.selectOptions(within(dialog).getByLabelText("Type"), "side");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    dialog = screen.getByRole("dialog", { name: "Choose one next move" });
    expect(within(dialog).getByText("Walk to the park")).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Take this quest" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("YOUR ONE MISSION")).toBeVisible();
    expect(screen.getByText("Put shoes on")).toBeVisible();
  });
  it("completion shows review then returns to choosing a quest", async () => {
    const { controller, user } = await setup("/board");
    await act(async () => {
      controller.send({
        type: "add-quest",
        quest: { title: "Drink water", xp: 10 },
      });
      controller.send({ type: "retain-mission" });
      await controller.flush();
    });
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(
      screen.getByRole("heading", { name: "Take a breath." }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Pick next quest" }));
    expect(
      screen.getByRole("heading", { name: "How are you feeling?" }),
    ).toBeVisible();
  });
  it("driving mode gates interaction until the player parks", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "Driving mode" }));
    expect(
      screen.getByRole("heading", { name: "Eyes on the road." }),
    ).toBeVisible();
    expect(document.querySelector("[inert]")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I’m parked" }));
    expect(screen.queryByText("Eyes on the road.")).not.toBeInTheDocument();
    expect(document.querySelector("[inert]")).not.toBeInTheDocument();
  });
  it("distinguishes Niko and system message senders", async () => {
    await setup();
    expect(document.querySelector(".sender.niko")).toHaveTextContent("NIKO");
    expect(document.querySelector(".sender.system")).toBeInTheDocument();
  });
});
