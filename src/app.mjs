import { nikoGuidance, sidekickContext, addSidekickSnippet } from './sidekick/model.mjs';
import { createDocumentSidekickRepository } from './sidekick/repository.mjs';
import { VERSION, DAY, MAX_IMPORT_BYTES, uid, clone, clamp, clean, must, dayKey, newSkill, makeQuest, makeCampaign, createPlayer, createState, activePlayer, activeCampaign, readinessAt, potentialLevel, currentLevel, totalXP, rankForXP, progress, nextQuest, inventory, record, setQuestStatus, practice, undoPractice, pauseSkill, campaignTemplate, importCampaign, parseJSON, validateSave, validateExtension, installExtension, applyPatch, agentBrief, operatorMessage, EventBus, activeRealm, realmCampaigns, realmQuests, enterRealm, addRealm, rememberQuest, focusQuest, checkIn, acceptSuggestion, dismissSuggestion, applyReportedUpdate } from './engine.mjs';
import { currentMission, proposeMission, chooseMission, retainMission, reportMission, finishReview, setAsideMission } from './systems/prioritize.mjs';
import { learnFromOutcome, learnedFit } from './systems/learning.mjs';
import { icon } from './ui/icons.mjs';

const KEY = 'questos.v1';
const BACKUP_KEY = 'questos.v1.backup';
const STARTER_URL = '__STARTER_URL__';
const bus = new EventBus();
const sidekickRepository=createDocumentSidekickRepository(()=>clone(state),doc=>{state=doc;saveState();});
let state, storageStatus = 'local', recoveryRaw = '', recoveryMessage = '', lastSavedRaw = '';
let feeling = '', questOffer = null;
let tab = 'home', toastTimer, currentCall = null, previewData = null, previewOrigin = '', previousFocus = null;
const modal = document.getElementById('modal');
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signal = (active = false) => `<div class="signal ${active ? 'active' : ''}" aria-hidden="true">${[10,22,16,33,25,12,28,18,8].map((h,i) => `<i style="--h:${h}px;--d:${i * .11}s"></i>`).join('')}</div>`;
const p = () => activePlayer(state);
const c = () => activeCampaign(p());
const r = () => activeRealm(p());
const questById = id => p().campaigns.flatMap(d => d.quests).find(q => q.id === id);
const fmtTime = value => new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }).format(value);
const skillIcon = skill => /strength/i.test(skill.name) ? 'strength' : /field/i.test(skill.name) ? 'compass' : 'skill';

function loadState() {
  let raw = '';
  try {
    raw = localStorage.getItem(KEY) || '';
    if (raw) { state = validateSave(parseJSON(raw)); lastSavedRaw = raw; }
    else { state = createState(); localStorage.setItem(KEY, JSON.stringify(state)); lastSavedRaw = JSON.stringify(state); }
  } catch (error) {
    if (raw) {
      recoveryRaw = raw;
      try {
        const backup = localStorage.getItem(BACKUP_KEY);
        if (backup) { state = validateSave(parseJSON(backup)); recoveryMessage = 'The latest save was unreadable. A backup is loaded. Export your recovery data before saving again.'; }
      } catch {}
      state ||= createState(); storageStatus = 'recovery';
      recoveryMessage ||= 'A saved game could not be read. It has not been overwritten. Export recovery data or import a valid save.';
    } else { state = createState(); storageStatus = 'session'; }
  }
  state.players.forEach(player => applyReportedUpdate(player));
  if (raw && storageStatus !== 'recovery') saveState();
}
function saveState() {
  if (storageStatus === 'recovery') return false;
  try {
    const raw = JSON.stringify(state);
    if (lastSavedRaw) localStorage.setItem(BACKUP_KEY, lastSavedRaw);
    localStorage.setItem(KEY, raw); lastSavedRaw = raw; storageStatus = 'local'; return true;
  } catch { storageStatus = 'session'; return false; }
}
function commit(message = '', event = 'state:changed') {
  const saved = saveState(); render(); bus.emit(event, { player: clone(p()), at: Date.now() });
  if (message) toast(`${message}${saved ? '' : ' - session only; export a save.'}`);
}
function messageSource(source='system',name='') {
  const label=source==='niko'?'NIKO / YOUR SIDEKICK':source==='dispatch'?`${name} / GAME DISPATCH`:'QUESTOS / SYSTEM';
  return `<span class="message-source source-${source}">${icon(source==='niko'?'companion':source==='dispatch'?'phone':'system',14)}<span>${esc(label)}</span></span>`;
}
function toast(message, error = false) {
  const element = $('#toast'); element.innerHTML = `${messageSource()}<span class="system-message">${esc(message)}</span>`; element.classList.toggle('error', error); element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, error ? 6500 : 3800);
}
function showModal(title, body, foot = '', source = 'system', sender = '') {
  const wasOpen = modal.open;
  if (!wasOpen) previousFocus = document.activeElement;
  modal.innerHTML = `<div class="dialog-head"><div>${messageSource(source,sender)}<h2 id="dialog-title">${esc(title)}</h2></div><button class="icon-btn" data-action="close" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${body}</div>${foot ? `<div class="dialog-foot">${foot}</div>` : ''}`;
  if (!wasOpen) modal.showModal();
  else modal.querySelector('button, input, textarea')?.focus();
}
function closeModal() { modal.close(); window.speechSynthesis?.cancel(); previousFocus?.focus?.(); }
function download(name, content, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function copyText(text, message = 'Copied.') {
  try { await navigator.clipboard.writeText(text); toast(message); }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.left = '-9999px';
    const parent = modal.open ? modal : document.body; parent.appendChild(area); area.select();
    let copied = false; try { copied = document.execCommand('copy'); } catch {} area.remove();
    if (copied) toast(message); else toast('Copy is blocked here. Select and copy the text in the box.', true);
  }
}
function header() {
  return `<header class="topbar"><div class="top-inner"><div class="brand"><span class="brand-mark">${icon('compass',32)}</span><div><div class="wordmark">QUEST<span>/</span>OS</div><div class="brand-sub">ORBITAL COMMAND / FIELD OPERATIONS</div></div></div><nav class="top-nav" aria-label="Main navigation">${[['home','Home'],['realms','Realms'],['board','Quest board'],['skills','Skills'],['inventory','Inventory'],['workshop','Workshop']].map(([id,label]) => `<button class="nav-button ${tab===id?'active':''}" data-action="tab" data-tab="${id}" ${tab===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav><button class="profile-button" data-action="profiles" aria-label="Switch player"><span class="avatar">${esc(p().name.slice(0,2).toUpperCase())}</span><span>${esc(p().name)}</span><span class="muted">&#9662;</span></button></div></header>`;
}
function utility() {
  return `<div class="utility-row"><div class="command-location"><div class="dungeon-picker"><span class="eyebrow">REALM</span><select id="realm-picker" aria-label="Current realm">${p().realms.map(realm => `<option value="${esc(realm.id)}" ${realm.id === r().id ? 'selected' : ''}>${esc(realm.name)}</option>`).join('')}</select><button class="icon-btn" data-action="new-realm" aria-label="Enter a new realm">${icon('plus',14)}</button></div><div class="dungeon-picker"><span class="eyebrow">DUNGEON</span><select id="campaign-picker" aria-label="Active dungeon">${realmCampaigns(p()).map(d => `<option value="${esc(d.id)}" ${d.id === c().id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><button class="icon-btn" data-action="new-campaign" aria-label="Create dungeon">${icon('plus',14)}</button></div></div><div class="utility-actions"><span class="fine saved-text"><span class="status-dot" style="${storageStatus === 'local' ? '' : 'background:var(--amber)'}"></span>${storageStatus === 'local' ? 'LOCAL SAVE' : 'EXPORT TO SAVE'}</span><button class="text-button" data-action="driving">${icon('shield',12)} Driving mode</button></div></div>${storageStatus === 'local' ? '' : `<div class="warning">${esc(recoveryMessage || 'Browser storage is unavailable. Progress lasts only for this session. Export a save before closing.')} <button class="text-button" data-action="${storageStatus === 'recovery' ? 'recovery' : 'export-save'}">${storageStatus === 'recovery' ? 'Recovery options' : 'Export save'}</button></div>`}`;
}
function sidekickPanel(quest=null) {
  return `<aside class="sidekick-panel"><div class="sidekick-avatar" aria-hidden="true">${icon('companion',23)}</div><div>${messageSource('niko')}<p class="companion-message">${esc(nikoGuidance(p(),quest))}</p></div><button class="text-button" data-action="sidekick-memory">Memory</button></aside>`;
}
function sidekickMemoryDialog() {
  const m=p().sidekick;
  showModal('Niko / memory',`<div class="companion-quote">${messageSource('niko')}<p class="companion-message">I learn from your choices and results. Tell me what helps you finish.</p></div><form id="sidekick-note-form"><div class="field"><label for="sidekick-note">One thing to remember</label><textarea id="sidekick-note" name="note" maxlength="600" required placeholder="Short quests work better when I am tired."></textarea></div></form>${m.snippets.length?`<h3>What you told me</h3>${m.snippets.map(n=>`<p class="fine">${esc(n.text)}</p>`).join('')}`:''}<p class="fine">${m.reviews.length} recent quest outcomes remembered. Memory stays in this browser and in exported saves. Guidance uses local rules. Notes are saved for your ChatGPT handoff.</p>`,`<button class="text-button" data-action="reset-sidekick">Reset memory</button><button class="btn secondary" data-action="close">Close</button><button class="btn primary" type="submit" form="sidekick-note-form">Remember</button>`);
}
function missionStrip() {
  const q=currentMission(p());
  return q ? `<section class="mission-strip"><div><div class="eyebrow">YOUR ONE MISSION</div><strong>${esc(q.title)}</strong></div><div class="button-row"><button class="btn primary small" data-action="resume-mission">Resume ${icon('arrow',13)}</button><button class="text-button" data-action="set-aside">Set aside</button></div></section>` : '';
}
function requestMission(id, ask = false) {
  const {current,candidate}=proposeMission(p(),id);
  if (!ask && (!current || current.id===id)) { activateMission(id); return; }
  commit();
  showModal('Choose one next move',`${current ? `<div class="eyebrow">CURRENT MISSION</div><h3>${esc(current.title)}</h3>` : '<p class="fine">A new quest is on your board.</p>'}<div class="decision-option"><div class="eyebrow green">NEW QUEST</div><h3>${esc(candidate.title)}</h3><p class="fine">${esc(candidate.nextMove || 'One real action. Then report back.')}</p></div>`,`<button class="btn secondary" data-action="retain-mission">${current ? 'Stay on current mission' : 'Leave on board'}</button><button class="btn primary" data-action="choose-mission" data-id="${esc(id)}">${current ? 'Switch to this quest' : 'Take this quest'}</button>`);
}
function activateMission(id) {
  const previous=currentMission(p());
  chooseMission(p(),id);
  if(previous?.id!==id) learnFromOutcome(p(),questById(id),'accepted');
  questOffer=null;tab='board';if(modal.open)closeModal();commit('One mission. One next move.');
}
function outcomeReview(q,outcome) {
  learnFromOutcome(p(),q,outcome);reportMission(p(),q.id);feeling='';questOffer=null;tab='home';
}
function homePage() {
  if (p().operation.phase === 'review') {
    const q=questById(p().operation.lastQuestId), current=currentMission(p());
    return `<section class="panel review-panel"><div class="panel-body">${messageSource()}<div class="eyebrow green">${q?.status==='done' ? 'MISSION COMPLETE' : q?.status==='pending' ? 'QUEST SET ASIDE' : 'DEAD END CLOSED'}</div><h2>${esc(q?.title || 'Report received.')}</h2><p class="next-copy">Take a breath. What matters most now?</p>${current ? `<p class="fine">Your current mission: ${esc(current.title)}</p>` : ''}<div class="button-row">${current ? '<button class="btn primary" data-action="resume-mission">Return to current mission</button>' : ''}<button class="btn ${current ? 'secondary' : 'primary'}" data-action="review-next">Pick the next quest</button><button class="text-button" data-action="stand-down">Stand down</button></div></div></section>`;
  }
  const open = realmQuests(p()).filter(q => q.status === 'pending');
  const cleared = realmCampaigns(p()).find(d => progress(d).complete);
  const candidate = questOffer?.kind === 'existing' ? questById(questOffer.questId) : questOffer?.quest;
  const hasOffer = questOffer?.realmId === r().id && candidate && (questOffer.kind !== 'existing' || candidate.status === 'pending');
  return `<section class="checkin-hero">${messageSource()}<div class="eyebrow green">${icon('pin',12)} ${esc(r().name.toUpperCase())} / ${r().home ? 'HOME REALM' : 'FIELD OPERATIONS'}</div><h1>How are you feeling?</h1><p class="hero-description">Let's pick one quest for you.</p><div class="mood-grid" aria-label="How are you feeling?">${[['ready','Ready','A mission to get done.','shield'],['curious','Curious','Something worth noticing.','compass'],['quiet','Quiet','A little room to breathe.','clock'],['tired','Low energy','Keep the next move small.','phone']].map(([id,label,copy,mark]) => `<button class="mood-button ${feeling === id ? 'selected' : ''}" data-action="check-in" data-mood="${id}" aria-pressed="${feeling === id}">${icon(mark,23)}<strong>${label}</strong><span>${copy}</span></button>`).join('')}</div></section>
  ${cleared ? `<div class="mission-cleared">${icon('check',17)}<span><strong>QUESTOS / QUEST COMPLETE</strong> ${esc(cleared.subtitle || cleared.name)}</span></div>` : ''}
  <section class="panel home-mission"><div class="panel-body">${hasOffer ? `<div class="eyebrow green">${questOffer.kind === 'existing' ? 'ONE NEXT MOVE' : 'OPTIONAL LEAD'}</div><h2>${esc(candidate.title)}</h2><p class="next-copy">${esc(candidate.nextMove || 'One real action. Then report back.')}</p><div class="button-row"><button class="btn primary" data-action="accept-quest">${questOffer.kind === 'existing' ? 'Start quest' : 'Accept quest'} ${icon('arrow',15)}</button><button class="btn secondary" data-action="dismiss-quest">Not now</button></div>` : !open.length || feeling ? `<div class="eyebrow">NO ${open.length ? 'FITTING ' : ''}QUEST RIGHT NOW</div><h2>Pray for a quest.</h2><p class="next-copy">There is no need to fill the silence.</p><div class="button-row"><button class="btn secondary" data-action="tab" data-tab="realms">Return to a realm</button><button class="text-button" data-action="new-quest">Add your own quest</button></div>` : `<div class="eyebrow">${open.length} OPEN QUEST${open.length === 1 ? '' : 'S'} / ${esc(r().name)}</div><h2>One move at a time.</h2><p class="next-copy">Choose how you feel, or return to an open quest.</p><button class="btn secondary" data-action="tab" data-tab="realms">Open realm ${icon('arrow',15)}</button>`}</div></section>
  <div class="home-footer"><span class="fine">${esc(r().location || r().name)}</span><button class="text-button" data-action="tab" data-tab="realms">Your realms ${icon('arrow',13)}</button></div>`;
}
function realmsPage() {
  return `<div class="page-heading"><div><div class="eyebrow green">RETURN WHEN YOU ARE READY</div><h1>Your realms.</h1><p>Each realm keeps its dungeons and unfinished quests.</p></div><button class="btn primary small" data-action="new-realm">${icon('plus',14)} New realm</button></div>
  <div class="realm-grid">${p().realms.map(realm => { const dungeons = realmCampaigns(p(),realm.id); const count = realmQuests(p(),realm.id).filter(q => q.status === 'pending').length; return `<section class="panel realm-card ${realm.id === r().id ? 'active' : ''}"><div class="panel-body"><div class="realm-heading"><span class="badge ${realm.id === r().id ? 'cyan' : 'neutral'}">${realm.id === r().id ? 'CURRENT' : realm.home ? 'HOME' : 'REALM'}</span><button class="icon-btn" data-action="edit-realm" data-id="${esc(realm.id)}" aria-label="Edit ${esc(realm.name)}">${icon('edit',13)}</button></div><h2>${esc(realm.name)}</h2><p class="fine">${esc(realm.location || (realm.home ? 'Your home base' : 'Your own place'))}</p><div class="realm-count"><strong>${count}</strong><span>OPEN QUEST${count === 1 ? '' : 'S'} / ${dungeons.length} DUNGEON${dungeons.length === 1 ? '' : 'S'}</span></div><button class="btn secondary small" data-action="enter-realm" data-id="${esc(realm.id)}">${realm.id === r().id ? 'View quests' : 'Return to realm'} ${icon('arrow',14)}</button></div></section>`; }).join('')}</div>
  <section class="panel realm-missions"><div class="panel-head"><h2>${esc(r().name)} / Dungeons</h2><button class="text-button" data-action="new-campaign">+ New dungeon</button></div><div class="panel-body">${realmCampaigns(p()).map(d => { const pending = d.quests.filter(q => q.status === 'pending'); const done = progress(d).complete; return `<section class="dungeon-summary"><div class="dungeon-heading"><div><h3>${esc(d.name)}</h3><p class="fine">${done ? 'MAIN QUEST COMPLETE: ' : ''}${esc(d.subtitle)}</p></div><button class="btn secondary small" data-action="open-dungeon" data-id="${esc(d.id)}">Open dungeon</button></div>${pending.length ? pending.map(q => `<div class="realm-quest"><div><strong>${esc(q.title)}</strong><p class="fine">${esc(q.nextMove || 'One real action, then report back.')}</p></div><button class="btn primary small" data-action="start-quest" data-id="${esc(q.id)}">Start quest</button></div>`).join('') : `<p class="fine realm-empty">Pray for a quest.</p>`}</section>`; }).join('')}</div></section>`;
}
function realmForm(id = '') {
  const realm = id ? p().realms.find(x => x.id === id) : null;
  if (id) must(realm, 'Realm not found.');
  showModal(id ? 'Realm settings' : 'Enter a new realm', `<form id="realm-form" data-id="${esc(id)}"><div class="field"><label for="realm-name">Realm name</label><input id="realm-name" name="name" required maxlength="100" value="${esc(realm?.name || '')}" placeholder="Your city, country, or home base"></div><div class="field"><label for="realm-location">Place (optional)</label><input id="realm-location" name="location" maxlength="240" value="${esc(realm?.location || '')}" placeholder="A name you will recognize when you return"></div><label class="toggle-line"><input name="home" type="checkbox" ${realm?.home ? 'checked' : ''}> This is my home realm</label></form>`, `<button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" type="submit" form="realm-form">${id ? 'Save realm' : 'Enter realm'}</button>`);
}
function footer() {
  return `<footer class="footer"><span>QUEST/OS v0.3.1 &nbsp; / &nbsp; LOCAL PROGRESS</span><div class="footer-actions"><button class="text-button" data-action="export-save">Export save</button><button class="text-button" data-action="about">How it works</button></div></footer>`;
}
function questRow(q) {
  return `<div class="quest-row ${q.status==='done'?'done':q.status==='impossible'?'closed':''}" data-quest="${esc(q.id)}"><button class="quest-check ${q.status==='done'?'done':q.status==='impossible'?'closed':''}" data-action="${q.status==='impossible'?'detail':q.status==='done'?'undo-quest':'complete'}" data-id="${esc(q.id)}" aria-label="${q.status==='done'?'Undo completion: ':q.status==='impossible'?'View closed objective: ':'Complete objective: '}${esc(q.title)}">${q.status==='done'?icon('check',15):q.status==='impossible'?'&ndash;':''}</button><div class="quest-main"><button class="quest-title" data-action="detail" data-id="${esc(q.id)}">${esc(q.title)}</button><div class="quest-sub">${q.status==='done'?'SECURED':q.status==='impossible'?'CLOSED / NO PENALTY':q.category==='main'?'MAIN OBJECTIVE':'SIDE QUEST'}</div></div>${q.status==='impossible'?'':`<span class="xp">+${q.xp} XP</span>`}</div>`;
}
function board() {
  const pr = progress(c()); const next = nextQuest(c(), p().focusQuestId); const xp = totalXP(p()); const rank = rankForXP(xp);
  const main = c().quests.filter(q => q.category==='main'); const side = c().quests.filter(q => q.category!=='main');
  return `<section class="hero"><div><div class="eyebrow green">REAL-WORLD CAMPAIGN <span class="version-tag">// ${esc(c().name.toUpperCase())}</span></div><h1>${esc(c().subtitle || c().name)}</h1><p class="hero-description">${pr.complete?'Main quest complete. Choose your next real-world objective.':'One move at a time. Real objectives. Actual loot.'}</p></div><div class="hero-metrics"><div><div class="metric-value">${pr.done}<span> / ${pr.total}</span></div><div class="stat-label">MAIN OBJECTIVES SECURED</div><div class="segments">${Array.from({length:Math.min(pr.total,20)},(_,i)=>`<span class="segment ${i<pr.done?'done':''}"></span>`).join('')}</div></div><div><div class="metric-value">${xp}<span> XP</span></div><div class="stat-label">FIELD RANK ${String(rank).padStart(2,'0')} / LIFETIME RECORD</div><div class="segments"><span class="segment done" style="max-width:${Math.min(100,((xp-(rank-1)**2*100)/((rank**2-(rank-1)**2)*100))*100)}%"></span><span class="segment"></span></div></div></div></section>
<div class="board-grid"><div class="column"><section class="panel next-panel"><div class="panel-body"><div class="next-label"><span class="badge">${pr.complete?'MAIN QUEST COMPLETE':'NEXT MOVE'}</span><span class="eyebrow">${next?`+${next.xp} XP`:'BOARD CLEAR'}</span></div>${next?`<h2>${esc(next.title)}</h2><p class="next-copy">${esc(next.nextMove || 'Complete this objective in the real world. Then report the result.')}</p>${next.destination?`<div class="location-line">${icon('pin',15)}<div>${esc(next.destination)}<br><span class="amber">Location from handoff. Stock and hours not verified.</span></div></div>`:''}<div class="button-row"><button class="btn primary" data-action="complete" data-id="${esc(next.id)}">${icon('check',17)} ${next.loot?'Loot acquired':'Objective complete'}</button><button class="btn secondary" data-action="detail" data-id="${esc(next.id)}">Inspect ${icon('arrow',15)}</button></div>`:`<h2>${main.length?'Dungeon cleared.':'A blank map awaits.'}</h2><p class="next-copy">${main.length?'Your completed objectives stay in your record. Start another dungeon, or add the next mission.':'Add a real-world objective. Give it a name, a next move, and a reward.'}</p><button class="btn primary" data-action="new-quest">${icon('plus')} Add an objective</button>`}</div></section>
<section class="panel"><div class="panel-head"><h2>Main objectives</h2><button class="text-button" data-action="new-quest">+ Add objective</button></div>${main.length?`<div class="quest-list">${main.map(questRow).join('')}</div>`:'<div class="empty"><p>No objectives yet.</p></div>'}<div class="note-strip">${icon('shield',12)} Closed as impossible? No penalty. Reopen an objective at any time.</div></section>
<section class="panel"><div class="panel-head"><h2>Side quests</h2><span class="eyebrow">${side.filter(q=>q.status==='pending').length} OPEN</span></div>${side.length?`<div class="quest-list">${side.map(questRow).join('')}</div>`:'<div class="empty"><p>No side quests. Keep the mission focused.</p></div>'}</section></div>
<aside class="column"><section class="panel"><div class="panel-head"><h2>Skill readiness</h2><span class="badge cyan">LIVE DECAY</span></div><div class="panel-body" style="padding-top:7px;padding-bottom:7px">${p().skills.slice(0,4).map(s=>`<div class="compact-skill"><div class="skill-icon">${icon(skillIcon(s),18)}</div><div class="grow"><h3>${esc(s.name)}</h3><div class="fine">${s.xp?`${Math.round(readinessAt(s))}% ready${s.paused?' / recovery mode':''}`:'No practice logged'}</div></div><span class="skill-level">${s.xp?`L${currentLevel(s)}`:'--'}</span></div>`).join('')}</div><div class="note-strip">Practice builds potential. Inactivity lowers your current level. <button class="text-button" data-action="tab" data-tab="skills">Open skills &rarr;</button></div></section>
<section class="panel operator-card"><div class="panel-head"><h2>The operator</h2><span class="eyebrow">OPTIONAL MODULE</span></div><div class="panel-body"><div class="operator-display">${signal()}<div><div class="operator-title">STANDING BY</div><div class="operator-sub">Simulated in-game call</div></div></div><p class="fine" style="margin-bottom:18px">A voice on the line. One next move. No real phone calls, no background tracking.</p><button class="btn secondary wide" data-action="call">${icon('phone',16)} Receive a transmission</button></div></section>
<section class="panel"><div class="panel-head"><h2>Inventory</h2><span class="eyebrow">${inventory(p()).length} ITEMS</span></div><div class="panel-body"><div class="fine">${inventory(p()).slice(0,6).map(i=>`<div style="padding:6px 0;display:flex;gap:10px">${icon('box',14)} ${esc(i.name)}</div>`).join('') || 'No loot yet.'}</div></div></section></aside></div>`;
}
function skillsPage() {
  return `<div class="page-heading"><div><div class="eyebrow green">CHARACTER SYSTEM</div><h1>Use it. Keep it.</h1><p>Current levels fall with inactivity. Your lifetime practice record stays.</p></div><button class="btn secondary small" data-action="new-skill">${icon('plus',15)} Add skill</button></div>
<div class="skill-grid">${p().skills.map(s=>`<section class="panel skill-card"><div class="panel-body"><div class="skill-top"><div class="skill-icon">${icon(skillIcon(s),23)}</div><div><h3>${esc(s.name)}</h3><div class="fine">${s.paused?'RECOVERY MODE':s.xp?`${s.sessions.length} practice sessions`:'START UNRATED'}</div></div></div><div class="skill-stats"><div><strong class="green-text">${s.xp?currentLevel(s):'--'}</strong><span>CURRENT LEVEL</span></div><div><strong class="muted">${s.xp?potentialLevel(s):'--'}</strong><span>POTENTIAL LEVEL</span></div></div><div class="progress-area"><div class="fine">${Math.round(readinessAt(s))}% readiness <span style="float:right">${s.xp} XP</span></div><div class="meter"><div class="meter-fill ${s.paused?'cyan':''}" style="width:${readinessAt(s)}%"></div></div></div><div class="button-row skill-foot"><button class="btn primary small" data-action="practice" data-id="${esc(s.id)}" ${s.paused?'disabled':''}>${icon('plus',14)} Log practice</button><button class="btn secondary small" data-action="pause-skill" data-id="${esc(s.id)}">${s.paused?'Resume':'Recovery'}</button><button class="icon-btn" data-action="skill-detail" data-id="${esc(s.id)}" aria-label="Settings and history for ${esc(s.name)}">${icon('edit',14)}</button></div></div></section>`).join('')}</div>
<section class="panel simulator"><div class="panel-head"><h2>What happens after a break?</h2><span class="badge cyan">SIMULATOR / NO SAVE CHANGES</span></div><div class="panel-body simulator-grid"><div><p class="muted" style="font-size:13px">Example: a level 8 skill at full readiness. Take a break, then add a few return sessions.</p><div class="field" style="margin-top:20px"><label for="break-days">Days away: <strong id="break-value">60</strong></label><input id="break-days" class="range-input" type="range" min="0" max="120" value="60"></div><div class="field"><label for="return-sessions">Return sessions: <strong id="return-value">0</strong></label><input id="return-sessions" class="range-input" type="range" min="0" max="4" value="0"></div></div><div><div class="simulation-values"><div><div class="simulation-value">8</div><div class="eyebrow">BEFORE BREAK</div></div><span class="muted">&rarr;</span><div><div class="simulation-value" id="sim-level">2</div><div class="eyebrow">CURRENT LEVEL</div></div></div><div class="meter"><div class="meter-fill cyan" id="sim-bar"></div></div><p class="fine" style="margin-top:16px" id="sim-description"></p></div></div><div class="note-strip">These are adjustable game mechanics, not a measurement of fitness or a prediction of recovery. Rest earns no penalty. No reward for extra same-day sessions.</div></section>`;
}
function inventoryPage() {
  const items = inventory(p());
  return `<div class="page-heading"><div><div class="eyebrow green">QUARTERMASTER</div><h1>Your inventory.</h1><p>${items.length} items secured across your dungeons. Nothing added until you confirm it.</p></div><button class="btn secondary small" data-action="add-loot">${icon('plus',15)} Add loot</button></div><div class="loot-grid">${items.map(i=>`<section class="panel loot-card">${icon('box',26)}<div><h3>${esc(i.name)}</h3><div class="fine" style="margin-top:6px">${esc(i.source.toUpperCase())}</div></div></section>`).join('') || '<div class="empty full-span"><h3>Empty pack.</h3><p>Complete an objective with loot, or add an item you already have.</p></div>'}</div><section class="panel" style="margin-top:24px"><div class="panel-head"><h2>Field log</h2><span class="eyebrow">LATEST 30 EVENTS</span></div><div class="panel-body">${p().events.slice(0,30).map(e=>`<div class="timeline-entry"><div class="timeline-time">${esc(fmtTime(e.at))}</div><div class="timeline-text">${esc(e.text)}</div></div>`).join('') || '<p class="fine">The current handoff is loaded. New actions will appear here.</p>'}</div></section>`;
}
function workshopPage() {
  return `<div class="page-heading"><div><div class="eyebrow green">BUILD YOUR OWN GAME</div><h1>The workshop.</h1><p>New dungeons. New rules. Same engine.</p></div></div><div class="workshop-grid">
<section class="panel"><div class="panel-head"><h2>ChatGPT bridge</h2><span class="badge">COPY / PASTE</span></div><div class="panel-body">${icon('terminal',27)}<p>Send the current game state to ChatGPT. Ask for a quest or an extension, then review and import its JSON reply. This bridge is manual, not a connected ChatGPT app.</p><div class="button-row"><button class="btn primary small" data-action="agent-brief">Copy agent handoff</button><button class="btn secondary small" data-action="import-dialog">Import a reply</button></div></div></section>
<section class="panel"><div class="panel-head"><h2>Reusable campaigns</h2><span class="eyebrow">${p().campaigns.length} DUNGEONS</span></div><div class="panel-body">${icon('compass',27)}<p>Start a clean dungeon or share the current one as a template. Templates contain objectives, not your XP, practice history, or completion state.</p><div class="button-row"><button class="btn primary small" data-action="new-campaign">New dungeon</button><button class="btn secondary small" data-action="share-campaign">Export template</button></div></div></section>
<section class="panel"><div class="panel-head"><h2>Extension modules</h2><button class="text-button" data-action="import-dialog">+ Install JSON</button></div><div class="panel-body"><div class="module-line"><div><h3>Skill decay</h3><div class="fine">Readiness, potential, recovery mode</div></div><span class="badge">CORE</span></div><div class="module-line"><div><h3>Operator transmissions</h3><div class="fine">Manual or opt-in foreground calls</div></div><span class="badge cyan">READY</span></div>${p().modules.map(m=>`<div class="module-line"><div><h3>${esc(m.name)}</h3><div class="fine">${esc(m.description)}</div></div><span class="badge">ADDED</span></div>`).join('')}<div class="button-row" style="margin-top:19px"><button class="btn secondary small" data-action="extension-example">Try an example module</button></div><p class="fine" style="margin:15px 0 0">Imports are data only: quests, skills, and call scripts. No downloaded code executes.</p></div></section>
<section class="panel"><div class="panel-head"><h2>Operator settings</h2><span class="eyebrow">FICTIONAL CALLS</span></div><div class="panel-body"><label class="toggle-line"><input id="auto-calls" type="checkbox" ${p().settings.autoCalls?'checked':''}> Allow calls while this game is open</label><div class="form-grid" style="margin-top:20px"><div class="field"><label for="call-interval">Minimum interval</label><select id="call-interval">${[5,10,20,30,60,120].map(n=>`<option value="${n}" ${n===p().settings.callIntervalMinutes?'selected':''}>${n} minutes</option>`).join('')}</select></div><div class="field"><label for="call-sound">Audio</label><select id="call-sound"><option value="off" ${!p().settings.sound?'selected':''}>Text only</option><option value="on" ${p().settings.sound?'selected':''}>Voice after answering</option></select></div></div><p class="fine" style="margin:8px 0 0">No calls when the tab is hidden or driving mode is on. No actual phone access. Automatic calls appear silently; audio needs an answer tap.</p></div></section>
<section class="panel"><div class="panel-head"><h2>Save and restore</h2><span class="badge neutral">THIS BROWSER ONLY</span></div><div class="panel-body"><p style="margin-top:0">Progress autosaves here when browser storage is available. Clearing browser data can erase it. Export a backup for another device.</p><div class="button-row"><button class="btn primary small" data-action="export-save">Export full save</button><button class="btn secondary small" data-action="pick-file">Import file</button></div><p class="fine" style="margin-bottom:0">A full save includes every local profile. Do not share it as a campaign template.</p></div></section>
<section class="panel"><div class="panel-head"><h2>Play with colleagues</h2><span class="eyebrow">INDEPENDENT PROGRESS</span></div><div class="panel-body"><p style="margin-top:0">The clean starter opens a fresh game with its own saves. Each browser keeps independent progress. Site sharing controls who can open the link.</p><div class="button-row"><button class="btn primary small" data-action="copy-starter-link">Copy starter link</button><a class="btn secondary small" href="${STARTER_URL}" target="_blank" rel="noopener">Open starter</a><button class="btn secondary small" data-action="profiles">Manage local players</button></div></div></section>
</div>`;
}
function render() {
  $('#app').innerHTML = `${header()}<main class="layout">${utility()}${sidekickPanel(currentMission(p()) || (questOffer?.kind==='existing'?questById(questOffer.questId):questOffer?.quest))}${missionStrip()}${tab==='home'?homePage():tab==='realms'?realmsPage():tab==='skills'?skillsPage():tab==='inventory'?inventoryPage():tab==='workshop'?workshopPage():board()}${footer()}</main>`;
  const driving = p().settings.driving;
  $('#drive-screen').hidden = !driving;
  $('#app').inert = driving;
  if (tab==='skills') updateSimulation();
}
function updateSimulation() {
  const days = Number($('#break-days')?.value || 0); const sessions = Number($('#return-sessions')?.value || 0);
  const ready = clamp(100 * 2 ** (-Math.max(0,days-3)/28) + sessions*25,0,100);
  $('#break-value').textContent=days; $('#return-value').textContent=sessions;
  $('#sim-level').textContent=Math.max(1,Math.ceil(8*ready/100)); $('#sim-bar').style.width=`${ready}%`;
  $('#sim-description').textContent=`${Math.round(ready)}% readiness. Potential stays at level 8. ${sessions?'Return sessions rebuild readiness; no extra potential is awarded in this simplified preview.':'Three grace days, then a 28-day readiness half-life.'}`;
}
function detailDialog(id) {
  const q = questById(id); must(q,'Objective not found.');
  rememberQuest(p(), id); saveState();
  showModal('Inspect objective',`<div class="button-row"><span class="badge ${q.status==='impossible'?'neutral':''}">${esc(q.category.toUpperCase())}</span><span class="fine">${q.xp} XP / ${esc(q.status.toUpperCase())}</span></div><h2 style="margin-top:19px">${esc(q.title)}</h2><p class="detail-text">${esc(q.detail || 'No additional details.')}</p>${q.blockedReason?`<div class="success-box">${esc(q.blockedReason)}</div>`:''}${q.nextMove?`<div class="eyebrow green">NEXT ACTION</div><p class="detail-text">${esc(q.nextMove)}</p>`:''}${q.destination?`<div class="warning">Destination supplied by the player. This app has not verified its address, hours, or inventory.</div><a class="btn secondary small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q.destination)}" target="_blank" rel="noopener noreferrer">${icon('pin',15)} Search map</a>`:''}`,`<button class="btn secondary small" data-action="edit-quest" data-id="${esc(q.id)}">Edit</button>${q.status==='pending'?`<button class="btn secondary small" data-action="close-quest" data-id="${esc(q.id)}">Declare impossible</button><button class="btn primary small" data-action="complete" data-id="${esc(q.id)}">${q.loot?'Loot acquired':'Complete'}</button>`:`<button class="btn secondary small" data-action="undo-quest" data-id="${esc(q.id)}">Reopen objective</button>`}`);
}
function questForm(id = '') {
  const q = id?questById(id):{};
  showModal(id?'Edit objective':'Create an objective',`<form id="quest-form" data-id="${esc(id)}"><div class="field"><label for="quest-title">Objective</label><input id="quest-title" name="title" required maxlength="160" value="${esc(q.title || '')}" placeholder="What needs to happen in the real world?"></div><div class="field"><label for="quest-next">One next move</label><input id="quest-next" name="nextMove" maxlength="400" value="${esc(q.nextMove || '')}" placeholder="A specific action, not a whole plan"></div><div class="field"><label for="quest-detail">Exact details / constraints</label><textarea id="quest-detail" name="detail" maxlength="2000" placeholder="Product, place, conditions, or what must be verified">${esc(q.detail || '')}</textarea></div><div class="form-grid"><div class="field"><label for="quest-category">Quest type</label><select id="quest-category" name="category">${['main','side','bonus'].map(v=>`<option value="${v}" ${q.category===v?'selected':''}>${v==='main'?'Main objective':v==='side'?'Side quest':'Bonus objective'}</option>`).join('')}</select></div><div class="field"><label for="quest-xp">Reward XP</label><input id="quest-xp" name="xp" type="number" min="0" max="1000" value="${q.xp??50}" required></div></div><div class="field"><label for="quest-loot">Inventory item (optional)</label><input id="quest-loot" name="loot" maxlength="160" value="${esc(q.loot || '')}" placeholder="Added only when you confirm completion"></div><div class="field"><label for="quest-destination">Map search (optional / not verified)</label><input id="quest-destination" name="destination" maxlength="240" value="${esc(q.destination || '')}"></div></form>`,`<button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" type="submit" form="quest-form">${id?'Save changes':'Create objective'}</button>`);
}
function campaignForm() {
  showModal(`New dungeon / ${r().name}`, `<form id="campaign-form"><div class="field"><label for="dungeon-name">Dungeon name</label><input id="dungeon-name" name="name" required maxlength="100" placeholder="Gift run / Sunday morning / An errand"></div><div class="field"><label for="dungeon-mission">Main quest</label><input id="dungeon-mission" name="subtitle" required maxlength="160" placeholder="What are we here to accomplish?"></div></form><p class="fine" style="margin-top:18px">Your old dungeon, inventory, and XP stay intact.</p>`,`<button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" type="submit" form="campaign-form">Create dungeon</button>`);
}
function profileDialog() {
  showModal('Local players',`<p class="fine">Separate progress on this device. Not private accounts; anyone using this browser can switch profiles.</p>${state.players.map(player=>`<div class="profile-row"><div><strong>${esc(player.name)}</strong><div class="fine">${player.campaigns.length} dungeon(s) / ${totalXP(player)} XP</div></div>${player.id===p().id?'<span class="badge">ACTIVE</span>':`<button class="btn secondary small" data-action="switch-player" data-id="${esc(player.id)}">Switch</button>`}</div>`).join('')}<form id="player-form" style="margin-top:22px"><div class="field"><label for="player-name">New player name</label><input id="player-name" name="name" required maxlength="60" placeholder="A colleague or a fresh character"></div><button class="btn primary small" style="margin-top:15px">Create clean player</button></form>`);
}
function practiceDialog(id) {
  const s = p().skills.find(x=>x.id===id); must(s,'Skill not found.');
  const today = s.sessions.some(t=>t.day===dayKey());
  showModal(`Practice / ${s.name}`,`${today?'<div class="success-box">Practice already recorded today. Extra sessions earn no additional XP.</div>':''}<p class="fine">Log a practice session you actually completed. +40 XP and a readiness boost, once per local calendar day. This is a game score, not a fitness assessment.</p><form id="practice-form" data-id="${esc(id)}" style="margin-top:20px"><div class="field"><label for="practice-note">What did you practice? (optional)</label><textarea id="practice-note" name="note" maxlength="400" placeholder="A brief record for your future self"></textarea></div></form>`,`<button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" type="submit" form="practice-form" ${today?'disabled':''}>Session completed</button>`);
}
function skillDetail(id) {
  const s=p().skills.find(x=>x.id===id); must(s,'Skill not found.');
  showModal(`Skill / ${s.name}`,`<form id="skill-settings-form" data-id="${esc(id)}"><div class="field"><label for="skill-rename">Name</label><input id="skill-rename" name="name" value="${esc(s.name)}" maxlength="80" required></div><div class="form-grid"><div class="field"><label for="skill-half">Readiness half-life (days)</label><input id="skill-half" name="halfLifeDays" type="number" min="1" max="365" value="${s.halfLifeDays}" required></div><div class="field"><label for="skill-grace">Grace period (days)</label><input id="skill-grace" name="graceDays" type="number" min="0" max="30" value="${s.graceDays}" required></div></div></form><p class="fine" style="margin:15px 0">Game tuning only. Changing these settings applies from now; it does not rewrite past practice. Recovery mode freezes readiness.</p><div class="eyebrow">RECENT PRACTICE</div>${s.sessions.slice(-5).reverse().map(t=>`<div class="timeline-entry"><div class="timeline-time">${esc(t.day)}</div><div class="timeline-text">${esc(t.note || 'Practice completed')} / +40 XP</div></div>`).join('') || '<p class="fine" style="margin-top:10px">No sessions logged.</p>'}`,`${s.sessions.length?`<button class="btn secondary small" data-action="undo-practice" data-id="${esc(id)}">Undo last session</button>`:''}<button class="btn primary small" type="submit" form="skill-settings-form">Save settings</button>`);
}
function newSkillDialog() {
  showModal('Add a skill',`<form id="skill-form"><div class="field"><label for="skill-name">Skill name</label><input id="skill-name" name="name" required maxlength="80" placeholder="A language, a craft, a sport..."></div><div class="field"><label for="new-half-life">Readiness half-life (game days)</label><input id="new-half-life" name="halfLifeDays" type="number" min="1" max="365" value="28" required></div></form><p class="fine" style="margin-top:20px">Starts unrated. No real-world ability is assumed.</p>`,`<button class="btn primary" type="submit" form="skill-form">Add skill</button>`);
}
function importDialog(text = '') {
  previewData=null;
  showModal('Import / review first',`<p class="fine">Accepts a campaign, extension, ChatGPT patch, or full save. Nothing changes until you review and apply.</p><form id="import-form" style="margin-top:18px"><div class="field"><label for="import-json">Paste JSON</label><textarea id="import-json" name="json" class="code" required spellcheck="false" placeholder='{"kind":"questos.patch","version":1,"operations":[]}'>${esc(text)}</textarea></div></form>`,`<button class="btn secondary" data-action="pick-file">Choose file</button><button class="btn primary" type="submit" form="import-form">Review changes</button>`);
}
function previewImport(text) {
  const data=parseJSON(text); let summary=[]; let warning='';
  if (data.kind==='questos.save') {
    validateSave(data); warning='This replaces every local player and all current progress. A recovery export is strongly recommended first.';
    summary=data.players.map(x=>`${x.name}: ${x.campaigns.length} dungeon(s), ${x.skills.length} skill(s)`);
  } else if(data.kind==='questos.campaign') {
    const test=clone(p()); importCampaign(test,data);
    summary=[`New dungeon: ${clean(data.name,100)}`, `${data.quests.length} objectives. All start uncompleted.`,...data.quests.slice(0,10).map(q=>q.title)];
  } else if(data.kind==='questos.extension') {
    const test=clone(p()); const ext=installExtension(test,data);
    summary=[`Install: ${ext.name}`,`${ext.quests.length} objectives, ${ext.skills.length} skills, ${ext.calls.length} call scripts`,...ext.quests.map(q=>q.title)];
  } else if(data.kind==='questos.patch') {
    applyPatch(p(),data);
    summary=data.operations.map(op=> op.type==='addQuest'?`Add objective: ${op.quest.title}`:op.type==='createCampaign'?`Create dungeon: ${op.name}`:op.type==='createRealm'?`Create realm: ${op.name}`:op.type==='enterRealm'?`Return to realm: ${p().realms.find(r=>r.id===op.realmId)?.name || op.realmId}`:op.type==='addSkill'?`Add skill: ${op.name}`:op.type==='setStatus'?`Set ${questById(op.questId)?.title || op.questId}: ${op.status}`:`Install extension: ${op.extension?.name || ''}`);
    warning=data.operations.some(op=>op.type==='setStatus')?'This changes completion status and may change XP. Apply only if it matches what actually happened.':'';
  } else throw new Error('Unsupported import type. Use a QuestOS campaign, extension, patch, or save.');
  previewData=data; previewOrigin=text;
  showModal('Review changes',`<span class="badge">${esc(data.kind.toUpperCase())}</span>${warning?`<div class="warning" style="margin-top:17px">${esc(warning)}</div>`:''}<div class="preview-changes">${summary.map(x=>`<div class="preview-item">${esc(x)}</div>`).join('') || 'No changes.'}</div><p class="fine">Imported text is not verified. No links are opened and no code is executed by importing.</p>`,`<button class="btn secondary" data-action="cancel-import">Back</button>${data.kind==='questos.save'?'<button class="btn secondary" data-action="export-save">Backup current save</button>':''}<button class="btn primary" data-action="apply-import">${data.kind==='questos.save'?'Replace all local saves':'Apply changes'}</button>`);
}
function applyImport() {
  must(previewData,'No import is ready.'); const data=previewData;const before=new Map(p().campaigns.flatMap(d=>d.quests).map(q=>[q.id,q.status]));
  if(data.kind==='questos.save') { state=validateSave(data); storageStatus='local'; recoveryRaw=''; recoveryMessage=''; }
  else if(data.kind==='questos.campaign') { importCampaign(p(),data); tab='board'; }
  else if(data.kind==='questos.extension') installExtension(p(),data);
  else if(data.kind==='questos.patch') { const updated=applyPatch(p(),data); state.players[state.players.findIndex(x=>x.id===p().id)]=updated; }
  previewData=null; closeModal();
  if(data.kind!=='questos.save') {
    const all=p().campaigns.flatMap(d=>d.quests), results=all.filter(q=>before.get(q.id)==='pending' && q.status!=='pending');
    if(results.length) {results.forEach(q=>learnFromOutcome(p(),q,q.status==='done'?'completed':'blocked'));reportMission(p(),results.at(-1).id);tab='home';feeling='';questOffer=null;}
    else if(all.some(q=>!before.has(q.id))) {finishReview(p());tab='home';feeling='';questOffer=null;}
  }
  commit('Import applied.');
}
const exampleExtension = {
  kind:'questos.extension',version:1,id:'morning-signal',name:'Morning Signal',
  description:'A reusable focus mission and a new voice on the line.',
  quests:[{title:'Complete one focused work block',detail:'Choose one useful task. Finish one uninterrupted block of work. You decide the duration.',nextMove:'Pick the single task that matters most today.',category:'side',xp:60}],
  skills:[{name:'Focus',halfLifeDays:21}],
  calls:[{caller:'NIGHT SHIFT',text:'The terminal is awake. Choose one useful action. No ten-step plan. Report back when it is complete.'}]
};
function briefDialog() {
  const brief=`${agentBrief(p())}\n\nSIDEKICK CONTEXT\n${JSON.stringify(sidekickContext(p(),currentMission(p())),null,2)}`;
  showModal('ChatGPT handoff',`<p class="fine">Copy this into a ChatGPT conversation. It includes objective details and your current game state, but not other players.</p><div class="field" style="margin-top:17px"><label for="agent-brief">Editable before you share</label><textarea id="agent-brief" class="code" spellcheck="false">${esc(brief)}</textarea></div>`,`<button class="btn secondary" data-action="download-brief">Save text file</button><button class="btn primary" data-action="copy-brief">Copy handoff</button>`);
}
function callDialog() {
  if(p().settings.driving) { toast('Driving mode is on. Calls are paused.',true); return; }
  currentCall=operatorMessage(p()); p().lastCallAt=Date.now(); saveState();
  showModal('Incoming transmission',`<div class="call-screen"><div class="eyebrow">SIMULATED IN-GAME CALL / NOT A PHONE CALL</div><div class="call-avatar">${icon('phone',36)}</div><h2>${esc(currentCall.caller)}</h2><p class="fine">A mission update is waiting.</p>${signal(true)}</div>`,`<button class="btn secondary" data-action="decline-call">Decline</button><button class="btn primary" data-action="answer-call">Answer</button>`, 'dispatch', currentCall.caller);
}
function answerCall() {
  must(currentCall,'No transmission waiting.');
  const text=currentCall.text;
  record(p(),'operator:call',`${currentCall.caller}: ${text}`); saveState();
  showModal('Transmission connected',`<div class="call-copy">${esc(text)}</div><p class="fine">No new objective is created automatically.</p>`,`<button class="btn primary" data-action="close">End transmission</button>`, 'dispatch', currentCall.caller);
  if(p().settings.sound && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text); utterance.rate=.92; utterance.lang='en-US'; window.speechSynthesis.speak(utterance); } catch { toast('Voice is unavailable in this browser. The message is shown as text.'); }
  }
}
function aboutDialog() {
  showModal('QuestOS / field manual',`<div class="eyebrow green">PLAYABLE PROTOTYPE / v0.3.1</div><p class="detail-text">Complete real objectives to earn XP and collect loot. Create dungeons for trips, errands, work, or practice. Mark a blocked objective impossible to close it without a penalty.</p><h3>Two different records</h3><p class="detail-text">Field rank records completed work. It does not decay. Skill potential records practice. Current skill level falls as readiness decays, and rises as you practice again. This is game logic, not a scientific assessment.</p><h3>One mission at a time</h3><p class="detail-text">Choose a quest, act, then report. New quests ask whether to switch or keep your current mission. After a result, choose what matters next or stand down.</p><h3>Learning your rhythm</h3><p class="detail-text">Niko remembers your mood, choices, and confirmed results. You can reset his memory without losing quest progress. This is a small preference system, not generative AI or self-rewriting code. Your records stay in your save.</p><h3>Local by design</h3><p class="detail-text">Game data stays in this browser. No analytics, background location, AI request, or real phone call. Your progress is stored in this browser when possible. Export a backup before changing devices or clearing browser data.</p><h3>Reusable and extendable</h3><p class="detail-text">Share campaign templates. Add JSON modules with quests, skills, and operator scripts. The source project contains the rules engine, extension hooks, tests, and static deployment files.</p><h3>ChatGPT integration</h3><p class="detail-text">The bridge is copy/paste. A connected ChatGPT app and shared cloud saves are not implemented in this build. Use the playable game link to open the hosted app. The clean starter has separate local progress. Site access uses ChatGPT sharing settings.</p><h3>Stay grounded</h3><p class="detail-text">Campaigns can contain player-supplied shopping lists and locations. Stock, opening hours, overnight parking rules, church details, and flight times need verification outside this app. No substitutions or automatic completion.</p>`,`<button class="btn primary" data-action="close">Back to the quest</button>`);
}
function closeQuestDialog(id) {
  const q=questById(id); must(q,'Objective not found.');
  showModal('Close a dead end',`<h3>${esc(q.title)}</h3><p class="detail-text">Impossible objective, not player failure. No XP penalty. You can reopen it later.</p><form id="close-quest-form" data-id="${esc(id)}"><div class="field"><label for="close-reason">Reason (optional)</label><textarea id="close-reason" name="reason" maxlength="500" placeholder="Unavailable, unsafe, not legal, or no longer useful"></textarea></div></form>`,`<button class="btn secondary" data-action="close">Keep open</button><button class="btn primary" type="submit" form="close-quest-form">Declare impossible</button>`);
}
function recoveryDialog() {
  showModal('Save recovery',`<p class="detail-text">${esc(recoveryMessage)}</p><p class="fine">The original unreadable data remains untouched until you explicitly replace it. Export both recovery data and the currently loaded state first.</p>`,`<button class="btn secondary" data-action="export-recovery">Export original data</button><button class="btn secondary" data-action="export-save">Export loaded state</button><button class="btn primary" data-action="accept-recovery">Use loaded state</button>`);
}
async function act(action, element) {
  const id=element.dataset.id;
  if(p().settings.driving && action!=='parked') return;
  switch(action) {
    case 'tab': tab=element.dataset.tab; render(); window.scrollTo(0,0); break;
    case 'new-realm': realmForm(); break;
    case 'edit-realm': realmForm(id); break;
    case 'enter-realm': enterRealm(p(),id); feeling='';questOffer=null;tab='realms';commit();break;
    case 'open-dungeon': { const dungeon = p().campaigns.find(x => x.id === id); must(dungeon,'Dungeon not found.'); enterRealm(p(),dungeon.realmId);p().activeCampaignId=id;r().lastCampaignId=id;tab='board';commit();break; }
    case 'check-in': feeling=element.dataset.mood;questOffer=checkIn(p(),feeling,Date.now(),(q,mood)=>learnedFit(p(),q,mood));commit();break;
    case 'accept-quest': {const chosen=acceptSuggestion(p(),questOffer,Date.now(),false);questOffer=null;requestMission(chosen);break;}
    case 'dismiss-quest': learnFromOutcome(p(),questOffer?.kind==='existing'?questById(questOffer.questId):questOffer?.quest,'declined');dismissSuggestion(p(),questOffer);questOffer=null;commit();break;
    case 'start-quest': requestMission(id);break;
    case 'choose-mission': activateMission(id);break;
    case 'retain-mission': retainMission(p());closeModal();commit();break;
    case 'resume-mission': {const current=currentMission(p());if(current)activateMission(current.id);break;}
    case 'set-aside': {const q=setAsideMission(p());if(q)outcomeReview(q,'set-aside');commit('Quest stays on your board.');break;}
    case 'review-next': finishReview(p());feeling='';questOffer=null;tab='home';commit();break;
    case 'stand-down': finishReview(p());tab='realms';commit('Take your time. Your quests will be here.');break;
    case 'sidekick-memory': sidekickMemoryDialog();break;
    case 'reset-sidekick': showModal('Reset Niko’s memory?', '<p class="detail-text">Clear learned preferences, quest observations, and your notes. Your quests, XP, skills, and inventory stay intact.</p>', '<button class="btn secondary" data-action="sidekick-memory">Keep memory</button><button class="btn primary" data-action="confirm-reset-sidekick">Reset memory</button>');break;
    case 'confirm-reset-sidekick': await sidekickRepository.remove(p().id);questOffer=null;feeling='';closeModal();commit('Niko is starting fresh. Your progress is safe.');break;
    case 'close': closeModal(); break;
    case 'complete': {
      const q=questById(id); must(q,'Objective not found.');
      const wasComplete=progress(c()).complete;
      const changed=setQuestStatus(p(),id,'done'); if(modal.open) closeModal();
      if(changed) { const newlyComplete=!wasComplete && progress(c()).complete; outcomeReview(q,'completed');commit(newlyComplete?`MAIN QUEST COMPLETE. +${q.xp} XP.`:`${q.loot?'Loot secured':'Objective complete'}. +${q.xp} XP.`, 'quest:completed'); }
      break;
    }
    case 'undo-quest': setQuestStatus(p(),id,'pending'); if(modal.open)closeModal(); commit('Objective reopened. Its reward was reversed.'); break;
    case 'detail': detailDialog(id); break;
    case 'new-quest': questForm(); break;
    case 'edit-quest': questForm(id); break;
    case 'close-quest': closeQuestDialog(id); break;
    case 'new-campaign': campaignForm(); break;
    case 'profiles': profileDialog(); break;
    case 'switch-player': must(state.players.some(x=>x.id===id),'Player not found.'); state.activePlayerId=id; feeling='';questOffer=null;tab='home'; closeModal(); commit('Player switched.'); break;
    case 'practice': practiceDialog(id); break;
    case 'new-skill': newSkillDialog(); break;
    case 'skill-detail': skillDetail(id); break;
    case 'pause-skill': {const skill=p().skills.find(s=>s.id===id); must(skill,'Skill not found.'); pauseSkill(p(),id,!skill.paused); commit(skill.paused?'Recovery mode. Readiness is frozen.':'Practice resumed.');break;}
    case 'undo-practice': undoPractice(p(),id); closeModal(); commit('Last practice reversed.'); break;
    case 'copy-starter-link': await copyText(STARTER_URL,'Starter link copied.'); break;
    case 'export-save': download(`questos-save-${dayKey()}.json`,JSON.stringify(state,null,2)); toast('Save exported. Contains all local profiles.'); break;
    case 'share-campaign': {
      const template=campaignTemplate(c());
      showModal('Share a reusable campaign',`<h3>${esc(template.name)}</h3><p class="detail-text">Exports ${template.quests.length} objectives with fresh progress. Does not include players, inventory history, XP, or practice logs.</p><div class="warning">Objective text and map destinations are included. Review them before sharing with colleagues.</div>`,`<button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" data-action="download-template">Export template</button>`); break;
    }
    case 'download-template': download('questos-campaign.json',JSON.stringify(campaignTemplate(c()),null,2));closeModal();toast('Reusable campaign exported.');break;
    case 'import-dialog': importDialog(); break;
    case 'pick-file': $('#import-file').value=''; $('#import-file').click(); break;
    case 'cancel-import': importDialog(previewOrigin); break;
    case 'apply-import': applyImport(); break;
    case 'extension-example': importDialog(JSON.stringify(exampleExtension,null,2)); break;
    case 'agent-brief': briefDialog(); break;
    case 'copy-brief': await copyText($('#agent-brief').value,'Handoff copied. Paste it into ChatGPT.'); break;
    case 'download-brief': download('questos-chatgpt-handoff.txt',$('#agent-brief').value,'text/plain');break;
    case 'call': callDialog(); break;
    case 'answer-call': answerCall(); break;
    case 'decline-call': currentCall=null;closeModal();toast('Transmission declined. No penalty.');break;
    case 'driving': if(modal.open)closeModal();window.speechSynthesis?.cancel();p().settings.driving=true;commit();$('#drive-screen button').focus();break;
    case 'parked': p().settings.driving=false;p().lastCallAt=Date.now();commit('Controls unlocked.');break;
    case 'about': aboutDialog();break;
    case 'add-loot': showModal('Add existing loot',`<form id="loot-form"><div class="field"><label for="loot-name">Item already in your inventory</label><input id="loot-name" name="name" required maxlength="160" placeholder="An item you actually have"></div></form>`,`<button class="btn primary" type="submit" form="loot-form">Add item</button>`);break;
    case 'recovery': recoveryDialog();break;
    case 'export-recovery': download('questos-unreadable-recovery.json',recoveryRaw);break;
    case 'accept-recovery': storageStatus='local';recoveryMessage='';recoveryRaw='';closeModal();commit('Recovered state saved.');break;
  }
}
document.addEventListener('click', event => {
  const target=event.target.closest('[data-action]'); if(!target)return;
  event.preventDefault(); Promise.resolve(act(target.dataset.action,target)).catch(error=>toast(error.message,true));
});
document.addEventListener('submit', async event => {
  event.preventDefault(); const form=event.target; const data=Object.fromEntries(new FormData(form));
  if(p().settings.driving) return;
  try {
    if(form.id==='sidekick-note-form') {addSidekickSnippet(p(),data.note);await sidekickRepository.save(p().id,p().sidekick);closeModal();commit('Niko will remember.');}
    else if(form.id==='realm-form') {
      let realm = form.dataset.id ? p().realms.find(x => x.id === form.dataset.id) : null;
      must(clean(data.name),'Name the realm.');
      if(form.dataset.id) { must(realm,'Realm not found.');realm.name=clean(data.name,100);realm.location=clean(data.location,240); }
      else realm=addRealm(p(),data.name,data.location);
      if(data.home==='on') {p().homeRealmId=realm.id;p().realms.forEach(x=>{x.home=x.id===realm.id;});}
      feeling='';questOffer=null;tab='home';closeModal();commit('Realm saved.');
    } else if(form.id==='quest-form') {
      const parsed=makeQuest(data); const old=form.dataset.id?questById(form.dataset.id):null;
      if(old) { const oldXP=old.xp;Object.assign(old,{title:parsed.title,detail:parsed.detail,nextMove:parsed.nextMove,destination:parsed.destination,category:parsed.category,xp:parsed.xp,loot:parsed.loot});record(p(),'quest:edit',`OBJECTIVE EDITED: ${old.title}${old.status==='done' && oldXP!==old.xp?' (reward adjusted)':''}`); }
      else { must(c().quests.length<200,'Maximum 200 objectives per dungeon.');c().quests.push(parsed);record(p(),'quest:add',`OBJECTIVE ADDED: ${parsed.title}`); }
      closeModal();commit(old?'Objective updated.':'Objective created.');if(!old)requestMission(parsed.id,true);
    } else if(form.id==='campaign-form') {
      must(p().campaigns.length<100,'Maximum 100 dungeons per player.');const d=makeCampaign(data.name,data.subtitle,Date.now(),r().id);p().campaigns.push(d);p().activeCampaignId=d.id;r().lastCampaignId=d.id;tab='board';record(p(),'campaign:create',`DUNGEON ENTERED: ${d.name}`);closeModal();commit('New dungeon created.');
    } else if(form.id==='player-form') {
      must(state.players.length<25,'Maximum 25 local players.');const player=createPlayer(data.name);state.players.push(player);state.activePlayerId=player.id;feeling='';questOffer=null;tab='home';closeModal();commit('New player ready.');
    } else if(form.id==='practice-form') {
      practice(p(),form.dataset.id,data.note);closeModal();commit('Practice logged. +40 XP.','skill:practiced');
    } else if(form.id==='skill-form') {
      must(p().skills.length<50,'Maximum 50 skills per player.');must(clean(data.name),'Name the skill.');p().skills.push(newSkill(data.name,data.halfLifeDays));closeModal();commit('Skill added.');
    } else if(form.id==='skill-settings-form') {
      const s=p().skills.find(x=>x.id===form.dataset.id);must(s,'Skill not found.');
      s.readiness=readinessAt(s);s.anchorAt=Date.now();s.name=clean(data.name,80);s.halfLifeDays=clamp(Number(data.halfLifeDays),1,365);s.graceDays=clamp(Number(data.graceDays),0,30);closeModal();commit('Skill settings updated.');
    } else if(form.id==='close-quest-form') {const q=questById(form.dataset.id);if(setQuestStatus(p(),form.dataset.id,'impossible',data.reason))outcomeReview(q,'blocked');closeModal();commit('Dead end closed. No penalty.');}
    else if(form.id==='loot-form') {must(p().bonusLoot.length<200,'Maximum 200 bonus items.');p().bonusLoot.push(clean(data.name,160));record(p(),'loot:add',`BONUS LOOT: ${clean(data.name,160)}`);closeModal();commit('Inventory updated.');}
    else if(form.id==='import-form') previewImport(data.json);
  } catch(error) {toast(error.message,true);}
});
document.addEventListener('change', async event => {
  const el=event.target;
  try {
    if(el.id==='realm-picker'){enterRealm(p(),el.value);feeling='';questOffer=null;tab='home';commit();}
    else if(el.id==='campaign-picker'){must(realmCampaigns(p()).some(d=>d.id===el.value),'Dungeon not found.');p().activeCampaignId=el.value;r().lastCampaignId=el.value;tab='board';commit();}
    else if(el.id==='auto-calls'){p().settings.autoCalls=el.checked;p().lastCallAt=Date.now();commit(el.checked?'Foreground transmissions enabled.':'Automatic transmissions disabled.');}
    else if(el.id==='call-interval'){p().settings.callIntervalMinutes=clamp(Number(el.value),5,180);commit();}
    else if(el.id==='call-sound'){p().settings.sound=el.value==='on';if(!p().settings.sound)window.speechSynthesis?.cancel();commit();}
    else if(el.id==='import-file' && el.files[0]){must(el.files[0].size<=MAX_IMPORT_BYTES,'Maximum import size is 2 MB.');previewImport(await el.files[0].text());}
  } catch(error){toast(error.message,true);}
});
document.addEventListener('input', event => { if(['break-days','return-sessions'].includes(event.target.id))updateSimulation(); });
modal.addEventListener('close',()=>window.speechSynthesis?.cancel());
modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){window.speechSynthesis?.cancel();}else{p().lastCallAt=Date.now();}});
window.addEventListener('storage',event=>{
  if(event.key===KEY && event.newValue){try{state=validateSave(parseJSON(event.newValue));lastSavedRaw=event.newValue;if(modal.open)closeModal();render();toast('Another tab updated this save. Latest state loaded.');}catch{toast('Another tab wrote an unreadable save. Export your current state.',true);}}
});
setInterval(()=>{
  if(!state||document.hidden||modal.open||p().settings.driving)return;
  if(p().settings.autoCalls && Date.now()-p().lastCallAt>=p().settings.callIntervalMinutes*60000)callDialog();
},15000);
// Recompute elapsed-time readiness when viewed; no background process is needed.
setInterval(()=>{if(state&&!document.hidden&&!modal.open&&tab!=='skills'&&!p().settings.driving)render();},60000);
loadState();render();
// Developer extension surface. No untrusted imported JavaScript is evaluated.
window.QuestOS=Object.freeze({version:'0.2.0',on:(event,fn)=>bus.on(event,fn),getSnapshot:()=>clone(state),
  getAgentBrief:()=>`${agentBrief(p())}\n\nSIDEKICK CONTEXT\n${JSON.stringify(sidekickContext(p(),currentMission(p())),null,2)}`,previewJSON:text=>previewImport(text)});
if(location.protocol==='http:'||location.protocol==='https:') {
  const link=document.createElement('link');link.rel='manifest';link.href='./manifest.webmanifest';document.head.appendChild(link);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
