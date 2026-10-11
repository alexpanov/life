import { describe, expect, it } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { LanguageModel } from "effect/ai";
import { effectAiNicoLayer } from "../../packages/infrastructure/src/effect-ai-nico";
import {
  NicoModel,
  type NicoChatRequest,
} from "../../packages/application/src/nico-model";
import * as O from "../../packages/foundation/src/option";

const request: NicoChatRequest = {
  surface: "web",
  powerup: O.none(),
  chat: "Hello",
  system: { voice: "Niko", instructions: "Use the schema" },
  heroName: O.none(),
  routineSchema: {},
  targets: [],
  target: O.none(),
  storyChoices: [],
};
const fakeProvider = (text: string) =>
  Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: () => Effect.succeed([{ type: "text", text }]),
      streamText: () => Stream.empty,
    }),
  );
describe("Effect AI Niko adapter", () => {
  it("accepts a provider-neutral LanguageModel and returns a JSON proposal", async () => {
    const layer = effectAiNicoLayer.pipe(
      Layer.provide(fakeProvider('{"version":1,"kind":"say","text":"Ready."}')),
    );
    const reply = await Effect.runPromise(
      Effect.flatMap(NicoModel, (model) => model.propose(request)).pipe(
        Effect.provide(layer),
      ),
    );
    expect(reply).toEqual({ version: 1, kind: "say", text: "Ready." });
  });
  it("fails typed when a compatible provider returns invalid JSON", async () => {
    const layer = effectAiNicoLayer.pipe(
      Layer.provide(fakeProvider("not JSON")),
    );
    await expect(
      Effect.runPromise(
        Effect.flatMap(NicoModel, (model) => model.propose(request)).pipe(
          Effect.provide(layer),
        ),
      ),
    ).rejects.toMatchObject({ _tag: "ModelError" });
  });
});
