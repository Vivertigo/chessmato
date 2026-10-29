'use strict';
// Play a friend live, by invite link. The two devices exchange small encrypted messages through a public MQTT relay over
// a secure WebSocket, so it works on any network with no account and no install: the friend just opens the link. The
// room name and its key travel after the "#" of the link, which browsers never send to a server, and every message is
// sealed with AES-GCM, so the relay only ever sees noise. The host (whoever made the link) runs the real game with the
// normal two-player engine: clocks, rules, flags, the Revelation decider and the reconnect window. The guest sends moves
// and requests and shows the host's state. Casual and unrated.
(function(){
const KEY='chessmato-live-v1',ME='chessmato-live-me-v1';
const RELAYS=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
const relays=()=>{try{let o=JSON.parse(localStorage.getItem('chessmato-live-relays')||'null');if(Array.isArray(o)&&o.length)return o}catch(e){}return RELAYS};
// Tests shorten the timings through localStorage 'chessmato-live-test' ({beat, away, minute} in milliseconds).
const TT=(()=>{try{return JSON.parse(localStorage.getItem('chessmato-live-test')||'{}')}catch(e){return {}}})();
const HEARTBEAT=TT.beat||2500,AWAY=TT.away||10000,MINUTE=TT.minute||60000;
const enc=new TextEncoder,dec=new TextDecoder;
const cat=parts=>{let n=0;for(let p of parts)n+=p.length;let o=new Uint8Array(n),i=0;for(let p of parts){o.set(p,i);i+=p.length}return o};
const u16=n=>new Uint8Array([n>>8&255,n&255]);
const str=x=>{let b=enc.encode(x);return cat([u16(b.length),b])};
const b64=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const rand=n=>crypto.getRandomValues(new Uint8Array(n));
const other=c=>c==='w'?'b':'w';
const ok=()=>!!(window.crypto&&crypto.subtle&&window.WebSocket&&window.chessMatoHotseat);

// ---- A small MQTT 3.1.1 client (QoS 0, retained messages) over WebSocket ----
function relay(url,onMsg,onDrop){return new Promise((resolve,reject)=>{let ws,buf=new Uint8Array(0),pid=1,ping=null,up=false,gone=false;
  const send=(h,parts)=>{let body=cat(parts),L=[],n=body.length;do{let d=n%128;n=Math.floor(n/128);if(n)d|=128;L.push(d)}while(n);if(ws&&ws.readyState===1)ws.send(cat([new Uint8Array([h,...L]),body]))};
  const api={url,sub:t=>send(0x82,[u16(pid=pid%65535+1),str(t),new Uint8Array([0])]),pub:(t,bytes,retain)=>send(0x30|(retain?1:0),[str(t),bytes]),
    close:()=>{gone=true;clearInterval(ping);try{send(0xE0,[]);ws.close()}catch(e){}},open:()=>up&&!gone&&ws.readyState===1};
  const fail=e=>{clearInterval(ping);if(!up){clearTimeout(timer);reject(e||Error('relay unreachable'))}else if(!gone){gone=true;onDrop()}};
  let timer=setTimeout(()=>{fail(Error('timeout'));try{ws.close()}catch(e){}},8000);
  try{ws=new WebSocket(url,'mqtt')}catch(e){return fail(e)}ws.binaryType='arraybuffer';
  ws.onopen=()=>send(0x10,[str('MQTT'),new Uint8Array([4,2,0,30]),str('cm-'+b64(rand(9)))]);
  ws.onmessage=e=>{buf=cat([buf,new Uint8Array(e.data)]);for(;;){if(buf.length<2)return;let n=0,m=1,i=1,d;do{if(i>=buf.length)return;d=buf[i++];n+=(d&127)*m;m*=128}while(d&128);if(buf.length<i+n)return;
    let h=buf[0],body=buf.slice(i,i+n);buf=buf.slice(i+n);let type=h>>4;
    if(type===2){clearTimeout(timer);if(body[1]!==0)return fail(Error('refused'));up=true;ping=setInterval(()=>send(0xC0,[]),20000);resolve(api)}
    else if(type===3){let tl=body[0]<<8|body[1],q=h>>1&3;try{onMsg(dec.decode(body.subarray(2,2+tl)),body.slice(2+tl+(q?2:0)))}catch(err){}}}};
  ws.onerror=()=>fail();ws.onclose=()=>fail()})}

// ---- Session ----
// S: {role:'h'|'g', room, key, r (relay index), me:{id,name}, opp:{id,name}, control, pick ('w'|'b'|'r'), win (minutes),
//     state (host: the last state published; guest: the last state received), pend (guest: requests not yet confirmed), n}
let S=null,link=null,ck=null,beat=null,seenOpp=0,retry=0,reconnecting=false,applying=false;
let me={id:b64(rand(9)),name:''};try{Object.assign(me,JSON.parse(localStorage.getItem(ME)||'{}'))}catch(e){}
const saveMe=()=>{try{localStorage.setItem(ME,JSON.stringify(me))}catch(e){}};saveMe();
const persist=()=>{try{if(S)localStorage.setItem(KEY,JSON.stringify(S));else localStorage.removeItem(KEY)}catch(e){}};
const topic=to=>'checkmato/1/'+S.room+'/'+to;
async function seal(o){let iv=rand(12);return cat([iv,new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},ck,enc.encode(JSON.stringify(o))))])}
async function unseal(b){if(b.length<13)return null;try{return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.subarray(0,12)},ck,b.subarray(12))))}catch(e){return null}}
const H=()=>chessMatoHotseat.get();
const live=()=>{let h=H();return h&&h.live&&S&&h.live===S.room?h:null};
const myColor=()=>S&&S.state&&S.state.white?(S.state.white===S.role?'w':'b'):null;
const site=()=>{let V=window.CHESSMATO_VERSION||{},pub=/^https:$/.test(location.protocol)&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&!(window.chessMatoNative&&chessMatoNative());
  return pub?location.origin+location.pathname:(V.site||location.origin+location.pathname)};
const inviteUrl=()=>site()+'#live='+S.room+'.'+S.key+'.'+S.r;
async function connect(){let list=relays(),order=S.role==='h'&&S.r==null?list.map((u,i)=>i):[S.r];ck=ck||await crypto.subtle.importKey('raw',unb64(S.key),'AES-GCM',false,['encrypt','decrypt']);
  for(let i of order){if(list[i]==null)continue;try{let L=await relay(list[i],onMessage,dropped);if(!S){L.close();return false}S.r=i;persist();link=L;L.sub(topic(S.role==='h'?'g':'h'));retry=0;startBeat();show();return true}catch(e){}}
  return false}
function dropped(){link=null;show();if(!S||reconnecting)return;reconnecting=true;let wait=Math.min(10000,1000*2**Math.min(retry++,3));setTimeout(async()=>{reconnecting=false;if(S&&!link&&!(await connect()))dropped()},wait)}
function startBeat(){clearInterval(beat);beat=setInterval(()=>{if(!S)return;if(S.role==='h'){checkAway();publish()}else{hello();checkHostAway()}show()},HEARTBEAT);if(S.role==='h')publish();else hello()}
async function publish(){if(!S||S.role!=='h')return;let st=snapshot();S.state=st;persist();if(link&&link.open())link.pub(topic('h'),await seal(st),true)}
async function hello(){if(!S||S.role!=='g'||!S.joined||!link||!link.open())return;link.pub(topic('g'),await seal({k:'hi',id:me.id,name:me.name,pend:S.pend||[]}),false)}
function ask(t,extra={}){if(!S)return;if(S.role==='h')return hostIntent('h',{t,...extra});S.n=(S.n||0)+1;S.pend=(S.pend||[]).concat([{n:S.n,t,gid:S.state&&S.state.gid,...extra}]);persist();hello()}
async function onMessage(t,bytes){if(!S)return;if(!bytes.length)return;let m=await unseal(bytes);if(!m||!S)return;
  if(S.role==='h'&&m.k==='hi')return hostHears(m);if(S.role==='g'&&m.k==='state')return guestHears(m)}

// ---- Host: the real game ----
function snapshot(){let h=live(),st=S.state||{};let o={k:'state',v:1,t:Date.now(),at:h?Date.now():st.at||Date.now(),names:{h:me.name||'Host',g:S.opp&&S.opp.name||''},guest:S.opp&&S.opp.id||null,control:S.control,win:S.win,pick:S.pick,
  gid:st.gid||0,white:st.white||null,rev:!!st.rev,main:st.main||null,ack:S.ack||0,want:S.want||{},away:S.away||null,moves:[],clock:null,over:!!st.over,result:st.result||null,reason:st.reason||null,decided:st.decided||null,offer:null};
  if(!h&&st.gid){o.moves=st.moves||[];o.clock=st.clock||null;o.offer=st.offer||null}
  if(h){o.moves=game.history();o.clock={w:Math.max(0,h.clock.w),b:Math.max(0,h.clock.b)};o.over=!!h.over;o.result=h.result||null;o.reason=h.reason||null;o.decided=h.decided||null;o.offer=h.offer||null}return o}
function names(st){let w=st.white==='h'?st.names.h:st.names.g,b=st.white==='h'?st.names.g:st.names.h;return {w,b}}
function hostStart(rev,main){let st=S.state||{},white=rev?(Math.random()<.5?'h':'g'):st.gid?(st.white==='h'?'g':'h'):S.pick==='r'?(Math.random()<.5?'h':'g'):S.pick==='w'?'h':'g';
  S.state={...snapshot(),gid:(st.gid||0)+1,white,rev:!!rev,main:main||null,over:false,result:null,reason:null,decided:null,moves:[]};S.want={};S.away=null;
  begin(S.state);publish()}
// Both devices put the game on the board the same way; only the host decides clocks and results.
function begin(st,clock){let n=names(st),mine=st.white===S.role?'w':'b';
  chessMatoHotseat.start(n.w,n.b,st.rev?'free':st.control,{revelation:st.rev,mainResult:st.main,panel:['play','live'],orient:mine,remote:{authority:S.role==='h'},clockAfterFirst:true,site:'CheckMato (live)',quiet:true,onMove:moved,onEnd:ended});
  let h=H();h.live=S.room;h.gid=st.gid;if(st.moves&&st.moves.length)chessMatoHotseat.sync(st.moves,clock||st.clock);
  persist();show();say(opening(st))}
function opening(st){let n=names(st),mine=st.white===S.role?'w':'b';return (st.rev?'Revelation: 1 minute each. ':'')+'You play '+(mine==='w'?'White':'Black')+' against '+(mine==='w'?n.b:n.w)+'. '+(game.turn()===mine?'Your move.':'Waiting for their move.')}
function hostHears(m){if(!m.id)return;if(S.opp&&S.opp.id&&S.opp.id!==m.id)return;let first=!S.opp||!S.opp.id;S.opp={id:m.id,name:String(m.name||'Friend').slice(0,30)};seenOpp=Date.now();
  if(S.away&&S.away.who==='g'){S.away=null;say(S.opp.name+' is back.')}
  if(first){say(S.opp.name+' joined.');hostStart(false);return}
  if(!live()&&S.state&&S.state.gid&&!S.state.over&&(m.pend||[]).some(it=>it.n>(S.ack||0)))restore();
  for(let it of m.pend||[])if(it.n>(S.ack||0)){S.ack=it.n;hostIntent('g',it)}publish();show()}
function hostIntent(who,it){let h=live(),st=S.state||{};if(it.gid&&it.gid!==st.gid)return;let col=st.white===who?'w':'b';
  if(it.t==='move'){if(!h||h.over||who!=='g'||game.turn()!==col||game.history().length!==it.ply)return;let c=new Chess(game.fen()),mv=c.move(it.san);if(!mv)return;applying=true;try{if(window.chessMatoThinking&&chessMatoThinking.get())chessMatoThinking.exit()}catch(e){}try{play(mv.from,mv.to,mv.promotion)}finally{applying=false}feel('move');show();return}
  if(it.t==='resign'&&h&&!h.over){chessMatoHotseat.end(col==='w'?'0-1':'1-0',(who==='h'?S.state.names.h:S.opp.name)+' resigned');return}
  if(it.t==='offer'&&h&&!h.over&&!h.offer){h.offer=col;say(who==='h'?'You offered a draw.':S.opp.name+' offers a draw.');publish();show();return}
  if(it.t==='accept'&&h&&!h.over&&h.offer&&h.offer!==col){chessMatoHotseat.end('1/2-1/2','draw agreed');return}
  if(it.t==='decline'&&h&&h.offer&&h.offer!==col){h.offer=null;publish();show();return}
  if(it.t==='claim'&&h&&!h.over){let c=chessMatoHotseat.claimable();if(c)chessMatoHotseat.end('1/2-1/2',c+' (claimed)');return}
  if(it.t==='rev'||it.t==='rematch'){if(!st.over)return;if(it.t==='rev'&&!canRevelation(st))return;S.want={...(S.want||{}),[who]:it.t};
    if(S.want.h===it.t&&S.want.g===it.t){if(it.t==='rev')hostStart(true,{result:st.result,reason:st.reason});else hostStart(false)}else{publish();show()}return}
  if(it.t==='leave'){S.opp={...S.opp,left:true};say(S.opp.name+' left the game.');if(h&&!h.over)chessMatoHotseat.end(col==='w'?'0-1':'1-0',S.opp.name+' left the game');publish();show()}}
const canRevelation=st=>st.over&&st.result==='1/2-1/2'&&!st.rev&&!/did not return/.test(st.reason||'');
function moved(h){if(!S)return;if(S.role==='h'){publish();show()}else{let s=game.history();ask('move',{ply:s.length-1,san:s[s.length-1]});show()}}
function ended(h,rec){if(!S)return;if(S.role==='h'){S.state={...S.state,over:true,result:h.result,reason:h.reason,decided:h.decided||null};publish()}persist();show();setTimeout(show)}
function checkAway(){let h=live();if(!h||!S.opp||h.over)return;let now=Date.now();
  if(now-seenOpp>AWAY&&!S.away){S.away={who:'g',since:seenOpp};say(S.opp.name+' lost connection. They have '+S.win+' minutes to come back, then the game is a draw.')}
  if(S.away&&now-S.away.since>S.win*MINUTE)chessMatoHotseat.end('1/2-1/2',S.opp.name+' disconnected and did not return within '+S.win+' minutes')}

// ---- Guest: show the host's game ----
function guestHears(st){if(!st.v)return;let first=!S.state;seenOpp=Date.now();if(S.away){S.away=null;say((st.names.h||'Your friend')+' is back.')}
  if(st.guest&&st.guest!==me.id){S.state=st;S.full=true;show();return}
  S.state=st;S.opp={id:'host',name:st.names.h};S.pend=(S.pend||[]).filter(p=>p.n>(st.ack||0));S.control=st.control;S.win=st.win;persist();
  if(!S.joined){show();return}
  if(!st.gid){show();return}
  let h=live();if(!h){if(S.seen&&S.seen.gid===st.gid&&S.seen.n===st.moves.length&&S.seen.over===st.over){show();return}begin(st);h=live()}else if(h.gid!==st.gid){begin(st);h=live()}S.seen={gid:st.gid,n:st.moves.length,over:st.over};
  let pendMoves=S.pend.filter(p=>p.t==='move'&&p.gid===st.gid).map(p=>p.san),want=st.moves.concat(pendMoves),hist=game.history(),before=hist.length;
  let differs=hist.length!==want.length||hist.some((s,i)=>s!==want[i]);if(differs)try{if(window.chessMatoThinking&&chessMatoThinking.get())chessMatoThinking.exit()}catch(e){}
  if(differs)chessMatoHotseat.sync(st.moves,st.clock);else if(!pendMoves.length&&st.clock){h.clock.w=st.clock.w;h.clock.b=st.clock.b;h.last=performance.now()}
  if(game.history().length>before&&!first)feel('move');
  h.offer=st.offer;if(st.over&&!h.over){chessMatoHotseat.sync(st.moves,st.clock);chessMatoHotseat.end(st.result,st.reason,true)}
  show()}
function checkHostAway(){let h=live();if(!h||h.over||!S.joined||!seenOpp)return;let now=Date.now();if(now-seenOpp>AWAY&&!S.away){S.away={who:'h',since:seenOpp};say((S.opp&&S.opp.name||'Your friend')+' lost connection. Waiting up to '+S.win+' minutes, then the game is a draw.')}
  if(S.away&&now-S.away.since>S.win*MINUTE)chessMatoHotseat.end('1/2-1/2',(S.opp&&S.opp.name||'Your friend')+' disconnected and did not return within '+S.win+' minutes',true)}

// ---- Moves on the board: only your own, only on your turn ----
const priorPlay=play;play=function(...a){let h=live();if(!h||applying||h.over)return priorPlay(...a);let mine=myColor();
  if(game.turn()!==mine){note('Waiting for '+(S.opp&&S.opp.name||'your friend')+'\'s move.');return}return priorPlay(...a)};
function feel(k){try{if(window.chessMatoFeel)chessMatoFeel.sounds[k]()}catch(e){}}

// ---- Start, join, resume, leave ----
async function create(){if(!ok()){say('Live play needs a current browser (Chrome, Edge, Safari or Firefox).');return}
  me.name=$('live-name').value.trim().slice(0,30)||'Host';saveMe();
  S={role:'h',room:b64(rand(12)),key:b64(rand(16)),r:null,control:$('live-control').value,pick:$('live-colour').value,win:Number($('live-window').value)||4,created:Date.now(),state:null,ack:0};ck=null;
  persist();say('Connecting to the relay…');show();if(!(await connect())){say('Could not reach any relay. Check the internet connection and try again.');S=null;persist();show();return}
  publish();say('Invite link ready. Send it to your friend; the game starts when they open it.');show()}
async function openInvite(hash){let m=/^#live=([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]{22})\.(\d+)$/.exec(hash||'');if(!m)return false;if(!ok()){say('Live play needs a current browser.');return true}
  if(window.chessUITest)chessUITest.navigate('play','live');
  if(S&&S.room===m[1]){if(!link&&!(await connect()))dropped();show();return true}
  let old=stored();if(!S&&old&&old.room===m[1]){await resume();return true}
  if(S&&S.state&&!S.state.over&&live()&&!confirm('Leave your current live game and open this invite?'))return true;
  leave(true);S={role:'g',room:m[1],key:m[2],r:Number(m[3]),pend:[],n:0,joined:false,created:Date.now()};ck=null;persist();say('Opening the invite…');show();
  if(!(await connect())){say('Could not reach the game relay yet. Check the internet connection; it keeps trying.');dropped()}return true}
function join(){if(!S||S.role!=='g')return;me.name=$('live-name').value.trim().slice(0,30)||'Friend';saveMe();S.joined=true;persist();hello();say('Joining…');show();if(S.state)guestHears(S.state)}
function leave(quiet){let h=live();if(S&&h&&!h.over&&!quiet){if(!confirm('Leave this game? Leaving now counts as resigning.'))return;ask(S.role==='h'?'resign':'leave')}
  let L=link,role=S&&S.role,t=S&&topic('h');clearInterval(beat);
  setTimeout(()=>{if(L){if(role==='h')L.pub(t,new Uint8Array(0),true);L.close()}},S&&S.role==='g'?600:0);
  link=null;if(h&&!h.over)chessMatoHotseat.stop();S=null;ck=null;persist();if(/^#live=/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);show()}
const stored=()=>{let o=null;try{o=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}if(o&&(Date.now()-(o.created||0)>2*86400000||(o.state&&o.state.over&&Date.now()-o.state.t>3600000)))o=null;return o};
// Put the game back on the board (after a reload, or after using the board for something else). The host's clock for
// the side to move loses the time that passed meanwhile.
function restore(){let st=S&&S.state;if(!st||!st.gid||(S.role==='g'&&!S.joined))return;
  if(S.role==='h'){let away=Date.now()-(st.at||st.t),clock=st.clock&&{...st.clock};if(clock&&st.moves.length>=2&&!st.over){let t=st.moves.length%2?'b':'w';clock[t]=Math.max(1,clock[t]-away)}begin(st,clock);seenOpp=Date.now();
    if(!st.over&&away>S.win*MINUTE)chessMatoHotseat.end('1/2-1/2',me.name+' disconnected and did not return within '+S.win+' minutes');
    else if(st.over)chessMatoHotseat.end(st.result,st.reason,true)}
  else{begin(st);if(st.over)chessMatoHotseat.end(st.result,st.reason,true)}}
async function resume(){S=stored();if(!S){persist();return}restore();show();if(!(await connect()))dropped()}

// ---- Panel: Play → Play a friend ----
const panel=$('panel-play-live');
function say(t){let e=$('live-msg');if(e)e.textContent=t;if(t)note(t)}
function controlName(id){let c=chessMatoHotseat.controls.find(c=>c[0]===id);return c?c[1]:id}
function show(){if(!panel)return;let h=live(),st=S&&S.state,mine=myColor(),opp=S&&S.opp&&S.opp.name;
  $('live-setup').hidden=!!S;$('live-invite').hidden=!(S&&S.role==='h'&&!(st&&st.gid));$('live-join').hidden=!(S&&S.role==='g'&&!S.joined);$('live-game').hidden=!(S&&((S.role==='h'&&st&&st.gid)||(S.role==='g'&&S.joined)));
  let conn=$('live-conn');conn.textContent=!S?'':link&&link.open()?'Connected':'Reconnecting…';conn.className='live-conn '+(S&&link&&link.open()?'on':'off');
  if(S&&S.role==='h'&&!(st&&st.gid)){let u=inviteUrl();if($('live-url').value!==u){$('live-url').value=u;$('live-qr').innerHTML=qr(u)}$('live-wait').textContent=(link&&link.open()?'Waiting for your friend to open the link':'Connecting…')+' · '+controlName(S.control)+' · '+({w:'you play White',b:'you play Black',r:'colours by lot'}[S.pick])+'.'}
  if(S&&S.role==='g'&&!S.joined){$('live-join-text').textContent=S.full?'This game already has two players.':st?(st.names.h+' invites you to a live game: '+(st.gid?'(in progress) ':'')+controlName(st.control)+'. If someone loses connection, they have '+st.win+' minutes to come back, then it is a draw.'):(link&&link.open()?'Looking for the game… If this takes long, the invite may have been cancelled.':'Connecting…');
    $('live-join-go').disabled=!st||S.full}
  if(!S||!$('live-game')||$('live-game').hidden)return;
  $('live-back').hidden=!!h||!(st&&st.gid);
  let s='';if(!st||!st.gid)s='Joining '+(opp||'the game')+'…';else if(h&&h.over){s=h.revelation&&h.decided?'Revelation decided: '+(h.decided==='1-0'?h.players.w:h.players.b)+' wins. '+h.reason+'.':h.result==='1/2-1/2'?'Draw: '+h.reason+'.':(h.result==='1-0'?h.players.w:h.players.b)+' wins: '+h.reason+'.'}
  else if(!h)s='Your game with '+opp+' is still going. Press Back to the game to see the board.';
  else if(h){s=(game.turn()===mine?'Your move':'Waiting for '+opp)+(game.in_check()?' (check)':'')+'.';if(h.offer)s+=h.offer===mine?' You offered a draw.':' '+opp+' offers a draw.';
    if(S.away){let left=Math.max(0,S.win*MINUTE-(Date.now()-S.away.since));s+=' '+(S.away.who===S.role?'You are':opp+' is')+' disconnected: '+Math.ceil(left/1000)+' s left before it is a draw.'}}
  if(S.opp&&S.opp.left)s+=' '+opp+' left.';$('live-status').textContent=s;
  let over=!!(h&&h.over),w=(st&&st.want)||S.want||{};
  $('live-offer').hidden=over;$('live-offer').disabled=!h||!!h.offer;$('live-accept').hidden=over||!(h&&h.offer&&h.offer!==mine);$('live-decline').hidden=$('live-accept').hidden;
  let cl=h&&!over&&chessMatoHotseat.claimable();$('live-claim').hidden=!cl;if(cl)$('live-claim').textContent='Claim draw ('+cl+')';$('live-resign').hidden=over;
  let rv=over&&st&&canRevelation({...st,over:true,result:h.result,reason:h.reason,rev:h.revelation});$('live-rev').hidden=!rv;$('live-rematch').hidden=!over||rv;
  let mineWant=w[S.role],theirs=w[S.role==='h'?'g':'h'];
  $('live-rev').textContent=mineWant==='rev'?'Waiting for '+opp+'…':theirs==='rev'?'Play the Revelation ('+opp+' is ready)':'Play the Revelation';$('live-rev').disabled=mineWant==='rev';
  $('live-rematch').textContent=mineWant==='rematch'?'Waiting for '+opp+'…':theirs==='rematch'?'Rematch ('+opp+' is ready)':'Rematch';$('live-rematch').disabled=mineWant==='rematch'}
function qr(text){try{let q=qrcode(0,'M');q.addData(text);q.make();let n=q.getModuleCount(),d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+4)+' '+(r+4)+'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(n+8)+' '+(n+8)+'" role="img" aria-label="QR code of the invite link" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'}catch(e){return ''}}
if(panel){const C=chessMatoHotseat.controls;
  panel.innerHTML='<h2>Play a friend</h2><p class="muted">A live game by invite link. Your friend opens the link in any browser, or in the CheckMato app: no install, no account. Both of you need internet. Casual and unrated; finished games are saved under Player profile → My games.</p><p id="live-conn" class="live-conn"></p>'+
  '<div id="live-setup"><div class="row"><label>Your name <input id="live-name" maxlength="30" autocomplete="nickname"></label></div><div class="row"><select id="live-control" aria-label="Time control">'+C.map(c=>'<option value="'+c[0]+'">'+c[1]+'</option>').join('')+'</select><select id="live-colour" aria-label="Your colour"><option value="r">Colours by lot</option><option value="w">I play White</option><option value="b">I play Black</option></select>'+
  '<select id="live-window" aria-label="If someone loses connection"><option value="2">If someone disconnects: 2 minutes to return</option><option value="4">If someone disconnects: 4 minutes to return</option><option value="6">If someone disconnects: 6 minutes to return</option></select></div><div class="row"><button class="primary" id="live-create">Create invite link</button></div>'+
  '<details><summary>How it works</summary><p class="muted">Moves travel as tiny encrypted messages through a free public relay, so it works on Wi-Fi or mobile data without setting anything up. The key is part of the link, so only someone with the link can see or join the game. Clocks start once both players have made their first move; the person who made the link keeps the official clock. If a player loses connection, their clock keeps running; if they are not back within the chosen time, the game is a draw. A drawn game goes to a Revelation decider (1 minute each, colours by lot) when you both press Play the Revelation. The same rules as Two players apply.</p></details></div>'+
  '<div id="live-invite" hidden><p id="live-wait" aria-live="polite"></p><label class="live-url">Invite link <input id="live-url" readonly></label><div class="row"><button class="primary" id="live-share">Send link</button><button id="live-copy">Copy link</button><button id="live-cancel">Cancel</button></div><div id="live-qr"></div></div>'+
  '<div id="live-join" hidden><p id="live-join-text" aria-live="polite"></p><div class="row"><label>Your name <input id="live-name-join" maxlength="30" autocomplete="nickname"></label><button class="primary" id="live-join-go">Join game</button><button id="live-join-no">Not now</button></div></div>'+
  '<div id="live-game" hidden><p id="live-status" aria-live="polite"></p><div class="row"><button id="live-offer">Offer draw</button><button id="live-accept" class="primary" hidden>Accept draw</button><button id="live-decline" hidden>Decline</button><button id="live-claim" hidden></button><button id="live-resign">Resign</button><button class="primary" id="live-rev" hidden>Play the Revelation</button><button class="primary" id="live-rematch" hidden>Rematch</button><button class="primary" id="live-back" hidden>Back to the game</button><button id="live-leave">Leave</button></div></div><p id="live-msg" class="muted" aria-live="polite"></p>';
  $('live-name').value=me.name;$('live-name-join').value=me.name;
  // Two name fields share one value; the join flow reads the visible one.
  $('live-name-join').oninput=()=>{$('live-name').value=$('live-name-join').value};$('live-name').oninput=()=>{$('live-name-join').value=$('live-name').value};
  $('live-control').value='z3';$('live-window').value='4';
  $('live-create').onclick=create;$('live-cancel').onclick=()=>leave(true);$('live-join-go').onclick=join;$('live-join-no').onclick=()=>leave(true);$('live-leave').onclick=()=>leave(false);$('live-back').onclick=()=>{restore();show()};
  $('live-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('live-url').value);say('Link copied.')}catch(e){$('live-url').select();say('Select the link and copy it.')}};
  $('live-share').onclick=async()=>{let u=$('live-url').value;try{await chessMatoShare({title:'CheckMato',text:'Play me at chess on CheckMato: '+u,url:u})}catch(e){}};
  $('live-offer').onclick=()=>ask('offer');$('live-accept').onclick=()=>ask('accept');$('live-decline').onclick=()=>ask('decline');$('live-claim').onclick=()=>ask('claim');
  $('live-resign').onclick=()=>{if(confirm('Resign this game?'))ask('resign')};$('live-rev').onclick=()=>ask('rev');$('live-rematch').onclick=()=>ask('rematch');
  setInterval(()=>{if(S&&S.away)show()},1000)}
const style=document.createElement('style');style.textContent='#live-qr svg{width:min(240px,70vw);height:auto;display:block;margin:6px 0;border-radius:6px}#live-url{width:100%;font:13px ui-monospace,monospace}.live-url{display:block;margin:8px 0}#panel-play-live .row label{display:flex;gap:6px;align-items:center}#panel-play-live input#live-name,#panel-play-live input#live-name-join{width:160px}.live-conn{margin:4px 0;font-weight:600}.live-conn:empty{display:none}.live-conn.on:before,.live-conn.off:before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;background:#7bd389}.live-conn.off:before{background:#f2c14e}';document.head.append(style);
addEventListener('hashchange',()=>openInvite(location.hash));
setTimeout(async()=>{if(!(await openInvite(location.hash)))resume()});
window.chessMatoLive={get:()=>S,create,join,leave,ask,inviteUrl:()=>S&&inviteUrl(),connected:()=>!!(link&&link.open()),relays};
})();
