import * as O from "../../foundation/src/option";

const action = {
  correction: "remember",
  praise: "note-what-you-did",
  unsure: "ask",
} as const;

export type HeroLineCategory = keyof typeof action;
export type RecommendedAction = (typeof action)[HeroLineCategory];

/** The only shape a classified hero line may take. The action follows the category. */
export type HeroLineClassification =
  | {
      readonly category: "correction";
      readonly evidence: string;
      readonly recommendedAction: "remember";
    }
  | {
      readonly category: "praise";
      readonly evidence: string;
      readonly recommendedAction: "note-what-you-did";
    }
  | {
      readonly category: "unsure";
      readonly evidence: string;
      readonly recommendedAction: "ask";
    };

export type UnsureLine = Extract<
  HeroLineClassification,
  { readonly category: "unsure" }
>;

export function recommendedActionFor<C extends HeroLineCategory>(
  category: C,
): (typeof action)[C] {
  return action[category];
}

export function heroLineClassification(
  category: "correction",
  evidence: string,
): Extract<HeroLineClassification, { readonly category: "correction" }>;
export function heroLineClassification(
  category: "praise",
  evidence: string,
): Extract<HeroLineClassification, { readonly category: "praise" }>;
export function heroLineClassification(
  category: "unsure",
  evidence: string,
): UnsureLine;
export function heroLineClassification(
  category: HeroLineCategory,
  evidence: string,
): HeroLineClassification;
export function heroLineClassification(
  category: HeroLineCategory,
  evidence: string,
): HeroLineClassification {
  switch (category) {
    case "correction":
      return { category, evidence, recommendedAction: action.correction };
    case "praise":
      return { category, evidence, recommendedAction: action.praise };
    case "unsure":
      return { category, evidence, recommendedAction: action.unsure };
  }
}

/** One short clarifying question. Call this only for an unsure line. */
export function ask(line: UnsureLine): string {
  const quote = line.evidence
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?？]/g, "")
    .slice(0, 80);
  return `What did you mean by “${quote || "that"}”?`;
}

export interface QuestWords {
  readonly title: string;
  readonly detail: string;
}

/** A link the hero opens. This routine does not fetch, browse, book, or spend. */
export interface SuggestedAction {
  readonly kind: "map-search";
  readonly href: string;
}

const MAP_SEARCH = "https://www.google.com/maps/search/?api=1&query=";
const REST = /\b(sleep|rest)\b/i;

function phrase(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 200);
}

/** When a quest starts, attach at most one map search before the hero asks. */
export function initializeQuest(quest: QuestWords): O.Option<SuggestedAction> {
  const title = phrase(quest.title);
  const detail = phrase(quest.detail);
  const words = REST.test(title) ? title : REST.test(detail) ? detail : "";
  if (!words) return O.none();
  return O.some({
    kind: "map-search",
    href: `${MAP_SEARCH}${encodeURIComponent(words)}`,
  });
}
