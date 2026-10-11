import { Effect, Layer, Result } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  gameSaveBySlot,
  gameSaveRepositoryPrisma,
  type GameSaveQueries,
} from "./game-save-repository-prisma";
import {
  gameSaveSelect,
  parseGameSave,
  type GameSaveSelected,
} from "./game-save-repository-parser-prisma";
import {
  GameSaveRepository,
  GameSaveRepositoryError,
  type GameSave,
  type GameSaveSlot,
} from "./game-save-repository";
import { saveGameRoutine } from "./game-save-routine";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";

const ownerId = "662226fb-c2e4-4edf-b312-f4dac5dfd61d";
const payload = '{"version":1}';
const nextPayload = '{"version":2}';

const row = (
  current: string,
  backupPresent = false,
  backupPayload = "",
  slot: GameSaveSlot = "game",
): GameSaveSelected => ({
  slot,
  payload: current,
  backupPayload,
  backupPresent,
});

const repositoryOf = (client: GameSaveQueries) =>
  gameSaveRepositoryPrisma(client, ownerId);

describe("Game save parser", () => {
  it("maps a missing backup to None", () => {
    expect(parseGameSave(row(payload))).toEqual(
      E.right({
        slot: "game",
        payload,
        backup: O.none(),
      }),
    );
  });

  it("rejects a non-object payload and an inconsistent backup", () => {
    expect(E.isRight(parseGameSave(row("[]")))).toBe(false);
    expect(E.isRight(parseGameSave(row(payload, false, "{}")))).toBe(false);
    expect(
      E.isRight(parseGameSave(row(payload, true, ""))),
    ).toBe(false);
  });
});

describe("Game save Prisma repository", () => {
  it("reads with the owner where and the parser select", async () => {
    const findUnique = vi.fn(async () => row(payload, true, '{"version":0}'));
    const client: GameSaveQueries = {
      gameSave: {
        findUnique,
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const repository = gameSaveRepositoryPrisma(client, ownerId);
    expect(await Effect.runPromise(repository.bySlot("game"))).toEqual(
      O.some({
        slot: "game",
        payload,
        backup: O.some('{"version":0}'),
      }),
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: gameSaveBySlot(ownerId, "game"),
      select: gameSaveSelect,
    });
  });

  it("returns None when the row is missing", async () => {
    const client: GameSaveQueries = {
      gameSave: {
        findUnique: async () => null,
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const repository = gameSaveRepositoryPrisma(client, ownerId);
    expect(await Effect.runPromise(repository.bySlot("game"))).toEqual(
      O.none(),
    );
  });

  it("updates only the row whose payload matches and returns the parsed save", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const findUnique = vi.fn(async () => row(nextPayload, true, payload));
    const create = vi.fn();
    const client: GameSaveQueries = {
      gameSave: { findUnique, updateMany, create },
    };
    const repository = gameSaveRepositoryPrisma(client, ownerId);
    const saved = await Effect.runPromise(
      repository.save("game", nextPayload, O.some(payload)),
    );
    expect(saved).toEqual({
      slot: "game",
      payload: nextPayload,
      backup: O.some(payload),
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: ownerId, slot: "game", payload },
      data: {
        backupPayload: payload,
        backupPresent: true,
        payload: nextPayload,
        updatedAt: expect.any(Date),
      },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: gameSaveBySlot(ownerId, "game"),
      select: gameSaveSelect,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("inserts the first row when no prior payload is expected", async () => {
    const create = vi.fn(async () => row(payload, false, "", "starter"));
    const updateMany = vi.fn();
    const client: GameSaveQueries = {
      gameSave: { findUnique: vi.fn(), updateMany, create },
    };
    const repository = gameSaveRepositoryPrisma(client, ownerId);
    const saved = await Effect.runPromise(
      repository.save("starter", payload, O.none()),
    );
    expect(saved).toEqual({
      slot: "starter",
      payload,
      backup: O.none(),
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: ownerId,
        slot: "starter",
        payload,
        backupPayload: "",
        backupPresent: false,
      },
      select: gameSaveSelect,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not overwrite when the compare-and-swap matches nothing", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const create = vi.fn();
    const findUnique = vi.fn();
    const client: GameSaveQueries = {
      gameSave: { findUnique, updateMany, create },
    };
    const result = await Effect.runPromise(
      Effect.result(
        repositoryOf(client).save("game", nextPayload, O.some(payload)),
      ),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result))
      expect(result.failure).toMatchObject({
        _tag: "GameSaveRepositoryError",
        reason: "conflict",
      });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("does not overwrite when the insert hits the existing primary key", async () => {
    const create = vi.fn(async () => {
      throw { code: "P2002" };
    });
    const updateMany = vi.fn();
    const client: GameSaveQueries = {
      gameSave: { findUnique: vi.fn(), updateMany, create },
    };
    const result = await Effect.runPromise(
      Effect.result(repositoryOf(client).save("game", payload, O.none())),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result))
      expect(result.failure).toMatchObject({
        _tag: "GameSaveRepositoryError",
        reason: "conflict",
      });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("save game routine", () => {
  const save = (backup: O.Option<string>): GameSave => ({
    slot: "game",
    payload: O.isSome(backup) ? nextPayload : payload,
    backup,
  });

  const layerFor = (repository: {
    bySlot: (
      slot: GameSaveSlot,
    ) => Effect.Effect<O.Option<GameSave>, GameSaveRepositoryError>;
    save: (
      slot: GameSaveSlot,
      payload: string,
      expected: O.Option<string>,
    ) => Effect.Effect<GameSave, GameSaveRepositoryError>;
  }) => Layer.succeed(GameSaveRepository)(repository);

  it("does not write when the save is missing and a prior payload was expected", async () => {
    const write = vi.fn();
    const result = await Effect.runPromise(
      Effect.result(
        saveGameRoutine("game", nextPayload, O.some(payload)).pipe(
          Effect.provide(
            layerFor({
              bySlot: () => Effect.succeed(O.none()),
              save: write,
            }),
          ),
        ),
      ),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result))
      expect(result.failure).toMatchObject({
        _tag: "GameSaveRepositoryError",
        reason: "conflict",
      });
    expect(write).not.toHaveBeenCalled();
  });

  it("reads, then saves when the current payload matches", async () => {
    const write = vi.fn(() => Effect.succeed(save(O.some(payload))));
    const result = await Effect.runPromise(
      saveGameRoutine("game", nextPayload, O.some(payload)).pipe(
        Effect.provide(
          layerFor({
            bySlot: () =>
              Effect.succeed(
                O.some({
                  slot: "game",
                  payload,
                  backup: O.none(),
                }),
              ),
            save: write,
          }),
        ),
      ),
    );
    expect(result.backup).toEqual(O.some(payload));
    expect(write).toHaveBeenCalledWith("game", nextPayload, O.some(payload));
  });

  it("inserts through the facade when the slot is empty", async () => {
    const write = vi.fn(() => Effect.succeed(save(O.none())));
    const result = await Effect.runPromise(
      saveGameRoutine("game", payload, O.none()).pipe(
        Effect.provide(
          layerFor({
            bySlot: () => Effect.succeed(O.none()),
            save: write,
          }),
        ),
      ),
    );
    expect(result.payload).toBe(payload);
    expect(write).toHaveBeenCalledWith("game", payload, O.none());
  });
});
