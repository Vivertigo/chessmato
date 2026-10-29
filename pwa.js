'use strict';
// Installable app: registers the offline service worker (only over http/https, e.g. the local launcher) and offers
// an "Install CheckMato" button when the browser allows it. file:// pages keep working without it.
(function(){
let deferred=null;const box=document.createElement('section');box.className='backup-section';box.id='install-section';
box.innerHTML='<h2>Install the app</h2><p class="muted" id="install-status"></p><div class="row"><button class="primary" id="install-app" hidden>Install CheckMato</button></div>';
let about=$('panel-settings-about');if(about)about.prepend(box);
const status=t=>{let s=$('install-status');if(s)s.textContent=t};
const standalone=()=>window.matchMedia&&matchMedia('(display-mode: standalone)').matches;
if(standalone())status('CheckMato is running as an installed app. It works offline; your progress stays on this device.');
else if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))status('To install CheckMato as an app that opens offline, start it with the launcher (Start CheckMato.cmd) and open it in Chrome or Edge.');
else status('Once installed, CheckMato opens from your desktop or home screen and works offline, even without the launcher running. Progress stays on this device.');
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;let b=$('install-app');if(b)b.hidden=false});
let b=$('install-app');if(b)b.onclick=async()=>{if(!deferred)return;deferred.prompt();let r=await deferred.userChoice.catch(()=>null);deferred=null;b.hidden=true;status(r&&r.outcome==='accepted'?'Installed. Look for CheckMato on your desktop or home screen.':'Not installed. You can install later from here or from the browser menu.')};
addEventListener('appinstalled',()=>status('Installed. Look for CheckMato on your desktop or home screen.'));
window.chessMatoPWA={standalone};
})();
