'use strict';
// Tomato theme helper: marks the page busy while the engine or an import is working, so theme.css can show a small
// spinning tomato beside the status line. Purely visual.
(function(){
const isBusy=()=>{try{return typeof busy!=='undefined'&&!!busy}catch(e){return false}};
setInterval(()=>document.body.classList.toggle('cm-busy',isBusy()),200);
})();
