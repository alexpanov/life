import { z } from "zod";
export const moodSchema = z.enum(["ready", "curious", "quiet", "tired"]);
export const categorySchema = z.enum(["main", "side", "bonus"]);
export const statusSchema = z.enum(["pending", "done", "impossible"]);
const text = z.string();
const timestamp = z.number().finite().nonnegative();
export const questInputSchema = z.object({
  title: text,
  detail: text.optional(),
  nextMove: text.optional(),
  destination: text.optional(),
  category: categorySchema.optional(),
  xp: z.union([z.number(), z.string()]).optional(),
  loot: text.optional(),
  suggestionKey: text.optional(),
});
export const campaignSchema = z.object({
  kind: z.literal("questos.campaign"),
  version: z.literal(1),
  name: text,
  subtitle: text.default(""),
  quests: z.array(questInputSchema).max(200),
});
export const extensionSchema = z.object({
  kind: z.literal("questos.extension"),
  version: z.literal(1),
  id: text.regex(/^[a-z0-9-]{1,80}$/),
  name: text.optional(),
  description: text.optional(),
  quests: z.array(questInputSchema).max(50).default([]),
  skills: z
    .array(z.object({ name: text, halfLifeDays: z.number().optional() }))
    .max(10)
    .default([]),
  calls: z
    .array(z.object({ caller: text.optional(), text: text }))
    .max(30)
    .default([]),
});
export const patchSchema = z.object({
  kind: z.literal("questos.patch"),
  version: z.literal(1),
  operations: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("addQuest"), quest: questInputSchema }),
        z.object({
          type: z.literal("createCampaign"),
          name: text,
          subtitle: text.optional(),
        }),
        z.object({
          type: z.literal("createRealm"),
          name: text,
          location: text.optional(),
        }),
        z.object({ type: z.literal("enterRealm"), realmId: text }),
        z.object({
          type: z.literal("addSkill"),
          name: text,
          halfLifeDays: z.number().optional(),
        }),
        z.object({
          type: z.literal("setStatus"),
          questId: text,
          status: statusSchema,
          reason: text.optional(),
        }),
        z.object({
          type: z.literal("installExtension"),
          extension: extensionSchema,
        }),
      ]),
    )
    .max(50),
});
const questSchema = questInputSchema.extend({
  id: text,
  status: statusSchema,
  xp: z.number(),
  createdAt: timestamp,
  completedAt: timestamp.nullable().optional(),
  blockedReason: text.optional(),
});
const campaignSave = z.object({
  id: text,
  name: text,
  subtitle: text.optional(),
  createdAt: timestamp,
  realmId: text.optional(),
  quests: z.array(questSchema).max(200),
});
const realmSave = z.object({
  id: text,
  name: text,
  location: text.optional(),
  home: z.boolean().optional(),
  createdAt: timestamp,
  lastVisitedAt: timestamp,
  lastCampaignId: text.optional(),
  memory: z
    .object({
      seen: z.array(text).optional(),
      places: z.array(text).optional(),
    })
    .optional(),
});
const session = z.object({
  id: text,
  day: text,
  at: timestamp,
  note: text.optional(),
  before: z.object({
    xp: z.number(),
    readiness: z.number(),
    anchorAt: timestamp,
  }),
});
const skill = z.object({
  id: text,
  name: text,
  xp: z.number(),
  readiness: z.number(),
  anchorAt: timestamp,
  halfLifeDays: z.number(),
  graceDays: z.number(),
  paused: z.boolean().optional(),
  sessions: z.array(session).max(10000),
});
const player = z.object({
  id: text,
  name: text,
  createdAt: timestamp,
  campaigns: z.array(campaignSave).min(1).max(100),
  realms: z.array(realmSave).min(1).max(50).optional(),
  activeCampaignId: text.optional(),
  activeRealmId: text.optional(),
  homeRealmId: text.optional(),
  focusQuestId: text.optional(),
  appliedUpdates: z.array(text).optional(),
  checkin: z.object({ mood: moodSchema, at: timestamp }).nullable().optional(),
  suggestions: z
    .object({
      lastOfferedAt: timestamp.optional(),
      dismissed: z.array(text).optional(),
    })
    .optional(),
  operation: z
    .object({
      phase: z.enum(["choose", "execute", "review"]).optional(),
      candidateQuestId: text.optional(),
      lastQuestId: text.optional(),
    })
    .optional(),
  sidekick: z.unknown().optional(),
  learning: z.unknown().optional(),
  skills: z.array(skill).max(50),
  bonusLoot: z.array(text).optional(),
  modules: z.array(z.unknown()).optional(),
  events: z
    .array(
      z.object({
        id: text.optional(),
        type: text,
        text: text,
        at: timestamp,
        questId: text.optional(),
        skillId: text.optional(),
        sessionId: text.optional(),
      }),
    )
    .optional(),
  settings: z
    .object({
      sound: z.boolean().optional(),
      autoCalls: z.boolean().optional(),
      callIntervalMinutes: z.number().optional(),
      driving: z.boolean().optional(),
    })
    .optional(),
  lastCallAt: z.number().optional(),
});
export const saveSchema = z.object({
  kind: z.literal("questos.save"),
  version: z.literal(1),
  activePlayerId: text,
  players: z.array(player).min(1).max(25),
});
export const sidekickSchema = z.object({
  id: z.string().max(200).default(""),
  introduced: z.boolean().default(false),
  heroName: z
    .discriminatedUnion("_tag", [
      z.object({ _tag: z.literal("None") }),
      z.object({ _tag: z.literal("Some"), value: z.string().max(60) }),
    ])
    .default({ _tag: "None" }),
  jobs: z
    .array(
      z.object({
        id: z.string().max(250),
        kind: z.enum(["meet-hero", "learn-name", "reflect-outcome"]),
        questId: z.string().max(100),
        status: z.enum(["pending", "done"]),
        priority: z.number().finite(),
        createdAt: timestamp,
        completedAt: z.discriminatedUnion("_tag", [
          z.object({ _tag: z.literal("None") }),
          z.object({ _tag: z.literal("Some"), value: timestamp }),
        ]),
      }),
    )
    .max(100)
    .optional(),
  traits: z
    .array(
      z.object({
        id: z.string().max(100),
        text: z.string().max(200),
        source: z.enum(["system", "player", "learned"]),
        acquiredAt: timestamp,
        evidence: z.array(z.string().max(250)).max(100),
      }),
    )
    .max(30)
    .optional(),
  learning: z
    .object({
      preferences: z.record(z.string(), z.number()).default({}),
      feedback: z
        .array(
          z.object({
            questId: text,
            mood: moodSchema,
            category: z.enum([
              "rest",
              "faith",
              "training",
              "exploration",
              "care",
              "work",
              "errand",
              "general",
            ]),
            outcome: z.enum([
              "accepted",
              "completed",
              "declined",
              "blocked",
              "set-aside",
            ]),
            at: timestamp,
          }),
        )
        .default([]),
    })
    .optional(),
  reviews: z
    .array(
      z.object({
        key: text,
        questId: text,
        title: text,
        realmId: text,
        mood: moodSchema,
        category: z.enum([
          "rest",
          "faith",
          "training",
          "exploration",
          "care",
          "work",
          "errand",
          "general",
        ]),
        outcome: z.enum(["completed", "blocked", "set-aside"]),
        at: timestamp,
        reason: text,
        adjustment: text,
      }),
    )
    .default([]),
  snippets: z
    .array(z.object({ id: text, text: text, at: timestamp }))
    .default([]),
  revision: z.number().int().nonnegative().default(0),
});
