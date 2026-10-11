import { createPowerup, activatePowerup, consumePowerup } from "./powerups";
export {
  activeNicoPowerup,
  DEFAULT_POWERUPS,
  POWERUP_DURATION_MS,
} from "./powerups";
export type { PowerupTemplate, NicoPowerup, NicoPowerups } from "./powerups";
import { consumeNicoEnergy, createNicoEnergy } from "./nico-energy";
export {
  nicoEnergyStatus,
  consumeNicoEnergy,
  grantVerifiedReferral,
  NICO_DAILY_ENERGY,
  NICO_REFERRAL_DAYS,
} from "./nico-energy";
import {
  forgetNicoContent,
  tellNicoStory,
  shareNicoWisdom,
} from "./nico-stories";
export {
  NICO_STORIES,
  NICO_WISDOM,
  SERVICE_TRAIT_ID,
  activeNicoTraits,
  activeNicoMemories,
} from "./nico-stories";
import type { NicoContentTarget, NicoFeedbackReason } from "./types";
import { finishNicoJob, queueReflection, evolveNicoTraits } from "./nico-jobs";
export { nextNicoJob } from "./nico-jobs";
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
  DeepReadonly,
} from "./types";
export type * from "./types";
export { NIKO_PROMPTS } from "./sidekick";
export type { SidekickContext } from "./sidekick";
export type Command =
  | {
      type: "create-powerup";
      name: string;
      description: string;
      context: string;
      instructions: string;
    }
  | { type: "activate-powerup"; id: string }
  | { type: "deactivate-powerup" }
  | {
      type: "consume-powerup";
      instanceId: string;
      requestId: string;
      expectedActivatedAt: number;
    }
  | { type: "consume-nico-energy"; requestId: string }
  | { type: "tell-story"; storyId: string; explicitRequest: boolean }
  | { type: "share-wisdom" }
  | {
      type: "forget-memory" | "forget-trait" | "forget-story" | "forget-wisdom";
      id: string;
    }
  | {
      type: "nico-feedback";
      target: NicoContentTarget;
      id: string;
      reason: NicoFeedbackReason;
      text: string;
    }
  | { type: "meet-nico"; text: string }
  | { type: "name-hero"; name: string }
  | { type: "reflect-quest"; questId: string; text: string }
  | { type: "quest-progress"; questId: string; text: string }
  | {
      type: "record-line";
      questId: string;
      speaker: "hero" | "nico";
      text: string;
    }
  | { type: "set-nico-trait"; text: string }
  | { type: "evolve-nico" }
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
  | { type: "describe-quest"; text: string }
  | { type: "choose-realm"; realmId: string }
  | { type: "start-quest" }
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
  const keepLine = (
    questId: string,
    speaker: "hero" | "nico",
    note: string,
  ) => {
    const line = {
      id: context.eventId,
      speaker,
      text: note,
      at: now,
    };
    const targetId = questId || p.focusQuestId;
    const found = targetId
      ? p.campaigns
          .flatMap((campaign) => campaign.quests)
          .find((item) => item.id === targetId)
      : undefined;
    if (found) {
      if (!found.lines.some((item) => item.id === line.id))
        found.lines.push(line);
      return;
    }
    if (!p.lines.some((item) => item.id === line.id)) p.lines.push(line);
  };
  const review = (q: Quest, outcome: "completed" | "blocked" | "set-aside") => {
    learnFromOutcome(p, q, outcome, now);
    const latest = p.sidekick.reviews.at(-1);
    if (latest) p.sidekick = queueReflection(p.sidekick, q.id, latest.key, now);
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
  switch (command.type) {
    case "create-powerup":
      createPowerup(
        p.sidekick,
        {
          name: command.name,
          description: command.description,
          context: command.context,
          instructions: command.instructions,
        },
        `powerup_${context.eventId}`,
        now,
      );
      result.message = "Power-up saved.";
      break;
    case "activate-powerup":
      activatePowerup(p.sidekick, command.id, now);
      result.message = "Ready for Niko’s next reply.";
      break;
    case "deactivate-powerup":
      p.sidekick.powerups.active = O.none();
      break;
    case "consume-powerup":
      consumePowerup(
        p.sidekick,
        command.instanceId,
        command.requestId,
        now,
        command.expectedActivatedAt,
      );
      break;
    case "consume-nico-energy":
      p.energy = consumeNicoEnergy(p.energy, command.requestId, now);
      break;
    case "tell-story":
      result.message = tellNicoStory(
        p.sidekick,
        command.storyId,
        command.explicitRequest,
        now,
      );
      break;
    case "share-wisdom":
      result.message = shareNicoWisdom(p.sidekick, now);
      break;
    case "forget-memory":
    case "forget-trait":
    case "forget-story":
    case "forget-wisdom":
      forgetNicoContent(
        p.sidekick,
        command.type === "forget-memory"
          ? "memory"
          : command.type === "forget-trait"
            ? "trait"
            : command.type === "forget-story"
              ? "story"
              : "wisdom",
        command.id,
        now,
      );
      result.message = "Understood. I will leave that out.";
      break;
    case "nico-feedback":
      forgetNicoContent(p.sidekick, command.target, command.id, now);
      p.sidekick.contentFeedback.push({
        target: command.target,
        id: command.id,
        reason: command.reason,
        text: command.text.trim().slice(0, 600),
        at: now,
      });
      p.sidekick.contentFeedback = p.sidekick.contentFeedback.slice(-100);
      result.message = "Understood, boss. I will leave that out.";
      break;
    case "meet-nico":
      if (!p.sidekick.introduced) {
        if (command.text.trim()) addSidekickSnippet(p, command.text, now);
        p.sidekick.introduced = true;
        p.sidekick = finishNicoJob(p.sidekick, "meet-hero", now);
      }
      break;
    case "name-hero": {
      const name = command.name.trim().slice(0, 60);
      invariant(name, "What should Niko call you?");
      p.name = name;
      p.sidekick.heroName = O.some(name);
      p.sidekick = finishNicoJob(p.sidekick, "learn-name", now);
      break;
    }
    case "reflect-quest": {
      quest(command.questId);
      const pending = p.sidekick.jobs.some(
        (j) =>
          j.kind === "reflect-outcome" &&
          j.questId === command.questId &&
          j.status === "pending",
      );
      if (!pending) break;
      const note = command.text.trim().slice(0, 600);
      invariant(note, "What helped, or what could we change next time?");
      addSidekickSnippet(p, note, now);
      const last = [...p.sidekick.reviews]
        .reverse()
        .find((r) => r.questId === command.questId);
      if (last) last.adjustment = note;
      p.sidekick = finishNicoJob(
        p.sidekick,
        "reflect-outcome",
        now,
        command.questId,
      );
      p.sidekick = evolveNicoTraits(p, now);
      break;
    }
    case "quest-progress": {
      const q = quest(command.questId);
      invariant(q.status === "pending", "This quest is already closed.");
      const note = command.text.trim().slice(0, 2000);
      invariant(note, "Write one thing you did.");
      keepLine(q.id, "hero", note);
      if (!p.events.some((e) => e.id === context.eventId))
        p.events.unshift({
          id: context.eventId,
          type: "quest-progress",
          text: note,
          at: now,
          questId: q.id,
        });
      p.events = p.events.slice(0, 300);
      break;
    }
    case "record-line": {
      const note = command.text.trim().slice(0, 2000);
      invariant(note, "Write a line.");
      keepLine(command.questId, command.speaker, note);
      break;
    }
    case "set-nico-trait": {
      const text = command.text.trim().slice(0, 200);
      invariant(text, "Describe how you want Niko to help.");
      if (
        p.sidekick.traits.some((t) => t.source === "player" && t.text === text)
      )
        break;
      invariant(
        p.sidekick.traits.length < 30,
        "Niko has enough traits for now.",
      );
      p.sidekick.traits.push({
        id: `trait_${context.eventId}`,
        locked: false,
        deletedAt: O.none(),
        text,
        source: "player",
        acquiredAt: now,
        evidence: [],
      });
      break;
    }
    case "evolve-nico":
      p.sidekick = evolveNicoTraits(p, now);
      break;
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
    case "describe-quest":
      r.describeQuest(p, command.text, context.eventId, now);
      break;
    case "choose-realm":
      r.chooseDraftRealm(p, command.realmId);
      break;
    case "start-quest": {
      const before = current();
      const started = r.startDraftQuest(p, now);
      p.operation = { phase: "execute", candidateQuestId: "", lastQuestId: "" };
      if (O.isNone(before) || before.value.id !== started.id)
        learnFromOutcome(p, started, "accepted", now);
      result.destination = O.some("home");
      result.message = "Quest started.";
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
      resetSidekick(p, now);
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
        // Import cannot roll back a known hero's disclosure or retirement history.
        for (const hero of result.state.players) {
          const previous = state.players.find((old) => old.id === hero.id);
          // Local imports are not proof of phone verification or unused quota.
          hero.energy = previous
            ? copy(previous.energy)
            : createNicoEnergy(
                `invite_${context.eventId}_${result.state.players.indexOf(hero)}`,
                now,
              );
          if (previous)
            hero.sidekick.powerups = copy(previous.sidekick.powerups);
          else {
            hero.sidekick.powerups.active = O.none();
            for (const item of hero.sidekick.powerups.instances)
              item.charges = 0;
          }
          if (!previous) continue;
          for (const key of ["stories", "wisdom"] as const) {
            for (const record of hero.sidekick[key]) {
              const old = previous.sidekick[key].find(
                (item) => item.id === record.id,
              );
              if (!old) continue;
              if (O.isSome(old.deletedAt)) record.deletedAt = old.deletedAt;
              if (old.tellingCount > record.tellingCount) {
                record.tellingCount = old.tellingCount;
                record.lastToldAt = old.lastToldAt;
              }
            }
          }
          for (const old of previous.sidekick.snippets.filter((item) =>
            O.isSome(item.deletedAt),
          )) {
            const restored = hero.sidekick.snippets.find(
              (item) => item.id === old.id,
            );
            if (restored) restored.deletedAt = old.deletedAt;
            else hero.sidekick.snippets.push(old);
          }
          for (const old of previous.sidekick.traits.filter(
            (item) => O.isSome(item.deletedAt) && !item.locked,
          )) {
            const restored = hero.sidekick.traits.find(
              (item) => item.id === old.id,
            );
            if (restored) restored.deletedAt = old.deletedAt;
            else hero.sidekick.traits.push(old);
          }
          invariant(
            hero.sidekick.snippets.length <= 1000 &&
              hero.sidekick.traits.length <= 30,
            "Imported memory archive exceeds capacity.",
          );
        }
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
  const r = runtime({ now, eventId: "query", localDay: "" }),
    player = r.activePlayer(snapshot),
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
export function sidekickMemory(
  snapshot: Snapshot,
  now: number,
): DeepReadonly<Sidekick> {
  return selectGame(snapshot, now).player.sidekick;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}

export {
  nicoChatForm,
  nicoFeedbackForm,
  nicoTraitForm,
  NICO_FORM_DEFINITIONS,
} from "./forms";
export type {
  FormDefinition,
  FormIssue,
  NicoChatValues,
  NicoFeedbackValues,
  NicoTraitValues,
} from "./forms";
export type { PreparedLLMSnippet, LLMSnippetInput } from "./llm-snippet";
export { NICO_THOUGHTS, simulateThought } from "./thought";
export type { Person, Hero, ThoughtEnvironment, NicoThought } from "./thought";
