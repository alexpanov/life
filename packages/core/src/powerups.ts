import { z } from "zod";
import * as O from "../../foundation/src/option";
import type { DeepReadonly, Sidekick } from "./types";

/** Portable instructions, not executable authority or an ownership entitlement. */
export const powerupTemplateSchema = z
  .object({
    kind: z.literal("life.powerup"),
    version: z.literal(1),
    id: z.string().min(1).max(200),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(240),
    context: z.string().trim().max(2000),
    instructions: z.string().trim().min(1).max(2000),
  })
  .strict();
export type PowerupTemplate = z.infer<typeof powerupTemplateSchema>;
export interface NicoPowerup {
  id: string;
  nicoId: string;
  template: PowerupTemplate;
  charges: number;
  createdAt: number;
  uses: { requestId: string; at: number }[];
}
export interface NicoPowerups {
  version: 1;
  instances: NicoPowerup[];
  active: O.Option<{
    instanceId: string;
    activatedAt: number;
    expiresAt: number;
  }>;
}
const time = z.number().finite().nonnegative();
export const nicoPowerupsSchema = z
  .object({
    version: z.literal(1),
    instances: z
      .array(
        z
          .object({
            id: z.string().min(1).max(250),
            nicoId: z.string().min(1).max(200),
            template: powerupTemplateSchema,
            charges: z.number().int().min(0).max(1),
            createdAt: time,
            uses: z
              .array(
                z.object({ requestId: z.string().min(1).max(250), at: time }),
              )
              .max(1),
          })
          .strict(),
      )
      .max(100),
    active: z.discriminatedUnion("_tag", [
      z.object({ _tag: z.literal("None") }),
      z.object({
        _tag: z.literal("Some"),
        value: z.object({
          instanceId: z.string(),
          activatedAt: time,
          expiresAt: time,
        }),
      }),
    ]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.instances.map((x) => x.id)).size !==
        value.instances.length ||
      value.instances.some((x) => x.charges + x.uses.length > 1)
    )
      ctx.addIssue({ code: "custom", message: "Invalid power-up inventory." });
  });
export const DEFAULT_POWERUPS: readonly PowerupTemplate[] = [
  {
    kind: "life.powerup",
    version: 1,
    id: "mutual-offer",
    name: "An offer they can’t refuse",
    description: "Make a clear offer that benefits both sides.",
    context: "Use for a request, invitation or negotiation.",
    instructions:
      "State the other person's needs, the mutual benefit and one clear ask. Offer a genuine choice. Never threaten, manipulate, invent urgency or hide terms.",
  },
  {
    kind: "life.powerup",
    version: 1,
    id: "balkan-smile",
    name: "Balkan smile",
    description: "Zero smiles. One honest assessment and a practical move.",
    context: "Use when you need clarity without motivational fluff.",
    instructions:
      "Give a blunt, respectful assessment of the obstacle and one doable next action. No jokes, emojis, flattery, insults or shame. Respect rest and family responsibilities.",
  },
  {
    kind: "life.powerup",
    version: 1,
    id: "delta-buddies",
    name: "Delta Force buddies",
    description: "Check a plan from three useful angles.",
    context: "Use for a difficult decision or a plan with uncertainty.",
    instructions:
      "Simulate three planning perspectives: planner gives the next move, checker identifies one weak assumption, contingency offers a fallback. Label these as simulated perspectives, never real people or external contacts. Keep the hero in command.",
  },
];
export const POWERUP_DURATION_MS = 30 * 60 * 1000;
export function createNicoPowerups(nicoId: string, now: number): NicoPowerups {
  return {
    version: 1,
    instances: DEFAULT_POWERUPS.map((template) => ({
      id: `${nicoId}:${template.id}`,
      nicoId,
      template: { ...template },
      charges: 1,
      createdAt: now,
      uses: [],
    })),
    active: O.none(),
  };
}
export function activeNicoPowerup(
  sidekick: DeepReadonly<Sidekick>,
  now: number,
): O.Option<DeepReadonly<NicoPowerup>> {
  const active = sidekick.powerups.active;
  if (
    O.isNone(active) ||
    now < active.value.activatedAt ||
    now >= active.value.expiresAt
  )
    return O.none();
  return O.fromNullable(
    sidekick.powerups.instances.find(
      (x) =>
        x.id === active.value.instanceId &&
        x.nicoId === sidekick.id &&
        x.charges > 0,
    ),
  );
}
/** Helpers mutate only the isolated transition draft. */
export function createPowerup(
  sidekick: Sidekick,
  input: Pick<
    PowerupTemplate,
    "name" | "description" | "context" | "instructions"
  >,
  id: string,
  now: number,
): void {
  if (sidekick.powerups.instances.some((x) => x.id === id)) return;
  if (sidekick.powerups.instances.length >= 100)
    throw Error("Power-up archive is full. Keep your saved archive.");
  const template = powerupTemplateSchema.parse({
    ...input,
    kind: "life.powerup",
    version: 1,
    id,
  });
  sidekick.powerups.instances.push({
    id,
    nicoId: sidekick.id,
    template,
    charges: 1,
    createdAt: now,
    uses: [],
  });
}
export function activatePowerup(
  sidekick: Sidekick,
  id: string,
  now: number,
): void {
  const instance = sidekick.powerups.instances.find(
    (x) => x.id === id && x.nicoId === sidekick.id,
  );
  if (!instance || instance.charges < 1)
    throw Error("This power-up is unavailable.");
  sidekick.powerups.active = O.some({
    instanceId: id,
    activatedAt: now,
    expiresAt: now + POWERUP_DURATION_MS,
  });
}
export function consumePowerup(
  sidekick: Sidekick,
  id: string,
  requestId: string,
  now: number,
  expectedActivatedAt: number,
): void {
  if (!requestId.trim()) throw Error("A response ID is required.");
  const instance = sidekick.powerups.instances.find(
    (x) => x.id === id && x.nicoId === sidekick.id,
  );
  if (!instance) throw Error("Power-up not found.");
  if (instance.uses.some((x) => x.requestId === requestId)) return;
  const active = activeNicoPowerup(sidekick, now);
  if (
    O.isNone(active) ||
    active.value.id !== id ||
    O.isNone(sidekick.powerups.active) ||
    sidekick.powerups.active.value.activatedAt !== expectedActivatedAt
  )
    throw Error("The power-up changed or expired. Try again.");
  instance.charges -= 1;
  instance.uses.push({ requestId, at: now });
  sidekick.powerups.active = O.none();
}
