// Turns generator output into puzzle-pack.js. Usage: node tools/build-pack.cjs tools/generated.json [more.json...]
const fs=require('fs'),crypto=require('crypto');let all=[],seen=new Set;
for(const f of process.argv.slice(2))for(const p of JSON.parse(fs.readFileSync(f,'utf8'))){let key=p.fen.split(' ').slice(0,4).join(' ');if(seen.has(key))continue;seen.add(key);all.push({id:crypto.createHash('sha1').update(key).digest('hex').slice(0,10),fen:p.fen,line:p.line,themes:p.themes,why:p.why,rating:p.rating,eval:p.eval})}
all=all.filter(p=>p.line.length<=7);
// Keep variety: cap plain one-move loose-piece captures.
const plain=p=>p.line.length===1&&p.themes.includes('hanging pieces')&&!['fork','pin','skewer','discovered attack','mate','promotion'].some(t=>p.themes.includes(t));let kept=0;all=all.filter(p=>!plain(p)||kept++<Number(process.env.PLAIN_CAP||55));
all.sort((a,b)=>a.rating-b.rating);
fs.writeFileSync('puzzle-pack.js','// CheckMato puzzle pack: generated offline by tools/generate-puzzles.cjs with the bundled Stockfish.js 10.0.2\n// from engine-vs-engine games. Each first move was checked at depth 14 to be clearly better than the second choice;\n// later solver moves were rechecked at depth 12. Themes and explanations are rule-based. Ratings are rough estimates.\nwindow.CHESSMATO_PUZZLE_PACK='+JSON.stringify(all)+';\n');
console.log(all.length+' puzzles');const c={};all.forEach(p=>p.themes.forEach(t=>c[t]=(c[t]||0)+1));console.log(c);
