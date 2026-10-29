'use strict';
// Touch, sound and haptics. Drag-to-move works alongside click-to-move: dragging just performs the same two clicks,
// so legality, the thinking board, blunder checks and puzzles behave exactly as with clicks. Sounds are synthesized
// (no audio files) and vibration is used only where the device supports it. Each can be switched off.
(function(){
const KEY='chessmato-feel-v1';let S={drag:true,sound:true,haptics:true};try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
// ---- Drag to move ----
const board=$('board');let drag=null;
const squareAt=(x,y)=>{let e=document.elementFromPoint(x,y);e=e&&e.closest&&e.closest('#board [data-s]');return e?e.dataset.s:null};
board.addEventListener('pointerdown',e=>{if(!S.drag||e.button!==0||busy)return;let t=e.target.closest('[data-s]');if(!t||!t.querySelector('.piece'))return;
  drag={from:t.dataset.s,x:e.clientX,y:e.clientY,id:e.pointerId,ghost:null,moved:false,size:t.getBoundingClientRect().width,html:t.querySelector('.piece').outerHTML}});
addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(!drag.moved){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<8)return;drag.moved=true;
    clickSquare(drag.from);if(selected!==drag.from){drag=null;return}let g=document.createElement('div');g.className='drag-ghost';g.innerHTML=drag.html;g.style.width=g.style.height=drag.size+'px';document.body.append(g);drag.ghost=g;board.classList.add('dragging');
    let src=board.querySelector('[data-s="'+drag.from+'"] .piece');if(src)src.style.opacity='.35'}
  drag.ghost.style.transform='translate('+(e.clientX-drag.size/2)+'px,'+(e.clientY-drag.size/2)+'px)';e.preventDefault()},{passive:false});
function endDrag(e){if(!drag||e.pointerId!==drag.id)return;let d=drag;drag=null;if(!d.moved)return;d.ghost.remove();board.classList.remove('dragging');
  let to=squareAt(e.clientX,e.clientY);suppress=true;setTimeout(()=>suppress=false,0);if(to&&to!==d.from)clickSquare(to);else{selected=null;hover=null;render()}}
let suppress=false;addEventListener('pointerup',endDrag);addEventListener('pointercancel',e=>{if(drag&&drag.ghost)drag.ghost.remove();board.classList.remove('dragging');drag=null;render()});
// A drag that ends on the starting square must not also count as a click.
board.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault()}},true);
// ---- Sound ----
let ctx=null;function tone(freq,dur,type,vol,delay){if(!S.sound)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();let t=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'triangle';o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.12,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+0.02)}catch(e){}}
const buzz=p=>{if(S.haptics&&navigator.vibrate)try{navigator.vibrate(p)}catch(e){}};
const SOUNDS={move:()=>{tone(420,0.07,'triangle',0.1);buzz(12)},capture:()=>{tone(300,0.06,'square',0.08);tone(220,0.09,'triangle',0.1,0.04);buzz([18,30,18])},
 check:()=>{tone(660,0.08,'triangle',0.1);tone(880,0.1,'triangle',0.09,0.07);buzz([25,40,25])},mate:()=>{[523,659,784,1046].forEach((f,i)=>tone(f,0.16,'triangle',0.1,i*0.09));buzz([30,50,30,50,60])},
 good:()=>{tone(587,0.1,'sine',0.12);tone(880,0.16,'sine',0.11,0.08);buzz(20)},miss:()=>{tone(330,0.14,'sine',0.1);tone(247,0.2,'sine',0.1,0.1);buzz([40,60,40])}};
let last={fen:null,len:0},lastPlayed=null;
function onRender(){let fen=game.fen(),h=game.history({verbose:true});if(fen===last.fen)return;let grew=h.length===last.len+1&&last.fen!==null;last={fen,len:h.length};if(!grew)return;
  let m=h[h.length-1],k=game.in_checkmate()?'mate':game.in_check()?'check':m.captured?'capture':'move';lastPlayed=k;SOUNDS[k]()}
const priorRender=render;render=function(...a){let r=priorRender(...a);try{onRender()}catch(e){}return r};
const priorComplete=complete;complete=function(...a){let wasFailed=failed,r=priorComplete(...a);try{(wasFailed?SOUNDS.miss:SOUNDS.good)()}catch(e){}return r};
// ---- Settings ----
let fs=$('show-legal')&&$('show-legal').closest('fieldset');if(fs){for(let [k,label] of [['drag','Drag pieces to move (clicking still works)'],['sound','Sounds for moves, captures, checks and results'],['haptics','Vibration on phones and tablets']]){let l=document.createElement('label');l.className='setting-check';l.innerHTML='<input type="checkbox" id="feel-'+k+'"> '+label;fs.append(l);let i=l.querySelector('input');i.checked=S[k];i.onchange=()=>{S[k]=i.checked;save();applyBoard()}}}
function applyBoard(){board.classList.toggle('drag-enabled',S.drag)}applyBoard();
const style=document.createElement('style');style.textContent='#board.drag-enabled{touch-action:none}#board.drag-enabled .sq .piece{cursor:grab}.drag-ghost{position:fixed;left:0;top:0;z-index:1000;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:calc(var(--drag-size,48px) * .75);filter:drop-shadow(0 6px 8px rgba(0,0,0,.45))}.drag-ghost .piece{position:static!important;width:100%!important;height:100%!important;display:flex;align-items:center;justify-content:center;transform:none!important;font-size:clamp(28px,5vw,58px)}.drag-ghost img,.drag-ghost svg{width:100%;height:100%}#board.dragging{cursor:grabbing}';document.head.append(style);
window.chessMatoFeel={get:()=>({...S}),set:(k,v)=>{S[k]=v;save();applyBoard()},last:()=>lastPlayed,sounds:SOUNDS};
})();
