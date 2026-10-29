'use strict';
// Personal training roadmap: optional pre-move blunder check, puzzles from your own missed forcing moves,
// resignation review with play-on, occasional endgame upkeep, and the measured side of the Player profile.
// Everything is computed locally from chess.js rules and the bundled engine's existing evaluations.
(function(){
const KEY='chessmato-training-v1',VALUE={p:1,n:3,b:3,r:5,q:9,k:0};
let st={premove:true,panel:true,checks:{shown:0,takenBack:0,playedAnyway:0,laterLowKudos:0},resigns:[],reviews:{opened:0,keptPlaying:0,resigned:0},continued:[],missed:0,sinceEndgame:0};
try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');if(d&&typeof d==='object'){for(let k of ['premove','panel'])if(typeof d[k]==='boolean')st[k]=d[k];for(let k of ['checks','reviews'])if(d[k]&&typeof d[k]==='object')Object.assign(st[k],d[k]);for(let k of ['resigns','continued'])if(Array.isArray(d[k]))st[k]=d[k].slice(-60);for(let k of ['missed','sinceEndgame'])if(Number.isFinite(d[k]))st[k]=d[k]}}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
const A=()=>window.academyCoach||{};
const humanSide=()=>A().botSide?A().botSide():null;
const N=t=>names[t];
function hangingAfter(c,me){let out=[];for(let x=0;x<8;x++)for(let y=0;y<8;y++){let s=square(x,y),p=c.get(s);if(!p||p.color!==me||p.type==='k')continue;let att=attackers(c,s,other(me));if(!att.length)continue;let def=attackers(c,s,me),cheaper=att.some(a=>{let t=Object.keys(names).find(k=>a.split(' ')[1]===names[k]);return t!=='k'&&VALUE[t]<VALUE[p.type]});if(!def.length||cheaper)out.push({s,p,undefended:!def.length})}return out}
function mateReplies(c){let out=[];for(let m of c.moves({verbose:true})){c.move(m);if(c.in_checkmate())out.push(m.san);c.undo()}return out}
// Rule-based review of a candidate move. Returns plain-language issues; empty means nothing obvious.
function review(fen,from,to,promotion){
  let before=new Chess(fen),me=before.turn(),c=new Chess(fen),m=c.move({from,to,promotion:promotion||'q'});if(!m)return [];
  let issues=[],mates=mateReplies(c);if(mates.length)issues.push('It allows checkmate: '+mates.slice(0,3).join(', ')+'.');
  let mineMates=before.moves({verbose:true}).filter(x=>{let t=new Chess(fen);t.move(x);return t.in_checkmate()}).map(x=>x.san);
  if(mineMates.length&&!c.in_checkmate())issues.push('You have checkmate instead: '+mineMates.slice(0,3).join(', ')+'.');
  let pre=new Set(hangingAfter(before,me).map(h=>h.s)),post=hangingAfter(c,me),gain=m.captured?VALUE[m.captured]:0;
  for(let h of post){if(c.in_checkmate())break;if(gain>=VALUE[h.p.type]&&h.s!==m.to)continue;
    if(h.s===m.to)issues.push('Your '+N(h.p.type)+' on '+h.s+(h.undefended?' can be taken and nothing defends it.':' can be taken by a cheaper piece.'));
    else if(!pre.has(h.s))issues.push('This leaves your '+N(h.p.type)+' on '+h.s+(h.undefended?' attacked and undefended.':' attacked by a cheaper piece.'));
    else issues.push('Your '+N(h.p.type)+' on '+h.s+' is still in danger after this move.')}
  return issues.slice(0,4)}
// ---- Play-tab controls ----
const host=$('panel-play-game'),fb=$('panel-play-feedback');
if(host){let f=document.createElement('fieldset');f.innerHTML='<legend>Middlegame support</legend><label class="setting-check"><input type="checkbox" id="premove-check"> Blunder check before each move (warns, never blocks)</label><label class="setting-check"><input type="checkbox" id="premove-panel"> Show the checks · captures · threats panel</label><p class="muted">Both are rule-based scans of direct attacks, not engine verdicts. They can miss deeper tactics.</p>';host.append(f);
 $('premove-check').checked=st.premove;$('premove-panel').checked=st.panel;$('premove-check').onchange=()=>{st.premove=$('premove-check').checked;persist()};$('premove-panel').onchange=()=>{st.panel=$('premove-panel').checked;persist();drawPanel()}}
let panel=document.createElement('div');panel.id='premove-panel-box';panel.className='notice';panel.setAttribute('aria-live','off');if(fb)fb.append(panel);
function drawPanel(){if(!fb)return;let side=humanSide();if(!st.panel||!side||game.turn()!==side||game.game_over()){panel.hidden=true;return}panel.hidden=false;let r=window.chessMatoCoaches?window.chessMatoCoaches.positionReport():null;panel.replaceChildren();let h=document.createElement('b');h.textContent='Before you move · checks, captures, threats';panel.append(h);if(r)for(let f of r.facts){let p=document.createElement('p');p.textContent=f;p.style.margin='6px 0';panel.append(p)}}
const priorRender=render;render=function(){priorRender();drawPanel()};
// ---- Pre-move dialog ----
const dlg=document.createElement('dialog');dlg.className='coach-modal';dlg.id='premove-dialog';dlg.innerHTML='<h2>Gary Bendt · before you move</h2><p id="premove-body"></p><div class="row"><button class="primary" id="premove-back">Take it back</button><button id="premove-play">Play it anyway</button></div>';document.body.append(dlg);dlg.addEventListener('cancel',e=>e.preventDefault());
let warnedMove=null;
const priorPlay=play;play=function(from,to,promotion){let side=humanSide();
  if(st.premove&&side&&game.turn()===side&&!(A().botBusy&&A().botBusy())){let piece=game.get(from),legal=piece&&piece.color===side&&game.moves({square:from,verbose:true}).some(m=>m.to===to);
   if(legal){let issues=review(game.fen(),from,to,promotion);if(issues.length){let san=new Chess(game.fen()).move({from,to,promotion:promotion||'q'}).san;st.checks.shown++;persist();
     $('premove-body').textContent='You are about to play '+san+'. '+issues.join(' ')+' Take a second look: checks, captures, threats. (Rule-based check of direct attacks.)';
     $('premove-back').onclick=()=>{dlg.close();st.checks.takenBack++;persist();selected=hover=null;render();note('Move taken back. Your turn.')};
     $('premove-play').onclick=()=>{dlg.close();st.checks.playedAnyway++;persist();warnedMove=san;priorPlay(from,to,promotion)};
     dlg.showModal();$('premove-back').focus();return}}}
  return priorPlay(from,to,promotion)};
// ---- Your own missed forcing moves become puzzles ----
window.chessMatoOnScoredMove=function(e){if(warnedMove&&e.move.san===warnedMove&&e.kudos<50)st.checks.laterLowKudos++;warnedMove=null;
  if(e.assisted||e.kudos>=50||e.loss<150||!e.suggestion||!e.fenBefore){persist();return}
  let c=new Chess(e.fenBefore),best=c.move({from:e.suggestion.slice(0,2),to:e.suggestion.slice(2,4),promotion:e.suggestion[4]||'q'});if(!best||best.san===e.move.san){persist();return}
  let mate=c.in_checkmate(),forcing=mate||/\+/.test(best.san)||!!best.captured;if(!forcing){persist();return}
  let key=e.fenBefore.split(' ').slice(0,4).join(' '),id='mine-'+Array.from(key).reduce((h,ch)=>(h*31+ch.charCodeAt(0))>>>0,7).toString(36);if(data.drills.some(d=>d.id===id)){persist();return}
  let kind=mate?'checkmate':/\+/.test(best.san)?'check':'capture',side=new Chess(e.fenBefore).turn()==='w'?'White':'Black';
  try{let d=validate([{id,title:'From your game · missed '+kind,fen:e.fenBefore,line:[best.san],tags:['from your games','missed forcing move'].concat(mate?['mate']:[],best.captured?['capture']:[],/\+/.test(best.san)?['check']:[]),rating:window.academyTest.getProfile().rating,hint:'You played '+e.move.san+' here. Look at every check and capture first.',description:side+' to move. A position from your bot game on '+new Date().toLocaleDateString('en-CA')+'. The engine (depth 10) preferred a forcing '+kind+'; other strong moves may exist.'}])[0];data.drills.push(d);save();queue();st.missed++}catch(x){}
  persist()};
// ---- Resignation review ----
const rdlg=document.createElement('dialog');rdlg.className='coach-modal';rdlg.id='resign-dialog';rdlg.innerHTML='<h2>Claudia Herman · before you resign</h2><p id="resign-body"></p><div class="row"><button class="primary" id="resign-keep">Keep playing</button><button id="resign-confirm">Resign</button></div>';document.body.append(rdlg);rdlg.addEventListener('cancel',e=>e.preventDefault());
function holdability(){let side=humanSide(),m=window.chessMatoCoaches.material(game),diff=m[side]-m[other(side)],ev=A().botEval?A().botEval():null,lines=[];
  lines.push('Material: '+(diff===0?'level':(diff>0?'you are up ':'you are down ')+Math.abs(diff))+'.');let verdict='unknown',score=null;
  if(ev&&Number.isFinite(ev.score)){score=ev.score;if(score<=-9000){verdict='mate';lines.push('The engine sees a forced mate against you with best play.')}else if(score<=-700){verdict='lost';lines.push('Engine estimate: about '+(score/100).toFixed(1)+' pawns. That is very difficult with best play.')}else if(score<=-300){verdict='difficult';lines.push('Engine estimate: about '+(score/100).toFixed(1)+' pawns. Worse, but not resolved. Practical chances remain.')}else if(score>=300){verdict='better';lines.push('Engine estimate: '+(score>=1500?'clearly winning for you':'+'+(score/100).toFixed(1)+' pawns')+'. You are better. Resigning here throws away an advantage.')}else{verdict='playable';lines.push('Engine estimate: '+(score>=0?'+':'')+(score/100).toFixed(1)+' pawns. The position is still playable; resigning here gives away a game that is not lost.')}}
  else lines.push('No fresh engine estimate for this exact position (the bot may be thinking), so this is material only.');
  lines.push('The bot plays at your training level, so it does not always find the best moves. You can resign now and still replay this position later from Player profile → Resignation review.');
  return {lines,verdict,score,diff}}
const priorResign=$('resign').onclick;
$('resign').onclick=(...args)=>{let side=humanSide();if(!side||!window.chessMatoCoaches)return priorResign&&priorResign(...args);let h=holdability();st.reviews.opened++;persist();
  $('resign-body').textContent='Let\'s separate the feeling from the facts. '+h.lines.join(' ')+' (Depth-10 estimates, not proof.) If you want to keep going, I\'m with you. If you resign, that\'s okay too, and we can replay it later.';
  $('resign-keep').onclick=()=>{rdlg.close();st.reviews.keptPlaying++;persist();note('Claudia: Good. Make them show you.')};
  $('resign-confirm').onclick=()=>{rdlg.close();st.reviews.resigned++;st.resigns.push({date:new Date().toLocaleDateString('en-CA'),fen:game.fen(),human:side,verdict:h.verdict,score:h.score,material:h.diff,moves:game.history().length});st.resigns=st.resigns.slice(-60);persist();drawResigns();priorResign&&priorResign(...args)};
  rdlg.showModal();$('resign-keep').focus()};
window.chessMatoOnGameEnd=function(e){if(e.practice&&e.startFen){let r=st.resigns.find(r=>r.fen===e.startFen);let outcome=e.win?'won':e.draw?'drawn':e.resigned?'resigned again':'lost';st.continued.push({date:new Date().toLocaleDateString('en-CA'),fen:e.startFen,outcome});st.continued=st.continued.slice(-60);if(r)r.replayed=(r.replayed||[]).concat(outcome).slice(-5);persist();drawResigns()}drawGrowth()};
function drawResigns(){let p=$('panel-profile-resign');if(!p)return;p.replaceChildren();let h=document.createElement('h2');h.textContent='Resignation review';p.append(h);
  let intro=document.createElement('p');intro.className='muted';intro.textContent='Every resignation in a ChessMato bot game is saved here with a cautious holdability note. Play on from any of them against the bot as a practice game (move Kudos count; the result does not change your rating). Reported history before ChessMato: one confirmed resignation in your 14 analysed games; the earlier 50% figure is approximate.';p.append(intro);
  let s=document.createElement('p');s.textContent='Resign button reviews: '+st.reviews.opened+' · kept playing: '+st.reviews.keptPlaying+' · resigned: '+st.reviews.resigned+' · replays from resigned positions: '+st.continued.length+' ('+st.continued.filter(c=>c.outcome==='won'||c.outcome==='drawn').length+' saved).';p.append(s);
  if(!st.resigns.length){let e=document.createElement('p');e.className='muted';e.textContent='No resignations recorded in ChessMato yet.';p.append(e);return}
  for(let r of st.resigns.slice().reverse().slice(0,12)){let row=document.createElement('div');row.className='resign-row';let t=document.createElement('p');t.textContent=r.date+' · '+(r.human==='w'?'White':'Black')+' · move '+Math.ceil(r.moves/2)+' · material '+(r.material>0?'+':'')+r.material+' · '+({mate:'forced mate seen',lost:'very difficult',difficult:'difficult, chances remained',playable:'still playable',better:'you were better',unknown:'no engine estimate'}[r.verdict]||r.verdict)+(r.replayed?' · replays: '+r.replayed.join(', '):'');let b=document.createElement('button');b.textContent='Play on from here';b.onclick=()=>A().startBotFrom(r.fen,r.human);row.append(t,b);p.append(row)}}
// ---- Occasional endgame upkeep ----
const isEnd=d=>d.tags.includes('endgame')||d.tags.includes('promotion');
const priorLoad=load;load=function(d){priorLoad(d);if(d){st.sinceEndgame=isEnd(d)?0:st.sinceEndgame+1;persist()}};
const priorPriority=priority;priority=function(d){let p=priorPriority(d);if(isEnd(d))p+=st.sinceEndgame>=7?40:-12;if(d.tags.includes('from your games'))p+=25;return p};
// ---- Measured progress (Player profile) ----
function drawGrowth(){let p=$('panel-profile-growth');if(!p)return;p.replaceChildren();const add=(tag,text,cls)=>{let e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;p.append(e);return e};
  add('h2','Measured in ChessMato');add('p','These numbers come from your practice in this browser. Your reported baseline (14 games) is on "My profile" and is kept separate.','muted');
  let pr=window.academyTest.getProfile(),k=pr.kudos||[],avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1)+'%':'—';
  add('h3','Bot games');add('p','Scored moves: '+k.length+' · Kudos average, last 40: '+avg(k.slice(-40))+' · previous 40: '+avg(k.slice(-80,-40))+'. Consistency (share of last 40 moves at 75%+ Kudos): '+(k.length?Math.round(100*k.slice(-40).filter(x=>x>=75).length/Math.min(40,k.length))+'%':'—')+'.');
  add('h3','Blunder check');add('p','Warnings shown: '+st.checks.shown+' · taken back: '+st.checks.takenBack+' · played anyway: '+st.checks.playedAnyway+(st.checks.playedAnyway?' (of those, '+st.checks.laterLowKudos+' scored under 50% Kudos)':'')+'. Missed forcing moves saved as puzzles: '+data.drills.filter(d=>d.tags.includes('from your games')).length+'.');
  add('h3','Puzzles by theme');let by={};for(let d of data.drills){let pg=data.progress[d.id];if(!pg||!pg.attempts)continue;let t=window.chessMatoPuzzles?window.chessMatoPuzzles.primary(d):d.tags[0];by[t]=by[t]||{a:0,s:0};by[t].a+=pg.attempts;by[t].s+=pg.success}
  let rows=Object.entries(by).sort((a,b)=>a[1].s/a[1].a-b[1].s/b[1].a);if(!rows.length)add('p','No puzzles completed yet.','muted');else{let ul=add('ul','');for(let [t,v] of rows){let li=document.createElement('li');li.textContent=t+': '+v.s+'/'+v.a+' clean ('+Math.round(100*v.s/v.a)+'%)';ul.append(li)}add('p','Weakest themes are listed first.','muted')}
  add('h3','Openings');let os=window.openingCoachTest.getStats(),done=os.sessions.filter(s=>s.completed),dec=done.reduce((n,s)=>n+s.decisions,0),right=done.reduce((n,s)=>n+s.firstCorrect,0),ud=done.reduce((n,s)=>n+s.unguidedDecisions,0),ur=done.reduce((n,s)=>n+s.unguidedCorrect,0);add('p','Completed sessions: '+done.length+' · first-choice recall: '+(dec?Math.round(100*right/dec)+'%':'—')+' · unaided: '+(ud?Math.round(100*ur/ud)+'%':'—')+' · mixed sessions: '+done.filter(s=>s.mixed).length+'.');
  add('h3','Endgame upkeep');add('p','Puzzles since your last endgame puzzle: '+st.sinceEndgame+'. An endgame puzzle is moved up the queue after 7.');
  add('h3','Learning history');let days=(pr.days||[]).slice().sort().slice(-7);add('p','Active days (last 7 shown): '+(days.join(', ')||'none yet')+' · lessons completed: '+(pr.quizzes||[]).length+'/10 · minigame rounds: '+(pr.rounds||0)+' · clean puzzle solves: '+(pr.clean||0)+'.');
  add('h3','Next steps');let ul=add('ul','');for(let s of (window.chessMatoCoaches?window.chessMatoCoaches.nextFocus():[])){let li=document.createElement('li');li.textContent=s;ul.append(li)}}
// Keep profile panels fresh whenever they are opened.
const nav=window.chessUITest&&window.chessUITest.navigate;if(nav){document.addEventListener('click',e=>{if(e.target.closest('#tab-profile,#section-profile-growth,#section-profile-resign'))setTimeout(()=>{drawGrowth();drawResigns()},0)})}
const style=document.createElement('style');style.textContent='.resign-row{display:flex;gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--stroke);padding:6px 0}.resign-row p{margin:0}#premove-panel-box{margin-top:12px}#premove-panel-box p{font-size:12px}';document.head.append(style);

// ---- "My profile": structured strengths and priorities from the reported baseline ----
(function(){let p=$('panel-profile-snapshot');if(!p)return;let box=document.createElement('div');box.id='profile-structured';
 const sec=(h,items,note)=>{let hh=document.createElement('h3');hh.textContent=h;box.append(hh);let ul=document.createElement(/^Priorities/.test(h)?'ol':'ul');for(let i of items){let li=document.createElement('li');li.textContent=i;ul.append(li)}box.append(ul);if(note){let n=document.createElement('p');n.className='muted';n.textContent=note;box.append(n)}};
 sec('Strengths (reported)',['Tactical awareness: 70 brilliant/excellent moves across 14 analysed games.','Finding forcing sequences.','Endgames: your best phase at 77% reported accuracy.']);
 sec('Priorities, in training order',['Opening structure (57.7% reported accuracy): Openings → Practice, then Mixed mode with guides off.','Middlegame consistency (7 reported blunders): keep the blunder check on in bot games and use the checks · captures · threats panel.','Resigning too early: the resign button now opens a review, and resigned positions can be replayed.','Endgame upkeep: an endgame puzzle comes up in the queue regularly so the strength stays sharp.']);
 sec('Results (reported)',['14 games: 5 wins, 8 losses, 1 draw.','The 14th game ended in your resignation (confirmed). The earlier "about 50% of losses were resignations" figure is approximate.'],'Named moments such as Nd6 against maykalka (a missed winning rook check) cannot be rebuilt from move names. Send the PGN or exact FEN and it can become a real puzzle. For now you can load a FEN in Analysis → Load a position, or add an exact drill (FEN plus moves) in Coaches → Import drills. PGN import is the next queued feature.');
 p.append(box)})();
drawGrowth();drawResigns();queue();
window.chessMatoTraining={review,get:()=>st,holdability,drawGrowth,drawResigns};
})();
