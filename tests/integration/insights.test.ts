import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import {
  createInsightsArchive,
  getInsightsRoutine,
  InsightsError,
  InsightsModel,
  simulatedInsightsLayer,
} from "../../packages/application/src/insights";
import type { InsightInput } from "../../packages/core/src/insights";
import * as O from "../../packages/foundation/src/option";
const input = (now = 100_000_000): InsightInput => ({
  heroId: "hero",
  now,
  window: "past-24-hours",
  chats: [{ id: "one", at: now, text: "A useful step" }],
});
function setup() {
  const values = new Map<string, string>();
  const archive = createInsightsArchive({
    read: (key) => O.fromNullable(values.get(key)),
    write: (key, value) => {
      values.set(key, value);
    },
  });
  return {
    archive,
    values,
    run: (request: InsightInput) =>
      Effect.runPromise(
        getInsightsRoutine(request).pipe(
          Effect.provide(Layer.merge(archive.layer, simulatedInsightsLayer)),
        ),
      ),
  };
}
describe("internal insights routines", () => {
  it("persists once within 24 hours, survives a new adapter, and runs again at the boundary", async () => {
    const { run, archive, values } = setup();
    await run(input());
    await run(input(100_000_001));
    expect(
      await Effect.runPromise(archive.repository.list("hero")),
    ).toHaveLength(1);
    const reloaded = createInsightsArchive({
      read: (key) => O.fromNullable(values.get(key)),
      write: (key, value) => {
        values.set(key, value);
      },
    });
    await Effect.runPromise(
      getInsightsRoutine(input(186_400_000)).pipe(
        Effect.provide(Layer.merge(reloaded.layer, simulatedInsightsLayer)),
      ),
    );
    expect(
      await Effect.runPromise(reloaded.repository.list("hero")),
    ).toHaveLength(2);
    expect(await Effect.runPromise(reloaded.repository.list("other"))).toEqual(
      [],
    );
  });
  it("requires five chats and deduplicates repeated last-five evidence independent of time", async () => {
    const { run, archive } = setup();
    const request = { ...input(), window: "last-five-chats" as const };
    expect(await run(request)).toEqual(O.none());
    const full = {
      ...request,
      chats: Array.from({ length: 5 }, (_, n) => ({
        id: String(n),
        at: n,
        text: "chat",
      })),
    };
    await run(full);
    await run({ ...full, now: full.now + 1 });
    expect(
      await Effect.runPromise(archive.repository.list("hero")),
    ).toHaveLength(1);
    await run({
      ...full,
      chats: [...full.chats.slice(1), { id: "new", at: 6, text: "new" }],
    });
    expect(
      await Effect.runPromise(archive.repository.list("hero")),
    ).toHaveLength(2);
  });
  it("does not mark failed analysis complete; retry succeeds", async () => {
    const { run, archive } = setup();
    const failing = Layer.succeed(InsightsModel)({
      provider: "simulator",
      model: "failing",
      analyze: () => Effect.fail(new InsightsError("failed")),
    });
    await expect(
      Effect.runPromise(
        getInsightsRoutine(input()).pipe(
          Effect.provide(Layer.merge(archive.layer, failing)),
        ),
      ),
    ).rejects.toThrow("failed");
    expect(await Effect.runPromise(archive.repository.list("hero"))).toEqual(
      [],
    );
    await run(input());
    expect(
      await Effect.runPromise(archive.repository.list("hero")),
    ).toHaveLength(1);
  });
  it("discards completed analysis when the hero changed during the provider call", async () => {
    const { archive } = setup();
    let current = true;
    const model = Layer.succeed(InsightsModel)({
      provider: "simulator",
      model: "switch",
      analyze: () =>
        Effect.sync(() => {
          current = false;
          return { facts: ["fact"], suggestions: [] };
        }),
    });
    const result = await Effect.runPromise(
      getInsightsRoutine(input(), () => current).pipe(
        Effect.provide(Layer.merge(archive.layer, model)),
      ),
    );
    expect(result).toEqual(O.none());
    expect(await Effect.runPromise(archive.repository.list("hero"))).toEqual(
      [],
    );
  });
  it("preserves corrupt storage instead of overwriting it", async () => {
    let raw = "broken";
    const archive = createInsightsArchive({
      read: () => O.some(raw),
      write: (_key, value) => {
        raw = value;
      },
    });
    await expect(
      Effect.runPromise(
        getInsightsRoutine(input()).pipe(
          Effect.provide(Layer.merge(archive.layer, simulatedInsightsLayer)),
        ),
      ),
    ).rejects.toThrow("preserved");
    expect(raw).toBe("broken");
  });
});
