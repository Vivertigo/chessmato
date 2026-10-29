'use strict';
// Offline support: every app file is cached on install, served from the cache first, and refreshed in the background
// whenever the local server is reachable. Saved progress lives in localStorage and is never touched here.
const CACHE='checkmato-app-v9';
const FILES=['./','index.html','manifest.webmanifest','pwa.js','feel.js','tour.js','hotseat.js','link.js','vendor/qrcode.js','appearance.js','appearance.css','theme.css','theme.js','coaches.js','puzzle-pack.js','puzzles.js','training.js','thinking.js','openings-db.js','pgn.js','personal-data.js','lichess.js','review.js','guess.js','model-games.js','model-puzzles.js','systems.js','vendor/fzstd.js','ui.js','ui.css','openings.js','academy.js','chess.min.js','stockfish.js','stockfish.wasm','icons/icon-32.png','icons/icon-48.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/logo-1024.png'];
for(const set of ['cburnett','merida'])for(const c of ['w','b'])for(const p of ['K','Q','R','B','N','P'])FILES.push('pieces/'+set+'/'+c+p+'.svg');
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>null)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('checkmato-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(req,{ignoreSearch:true});
    const fresh=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>null);
    if(hit){e.waitUntil(fresh);return hit}const r=await fresh;return r||new Response('Offline and not cached yet.',{status:503,headers:{'Content-Type':'text/plain'}})}))});
