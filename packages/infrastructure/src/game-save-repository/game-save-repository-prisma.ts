import { Effect, Layer } from "effect";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";
import {
  gameSaveSelect,
  parseGameSave,
  parseGameSavePayload,
  type GameSaveSelected,
} from "./game-save-repository-parser-prisma";
import {
  GameSaveRepository,
  GameSaveRepositoryError,
  type GameSave,
  type GameSaveSlot,
} from "./game-save-repository";

/** Owner scope lives here. The parser does not choose which row. */
export function gameSaveBySlot(
  ownerId: string,
  slot: GameSaveSlot,
): Prisma.GameSaveWhereUniqueInput {
  return { userId_slot: { userId: ownerId, slot } };
}

export interface GameSaveQueries {
  readonly gameSave: {
    findUnique(args: {
      readonly where: Prisma.GameSaveWhereUniqueInput;
      readonly select: typeof gameSaveSelect;
    }): Promise<GameSaveSelected | null>;
    updateMany(args: {
      readonly where: Prisma.GameSaveWhereInput;
      readonly data: Prisma.GameSaveUpdateManyMutationInput;
    }): Promise<{ readonly count: number }>;
    create(args: {
      readonly data: Prisma.GameSaveCreateInput;
      readonly select: typeof gameSaveSelect;
    }): Promise<GameSaveSelected>;
  };
}

const missingOwner = () =>
  Effect.fail(
    new GameSaveRepositoryError("invalid", "Sign in before saving the game."),
  );

const conflict = (cause?: unknown) =>
  new GameSaveRepositoryError(
    "conflict",
    "Save changed on another device; reload before saving.",
    cause,
  );

const parsed = (
  row: GameSaveSelected,
): Effect.Effect<GameSave, GameSaveRepositoryError> => {
  const result = parseGameSave(row);
  if (E.isRight(result)) return Effect.succeed(result.right);
  return Effect.fail(new GameSaveRepositoryError("corrupt", result.left));
};

const acceptedPayload = (
  payload: string,
): Effect.Effect<string, GameSaveRepositoryError> => {
  const result = parseGameSavePayload(payload);
  if (E.isRight(result)) return Effect.succeed(result.right);
  return Effect.fail(new GameSaveRepositoryError("invalid", result.left));
};

const uniqueConflict = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  cause.code === "P2002";

/** Prisma implementation. Selects come from the parser. Wheres stay here. */
export function gameSaveRepositoryPrisma(
  client: GameSaveQueries,
  ownerId: string,
): {
  readonly bySlot: (
    slot: GameSaveSlot,
  ) => Effect.Effect<O.Option<GameSave>, GameSaveRepositoryError>;
  readonly save: (
    slot: GameSaveSlot,
    payload: string,
    expected: O.Option<string>,
  ) => Effect.Effect<GameSave, GameSaveRepositoryError>;
} {
  const whereFor = (slot: GameSaveSlot) => gameSaveBySlot(ownerId, slot);
  const readBack = (slot: GameSaveSlot) =>
    Effect.tryPromise({
      try: () =>
        client.gameSave.findUnique({
          where: whereFor(slot),
          select: gameSaveSelect,
        }),
      catch: (cause) =>
        new GameSaveRepositoryError(
          "read",
          "Could not read the game save.",
          cause,
        ),
    }).pipe(
      Effect.flatMap((row) =>
        row === null ? Effect.fail(conflict()) : parsed(row),
      ),
    );

  return {
    bySlot: (slot) => {
      if (!ownerId.trim()) return missingOwner();
      return Effect.tryPromise({
        try: () =>
          client.gameSave.findUnique({
            where: whereFor(slot),
            select: gameSaveSelect,
          }),
        catch: (cause) =>
          new GameSaveRepositoryError(
            "read",
            "Could not read the game save.",
            cause,
          ),
      }).pipe(
        Effect.flatMap((row) =>
          row === null
            ? Effect.succeed(O.none())
            : Effect.map(parsed(row), O.some),
        ),
      );
    },
    save: (slot, payload, expected) => {
      if (!ownerId.trim()) return missingOwner();
      return acceptedPayload(payload).pipe(
        Effect.flatMap((next) => {
          if (O.isNone(expected)) {
            return Effect.tryPromise({
              try: () =>
                client.gameSave.create({
                  data: {
                    userId: ownerId,
                    slot,
                    payload: next,
                    backupPayload: "",
                    backupPresent: false,
                  },
                  select: gameSaveSelect,
                }),
              catch: (cause) =>
                uniqueConflict(cause)
                  ? conflict(cause)
                  : new GameSaveRepositoryError(
                      "write",
                      "Could not save the game.",
                      cause,
                    ),
            }).pipe(Effect.flatMap(parsed));
          }
          const prior = expected.value;
          return Effect.tryPromise({
            try: () =>
              client.gameSave.updateMany({
                where: { userId: ownerId, slot, payload: prior },
                data: {
                  backupPayload: prior,
                  backupPresent: true,
                  payload: next,
                  updatedAt: new Date(),
                },
              }),
            catch: (cause) =>
              new GameSaveRepositoryError(
                "write",
                "Could not save the game.",
                cause,
              ),
          }).pipe(
            Effect.flatMap((result) =>
              result.count === 1 ? readBack(slot) : Effect.fail(conflict()),
            ),
          );
        }),
      );
    },
  };
}

export function gameSaveRepositoryPrismaLayer(
  client: PrismaClient,
  ownerId: string,
): Layer.Layer<GameSaveRepository> {
  return Layer.succeed(GameSaveRepository)(
    gameSaveRepositoryPrisma(client, ownerId),
  );
}
