import * as O from "../../foundation/src/option";
import type {
  NicoContentRecord,
  NicoContentTarget,
  NicoTrait,
  Sidekick,
} from "./types";
/** Fictional character canon. Retellings select a viewpoint, never invent new facts. */
export const NICO_STORIES = [
  {
    id: "dmz",
    title: "The Korean DMZ",
    core: "Nico served near the Korean DMZ. He learned patience on watch.",
    retellings: [
      "I spent time near the Korean DMZ. Watch duty taught me patience. That is enough of that story for tonight.",
      "Near the Korean DMZ, waiting was part of the work. I learned to stay patient. I do not talk about it much.",
    ],
  },
  {
    id: "north-africa",
    title: "The patrol",
    core: "Nico led a patrol in North Africa, came under fire, and was shot in the chest. He survived.",
    retellings: [
      "I led a patrol in North Africa. We came under fire, and I was shot in the chest. I survived. I am grateful for that, every day.",
      "That North Africa patrol is difficult to talk about. I was leading when we came under fire. A round hit my chest. I survived; that is the part I hold onto.",
    ],
  },
  {
    id: "chopper",
    title: "Three days",
    core: "Nico survived a helicopter being shot down and a firefight that lasted three days.",
    retellings: [
      "Our helicopter was shot down. I survived, then endured three days of fighting. I do not dress it up. I am glad to be here.",
      "Three days of fighting followed that helicopter going down. I survived both. It is a memory I usually keep to myself.",
    ],
  },
  {
    id: "pig-carrier",
    title: "Carrying the weight",
    core: "Nico carried the machine gun his unit called the pig.",
    retellings: [
      "I carried the machine gun we called the pig. That was my responsibility. Some jobs are simply yours to carry.",
      "The pig was our name for the machine gun. I was the one carrying it. I remember the responsibility more than the nickname.",
    ],
  },
  {
    id: "doors",
    title: "At the door",
    core: "Nico remembers knocking on doors and encounters involving squatters. He keeps the circumstances private.",
    retellings: [
      "There were doors to knock on and encounters involving squatters. I keep the circumstances private. People deserve more than being turned into a punch line.",
      "You asked about the doors. Yes, there were encounters involving squatters. I will leave the private details there.",
    ],
  },
] as const;
export const NICO_WISDOM = [
  {
    id: "one-step",
    text: "Pick one useful step. Give it your full attention.",
  },
  { id: "rest", text: "Rest is part of being ready." },
  { id: "listen", text: "Listen first. You can decide after you understand." },
  { id: "small-win", text: "A small promise kept is still a promise kept." },
  { id: "adjust", text: "If the plan stops helping, change the plan." },
] as const;
export const SERVICE_TRAIT_ID = "delta-force-veteran";
export function serviceTrait(now: number): NicoTrait {
  return {
    id: SERVICE_TRAIT_ID,
    text: "Fictional Delta Force veteran. Always proud to serve his country; never regrets his service. Skilled, reserved about his past; plain military courtesy.",
    source: "system",
    locked: true,
    acquiredAt: now,
    deletedAt: O.none(),
    evidence: [],
  };
}
export const contentRecords = (
  catalog: readonly { id: string }[],
): NicoContentRecord[] =>
  catalog.map(({ id }) => ({
    id,
    deletedAt: O.none(),
    tellingCount: 0,
    lastToldAt: O.none(),
  }));
export const activeNicoTraits = (nico: Sidekick) =>
  nico.traits.filter((t) => O.isNone(t.deletedAt));
export const activeNicoMemories = (nico: Sidekick) =>
  nico.snippets.filter((t) => O.isNone(t.deletedAt));
/** Called only inside a transition's private draft. */
export function forgetNicoContent(
  nico: Sidekick,
  target: NicoContentTarget,
  id: string,
  now: number,
): void {
  const items =
    target === "memory"
      ? nico.snippets
      : target === "trait"
        ? nico.traits
        : target === "story"
          ? nico.stories
          : nico.wisdom;
  const item = items.find((t) => t.id === id);
  if (!item) throw Error("Nico cannot find that item.");
  if (
    target === "trait" &&
    (id === SERVICE_TRAIT_ID || ("locked" in item && item.locked))
  )
    throw Error("This part of Nico’s identity is locked.");
  if (O.isNone(item.deletedAt)) {
    item.deletedAt = O.some(now);
    nico.revision++;
  }
}
export function tellNicoStory(
  nico: Sidekick,
  id: string,
  explicitRequest: boolean,
  now: number,
): string {
  if (!explicitRequest)
    return "I keep those memories to myself unless you ask.";
  const canon = NICO_STORIES.find((s) => s.id === id);
  const record = nico.stories.find((s) => s.id === id && O.isNone(s.deletedAt));
  if (!canon || !record) throw Error("That story is not available.");
  const reply = canon.retellings[record.tellingCount % canon.retellings.length];
  if (!reply) throw Error("That story has no retelling.");
  record.tellingCount++;
  record.lastToldAt = O.some(now);
  nico.revision++;
  return reply;
}
export function shareNicoWisdom(nico: Sidekick, now: number): string {
  const record = nico.wisdom.find(
    (s) => O.isNone(s.deletedAt) && s.tellingCount === 0,
  );
  if (!record) return "Nothing new to add, boss. You have the floor.";
  const canon = NICO_WISDOM.find((s) => s.id === record.id);
  if (!canon) throw Error("That thought is not available.");
  record.tellingCount = 1;
  record.lastToldAt = O.some(now);
  nico.revision++;
  return canon.text;
}
