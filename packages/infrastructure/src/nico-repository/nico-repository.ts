import { Context, Effect } from "effect";
import type { Option } from "../../../foundation/src/option";

/** Domain Niko. Absence is Option. This file does not know about Prisma. */
export interface Nico {
  readonly id: string;
  readonly name: "Niko";
  readonly lastName: "Gonzalez";
  readonly introduced: boolean;
  readonly heroName: Option<string>;
  readonly revision: number;
}

export const HERO_NAME_LIMIT = 60;

export class NicoRepositoryError extends Error {
  readonly _tag = "NicoRepositoryError";
  constructor(
    readonly reason: "read" | "write" | "corrupt" | "not-found" | "invalid",
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NicoRepositoryError";
  }
}

/** Reads and simple updates. Callers receive domain types, never rows. */
export class NicoRepository extends Context.Service<
  NicoRepository,
  {
    readonly byId: (
      id: string,
    ) => Effect.Effect<Option<Nico>, NicoRepositoryError>;
    readonly recordHeroName: (
      id: string,
      heroName: string,
    ) => Effect.Effect<Nico, NicoRepositoryError>;
  }
>()("life/NicoRepository") {}
