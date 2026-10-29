'use strict';
// Two players on one device ("hotseat"), with clock-free or timed games. Rules follow the official laws:
// checkmate, resignation, agreed draws, stalemate and dead positions as usual; threefold repetition is a claim; fivefold
// ends the game. Timed games: the 50-move rule is a claim and 75 moves end the game; a flag loses unless the opponent
// cannot possibly checkmate. Clock-free house rules: no 50/75-move rule; after 100 moves without a capture or pawn move
// either player may claim a draw. The clock switches automatically when a move is played (after the thinking board's
// Play, if it is on). Any drawn game is followed by a "Revelation" decider: 1 minute each, colours by lot; if that is also
// drawn, the player who captured more material (P1 N3 B3 R5 Q9) wins, and equal material means Black wins.
(function(){
const KEY='chessmato-hotseat-v1',V={p:1,n:3,b:3,r:5,q:9};
const CONTROLS=[['free','Clock-free',0,0],['b1','Bullet 1 + 0',60,0],['b2','Bullet 2 + 1',120,1],['z3','Blitz 3 + 0',180,0],['z32','Blitz 3 + 2',180,2],['z5','Blitz 5 + 0',300,0],['z53','Blitz 5 + 3',300,3],['s10','Standard 10 + 0',600,0],['s15','Standard 15 + 10',900,10],['s30','Standard 30 + 0',1800,0],['s3020','Standard 30 + 20',1800,20]];
let store={results:[],names:['White','Black'],control:'free',flip:true};try{Object.assign(store,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}};
let H=null,tick=null;
// H={players:{w,b}, control, base, inc, clock:{w,b} ms, fen, startFen, over, result, reason, revelation, mainResult, offer, paused, last}
const ctl=id=>CONTROLS.find(c=>c[0]===id)||CONTROLS[0];
const timed=()=>H&&(H.revelation||H.base>0);
const key=fen=>fen.split(' ').slice(0,4).join(' ');
function repetitions(){let c=new Chess(H.startFen),n={},k=key(c.fen());n[k]=1;for(let s of game.history()){c.move(s);k=key(c.fen());n[k]=(n[k]||0)+1}return n[key(game.fen())]||0}
const halfmoves=()=>Number(game.fen().split(' ')[4])||0;
function canMate(color){let pcs=[];for(let r of game.board())for(let p of r)if(p&&p.color===color&&p.type!=='k')pcs.push(p.type);if(!pcs.length)return false;if(pcs.length===1&&(pcs[0]==='n'||pcs[0]==='b'))return false;return true}
function captured(){let s={w:0,b:0};for(let m of game.history({verbose:true}))if(m.captured)s[m.color]+=V[m.captured];return s}
const fmt=ms=>{ms=Math.max(0,ms);let s=Math.ceil(ms/1000);if(ms<10000&&ms>0)return (ms/1000).toFixed(1);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function start(white,black,control,opts={}){stopTick();let c=ctl(control),rev=!!opts.revelation;
  $('mode').value='free';$('mode').dispatchEvent(new Event('change'));if(window.chessUITest)chessUITest.navigate('play','hotseat');game.reset();baseFen=game.fen();selected=hover=null;flipped=false;
  H={players:{w:white,b:black},control:rev?'revelation':c[0],label:rev?'Revelation · 1 minute each':c[1],base:rev?60:c[2],inc:rev?0:c[3],clock:{w:(rev?60:c[2])*1000,b:(rev?60:c[2])*1000},fen:game.fen(),startFen:game.fen(),over:false,revelation:rev,mainResult:opts.mainResult||null,offer:null,paused:false,last:performance.now(),moves:0};
  $('title').textContent=(rev?'Revelation: ':'')+white+' vs '+black;$('description').textContent=H.label+(rev?' · if drawn, captured material decides; equal = Black wins':'');
  render();if(timed())startTick();draw();note(white+' (White) to move.')}
function startTick(){stopTick();H.last=performance.now();tick=setInterval(()=>{if(!H||H.over||H.paused)return;let now=performance.now(),t=game.turn();H.clock[t]-=now-H.last;H.last=now;if(H.clock[t]<=0){H.clock[t]=0;flag(t)}drawClocks()},100)}
function stopTick(){if(tick)clearInterval(tick);tick=null}
function flag(t){let o=t==='w'?'b':'w';if(canMate(o))end(o==='w'?'1-0':'0-1',(t==='w'?'White':'Black')+' ran out of time');else end('1/2-1/2',(t==='w'?'White':'Black')+' ran out of time, but '+(o==='w'?'White':'Black')+' cannot checkmate')}
function afterMove(){let mover=game.turn()==='w'?'b':'w';H.moves++;if(timed()){let now=performance.now();H.clock[mover]-=now-H.last;H.last=now;if(H.clock[mover]<=0){H.clock[mover]=0;flag(mover);return}H.clock[mover]+=H.inc*1000}
  H.fen=game.fen();H.offer=H.offer&&H.offer!==mover?null:H.offer;
  if(game.in_checkmate())return end(mover==='w'?'1-0':'0-1','checkmate');
  if(game.in_stalemate())return end('1/2-1/2','stalemate');
  if(game.insufficient_material())return end('1/2-1/2','dead position (neither side can checkmate)');
  if(repetitions()>=5)return end('1/2-1/2','fivefold repetition');
  if(timed()&&halfmoves()>=150)return end('1/2-1/2','75 moves without a capture or pawn move');
  if(store.flip){flipped=game.turn()==='b';render()}draw();note((game.turn()==='w'?H.players.w+' (White)':H.players.b+' (Black)')+' to move'+(game.in_check()?' — check!':'.'))}
function claimable(){if(!H||H.over)return null;if(repetitions()>=3)return 'threefold repetition';if(timed()&&halfmoves()>=100)return '50 moves without a capture or pawn move';if(!timed()&&halfmoves()>=200)return '100 moves without a capture or pawn move (clock-free rule)';return null}
function end(result,reason){H.over=true;H.result=result;H.reason=reason;stopTick();let names=H.players,winner=result==='1-0'?names.w:result==='0-1'?names.b:null;
  let rec={date:new Date().toLocaleDateString('en-CA'),white:names.w,black:names.b,control:H.label,result,reason,revelation:H.revelation};
  if(H.revelation&&result==='1/2-1/2'){let cap=captured();let r=cap.w>cap.b?'1-0':'0-1';rec.decided=r;rec.capture=cap;winner=r==='1-0'?names.w:names.b;
    H.decided=r;H.reason=reason+'. Captured material: White '+cap.w+', Black '+cap.b+(cap.w===cap.b?' (equal, so Black wins)':'')}
  store.results.push(rec);store.results=store.results.slice(-30);persist();savePGN(rec);
  draw();if(!H.revelation&&result==='1/2-1/2'){note('Draw ('+reason+'). A Revelation game decides it: 1 minute each, colours by lot.');$('hs-revelation').hidden=false}
  else note(winner?winner+' wins'+(H.revelation?' the Revelation':'')+' ('+H.reason+').':'Draw ('+reason+').');try{if(window.chessMatoFeel)chessMatoFeel.sounds[winner?'mate':'move']()}catch(e){}}
function savePGN(rec){if(!window.chessMatoGames)return;let h='[Event "CheckMato two-player'+(rec.revelation?' · Revelation':'')+'"]\n[Site "CheckMato (local)"]\n[Date "'+rec.date.replace(/-/g,'.')+'"]\n[UTCTime "'+new Date().toISOString().slice(11,19)+'"]\n[White "'+rec.white.replace(/"/g,"'")+'"]\n[Black "'+rec.black.replace(/"/g,"'")+'"]\n[Result "'+rec.result+'"]\n[TimeControl "'+(H.base?H.base+'+'+H.inc:'-')+'"]\n[Termination "'+rec.reason.replace(/"/g,"'")+'"]\n\n';
  try{chessMatoGames.importText(h+game.pgn().replace(/\[[^\]]*\]\s*/g,'')+' '+rec.result,'none')}catch(e){}}
function revelation(){if(!H||!H.over)return;let a=H.players.w,b=H.players.b,swap=Math.random()<0.5,main={result:H.result,reason:H.reason};let w=swap?b:a,bl=swap?a:b;start(w,bl,'free',{revelation:true,mainResult:main});note('Revelation: by lot, '+w+' has White. 1 minute each.')}
// Moves during a two-player game go through the normal path, then the clock and rules run.
const priorPlay=play;play=function(...a){if(!H||H.over||game.fen()!==H.fen)return priorPlay(...a);if(H.paused){note('The game is paused. Press Resume first.');return}let before=game.history().length,r;H.moving=true;try{r=priorPlay(...a)}finally{if(H)H.moving=false}if(H&&game.history().length===before+1)afterMove();return r};
const priorRender=render;render=function(...a){if(H&&!H.over&&!H.moving&&game.fen()!==H.fen){stopTick();H=null;setTimeout(draw)}let r=priorRender(...a);if(H)placeClocks();return r};
// ---- UI: Play → Two players ----
const panel=$('panel-play-hotseat');
// Clocks sit directly above and below the board, each next to that player's side.
const clockEls={w:document.createElement('p'),b:document.createElement('p')};for(let c of ['w','b']){clockEls[c].id='hs-clock-'+c;clockEls[c].className='hs-clock';clockEls[c].hidden=true}
function placeClocks(){let bd=$('board'),top=flipped?'w':'b',bot=top==='w'?'b':'w',bar=$('thinking-bar');(bar||bd).before(clockEls[top]);bd.after(clockEls[bot]);for(let c of ['w','b'])clockEls[c].hidden=!H}
function drawClocks(){placeClocks();if(!H)return;for(let c of ['w','b']){let e=$('hs-clock-'+c);if(!e)continue;e.textContent=(c==='w'?H.players.w+' (White)':H.players.b+' (Black)')+' · '+(timed()?fmt(H.clock[c]):'no clock');e.classList.toggle('active',!H.over&&game.turn()===c);e.classList.toggle('low',timed()&&H.clock[c]<10000)}}
function draw(){if(!panel)return;let live=!!H;placeClocks();$('hs-setup').hidden=live&&!H.over;$('hs-live').hidden=!live;if(!live)return;$('hs-revelation').hidden=!(H.over&&!H.revelation&&H.result==='1/2-1/2');
  drawClocks();let st=$('hs-status');st.textContent=H.over?(H.revelation&&H.decided?'Revelation decided: '+(H.decided==='1-0'?H.players.w:H.players.b)+' wins. '+H.reason+'.':(H.result==='1/2-1/2'?'Draw: ':(H.result==='1-0'?H.players.w:H.players.b)+' wins: ')+H.reason+'.'):(H.offer?(H.offer==='w'?H.players.w:H.players.b)+' offers a draw. '+(H.offer==='w'?H.players.b:H.players.w)+' can accept, or decline by playing on.':'');
  let cl=claimable();$('hs-claim').hidden=!cl;if(cl)$('hs-claim').textContent='Claim draw ('+cl+')';$('hs-accept').hidden=!(H.offer&&!H.over);if(H.offer)$('hs-accept').textContent='Accept draw ('+(H.offer==='w'?H.players.b:H.players.w)+')';$('hs-offer').disabled=H.over||!!H.offer;$('hs-resign').disabled=H.over;$('hs-pause').hidden=!timed()||H.over;$('hs-pause').textContent=H.paused?'Resume':'Pause';
  let list=$('hs-results');list.replaceChildren();for(let r of store.results.slice(-5).reverse()){let p=document.createElement('p');p.className='muted';p.textContent=r.date+' · '+r.white+' vs '+r.black+' · '+r.control+' · '+(r.decided?'Revelation drawn → '+(r.decided==='1-0'?r.white:r.black)+' wins on captured material':r.result+' ('+r.reason+')');list.append(p)}}
if(panel){panel.innerHTML='<h2>Two players</h2><p class="muted">Play a friend on this device. Moves switch the clock automatically. Finished games are saved under Player profile → My games.</p>'+
 '<div id="hs-setup"><div class="row"><label>White <input id="hs-white" maxlength="30"></label><label>Black <input id="hs-black" maxlength="30"></label></div><div class="row"><select id="hs-control" aria-label="Time control">'+CONTROLS.map(c=>'<option value="'+c[0]+'">'+c[1]+'</option>').join('')+'</select><label class="setting-check"><input type="checkbox" id="hs-flip"> Turn the board for each player</label></div><div class="row"><button class="primary" id="hs-start">Start game</button></div>'+
 '<details><summary>Rules used</summary><p class="muted">Official laws: checkmate, resignation, agreed draws, stalemate and dead positions. Threefold repetition can be claimed; fivefold ends the game. Timed: the 50-move rule can be claimed, 75 moves end the game, and running out of time loses unless your opponent cannot possibly checkmate. Clock-free: no 50-move rule; after 100 moves without a capture or pawn move a draw can be claimed. Every drawn game goes to a Revelation decider (1 minute each, colours by lot); if that is drawn too, more captured material wins (P1 N3 B3 R5 Q9) and equal material means Black wins.</p></details></div>'+
 '<div id="hs-live" hidden><p id="hs-status" aria-live="polite"></p><div class="row"><button id="hs-offer">Offer draw</button><button id="hs-accept" hidden>Accept draw</button><button id="hs-claim" hidden></button><button id="hs-resign">Resign</button><button id="hs-pause" hidden>Pause</button><button class="primary" id="hs-revelation" hidden>Play the Revelation</button><button id="hs-new">New game</button></div></div><div id="hs-results"></div>';
 $('hs-white').value=store.names[0];$('hs-black').value=store.names[1];$('hs-control').value=store.control;$('hs-flip').checked=store.flip;
 $('hs-start').onclick=()=>{let w=$('hs-white').value.trim()||'White',b=$('hs-black').value.trim()||'Black';store.names=[w,b];store.control=$('hs-control').value;store.flip=$('hs-flip').checked;persist();start(w,b,store.control)};
 $('hs-resign').onclick=()=>{if(!H||H.over)return;let t=game.turn(),who=t==='w'?H.players.w:H.players.b;if(!confirm(who+', resign this game?'))return;end(t==='w'?'0-1':'1-0',who+' resigned')};
 $('hs-offer').onclick=()=>{if(!H||H.over)return;H.offer=game.turn();note((H.offer==='w'?H.players.w:H.players.b)+' offers a draw.');draw()};
 $('hs-accept').onclick=()=>{if(H&&H.offer&&!H.over)end('1/2-1/2','draw agreed')};
 $('hs-claim').onclick=()=>{let c=claimable();if(c)end('1/2-1/2',c+' (claimed)')};
 $('hs-pause').onclick=()=>{if(!H)return;H.paused=!H.paused;H.last=performance.now();draw()};
 $('hs-revelation').onclick=revelation;$('hs-new').onclick=()=>{stopTick();H=null;draw()};draw()}
const style=document.createElement('style');style.textContent='.hs-clock{font:600 18px ui-monospace,monospace;padding:8px 12px;border:1px solid var(--stroke,#3a4a40);border-radius:6px;margin:6px 0;background:#18211d;color:#ecf0e9}.hs-clock.active{border-color:#9cc8f2;box-shadow:0 0 0 2px #9cc8f2}.hs-clock.low{color:#ffb4a8}#hs-setup input{width:140px}#panel-play-hotseat .row label{display:flex;gap:6px;align-items:center}#panel-play-hotseat .setting-check{display:flex;gap:8px;align-items:center;margin:0}.hs-clock[hidden]{display:none}';document.head.append(style);
window.chessMatoHotseat={start,get:()=>H,end,claimable,captured,revelation,canMate,store:()=>store,flag};
})();
