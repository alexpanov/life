import { Effect } from "effect";
import * as O from "../../../foundation/src/option";
import { gameSaves } from "./game-save-repository-facade";
import {
  GameSaveRepositoryError,
  type GameSaveSlot,
} from "./game-save-repository";

const conflict = () =>
  new GameSaveRepositoryError(
    "conflict",
    "Save changed on another device; reload before saving.",
  );

/**
 * Reads through the facade, then writes through the facade.
 * A missing row with an expected payload is a conflict, not an insert.
 * No database vendor.
 */
export const saveGameRoutine = (
  slot: GameSaveSlot,
  payload: string,
  expected: O.Option<string>,
) =>
  Effect.gen(function* () {
    const current = yield* gameSaves.bySlot(slot);
    if (O.isNone(current)) {
      if (O.isSome(expected)) return yield* Effect.fail(conflict());
      return yield* gameSaves.save(slot, payload, expected);
    }
    if (O.isNone(expected) || current.value.payload !== expected.value)
      return yield* Effect.fail(conflict());
    return yield* gameSaves.save(slot, payload, expected);
  });
