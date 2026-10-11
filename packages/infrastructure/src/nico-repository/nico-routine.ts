import { Effect } from "effect";
import * as O from "../../../foundation/src/option";
import { nicos } from "./nico-repository-facade";
import { NicoRepositoryError } from "./nico-repository";

/** Reads through the facade, then writes through the facade. No database vendor. */
export const recordHeroNameRoutine = (id: string, heroName: string) =>
  Effect.gen(function* () {
    const current = yield* nicos.byId(id);
    if (O.isNone(current))
      return yield* Effect.fail(
        new NicoRepositoryError("not-found", "Niko is not in this account."),
      );
    const next = heroName.trim();
    if (
      O.isSome(current.value.heroName) &&
      current.value.heroName.value === next
    )
      return current.value;
    return yield* nicos.recordHeroName(id, next);
  });
