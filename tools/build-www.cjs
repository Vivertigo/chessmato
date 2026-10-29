// Copies the app's runtime files into www/ for the Android build (Capacitor's webDir). The file list is the service
// worker's offline list, so the APK holds exactly what the installed web app caches. Personal data never ships.
// Usage: node tools/build-www.cjs
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'www');
const sandbox={self:{addEventListener(){}},caches:{},fetch(){},location:{origin:''},Response:function(){}};
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8')+';this.__files=FILES',sandbox);
const files=sandbox.__files.filter(f=>f!=='./'&&f!=='personal-data.js');
fs.rmSync(OUT,{recursive:true,force:true});let bytes=0;
for(const f of files){const src=path.join(ROOT,f);if(!fs.existsSync(src))throw new Error('missing '+f);fs.mkdirSync(path.dirname(path.join(OUT,f)),{recursive:true});fs.copyFileSync(src,path.join(OUT,f));bytes+=fs.statSync(src).size}
for(const f of ['LICENSE-chess.txt','LICENSE-stockfish.txt','vendor/LICENSE-fzstd.txt','vendor/LICENSE-qrcode.txt']){fs.mkdirSync(path.dirname(path.join(OUT,f)),{recursive:true});fs.copyFileSync(path.join(ROOT,f),path.join(OUT,f))}
const v={};vm.runInNewContext(fs.readFileSync(path.join(ROOT,'version.js'),'utf8'),{window:v});
fs.writeFileSync(path.join(OUT,'version.json'),JSON.stringify(v.CHESSMATO_VERSION));
console.log('www/: '+files.length+' files, '+(bytes/1048576).toFixed(2)+' MB, version '+v.CHESSMATO_VERSION.name);
