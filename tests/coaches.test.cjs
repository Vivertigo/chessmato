// Offline coach chats: replies come from local rules/data only.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1300,height:950}});const page=await ctx.newPage();const errors=[],external=[];
const origin=BASE.startsWith('file:')?'file:':new URL(BASE).origin;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{let u=r.url();if(!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'))external.push(u)});
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoCoaches);
await page.evaluate(()=>localStorage.removeItem('chessmato-coach-chats-v1'));await page.reload();await page.waitForFunction(()=>window.chessMatoCoaches);
const lastMsg=id=>page.evaluate(id=>{let m=Array.from(document.querySelectorAll(`#panel-coach-${id} .chat-msg`));return {n:m.length,who:m[m.length-1].querySelector('b').textContent,text:m[m.length-1].textContent}},id);
for(const id of ['gary','claudia']){
  await page.evaluate(id=>chessUITest.navigate('coach',id),id);
  ok(await page.isVisible(`#panel-coach-${id} .coach-chat-log`),id+': chat panel visible');
  ok(await page.isVisible('#board'),id+': board visible beside chat');
  await page.fill(`#chat-input-${id}`,'what should I work on?');await page.press(`#chat-input-${id}`,'Enter');
  let last=await lastMsg(id);
  ok(last.n===3&&last.who===(id==='gary'?'Gary Bendt':'Claudia Herman'),id+': reply attributed to '+last.who);
  ok(/opening/i.test(last.text),id+': focus answer mentions openings');
  await page.click(`#panel-coach-${id} .chat-chips button:has-text("Check this position")`);
  ok(/Material/.test((await lastMsg(id)).text),id+': position chip answers from the board');
}
console.log('Position scan');
const report=fen=>page.evaluate(fen=>{$('fen').value=fen;$('loadfen').click();return chessMatoCoaches.positionReport().facts.join('\n')},fen);
let rep=await report('r3k3/8/8/3q4/8/2N5/8/R3K3 w - - 0 1');
ok(/Their possible checks:/.test(rep)&&/Qe5\+|Qe4\+|Qd1\+|Qd2\+/.test(rep),'lists opponent checks');
ok(/Captures that land on an unattacked square: .*Nxd5/.test(rep),'finds free capture Nxd5');
ok(/Material.*(level|down|up)/.test(rep),'material line');
ok(/Checkmate is available: Ra8#/.test(await report('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1')),'spots mate in one');
ok(/Ra1# would be checkmate/.test(await report('r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1')),'warns about back-rank mate threat');
ok(/In danger right now: queen on d1/.test(await report('4k3/8/8/8/8/8/1n6/3QK3 w - - 0 1')),'flags queen attacked by cheaper knight');
ok(/You are in check/.test(await report('4k3/8/8/8/8/5n2/8/3QK3 w - - 0 1')),'in-check warning');
let f=await page.evaluate(()=>game.fen());await page.evaluate(()=>chessMatoCoaches.positionReport());ok(await page.evaluate(f=>game.fen()===f,f),'scan does not change the live position');
console.log('Persistence & offline');
await page.reload();await page.waitForFunction(()=>window.chessMatoCoaches);
ok(await page.evaluate(()=>chessMatoCoaches.getLogs().gary.length>=5&&chessMatoCoaches.getLogs().claudia.length>=5),'chat history persists');
await page.click('#gary-chat-open');ok(await page.evaluate(()=>chessUITest.getState().section==='gary'),'Gary card opens his chat');
ok(external.length===0,'no requests leave the local app '+JSON.stringify(external.slice(0,3)));
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await ctx.setOffline(true);await page.click(`#panel-coach-gary .chat-chips button:has-text("My progress")`);ok(/Training rating/.test((await lastMsg('gary')).text),'answers while offline');
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
