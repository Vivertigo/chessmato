// Builds openings-db.js from the Lichess chess-openings TSV files (CC0, https://github.com/lichess-org/chess-openings).
// Usage: node tools/build-openings.cjs <dir containing a.tsv..e.tsv>
const fs=require('fs'),path=require('path');let rows=[];
for(const f of ['a','b','c','d','e'])for(const line of fs.readFileSync(path.join(process.argv[2],f+'.tsv'),'utf8').split('\n').slice(1)){let [eco,name,pgn]=line.split('\t');if(!eco||!pgn)continue;rows.push([eco,name,pgn.replace(/\d+\.\s*/g,'').trim()])}
fs.writeFileSync('openings-db.js','// Opening names: lichess-org/chess-openings (CC0 1.0 public domain dedication). '+rows.length+' lines, SAN without move numbers.\nwindow.CHESSMATO_OPENINGS='+JSON.stringify(rows)+';\n');console.log(rows.length);
