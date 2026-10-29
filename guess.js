'use strict';
// Guess the move: play through a finished game from one side's point of view. At each of your turns you choose a
// move; the real game move is then played. Exact matches score 3; with the local engine, close alternatives score 1–2.
// Uses a few short classical games (public-domain game scores, each verified to end in the recorded checkmate) plus any
// game saved under Player profile → My games.
(function(){
const KEY='chessmato-guess-v1';
const CLASSICS=[
 {id:'opera',white:'Paul Morphy',black:'Duke Karl / Count Isouard',event:'Paris Opera, 1858',result:'1-0',moves:'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'},
 {id:'immortal',white:'Adolf Anderssen',black:'Lionel Kieseritzky',event:'London, 1851 ("The Immortal Game")',result:'1-0',moves:'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#'},
 {id:'evergreen',white:'Adolf Anderssen',black:'Jean Dufresne',event:'Berlin, 1852 ("The Evergreen Game")',result:'1-0',moves:'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#'},
 {id:'reti',white:'Richard Réti',black:'Savielly Tartakower',event:'Vienna, 1910',result:'1-0',moves:'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O Nxe4 Qd8+ Kxd8 Bg5+ Kc7 Bd8#'},
 {id:'lasker',white:'Edward Lasker',black:'George Alan Thomas',event:'London, 1912 (king hunt)',result:'1-0',moves:'d4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ Kxh7 Nxf6+ Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2#'}];
const classics=CLASSICS.map(g=>{let c=new Chess(),sans=[];for(let s of g.moves.split(' ')){let m=c.move(s);if(!m)return null;sans.push(m.san)}return c.in_checkmate()?{...g,sans,start:null,label:g.white+' – '+g.black+', '+g.event}:null}).filter(Boolean);
let best={};try{best=JSON.parse(localStorage.getItem(KEY)||'{}').best||{}}catch(e){}
let G=null;// {game, side, ply, score, matched, turns, fen, log:[]}
function sources(){let mine=window.chessMatoGames?chessMatoGames.get().games.map(g=>({id:g.id,sans:g.sans,start:g.start,result:g.result,label:'My games: '+(g.headers.White||'?')+' – '+(g.headers.Black||'?')+(g.headers.Date&&!/\?/.test(g.headers.Date)?' ('+g.headers.Date+')':''),userColor:g.userColor})):[];return classics.concat(mine)}
const winner=g=>g.result==='1-0'?'w':g.result==='0-1'?'b':'w';
function el(tag,text,parent,cls){let e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e}
// ---- Engine (optional partial credit) ----
function evalMoves(fen,ucis){return new Promise(resolve=>{if(location.protocol==='file:'){resolve(null);return}let w;try{w=new Worker('stockfish.js')}catch(e){resolve(null);return}
  let out=[],i=0,timer=setTimeout(()=>{w.terminate();resolve(null)},20000),f=fen.replace(/ \d+ (\d+)$/,' 0 $1');
  const next=()=>{if(i>=ucis.length){clearTimeout(timer);w.terminate();resolve(out);return}w.postMessage('position fen '+f+' moves '+ucis[i]);w.postMessage('go depth 10')};
  w.onmessage=e=>{let l=String(e.data),m=l.match(/score (cp|mate) (-?\d+)/);if(m)out[i]=m[1]==='mate'?(Number(m[2])>0?-10000:10000):-Number(m[2]);if(l.startsWith('bestmove')){if(out[i]===undefined)out[i]=l.includes('(none)')?10000:0;i++;next()}};w.postMessage('uci');next()})}
// ---- Flow ----
function startGame(src,side){stop(true);$('mode').value='free';$('mode').dispatchEvent(new Event('change'));if(window.chessUITest)chessUITest.navigate('play','guess');game.load(src.start||new Chess().fen());baseFen=game.fen();selected=hover=null;flipped=side==='b';
  G={src,side,ply:0,score:0,matched:0,close:0,turns:0,log:[],fen:game.fen(),busy:false};$('title').textContent='Guess the move';$('description').textContent=src.label;render();drawPanel();advance()}
function apply(san){let m=game.move(san);G.ply++;G.fen=game.fen();selected=hover=null;render();return m}
function advance(){if(!G)return;if(G.ply>=G.src.sans.length){finish();return}if(game.turn()!==G.side){G.busy=true;busy=true;setTimeout(()=>{if(!G)return;busy=false;G.busy=false;let m=apply(G.src.sans[G.ply]);note('They played '+m.san+'. Your move: what was played here?');drawPanel();advance()},450)}
  else{note('Your move ('+(G.side==='w'?'White':'Black')+'): guess what was played.');drawPanel()}}
async function guess(from,to,promotion){let fen=game.fen(),c=new Chess(fen),mine=c.move({from,to,promotion:promotion||'q'});if(!mine){note('Illegal move.');return}
  let realSan=G.src.sans[G.ply],r=new Chess(fen).move(realSan);G.turns++;
  let entry={ply:G.ply,real:r.san,mine:mine.san,pts:0,note:''};
  if(mine.san===r.san){entry.pts=3;G.matched++;entry.note='Exact match.'}
  else{G.busy=true;busy=true;note('Checking your move with the local engine…');let ev=await evalMoves(fen,[r.from+r.to+(r.promotion||''),mine.from+mine.to+(mine.promotion||'')]);busy=false;G.busy=false;if(!G)return;
    if(ev){let diff=ev[0]-ev[1];entry.diff=diff;entry.pts=diff<=30?2:diff<=100?1:0;if(entry.pts)G.close++;entry.note=entry.pts===2?'Engine: about as good as the game move.':entry.pts===1?'Engine: reasonable, a bit weaker.':'Engine: clearly weaker than the game move ('+(diff>=9000?'it misses a forced line':(diff/100).toFixed(1)+' pawns')+').'}
    else entry.note='Not the game move (engine check needs the local launcher).'}
  G.score+=entry.pts;G.log.push(entry);apply(realSan);
  note((entry.pts===3?'Yes! ':'The game continued ')+r.san+(entry.pts===3?' was played.':' (you chose '+mine.san+'). ')+(entry.pts===3?'':entry.note)+' +'+entry.pts);drawPanel();advance()}
function finish(){let max=3*G.turns,pct=max?Math.round(100*G.score/max):0,id=G.src.id+'-'+G.side;if(!best[id]||pct>best[id])best[id]=pct;try{localStorage.setItem(KEY,JSON.stringify({best}))}catch(e){}
  G.finished=true;note('Game over: '+G.matched+'/'+G.turns+' exact matches, '+G.close+' close, score '+G.score+'/'+max+' ('+pct+'%).');drawPanel()}
function stop(silent){if(!G)return;G=null;busy=false;if(!silent)note('Guess the move stopped. The board is yours to analyse.');drawPanel()}
// Moves on your turn become guesses; the real move is played instead.
const priorPlay=play;play=function(from,to,promotion){if(G&&!G.finished&&!G.busy&&game.turn()===G.side&&game.fen()===G.fen)return guess(from,to,promotion);return priorPlay(from,to,promotion)};
// Loading another position (puzzle, FEN, opening drill) quietly ends the game.
const priorRender=render;render=function(...a){if(G&&!G.busy&&game.fen()!==G.fen)G=null,busy=false,setTimeout(drawPanel);return priorRender(...a)};
// ---- UI: Play → Guess the move ----
const panel=$('panel-play-guess');
function drawPanel(){if(!panel)return;let st=$('guess-state');if(!st)return;st.replaceChildren();$('guess-stop').hidden=!G;$('guess-start').textContent=G?'Restart':'Start';
  if(!G){el('p','Choose a game and a side, then press Start. On your turns, play the move you think was played.',st,'muted');return}
  let max=3*G.turns;el('p','Move '+Math.ceil((G.ply+1)/2)+' of '+Math.ceil(G.src.sans.length/2)+' · score '+G.score+(max?'/'+max:'')+' · exact '+G.matched+' · close '+G.close,st);
  for(let x of G.log.slice(-6).reverse())el('p',(Math.floor(x.ply/2)+1)+(x.ply%2?'… ':'. ')+x.real+(x.mine===x.real?' ✓':' (you: '+x.mine+')')+' +'+x.pts,st,'guess-log');
  if(G.finished)el('p','Finished. Best on this game: '+best[G.src.id+'-'+G.side]+'%.',st,'notice')}
function fill(){let s=$('guess-game'),keep=s.value;s.replaceChildren();for(let g of sources()){let o=el('option',g.label,s);o.value=g.id}if(keep&&[...s.options].some(o=>o.value===keep))s.value=keep;sideDefault()}
function sideDefault(){let g=sources().find(g=>g.id===$('guess-game').value);if(g)$('guess-side').value=g.userColor||winner(g)}
if(panel){panel.innerHTML='<h2>Guess the move</h2><p class="muted">Follow a finished game from one side. Exact matches score 3; with the local engine, alternatives within about a third of a pawn score 2 and within a pawn score 1. Untimed. Add your own games under Player profile → My games.</p><label for="guess-game">Game</label><select id="guess-game"></select><div class="row"><select id="guess-side" aria-label="Your side"><option value="w">Play as White</option><option value="b">Play as Black</option></select><button class="primary" id="guess-start">Start</button><button id="guess-stop" hidden>Stop</button></div><div id="guess-state" aria-live="polite"></div><p class="muted">Classic game scores are public domain; each bundled game is verified to end in its recorded checkmate.</p>';
  fill();$('guess-game').onchange=sideDefault;$('guess-game').onfocus=fill;
  $('guess-start').onclick=()=>{let g=sources().find(g=>g.id===$('guess-game').value);if(g)startGame(g,$('guess-side').value)};$('guess-stop').onclick=()=>stop();drawPanel()}
const style=document.createElement('style');style.textContent='#guess-state p{margin:4px 0}.guess-log{font:13px ui-monospace,monospace}#guess-game{width:100%;margin-bottom:8px}';document.head.append(style);
window.chessMatoGuess={classics,sources,start:(id,side)=>{let g=sources().find(g=>g.id===id);if(g)startGame(g,side||winner(g))},get:()=>G,stop,best:()=>best};
})();
