'use strict';
// Offline coach chats. Every answer is built locally from chess.js rules, saved progress and
// (only when a bot game already has one) the bundled Stockfish suggestion. No network or AI service.
(function(){
const KEY='chessmato-coach-chats-v1',VALUE={p:1,n:3,b:3,r:5,q:9,k:0};
let logs={gary:[],claudia:[]};try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');for(let k of ['gary','claudia'])if(Array.isArray(d[k]))logs[k]=d[k].filter(m=>m&&typeof m.text==='string'&&['you','coach'].includes(m.from)).slice(-120)}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(logs))}catch(e){}}
const profile=()=>window.academyTest?window.academyTest.getProfile():{rating:800,days:[],kudos:[],mistakes:[],clean:0,rounds:0,quizzes:[]};
const coachStats=()=>window.openingCoachTest?window.openingCoachTest.getStats():{sessions:[],reviews:[],suggestions:0};
const sideName=c=>c==='w'?'White':'Black';
const pieceName=(p,s)=>sideName(p.color)+' '+names[p.type]+' on '+s;

// ---- Rule-based position scan (also used later by the pre-move blunder check) ----
function boardPieces(g){let out=[];for(let x=0;x<8;x++)for(let y=0;y<8;y++){let s=square(x,y),p=g.get(s);if(p)out.push({s,p})}return out}
function asSide(g,color){if(g.turn()===color)return new Chess(g.fen());let f=g.fen().split(' ');f[1]=color;f[3]='-';let c=new Chess();return c.load(f.join(' '))?c:null}
function material(g){let t={w:0,b:0};boardPieces(g).forEach(({p})=>t[p.color]+=VALUE[p.type]);return t}
function scan(g,me){
  me=me||g.turn();let them=other(me),r={me,them,inCheck:g.turn()===me&&g.in_check(),loose:[],hanging:[],theirChecks:[],theirCaptures:[],theirMates:[],myChecks:[],myCaptures:[],myMates:[],material:material(g)};
  for(let {s,p} of boardPieces(g)){if(p.color!==me||p.type==='k')continue;let def=attackers(g,s,me),att=attackers(g,s,them);if(!def.length)r.loose.push({s,p,attacked:att.length>0});if(att.length&&(!def.length||cheaperAttacker(att,p)))r.hanging.push({s,p,by:att})}
  let theirs=r.inCheck?null:asSide(g,them);
  if(theirs)for(let m of theirs.moves({verbose:true})){let after=new Chess(theirs.fen());after.move(m);if(after.in_checkmate())r.theirMates.push(m.san);else if(after.in_check())r.theirChecks.push(m.san);if(m.captured)r.theirCaptures.push({san:m.san,captured:m.captured,to:m.to})}
  let mine=asSide(g,me);
  if(mine)for(let m of mine.moves({verbose:true})){let after=new Chess(mine.fen());after.move(m);if(after.in_checkmate())r.myMates.push(m.san);else if(after.in_check())r.myChecks.push(m.san);if(m.captured)r.myCaptures.push({san:m.san,captured:m.captured,to:m.to,free:!attackers(after,m.to,them).length})}
  return r}
function typeOf(desc){let w=desc.split(' ')[1];return Object.keys(names).find(k=>names[k]===w)||'p'}
// attackers() returns text like "White knight on f3".
function cheaperAttacker(att,p){return att.some(a=>VALUE[typeOf(a)]<VALUE[p.type]&&typeOf(a)!=='k')}

function mySide(g){let s=window.academyCoach&&window.academyCoach.botSide&&window.academyCoach.botSide();return s||g.turn()}
function level(){let r=profile().rating;return r<1000?'new':r<1800?'club':'advanced'}
const list=(a,n=4)=>a.length<=n?a.join(', '):a.slice(0,n).join(', ')+' and '+(a.length-n)+' more';

// ---- Answers (facts), then each coach phrases them ----
function positionReport(){
  let g=game,me=mySide(g),r=scan(g,me),lv=level(),lines=[];
  if(g.game_over())return {facts:[g.in_checkmate()?'The game is over: checkmate.':'The game is over: drawn position.'],r};
  if(r.inCheck)lines.push('You are in check. Every legal move must deal with it: move the king, capture the checker, or block a line check.');
  if(r.myMates.length)lines.push('Checkmate is available: '+list(r.myMates)+'.');
  let hang=boardPieces(g).filter(({s,p})=>p.color===me&&p.type!=='k').map(({s,p})=>({s,p,att:attackers(g,s,r.them),def:attackers(g,s,me)})).filter(x=>x.att.length&&(!x.def.length||cheaperAttacker(x.att,x.p)));
  if(hang.length)lines.push('In danger right now: '+hang.map(x=>names[x.p.type]+' on '+x.s+(x.def.length?' (attacked by a cheaper piece)':' (attacked and undefended)')).join('; ')+'.');
  let loose=r.loose.filter(x=>!hang.some(h=>h.s===x.s));
  if(loose.length)lines.push('Undefended but not attacked yet: '+list(loose.map(x=>names[x.p.type]+' '+x.s))+'.'+(lv==='new'?' Undefended means no piece of yours guards it, so it can be lost for free if attacked.':''));
  if(!r.inCheck){if(r.theirMates.length)lines.push('Warning: if it were their move, '+list(r.theirMates)+' would be checkmate. Deal with that first.');
    if(r.theirChecks.length)lines.push('Their possible checks: '+list(r.theirChecks)+'.');else lines.push('They have no checks available right now.');
    let bigCaps=r.theirCaptures.filter(c=>VALUE[c.captured]>=3);if(bigCaps.length)lines.push('Their captures of pieces: '+list(bigCaps.map(c=>c.san))+'.')}
  if(!r.myMates.length){if(r.myChecks.length)lines.push('Your forcing moves, checks: '+list(r.myChecks)+'.');let free=r.myCaptures.filter(c=>c.free);if(free.length)lines.push('Captures that land on an unattacked square: '+list(free.map(c=>c.san))+'.')}
  let m=r.material,diff=m[me]-m[r.them];lines.push('Material (pawn=1, minor=3, rook=5, queen=9): '+(diff===0?'level':(diff>0?'you are up ':'you are down ')+Math.abs(diff))+'.');
  return {facts:lines,r}}

function trainingSummary(){let p=profile(),st=coachStats(),done=st.sessions.filter(s=>s.completed),dec=done.reduce((n,s)=>n+s.decisions,0),right=done.reduce((n,s)=>n+s.firstCorrect,0),k=p.kudos.slice(-40),avg=k.length?k.reduce((a,b)=>a+b,0)/k.length:null;
  return {rating:p.rating,sessions:done.length,recall:dec?Math.round(100*right/dec):null,kudos:avg,moves:p.kudos.length,clean:p.clean,mistakes:p.mistakes.slice(-3).map(m=>m.text)}}

function nextFocus(){let t=trainingSummary(),items=[];
  if(t.sessions<3)items.push('Openings first: run a few repertoire lines in Openings → Practice until the first moves feel automatic. Your reported opening accuracy (57.7%) is the clearest gap.');
  else if(t.recall!==null&&t.recall<80)items.push('Your opening recall is '+t.recall+'%. Repeat the recommended line with guides off.');
  items.push('Middlegame: before each move, scan their checks, captures and threats, and anything of yours that is undefended. Ask me "check this position" any time.');
  if(t.kudos!==null&&t.kudos<70)items.push('Your recent bot-game Kudos average is '+t.kudos.toFixed(0)+'%. Slow down on moves where something is attacked.');
  items.push('Do not resign early. Play on in difficult positions; you are strong in endgames (77% reported).');
  return items}

const intents=[
 ['position',/(position|board|check (this|it|my)|blunder|safe|danger|hanging|undefended|threat|what.*(attack|happen)|scan|before i move)/],
 ['focus',/(work on|focus|improve|practice|train|plan|next|weak|priority)/],
 ['opening',/(opening|repertoire|italian|caro|slav|london|e4|d4)/],
 ['resign',/(resign|give up|lost|losing|hopeless|quit)/],
 ['progress',/(rating|progress|kudos|stats|how am i|doing)/],
 ['endgame',/(endgame|ending|promot|king and pawn)/],
 ['hint',/(hint|answer|solution|best move|what should i play|suggest)/],
 ['who',/(who are you|about you|your (style|story)|3200)/],
 ['feelings',/(nervous|anxious|tilt|frustrat|upset|angry|sad|scared|pressure|plateau|stuck|bad day|hate)/],
 ['hello',/^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/],
 ['thanks',/(thank|thx|cheers)/]
];
function classify(text){let t=text.toLowerCase();for(let [k,re] of intents)if(re.test(t))return k;return 'unknown'}

function factsFor(intent){
  let t=trainingSummary();
  switch(intent){
  case 'position':return positionReport().facts;
  case 'focus':return nextFocus();
  case 'opening':{let st=coachStats(),last=st.sessions.slice(-1)[0];return ['Your repertoire: White plays an Italian-based 1.e4; Black plays the Caro-Kann against 1.e4 and the Slav against d4/c4.',t.sessions?'Completed opening sessions: '+t.sessions+(t.recall!==null?', first-choice recall '+t.recall+'%':'')+'.':'No opening sessions completed yet.',last?'Last session: '+last.name+'.':'Start with Openings → Practice → Recommended line.','Aim to understand why each move is played, not just memorize the order.']}
  case 'resign':{let g=game,m=material(g),me=mySide(g),d=m[me]-m[other(me)];return ['Current material: '+(d===0?'level':(d>0?'up ':'down ')+Math.abs(d))+'.','Many positions that feel lost still have defensive chances, especially in endgames, and endgames are your strongest phase.','In a bot game, the Resign button opens a review first: material, the engine estimate, and the choice to keep playing. Resigned positions are saved under Player profile → Resignation review, where you can play on from them.']}
  case 'progress':return ['Training rating: '+t.rating+' (editable, not official Elo).',t.kudos!==null?'Recent Kudos average over '+Math.min(40,t.moves)+' scored moves: '+t.kudos.toFixed(1)+'%.':'No bot moves scored yet.','Clean puzzle solves: '+t.clean+'.',t.mistakes.length?'Recent notebook entries: '+t.mistakes.join(' | '):'Mistake notebook is empty.']
  case 'endgame':return ['Endgames are your reported strength (77%). Keep them sharp with occasional practice, but spend most of your time on openings and the middlegame.','Key habits: activate the king, push passed pawns with support, and check stalemate before you promote.']
  case 'hint':{if(window.academyCoach&&window.academyCoach.botHintFen&&window.academyCoach.botHintFen())return ['In a bot game, use Play → "Suggest a move". It uses the local engine and marks that move as assisted.'];if($('mode').value==='drill'&&!done)return ['Use the Hint button for a staged hint, or Guide squares to see the piece. I will not reveal a puzzle answer in chat. Start with your checks, captures and threats.'];return positionReport().facts}
  case 'feelings':return ['Strong feelings during chess are normal. They mean you care about the game.','A reset that helps: stand up, breathe, and before the next move name one thing your opponent wants.','Your training rating is editable and private. It measures practice, not you.'];
  case 'who':return null;
  default:return null}}

const coaches={
 gary:{name:'Gary Bendt',short:'Gary',mono:'GB',tagline:'Legendary 3200 · calm, practical, resilient',
  intro:'I am Gary. Ask me about the position on the board, your openings, what to train next, or when to keep fighting. I answer from the board and your saved training. Nothing leaves this device.',
  open:{feelings:'That happens to everyone.',position:'Let me look at the board.',focus:'Here is what I would do next.',opening:'Openings. Keep it simple and solid.',resign:'Before you resign, look at the facts.',progress:'Here are your numbers.',endgame:'Endgames.',hint:'Here is how to get help.'},
  close:{feelings:'Reset, then play the next good move. That is all any game asks.',position:'Fix the urgent problem first. If there is none, improve your worst piece.',focus:'One thing at a time. Small, steady gains.',opening:'A good opening gets you a normal middlegame. That is enough.',resign:'Make them prove it. Players miss wins all the time.',progress:'Look at the trend, not one day.',endgame:'Patience wins endgames.',hint:'Trust the process: checks, captures, threats.'},
  closeMate:'When mate is there, take it. Check it once, then play it.',
  who:'I am Gary Bendt, a fictional coach. In this world I reached 3200. I like sound positions, patient pressure and precise endgames. I will explain at whatever level you need, from 400 to 3200.',
  hello:'Hello. What do you want to look at?',thanks:'Any time. Keep going.',
  unknown:'I did not quite follow that. Try: "check this position", "what should I work on", "my openings", "should I resign", or "my progress".'},
 claudia:{name:'Claudia Herman',short:'Claudia',mono:'CH',tagline:'Legendary 3200 · warm, honest, mindset-first',
  intro:'Hey, I\'m Claudia. I made it to 3200 the slow way, with a lot of losses I still remember. Ask me about the board, your openings, a rough game, or whether to resign. I\'ll be honest, and I\'ll keep it about getting better, not about being perfect. Everything stays on this device.',
  open:{feelings:'Oh, I know that feeling.',position:'Okay, let\'s talk to the position. What is it asking?',focus:'Here\'s where I\'d put your energy right now.',opening:'Openings! Ideas first, move orders second.',resign:'Before you decide, let\'s separate the feeling from the facts.',progress:'Here\'s your picture. A number is information, not a grade on you.',endgame:'Endgames are where your patience pays off.',hint:'Here\'s how to get unstuck without me spoiling it.'},
  close:{feelings:'Be kind to yourself here. You\'re still learning, and so am I.',position:'If one thing worries you, solve that first. If nothing does, find your least happy piece and give it a job.',focus:'Progress over perfection. One habit at a time sticks better than five at once.',opening:'If they leave the book, don\'t panic. Ask what their move changed, then go back to the plan: develop, castle, and fight for the center.',resign:'I\'ve resigned positions I could have held, and honestly those sting more than the losses I fought out. Play a few more moves and make them show you.',progress:'Plateaus are normal. They usually mean something new is settling in.',endgame:'Slow down here. In endgames, one quiet king move is often the whole game.',hint:'Be curious first and then calculate: what changed with their last move?'},
  closeMate:'There\'s a mate on the board! Double-check it, then enjoy it.',
  who:'I\'m Claudia Herman, a fictional coach and the only other player in this world to reach 3200. I care most about how you think during a game: staying flexible, handling pressure, and learning from your own games more than from memorised lines. I\'ll explain at whatever level you\'re at.',
  hello:'Hey! Good to see you. What\'s on the board today?',thanks:'Anytime. Seriously, keep showing up. That\'s most of it.',
  unknown:'I didn\'t quite catch that. Try "check this position", "what should I work on", "my openings", "should I resign", or "my progress". Or just tell me how the last game felt.'},
};
function reply(id,text){let c=coaches[id],intent=classify(text),facts=factsFor(intent);
  if(intent==='who'||intent==='hello'||intent==='thanks'||intent==='unknown')return c[intent];
  let lv=level(),out=[];if(c.open[intent])out.push(c.open[intent]);out.push(...facts);
  if(intent==='position'&&lv==='new')out.push('Habit to build: before every move, ask "what can they check, capture, or attack next?"');
  if(intent==='position')out.push('(Rule-based scan of direct attacks. It is not an engine evaluation and can miss deeper tactics.)');
  let close=c.close[intent];if(intent==='position'&&close&&positionReport().r.myMates.length)close=c.closeMate||close;if(close)out.push(close);return out.join('\n')}

// ---- UI ----
const style=document.createElement('style');style.textContent=`#claudia-chat-open,#gary-chat-open{grid-column:1/-1;font-size:11px;padding:5px 7px;min-height:28px;text-align:left}.coach-chat{display:flex;flex-direction:column;gap:10px}.coach-chat-head{display:flex;gap:10px;align-items:center}.coach-chat-head .mentor-monogram{flex:none}.coach-chat-log{max-height:52vh;min-height:180px;overflow:auto;display:flex;flex-direction:column;gap:9px;padding:4px 2px}.chat-msg{padding:10px 12px;border-radius:6px;white-space:pre-line;font-size:calc(13px * var(--text-scale,1));line-height:1.6;max-width:94%}.chat-msg b{display:block;font-size:11px;letter-spacing:.4px;margin-bottom:2px}.chat-coach{background:#26342c;border-left:3px solid #b4d8bf;align-self:flex-start}.chat-you{background:#2d3436;align-self:flex-end;border-right:3px solid #d7be7c}.chat-claudia .chat-coach{border-left-color:#d7a6c4}.coach-chat form{display:flex;gap:6px}.coach-chat form input{flex:1;min-width:0}.chat-chips{display:flex;flex-wrap:wrap;gap:6px}.chat-chips button{font-size:12px;padding:6px 9px;min-height:30px}.chat-note{font-size:11px!important;color:#b9c5bd}`;document.head.append(style);
function build(id){let c=coaches[id],host=$('panel-coach-'+id);if(!host)return;host.replaceChildren();let wrap=document.createElement('div');wrap.className='coach-chat chat-'+id;
  wrap.innerHTML='<div class="coach-chat-head"><span class="mentor-monogram"></span><div><h2></h2><small class="muted"></small></div></div><p class="chat-note"></p><div class="coach-chat-log" role="log" aria-live="polite"></div><div class="chat-chips"></div><form><label class="sr-only"></label><input autocomplete="off"><button class="primary" type="submit">Send</button></form><button type="button" class="chat-clear">Clear this chat</button>';
  wrap.querySelector('.mentor-monogram').textContent=c.mono;wrap.querySelector('h2').textContent='Chat with '+c.name;wrap.querySelector('small').textContent=c.tagline;
  wrap.querySelector('.chat-note').textContent='Works offline. Answers come from the board, your saved training, and the local engine. No internet or AI service is used.';
  let input=wrap.querySelector('input'),label=wrap.querySelector('label');input.id='chat-input-'+id;label.htmlFor=input.id;label.textContent='Message '+c.name;input.placeholder='Ask '+c.short+'…';
  for(let q of ['Check this position','What should I work on?','My openings','Should I resign?','My progress']){let b=document.createElement('button');b.type='button';b.textContent=q;b.onclick=()=>send(id,q);wrap.querySelector('.chat-chips').append(b)}
  wrap.querySelector('form').onsubmit=e=>{e.preventDefault();let v=input.value.trim();if(!v)return;input.value='';send(id,v)};
  wrap.querySelector('.chat-clear').onclick=()=>{logs[id]=[];persist();draw(id)};
  host.append(wrap);draw(id)}
function draw(id){let host=$('panel-coach-'+id);if(!host)return;let log=host.querySelector('.coach-chat-log'),c=coaches[id];log.replaceChildren();let all=logs[id].length?logs[id]:[{from:'coach',text:c.intro}];
  for(let m of all){let d=document.createElement('div');d.className='chat-msg '+(m.from==='you'?'chat-you':'chat-coach');let b=document.createElement('b');b.textContent=m.from==='you'?'You':c.name;d.append(b,document.createTextNode(m.text));log.append(d)}log.scrollTop=log.scrollHeight}
function send(id,text){if(!logs[id].length)logs[id].push({from:'coach',text:coaches[id].intro});logs[id].push({from:'you',text:String(text).slice(0,500)});logs[id].push({from:'coach',text:reply(id,text)});logs[id]=logs[id].slice(-120);persist();draw(id)}
build('gary');build('claudia');
// Gary's rail card gets a direct way into his chat.
let card=document.querySelector('.mentor-card');if(card&&window.chessUITest){let b=document.createElement('button');b.type='button';b.id='gary-chat-open';b.textContent='Chat with Gary';b.onclick=()=>chessUITest.navigate('coach','gary');let fold=$('gary-minimize');card.insertBefore(b,fold);let b2=document.createElement('button');b2.type='button';b2.id='claudia-chat-open';b2.textContent='Chat with Claudia';b2.onclick=()=>chessUITest.navigate('coach','claudia');card.insertBefore(b2,fold)}
window.chessMatoCoaches={nextFocus,material,boardPieces,reply,classify,send,getLogs:()=>logs,coaches,positionReport};
})();
