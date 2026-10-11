import { Context, Effect, Layer } from "effect";
import type { SidekickContext } from "../../core/src/sidekick";
import * as O from "../../foundation/src/option";
export type NicoIntent = "meet" | "celebrate" | "reflect" | "choose";
export class ModelError extends Error {
  readonly _tag = "ModelError";
}
/** Effect v4 service key (the tagged service boundary). Providers cannot mutate progress. */
export class NicoModel extends Context.Service<
  NicoModel,
  {
    readonly reply: (
      context: SidekickContext,
      intent: NicoIntent,
    ) => Effect.Effect<string, ModelError>;
  }
>()("life/NicoModel") {}
export const mockNicoLayer = Layer.succeed(NicoModel)({
  reply: (context, intent) =>
    Effect.succeed(
      intent === "meet"
        ? "Hey friend, I’m Nico Lopez. I’d like to be your sidekick. What are you up to?"
        : intent === "celebrate"
          ? context.playerData.recentReviews.at(-1)?.outcome === "blocked" ||
            context.playerData.recentReviews.at(-1)?.outcome === "set-aside"
            ? "That route did not work out. We can choose a smaller next step."
            : `Great job, ${O.getOrElse(context.playerData.heroName, () => "boss")}! Take a second to enjoy that.`
          : intent === "reflect"
            ? context.playerData.recentReviews.at(-1)?.outcome === "completed"
              ? "What helped you get this done? We can use it next time."
              : "What got in the way, and what could we change next time?"
            : "What matters most now? Pick one small move. I’m with you.",
    ),
});
export const nicoReplyRoutine = (
  context: SidekickContext,
  intent: NicoIntent,
): Effect.Effect<string, ModelError, NicoModel> =>
  Effect.gen(function* () {
    const model = yield* NicoModel;
    return yield* model.reply(context, intent);
  });
