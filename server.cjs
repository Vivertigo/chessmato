const http=require('http'),fs=require('fs'),path=require('path'),cp=require('child_process');
const allowed=new Set(['index.html','appearance.js','appearance.css','ui.js','ui.css','openings.js','academy.js','chess.min.js','stockfish.js','stockfish.wasm']);
for(let set of ['cburnett','merida'])for(let color of ['w','b'])for(let piece of ['K','Q','R','B','N','P'])allowed.add('pieces/'+set+'/'+color+piece+'.svg');
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html'}catch(e){res.writeHead(400).end();return}if(!allowed.has(name)){res.writeHead(404).end('Not found');return}let file=path.join(__dirname,name);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.wasm')?'application/wasm':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)})});
server.listen(8767,'127.0.0.1',()=>{console.log('Chess Workshop: http://127.0.0.1:8767');cp.spawn('explorer.exe',['http://127.0.0.1:8767'],{windowsHide:true}).unref()});
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.error('Port 8767 is already in use. If Chess Workshop is already running, open http://127.0.0.1:8767.');}else console.error(e);process.exitCode=1});




