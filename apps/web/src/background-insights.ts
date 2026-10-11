import { Effect, Layer } from "effect";
import type { GameController } from "../../../packages/application/src/controller";
import {
  createInsightsArchive,
  getInsightsRoutine,
  simulatedInsightsLayer,
} from "../../../packages/application/src/insights";
import {
  selectInsightChats,
  type InsightWindow,
} from "../../../packages/core/src/insights";
import type { SnippetArchiveStorage } from "../../../packages/application/src/snippet-archive";
import * as O from "../../../packages/foundation/src/option";

/** App-owned background work. It never changes routes, focus, or foreground state. */
export function startBackgroundInsights(
  controller: GameController,
  storage: SnippetArchiveStorage,
  runtime: {
    readonly now: () => number;
    readonly active: () => boolean;
    readonly onError: () => void;
  },
) {
  const layer = Layer.merge(
    createInsightsArchive(storage).layer,
    simulatedInsightsLayer,
  );
  let stopped = false,
    running = false,
    pending = false,
    revision = 0,
    hero = "";
  const currentHero = () => {
    const game = controller.getSnapshot().game;
    return O.isSome(game) ? game.value.activePlayerId : "";
  };
  const check = () => {
    const nextHero = currentHero();
    if (nextHero !== hero) {
      hero = nextHero;
      revision++;
    }
    if (stopped || !hero || !runtime.active()) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    const capturedHero = hero,
      capturedRevision = revision,
      now = runtime.now();
    const isCurrent = () =>
      !stopped &&
      revision === capturedRevision &&
      currentHero() === capturedHero &&
      runtime.active();
    const work = Effect.gen(function* () {
      const records = yield* controller.listNicoGenerations();
      if (!isCurrent()) return;
      for (const window of [
        "past-24-hours",
        "last-five-chats",
      ] satisfies InsightWindow[]) {
        const chats = selectInsightChats(records, capturedHero, window, now);
        yield* getInsightsRoutine(
          { heroId: capturedHero, window, now, chats },
          isCurrent,
        ).pipe(Effect.provide(layer));
      }
    });
    Effect.runPromise(work)
      .catch(() => {
        if (isCurrent()) runtime.onError();
      })
      .finally(() => {
        running = false;
        if (pending) {
          pending = false;
          check();
        }
      });
  };
  const unsubscribe = controller.subscribe(check);
  check();
  return {
    check,
    stop: () => {
      stopped = true;
      revision++;
      unsubscribe();
    },
  };
}
export function attachBrowserInsights(controller: GameController) {
  const background = startBackgroundInsights(
    controller,
    {
      read: (key) => O.fromNullable(localStorage.getItem(key)),
      write: (key, value) => localStorage.setItem(key, value),
    },
    {
      now: Date.now,
      active: () => !document.hidden && navigator.onLine,
      onError: () =>
        console.warn(
          "Niko insights could not be saved. Existing history is preserved; the app will retry.",
        ),
    },
  );
  const timer = window.setInterval(background.check, 60_000);
  document.addEventListener("visibilitychange", background.check);
  window.addEventListener("online", background.check);
  return () => {
    background.stop();
    clearInterval(timer);
    document.removeEventListener("visibilitychange", background.check);
    window.removeEventListener("online", background.check);
  };
}
