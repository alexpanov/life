import type { Prisma } from "../generated/prisma/client";
import * as E from "../../../foundation/src/either";
import * as O from "../../../foundation/src/option";
import { HERO_NAME_LIMIT, type Nico } from "./nico-repository";

/** Fields the parser needs. A renamed or removed column fails here at compile time. */
export const nicoSelect = {
  id: true,
  name: true,
  lastName: true,
  introduced: true,
  heroName: true,
  revision: true,
} satisfies Prisma.NicoSelect;

export type NicoSelected = Prisma.NicoGetPayload<{ select: typeof nicoSelect }>;

/** Row in, domain Niko out. Database null becomes Option. */
export function parseNico(row: NicoSelected): E.Either<string, Nico> {
  if (row.name !== "Niko" || row.lastName !== "Gonzalez")
    return E.left("Niko's saved name is not the canon name.");
  if (!row.id.trim()) return E.left("Niko is missing an id.");
  if (!Number.isInteger(row.revision) || row.revision < 0)
    return E.left("Niko's revision is invalid.");
  const heroName = row.heroName?.trim() ?? "";
  if (heroName.length > HERO_NAME_LIMIT)
    return E.left("The hero's name is too long.");
  return E.right({
    id: row.id,
    name: "Niko",
    lastName: "Gonzalez",
    introduced: row.introduced,
    heroName: heroName ? O.some(heroName) : O.none(),
    revision: row.revision,
  });
}
