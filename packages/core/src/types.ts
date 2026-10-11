import type { NicoPowerups } from "./powerups";
import type { Option } from "../../foundation/src/option";
export type Mood = "ready" | "curious" | "quiet" | "tired";
export type QuestStatus = "pending" | "done" | "impossible";
export type QuestCategory = "main" | "side" | "bonus";
export type LearningCategory =
  | "rest"
  | "faith"
  | "training"
  | "exploration"
  | "care"
  | "work"
  | "errand"
  | "general";
export type Outcome =
  "accepted" | "completed" | "declined" | "blocked" | "set-aside";
export interface QuestInput {
  title?: string;
  detail?: string;
  nextMove?: string;
  destination?: string;
  category?: QuestCategory;
  xp?: number | string;
  loot?: string;
  suggestionKey?: string;
}
export interface QuestLine {
  id: string;
  speaker: "hero" | "nico";
  text: string;
  at: number;
}
/** Heard from the hero, not in a realm, and not started. */
export interface QuestDraft {
  id: string;
  title: string;
  realmId: Option<string>;
}
export interface Quest {
  id: string;
  title: string;
  detail: string;
  nextMove: string;
  destination: string;
  category: QuestCategory;
  xp: number;
  status: QuestStatus;
  loot: string;
  createdAt: number;
  completedAt: Option<number>;
  blockedReason: string;
  verified: boolean;
  suggestionKey: string;
  lines: QuestLine[];
}
export interface Campaign {
  id: string;
  name: string;
  subtitle: string;
  createdAt: number;
  realmId: string;
  quests: Quest[];
}
export interface Realm {
  id: string;
  name: string;
  location: string;
  home: boolean;
  createdAt: number;
  lastVisitedAt: number;
  lastCampaignId: string;
  memory: { seen: string[]; places: string[] };
}
export interface PracticeSession {
  id: string;
  day: string;
  at: number;
  note: string;
  xp: number;
  before: { xp: number; readiness: number; anchorAt: number };
}
export interface Skill {
  id: string;
  name: string;
  xp: number;
  readiness: number;
  anchorAt: number;
  halfLifeDays: number;
  graceDays: number;
  paused: boolean;
  sessions: PracticeSession[];
}
export interface Feedback {
  questId: string;
  mood: Mood;
  category: LearningCategory;
  outcome: Outcome;
  at: number;
}
export interface Learning {
  preferences: Partial<Record<`${Mood}:${LearningCategory}`, number>>;
  feedback: Feedback[];
}
export interface Review {
  key: string;
  questId: string;
  title: string;
  realmId: string;
  mood: Mood;
  category: LearningCategory;
  outcome: "completed" | "blocked" | "set-aside";
  at: number;
  reason: string;
  adjustment: string;
  source: "player-action";
}
export type NicoFeedbackReason =
  "not-interesting" | "repetitive" | "not-for-me" | "other";
export type NicoContentTarget = "memory" | "trait" | "story" | "wisdom";
export interface NicoContentRecord {
  id: string;
  deletedAt: Option<number>;
  tellingCount: number;
  lastToldAt: Option<number>;
}
export interface NicoContentFeedback {
  target: NicoContentTarget;
  id: string;
  reason: NicoFeedbackReason;
  text: string;
  at: number;
}
export interface Snippet {
  deletedAt: Option<number>;
  id: string;
  text: string;
  source: "player";
  at: number;
}
export interface NicoJob {
  id: string;
  kind: "meet-hero" | "learn-name" | "reflect-outcome";
  questId: string;
  status: "pending" | "done";
  priority: number;
  createdAt: number;
  completedAt: Option<number>;
}
export interface NicoTrait {
  locked: boolean;
  deletedAt: Option<number>;
  id: string;
  text: string;
  source: "system" | "player" | "learned";
  acquiredAt: number;
  evidence: string[];
}
export interface Sidekick {
  powerups: NicoPowerups;
  version: 1;
  name: "Niko";
  lastName: "Gonzalez";
  id: string;
  introduced: boolean;
  heroName: Option<string>;
  jobs: NicoJob[];
  traits: NicoTrait[];
  stories: NicoContentRecord[];
  wisdom: NicoContentRecord[];
  contentFeedback: NicoContentFeedback[];
  learning: Learning;
  reviews: Review[];
  snippets: Snippet[];
  revision: number;
}
export interface Extension {
  kind: "questos.extension";
  version: 1;
  id: string;
  name: string;
  description: string;
  quests: QuestInput[];
  skills: { name: string; halfLifeDays: number }[];
  calls: { caller: string; text: string }[];
}
export interface GameEvent {
  id: string;
  type: string;
  text: string;
  at: number;
  questId?: string;
  skillId?: string;
  sessionId?: string;
}
export interface NicoEnergy {
  day: number;
  requestIds: string[];
  referralCode: string;
  accessUntil: Option<number>;
  verifiedReceiptIds: string[];
  creditedHeroIds: string[];
}
/** Trusted repository output, never player chat or an imported grant. */
export interface VerifiedReferralReceipt {
  receiptId: string;
  referrerHeroId: string;
  referredHeroId: string;
  phoneVerifiedAt: number;
}
export interface Player {
  energy: NicoEnergy;
  id: string;
  name: string;
  createdAt: number;
  campaigns: Campaign[];
  activeCampaignId: string;
  realms: Realm[];
  activeRealmId: string;
  homeRealmId: string;
  focusQuestId: string;
  appliedUpdates: string[];
  checkin: Option<{ mood: Mood; at: number }>;
  suggestions: { lastOfferedAt: number; dismissed: string[] };
  operation: {
    phase: "choose" | "execute" | "review";
    candidateQuestId: string;
    lastQuestId: string;
  };
  sidekick: Sidekick;
  skills: Skill[];
  bonusLoot: string[];
  modules: Extension[];
  events: GameEvent[];
  /** Hero and Nico lines spoken before a quest existed. Still part of this player's save. */
  lines: QuestLine[];
  draftQuest: Option<QuestDraft>;
  settings: {
    sound: boolean;
    autoCalls: boolean;
    callIntervalMinutes: number;
    driving: boolean;
  };
  lastCallAt: number;
}
export interface GameState {
  kind: "questos.save";
  version: 1;
  activePlayerId: string;
  players: Player[];
}
export type QuestOffer =
  | { kind: "existing"; realmId: string; questId: string }
  | {
      kind: "proposal";
      realmId: string;
      key: string;
      offeredAt: number;
      quest: QuestInput;
    };
export interface CampaignTemplate {
  kind: "questos.campaign";
  version: 1;
  name: string;
  subtitle: string;
  quests: QuestInput[];
}
export type PatchOperation =
  | { type: "addQuest"; quest: QuestInput }
  | { type: "createCampaign"; name: string; subtitle?: string }
  | { type: "createRealm"; name: string; location?: string }
  | { type: "enterRealm"; realmId: string }
  | { type: "addSkill"; name: string; halfLifeDays?: number }
  | { type: "setStatus"; questId: string; status: QuestStatus; reason?: string }
  | { type: "installExtension"; extension: Extension };
export interface Patch {
  kind: "questos.patch";
  version: 1;
  operations: PatchOperation[];
}
export interface RuleEnvironment {
  now: () => number;
  id: (prefix: string) => string;
  random: () => number;
}
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;
export type Snapshot = DeepReadonly<GameState>;
