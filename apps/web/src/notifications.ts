import { Effect } from "effect";
import * as O from "../../../packages/foundation/src/option";
export type Notice = { id: string; title: string; body: string; route: string };
export type NotificationAccess = NotificationPermission | "unsupported";
export interface NotificationPlatform {
  visible(): boolean;
  permission(): NotificationAccess;
  request(): Promise<NotificationAccess>;
  show(notice: Notice): Promise<boolean>;
}
export const browserNotifications: NotificationPlatform = {
  visible: () => document.visibilityState !== "hidden",
  permission: () =>
    typeof Notification === "undefined" || !("serviceWorker" in navigator)
      ? "unsupported"
      : Notification.permission,
  request: async () => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator))
      return "unsupported";
    return Notification.requestPermission();
  },
  show: async (notice) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || typeof registration.showNotification !== "function")
      return false;
    // Permission or visibility may change while the service worker is resolving.
    if (
      document.visibilityState !== "hidden" ||
      Notification.permission !== "granted"
    )
      return false;
    await registration.showNotification(notice.title, {
      body: notice.body,
      tag: notice.id,
      data: { url: `${location.pathname}#${notice.route}` },
    });
    return true;
  },
};
export function createNotificationCenter(platform: NotificationPlatform) {
  let snapshot = {
    notice: O.none<Notice>(),
    access: platform.permission(),
    status: "",
  };
  const listeners = new Set<() => void>();
  const seen = new Set<string>();
  const update = (patch: Partial<typeof snapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const publish = (notice: Notice) =>
    Effect.tryPromise({
      try: async () => {
        if (seen.has(notice.id)) return;
        seen.add(notice.id);
        if (seen.size > 200) seen.delete(seen.values().next().value ?? "");
        if (platform.visible()) {
          update({ notice: O.some(notice) });
          return;
        }
        if (
          platform.permission() === "granted" &&
          (await platform.show(notice))
        )
          return;
        update({
          notice: O.some(notice),
          status: "Saved here. A device alert could not be shown.",
        });
      },
      catch: () => new Error("Device alert unavailable."),
    }).pipe(
      Effect.catch(() =>
        Effect.sync(() =>
          update({
            notice: O.some(notice),
            status: "Device alert unavailable. Your update is here.",
          }),
        ),
      ),
    );
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    publish,
    dismiss: () => update({ notice: O.none() }),
    refresh: () => update({ access: platform.permission() }),
    request: async () => {
      // Called directly from a button so browsers retain user activation.
      if (platform.permission() !== "default") {
        update({ access: platform.permission() });
        return;
      }
      try {
        update({ access: await platform.request(), status: "" });
      } catch {
        update({
          status: "Could not request permission. Check your browser settings.",
        });
      }
    },
    setStatus: (status: string) => update({ status }),
  };
}
export const notificationCenter =
  createNotificationCenter(browserNotifications);
