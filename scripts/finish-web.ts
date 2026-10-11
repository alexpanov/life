import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = process.env["SITE_BASE"] ?? "/";
const html = await readFile("dist/index.html", "utf8");
await mkdir("dist/starter", { recursive: true });
await writeFile("dist/starter/index.html", html);
await writeFile("dist/.nojekyll", "");
await writeFile(
  "dist/build-info.json",
  JSON.stringify({
    commit: process.env["GITHUB_SHA"] ?? "local",
    builtAt: new Date().toISOString(),
  }),
);
const assets = (await readdir("dist/assets")).map(
  (file) => `${base}assets/${file}`,
);
const revision = createHash("sha256").update(html).digest("hex").slice(0, 12);
// Each scope owns its cache. Network-first HTML plus immutable assets allows offline return.
const worker = `const CACHE='life-${revision}-'+self.registration.scope;
const ASSETS=${JSON.stringify([base, `${base}starter/`, ...assets])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if((key.startsWith('questos')||(key.startsWith('life-')&&key.endsWith(self.registration.scope)))&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{let target=new URL(event.notification.data?.url||'./',self.registration.scope);if(target.origin!==self.location.origin||!target.href.startsWith(self.registration.scope))target=new URL(self.registration.scope);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(client=>client.url.startsWith(self.registration.scope));if(existing){await existing.navigate(target.href);await existing.focus();}else await self.clients.openWindow(target.href);})());});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('build-info.json'))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok&&url.pathname.startsWith(${JSON.stringify(base)})){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(async()=>{const saved=await caches.match(request);if(saved)return saved;if(request.mode==='navigate'){const home=await caches.match(self.registration.scope);if(home)return home;}return Response.error();}));});`;
await writeFile("dist/sw.js", worker);
await writeFile("dist/starter/sw.js", worker);
