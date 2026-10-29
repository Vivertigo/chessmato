// Offline puzzle generator: plays varied low/medium-strength engine games in headless Chromium with the
// bundled Stockfish, finds positions with one clearly winning move, verifies the line, and tags themes by rule.
// Usage: start server.cjs, then: node tools/generate-puzzles.cjs <count> <out.json> [seed]
const {chromium}=require('playwright');const fs=require('fs');const found=[];
const MODE=process.env.MODE||'any',COUNT=Number(process.argv[2]||40),OUT=process.argv[3]||'puzzles-out.json',SEED=Number(process.argv[4]||1),WORKERS=Number(process.env.WORKERS||4);
(async()=>{const browser=await chromium.launch();const page=await browser.newPage();page.on('console',m=>{if(m.type()!=='log')return;let t=m.text();if(t.startsWith('PUZZLE ')){found.push(JSON.parse(t.slice(7)));fs.writeFileSync(OUT,JSON.stringify(found,null,1))}else console.log(t)});
await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.workshopTest);
let res=await page.evaluate(async([COUNT,SEED,WORKERS,MODE])=>{
const Chess=workshopTest.Chess,V={p:1,n:3,b:3,r:5,q:9,k:0};
let seed=SEED;const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
function engine(){let w=new Worker('stockfish.js'),q=[],cur=null;w.onmessage=e=>{let l=String(e.data);if(cur)cur.lines.push(l);if(cur&&cur.done(l)){let c=cur;cur=null;c.resolve(c.lines);next()}};
 function next(){if(cur||!q.length)return;cur=q.shift();for(let c of cur.cmds)w.postMessage(c)}
 function send(cmds,done){return new Promise(resolve=>{q.push({cmds,done,resolve,lines:[]});next()})}
 return {init:()=>send(['uci'],l=>l==='uciok').then(()=>send(['isready'],l=>l==='readyok')),
  search:(fen,{depth=12,multipv=1,skill=20}={})=>send(['setoption name Skill Level value '+skill,'setoption name MultiPV value '+multipv,'position fen '+fen,'go depth '+depth],l=>l.startsWith('bestmove')).then(lines=>{let pvs={};for(let l of lines){let m=l.match(/ depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/);if(m)pvs[m[2]]={depth:+m[1],score:m[3]==='mate'?(+m[4]>0?100000-+m[4]:-100000-+m[4]):+m[4],mate:m[3]==='mate'?+m[4]:null,pv:m[5].split(' ')}}let best=lines.find(l=>l.startsWith('bestmove')).split(' ')[1];
   // first depth at which the final best move appeared as pv[0] (difficulty signal)
   let first=null;for(let l of lines){let m=l.match(/ depth (\d+) .*multipv 1 .* pv (\S+)/);if(m&&m[2]===best&&first===null)first=+m[1];else if(m&&m[2]!==best)first=null}
   return {best,pvs,first}})}}
function uci(c,u){return c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]})}
function sq(x,y){return 'abcdefgh'[x]+(y+1)}
function attacks(g,from){// squares attacked by piece on from (geometric)
 let p=g.get(from),x='abcdefgh'.indexOf(from[0]),y=+from[1]-1,out=[];if(!p)return out;let add=(a,b)=>{if(a>=0&&a<8&&b>=0&&b<8)out.push(sq(a,b))};
 if(p.type==='p'){let d=p.color==='w'?1:-1;add(x-1,y+d);add(x+1,y+d)}if(p.type==='n')for(let [a,b] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(x+a,y+b);if(p.type==='k')for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(a||b)add(x+a,y+b);
 let dirs=[];if('rq'.includes(p.type))dirs.push([1,0],[-1,0],[0,1],[0,-1]);if('bq'.includes(p.type))dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
 for(let [a,b] of dirs){let cx=x+a,cy=y+b;while(cx>=0&&cx<8&&cy>=0&&cy<8){out.push(sq(cx,cy));if(g.get(sq(cx,cy)))break;cx+=a;cy+=b}}return out}
function defended(g,s,color){for(let x=0;x<8;x++)for(let y=0;y<8;y++){let f=sq(x,y),p=g.get(f);if(p&&p.color===color&&f!==s&&attacks(g,f).includes(s))return true}return false}
function lineBehind(g,from,to){// for sliders: piece beyond 'to' on the same ray
 let p=g.get(from);if(!p||!'brq'.includes(p.type))return null;let fx='abcdefgh'.indexOf(from[0]),fy=+from[1]-1,tx='abcdefgh'.indexOf(to[0]),ty=+to[1]-1,a=Math.sign(tx-fx),b=Math.sign(ty-fy),cx=tx+a,cy=ty+b;while(cx>=0&&cx<8&&cy>=0&&cy<8){let q=g.get(sq(cx,cy));if(q)return {s:sq(cx,cy),p:q};cx+=a;cy+=b}return null}
function themes(fen,line,mate){let g=new Chess(fen),me=g.turn(),t=new Set,why=[],N={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},first=g.move(line[0]);let after=new Chess(g.fen());g=new Chess(fen);
 let total=0;for(let r of g.board())for(let p of r)if(p&&p.type!=='k'&&p.type!=='p')total+=V[p.type];if(total<=13)t.add('endgame');
 if(mate){t.add('mate');t.add('mate in '+Math.ceil(line.length/2));let fin=new Chess(fen);for(let m of line)fin.move(m);let k=null;for(let x=0;x<8;x++)for(let y=0;y<8;y++){let p=fin.get(sq(x,y));if(p&&p.type==='k'&&p.color!==me)k=sq(x,y)}let last=fin.history({verbose:true}).slice(-1)[0];if(k&&(k[1]==='8'||k[1]==='1')&&last&&'rq'.includes(last.piece)&&last.to[1]===k[1])t.add('back rank');if(last&&last.piece==='n')t.add('knight');why.push(line.length===1?line[0]+' is checkmate.':'The line forces checkmate in '+Math.ceil(line.length/2)+'.'+(t.has('back rank')?' The king is trapped on its back rank.':''))}
 if(first.promotion||line.some(m=>m.includes('='))){t.add('promotion');why.push('The passed pawn promotes.')}
 if(first.captured&&!defended(g,first.to,other(me))){t.add('hanging pieces');why.push(first.san+' takes an undefended '+N[first.captured]+'.')}
 if(first.captured)t.add('capture');
 if(/\+/.test(first.san))t.add('check');
 // fork: moved piece attacks two+ valuable targets (king counts)
 let targets=attacks(after,first.to).map(s=>({s,p:after.get(s)})).filter(x=>x.p&&x.p.color!==me&&(x.p.type==='k'||V[x.p.type]>=3||V[x.p.type]>V[first.piece]));if(targets.length>=2){t.add('fork');if(first.piece==='n')t.add('knight');why.push('After '+first.san+' the '+N[first.piece]+' attacks '+targets.map(x=>'the '+N[x.p.type]+' on '+x.s).join(' and ')+' at once.')}
 // pin / skewer along the moved slider's lines
 for(let s of attacks(after,first.to)){let x=after.get(s);if(!x||x.color===me)continue;let b=lineBehind(after,first.to,s);if(b&&b.p.color!==me){if(V[x.type]<V[b.p.type]||b.p.type==='k'){if(!t.has('pin'))why.push(first.san+' pins the '+N[x.type]+' on '+s+' to the '+N[b.p.type]+' on '+b.s+'.');t.add('pin')}else if(x.type==='k'||V[x.type]>V[b.p.type]){if(!t.has('skewer'))why.push(first.san+' skewers the '+N[x.type]+' on '+s+'; the '+N[b.p.type]+' behind it on '+b.s+' is exposed.');t.add('skewer')}}}
 // discovered attack: a different piece of mine now attacks king/queen
 for(let x=0;x<8;x++)for(let y=0;y<8;y++){let f=sq(x,y),p=after.get(f);if(!p||p.color!==me||f===first.to)continue;let before=attacks(g,f),now=attacks(after,f);for(let s of now){let q=after.get(s);if(q&&q.color!==me&&'kq'.includes(q.type)&&!before.includes(s)&&!t.has('discovered attack')){t.add('discovered attack');why.push('Moving the '+N[first.piece]+' uncovers an attack by the '+N[p.type]+' on '+f+' against the '+N[q.type]+'.')}}}
 if(first.piece==='q')t.add('queen');if(first.piece==='r')t.add('rook');if(first.piece==='b')t.add('bishop');if(first.piece==='p')t.add('pawn');
 if(!why.length&&first.captured){why.push(first.san+' wins the '+N[first.captured]+': the recapture or follow-up costs the opponent more than they get back.')}
 if(!why.length){t.add('quiet move');why.push(first.san+' is a quiet move that creates a threat the opponent cannot fully meet.')}
 t.add('tactics');return {tags:[...t],why}}
function other(c){return c==='w'?'b':'w'}
const openings=['e4 e5 Nf3 Nc6 Bc4','e4 c5 Nf3 d6 d4 cxd4 Nxd4','d4 d5 c4 e6 Nc3 Nf6','e4 e6 d4 d5 Nc3','d4 Nf6 c4 g6 Nc3 Bg7','e4 c6 d4 d5 e5','c4 e5 Nc3 Nf6','Nf3 d5 g3 Nf6 Bg2','e4 e5 Nf3 Nf6','d4 d5 Bf4 Nf6 e3','e4 d5 exd5 Qxd5 Nc3','e4 d6 d4 Nf6 Nc3 g6','e4 e5 f4','d4 f5','e4 Nf6 e5 Nd5','b3 e5 Bb2'];
let out=[],seen=new Set;
const sets=['RP|R','RPP|RP','P|','PP|P','NP|P','BP|P','Q|R','RB|R','RN|R','PPP|PP','R|PP','BPP|NP','Q|PP','RPP|BP','NPP|B'];
function endgameStart(){for(;;){let c=new Chess();c.clear();let [w,b]=sets[Math.floor(rand()*sets.length)].split('|');if(rand()<.5)[w,b]=[b,w];let free=()=>{for(;;){let s=sq(Math.floor(rand()*8),Math.floor(rand()*8));if(!c.get(s))return s}};
 c.put({type:'k',color:'w'},free());c.put({type:'k',color:'b'},free());for(let [str,color] of [[w,'w'],[b,'b']])for(let ch of str){let s;do{s=free()}while(ch==='P'&&(s[1]==='1'||s[1]==='8'));c.put({type:ch.toLowerCase(),color},s)}
 let f=c.fen().split(' ');f[1]=rand()<.5?'w':'b';let g=new Chess();if(!g.load(f.join(' ')))continue;let opp=new Chess(f.join(' '));let ff=f.slice();ff[1]=ff[1]==='w'?'b':'w';let o=new Chess();if(!o.load(ff.join(' ')))continue;if(o.in_check()||g.game_over()||g.moves().length===0)continue;return g}}
async function worker(id){let e=engine();await e.init();
 while(out.length<COUNT){let g=new Chess();if(MODE==='endgame')g=endgameStart();else for(let m of openings[Math.floor(rand()*openings.length)].split(' '))g.move(m);let prevEval=null,ply=g.history().length,skillW=Math.floor(rand()*8)+2,skillB=Math.floor(rand()*8)+2;
  while(!g.game_over()&&ply<110&&out.length<COUNT){let fen=g.fen();let r=await e.search(fen,{depth:10,multipv:2});let p1=r.pvs[1],p2=r.pvs[2];
   if(p1&&p2&&prevEval!==null&&(ply>=10||MODE==='endgame')){let gap=p1.score-p2.score,winning=MODE==='mate'?p1.mate>0:(p1.score>=250||p1.mate>0),wasLevel=-prevEval<=120;
    if(winning&&wasLevel&&gap>=250&&p2.score<=150&&!seen.has(fen.split(' ').slice(0,4).join(' '))){
     // verify deeper and build a forced line (player moves must stay clearly unique)
     let v=await e.search(fen,{depth:14,multipv:2});let a=v.pvs[1],b=v.pvs[2];
     if(a&&b&&a.pv[0]===p1.pv[0]&&a.score-b.score>=250&&(a.score>=250||a.mate>0)){
      let c=new Chess(fen),line=[],ok=true,mate=a.mate>0;let pv=a.pv.slice(0,mate?Math.min(a.pv.length,2*a.mate-1):5);
      for(let i=0;i<pv.length;i++){if(i>0&&i%2===0){let w=await e.search(c.fen(),{depth:12,multipv:2});if(!w.pvs[2]||w.pvs[1].pv[0]!==pv[i]||(w.pvs[1].score-w.pvs[2].score<200&&!(w.pvs[1].mate>0&&w.pvs[2].mate>0))){break}}let m=uci(c,pv[i]);if(!m){ok=false;break}line.push(m.san);if(c.in_checkmate())break}
      if(line.length%2===0)line.pop();// end on the solver's move
      if(ok&&line.length){let finalMate=(()=>{let t=new Chess(fen);for(let m of line)t.move(m);return t.in_checkmate()})();let T=themes(fen,line,finalMate),th=T.tags;
       let plies=line.length,base=th.includes('quiet move')?1400:['fork','pin','skewer','discovered attack'].some(x=>th.includes(x))?950:th.includes('hanging pieces')?600:th.includes('mate')?550:800;let rating=Math.round(Math.min(2400,base+(plies-1)/2*300+Math.max(0,(v.first||1)-3)*60)/50)*50;
       seen.add(fen.split(' ').slice(0,4).join(' '));out.push({fen,line,themes:th,why:T.why,rating,eval:a.mate?('mate '+a.mate):(a.score/100).toFixed(1),ply});console.log('PUZZLE '+JSON.stringify(out[out.length-1]));console.log('#'+out.length+' w'+id+' '+th.slice(0,4).join(',')+' '+line.join(' ')+' r'+rating)}}}}
   prevEval=p1?p1.score:null;
   // pick a move: mostly a weaker engine move, sometimes random (to create mistakes)
   let mv;if(rand()<0.12){let ms=g.moves();mv=ms[Math.floor(rand()*ms.length)];g.move(mv)}else{let s=await e.search(fen,{depth:4+Math.floor(rand()*4),skill:g.turn()==='w'?skillW:skillB});uci(g,s.best)}
   prevEval=g.history().length?prevEval:null;ply++;}
 }}
await Promise.all(Array.from({length:WORKERS},(_,i)=>worker(i)));return out.slice(0,COUNT)},[COUNT,SEED,WORKERS,MODE]);
if(!found.length)fs.writeFileSync(OUT,JSON.stringify(res,null,1));console.log('wrote',res.length);await browser.close()})();
