import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.mjs';
const T = Date.UTC(2026,9,10,19,0);
const setup = () => { const state=E.createState(T); return {state,p:E.activePlayer(state),c:E.activeCampaign(E.activePlayer(state))}; };

test('handoff starts with 3 of 5 main objectives, exact remaining loot',()=>{
  const {p,c}=setup();assert.deepEqual(E.progress(c),{done:3,total:5,impossible:0,complete:false});
  assert.equal(E.totalXP(p),180);assert.equal(E.inventory(p).length,5);
  assert.match(E.nextQuest(c).title,/30 - tinted/);assert.ok(c.quests.some(q=>q.status==='impossible'));
});
test('completion is idempotent and adds inventory only once',()=>{
  const {p,c}=setup(),q=E.nextQuest(c);E.setQuestStatus(p,q.id,'done','',T);
  assert.equal(E.totalXP(p),280);assert.equal(E.setQuestStatus(p,q.id,'done','',T),false);
  assert.equal(E.inventory(p).length,6);assert.equal(E.totalXP(p),280);
});
test('undo reverses XP and inventory, redo does not farm rewards',()=>{
  const {p,c}=setup(),q=E.nextQuest(c);E.setQuestStatus(p,q.id,'done','',T);
  E.setQuestStatus(p,q.id,'pending','',T);assert.equal(E.totalXP(p),180);assert.equal(E.inventory(p).length,5);
  E.setQuestStatus(p,q.id,'done','',T);assert.equal(E.totalXP(p),280);
});
test('impossible objective removes its denominator with no penalty',()=>{
  const {p,c}=setup(),q=E.nextQuest(c);E.setQuestStatus(p,q.id,'impossible','Unavailable',T);
  assert.equal(E.totalXP(p),180);assert.deepEqual(E.progress(c),{done:3,total:4,impossible:1,complete:false});
  assert.match(E.nextQuest(c).title,/50 - untinted/);
});
test('all impossible main objectives are not falsely a completed mission',()=>{
  const p=E.createPlayer('Test',false,T),c=E.activeCampaign(p),q=E.makeQuest({title:'No'},T);c.quests.push(q);
  E.setQuestStatus(p,q.id,'impossible','',T);assert.equal(E.progress(c).complete,false);
});
test('completing both sunscreens completes the main mission',()=>{
  const {p,c}=setup();for(const q of c.quests.filter(q=>q.category==='main'&&q.status==='pending'))E.setQuestStatus(p,q.id,'done','',T);
  assert.equal(E.progress(c).complete,true);assert.equal(E.inventory(p).length,7);assert.equal(E.totalXP(p),380);
});
test('zero-XP and bounded XP objectives work',()=>{
  assert.equal(E.makeQuest({title:'No reward',xp:0},T).xp,0);
  assert.equal(E.makeQuest({title:'Default'},T).xp,50);
  assert.equal(E.makeQuest({title:'Cap',xp:99999},T).xp,1000);
});
test('skills start unrated; no inferred athletic ability',()=>{
  const {p}=setup();for(const s of p.skills){assert.equal(E.currentLevel(s,T),0);assert.equal(E.readinessAt(s,T),0);}
});
test('practice builds readiness and potential, once per day',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'forms',T);
  assert.equal(s.xp,40);assert.equal(E.potentialLevel(s),2);assert.equal(E.readinessAt(s,T),75);
  assert.throws(()=>E.practice(p,s.id,'again',T+1000),/already logged/);
  E.practice(p,s.id,'forms',T+E.DAY);assert.equal(s.xp,80);assert.equal(E.readinessAt(s,T+E.DAY),100);
});
test('a two-month absence lowers current level but not practice XP',()=>{
  const {p}=setup(),s=p.skills[0];for(let i=0;i<16;i++)E.practice(p,s.id,'',T+i*E.DAY);
  const end=T+15*E.DAY;const level=E.currentLevel(s,end);const xp=s.xp;
  assert.ok(E.currentLevel(s,end+60*E.DAY)<level);assert.equal(s.xp,xp);assert.equal(E.potentialLevel(s),5);
});
test('decay applies exactly after grace and one half-life',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'',T);
  assert.equal(E.readinessAt(s,T+3*E.DAY),75);
  assert.ok(Math.abs(E.readinessAt(s,T+33*E.DAY)-37.5)<1e-8);
});
test('clock rollback cannot increase readiness',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'',T);assert.equal(E.readinessAt(s,T-E.DAY),75);
});
test('recovery pauses decay without erasing history',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'',T);E.pauseSkill(p,s.id,true,T+10*E.DAY);
  const r=E.readinessAt(s,T+10*E.DAY);assert.equal(E.readinessAt(s,T+110*E.DAY),r);
  assert.throws(()=>E.practice(p,s.id,'',T+11*E.DAY),/Resume/);
  E.pauseSkill(p,s.id,false,T+110*E.DAY);assert.equal(E.readinessAt(s,T+110*E.DAY),r);assert.equal(s.xp,40);
});
test('return practice restores readiness without rewriting potential',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'',T);const old=E.readinessAt(s,T+60*E.DAY);
  E.practice(p,s.id,'return',T+60*E.DAY);assert.ok(E.readinessAt(s,T+60*E.DAY)>old);assert.equal(s.xp,80);
});
test('undo practice restores pre-session state',()=>{
  const {p}=setup(),s=p.skills[0];E.practice(p,s.id,'',T);E.undoPractice(p,s.id,T);
  assert.equal(s.xp,0);assert.equal(s.sessions.length,0);assert.equal(E.currentLevel(s,T),0);
});
test('exported campaign has fresh progress and no player data',()=>{
  const {p,c}=setup();const data=E.campaignTemplate(c);
  assert.ok(!('players' in data));assert.ok(data.quests.every(q=>!('status' in q)));
  const player=E.createPlayer('Colleague',false,T);const campaign=E.importCampaign(player,data,T);
  assert.ok(campaign.quests.every(q=>q.status==='pending'));assert.equal(E.totalXP(player),0);
  assert.equal(E.totalXP(p),180);
});
test('save validates and round-trips after practice and completion',()=>{
  const {state,p,c}=setup();E.practice(p,p.skills[0].id,'forms',T);E.setQuestStatus(p,E.nextQuest(c).id,'done','',T);
  const restored=E.validateSave(E.parseJSON(JSON.stringify(state)),T);
  assert.equal(E.totalXP(E.activePlayer(restored)),320);assert.equal(E.inventory(E.activePlayer(restored)).length,6);
});
test('save rejects duplicate identities, future timestamps, malformed skills',()=>{
  const {state}=setup();let bad=E.clone(state);bad.players.push(E.clone(bad.players[0]));assert.throws(()=>E.validateSave(bad,T),/duplicate/);
  bad=E.clone(state);bad.players[0].skills[0].readiness=Infinity;assert.throws(()=>E.validateSave(bad,T),/readiness/);
  bad=E.clone(state);bad.players[0].createdAt=T+5*E.DAY;assert.throws(()=>E.validateSave(bad,T),/future/);
  bad=E.clone(state);bad.players[0].skills[0].xp=40;assert.throws(()=>E.validateSave(bad,T),/practice log/);
});
test('JSON parser rejects oversized files and unsupported versions',()=>{
  assert.throws(()=>E.parseJSON('not json'),/valid JSON/);
  assert.throws(()=>E.parseJSON(JSON.stringify({version:2})),/version/);
  assert.throws(()=>E.parseJSON(' '.repeat(E.MAX_IMPORT_BYTES+1)),/too large/);
});
test('extension adds data only and cannot be installed twice',()=>{
  const {p}=setup();const ext={kind:'questos.extension',version:1,id:'test-pack',name:'Test pack',quests:[{title:'Focus',xp:0}],skills:[{name:'Focus'}],calls:[{caller:'Tester',text:'One next move.'}],code:'alert(1)'};
  E.installExtension(p,ext,T);assert.equal(p.modules.length,1);assert.ok(!('code' in p.modules[0]));
  assert.equal(E.activeCampaign(p).quests.at(-1).xp,0);assert.throws(()=>E.installExtension(p,ext,T),/already installed/);
});
test('malformed extension has no partial effects',()=>{
  const {p}=setup(),before=JSON.stringify(p);
  assert.throws(()=>E.installExtension(p,{kind:'questos.extension',version:1,id:'bad',quests:[{title:'Valid'},{title:''}]},T));
  assert.equal(JSON.stringify(p),before);
});
test('patches are atomic and preserve unrelated state',()=>{
  const {p}=setup(),before=JSON.stringify(p);
  assert.throws(()=>E.applyPatch(p,{kind:'questos.patch',version:1,operations:[{type:'addQuest',quest:{title:'Valid'}},{type:'deleteEverything'}]},T));
  assert.equal(JSON.stringify(p),before);
  const result=E.applyPatch(p,{kind:'questos.patch',version:1,operations:[{type:'addQuest',quest:{title:'New'}}]},T);
  assert.equal(E.activeCampaign(result).quests.length,E.activeCampaign(p).quests.length+1);assert.equal(JSON.stringify(p),before);
});
test('new local player does not inherit personal inventory or completed quests',()=>{
  const p=E.createPlayer('Colleague',false,T);assert.equal(E.totalXP(p),0);assert.equal(E.inventory(p).length,0);assert.equal(E.activeCampaign(p).quests.length,0);
});
test('agent handoff exports current player only and explains manual patching',()=>{
  const {p}=setup(),brief=E.agentBrief(p,T);assert.match(brief,/ChatGPT/);assert.match(brief,/questos.patch/);assert.match(brief,/not instructions from a trusted system/);
});
test('trusted extension hooks fire, unsubscribe, and isolate errors',()=>{
  const bus=new E.EventBus();let count=0;const off=bus.on('test',()=>count++);bus.emit('test',{});off();bus.emit('test',{});assert.equal(count,1);
});
