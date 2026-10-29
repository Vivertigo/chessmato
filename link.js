'use strict';
// Two phones, no internet: a clock-free game where each move travels as a short code. The code can be scanned as a QR
// code (in-app camera where the browser supports it, or the phone's own camera when CheckMato is hosted), shared over
// Bluetooth / Nearby Share / messages, saved as a file, or pasted. Every code carries the whole game so far, so a missed
// code never breaks the game, and each device replays and checks every move before accepting it.
// Rules: official laws plus the clock-free house rules (no 50-move rule; threefold and 100 moves without a capture or
// pawn move are draw claims; fivefold and dead positions end the game). A drawn game goes to a Revelation decider played
// on one phone (1 minute each, colours by lot); its result is sent back to the other phone as one more code.
(function(){
const KEY='chessmato-link-v1',A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',V={p:1,n:3,b:3,r:5,q:9};
let S={games:{},cur:null,name:'',opp:'',side:'w'};try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let onBoard=false,moving=false;
const other=c=>c==='w'?'b':'w';
const cur=()=>S.cur&&S.games[S.cur]||null;
const nameOf=(L,c)=>L.names[c]||(c==='w'?'White':'Black');
// ---- Code format ----
const b64=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));
function fnv(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(36)}
// A move is stored as its index in the sorted list of legal moves: usually one character per move.
function encMoves(sans){let c=new Chess(),out='';for(let s of sans){let l=c.moves().sort(),i=l.indexOf(s);if(i<0)throw new Error('illegal move '+s);out+=i<63?A[i]:'~'+A[i>>6]+A[i&63];c.move(s)}return out}
function decMoves(str){let c=new Chess(),sans=[];for(let i=0;i<str.length;){let n;if(str[i]==='~'){n=A.indexOf(str[i+1])*64+A.indexOf(str[i+2]);i+=3}else{n=A.indexOf(str[i]);i++}let l=c.moves().sort();if(n<0||n>=l.length)throw new Error('move '+(sans.length+1)+' is not legal');c.move(l[n]);sans.push(l[n])}return sans}
function makeCode(kind,id,names,from,sans,ev,extra){let body=['CM1',kind,id,b64(names.w||''),b64(names.b||''),from,encMoves(sans),ev||'',extra?b64(extra):''].join('.');return body+'.'+fnv(body)}
function parseCode(text){let t=String(text||'').trim(),m=t.match(/#cm=([^\s]+)/);if(m)t=decodeURIComponent(m[1]);t=t.replace(/\s+/g,'');
  let f=t.split('.');if(f[0]!=='CM1'||f.length!==10)throw new Error('That is not a CheckMato move code.');
  if(fnv(f.slice(0,9).join('.'))!==f[9])throw new Error('The code is incomplete or has a typo. Copy or scan it again.');
  if(!['G','R'].includes(f[1])||!['w','b'].includes(f[5]))throw new Error('That is not a CheckMato move code.');
  return {kind:f[1],id:f[2],names:{w:unb64(f[3]),b:unb64(f[4])},from:f[5],sans:decMoves(f[6]),ev:f[7],extra:f[8]?unb64(f[8]):''}}
// ---- Rules on a replayed position ----
function replay(sans){let c=new Chess();for(let s of sans)c.move(s);return c}
const key=fen=>fen.split(' ').slice(0,4).join(' ');
function reps(sans){let c=new Chess(),n={};n[key(c.fen())]=1;for(let s of sans){c.move(s);let k=key(c.fen());n[k]=(n[k]||0)+1}return n[key(c.fen())]||0}
function claimable(sans){let c=replay(sans);if(reps(sans)>=3)return 'threefold repetition';if((Number(c.fen().split(' ')[4])||0)>=200)return '100 moves without a capture or pawn move (clock-free rule)';return null}
function autoEnd(L){let c=replay(L.sans),mover=other(c.turn());
  if(c.in_checkmate())return finish(L,mover==='w'?'1-0':'0-1','checkmate');if(c.in_stalemate())return finish(L,'1/2-1/2','stalemate');
  if(c.insufficient_material())return finish(L,'1/2-1/2','dead position (neither side can checkmate)');if(reps(L.sans)>=5)return finish(L,'1/2-1/2','fivefold repetition')}
function captured(sans){let c=new Chess(),s={w:0,b:0};for(let x of sans){let m=c.move(x);if(m.captured)s[m.color]+=V[m.captured]}return s}
function finish(L,result,reason){L.over=true;L.result=result;L.reason=reason;L.offer=null;savePGN(L,L.names,L.sans,result,reason,'');return true}
function savePGN(L,names,sans,result,reason,tag){if(!window.chessMatoGames)return;let k='saved'+tag;if(L[k])return;L[k]=true;let c=replay(sans),d=new Date();
  let h='[Event "CheckMato two phones'+(tag?' · Revelation':'')+'"]\n[Site "CheckMato (local)"]\n[Date "'+d.toLocaleDateString('en-CA').replace(/-/g,'.')+'"]\n[UTCTime "'+d.toISOString().slice(11,19)+'"]\n[White "'+names.w.replace(/"/g,"'")+'"]\n[Black "'+names.b.replace(/"/g,"'")+'"]\n[Result "'+result+'"]\n[TimeControl "'+(tag?'60+0':'-')+'"]\n[Termination "'+reason.replace(/"/g,"'")+'"]\n\n';
  let mine=tag?(names.w===L.names[L.me]?'w':names.b===L.names[L.me]?'b':'none'):L.me;try{chessMatoGames.importText(h+c.pgn().replace(/\[[^\]]*\]\s*/g,'')+' '+result,mine)}catch(e){}}
// ---- Codes to send ----
function outgoing(L){if(L.rev&&L.rev.host)return makeCode('R',L.id,{w:L.rev.white,b:L.rev.black},L.me,L.rev.sans,{'1-0':'1','0-1':'0','1/2-1/2':'h'}[L.rev.result],L.rev.reason);
  return makeCode('G',L.id,L.names,L.me,L.sans,L.endEv||(L.offer===L.me&&!L.over?'o':''))}
function shareText(code){return location.protocol==='https:'?location.origin+location.pathname+'#cm='+encodeURIComponent(code):code}
// ---- Starting, receiving and playing ----
function newId(){let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*62)];return s}
function create(me,opp,side){let mine=side==='lot'?(Math.random()<0.5?'w':'b'):side,id=newId(),names={};names[mine]=me;names[other(mine)]=opp;
  let L={id,me:mine,names,sans:[],over:false,result:null,reason:'',offer:null,created:Date.now(),updated:Date.now()};S.games[id]=L;S.cur=id;trim();persist();load(L);
  say('New game: you have '+(mine==='w'?'White':'Black')+'. Send this first code to '+opp+' so their phone joins the game.');return L}
function trim(){let ids=Object.keys(S.games).sort((a,b)=>S.games[b].updated-S.games[a].updated);for(let id of ids.slice(20))delete S.games[id]}
function receive(text){let p;try{p=parseCode(text)}catch(e){say(e.message,true);return false}
  let L=S.games[p.id];
  if(p.kind==='R'){if(!L){say('This Revelation result belongs to a game this phone does not have.',true);return false}return receiveRevelation(L,p)}
  if(!L){let me=other(p.from);L={id:p.id,me,names:p.names,sans:[],over:false,result:null,reason:'',offer:null,created:Date.now(),updated:Date.now()};S.games[p.id]=L;trim()}
  if(p.from===L.me){say('This is your own code. Send it to '+nameOf(L,other(L.me))+' instead.',true);return false}
  let mine=L.sans,theirs=p.sans,n=Math.min(mine.length,theirs.length);
  for(let i=0;i<n;i++)if(mine[i]!==theirs[i]){say('This code does not match your game with '+nameOf(L,other(L.me))+' (the moves differ at move '+(Math.floor(i/2)+1)+').',true);return false}
  if(theirs.length<mine.length){say('That is an older code; your game is already further along. '+status(L));S.cur=L.id;persist();load(L);return true}
  let c=new Chess();for(let i=0;i<theirs.length;i++){if(i>=mine.length&&c.turn()===L.me){say('This code contains moves for your side, so it was not applied.',true);return false}c.move(theirs[i])}
  if(L.over&&theirs.length===mine.length&&!['a','r','c'].includes(p.ev)){S.cur=L.id;persist();load(L);say('Already up to date. '+status(L));return true}
  if(L.over){say('This game is already over. '+status(L));S.cur=L.id;load(L);return true}
  let moved=theirs.length>mine.length,declined=false;L.sans=theirs.slice();L.updated=Date.now();
  if(moved&&L.offer===L.me){L.offer=null;declined=true}
  if(p.ev==='o')L.offer=p.from;else if(L.offer===p.from)L.offer=null;
  let opp=nameOf(L,p.from),msg='';
  if(p.ev==='a'){if(L.offer!==L.me){say(opp+' accepted a draw, but there is no open offer from you in this game.',true);return false}finish(L,'1/2-1/2','draw agreed');L.endEv='';msg=opp+' accepted your draw offer.'}
  else if(p.ev==='r'){finish(L,p.from==='w'?'0-1':'1-0',opp+' resigned');msg=opp+' resigned.'}
  else if(p.ev==='c'){let cl=claimable(L.sans);if(!cl){say(opp+' claimed a draw, but the position does not allow a claim.',true);return false}finish(L,'1/2-1/2',cl+' (claimed by '+opp+')');msg=opp+' claimed a draw.'}
  else if(!autoEnd(L))msg=moved?opp+' played '+theirs[theirs.length-1]+'.':(p.ev==='o'?'':'Game joined.');
  if(declined&&!L.over)msg+=' Your draw offer lapsed when they moved.';
  if(p.ev==='o'&&!L.over)msg+=' '+opp+' offers a draw.';
  S.cur=L.id;persist();load(L);say((msg?msg.trim()+' ':'')+status(L));return true}
function receiveRevelation(L,p){if(!L.over||L.result!=='1/2-1/2'){say('This Revelation result does not fit this game: it was not drawn.',true);return false}
  if(L.rev&&L.rev.host){say('This phone hosted the Revelation; send its result code to the other phone.',true);return false}
  let c=replay(p.sans),result={'1':'1-0','0':'0-1','h':'1/2-1/2'}[p.ev],reason=p.extra||'';if(!result){say('That is not a CheckMato move code.',true);return false}
  if(c.in_checkmate()){result=c.turn()==='w'?'0-1':'1-0';reason='checkmate'}else if(c.in_stalemate()||c.insufficient_material()){result='1/2-1/2'}
  let rev={white:p.names.w,black:p.names.b,sans:p.sans,result,reason,host:false};decide(rev);L.rev=rev;L.updated=Date.now();savePGN(L,{w:rev.white,b:rev.black},rev.sans,result,reason,'rev');
  S.cur=L.id;persist();load(L);say('Revelation result received. '+status(L));return true}
function decide(rev){if(rev.result==='1/2-1/2'){let cap=captured(rev.sans);rev.cap=cap;rev.decided=cap.w>cap.b?'1-0':'0-1'}else rev.decided=rev.result;rev.winner=rev.decided==='1-0'?rev.white:rev.black}
function load(L){if(!L)return;$('mode').value='free';$('mode').dispatchEvent(new Event('change'));if(window.chessUITest)chessUITest.navigate('play','phones');
  moving=true;try{game.reset();for(let s of L.sans)game.move(s);baseFen=game.fen();selected=hover=null;flipped=L.me==='b';L.fen=game.fen();onBoard=true;
  $('title').textContent='Two phones: '+nameOf(L,'w')+' vs '+nameOf(L,'b');$('description').textContent='Clock-free · you have '+(L.me==='w'?'White':'Black')+' · moves travel as codes';render()}finally{moving=false}draw()}
function status(L){let c=replay(L.sans),opp=nameOf(L,other(L.me));
  if(L.over){let s=(L.result==='1/2-1/2'?'Draw: ':(L.result==='1-0'?nameOf(L,'w'):nameOf(L,'b'))+' wins: ')+L.reason+'.';
    if(L.result==='1/2-1/2'){if(!L.rev)s+=' A Revelation game decides it: play it on one phone (1 minute each, colours by lot), then send its result code to the other phone.';
      else s+=' Revelation: '+L.rev.winner+' wins'+(L.rev.result==='1/2-1/2'?' on captured material (White '+L.rev.cap.w+', Black '+L.rev.cap.b+(L.rev.cap.w===L.rev.cap.b?'; equal, so Black wins':'')+')':' ('+L.rev.reason+')')+'.'+(L.rev.host?' Send the result code to '+opp+'.':'')}
    return s}
  if(c.turn()===L.me)return 'Your move ('+(L.me==='w'?'White':'Black')+')'+(c.in_check()?', you are in check':'')+'.'+(L.offer===other(L.me)?' '+opp+' offers a draw: accept, or play on to decline.':'');
  return 'Waiting for '+opp+'. Send them the code below, then scan, open or paste their reply.'}
// Your move on the board becomes part of the game; then the new code is shown.
const priorPlay=play;play=function(...a){let L=cur();if(!onBoard||!L||game.fen()!==L.fen)return priorPlay(...a);
  if(L.over){note('This game is over. '+status(L));return}if(game.turn()!==L.me){note('Waiting for '+nameOf(L,other(L.me))+'\'s move.');return}
  let before=game.history().length,r;moving=true;try{r=priorPlay(...a)}finally{moving=false}
  if(game.history().length===before+1){let san=game.history().slice(-1)[0];L.sans.push(san);L.fen=game.fen();L.updated=Date.now();if(L.offer===other(L.me))L.offer=null;autoEnd(L);persist();draw();
    say(L.over?status(L)+' Send the final code to '+nameOf(L,other(L.me))+'.':'You played '+san+'. Send this code to '+nameOf(L,other(L.me))+'.')}return r};
const priorRender=render;render=function(...a){let L=cur();if(onBoard&&!moving&&L&&game.fen()!==L.fen){onBoard=false;setTimeout(draw)}return priorRender(...a)};
// ---- Revelation on this phone ----
function playRevelation(){let L=cur();if(!L||!L.over||L.result!=='1/2-1/2'||L.rev||!window.chessMatoHotseat)return;let swap=Math.random()<0.5,w=swap?L.names.b:L.names.w,b=swap?L.names.w:L.names.b;onBoard=false;
  chessMatoHotseat.start(w,b,'free',{revelation:true,mainResult:{result:L.result,reason:L.reason},onEnd:(H,rec,sans)=>{let rev={white:w,black:b,sans:sans.slice(),result:rec.result,reason:rec.reason,host:true};decide(rev);L.rev=rev;L.updated=Date.now();persist();
    setTimeout(()=>{if(window.chessUITest)chessUITest.navigate('play','phones');draw();say(status(L))},1200)}});
  note('Revelation: by lot, '+w+' has White. 1 minute each. Pass the phone between moves.')}
// ---- QR code ----
function qrSvg(text){try{let q=qrcode(0,'M');q.addData(text);q.make();let n=q.getModuleCount(),d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+4)+' '+(r+4)+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(n+8)+' '+(n+8)+'" role="img" aria-label="QR code of the move code" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'}catch(e){return ''}}
// ---- Camera scanning (browsers with BarcodeDetector, e.g. Chrome on Android) ----
let scan=null;
async function startScan(){if(!('BarcodeDetector' in window)||!navigator.mediaDevices){say('This browser cannot scan here. Use the phone\'s camera app on the QR code, or share or paste the code.',true);return}
  try{let det=new BarcodeDetector({formats:['qr_code']}),stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}),v=$('link-video');v.srcObject=stream;$('link-scan-box').hidden=false;await v.play();
    scan={stream,timer:setInterval(async()=>{try{let r=await det.detect(v);if(r&&r.length){let raw=r[0].rawValue;stopScan();receive(raw)}}catch(e){}},300)}}catch(e){stopScan();say('The camera could not start ('+(e.message||e.name)+'). Share or paste the code instead.',true)}}
function stopScan(){if(scan){clearInterval(scan.timer);scan.stream.getTracks().forEach(t=>t.stop());scan=null}let b=$('link-scan-box');if(b)b.hidden=true}
// ---- UI: Play → Two phones ----
const panel=$('panel-play-phones');
function say(text,err){let m=$('link-msg');if(m){m.textContent=text;m.classList.toggle('error',!!err)}if(!err)note(text)}
function draw(){if(!panel)return;let L=cur();$('link-live').hidden=!L;$('link-games').replaceChildren();
  let list=Object.values(S.games).sort((a,b)=>b.updated-a.updated);for(let g of list.slice(0,8)){let p=document.createElement('p'),b=document.createElement('button');b.textContent=(g.id===S.cur&&onBoard?'On the board: ':'Open: ')+nameOf(g,'w')+' vs '+nameOf(g,'b');b.onclick=()=>{S.cur=g.id;persist();load(g);say(status(g))};
    let s=document.createElement('span');s.className='muted';s.textContent=' · '+Math.ceil(g.sans.length/2)+' moves · '+(g.over?(g.rev?g.rev.winner+' won the Revelation':g.result):'in progress');p.append(b,s);$('link-games').append(p)}
  if(!L)return;let code=outgoing(L),txt=shareText(code);$('link-state').textContent=status(L);
  $('link-code').value=code;$('link-qr').innerHTML=qrSvg(txt);
  let opp=other(L.me);$('link-accept').hidden=!(L.offer===opp&&!L.over);$('link-offer').hidden=L.over||L.offer===L.me;$('link-resign').hidden=L.over;
  let cl=!L.over&&claimable(L.sans);$('link-claim').hidden=!cl;if(cl)$('link-claim').textContent='Claim draw ('+cl+')';
  $('link-revelation').hidden=!(L.over&&L.result==='1/2-1/2'&&!L.rev);$('link-share').hidden=!navigator.share;
  $('link-send-title').textContent=L.rev&&L.rev.host?'Send the Revelation result':'Send to '+nameOf(L,opp)}
if(panel){panel.innerHTML='<h2>Two phones</h2><p class="muted">Play a friend on another phone or computer with no internet. Each move travels as a short code: scan its QR code, share it (Bluetooth, Nearby Share, messages), save it as a file, or paste it. Clock-free, with the same rules as Two players.</p>'+
 '<details id="link-new"'+(Object.keys(S.games).length?'':' open')+'><summary>Start a new game</summary><div class="row"><label>Your name <input id="link-name" maxlength="30"></label><label>Opponent <input id="link-opp" maxlength="30"></label></div><div class="row"><select id="link-side" aria-label="Your colour"><option value="w">I play White</option><option value="b">I play Black</option><option value="lot">Colours by lot</option></select><button class="primary" id="link-start">Start and show the first code</button></div></details>'+
 '<div id="link-live" hidden><p id="link-state" aria-live="polite"></p><div class="row"><button id="link-offer">Offer draw</button><button id="link-accept" hidden>Accept draw</button><button id="link-claim" hidden></button><button id="link-resign">Resign</button><button class="primary" id="link-revelation" hidden>Play the Revelation on this phone</button></div>'+
 '<h3 id="link-send-title">Send</h3><div id="link-qr"></div><label for="link-code">Code</label><textarea id="link-code" readonly rows="2"></textarea><div class="row"><button id="link-share">Share…</button><button id="link-copy">Copy code</button><button id="link-save">Save as file</button></div></div>'+
 '<h3>Receive</h3><label for="link-in">Paste a code from your opponent</label><textarea id="link-in" rows="2" placeholder="CM1.G…"></textarea><div class="row"><button class="primary" id="link-apply">Apply code</button><button id="link-scan">Scan QR code</button><button id="link-open">Open file</button><input type="file" id="link-file" accept=".txt,text/plain" hidden></div>'+
 '<div id="link-scan-box" hidden><video id="link-video" playsinline muted aria-label="Camera view for scanning"></video><button id="link-scan-stop">Stop scanning</button></div><p id="link-msg" aria-live="polite"></p><div id="link-games"></div>'+
 '<details><summary>How it works</summary><p class="muted">Every code holds the whole game, so a missed code is never a problem: the newest one catches up. Each phone checks every move before accepting a code, and only takes moves for the other side. If CheckMato is installed from its website, the phone\'s own camera app can open the QR code straight into the game. Drawn games go to a Revelation decider played on one phone; the host phone then shows a result code for the other phone.</p></details>';
 $('link-name').value=S.name||'';$('link-opp').value=S.opp||'';$('link-side').value=S.side||'w';
 $('link-start').onclick=()=>{let me=$('link-name').value.trim()||'Me',opp=$('link-opp').value.trim()||'Opponent';S.name=me;S.opp=opp;S.side=$('link-side').value;create(me,opp,S.side);$('link-new').open=false};
 $('link-apply').onclick=()=>{if(receive($('link-in').value))$('link-in').value=''};
 $('link-open').onclick=()=>$('link-file').click();$('link-file').onchange=async()=>{let f=$('link-file').files[0];if(f)receive(await f.text());$('link-file').value=''};
 $('link-scan').onclick=startScan;$('link-scan-stop').onclick=stopScan;
 $('link-copy').onclick=async()=>{let t=$('link-code').value;try{await navigator.clipboard.writeText(t);say('Code copied.')}catch(e){$('link-code').select();say('Select the code and copy it.')}};
 $('link-share').onclick=async()=>{let L=cur();if(!L)return;try{await navigator.share({title:'CheckMato move',text:shareText(outgoing(L))})}catch(e){}};
 $('link-save').onclick=()=>{let L=cur();if(!L)return;let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([shareText(outgoing(L))+'\n'],{type:'text/plain'}));a.download='checkmato-move-'+L.id+'-'+L.sans.length+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 $('link-offer').onclick=()=>{let L=cur();if(!L||L.over)return;L.offer=L.me;L.updated=Date.now();persist();draw();say('Draw offered. Send this code to '+nameOf(L,other(L.me))+'.')};
 $('link-accept').onclick=()=>{let L=cur();if(!L||L.over||L.offer!==other(L.me))return;L.endEv='a';finish(L,'1/2-1/2','draw agreed');persist();draw();say(status(L)+' Send this code to '+nameOf(L,other(L.me))+'.')};
 $('link-claim').onclick=()=>{let L=cur();let cl=L&&!L.over&&claimable(L.sans);if(!cl)return;L.endEv='c';finish(L,'1/2-1/2',cl+' (claimed by '+L.names[L.me]+')');persist();draw();say(status(L)+' Send this code to '+nameOf(L,other(L.me))+'.')};
 $('link-resign').onclick=()=>{let L=cur();if(!L||L.over)return;if(!confirm('Resign this game against '+nameOf(L,other(L.me))+'?'))return;L.endEv='r';finish(L,L.me==='w'?'0-1':'1-0',L.names[L.me]+' resigned');persist();draw();say(status(L)+' Send this code to '+nameOf(L,other(L.me))+'.')};
 $('link-revelation').onclick=playRevelation;draw()}
// A QR code opened by the phone's own camera lands here as #cm=<code> (on a fresh start or in an open tab).
function fromHash(){if(!/^#cm=/.test(location.hash))return;let h=location.hash;try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}setTimeout(()=>receive(h),0)}
fromHash();addEventListener('hashchange',fromHash);
const style=document.createElement('style');style.textContent='#link-qr svg{width:min(260px,70vw);height:auto;display:block;margin:6px 0;border-radius:6px}#link-code,#link-in{width:100%;font:13px ui-monospace,monospace;word-break:break-all}#link-msg.error{color:#ffb4a8}#link-video{width:min(320px,90vw);border-radius:8px;display:block;margin:6px 0}#panel-play-phones .row label{display:flex;gap:6px;align-items:center}#panel-play-phones input:not([type=file]){width:140px}#link-games p{margin:4px 0}';document.head.append(style);
window.chessMatoLink={create,receive,code:()=>{let L=cur();return L?outgoing(L):null},get:cur,games:()=>S.games,encMoves,decMoves,parseCode,claimable};
})();
