import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const load = name => readFile(join(root, 'src', name), 'utf8');
const [rawEngine, rawApp, baseCSS, shell, focusSystem, learningSystem, iconSystem, tokens, consoleCSS, motion] = await Promise.all(['engine.mjs','app.mjs','styles.css','shell.html','systems/prioritize.mjs','systems/learning.mjs','ui/icons.mjs','ui/tokens.css','ui/console.css','ui/motion.css'].map(load));
const css = [baseCSS,tokens,consoleCSS,motion].join('\n');
const inlineModule = source => source.replace(/^import .* from '[^']+';\n/gm, '').replace(/^export /gm, '');
const origin = (process.env.QUESTOS_ORIGIN || 'https://questos.mangomint-5316.chatgpt.site').replace(/\/$/, '');
function buildHTML(starter = false) {
let engine = rawEngine;
let app = rawApp;
if (starter) {
  const start = engine.indexOf('export function seedCampaign(');
  const end = engine.indexOf('export function createPlayer(', start);
  if (start < 0 || end < 0) throw new Error('Cannot find seed campaign for clean build.');
  engine = engine.slice(0, start) + 'export function seedCampaign(now) { return makeCampaign(\'Everyday expedition\', \'Your first adventure\', now); }\nexport function applyReportedUpdate() { return false; }\n' + engine.slice(end);
  engine = engine.replace("createPlayer('Alex', true, now)", "createPlayer('Player 1', false, now)");
  engine = engine.replace("seeded ? ['Jocko Molk protein shake', 'Mirror'] : []", '[]');
  app = app.replace("const KEY = 'questos.v1';", "const KEY = 'questos.starter.v1';")
    .replace("const BACKUP_KEY = 'questos.v1.backup';", "const BACKUP_KEY = 'questos.starter.v1.backup';");
}
// Keep the distribution self-contained: no CDN, packages, fonts, or module fetches.
// A classic script also runs when a browser opens the HTML as a local file.
// The static launch panel remains visible in file previews that disable scripts.
const script = `(() => { 'use strict';\nconst launchPanel = document.getElementById('app').innerHTML;\ntry {\n${[engine,focusSystem,learningSystem,iconSystem,app].map(inlineModule).join('\n')}\n} catch (error) {\n document.getElementById('app').innerHTML = launchPanel;\n document.getElementById('boot-message').textContent = 'The game could not start here. Open the playable game in your browser.';\n console.error('QuestOS could not start', error);\n}\n})();`;
if (/<\/script/i.test(script)) throw new Error('Inline script includes an unsafe closing tag.');
return shell.replace('/*__STYLES__*/', () => css).replace('/*__SCRIPT__*/', () => script)
  .replaceAll('__PLAY_URL__', origin + (starter ? '/starter/' : '/'))
  .replaceAll('__STARTER_URL__', origin + '/starter/');
}
await mkdir(join(root, 'dist'), { recursive: true });
await cp(join(root, 'public'), join(root, 'dist'), { recursive: true });
const html = buildHTML(process.argv.includes('--share'));
const starter = buildHTML(true);
await writeFile(join(root, 'dist', 'index.html'), html);
await mkdir(join(root, 'dist', 'starter'), { recursive: true });
await cp(join(root, 'public'), join(root, 'dist', 'starter'), { recursive: true });
await writeFile(join(root, 'dist', 'starter', 'index.html'), starter);
await writeFile(join(root, 'starter.html'), starter);
console.log('Built the game and isolated clean starter.');
