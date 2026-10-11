import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Effect } from "effect";
import * as O from "../../packages/foundation/src/option";
import {
  createNotificationCenter,
  notificationCenter,
  type NotificationPlatform,
  type Notice,
} from "../../apps/web/src/notifications";
import {
  NotificationCenter,
  NotificationsPage,
} from "../../apps/web/src/components/NotificationCenter";
import {
  createGameController,
  createMemoryPersistence,
} from "../../packages/application/src/controller";
const notice: Notice = {
  id: "test",
  title: "Niko",
  body: "Ready, boss.",
  route: "/nico",
};
const platform = (
  visible: boolean,
  permission: "granted" | "denied" | "default" = "granted",
): NotificationPlatform => ({
  visible: () => visible,
  permission: () => permission,
  request: vi.fn(async () => "granted" as const),
  show: vi.fn(async () => true),
});
afterEach(() => {
  vi.useRealTimers();
  notificationCenter.dismiss();
});
describe("notification routing", () => {
  it("keeps foreground updates in-game, even with native permission", async () => {
    const port = platform(true),
      center = createNotificationCenter(port);
    await Effect.runPromise(center.publish(notice));
    expect(port.show).not.toHaveBeenCalled();
    expect(center.getSnapshot().notice).toEqual(O.some(notice));
  });
  it("sends hidden updates natively once", async () => {
    const port = platform(false),
      center = createNotificationCenter(port);
    await Effect.runPromise(center.publish(notice));
    await Effect.runPromise(center.publish(notice));
    expect(port.show).toHaveBeenCalledExactlyOnceWith(notice);
    expect(O.isNone(center.getSnapshot().notice)).toBe(true);
  });
  it("keeps a denied hidden update for return without requesting permission", async () => {
    const port = platform(false, "denied"),
      center = createNotificationCenter(port);
    await Effect.runPromise(center.publish(notice));
    await center.request();
    expect(port.show).not.toHaveBeenCalled();
    expect(port.request).not.toHaveBeenCalled();
    expect(center.getSnapshot().notice).toEqual(O.some(notice));
  });
  it("preserves updates when a native request fails", async () => {
    const port = platform(false);
    port.show = vi.fn(async () => {
      throw Error("Unavailable");
    });
    const center = createNotificationCenter(port);
    await Effect.runPromise(center.publish(notice));
    expect(center.getSnapshot().notice).toEqual(O.some(notice));
    expect(center.getSnapshot().status).toContain("unavailable");
  });
  it("requests permission only through the explicit request routine", async () => {
    const port = platform(true, "default"),
      center = createNotificationCenter(port);
    expect(port.request).not.toHaveBeenCalled();
    await center.request();
    expect(port.request).toHaveBeenCalledOnce();
    expect(center.getSnapshot().access).toBe("granted");
  });
});
describe("Port notification controls", () => {
  it("runs two tests and cancels the pending timer on leaving settings", async () => {
    vi.useFakeTimers();
    const ui = render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Test two notifications" }),
    );
    expect(screen.getByRole("button", { name: "Testing…" })).toBeDisabled();
    await act(async () => {
      await Promise.resolve();
    });
    expect(O.isSome(notificationCenter.getSnapshot().notice)).toBe(true);
    ui.unmount();
    notificationCenter.dismiss();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(O.isNone(notificationCenter.getSnapshot().notice)).toBe(true);
  });
  it("does not replay existing completed jobs and delivers a newly completed job", async () => {
    let event = 0;
    const controller = createGameController(createMemoryPersistence(), () => ({
      now: 1000,
      eventId: `notice-${event++}`,
      localDay: "2026-10-11",
    }));
    await controller.load();
    const ui = render(
      <MemoryRouter>
        <NotificationCenter controller={controller} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Return to Port" }),
    ).toHaveAttribute("href", "/");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => {
      controller.send({ type: "meet-nico", text: "Walking today." });
      await controller.flush();
    });
    expect(screen.getByRole("status")).toHaveTextContent("remembered");
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    ui.unmount();
    render(
      <MemoryRouter>
        <NotificationCenter controller={controller} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/I.ve remembered/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Enable notifications",
    );
  });
});

it("notifies one new quest completion and does not replay it on reload", async () => {
  let event = 0;
  const controller = createGameController(createMemoryPersistence(), () => ({
    now: 2000,
    eventId: `quest-notice-${event++}`,
    localDay: "2026-10-11",
  }));
  await controller.load();
  controller.send({
    type: "add-quest",
    quest: { title: "Walk", nextMove: "Step outside", xp: 10 },
  });
  const game = controller.getSnapshot().game;
  if (O.isNone(game)) throw Error("Missing game");
  const questId = game.value.players[0]!.campaigns[0]!.quests[0]!.id;
  const ui = render(
    <MemoryRouter>
      <NotificationCenter controller={controller} />
    </MemoryRouter>,
  );
  await act(async () => {
    controller.send({ type: "set-status", questId, status: "done" });
    await controller.flush();
  });
  expect(screen.getByRole("status")).toHaveTextContent("Great job");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  await act(async () => {
    await controller.flush();
  });
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  ui.unmount();
  render(
    <MemoryRouter>
      <NotificationCenter controller={controller} />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
