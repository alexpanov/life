import { Effect, Layer } from "effect";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";
import {
  nicoSelect,
  parseNico,
  type NicoSelected,
} from "./nico-repository-parser-prisma";
import {
  HERO_NAME_LIMIT,
  NicoRepository,
  NicoRepositoryError,
  type Nico,
} from "./nico-repository";

/** Owner scope lives here. The parser does not choose which row. */
export function nicoById(
  ownerId: string,
  id: string,
): Prisma.NicoWhereUniqueInput {
  return { ownerId_id: { ownerId, id } };
}

export interface NicoQueries {
  readonly nico: {
    findUnique(args: {
      readonly where: Prisma.NicoWhereUniqueInput;
      readonly select: typeof nicoSelect;
    }): Promise<NicoSelected | null>;
    update(args: {
      readonly where: Prisma.NicoWhereUniqueInput;
      readonly data: Prisma.NicoUpdateInput;
      readonly select: typeof nicoSelect;
    }): Promise<NicoSelected>;
  };
}

const missingOwner = () =>
  Effect.fail(new NicoRepositoryError("invalid", "Sign in before using Niko."));

const parsed = (
  row: NicoSelected,
): Effect.Effect<Nico, NicoRepositoryError> => {
  const result = parseNico(row);
  if (E.isRight(result)) return Effect.succeed(result.right);
  return Effect.fail(new NicoRepositoryError("corrupt", result.left));
};

const heroNameInput = (
  heroName: string,
): Effect.Effect<string, NicoRepositoryError> => {
  const trimmed = heroName.trim();
  if (!trimmed || trimmed.length > HERO_NAME_LIMIT)
    return Effect.fail(
      new NicoRepositoryError("invalid", "The hero's name is required."),
    );
  return Effect.succeed(trimmed);
};

const notFound = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  cause.code === "P2025";

/** Prisma implementation. Selects come from the parser. Wheres stay here. */
export function nicoRepositoryPrisma(
  client: NicoQueries,
  ownerId: string,
): {
  readonly byId: (
    id: string,
  ) => Effect.Effect<O.Option<Nico>, NicoRepositoryError>;
  readonly recordHeroName: (
    id: string,
    heroName: string,
  ) => Effect.Effect<Nico, NicoRepositoryError>;
} {
  const whereFor = (id: string) => nicoById(ownerId, id);
  return {
    byId: (id) => {
      if (!ownerId.trim()) return missingOwner();
      if (!id.trim())
        return Effect.fail(
          new NicoRepositoryError("invalid", "Niko is missing an id."),
        );
      return Effect.tryPromise({
        try: () =>
          client.nico.findUnique({
            where: whereFor(id),
            select: nicoSelect,
          }),
        catch: (cause) =>
          new NicoRepositoryError("read", "Could not read Niko.", cause),
      }).pipe(
        Effect.flatMap((row) =>
          row === null
            ? Effect.succeed(O.none())
            : Effect.map(parsed(row), O.some),
        ),
      );
    },
    recordHeroName: (id, heroName) => {
      if (!ownerId.trim()) return missingOwner();
      if (!id.trim())
        return Effect.fail(
          new NicoRepositoryError("invalid", "Niko is missing an id."),
        );
      return heroNameInput(heroName).pipe(
        Effect.flatMap((name) =>
          Effect.tryPromise({
            try: () =>
              client.nico.update({
                where: whereFor(id),
                data: {
                  heroName: name,
                  introduced: true,
                  revision: { increment: 1 },
                },
                select: nicoSelect,
              }),
            catch: (cause) =>
              notFound(cause)
                ? new NicoRepositoryError(
                    "not-found",
                    "Niko is not in this account.",
                    cause,
                  )
                : new NicoRepositoryError(
                    "write",
                    "Could not update Niko.",
                    cause,
                  ),
          }),
        ),
        Effect.flatMap(parsed),
      );
    },
  };
}

export function nicoRepositoryPrismaLayer(
  client: PrismaClient,
  ownerId: string,
): Layer.Layer<NicoRepository> {
  return Layer.succeed(NicoRepository)(nicoRepositoryPrisma(client, ownerId));
}
