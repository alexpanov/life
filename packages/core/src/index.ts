export { serializeGame } from "./codec";
import * as O from "../../foundation/src/option";
/** Stable public domain boundary. Interfaces submit commands; they never calculate rewards or mutate saves. */
import { createRules, type Rules } from "./rules";
import {
  learnFromOutcome,
  learnedFit,
  addSidekickSnippet,
  resetSidekick,
  nikoGuidance,
  sidekickContext,
} from "./sidekick";
import type {
  GameState,
  Player,
  Quest,
  QuestInput,
  QuestOffer,
  Mood,
  QuestStatus,
  Snapshot,
  Sidekick,
} from "./types";
export type * from "./types";
export { NIKO_PROMPTS } from "./sidekick";
export type { SidekickContext } from "./sidekick";
export type Command =
  | { type: "check-in"; mood: Mood }
  | { type: "accept-offer"; offer: QuestOffer }
  | { type: "dismiss-offer"; offer: QuestOffer }
  | { type: "propose-mission"; questId: string }
  | { type: "choose-mission"; questId: string }
  | { type: "retain-mission" }
  | { type: "set-aside" }
  | { type: "finish-review" }
  | {
      type: "set-status";
      questId: string;
      status: QuestStatus;
      reason?: string;
    }
  | { type: "add-quest"; quest: QuestInput }
  | { type: "edit-quest"; questId: string; quest: QuestInput }
  | { type: "enter-realm"; realmId: string }
  | { type: "add-realm"; name: string; location: string; home?: boolean }
  | {
      type: "edit-realm";
      realmId: string;
      name: string;
      location: string;
      home: boolean;
    }
  | { type: "open-dungeon"; campaignId: string }
  | { type: "add-dungeon"; name: string; subtitle: string }
  | { type: "practice"; skillId: string; note: string }
  | { type: "undo-practice"; skillId: string }
  | { type: "pause-skill"; skillId: string; paused: boolean }
  | { type: "add-skill"; name: string; halfLifeDays: number }
  | {
      type: "edit-skill";
      skillId: string;
      name: string;
      halfLifeDays: number;
      graceDays: number;
    }
  | { type: "add-loot"; name: string }
  | { type: "add-player"; name: string }
  | { type: "switch-player"; playerId: string }
  | { type: "remember"; text: string }
  | { type: "reset-memory" }
  | { type: "settings"; settings: Partial<Player["settings"]> }
  | { type: "import"; data: unknown }
  | { type: "transmission" };
export interface TransitionContext {
  now: number;
  eventId: string;
  localDay: string;
}
export interface TransitionResult {
  state: GameState;
  offer: O.Option<QuestOffer>;
  message: string;
  destination: O.Option<"home" | "board" | "realms">;
  transmission: O.Option<{ caller: string; text: string }>;
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function runtime(context: TransitionContext) {
  let n = 0;
  return createRules({
    now: () => context.now,
    id: (prefix) => `${prefix}_${context.eventId}_${n++}`,
    random: () => 0,
  });
}
export function newGame(
  context: TransitionContext,
  name = "Player 1",
): GameState {
  const rules = runtime(context),
    p = rules.createPlayer(name, false, context.now);
  return {
    kind: "questos.save",
    version: 1,
    activePlayerId: p.id,
    players: [p],
  };
}
export function restoreGame(
  data: unknown,
  context: TransitionContext,
): GameState {
  return runtime(context).validateSave(data, context.now);
}
export function parseImport(text: string, context: TransitionContext): unknown {
  return runtime(context).parseJSON(text);
}
export function transition(
  snapshot: Snapshot,
  command: Command,
  context: TransitionContext,
): TransitionResult {
  const state = copy(snapshot) as GameState;
  const r: Rules = runtime(context);
  const p = r.activePlayer(state),
    now = context.now;
  const result: TransitionResult = {
    state,
    offer: O.none(),
    message: "",
    destination: O.none(),
    transmission: O.none(),
  };
  const quest = (id: string) => {
    const q = p.campaigns.flatMap((c) => c.quests).find((q) => q.id === id);
    invariant(q, "Quest not found.");
    return q;
  };
  const current = (): O.Option<Quest> =>
    O.fromNullable(
      p.campaigns
        .flatMap((c) => c.quests)
        .find((q) => q.id === p.focusQuestId && q.status === "pending"),
    );
  const review = (q: Quest, outcome: "completed" | "blocked" | "set-aside") => {
    learnFromOutcome(p, q, outcome, now);
    p.operation = { phase: "review", candidateQuestId: "", lastQuestId: q.id };
    result.destination = O.some("home");
  };
  const choose = (id: string) => {
    const before = current();
    r.focusQuest(p, id, now);
    p.operation = { phase: "execute", candidateQuestId: "", lastQuestId: "" };
    if (O.isNone(before) || before.value.id !== id)
      learnFromOutcome(p, quest(id), "accepted", now);
    result.destination = O.some("board");
    result.message = "One mission. One next move.";
  };
  const propose = (id: string) => {
    invariant(quest(id).status === "pending", "This quest is no longer open.");
    const focused = current();
    if (O.isSome(focused) && focused.value.id !== id)
      p.operation.candidateQuestId = id;
    else choose(id);
  };
  if (p.settings.driving && command.type !== "settings")
    throw Error("Park before using game controls.");
  switch (command.type) {
    case "check-in":
      result.offer = r.checkIn(p, command.mood, now, (q, m) =>
        learnedFit(p, q, m),
      );
      break;
    case "accept-offer":
      propose(r.acceptSuggestion(p, command.offer, now, false));
      break;
    case "dismiss-offer": {
      const q =
        command.offer.kind === "existing"
          ? quest(command.offer.questId)
          : command.offer.quest;
      learnFromOutcome(p, q, "declined", now);
      r.dismissSuggestion(p, command.offer);
      break;
    }
    case "propose-mission":
      propose(command.questId);
      break;
    case "choose-mission":
      choose(command.questId);
      break;
    case "retain-mission":
      p.operation.candidateQuestId = "";
      break;
    case "set-aside": {
      const q = current();
      if (O.isSome(q)) {
        p.focusQuestId = "";
        review(q.value, "set-aside");
        result.message = "Quest stays on your board.";
      }
      break;
    }
    case "finish-review":
      p.operation = {
        phase: O.isSome(current()) ? "execute" : "choose",
        candidateQuestId: "",
        lastQuestId: "",
      };
      result.destination = O.some("home");
      break;
    case "set-status": {
      const q = quest(command.questId);
      if (r.setQuestStatus(p, q.id, command.status, command.reason, now)) {
        if (command.status !== "pending")
          review(q, command.status === "done" ? "completed" : "blocked");
        result.message =
          command.status === "done"
            ? `Quest complete. +${q.xp} XP.`
            : command.status === "impossible"
              ? "Closed. No penalty."
              : "Quest reopened. Reward reversed.";
      }
      break;
    }
    case "add-quest": {
      const c = r.activeCampaign(p);
      invariant(c.quests.length < 200, "This dungeon is full.");
      const q = r.makeQuest(command.quest, now);
      c.quests.push(q);
      p.operation.candidateQuestId = q.id;
      result.message = "New quest. Choose whether to take it now.";
      break;
    }
    case "edit-quest": {
      const q = quest(command.questId),
        v = r.makeQuest(command.quest, now);
      Object.assign(q, {
        title: v.title,
        detail: v.detail,
        nextMove: v.nextMove,
        destination: v.destination,
        category: v.category,
        xp: v.xp,
        loot: v.loot,
      });
      result.message = "Quest updated.";
      break;
    }
    case "enter-realm":
      r.enterRealm(p, command.realmId, now);
      result.destination = O.some("realms");
      break;
    case "add-realm": {
      const realm = r.addRealm(p, command.name, command.location, now);
      if (command.home) {
        p.homeRealmId = realm.id;
        p.realms.forEach((x) => (x.home = x.id === realm.id));
      }
      result.destination = O.some("realms");
      break;
    }
    case "edit-realm": {
      const realm = p.realms.find((x) => x.id === command.realmId);
      invariant(realm, "Realm not found.");
      invariant(command.name.trim(), "Name the realm.");
      realm.name = r.clean(command.name, 100);
      realm.location = r.clean(command.location, 240);
      if (command.home) {
        p.homeRealmId = realm.id;
        p.realms.forEach((x) => (x.home = x.id === realm.id));
      }
      break;
    }
    case "open-dungeon": {
      const c = p.campaigns.find((c) => c.id === command.campaignId);
      invariant(c, "Dungeon not found.");
      r.enterRealm(p, c.realmId, now);
      p.activeCampaignId = c.id;
      r.activeRealm(p).lastCampaignId = c.id;
      result.destination = O.some("board");
      break;
    }
    case "add-dungeon": {
      invariant(p.campaigns.length < 100, "Too many dungeons.");
      const c = r.makeCampaign(
        command.name,
        command.subtitle,
        now,
        p.activeRealmId,
      );
      p.campaigns.push(c);
      p.activeCampaignId = c.id;
      r.activeRealm(p).lastCampaignId = c.id;
      result.destination = O.some("board");
      break;
    }
    case "practice": {
      r.practice(p, command.skillId, command.note, now, context.localDay);
      result.message = "Practice logged. +40 XP.";
      break;
    }
    case "undo-practice":
      r.undoPractice(p, command.skillId, now);
      break;
    case "pause-skill":
      r.pauseSkill(p, command.skillId, command.paused, now);
      break;
    case "add-skill":
      invariant(p.skills.length < 50, "Too many skills.");
      invariant(command.name.trim(), "Name the skill.");
      p.skills.push(r.newSkill(command.name, command.halfLifeDays, now));
      break;
    case "edit-skill": {
      const s = p.skills.find((s) => s.id === command.skillId);
      invariant(s, "Skill not found.");
      invariant(command.name.trim(), "Name the skill.");
      s.readiness = r.readinessAt(s, now);
      s.anchorAt = now;
      s.name = r.clean(command.name, 80);
      s.halfLifeDays = r.clamp(command.halfLifeDays, 1, 365);
      s.graceDays = r.clamp(command.graceDays, 0, 30);
      break;
    }
    case "add-loot":
      invariant(p.bonusLoot.length < 200, "Too much bonus loot.");
      invariant(command.name.trim(), "Name the item.");
      p.bonusLoot.push(r.clean(command.name, 160));
      break;
    case "add-player":
      invariant(state.players.length < 25, "Too many players.");
      {
        const next = r.createPlayer(command.name, false, now);
        state.players.push(next);
        state.activePlayerId = next.id;
        result.destination = O.some("home");
      }
      break;
    case "switch-player":
      invariant(
        state.players.some((p) => p.id === command.playerId),
        "Player not found.",
      );
      state.activePlayerId = command.playerId;
      result.destination = O.some("home");
      break;
    case "remember":
      addSidekickSnippet(p, command.text, now);
      result.message = "Niko will remember.";
      break;
    case "reset-memory":
      resetSidekick(p);
      result.message = "Niko’s memory reset. Your progress is safe.";
      break;
    case "settings":
      p.settings = {
        ...p.settings,
        ...command.settings,
        callIntervalMinutes: r.clamp(
          command.settings.callIntervalMinutes ??
            p.settings.callIntervalMinutes,
          5,
          180,
        ),
      };
      break;
    case "transmission":
      result.transmission = O.some(r.operatorMessage(p));
      p.lastCallAt = now;
      break;
    case "import": {
      const data = command.data;
      invariant(
        data && typeof data === "object" && "kind" in data,
        "Invalid import.",
      );
      if (data.kind === "questos.save") {
        result.state = r.validateSave(data, now);
        result.destination = O.some("home");
        break;
      }
      const before = new Map(
        p.campaigns.flatMap((c) => c.quests).map((q) => [q.id, q.status]),
      );
      if (data.kind === "questos.campaign") r.importCampaign(p, data, now);
      else if (data.kind === "questos.extension")
        r.installExtension(p, data, now);
      else if (data.kind === "questos.patch") {
        const updated = r.applyPatch(p, data, now);
        Object.assign(p, updated);
      } else throw Error("Unsupported import.");
      const changed = p.campaigns
        .flatMap((c) => c.quests)
        .filter(
          (q) => before.get(q.id) === "pending" && q.status !== "pending",
        );
      changed.forEach((q) =>
        review(q, q.status === "done" ? "completed" : "blocked"),
      );
      result.destination = O.some("home");
      result.message = "Import applied.";
      break;
    }
    default:
      assertNever(command);
  }
  return result;
}
function assertNever(value: never): never {
  throw Error(`Unsupported command: ${String(value)}`);
}
export function selectGame(snapshot: Snapshot, now: number) {
  const state = copy(snapshot) as GameState,
    r = runtime({ now, eventId: "query", localDay: "" }),
    player = r.activePlayer(state),
    realm = r.activeRealm(player),
    campaign = r.activeCampaign(player),
    all = player.campaigns.flatMap((c) => c.quests),
    mission = O.fromNullable(
      all.find((q) => q.id === player.focusQuestId && q.status === "pending"),
    );
  return {
    player,
    realm,
    campaign,
    mission,
    candidate: O.fromNullable(
      all.find((q) => q.id === player.operation.candidateQuestId),
    ),
    lastQuest: O.fromNullable(
      all.find((q) => q.id === player.operation.lastQuestId),
    ),
    quests: r.realmQuests(player),
    dungeons: r.realmCampaigns(player),
    progress: r.progress(campaign),
    xp: r.totalXP(player),
    rank: r.rankForXP(r.totalXP(player)),
    inventory: r.inventory(player),
    guidance: nikoGuidance(player, mission),
    skills: player.skills.map((s) => ({
      ...s,
      currentLevel: r.currentLevel(s, now),
      potentialLevel: r.potentialLevel(s),
      readiness: r.readinessAt(s, now),
    })),
  };
}
export function getHandoff(snapshot: Snapshot, now: number): string {
  const view = selectGame(snapshot, now),
    r = runtime({ now, eventId: "query", localDay: "" });
  return `${r.agentBrief(view.player, now)}\n\nSIDEKICK CONTEXT\n${JSON.stringify(sidekickContext(view.player, view.mission), null, 2)}`;
}
export function getTemplate(snapshot: Snapshot, now: number) {
  return runtime({ now, eventId: "query", localDay: "" }).campaignTemplate(
    selectGame(snapshot, now).campaign,
  );
}
export function getSidekickContext(snapshot: Snapshot, now: number) {
  const v = selectGame(snapshot, now);
  return sidekickContext(v.player, v.mission);
}
export function sidekickMemory(snapshot: Snapshot, now: number): Sidekick {
  return selectGame(snapshot, now).player.sidekick;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
