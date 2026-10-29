// Static hosting under a sub-folder, as on GitHub Pages (https://vivertigo.github.io/checkmato/): the app, its service
// worker and the manifest must all work from /checkmato/ with plain static files and a 404 page.
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path'),{execSync}=require('child_process');
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
const ROOT=path.join(__dirname,'..'),files=new Set(execSync('git ls-files',{cwd:ROOT}).toString().split('\n').filter(Boolean));
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.webmanifest':'application/manifest+json','.json':'application/json','.txt':'text/plain'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(new URL(req.url,'http://x').pathname);if(u==='/checkmato'){res.writeHead(301,{Location:'/checkmato/'}).end();return}
  let rel=u.startsWith('/checkmato/')?u.slice('/checkmato/'.length)||'index.html':null;
  if(rel&&files.has(rel)){res.writeHead(200,{'Content-Type':TYPES[path.extname(rel)]||'application/octet-stream'});res.end(fs.readFileSync(path.join(ROOT,rel)));return}
  res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(ROOT,'404.html')))});
server.listen(0,'127.0.0.1',async()=>{const BASE='http://127.0.0.1:'+server.address().port+'/checkmato/';try{
const browser=await chromium.launch();const ctx=await browser.newContext();const page=await ctx.newPage();const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!/personal-data\.js$/.test(r.url()))missing.push(r.status()+' '+r.url())});
await page.addInitScript(()=>localStorage.setItem('chessmato-tour-v1','done'));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoSystems&&window.chessMatoLink);
ok(missing.length===0,'every app file loads from /checkmato/ '+JSON.stringify(missing.slice(0,5)));
ok(!files.has('personal-data.js'),'personal data is not part of the published files');
ok(files.has('.nojekyll'),'.nojekyll is published so Pages serves every file as it is');
const sw=await page.evaluate(async()=>{let r=await navigator.serviceWorker.ready;return r.scope});
ok(/\/checkmato\/$/.test(sw),'the service worker is scoped to /checkmato/ ('+sw+')');
const man=await page.evaluate(async()=>{let l=document.querySelector('link[rel=manifest]'),r=await fetch(l.href);let m=await r.json();return {start:new URL(m.start_url,l.href).pathname,scope:new URL(m.scope,l.href).pathname}});
ok(man.start==='/checkmato/index.html'&&man.scope==='/checkmato/','the manifest starts and stays inside /checkmato/ '+JSON.stringify(man));
await page.waitForTimeout(1500);await ctx.setOffline(true);await page.reload();await page.waitForFunction(()=>window.chessMatoSystems,null,{timeout:10000}).catch(()=>{});
ok(await page.evaluate(()=>!!window.chessMatoSystems&&!!document.querySelector('#board .sq')),'it reopens offline from /checkmato/');await ctx.setOffline(false);
const p2=await (await browser.newContext()).newPage();let r=await p2.goto(BASE+'no/such/page');
ok(r.status()===404&&/Page not found/.test(await p2.textContent('h1')),'a missing path shows the 404 page');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close()}catch(e){console.error(e);failures++}server.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)});
