'use strict';
// First-run walkthrough: a short, skippable tour shown once on a new device. Settings → About can replay it.
(function(){
const KEY='chessmato-tour-v1';
const STEPS=[
 {title:'Welcome to CheckMato',body:'Untimed chess training that runs on your device. No account, no clocks in training, nothing uploaded.',img:true},
 {title:'Moving pieces',body:'Click a piece, then click a highlighted square. You can also drag pieces. Hover over any piece to preview where it can go; previews never change the game.'},
 {title:'Think before you move',body:'With the thinking board on, your first move tints the board blue. Play out a whole line for both sides, step back and forth, then press Play to send only your first move. Reset returns to the real game.'},
 {title:'Where to start',body:'Puzzles for tactics, Openings for your repertoire, Play for games against the bot or Guess the move, and Coaches for a three-task Daily plan from Gary Bendt or Claudia Herman.',go:['coach','plan'],goLabel:'Open the Daily plan'},
 {title:'Your data stays here',body:'Progress is saved in this browser. Use Settings → Backups → Back up everything to keep a copy or move to another device. Import your own games under Player profile → My games.'},
 {title:'Use it offline',body:'Started with the launcher in Chrome or Edge, CheckMato can be installed from Settings → About and then opens offline from your desktop or home screen.'}];
const d=document.createElement('dialog');d.id='tour';d.setAttribute('aria-labelledby','tour-title');
d.innerHTML='<div class="tour-head"><img id="tour-logo" src="icons/icon-192.png" alt="" width="72" height="72"><p id="tour-step" class="muted"></p></div><h2 id="tour-title"></h2><p id="tour-body"></p><div class="row tour-buttons"><button id="tour-skip">Skip tour</button><span class="tour-spacer"></span><button id="tour-back">Back</button><button id="tour-go" hidden></button><button class="primary" id="tour-next">Next</button></div>';
document.body.append(d);let i=0;
function show(){let s=STEPS[i];$('tour-title').textContent=s.title;$('tour-body').textContent=s.body;$('tour-step').textContent='Step '+(i+1)+' of '+STEPS.length;$('tour-logo').hidden=!s.img;
  $('tour-back').disabled=i===0;$('tour-next').textContent=i===STEPS.length-1?'Start training':'Next';$('tour-go').hidden=!s.go;if(s.go)$('tour-go').textContent=s.goLabel}
function finish(){try{localStorage.setItem(KEY,'done')}catch(e){}if(d.open)d.close()}
function open(){i=0;show();if(!d.open)d.showModal();$('tour-next').focus()}
$('tour-next').onclick=()=>{if(i<STEPS.length-1){i++;show();$('tour-next').focus()}else finish()};$('tour-back').onclick=()=>{if(i>0){i--;show()}};$('tour-skip').onclick=finish;
$('tour-go').onclick=()=>{let s=STEPS[i];finish();if(window.chessUITest)chessUITest.navigate(s.go[0],s.go[1])};d.addEventListener('cancel',()=>finish());
let about=$('panel-settings-about');if(about){let b=document.createElement('button');b.textContent='Show the welcome tour again';b.id='tour-replay';b.onclick=open;let wrap=document.createElement('div');wrap.className='row';wrap.append(b);about.append(wrap)}
// New device = no tour mark and no saved training yet. People who already train here are not interrupted.
let seen=null,existing=false;try{seen=localStorage.getItem(KEY);existing=!!localStorage.getItem('chess-academy-v2')||!!localStorage.getItem('chess-personal-coach-v1')||Object.keys(data.progress||{}).length>0}catch(e){}
if(!seen&&!existing)setTimeout(open,300);else if(!seen)try{localStorage.setItem(KEY,'done')}catch(e){}
const style=document.createElement('style');style.textContent='#tour{max-width:520px;width:calc(100% - 32px);border:1px solid var(--stroke,#3a4a40);border-radius:10px;background:#18211d;color:#ecf0e9;padding:22px 24px}#tour::backdrop{background:rgba(0,0,0,.55)}.tour-head{display:flex;align-items:center;gap:14px}#tour-step{margin:0}#tour h2{margin:10px 0 6px}#tour-body{line-height:1.6;font-size:15px}.tour-buttons{gap:8px;margin-top:16px;flex-wrap:wrap}.tour-spacer{flex:1}';document.head.append(style);
window.chessMatoTour={open,finish,steps:STEPS.length};
})();
