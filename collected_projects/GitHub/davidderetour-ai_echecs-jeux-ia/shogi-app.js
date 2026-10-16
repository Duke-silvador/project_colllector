import {mountExtra360} from './chess-3d.js';
import {freshShogi,shogiMoves,playShogi,undoShogi,shogiBot,shogiAdvice,inShogiCheck,SHOGI_NAMES,SHOGI_SIGNS,HAND_TYPES} from './shogi-engine.js';
import {SHOGI_COURSES,shogiCourse,shogiProgressClean,shogiPass,shogiPuzzle} from './shogi-lessons.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='v28-shogi-match',progKey='v28-shogi-progress',optKey='v28-shogi-options';
const read=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
let shogi3d=null,savedOrbit=null;
const state={root:null,mode:'academy',active:null,lessonStep:0,validated:false,wrong:'',tip:'',choice:-1,selection:null,promotion:null,
 game:read(key,freshShogi()),progress:shogiProgressClean(read(progKey,{})),options:read(optKey,{perspective:true,coords:true,angle:0,againstBot:true}),puzzle:null,busy:false};
if(state.game?.kind!=='shogi'||!Array.isArray(state.game.board)||state.game.board.length!==9)state.game=freshShogi();
function remember(){write(key,state.game);write(progKey,state.progress);write(optKey,state.options);}
const name=s=>s==='b'?'Sente (en bas)':'Gote (en haut)';
function currentStep(){return shogiCourse(state.active)?.steps[state.lessonStep];}
function activeGame(){return state.mode==='match'?state.game:state.puzzle;}
function optionLine(){return `<div class="shogi-toolbar"><button data-shogi="webgl" class="btn sm outline">${state.options.webgl===false?'◈ Activer la vraie 3D 360°':'▦ Revenir en vue 2D'}</button><button data-shogi="view" class="btn sm outline">${state.options.perspective?'▣ Vue 3D relief':'▦ Vue à plat'}</button><button data-shogi="rotate" class="btn sm outline">↻ Tourner</button><button data-shogi="coords" class="btn sm outline">🔤 ${state.options.coords?'Masquer':'Afficher'} les coordonnées</button><button data-shogi="expand" class="btn sm teal">⛶ Plein écran</button></div>`;}
function displayPiece(p){const str=(p.pr?'+':'')+p.t;return `<span class="shogi-piece-label">${esc(SHOGI_SIGNS[str]||str)}</span><small>${esc(SHOGI_NAMES[p.t])}</small>`;}
function renderBoard(g,{puzzle=false}={}){
 if(!g)return '';
 const moves=shogiMoves(g),selection=state.selection;
 const targets=moves.filter(m=>selection?.drop?m.drop===selection.drop:!m.drop&&m.from?.r===selection?.r&&m.from?.c===selection?.c).map(m=>m.to);
 const rot=((state.options.angle%4)+4)%4,positions=[];
 // Rotation de l'affichage seulement : les coordonnées et les coups restent en repère de jeu.
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){
  let r,c;
  if(rot===0){r=y;c=x;}else if(rot===1){r=8-x;c=y;}else if(rot===2){r=8-y;c=8-x;}else{r=x;c=8-y;}
  const p=g.board[r][c],selected=selection?.r===r&&selection?.c===c;
  const target=targets.some(t=>t.r===r&&t.c===c);
  positions.push(`<button type="button" class="shogi-cell${target?' can-move':''}${selected?' selected':''}${p?.pr?' promoted':''}" data-shogi-square="${r},${c}" aria-label="${String.fromCharCode(65+c)}${9-r}${p?', '+SHOGI_NAMES[p.t]+(p.pr?' promu':''):''}">${p?`<span class="shogi-piece side-${p.side}" style="transform:rotate(${(p.side==='w'?180:0)-rot*90}deg)">${displayPiece(p)}</span>`:''}</button>`);
 }
 const coords=state.options.coords;
 const letters=Array.from({length:9},(_,i)=>String.fromCharCode(65+i));
 const ranks=Array.from({length:9},(_,i)=>9-i);
 const top=rot===0?letters:rot===1?ranks:rot===2?[...letters].reverse():[...ranks].reverse();
 const side=rot===0?ranks:rot===1?letters:rot===2?[...ranks].reverse():[...letters].reverse();
 const axis=items=>`<div class="shogi-coord-row">${items.map(c=>`<span>${c}</span>`).join('')}</div>`;
 const sideAxis=items=>`<div class="shogi-coord-side">${items.map(c=>`<span>${c}</span>`).join('')}</div>`;
 const hand=(s)=>`<div class="shogi-hand"><strong>${s==='b'?'▲':'▽'} Réserve ${name(s)}</strong><div class="shogi-hand-pieces">${HAND_TYPES.filter(t=>(g.hand[s]?.[t]||0)>0).map(t=>`<button data-shogi-hand="${t}" ${g.turn!==s||state.busy?'disabled':''} class="shogi-hand-button${selection?.drop===t?' is-selected':''}"><b>${SHOGI_SIGNS[t]}</b><span>${esc(SHOGI_NAMES[t])} × ${g.hand[s][t]}</span></button>`).join('')||'<span class="shogi-empty-hand">Aucune pièce capturée</span>'}</div></div>`;
 return `<div class="shogi-stage">${hand('w')}<div class="shogi-webgl-slot${state.options.webgl===false?'':' active'}"><canvas class="shogi-webgl-canvas" aria-label="Plateau de Shogi en 3D à 360 degrés"></canvas><canvas class="shogi-webgl-labels" aria-hidden="true"></canvas></div><div class="shogi-board-outer${state.options.webgl===false?'':' hidden-when-3d'}${state.options.perspective?' isometric':''}"><div class="shogi-board-frame">${coords?axis(top):''}<div class="shogi-board-inner">${coords?sideAxis(side):''}<div class="shogi-board">${positions.join('')}</div>${coords?sideAxis(side):''}</div>${coords?axis(top):''}</div></div>${hand('b')}</div>`;
}
function renderStart(){return `<div class="shogi-intro"><span class="shogi-kicker">Nouveauté V2.8 · 日本将棋</span><h2>🏯 Le Shogi : échecs japonais</h2><p>Apprends à déplacer les pièces, à les promouvoir, à parachuter les pièces capturées et à comprendre l’échec et mat. Chaque exercice est accompagné d’une explication et d’un conseil.</p><div class="shogi-choice"><button data-shogi="academy" class="btn teal">🎓 Entraînement par niveaux</button><button data-shogi="match" class="btn primary">♟️ Jouer au Shogi</button></div><p class="subtle">Le niveau suivant s’ouvre uniquement après réussite. Aucun cœur, aucune étoile, aucun achat, aucune attente.</p></div>`;}
function renderAcademy(){
 if(!state.active)return `<div class="shogi-courses">${SHOGI_COURSES.map(c=>{const done=state.progress[c.id];return `<button class="shogi-course-card" data-shogi-course="${c.id}"><span class="shogi-course-emoji">${c.emoji}</span><strong>${esc(c.name)}</strong><span>${esc(c.subtitle)}</span><small>${done>=c.steps.length?'✅ Tous les exercices réussis':`Niveau ${done+1} sur ${c.steps.length}`}</small></button>`;}).join('')}</div>`;
 const c=shogiCourse(state.active),idx=state.lessonStep,s=c.steps[idx];
 if(!s)return `<section class="card shogi-lesson"><h2>✅ ${esc(c.name)} terminé</h2><p>Tu as validé les trois étapes. Choisis une nouvelle catégorie pour continuer.</p><button class="btn teal" data-shogi="courses">Voir les catégories</button></section>`;
 const question=s.type==='quiz'?`<h3>${esc(s.prompt)}</h3><div class="shogi-choices">${s.choices.map((q,i)=>`<button data-shogi-answer="${i}" ${state.validated?'disabled':''} class="${state.choice===i?(state.validated?'right':'wrong'):''}">${String.fromCharCode(65+i)}. ${esc(q)}</button>`).join('')}</div>`:
 `${renderBoard(state.puzzle,{puzzle:true})}<p class="subtle">Touchez une pièce de votre camp, puis sa destination. Une pièce dans la réserve peut être posée sur une case vide.</p>`;
 return `<section class="card shogi-lesson"><button data-shogi="courses" class="btn outline sm">← Catégories</button><div class="shogi-kicker">${c.emoji} ${esc(c.name)} · Niveau ${idx+1} / ${c.steps.length}</div><div class="shogi-progress"><span style="width:${idx/c.steps.length*100}%"></span></div><h2>${esc(s.title)}</h2><p class="shogi-teaching">${esc(s.lesson)}</p>${question}
 <div class="shogi-action-row"><button class="btn sm outline" data-shogi="hint">💡 Conseil IA pédagogique</button><button class="btn sm outline" data-shogi="explain">📖 Explication</button><button class="btn sm outline" data-shogi="speak">🔊 Écouter</button>${!state.validated?'<button class="btn sm outline" data-shogi="reset-lesson">↻ Réessayer</button>':''}</div>
 ${state.tip?`<div class="shogi-message">${esc(state.tip)}</div>`:''}${state.wrong?`<div class="shogi-message is-error">${esc(state.wrong)}. Tu restes au même niveau et tu peux réessayer.</div>`:''}
 ${state.validated?`<div class="shogi-message is-success"><b>✅ Niveau validé !</b> ${esc(s.why)}</div><button data-shogi="next" class="btn teal">${idx+1>=c.steps.length?'Terminer la catégorie':'Passer au niveau suivant'} →</button>`:''}</section>`;
}
function renderMatch(){const g=state.game;window.GameClocks?.sync('shogi',g.turn,!!g.over);const status=g.over?`🏆 ${name(g.over.winner)} gagne (${g.over.reason})`:inShogiCheck(g,g.turn)?`⚠️ ${name(g.turn)} : roi en échec`:`À ${name(g.turn)} de jouer`;
 return `<section class="card shogi-match"><h2>♟️ Partie de Shogi</h2><p class="subtle">${state.options.againstBot?'Solo contre l’ordinateur (IA d’initiation)':'Deux joueurs sur le même appareil'}. Captures et parachutages inclus.</p><div class="shogi-status" aria-live="polite">${esc(status)}</div>${window.GameClocks?.markup('shogi')||''}${renderBoard(g)}<div class="shogi-action-row"><button data-shogi="hint" class="btn sm teal">💡 Conseil IA</button><button data-shogi="explain" class="btn sm outline">📖 Règles utiles</button><button data-shogi="undo" class="btn sm outline">↶ Annuler</button><button data-shogi="new-match" class="btn sm outline">⟳ Nouvelle partie</button><button data-shogi="bot-switch" class="btn sm outline">${state.options.againstBot?'👤 Passer à deux joueurs':'🤖 Jouer contre l’IA'}</button></div>${state.tip?`<div class="shogi-message">${esc(state.tip)}</div>`:''}</section>`;
}
function draw(){if(!state.root)return;if(shogi3d){savedOrbit=shogi3d.getOrbit();shogi3d.dispose();shogi3d=null;}const full=state.root.classList.contains('shogi-fullscreen');
 state.root.innerHTML=`<div class="shogi-area${full?' fullscreen-active':''}"><div class="section-head shogi-title"><div><div class="tag">Échecs & Jeux IA · Académie V2.8</div><h2>Shogi • Échecs japonais</h2></div></div><div class="shogi-tabs"><button data-shogi="academy" class="${state.mode==='academy'?'active':''}">🎓 Entraînement</button><button data-shogi="match" class="${state.mode==='match'?'active':''}">♟️ Jouer</button><button data-shogi="courses">📚 Mes catégories</button></div>${optionLine()}${state.mode==='match'?renderMatch():renderAcademy()}${state.promotion?`<div class="shogi-dialog-backdrop"><div class="shogi-dialog" role="dialog" aria-modal="true" aria-label="Choisir la promotion"><h3>Promouvoir cette pièce ?</h3><p>Dans les trois dernières rangées, certaines pièces peuvent gagner de nouveaux déplacements.</p><button class="btn teal" data-shogi-promo="yes">✨ Oui, promouvoir</button><button class="btn outline" data-shogi-promo="no">Non, garder la pièce normale</button></div></div>`:''}<p class="shogi-rule-footnote">La version actuelle enseigne les règles principales du Shogi. Les cas rares de répétition (sennichite) et d’impasse (jishogi) ne sont pas encore arbitrés automatiquement.</p></div>`;
 const g=activeGame(),slot=state.root.querySelector('.shogi-webgl-slot');
 if(slot&&g&&state.options.webgl!==false){
  const legal=shogiMoves(g),sel=state.selection,targets=sel?legal.filter(m=>sel.drop?m.drop===sel.drop:!m.drop&&m.from?.r===sel.r&&m.from?.c===sel.c).map(m=>m.to):[];
  try{shogi3d=mountExtra360({canvas:slot.querySelector('.shogi-webgl-canvas'),overlay:slot.querySelector('.shogi-webgl-labels'),kind:'shogi',size:9,board:g.board,selection:sel,targets,onSquare:(r,c)=>square(r,c)});
   if(shogi3d){if(savedOrbit)shogi3d.setOrbit(savedOrbit)}else{slot.classList.remove('active');state.root.querySelector('.shogi-board-outer')?.classList.remove('hidden-when-3d');}
  }catch(err){console.warn('3D Shogi :',err);slot.classList.remove('active');state.root.querySelector('.shogi-board-outer')?.classList.remove('hidden-when-3d');}
 }
}
function chooseCourse(id){const c=shogiCourse(id);if(!c)return;state.mode='academy';state.active=id;state.lessonStep=state.progress[id];state.choice=-1;state.tip='';state.wrong='';state.validated=false;state.selection=null;state.promotion=null;loadPuzzle();draw();}
function loadPuzzle(){const s=currentStep();state.puzzle=s?.type==='board'?shogiPuzzle(s):null;}
function success(){if(state.validated)return;const idx=state.lessonStep,out=shogiPass(state.progress,state.active,idx,true);if(!out.advanced)return;state.progress=out.progress;state.validated=true;state.wrong='';remember();}
function attempt(m){
 const g=activeGame();if(!g)return;
 if(state.mode==='academy'){
  const s=currentStep();if(!s||s.type!=='board'||state.validated)return;
  const valid=shogiMoves(g).find(x=>JSON.stringify(x)===JSON.stringify(m));
  const expected=(s.drop?m.drop===s.drop:!m.drop&&m.from?.r===s.from?.[0]&&m.from?.c===s.from?.[1])&&m.to.r===s.to[0]&&m.to.c===s.to[1];
  if(valid&&expected){state.puzzle=playShogi(g,m);success();}else state.wrong=valid?'C’est un coup autorisé, mais ce n’est pas celui qui est demandé':'Ce coup n’est pas autorisé';
  state.selection=null;state.promotion=null;draw();return;
 }
 const next=playShogi(state.game,m);if(!next){state.tip='Coup interdit : choisis une case indiquée en vert.';draw();return;}
 state.game=next;state.selection=null;state.promotion=null;state.tip='';remember();draw();
 if(state.options.againstBot&&!state.game.over&&state.game.turn==='w'){state.busy=true;setTimeout(()=>{
  state.busy=false;if(state.mode!=='match'||!state.options.againstBot||state.game.over||state.game.turn!=='w')return;
  const bm=shogiBot(state.game);if(bm){state.game=playShogi(state.game,bm)||state.game;remember();draw();}
 },280);}
}
function square(r,c){if(state.busy)return;
 const g=activeGame();if(!g||state.validated||g.over)return;if(state.mode==='academy'&&currentStep()?.type!=='board')return;
 if(state.mode==='match'&&state.options.againstBot&&g.turn==='w')return;
 const p=g.board[r][c],sel=state.selection;
 if(sel?.drop){const moves=shogiMoves(g).filter(m=>m.drop===sel.drop&&m.to.r===r&&m.to.c===c);if(moves.length)attempt(moves[0]);else{state.tip='Pose la pièce sur une case libre autorisée (en vert).';draw();}return;}
 if(!sel){if(p?.side===g.turn){state.selection={r,c};state.tip='';draw();}return;}
 if(sel.r===r&&sel.c===c){state.selection=null;draw();return;}
 if(p?.side===g.turn){state.selection={r,c};draw();return;}
 const moves=shogiMoves(g).filter(m=>!m.drop&&m.from.r===sel.r&&m.from.c===sel.c&&m.to.r===r&&m.to.c===c);
 if(moves.length===2){state.promotion=moves;draw();return;}
 if(moves.length===1){attempt(moves[0]);return;}
 state.tip='Déplacement non autorisé. Choisis une case signalée en vert.';draw();
}
function speak(message){if(!('speechSynthesis' in window)){state.tip='La lecture vocale n’est pas disponible sur cet appareil.';draw();return;}const utter=new SpeechSynthesisUtterance(message);utter.lang='fr-FR';utter.rate=.86;window.speechSynthesis.cancel();window.speechSynthesis.speak(utter);}
function onClick(ev){if(!state.root?.contains(ev.target))return;
 let button=ev.target.closest('[data-shogi-square]');if(button){const [r,c]=button.dataset.shogiSquare.split(',').map(Number);square(r,c);return;}
 button=ev.target.closest('[data-shogi-course]');if(button){chooseCourse(button.dataset.shogiCourse);return;}
 button=ev.target.closest('[data-shogi-answer]');if(button){if(state.validated)return;const s=currentStep(),i=Number(button.dataset.shogiAnswer);state.choice=i;state.wrong='';if(i===s.correct)success();else state.wrong='Ce n’est pas la bonne réponse';draw();return;}
 button=ev.target.closest('[data-shogi-promo]');if(button&&state.promotion){const yes=button.dataset.shogiPromo==='yes',m=state.promotion.find(x=>!!x.promote===yes);if(m)attempt(m);return;}
 button=ev.target.closest('[data-shogi-hand]');if(button){if(!state.busy){state.selection={drop:button.dataset.shogiHand};state.tip='Choisis une case libre en vert pour poser ta pièce capturée.';draw();}return;}
 button=ev.target.closest('[data-shogi]');if(!button)return;
 const action=button.dataset.shogi;
 if(action==='academy'){state.mode='academy';state.active=null;state.selection=null;state.tip='';}
 if(action==='courses'){state.mode='academy';state.active=null;state.selection=null;state.tip='';}
 if(action==='match'){state.mode='match';state.selection=null;state.tip='';}
 if(action==='webgl')state.options.webgl=state.options.webgl===false;
 if(action==='view')state.options.perspective=!state.options.perspective;
 if(action==='rotate')state.options.angle=(state.options.angle+1)%4;
 if(action==='coords')state.options.coords=!state.options.coords;
 if(action==='expand')state.root.classList.toggle('shogi-fullscreen');
 if(action==='new-match'){if(confirm('Commencer une nouvelle partie de Shogi ? La partie actuelle sera remplacée.')){state.game=freshShogi();state.selection=null;state.tip='';}}
 if(action==='bot-switch'){state.options.againstBot=!state.options.againstBot;state.tip=state.options.againstBot?'Ordinateur débutant activé.':'Mode deux joueurs activé.';}
 if(action==='undo'&&state.mode==='match'){const back=undoShogi(state.game);if(back){state.game=back;if(state.options.againstBot&&back.turn==='w'&&back.history?.length)state.game=undoShogi(back)||back;state.selection=null;}}
 if(action==='hint'){if(state.mode==='match')state.tip=shogiAdvice(state.game).text;else state.tip=currentStep()?.tip||'Relis attentivement la consigne.';}
 if(action==='explain'){state.tip=state.mode==='match'?'Le roi doit rester à l’abri de l’échec. Tu peux déplacer une pièce ou poser une pièce capturée. Une promotion est possible dans les trois dernières rangées.':currentStep()?.why||'';}
 if(action==='speak')speak([currentStep()?.lesson,currentStep()?.tip].filter(Boolean).join(' '));
 if(action==='reset-lesson'&&!state.validated){state.selection=null;state.choice=-1;state.wrong='';state.tip='';loadPuzzle();}
 if(action==='next'){state.lessonStep=state.progress[state.active];state.validated=false;state.wrong='';state.tip='';state.choice=-1;state.selection=null;loadPuzzle();}
 remember();draw();
}
export function mountShogi(root){state.root=root;if(!root.dataset.shogiEvents){root.addEventListener('click',onClick);root.dataset.shogiEvents='yes';}draw();}

export function unmountShogi(){if(shogi3d){savedOrbit=shogi3d.getOrbit();shogi3d.dispose();shogi3d=null;}}
