// Hikaru Nakamura model games and key-moment puzzles in the blitz systems.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1300,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off');localStorage.setItem('chessmato-tour-v1','done')});
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoSystems&&window.chessMatoPuzzles);
console.log('Model games');
const mg=await page.evaluate(()=>{let G=window.CHESSMATO_MODEL_GAMES,per={},bad=[];for(let g of G){per[g.set]=(per[g.set]||0)+1;let c=new Chess();for(let m of g.moves.split(' '))if(!c.move(m)){bad.push(g.id);break}
  let hero=g.side==='w'?g.white:g.black;if(hero!=='Hikaru Nakamura'||g.result!==(g.side==='w'?'1-0':'0-1'))bad.push(g.id+' not his win')}return {n:G.length,per,bad,loaded:chessMatoGuess.models.length}});
ok(mg.n>=30&&mg.per.wk&&mg.per.wl&&mg.per.bk&&mg.per.bh,'model games cover all four systems '+JSON.stringify(mg.per));
ok(mg.bad.length===0&&mg.loaded===mg.n,'every model game replays legally and is a Nakamura win '+JSON.stringify(mg.bad));
ok(await page.evaluate(()=>{let g=[...document.querySelectorAll('#guess-game optgroup')].find(o=>o.label==='Hikaru Nakamura model games');return g&&g.children.length===CHESSMATO_MODEL_GAMES.length}),'Guess the move lists them in their own group');
await page.evaluate(()=>{chessUITest.navigate('openings','systems');let c=document.querySelector('.system-card[data-set="bk"]');c.open=true;c.querySelector('.model-list button').click()});
ok(await page.evaluate(()=>{let G=chessMatoGuess.get();return G&&G.src.group==='Hikaru Nakamura model games'&&G.side==='b'&&!$('panel-play-guess').hidden}),'a system card starts his game from his side (Black in the King\'s Indian)');
await page.evaluate(()=>chessMatoGuess.stop(true));
const lineId=await page.evaluate(()=>CHESSMATO_MODEL_GAMES.find(g=>g.line).line);
await page.evaluate(id=>{chessUITest.navigate('openings','practice');let r=openingCoachTest.repertoire.find(r=>r.id===id);$('opening-side').value=r.set;$('opening-side').dispatchEvent(new Event('change'));$('opening-line').value=id;$('opening-line').dispatchEvent(new Event('change'))},lineId);
ok(await page.evaluate(()=>/^Model game: .*Hikaru Nakamura/.test($('opening-model').textContent)&&!!$('opening-model').querySelector('button')),'Openings → Practice names a model game for the line ('+lineId+')');
console.log('Key moments');
const kp=await page.evaluate(()=>{let M=CHESSMATO_MODEL_PUZZLES,ds=data.drills.filter(d=>d.id.startsWith('hn-')),bad=[];for(let p of M){let c=new Chess(p.fen);for(let m of p.line)if(!c.move(m)){bad.push(p.id);break}}
  return {n:M.length,drills:ds.length,tagged:ds.every(d=>d.tags.includes('nakamura')&&/From .*Nakamura/.test(d.description)),bad,info:($('model-pack-info')||{}).textContent||''}});
ok(kp.n>=10&&kp.drills===kp.n,'key-moment puzzles join the puzzle collection ('+kp.n+')');
ok(kp.bad.length===0,'every solution line is legal');
ok(kp.tagged,'each says which game it came from');
ok(/key moments from Hikaru Nakamura/.test(kp.info),'the Practice queue explains the source');
await page.evaluate(()=>{chessUITest.navigate('puzzles','solve');load(data.drills.find(d=>d.id.startsWith('hn-')&&d.line.length===1))});
let mv=await page.evaluate(()=>{let c=new Chess(current.fen),m=c.move(current.line[0]);return {from:m.from,to:m.to}});
await page.click(`#board [data-s="${mv.from}"]`);await page.click(`#board [data-s="${mv.to}"]`);await page.waitForTimeout(400);
ok(await page.evaluate(()=>document.querySelector('.feedback-modal').open&&/won/i.test($('resulttitle').textContent)&&/Hikaru Nakamura played/.test(chessMatoExplain(current))),'solving one names the move he played and the game');
await page.click('#resultokay');
ok(await page.evaluate(()=>!!data.progress[current.id]||Object.keys(data.progress).some(k=>k.startsWith('hn-'))),'the result is recorded like any other puzzle');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
