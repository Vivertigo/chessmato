'use strict';
// Saving and sharing that work both in browsers and inside the Android app. Browsers download a file; the Android app
// writes it to the app's cache and opens the system share sheet (Files, Drive, Messages…), because app web views
// cannot download. Also holds feature switches (version.js) with a local override used by tests.
(function(){
const native=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const plugin=n=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n];
async function save(name,text,type){
  if(native()&&plugin('Filesystem')&&plugin('Share')){try{let r=await plugin('Filesystem').writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});await plugin('Share').share({title:name,files:[r.uri]});return true}catch(e){if(/cancel/i.test(e&&e.message||''))return false}}
  let a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:type||'text/plain'}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);return true}
async function share(o){if(native()&&plugin('Share')){try{await plugin('Share').share(o);return true}catch(e){return false}}if(navigator.share){try{await navigator.share(o);return true}catch(e){return false}}return false}
const canShare=()=>!!(native()&&plugin('Share'))||!!navigator.share;
function feature(name){let f=Object.assign({},(window.CHESSMATO_VERSION||{}).features||{});try{Object.assign(f,JSON.parse(localStorage.getItem('chessmato-features')||'{}'))}catch(e){}return f[name]!==false}
// Recent script errors, kept on this device only, so a feedback report can include them.
const EK='chessmato-errors-v1';function logError(msg){try{let l=JSON.parse(localStorage.getItem(EK)||'[]');l.push({t:new Date().toISOString(),m:String(msg).slice(0,300)});localStorage.setItem(EK,JSON.stringify(l.slice(-10)))}catch(e){}}
addEventListener('error',e=>logError((e.message||'error')+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:'')));addEventListener('unhandledrejection',e=>logError('promise: '+(e.reason&&e.reason.message||e.reason)));
window.chessMatoErrors=()=>{try{return JSON.parse(localStorage.getItem(EK)||'[]')}catch(e){return []}};
window.chessMatoSave=save;window.chessMatoShare=share;window.chessMatoCanShare=canShare;window.chessMatoNative=native;window.chessMatoFeature=feature;
})();
