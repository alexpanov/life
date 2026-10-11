/** Human-controlled execution loop. New leads cannot silently replace the active mission. */
import { focusQuest, must, record } from '../engine.mjs';
export function currentMission(player) {
  return player.campaigns.flatMap(c => c.quests).find(q => q.id === player.focusQuestId && q.status === 'pending') || null;
}
export function proposeMission(player, questId) {
  const quest = player.campaigns.flatMap(c => c.quests).find(q => q.id === questId && q.status === 'pending');
  must(quest, 'This quest is no longer open.');
  player.operation.candidateQuestId = quest.id;
  return { current: currentMission(player), candidate: quest };
}
export function chooseMission(player, questId, now = Date.now()) {
  focusQuest(player, questId, now);
  player.operation = { phase: 'execute', candidateQuestId: '', lastQuestId: '' };
  record(player, 'mission:choose', `CURRENT MISSION: ${currentMission(player).title}`, now);
}
export function retainMission(player) { player.operation.candidateQuestId = ''; }
export function reportMission(player, questId) {
  const current = currentMission(player);
  player.operation = { phase: 'review', candidateQuestId: '', lastQuestId: questId };
  if (!current || current.id === questId) player.focusQuestId = '';
}
export function finishReview(player) {
  player.operation = { phase: currentMission(player) ? 'execute' : 'choose', candidateQuestId: '', lastQuestId: '' };
}
export function setAsideMission(player, now = Date.now()) {
  const quest = currentMission(player);
  if (quest) record(player, 'mission:pause', `SET ASIDE: ${quest.title}`, now);
  player.focusQuestId = ''; finishReview(player);
  return quest;
}
