// First-run walkthrough.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:800}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoTour);await page.waitForFunction(()=>$('tour').open,null,{timeout:3000}).catch(()=>{});
ok(await page.evaluate(()=>$('tour').open&&/Welcome to CheckMato/.test($('tour-title').textContent)&&document.activeElement===$('tour-next')),'a new device sees the welcome tour, focused on Next');
ok(await page.evaluate(()=>{let r=$('tour').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),'the tour fits a phone screen');
let titles=[];for(let i=0;i<5;i++){titles.push(await page.textContent('#tour-title'));await page.click('#tour-next')}titles.push(await page.textContent('#tour-title'));
ok(titles.length===6&&/Moving pieces/.test(titles[1])&&/Think before you move/.test(titles[2])&&/offline/.test(titles[5]),'six steps: '+titles.join(' / '));
ok(await page.evaluate(()=>$('tour-next').textContent==='Start training'),'the last step says Start training');
await page.click('#tour-back');ok(await page.evaluate(()=>/Your data stays here/.test($('tour-title').textContent)),'Back steps back');
await page.click('#tour-next');await page.click('#tour-next');ok(await page.evaluate(()=>!$('tour').open&&localStorage.getItem('chessmato-tour-v1')==='done'),'finishing closes it and remembers');
await page.reload();await page.waitForFunction(()=>window.chessMatoTour);await page.waitForTimeout(600);ok(await page.evaluate(()=>!$('tour').open),'not shown again after a reload');
await page.evaluate(()=>chessUITest.navigate('settings','about'));await page.click('#tour-replay');ok(await page.evaluate(()=>$('tour').open&&/Welcome/.test($('tour-title').textContent)),'Settings → About replays the tour');
for(let i=0;i<3;i++)await page.click('#tour-next');await page.click('#tour-go');ok(await page.evaluate(()=>!$('tour').open&&!$('panel-coach-plan').hidden),'"Open the Daily plan" jumps there');
await page.evaluate(()=>chessMatoTour.open());await page.keyboard.press('Escape');ok(await page.evaluate(()=>!$('tour').open),'Escape closes the tour');
console.log('Existing users');
const p2=await (await browser.newContext()).newPage();await p2.addInitScript(()=>{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x','1');localStorage.setItem('chess-academy-v2',JSON.stringify({rating:900}))}});
await p2.goto(BASE);await p2.waitForFunction(()=>window.chessMatoTour);await p2.waitForTimeout(600);ok(await p2.evaluate(()=>!$('tour').open&&localStorage.getItem('chessmato-tour-v1')==='done'),'someone who already trains here is not interrupted');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
