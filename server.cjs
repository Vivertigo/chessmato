const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');
const allowed=new Set(['index.html','appearance.js','appearance.css','coaches.js','puzzle-pack.js','puzzles.js','training.js','thinking.js','ui.js','ui.css','openings.js','academy.js','chess.min.js','stockfish.js','stockfish.wasm']);
for(let set of ['cburnett','merida'])for(let color of ['w','b'])for(let piece of ['K','Q','R','B','N','P'])allowed.add('pieces/'+set+'/'+color+piece+'.svg');
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html'}catch(e){res.writeHead(400).end();return}if(!allowed.has(name)){res.writeHead(404).end('Not found');return}let file=path.join(__dirname,name);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.wasm')?'application/wasm':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)})});
const url='http://127.0.0.1:8767';
server.listen(8767,'127.0.0.1',()=>{console.log('ChessMato: '+url);if(!process.env.CHESSMATO_NO_BROWSER){let opener=process.platform==='win32'?['explorer.exe',[url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];try{let c=cp.spawn(opener[0],opener[1],{windowsHide:true,stdio:'ignore'});c.on('error',()=>console.log('Open '+url+' in your browser.'));c.unref()}catch(e){console.log('Open '+url+' in your browser.')}}});
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.error('Port 8767 is already in use. If ChessMato is already running, open http://127.0.0.1:8767.');}else console.error(e);process.exitCode=1});




