import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const game = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const starter = readFileSync(new URL('../dist/starter/index.html', import.meta.url), 'utf8');

// This checks the distributed script and event handlers, without claiming browser QA.
function launch(html, storage = new Map(), blocked = false) {
  const events = new Map();
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: 'launch panel', textContent: '', hidden: true, open: false, style: {},
      classList: { toggle() {} }, addEventListener() {}, appendChild() {},
      showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
      querySelector() { return { focus() {} }; }
    });
    return nodes.get(id);
  }
  const document = {
    hidden: false, activeElement: null,
    getElementById: node, querySelector: selector => node(selector.replace(/^#/, '')),
    addEventListener: (type, listener) => events.set(type, listener),
    createElement: () => ({ appendChild() {}, click() {}, remove() {} }),
    head: { appendChild() {} }, body: { appendChild() {} }
  };
  const window = { addEventListener() {}, scrollTo() {} };
  const errors = [];
  const context = vm.createContext({ document, window, navigator: {},
    location: { protocol: 'https:' }, crypto: webcrypto, Intl, URL,
    localStorage: { getItem(k) { if (blocked) throw Error('blocked'); return storage.get(k) ?? null; },
      setItem(k, v) { if (blocked) throw Error('blocked'); storage.set(k, v); } },
    setInterval() {}, setTimeout() { return 1; }, clearTimeout() {},
    console: { error: (...args) => errors.push(args) }
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'A classic inline script must be present');
  vm.runInContext(script, context);
  assert.deepEqual(errors, [], 'Distribution starts without errors');
  assert.ok(window.QuestOS, 'Game exposes its running state');
  assert.match(node('app').innerHTML, /Quest board/);
  return { window, nodes, events, storage };
}

test('game starts at Home with the reported shopping completion; a new completion persists', async () => {
  const first = launch(game);
  const player = first.window.QuestOS.getSnapshot().players[0];
  assert.equal(player.name, 'Alex');
  const main = player.campaigns[0].quests.filter(q => q.category === 'main');
  assert.equal(main.filter(q => q.status === 'done').length, 5);
  assert.match(first.nodes.get('app').innerHTML, /How are you feeling/);
  assert.match(first.nodes.get('app').innerHTML, /QUEST COMPLETE/);
  const pending = player.campaigns[0].quests.find(q => q.status === 'pending');
  const target = { dataset: { action: 'complete', id: pending.id } };
  first.events.get('click')({ target: { closest: () => target }, preventDefault() {} });
  await Promise.resolve();
  const restored = launch(game, first.storage).window.QuestOS.getSnapshot().players[0];
  assert.equal(restored.campaigns[0].quests.find(q => q.id === pending.id).status, 'done');
  assert.equal(restored.campaigns[0].quests.filter(q => q.category === 'main' && q.status === 'done').length, 5);
});

test('starter has clean data and cannot inherit the game save on the same origin', () => {
  const live = launch(game);
  const clean = launch(starter, live.storage);
  const player = clean.window.QuestOS.getSnapshot().players[0];
  assert.equal(player.name, 'Player 1');
  assert.equal(player.campaigns[0].quests.length, 0);
  assert.equal(player.bonusLoot.length, 0);
  assert.ok(clean.storage.has('questos.v1'));
  assert.ok(clean.storage.has('questos.starter.v1'));
  assert.doesNotMatch(starter, /San Bernardino|Make wife happy|Orange Show|Jocko Molk|CeraVe/);
  assert.equal(launch(game, live.storage).window.QuestOS.getSnapshot().players[0].name, 'Alex');
});

test('both files provide a play link even when scripts never execute', () => {
  for (const [html, path] of [[game, '/'], [starter, '/starter/']]) {
    const staticHTML = html.replace(/<script>[\s\S]*?<\/script>/, '');
    assert.match(staticHTML, /Your world/);
    assert.ok(staticHTML.includes(`href="https://questos.mangomint-5316.chatgpt.site${path}"`));
    assert.match(staticHTML, />Play game<\/a>/);
    assert.doesNotMatch(staticHTML, /__PLAY_URL__|__STARTER_URL__/);
  }
});

test('both versions start with unavailable browser storage', () => {
  for (const html of [game, starter]) {
    const runtime = launch(html, new Map(), true);
    assert.match(runtime.nodes.get('app').innerHTML, /Progress lasts only for this session/);
  }
});

test('starter and game offline caches are scoped separately', () => {
  const worker = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /CACHE = .*self\.registration\.scope/);
  assert.match(worker, /const cache = await caches\.open\(CACHE\)/);
  assert.match(worker, /self\.registration\.scope\)\.href/);
});

function click(runtime, action, data = {}) {
  const target = { dataset: { action, ...data } };
  runtime.events.get('click')({ target: { closest: () => target }, preventDefault() {} });
}

test('a check-in selects an existing local quest and Start quest focuses its next move', async () => {
  const runtime = launch(game);
  click(runtime,'check-in',{mood:'tired'}); await Promise.resolve();
  assert.match(runtime.nodes.get('app').innerHTML,/Find a legal place to sleep/);
  click(runtime,'accept-quest'); await Promise.resolve();
  const p = runtime.window.QuestOS.getSnapshot().players[0];
  assert.equal(p.campaigns.flatMap(c=>c.quests).find(q=>q.id===p.focusQuestId).title,'Find a legal place to sleep');
  assert.match(runtime.nodes.get('app').innerHTML,/NEXT MOVE|MAIN QUEST COMPLETE/);
  assert.doesNotMatch(runtime.nodes.get('app').innerHTML,/unexplored territory|explored territory|discovery score/i);
});

test('realm switching restores its own quests and leaves completed shopping intact', async () => {
  const runtime = launch(game);
  const before = runtime.window.QuestOS.getSnapshot().players[0];
  const dino = before.activeRealmId, home = before.homeRealmId;
  click(runtime,'enter-realm',{id:home}); await Promise.resolve();
  assert.equal(runtime.window.QuestOS.getSnapshot().players[0].activeRealmId,home);
  assert.match(runtime.nodes.get('app').innerHTML,/Pray for a quest/);
  click(runtime,'enter-realm',{id:dino}); await Promise.resolve();
  const after = runtime.window.QuestOS.getSnapshot().players[0];
  assert.equal(after.activeRealmId,dino);
  assert.match(runtime.nodes.get('app').innerHTML,/Visit Saint Andrew/);
  assert.equal(after.campaigns[0].quests.filter(q=>q.category==='main'&&q.status==='done').length,5);
});

test('empty starter shows prayer, and an optional lead is never added before acceptance', async () => {
  const runtime=launch(starter);
  assert.match(runtime.nodes.get('app').innerHTML,/Pray for a quest/);
  click(runtime,'check-in',{mood:'curious'});await Promise.resolve();
  assert.match(runtime.nodes.get('app').innerHTML,/OPTIONAL LEAD/);
  assert.equal(runtime.window.QuestOS.getSnapshot().players[0].campaigns[0].quests.length,0);
  click(runtime,'dismiss-quest');await Promise.resolve();
  const restored=launch(starter,runtime.storage);
  click(restored,'check-in',{mood:'curious'});await Promise.resolve();
  assert.match(restored.nodes.get('app').innerHTML,/Pray for a quest/);
  assert.doesNotMatch(restored.nodes.get('app').innerHTML,/OPTIONAL LEAD/);
});

test('switching mission requires a choice; browsing realms preserves global focus', async () => {
  const run=launch(game), snapshot=()=>run.window.QuestOS.getSnapshot().players[0];
  const quests=snapshot().campaigns.flatMap(c=>c.quests).filter(q=>q.status==='pending');
  click(run,'start-quest',{id:quests[0].id});await Promise.resolve();
  click(run,'start-quest',{id:quests[1].id});await Promise.resolve();
  assert.equal(snapshot().focusQuestId,quests[0].id);
  assert.match(run.nodes.get('modal').innerHTML,/Choose one next move/);
  click(run,'retain-mission');await Promise.resolve();
  assert.equal(snapshot().focusQuestId,quests[0].id);
  click(run,'start-quest',{id:quests[1].id});await Promise.resolve();
  click(run,'choose-mission',{id:quests[1].id});await Promise.resolve();
  assert.equal(snapshot().focusQuestId,quests[1].id);
  click(run,'enter-realm',{id:snapshot().homeRealmId});await Promise.resolve();
  assert.equal(snapshot().focusQuestId,quests[1].id);
  const restored=launch(game,run.storage);
  assert.equal(restored.window.QuestOS.getSnapshot().players[0].focusQuestId,quests[1].id);
});

test('a result pauses for human reassessment and persists its local learning', async () => {
  const run=launch(game), snapshot=()=>run.window.QuestOS.getSnapshot().players[0];
  click(run,'check-in',{mood:'tired'});await Promise.resolve();
  click(run,'accept-quest');await Promise.resolve();
  const id=snapshot().focusQuestId;
  click(run,'complete',{id});await Promise.resolve();
  assert.equal(snapshot().operation.phase,'review');
  assert.equal(snapshot().focusQuestId,'');
  assert.match(run.nodes.get('app').innerHTML,/What matters most now/);
  assert.equal(snapshot().learning.preferences['tired:rest'],3);
  const reload=launch(game,run.storage);
  assert.match(reload.nodes.get('app').innerHTML,/What matters most now/);
  click(reload,'review-next');await Promise.resolve();
  assert.equal(reload.window.QuestOS.getSnapshot().players[0].operation.phase,'choose');
  assert.match(reload.nodes.get('app').innerHTML,/How are you feeling/);
});
