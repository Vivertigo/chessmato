// Rules, engine and interaction checks in a real browser. Needs the local server for the engine.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1300,height:950}});const page=await ctx.newPage();const errors=[];page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoAppearance);
console.log('Rules');
let r=await page.evaluate(()=>{const C=workshopTest.Chess;function perft(c,d){if(!d)return 1;let n=0;for(let m of c.moves()){c.move(m);n+=perft(c,d-1);c.undo()}return n}
let out={};out.perft3=perft(new C(),3);
let c=new C('4k3/8/8/8/8/8/4q3/4K3 w - - 0 1');out.escape=c.moves().sort().join(',');
c=new C('3rk3/8/8/8/8/8/8/R3K2R w KQ - 0 1');out.castleThroughCheck=c.moves().includes('O-O-O')+'/'+c.moves().includes('O-O');
c=new C('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');out.ep=c.moves().includes('exd6');
c=new C('8/P7/8/8/8/8/8/k1K5 w - - 0 1');out.under=['a8=Q','a8=R','a8=B','a8=N'].every(m=>c.moves().map(x=>x.replace(/[+#]/,'')).includes(m));
c=new C('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');out.stalemate=c.in_stalemate();
c=new C('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1');c.move('Re8#');out.mate=c.in_checkmate();
c=new C('4k3/8/8/8/1b6/8/3N4/R3K2r w - - 0 1');out.double=c.moves().join(',');
return out});
ok(r.perft3===8902,'perft(3)=8902');ok(r.castleThroughCheck==='false/true','cannot castle through check');ok(r.ep,'en passant');ok(r.under,'all promotions');ok(r.stalemate,'stalemate detected');ok(r.mate,'checkmate detected');
console.log('Puzzle flow');
await page.evaluate(()=>chessUITest.navigate('puzzles','solve'));
let pz=await page.evaluate(()=>({id:current.id,line:current.line}));
let m=await page.evaluate(()=>{let c=new workshopTest.Chess(game.fen());return c.move(current.line[0])});
await page.click(`#board [data-s="${m.from}"]`);await page.click(`#board [data-s="${m.to}"]`);
await page.waitForTimeout(800);
let modal=await page.evaluate(()=>({open:document.querySelector('.feedback-modal').open,title:$('resulttitle').textContent,id:current.id}));
ok(modal.open&&/won|complete|solved/i.test(modal.title),'correct answer shows result: '+modal.title);
await page.waitForTimeout(1500);ok(await page.evaluate(id=>current.id===id,pz.id),'no auto-advance while result is open');
await page.click('#resultokay');ok(await page.evaluate(id=>current.id!==id,pz.id),'Okay advances to the next puzzle');
// miss flow
let wrong=await page.evaluate(()=>{let c=new workshopTest.Chess(game.fen()),e=c.move(current.line[0]);c.undo();return c.moves({verbose:true}).find(x=>x.from!==e.from||x.to!==e.to)});
let id2=await page.evaluate(()=>current.id);
await page.click(`#board [data-s="${wrong.from}"]`);await page.click(`#board [data-s="${wrong.to}"]`);
if(wrong.flags.includes('p'))await page.click('[data-prom="q"]');
ok(await page.evaluate(()=>document.querySelector('.coach-modal').open&&/missed/i.test($('coach-result-title').textContent)),'wrong legal answer shows miss explanation');
await page.click('#coach-okay');ok(await page.evaluate(id=>current.id!==id,id2),'Okay after miss advances');
if(!BASE.startsWith('file:')){
console.log('Engine');
await page.evaluate(()=>chessUITest.navigate('play','game'));
await page.selectOption('#botside','w');await page.click('#startbot');
await page.waitForFunction(()=>/Your turn/.test($('botstate').textContent),null,{timeout:60000});
await page.click('#board [data-s="e2"]');await page.click('#board [data-s="e4"]');
await page.waitForFunction(()=>game.history().length===2&&/Your turn/.test($('botstate').textContent),null,{timeout:60000});
ok(/Kudos/.test(await page.evaluate(()=>$('kudos').textContent)),'engine replied and move received Kudos: '+await page.evaluate(()=>$('kudos').textContent));
await page.click('#stopbot');
}
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
