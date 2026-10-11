import { Context, Effect, Layer } from "effect";
import type { SidekickContext } from "../../core/src/sidekick";
import * as O from "../../foundation/src/option";
export interface NicoTarget {
  kind: "memory" | "trait" | "story" | "wisdom";
  id: string;
}
export interface NicoChatRequest {
  chat: string;
  system: { voice: string; instructions: string };
  heroName: O.Option<string>;
  routineSchema: Readonly<Record<string, unknown>>;
  targets: readonly (NicoTarget & { label: string })[];
  target: O.Option<NicoTarget>;
  storyChoices: readonly { id: string; title: string; core: string }[];
}
const say = (text: string) => ({ version: 1, kind: "say", text });
const invoke = (routine: string, parameters: Record<string, unknown>) => ({
  version: 1,
  kind: "invoke",
  invocation: { routine, parameters },
});
export const isNicoManagementChat = (chat: string): boolean =>
  !/^remember\s+/i.test(chat.trim()) &&
  /\b(forget|delete|remove)\b|let (it|that) go|don[’']?t want|don[’']?t like|not entertaining|bullshit/i.test(
    chat,
  );
/** Deliberately narrow, deterministic simulator. Ambiguous intent never changes player data. */
export function simulateNicoProposal(request: NicoChatRequest): unknown {
  const chat = request.chat.trim(),
    lower = chat.toLowerCase();
  const memory = /^remember\s+(.+)/is.exec(chat);
  if (memory?.[1]) return invoke("remember", { text: memory[1] });
  if (isNicoManagementChat(chat)) {
    const exact = request.targets.filter(
      (entry) =>
        lower.includes(entry.label.toLowerCase()) ||
        lower.includes(entry.id.toLowerCase()),
    );
    const refersToCurrent =
      /\b(that|this|it)\b|^(?:bullshit|not entertaining|don[’']?t want|don[’']?t like)/i.test(
        chat,
      );
    const selected =
      exact.length === 1 && exact[0]
        ? O.some(exact[0])
        : exact.length === 0 && refersToCurrent && O.isSome(request.target)
          ? request.target
          : O.none<NicoTarget>();
    if (O.isNone(selected))
      return say(
        "Which memory, trait, story, or piece of advice should I set aside?",
      );
    return invoke(`forget-${selected.value.kind}`, { id: selected.value.id });
  }
  const trait = /^(?:be more|your personality should be)\s+(.+)/is.exec(chat);
  if (trait?.[1]) return invoke("set-nico-trait", { text: trait[1] });
  if (/\b(wisdom|advice)\b/i.test(chat)) return invoke("share-wisdom", {});
  if (/\b(tell|story|stories|again)\b/i.test(chat)) {
    const stories = request.storyChoices.filter(
      (story) =>
        lower.includes(story.title.toLowerCase()) ||
        lower.includes(story.id.toLowerCase()),
    );
    const chosen = stories.length === 1 ? stories[0] : false;
    if (chosen)
      return invoke("tell-story", {
        storyId: chosen.id,
        explicitRequest: true,
      });
    return say(
      "I don’t talk much about those days. If you really want a story, choose one below.",
    );
  }
  if (/delta force|served|service|veteran/i.test(chat))
    return say(
      "I served in Delta Force. I’m proud of serving my country. I keep most of those days to myself.",
    );
  return say(
    "I’m with you, boss. What’s the next small move? You can also ask me to remember something.",
  );
}
export type NicoIntent = "meet" | "celebrate" | "reflect" | "choose";
export class ModelError extends Error {
  readonly _tag = "ModelError";
}
/** Effect v4 service key (the tagged service boundary). Providers cannot mutate progress. */
export class NicoModel extends Context.Service<
  NicoModel,
  {
    readonly propose: (
      request: NicoChatRequest,
    ) => Effect.Effect<unknown, ModelError>;
    readonly reply: (
      context: SidekickContext,
      intent: NicoIntent,
    ) => Effect.Effect<string, ModelError>;
  }
>()("life/NicoModel") {}
export const mockNicoLayer = Layer.succeed(NicoModel)({
  propose: (request) => Effect.succeed(simulateNicoProposal(request)),
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
            : "Yes, sir. What matters most now? Pick one small move. I’m with you.",
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
