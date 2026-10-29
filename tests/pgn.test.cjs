// My games: PGN import/export, opening names, repertoire departure, engine review → personal puzzles,
// resignation review, automatic bot-game saving, and the one-file backup.
const {chromium}=require('playwright');const fs=require('fs');
const BASE=process.env.CHESSMATO_URL||'http://127.0.0.1:8767/';
let failures=0,passes=0;function ok(c,m){if(c){passes++;console.log('  ok  '+m)}else{failures++;console.log('  FAIL '+m)}}
const PGN=`[Event "Rated Blitz game"]
[Site "https://lichess.org/abc"]
[Date "2026.10.01"]
[White "TestPlayer"]
[Black "Opponent1"]
[Result "1-0"]
[Termination "Normal"]

1. e4 {[%clk 0:03:00]} e5 2. Nf3 Nc6 (2... d6 3. d4) 3. Bc4 $1 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. h3 h6 1-0

[Event "Casual"]
[Date "2026.10.02"]
[White "Someone"]
[Black "testplayer"]
[Result "1-0"]
[Termination "Normal"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6 5. Qb3 Qe7 6. Nc3 Nd4 7. Qa4 b5 8. Nxb5 Nxb5 9. Bxb5 Bb7 10. d3 a6 11. Bc4 Bxe4 12. dxe4 Qb4+ 13. Qxb4 Bxb4+ 14. c3 1-0

[Event "Broken"]
[White "A"]
[Black "B"]

1. e4 e5 2. Ke3 Kxe4 *
`;
const MISSED=`[Event "Missed mate"]
[Date "2026.10.03"]
[White "TestPlayer"]
[Black "Opp"]
[Result "*"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qe2 Bc5 *
`;
(async()=>{const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1300,height:950},acceptDownloads:true});const page=await ctx.newPage();const errors=[];page.addInitScript(()=>{try{if(!sessionStorage.getItem('thinking-test'))localStorage.setItem('chessmato-thinking-v1','off')}catch(e){}});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(BASE);await page.waitForFunction(()=>window.chessMatoGames);
console.log('Import');
await page.evaluate(()=>chessUITest.navigate('profile','games'));
ok(await page.evaluate(()=>!$('panel-profile-games').hidden&&!!$('games-import')),'Player profile has a My games section');
await page.fill('#games-names','TestPlayer');await page.fill('#games-pgn',PGN);await page.click('#games-import');
let msg=await page.textContent('#games-msg');ok(/^2 games imported/.test(msg)&&/Skipped 1: Game 3: Illegal or unreadable move "Ke3"/.test(msg),'two games imported, broken game reported with the bad move: '+msg);
let G=await page.evaluate(()=>chessMatoGames.get().games);
ok(G.length===2&&G[0].sans.length===16&&G[0].sans[3]==='Nc6'&&G[0].sans[4]==='Bc4','comments, clocks, variations and NAGs ignored; main line kept');
ok(G[0].userColor==='w'&&G[1].userColor==='b','your side found by username (case-insensitive)');
ok(G[0].opening&&/Italian Game/.test(G[0].opening.name)&&/^C5/.test(G[0].opening.eco),'opening named from the Lichess list: '+(G[0].opening&&G[0].opening.eco+' '+G[0].opening.name));
ok(G[0].outcome==='win'&&G[1].outcome==='loss'&&/resign/.test(G[1].how),'results and inferred resignation detected');
ok(!G[0].departure||(G[0].departure.by==='end'&&G[0].departure.ply===13),'game that follows the Italian repertoire to its end is not counted as your departure');
await page.fill('#games-pgn',PGN);await page.click('#games-import');ok(/^0 games imported, 2 already saved/.test(await page.textContent('#games-msg')),'re-importing the same games adds no duplicates');
let dep=await page.evaluate(()=>chessMatoGames.importText('[White "TestPlayer"]\n[Black "X"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 0-1','auto'));
let g3=await page.evaluate(()=>chessMatoGames.get().games[2]);
ok(dep.added===1&&g3.departure&&g3.departure.by==='you'&&/move 3 with Bb5/.test(g3.departure.text)&&/Bc4/.test(g3.departure.text),'repertoire departure found: '+(g3.departure&&g3.departure.text));
ok(await page.evaluate(()=>document.querySelectorAll('#games-list .game-row').length===3&&/^3 saved games/.test($('games-summary').textContent)),'games listed with a summary');
console.log('Export');
let [dl]=await Promise.all([page.waitForEvent('download'),page.click('#games-export')]);let text=fs.readFileSync(await dl.path(),'utf8');
let round=await page.evaluate(t=>{let gs=chessMatoGames.splitGames(t).map(chessMatoGames.parseOne);return gs.map(g=>g.sans.join(' '))},text);
ok(round.length===3&&round[0]===G[0].sans.join(' ')&&round[1]===G[1].sans.join(' ')&&/\[White "TestPlayer"\]/.test(text)&&/1\. e4 e5 2\. Nf3/.test(text),'exported PGN re-imports to identical games');
let fenGame=await page.evaluate(()=>{let g={headers:{White:'a',Black:'b'},sans:['Kb7'],start:'k7/8/1K6/8/8/8/8/7R b - - 3 40',result:'*'};return chessMatoGames.toPGN(g)});
ok(/\[SetUp "1"\]/.test(fenGame)&&/40\.\.\. Kb7/.test(fenGame),'games from a set-up position export with FEN and black move number');
console.log('Engine review');
await page.evaluate(m=>chessMatoGames.importText(m,'auto'),MISSED);
let before=await page.evaluate(()=>data.drills.length);
let rev=await page.evaluate(async()=>{let g=chessMatoGames.get().games.find(g=>g.headers.Event==='Missed mate');let r=await chessMatoGames.analyse(g,8);return {r,a:g.analysis}});
let d=await page.evaluate(()=>data.drills.find(d=>d.id.startsWith('pgn-')));
ok(rev.r.added>=1&&d&&d.line[0]==='Qxf7#'&&d.tags.includes('from your games')&&d.tags.includes('mate'),'missed mate (Qxf7#) became a personal puzzle from the real position');
ok(d&&d.fen.startsWith('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w'),'puzzle uses the exact game FEN');
ok(rev.a&&rev.a.blunders>=1&&rev.a.phase.opening!==null&&rev.a.worst[0].san==='Qe2','review measures Kudos by phase and finds the worst move');
ok(await page.evaluate(([n,a])=>data.drills.length===n+a,[before,rev.r.added]),'puzzle count grows by the number reported');
await page.evaluate(()=>{load(data.drills.find(d=>d.id.startsWith('pgn-')))});await page.click('#board [data-s="h5"]');await page.click('#board [data-s="f7"]');await page.waitForTimeout(300);
ok(await page.evaluate(()=>document.querySelector('.feedback-modal').open&&/won/i.test($('resulttitle').textContent)),'the new puzzle can be solved');await page.click('#resultokay');
console.log('Resignation from an imported game');
let res=await page.evaluate(async()=>{let g=chessMatoGames.get().games.find(g=>g.headers.Event==='Casual');await chessMatoGames.analyse(g,8);return chessMatoTraining.get().resigns.slice(-1)[0]});
ok(res&&res.human==='b'&&/Someone/.test(res.source)&&['playable','difficult','lost','better','mate'].includes(res.verdict),'resigned imported game added to Resignation review ('+(res&&res.verdict)+')');
await page.evaluate(()=>chessUITest.navigate('profile','resign'));ok(/from vs Someone/.test(await page.textContent('#panel-profile-resign')),'resignation review shows where it came from');
console.log('Bot games saved automatically');
let n0=await page.evaluate(()=>chessMatoGames.get().games.length);
await page.evaluate(()=>academyCoach.startBotFrom('k7/8/1K6/8/8/8/8/7R w - - 0 1','w'));await page.waitForFunction(()=>/Your turn/.test($('botstate').textContent),null,{timeout:60000});
await page.click('#board [data-s="h1"]');await page.click('#board [data-s="h8"]');await page.waitForTimeout(500);
let bot=await page.evaluate(()=>chessMatoGames.get().games.slice(-1)[0]);
ok(await page.evaluate(n=>chessMatoGames.get().games.length===n+1,n0)&&bot.source==='bot'&&bot.result==='1-0'&&bot.outcome==='win'&&bot.how==='checkmate'&&bot.start==='k7/8/1K6/8/8/8/8/7R w - - 0 1','finished bot game saved as a game with its start position');
let pg=await page.evaluate(()=>chessMatoGames.toPGN(chessMatoGames.get().games.slice(-1)[0]));ok(/\[FEN "k7\/8\/1K6/.test(pg)&&/1\. Rh8# 1-0/.test(pg),'bot game exports as PGN');
await page.click('#resultokay').catch(()=>{});
console.log('Opening name under the board');
await page.evaluate(()=>{chessUITest.navigate('positions','manual');$('fen').value='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';$('loadfen').click();$('mode').value='free';$('mode').dispatchEvent(new Event('change'))});
for(const [a,b] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','c4']]){await page.click(`#board [data-s="${a}"]`);await page.click(`#board [data-s="${b}"]`)}
let on=await page.evaluate(()=>({h:$('opening-name').hidden,t:$('opening-name').textContent,hist:game.history().join(' ')}));
ok(!on.h&&/^Opening: C50 Italian Game/.test(on.t),'Analysis board names the opening as you play: '+on.t+' ['+on.hist+']');
await page.evaluate(()=>load(data.drills.find(d=>d.id==='backrank')));ok(await page.evaluate(()=>$('opening-name').hidden),'no opening name on puzzles');
console.log('Persistence and full backup');
await page.reload();await page.waitForFunction(()=>window.chessMatoGames);
ok(await page.evaluate(n=>chessMatoGames.get().games.length===n+1&&chessMatoGames.get().names[0]==='TestPlayer',n0),'games and usernames survive a reload');
await page.evaluate(()=>chessUITest.navigate('settings','backups'));
let [bk]=await Promise.all([page.waitForEvent('download'),page.click('#all-export')]);let bkPath=await bk.path(),backup=JSON.parse(fs.readFileSync(bkPath,'utf8'));
ok(backup.app==='CheckMato'&&backup.keys['chessmato-games-v1']&&backup.keys['chess-workshop-v1']&&backup.keys['chessmato-training-v1'],'backup file holds games, puzzles and training');
let snap=await page.evaluate(()=>({games:localStorage.getItem('chessmato-games-v1'),work:localStorage.getItem('chess-workshop-v1')}));
await page.evaluate(()=>{localStorage.removeItem('chessmato-games-v1');localStorage.setItem('chess-workshop-v1','{}')});
await page.reload();await page.waitForFunction(()=>window.chessMatoGames);ok(await page.evaluate(()=>chessMatoGames.get().games.length===0),'data cleared before restore');
await page.evaluate(()=>chessUITest.navigate('settings','backups'));fs.writeFileSync('/tmp/chessmato-bad.json','{"app":"Other"}');
await page.setInputFiles('#all-file','/tmp/chessmato-bad.json');await page.waitForTimeout(200);ok(/not a CheckMato full backup/.test(await page.textContent('#all-msg')),'wrong file is refused with a clear message');
await Promise.all([page.waitForEvent('load'),page.setInputFiles('#all-file',bkPath)]);await page.waitForFunction(()=>window.chessMatoGames);
ok(await page.evaluate(s=>localStorage.getItem('chessmato-games-v1')===s.games&&localStorage.getItem('chess-workshop-v1')===s.work&&chessMatoGames.get().games.length>0,snap),'restore brings everything back exactly');
ok(await page.evaluate(()=>data.drills.some(d=>d.id.startsWith('pgn-'))),'personal puzzles restored');
ok(errors.length===0,'no JS errors '+JSON.stringify(errors));
await browser.close();console.log(`\n${passes} passed, ${failures} failed`);process.exit(failures?1:0)})().catch(e=>{console.error(e);process.exit(2)});
