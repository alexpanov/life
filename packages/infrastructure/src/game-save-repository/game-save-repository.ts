import { Context, Effect } from "effect";
import type { Option } from "../../../foundation/src/option";

/** One snapshot slot. The database check allows only these two. */
export type GameSaveSlot = "game" | "starter";

/** Domain game save. Absence is Option. This file does not know about Prisma. */
export interface GameSave {
  readonly slot: GameSaveSlot;
  readonly payload: string;
  readonly backup: Option<string>;
}

/** SQL octet_length limit. One mebibyte. */
export const GAME_SAVE_OCTET_LIMIT = 1048576;

export class GameSaveRepositoryError extends Error {
  readonly _tag = "GameSaveRepositoryError";
  constructor(
    readonly reason: "read" | "write" | "corrupt" | "conflict" | "invalid",
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GameSaveRepositoryError";
  }
}

/** Reads and compare-and-swap writes. Callers receive domain types, never rows. */
export class GameSaveRepository extends Context.Service<
  GameSaveRepository,
  {
    readonly bySlot: (
      slot: GameSaveSlot,
    ) => Effect.Effect<Option<GameSave>, GameSaveRepositoryError>;
    readonly save: (
      slot: GameSaveSlot,
      payload: string,
      expected: Option<string>,
    ) => Effect.Effect<GameSave, GameSaveRepositoryError>;
  }
>()("life/GameSaveRepository") {}
