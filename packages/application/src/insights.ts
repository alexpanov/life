import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import {
  insightFingerprint,
  InsightOutputSchema,
  InsightRecordSchema,
  simulateInsights,
  type InsightInput,
  type InsightOutput,
  type InsightRecord,
} from "../../core/src/insights";
import type { SnippetArchiveStorage } from "./snippet-archive";
import * as O from "../../foundation/src/option";
export class InsightsError extends Error {
  readonly _tag = "InsightsError";
}
export class InsightsModel extends Context.Service<
  InsightsModel,
  {
    readonly provider: string;
    readonly model: string;
    readonly analyze: (
      input: InsightInput,
    ) => Effect.Effect<InsightOutput, InsightsError>;
  }
>()("life/InsightsModel") {}
export class InsightsRepository extends Context.Service<
  InsightsRepository,
  {
    readonly list: (
      heroId: string,
    ) => Effect.Effect<readonly InsightRecord[], InsightsError>;
  }
>()("life/InsightsRepository") {}
export class InsightsRoutines extends Context.Service<
  InsightsRoutines,
  {
    readonly append: (
      record: InsightRecord,
    ) => Effect.Effect<InsightRecord, InsightsError>;
  }
>()("life/InsightsRoutines") {}
export const simulatedInsightsLayer = Layer.succeed(InsightsModel)({
  provider: "simulator",
  model: "nico-insights-v1",
  analyze: (input) => Effect.succeed(simulateInsights(input)),
});
/** Internal only. No quest changes, navigation, diagnosis, or automatic personality changes. */
export const getInsightsRoutine = (
  input: InsightInput,
  isCurrent: () => boolean = () => true,
) =>
  Effect.gen(function* () {
    if (!isCurrent()) return O.none<InsightRecord>();
    if (
      input.chats.length === 0 ||
      (input.window === "last-five-chats" && input.chats.length < 5)
    )
      return O.none<InsightRecord>();
    const repository = yield* InsightsRepository;
    const existing = yield* repository.list(input.heroId);
    const fingerprint = insightFingerprint(input);
    const previous = existing.find(
      (record) =>
        record.window === input.window &&
        (record.fingerprint === fingerprint ||
          (input.window === "past-24-hours" &&
            input.now - record.createdAt < 86_400_000)),
    );
    if (previous) return O.some(previous);
    const model = yield* InsightsModel;
    const output = yield* model.analyze(input);
    const parsed = InsightOutputSchema.safeParse(output);
    if (!parsed.success)
      return yield* Effect.fail(
        new InsightsError("Insight output is invalid."),
      );
    if (!isCurrent()) return O.none<InsightRecord>();
    const routines = yield* InsightsRoutines;
    return O.some(
      yield* routines.append({
        heroId: input.heroId,
        window: input.window,
        createdAt: input.now,
        fingerprint,
        evidenceIds: input.chats.map((chat) => chat.id),
        provider: model.provider,
        model: model.model,
        output: parsed.data,
      }),
    );
  });
const recordsSchema = z.array(InsightRecordSchema);
export function createInsightsArchive(storage: SnippetArchiveStorage) {
  const key = (heroId: string) =>
    `life:insights:v1:${encodeURIComponent(heroId)}`;
  const attempt = <A>(run: () => A) =>
    Effect.try({
      try: run,
      catch: () =>
        new InsightsError(
          "Insight storage is unavailable or invalid. Existing data was preserved.",
        ),
    });
  const read = (heroId: string): readonly InsightRecord[] => {
    const raw = storage.read(key(heroId));
    const records = O.isSome(raw)
      ? recordsSchema.parse(JSON.parse(raw.value))
      : [];
    if (records.some((record) => record.heroId !== heroId))
      throw new InsightsError("Foreign insight record.");
    return records;
  };
  const repository = { list: (heroId: string) => attempt(() => read(heroId)) };
  const routines = {
    append: (record: InsightRecord) =>
      attempt(() => {
        const parsed = InsightRecordSchema.parse(record);
        const records = read(record.heroId);
        const prior = records.find(
          (item) => item.fingerprint === record.fingerprint,
        );
        if (prior) return prior;
        storage.write(key(record.heroId), JSON.stringify([...records, parsed]));
        return parsed;
      }),
  };
  return {
    repository,
    routines,
    layer: Layer.merge(
      Layer.succeed(InsightsRepository)(repository),
      Layer.succeed(InsightsRoutines)(routines),
    ),
  };
}
