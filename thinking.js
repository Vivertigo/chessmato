'use strict';
// Dream Board (internally the thinking board): opened on demand (right-click or long-press on the board → "Think it through", the T key, or the
// button beside Undo), it turns the board into a private, tinted copy where you can play out one line for both sides. Back/Forward step through it; Reset returns to the real game; Play sends only the
// first move through the normal move path (blunder check, scoring, puzzles all still apply).
// The live `game` is never modified while thinking; rendering swaps in a separate Chess copy temporarily.
(function(){
const KEY='chessmato-thinking-v1';let enabled=true;try{enabled=localStorage.getItem(KEY)!=='off'}catch(e){}
let T=null;// {base, line:[verbose moves], cur}
const A=()=>window.academyCoach||{};
const box=document.createElement('div');box.id='thinking-bar';box.hidden=true;box.innerHTML='<div id="thinking-label"><b>Dream Board</b> · only you can see this · the real game has not moved</div><div id="thinking-line" aria-live="polite"></div><div class="row"><button id="thinking-back" aria-label="Step back">◀ Back</button><button id="thinking-forward" aria-label="Step forward">Forward ▶</button><button id="thinking-reset">Reset to real game</button><button class="primary" id="thinking-play">Play</button></div>';$('board').before(box);
function applies(){if(!enabled||busy)return false;if(A().inMinigame&&A().inMinigame())return false;let side=A().botSide&&A().botSide();if(side&&game.turn()!==side)return false;if($('mode').value==='drill'&&done)return false;return true}
function pos(n){let c=new Chess(T.base);for(let m of T.line.slice(0,n===undefined?T.cur:n))c.move(m.san);return c}
function withThinking(fn){if(!T)return fn();let real=game;game=pos();try{return fn()}finally{game=real}}
function exit(msg){if(!T)return;T=null;selected=hover=null;box.hidden=true;$('board').classList.remove('thinking');render();if(msg)note(msg)}
function lineText(){let c=new Chess(T.base),n=Number(T.base.split(' ')[5])||1,black=c.turn()==='b',parts=[];T.line.forEach((m,i)=>{let w=(black?i+1:i)%2===0;let num=w?n+Math.floor((black?i+1:i)/2)+'. ':i===0?n+'… ':'';parts.push({t:num+m.san,i})});return parts}
function drawBar(){if(!T){box.hidden=true;return}box.hidden=false;let el=$('thinking-line');el.replaceChildren();let lbl=document.createElement('span');lbl.textContent='Your line: ';el.append(lbl);
  for(let p of lineText()){let s=document.createElement('span');s.textContent=p.t+' ';s.className='thinking-move'+(p.i===T.cur-1?' current':p.i>=T.cur?' ahead':'');el.append(s)}
  if(!T.line.length)el.append(document.createTextNode('(play a move on the board to start your line)'));
  $('thinking-back').disabled=T.cur===0;$('thinking-forward').disabled=T.cur>=T.line.length;let first=T.line[0];$('thinking-play').disabled=!first;$('thinking-play').textContent=first?'Play '+first.san:'Play';
  let side=pos().turn()==='w'?'White':'Black';$('thinking-label').lastChild.textContent=' · only you can see this · the real game has not moved · '+side+' to move on this board'}
const priorRender=render;render=function(){if(T&&game.fen()!==T.base){T=null;box.hidden=true;$('board').classList.remove('thinking')}
  if(!T){priorRender();return}let real=game;game=pos();try{priorRender()}finally{game=real}
  $('log').textContent=game.history().join('  ');$('fen').value=game.fen();$('board').classList.add('thinking');if(window.chessMatoAppearance)chessMatoAppearance.recolor();drawBar()};
for(let name of ['paintPreview','explain']){let prior=window[name];let wrapped=function(...a){return withThinking(()=>prior(...a))};if(name==='paintPreview')paintPreview=wrapped;else explain=wrapped}
function addMove(from,to,promotion){let c=pos(),m=c.move({from,to,promotion:promotion||'q'});if(!m)return;T.line=T.line.slice(0,T.cur);T.line.push(m);T.cur=T.line.length;selected=hover=null;render();note('Dream Board: '+m.san+'. '+(T.cur===1?'Keep going for both sides, or press Play to send this move.':'Step back, keep going, or press Play to send your first move.'))}
function promote(from,to,done){let d=$('promotion'),btns=document.querySelectorAll('[data-prom]'),saved=Array.from(btns).map(b=>b.onclick);btns.forEach(b=>b.onclick=()=>{d.close();btns.forEach((x,i)=>x.onclick=saved[i]);done(b.dataset.prom)});d.showModal()}
const priorClick=clickSquare;clickSquare=function(s){
  if(!T)return priorClick(s);
  let c=pos(),p=selected&&c.get(selected),m=p&&p.color===c.turn()&&c.moves({square:selected,verbose:true}).find(x=>x.to===s);
  if(m){let from=selected;if(m.flags.includes('p')){promote(from,s,pr=>addMove(from,s,pr));return}addMove(from,s,'q');return}
  let q=c.get(s);selected=q&&q.color===c.turn()&&selected!==s?s:null;hover=null;render();withThinking(()=>explain(s))};
// Opening and closing on demand. The live game keeps going (clocks included) while you think.
function open(){if(T)return true;if(!enabled)return false;if(!applies()){note('The Dream Board is not available right now (wait for your turn).');return false}
  T={base:game.fen(),line:[],cur:0};hover=null;render();note('Dream Board open: play a line for both sides, then press Play to send your first move. Only you can see it.');return true}
function toggle(){if(T)exit('Back to the real game. Nothing was played.');else open()}
function submit(){if(!T||!T.line.length)return;let m=T.line[0];T=null;box.hidden=true;$('board').classList.remove('thinking');selected=null;hover=null;render();
  // Same path as a click on the real board.
  play(m.from,m.to,m.promotion||'q')}
$('thinking-play').onclick=submit;$('thinking-reset').onclick=()=>exit('Back to the real game. Nothing was played.');
$('thinking-back').onclick=()=>{if(T&&T.cur>0){T.cur--;selected=hover=null;render()}};$('thinking-forward').onclick=()=>{if(T&&T.cur<T.line.length){T.cur++;selected=hover=null;render()}};
$('board').addEventListener('keydown',e=>{if(!T){if((e.key==='t'||e.key==='T')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&enabled){e.preventDefault();open()}return}if(e.key==='t'||e.key==='T'){e.preventDefault();return}if(e.key==='Escape'&&!selected){e.preventDefault();exit('Back to the real game. Nothing was played.')}else if(e.key==='['||e.key==='PageUp'){e.preventDefault();$('thinking-back').click()}else if(e.key===']'||e.key==='PageDown'){e.preventDefault();$('thinking-forward').click()}else if((e.key==='p'||e.key==='P'||(e.key==='Enter'&&(e.ctrlKey||e.metaKey)))&&!e.altKey){e.preventDefault();if(!$('thinking-play').disabled)$('thinking-play').click()}});
let fs=$('show-legal')&&$('show-legal').closest('fieldset');if(fs){let l=document.createElement('label');l.className='setting-check';l.innerHTML='<input type="checkbox" id="thinking-moves"> Dream Board: offer "Think it through" (right-click or long-press the board, the T key, or the Dream Board button beside Undo) to try out a line privately before a move is played';fs.prepend(l);$('thinking-moves').checked=enabled;$('thinking-moves').onchange=()=>{enabled=$('thinking-moves').checked;try{localStorage.setItem(KEY,enabled?'on':'off')}catch(e){}exit();syncButton()}}
let help=$('board-keyboard-help');if(help)help.textContent+=' T opens the Dream Board (so does the context-menu key). On the Dream Board: [ or Page Up steps back, ] or Page Down steps forward, P (or Ctrl+Enter) plays your first move, Escape returns to the real game.';
const style=document.createElement('style');style.textContent=`#board.thinking{border-color:#2f6fb0;box-shadow:0 0 0 4px #9cc8f2,0 0 0 8px #2f6fb0;position:relative}#board.thinking .sq.light{background:#cfe0ee}#board.thinking .sq.dark{background:#6f8fa8}#board.thinking .sq.light:hover{background:#cfe0ee}#board.thinking .sq.dark:hover{background:#6f8fa8}
#thinking-bar{background:#16324d;color:#eef6ff;border:2px solid #9cc8f2;border-radius:6px;padding:10px 12px;margin:0 0 10px}#thinking-bar .row{margin:8px 0 0;gap:6px}#thinking-label{font-size:13px}#thinking-label b{font-size:15px;letter-spacing:.3px}#thinking-line{font:13px ui-monospace,monospace;margin-top:6px;line-height:1.7}.thinking-move.current{background:#9cc8f2;color:#0c2236;border-radius:3px;padding:0 3px}.thinking-move.ahead{opacity:.55}#thinking-bar button{background:#22496e;border-color:#9cc8f2;color:#fff}#thinking-bar button.primary{background:#e9f4ff;color:#0c2236;font-weight:700}#thinking-bar button:disabled{opacity:.45}`;document.head.append(style);
// ---- Ways to open it: a visible button, a context menu (right-click / long-press / menu key) ----
const btn=document.createElement('button');btn.id='think-open';btn.type='button';btn.setAttribute('aria-pressed','false');btn.title='Think it through: try a line privately before playing (T)';
let undo=$('undo');if(undo)undo.after(btn);
function syncButton(){btn.hidden=!enabled;btn.textContent=T?'Leave Dream Board':'Dream Board';btn.setAttribute('aria-pressed',String(!!T))}
btn.onclick=()=>{toggle();syncButton()};
const menu=document.createElement('div');menu.id='think-menu';menu.setAttribute('role','menu');menu.hidden=true;menu.innerHTML='<button role="menuitem" id="think-menu-go">Think it through</button><button role="menuitem" id="think-menu-cancel">Cancel</button>';document.body.append(menu);
function showMenu(x,y,square){if(!enabled)return;$('think-menu-go').textContent=T?'Back to the real game':'Think it through';menu.dataset.square=square||'';menu.hidden=false;
  let r=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';$('think-menu-go').focus()}
function hideMenu(back){if(menu.hidden)return;menu.hidden=true;if(back){let q=$('board').querySelector('[data-s="'+(menu.dataset.square||'')+'"]')||$('board').querySelector('.sq[tabindex="0"]');if(q)q.focus({preventScroll:true})}}
$('think-menu-go').onclick=()=>{let sq=menu.dataset.square;hideMenu(true);if(T){exit('Back to the real game. Nothing was played.');return}
  if(open()&&sq){let p=game.get(sq);if(p&&p.color===game.turn()){selected=sq;render()}}};
$('think-menu-cancel').onclick=()=>hideMenu(true);
menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hideMenu(true)}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();let b=[...menu.querySelectorAll('button')],i=b.indexOf(document.activeElement);b[(i+(e.key==='ArrowDown'?1:b.length-1))%b.length].focus()}});
addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target))hideMenu(false)},true);addEventListener('scroll',()=>hideMenu(false),true);
$('board').addEventListener('contextmenu',e=>{if(!enabled)return;e.preventDefault();if(!menu.hidden)return;let sq=e.target.closest&&e.target.closest('[data-s]');
  let x=e.clientX,y=e.clientY;if(!x&&!y){let r=(sq||$('board')).getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}showMenu(x,y,sq&&sq.dataset.s)});
// Touch: a long press opens the same menu (iOS never sends contextmenu), and the tap that ends it is not a move.
let press=null,swallow=false;
$('board').addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!enabled)return;let sq=e.target.closest('[data-s]');press={x:e.clientX,y:e.clientY,id:e.pointerId,timer:setTimeout(()=>{press=null;swallow=true;showMenu(e.clientX,e.clientY,sq&&sq.dataset.s)},550)}});
const endPress=e=>{if(press&&(!e||e.pointerId===press.id)){clearTimeout(press.timer);press=null}};
addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)endPress(e)});addEventListener('pointerup',endPress);addEventListener('pointercancel',endPress);
$('board').addEventListener('click',e=>{if(swallow){swallow=false;e.stopPropagation();e.preventDefault()}},true);
const priorRender2=render;render=function(...a){let r=priorRender2(...a);syncButton();return r};syncButton();
document.head.append(Object.assign(document.createElement('style'),{textContent:'#think-menu{position:fixed;z-index:1200;display:flex;flex-direction:column;gap:4px;padding:6px;min-width:190px;background:var(--surface,#15241c);border:1px solid var(--stroke,#2f5240);border-radius:14px;box-shadow:0 12px 30px rgba(40,8,2,.45)}#think-menu[hidden]{display:none}#think-menu button{text-align:left;border-radius:10px}#think-menu-go{font-weight:650}#think-open[aria-pressed=true]{background:#22496e;border-color:#9cc8f2;color:#fff}'}));
window.chessMatoThinking={get:()=>T&&{base:T.base,line:T.line.map(m=>m.san),cur:T.cur},enabled:()=>enabled,submit,exit,open,toggle,menu:showMenu};
})();
