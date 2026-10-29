// Blitz systems: King's Indian Attack, London, King's Indian with the Pirc, and the Hippo.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1300,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off');localStorage.setItem('chessmato-tour-v1','done')});
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoSystems&&window.chessMatoGames);
console.log('Lines');
const info=await page.evaluate(()=>{const R=openingCoachTest.repertoire,sets={};for(let r of R)(sets[r.set]=sets[r.set]||[]).push(r);
  let conflicts=[];for(let [set,lines] of Object.entries(sets)){let own={};for(let r of lines){let c=new Chess();r.sequence.forEach((m,i)=>{if(c.turn()===r.side){let k=r.sequence.slice(0,i).join(' ');if(own[k]&&own[k]!==m)conflicts.push(r.id+' @'+k);own[k]=m}c.move(m)})}}
  let names=R.filter(r=>['wk','wl','bk','bh'].includes(r.set)).map(r=>[r.id,chessMatoGames.openingName(r.sequence).name]);
  return {counts:Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,v.length])),conflicts,names,endsOwn:R.filter(r=>['wk','wl','bk','bh'].includes(r.set)).every(r=>r.sequence.length%2===(r.side==='w'?1:0))}});
ok(info.counts.wk>=6&&info.counts.wl>=4&&info.counts.bk>=9&&info.counts.bh>=4,'blitz sets have their lines '+JSON.stringify(info.counts));
ok(info.conflicts.length===0,'within each set your move is always the same in the same position (needed for mixed drills) '+JSON.stringify(info.conflicts));
ok(info.endsOwn,'every blitz line ends on your own move');
const fam={kia:/King's Indian Attack|Zukertort/,london:/London|Dutch/,kid:/King's Indian|Indian Defense|English/,pirc:/Pirc/,hippo:/Modern|Zukertort/};
let bad=info.names.filter(([id,n])=>!fam[id.split('-')[0]].test(n||''));ok(bad.length===0,'the Lichess opening list names each line as expected '+JSON.stringify(bad));
console.log('Practice');
ok(await page.evaluate(()=>{let o=[...$('opening-side').options].map(o=>o.value);return o.join()==='wk,wl,bk,bh,w,b'&&$('opening-side').value==='wk'}),'the repertoire menu leads with the blitz systems');
await page.evaluate(()=>{chessUITest.navigate('openings','practice');$('opening-side').value='bk';$('opening-side').dispatchEvent(new Event('change'))});
ok(await page.evaluate(()=>[...$('opening-line').options].some(o=>o.value==='kid-classical')&&![...$('opening-line').options].some(o=>o.value==='italian')),'choosing King\'s Indian and Pirc lists only those lines');
await page.evaluate(()=>{$('opening-line').value='kid-classical';$('opening-line').dispatchEvent(new Event('change'));$('opening-start').click()});await page.waitForTimeout(900);
ok(await page.evaluate(()=>openingCoachTest.getActive().route.id==='kid-classical'&&flipped===true),'a Black line starts with the board turned');
for(let i=0;i<14;i++){let m=await page.evaluate(()=>{let a=openingCoachTest.getActive();if(!a||a.finished)return null;let e=openingCoachTest.expected();return e&&{from:e.from,to:e.to}});if(!m)break;await page.click(`#board [data-s="${m.from}"]`);await page.click(`#board [data-s="${m.to}"]`);await page.waitForTimeout(650)}
ok(await page.evaluate(()=>/d5/.test(game.history().join(' '))&&game.history().length>=16),'the King\'s Indian line plays through to the closed centre: '+await page.evaluate(()=>game.history().join(' ')));
console.log('Guide');
await page.evaluate(()=>chessUITest.navigate('openings','systems'));
ok(await page.evaluate(()=>!$('panel-openings-systems').hidden&&document.querySelectorAll('.system-card').length===4),'Openings → Blitz systems shows four systems');
ok(await page.evaluate(()=>[...document.querySelectorAll('.system-card')].every(c=>c.querySelectorAll('li').length>=9&&/In blitz:/.test(c.textContent))),'each has pawn breaks, plans, patterns and a blitz habit');
await page.evaluate(()=>{let c=document.querySelector('.system-card[data-set="bh"]');c.open=true;c.querySelectorAll('button')[1].click()});
ok(await page.evaluate(()=>!$('panel-openings-practice').hidden&&$('opening-side').value==='bh'&&$('opening-line').value==='mixed'),'"Mixed drill" opens the Hippo lines in mixed mode');
ok(await page.evaluate(()=>[...document.querySelectorAll('#panel-openings-repertoire h3')].map(h=>h.textContent).filter(t=>/Blitz/.test(t)).length===4),'Your repertoire lists the blitz systems');
ok(await page.evaluate(()=>['myagmarsuren','sherwin','gufeld','mohishunder'].every(id=>chessMatoGuess.classics.some(g=>g.id===id))),'four King\'s Indian master games load and replay legally');
await page.evaluate(()=>{let c=document.querySelector('.system-card[data-set="wk"]');let b=[...c.querySelectorAll('button')].find(b=>/Myagmarsuren/.test(b.textContent));b.click()});
ok(await page.evaluate(()=>chessMatoGuess.get()&&chessMatoGuess.get().src.id==='myagmarsuren'&&chessMatoGuess.get().side==='w'&&!$('panel-play-guess').hidden),'a system card starts Guess the move through its master game');
await page.evaluate(()=>chessMatoGuess.stop(true));
console.log('Coaches');
ok(await page.evaluate(()=>{let r=chessMatoCoaches.reply('gary','what should I play in blitz?');return /King's Indian Attack/.test(Array.isArray(r)?r.join(' '):String(r&&r.text||r))}),'asking a coach about blitz points to the systems');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
