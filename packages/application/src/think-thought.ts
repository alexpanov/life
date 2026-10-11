import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
  simulateThought,
  type NicoThought,
  type ThoughtEnvironment,
} from "../../core/src/thought";
import * as O from "../../foundation/src/option";

export class ThinkThoughtError extends Error {
  readonly _tag = "ThinkThoughtError";
  constructor(
    readonly reason: "invalid-environment" | "invalid-output" | "provider",
    message: string,
  ) {
    super(message);
  }
}
/** Provider-neutral boundary; a provider returns a concise result, not private reasoning. */
export class ThinkThoughtModel extends Context.Service<
  ThinkThoughtModel,
  {
    readonly think: (
      environment: ThoughtEnvironment,
      previousThoughtIds: readonly string[],
    ) => Effect.Effect<unknown, ThinkThoughtError>;
  }
>()("life/ThinkThoughtModel") {}
export const mockThinkThoughtLayer = Layer.succeed(ThinkThoughtModel)({
  think: (environment, previousThoughtIds) =>
    Effect.succeed(simulateThought(environment, previousThoughtIds)),
});
const thoughtSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    topic: z.enum(["rest", "quest", "family", "faith", "orientation"]),
    assessment: z.string().trim().min(1).max(400),
    nextAction: z.string().trim().min(1).max(400),
  })
  .strict();
const copyName = (name: O.Option<string>): O.Option<string> =>
  O.isSome(name) ? O.some(name.value) : O.none();
/** Internal routine. Deliberately absent from frontend and model JSON catalogs. */
export const thinkThought = (
  environment: ThoughtEnvironment,
  previousThoughtIds: readonly string[],
): Effect.Effect<NicoThought, ThinkThoughtError, ThinkThoughtModel> =>
  Effect.gen(function* () {
    const sameName = (name: O.Option<string>) =>
      O.match(
        name,
        () => O.isNone(environment.hero.name),
        (value) =>
          O.isSome(environment.hero.name) &&
          environment.hero.name.value === value,
      );
    if (
      environment.hero.relationship !== "self" ||
      !environment.people.some(
        (person) => person.relationship === "self" && sameName(person.name),
      )
    ) {
      return yield* Effect.fail(
        new ThinkThoughtError(
          "invalid-environment",
          "The environment must include its hero among its people.",
        ),
      );
    }
    // Whitelist fields so incidental entity fields (including database IDs) cannot enter a model request.
    const safeEnvironment: ThoughtEnvironment = {
      hero: {
        role: "hero",
        relationship: "self",
        name: copyName(environment.hero.name),
      },
      people: environment.people.map((person) => ({
        name: copyName(person.name),
        relationship: person.relationship,
      })),
      realm: copyName(environment.realm),
      quest: O.map(environment.quest, (quest) => ({
        title: quest.title,
        status: quest.status,
      })),
      needsRest: environment.needsRest,
      energy: environment.energy,
      faith: environment.faith,
    };
    const model = yield* ThinkThoughtModel;
    const result = thoughtSchema.safeParse(
      yield* model.think(safeEnvironment, [...previousThoughtIds]),
    );
    if (!result.success)
      return yield* Effect.fail(
        new ThinkThoughtError(
          "invalid-output",
          "The thought provider returned an invalid result.",
        ),
      );
    return result.data;
  });
