import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
  heroLineClassification,
  recommendedActionFor,
  type HeroLineClassification,
  type HeroLineCategory,
} from "../../core/src/nico-response";

export class ClassifyHeroLineError extends Error {
  readonly _tag = "ClassifyHeroLineError";
  constructor(
    readonly reason: "invalid-line" | "invalid-output" | "provider",
    message: string,
  ) {
    super(message);
    this.name = "ClassifyHeroLineError";
  }
}

/** The model call. Game logic never talks to this provider. */
export class HeroLineModel extends Context.Service<
  HeroLineModel,
  {
    readonly classify: (
      line: string,
    ) => Effect.Effect<unknown, ClassifyHeroLineError>;
  }
>()("life/HeroLineModel") {}

const classificationSchema = z.strictObject({
  category: z.enum(["correction", "praise", "unsure"]),
  evidence: z.string().trim().min(1).max(160),
  recommendedAction: z.enum(["remember", "note-what-you-did", "ask"]),
});

function readProviderJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  return JSON.parse(raw) as unknown;
}

/** Classifies one hero line. Success is only the category, evidence, and action. */
export const classifyHeroLine = (
  line: string,
): Effect.Effect<
  HeroLineClassification,
  ClassifyHeroLineError,
  HeroLineModel
> =>
  Effect.gen(function* () {
    const text = line.trim();
    if (!text || text.length > 2000)
      return yield* Effect.fail(
        new ClassifyHeroLineError(
          "invalid-line",
          "Write a hero line of 1–2,000 characters.",
        ),
      );
    const model = yield* HeroLineModel;
    const raw = yield* model.classify(text);
    const decoded = yield* Effect.try({
      try: () => readProviderJson(raw),
      catch: () =>
        new ClassifyHeroLineError(
          "invalid-output",
          "Nico's classifier returned invalid JSON.",
        ),
    });
    const parsed = classificationSchema.safeParse(decoded);
    if (!parsed.success)
      return yield* Effect.fail(
        new ClassifyHeroLineError(
          "invalid-output",
          "Nico's classifier returned an invalid result.",
        ),
      );
    const category: HeroLineCategory = parsed.data.category;
    if (parsed.data.recommendedAction !== recommendedActionFor(category))
      return yield* Effect.fail(
        new ClassifyHeroLineError(
          "invalid-output",
          "Nico's classifier recommended the wrong action.",
        ),
      );
    return heroLineClassification(category, parsed.data.evidence);
  });

/** Test and local stand-in. It has no provider key and does not call the network. */
export const standInHeroLineLayer = (
  classify: (line: string) => unknown,
): Layer.Layer<HeroLineModel> =>
  Layer.succeed(HeroLineModel)({
    classify: (line) => Effect.succeed(classify(line)),
  });
