import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.mjs';
const T = Date.UTC(2026, 9, 11, 4);

test('the reported mission is complete, with Croatia home and Dino retaining its open quests', () => {
  const p=E.activePlayer(E.createState(T));
  assert.equal(E.activeRealm(p).name,'Dino');
  assert.equal(p.realms.find(r=>r.id===p.homeRealmId).name,'Croatia');
  assert.equal(E.progress(E.activeCampaign(p)).complete,true);
  assert.equal(E.totalXP(p),380);
  assert.equal(E.inventory(p).length,7);
  assert.equal(E.realmQuests(p).filter(q=>q.status==='pending').length,4);
  assert.ok(E.realmQuests(p).some(q=>q.status==='impossible'));
});

test('an old v1 save migrates without losing IDs, practice history, or unrelated quest statuses', () => {
  const legacy=E.createState(T),p=E.activePlayer(legacy),c=E.activeCampaign(p);
  E.practice(p,p.skills[0].id,'Forms',T);
  for(const q of c.quests.filter(q=>q.category==='main').slice(3)){q.status='pending';q.completedAt=null;}
  c.name='San Bernardino';
  p.campaigns=[c];delete c.realmId;
  for(const key of ['realms','activeRealmId','homeRealmId','focusQuestId','appliedUpdates','checkin','suggestions'])delete p[key];
  const skills=E.clone(p.skills),questIDs=c.quests.map(q=>q.id);
  const migrated=E.activePlayer(E.validateSave(legacy,T));
  assert.equal(E.applyReportedUpdate(migrated,T),true);
  assert.deepEqual(migrated.skills,skills);
  assert.deepEqual(E.activeCampaign(migrated).quests.map(q=>q.id),questIDs);
  assert.equal(E.activeRealm(migrated).name,'Dino');
  assert.equal(E.realmQuests(migrated).filter(q=>q.status==='pending').length,4);
  assert.equal(E.totalXP(migrated),420);
  const reopened=E.activeCampaign(migrated).quests.find(q=>q.title.includes('30 - tinted'));
  E.setQuestStatus(migrated,reopened.id,'pending','',T);
  const restored=E.activePlayer(E.validateSave({...legacy,players:[migrated]},T));
  assert.equal(E.applyReportedUpdate(restored,T),false);
  assert.equal(restored.campaigns.flatMap(c=>c.quests).find(q=>q.id===reopened.id).status,'pending');
});

test('returning after a long absence keeps realm quests and global character history', () => {
  const state=E.createState(T),p=E.activePlayer(state),dino=E.activeRealm(p).id;
  const q=E.realmQuests(p).find(q=>q.status==='pending');
  E.practice(p,p.skills[0].id,'Forms',T);
  const ids=E.realmQuests(p).map(q=>q.id);
  E.enterRealm(p,p.homeRealmId,T+E.DAY);
  E.activeCampaign(p).quests.push(E.makeQuest({title:'A home task'},T+E.DAY));
  E.enterRealm(p,dino,T+60*E.DAY);
  assert.deepEqual(E.realmQuests(p).map(q=>q.id),ids);
  assert.equal(E.realmQuests(p).find(x=>x.id===q.id).status,'pending');
  assert.equal(E.totalXP(p),420);
  assert.ok(E.readinessAt(p.skills[0],T+60*E.DAY)<75);
  const restored=E.activePlayer(E.validateSave(state,T+60*E.DAY));
  assert.equal(restored.activeRealmId,dino);
  assert.ok(restored.campaigns.some(c=>c.quests.some(q=>q.title==='A home task')));
});

test('check-in matches mood, offers one existing quest in the current realm, and never completes it', () => {
  const p=E.activePlayer(E.createState(T));
  const sleep=E.checkIn(p,'tired',T),church=E.checkIn(p,'quiet',T),dojo=E.checkIn(p,'curious',T);
  const title=id=>p.campaigns.flatMap(c=>c.quests).find(q=>q.id===id).title;
  assert.match(title(sleep.questId),/sleep/);
  assert.match(title(church.questId),/Church/);
  assert.match(title(dojo.questId),/Taekwondo/);
  E.acceptSuggestion(p,church,T);
  assert.equal(E.nextQuest(E.activeCampaign(p),p.focusQuestId).id,church.questId);
  assert.equal(E.realmQuests(p).find(q=>q.id===church.questId).status,'pending');
  E.enterRealm(p,p.homeRealmId,T);
  assert.equal(E.checkIn(p,'ready',T),null);
  assert.throws(()=>E.acceptSuggestion(p,sleep,T),/current realm/);
});

test('optional leads require acceptance, earn no upfront XP, and do not repeat after a return', () => {
  const p=E.createPlayer('Test',false,T);
  const offer=E.checkIn(p,'curious',T);
  assert.equal(offer.kind,'proposal');assert.equal(E.realmQuests(p).length,0);
  assert.equal(E.checkIn(p,'curious',T+1),null);
  const id=E.acceptSuggestion(p,offer,T+1);
  assert.equal(E.totalXP(p),0);assert.equal(E.realmQuests(p).length,1);
  assert.throws(()=>E.acceptSuggestion(p,offer,T+2),/no longer available/);
  E.setQuestStatus(p,id,'done','',T+2);
  assert.equal(E.checkIn(p,'curious',T+3*E.DAY),null);
  assert.equal(E.totalXP(p),30);
});

test('new leads are limited across realms and dismissals persist through save restoration', () => {
  const state={kind:'questos.save',version:1,players:[E.createPlayer('Test',false,T)]};
  state.activePlayerId=state.players[0].id;const p=state.players[0];
  const offer=E.checkIn(p,'curious',T);E.dismissSuggestion(p,offer);
  const realm=E.addRealm(p,'A new town','',T+1000);
  assert.equal(E.checkIn(p,'curious',T+1000),null);
  assert.equal(E.checkIn(p,'curious',T+2*E.DAY).kind,'proposal');
  const restored=E.activePlayer(E.validateSave(state,T+3*E.DAY));
  E.enterRealm(restored,restored.homeRealmId,T+3*E.DAY);
  assert.equal(E.checkIn(restored,'curious',T+5*E.DAY),null);
  assert.equal(restored.realms.find(r=>r.id===realm.id).name,'A new town');
});

test('campaign imports and bridge-created dungeons belong to the current realm', () => {
  const p=E.createPlayer('Test',false,T);const realm=E.addRealm(p,'Town','',T);
  const campaign=E.importCampaign(p,{kind:'questos.campaign',version:1,name:'An errand',quests:[{title:'Buy bread'}]},T);
  assert.equal(campaign.realmId,realm.id);
  const updated=E.applyPatch(p,{kind:'questos.patch',version:1,operations:[{type:'createRealm',name:'Elsewhere'},{type:'createCampaign',name:'A visit'}]},T);
  assert.equal(E.activeRealm(updated).name,'Elsewhere');
  assert.equal(E.activeCampaign(updated).realmId,updated.activeRealmId);
  assert.equal(p.realms.length,2);
});

test('invalid realm references are rejected before replacing saved progress', () => {
  const state=E.createState(T);
  state.players[0].campaigns[0].realmId='realm_missing';
  assert.throws(()=>E.validateSave(state,T),/unknown realm/);
});
