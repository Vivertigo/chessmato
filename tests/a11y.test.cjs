// Screen-reader and keyboard checks: names on every control, tab structure, live regions, and a keyboard-only
// game on the thinking board.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1300,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('chessmato-tour-v1','done');localStorage.setItem('chessmato-thinking-v1','on')});
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoTour);
console.log('Structure');
ok(await page.evaluate(()=>[...document.querySelectorAll('[role=tablist]')].every(t=>[...t.children].every(c=>['tab','presentation','none'].includes(c.getAttribute('role'))))),'tab lists hold only tabs (the coach card sits outside)');
ok(await page.evaluate(()=>!!document.querySelector('#primary-tabs .mentor-card')&&document.querySelectorAll('#primary-tabs [role=tab]').length>=8),'the workspace rail still shows the coach card and every workspace');
const unnamed=await page.evaluate(()=>{const named=e=>e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label')||(e.id&&document.querySelector('label[for="'+CSS.escape(e.id)+'"]'))||e.title;
  return [...document.querySelectorAll('input:not([type=hidden]):not([hidden]),select,textarea')].filter(e=>!named(e)).map(e=>e.id||e.name||e.outerHTML.slice(0,60))});
ok(unnamed.length===0,'every input, select and text box has a name '+JSON.stringify(unnamed));
ok(await page.evaluate(()=>[...document.querySelectorAll('button:not([hidden])')].every(b=>(b.textContent.trim()||b.getAttribute('aria-label')||b.title))),'every button has a name');
ok(await page.evaluate(()=>['thinking-line','games-msg','all-msg','lichess-msg','hs-status','guess-state'].every(id=>$(id)&&$(id).getAttribute('aria-live')==='polite')),'thinking line, My games, backups, Puzzle library, Two players and Guess the move announce their messages');
console.log('Workspace keys');
await page.focus('#tab-puzzles');await page.keyboard.press('ArrowDown');
ok(await page.evaluate(()=>document.activeElement.id==='tab-minigames'&&!$('tab-minigames').hasAttribute('tabindex')||document.activeElement.getAttribute('role')==='tab'&&document.activeElement.id!=='tab-puzzles'),'arrow keys move between workspaces');
console.log('Thinking board by keyboard');
await page.evaluate(()=>{$('mode').value='free';$('mode').dispatchEvent(new Event('change'));chessUITest.navigate('puzzles','solve')});
await page.focus('#board [data-s="e2"]');await page.keyboard.press('t');await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
ok(await page.evaluate(()=>$('board').classList.contains('thinking')&&document.activeElement.dataset.s==='e4'&&/1\. e4/.test($('thinking-line').textContent)),'T, then Enter, arrows, Enter plays a thinking line and keeps focus on the board');
// Black reply e7-e5 by keyboard, then step back with [ and forward with ].
await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
ok(await page.evaluate(()=>/e4 e5/.test($('thinking-line').textContent)),'the reply for the other side is added to the line');
await page.keyboard.press('[');ok(await page.evaluate(()=>!document.querySelector('#board [data-s="e5"] .piece')&&!!document.activeElement.closest('#board')),'[ steps back and keeps focus on the board');
await page.keyboard.press(']');ok(await page.evaluate(()=>!!document.querySelector('#board [data-s="e5"] .piece')),'] steps forward');
const contrast=await page.evaluate(()=>{const lum=c=>{let v=c.map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};const rgb=s=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);
  return [...document.querySelectorAll('#board .sq')].map(b=>{let a=lum(rgb(getComputedStyle(b).backgroundColor)),c=lum(rgb(getComputedStyle(b).getPropertyValue('--tile-ink'))),r=(Math.max(a,c)+.05)/(Math.min(a,c)+.05);return Math.abs(r-Number(b.dataset.letterContrast))}).filter(d=>d>0.06).length});
ok(contrast===0,'square letters are recoloured for the blue thinking tint ('+contrast+' squares off)');
await page.keyboard.press('p');
ok(await page.evaluate(()=>!$('board').classList.contains('thinking')&&game.history().join(' ')==='e4'),'P plays only the first move of the line');
ok(await page.evaluate(()=>!!document.activeElement.closest('#board')),'focus stays on the board after playing');
ok(await page.evaluate(()=>/T opens the Dream Board/.test($('board-keyboard-help').textContent)&&/P \(or Ctrl\+Enter\) plays/.test($('board-keyboard-help').textContent)),'the keyboard help lists the shortcut');
await page.focus('#board [data-s="d2"]');await page.keyboard.press('t');await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
await page.keyboard.press('Escape');ok(await page.evaluate(()=>!$('board').classList.contains('thinking')&&game.history().join(' ')==='e4'),'Escape leaves the thinking board without playing');
console.log('Settings labels');
await page.evaluate(()=>chessUITest.navigate('settings','accessibility'));
ok(await page.evaluate(()=>{let l=document.querySelector('label[for="text-scale"]');return !!l&&/Interface text size/.test(l.textContent)}),'the text-size slider is labelled');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
