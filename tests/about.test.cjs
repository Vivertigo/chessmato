// Settings → About: version line and the offline "Send feedback" report.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext();await ctx.grantPermissions(['clipboard-read','clipboard-write']);const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('chessmato-tour-v1','done'));await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoAbout);
await page.evaluate(()=>chessUITest.navigate('settings','about'));
ok(await page.evaluate(()=>/^CheckMato \d+\.\d+\.\d+.* · website$/.test($('version-line').textContent)),'About shows the version: '+await page.textContent('#version-line'));
await page.evaluate(()=>{setTimeout(()=>{throw new Error('sample failure')},0)});await page.waitForTimeout(100);
await page.fill('#feedback-text','The knight jumped twice.');
let r=await page.evaluate(()=>chessMatoAbout.report());
ok(/The knight jumped twice\./.test(r)&&/Version: /.test(r)&&/Screen: /.test(r)&&/sample failure/.test(r),'the report has the message, version, device and recent errors');
ok(!/chess-workshop|maykalka/i.test(r),'no saved games or personal data in it');
await page.uncheck('#feedback-details');ok(!/Version: /.test(await page.evaluate(()=>chessMatoAbout.report())),'technical details can be left out');
await page.click('#feedback-copy');await page.waitForFunction(()=>/Copied|blocked/.test($('feedback-msg').textContent));ok(/Copied/.test(await page.textContent('#feedback-msg'))&&/knight jumped/.test(await page.evaluate(()=>navigator.clipboard.readText())),'Copy puts the report on the clipboard');
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#feedback-save')]);ok(/^checkmato-feedback-\d{4}-\d\d-\d\d\.txt$/.test(dl.suggestedFilename()),'Save as file downloads a .txt report');
ok(errors.length===1&&/sample failure/.test(errors[0]),'no other JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
