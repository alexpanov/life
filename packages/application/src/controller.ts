import { Effect, Result as EffectResult } from "effect";
import {
  serializeGame,
  nicoEnergyStatus,
  grantVerifiedReferral,
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
import { NicoEnergyError, type NicoEnergyReservation } from "./energy";
import { ReferralError, verifyReferralReceiptRoutine } from "./referrals";
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
/** Compare wire values independently of object key insertion order. */
function canonicalWireJson(raw: string): string {
  const value: unknown = JSON.parse(raw);
  const keys = new Set<string>();
  JSON.stringify(value, (key, item: unknown) => {
    keys.add(key);
    return item;
  });
  return JSON.stringify(value, [...keys].sort());
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
  const reservations = new Map<string, NicoEnergyReservation>();
  const currentHero = () => {
    const game = snapshot.game;
    if (O.isNone(game)) throw new NicoEnergyError("Game is loading.");
    const hero = game.value.players.find(
      (p) => p.id === game.value.activePlayerId,
    );
    if (!hero) throw new NicoEnergyError("The active hero is unavailable.");
    return hero;
  };
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
          if (
            canonicalWireJson(serializeGame(restored.success)) !==
            canonicalWireJson(raw)
          )
            persist(restored.success);
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
    reserveNicoInteraction(): NicoEnergyReservation {
      const hero = currentHero(),
        at = context(),
        status = nicoEnergyStatus(hero.energy, at.now);
      const day = Math.floor(at.now / 86_400_000);
      const reserved = [...reservations.values()].filter(
        (r) => r.heroId === hero.id && r.day === day,
      ).length;
      if (!status.unlimited && status.remaining <= reserved)
        throw new NicoEnergyError(
          "Nico is resting. Energy returns at the next daily reset.",
        );
      const reservation = Object.freeze({
        heroId: hero.id,
        nicoId: hero.sidekick.id,
        requestId: at.eventId,
        day,
      });
      if (reservations.has(reservation.requestId))
        throw new NicoEnergyError("That request is already running.");
      reservations.set(reservation.requestId, reservation);
      return reservation;
    },
    releaseNicoInteraction(reservation: NicoEnergyReservation): void {
      if (reservations.get(reservation.requestId) === reservation)
        reservations.delete(reservation.requestId);
    },
    /** Both transitions are computed before publication, so invalid work never burns energy. */
    completeNicoInteraction(
      reservation: NicoEnergyReservation,
      command: O.Option<Command>,
    ): O.Option<TransitionResult> {
      const hero = currentHero();
      if (reservations.get(reservation.requestId) !== reservation)
        throw new NicoEnergyError("That request is no longer active.");
      if (
        hero.id !== reservation.heroId ||
        hero.sidekick.id !== reservation.nicoId
      )
        throw new NicoEnergyError("The hero changed. Send your message again.");
      if (O.isNone(snapshot.game))
        throw new NicoEnergyError("Game is loading.");
      const at = context();
      const consume = Effect.runSync(
        executeRoutine(
          snapshot.game.value,
          { type: "consume-nico-energy", requestId: reservation.requestId },
          at,
        ),
      );
      const result = O.isSome(command)
        ? O.some(
            Effect.runSync(executeRoutine(consume.state, command.value, at)),
          )
        : O.none<TransitionResult>();
      const state = O.isSome(result) ? result.value.state : consume.state;
      update({
        game: O.some(state),
        ...(O.isSome(result) ? { notice: result.value.message } : {}),
      });
      persist(state);
      reservations.delete(reservation.requestId);
      return result;
    },
    /** Only a receipt reference crosses this boundary; the configured server verifier supplies the facts. */
    grantVerifiedReferralRoutine(receiptReference: string) {
      return Effect.gen(function* () {
        const initial = yield* Effect.try({
          try: currentHero,
          catch: () => new ReferralError("The active hero is unavailable."),
        });
        const receipt = yield* verifyReferralReceiptRoutine(receiptReference);
        return yield* Effect.try({
          try: () => {
            const current = currentHero();
            if (
              current.id !== initial.id ||
              current.sidekick.id !== initial.sidekick.id
            )
              throw new ReferralError("The hero changed during verification.");
            if (O.isNone(snapshot.game))
              throw new ReferralError("Game is loading.");
            const energy = grantVerifiedReferral(
              current.energy,
              current.id,
              receipt,
              context().now,
            );
            const state = {
              ...snapshot.game.value,
              players: snapshot.game.value.players.map((p) =>
                p.id === current.id ? { ...p, energy } : p,
              ),
            };
            update({
              game: O.some(state),
              notice: "Vanguard access verified.",
            });
            persist(state);
            return energy;
          },
          catch: (cause) =>
            cause instanceof ReferralError
              ? cause
              : new ReferralError(
                  cause instanceof Error
                    ? cause.message
                    : "Referral verification failed.",
                ),
        });
      });
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
