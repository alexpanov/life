import { z } from "zod";
import type { PreparedLLMSnippet } from "./llm-snippet";
import * as O from "../../foundation/src/option";

export type InsightWindow = "past-24-hours" | "last-five-chats";
export interface InsightChat {
  readonly id: string;
  readonly at: number;
  readonly text: string;
}
export interface InsightInput {
  readonly heroId: string;
  readonly window: InsightWindow;
  readonly now: number;
  readonly chats: readonly InsightChat[];
}
export const InsightOutputSchema = z.strictObject({
  facts: z.array(z.string().min(1)),
  suggestions: z.array(z.string().min(1)),
});
export type InsightOutput = Readonly<z.infer<typeof InsightOutputSchema>>;
export const InsightRecordSchema = z.strictObject({
  heroId: z.string().min(1),
  window: z.enum(["past-24-hours", "last-five-chats"]),
  createdAt: z.number().int().nonnegative(),
  fingerprint: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)),
  provider: z.string().min(1),
  model: z.string().min(1),
  output: InsightOutputSchema,
});
export type InsightRecord = Readonly<z.infer<typeof InsightRecordSchema>>;
const chatPrompt = z.object({ chat: z.string().trim().min(1) });
/** Retired evidence is never recalled. Boundaries are inclusive and ordering stable. */
export function selectInsightChats(
  records: readonly PreparedLLMSnippet[],
  heroId: string,
  window: InsightWindow,
  now: number,
): readonly InsightChat[] {
  const chats: InsightChat[] = [];
  for (const record of records) {
    if (
      record.heroId !== heroId ||
      O.isSome(record.deletedAt) ||
      record.createdAt > now
    )
      continue;
    let prompt: unknown;
    try {
      prompt = JSON.parse(record.originalPrompt);
    } catch {
      continue;
    }
    const parsed = chatPrompt.safeParse(prompt);
    if (parsed.success)
      chats.push({
        id: record.id,
        at: record.createdAt,
        text: parsed.data.chat,
      });
  }
  chats.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return window === "past-24-hours"
    ? chats.filter((chat) => chat.at >= now - 86_400_000)
    : chats.slice(-5);
}
/** Store the exact evidence identity, not a collision-prone abbreviated hash. */
export const insightFingerprint = (input: InsightInput): string =>
  JSON.stringify([input.heroId, input.window, input.chats]);
export function simulateInsights(input: InsightInput): InsightOutput {
  const mentionsRest = input.chats.some((chat) =>
    /\b(tired|rest|sleep|exhausted)\b/i.test(chat.text),
  );
  return {
    facts: [
      `${input.chats.length} recorded chats are available in this window.`,
    ],
    suggestions: [
      mentionsRest
        ? "Rest came up in the conversation. Consider asking whether recovery is the next useful step."
        : "Consider asking which one small next step would make life easier. Let the hero choose.",
    ],
  };
}
