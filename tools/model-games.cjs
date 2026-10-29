// Builds model-games.js: wins by Hikaru Nakamura in the blitz systems (King's Indian Attack, London, King's Indian /
// Pirc, Hippo / Modern) from a PGN collection of his games, each linked to the repertoire line it reaches.
// Usage: start server.cjs, then: node tools/model-games.cjs <Nakamura.pgn> <out.js> [all-wins.json]
// The optional JSON lists every qualifying win (for MODE=games puzzle extraction in tools/generate-puzzles.cjs).
const {chromium}=require('playwright');const fs=require('fs');
const PGN=fs.readFileSync(process.argv[2],'utf8'),OUT=process.argv[3]||'model-games.js';
const QUOTA={wk:10,wl:8,bk:16,bh:6};
(async()=>{const browser=await chromium.launch();const page=await browser.newPage();page.on('console',m=>console.log(m.text()));
await page.goto('http://127.0.0.1:8767/');await page.waitForFunction(()=>window.chessMatoGames&&window.openingCoachTest);
const res=await page.evaluate(([PGN,QUOTA])=>{
 const isHero=n=>/^Nakamura,\s*H/i.test(n||'');const key=f=>f.split(' ').slice(0,4).join(' ');
 const own=(sans,side,n)=>sans.filter((m,i)=>(i%2===0)===(side==='w')).slice(0,n);
 function classify(sans,side){let o=own(sans,side,8),opp=own(sans,side==='w'?'b':'w',3),has=(...m)=>m.every(x=>o.includes(x));
  if(side==='w'){if(has('Nf3','g3','Bg2','d3')&&!own(sans,'w',5).some(m=>/^(c4|d4)$/.test(m)))return 'wk';if(o[0]==='d4'&&o.slice(0,3).includes('Bf4'))return 'wl';return null}
  if(o[0]==='g6'&&has('Bg7','d6')&&o.filter(m=>['e6','b6','a6','h6','Nd7','Ne7','Bb7'].includes(m)).length>=3&&!o.slice(0,6).includes('Nf6'))return 'bh';
  if(has('Nf6','g6','Bg7','d6')&&o.indexOf('Nf6')<5)return 'bk';return null}
 // positions of each repertoire line, for transposition-aware matching
 const lines=openingCoachTest.repertoire.filter(r=>['wk','wl','bk','bh'].includes(r.set)).map(r=>{let c=new Chess(),pos=new Map();r.sequence.forEach((m,i)=>{c.move(m);pos.set(key(c.fen()),i+1)});return {r,pos}});
 function lineFor(sans,set){let c=new Chess(),best=null;for(let i=0;i<Math.min(sans.length,30);i++){c.move(sans[i]);let k=key(c.fen());for(let l of lines)if(l.r.set===set&&l.pos.has(k)&&(!best||i+1>best.ply))best={id:l.r.id,ply:i+1}}return best}
 const fast=e=>/blitz|speed|bullet|rapid|armageddon|titled|bundesliga online|pro league|champions showdown|tour|banter|bullet/i.test(e||'');
 let games=chessMatoGames.splitGames(PGN),cand=[],bad=0;
 for(let t of games){let p;try{p=chessMatoGames.parseOne(t)}catch(e){bad++;continue}if(p.start)continue;let H=p.headers,side=isHero(H.White)?'w':isHero(H.Black)?'b':null;if(!side)continue;
  let won=(side==='w'&&H.Result==='1-0')||(side==='b'&&H.Result==='0-1');if(!won)continue;let set=classify(p.sans,side);if(!set)continue;
  let opp=side==='w'?H.Black:H.White,oppElo=Number(side==='w'?H.BlackElo:H.WhiteElo)||0,n=Math.ceil(p.sans.length/2);if(n<18||n>75)continue;
  let line=lineFor(p.sans,set),year=Number((H.Date||'').slice(0,4))||0;
  let score=(oppElo||2400)+(fast(H.Event)?150:0)+(line?line.ply*8:0)+(year-2000)*4-(n>55?80:0);
  cand.push({set,side,white:H.White,black:H.Black,event:H.Event||'',site:H.Site||'',date:H.Date||'',result:H.Result,eco:H.ECO||'',oppElo,fast:fast(H.Event),line:line&&line.id,linePly:line&&line.ply,sans:p.sans,score,opp})}
 let pick=[];for(let [set,q] of Object.entries(QUOTA)){let c=cand.filter(x=>x.set===set).sort((a,b)=>b.score-a.score),seenOpp={},chosen=[];
  // variety: at most two games against the same opponent, and spread over the repertoire lines
  for(let pass=0;pass<2;pass++)for(let x of c){if(chosen.length>=q)break;if(chosen.includes(x))continue;if((seenOpp[x.opp]||0)>=2)continue;if(pass===0&&x.line&&chosen.some(y=>y.line===x.line)&&chosen.filter(y=>y.line===x.line).length>=2)continue;chosen.push(x);seenOpp[x.opp]=(seenOpp[x.opp]||0)+1}
  pick.push(...chosen)}
 let counts={};for(let x of cand)counts[x.set]=(counts[x.set]||0)+1;
 return {total:games.length,bad,counts,pick,all:cand}},[PGN,QUOTA]);
console.log('games in file',res.total,'unparsed',res.bad,'wins per system',JSON.stringify(res.counts));
const name=n=>{if(/^Nakamura,\s*H/i.test(n))return 'Hikaru Nakamura';let m=n.match(/^([^,]+),\s*(.+)$/);return m?m[2].replace(/\s+/g,' ')+' '+m[1]:n};
const out=res.pick.map((g,i)=>({id:'hn-'+g.set+'-'+(i+1),set:g.set,side:g.side,white:name(g.white),black:name(g.black),event:g.event,site:g.site,date:g.date,result:g.result,eco:g.eco,fast:g.fast,line:g.line||null,moves:g.sans.join(' ')}));
for(let g of out)console.log(g.set,g.line||'-',g.white,'-',g.black,g.event,g.date,Math.ceil(g.moves.split(' ').length/2));
fs.writeFileSync(OUT,"'use strict';\n// Model games: wins by Hikaru Nakamura in the CheckMato blitz systems, selected by tools/model-games.cjs from a public\n// PGN collection of his games (PGN Mentor's Nakamura file). Game scores are historical records; no annotations are copied.\nwindow.CHESSMATO_MODEL_GAMES="+JSON.stringify(out)+";\n");
console.log('wrote',out.length);
if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(res.all.map((g,i)=>({id:'hw-'+(i+1),set:g.set,side:g.side,white:name(g.white),black:name(g.black),event:g.event,date:g.date,moves:g.sans.join(' ')}))));await browser.close()})();
