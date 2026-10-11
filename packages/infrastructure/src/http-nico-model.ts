import { Effect, Layer } from "effect";
import { z } from "zod";
import {
  NicoModel,
  ModelError,
  mockNicoLayer,
  simulateNicoProposal,
} from "../../application/src/nico-model";
import { validateNicoProposal } from "../../application/src/routine-protocol";
import type { ModelFetch } from "./model-gateway";
const statusSchema = z.strictObject({
  configured: z.boolean(),
  available: z.boolean(),
  authenticated: z.boolean(),
  authorized: z.boolean(),
});
/** Same-origin adapter. Only an explicit unconfigured status permits simulation. */
export const httpNicoLayer = (fetcher: ModelFetch = fetch) =>
  Layer.succeed(NicoModel)({
    propose: (request) =>
      Effect.gen(function* () {
        const raw = yield* Effect.tryPromise({
          try: async () => {
            const statusResponse = await fetcher("/api/nico/status", {
              credentials: "same-origin",
              cache: "no-store",
          signal: AbortSignal.timeout(5000),
            });
            if (!statusResponse.ok) throw Error("Model status unavailable");
            const status = statusSchema.parse(await statusResponse.json());
            if (!status.configured) return simulateNicoProposal(request);
            if (!status.available) throw Error("Owner authentication required");
            const response = await fetcher("/api/nico/propose", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request),
              signal: AbortSignal.timeout(25_000),
            });
            if (!response.ok) throw Error("Model request unavailable");
            return (await response.json()) as unknown;
          },
          catch: () =>
            new ModelError("Niko could not reach his model. Please try again."),
        });
        return yield* validateNicoProposal(raw).pipe(
          Effect.mapError(
            () => new ModelError("Niko returned an invalid response."),
          ),
        );
      }),
    // Completion/onboarding lines remain deliberately local until their separate API is designed.
    reply: (context, intent) =>
      Effect.flatMap(NicoModel, (model) => model.reply(context, intent)).pipe(
        Effect.provide(mockNicoLayer),
      ),
  });
