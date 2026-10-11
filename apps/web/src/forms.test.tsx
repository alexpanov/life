import { mockNicoLayer } from "../../../packages/application/src/nico-model";
import "@testing-library/jest-dom/vitest";
import { it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { NicoScreen } from "./nico-screen";
import * as O from "../../../packages/foundation/src/option";
import {
  createGameController,
  createMemoryPersistence,
} from "../../../packages/application/src/controller";
async function setup() {
  let id = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 1000,
    eventId: `form-${id++}`,
    localDay: "2026-10-10",
  }));
  await controller.load();
  render(
    <MemoryRouter>
      <NicoScreen modelLayer={mockNicoLayer} controller={controller} />
    </MemoryRouter>,
  );
  const player = () => {
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw Error("Missing game");
    return game.value.players[0]!;
  };
  return { user: userEvent.setup(), player };
}
it("invalid chat shows an inline error without spending energy or changing memory", async () => {
  const { user, player } = await setup();
  const before = JSON.stringify(player());
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tell Niko what’s on your mind.",
  );
  expect(JSON.stringify(player())).toBe(before);
  expect(screen.getByLabelText("Talk to Niko")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
it("trait form rejects oversized content then saves a valid trait and clears the input", async () => {
  const { user, player } = await setup();
  await user.click(screen.getByText("Niko’s personality"));
  const field = screen.getByLabelText("How should Niko support you?");
  const count = player().sidekick.traits.length;
  fireEvent.change(field, { target: { value: "x".repeat(201) } });
  await user.click(screen.getByRole("button", { name: "Tell Niko" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Keep this within 200 characters.",
  );
  expect(player().sidekick.traits).toHaveLength(count);
  fireEvent.change(field, { target: { value: "  Keep it brief  " } });
  await user.click(screen.getByRole("button", { name: "Tell Niko" }));
  expect(player().sidekick.traits.at(-1)?.text).toBe("Keep it brief");
  expect(field).toHaveValue("");
});
it("feedback keeps content active until a valid submission", async () => {
  const { user, player } = await setup();
  await user.type(
    screen.getByLabelText("Talk to Niko"),
    "Remember I enjoy quiet mornings",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await user.click(
    await screen.findByRole("button", { name: "Feedback on Niko’s reply" }),
  );
  const note = screen.getByLabelText("Anything else? (optional)");
  const before = JSON.stringify(player().sidekick);
  fireEvent.change(note, { target: { value: "a".repeat(601) } });
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Keep your note within 600 characters.",
  );
  expect(JSON.stringify(player().sidekick)).toBe(before);
  fireEvent.change(note, { target: { value: "My preference changed" } });
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  expect(player().sidekick.contentFeedback.at(-1)?.text).toBe(
    "My preference changed",
  );
});
