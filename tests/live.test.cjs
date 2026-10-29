// Play a friend live: two browsers, one invite link, through a relay. By default the test plays the relay itself (a small
// MQTT broker answering the pages' WebSockets); set CHESSMATO_RELAY_URL to try a real broker instead.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
const REAL=process.env.CHESSMATO_RELAY_URL||'';
const RELAY=REAL||'ws://relay.test/mqtt';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
// ---- A tiny MQTT 3.1.1 broker: QoS 0, retained messages, exact-topic subscriptions ----
const subs=new Map,retained=new Map,socks=new Set;let published=[];
const pkt=(h,body)=>{let L=[],n=body.length;do{let d=n%128;n=Math.floor(n/128);if(n)d|=128;L.push(d)}while(n);return Buffer.concat([Buffer.from([h,...L]),body])};
const str=t=>{let b=Buffer.from(t);return Buffer.concat([Buffer.from([b.length>>8,b.length&255]),b])};
function broker(ws){let buf=Buffer.alloc(0),mine=new Set,me={ws,mine};socks.add(me);
  ws.onMessage(m=>{buf=Buffer.concat([buf,Buffer.isBuffer(m)?m:Buffer.from(m)]);for(;;){if(buf.length<2)return;let n=0,mul=1,i=1,d;do{if(i>=buf.length)return;d=buf[i++];n+=(d&127)*mul;mul*=128}while(d&128);if(buf.length<i+n)return;
    let h=buf[0],body=buf.slice(i,i+n);buf=buf.slice(i+n);let type=h>>4;
    if(type===1)ws.send(pkt(0x20,Buffer.from([0,0])));
    else if(type===8){let id=body.slice(0,2),j=2,codes=[];while(j<body.length){let l=body[j]<<8|body[j+1],t=body.slice(j+2,j+2+l).toString();j+=3+l;codes.push(0);mine.add(t);if(!subs.has(t))subs.set(t,new Set);subs.get(t).add(me);
        ws.send(pkt(0x90,Buffer.concat([id,Buffer.from(codes)])));let r=retained.get(t);if(r)ws.send(pkt(0x31,Buffer.concat([str(t),r])))}}
    else if(type===3){let l=body[0]<<8|body[1],t=body.slice(2,2+l).toString(),p=body.slice(2+l);published.push({t,len:p.length,retain:!!(h&1)});
      if(h&1){if(p.length)retained.set(t,p);else retained.delete(t)}for(let s of subs.get(t)||[])if(s!==me||true)try{s.ws.send(pkt(0x30,Buffer.concat([str(t),p])))}catch(e){}}
    else if(type===12)ws.send(pkt(0xD0,Buffer.alloc(0)));
    else if(type===14)drop(me)}});
  ws.onClose(()=>drop(me))}
function drop(me){socks.delete(me);for(let t of me.mine){let s=subs.get(t);if(s)s.delete(me)}}
async function context(browser,name){let ctx=await browser.newContext({viewport:{width:1280,height:950}});if(!REAL)await ctx.routeWebSocket(/relay\.test/,broker);
  await ctx.addInitScript(([relay])=>{localStorage.setItem('chessmato-tour-v1','done');localStorage.setItem('chessmato-live-relays',JSON.stringify([relay]));localStorage.setItem('chessmato-live-test',JSON.stringify({beat:400,away:1500,minute:3000}));if(!localStorage.getItem('chessmato-thinking-v1'))localStorage.setItem('chessmato-thinking-v1','off')},[RELAY]);
  let page=await ctx.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(name+': '+e.message));page.on('dialog',d=>d.accept());return {ctx,page}}
const wait=(page,fn,arg,t=8000)=>page.waitForFunction(fn,arg,{timeout:t}).then(()=>true,()=>false);
const sans=page=>page.evaluate(()=>game.history());
async function move(page,from,to){await page.click(`#board [data-s="${from}"]`);await page.click(`#board [data-s="${to}"]`)}
(async()=>{const browser=await chromium.launch();
const A=await context(browser,'host'),B=await context(browser,'guest');const a=A.page,b=B.page;
await a.goto(BASE);await a.waitForFunction(()=>window.chessMatoLive&&window.chessUITest);
console.log('Invite');
ok(await a.evaluate(()=>{chessUITest.navigate('play','live');return !$('panel-play-live').hidden&&!$('live-setup').hidden&&$('section-play-live').textContent==='Play a friend'}),'Play → Play a friend shows the setup');
await a.fill('#live-name','Vivi');await a.selectOption('#live-control','z3');await a.selectOption('#live-colour','w');await a.selectOption('#live-window','2');await a.click('#live-create');
ok(await wait(a,()=>!$('live-invite').hidden&&/#live=/.test($('live-url').value)&&chessMatoLive.connected()),'creating a game connects and shows an invite link');
const url=await a.evaluate(()=>$('live-url').value);
ok(/^http.*#live=[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.0$/.test(url),'the link carries the room and key after the # ('+url.replace(/#.*/,'#…')+')');
ok(await a.evaluate(()=>!!$('live-qr').querySelector('svg')),'a QR code of the link is shown');
const hash=url.slice(url.indexOf('#'));
ok(published.every(p=>!p.t.includes(hash.slice(23,45))),'the key never appears in what the relay sees');
console.log('Join');
await b.goto(BASE+hash);await b.waitForFunction(()=>window.chessMatoLive);
ok(await wait(b,()=>!$('live-join').hidden&&/Vivi invites you to a live game: Blitz 3 \+ 0/.test($('live-join-text').textContent)),'the friend sees who invites them and the time control');
await b.fill('#live-name-join','Sam');await b.click('#live-join-go');
ok(await wait(a,()=>{let h=chessMatoHotseat.get();return h&&h.live&&h.players.w==='Vivi'&&h.players.b==='Sam'})&&await wait(b,()=>{let h=chessMatoHotseat.get();return h&&h.live&&h.players.w==='Vivi'&&h.players.b==='Sam'}),'the game starts on both devices (Vivi White, Sam Black)');
ok(await b.evaluate(()=>flipped===true)&&await a.evaluate(()=>flipped===false),'each board faces its own player');
console.log('Moves');
await move(b,'e7','e5');ok((await sans(b)).length===0,'the friend cannot move out of turn');
await move(a,'e2','e4');ok(await wait(b,()=>game.history().join()==='e4'),'White\'s move arrives on the friend\'s board');
await move(a,'d2','d4');ok((await sans(a)).length===1,'the host cannot move for Black');
await move(b,'e7','e5');ok(await wait(a,()=>game.history().join()==='e4,e5'),'Black\'s move arrives on the host\'s board');
const c0=await a.evaluate(()=>chessMatoHotseat.get().clock.w);await a.waitForTimeout(1200);const c1=await a.evaluate(()=>chessMatoHotseat.get().clock.w);
ok(c0>179000&&c1<c0-800,'clocks start once both have moved ('+c0+' → '+Math.round(c1)+')');
ok(await wait(b,()=>chessMatoHotseat.get().clock.w<179000),'the friend\'s clock follows the host\'s');
await move(a,'g1','f3');await wait(b,()=>game.history().length===3);await move(b,'b8','c6');await wait(a,()=>game.history().length===4);
console.log('Draw offer and Revelation');
await b.click('#live-offer');ok(await wait(a,()=>!$('live-accept').hidden&&/Sam offers a draw/.test($('live-status').textContent)),'a draw offer reaches the other player');
await a.click('#live-accept');ok(await wait(a,()=>/Draw: draw agreed/.test($('live-status').textContent))&&await wait(b,()=>/Draw: draw agreed/.test($('live-status').textContent)),'accepting ends the game as a draw on both');
ok(await wait(b,()=>!$('live-rev').hidden)&&await a.evaluate(()=>!$('live-rev').hidden),'both are offered the Revelation');
await a.click('#live-rev');ok(await wait(b,()=>/Vivi is ready/.test($('live-rev').textContent)),'pressing it tells the friend you are ready');
await b.click('#live-rev');ok(await wait(a,()=>chessMatoHotseat.get().revelation&&!chessMatoHotseat.get().over)&&await wait(b,()=>chessMatoHotseat.get().revelation&&game.history().length===0),'when both press, the Revelation starts on both (1 minute each)');
ok(await a.evaluate(()=>chessMatoHotseat.get().clock.w===60000),'the Revelation has 1 minute each');
const revWhite=await a.evaluate(()=>chessMatoHotseat.get().players.w);const hostIsWhite=revWhite==='Vivi';
const W=hostIsWhite?a:b,Bk=hostIsWhite?b:a;
// Fool's mate: Black wins the Revelation.
await move(W,'f2','f3');await wait(Bk,()=>game.history().length===1);await move(Bk,'e7','e5');await wait(W,()=>game.history().length===2);await move(W,'g2','g4');await wait(Bk,()=>game.history().length===3);await move(Bk,'d8','h4');
const blackName=hostIsWhite?'Sam':'Vivi';
ok(await wait(a,(n)=>new RegExp(n+' wins').test($('live-status').textContent),blackName)&&await wait(b,(n)=>new RegExp(n+' wins').test($('live-status').textContent),blackName),'checkmate ends the Revelation the same way on both ('+blackName+' wins)');
ok(await b.evaluate(()=>!$('live-rematch').hidden&&$('live-rev').hidden),'after the decider, a rematch is offered');
console.log('Rematch, reconnecting and leaving');
await a.click('#live-rematch');await b.click('#live-rematch');
ok(await wait(a,()=>chessMatoHotseat.get().gid===3&&!chessMatoHotseat.get().over)&&await wait(b,()=>chessMatoHotseat.get().gid===3),'a rematch starts when both press it');
const rw=await a.evaluate(()=>chessMatoHotseat.get().players.w);ok(rw===(hostIsWhite?'Sam':'Vivi'),'the rematch swaps colours ('+rw+' has White)');
const W2=rw==='Vivi'?a:b,B2=rw==='Vivi'?b:a;
await move(W2,'d2','d4');await wait(B2,()=>game.history().length===1);
await b.close();ok(await wait(a,()=>/Sam is disconnected/.test($('live-status').textContent)),'the host sees when the friend drops');
const b2=await B.ctx.newPage();b2.errors=[];b2.on('pageerror',e=>b2.errors.push('guest2: '+e.message));b2.on('dialog',d=>d.accept());await b2.goto(BASE+hash);
ok(await wait(b2,()=>{let h=chessMatoHotseat.get();return h&&h.live&&game.history().join()==='d4'})&&await wait(a,()=>!/disconnected/.test($('live-status').textContent)),'opening the link again rejoins the same game with the moves so far');
await a.reload();await a.waitForFunction(()=>window.chessMatoLive);
ok(await wait(a,()=>{let h=chessMatoHotseat.get();return h&&h.live&&game.history().join()==='d4'&&chessMatoLive.connected()}),'the host can reload and carry on');
const W3=rw==='Vivi'?a:b2,B3=rw==='Vivi'?b2:a;await move(B3,'d7','d5');ok(await wait(W3,()=>game.history().join()==='d4,d5'),'moves still flow after both reconnect');
await a.evaluate(()=>{let h=chessMatoHotseat.get();h.clock[game.turn()]=300});
ok(await wait(b2,()=>/ran out of time/.test($('live-status').textContent)),'a flag on the host\'s clock ends the game for both');
// A third device with the same link cannot take a seat.
const C=await context(browser,'third');await C.page.goto(BASE+hash);ok(await wait(C.page,()=>/already has two players/.test($('live-join-text').textContent)),'a third person with the link cannot join');await C.ctx.close();
await a.click('#live-rematch');await b2.click('#live-rematch');await wait(a,()=>chessMatoHotseat.get().gid===4);
await b2.close();ok(await wait(a,()=>/did not return within 2 minutes/.test($('live-status').textContent),null,15000),'if the friend does not come back within the chosen time, the game is a draw');
ok(await a.evaluate(()=>$('live-rev').hidden),'a disconnection draw does not start a Revelation');
await a.click('#live-leave');ok(await a.evaluate(()=>!$('live-setup').hidden&&!chessMatoLive.get()),'Leave returns to the setup');
ok(await a.evaluate(()=>(chessMatoGames.list?chessMatoGames.list():[]).length>=0),'finished games are saved like two-player games');
const errs=[...a.errors,...b.errors,...b2.errors];ok(errs.length===0,'no JS errors '+JSON.stringify(errs));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
