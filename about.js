'use strict';
// Settings → About: the version, and "Send feedback", which builds a short report the tester sends however they like
// (share sheet, copy, or a file). Nothing is sent automatically, so it works offline.
(function(){
const V=window.CHESSMATO_VERSION||{name:'dev',code:0};
const about=$('panel-settings-about');if(!about)return;
const where=()=>window.chessMatoNative&&chessMatoNative()?'Android app':window.chessMatoPWA&&chessMatoPWA.standalone()?'installed web app':'website';
const box=document.createElement('section');box.className='backup-section';box.id='about-version';
box.innerHTML='<h2>Version</h2><p id="version-line"></p>'+
 '<h2>Send feedback</h2><p class="muted">Found a bug or have an idea? Write it here, then share, copy or save the report and send it to whoever gave you CheckMato. Nothing is sent automatically.</p>'+
 '<label for="feedback-text">Your feedback</label><textarea id="feedback-text" rows="4" placeholder="What happened, and what did you expect?"></textarea>'+
 '<label class="setting-check"><input type="checkbox" id="feedback-details" checked> Include technical details (version, device, screen size, recent errors; no games or personal data)</label>'+
 '<div class="row"><button class="primary" id="feedback-share">Share feedback</button><button id="feedback-copy">Copy</button><button id="feedback-save">Save as file</button></div><p id="feedback-msg" class="muted" aria-live="polite"></p>';
about.prepend(box);
$('version-line').textContent='CheckMato '+V.name+' · '+where();
function report(){let t=$('feedback-text').value.trim(),lines=['CheckMato feedback','',t||'(no message)'];
  if($('feedback-details').checked){let st=window.chessUITest&&chessUITest.getState?chessUITest.getState():{};lines.push('','--- details ---','Version: '+V.name+' ('+V.code+') · '+where(),'Date: '+new Date().toISOString(),'Device: '+navigator.userAgent,'Screen: '+screen.width+'×'+screen.height+' @'+(devicePixelRatio||1)+'x, window '+innerWidth+'×'+innerHeight,'Language: '+navigator.language,
    'View: '+(st.view||'?')+'/'+(st.section||'?'));let errs=window.chessMatoErrors?chessMatoErrors():[];lines.push('Recent errors: '+(errs.length?'':'none'));for(let e of errs)lines.push('  '+e.t+' '+e.m)}
  return lines.join('\n')}
const msg=t=>{$('feedback-msg').textContent=t};
$('feedback-share').hidden=!(window.chessMatoCanShare&&chessMatoCanShare());
$('feedback-share').onclick=async()=>{if(await chessMatoShare({title:'CheckMato feedback',text:report()}))msg('Shared. Thank you!')};
$('feedback-copy').onclick=async()=>{let r=report();try{await navigator.clipboard.writeText(r);msg('Copied. Paste it into a message. Thank you!')}catch(e){let ta=$('feedback-text'),old=ta.value;ta.value=r;ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}ta.value=old;msg(ok?'Copied. Paste it into a message. Thank you!':'Copy is blocked here; use Save as file instead.')}};
$('feedback-save').onclick=()=>{chessMatoSave('checkmato-feedback-'+new Date().toISOString().slice(0,10)+'.txt',report(),'text/plain');msg('Saved. Send the file however you like. Thank you!')};
window.chessMatoAbout={report,version:V};
})();
