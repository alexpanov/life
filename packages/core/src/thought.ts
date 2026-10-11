import * as O from "../../foundation/src/option";

/** People in the current situation. Internal player identifiers never belong here. */
export interface Person {
  readonly name: O.Option<string>;
  readonly relationship: "self" | "family" | "friend" | "other";
}
export interface Hero extends Person {
  readonly role: "hero";
  readonly relationship: "self";
}
export interface ThoughtEnvironment {
  readonly hero: Hero;
  readonly people: readonly Person[];
  readonly realm: O.Option<string>;
  readonly quest: O.Option<{
    readonly title: string;
    readonly status: "active" | "completed" | "blocked";
  }>;
  readonly needsRest: boolean;
  readonly energy: "available" | "resting";
  readonly faith: "welcome" | "unspecified";
}
export type ThoughtTopic =
  "rest" | "quest" | "family" | "faith" | "orientation";
/** A brief useful assessment, never a request for private model reasoning. */
export interface NicoThought {
  readonly id: string;
  readonly topic: ThoughtTopic;
  readonly assessment: string;
  readonly nextAction: string;
}
const thought = (
  id: string,
  topic: ThoughtTopic,
  assessment: string,
  nextAction: string,
): NicoThought => ({ id, topic, assessment, nextAction });
export const NICO_THOUGHTS: readonly NicoThought[] = Object.freeze([
  thought(
    "rest-1",
    "rest",
    "Rest belongs in a good life, boss.",
    "Take a quiet break before choosing your next move.",
  ),
  thought(
    "rest-2",
    "rest",
    "You do not have to earn a pause.",
    "Put the next task aside for a few minutes.",
  ),
  thought(
    "rest-3",
    "rest",
    "A smaller day can still be a good day.",
    "Decide what can wait until you have rested.",
  ),
  thought(
    "rest-4",
    "rest",
    "I can stand down while you recover.",
    "Close the game and give yourself some room.",
  ),
  thought(
    "quest-1",
    "quest",
    "One clear choice is enough for now.",
    "Review this quest and choose one manageable next step.",
  ),
  thought(
    "quest-2",
    "quest",
    "A quest serves your life; the count is not the goal.",
    "Ask whether this quest still matters before continuing.",
  ),
  thought(
    "quest-3",
    "quest",
    "Changing a plan is part of learning.",
    "Keep what helped and change one thing that got in the way.",
  ),
  thought(
    "quest-4",
    "quest",
    "You set the pace, sir.",
    "Choose a next step small enough for the time you have.",
  ),
  thought(
    "family-1",
    "family",
    "Being present can matter more than finishing another task.",
    "Ask your family what would help right now.",
  ),
  thought(
    "family-2",
    "family",
    "The people beside you deserve your attention.",
    "Put the screen down for a moment and listen.",
  ),
  thought(
    "family-3",
    "family",
    "A good life includes ordinary time together.",
    "Choose one simple thing to enjoy with your family.",
  ),
  thought(
    "family-4",
    "family",
    "You do not need to turn family time into a score.",
    "Offer a small kindness without keeping count.",
  ),
  thought(
    "faith-1",
    "faith",
    "There is room to pause before deciding.",
    "Take a moment to pray, then choose a small faithful step.",
  ),
  thought(
    "faith-2",
    "faith",
    "I can help you think, but I cannot tell you God's will.",
    "Bring the decision to prayer and someone you trust.",
  ),
  thought(
    "faith-3",
    "faith",
    "A good life has room for gratitude.",
    "Notice one gift today and give thanks.",
  ),
  thought(
    "faith-4",
    "faith",
    "You do not have to solve the whole journey tonight.",
    "Consider the good you can do for one person now.",
  ),
  thought(
    "orientation-1",
    "orientation",
    "We can take stock without making a long list.",
    "Name the one thing that matters most right now.",
  ),
  thought(
    "orientation-2",
    "orientation",
    "A new place does not need a full itinerary.",
    "Notice one nearby place you would like to explore.",
  ),
  thought(
    "orientation-3",
    "orientation",
    "I am here to help, not add pressure.",
    "Choose a small task or take a break; either is a valid choice.",
  ),
  thought(
    "orientation-4",
    "orientation",
    "You are the one making the call, boss.",
    "Tell me what would make today a little better.",
  ),
]);
export function thoughtTopic(environment: ThoughtEnvironment): ThoughtTopic {
  if (environment.needsRest || environment.energy === "resting") return "rest";
  if (O.isSome(environment.quest)) return "quest";
  if (environment.people.some((person) => person.relationship === "family"))
    return "family";
  if (environment.faith === "welcome") return "faith";
  return "orientation";
}
/** History belongs to the caller's repository; selection neither mutates nor invents it. */
export function simulateThought(
  environment: ThoughtEnvironment,
  previousThoughtIds: readonly string[],
): NicoThought {
  const topic = thoughtTopic(environment);
  const candidates = NICO_THOUGHTS.filter((entry) => entry.topic === topic);
  const unseen = candidates.find(
    (entry) => !previousThoughtIds.includes(entry.id),
  );
  // Each topic has four entries. Rotate again only after every relevant entry was used.
  const count = previousThoughtIds.filter((id) =>
    candidates.some((entry) => entry.id === id),
  ).length;
  return (
    unseen ??
    candidates[count % candidates.length] ??
    thought(
      "orientation-1",
      "orientation",
      "We can take stock without making a long list.",
      "Name the one thing that matters most right now.",
    )
  );
}
