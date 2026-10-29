// Browser verification of the appearance/accessibility layer.
// Run: start server (CHESSMATO_NO_BROWSER=1 node server.cjs), then node tests/appearance.test.cjs
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;
function ok(cond,msg){if(cond){passes++;console.log('  ok  '+msg)}else{failures++;console.log('  FAIL '+msg)}}
(async()=>{
const browser=await chromium.launch();
async function fresh(viewport={width:1300,height:950}){const ctx=await browser.newContext({viewport});const page=await ctx.newPage();const errors=[];page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}try{localStorage.setItem('chessmato-tour-v1','done')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoAppearance);return {ctx,page,errors}}
let {ctx,page,errors}=await fresh();
console.log('Load');
ok(errors.length===0,'no JS errors on load '+JSON.stringify(errors));
let fen=await page.evaluate(()=>game.fen());
let pieceCount=fen.split(' ')[0].replace(/[^a-zA-Z]/g,'').length;
let imgs=await page.$$eval('#board .sq .piece img',a=>a.map(i=>({src:i.getAttribute('src'),w:i.naturalWidth,complete:i.complete})));
ok(imgs.length===pieceCount,'one SVG per piece ('+imgs.length+'/'+pieceCount+')');
await page.waitForFunction(()=>Array.from(document.querySelectorAll('#board img')).every(i=>i.complete));
imgs=await page.$$eval('#board .sq .piece img',a=>a.map(i=>i.naturalWidth));
ok(imgs.every(w=>w>0),'all SVG images decoded');
console.log('Piece sets');
const nav=(v,sec)=>page.evaluate(([v,sec])=>chessUITest.navigate(v,sec),[v,sec]);
await nav('settings','board');
for(const set of ['merida','letters','legacy','cburnett']){
  await page.selectOption('#piece-choice',set);
  let r=await page.evaluate(()=>{let out=[];document.querySelectorAll('#board .sq').forEach(b=>{let p=game.get(b.dataset.s);if(p)out.push({img:!!b.querySelector('.piece img'),src:(b.querySelector('.piece img')||{}).getAttribute?.('src'),letter:(b.querySelector('.piece-letter')||{}).textContent,team:(b.querySelector('.piece-team')||{}).textContent,text:(b.querySelector('.piece')||{}).textContent,p})});return out});
  if(set==='merida'||set==='cburnett')ok(r.every(x=>x.img&&x.src==='pieces/'+set+'/'+x.p.color+x.p.type.toUpperCase()+'.svg'),set+': correct SVG per piece');
  if(set==='letters')ok(r.every(x=>x.letter===x.p.type.toUpperCase()&&x.team===(x.p.color==='w'?'W':'B')),'letters: type letter + W/B marker');
  if(set==='legacy')ok(r.every(x=>!x.img&&x.text.length===1),'legacy: font glyph');
}
let previewImgs=await page.$$eval('#piece-preview img',a=>a.length);ok(previewImgs===12,'settings preview shows 12 pieces');
console.log('Notation');
await page.uncheck('#labels-visible');
ok(await page.evaluate(()=>Array.from(document.querySelectorAll('#board .coord')).every(c=>getComputedStyle(c).display==='none')),'notation hidden when off');
await page.check('#labels-visible');
for(const mode of ['center','corner','edges']){await page.selectOption('#labels-mode',mode);
  let vis=await page.evaluate(()=>({coord:Array.from(document.querySelectorAll('#board .coord')).filter(c=>getComputedStyle(c).display!=='none').length,edge:Array.from(document.querySelectorAll('#board .edge-file,#board .edge-rank')).filter(c=>getComputedStyle(c).display!=='none').length}));
  ok(mode==='edges'?vis.coord===0&&vis.edge===16:vis.coord===64&&vis.edge===0,'notation '+mode+' '+JSON.stringify(vis));}
console.log('Presets');
await nav('settings','accessibility');
for(const name of ['new','intermediate','advanced','expert','master','grandmaster']){
  let before=await page.evaluate(()=>window.academyTest.getProfile().rating);
  await page.selectOption('#support-profile',name);await page.click('text=Apply preset');
  let st=await page.evaluate(n=>{let p=chessMatoAppearance.get(),pr=chessMatoAppearance.presets[n];return {match:Object.entries(pr).every(([k,v])=>p[k]===v),preset:p.preset,dl:document.documentElement.dataset.legal,rating:window.academyTest.getProfile().rating,saved:JSON.parse(localStorage.getItem('chessmato-display-v1')).preset,hover:$('preview').checked===p.hover}},name);
  ok(st.match&&st.preset===name&&st.saved===name&&st.rating===before&&st.hover,'preset '+name+' applied, saved, rating unchanged');
}
// individual override after a preset
await page.check('#show-legal');ok(await page.evaluate(()=>chessMatoAppearance.get().legal===true&&chessMatoAppearance.get().preset==='grandmaster'),'individual option overrides preset');
await page.click('text=Restore appearance defaults');
console.log('Contrast');
await nav('settings','board');
async function contrastAll(label){let r=await page.evaluate(()=>Array.from(document.querySelectorAll('#board .sq')).map(b=>({s:b.dataset.s,ratio:Number(b.dataset.letterContrast),outline:b.dataset.letterOutline,bg:getComputedStyle(b).backgroundColor,cls:b.className})));let bad=r.filter(x=>!(x.ratio>=4.5||(x.ratio>=3&&x.outline==='true')));ok(bad.length===0&&r.length===64,label+': every square readable'+(bad.length?' '+JSON.stringify(bad.slice(0,3)):''));
  // verify recorded ratio matches actual current background (detect stale recolor)
  let stale=await page.evaluate(()=>{const rgb=s=>s.match(/[0-9.]+/g).slice(0,3).map(Number);return Array.from(document.querySelectorAll('#board .sq')).filter(b=>{let ink=rgb(getComputedStyle(b).getPropertyValue('--tile-ink'));let r=chessMatoAppearance.ink(rgb(getComputedStyle(b).backgroundColor),[0,0,0]);let L=c=>{let a=c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};let bg=rgb(getComputedStyle(b).backgroundColor);let ratio=(Math.max(L(ink),L(bg))+.05)/(Math.min(L(ink),L(bg))+.05);return ratio<3}).map(b=>b.dataset.s+' '+getComputedStyle(b).backgroundColor)});ok(stale.length===0,label+': ink matches current background '+JSON.stringify(stale.slice(0,4)))}
await contrastAll('default board');
let defaults=await page.evaluate(()=>{let l=document.querySelector('#board .sq.light'),d=document.querySelector('#board .sq.dark');return {light:getComputedStyle(l).getPropertyValue('--tile-ink'),dark:getComputedStyle(d).getPropertyValue('--tile-ink'),lbg:getComputedStyle(l).backgroundColor,dbg:getComputedStyle(d).backgroundColor}});
ok(defaults.lbg==='rgb(216, 223, 206)'&&defaults.dbg==='rgb(119, 145, 130)','default light/green board colors unchanged '+JSON.stringify(defaults));
ok(defaults.dark.replace(/ /g,'').includes('255,255,255'),'green squares get white labels');
ok(!defaults.light.replace(/ /g,'').includes('255,255,255'),'light squares get dark labels '+defaults.light);
await page.check('#contrast-board');await contrastAll('high-contrast board');await page.uncheck('#contrast-board');
// Guides (yellow) via puzzle guide button
await page.evaluate(()=>chessUITest.navigate('puzzles','solve'));
await page.click('#puzzle-guide');await contrastAll('puzzle guide shown');
let g=await page.evaluate(()=>{let m=openingCoachTest.guide();return m&&{from:m.from,to:m.to}});
await page.click(`#board [data-s="${g.from}"]`);await contrastAll('guide source+destination');
ok(await page.evaluate(g=>document.querySelector(`[data-s="${g.from}"]`).classList.contains('guide-piece')&&document.querySelector(`[data-s="${g.to}"]`).classList.contains('guide-destination'),g),'staged guide shows source then destination');
// king in check
await page.evaluate(()=>{$('fen').value='4k3/8/8/8/8/8/4r3/4K3 w - - 0 1';$('loadfen').click()});await contrastAll('king in check');
ok(await page.evaluate(()=>!!document.querySelector('.sq.king-check')),'checked king highlighted');
// Letters piece set on all states
await nav('settings','board');await page.selectOption('#piece-choice','letters');await contrastAll('letter pieces');await page.selectOption('#piece-choice','cburnett');await nav('openings','practice');
// Opening guides
await page.evaluate(()=>openingCoachTest.startOpening('italian'));await contrastAll('opening guide');
await page.click('#board [data-s="e2"]');await contrastAll('opening guide selected');
console.log('Preview immutability');
await page.evaluate(()=>{$('mode').value='free';$('mode').dispatchEvent(new Event('change'))});
await nav('positions','manual');let f0=await page.evaluate(()=>game.fen());
for(const s of ['e2','g8','b1','d8','e7']){await page.hover(`#board [data-s="${s}"]`)}
await page.hover('#board [data-s="g1"]');
ok(await page.evaluate(()=>{let b=document.querySelector('[data-s="g1"]');return b.matches(':hover')&&getComputedStyle(b).backgroundColor==='rgb(119, 145, 130)'}),'hovered square keeps its board color (labels stay readable)');
ok(await page.evaluate(()=>{let b=document.querySelector('[data-s="e1"]');return Number(getComputedStyle(b.querySelector('.coord')).zIndex)>Number(getComputedStyle(b.querySelector('.piece')).zIndex)}),'labels draw above pieces on occupied squares');
await page.mouse.move(5,5);
ok(await page.evaluate(f=>game.fen()===f,f0),'hovering pieces of both colors leaves the position unchanged');
console.log('Keyboard');
async function keyboardMove(flip){
  await page.evaluate(f=>{$('mode').value='free';$('mode').dispatchEvent(new Event('change'));flipped=f;render()},flip);
  await page.focus('#board [data-s="e2"]');
  await page.keyboard.press('Enter');
  ok(await page.evaluate(()=>selected==='e2'),(flip?'flipped':'normal')+': Enter selects e2');
  // e2 -> e4 means moving "up" two squares visually in normal orientation, down when flipped
  let key=flip?'ArrowDown':'ArrowUp';await page.keyboard.press(key);await page.keyboard.press(key);
  ok(await page.evaluate(()=>document.activeElement.dataset.s),(flip?'flipped':'normal')+': focus after arrows = '+await page.evaluate(()=>document.activeElement.dataset.s));
  await page.keyboard.press('Enter');
  ok(await page.evaluate(()=>game.history().join(' ')==='e4'),(flip?'flipped':'normal')+': keyboard played e4 ('+await page.evaluate(()=>game.history().join(' '))+')');
  ok(await page.evaluate(()=>document.activeElement&&document.activeElement.dataset.s==='e4'),'focus stays on destination');
  await page.keyboard.press('Home');ok(await page.evaluate(f=>document.activeElement.dataset.s===(f?'h4':'a4'),flip),'Home goes to row start');
  await page.keyboard.press('End');ok(await page.evaluate(f=>document.activeElement.dataset.s===(f?'a4':'h4'),flip),'End goes to row end');
  let tabbable=await page.evaluate(()=>Array.from(document.querySelectorAll('#board .sq')).filter(b=>b.tabIndex===0).length);ok(tabbable===1,'roving tabindex: one tabbable square ('+tabbable+')');
  await page.focus('#board [data-s="g8"]');await page.keyboard.press('Enter');await page.keyboard.press('Escape');ok(await page.evaluate(()=>selected===null),'Escape clears selection');
}
await keyboardMove(false);await keyboardMove(true);
console.log('Gary panel');
await page.click('#gary-minimize');
ok(await page.evaluate(()=>document.querySelector('.mentor-card').classList.contains('mentor-folded')&&$('gary-minimize').getAttribute('aria-expanded')==='false'),'Gary minimizes to a bar');
await page.reload();await page.waitForFunction(()=>window.chessMatoAppearance);
ok(await page.evaluate(()=>document.querySelector('.mentor-card').classList.contains('mentor-folded')),'minimized state persists after reload');
await page.click('#gary-minimize');ok(await page.evaluate(()=>!document.querySelector('.mentor-card').classList.contains('mentor-folded')),'Gary bar reopens');
console.log('Theme');
let th=await page.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,h1:getComputedStyle($('view-title')).color,shadow:getComputedStyle($('view-title')).textShadow}));
ok(th.bg==='rgb(255, 99, 71)','tomato-red background '+th.bg);ok(th.h1==='rgb(255, 245, 220)'&&/rgb\(59, 42, 34\)/.test(th.shadow),'ivory heading with dark outline');
console.log('Settings persistence');
await nav('settings','board');
await page.selectOption('#piece-choice','merida');await page.reload();await page.waitForFunction(()=>window.chessMatoAppearance);
ok(await page.evaluate(()=>chessMatoAppearance.get().pieces==='merida'&&!!document.querySelector('#board img[src^="pieces/merida"]')),'piece choice persists');
await page.evaluate(()=>{localStorage.setItem('chessmato-display-v1','{"pieces":"bogus","pieceSize":"x","labels":"yes"}')});await page.reload();await page.waitForFunction(()=>window.chessMatoAppearance);
ok(await page.evaluate(()=>{let p=chessMatoAppearance.get();return p.pieces==='cburnett'&&p.pieceSize===84&&p.labels===true}),'corrupt display settings are sanitized');
ok(errors.length===0,'no JS errors during session '+JSON.stringify(errors));
await ctx.close();
console.log('Mobile');
({ctx,page,errors}=await fresh({width:390,height:844}));
for(const v of ['play','openings','puzzles','minigames','lessons','progress','profile','coach','positions','settings']){await page.evaluate(v=>chessUITest.navigate(v),v);let o=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ok(o<=0,'mobile '+v+': no horizontal overflow ('+o+')')}
ok(await page.evaluate(()=>getComputedStyle($('gary-minimize')).display!=='none'),'Gary bar visible on mobile');
ok(errors.length===0,'mobile no JS errors');
await ctx.close();
await browser.close();
console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
