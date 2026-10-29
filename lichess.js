'use strict';
// Puzzle library: imports real puzzles from the Lichess puzzle database (CC0) that the player downloads once.
// The .csv.zst file is decompressed and filtered in the browser (fzstd); nothing is uploaded. Chosen puzzles
// are validated with chess.js and stored compactly in chessmato-lichess-v1, separate from the drill backup.
(function(){
const KEY='chessmato-lichess-v1',MAX=5000;
const THEMES=[['mate','Checkmate'],['fork','Fork'],['pin','Pin'],['skewer','Skewer'],['discoveredAttack','Discovered attack'],['backRankMate','Back-rank mate'],['hangingPiece','Hanging piece'],['promotion','Promotion'],['sacrifice','Sacrifice'],['deflection','Deflection'],['attraction','Attraction'],['quietMove','Quiet move'],['defensiveMove','Defensive move'],['zugzwang','Zugzwang'],['endgame','Endgame'],['opening','Opening']];
// Lichess theme → ChessMato tag that puzzles.js already ranks and rotates.
const TAG={backRankMate:'back rank',discoveredAttack:'discovered attack',hangingPiece:'hanging pieces',quietMove:'quiet move'};
const label=t=>(THEMES.find(x=>x[0]===t)||[0,t.replace(/([A-Z])/g,' $1').replace(/(\d+)/,' $1').toLowerCase().replace(/^./,c=>c.toUpperCase())])[1];
let L={puzzles:[]};try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');if(Array.isArray(d.puzzles))L.puzzles=d.puzzles.filter(p=>p&&typeof p.id==='string'&&typeof p.f==='string'&&Array.isArray(p.l))}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(L));return true}catch(e){return false}}
function toDrill(p){let c=new Chess(p.f),side=c.turn()==='w'?'White':'Black',themes=p.t.split(' ').filter(Boolean),m=themes.find(t=>/^mateIn\d$/.test(t)),moves=Math.ceil(p.l.length/2);
  let main=m?(themes.includes('backRankMate')?'Back-rank mate':'Mate in '+m.slice(6)):label(['fork','pin','skewer','discoveredAttack','hangingPiece','promotion','sacrifice','deflection','attraction','quietMove','defensiveMove','zugzwang'].find(t=>themes.includes(t))||'advantage');
  let tags=themes.map(t=>TAG[t]||(/^mateIn/.test(t)?null:t.replace(/([A-Z])/g,' $1').toLowerCase())).filter(Boolean).concat(m||themes.includes('mate')?['mate']:[],['lichess']);
  return {id:'li-'+p.id,title:main+' · '+side+' · Lichess',fen:p.f,line:p.l,tags:[...new Set(tags)],rating:Math.max(400,Math.min(3200,p.r)),hint:'Your opponent just played '+p.o+'. Start with checks, captures and threats.',
    description:side+' to move. Your opponent just played '+p.o+'. '+(m?'Find mate in '+m.slice(6)+'.':moves>1?'Find the best line ('+moves+' moves).':'Find the best move.')+' Lichess puzzle '+p.id+', rated '+p.r+'.'}}
// Keep Lichess puzzles out of the drill backup (they have their own key) but in the practice queue.
const priorSave=save;save=function(){let all=data.drills;data.drills=all.filter(d=>!d.id.startsWith('li-'));try{priorSave()}finally{data.drills=all}};
function merge(){let have=new Set(data.drills.map(d=>d.id)),n=0;for(let p of L.puzzles){if(have.has('li-'+p.id))continue;try{data.drills.push(toDrill(p));n++}catch(e){}}return n}
merge();queue();
const priorExplain=window.chessMatoExplain;window.chessMatoExplain=d=>{if(d&&d.id.startsWith('li-')){let p=L.puzzles.find(p=>'li-'+p.id===d.id);if(p)return 'Lichess themes: '+p.t.split(' ').map(label).join(', ')+'. Puzzle rating '+p.r+' from Lichess players. The line is the Lichess solution; another checkmate also counts. Source: lichess.org/training/'+p.id+' (CC0).'}return priorExplain?priorExplain(d):null};
// ---- Streaming import ----
let job=null;
function convert(cols){let [id,fen,moves,rating,,pop,plays,themes]=cols,c=new Chess();if(!c.load(fen))return null;let uci=moves.split(' '),mv=u=>c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
  let first=mv(uci[0]);if(!first)return null;let start=c.fen(),line=[];for(let u of uci.slice(1)){let m=mv(u);if(!m)return null;line.push(m.san)}if(!line.length)return null;
  let p={id,f:start,l:line,r:Number(rating),t:themes,o:first.san};try{validate([toDrill(p)])}catch(e){return null}return p}
async function importFile(file,opt,progress){if(job)throw Error('An import is already running.');if(!/\.(csv|zst)$/i.test(file.name))throw Error('Choose lichess_db_puzzle.csv.zst (or the unpacked .csv).');
  let zst=/\.zst$/i.test(file.name);if(zst&&!window.fzstd)throw Error('The Zstandard decoder (vendor/fzstd.js) did not load.');
  job={stop:false};let have=new Set(L.puzzles.map(p=>p.id)),themes=opt.themes.length?opt.themes:null,quota=themes?Object.fromEntries(themes.map(t=>[t,Math.ceil(opt.count/themes.length)])):null;
  let found=[],seen=0,matched=0,bytes=0,rest='',header=true,dec=new TextDecoder(),full=()=>found.length>=opt.count||quota&&Object.values(quota).every(q=>q<=0);
  const line=row=>{if(header){header=false;if(/^PuzzleId,/.test(row))return}if(!row)return;seen++;let cols=row.split(',');if(cols.length<8)return;let r=Number(cols[3]);if(!(r>=opt.min&&r<=opt.max))return;
    if(opt.popular&&(Number(cols[5])<80||Number(cols[6])<300))return;if(have.has(cols[0]))return;let ts=cols[7].split(' ');if(ts.length===1&&!ts[0])return;
    let slot=null;if(quota){let pick=themes.filter(t=>quota[t]>0&&(t==='mate'?ts.includes('mate'):ts.includes(t)));if(!pick.length)return;slot=pick.sort((a,b)=>quota[b]-quota[a])[0]}
    matched++;let p=convert(cols);if(!p)return;found.push(p);have.add(p.id);if(slot)quota[slot]--};
  const text=(s,final)=>{let all=rest+s,parts=all.split('\n');rest=final?'':parts.pop();for(let row of parts){if(full())return;line(row.replace(/\r$/,''))}if(final&&!full())line(rest)};
  let reader=file.stream().getReader(),zs=zst?new fzstd.Decompress((chunk,final)=>text(dec.decode(chunk,{stream:!final}),false)):null;
  try{for(;;){let {done,value}=await reader.read();if(done){if(zs)zs.push(new Uint8Array(0),true);text(dec.decode(),true);break}bytes+=value.length;if(zs)zs.push(value,false);else text(dec.decode(value,{stream:true}),false);
      if(progress)progress({bytes,total:file.size,seen,found:found.length});if(full()||job.stop)break;await new Promise(r=>setTimeout(r,0))}}
  catch(e){if(!found.length)throw Error(/zstd|invalid|EOF/i.test(e.message)?'This file is not a valid .zst archive ('+e.message+').':e.message)}
  finally{try{reader.cancel()}catch(e){}let stopped=job.stop;job=null;if(stopped&&!found.length)throw Error('Import stopped before any puzzles were found.')}
  if(!seen)throw Error('No puzzle rows found in this file.');
  let room=MAX-L.puzzles.length,keep=found.slice(0,Math.max(0,room));L.puzzles=L.puzzles.concat(keep);
  if(!persist()){L.puzzles=L.puzzles.slice(0,L.puzzles.length-keep.length);throw Error('Browser storage is full. Remove some Lichess puzzles or import fewer.')}
  let added=merge();queue();draw();return {added,seen,matched,skipped:found.length-keep.length,bytes}}
function removeAll(){let ids=new Set(L.puzzles.map(p=>'li-'+p.id));data.drills=data.drills.filter(d=>!ids.has(d.id));L.puzzles=[];persist();if(current&&ids.has(current.id))current=null;queue();draw()}
// ---- UI: Puzzles → Puzzle library ----
const panel=$('panel-puzzles-library');
function draw(){let s=$('lichess-status');if(!s)return;let byTheme={};for(let p of L.puzzles)for(let t of p.t.split(' '))if(THEMES.some(x=>x[0]===t))byTheme[t]=(byTheme[t]||0)+1;
  let solved=L.puzzles.filter(p=>data.progress['li-'+p.id]).length,rs=L.puzzles.map(p=>p.r).sort((a,b)=>a-b);
  s.textContent=L.puzzles.length?L.puzzles.length+' Lichess puzzles saved (ratings '+rs[0]+'–'+rs[rs.length-1]+'), '+solved+' attempted. Themes: '+Object.entries(byTheme).sort((a,b)=>b[1]-a[1]).map(([t,n])=>label(t)+' '+n).join(', ')+'. They mix into your practice queue by rating.':'No Lichess puzzles yet. Your '+data.drills.filter(d=>!d.id.startsWith('li-')).length+' built-in and personal puzzles are unaffected by imports.';
  $('lichess-remove').disabled=!L.puzzles.length}
if(panel){let r=Math.round(window.academyTest.getProfile().rating/100)*100;
  panel.innerHTML='<h2>Puzzle library</h2><p class="muted">Add real puzzles from the Lichess puzzle database: millions of positions from real games, rated by Lichess players and released into the public domain (CC0). ChessMato reads the file on your device and keeps only the puzzles you choose. Nothing is uploaded.</p><ol class="muted"><li>Once, while online: download <b>lichess_db_puzzle.csv.zst</b> from database.lichess.org (Puzzles section). It is large; keep it in Downloads.</li><li>Choose themes, a rating range and how many to add, then pick the file. You can import again later for different themes; repeats are skipped.</li></ol>'+
  '<fieldset id="lichess-themes"><legend>Themes (none ticked = any theme)</legend>'+THEMES.map(([t,n])=>'<label class="setting-check"><input type="checkbox" value="'+t+'"> '+n+'</label>').join('')+'</fieldset>'+
  '<div class="row"><label>Rating from <input id="lichess-min" type="number" min="400" max="3200" step="50" value="'+Math.max(400,r-300)+'"></label><label>to <input id="lichess-max" type="number" min="400" max="3200" step="50" value="'+Math.min(3200,r+300)+'"></label><label>How many <select id="lichess-count"><option>100</option><option selected>500</option><option>1000</option><option>2000</option></select></label></div>'+
  '<label class="setting-check"><input type="checkbox" id="lichess-popular" checked> Only well-tested puzzles (liked by most players, 300+ plays)</label>'+
  '<div class="row"><button class="primary" id="lichess-pick">Choose puzzle file and import</button><button id="lichess-stop" hidden>Stop and keep what was found</button><input type="file" id="lichess-file" accept=".zst,.csv" hidden><button id="lichess-remove">Remove all Lichess puzzles</button></div>'+
  '<p id="lichess-msg" aria-live="polite"></p><p id="lichess-status" class="notice"></p><p class="muted">Puzzle data: Lichess puzzle database (lichess.org, CC0). Decompression: fzstd (MIT).</p>';
  $('lichess-pick').onclick=()=>$('lichess-file').click();$('lichess-stop').onclick=()=>{if(job)job.stop=true};
  $('lichess-file').onchange=async()=>{let f=$('lichess-file').files[0];$('lichess-file').value='';if(!f)return;let min=Number($('lichess-min').value),max=Number($('lichess-max').value);if(!(min<=max)){$('lichess-msg').textContent='The lowest rating must not be above the highest.';return}
    let opt={themes:Array.from(document.querySelectorAll('#lichess-themes input:checked')).map(i=>i.value),min,max,count:Number($('lichess-count').value),popular:$('lichess-popular').checked};
    $('lichess-pick').disabled=true;$('lichess-stop').hidden=false;const mb=b=>(b/1048576).toFixed(0)+' MB';
    try{let out=await importFile(f,opt,p=>{$('lichess-msg').textContent='Reading '+mb(p.bytes)+' of '+mb(p.total)+' · '+p.seen.toLocaleString()+' puzzles checked · '+p.found+' chosen…'});
      $('lichess-msg').textContent='Added '+out.added+' Lichess puzzle'+(out.added===1?'':'s')+' (checked '+out.seen.toLocaleString()+')'+(out.skipped?'. '+out.skipped+' more did not fit under the '+MAX+' limit':'')+'.'+(out.added<opt.count?' Fewer than asked: widen the rating range or themes for more.':'')}
    catch(e){$('lichess-msg').textContent='Import failed: '+e.message}$('lichess-pick').disabled=false;$('lichess-stop').hidden=true};
  $('lichess-remove').onclick=()=>{if(confirm('Remove all '+L.puzzles.length+' Lichess puzzles? Built-in and personal puzzles stay.')){removeAll();$('lichess-msg').textContent='Lichess puzzles removed.'}};
  draw()}
const style=document.createElement('style');style.textContent='#lichess-themes{display:flex;flex-wrap:wrap;gap:4px 14px;border:1px solid var(--stroke);border-radius:6px;padding:8px 12px;margin:10px 0}#lichess-themes .setting-check{margin:0}#panel-puzzles-library input[type=number]{width:80px}#panel-puzzles-library .row label{display:flex;gap:6px;align-items:center}';document.head.append(style);
window.chessMatoLichess={importFile,get:()=>L,toDrill,convert,removeAll,stop:()=>{if(job)job.stop=true}};
})();
