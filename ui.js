'use strict';
(function(){
const oldMain=document.querySelector('main'),board=oldMain.querySelector('section'),sourceAside=oldMain.querySelector('aside'),arena=document.querySelector('.academy'),openingPanel=$('opening-side').closest('section');
const oldAside=document.createElement('aside');sourceAside.before(oldAside);sourceAside.hidden=true;const top=document.querySelector('header');top.querySelectorAll('nav').forEach(n=>n.remove());top.querySelector('small').textContent='Train with Gary Bendt & Claudia Herman · local only · no clocks';top.querySelector('#score').classList.add('header-score');
const shell=document.createElement('div');shell.id='app-shell';const rail=document.createElement('nav');rail.id='primary-tabs';rail.setAttribute('aria-label','Chess workspaces');const railTabs=document.createElement('div');railTabs.className='rail-tabs';railTabs.setAttribute('role','tablist');railTabs.setAttribute('aria-label','Chess workspaces');railTabs.setAttribute('aria-orientation','vertical');
const workspace=document.createElement('div');workspace.id='app-workspace';const heading=document.createElement('div');heading.id='view-heading';heading.innerHTML='<div><span class="eyebrow" id="view-group"></span><h1 id="view-title"></h1><p id="view-subtitle"></p></div><span class="offline-label">OFFLINE READY</span>';
const subnav=document.createElement('nav');subnav.id='section-tabs';subnav.setAttribute('role','tablist');subnav.setAttribute('aria-label','Workspace sections');
top.after(shell);shell.append(rail,workspace);workspace.append(heading,subnav,oldMain);oldMain.className='workspace-main';board.id='board-workspace';oldAside.id='workspace-panels';
const context=document.createElement('div');context.className='board-context';context.append($('title'),$('description'));board.prepend(context);
const logDetails=document.createElement('details');logDetails.className='move-list';logDetails.innerHTML='<summary>Move list</summary>';logDetails.append($('log'));board.append(logDetails);
const fenDetails=$('fen').closest('details'),legend=board.querySelector('.notice'),boardSettings=$('all').closest('.row'),puzzleActions=$('hint').closest('.row');
document.querySelector('title').textContent='CheckMato · Gary Bendt';top.querySelector('h1').textContent='CheckMato';const views=[
{id:'play',title:'Play',group:'Practice',subtitle:'A focused board, your bot, and feedback on your moves.',board:true,sections:[['game','Game setup'],['feedback','Move feedback'],['hotseat','Two players'],['phones','Two phones'],['guess','Guess the move']]},
{id:'openings',title:'Openings',group:'Practice',subtitle:'Build a reliable start. Learn the idea behind each move.',board:true,sections:[['practice','Practice'],['systems','Blitz systems'],['repertoire','Your repertoire']]},
{id:'puzzles',title:'Puzzles',group:'Practice',subtitle:'Find the forcing move, understand the result, then continue.',board:true,sections:[['solve','Solve'],['queue','Practice queue'],['library','Puzzle library']]},
{id:'minigames',title:'Minigames',group:'Practice',subtitle:'Build board vision one untimed question at a time.',board:true,sections:[['round','Play a round'],['guide','Game guide']]},
{id:'lessons',title:'Lessons',group:'Learn',subtitle:'Short explanations. One question. A useful idea to practice.',board:false,sections:[['learn','Lesson & quiz'],['topics','Topic library']]},
{id:'progress',title:'Progress',group:'Reflect',subtitle:'Your training points, daily practice, and earned milestones.',board:false,sections:[['rating','Rating & goals'],['badges','Achievements'],['practice','Puzzle progress']]},
{id:'profile',title:'Player profile',group:'Reflect',subtitle:'Your strengths, priorities, games, and opening practice history.',board:false,sections:[['snapshot','My profile'],['games','My games'],['growth','Measured progress'],['resign','Resignation review'],['sessions','Opening sessions']]},
{id:'coach',title:'Coaches',group:'Learn',subtitle:'Chat with Gary Bendt or Claudia Herman about the board and your training. Works offline.',board:true,sections:[['plan','Daily plan'],['gary','Gary Bendt'],['claudia','Claudia Herman'],['advice','Recommendations'],['import','Import drills'],['notebook','Mistake notebook']]},
{id:'positions',title:'Analysis',group:'Tools',subtitle:'Load a position or explore the board with both sides under your control.',board:true,sections:[['position','Load a position'],['manual','Manual board']]},
{id:'settings',title:'Settings',group:'Tools',subtitle:'Board preferences, backups, and how this trainer works.',board:false,sections:[['board','Appearance'],['accessibility','Accessibility'],['backups','Backups'],['about','About & scoring']]}
];
// Beta builds keep games against people live only: the move-code section (Two phones) is hidden, its code kept.
if(window.chessMatoFeature&&!chessMatoFeature('moveCodes'))for(let v of views)v.sections=v.sections.filter(s=>s[0]!=='phones');
let currentView='puzzles',currentSection='solve',remember={};try{let s=JSON.parse(localStorage.getItem('chess-ui-v1')||'{}');remember=s.sections||{};if(views.some(v=>v.id===s.view))currentView=s.view}catch(e){}
const panels={};oldAside.replaceChildren();
function panel(id,section){let node=document.createElement('section');node.className='workspace-panel';node.id='panel-'+id+'-'+section;node.setAttribute('role','tabpanel');node.setAttribute('aria-labelledby','section-'+id+'-'+section);node.hidden=true;oldAside.append(node);panels[id+'/'+section]=node;return node}
for(let v of views)for(let [id] of v.sections)panel(v.id,id);
function target(id,s){return panels[id+'/'+s]}
function move(node,id,s){if(node)target(id,s).append(node)}
function title(text){let h=document.createElement('h2');h.textContent=text;return h}
function text(content){let p=document.createElement('p');p.className='muted';p.textContent=content;return p}
function range(parent,startText,endText){let nodes=Array.from(parent.children),start=nodes.findIndex(n=>n.tagName==='H2'&&n.textContent===startText),end=endText?nodes.findIndex((n,i)=>i>start&&n.tagName==='H2'&&n.textContent===endText):nodes.length;if(start<0)throw Error('Missing UI section: '+startText);return nodes.slice(start,end<0?nodes.length:end)}
function take(nodes,id,section){nodes.forEach(n=>move(n,id,section))}
const grid=arena.querySelector('.academy-grid'),left=grid.children[0],right=grid.children[1];
const botNodes=range(left,'Play the bot');const ratingNodes=range(left,'Training arena','Play the bot');
take(botNodes,'play','game');take(ratingNodes,'progress','rating');
move($('kudos'),'play','feedback');let botDetails=target('play','game').querySelector('details');move(botDetails,'settings','about');
move($('badges'),'progress','badges');target('progress','badges').prepend(title('Earned achievements'),text('Badges unlock as you practice. Your training record stays in this browser.'));
if(!$('badges').children.length)target('progress','badges').append(text('Complete a puzzle, lesson, or minigame to begin earning achievements.'));
target('play','feedback').prepend(title('Move Kudos'),text('Your latest move score and game average appear here during bot games. Suggested moves are marked assisted.'));
target('play','feedback').append(text('Kudos is a local engine estimate of move quality, not an official platform score. The scoring formula is in Settings → About & scoring.'));
target('play','game').prepend(text('Start a game when you are ready. The bot uses your editable training rating; there is no chess clock.'));
const ratingRow=$('rating').closest('.row');const ratingLink=document.createElement('button');ratingLink.textContent='Adjust difficulty';ratingLink.onclick=()=>navigate('progress','rating');target('play','game').append(ratingLink);
const miniNodes=range(right,'Chess vision minigames',"Coach's notebook");take(miniNodes,'minigames','round');
const notebookNodes=range(right,"Coach's notebook");take(notebookNodes,'coach','notebook');
const arenaBackupRow=$('academyexport').parentElement;let arenaBackup=document.createElement('section');arenaBackup.className='backup-section';arenaBackup.append(title('Training arena'),text('Rating, Kudos, lessons, badges, and minigame progress.'));let ar=document.createElement('div');ar.className='row';ar.append($('academyexport'),$('academyrestore'),$('academyfile'));arenaBackup.append(ar);move(arenaBackup,'settings','backups');
const lessonNodes=Array.from(arena.children).find(n=>n.classList.contains('panel'));take(Array.from(lessonNodes.children),'lessons','learn');
target('lessons','topics').append(title('Choose a lesson'));
for(let [i,l] of window.academyTest.lessons.entries()){let b=document.createElement('button');b.className='topic-button';b.textContent=String(i+1).padStart(2,'0')+'  '+l[0];b.onclick=()=>{let current=parseInt($('lesson').querySelector('h3').textContent,10)-1,steps=(i-current+window.academyTest.lessons.length)%window.academyTest.lessons.length;while(steps--)$('nextlesson').click();navigate('lessons','learn')};target('lessons','topics').append(b)}
const openingDetails=openingPanel.querySelector('details'),profileDetails=openingPanel.querySelectorAll('details')[1];
const openingChildren=Array.from(openingPanel.children).filter(n=>n!==openingDetails&&n!==profileDetails);take(openingChildren,'openings','practice');
move(openingDetails,'openings','repertoire');openingDetails.open=true;openingDetails.querySelector('summary').textContent='Repertoire notes';
target('openings','repertoire').prepend(title('Your starter repertoire'));
for(let [side,label] of openingCoachTest.sets){let h=document.createElement('h3');h.textContent=label;target('openings','repertoire').append(h);for(let r of openingCoachTest.repertoire.filter(r=>r.set===side)){let b=document.createElement('button');b.className='repertoire-button';let strong=document.createElement('strong');strong.textContent=r.name;let p=text(r.plan);b.append(strong,p);b.onclick=()=>{openingCoachTest.startOpening(r.id);navigate('openings','practice')};target('openings','repertoire').append(b)}}
move($('personal-profile'),'profile','snapshot');target('profile','snapshot').prepend(title('How you play'));let baselineNote=text(window.CHESSMATO_PERSONAL&&CHESSMATO_PERSONAL.baseline?'Based on your supplied '+CHESSMATO_PERSONAL.baseline.games+'-game analysis. This profile does not invent the positions of your missed moves.':'Built from your practice and imported games. CheckMato never invents positions from move names.');target('profile','snapshot').append(baselineNote);
move($('opening-metrics'),'profile','sessions');move($('opening-history'),'profile','sessions');target('profile','sessions').prepend(title('Opening practice history'));
const coachBackup=document.createElement('section');coachBackup.className='backup-section';coachBackup.append(title('Personal coach'),text('Opening sessions and recommendation history.'));let cr=document.createElement('div');cr.className='row';cr.append($('coach-export'),$('coach-restore'),$('coach-file'));coachBackup.append(cr);move(coachBackup,'settings','backups');
move(puzzleActions,'puzzles','solve');target('puzzles','solve').prepend(title('Current puzzle'),text('Use the board to answer. A win or miss gets a short explanation; Okay takes you to the next puzzle.'));
const goQueue=document.createElement('button');goQueue.textContent='Choose a different puzzle';goQueue.onclick=()=>navigate('puzzles','queue');target('puzzles','solve').append(goQueue);
let queuePanel=$('queue').closest('.panel');move(queuePanel,'puzzles','queue');
let advicePanel=$('advice').closest('.panel');move(advicePanel,'coach','advice');
let importPanel=$('import').closest('details');move(importPanel,'coach','import');importPanel.open=true;
const progressPanel=$('stats').closest('.panel');move($('stats'),'progress','practice');target('progress','practice').prepend(title('Puzzle practice totals'),text('Your solved exercises and clean attempts. Opening recall has its own section under Player profile.'));
const puzzleBackup=document.createElement('section');puzzleBackup.className='backup-section';puzzleBackup.append(title('Puzzle collection'),text('Imported drills, review schedules, and puzzle progress.'));let pr=document.createElement('div');pr.className='row';pr.append($('export'),$('restore'),$('file'));puzzleBackup.append(pr);move(puzzleBackup,'settings','backups');
target('settings','backups').prepend(title('Keep your work'),text('There are three separate backups. Download all three to move your complete trainer history to another browser or device. File pages and the local bot address keep separate browser storage.'));
move(boardSettings,'settings','board');move(legend,'settings','board');target('settings','board').prepend(title('Board preferences'));
target('settings','board').append(text('Coordinates stay large and centered. Hover shows movement previews; clicking a piece selects it. Yellow guides appear only when an opening guide, puzzle help, or bot suggestion is active.'));
move(fenDetails,'positions','position');fenDetails.open=true;target('positions','position').prepend(title('Load a chess position'));
target('positions','manual').append(title('Explore without a bot'),text('Start a standard position and play either side. No move scores and no clock.'));
const manualButton=document.createElement('button');manualButton.className='primary';manualButton.textContent='Start analysis board';manualButton.onclick=()=>{$('mode').value='free';$('mode').dispatchEvent(new Event('change'));navigate('positions','manual')};target('positions','manual').append(manualButton);
target('minigames','guide').append(title('Ten ways to train your vision'));
for(let [h,t] of [['Square finder','Find the requested board coordinate.'],['Piece finder','Identify a piece of the named color and type.'],['Spot the attacker','Select an enemy piece attacking the requested square.'],['Undefended pieces','Find a non-king piece with no geometric defender. Undefended does not automatically mean safe to capture.'],['Legal move counter','Count distinct legal destination squares, including restrictions from check and pins.'],['Find a checking move','Click any piece of the side to move that can give check. Builds the habit of seeing forcing moves.'],['Free capture','Find an enemy piece you attack that nobody defends. Free is not always best; check what the capture allows.'],['Spot the pin','Find a piece pinned to its own king by a bishop, rook or queen.'],['Knight route','Count the fewest knight moves between two squares on an empty board.'],['Material count','Add up material and decide who is ahead and by how much.'],['Mixed round','Five questions drawn from all of the above.']]){let hh=document.createElement('h3');hh.textContent=h;target('minigames','guide').append(hh,text(t))}
target('minigames','guide').append(text('Each round has five questions. Confirm the explanation to continue. No timers or speed bonuses.'));
target('settings','about').prepend(title('About CheckMato'),text('Everything runs locally. Bot games use the included engine through your private localhost launcher. No account, public hosting, or paid API is required.'));
target('settings','about').append(text('Rules: chess.js 0.10.3. Engine: Stockfish.js 10.0.2. Training ratings are approximate, and attack overlays are not tactical safety guarantees. Gary Bendt and Claudia Herman are fictional coaching personas; their legendary 3200 character ratings are separate from measured player or engine strength. Claudia\'s voice draws on traits from chess creator Sara Herman\'s public profile; she is not Sara and does not quote her.'));
for(let n of [openingPanel,profileDetails,progressPanel,arena,sourceAside])n.remove();
document.querySelector('footer').textContent='CheckMato · local only · no clocks · progress stays in this browser';
const mentor=document.createElement('section');mentor.className='mentor-card';mentor.innerHTML='<span class="mentor-monogram">GB</span><div><strong>Gary Bendt</strong><small>Chess coach</small></div><p>Carlsen-inspired pressure.<br>Clear advice. Keep fighting.</p><span class="mentor-rating">Legendary 3200 · coach persona</span><small>Coaching range: 400–3200</small>';rail.append(mentor,railTabs);
const viewButtons={};let previousGroup='';
for(let v of [...views].sort((a,b)=>['Practice','Learn','Reflect','Tools'].indexOf(a.group)-['Practice','Learn','Reflect','Tools'].indexOf(b.group))){if(v.group!==previousGroup){let g=document.createElement('div');g.className='nav-group';g.setAttribute('role','presentation');g.textContent=v.group;railTabs.append(g);previousGroup=v.group}let b=document.createElement('button');b.type='button';b.id='tab-'+v.id;b.setAttribute('role','tab');b.setAttribute('aria-controls','app-workspace');b.textContent=v.title;b.onclick=()=>navigate(v.id);railTabs.append(b);viewButtons[v.id]=b}
function tabKeys(container){container.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;let buttons=Array.from(container.querySelectorAll('[role=tab]')),idx=buttons.indexOf(document.activeElement);if(idx<0)return;e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(idx+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+buttons.length)%buttons.length;buttons[n].focus();buttons[n].click()})}tabKeys(rail);tabKeys(subnav);
function navigate(view,section){let v=views.find(v=>v.id===view);if(!v)return;currentView=view;currentSection=section||remember[view]||v.sections[0][0];if(!v.sections.some(s=>s[0]===currentSection))currentSection=v.sections[0][0];remember[view]=currentSection;try{localStorage.setItem('chess-ui-v1',JSON.stringify({view:currentView,sections:remember}))}catch(e){}
for(let [id,b] of Object.entries(viewButtons)){b.setAttribute('aria-selected',String(id===view));b.tabIndex=id===view?0:-1;b.classList.toggle('current-tab',id===view)}
$('view-group').textContent=v.group;$('view-title').textContent=v.title;$('view-subtitle').textContent=v.subtitle;board.hidden=!v.board;oldMain.classList.toggle('without-board',!v.board);subnav.replaceChildren();
for(let [id,label] of v.sections){let b=document.createElement('button');b.type='button';b.id='section-'+view+'-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls','panel-'+view+'-'+id);b.setAttribute('aria-selected',String(id===currentSection));b.tabIndex=id===currentSection?0:-1;b.textContent=label;b.onclick=()=>navigate(view,id);subnav.append(b)}
for(let [key,node] of Object.entries(panels))node.hidden=key!==view+'/'+currentSection;
$('app-workspace').dataset.view=view;
}
function action(id,view,section){let old=$(id).onclick;$(id).onclick=(...args)=>{let value=old&&old(...args);navigate(view,section);return value}}
for(let id of ['opening-start','opening-recommend'])action(id,'openings','practice');
action('startbot','play','game');action('startmini','minigames','round');action('loadfen','positions','position');action('practicelesson','puzzles','solve');
const priorLoad=load;load=function(d){priorLoad(d);navigate('puzzles','solve')};
const oldMode=$('mode').onchange;$('mode').onchange=()=>{oldMode();if($('mode').value==='opening')navigate('openings','practice');else if($('mode').value==='drill')navigate('puzzles','solve');else navigate('positions','manual')};
const oldSet=$('setrating').onclick;$('setrating').onclick=()=>{oldSet();};
navigate(currentView);
window.chessUITest={navigate,views,getState:()=>({view:currentView,section:currentSection})};
})();




