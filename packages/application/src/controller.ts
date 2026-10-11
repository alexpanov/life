import { Effect, Result as EffectResult } from "effect";
import {
  serializeGame,
  type Command,
  type Snapshot,
  type TransitionContext,
  type TransitionResult,
  type SidekickContext,
} from "../../core/src/index";
import {
  startRoutine,
  restoreRoutine,
  executeRoutine,
} from "../../core/src/routines";
import { createMemoryPersistence, type Persistence } from "./persistence";
import * as O from "../../foundation/src/option";
export { createMemoryPersistence } from "./persistence";
export interface SidekickProvider {
  respond(
    context: SidekickContext,
  ): Effect.Effect<{ text: string; promptVersion: number }, Error>;
}
export interface StoreSnapshot {
  game: O.Option<Snapshot>;
  storage: "loading" | "saved" | "session" | "recovery";
  notice: string;
  original: O.Option<string>;
}
export function createGameController(
  persistence: Persistence,
  context: () => TransitionContext,
) {
  let snapshot: StoreSnapshot = {
      game: O.none(),
      storage: "loading",
      notice: "",
      original: O.none(),
    },
    lastRaw: O.Option<string> = O.none(),
    saveQueue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const update = (patch: Partial<StoreSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    emit();
  };
  const persist = (game: Snapshot) => {
    if (snapshot.storage === "recovery") return;
    const raw = serializeGame(game),
      previous = lastRaw;
    lastRaw = O.some(raw);
    saveQueue = saveQueue.then(async () => {
      const saved = await Effect.runPromise(
        Effect.result(persistence.routines.save(raw, previous)),
      );
      if (EffectResult.isFailure(saved))
        update({
          storage: "session",
          notice: "Storage unavailable. Export before closing.",
        });
      else if (snapshot.storage !== "recovery") update({ storage: "saved" });
    });
  };
  const fresh = () => Effect.runSync(startRoutine(context()));
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    async load() {
      const read = await Effect.runPromise(
        Effect.result(persistence.repository.load()),
      );
      if (EffectResult.isFailure(read)) {
        update({
          game: O.some(fresh()),
          storage: "session",
          notice: "Storage unavailable. Export before closing.",
        });
        return;
      }
      if (O.isNone(read.success)) {
        const game = fresh();
        update({ game: O.some(game), storage: "saved" });
        persist(game);
        return;
      }
      if (O.isSome(read.success)) {
        const raw = read.success.value;
        const parsed = Effect.try({
          try: () => JSON.parse(raw) as unknown,
          catch: () => new Error("Invalid JSON"),
        }).pipe(Effect.flatMap((data) => restoreRoutine(data, context())));
        const restored = Effect.runSync(Effect.result(parsed));
        if (EffectResult.isSuccess(restored)) {
          lastRaw = O.some(raw);
          update({ game: O.some(restored.success), storage: "saved" });
          return;
        }
        let game: Snapshot = fresh();
        const backup = await Effect.runPromise(
          Effect.result(persistence.repository.backup()),
        );
        if (EffectResult.isSuccess(backup) && O.isSome(backup.success)) {
          const back = backup.success.value;
          const recovered = Effect.runSync(
            Effect.result(
              Effect.try({
                try: () => JSON.parse(back) as unknown,
                catch: () => new Error("Invalid backup"),
              }).pipe(
                Effect.flatMap((data) => restoreRoutine(data, context())),
              ),
            ),
          );
          if (EffectResult.isSuccess(recovered)) game = recovered.success;
        }
        update({
          game: O.some(game),
          storage: "recovery",
          original: O.some(raw),
          notice:
            "Unreadable save preserved. Export recovery data before replacing it.",
        });
      }
    },
    send(command: Command): TransitionResult {
      if (!O.isSome(snapshot.game)) throw Error("Game is loading.");
      const outcome = Effect.runSync(
        Effect.result(executeRoutine(snapshot.game.value, command, context())),
      );
      if (EffectResult.isFailure(outcome)) throw outcome.failure;
      const result = outcome.success;
      if (
        command.type === "import" &&
        typeof command.data === "object" &&
        command.data &&
        "kind" in command.data &&
        command.data.kind === "questos.save"
      )
        update({ storage: "saved", original: O.none() });
      update({ game: O.some(result.state), notice: result.message });
      persist(result.state);
      return result;
    },
    acceptRecovery() {
      if (!O.isSome(snapshot.game)) return;
      lastRaw = O.none();
      update({ storage: "saved", original: O.none() });
      persist(snapshot.game.value);
    },
    async flush() {
      await saveQueue;
    },
  };
}
export type GameController = ReturnType<typeof createGameController>;
