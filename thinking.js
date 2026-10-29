'use strict';
// Thinking board: your first chosen move turns the board into a private, tinted copy where you can play out
// one line for both sides. Back/Forward step through it; Reset returns to the real game; Play sends only the
// first move through the normal move path (blunder check, scoring, puzzles all still apply).
// The live `game` is never modified while thinking; rendering swaps in a separate Chess copy temporarily.
(function(){
const KEY='chessmato-thinking-v1';let enabled=true;try{enabled=localStorage.getItem(KEY)!=='off'}catch(e){}
let T=null;// {base, line:[verbose moves], cur}
const A=()=>window.academyCoach||{};
const box=document.createElement('div');box.id='thinking-bar';box.hidden=true;box.innerHTML='<div id="thinking-label"><b>Thinking board</b> · only you can see this · the real game has not moved</div><div id="thinking-line" aria-live="polite"></div><div class="row"><button id="thinking-back" aria-label="Step back">◀ Back</button><button id="thinking-forward" aria-label="Step forward">Forward ▶</button><button id="thinking-reset">Reset to real game</button><button class="primary" id="thinking-play">Play</button></div>';$('board').before(box);
function applies(){if(!enabled||busy)return false;if(A().inMinigame&&A().inMinigame())return false;let side=A().botSide&&A().botSide();if(side&&game.turn()!==side)return false;if($('mode').value==='drill'&&done)return false;return true}
function pos(n){let c=new Chess(T.base);for(let m of T.line.slice(0,n===undefined?T.cur:n))c.move(m.san);return c}
function withThinking(fn){if(!T)return fn();let real=game;game=pos();try{return fn()}finally{game=real}}
function exit(msg){if(!T)return;T=null;selected=hover=null;box.hidden=true;$('board').classList.remove('thinking');render();if(msg)note(msg)}
function lineText(){let c=new Chess(T.base),n=Number(T.base.split(' ')[5])||1,black=c.turn()==='b',parts=[];T.line.forEach((m,i)=>{let w=(black?i+1:i)%2===0;let num=w?n+Math.floor((black?i+1:i)/2)+'. ':i===0?n+'… ':'';parts.push({t:num+m.san,i})});return parts}
function drawBar(){if(!T){box.hidden=true;return}box.hidden=false;let el=$('thinking-line');el.replaceChildren();let lbl=document.createElement('span');lbl.textContent='Your line: ';el.append(lbl);
  for(let p of lineText()){let s=document.createElement('span');s.textContent=p.t+' ';s.className='thinking-move'+(p.i===T.cur-1?' current':p.i>=T.cur?' ahead':'');el.append(s)}
  if(!T.line.length)el.append(document.createTextNode('(stepped back to the real position: play a move to start a new line)'));
  $('thinking-back').disabled=T.cur===0;$('thinking-forward').disabled=T.cur>=T.line.length;let first=T.line[0];$('thinking-play').disabled=!first;$('thinking-play').textContent=first?'Play '+first.san:'Play';
  let side=pos().turn()==='w'?'White':'Black';$('thinking-label').lastChild.textContent=' · only you can see this · the real game has not moved · '+side+' to move on this board'}
const priorRender=render;render=function(){if(T&&game.fen()!==T.base){T=null;box.hidden=true;$('board').classList.remove('thinking')}
  if(!T){priorRender();return}let real=game;game=pos();try{priorRender()}finally{game=real}
  $('log').textContent=game.history().join('  ');$('fen').value=game.fen();$('board').classList.add('thinking');if(window.chessMatoAppearance)chessMatoAppearance.recolor();drawBar()};
for(let name of ['paintPreview','explain']){let prior=window[name];let wrapped=function(...a){return withThinking(()=>prior(...a))};if(name==='paintPreview')paintPreview=wrapped;else explain=wrapped}
function addMove(from,to,promotion){let c=pos(),m=c.move({from,to,promotion:promotion||'q'});if(!m)return;T.line=T.line.slice(0,T.cur);T.line.push(m);T.cur=T.line.length;selected=hover=null;render();note('Thinking: '+m.san+'. '+(T.cur===1?'Keep going for both sides, or press Play to send this move.':'Step back, keep going, or press Play to send your first move.'))}
function promote(from,to,done){let d=$('promotion'),btns=document.querySelectorAll('[data-prom]'),saved=Array.from(btns).map(b=>b.onclick);btns.forEach(b=>b.onclick=()=>{d.close();btns.forEach((x,i)=>x.onclick=saved[i]);done(b.dataset.prom)});d.showModal()}
const priorClick=clickSquare;clickSquare=function(s){
  if(!T){if(!applies())return priorClick(s);let p=selected&&game.get(selected),m=p&&p.color===game.turn()&&game.moves({square:selected,verbose:true}).find(x=>x.to===s);
    if(!m)return priorClick(s);let from=selected;T={base:game.fen(),line:[],cur:0};
    if(m.flags.includes('p')){promote(from,s,pr=>addMove(from,s,pr));return}addMove(from,s,'q');return}
  let c=pos(),p=selected&&c.get(selected),m=p&&p.color===c.turn()&&c.moves({square:selected,verbose:true}).find(x=>x.to===s);
  if(m){let from=selected;if(m.flags.includes('p')){promote(from,s,pr=>addMove(from,s,pr));return}addMove(from,s,'q');return}
  let q=c.get(s);selected=q&&q.color===c.turn()&&selected!==s?s:null;hover=null;render();withThinking(()=>explain(s))};
function submit(){if(!T||!T.line.length)return;let m=T.line[0];T=null;box.hidden=true;$('board').classList.remove('thinking');selected=null;hover=null;render();
  // Same path as a click on the real board.
  play(m.from,m.to,m.promotion||'q')}
$('thinking-play').onclick=submit;$('thinking-reset').onclick=()=>exit('Back to the real game. Nothing was played.');
$('thinking-back').onclick=()=>{if(T&&T.cur>0){T.cur--;selected=hover=null;render()}};$('thinking-forward').onclick=()=>{if(T&&T.cur<T.line.length){T.cur++;selected=hover=null;render()}};
$('board').addEventListener('keydown',e=>{if(!T)return;if(e.key==='Escape'&&!selected){e.preventDefault();exit('Back to the real game. Nothing was played.')}else if(e.key==='['||e.key==='PageUp'){e.preventDefault();$('thinking-back').click()}else if(e.key===']'||e.key==='PageDown'){e.preventDefault();$('thinking-forward').click()}else if((e.key==='p'||e.key==='P'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey)))&&!e.altKey){e.preventDefault();if(!$('thinking-play').disabled)$('thinking-play').click()}});
let fs=$('show-legal')&&$('show-legal').closest('fieldset');if(fs){let l=document.createElement('label');l.className='setting-check';l.innerHTML='<input type="checkbox" id="thinking-moves"> Thinking board: try out a line privately before a move is played';fs.prepend(l);$('thinking-moves').checked=enabled;$('thinking-moves').onchange=()=>{enabled=$('thinking-moves').checked;try{localStorage.setItem(KEY,enabled?'on':'off')}catch(e){}exit()}}
let help=$('board-keyboard-help');if(help)help.textContent+=' On the thinking board: [ or Page Up steps back, ] or Page Down steps forward, P (or Ctrl+Enter) plays your first move, Escape returns to the real game.';
const style=document.createElement('style');style.textContent=`#board.thinking{border-color:#2f6fb0;box-shadow:0 0 0 4px #9cc8f2,0 0 0 8px #2f6fb0;position:relative}#board.thinking .sq.light{background:#cfe0ee}#board.thinking .sq.dark{background:#6f8fa8}#board.thinking .sq.light:hover{background:#cfe0ee}#board.thinking .sq.dark:hover{background:#6f8fa8}
#thinking-bar{background:#16324d;color:#eef6ff;border:2px solid #9cc8f2;border-radius:6px;padding:10px 12px;margin:0 0 10px}#thinking-bar .row{margin:8px 0 0;gap:6px}#thinking-label{font-size:13px}#thinking-label b{font-size:15px;letter-spacing:.3px}#thinking-line{font:13px ui-monospace,monospace;margin-top:6px;line-height:1.7}.thinking-move.current{background:#9cc8f2;color:#0c2236;border-radius:3px;padding:0 3px}.thinking-move.ahead{opacity:.55}#thinking-bar button{background:#22496e;border-color:#9cc8f2;color:#fff}#thinking-bar button.primary{background:#e9f4ff;color:#0c2236;font-weight:700}#thinking-bar button:disabled{opacity:.45}`;document.head.append(style);
window.chessMatoThinking={get:()=>T&&{base:T.base,line:T.line.map(m=>m.san),cur:T.cur},enabled:()=>enabled,submit,exit};
})();
