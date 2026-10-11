import { build } from 'esbuild';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const assets = {};
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
async function collect(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if(entry.name.startsWith('.') || entry.name === 'server') continue;
    const file = path.join(dir,entry.name);
    if(entry.isDirectory()) await collect(file);
    else assets['/'+path.relative('dist',file).split(path.sep).join('/')] = { body: (await readFile(file)).toString('base64'), type: mime[path.extname(file)] || 'application/octet-stream' };
  }
}
await collect('dist');
await mkdir('dist/server',{recursive:true});
const source = `import { handleNicoGateway } from './packages/infrastructure/src/model-gateway.ts';
const assets = ${JSON.stringify(assets)};
export default { async fetch(request, env) {
  const url = new URL(request.url);
  if(url.pathname.startsWith('/api/')) return handleNicoGateway(request,env);
  if(request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed',{status:405});
  if(url.pathname === '/starter' || url.pathname === '/telegram') return Response.redirect(url.origin+url.pathname+'/',308);
  const pathname = url.pathname.endsWith('/') ? url.pathname+'index.html' : url.pathname;
  const entry = assets[pathname];
  if(!entry) return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD' ? null : Uint8Array.from(atob(entry.body), c=>c.charCodeAt(0)),{headers:{'Content-Type':entry.type,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'}});
}};`;
await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'life-worker.ts',loader:'ts'},bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,outfile:'dist/server/index.js'});
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
