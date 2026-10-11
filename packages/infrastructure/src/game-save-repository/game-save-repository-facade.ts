import { Effect } from "effect";
import type { Option } from "../../../foundation/src/option";
import {
  GameSaveRepository,
  GameSaveRepositoryError,
  type GameSave,
  type GameSaveSlot,
} from "./game-save-repository";

/**
 * Effect facade. Routines call `gameSaves.bySlot` and `gameSaves.save`.
 * They do not touch a client, a static model, or a query.
 */
export const gameSaves = {
  bySlot: (
    slot: GameSaveSlot,
  ): Effect.Effect<
    Option<GameSave>,
    GameSaveRepositoryError,
    GameSaveRepository
  > =>
    Effect.gen(function* () {
      const repository = yield* GameSaveRepository;
      return yield* repository.bySlot(slot);
    }),
  save: (
    slot: GameSaveSlot,
    payload: string,
    expected: Option<string>,
  ): Effect.Effect<GameSave, GameSaveRepositoryError, GameSaveRepository> =>
    Effect.gen(function* () {
      const repository = yield* GameSaveRepository;
      return yield* repository.save(slot, payload, expected);
    }),
};
