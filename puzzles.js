'use strict';
// Adds the engine-generated puzzle pack (puzzle-pack.js) to the drill collection without touching saved
// progress, explains each result from the stored theme facts, and rotates themes so "Next" varies.
(function(){
const pack=Array.isArray(window.CHESSMATO_PUZZLE_PACK)?window.CHESSMATO_PUZZLE_PACK:[];
// Key moments from Hikaru Nakamura's wins (model-puzzles.js): the first move is the one he played; the rest is engine-checked.
const models=Array.isArray(window.CHESSMATO_MODEL_PUZZLES)?window.CHESSMATO_MODEL_PUZZLES:[];
const label={'mate':'Checkmate','back rank':'Back-rank mate','fork':'Fork','pin':'Pin','skewer':'Skewer','discovered attack':'Discovered attack','hanging pieces':'Loose piece','promotion':'Promotion','quiet move':'Quiet move','capture':'Win material'};
const order=['back rank','mate','fork','pin','skewer','discovered attack','promotion','hanging pieces','quiet move','capture'];
const primary=d=>order.find(t=>d.tags.includes(t))||d.tags[0]||'tactics';
const explain={};
let added=[];
const src=p=>p.src?p.src.white+' – '+p.src.black+', '+p.src.event+(p.src.year?' '+p.src.year:''):'';
for(let p of pack.concat(models)){try{let c=new Chess(p.fen),side=c.turn()==='w'?'White':'Black',main=primary({tags:p.themes}),moves=Math.ceil(p.line.length/2),hn=!!p.src,id=(hn?'hn-':'gen-')+p.id;explain[id]=(p.why||[]).join(' ')+(hn?' Hikaru Nakamura played '+p.line[0]+' here ('+src(p)+', move '+p.src.move+').':'');
  let goal=p.themes.includes('mate')?'Find checkmate'+(moves>1?' in '+moves:'')+'.':moves>1?'Find the forcing line ('+moves+' moves).':'Find the move that wins.';
  added.push({id,title:(hn?'Nakamura\'s moment · ':'')+(label[main]||'Tactic')+' · '+side+(p.themes.includes('endgame')?' · endgame':''),fen:p.fen,line:p.line,tags:p.themes.concat(hn?['engine-checked','nakamura','master game']:['engine-checked']),rating:p.rating,
   hint:main==='quiet move'?'Look beyond captures: which move creates a threat they cannot meet?':main==='hanging pieces'?'Scan for an enemy piece that nobody defends.':main==='capture'?'Count attackers and defenders on each target.':'Theme: '+(label[main]||main).toLowerCase()+'. Start with checks and captures.',
   description:side+' to move. '+goal+(hn?' From '+src(p)+'.':'')})}catch(e){}}
try{added=validate(added)}catch(e){added=added.filter(d=>{try{validate([d]);return true}catch(x){return false}})}
let n=0;for(let d of added)if(!data.drills.some(x=>x.id===d.id)){data.drills.push(d);n++}
// Refresh stored copies whose line was corrected in a newer pack, keeping progress keyed by id.
for(let d of added){let i=data.drills.findIndex(x=>x.id===d.id);if(i>=0)data.drills[i]=d}
save();
window.chessMatoExplain=d=>explain[d.id]||null;
// Theme rotation: recently played themes rank lower so consecutive puzzles differ.
let recent=[];
const priorLoad=load;load=function(d){priorLoad(d);if(d){recent.unshift(primary(d));recent=recent.slice(0,3)}};
const prior=priority;priority=function(d){let p=prior(d),t=primary(d),i=recent.indexOf(t);return p-(i<0?0:[45,30,15][i])};
queue();
let info=document.createElement('p');info.className='muted';info.id='pack-info';info.textContent=pack.length+' engine-checked puzzles from the bundled pack ('+[...new Set(pack.flatMap(p=>p.themes).filter(t=>label[t]))].map(t=>label[t].toLowerCase()).join(', ')+'). Generated offline with the local Stockfish from engine games, not from your own games. Ratings are rough estimates.';let q=$('queue');if(q&&pack.length)q.before(info);
if(models.length){let m=document.createElement('p');m.className='muted';m.id='model-pack-info';m.textContent=models.length+' key moments from Hikaru Nakamura\'s wins in the blitz systems: find the move he played. Every line is checked with the local engine.';info.after(m)}
window.chessMatoPuzzles={pack,models,primary,added:n,recent:()=>recent.slice()};
})();
