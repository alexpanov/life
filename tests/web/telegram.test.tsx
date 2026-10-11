import { expect, it, vi } from "vitest";
import { initializeTelegram, interactionSurface } from "../../apps/web/src/telegram";
it("initializes Telegram presentation only on its launch route", () => {
  const bridge = {ready:vi.fn(),expand:vi.fn()};
  initializeTelegram(interactionSurface("/"),bridge);
  expect(bridge.ready).not.toHaveBeenCalled();
  initializeTelegram(interactionSurface("/telegram/"),bridge);
  expect(bridge.ready).toHaveBeenCalledOnce();
  expect(bridge.expand).toHaveBeenCalledOnce();
  expect(interactionSurface("/telegram-fake/")).toBe("web");
});
