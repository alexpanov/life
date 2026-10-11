import type { InteractionSurface } from "../../../packages/core/src/surface";
export interface TelegramBridge {
  ready(): void;
  expand(): void;
}
export function interactionSurface(pathname: string): InteractionSurface {
  return pathname === "/telegram" || pathname.startsWith("/telegram/")
    ? "telegram"
    : "web";
}
/** Presentation only. Telegram identity is not trusted or used until server validation exists. */
export function initializeTelegram(
  surface: InteractionSurface,
  bridge: TelegramBridge | undefined,
): void {
  if (surface !== "telegram" || !bridge) return;
  bridge.ready();
  bridge.expand();
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramBridge };
  }
}
