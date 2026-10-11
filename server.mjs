/** Dependency-free development server. Localhost only unless HOST is explicitly set. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png' };
createServer(async (request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405, {'Allow':'GET, HEAD'}); response.end(); return; }
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404, {'Content-Type':'text/plain'}); response.end('Not found'); }
}).listen(port, host, () => console.log(`QuestOS is running at http://${host}:${port}`));
