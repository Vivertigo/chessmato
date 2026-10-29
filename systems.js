'use strict';
// Openings → Blitz systems: setups that work against almost anything, with their pawn breaks, plans and patterns.
// Each card links to its lines in Openings → Practice. Training stays untimed; the point is fewer decisions early.
(function(){
const SYSTEMS=[
 {set:'wk',title:"King's Indian Attack (White)",setup:'Nf3, g3, Bg2, O-O, d3, Nbd2, e4, then Re1. Nearly the same first seven moves every game.',
  breaks:['e4-e5 when Black has played …e6: gains kingside space and drives the knight from f6.','f2-f4 when Black answers with …e5: prepare it with h3, Nh2 (or Ne1) and Kh1.','b2-b4 against …c5 setups: c3 and a3 first, then b4 removes the c-pawn and opens the long diagonal.'],
  plans:['After e5: knight Nf1–h2–g4 or Nf1–e3, pawns h4–h5, bishop Bf4, queen to the kingside.','Black attacks on the queenside with …b5–b4 and …a5–a4. Answer with your own attack rather than slow defending.','Against …Bg4 or …Bf5, open the centre with e4 and win the bishop pair with h3 or Nh4.'],
  patterns:['The e5 pawn takes f6 away from Black\'s knight, so h7 is often defended only by the king.','Ng5 with Qh5 or Qg4 against h7 once Black\'s knight has left f6.','Bxh6 when the g7 pawn is pinned or overloaded.','When the centre opens, the g2 bishop suddenly hits b7 and a8.'],
  habit:'Play the setup moves quickly and save your thinking for the moment Black commits to a pawn structure.'},
 {set:'wl',title:'London System (White)',setup:'d4, Bf4, e3, Nf3, c3, Nbd2, Bd3, O-O, often h3. The bishop goes out before e3 so it is not shut in.',
  breaks:['e3-e4 when Black\'s pieces are passive: opens the centre for your bishops.','c3-c4 against …g6 or …Bf5 setups: fights for the light squares.','Ne5 followed by f4: a Stonewall-style kingside attack.'],
  plans:['Against …c5 and …Qb6, protect b2 (Qb3, Qc1 or Nbd2 first) before anything else.','Against …Bd6, answer Bg3 so a trade straightens your pawns instead of doubling them badly.','Against …Nh5, have h3 and Bh2 ready, or step back to g3 or g5.'],
  patterns:['The Greek gift Bxh7+ followed by Ng5 and Qh5, when the knight is on e5 or can reach g5.','Qf3 with h4–h5 against a castled king on the kingside.','A knight on e5 supported by f4 is hard to remove and supports a kingside attack.'],
  habit:'The first eight moves barely change, so the clock goes on the middlegame. Check b2 and f4 every time Black\'s queen or knight comes out.'},
 {set:'bk',title:"King's Indian and Pirc (Black)",setup:'…Nf6, …g6, …Bg7, …d6, castle, then …e5 (against 1.e4 start with …d6 for the Pirc). Same pieces on the same squares against d4, c4, Nf3 and e4.',
  breaks:['…e5: the main break. It hits d4 and wakes up the g7 bishop if the centre opens.','…f5 after White closes the centre with d5: the start of the kingside attack.','…c5 or …b5 against the Austrian (f4) and 150 Attack (Be3, Qd2) setups.'],
  plans:['Closed centre: knight back to e8 or d7, then …f5, …f4, …g5, …g4 and a rook lift. White attacks on the queenside with c5, so be fast.','Open centre (…exd4): …Re8 against e4 and a knight to c5 or e5.','If White castles long, push your queenside pawns: …c6, …b5, …a5.'],
  patterns:['…Nh5–f4: a knight on f4 attacks g2, h3 and d3, and White often has to give up a bishop to remove it.','…g4 or …Bxh3 sacrifices to tear open White\'s kingside.','White\'s Be3, Qd2 and Bh6 try to trade your g7 bishop; keep the king flexible and meet h4–h5 with …h5 or a counterattack.','In the Pirc, e4-e5 can hit the knight on f6; know your retreat (…Nd7 or …Ne8) in advance.'],
  habit:'The attack plays itself, and defending against it under time pressure is hard. Spend your time on the moment the centre closes.'},
 {set:'bh',title:'Hippo (Black)',setup:'…g6, …Bg7, …d6, …e6, …Ne7, …Nd7, …b6, …Bb7, then …a6 and …h6. Almost any order works against almost any first move.',
  breaks:['…c5 against a pawn on d4.','…e5 against a pawn on e4 or a closed d-file.','…d5, …f5 or …b5 when White has committed a wing.'],
  plans:['Finish the wall, then strike when White has overextended.','Against g4 and h4, …h5 stops the pawn storm.','If White castles long, …b5–b4 opens lines toward the king.'],
  patterns:['After a break, both bishops x-ray the centre from b7 and g7.','Knights jump to c5 or f5 once a pawn break has opened those squares.','If White plays Qd2 and Bh6 to trade your dark-squared bishop, …Bf6 or a later castle reduces the damage.'],
  habit:'Very little to memorise, so it is ideal for 2–3 minute games. The danger is running out of useful waiting moves; pick your break before that happens.'}];
const panel=$('panel-openings-systems');
function el(tag,text,parent,cls){let e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e}
function drill(set,mixed){chessUITest.navigate('openings','practice');let s=$('opening-side');s.value=set;s.dispatchEvent(new Event('change'));if(mixed){$('opening-line').value='mixed';$('opening-line').dispatchEvent(new Event('change'))}}
if(panel){el('h2','Blitz systems',panel);el('p','Setups you can play against almost anything. The first moves come quickly, the same plans and pawn breaks repeat from game to game, and your clock goes on the middlegame. Drills stay untimed: learn the ideas first, speed follows.',panel,'muted');
  for(let s of SYSTEMS){let card=el('details',null,panel,'system-card');card.dataset.set=s.set;el('summary',s.title,card);el('p','Setup: '+s.setup,card);
    for(let [label,items] of [['Pawn breaks',s.breaks],['Plans',s.plans],['Patterns to know',s.patterns]]){el('h3',label,card);let ul=el('ul',null,card);for(let x of items)el('li',x,ul)}
    el('p','In blitz: '+s.habit,card,'notice');let n=window.openingCoachTest?openingCoachTest.repertoire.filter(r=>r.set===s.set).length:0;
    let row=el('div',null,card,'row'),a=el('button','Drill the '+n+' lines',row,'primary'),b=el('button','Mixed drill: recognise the line',row);a.onclick=()=>drill(s.set,false);b.onclick=()=>drill(s.set,true);
    let games=window.chessMatoGuess?chessMatoGuess.classics.filter(g=>g.blitz===s.set):[];if(games.length){el('h3','Master games: guess the move',card);let gr=el('div',null,card,'row');for(let g of games){let gb=el('button',g.white+' – '+g.black+', '+g.event.replace(/ \(.*\)$/,''),gr);gb.onclick=()=>chessMatoGuess.start(g.id,s.set[0])}}
    let hn=window.chessMatoGuess?chessMatoGuess.models.filter(g=>g.set===s.set):[];if(hn.length){el('h3','Hikaru Nakamura\'s wins with this system',card);el('p','Play through them in Guess the move from his side. The line each one reaches in your repertoire is named.',card,'muted');let ul=el('ul',null,card,'model-list');
      for(let g of hn){let li=el('li',null,ul),b=el('button',(g.side==='w'?'vs '+g.black:'vs '+g.white)+' · '+g.event+(/^\d{4}/.test(g.date)?' '+g.date.slice(0,4):''),li);b.onclick=()=>chessMatoGuess.start(g.id,g.side);let r=g.line&&window.openingCoachTest&&openingCoachTest.repertoire.find(x=>x.id===g.line);if(r)el('span',' · '+r.name.replace(/^[^·]*· /,''),li,'muted')}}}
  // Openings → Practice: name a model game for the line being shown.
  let plan=$('opening-plan');if(plan){let m=el('p',null,null,'muted');m.id='opening-model';plan.after(m);let show=()=>{let id=$('opening-line').value,g=window.chessMatoGuess&&chessMatoGuess.models.find(x=>x.line===id);m.replaceChildren();if(!g)return;m.append('Model game: '+g.white+' – '+g.black+', '+g.event+(/^\d{4}/.test(g.date)?' '+g.date.slice(0,4):'')+'. ');let b=el('button','Guess his moves',m);b.onclick=()=>chessMatoGuess.start(g.id,g.side)};
    new MutationObserver(show).observe(plan,{childList:true,characterData:true,subtree:true});show()}
  el('p','Names follow the Lichess opening list (CC0). Explanations are CheckMato\'s own, written for practical play rather than as engine analysis.',panel,'muted')}
const style=document.createElement('style');style.textContent='.system-card{border:1px solid var(--stroke,#3a4a40);border-radius:8px;padding:8px 12px;margin:8px 0}.system-card summary{font-weight:650;cursor:pointer}.system-card h3{font-size:14px;margin:10px 0 4px}.system-card ul{margin:0;padding-left:20px;line-height:1.55}.model-list{list-style:none;padding-left:0!important}.model-list li{margin:4px 0}.model-list button{text-align:left}#opening-model button{margin-left:4px}';document.head.append(style);
window.chessMatoSystems={SYSTEMS,drill};
})();
