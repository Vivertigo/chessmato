// Turns MODE=games generator output into model-puzzles.js (key moments from Hikaru Nakamura's wins).
// Usage: node tools/build-model-puzzles.cjs <puzzles.json> <all-wins.json>
// Keeps real decisions: drops plain one-move recaptures, positions that were already completely winning (over +10),
// and keeps at most two moments per game.
const fs=require('fs'),crypto=require('crypto');
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),G=Object.fromEntries(JSON.parse(fs.readFileSync(process.argv[3],'utf8')).map(g=>[g.id,g]));
const strong=['fork','pin','skewer','discovered attack','mate','promotion','quiet move'];let per={},seen=new Set,out=[];
for(const p of P.slice().sort((a,b)=>b.rating-a.rating)){const key=p.fen.split(' ').slice(0,4).join(' '),g=G[p.game];if(!g||seen.has(key))continue;
  if(!/mate/.test(p.eval)&&parseFloat(p.eval)>10)continue;if(p.line.length===1&&!p.themes.some(t=>strong.includes(t)))continue;if((per[p.game]||0)>=2)continue;
  per[p.game]=(per[p.game]||0)+1;seen.add(key);
  out.push({id:crypto.createHash('sha1').update(key).digest('hex').slice(0,10),fen:p.fen,line:p.line,themes:p.themes,why:p.why,rating:p.rating,eval:p.eval,set:g.set,
    src:{white:g.white,black:g.black,event:g.event,year:/^\d{4}/.test(g.date)?g.date.slice(0,4):'',move:Math.floor(p.ply/2)+1}})}
out.sort((a,b)=>a.rating-b.rating);
fs.writeFileSync('model-puzzles.js',"'use strict';\n// Key moments from Hikaru Nakamura's wins in the CheckMato blitz systems (games from PGN Mentor's Nakamura collection).\n// Built by tools/generate-puzzles.cjs (MODE=games) and tools/build-model-puzzles.cjs: the first move is the one he played and\n// was the bundled Stockfish's clearly unique winning move; the rest of each line is engine-checked. Explanations are rule-based.\nwindow.CHESSMATO_MODEL_PUZZLES="+JSON.stringify(out)+";\n");
const c={};out.forEach(p=>c[p.set]=(c[p.set]||0)+1);console.log(out.length+' key moments',JSON.stringify(c));
