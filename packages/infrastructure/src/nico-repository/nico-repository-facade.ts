import { Effect } from "effect";
import type { Option } from "../../../foundation/src/option";
import {
  NicoRepository,
  NicoRepositoryError,
  type Nico,
} from "./nico-repository";

/**
 * Effect facade. Routines call `nicos.byId`. They do not touch a client,
 * a static model, or a query.
 */
export const nicos = {
  byId: (
    id: string,
  ): Effect.Effect<Option<Nico>, NicoRepositoryError, NicoRepository> =>
    Effect.gen(function* () {
      const repository = yield* NicoRepository;
      return yield* repository.byId(id);
    }),
  recordHeroName: (
    id: string,
    heroName: string,
  ): Effect.Effect<Nico, NicoRepositoryError, NicoRepository> =>
    Effect.gen(function* () {
      const repository = yield* NicoRepository;
      return yield* repository.recordHeroName(id, heroName);
    }),
};
