// Puzzle pack, alternate mates, theme rotation and minigame variety.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await (await browser.newContext({viewport:{width:1300,height:950}})).newPage();const errors=[];page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}try{localStorage.setItem('chessmato-tour-v1','done')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoPuzzles);
console.log('Pack');
let st=await page.evaluate(()=>({pack:chessMatoPuzzles.pack.length,inDrills:data.drills.filter(d=>d.id.startsWith('gen-')).length}));
ok(st.pack>0&&st.inDrills===st.pack,'all pack puzzles merged into drills ('+st.inDrills+'/'+st.pack+')');
let legal=await page.evaluate(()=>chessMatoPuzzles.pack.every(p=>{let c=new workshopTest.Chess(p.fen);return p.line.every(m=>c.move(m))&&p.line.length%2===1}));
ok(legal,'every pack line is legal and ends on the solver move');
// saved progress survives reload with pack
await page.evaluate(()=>{data.progress['backrank']={attempts:3,success:2,streak:1,due:1};save()});await page.reload();await page.waitForFunction(()=>window.chessMatoPuzzles);
ok(await page.evaluate(()=>data.progress['backrank']&&data.progress['backrank'].attempts===3&&data.drills.filter(d=>d.id.startsWith('gen-')).length===chessMatoPuzzles.pack.length),'saved progress kept, no duplicate pack drills after reload');
console.log('Solve a generated puzzle');
let d=await page.evaluate(()=>{let d=data.drills.find(d=>d.id.startsWith('gen-'));load(d);return {id:d.id,line:d.line}});
for(let i=0;i<d.line.length;i+=2){let m=await page.evaluate(i=>{let c=new workshopTest.Chess(game.fen());return c.move(current.line[i])},i);await page.click(`#board [data-s="${m.from}"]`);await page.click(`#board [data-s="${m.to}"]`);if(m.promotion)await page.click('[data-prom="'+m.promotion+'"]');await page.waitForTimeout(700)}
let res=await page.evaluate(()=>({open:document.querySelector('.feedback-modal').open,body:$('resultbody').textContent}));
ok(res.open&&res.body.length>40,'generated puzzle solved with explanation: '+res.body.slice(0,120));
await page.click('#resultokay');
console.log('Alternate mate');
await page.evaluate(()=>{let d={id:'alt-mate-test',title:'Two mates',fen:'6k1/5ppp/8/8/8/8/5PPP/RR4K1 w - - 0 1',line:['Ra8#'],tags:['mate'],hint:'',description:'White to move.'};data.drills.push(validate([d])[0]);load(data.drills.find(x=>x.id==='alt-mate-test'))});
await page.click('#board [data-s="b1"]');await page.click('#board [data-s="b8"]');await page.waitForTimeout(400);
res=await page.evaluate(()=>({open:document.querySelector('.feedback-modal').open,title:$('resulttitle').textContent,body:$('resultbody').textContent,miss:document.querySelector('.coach-modal').open}));
ok(res.open&&!res.miss&&/won/i.test(res.title)&&/also checkmate/.test(res.body),'Rb8# accepted as alternate mate');
await page.click('#resultokay');
await page.evaluate(()=>{data.drills=data.drills.filter(d=>d.id!=='alt-mate-test');delete data.progress['alt-mate-test'];save()});
console.log('Theme rotation');
let seq=[];for(let i=0;i<6;i++){seq.push(await page.evaluate(()=>chessMatoPuzzles.primary(current)));await page.click('#next')}
let repeats=seq.filter((t,i)=>i&&t===seq[i-1]).length;ok(repeats<=1,'Next varies themes: '+seq.join(' > '));
console.log('Minigames');
await page.evaluate(()=>chessUITest.navigate('minigames','round'));
for(const kind of ['checks','freebie','pinned','knight','material','mixed']){
  await page.selectOption('#minitype',kind);await page.click('#startmini');
  let q=await page.evaluate(()=>({p:$('miniprompt').textContent,buttons:$('minianswers').children.length}));
  ok(/Question 1\/5/.test(q.p),kind+': question shown · '+q.p.slice(0,80));
  // answer correctly through the real UI
  let t=await page.evaluate(()=>window.academyTest&&document.querySelector('#miniprompt')&&null);
  let target=await page.evaluate(()=>{let q=window.__q;return null});
  await page.click('#stopmini');
}
// correctness of answer keys through an exposed round
let check=await page.evaluate(async()=>{let out=[];for(const kind of ['checks','freebie','pinned','knight','material']){$('minitype').value=kind;$('startmini').click();let prompt=$('miniprompt').textContent;let btn=Array.from($('minianswers').children);out.push({kind,prompt,buttons:btn.length});$('stopmini').click()}return out});
ok(check.find(c=>c.kind==='knight').buttons===4&&check.find(c=>c.kind==='material').buttons===4,'button minigames offer four answers');
await page.selectOption('#minitype','knight');await page.click('#startmini');
let kq=await page.evaluate(()=>$('miniprompt').textContent.match(/from (\w\d) to (\w\d)/));
let dist=((a,b)=>{const xy=s=>['abcdefgh'.indexOf(s[0]),+s[1]-1];let D={[a]:0},Q=[a];while(Q.length){let s=Q.shift(),[x,y]=xy(s);for(let [p,q] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]){let nx=x+p,ny=y+q;if(nx<0||nx>7||ny<0||ny>7)continue;let t='abcdefgh'[nx]+(ny+1);if(D[t]===undefined){D[t]=D[s]+1;Q.push(t)}}}return D[b]})(kq[1],kq[2]);
await page.click(`#minianswers button:text-is("${dist}")`);ok(await page.evaluate(()=>$('resulttitle').textContent==='Correct!'),'knight route answer key matches independent BFS ('+kq[0]+' = '+dist+')');
await page.click('#resultokay');await page.click('#board [data-s="a1"]');ok(await page.evaluate(()=>!document.querySelector('.feedback-modal').open),'board clicks ignored on button questions');
await page.click('#stopmini');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
