import { Effect, Layer, Result } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
  nicoRepositoryPrisma,
  nicoById,
  type NicoQueries,
} from "./nico-repository-prisma";
import {
  nicoSelect,
  parseNico,
  type NicoSelected,
} from "./nico-repository-parser-prisma";
import {
  NicoRepository,
  NicoRepositoryError,
  type Nico,
} from "./nico-repository";
import { recordHeroNameRoutine } from "./nico-routine";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";

const ownerId = "662226fb-c2e4-4edf-b312-f4dac5dfd61d";

const row = (heroName: string | null, revision = 1): NicoSelected => ({
  id: "nico",
  name: "Niko",
  lastName: "Gonzalez",
  introduced: heroName !== null,
  heroName,
  revision,
});

describe("Nico parser", () => {
  it("maps a missing hero name to None", () => {
    expect(parseNico(row(null, 0))).toEqual(
      E.right({
        id: "nico",
        name: "Niko",
        lastName: "Gonzalez",
        introduced: false,
        heroName: O.none(),
        revision: 0,
      }),
    );
  });

  it("rejects a row whose name is not canon", () => {
    const parsed = parseNico({ ...row("Alex"), name: "Nick" });
    expect(E.isRight(parsed)).toBe(false);
  });
});

describe("Nico Prisma repository", () => {
  it("reads with the owner where and the parser select", async () => {
    const findUnique = vi.fn(async () => row("Alex"));
    const client: NicoQueries = {
      nico: { findUnique, update: vi.fn() },
    };
    const repository = nicoRepositoryPrisma(client, ownerId);
    expect(await Effect.runPromise(repository.byId("nico"))).toEqual(
      O.some({
        id: "nico",
        name: "Niko",
        lastName: "Gonzalez",
        introduced: true,
        heroName: O.some("Alex"),
        revision: 1,
      }),
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: nicoById(ownerId, "nico"),
      select: nicoSelect,
    });
  });

  it("returns None when the row is missing", async () => {
    const client: NicoQueries = {
      nico: {
        findUnique: async () => null,
        update: vi.fn(),
      },
    };
    const repository = nicoRepositoryPrisma(client, ownerId);
    expect(await Effect.runPromise(repository.byId("nico"))).toEqual(O.none());
  });

  it("updates through the same select and increments revision", async () => {
    const update = vi.fn(async () => row("Alex", 2));
    const client: NicoQueries = {
      nico: { findUnique: vi.fn(), update },
    };
    const repository = nicoRepositoryPrisma(client, ownerId);
    const saved = await Effect.runPromise(
      repository.recordHeroName("nico", " Alex "),
    );
    expect(saved.heroName).toEqual(O.some("Alex"));
    expect(saved.revision).toBe(2);
    expect(update).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId, id: "nico" } },
      data: {
        heroName: "Alex",
        introduced: true,
        revision: { increment: 1 },
      },
      select: nicoSelect,
    });
  });
});

describe("record hero name routine", () => {
  const nico = (heroName: O.Option<string>, revision = 1): Nico => ({
    id: "nico",
    name: "Niko",
    lastName: "Gonzalez",
    introduced: O.isSome(heroName),
    heroName,
    revision,
  });

  const layerFor = (repository: {
    byId: (id: string) => Effect.Effect<O.Option<Nico>, NicoRepositoryError>;
    recordHeroName: (
      id: string,
      heroName: string,
    ) => Effect.Effect<Nico, NicoRepositoryError>;
  }) => Layer.succeed(NicoRepository)(repository);

  it("does not write when the hero name is already stored", async () => {
    const recordHeroName = vi.fn();
    const result = await Effect.runPromise(
      recordHeroNameRoutine("nico", "Alex").pipe(
        Effect.provide(
          layerFor({
            byId: () => Effect.succeed(O.some(nico(O.some("Alex")))),
            recordHeroName,
          }),
        ),
      ),
    );
    expect(result.heroName).toEqual(O.some("Alex"));
    expect(recordHeroName).not.toHaveBeenCalled();
  });

  it("reads, then records a new hero name", async () => {
    const recordHeroName = vi.fn(() => Effect.succeed(nico(O.some("Alex"), 2)));
    const result = await Effect.runPromise(
      recordHeroNameRoutine("nico", "Alex").pipe(
        Effect.provide(
          layerFor({
            byId: () => Effect.succeed(O.some(nico(O.none(), 1))),
            recordHeroName,
          }),
        ),
      ),
    );
    expect(result.revision).toBe(2);
    expect(recordHeroName).toHaveBeenCalledWith("nico", "Alex");
  });

  it("fails when Niko is missing and does not write", async () => {
    const recordHeroName = vi.fn();
    const result = await Effect.runPromise(
      Effect.result(
        recordHeroNameRoutine("nico", "Alex").pipe(
          Effect.provide(
            layerFor({
              byId: () => Effect.succeed(O.none()),
              recordHeroName,
            }),
          ),
        ),
      ),
    );
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result))
      expect(result.failure).toMatchObject({
        _tag: "NicoRepositoryError",
        reason: "not-found",
      });
    expect(recordHeroName).not.toHaveBeenCalled();
  });
});
