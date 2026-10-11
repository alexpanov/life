import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router";
import { Home, Bell, X } from "lucide-react";
import { Effect } from "effect";
import type { GameController } from "../../../../packages/application/src/controller";
import * as O from "../../../../packages/foundation/src/option";
import { notificationCenter, type Notice } from "../notifications";
import "../notifications.css";
const promptedPlayers = new Set<string>();

export function NotificationCenter({
  controller,
}: {
  controller: GameController;
}) {
  const state = useSyncExternalStore(
    notificationCenter.subscribe,
    notificationCenter.getSnapshot,
  );
  const game = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  ).game;
  const navigate = useNavigate();
  const current = O.isSome(game)
    ? game.value.players.find((p) => p.id === game.value.activePlayerId)
    : false;
  const driving = current ? current.settings.driving : false;
  useEffect(() => {
    let playerId = "",
      previous = new Set<string>();
    const observe = () => {
      const save = controller.getSnapshot().game;
      if (O.isNone(save)) return;
      const player = save.value.players.find(
        (p) => p.id === save.value.activePlayerId,
      );
      if (!player) return;
      if (playerId && playerId !== player.id) notificationCenter.dismiss();
      const items: Notice[] = [
        ...player.events
          .filter((e) => e.type === "quest:done")
          .map((e) => ({
            id: `quest-${player.id}-${e.id}`,
            title: "Nico",
            body: "Great job, boss. Let's take a moment to reflect.",
            route: "/",
          })),
        ...player.sidekick.jobs
          .filter((j) => j.status === "done")
          .map((j) => ({
            id: `job-${player.id}-${j.id}`,
            title: "Nico",
            body: "Got it, boss. I've remembered that.",
            route: "/nico",
          })),
      ];
      const latest = items.filter((item) => !previous.has(item.id));
      if (
        playerId === player.id &&
        !player.settings.driving &&
        latest.length > 0
      ) {
        // A completed quest can close a job too; surface just one decision.
        void Effect.runPromise(notificationCenter.publish(latest[0]!));
      }
      const access = notificationCenter.getSnapshot().access;
      if (
        player.sidekick.introduced &&
        !player.settings.driving &&
        (access === "default" || access === "unsupported") &&
        !promptedPlayers.has(player.id) &&
        O.isNone(notificationCenter.getSnapshot().notice)
      ) {
        promptedPlayers.add(player.id);
        if (promptedPlayers.size > 100)
          promptedPlayers.delete(promptedPlayers.values().next().value ?? "");
        void Effect.runPromise(
          notificationCenter.publish({
            id: `alerts-${player.id}`,
            title: "life",
            body: "Enable notifications to hear from Nico when you’re away.",
            route: "/notifications",
          }),
        );
      }
      playerId = player.id;
      previous = new Set(items.map((item) => item.id));
    };
    observe();
    return controller.subscribe(observe);
  }, [controller]);
  useEffect(() => {
    const refresh = () => notificationCenter.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  if (driving) return null;
  return (
    <>
      {O.isSome(state.notice) && (
        <aside className="port-notice" role="status" aria-live="polite">
          <button
            className="port-notice-open"
            onClick={() => {
              if (O.isSome(state.notice)) navigate(state.notice.value.route);
              notificationCenter.dismiss();
            }}
          >
            <strong>{state.notice.value.title}</strong>
            <span>{state.notice.value.body}</span>
          </button>
          <button
            className="port-notice-dismiss"
            aria-label="Dismiss notification"
            onClick={notificationCenter.dismiss}
          >
            <X size={20} />
          </button>
        </aside>
      )}
      <nav className="port-dock" aria-label="Port">
        <Link className="port-home" to="/" aria-label="Return to Port">
          <Home size={25} />
        </Link>
        <span>Port</span>
        <Link
          className="port-alert-settings"
          to="/notifications"
          aria-label="Notification settings"
        >
          <Bell size={21} />
        </Link>
      </nav>
    </>
  );
}
export function NotificationsPage() {
  const state = useSyncExternalStore(
    notificationCenter.subscribe,
    notificationCenter.getSnapshot,
  );
  const [testing, setTesting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const test = () => {
    setTesting(true);
    const id = Date.now().toString();
    void Effect.runPromise(
      notificationCenter.publish({
        id: `test-now-${id}`,
        title: "Nico",
        body: "Comms check. You're hearing me inside life.",
        route: "/nico",
      }),
    );
    notificationCenter.setStatus(
      "Switch away for the second test in 8 seconds. Keep life open.",
    );
    timer.current = setTimeout(() => {
      setTesting(false);
      void Effect.runPromise(
        notificationCenter.publish({
          id: `test-later-${id}`,
          title: "Nico",
          body: "Second comms check, boss. Your update is ready.",
          route: "/nico",
        }),
      );
      notificationCenter.setStatus(
        "Test attempted. If life stayed visible, the update appears in-game.",
      );
    }, 8000);
  };
  return (
    <section className="notification-settings">
      <p className="eyebrow">
        <Bell size={18} /> life / notifications
      </p>
      <h1>Stay in touch.</h1>
      <p>
        Let Nico reach you when an update is ready. While you're here, updates
        stay inside the game.
      </p>
      {state.access === "default" && (
        <button
          className="btn primary"
          onClick={() => {
            void notificationCenter.request();
          }}
        >
          Enable notifications
        </button>
      )}
      {state.access === "denied" && (
        <p>
          Notifications are blocked. Enable them in your browser or device
          notification settings, then return here.
        </p>
      )}
      {state.access === "granted" && <p>Device alerts are allowed.</p>}
      {state.access === "unsupported" && (
        <p>
          Device alerts aren't available in this browser. In-game updates still
          work.
        </p>
      )}
      <p className="notification-help">
        On iPhone: open life in Safari, use Share → Add to Home Screen, then
        open that icon and enable notifications.
      </p>
      <button className="btn" disabled={testing} onClick={test}>
        {testing ? "Testing…" : "Test two notifications"}
      </button>
      {state.status && <p role="status">{state.status}</p>}
      <p className="notification-help">
        This test runs only while the page remains alive. iPhone may pause it in
        the background. Alerts after closing life need a push server, which is
        not connected yet.
      </p>
    </section>
  );
}
