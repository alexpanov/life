import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import {
  ThinkThoughtError,
  ThinkThoughtModel,
  mockThinkThoughtLayer,
  thinkThought,
} from "../../packages/application/src/think-thought";
import type { Hero, ThoughtEnvironment } from "../../packages/core/src/thought";
import * as O from "../../packages/foundation/src/option";
const hero = {
  role: "hero",
  relationship: "self",
  name: O.some("Alex"),
  privateDatabaseId: "secret-hero-id",
} satisfies Hero & { privateDatabaseId: string };
const environment: ThoughtEnvironment = {
  hero,
  people: [hero],
  realm: O.none(),
  quest: O.none(),
  needsRest: false,
  energy: "available",
  faith: "unspecified",
};
describe("internal thinkThought routine", () => {
  it("runs through the replaceable simulator service", async () => {
    const result = await Effect.runPromise(
      thinkThought(environment, []).pipe(Effect.provide(mockThinkThoughtLayer)),
    );
    expect(result.topic).toBe("orientation");
    expect(result.nextAction.length).toBeGreaterThan(0);
  });
  it("fails without calling the provider if the hero is absent", async () => {
    let called = false;
    const layer = Layer.succeed(ThinkThoughtModel)({
      think: () => {
        called = true;
        return Effect.succeed({});
      },
    });
    const error = await Effect.runPromise(
      thinkThought({ ...environment, people: [] }, []).pipe(
        Effect.provide(layer),
        Effect.flip,
      ),
    );
    expect(error.reason).toBe("invalid-environment");
    expect(called).toBe(false);
  });
  it("whitelists context and rejects malformed provider results", async () => {
    let request = "";
    const layer = Layer.succeed(ThinkThoughtModel)({
      think: (value) => {
        request = JSON.stringify(value);
        return Effect.succeed({ arbitrary: "output" });
      },
    });
    const error = await Effect.runPromise(
      thinkThought(environment, []).pipe(Effect.provide(layer), Effect.flip),
    );
    expect(error.reason).toBe("invalid-output");
    expect(request).not.toContain("secret-hero-id");
    expect(request).not.toContain("privateDatabaseId");
  });
  it("propagates typed provider failures", async () => {
    const failure = new ThinkThoughtError("provider", "Unavailable");
    const layer = Layer.succeed(ThinkThoughtModel)({
      think: () => Effect.fail(failure),
    });
    const result = await Effect.runPromise(
      thinkThought(environment, []).pipe(Effect.provide(layer), Effect.flip),
    );
    expect(result).toBe(failure);
  });
});
