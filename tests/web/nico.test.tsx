import { mockNicoLayer } from "../../packages/application/src/nico-model";
import "@testing-library/jest-dom/vitest";
import { it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { App } from "../../apps/web/src/App";
import * as O from "../../packages/foundation/src/option";
import { NICO_WISDOM, SERVICE_TRAIT_ID } from "../../packages/core/src/index";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
async function setup() {
  let id = 0;
  const persistence = createMemoryPersistence();
  const context = () => ({
    now: 1000 + id,
    eventId: `nico-ui-${id++}`,
    localDay: "2026-10-10",
  });
  const controller = createGameController(persistence, context);
  await controller.load();
  render(
    <MemoryRouter initialEntries={["/nico"]}>
      <App modelLayer={mockNicoLayer} controller={controller} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const player = () => {
    const game = controller.getSnapshot().game;
    if (O.isNone(game)) throw Error("Missing game");
    return game.value.players[0]!;
  };
  return { user, controller, player, persistence, context };
}
it("chat runs the simulated model routine, remembers and soft deletes a memory", async () => {
  const { user, player, controller } = await setup();
  await user.type(
    screen.getByLabelText("Talk to Niko"),
    "Remember I prefer short walks",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Feedback on Niko’s reply" });
  const memory = player().sidekick.snippets.find((item) =>
    item.text.includes("short walks"),
  );
  expect(memory).toBeDefined();
  await user.click(
    screen.getByRole("button", { name: "Feedback on Niko’s reply" }),
  );
  await user.selectOptions(screen.getByLabelText("Why?"), "not-for-me");
  await user.type(
    screen.getByLabelText("Anything else? (optional)"),
    "Changed my mind",
  );
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  expect(
    player().sidekick.snippets.find((item) => item.id === memory?.id)?.deletedAt
      ._tag,
  ).toBe("Some");
  expect(player().sidekick.contentFeedback.at(-1)?.text).toBe(
    "Changed my mind",
  );
  await controller.flush();
});
it("tells a canonical story on request and removes rejected stories from selection", async () => {
  const { user, player } = await setup();
  await user.click(screen.getByText("Stories & a little wisdom"));
  await user.click(screen.getByRole("button", { name: "The Korean DMZ" }));
  expect(
    (await screen.findAllByText(/Watch duty taught me patience/))[0],
  ).toBeVisible();
  expect(
    player().sidekick.stories.find((item) => item.id === "dmz")?.tellingCount,
  ).toBe(1);
  await user.click(
    screen.getByRole("button", { name: "Feedback on Niko’s reply" }),
  );
  await user.selectOptions(screen.getByLabelText("Why?"), "not-interesting");
  await user.click(screen.getByRole("button", { name: "Let it go" }));
  expect(
    screen.queryByRole("button", { name: "The Korean DMZ" }),
  ).not.toBeInTheDocument();
  expect(
    player().sidekick.stories.find((item) => item.id === "dmz")?.deletedAt._tag,
  ).toBe("Some");
});
it("wisdom never repeats and the service background has no forget control", async () => {
  const { user, player } = await setup();
  await user.click(screen.getByText("Stories & a little wisdom"));
  await user.click(screen.getByRole("button", { name: "A little wisdom" }));
  await screen.findByText(NICO_WISDOM[0].text);
  await user.click(screen.getByRole("button", { name: "A little wisdom" }));
  await screen.findByText(NICO_WISDOM[1].text);
  expect(screen.queryByText(NICO_WISDOM[0].text)).not.toBeInTheDocument();
  await user.click(screen.getByText("Niko’s personality"));
  const trait = player().sidekick.traits.find(
    (item) => item.id === SERVICE_TRAIT_ID,
  )!;
  const fixed = screen
    .getByText(trait.text)
    .closest(".nico-memory")! as HTMLElement;
  expect(within(fixed).queryByRole("button")).not.toBeInTheDocument();
  expect(within(fixed).getByText("Part of who he is")).toBeVisible();
});
