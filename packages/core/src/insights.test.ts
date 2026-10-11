import { describe, expect, it } from "vitest";
import {
  selectInsightChats,
  simulateInsights,
} from "./insights";
import type { PreparedLLMSnippet } from "./llm-snippet";
import * as O from "../../foundation/src/option";
const snippet = (
  id: string,
  createdAt: number,
  change: Partial<PreparedLLMSnippet> = {},
): PreparedLLMSnippet => ({
  id,
  heroId: "hero",
  nicoId: "nico",
  createdAt,
  deletedAt: O.none(),
  originalPrompt: JSON.stringify({ chat: `Message ${id}` }),
  originalText: "Reply",
  preparedText: "Reply",
  source: { provider: "simulator", model: "mock", promptVersion: "1" },
  ...change,
});
describe("insight evidence", () => {
  it("includes the exact 24-hour boundary, excludes future, retired and foreign evidence", () => {
    const now = 100_000_000;
    const records = [
      snippet("edge", now - 86_400_000),
      snippet("old", now - 86_400_001),
      snippet("future", now + 1),
      snippet("retired", now, { deletedAt: O.some(now) }),
      snippet("foreign", now, { heroId: "other" }),
      snippet("current", now),
    ];
    expect(
      selectInsightChats(records, "hero", "past-24-hours", now).map(
        (chat) => chat.id,
      ),
    ).toEqual(["edge", "current"]);
  });
  it("selects five latest chats in chronological order, without treating other generations as chats", () => {
    const records = [
      snippet("six", 6),
      snippet("one", 1),
      snippet("four", 4),
      snippet("three", 3),
      snippet("five", 5),
      snippet("two", 2),
      snippet("thought", 7, { originalPrompt: "private thought" }),
    ];
    expect(
      selectInsightChats(records, "hero", "last-five-chats", 10).map(
        (chat) => chat.id,
      ),
    ).toEqual(["two", "three", "four", "five", "six"]);
  });
  it("makes suggestions tentative and grounded in explicit words", () => {
    expect(
      simulateInsights({
        heroId: "hero",
        now: 1,
        window: "past-24-hours",
        chats: [{ id: "a", at: 1, text: "I need sleep" }],
      }),
    ).toEqual({
      facts: ["1 recorded chats are available in this window."],
      suggestions: [
        "Rest came up in the conversation. Consider asking whether recovery is the next useful step.",
      ],
    });
  });
});
