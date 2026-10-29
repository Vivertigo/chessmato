// Roadmap features: mixed opening practice, pre-move blunder check, resignation review.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await (await browser.newContext({viewport:{width:1300,height:950}})).newPage();const errors=[];await page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}try{localStorage.setItem('chessmato-tour-v1','done')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.openingCoachTest);
console.log('Mixed opening practice');
let names=new Set;
for(const side of ['b','w','b','w','b']){
  await page.evaluate(side=>{chessUITest.navigate('openings','practice');$('opening-side').value=side;$('opening-side').dispatchEvent(new Event('change'));$('opening-line').value='mixed';$('opening-start').click()},side);
  for(let i=0;i<20;i++){let m=await page.evaluate(()=>{let a=openingCoachTest.getActive();if(!a||a.finished)return null;let e=openingCoachTest.expected();return e&&{from:e.from,to:e.to}});if(!m)break;await page.click(`#board [data-s="${m.from}"]`);await page.click(`#board [data-s="${m.to}"]`)}
  let st=await page.evaluate(()=>({open:document.querySelector('.coach-modal').open,title:$('coach-result-title').textContent,name:openingCoachTest.getStats().sessions.slice(-1)[0].name}));
  ok(st.open&&/complete/i.test(st.title)&&/^Mixed/.test(st.name),'mixed '+side+' session completes: '+st.name);names.add(st.name);
  await page.evaluate(()=>{document.querySelector('.coach-modal').close()});
}
ok(names.size>=2,'mixed sessions reached different lines ('+names.size+')');
console.log('Blunder check');
await page.evaluate(()=>{chessUITest.navigate('play','game');$('premove-check').checked=true;$('premove-check').dispatchEvent(new Event('change'));academyCoach.startBotFrom('4k3/8/8/8/8/2n5/8/3QK3 w - - 0 1','w')});
await page.waitForFunction(()=>/Your turn/.test($('botstate').textContent),null,{timeout:60000});
let f0=await page.evaluate(()=>game.fen());
await page.click('#board [data-s="d1"]');await page.click('#board [data-s="e2"]');
let dl=await page.evaluate(()=>({open:$('premove-dialog').open,body:$('premove-body').textContent}));
ok(dl.open&&/queen on e2 can be taken by a cheaper piece/.test(dl.body),'warns before Qe2: '+dl.body.slice(0,90));
await page.click('#premove-back');ok(await page.evaluate(f=>game.fen()===f&&!$('premove-dialog').open,f0),'Take it back leaves the position unchanged');
await page.click('#board [data-s="d1"]');await page.click('#board [data-s="d4"]');
ok(await page.evaluate(()=>!$('premove-dialog').open&&game.history().length>=1),'safe move Qd4 plays without a warning');
await page.waitForFunction(()=>/Your turn/.test($('botstate').textContent)&&game.history().length===2,null,{timeout:60000});
ok(await page.evaluate(()=>!$('premove-panel-box').hidden&&/Before you move/.test($('premove-panel-box').textContent)),'checks/captures/threats panel shown on your turn');
ok(/practice game/i.test(await page.evaluate(()=>$('description').textContent)),'play-on game is labelled as practice');
console.log('Resignation review');
let r0=await page.evaluate(()=>academyTest.getProfile().rating);
await page.click('#resign');let rv=await page.evaluate(()=>({open:$('resign-dialog').open,body:$('resign-body').textContent}));
ok(rv.open&&/Material/.test(rv.body)&&/Engine estimate/.test(rv.body),'review shows material and engine estimate: '+rv.body.slice(0,160));
await page.click('#resign-keep');ok(await page.evaluate(()=>!!academyCoach.botSide()),'Keep playing continues the game');
await page.click('#resign');await page.click('#resign-confirm');await page.waitForTimeout(300);
ok(await page.evaluate(()=>!academyCoach.botSide()&&chessMatoTraining.get().resigns.length>=1),'Resign ends the game and saves the position');
ok(await page.evaluate(r=>academyTest.getProfile().rating===r,r0),'practice game resignation does not change rating');
await page.evaluate(()=>{let m=document.querySelector('.feedback-modal');if(m.open)$('resultokay').click();chessUITest.navigate('profile','resign')});
ok(await page.isVisible('#panel-profile-resign .resign-row button'),'profile lists resigned position with Play on');
await page.click('#panel-profile-resign .resign-row button');
await page.waitForFunction(()=>/Your turn/.test($('botstate').textContent),null,{timeout:60000});
ok(await page.evaluate(()=>!!academyCoach.botSide()&&game.history().length===0),'Play on starts a bot game from the saved position');
await page.click('#stopbot');
console.log('Missed forcing move -> personal puzzle');
await page.evaluate(()=>chessMatoOnScoredMove({fenBefore:'6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',move:{san:'h3'},kudos:10,loss:900,suggestion:'a1a8',assisted:false}));
let mine=await page.evaluate(()=>data.drills.find(d=>d.id.startsWith('mine-')));ok(mine&&mine.line[0]==='Ra8#'&&mine.tags.includes('from your games'),'missed mate saved as a puzzle from your game');
await page.evaluate(()=>chessMatoOnScoredMove({fenBefore:'6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',move:{san:'h3'},kudos:10,loss:900,suggestion:'a1a8',assisted:false}));
ok(await page.evaluate(()=>data.drills.filter(d=>d.id.startsWith('mine-')).length===1),'no duplicate personal puzzle');
console.log('Endgame upkeep & profile');
let pe=await page.evaluate(()=>{let e=data.drills.find(d=>d.tags.includes('endgame')||d.tags.includes('promotion')),n=data.drills.find(d=>!(d.tags.includes('endgame')||d.tags.includes('promotion'))&&!d.tags.includes('from your games'));chessMatoTraining.get().sinceEndgame=0;let a=priority(e)-priority(n);chessMatoTraining.get().sinceEndgame=9;let b=priority(e)-priority(n);return {a,b}});
ok(pe.b-pe.a>=50,'endgame puzzles rise after a run of other puzzles ('+JSON.stringify(pe)+')');
await page.evaluate(()=>chessUITest.navigate('profile','growth'));await page.click('#section-profile-growth');
let g=await page.evaluate(()=>$('panel-profile-growth').textContent);ok(/Blunder check/.test(g)&&/Warnings shown: [1-9]/.test(g)&&/Next steps/.test(g),'Measured progress shows blunder-check stats and next steps');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
