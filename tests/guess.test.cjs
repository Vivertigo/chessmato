// Guess the move through finished games.
const {chromium}=require('playwright');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
(async()=>{const browser=await chromium.launch();const page=await (await browser.newContext({viewport:{width:1300,height:950}})).newPage();const errors=[];await page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}try{localStorage.setItem('chessmato-tour-v1','done')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoGuess);
const click=async(a,b)=>{await page.click(`#board [data-s="${a}"]`);await page.click(`#board [data-s="${b}"]`)};
const waitTurn=()=>page.waitForFunction(()=>{let G=chessMatoGuess.get();return G&&(G.finished||(!G.busy&&game.turn()===G.side))},null,{timeout:30000});
ok(await page.evaluate(()=>chessMatoGuess.classics.length===9&&chessMatoGuess.classics.filter(g=>g.mate!==false).length===5&&chessMatoGuess.classics.filter(g=>g.mate!==false).every(g=>{let c=new Chess();g.sans.forEach(s=>c.move(s));return c.in_checkmate()})),'9 classic games bundled; the 5 mating games are verified to end in checkmate');
await page.evaluate(()=>chessUITest.navigate('play','guess'));ok(await page.evaluate(()=>!$('panel-play-guess').hidden&&$('guess-game').options.length>=5&&$('guess-side').value==='w'),'Play → Guess the move lists the games; side defaults to the winner');
await page.selectOption('#guess-game','reti');await page.click('#guess-start');await waitTurn();
ok(await page.evaluate(()=>game.history().length===0&&chessMatoGuess.get().side==='w'),'game starts at the initial position with you to move');
await click('e2','e4');await waitTurn();
let s=await page.evaluate(()=>({G:chessMatoGuess.get(),h:game.history().join(' ')}));
ok(s.G.score===3&&s.G.matched===1&&s.h==='e4 c6','exact match scores 3; the opponent reply (c6) is played automatically');
await click('g1','f3');await waitTurn();
s=await page.evaluate(()=>({G:chessMatoGuess.get(),h:game.history().join(' ')}));
ok(s.h==='e4 c6 d4 d5'&&s.G.log[1].mine==='Nf3'&&s.G.log[1].real==='d4','a different guess still plays the real move (d4), not yours');
ok([0,1,2].includes(s.G.log[1].pts)&&/Engine/.test(s.G.log[1].note),'the engine grades the alternative: '+s.G.log[1].note+' +'+s.G.log[1].pts);
ok(await page.evaluate(()=>/\(you: Nf3\)/.test($('guess-state').textContent)),'the move log shows your guess next to the game move');
console.log('Play to the end');
for(let i=0;i<20;i++){let m=await page.evaluate(()=>{let G=chessMatoGuess.get();if(!G||G.finished)return null;let r=new Chess(game.fen()).move(G.src.sans[G.ply]);return [r.from,r.to]});if(!m)break;await click(m[0],m[1]);await waitTurn()}
s=await page.evaluate(()=>({G:chessMatoGuess.get(),mate:game.in_checkmate(),best:chessMatoGuess.best()['reti-w']}));
ok(s.G.finished&&s.mate&&s.G.matched===s.G.turns-1&&s.best>=85,'playing the rest exactly reaches Bd8# and records a best score ('+s.best+'%)');
ok(await page.evaluate(()=>/Finished\. Best on this game/.test($('guess-state').textContent)),'summary shown');
console.log('As Black, from My games');
await page.evaluate(()=>chessMatoGames.importText('[White "A"]\n[Black "Me"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1','b'));
await page.evaluate(()=>{$('guess-game').dispatchEvent(new Event('focus'))});
let mine=await page.evaluate(()=>chessMatoGuess.sources().find(g=>g.id.startsWith('pgn-')));ok(mine&&/My games/.test(mine.label),'your imported games appear as sources');
await page.evaluate(id=>{$('guess-game').value=id;$('guess-game').dispatchEvent(new Event('change'))},mine.id);ok(await page.evaluate(()=>$('guess-side').value==='b'),'side defaults to your side in that game');
await page.click('#guess-start');await waitTurn();ok(await page.evaluate(()=>game.history().join(' ')==='f3'&&chessMatoGuess.get().side==='b'),'as Black, White\'s first move is played for you');
await click('e7','e5');await waitTurn();await click('d8','h4');await waitTurn();
ok(await page.evaluate(()=>chessMatoGuess.get().finished&&chessMatoGuess.get().matched===2),'both Black moves matched; game finished');
console.log('Leaving');
await page.evaluate(()=>chessMatoGuess.start('opera','w'));await waitTurn();await page.evaluate(()=>load(data.drills.find(d=>d.id==='backrank')));
ok(await page.evaluate(()=>!chessMatoGuess.get()&&!busy),'loading a puzzle ends the guessing game cleanly');
await click('e1','e8');await page.waitForTimeout(300);ok(await page.evaluate(()=>document.querySelector('.feedback-modal').open),'puzzles work normally afterwards');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
