import { Effect } from "effect";
import { z } from "zod";
import type { Command, TransitionResult, Snapshot } from "../../core/src/index";
import * as O from "../../foundation/src/option";
import type { GameController } from "./controller";

const id = z.string().min(1).max(200);
const text = z.string().max(20000);
const quest = z.strictObject({
  title: text.optional(),
  detail: text.optional(),
  nextMove: text.optional(),
  destination: text.optional(),
  category: z.enum(["main", "side", "bonus"]).optional(),
  xp: z.union([z.number().finite(), text]).optional(),
  loot: text.optional(),
  suggestionKey: text.optional(),
});
const offer = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("existing"), realmId: id, questId: id }),
  z.strictObject({
    kind: z.literal("proposal"),
    realmId: id,
    key: id,
    offeredAt: z.number().finite(),
    quest,
  }),
]);
const command = <N extends string, S extends z.ZodRawShape>(
  name: N,
  shape: S,
) => z.strictObject({ type: z.literal(name), ...shape });
const commands = z.union([
  command("create-powerup", {
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(240),
    context: z.string().trim().max(2000),
    instructions: z.string().trim().min(1).max(2000),
  }),
  command("activate-powerup", { id: z.string().min(1).max(250) }),
  command("deactivate-powerup", {}),
  command("tell-story", { storyId: id, explicitRequest: z.boolean() }),
  command("share-wisdom", {}),
  command("forget-memory", { id }),
  command("forget-trait", { id }),
  command("forget-story", { id }),
  command("forget-wisdom", { id }),
  command("nico-feedback", {
    target: z.enum(["memory", "trait", "story", "wisdom"]),
    id,
    reason: z.enum(["not-interesting", "repetitive", "not-for-me", "other"]),
    text,
  }),
  command("meet-nico", { text }),
  command("name-hero", { name: text }),
  command("reflect-quest", { questId: id, text }),
  command("quest-progress", { questId: id, text }),
  command("set-nico-trait", { text }),
  command("evolve-nico", {}),
  command("check-in", { mood: z.enum(["ready", "curious", "quiet", "tired"]) }),
  command("accept-offer", { offer }),
  command("dismiss-offer", { offer }),
  command("propose-mission", { questId: id }),
  command("choose-mission", { questId: id }),
  command("retain-mission", {}),
  command("set-aside", {}),
  command("finish-review", {}),
  command("set-status", {
    questId: id,
    status: z.enum(["pending", "done", "impossible"]),
    reason: text.optional(),
  }),
  command("add-quest", { quest }),
  command("edit-quest", { questId: id, quest }),
  command("enter-realm", { realmId: id }),
  command("add-realm", {
    name: text,
    location: text,
    home: z.boolean().optional(),
  }),
  command("edit-realm", {
    realmId: id,
    name: text,
    location: text,
    home: z.boolean(),
  }),
  command("open-dungeon", { campaignId: id }),
  command("add-dungeon", { name: text, subtitle: text }),
  command("practice", { skillId: id, note: text }),
  command("undo-practice", { skillId: id }),
  command("pause-skill", { skillId: id, paused: z.boolean() }),
  command("add-skill", { name: text, halfLifeDays: z.number().finite() }),
  command("edit-skill", {
    skillId: id,
    name: text,
    halfLifeDays: z.number().finite(),
    graceDays: z.number().finite(),
  }),
  command("add-loot", { name: text }),
  command("add-player", { name: text }),
  command("switch-player", { playerId: id }),
  command("remember", { text }),
  command("reset-memory", {}),
  command("settings", {
    settings: z.strictObject({
      sound: z.boolean().optional(),
      autoCalls: z.boolean().optional(),
      callIntervalMinutes: z.number().finite().optional(),
      driving: z.boolean().optional(),
    }),
  }),
]);
const envelope = z.union(
  commands.options.map((schema) => {
    const { type, ...parameters } = schema.shape;
    return z.strictObject({
      version: z.literal(1),
      requestId: id,
      routine: type,
      parameters: z.strictObject(parameters),
    });
  }),
);
export const FRONTEND_ROUTINE_JSON_SCHEMA = z.toJSONSchema(envelope);
export class FrontendRoutineError extends Error {
  readonly _tag = "FrontendRoutineError";
  constructor(
    readonly code:
      | "invalid-request"
      | "request-conflict"
      | "hero-changed"
      | "unavailable"
      | "execution-failed",
    message: string,
  ) {
    super(message);
  }
}
export interface FrontendRoutineResult {
  version: 1;
  requestId: string;
  replayed: boolean;
  outcome: Omit<TransitionResult, "state"> & { state: Snapshot };
}
interface Receipt {
  heroId: string;
  fingerprint: string;
  outcome: Omit<TransitionResult, "state">;
}
// Controller lifetime only. A future server must persist idempotency receipts with the mutation.
const receipts = new WeakMap<GameController, Map<string, Receipt>>();
function fingerprint(value: unknown): string {
  const keys = new Set<string>();
  JSON.stringify(value, (key, item: unknown) => {
    keys.add(key);
    return item;
  });
  return JSON.stringify(value, [...keys].sort());
}
export function frontendRoutineRequest(
  requestId: string,
  input: Command,
): unknown {
  const { type, ...parameters } = input;
  return { version: 1, requestId, routine: type, parameters };
}
/** In-process JSON transport; authority comes from the controller, never JSON hero IDs. */
export function executeFrontendRoutine(
  controller: GameController,
  input: unknown,
): Effect.Effect<FrontendRoutineResult, FrontendRoutineError> {
  return Effect.try({
    try: (): FrontendRoutineResult => {
      const parsed = envelope.safeParse(input);
      if (!parsed.success)
        throw new FrontendRoutineError(
          "invalid-request",
          "Invalid or unavailable frontend routine.",
        );
      const request = parsed.data;
      const game = controller.getSnapshot().game;
      if (O.isNone(game))
        throw new FrontendRoutineError("unavailable", "Game is loading.");
      const heroId = game.value.activePlayerId;
      const history = receipts.get(controller) ?? new Map<string, Receipt>();
      receipts.set(controller, history);
      const previous = history.get(request.requestId);
      const signature = fingerprint(request);
      if (previous) {
        if (previous.heroId !== heroId)
          throw new FrontendRoutineError(
            "hero-changed",
            "The hero changed. Send a new request.",
          );
        if (previous.fingerprint !== signature)
          throw new FrontendRoutineError(
            "request-conflict",
            "That request ID belongs to a different action.",
          );
        return {
          version: 1,
          requestId: request.requestId,
          replayed: true,
          outcome: { ...structuredClone(previous.outcome), state: game.value },
        };
      }
      const inputCommand: Command = commands.parse({
        type: request.routine,
        ...request.parameters,
      });
      const outcome = controller.send(inputCommand);
      const result: FrontendRoutineResult = {
        version: 1,
        requestId: request.requestId,
        replayed: false,
        outcome,
      };
      const { state: _state, ...receiptOutcome } = outcome;
      history.set(request.requestId, {
        heroId,
        fingerprint: signature,
        outcome: structuredClone(receiptOutcome),
      });
      return result;
    },
    catch: (cause) =>
      cause instanceof FrontendRoutineError
        ? cause
        : new FrontendRoutineError(
            "execution-failed",
            cause instanceof Error
              ? cause.message
              : "Action could not be completed.",
          ),
  });
}
