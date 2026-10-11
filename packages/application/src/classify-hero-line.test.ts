import { describe, expect, it, vi } from "vitest";
import { Effect, Layer } from "effect";
import { ask, heroLineClassification } from "../../core/src/nico-response";
import {
  ClassifyHeroLineError,
  HeroLineModel,
  classifyHeroLine,
  standInHeroLineLayer,
} from "./classify-hero-line";

const scripted = {
  "don't call me brother": heroLineClassification(
    "correction",
    "don't call me brother",
  ),
  awesome: heroLineClassification("praise", "awesome"),
};

const standIn = standInHeroLineLayer((line) => {
  if (line === "don't call me brother" || line === "awesome")
    return scripted[line];
  return heroLineClassification("unsure", line);
});

const run = (line: string, layer: Layer.Layer<HeroLineModel> = standIn) =>
  Effect.runPromise(classifyHeroLine(line).pipe(Effect.provide(layer)));

describe("classify hero line", () => {
  it("returns only the classification for every hero line", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("no network"));
    const correction = await run("  don't call me brother  ");
    const praise = await run("awesome");
    const unsure = await run("maybe later");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(correction).toEqual({
      category: "correction",
      evidence: "don't call me brother",
      recommendedAction: "remember",
    });
    expect(Object.keys(correction)).toEqual([
      "category",
      "evidence",
      "recommendedAction",
    ]);
    expect(praise).toEqual({
      category: "praise",
      evidence: "awesome",
      recommendedAction: "note-what-you-did",
    });
    expect(unsure).toEqual({
      category: "unsure",
      evidence: "maybe later",
      recommendedAction: "ask",
    });
    if (unsure.category === "unsure")
      expect(ask(unsure)).toBe("What did you mean by “maybe later”?");
  });

  it("rejects a bad line before calling the provider", async () => {
    let called = false;
    const layer = standInHeroLineLayer(() => {
      called = true;
      return {};
    });
    const error = await Effect.runPromise(
      classifyHeroLine("   ").pipe(Effect.provide(layer), Effect.flip),
    );
    expect(error.reason).toBe("invalid-line");
    expect(called).toBe(false);
  });

  it("rejects provider output that breaks the action or the shape", async () => {
    const wrongAction = standInHeroLineLayer(() => ({
      category: "correction",
      evidence: "don't call me brother",
      recommendedAction: "ask",
      secret: "hidden",
    }));
    const extra = standInHeroLineLayer(() => ({
      category: "praise",
      evidence: "awesome",
      recommendedAction: "note-what-you-did",
      secret: "hidden",
    }));
    const broken = standInHeroLineLayer(() => "not json");
    for (const layer of [wrongAction, extra, broken]) {
      const error = await Effect.runPromise(
        classifyHeroLine("hello").pipe(Effect.provide(layer), Effect.flip),
      );
      expect(error.reason).toBe("invalid-output");
      expect(error.message).not.toContain("hidden");
    }
  });

  it("keeps a provider failure typed", async () => {
    const failure = new ClassifyHeroLineError("provider", "Unavailable");
    const layer = Layer.succeed(HeroLineModel)({
      classify: () => Effect.fail(failure),
    });
    const error = await Effect.runPromise(
      classifyHeroLine("hello").pipe(Effect.provide(layer), Effect.flip),
    );
    expect(error).toBe(failure);
  });
});
