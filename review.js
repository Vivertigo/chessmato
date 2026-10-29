'use strict';
// Spaced review and the daily plan. Puzzles keep their existing schedule (data.progress[id].due); opening lines get a
// schedule derived from past sessions, so no history is lost. Each day one coach picks three short tasks.
(function(){
const KEY='chessmato-review-v1',DAY=86400000,O=()=>window.openingCoachTest,C=()=>window.chessMatoCoaches;
let R={plan:null,history:[]};try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');if(d&&typeof d==='object'){if(d.plan&&Array.isArray(d.plan.tasks))R.plan=d.plan;if(Array.isArray(d.history))R.history=d.history.slice(-90)}}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(R))}catch(e){}}
const today=()=>new Date().toLocaleDateString('en-CA'),dayMs=s=>new Date(s+'T00:00:00').getTime();
// ---- Opening lines: interval grows after a clean run (1 → 3 → 7 → 16 → 30 days) and resets after a miss ----
function lineSchedule(){let o=O();if(!o)return [];let sessions=o.getStats().sessions||[];return o.repertoire.map(r=>{let s=sessions.filter(x=>x.id===r.id&&!x.mixed),interval=0,due=null,last=null;
  for(let x of s){last=x;let clean=x.completed&&x.decisions>0&&x.firstCorrect/x.decisions>=0.9;interval=clean?(interval?Math.min(30,Math.round(interval*2.3)):1):0;due=dayMs(x.date)+interval*DAY}
  return {id:r.id,name:r.name,side:r.side,sessions:s.length,interval,due,last,recall:last&&last.decisions?Math.round(100*last.firstCorrect/last.decisions):null}})}
function dueLines(){let now=Date.now();return lineSchedule().filter(l=>l.due!==null&&l.due<=now).sort((a,b)=>a.due-b.due)}
// ---- Puzzles: "missed" = last attempt had a mistake (streak 0); due when its scheduled time has passed ----
const missed=d=>{let p=data.progress[d.id];return p&&p.attempts>0&&p.streak===0};
function duePuzzles(){let now=Date.now();return data.drills.filter(d=>{let p=data.progress[d.id];return p&&p.due<=now}).sort((a,b)=>(missed(b)-missed(a))||(data.progress[a.id].due-data.progress[b.id].due))}
function dueMissed(){return duePuzzles().filter(missed)}
// ---- Weak spots from puzzle results ----
const THEMES=['fork','pin','skewer','discovered attack','back rank','mate','hanging pieces','promotion','quiet move','endgame','deflection','sacrifice'];
function themeStats(){return THEMES.map(t=>{let ds=data.drills.filter(d=>d.tags.includes(t)),a=0,s=0;for(let d of ds){let p=data.progress[d.id];if(p){a+=p.attempts;s+=p.success}}return {tag:t,count:ds.length,attempts:a,rate:a?s/a:null}}).filter(t=>t.count>=3)}
function weakTheme(){let st=themeStats(),tried=st.filter(t=>t.attempts>=2&&t.rate<0.8).sort((a,b)=>a.rate-b.rate);if(tried.length)return {tag:tried[0].tag,why:'rate',rate:tried[0].rate};let least=st.sort((a,b)=>a.attempts-b.attempts)[0];return least?{tag:least.tag,why:'least'}:null}
function pickPuzzle(filter){let pool=data.drills.filter(d=>filter==='missed'?missed(d)&&data.progress[d.id].due<=Date.now()||missed(d):filter==='due'?data.progress[d.id]&&data.progress[d.id].due<=Date.now():d.tags.includes(filter));
  if(current)pool=pool.filter(d=>d.id!==current.id).concat(pool.filter(d=>d.id===current.id));if(!pool.length)return null;return pool.slice().sort((a,b)=>priority(b)-priority(a))[0]}
// ---- Daily plan ----
const VOICE={gary:{name:'Gary Bendt',intro:['Three things today. Short and focused.','Small, steady work. Three tasks.','Today we tidy up the weak spots. Three tasks.'],review:'You missed these before. Solve them cleanly now.',line:'Play it from memory. Guides off if you can.',weak:t=>'Your '+t+' results are the lowest right now. Three of them.',least:t=>'You have barely touched '+t+'. Three of them.',end:'One endgame. Keep the technique sharp.',mini:'One minigame round for board vision.',done:'Plan done. Good work. Rest is part of training too.'},
 claudia:{name:'Claudia Herman',intro:['Okay, here is today, nothing heroic. Three small things.','Three tasks, and honestly, finishing two is still a good day.','Let us check in on the stuff that has been bugging you. Three tasks.'],review:'These tripped you up last time, which is exactly why they are worth another look.',line:'See what stuck. If it wobbles, that is useful information, not a verdict.',weak:t=>'Your '+t+' results are lowest at the moment. Let us poke at that, three puzzles.',least:t=>'You have not spent much time with '+t+' yet. Three puzzles to get acquainted.',end:'One endgame, so that strength stays yours.',mini:'One quick minigame round to keep your eyes on the whole board.',done:'You did all three. That counts. See you tomorrow.'}};
function coachFor(date){return Number(date.slice(-2))%2?'claudia':'gary'}
function makePlan(){let date=today(),who=coachFor(date),V=VOICE[who],tasks=[],used=new Set;
  let m=dueMissed().length;if(m){let g=Math.min(3,m);tasks.push({kind:'puzzles',filter:'missed',goal:g,done:0,label:'Re-solve '+g+' puzzle'+(g>1?'s':'')+' you missed',why:V.review})}
  else{let l=dueLines()[0]||lineSchedule().filter(l=>!l.sessions).sort(()=>0)[0];if(l){tasks.push({kind:'opening',id:l.id,goal:1,done:0,label:'Play '+l.name+(l.sessions?' from memory':' for the first time'),why:V.line,baseline:sessionCount()});used.add('opening')}
    else{let d=duePuzzles().length;if(d)tasks.push({kind:'puzzles',filter:'due',goal:Math.min(3,d),done:0,label:'Review '+Math.min(3,d)+' due puzzles',why:V.review})}}
  let w=weakTheme();if(w)tasks.push({kind:'puzzles',filter:w.tag,goal:3,done:0,label:'Solve 3 '+w.tag+' puzzles',why:w.why==='rate'?V.weak(w.tag):V.least(w.tag)});
  if(!used.has('opening')&&tasks.length<3){let l=dueLines()[0];if(l)tasks.push({kind:'opening',id:l.id,goal:1,done:0,label:'Play '+l.name+' from memory',why:V.line,baseline:sessionCount()})}
  let endDue=Number(date.slice(-2))%3===0||(window.chessMatoTraining&&chessMatoTraining.get().sinceEndgame>=5);
  if(tasks.length<3)tasks.push(endDue&&data.drills.some(d=>d.tags.includes('endgame'))?{kind:'puzzles',filter:'endgame',goal:1,done:0,label:'Solve 1 endgame puzzle',why:V.end}:{kind:'mini',type:'mixed',goal:1,done:0,label:'Play 1 Mixed minigame round',why:V.mini,baseline:roundCount()});
  while(tasks.length<3){let t=THEMES.find(t=>!tasks.some(x=>x.filter===t)&&data.drills.filter(d=>d.tags.includes(t)).length>=3);if(!t)break;tasks.push({kind:'puzzles',filter:t,goal:2,done:0,label:'Solve 2 '+t+' puzzles',why:V.least(t)})}
  R.plan={date,coach:who,intro:V.intro[Number(date.slice(-2))%V.intro.length],tasks:tasks.slice(0,3)};persist();if(!drawing)draw();return R.plan}
function plan(){if(!R.plan||R.plan.date!==today()){if(R.plan)R.history.push({date:R.plan.date,coach:R.plan.coach,done:R.plan.tasks.filter(t=>t.done>=t.goal).length,total:R.plan.tasks.length});R.history=R.history.slice(-90);makePlan()}return R.plan}
const sessionCount=()=>O()?(O().getStats().sessions||[]).filter(s=>s.completed).length:0;
const roundCount=()=>window.academyTest?academyTest.getProfile().rounds||0:0;
function progressed(){let p=R.plan;if(!p||p.date!==today())return;let changed=false;for(let t of p.tasks){if(t.done>=t.goal)continue;
  if(t.kind==='opening'){let s=(O().getStats().sessions||[]).filter(s=>s.completed).slice(t.baseline);if(s.some(s=>s.id===t.id)){t.done=1;changed=true}}
  if(t.kind==='mini'&&roundCount()>t.baseline){t.done=Math.min(t.goal,roundCount()-t.baseline);changed=true}}
  if(changed){persist();draw()}}
// Count puzzle completions against today's tasks. Missed state is read before the result is recorded.
const priorComplete=complete;complete=function(...a){let d=current,wasMissed=d&&missed(d),wasDue=d&&data.progress[d.id]&&data.progress[d.id].due<=Date.now(),r=priorComplete(...a);
  try{let p=plan();for(let t of p.tasks){if(t.kind!=='puzzles'||t.done>=t.goal||!d)continue;if(t.filter==='missed'?wasMissed:t.filter==='due'?wasDue:d.tags.includes(t.filter)){t.done++;break}}persist();draw()}catch(e){}return r};
function start(t){if(t.kind==='puzzles'){let d=pickPuzzle(t.filter);if(!d){note('No matching puzzle right now. Import more in Puzzles → Puzzle library or My games.');return}chessUITest.navigate('puzzles','solve');load(d);note('Daily plan: '+t.label+'.')}
  else if(t.kind==='opening'){chessUITest.navigate('openings','practice');let r=O().repertoire.find(r=>r.id===t.id);if(r){$('opening-side').value=r.side;$('opening-side').dispatchEvent(new Event('change'))}O().startOpening(t.id)}
  else if(t.kind==='mini'){chessUITest.navigate('minigames','round');$('minitype').value=t.type;$('startmini').click()}}
// ---- UI ----
const planPanel=$('panel-coach-plan');
function el(tag,text,parent,cls){let e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e}
let drawing=false;
function draw(){if(drawing)return;drawing=true;try{drawInner()}finally{drawing=false}}
function drawInner(){let p=plan();if(planPanel){planPanel.replaceChildren();let V=VOICE[p.coach];el('h2','Today\'s plan',planPanel);el('p',V.name+': '+p.intro,planPanel,'plan-intro');
  let ol=el('ol',null,planPanel,'plan-list');for(let t of p.tasks){let li=el('li',null,ol,t.done>=t.goal?'plan-done':'');el('b',(t.done>=t.goal?'✓ ':'')+t.label+(t.goal>1?' ('+Math.min(t.done,t.goal)+'/'+t.goal+')':''),li);el('p',t.why,li,'muted');if(t.done<t.goal){let b=el('button',t.done?'Continue':'Start',li);b.onclick=()=>start(t)}}
  if(!p.tasks.length)el('p','Nothing to plan yet: solve a few puzzles or play an opening line first.',planPanel,'muted');
  if(p.tasks.length&&p.tasks.every(t=>t.done>=t.goal))el('p',V.name+': '+V.done,planPanel,'notice');
  let streak=0;for(let h of R.history.slice().reverse()){if(h.done===h.total&&h.total)streak++;else break}let fin=R.history.filter(h=>h.total&&h.done===h.total).length;
  el('p','Completed plans: '+fin+(streak>1?' · current run: '+streak+' days in a row':'')+'. A new plan appears each day; unfinished tasks simply drop off.',planPanel,'muted')}
  let box=$('review-due');if(box){box.replaceChildren();let m=dueMissed(),d=duePuzzles(),l=dueLines();el('b','Spaced review',box);el('p',m.length+' missed puzzle'+(m.length===1?'':'s')+' due · '+(d.length-m.length)+' other puzzle'+(d.length-m.length===1?'':'s')+' due · '+l.length+' opening line'+(l.length===1?'':'s')+' due',box);
    let row=el('div',null,box,'row');let b1=el('button','Review a missed puzzle',row);b1.disabled=!m.length&&!d.length;b1.onclick=()=>start({kind:'puzzles',filter:m.length?'missed':'due',label:'spaced review'});
    let b2=el('button','Review a due opening line',row);b2.disabled=!l.length;b2.onclick=()=>l.length&&start({kind:'opening',id:l[0].id});
    el('p','Missed puzzles come back after five minutes, then 1, 2, 4… days as you solve them cleanly. Opening lines come back after 1, 3, 7, 16 and 30 days, and sooner after a slip.',box,'muted')}}
let q=$('queue');if(q){let box=document.createElement('div');box.id='review-due';box.className='notice';let info=$('pack-info');(info||q).before(box)}
// Opening sessions and minigame rounds are recorded after the last render of a line, so also check periodically.
setInterval(()=>{let p=R.plan;if(p&&p.tasks.some(t=>t.kind!=='puzzles'&&t.done<t.goal))try{progressed()}catch(e){}},1500);
const priorRender=render;render=function(...a){let r=priorRender(...a);try{progressed()}catch(e){}return r};
const priorQueue=queue;queue=function(...a){let r=priorQueue(...a);try{draw()}catch(e){}return r};
draw();
const style=document.createElement('style');style.textContent='.plan-list{padding-left:22px}.plan-list li{margin:0 0 12px}.plan-list li p{margin:3px 0 6px}.plan-list li.plan-done b{opacity:.75}.plan-intro{font-size:15px}#review-due p{margin:4px 0}#review-due .row{margin:6px 0}';document.head.append(style);
window.chessMatoReview={plan,makePlan,lineSchedule,dueLines,duePuzzles,dueMissed,themeStats,weakTheme,start,get:()=>R};
})();
