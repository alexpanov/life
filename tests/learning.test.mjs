import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, activeCampaign, makeQuest, checkIn, acceptSuggestion, totalXP } from '../src/engine.mjs';
import { learnedFit, learnFromOutcome } from '../src/systems/learning.mjs';
import { chooseMission, setAsideMission } from '../src/systems/prioritize.mjs';
test('explicit feedback changes ranking without rewards or automatic quest acceptance',()=>{
  const p=createPlayer('Tester'), c=activeCampaign(p);
  c.quests=[makeQuest({title:'Buy groceries',category:'side'}),makeQuest({title:'Practice drawing',category:'side'})];
  const first=checkIn(p,'ready');assert.equal(first.questId,c.quests[0].id);
  learnFromOutcome(p,c.quests[0],'declined');
  const next=checkIn(p,'ready',Date.now(),(q,mood)=>learnedFit(p,q,mood));
  assert.equal(next.questId,c.quests[1].id);assert.equal(p.focusQuestId,'');assert.equal(totalXP(p),0);
  for(let i=0;i<220;i++)learnFromOutcome(p,c.quests[0],'declined');
  assert.equal(p.sidekick.learning.feedback.length,200);assert.equal(p.sidekick.learning.preferences['ready:errand'],-8);
});
test('accepting a new lead can preserve the active mission until an explicit switch',()=>{
  const p=createPlayer('Tester'), c=activeCampaign(p);
  c.quests.push(makeQuest({title:'Task',category:'side'}));chooseMission(p,c.quests[0].id);
  const offer={kind:'existing',realmId:p.activeRealmId,questId:c.quests[0].id};
  acceptSuggestion(p,offer,Date.now(),false);assert.equal(p.focusQuestId,c.quests[0].id);
  setAsideMission(p);assert.equal(p.focusQuestId,'');assert.equal(c.quests[0].status,'pending');assert.equal(totalXP(p),0);
});
