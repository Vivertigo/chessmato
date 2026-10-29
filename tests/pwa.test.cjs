// Installable app: manifest, icons, header logo, and offline start from the service-worker cache.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
const root=path.join(__dirname,'..'),server=fs.readFileSync(path.join(root,'server.cjs'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const allowed=JSON.parse(server.match(/new Set\((\[[^\]]*\])\)/)[1].replace(/'/g,'"')),files=JSON.parse(sw.match(/const FILES=(\[[^\]]*\])/)[1].replace(/'/g,'"'));
let missing=allowed.filter(f=>f!=='sw.js'&&!files.includes(f));ok(!missing.length,'every file the launcher serves is cached for offline use'+(missing.length?' — missing '+missing.join(', '):''));
ok(files.filter(f=>f!=='./').every(f=>allowed.includes(f)),'the offline cache lists only files the launcher serves');
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1300,height:950}});const page=await ctx.newPage();await page.addInitScript(()=>{try{localStorage.setItem('chessmato-tour-v1','done')}catch(e){}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoPWA);
let man=await page.evaluate(async()=>{let m=await (await fetch(document.querySelector('link[rel=manifest]').href)).json();let ok=[];for(let i of m.icons){let r=await fetch(i.src);ok.push(r.ok&&r.headers.get('content-type')==='image/png')}return {name:m.name,display:m.display,icons:m.icons.length,ok:ok.every(Boolean),maskable:m.icons.some(i=>i.purpose==='maskable')}});
ok(man.name==='CheckMato'&&man.display==='standalone'&&man.icons===3&&man.ok&&man.maskable,'manifest names CheckMato, standalone, with 192/512/maskable PNG icons that load');
ok(await page.evaluate(()=>{let i=document.querySelector('.brand-logo');return i&&i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().width>=30}),'header shows the CheckMato logo');
ok(await page.evaluate(async()=>(await fetch('icons/icon-32.png')).ok&&!!document.querySelector('link[rel=icon]')),'favicon set');
await page.evaluate(()=>chessUITest.navigate('settings','about'));ok(await page.evaluate(()=>/works offline/.test($('install-status').textContent)),'Settings → About explains installing');
await page.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:30000}).catch(()=>{});
if(!await page.evaluate(()=>!!navigator.serviceWorker.controller)){await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000})}
ok(await page.evaluate(()=>!!navigator.serviceWorker.controller),'offline service worker is active');
await page.waitForFunction(async()=>{let c=await caches.open('checkmato-app-v8');return !!(await c.match('stockfish.wasm'))&&!!(await c.match('pieces/merida/bQ.svg'))},null,{timeout:30000});
console.log('Offline');
await ctx.setOffline(true);await page.reload();await page.waitForFunction(()=>window.chessMatoGuess&&window.chessMatoGames);
ok(await page.evaluate(()=>document.querySelectorAll('#board [data-s]').length===64&&!!document.querySelector('#board img, #board .piece')),'with the network off, the app loads from the cache with its board');
let ev=await page.evaluate(()=>new Promise(res=>{let w=new Worker('stockfish.js'),t=setTimeout(()=>res('timeout'),20000);w.onmessage=e=>{if(String(e.data).startsWith('bestmove')){clearTimeout(t);w.terminate();res(String(e.data))}};w.postMessage('uci');w.postMessage('position startpos');w.postMessage('go depth 6')}));
ok(/^bestmove \w{4}/.test(ev),'the engine runs offline ('+ev+')');
await ctx.setOffline(false);
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
