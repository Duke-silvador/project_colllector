import {mountUniversal360} from './universal-360.js';
import {NearbyPeer,parseSignal} from './nearby.js';
import {mountShogi,unmountShogi} from './shogi-app.js';
import {mountChess360,mountExtra360} from './chess-3d.js';
import {renderFigure} from './piece-figures.js';
import {displayedToOriginal,axisLabels,resolveRotation,squareName,normalizedQuarter,ROTATION_MODES,VIEW_MODES} from './board-view.js';
import {BLEChat} from './bluetooth-chat.js';
import {CHESS_THEMES,THEME_IDS,themeLabel,isTheme} from './theme-presets.js';
import {analyseComment,buildChangeRequest,diagnosticLocal} from './atelier.js';
import {COURSES,AI_STYLES,courseResult} from './masterclass.js';
import {PATH_MODULES,pathModule,cleanPathProgress,validateLevel} from './academy-path.js';
import {BACKUP_KEYS,makeBackup,readBackup,mergeBackup} from './backup.js';
import {newChess,legalMoves,playMove,botChess,undo,hintChess,statusChess,PIECE_NAMES,COLORS4,inCheck,moveText} from './engine.js';
import {M800,MINI_RULES,newMini,legalMini,playMini,botMini,undoMini,finishChain,statusMini} from './mini.js';
import {coachAdvice,LESSONS} from './coach.js';
import {EXTRA_GAMES,newExtra,stepExtra,hideUnmatched} from './extras.js';
const root=document.getElementById('content');
const labels={red:'Rouge',blue:'Bleu',yellow:'Jaune',green:'Vert',white:'Blanc',black:'Noir'};
const glyphs={P:'♟',N:'♞',B:'♝',R:'♜',Q:'♛',K:'♚'};
const whiteGlyphs={P:'♙',N:'♘',B:'♗',R:'♖',Q:'♕',K:'♔'};
const labelTurns={white:'⚪ Au tour des Blancs',black:'⚫ Au tour des Noirs',red:'🔴 Au tour des Rouges',blue:'🔵 Au tour des Bleus',yellow:'🟡 Au tour des Jaunes',green:'🟢 Au tour des Verts'};
const store={get(k,def){try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
let tab='home',game=store.get('jeu-v1',null),selected=null,trainingSelected=null,practice=null,practiceResult='',quizAnswered=null;
let immersiveGame=false, nativeImmersive=false, gameOptionsOpen=false;
let practiceIndex=0,quizIndex=0,ruleTab='intro',trainTab='path',pendingBot=null,botBusy=false,zoom=false,banner='';
let fourMode=store.get('fourmode','chesscom-ffa');
let level=store.get('level',2),aiMode=store.get('aimode','offline'),serverUrl=store.get('serverurl','');
let controllers=store.get('players',{red:'human',blue:'bot',yellow:'bot',green:'bot',white:'human',black:'bot',A:'human',B:'bot'});
let stats=store.get('stats',{lessons:0,quizzes:0,xp:0});
let miniInfo='';let miniNimPile=null;let installEvent=null;let bonusAdvice='';
let theme=store.get('v25-theme','3d'), highContrast=store.get('v25-contrast',false),saveSlots=store.get('v2-saves',[]);
if(!isTheme(theme))theme='3d';
let boardRotation=normalizedQuarter(store.get('v252-rotation',0));
let rotationMode=store.get('v252-rotation-mode','manual');if(!ROTATION_MODES.includes(rotationMode))rotationMode='manual';
let viewMode=store.get('v252-view','depth');if(!VIEW_MODES.includes(viewMode))viewMode='depth';
let showCoordinates=store.get('v252-coordinates',true)!==false;
let real3D=store.get('v38-real3d',true)!==false;
let threeBoard=null;
let piecesLook=store.get('v251-pieces','sculpted');
if(!['sculpted','flat','round'].includes(piecesLook))piecesLook='sculpted';
let extraGame=store.get('v2-extra',newExtra('tictactoe'));
let roomSession=store.get('v2-room',null),roomData=null,roomLive=false,offlineGame=game,roomUpdating=false;
let spokenText='',lessonIndex=0;
let aiStyle=store.get('v23-ai-style','balanced');
let courseIndex=0,courseChoice=null,courseProgress=store.get('v23-courses',[]);
let academyProgress=cleanPathProgress(store.get('v27-academy-progress',{}));
let pathActive=null,pathLevel=0,pathAnswer=null,pathWrong=false,pathValidated=false;
let nearby=new NearbyPeer({state:onNearbyStatus,message:onNearbyMessage});
let nearbyLive=false,nearbyRole='',nearbyStatus='Prêt',nearbySignal='',nearbyMode='chess2',nearbySavedGame=null;
let feedbackHistory=store.get('v24-feedback',[]),atelierCurrent=null,diagResults=[];
let bigText=store.get('v24-bigtext',false),juniorDone=store.get('v24-junior-done',[]);
let juniorIndex=0;
const bleChat=new BLEChat({onStatus:(state)=>{bleStatus=state;render();},onMessage:(text)=>{appendChat('Bluetooth',text,'bluetooth');render();}});
let bleStatus='non connecté',bleActive=false;
let localChat=[];
function appendChat(name,text,mode){if(typeof text!=='string'||!text.trim())return;localChat.push({name,text:text.trim().slice(0,160),mode,at:Date.now()});localChat=localChat.slice(-40);}



const modes=[['chesscom-ffa','Chess.com — chacun pour soi (points)'],['chesscom-teams','Chess.com — 2 contre 2'],['house-a','House of Chess — sans points'],['house-b','House of Chess — avec points'],['house-teams','House of Chess — équipes']];
const E=(s)=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const champ=(c,active=false)=>`<span class="chip ${active?'active':''}"><i class="dot ${c}"></i>${labels[c]||c}</span>`;
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000);}
function save(){if(game&&!roomLive&&!nearbyLive){const g=JSON.parse(JSON.stringify(game));if(g.history?.length>16)g.history=g.history.slice(-16);store.set('jeu-v1',g);}store.set('fourmode',fourMode);store.set('level',level);store.set('aimode',aiMode);store.set('serverurl',serverUrl);store.set('players',controllers);store.set('stats',stats);store.set('v2-theme',theme);store.set('v25-theme',theme);store.set('v25-contrast',highContrast);store.set('v251-pieces',piecesLook);store.set('v252-rotation',boardRotation);store.set('v252-rotation-mode',rotationMode);store.set('v252-view',viewMode);store.set('v252-coordinates',showCoordinates);store.set('v26-real3d',real3D);store.set('v38-real3d',real3D);store.set('v2-extra',extraGame);store.set('v2-saves',saveSlots);store.set('v23-ai-style',aiStyle);store.set('v23-courses',courseProgress);store.set('v27-academy-progress',academyProgress);store.set('v24-feedback',feedbackHistory.slice(-60));store.set('v24-bigtext',bigText);store.set('v24-junior-done',juniorDone);}
function kind(){return game?.kind==='chess'?(game.type==='chess4'?'chess4':'chess2'):game?.id;}
function isHuman(){if(nearbyLive){if(!game||game.over||game.kind!=='chess')return false;return game.colors[game.turn]===(nearbyRole==='host'?(game.type==='chess4'?'red':'white'):(game.type==='chess4'?'blue':'black'));}if(roomLive)return !!(game&&!game.over&&roomData?.started&&game.colors[game.turn]===roomData.seat);if(!game||game.over)return false;const c=game.kind==='chess'?game.colors[game.turn]:game.turn===0?'A':'B';return controllers[c]==='human';}
function cancelBot(){if(pendingBot){clearTimeout(pendingBot);pendingBot=null;}botBusy=false;}
function goto(t){if(immersiveGame && !['play','extras'].includes(t))leaveImmersive();if(!['play','extras'].includes(t))gameOptionsOpen=false;tab=t;selected=null;cancelBot();render();if(t==='play')queueBot();}
function start(id){gameOptionsOpen=false;if(nearbyLive){toast('Quitte d’abord la partie de proximité.');goto('friends');return;}cancelBot();if(roomLive){roomLive=false;roomData=null;}game=id==='chess4'?newChess('chess4',fourMode):id==='chess2'?newChess('chess2'):newMini(id);selected=null;miniInfo='';save();tab='play';render();queueBot();}
function render(){document.body?.classList?.toggle('game-immersive',immersiveGame&&['play','extras'].includes(tab));if(document.body?.dataset){document.body.dataset.gameView=tab;document.body.dataset.viewMode=viewMode;}if(threeBoard){threeBoard.dispose();threeBoard=null;}unmountShogi();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='home')root.innerHTML=renderHome();
 if(tab==='play')root.innerHTML=renderPlay();
 if(tab==='train'){if(!practice)loadPractice();root.innerHTML=renderTraining();}
 if(tab==='rules')root.innerHTML=renderRules();
 if(tab==='settings')root.innerHTML=renderSettings();
 if(tab==='friends')root.innerHTML=renderFriends();
 if(tab==='extras')root.innerHTML=renderExtras();
 if(tab==='atelier')root.innerHTML=renderAtelier();
 if(tab==='junior')root.innerHTML=renderJunior();
 if(tab==='shogi')mountShogi(root);
 if(tab==='play'||tab==='shogi'||tab==='train')mountUniversal360(root);
 const badge=document.getElementById('network-badge');badge.textContent=!navigator.onLine?'● Pas d’Internet':aiMode==='offline'?'● IA locale':'● IA réseau';
 const switcher=document.getElementById('network-switch');if(switcher){switcher.textContent=aiMode==='offline'?'📴 Hors ligne':'🌐 En ligne';switcher.setAttribute?.('aria-pressed',String(aiMode==='online'));}
 // 3D WebGPU/WebGL locale pour échecs, jeux M800, Nim et jeux bonus ; vue 2D en secours.
 const holder=document.getElementById('board-3d-viewport');
 if(holder?.querySelector&&real3D){
  const g=tab==='train'?practice?.game:game;
  if(g?.kind==='chess'){
   const context=holder.dataset?.context||'play', sel=context==='train'?trainingSelected:selected;
   try{const opts=legalMoves(g);const targets=sel?opts.filter(m=>m.from?.r===sel.r&&m.from?.c===sel.c).map(m=>m.to):[];
    threeBoard=mountChess360({holder,game:g,theme,selection:sel,targets,showCoordinates,rotation:gameRotation(g),onSquare:(r,c)=>boardSelectionClick(r,c,context)});
   }catch(err){console.warn('Retour au plateau 2D :',err)}
  }else if(g?.kind==='mini'){
   const context=holder.dataset?.context||'play';const sel=context==='train'?trainingSelected:selected;
   const options=legalMini(g),targets=sel?options.filter(m=>m.from?.r===sel.r&&m.from?.c===sel.c).map(m=>m.to):g.id==='reversi'?options.map(m=>({r:m.r,c:m.c})):[];
   try{const cv=holder.querySelector('canvas.webgl-board'),ov=holder.querySelector('canvas.webgl-labels');
    threeBoard=mountExtra360({canvas:cv,overlay:ov,kind:g.id==='nim'?'nim':'mini',id:g.id,rows:g.id==='nim'?4:g.board.length,cols:g.id==='nim'?7:g.board[0].length,
     board:g.id==='nim'?g.piles.map(k=>Array.from({length:7},(_,j)=>j<k?1:null)):g.board,selection:sel,targets,
     onSquare:(r,c)=>g.id==='nim'?(g.piles[r]>c&&moveMini({pile:r,count:g.piles[r]-c})):boardSelectionClick(r,c,context)});
   }catch(err){console.warn('Mini-jeu 3D non disponible :',err)}
  }
  if(threeBoard)holder.classList.add('webgl-ready');
 }
 if(tab==='extras'&&real3D){
  const holder=document.getElementById('bonus-3d');if(holder){
   const bg=extraGame,board=bg.id==='tictactoe'?Array.from({length:3},(_,r)=>bg.board.slice(r*3,r*3+3)):
    Array.from({length:4},(_,r)=>bg.cards.slice(r*4,r*4+4).map((v,c)=>{const i=r*4+c;return {symbol:v,visible:bg.found.includes(i)||bg.open.includes(i)};}));
   try{threeBoard=mountExtra360({canvas:holder.querySelector('.webgl-board'),overlay:holder.querySelector('.webgl-labels'),kind:bg.id,rows:board.length,cols:board[0].length,board,onSquare:(r,c)=>extraClick(r*board[0].length+c)});
   }catch(e){console.warn('Bonus 3D indisponible',e)}
   if(threeBoard)holder.classList.add('webgl-ready');
  }
 }
 document.body?.classList?.toggle('large-letters',!!bigText);
 document.body?.classList?.toggle('theme-3d',theme==='3d');
 document.body?.classList?.toggle('theme-wood',theme==='wood');
 document.body?.classList?.toggle('contrast-high',!!highContrast);
 if(document.body?.dataset){document.body.dataset.theme=theme;document.body.dataset.pieces=piecesLook;}
}
function leaveImmersive(){
 immersiveGame=false;nativeImmersive=false;
 document.body.classList.remove('game-immersive');
 if(document.fullscreenElement&&typeof document.exitFullscreen==='function')document.exitFullscreen().catch(()=>{});
}
function toggleImmersive(){
 if(immersiveGame){leaveImmersive();render();return;}
 immersiveGame=true;render();
 // iPhone Safari ne prend pas en charge le plein écran d'un élément HTML : interface plein écran simulée.
 if(typeof document.documentElement.requestFullscreen==='function'){
  try{const req=document.documentElement.requestFullscreen({navigationUI:'hide'});
   if(req&&typeof req.then==='function')req.then(()=>{nativeImmersive=true;}).catch(()=>{});
  }catch{}
 }
 toast('Mode jeu immersif · bouton « Quitter plein écran » pour revenir.');
}
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(gameOptionsOpen){gameOptionsOpen=false;render();}else if(immersiveGame){leaveImmersive();render();}}});
document.addEventListener('fullscreenchange',()=>{
 if(document.fullscreenElement){nativeImmersive=true;return;}
 if(nativeImmersive){nativeImmersive=false;immersiveGame=false;render();}
});
function renderThemeGallery(){return `<div class="theme-gallery" role="group" aria-label="Choisir un design d’échiquier">${CHESS_THEMES.map(t=>`<button type="button" class="theme-option ${theme===t.id?'is-active':''}" data-theme-choice="${t.id}" aria-pressed="${theme===t.id}"><span class="theme-preview" style="--sample-light:${t.light};--sample-dark:${t.dark};--sample-border:${t.frame}"><i></i><i></i><i></i><i></i><span class="theme-king">♞</span></span><b>${E(t.name)}</b><small>${E(t.subtitle)}</small></button>`).join('')}</div>`;}
function renderGameOptions(isChess=false, isBonus=false){
 if(!gameOptionsOpen)return '';
 return `<section class="game-options-panel" aria-label="Options du jeu ouvertes">
  <div class="game-options-heading"><div><strong>🎨 Apparence du jeu</strong><small>Change le décor sans interrompre la partie</small></div><button type="button" class="btn sm outline" data-action="toggle-game-options">✕ Fermer</button></div>
  <h3>Mes 8 plateaux et décors</h3>${renderThemeGallery()}
  ${isChess?`<h3>Pièces</h3>${renderPieceLooks()}`:''}
  <h3>Affichage pendant la partie</h3>
  <div class="game-option-actions">
   <button class="btn sm ${real3D?'teal':'outline'}" data-action="toggle-real3d" aria-pressed="${real3D}">◈ ${real3D?'3D 360° activée':'Activer la 3D 360°'}</button>
   <button class="btn sm outline" data-action="cycle-perspective">🎥 Vue : ${viewMode==='flat'?'à plat':viewMode==='depth'?'inclinée':'cinéma'}</button>
   ${!isBonus?`<button class="btn sm outline" data-action="toggle-coordinates" aria-pressed="${showCoordinates}">🔤 Lettres et chiffres : ${showCoordinates?'oui':'non'}</button><button class="btn sm outline" data-action="rotate-board">↻ Tourner le plateau</button><button class="btn sm outline" data-action="flip-board">⇵ Retourner 180°</button>`:''}
   <button class="btn sm outline" data-action="toggle-contrast" aria-pressed="${highContrast}">◐ Contraste : ${highContrast?'fort':'normal'}</button>
  </div><small class="game-options-footnote">Les choix sont mémorisés sur cet appareil. Tes parties ne sont pas effacées.</small>
 </section>`;
}
function renderPieceLooks(){return `<div class="piece-looks" role="group" aria-label="Choisir le style des pièces">${[['sculpted','♞','Figurines relief'],['flat','♙','Classique lisible'],['round','♛','Jetons modernes']].map(([id,sign,text])=>`<button type="button" class="piece-look ${piecesLook===id?'is-active':''}" data-pieces-choice="${id}" aria-pressed="${piecesLook===id}"><span>${sign}</span>${text}</button>`).join('')}</div>`;}
function previewFourBoard(){
 const g=newChess('chess4',fourMode),cells=[];
 for(let r=0;r<14;r++)for(let c=0;c<14;c++){
  const outside=(r<3||r>10)&&(c<3||c>10);
  const p=g.board[r][c],figure=p?`<span class="demo-piece ${p.color}">${whiteGlyphs[p.t]}</span>`:'';
  cells.push(`<span class="demo-cell${outside?' demo-void':(r+c)%2?' demo-dark':' demo-light'}">${figure}</span>`);
 }
 return `<button type="button" class="hero-play-board" data-action="start-four" aria-label="Ouvrir le véritable échiquier interactif à quatre joueurs"><span class="hero-demo-title">♟ VRAI JEU • 4 COULEURS</span><span class="demo-board" aria-hidden="true">${cells.join('')}</span><span class="hero-demo-cta">▶ Toucher pour commencer une partie</span></button>`;
}
function renderHome(){return `<section class="hero"><div class="hero-copy"><div class="tag">Apprendre • Jouer • Progresser</div><h1>Joue aux <span style="color:#ffd66b">échecs à 4</span> pour de vrai, avec ton IA.</h1><p>Un véritable échiquier tactile : déplace les pièces, joue contre 3 IA ou avec tes proches. Les autres jeux, le Shogi et tes exercices restent disponibles.</p><div class="btn-row"><button data-action="start-four" class="btn teal">♟ Jouer à 4</button><button data-tab="train" class="btn outline">🎓 Mes exercices</button></div><div class="feature-line"><span>✓ IA sans internet</span><span>✓ Jeux à 2 et 4 joueurs</span><span>✓ Progrès sauvegardés</span></div></div><div class="hero-program">${previewFourBoard()}</div></section>
<div class="section-head"><h2>Choisis ton jeu</h2><span class="pill green">10 jeux numériques</span></div>
<div class="grid-cards"><button class="gamecard" data-tab="shogi"><span class="emoji">🏯</span><strong>Shogi japonais</strong><small>Jeu complet, parcours guidé, mat, promotion, pièces capturées et conseils.</small></button><button class="gamecard" data-open-game="chess4"><span class="emoji">♟️</span><strong>Échecs à 4 joueurs</strong><small>Modes Chess.com et House of Chess ; seul ou en équipes.</small></button>${M800.map(g=>`<button class="gamecard" data-open-game="${g.id}"><span class="emoji">${g.emoji}</span><strong>${g.name}</strong><small>${g.sub}</small></button>`).join('')}</div>
<div class="section-head"><h2>Les nouveautés V2.9</h2></div><div class="grid-cards"><button class="gamecard" data-tab="junior"><span class="emoji">📗</span><strong>Atelier Junior jouable</strong><small>Défis inspirés des thèmes des magazines FFE, positions originales.</small></button><button class="gamecard" data-tab="atelier"><span class="emoji">🛠️</span><strong>Assistante d’amélioration</strong><small>Exprime tes idées et diagnostique les problèmes sans effacer les parties.</small></button></div><div class="section-head"><h2>Encore deux jeux</h2><button data-tab="extras" class="btn outline sm">Tous les nouveaux jeux →</button></div><div class="grid-cards">${EXTRA_GAMES.map(x=>`<button class="gamecard" data-extra-start="${x.id}"><span class="emoji">${x.emoji}</span><strong>${x.name}</strong><small>${x.sub}</small></button>`).join('')}</div><div class="section-head"><h2>Ton école d'échecs</h2></div><div class="grid-cards"><button class="gamecard" data-tab="train"><span class="emoji">🎯</span><strong>Défis sur échiquier</strong><small>Déplace la bonne pièce pour apprendre et réussir des exercices.</small></button><button class="gamecard" data-tab="train"><span class="emoji">🧠</span><strong>Quiz et corrections</strong><small>Le bon choix expliqué avec des mots simples.</small></button><button class="gamecard" data-tab="rules"><span class="emoji">📚</span><strong>Règles complètes</strong><small>Échecs à 4, cas avancés, barèmes et différences.</small></button><button class="gamecard" data-tab="settings"><span class="emoji">🌐</span><strong>IA hors ligne / en ligne</strong><small>Choisis ton niveau et ton mode de calcul.</small></button></div>`;}
function gameRotation(g){return resolveRotation(g,rotationMode,boardRotation,controllers);}
function boardsCaption(g,rotation){
 const positions=['en haut','à droite','en bas','à gauche'];
 if(g.kind!=='chess')return '';
 if(g.type==='chess2')return `<div class="board-colors"><span class="board-side black-side">⚫ Noirs — ${positions[(0+rotation)%4]}</span><span class="board-side white-side">⚪ Blancs — ${positions[(2+rotation)%4]}</span></div>`;
 return `<div class="board-colors">${[['red',2],['yellow',0],['blue',3],['green',1]].map(([color,side])=>`<span class="board-side"><i class="dot ${color}"></i>${labels[color]} — ${positions[(side+rotation)%4]}</span>`).join('')}</div>`;
}
function boardHTML(g,ctx='play'){
 const n=g.kind==='chess'?g.size:g.board.length,cols=g.kind==='chess'?g.size:g.board[0].length;
 const rotation=gameRotation(g),axes=axisLabels(n,cols,rotation);
 const options=g.kind==='chess'?legalMoves(g):legalMini(g);
 const sel=ctx==='train'?trainingSelected:selected;
 const possible=sel?options.filter(m=>m.from?.r===sel.r&&m.from?.c===sel.c).map(m=>m.to):[];
 let squares='';
 for(let dr=0;dr<axes.rows;dr++)for(let dc=0;dc<axes.cols;dc++){
  const {r,c}=displayedToOriginal(dr,dc,n,cols,rotation);
  const invalid=g.kind==='chess'&&g.size===14&&(r<3||r>10)&&(c<3||c>10);
  if(invalid){squares+='<div class="cell void" aria-hidden="true"></div>';continue;}
  const p=g.board[r][c],highlight=possible.some(x=>x.r===r&&x.c===c),isSelected=sel?.r===r&&sel?.c===c;
  let symbol='';
  if(g.kind==='chess'&&p)symbol=piecesLook==='sculpted'?`<span class="piece piece-figure ${p.color}${p.dead?' dead':''}" title="${labels[p.color]} : ${PIECE_NAMES[p.t]}">${renderFigure(p,`${ctx}-${r}-${c}`)}</span>`:`<span class="piece ${p.color}${p.dead?' dead':''}" title="${labels[p.color]} : ${PIECE_NAMES[p.t]}">${p.color==='white'?whiteGlyphs[p.t]:glyphs[p.t]}</span>`;
  if(g.kind==='mini'&&p!==null){
   const v=g.id==='checkers'?p.player:p==='F'?0:p==='G'?1:p;
   const img=g.id==='fox'?p==='F'?'🦊':'🪿':g.id==='checkers'&&p.king?'♛':'';
   symbol=`<span class="mini-token ${g.id==='fox'?(p==='F'?'fox':'goose'):'p'+v}">${img}</span>`;
  }
  squares+=`<button class="cell ${(r+c)%2===0?'light':'dark'} ${highlight?(p?'capture':'target'):''} ${isSelected?'selected':''} ${g.kind==='chess'&&g.lastMove&&((g.lastMove.from.r===r&&g.lastMove.from.c===c)||(g.lastMove.to.r===r&&g.lastMove.to.c===c))?'last-move':''}" data-r="${r}" data-c="${c}" aria-label="Case ${squareName(r,c,n)}${g.kind==='chess'&&p?', '+(labels[p.color]||p.color)+' : '+PIECE_NAMES[p.t]:p?', pièce présente':''}">${symbol}</button>`;
 }
 const axis=(items,side)=>`<div class="axis-labels axis-${side}" aria-hidden="true">${items.map(x=>`<span>${x}</span>`).join('')}</div>`;
 const cssClass=cols===14?'chess4':cols===7?'seven':'eight';
 const frame=`<div class="board-frame ${cssClass}${zoom?' zoom':''} ${showCoordinates?'with-coordinates':'without-coordinates'}" style="--cols:${axes.cols};--rows:${axes.rows}">
 ${showCoordinates?axis(axes.top,'top')+axis(axes.left,'left'):''}
 <div id="game-board" class="board ${cssClass}${zoom?' zoom':''} visual-${theme}" style="--cols:${axes.cols}" data-context="${ctx}">${squares}</div>
 ${showCoordinates?axis(axes.right,'right')+axis(axes.bottom,'bottom'):''}</div>`;
 const open3D=`<div id="board-3d-viewport" class="board-3d-viewport" data-context="${ctx}" aria-label="Plateau 3D à 360 degrés. Fais glisser ton doigt pour tourner la vue ; touche une case pour jouer."><div class="three-caption"><span>✦ Vraie 3D à 360° · pièces sculptées</span><small>Glisse pour tourner • touche pour jouer • zoome avec deux doigts</small></div><div class="three-canvas-wrap"><canvas class="webgl-board" role="img" aria-label="Échiquier 3D tactile. Le mode 2D reste accessible." tabindex="0"></canvas><canvas class="webgl-labels" aria-hidden="true"></canvas></div><div class="three-controls"><button type="button" data-action="reset-3d-camera" class="btn sm outline">◎ Recentrer la caméra</button><span>WebGPU si disponible · WebGL sinon · 2D en secours</span></div></div>`;
 return `${boardsCaption(g,rotation)}${open3D}<div class="board-wrap board-viewport board-2d-alternative"><div class="board-scene" data-view="${viewMode}" aria-label="Échiquier, orientation ${rotation*90} degrés">${frame}</div></div>`;
}
function boardSelectionClick(r,c,ctx){
 if(ctx==='train'){
  const g=practice?.game;if(!g||practiceResult==='correct')return;
  if(!trainingSelected){if(g.board[r][c]?.color===g.colors[g.turn])trainingSelected={r,c};else toast('Choisis une pièce de ta couleur.');}
  else {
   const from=trainingSelected,to={r,c};
   if(from.r===r&&from.c===c){trainingSelected=null;}
   else if(g.board[r][c]?.color===g.colors[g.turn])trainingSelected={r,c};
   else {const next=playMove(g,{from,to});
    if(!next){practiceResult='wrong';if(trainTab==='path')pathWrong=true;toast('Ce coup n’est pas autorisé. Essaie encore !');}
    else if(r===practice.expected.to.r&&c===practice.expected.to.c&&from.r===practice.expected.from.r&&from.c===practice.expected.from.c){practice.game=next;practiceResult='correct';if(trainTab==='path'&&pathActive){passPathLevel();}else{stats.lessons++;stats.xp+=10;if(JUNIOR_CHALLENGES.some(j=>j.exercise===practiceIndex%EXERCISES.length)&&!juniorDone.includes(practiceIndex%EXERCISES.length))juniorDone.push(practiceIndex%EXERCISES.length);save();toast('Bravo ! Exercice réussi.');}}
    else{practiceResult='wrong';if(trainTab==='path')pathWrong=true;toast('Ce coup est légal, mais cherche celui demandé.');}
    trainingSelected=null;
   }
  }render();return;
 }
 if(!game||!isHuman()||botBusy){toast(roomLive?(roomData?.started?'Ce n’est pas encore ton tour.':'En attente des autres joueurs.'): 'Patiente : c’est au tour de l’ordinateur.');return;}
 const g=game;
 if(g.kind==='mini'&&['nim','connect4','reversi'].includes(g.id)){
  let m=g.id==='connect4'?{col:c}:g.id==='reversi'?{r,c}:null;
  if(m)moveMini(m);return;
 }
 const p=g.board[r][c];const owner=g.kind==='chess'?g.colors[g.turn]:g.turn;
 const mine=g.kind==='chess'?p?.color===owner: g.id==='fox'?p===(g.turn===0?'F':'G'):g.id==='checkers'?p?.player===owner:p===owner;
 if(!selected){if(mine)selected={r,c};else toast('Choisis une de tes pièces.');render();return;}
 if(selected.r===r&&selected.c===c){selected=null;render();return;}
 if(mine){selected={r,c};render();return;}
 if(g.kind==='chess'){
  const move={from:{...selected},to:{r,c}};
  let next=playMove(g,move);
  if(!next){toast('Coup interdit : essaie une case indiquée en vert.');return;}
  // Sous-promotion demandée uniquement au joueur humain : la dame reste le choix facile.
  if(g.board[move.from.r][move.from.c]?.t==='P'&&next.board[r][c]?.promoted){
   const answer=prompt('Ton pion arrive au bout ! Choisis : D = dame, T = tour, F = fou, C = cavalier.', 'D');
   const promotion={D:'Q',T:'R',F:'B',C:'N',Q:'Q',R:'R',B:'B',N:'N'}[(answer||'D').trim().toUpperCase()]||'Q';
   move.promotion=promotion;
   if(promotion!=='Q')next=playMove(g,move);
  }
  if(roomLive){selected=null;sendRoomMove(move);return;}
  if(nearbyLive&&nearbyRole==='guest'){selected=null;nearby.send({type:'move',move});toast('Coup envoyé à ton ami.');return;}
  game=next;
 }else{
  const opts=legalMini(g),m=opts.find(x=>x.from?.r===selected.r&&x.from.c===selected.c&&x.to.r===r&&x.to.c===c);
  if(!m){toast('Déplacement impossible.');return;}
  game=playMini(game,m);
 }
 selected=null;save();if(nearbyLive&&nearbyRole==='host')nearby.send({type:'state',game});render();queueBot();
}
function moveMini(m){if(!isHuman())return;const next=playMini(game,m);if(!next){toast('Coup non autorisé.');return;}game=next;selected=null;save();render();queueBot();}
function setController(c,v){if(roomLive)return toast('Les couleurs sont attribuées par le salon privé.');controllers[c]=v;save();render();queueBot();}
function controlPlayer(color){if(nearbyLive)return `<div class="player-row">${champ(color,game.colors?.[game.turn]===color)}<span>${color===(game.type==='chess4'?'red':'white')?'👑 Hôte':color===(game.type==='chess4'?'blue':'black')?'👤 Ami':'🤖 IA locale'}</span></div>`;if(roomLive)return `<div class="player-row">${champ(color,game.colors?.[game.turn]===color)}<span>${E(roomData?.players.find(p=>p.seat===color)?.name||'En attente')}</span></div>`;return `<div class="player-row">${champ(color,game.colors?.[game.turn]===color)}<select data-player="${color}" aria-label="Qui joue ${labels[color]} ?"><option value="human" ${controllers[color]==='human'?'selected':''}>👤 Humain</option><option value="bot" ${controllers[color]==='bot'?'selected':''}>🤖 IA</option></select></div>`;}
function renderPlay(){
 if(!game)return `<div class="card"><h2>Choisis un jeu</h2><p>Échecs à quatre joueurs ou l’un des huit jeux du M800.</p><button data-tab="home" class="btn primary">Voir les jeux</button></div>`;
 const id=kind(),isChess=game.kind==='chess';let title=id==='chess4'?'Échecs à 4 joueurs':(M800.find(x=>x.id===id)?.name||'Jeu');
 const games=[{id:'chess4',name:'♟️ Échecs à 4'},...M800.map(g=>({id:g.id,name:g.emoji+' '+g.name}))];
 const status=isChess?statusChess(game):statusMini(game);
 const turnMessage=isChess&&!game.over?(labelTurns[game.colors[game.turn]]||status):status;
 const current=isChess?game.colors[game.turn]:game.turn===0?'A':'B';
 if(isChess)window.GameClocks?.sync(game.type==='chess4'?'chess4':'chess2',current,!!game.over);
 return `<div class="section-head"><div><div class="tag">Terrain de jeu</div><h2>${title}</h2></div><span class="pill ${game.over?'':'green'}">${game.over?'Partie terminée':nearbyLive?'À proximité':roomLive?'Salon privé':aiMode==='offline'?'IA locale':'IA serveur'}</span></div>
 ${nearbyLive?`<div class="note room-banner"><b>📶 Proximité</b> · ${nearbyRole==='host'?'Hôte':'Invité'} · ${E(nearbyStatus)} <button class="btn sm" data-tab="friends">Connexion</button></div>`:''}${roomLive?`<div class="note room-banner"><b>🌐 Salon ${E(roomData?.code||'')}</b> · Tu joues ${labels[roomData?.seat]||''} · ${roomData?.started?'La partie a commencé':'En attente des autres joueurs'} <button class="btn sm" data-tab="friends">Voir le salon</button></div>`:''}<div class="game-tabs">${games.map(x=>`<button data-open-game="${x.id}" class="${x.id===id?'active':''}">${x.name}</button>`).join('')}</div>
 ${isChess&&game.type!=='chess4'?window.GameClocks?.markup('chess2')||'':''}<div class="play-layout"><div class="card board-card"><div class="board-status ${isChess?`turn-${current}`:''}" aria-live="polite">${turnMessage}</div>${isChess?`<p class="board-howto">👆 <strong>Pour jouer :</strong> touche une pièce de ta couleur, puis une case verte. ${real3D?'Si la vue 3D est difficile à utiliser, appuie sur « Vue 2D tactile ».':'La vue 2D fonctionne directement au doigt, même hors connexion.'}</p>`:''}<div class="scene-toolbar game-toolbar"><span>🎨 ${E(themeLabel(theme))}</span><button class="btn sm immersive-toggle" data-action="toggle-immersive" aria-pressed="${immersiveGame}">${immersiveGame?'⤢ Réduire':'⛶ Plein écran'}</button><button class="btn sm teal" data-action="toggle-game-options" aria-expanded="${gameOptionsOpen}" aria-controls="game-options">⚙ Options ${gameOptionsOpen?'▴':'▾'}</button><button class="btn sm ${real3D?'teal':'outline'}" data-action="toggle-real3d">${real3D?'▦ Vue 2D tactile':'◈ Vue 3D 360°'}</button><button class="btn sm outline" data-action="rotate-board" aria-label="Tourner le plateau">↻ Tourner</button></div><div id="game-options">${renderGameOptions(isChess)}</div>${game.id==='nim'?nim3DHolder()+renderNim():game.type==='chess4'?`<div class="chess4-clock-stage">${boardHTML(game)}${window.GameClocks?.markup('chess4')||''}</div>`:boardHTML(game)}<div class="board-tip">${rotationMode==='manual'?'Vue réglable librement':rotationMode==='turn'?'Orientation suivant le tour':rotationMode==='camp'?'Ton camp en bas':'Blancs ou rouges en bas'} · ${showCoordinates?'Lettres et chiffres visibles':'Coordonnées masquées'} · ${viewMode==='flat'?'2D':viewMode==='depth'?'3D inclinée':'3D immersive'}</div><div class="btn-row" style="margin-top:14px"><button class="btn sm" data-action="undo">↶ Annuler</button><button class="btn sm" data-action="hint">💡 Conseil IA</button><button class="btn sm" data-action="coach">🎓 Professeur</button><button class="btn sm" data-action="speak-coach">🔊 Écouter</button><button class="btn sm" data-action="save-game">💾 Sauver</button><button class="btn sm" data-action="zoom">${zoom?'⊖ Réduire':'⊕ Agrandir'}</button>${game.id==='saut'&&game.chain?'<button data-action="end-chain" class="btn teal sm">Finir mon tour</button>':''}<button class="btn sm" data-action="new-game">⟳ Nouvelle partie</button></div>${miniInfo?`<div class="explain">${E(miniInfo)}</div>`:''}</div>
 <aside class="play-side"><div class="card"><h3>Joueurs</h3>${isChess?`<div class="player-list">${game.colors.map(controlPlayer).join('')}</div>`:`<div class="player-list">${['A','B'].map((c,i)=>`<div class="player-row">${champ(i===0?'red':'blue',game.turn===i)}<select data-player="${c}"><option value="human" ${controllers[c]==='human'?'selected':''}>👤 Humain</option><option value="bot" ${controllers[c]==='bot'?'selected':''}>🤖 IA</option></select></div>`).join('')}</div>`}<p class="subtle">Tu peux remplacer l’IA par un humain, même en cours de partie.</p><hr><h3>Options IA</h3><div class="control-group"><label>Puissance</label><select data-select="level">${[[1,'1 · Découverte'],[2,'2 · Facile'],[3,'3 · Intermédiaire'],[4,'4 · Stratégie'],[5,'5 · Analyse tactique'],[6,'6 · Expert local (plus lent)']].map(([v,s])=>`<option value="${v}" ${+level===v?'selected':''}>${s}</option>`).join('')}</select></div><div class="control-group"><label>Personnalité de l’IA</label><select data-select="ai-style">${AI_STYLES.map(([v,t])=>`<option value="${v}" ${aiStyle===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="control-group"><label>Calcul des coups</label><select data-select="ai-mode"><option value="offline" ${aiMode==='offline'?'selected':''}>📴 Sans réseau — sur cet appareil</option><option value="online" ${aiMode==='online'?'selected':''}>🌐 Avec réseau — serveur IA</option></select></div>${nearbyLive?'<p class="note">En mode proximité, seuls les participants désignés peuvent déplacer leurs pièces. Les coups sont validés par l’hôte.</p>':''}${roomLive?'<p class="note">En salon, les coups sont validés par le serveur. L’IA locale ne joue pas à la place de tes amis.</p>':''}${aiMode==='online'?`<p class="note">L’IA en ligne nécessite une adresse de serveur configurée dans Réglages. Sans serveur, l’application se rabat sur l’IA locale.</p>`:''}</div>
 <div class="card"><h3>${id==='chess4'?'Règlement à 4':'Règles et aide'}</h3>${id==='chess4'?`<div class="control-group"><label>Choisir un règlement</label><select data-select="fourmode">${modes.map(([k,v])=>`<option value="${k}" ${fourMode===k?'selected':''}>${v}</option>`).join('')}</select></div>${game.mode==='house-a'?`<div class="control-group"><label>Pièces éliminées</label><select data-select="dead"><option value="frozen" ${game.options.dead==='frozen'?'selected':''}>Obstacles immobiles</option><option value="remove" ${game.options.dead==='remove'?'selected':''}>Retirées du plateau</option><option value="transfer" ${game.options.dead==='transfer'?'selected':''}>Données au joueur vainqueur</option></select></div>`:''}`:game.id==='nim'||game.id==='north'?`<div class="control-group"><label>Qui gagne au dernier coup ?</label><select data-select="last-rule"><option value="normal" ${game.rule==='normal'?'selected':''}>DG — le dernier gagne</option><option value="last-loses" ${game.rule==='last-loses'?'selected':''}>DP — le dernier perd</option></select></div>`:''}
 ${id==='chess4'?`<p class="subtle">La promotion, les prises et les points principaux sont présents. Certains cas très rares du règlement officiel restent simplifiés.</p><button class="btn outline sm" data-tab="rules">Voir les différences →</button>`:id==='chess2'?`<p>Protège ton roi. Le mat gagne, le pat donne une nulle.</p>`:`<p class="subtle">${MINI_RULES[id]||''}</p>`}</div>
 ${isChess&&game.type==='chess4'?`<div class="card"><h3>🏆 Tableau des points</h3><div class="scorelist">${game.colors.map(c=>`<div class="score">${champ(c)} : ${game.scores[c]} pts ${!game.active[c]?'(éliminé)':''}</div>`).join('')}</div><p class="subtle">Les points sont utiles principalement en chacun pour soi avec score.</p></div>`:''}
 <div class="card"><h3>Le conseil de ton professeur</h3><p class="subtle">Appuie sur « Conseil IA » pour voir un déplacement possible. C’est une aide pédagogique, pas une garantie de meilleur coup.</p><button data-tab="train" class="btn teal">🎓 M’entraîner</button></div></aside></div>`;
}
function nim3DHolder(){return `<div id="board-3d-viewport" class="board-3d-viewport" data-context="play" aria-label="Jeu de Nim en 3D"><div class="three-caption">◈ Nim en 3D — touche un pion pour enlever ceux à sa droite</div><div class="three-canvas-wrap"><canvas class="webgl-board" tabindex="0" aria-label="Nim 3D interactif"></canvas><canvas class="webgl-labels" aria-hidden="true"></canvas></div><div class="three-controls"><button class="btn sm outline" data-action="reset-3d-camera">◎ Recentrer</button><span>Les boutons −1, −2… restent disponibles</span></div></div>`;}
function renderNim(){const piles=game.piles;return `<div class="nim-piles">${piles.map((n,pile)=>`<div class="nim-pile">${Array.from({length:n},()=>'<i class="nim-coin"></i>').join('')}<strong>Pile ${pile+1}: ${n}</strong><div class="nim-buttons">${Array.from({length:n},(_,i)=>`<button data-nim-pile="${pile}" data-nim-count="${i+1}" ${isHuman()?'':'disabled'}>−${i+1}</button>`).join('')}</div></div>`).join('')}</div>`;}
async function queueBot(){
 if((nearbyLive&&(nearbyRole!=='host'||game?.colors[game.turn]===(game.type==='chess4'?'blue':'black')))||roomLive||!game||game.over||tab!=='play'||isHuman()||pendingBot||botBusy)return;
 pendingBot=setTimeout(()=>{pendingBot=null;doBot();},240);
}
async function doBot(){
 if((nearbyLive&&(nearbyRole!=='host'||game?.colors[game.turn]===(game.type==='chess4'?'blue':'black')))||roomLive||!game||game.over||isHuman()||tab!=='play')return;
 const ref=game,kind=game.kind,gameKey=JSON.stringify([game.ply,game.turn,game.type,game.id]);botBusy=true;
 let m=null;
 try{
  if(aiMode==='online'&&serverUrl&&navigator.onLine&&!nearbyLive){
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
   try{
    const resp=await fetch(serverUrl.replace(/\/$/,'')+'/api/bot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game,level}),signal:ctrl.signal});
    if(!resp.ok)throw new Error('Serveur indisponible');const json=await resp.json();m=json.move;
   }catch(err){toast('Serveur inaccessible : IA locale utilisée.');}finally{clearTimeout(timeout);}
  }else if(aiMode==='online'&&!serverUrl){toast('Configure le serveur IA : repli sur IA locale.');}
  if(!m)m=kind==='chess'?botChess(game,level,aiStyle):botMini(game,level);
  if(game!==ref||gameKey!==JSON.stringify([game.ply,game.turn,game.type,game.id])||tab!=='play')return;
  if(m){let n=kind==='chess'?playMove(game,m):playMini(game,m);
   if(n){if(n.id==='saut'&&n.chain)n=finishChain(n);game=n;selected=null;save();if(nearbyLive&&nearbyRole==='host')nearby.send({type:'state',game});}
  }
 }catch(err){toast('Calcul IA interrompu : '+err.message);console.error(err);}
 finally{botBusy=false;render();queueBot();}
}
const addPieces=(g,items)=>{g.board=Array.from({length:g.size},()=>Array(g.size).fill(null));g.turn=0;g.ply=0;g.history=[];g.over=null;g.active=Object.fromEntries(g.colors.map(c=>[c,true]));g.scores=Object.fromEntries(g.colors.map(c=>[c,0]));
 for(const [r,c,color,t] of items)g.board[r][c]={color,t,moved:true,promoted:false,dead:false};return g;};
const wk=[7,4,'white','K'],bk=[0,4,'black','K'];
const fourKings=[[13,7,'red','K'],[7,0,'blue','K'],[0,6,'yellow','K'],[6,13,'green','K']];
const EXERCISES=[
 {title:'Le roi fait un pas',info:'Fais avancer le roi blanc d’une seule case.',type:'chess2',pieces:[wk,bk],from:[7,4],to:[6,4],why:'Le roi bouge d’une case à la fois dans toutes les directions, tant qu’il reste en sécurité.'},
 {title:'La tour avance tout droit',info:'Déplace la tour blanche de A2 à A5.',type:'chess2',pieces:[wk,bk,[6,0,'white','R']],from:[6,0],to:[3,0],why:'La tour glisse horizontalement ou verticalement. Elle ne saute jamais une autre pièce.'},
 {title:'Le fou en diagonale',info:'Fais glisser le fou blanc de C2 à F5.',type:'chess2',pieces:[wk,[0,7,'black','K'],[6,2,'white','B']],from:[6,2],to:[3,5],why:'Le fou ne quitte jamais sa diagonale.'},
 {title:'Le saut du cavalier',info:'Le cavalier blanc va de B2 à C4.',type:'chess2',pieces:[wk,bk,[6,1,'white','N']],from:[6,1],to:[4,2],why:'Le cavalier avance de deux cases puis une case sur le côté : il dessine un L et peut sauter.'},
 {title:'La dame est très forte',info:'Déplace la dame de D2 à D5.',type:'chess2',pieces:[wk,[0,7,'black','K'],[6,3,'white','Q']],from:[6,3],to:[3,3],why:'La dame peut se déplacer comme la tour ou le fou, aussi loin que la voie est libre.'},
 {title:'Le pion, deux cases',info:'Au premier coup, fais avancer le pion de E2 à E4.',type:'chess2',pieces:[[7,7,'white','K'],[0,7,'black','K'],[6,4,'white','P']],from:[6,4],to:[4,4],why:'Un pion qui n’a pas encore bougé peut avancer de deux cases si rien ne le bloque.'},
 {title:'Le pion prend en diagonale',info:'Ton pion E2 peut prendre le pion noir en F3.',type:'chess2',pieces:[[7,7,'white','K'],[0,0,'black','K'],[6,4,'white','P'],[5,5,'black','P']],from:[6,4],to:[5,5],why:'Le pion avance droit, mais prend une pièce en diagonale.'},
 {title:'Échec et mat en un coup !',info:'Joue Dame F7 → G7 et piège le roi noir.',type:'chess2',pieces:[[2,7,'white','K'],[0,7,'black','K'],[1,5,'white','Q']],from:[1,5],to:[1,6],why:'La dame protège toutes les sorties du roi noir, avec l’aide du roi blanc : c’est mat.'},
 {title:'À 4 : attraper un cavalier',info:'Avec la tour rouge, capture le cavalier bleu.',type:'chess4',pieces:[...fourKings,[8,7,'red','R'],[5,7,'blue','N']],from:[8,7],to:[5,7],why:'Même avec quatre joueurs, la tour avance toujours en ligne droite.'},
 {title:'À 4 : saut du cavalier rouge',info:'Le cavalier rouge saute de G3 vers H5.',type:'chess4',pieces:[...fourKings,[11,6,'red','N']],from:[11,6],to:[9,7],why:'Le cavalier peut sauter dans un jeu à 4 comme dans les échecs classiques.'},
 {title:'À 4 : avancer un pion bleu',info:'Choisis le pion bleu en B8 et pousse-le jusqu’en D8.',type:'chess4',turn:1,pieces:[...fourKings,[6,1,'blue','P']],from:[6,1],to:[6,3],why:'Les pions bleus avancent vers la droite. Au premier coup ils peuvent faire deux cases.'},
];
function loadPractice(){const e=EXERCISES[practiceIndex%EXERCISES.length],g=addPieces(newChess(e.type,e.type==='chess4'?'chesscom-ffa':'standard'),e.pieces);
 if(e.turn!==undefined)g.turn=e.turn;
 // The exercise of first pawn moves needs to preserve moved=false.
 for(const row of g.board)for(const p of row)if(p?.t==='P')p.moved=false;
 practice={game:g,title:e.title,info:e.info,why:e.why,expected:{from:{r:e.from[0],c:e.from[1]},to:{r:e.to[0],c:e.to[1]}}};practiceResult='';trainingSelected=null;
}
function openPath(id){
 const m=pathModule(id);if(!m)return;
 pathActive=id;pathLevel=academyProgress[id];pathAnswer=null;pathWrong=false;pathValidated=false;trainTab='path';
 if(pathLevel<m.steps.length&&m.steps[pathLevel].type==='board'){
  practiceIndex=m.steps[pathLevel].index;loadPractice();
 }
 render();
}
function passPathLevel(){
 if(!pathActive||pathValidated)return;
 const result=validateLevel(academyProgress,pathActive,pathLevel,true);
 if(!result.advanced)return;
 academyProgress=result.progress;pathValidated=true;pathWrong=false;save();
 toast('Niveau validé ! Tu peux passer au suivant.');
}
function nextPathLevel(){
 if(!pathValidated||!pathActive)return;
 openPath(pathActive);
}
function renderAcademyPath(){
 if(!pathActive){
  return `<section class="path-intro card"><h2>🗺️ Mon parcours d’échecs</h2><p><strong>Une règle simple :</strong> tu passes au niveau suivant uniquement après avoir réussi. Sinon, tu recommences le même niveau autant de fois que tu veux.</p><p class="subtle">Aucun cœur, aucune étoile, aucun cadenas, aucune attente imposée.</p></section><div class="path-grid">${PATH_MODULES.map(m=>`<button type="button" class="path-card" data-path-open="${m.id}"><span class="path-icon">${m.icon}</span><strong>${E(m.name)}</strong><span>${E(m.subtitle)}</span><small>${academyProgress[m.id]>=m.steps.length?'✅ Terminé':`Niveau ${academyProgress[m.id]+1} sur ${m.steps.length}`}</small></button>`).join('')}</div>`;
 }
 const m=pathModule(pathActive);if(!m)return '';
 const finished=pathLevel>=m.steps.length;
 if(finished)return `<section class="card path-stage"><button class="btn outline sm" data-action="path-home">← Toutes les activités</button><h2>✅ ${E(m.name)} terminé !</h2><p>Tu as validé tous les niveaux de cette activité. Tu peux choisir une autre activité, sans restriction.</p><button class="btn teal" data-action="path-home">Choisir une activité →</button></section>`;
 const step=m.steps[pathLevel];
 let challenge='';
 if(step.type==='board'){
  const e=EXERCISES[step.index];
  challenge=`<h3>${E(e.title)}</h3><p>${E(e.info)}</p>${boardHTML(practice.game,'train')}<div class="exercise-actions"><button class="btn outline sm" data-action="training-hint">💡 Indice</button><button class="btn outline sm" data-action="training-solution">👀 Voir la solution</button>${pathValidated?'':'<button class="btn outline sm" data-action="path-retry">↻ Recommencer</button>'}</div>`;
 }else{
  const c=step.type==='course'?COURSES[step.index]:step;
  const title=c.title,lesson=c.lesson,question=c.q||c.question,choices=c.options||c.choices;
  challenge=`<h3>${E(title)}</h3><p>${E(lesson)}</p><button class="btn outline sm" data-action="path-read">🔊 Écouter l’explication</button><h3>${E(question)}</h3><div class="quiz-options">${choices.map((opt,i)=>`<button class="${pathAnswer===i?(pathValidated?'correct':'wrong'):''}" data-path-answer="${i}" ${pathValidated?'disabled':''}>${String.fromCharCode(65+i)}. ${E(opt)}</button>`).join('')}</div>`;
 }
 const failed=pathWrong&&!pathValidated;
 const explanation=step.type==='board'?EXERCISES[step.index].why:(step.type==='course'?COURSES[step.index].why:step.why);
 return `<section class="card path-stage"><button class="btn outline sm" data-action="path-home">← Toutes les activités</button><div class="tag">${m.icon} ${E(m.name)} · Niveau ${pathLevel+1} / ${m.steps.length}</div><div class="path-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${m.steps.length}" aria-valuenow="${pathLevel}" aria-label="Niveaux validés"><span style="width:${pathLevel/m.steps.length*100}%"></span></div>${challenge}${pathValidated?`<div class="path-result good"><strong>✅ Niveau validé !</strong><p>${E(explanation)}</p></div><button class="btn teal" data-action="path-next">${pathLevel+1===m.steps.length?'Terminer cette activité →':'Passer au niveau suivant →'}</button>`:failed?`<div class="path-result bad"><strong>Pas encore réussi.</strong><p>${E(explanation)} Tu restes au niveau ${pathLevel+1} et tu peux réessayer.</p></div>${step.type==='board'?'':`<button class="btn outline" data-action="path-retry">↻ Réessayer</button>`}`:`<p class="subtle">Réussis cet exercice pour valider ce niveau et découvrir le suivant.</p>`}</section>`;
}
const QUIZZES=[
 ['Combien de joueurs peuvent jouer sur un plateau d’échecs en croix ?',['2','4','6'],1,'Chaque côté du plateau appartient à un joueur, avec sa couleur.'],
 ['Le cavalier se déplace en forme de…',['Cercle','L','Carré'],1,'Deux cases dans une direction, puis une case perpendiculaire.'],
 ['La tour avance…',['En diagonale','Tout droit','En sautant'],1,'Verticalement ou horizontalement, sans traverser les pièces.'],
 ['En équipes Chess.com, combien de rois faut-il mater pour gagner ?',['Un roi ennemi','Les deux rois ennemis','Les quatre rois'],0,'Un seul mat adverse suffit sur Chess.com en mode équipes.'],
 ['Chez House of Chess, en équipes, il faut…',['Mater les deux rois adverses','Mater seulement un roi','Compter les pions'],0,'La règle du fabricant demande les deux mats : attention à la différence.'],
 ['À 4 sur Chess.com, quel joueur commence ?',['Jaune','Bleu','Rouge'],2,'L’ordre est Rouge → Bleu → Jaune → Vert.'],
 ['Que signifie « pat » ?',['Le roi est capturé','Aucun coup légal, sans être en échec','On gagne automatiquement'],1,'Le roi n’est pas attaqué, mais le joueur ne peut plus jouer légalement.'],
 ['Dans les échecs à 4, le camp opposé est ton partenaire en équipes.',['Vrai','Faux'],0,'Rouge + Jaune contre Bleu + Vert.'],
 ['En FFA Chess.com, une dame normale capturée rapporte…',['3 points','5 points','9 points'],2,'Une dame normale rapporte 9 points ; une dame promue vaut généralement 1.'],
 ['Sur le Millennium M800, quel bouton montre les coups possibles aux échecs ?',['LEGAL','ON/OFF','START'],0,'LEGAL sert à voir où une pièce peut aller.'],
 ['Dans Nim, peux-tu retirer dans plusieurs piles pendant un même tour ?',['Oui','Non'],1,'On choisit une seule pile et on retire un nombre de pions dans cette pile.'],
 ['Dans Reversi, le but est de…',['Aligner des rois','Retourner les jetons','Faire échec et mat'],1,'On encadre les jetons adverses pour les retourner.'],
];
function renderTraining(){
 const e=practice,q=QUIZZES[quizIndex%QUIZZES.length];
 return `<div class="section-head"><div><div class="tag">Mon école de jeux</div><h2>Apprendre à son rythme</h2></div><div class="pill green">✅ Progresser sans pénalité</div></div><div class="game-tabs"><button class="${trainTab==='path'?'active':''}" data-train="path">🗺️ Mon parcours</button><button class="${trainTab==='moves'?'active':''}" data-train="moves">🎯 Échiquier interactif</button><button class="${trainTab==='quiz'?'active':''}" data-train="quiz">🧠 Quiz des règles</button><button class="${trainTab==='lessons'?'active':''}" data-train="lessons">🎓 Mes leçons</button><button class="${trainTab==='academy'?'active':''}" data-train="academy">👑 Académie</button></div>
 ${trainTab==='path'?renderAcademyPath():trainTab==='academy'?renderAcademy():trainTab==='lessons'?`<div class="card"><div class="tag">Leçon ${lessonIndex+1} / ${LESSONS.length}</div><h2>${LESSONS[lessonIndex][0]}</h2><p>${LESSONS[lessonIndex][1]}</p><div class="btn-row"><button class="btn teal" data-action="lesson-read">🔊 Écouter la leçon</button><button class="btn blue" data-action="lesson-next">Leçon suivante →</button></div><p class="subtle">Leçons intégrées : elles ne demandent ni compte ni connexion. La voix dépend des voix françaises installées sur l’appareil.</p></div>`:trainTab==='moves'?`<div class="training-layout"><div class="card board-card"><div class="tag">Défi ${practiceIndex%EXERCISES.length+1} / ${EXERCISES.length}</div><h2>${e.title}</h2><p>${e.info}</p>${boardHTML(e.game,'train')}<div class="exercise-actions" style="margin-top:15px"><button data-action="training-hint" class="btn outline sm">💡 Indice</button><button data-action="training-solution" class="btn outline sm">👀 Voir la solution</button><button data-action="training-next" class="btn teal" ${practiceResult!=='correct'?'disabled':''}>Défi suivant →</button></div>${practiceResult==='correct'?`<div class="explain">Bravo ! ${e.why}</div>`:practiceResult==='wrong'?'<div class="explain bad">Essaie à nouveau ! Clique sur la bonne pièce, puis sur sa destination.</div>':''}</div><div class="card"><h3>Mon parcours</h3><div class="large-stat">${stats.lessons} défis réussis</div><p>Progression selon tes réussites.</p><div class="progressbar"><span style="width:${Math.round((practiceIndex%EXERCISES.length+1)/EXERCISES.length*100)}%"></span></div><hr><h3>Les bons réflexes</h3><ol><li>Je regarde mon roi.</li><li>Je trouve une pièce libre.</li><li>Je cherche un coup utile.</li><li>Je vérifie que ma pièce est protégée.</li></ol><p class="note">Ces exercices expliqués sont adaptés aux débutants. Pour les plus jeunes, faites-les avec un adulte.</p></div></div>`:
 `<div class="training-layout"><div class="card"><div class="tag">Question ${quizIndex%QUIZZES.length+1} / ${QUIZZES.length}</div><h2>${q[0]}</h2><div class="quiz-options">${q[1].map((opt,i)=>`<button data-quiz-answer="${i}" ${quizAnswered===q[2]?'disabled':''} class="${quizAnswered!==null?(i===q[2]?'correct':i===quizAnswered?'wrong':''):''}">${String.fromCharCode(65+i)}. ${opt}</button>`).join('')}</div>${quizAnswered!==null?`<div class="explain ${quizAnswered===q[2]?'':'bad'}">${quizAnswered===q[2]?'Bravo !':'Pas tout à fait.'} ${q[3]}</div>`:''}<div class="btn-row" style="margin-top:16px"><button data-action="quiz-next" class="btn teal" ${quizAnswered!==q[2]?'disabled':''}>Question suivante →</button></div></div><div class="card"><h3>Mes résultats</h3><div class="large-stat">${stats.quizzes} bonnes réponses</div><p>Tu peux recommencer autant de fois que tu veux.</p><p class="note">Les réponses correctes sont toujours accompagnées d’une explication facile à retenir.</p></div></div>`}`;
}
const houseRules=`<h2>House of Chess — plateau réel</h2><p>Le fabricant propose trois variantes :</p><h3>A. Chacun pour soi sans points</h3><p>Le dernier joueur encore en jeu gagne. Pour les pièces éliminées, vous pouvez choisir avant la partie de les retirer, les laisser immobiles ou les attribuer au joueur qui a donné mat.</p><h3>B. Chacun pour soi avec des points</h3><p>La capture d'une pièce rapporte des points. Le mat rapporte 20 points et les échecs multiples donnent des bonus. La partie est gagnée par le meilleur score, pas obligatoirement par le dernier survivant.</p><h3>C. Deux équipes de deux</h3><p>Rouge + Jaune contre Bleu + Vert, sans capture du partenaire. Dans la version publiée par le fabricant, il faut <b>mater les deux rois adverses</b>.</p><div class="notice">Dans cette application, l’attribution des points de mat et quelques cas d’élimination sont pédagogiques : le moteur ne certifie pas tous les cas rares du livret fabricant.</div>`;
const chesscomRules=`<h2>Chess.com — échecs à quatre</h2><h3>Chacun pour soi (Free-for-All)</h3><p>Chaque joueur est adversaire des trois autres. Tours : <b>Rouge → Bleu → Jaune → Vert</b>. Les captures rapportent des points, un échec et mat élimine un joueur et son armée devient généralement grise et immobile. Les points déterminent le classement.</p><h3>Deux contre deux</h3><p>Rouge + Jaune contre Bleu + Vert. Les partenaires peuvent se conseiller, mais chacun contrôle seulement ses propres pièces. <b>Un seul échec et mat adverse suffit</b> à faire gagner l’équipe ; un pat entraîne une nulle.</p><h3>Promotion des pions</h3><p>En chacun pour soi, le pion se promeut à la 8e rangée comptée depuis son bord. En équipes, à la 11e rangée. Dans le mode FFA usuel, une dame promue vaut 1 point lorsqu’elle est capturée.</p><h3>Prise en passant et roque</h3><p>Un pion qui avance de deux cases peut être pris en passant à la première occasion autorisée. Le roque concerne le roi et une tour encore immobiles, sur un trajet libre et non menacé. Sur le plateau en croix, ces situations sont complexes.</p><div class="notice"><b>À savoir :</b> cette application ne se connecte pas aux parties officielles de Chess.com. Le jeu de points est une simulation pédagogique et ne reproduit pas parfaitement toutes les exceptions de l’interface Chess.com (pat, rois automatiques, classement, élimination simultanée).</div>`;
const pointsRules=`<h2>Points et cas avancés</h2><table><tr><th>Événement</th><th>Points (barème de base)</th></tr><tr><td>Prendre un pion</td><td>+1</td></tr><tr><td>Prendre un cavalier</td><td>+3</td></tr><tr><td>Prendre un fou ou une tour</td><td>+5</td></tr><tr><td>Prendre une dame normale</td><td>+9</td></tr><tr><td>Mater un adversaire</td><td>+20</td></tr><tr><td>Prendre une dame issue d’une promotion</td><td>+1</td></tr></table><p>Certains cas donnent des points supplémentaires. Selon la règle choisie : mettre plusieurs rois en échec, provoquer un pat, finir sur répétition ou obtenir le dernier roi. Chess.com distingue la dame et les autres pièces dans le barème des échecs simultanés.</p><h3>Les 3 grands mots</h3><p><b>Échec :</b> le roi est attaqué. <b>Mat :</b> le roi est attaqué et ne peut plus être sauvé. <b>Pat :</b> aucun coup possible, mais le roi n’est pas en échec.</p><h3>Comparatif rapide</h3><table><tr><th>Règle</th><th>House of Chess</th><th>Chess.com</th></tr><tr><td>En équipes</td><td>2 rois adverses mats</td><td>1 roi adverse mat</td></tr><tr><td>Sans équipe</td><td>Sans ou avec points</td><td>FFA avec points</td></tr><tr><td>Élimination</td><td>3 options en mode A</td><td>Armée grisée en FFA</td></tr></table><p>Pour les détails et exceptions, consulte le PDF source et la règle officielle mise à jour du service où tu joues.</p>`;
const basicRules=`<h2>Débuter aux échecs à quatre</h2><p>Chaque couleur commence avec <b>16 pièces</b> : un roi, une dame, deux tours, deux fous, deux cavaliers et huit pions. Le plateau en croix se joue à tour de rôle.</p><table><tr><th>Pièce</th><th>Son déplacement</th></tr>${[['♚ Roi','1 case dans toutes les directions'],['♛ Dame','Ligne droite ou diagonale'],['♜ Tour','Ligne droite, horizontalement ou verticalement'],['♝ Fou','Diagonale seulement'],['♞ Cavalier','En L, saute par-dessus les pièces'],['♟ Pion','Avance tout droit, capture en diagonale']].map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table><h3>Quand le roi est en danger</h3><p>Il faut trouver un déplacement, capturer la pièce attaquante ou interposer une pièce. Si aucune solution n’existe, c’est <b>échec et mat</b>.</p><p class="note">Astuce 5 ans : commence par déplacer la tour et le cavalier, puis découvre progressivement les autres pièces.</p>`;
function renderRules(){
 const pages=[['intro','Débuter à 4'],['chesscom','Chess.com avancé'],['house','House of Chess'],['points','Points et cas difficiles'],['m800','Les 8 jeux M800'],['buttons','Boutons du M800']];
 let html=ruleTab==='intro'?basicRules:ruleTab==='chesscom'?chesscomRules:ruleTab==='house'?houseRules:ruleTab==='points'?pointsRules:ruleTab==='m800'?`<h2>Les huit jeux du Millennium M800</h2>${M800.map(x=>`<h3>${x.emoji} ${x.name}</h3><p>${x.id==='chess2'?'Le roi doit être protégé ; cherche à faire échec et mat.':MINI_RULES[x.id]}</p>`).join('')}<p class="notice">Les versions numériques sont des adaptations simples ; elles ne pilotent pas ton échiquier électronique M800.</p>`:`<h2>Les boutons du véritable M800</h2><table>${[['ON/OFF','Allumer / éteindre'],['START','Menu principal'],['E','Valider une sélection'],['▲ / ▼','Parcourir les choix'],['ESC','Retour'],['SWAP','Laisser l’ordinateur jouer'],['LEGAL','Voir les coups possibles'],['HELP','Voir les options'],['EXERCISE','Choisir un exercice']].map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table><p class="note">Sur l’appareil réel, on appuie sur la case de départ, on déplace physiquement la pièce, puis on appuie sur la case d’arrivée. L’application numérique fonctionne avec des clics/touches sur son propre écran.</p>`;
 return `<div class="section-head"><div><div class="tag">La bibliothèque des règles</div><h2>Tout comprendre, même les règles difficiles</h2></div></div><div class="rules-layout"><div class="card rule-menu">${pages.map(([k,v])=>`<button data-rule="${k}" class="${ruleTab===k?'active':''}">${v}</button>`).join('')}</div><div class="card ruletext">${html}<hr><h3>Les deux guides de référence</h3><div class="rulelinks"><a href="docs/Regles_4_joueurs.pdf" target="_blank" rel="noopener" class="btn outline">📄 Guide à 4 joueurs (PDF)</a><a href="docs/Guide_M800.pdf" target="_blank" rel="noopener" class="btn outline">📄 Guide M800 (PDF)</a></div><p class="subtle" style="margin-top:15px">Sources externes : <a target="_blank" rel="noopener" href="https://support.chess.com/en/articles/8614233-4-player-chess-4pc">Chess.com</a> · <a target="_blank" rel="noopener" href="https://houseofchess.co.za/products/four-player-chess-set">House of Chess</a>.</p></div></div>`;
}
function renderSettings(){return `<div class="section-head"><div><div class="tag">Mes préférences</div><h2>Paramètres de l’IA et installation</h2></div></div><div class="settings-grid"><div class="card"><h3>🔄 Mettre l’application à jour</h3><p><b>Version 2.9</b> — Plateau tactile en accès direct, nouvelle aide pour jouer, et moteur amélioré. Shogi jouable et 24 exercices expliqués (mat, promotion, parachutage, défense et tactique), IA d’initiation, suivi de progression et conseils. Parcours de six activités validées uniquement après réussite, sans cadenas, vies ni étoiles.  vraie 3D à 360°, pièces modélisées (WebGL) avec caméra tactile et repli 2D.  plateau inclinable et pivotant, coordonnées optionnelles, 8 designs au choix (3 styles de pièces), nouveaux reliefs 3D pour tous les jeux, pièces Blanches / Noires contrastées, étiquettes françaises, réglage rapide de style. Atelier Junior, assistante, IA et sauvegardes conservés. Tes anciennes parties restent sur cet appareil.</p><button class="btn teal" data-action="update-app">🔄 Chercher une nouvelle version</button><p class="subtle">N'efface pas les données de l'application. Une connexion est nécessaire pour rechercher une mise à jour.</p></div><div class="card"><h3>💾 Mes parties enregistrées</h3><p>En plus de la reprise automatique, tu peux garder jusqu’à huit sauvegardes manuelles sur cet appareil.</p><button class="btn teal" data-action="save-game">💾 Enregistrer la partie actuelle</button>${saveSlots.length?`<div class="saves">${saveSlots.map(x=>`<div class="save-line"><div><strong>${E(x.name)}</strong><small>${new Date(x.when).toLocaleString('fr-FR')}</small></div><button class="btn sm" data-save-load="${x.id}">Ouvrir</button><button class="btn sm outline" data-save-delete="${x.id}">Effacer</button></div>`).join('')}</div>`:'<p class="subtle">Aucune sauvegarde manuelle.</p>'}<p class="note">Les sauvegardes utilisent le stockage de ce navigateur, pas un compte cloud. Avant de vider Safari, conserve une copie de ton projet et de tes données importantes.</p></div><div class="card"><h3>📦 Copier mes sauvegardes dans Fichiers</h3><p><b>Nouveau en V2.2 :</b> exporte tes parties, tes huit sauvegardes, ta progression historique et tes préférences dans un fichier JSON. Tu pourras l’importer dans une autre installation compatible sur iPhone, Android, PC ou Mac.</p><div class="btn-row"><button class="btn teal" data-action="backup-export">📤 Exporter dans Fichiers</button><button class="btn outline" data-action="backup-download">⬇ Télécharger le JSON</button></div><hr><p><b>Pour récupérer une ancienne sauvegarde :</b></p><label for="backup-import-file" class="btn blue" style="display:inline-block;cursor:pointer">📥 Choisir un fichier à importer</label><input id="backup-import-file" type="file" accept=".json,application/json" style="position:absolute;left:-9999px" aria-label="Sélectionner un fichier de sauvegarde JSON"><p class="note">L'import <b>fusionne sans effacer</b> : tes résultats historiques restent au meilleur niveau, ta partie actuelle est gardée, et les parties importées sont ajoutées aux emplacements libres (maximum 8). Si les 8 places sont déjà prises, certaines parties resteront uniquement dans le fichier : conserve-le.</p><p class="subtle">Le fichier peut contenir tes parties et préférences. Garde-le privé. Aucun compte ni connexion n'est nécessaire pour exporter ou importer.</p></div><div class="card designs-card" id="themes-v251"><h3>🎨 Ma collection d’échiquiers</h3><p><b>8 designs originaux</b> pour tous les jeux : bois Staunton, marbre, royal médiéval, noir et or, néon, junior, classique et relief 3D. Inspirés de l’univers des échiquiers existants, sans recopier des illustrations commerciales.</p>${renderThemeGallery()}<hr><h3>♟️ Style des pièces</h3><p class="subtle">Change la présentation de chaque armée, sans modifier les règles ni les coups.</p>${renderPieceLooks()}<div class="control-group"><label>Lisibilité des pièces</label><select data-select="contrast"><option value="normal" ${!highContrast?'selected':''}>Contraste normal</option><option value="strong" ${highContrast?'selected':''}>Contraste renforcé (Blancs / Noirs)</option></select></div><p class="note">♙ Blancs et ♟ Noirs sont clairement identifiés ; leur position à l’écran suit la rotation choisie. Le design reste enregistré sur cet appareil, même hors connexion.</p><img class="icon-preview" src="assets/icone-couleur-241-512.png" alt="Icône du jeu"> <p class="subtle">Les dessins sont créés dans le code CSS : aucune image de tiers n'est nécessaire pour jouer en mode avion.</p></div><div class="card"><h3>🎮 Vue 3D, rotation et coordonnées</h3><p>Les réglages changent uniquement l’affichage. Les règles et les sauvegardes ne sont pas modifiées.</p>
 <div class="control-group"><label for="real-3d">Qualité graphique (tous les jeux)</label><select id="real-3d" data-select="real-3d"><option value="yes" ${real3D?'selected':''}>3D WebGPU/WebGL à 360° — mode immersif</option><option value="no" ${!real3D?'selected':''}>Plateau classique léger — mode 2D/relief</option></select><p class="subtle">Tourne les pièces en déplaçant la caméra du doigt. WebGPU est privilégié sur les appareils compatibles, sinon WebGL. Si les deux sont indisponibles, utilise le plateau 2D.</p></div>
 <div class="control-group"><label for="view-mode">Perspective du plateau classique</label><select id="view-mode" data-select="view-mode"><option value="flat" ${viewMode==='flat'?'selected':''}>2D · vue du dessus</option><option value="depth" ${viewMode==='depth'?'selected':''}>3D · plateau incliné (recommandé)</option><option value="cinema" ${viewMode==='cinema'?'selected':''}>3D · vue immersive</option></select></div>
 <div class="control-group"><label for="rotation-mode">Orientation</label><select id="rotation-mode" data-select="rotation-mode"><option value="manual" ${rotationMode==='manual'?'selected':''}>Manuelle (boutons tourner)</option><option value="white" ${rotationMode==='white'?'selected':''}>Blancs / rouges en bas</option><option value="camp" ${rotationMode==='camp'?'selected':''}>Mon camp en bas</option><option value="turn" ${rotationMode==='turn'?'selected':''}>Tourner automatiquement à chaque tour</option></select></div>
 <div class="control-group"><label for="coordinates-option">Lettres et chiffres des cases</label><select id="coordinates-option" data-select="coordinates"><option value="yes" ${showCoordinates?'selected':''}>Afficher (A–H et 1–8, jusqu’à N14 à quatre)</option><option value="no" ${!showCoordinates?'selected':''}>Masquer</option></select></div>
 <div class="btn-row"><button class="btn sm teal" data-action="rotate-board">↻ Tourner de 90°</button><button class="btn sm outline" data-action="flip-board">⇵ Retourner de 180°</button><button class="btn sm outline" data-tab="play">Voir le plateau →</button></div><p class="note">Une rotation de 90° n’est possible que pour les plateaux carrés. Les pièces restent droites et les coordonnées tournent avec le plateau.</p></div><div class="card"><h3>🧠 Les deux IA</h3><p><button class="btn teal" data-action="toggle-network">Basculer en ligne / hors ligne</button></p><p><b>Sans réseau :</b> ton téléphone ou ordinateur calcule les déplacements lui-même. Pas de compte ni de serveur, et les parties fonctionnent sans internet après l’installation.</p><p><b>Avec réseau :</b> un serveur indépendant peut réfléchir à la place de ton appareil. Il faut lancer le serveur Node.js livré dans ce dossier, ou l’héberger sur internet.</p><div class="control-group"><label>Mode IA</label><select data-select="ai-mode"><option value="offline" ${aiMode==='offline'?'selected':''}>IA hors ligne (recommandée)</option><option value="online" ${aiMode==='online'?'selected':''}>IA sur serveur (réseau)</option></select></div><div class="control-group"><label>Adresse du serveur IA (facultatif)</label><input id="server-url" type="url" placeholder="https://mon-serveur.example.com" value="${E(serverUrl)}"></div><div class="btn-row"><button data-action="save-server" class="btn blue">Enregistrer l’adresse</button><button data-action="check-server" class="btn outline">Tester le serveur</button></div><p class="note">🎙️ <b>Commandes vocales :</b> bouton micro. Essaie « jouer à quatre », « conseil », « règles », « sauvegarder » ou « entraînement ». La reconnaissance vocale n’est pas disponible sur tous les appareils et peut nécessiter Internet.</p><button class="btn blue" data-action="voice-ask">🎙️ Parler au professeur</button><p class="subtle" style="margin-top:13px">Le moteur en ligne fourni effectue des calculs de coups, pas une conversation avec un grand modèle de langage. Aucun service externe n’est activé par défaut.</p></div>
 <div class="card"><h3>📲 Installer sur ton appareil</h3><p><b>iPhone :</b> ouvre l’adresse HTTPS dans Safari → Partager → « Sur l’écran d’accueil ».</p><p><b>Android :</b> ouvre l’adresse HTTPS dans Chrome → menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p><p><b>PC Windows / Mac :</b> ouvre dans Chrome ou Edge → « Installer » dans la barre d’adresse ; Safari sur Mac peut proposer « Ajouter au Dock » selon la version.</p><p class="note">Pour une véritable installation sur iPhone et Android, publie ce dossier sur un site HTTPS gratuit (par exemple GitHub Pages). L’ouverture d’un fichier HTML isolé sur téléphone ne suffit pas. La première visite nécessite internet, ensuite l’application est mise en cache.</p><button class="btn primary" data-action="install">⬇ Installer quand disponible</button><hr><h3>🧾 Mes progrès</h3><p>${stats.lessons} exercices · ${stats.quizzes} bonnes réponses</p><button data-action="reset-stats" class="btn outline sm">Remettre les progrès à zéro</button></div>
 <div class="card"><h3>🔐 Vie privée</h3><p>Les parties et la progression sont enregistrées dans le navigateur de l’appareil. Hors connexion, aucune position n’est transmise. En mode serveur, l’état du jeu est envoyé uniquement à l’adresse que tu as configurée.</p><p>Pas de compte à créer, pas de publicité ni de suivi intégré.</p></div><div class="card"><h3>📚 Documents importés</h3><p>L’application est élaborée à partir des deux PDF fournis. Tu peux les ouvrir et les imprimer.</p><div class="btn-row"><a href="docs/Regles_4_joueurs.pdf" target="_blank" class="btn outline">Échecs à 4</a><a href="docs/Guide_M800.pdf" target="_blank" class="btn outline">Millennium M800</a><a href="docs/Notice_V24_A4.pdf" target="_blank" class="btn outline">Notice V2.4</a></div></div></div>`;}
function handleAction(action){
 if(action==='start-four'){start('chess4');return;}
 if(action==='toggle-network'){aiMode=aiMode==='offline'?'online':'offline';save();render();toast(aiMode==='online'?(serverUrl?'Mode réseau sélectionné.':'Mode réseau sélectionné : serveur non configuré, l’IA restera locale.'):'Mode hors ligne : IA locale activée.');return;}
 if(action==='atelier-analyse'){const input=document.getElementById('atelier-comment');const raw=input?.value||'';try{const result=analyseComment(raw);atelierCurrent={...result,date:new Date().toISOString(),status:'à examiner'};feedbackHistory.push(atelierCurrent);feedbackHistory=feedbackHistory.slice(-60);save();render();}catch(e){toast(e.message);}return;}
 if(action==='toggle-immersive'){toggleImmersive();return;}
 if(action==='toggle-game-options'){gameOptionsOpen=!gameOptionsOpen;render();return;}
 if(action==='toggle-contrast'){highContrast=!highContrast;save();render();return;}
 if(action==='toggle-real3d'){real3D=!real3D;save();render();toast(real3D?'Vraie 3D activée : glisse pour tourner la caméra.':'Retour à la vue classique.');return;}
 if(action==='reset-3d-camera'){threeBoard?.resetCamera();return;}
 if(action==='rotate-board'){const g=tab==='train'?practice?.game:game;const rect=g?.kind==='mini'&&g.board&&g.board.length!==g.board[0].length;rotationMode='manual';boardRotation=(gameRotation(g)+(rect?2:1))%4;save();render();return;}
 if(action==='flip-board'){const g=tab==='train'?practice?.game:game;boardRotation=(gameRotation(g)+2)%4;rotationMode='manual';save();render();return;}
 if(action==='toggle-coordinates'){showCoordinates=!showCoordinates;save();render();toast(showCoordinates?'Coordonnées affichées.':'Coordonnées masquées.');return;}
 if(action==='cycle-perspective'){viewMode=VIEW_MODES[(VIEW_MODES.indexOf(viewMode)+1)%VIEW_MODES.length];save();render();toast('Vue : '+(viewMode==='flat'?'2D':viewMode==='depth'?'3D inclinée':'3D immersive'));return;}
 if(action==='cycle-theme'){theme=THEME_IDS[(THEME_IDS.indexOf(theme)+1)%THEME_IDS.length];save();render();toast('Design : '+themeLabel(theme));return;}
 if(action==='show-designs'){gameOptionsOpen=!gameOptionsOpen;render();return;}
 if(action==='atelier-apply'){if(!atelierCurrent?.suggestion)return;const q=atelierCurrent.suggestion;if(!confirm('Appliquer ce réglage ? '+q.label+'\nLes parties enregistrées ne seront pas modifiées.'))return;if(q.kind==='theme')theme=q.value;if(q.kind==='level')level=q.value;if(q.kind==='aimode')aiMode=q.value;if(q.kind==='bigtext')bigText=q.value;atelierCurrent.status='réglage appliqué';save();render();toast('Réglage appliqué.');return;}
 if(action==='atelier-export'){exportFeedback();return;}
 if(action==='atelier-diagnostic'){runDiagnostic();return;}
 if(action==='atelier-update'){checkForUpdate();return;}
 if(action==='junior-next'){juniorIndex=(juniorIndex+1)%JUNIOR_CHALLENGES.length;render();return;}
 if(action==='coach'){const a=coachAdvice(game,level);miniInfo=a.text;spokenText=a.text;render();toast('Le professeur a préparé son conseil.');return;}
 if(action==='speak-coach'){const a=coachAdvice(game,level);miniInfo=a.text;spokenText=a.text;render();speak(a.text);return;}
 if(action==='lesson-read'){speak(LESSONS[lessonIndex][1]);return;}
 if(action==='voice-ask'){startVoiceCommand();return;}
 if(action==='path-home'){pathActive=null;pathAnswer=null;pathWrong=false;pathValidated=false;render();return;}
 if(action==='path-next'){nextPathLevel();return;}
 if(action==='path-read'){
  const m=pathModule(pathActive),step=m?.steps[pathLevel];if(step){const c=step.type==='course'?COURSES[step.index]:step;speak(c.lesson);}
  return;
 }
 if(action==='path-retry'){
  if(pathValidated)return;
  pathAnswer=null;pathWrong=false;pathValidated=false;
  const step=pathModule(pathActive)?.steps[pathLevel];if(step?.type==='board'){practiceIndex=step.index;loadPractice();}render();return;
 }
 if(action==='academy-retry'){courseChoice=null;render();return;}
 if(action==='academy-next'){if(courseChoice===null||!courseResult(COURSES[courseIndex],courseChoice).correct)return toast('Réussis avant de continuer.');courseIndex=(courseIndex+1)%COURSES.length;courseChoice=null;render();return;}
 if(action==='academy-read'){speak(COURSES[courseIndex].lesson);return;}
 if(action==='ble-host'){startBLE('host');return;}
 if(action==='ble-join'){startBLE('join');return;}
 if(action==='ble-send'){sendChat('bluetooth');return;}
 if(action==='ble-leave'){bleChat.close().catch(()=>{});bleActive=false;bleStatus='non connecté';render();return;}
 if(action==='chat-send'){sendChat(nearbyLive?'proximity':'online');return;}
 if(action==='nearby-host'){beginNearbyHost();return;}
 if(action==='nearby-join'){beginNearbyGuest();return;}
 if(action==='nearby-finish'){finishNearbyHost();return;}
 if(action==='nearby-share'){shareNearbySignal();return;}
 if(action==='nearby-copy'){copyNearbySignal();return;}
 if(action==='nearby-leave'){leaveNearby();return;}
 if(action==='lesson-next'){lessonIndex=(lessonIndex+1)%LESSONS.length;render();return;}
 if(action==='update-app'){checkForUpdate();return;}
 if(action==='backup-export'){exportBackup(true);return;}
 if(action==='backup-download'){exportBackup(false);return;}
 if(action==='save-game'){manualSave();return;}
 if(action==='load-save'){goto('settings');return;}
 if(action==='leave-room'){leaveRoom();return;}
 if(action==='room-refresh'){refreshRoom(true);return;}
 if(action==='room-resume'){if(roomSession){offlineGame=game;roomLive=true;tab='play';refreshRoom(true);}return;}
 if(action==='room-create4'){createRemote('chess4');return;}
 if(action==='room-create2'){createRemote('chess2');return;}
 if(action==='room-join'){joinRemote();return;}
 if(action==='extra-new'){extraGame=newExtra(extraGame.id);bonusAdvice='';save();render();return;}
 if(action==='extra-hint'){bonusAdvice=extraGame.id==='tictactoe'?'Cherche d’abord une ligne avec deux de tes symboles. Si l’IA en a deux, bloque la troisième case. Le centre et les coins sont souvent utiles.':'Mémorise les images et leurs positions. Retourne d’abord les cartes que tu n’as jamais vues, puis tente une paire quand tu connais les deux emplacements.';render();return;}
 if(action==='extra-memory-hide'){extraGame=hideUnmatched(extraGame);save();render();return;}

 if(action==='undo'){if(nearbyLive)return toast('Impossible d’annuler une partie synchronisée à deux.');if(roomLive)return toast('On ne peut pas annuler un coup déjà envoyé aux amis.');
  if(!game)return;let n=game.kind==='chess'?undo(game):undoMini(game);
  if(!n)return toast('Aucun coup à annuler.');
  // Revenir jusqu’au tour d’un humain, si l’IA a déjà joué.
  while(n.history?.length&&n.kind==='chess'&&controllers[n.colors[n.turn]]==='bot'){const prev=undo(n);if(!prev)break;n=prev;}
  while(n.history?.length&&n.kind==='mini'&&controllers[n.turn===0?'A':'B']==='bot'){const prev=undoMini(n);if(!prev)break;n=prev;}
  cancelBot();game=n;selected=null;save();render();queueBot();return;
 }
 if(action==='hint'){
  if(!game||game.over)return;
  if(!isHuman())return toast('Le conseil concerne le joueur dont c’est le tour.');
  const m=game.kind==='chess'?botChess(game,3):botMini(game,3);
  miniInfo=m?(game.kind==='chess'?moveText(game,m):game.id==='nim'?`Pile ${m.pile+1}, retire ${m.count} pion(s).`:game.id==='connect4'?`Joue dans la colonne ${m.col+1}.`:game.id==='reversi'?`Pose un pion sur ${String.fromCharCode(65+m.c)}${8-m.r}.`:`Départ ${String.fromCharCode(65+m.from.c)}${8-m.from.r} → arrivée ${String.fromCharCode(65+m.to.c)}${8-m.to.r}.`):'Aucun coup possible.';render();return;
 }
 if(action==='zoom'){zoom=!zoom;render();return;}
 if(action==='new-game'){if(nearbyLive)return toast('Quitte la connexion de proximité pour créer une nouvelle partie.');if(roomLive)return toast('Pour relancer la partie en ligne, crée un nouveau salon.');start(kind());return;}
 if(action==='end-chain'){game=finishChain(game);save();render();queueBot();return;}
 if(action==='training-next'){if(practiceResult!=='correct')return toast('Réussis ce défi pour passer au suivant.');practiceIndex++;loadPractice();render();return;}
 if(action==='training-hint'){const f=practice.expected.from;trainingSelected={...f};render();toast(`Regarde les cases vertes : commence par ${String.fromCharCode(65+f.c)}${practice.game.size-f.r}.`);return;}
 if(action==='training-solution'){const m=practice.expected;practiceResult='';trainingSelected={...m.from};render();toast(`${String.fromCharCode(65+m.from.c)}${practice.game.size-m.from.r} → ${String.fromCharCode(65+m.to.c)}${practice.game.size-m.to.r} : ${practice.why}`);return;}
 if(action==='quiz-next'){if(quizAnswered!==QUIZZES[quizIndex%QUIZZES.length][2])return toast('Réussis la question avant de continuer.');quizIndex++;quizAnswered=null;render();return;}
 if(action==='save-server'){const input=document.getElementById('server-url');const v=input.value.trim().replace(/\/$/,'');if(v&&!/^https?:\/\//.test(v))return toast('L’adresse doit commencer par https:// ou http://');serverUrl=v;save();toast('Adresse du serveur enregistrée.');return;}
 if(action==='check-server'){checkServer();return;}
 if(action==='reset-stats'){if(confirm('Remettre les résultats historiques à zéro ?')){stats={lessons:0,quizzes:0,xp:0};save();render();}return;}
 if(action==='install'){if(installEvent){installEvent.prompt();installEvent=null;}else toast('Ouvre depuis HTTPS puis utilise le menu « Installer » de ton navigateur.');return;}
}
async function checkServer(){const v=document.getElementById('server-url')?.value.trim()||serverUrl;if(!v)return toast('Indique d’abord une adresse de serveur.');
 try{const c=new AbortController(),timeout=setTimeout(()=>c.abort(),5000);let r=await fetch(v.replace(/\/$/,'')+'/api/health',{signal:c.signal});clearTimeout(timeout);if(!r.ok)throw Error('Erreur HTTP '+r.status);const data=await r.json();toast(data.ok?'Serveur IA connecté !':'Réponse du serveur inattendue');}catch(e){toast('Serveur non accessible : '+e.message);}}

/* V2.2 : exportation et restauration non destructive des données. */
function readLocalBackupData(){
 const values={};for(const key of BACKUP_KEYS){try{const raw=localStorage.getItem(key);if(raw!==null)values[key]=JSON.parse(raw);}catch{}}
 return values;
}
function backupFile(){
 save();const pack=makeBackup(readLocalBackupData());
 const date=new Date().toISOString().slice(0,10);
 return new File([JSON.stringify(pack,null,2)],'Echecs_Jeux_IA_sauvegarde_'+date+'.json',{type:'application/json'});
}
async function exportBackup(share=true){
 let file;try{file=backupFile();}catch(e){toast('Impossible de créer la sauvegarde : '+e.message);return;}
 if(share&&navigator.share&&navigator.canShare?.({files:[file]})){
   try{await navigator.share({files:[file],title:'Sauvegarde Échecs & Jeux IA'});toast('Enregistre le fichier dans Fichiers pour le conserver.');return;}
   catch(e){if(e.name==='AbortError')return;}
 }
 const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
 toast('Fichier JSON préparé. Vérifie son enregistrement dans Fichiers.');
}
async function importBackupFile(file){
 if(!file)return;
 if(file.size>10_000_000){toast('Sauvegarde trop volumineuse.');return;}
 let pack,result;
 try{pack=readBackup(await file.text());result=mergeBackup(readLocalBackupData(),pack);}
 catch(e){alert('Import impossible : '+e.message);return;}
 const description='Sauvegarde du '+new Date(pack.createdAt).toLocaleString('fr-FR')+'\n'+result.notes.join('\n')+'\n\nFusionner ces données dans cette application ? La partie actuelle ne sera pas effacée.';
 if(!confirm(description))return;
 // Restaurer les anciennes valeurs si le stockage est plein ou l'écriture échoue.
 const before=Object.fromEntries(BACKUP_KEYS.map(k=>[k,localStorage.getItem(k)]));
 try{
  for(const k of BACKUP_KEYS){if(Object.prototype.hasOwnProperty.call(result.data,k))localStorage.setItem(k,JSON.stringify(result.data[k]));}
 }catch(e){
   for(const k of BACKUP_KEYS){try{if(before[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,before[k]);}catch{}}
   alert('Espace de stockage insuffisant ou accès refusé : aucune restauration n’a été confirmée. Conserve ton fichier JSON.');return;
 }
 // Recharge les états en mémoire après la validation de l'import.
 cancelBot();if(!roomLive)game=store.get('jeu-v1',game);
 saveSlots=store.get('v2-saves',[]);stats=store.get('stats',stats);aiStyle=store.get('v23-ai-style',aiStyle);courseProgress=store.get('v23-courses',courseProgress);academyProgress=cleanPathProgress(store.get('v27-academy-progress',academyProgress));bigText=store.get('v24-bigtext',bigText);juniorDone=store.get('v24-junior-done',juniorDone);
 fourMode=store.get('fourmode',fourMode);level=store.get('level',level);aiMode=store.get('aimode',aiMode);
 controllers=store.get('players',controllers);theme=store.get('v2-theme',theme);extraGame=store.get('v2-extra',extraGame);
 render();alert('Sauvegarde importée. '+result.notes.join(' '));
}
/* NOUVEAUTÉS V2 : éducateur, sauvegardes, nouveaux jeux, salons privés */
function startVoiceCommand(){
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SpeechRecognition){toast('Micro vocal non compatible ici. Le professeur peut toujours lire ses conseils.');return;}
 try{
  const recog=new SpeechRecognition();recog.lang='fr-FR';recog.interimResults=false;recog.maxAlternatives=1;
  recog.onresult=event=>{
   const spoken=(event.results?.[0]?.[0]?.transcript||'').toLocaleLowerCase('fr');
   if(/(quatre|4) joueurs?/.test(spoken)||/jouer .{0,12} quatre/.test(spoken)){start('chess4');speak('Une partie à quatre est prête.');}
   else if(/(classique|deux joueurs)/.test(spoken)){start('chess2');speak('Une partie d’échecs classiques est prête.');}
   else if(/conseil|aide/.test(spoken)){handleAction('speak-coach');}
   else if(/sauve|enregistrer/.test(spoken)){manualSave();}
   else if(/règle/.test(spoken)){goto('rules');speak('Voici les règles du jeu.');}
   else if(/entraîn|exercice|leçon/.test(spoken)){goto('train');speak('Bienvenue dans ton entraînement.');}
   else if(/morpion/.test(spoken)){extraGame=newExtra('tictactoe');goto('extras');}
   else if(/ami/.test(spoken)){goto('friends');}
   else{toast('Commande non reconnue : '+spoken.slice(0,45));}
  };
  recog.onerror=()=>toast('Reconnaissance vocale indisponible.');
  recog.start();toast('Je t’écoute : parle maintenant…');
 }catch{toast('Impossible de démarrer le micro sur cet appareil.');}
}
function speak(text){
 if(!('speechSynthesis' in window))return toast('Lecture vocale indisponible sur cet appareil.');
 window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=.88;u.pitch=1;
 const fr=window.speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith('fr'));
 if(fr)u.voice=fr;window.speechSynthesis.speak(u);
}
function manualSave(){
 if(!game)return toast('Commence une partie avant de la sauvegarder.');
 if(roomLive)return toast('Les coups des salons sont conservés temporairement sur le serveur.');
 const name=prompt('Nom de la sauvegarde :', 'Ma partie '+new Date().toLocaleDateString('fr-FR'));
 if(name===null)return;
 const savedGame=JSON.parse(JSON.stringify(game));if(savedGame.history?.length>8)savedGame.history=savedGame.history.slice(-8);saveSlots.unshift({id:String(Date.now()),name:String(name).trim().slice(0,45)||'Partie',when:new Date().toISOString(),game:savedGame});
 saveSlots=saveSlots.slice(0,8);save();toast('Partie sauvegardée !');
}
function loadSlot(id){const entry=saveSlots.find(x=>x.id===id);if(!entry)return toast('Sauvegarde introuvable.');
 if(!confirm('Remplacer la partie actuelle par « '+entry.name+' » ?'))return;
 if(roomLive){roomLive=false;roomData=null;}cancelBot();game=JSON.parse(JSON.stringify(entry.game));selected=null;save();goto('play');
}
function deleteSlot(id){if(!confirm('Supprimer définitivement cette sauvegarde ?'))return;saveSlots=saveSlots.filter(x=>x.id!==id);save();render();}
function renderExtras(){const g=extraGame;
 let board='';
 if(g.id==='tictactoe')board=`<div class="extra-grid tic-grid">${g.board.map((v,i)=>`<button class="extra-cell" data-extra-cell="${i}" ${g.over||v?'disabled':''}>${v||'·'}</button>`).join('')}</div><p class="note">${g.over?g.over==='draw'?'Partie nulle !':g.over==='X'?'Bravo, tu gagnes !':'L’IA gagne cette fois. Essaie encore !':'Tu joues X et l’IA joue O. Trois symboles alignés gagnent.'}</p>`;
 else board=`<div class="extra-grid memory-grid">${g.cards.map((v,i)=>`<button class="extra-cell ${g.found.includes(i)?'found':''}" data-extra-cell="${i}" ${g.found.includes(i)||g.over||g.open.length===2?'disabled':''}>${g.open.includes(i)||g.found.includes(i)?v:'?'}</button>`).join('')}</div>${g.open.length===2?'<button class="btn teal" data-action="extra-memory-hide">Retourner les cartes cachées</button>':''}<p class="note">${g.over?`Bravo, 8 paires retrouvées en ${g.turns} essais !`:`${g.found.length/2} / 8 paires retrouvées · ${g.turns} essais`}</p>`;
 return `<div class="section-head"><div><div class="tag">Jeux bonus · 100 % sans connexion</div><h2>Deux nouveaux jeux</h2></div></div><div class="game-tabs">${EXTRA_GAMES.map(x=>`<button data-extra-start="${x.id}" class="${g.id===x.id?'active':''}">${x.emoji} ${x.name}</button>`).join('')}</div><div class="card bonus-game"><div class="scene-toolbar game-toolbar"><span>🎨 ${E(themeLabel(theme))}</span><button class="btn sm immersive-toggle" data-action="toggle-immersive" aria-pressed="${immersiveGame}">${immersiveGame?'⤢ Réduire':'⛶ Plein écran'}</button><button class="btn sm teal" data-action="toggle-game-options" aria-expanded="${gameOptionsOpen}" aria-controls="game-options">⚙ Options ${gameOptionsOpen?'▴':'▾'}</button><button class="btn sm ${real3D?'teal':'outline'}" data-action="toggle-real3d">${real3D?'▦ Vue 2D':'◈ Vue 3D 360°'}</button></div><div id="game-options">${renderGameOptions(false,true)}</div><h2>${EXTRA_GAMES.find(x=>x.id===g.id)?.name}</h2><div id="bonus-3d" class="board-3d-viewport" aria-label="Plateau de jeu bonus en 3D tactile"><div class="three-caption">◈ Véritable plateau volumétrique · 360°</div><div class="three-canvas-wrap"><canvas class="webgl-board" tabindex="0" aria-label="Jeu 3D interactif"></canvas><canvas class="webgl-labels" aria-hidden="true"></canvas></div><div class="three-controls"><button class="btn sm outline" data-action="reset-3d-camera">◎ Recentrer</button><span>Joue directement en 3D</span></div></div><div class="bonus-2d-alternative">${board}</div><p class="extra-3d-status">${g.id==='memory'?(g.over?'✅ Toutes les paires sont retrouvées !':`${g.found.length/2} / 8 paires retrouvées · ${g.turns} essais`):(g.over?g.over==='draw'?'Partie nulle.':g.over==='X'?'✅ Tu gagnes !':'L’IA gagne.':'Tu joues X contre l’IA locale.')}</p>${g.id==='memory'&&g.open.length===2?'<button class="btn teal extra-3d-only" data-action="extra-memory-hide">↶ Retourner les deux cartes</button>':''}<div class="btn-row"><button class="btn outline" data-action="extra-hint">💡 Conseil IA</button><button class="btn teal" data-action="extra-new">⟳ Recommencer</button><button class="btn outline" data-tab="home">Retour à l’accueil</button></div>${bonusAdvice?`<div class="explain">${E(bonusAdvice)}</div>`:''}</div>`;
}
function extraClick(index){let next=stepExtra(extraGame,index,level);if(!next)return;extraGame=next;save();render();}
function serverBase(){const typed=document.getElementById('friends-server')?.value.trim()||serverUrl;
 const base=typed.replace(/\/$/,'');if(!base||!/^https?:\/\//i.test(base))throw Error('Renseigne d’abord l’adresse HTTPS de ton serveur de jeu.');
 if(location.protocol==='https:'&&base.startsWith('http:')&&!base.startsWith('http://localhost'))throw Error('Une application HTTPS exige un serveur de jeu HTTPS.');
 serverUrl=base;save();return base;
}
async function roomPost(base,path,payload){const ctrl=new AbortController();const clock=setTimeout(()=>ctrl.abort(),8500);
 try{const res=await fetch(base+'/api/rooms/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal});const body=await res.json();if(!res.ok)throw Error(body.error||'Erreur serveur.');return body;}
 finally{clearTimeout(clock);}
}
function useRoom(response,base){
 if(!roomLive)offlineGame=game;roomSession={code:response.code,token:response.token||roomSession?.token,server:base};
 store.set('v2-room',roomSession);roomData=response;roomLive=true;game=response.game;selected=null;cancelBot();tab='play';render();
}
async function createRemote(type){if(nearbyLive)return toast('Quitte le jeu de proximité avant de lancer un salon Internet.');try{const base=serverBase();const name=(document.getElementById('friend-name')?.value||'Moi').trim();
 const response=await roomPost(base,'create',{type,mode:type==='chess4'?fourMode:'standard',name});useRoom(response,base);toast('Salon créé ! Partage uniquement le code, pas ton jeton secret.');
 }catch(e){toast(e.message);}}
async function joinRemote(){if(nearbyLive)return toast('Quitte le jeu de proximité avant de rejoindre un salon Internet.');try{const base=serverBase(),code=(document.getElementById('friend-code')?.value||'').trim().toUpperCase();
 if(!/^[A-Z2-9]{5}$/.test(code))throw Error('Le code doit contenir 5 caractères.');
 const name=(document.getElementById('friend-name')?.value||'Ami').trim();
 const response=await roomPost(base,'join',{code,name});useRoom(response,base);toast('Tu as rejoint le salon !');
 }catch(e){toast(e.message);}}
async function refreshRoom(loud=false){if(!roomSession||roomUpdating)return;roomUpdating=true;
 try{const r=await roomPost(roomSession.server,'state',{code:roomSession.code,token:roomSession.token});const changed=!roomData||r.updated!==roomData.updated||r.started!==roomData.started;
 roomData=r;if(roomLive&&changed){game=r.game;selected=null;render();}else if(tab==='friends'&&changed)render();if(loud)toast('Salon synchronisé.');
 }catch(e){if(loud)toast('Connexion au salon impossible : '+e.message);}finally{roomUpdating=false;}
}
async function sendRoomMove(move){if(!roomLive||!roomSession)return;
 try{const response=await roomPost(roomSession.server,'move',{code:roomSession.code,token:roomSession.token,move});roomData=response;game=response.game;selected=null;render();}
 catch(e){toast('Coup non envoyé : '+e.message);await refreshRoom(false);}}
function leaveRoom(){if(roomLive){roomLive=false;roomData=null;game=offlineGame;save();}tab='friends';render();}
function renderFriends(){const saved=roomSession,room=roomData;
 return `<div class="section-head"><div><div class="tag">Multijoueur privé · nécessite un serveur Node.js HTTPS</div><h2>Jouer avec mes amis</h2></div></div><div class="settings-grid"><div class="card"><h3>📶 À proximité, sans serveur</h3><p>Deux joueurs peuvent essayer de se connecter directement sur le <b>même Wi-Fi</b> ou point d’accès local, même sans accès Internet. Un appareil crée une invitation, l’autre répond. Échangez les codes via Partager/AirDrop ou une autre méthode disponible ; les codes peuvent être longs.</p><p class="note"><b>Ce n’est pas du Bluetooth :</b> les applications web d’iPhone ne savent pas établir une partie Bluetooth directe. L’établissement WebRTC dépend du navigateur et du réseau ; il peut échouer, même sur le même Wi-Fi.</p><div class="control-group"><label>Choisir la partie de proximité</label><select id="nearby-mode"><option value="chess2">Échecs à 2 joueurs (un par appareil)</option><option value="chess4">Échecs à 4 (deux humains + deux IA chez l’hôte)</option></select></div><div class="btn-row"><button class="btn teal" data-action="nearby-host">1. Créer une invitation</button><button class="btn blue" data-action="nearby-join">2. Répondre à une invitation</button></div><p><b>Connexion :</b> ${E(nearbyStatus)} ${nearbyLive?'✅':''}</p>${nearbySignal?`<label>Code à transmettre à ton ami</label><textarea id="nearby-out" rows="3" readonly>${E(nearbySignal)}</textarea><div class="btn-row"><button class="btn sm teal" data-action="nearby-share">↗ Partager le code</button><button class="btn sm outline" data-action="nearby-copy">Copier le code</button></div>`:''}<label for="nearby-in">Coller ici le code reçu</label><textarea id="nearby-in" rows="3" placeholder="Code EJIA23:…"></textarea><div class="btn-row"><button class="btn sm blue" data-action="nearby-finish">3. Terminer côté hôte</button><button class="btn sm outline" data-action="nearby-leave">Quitter la proximité</button></div><p class="subtle">Pour la création : partage l’invitation. Pour rejoindre : colle l’invitation puis appuie sur « Répondre ». Renvoie le code de réponse à l’hôte, qui le colle et appuie sur « Terminer ».</p></div><div class="card"><h3>🌍 Héberger ou rejoindre</h3><p>Joue à deux aux échecs classiques ou à quatre avec les couleurs rouge, bleu, jaune, vert. Chaque personne joue depuis son propre téléphone ou ordinateur.</p>
 <div class="control-group"><label>Adresse du serveur de jeu HTTPS</label><input id="friends-server" type="url" placeholder="https://mon-serveur-de-jeux.exemple" value="${E(serverUrl)}"></div>
 <div class="control-group"><label>Ton prénom ou pseudonyme</label><input id="friend-name" maxlength="24" placeholder="Joueur"></div>
 <div class="btn-row"><button class="btn teal" data-action="room-create4">Créer une partie à 4</button><button class="btn blue" data-action="room-create2">Créer une partie à 2</button></div>
 <hr><div class="control-group"><label>Code du salon d’un ami (5 caractères)</label><input id="friend-code" maxlength="5" placeholder="ABCDE" autocapitalize="characters"></div><button class="btn primary" data-action="room-join">Rejoindre le salon</button>
 </div><div class="card"><h3>🔐 Salon et sécurité</h3>${saved?`<p>Salon mémorisé : <b>${E(saved.code)}</b></p><div class="btn-row"><button class="btn teal" data-action="room-resume">Reprendre mon salon</button><button class="btn outline" data-action="room-refresh">Actualiser</button>${roomLive?'<button class="btn outline" data-action="leave-room">Retour à mes parties locales</button>':''}</div>`:'<p>Aucun salon mémorisé sur cet appareil.</p>'}
 ${room?`<p>Joueurs : ${room.players.length} / ${room.total}${room.started?' · Partie en cours':' · En attente'}</p><p>${room.players.map(p=>`${E(labels[p.seat])}: ${E(p.name)}`).join(' · ')}</p>`:''}
 <p class="note">Les salons fonctionnent uniquement avec le serveur Node.js fourni, hébergé séparément. Ton site Netlify actuel n’héberge pas ces salons. Le serveur garde les parties temporairement en mémoire : un redémarrage les efface. N’échange avec les amis que le code du salon, jamais le jeton privé.</p>
 <p class="subtle">Aucun compte ni messagerie vocale. Les pièces et les coups sont validés côté serveur. Le moteur à 4 joueurs reste une adaptation pédagogique de Chess.com.</p></div>${renderChatPanel()}</div>`;
}

function renderChatPanel(){
 const webChat=roomData?.chat||[];
 const chat=nearbyLive?localChat.filter(m=>m.mode==='proximity'):webChat;
 const rows=(items)=>items.length?items.map(m=>`<div class="chat-message"><b>${E(m.name||labels[m.seat]||'Ami')}</b><p>${E(m.text)}</p></div>`).join(''):'<p class="subtle">Aucun message pour le moment.</p>';
 return `<div class="card chat-card"><h3>💬 Chat entre joueurs</h3>
 <p>En ligne : salon privé avec serveur. À proximité : connexion WebRTC locale. Les messages ne sont pas un réseau social et ne sont pas conservés dans le cloud.</p>
 <div class="chat-messages" aria-live="polite">${rows(chat)}</div>
 <label for="chat-text">Écrire à ton ami</label><input id="chat-text" maxlength="160" placeholder="Ton message (160 caractères)" autocomplete="off" aria-label="Ton message">
 <button class="btn teal" data-action="chat-send" ${!(nearbyLive||roomLive)?'disabled':''}>Envoyer dans ${nearbyLive?'la proximité':'le salon'}</button>
 <p class="subtle">Pour activer ce chat, connecte d’abord deux joueurs via le mode proximité ou un salon Internet.</p>
 </div>
 <div class="card chat-card"><h3>ᛒ Chat Bluetooth natif (prototype)</h3><p>Sur iPhone ou Android, cette fonction exige l’application native compilée et les autorisations Bluetooth. Elle ne fonctionne pas dans la version Netlify, Safari ou Brave.</p>
 <p><b>Disponibilité :</b> ${bleChat.available?'🟢 Pont natif détecté':'⚪ Version web : Bluetooth indisponible'} · ${E(bleStatus)}</p>
 <div class="btn-row"><button class="btn teal" data-action="ble-host" ${!bleChat.available?'disabled':''}>Créer la liaison</button><button class="btn blue" data-action="ble-join" ${!bleChat.available?'disabled':''}>Rejoindre un appareil</button><button class="btn outline" data-action="ble-leave" ${!bleChat.available?'disabled':''}>Déconnecter</button></div>
 <div class="chat-messages">${rows(localChat.filter(m=>m.mode==='bluetooth'))}</div>
 <label for="ble-chat-text">Message Bluetooth</label><input id="ble-chat-text" maxlength="160" placeholder="Bonjour !" autocomplete="off">
 <button class="btn teal" data-action="ble-send" ${!bleChat.available?'disabled':''}>Envoyer via Bluetooth</button>
 <p class="note">Bêta non validée sur deux appareils réels. Ne transmets pas de données sensibles par ce canal.</p>
 </div>`;
}
async function startBLE(role){
 try{
  if(!bleChat.available)throw Error('Installe la version native iPhone/Android : Netlify ne donne pas accès au Bluetooth direct.');
  if(!bleActive){await bleChat.init();bleActive=true;}
  if(role==='host')await bleChat.host();else await bleChat.join();
  bleStatus=role==='host'?'En attente d’un appareil à proximité…':'Recherche de ton ami…';render();
 }catch(e){bleStatus='Erreur : '+e.message;render();}
}
async function sendChat(mode){
 try{
  const id=mode==='bluetooth'?'ble-chat-text':'chat-text';const input=document.getElementById(id);
  const text=input?.value.trim();if(!text)throw Error('Écris un message.');
  if(Array.from(text).length>160)throw Error('160 caractères maximum.');
  if(mode==='bluetooth'){await bleChat.send(text);appendChat('Moi',text,'bluetooth');}
  else if(mode==='proximity'){
   if(!nearbyLive||!nearby.send({type:'chat',text}))throw Error('Aucun ami connecté.');
   appendChat('Moi',text,'proximity');
  }else{
   if(!roomSession||!roomLive)throw Error('Rejoins un salon Internet.');
   const result=await roomPost(roomSession.server,'chat',{code:roomSession.code,token:roomSession.token,text});roomData=result;
  }
  render();toast('Message envoyé.');
 }catch(e){toast(e.message);}
}

function renderAcademy(){
 const c=COURSES[courseIndex],result=courseChoice===null?null:courseResult(c,courseChoice);
 return `<div class="card"><div class="tag">Académie du mentor · chapitre ${courseIndex+1} / ${COURSES.length} · ${E(c.level)}</div><h2>👑 ${E(c.title)}</h2><p>${E(c.lesson)}</p><button class="btn outline sm" data-action="academy-read">🔊 Écouter la leçon</button><hr><h3>${E(c.q)}</h3><div class="exercise-actions">${c.options.map((opt,i)=>`<button class="btn ${courseChoice===i?'teal':'outline'}" data-academy-answer="${i}" ${courseChoice!==null?'disabled':''}>${E(opt)}</button>`).join('')}</div>${result?`<p class="note"><b>${result.correct?'Niveau validé !':'Réessaie pour valider ce chapitre.'}</b> ${E(result.explanation)}</p>${result.correct?'<button class="btn teal" data-action="academy-next">Chapitre suivant →</button>':'<button class="btn outline" data-action="academy-retry">↻ Réessayer</button>'}`:''}<hr><p>Chapitres maîtrisés : <b>${courseProgress.length}/${COURSES.length}</b>. Le contenu est original, inspiré du concept de professeur virtuel, sans reprendre le logiciel Chessmaster.</p></div>`;
}
/* V2.4 : activités originales, reprenant des thèmes de la revue FFE, pas ses diagrammes. */
const JUNIOR_CHALLENGES=[
 {title:'Le roi doit être en sécurité',theme:'Défense du roi',exercise:0,why:'Observe le roi avant de jouer.'},
 {title:'Gagner une pièce',theme:'Capture utile',exercise:6,why:'Le pion peut capturer en diagonale.'},
 {title:'Le cavalier malin',theme:'Déplacement tactique',exercise:3,why:'Le cavalier saute en L.'},
 {title:'La force des lignes',theme:'Attaque à la tour',exercise:1,why:'La tour utilise une rangée ou une colonne.'},
 {title:'L’attaque du fou',theme:'Contrôle des diagonales',exercise:2,why:'Repère une diagonale libre.'},
 {title:'Échecs à quatre',theme:'Repérer les captures',exercise:8,why:'Une tour peut capturer un adversaire dans le jeu à quatre.'},
 {title:'Un mat simple',theme:'Échec et mat',exercise:7,why:'Défends ta dame et enlève les cases de fuite du roi.'},
];
function renderJunior(){return `<div class="section-head"><div><div class="tag">Magazine → Jeu · création pédagogique originale</div><h2>📗 Atelier Échec & Mat Junior</h2></div><div class="pill green">${juniorDone.length} réussite(s)</div></div>
 <div class="card"><p>Les défis utilisent les <b>thèmes</b> de la revue jeunesse de la Fédération Française des Échecs : sécurité du roi, attaques, captures, déplacements et mats. Les positions sont <b>créées pour cette application</b>, et ne sont pas la transcription des diagrammes de la revue.</p><p><a href="https://www.echecs.asso.fr/revues.aspx" target="_blank" rel="noopener">📖 Voir les magazines officiels gratuits sur le site de la FFE (Internet nécessaire)</a></p><p class="note">Les défis ci-dessous sont intégrés : joue avec les pièces sur l’échiquier, même en mode avion.</p></div>
 <div class="grid-cards">${JUNIOR_CHALLENGES.map((j,i)=>`<button class="gamecard" data-junior-challenge="${i}"><span class="emoji">${juniorDone.includes(j.exercise)?'✅':'🎯'}</span><strong>${E(j.title)}</strong><small>${E(j.theme)} · ${E(j.why)}</small></button>`).join('')}</div>`;}
function renderAtelier(){const q=atelierCurrent?.suggestion;
 return `<div class="section-head"><div><div class="tag">Ton assistant local · sans réseau</div><h2>🛠️ Assistante de réparation & améliorations</h2></div></div>
 <div class="settings-grid"><div class="card"><h3>💬 Propose une amélioration</h3><p>Écris ce que tu souhaites changer. L'assistante classe ton idée et peut proposer un <b>réglage existant</b>. Elle ne modifie pas le code automatiquement.</p><label for="atelier-comment">Ton commentaire</label><textarea id="atelier-comment" class="atelier-textarea" maxlength="1200" placeholder="Ex. Je voudrais une IA plus forte, un échiquier en bois, ou des exercices supplémentaires…"></textarea><div class="btn-row"><button class="btn teal" data-action="atelier-analyse">🤖 Analyser ma demande</button><button class="btn outline" data-action="atelier-export">📤 Exporter mes idées</button></div>
 ${atelierCurrent?`<div class="explain"><b>${E(atelierCurrent.categoryLabel)}</b><p>${E(atelierCurrent.response)}</p>${q?`<p>Action proposée : <b>${E(q.label)}</b></p><button class="btn blue" data-action="atelier-apply">✅ Autoriser ce réglage</button>`:'<p>Cette amélioration nécessite de modifier le code dans une future version. Elle reste enregistrée sur ton appareil jusqu’à ton export.</p>'}</div>`:''}<p class="subtle">Aucun commentaire n’est envoyé automatiquement à ChatGPT ni à Netlify. Exporter un fichier permet de transmettre les demandes à un développeur pour validation, modification du code, tests et publication.</p></div>
 <div class="card"><h3>🩺 Diagnostiquer mon application</h3><p>L'assistante vérifie si Internet, le stockage local et le système de mise à jour sont disponibles. Elle n’efface aucune sauvegarde.</p><div class="btn-row"><button class="btn teal" data-action="atelier-diagnostic">🔎 Lancer le diagnostic</button><button class="btn outline" data-action="backup-export">💾 Sauvegarder avant correction</button></div>${diagResults.length?`<div class="diagnostic-list">${diagResults.map(x=>`<div class="diagnostic-item"><strong>${x.ok?'✅':'⚠️'} ${E(x.titre)}</strong><small>${E(x.detail)}</small></div>`).join('')}</div>`:''}<button class="btn blue" data-action="atelier-update">🔄 Vérifier une mise à jour (Internet)</button><p class="note">Le diagnostic est un assistant local par règles, pas un service de réparation autonome. Une erreur de programmation complexe devra être corrigée dans une nouvelle version.</p></div>
 <div class="card"><h3>🗳️ Mes demandes enregistrées (${feedbackHistory.length})</h3>${feedbackHistory.length?`<div class="diagnostic-list">${feedbackHistory.slice(-10).reverse().map(it=>`<div class="diagnostic-item"><strong>${E(it.categoryLabel||'Idée')}</strong><small>${E(it.message)} · ${E(it.status)}</small></div>`).join('')}</div>`:'<p>Aucune idée pour le moment.</p>'}<button class="btn outline" data-action="atelier-export">⬇ Exporter pour une future mise à jour</button></div>
 <div class="card"><h3>🔐 Ton accord reste obligatoire</h3><p>Réglages simples : proposés puis appliqués après confirmation. Nouvelles règles, IA, interface et jeux : préparés comme demandes à examiner, sans exécuter de code fourni par un commentaire.</p><p>L’assistante n’a pas accès à ton compte Netlify, ne publie pas ton site et ne peut pas créer automatiquement une nouvelle version.</p></div></div>`;
}
async function runDiagnostic(){let storage=false,sw=false;
 try{const key='ejia24-diagnostic-temp';localStorage.setItem(key,'ok');storage=localStorage.getItem(key)==='ok';localStorage.removeItem(key);}catch{}
 sw=!!navigator.serviceWorker;
 diagResults=diagnosticLocal({online:navigator.onLine,serviceWorker:sw,storage,serverUrl,mode:aiMode});render();
}
async function exportFeedback(){if(!feedbackHistory.length)return toast('Écris d’abord un commentaire.');const report=buildChangeRequest(feedbackHistory),file=new File([JSON.stringify(report,null,2)],'Echecs_Jeux_IA_idees_V24.json',{type:'application/json'});
 if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Mes idées pour Échecs & Jeux IA'});return;}catch(e){if(e.name==='AbortError')return;}}
 const u=URL.createObjectURL(file),link=document.createElement('a');link.href=u;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);toast('Fichier d’idées préparé : conserve-le dans Fichiers.');
}

function onNearbyStatus(status){
 nearbyStatus=status==='connected'?'Connecté à ton ami':status==='disconnected'?'Connexion interrompue':status==='failed'?'Impossible de se connecter':status;
 if(status==='connected'&&nearby.channel?.readyState!=='open'){nearbyStatus='Ouverture du canal de jeu…';render();return;}
 if(status==='connected'&&nearbyRole==='host'){
  if(nearbyLive)return;
  nearbySavedGame=game;nearbyLive=true;
  game=newChess(nearbyMode,nearbyMode==='chess4'?fourMode:'standard');
  nearby.send({type:'hello',mode:nearbyMode,game});tab='play';cancelBot();render();queueBot();return;
 }
 if(status==='connected'&&nearbyRole==='guest'){if(!nearbyLive)nearbySavedGame=game;nearbyLive=true;tab='play';}
 if(['disconnected','failed','closed'].includes(status))nearbyLive=false;
 render();
}
function onNearbyMessage(msg){
 if(!msg||typeof msg!=='object')return;
 if(nearbyRole==='guest'&&(['hello','state'].includes(msg.type))){
  if(msg.game?.kind!=='chess'||!['chess2','chess4'].includes(msg.game.type))return;
  nearbyLive=true;game=msg.game;cancelBot();selected=null;tab='play';render();return;
 }
 if(nearbyRole==='host'&&nearbyLive&&msg.type==='move'){
  if(game?.kind!=='chess'||game.over)return;
  if(game.colors[game.turn]!== (game.type==='chess4'?'blue':'black')){nearby.send({type:'error',text:'Attends ton tour.'});return;}
  const next=playMove(game,msg.move);
  if(!next){nearby.send({type:'error',text:'Coup interdit.'});return;}
  game=next;selected=null;save();nearby.send({type:'state',game});render();queueBot();
 }
 if(msg.type==='chat'&&typeof msg.text==='string'&&msg.text.trim().length<=160){appendChat('Ami',msg.text,'proximity');render();}
 if(msg.type==='error')toast(String(msg.text||'Problème de synchronisation').slice(0,140));
}
async function beginNearbyHost(){
 try{
  if(roomLive)return toast('Quitte d’abord ton salon Internet.');
  nearbyMode=document.getElementById('nearby-mode')?.value==='chess4'?'chess4':'chess2';nearbyRole='host';nearbyLive=false;nearbyStatus='Création en cours…';
  nearbySignal=await nearby.offer();nearbyStatus='Invitation prête : envoie-la à ton ami';render();
 }catch(e){nearbyStatus='Erreur : '+e.message;render();}
}
async function beginNearbyGuest(){
 const text=document.getElementById('nearby-in')?.value.trim();if(!text)return toast('Colle d’abord le code de ton ami.');
 try{
  nearbyRole='guest';nearbyLive=false;nearbyStatus='Réponse en préparation…';
  nearbySignal=await nearby.answer(text);nearbyStatus='Réponse prête : renvoie ce code à l’hôte';render();
 }catch(e){nearbyStatus='Erreur : '+e.message;render();}
}
async function finishNearbyHost(){
 const text=document.getElementById('nearby-in')?.value.trim();if(!text)return toast('Colle le code de réponse de ton ami.');
 try{await nearby.finish(text);nearbyStatus='Connexion en cours : vérifie le même réseau Wi-Fi';render();}
 catch(e){nearbyStatus='Erreur : '+e.message;render();}
}
async function copyNearbySignal(){
 if(!nearbySignal)return toast('Crée une invitation ou une réponse.');
 try{await navigator.clipboard.writeText(nearbySignal);toast('Code copié.');}
 catch{const el=document.getElementById('nearby-out');el?.select();toast('Sélectionne le texte et utilise Copier.');}
}
async function shareNearbySignal(){
 if(!nearbySignal)return toast('Code absent.');
 if(navigator.share){try{await navigator.share({title:'Invitation Échecs & Jeux IA',text:nearbySignal});return;}catch{}}
 await copyNearbySignal();
}
function leaveNearby(){nearby.close();nearbyLive=false;nearbyRole='';nearbyStatus='Prêt';nearbySignal='';cancelBot();
 if(nearbySavedGame){game=nearbySavedGame;nearbySavedGame=null;save();}render();queueBot();
}
async function checkForUpdate(){
 if(!navigator.onLine)return toast('Active Internet pour rechercher une mise à jour.');
 if(!('serviceWorker' in navigator))return toast('Ce navigateur ne gère pas les mises à jour hors ligne.');
 try{
  const reg=await navigator.serviceWorker.getRegistration('./');
  if(!reg){await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});toast('Système de mise à jour activé.');return;}
  await reg.update();
  toast('Vérification terminée. Si une version a changé, rouvre l’application.');
 }catch(e){toast('Recherche impossible : '+e.message);}
}
document.addEventListener('click',ev=>{
 let el=ev.target.closest('[data-path-open]');if(el){openPath(el.dataset.pathOpen);return;}
 el=ev.target.closest('[data-path-answer]');if(el){
  const m=pathModule(pathActive),step=m?.steps[pathLevel];if(!step||pathValidated||step.type==='board')return;
  const c=step.type==='course'?COURSES[step.index]:step,answer=step.type==='course'?c.correct:step.answer;
  pathAnswer=Number(el.dataset.pathAnswer);pathWrong=pathAnswer!==answer;
  if(!pathWrong)passPathLevel();else toast('Ce n’est pas encore la bonne réponse. Réessaie.');
  render();return;
 }
 el=ev.target.closest('[data-tab]');if(el){goto(el.dataset.tab);return;}
 el=ev.target.closest('[data-junior-challenge]');if(el){const j=JUNIOR_CHALLENGES[Number(el.dataset.juniorChallenge)];if(!j)return;practiceIndex=j.exercise;loadPractice();trainTab='moves';goto('train');toast('Défi du Junior : '+j.title);return;}
 el=ev.target.closest('[data-open-game]');if(el){start(el.dataset.openGame);return;}
 el=ev.target.closest('[data-extra-start]');if(el){extraGame=newExtra(el.dataset.extraStart);bonusAdvice='';save();goto('extras');return;}
 el=ev.target.closest('[data-extra-cell]');if(el){extraClick(Number(el.dataset.extraCell));return;}
 el=ev.target.closest('[data-save-load]');if(el){loadSlot(el.dataset.saveLoad);return;}
 el=ev.target.closest('[data-save-delete]');if(el){deleteSlot(el.dataset.saveDelete);return;}
 el=ev.target.closest('[data-theme-choice]');if(el){if(isTheme(el.dataset.themeChoice)){theme=el.dataset.themeChoice;save();render();toast('Design activé : '+themeLabel(theme));}return;}
 el=ev.target.closest('[data-pieces-choice]');if(el){if(['sculpted','flat','round'].includes(el.dataset.piecesChoice)){piecesLook=el.dataset.piecesChoice;save();render();toast('Style des pièces changé.');}return;}
 el=ev.target.closest('[data-action]');if(el){handleAction(el.dataset.action);return;}
 el=ev.target.closest('[data-train]');if(el){trainTab=el.dataset.train;if(trainTab==='path'&&pathActive){const step=pathModule(pathActive)?.steps[pathLevel];if(step?.type==='board'){practiceIndex=step.index;loadPractice();}}else if(trainTab==='moves'){loadPractice();}render();return;}
 el=ev.target.closest('[data-rule]');if(el){ruleTab=el.dataset.rule;render();return;}
 el=ev.target.closest('[data-academy-answer]');if(el){if(courseChoice!==null)return;courseChoice=Number(el.dataset.academyAnswer);const result=courseResult(COURSES[courseIndex],courseChoice);if(result.correct&&!courseProgress.includes(courseIndex)){courseProgress.push(courseIndex);stats.lessons++;stats.xp+=12;save();}render();return;}
 el=ev.target.closest('[data-quiz-answer]');if(el){if(quizAnswered===QUIZZES[quizIndex%QUIZZES.length][2])return;quizAnswered=+el.dataset.quizAnswer;const q=QUIZZES[quizIndex%QUIZZES.length];if(quizAnswered===q[2]){stats.quizzes++;stats.xp+=5;save();toast('Bien joué ! Question validée.');}render();return;}
 el=ev.target.closest('[data-nim-pile]');if(el){moveMini({pile:+el.dataset.nimPile,count:+el.dataset.nimCount});return;}
 el=ev.target.closest('.cell[data-r]');if(el){boardSelectionClick(+el.dataset.r,+el.dataset.c,el.closest('.board').dataset.context);return;}
});
document.addEventListener('change',ev=>{
 let el=ev.target;
 if(el.id==='backup-import-file'){const f=el.files?.[0];importBackupFile(f);el.value='';return;}if(el.matches('[data-player]')){setController(el.dataset.player,el.value);return;}
 if(!el.matches('[data-select]'))return;
 const field=el.dataset.select;
 if(field==='fourmode'){fourMode=el.value;start('chess4');toast('Nouvelle partie avec la règle choisie.');return;}
 if(field==='level')level=+el.value;
 if(field==='ai-style')aiStyle=el.value;
 if(field==='theme'&&isTheme(el.value))theme=el.value;
 if(field==='contrast')highContrast=el.value==='strong';
 if(field==='real-3d')real3D=el.value==='yes';
 if(field==='view-mode'&&VIEW_MODES.includes(el.value))viewMode=el.value;
 if(field==='rotation-mode'&&ROTATION_MODES.includes(el.value))rotationMode=el.value;
 if(field==='coordinates')showCoordinates=el.value==='yes';
 if(field==='ai-mode')aiMode=el.value;
 if(field==='dead'&&game?.kind==='chess')game.options.dead=el.value;
 if(field==='last-rule'&&game?.kind==='mini')game.rule=el.value;
 save();render();queueBot();
});
window.addEventListener('online',()=>render());window.addEventListener('offline',()=>render());
const roomPolling=setInterval(()=>{if(roomSession&&document.visibilityState!=='hidden')refreshRoom(false);},3500);roomPolling.unref?.();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;document.getElementById('install-btn').hidden=false;});
document.getElementById('install-btn').addEventListener('click',()=>handleAction('install'));
if('serviceWorker' in navigator&&('https:'===location.protocol||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  if(navigator.onLine)reg.update().catch(console.warn);
 }).catch(console.warn);
}

render();
window.__appReady=true;
