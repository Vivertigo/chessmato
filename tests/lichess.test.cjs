// Puzzle library: importing the Lichess puzzle CSV (.zst or .csv) offline, filtering, validating and storing.
const {chromium}=require('playwright');const fs=require('fs'),zlib=require('zlib'),os=require('os'),path=require('path');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
// Same columns as lichess_db_puzzle.csv. The first move in Moves is the opponent's; the FEN is before it.
const ROWS=['PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags',
'00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,720,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,Italian_Game Italian_Game_Classical_Variation',
'tBack,6k1/4pppp/8/8/8/8/5PPP/R5K1 b - - 0 1,e7e6 a1a8,900,75,95,1200,backRankMate endgame mate mateIn1 oneMove,https://lichess.org/x,',
'tFork,q2k4/8/8/1N6/8/8/8/4K3 b - - 0 1,d8e8 b5c7 e8d7 c7a8,1100,75,90,800,crushing endgame fork short,https://lichess.org/y,',
'tHigh,6k1/4pppp/8/8/8/8/5PPP/R5K1 b - - 0 1,e7e6 a1a8,2600,75,95,1200,backRankMate endgame mate mateIn1 oneMove,https://lichess.org/z,',
'tUnpop,6k1/4pppp/8/8/8/8/5PPP/R5K1 b - - 0 1,e7e5 a1a8,1000,75,20,1200,backRankMate endgame mate mateIn1 oneMove,https://lichess.org/w,',
'tBad,6k1/4pppp/8/8/8/8/5PPP/R5K1 b - - 0 1,e7e6 a1h8,1000,75,95,1200,mate mateIn1 oneMove,https://lichess.org/v,'];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cm-li-'));const zst=path.join(dir,'lichess_db_puzzle.csv.zst'),csv=path.join(dir,'lichess_db_puzzle.csv'),bad=path.join(dir,'broken.csv.zst');
fs.writeFileSync(zst,zlib.zstdCompressSync(Buffer.from(ROWS.join('\n')+'\n')));fs.writeFileSync(csv,ROWS.join('\r\n'));fs.writeFileSync(bad,Buffer.from('this is not zstd at all, sorry'));
(async()=>{const browser=await chromium.launch();const page=await (await browser.newContext({viewport:{width:1300,height:950},acceptDownloads:true})).newPage();const errors=[];page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoLichess);
const builtIn=await page.evaluate(()=>data.drills.length);
await page.evaluate(()=>chessUITest.navigate('puzzles','library'));ok(await page.evaluate(()=>!$('panel-puzzles-library').hidden&&/CC0/.test($('panel-puzzles-library').textContent)),'Puzzles has a Puzzle library section crediting Lichess (CC0)');
await page.fill('#lichess-min','800');await page.fill('#lichess-max','2000');
const importFile=async f=>{await page.evaluate(()=>$('lichess-msg').textContent='');await page.setInputFiles('#lichess-file',f);await page.waitForFunction(()=>/^(Added|Import failed)/.test($('lichess-msg').textContent),null,{timeout:30000});return page.textContent('#lichess-msg')};
let msg=await importFile(zst);
ok(/^Added 3 Lichess puzzles \(checked 6\)/.test(msg),'compressed file: 3 added; out-of-range, unpopular and illegal rows skipped: '+msg);
let st=await page.evaluate(()=>({ids:chessMatoLichess.get().puzzles.map(p=>p.id).sort(),d:data.drills.find(d=>d.id==='li-00sHx'),back:data.drills.find(d=>d.id==='li-tBack'),n:data.drills.length}));
ok(st.ids.join()==='00sHx,tBack,tFork'&&st.n===builtIn+3,'only valid puzzles in range are stored and merged; built-in puzzles kept');
ok(/^r?q?/.test(st.d.fen)&&st.d.fen.split(' ')[1]==='w'&&st.d.line.join(' ')==='Be6+ Kd8 Qf8#','opponent move applied first; solution converted to SAN (Be6+ Kd8 Qf8#)');
ok(/opponent just played Kd7/.test(st.d.description)&&/Find mate in 2/.test(st.d.description)&&st.d.rating===1760&&st.d.title==='Mate in 2 · White · Lichess','description names the opponent move, goal and Lichess rating');
ok(st.back.tags.includes('back rank')&&st.back.tags.includes('mate')&&st.back.tags.includes('lichess'),'Lichess themes mapped to ChessMato tags (back rank, mate)');
ok(await page.evaluate(()=>!JSON.parse(localStorage.getItem('chess-workshop-v1')).drills.some(d=>d.id.startsWith('li-'))),'Lichess puzzles are not copied into the drill backup key');
console.log('Solve one');
await page.evaluate(()=>load(data.drills.find(d=>d.id==='li-tBack')));await page.click('#board [data-s="a1"]');await page.click('#board [data-s="a8"]');await page.waitForTimeout(300);
ok(await page.evaluate(()=>document.querySelector('.feedback-modal').open&&/won/i.test($('resulttitle').textContent)&&/Back-rank mate/.test(chessMatoExplain(current))&&document.querySelector('.feedback-modal').textContent.includes('lichess.org/training/tBack')&&/lichess\.org\/training\/tBack/.test(chessMatoExplain(current))),'puzzle solves; explanation lists Lichess themes and source');
await page.click('#resultokay');
console.log('Re-import, themes, plain CSV');
await page.evaluate(()=>chessUITest.navigate('puzzles','library'));
msg=await importFile(csv);ok(/^Added 0 Lichess puzzles/.test(msg),'re-importing skips puzzles already saved (plain .csv with CRLF works)');
await page.click('#lichess-remove');ok(await page.evaluate(n=>chessMatoLichess.get().puzzles.length===0&&data.drills.length===n,builtIn),'Remove all clears only Lichess puzzles');
await page.check('#lichess-themes input[value="fork"]');msg=await importFile(zst);
ok(/^Added 1 Lichess puzzle /.test(msg)&&await page.evaluate(()=>chessMatoLichess.get().puzzles[0].id==='tFork'),'theme filter: only the fork is imported');
await page.uncheck('#lichess-themes input[value="fork"]');await page.uncheck('#lichess-popular');msg=await importFile(zst);
ok(await page.evaluate(()=>chessMatoLichess.get().puzzles.some(p=>p.id==='tUnpop')),'unticking "well-tested only" includes less popular puzzles');
msg=await importFile(bad);ok(/^Import failed: This file is not a valid \.zst archive/.test(msg),'a damaged file gives a clear error: '+msg);
console.log('Persistence and backup');
let count=await page.evaluate(()=>chessMatoLichess.get().puzzles.length);await page.reload();await page.waitForFunction(()=>window.chessMatoLichess);
ok(await page.evaluate(c=>chessMatoLichess.get().puzzles.length===c&&data.drills.filter(d=>d.id.startsWith('li-')).length===c,count),'Lichess puzzles survive a reload');
await page.evaluate(()=>chessUITest.navigate('settings','backups'));let [bk]=await Promise.all([page.waitForEvent('download'),page.click('#all-export')]);
ok(!!JSON.parse(fs.readFileSync(await bk.path(),'utf8')).keys['chessmato-lichess-v1'],'"Back up everything" includes Lichess puzzles');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
