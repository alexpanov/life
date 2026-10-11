/** Bounded preference learning from explicit choices and confirmed outcomes. No model or code execution. */
import { clamp } from '../engine.mjs';
export function questCategory(quest) {
  const title = quest.title.toLowerCase();
  if (/sleep|rest|recover|night/.test(title)) return 'rest';
  if (/pray|church|reflect/.test(title)) return 'faith';
  if (/train|practice|gym|taekwondo|strength/.test(title)) return 'training';
  if (/scout|notice|explore|worth returning|visit/.test(title)) return 'exploration';
  if (/family|wife|kid|ibuprofen|vitamin|magnesium|sunscreen|cerave/.test(title)) return 'care';
  if (/work|focus|project|code/.test(title)) return 'work';
  if (/buy|return|rental|shop|errand/.test(title)) return 'errand';
  return 'general';
}
export function learnFromOutcome(player, quest, outcome, now = Date.now()) {
  if (!quest) return;
  const mood = player.checkin?.mood || 'ready', category = questCategory(quest);
  const delta = { accepted: 1, completed: 2, declined: -2, blocked: 0, 'set-aside': -1 }[outcome];
  if (delta == null) return;
  const key = `${mood}:${category}`;
  player.learning.preferences[key] = clamp((player.learning.preferences[key] || 0) + delta, -8, 8);
  player.learning.feedback.push({ questId: quest.id || '', mood, category, outcome, at: now });
  player.learning.feedback = player.learning.feedback.slice(-200);
}
export function learnedFit(player, quest, mood) {
  return player.learning.preferences[`${mood}:${questCategory(quest)}`] || 0;
}
