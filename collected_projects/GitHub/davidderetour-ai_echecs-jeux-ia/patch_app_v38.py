from pathlib import Path
p=Path('/mnt/data/chess_work/app.js');s=p.read_text()
s=s.replace("import {mountShogi} from './shogi-app.js';","import {mountShogi,unmountShogi} from './shogi-app.js';")
s=s.replace("import {mountChess360} from './chess-3d.js';","import {mountChess360,mountExtra360} from './chess-3d.js';")
s=s.replace("let real3D=store.get('v26-real3d',false)!==false;","let real3D=store.get('v38-real3d',true)!==false;")
s=s.replace("store.set('v26-real3d',real3D);", "store.set('v26-real3d',real3D);store.set('v38-real3d',real3D);")
s=s.replace("if(threeBoard){threeBoard.dispose();threeBoard=null;}document.querySelectorAll", "if(threeBoard){threeBoard.dispose();threeBoard=null;}unmountShogi();document.querySelectorAll",1)
s=s.replace(" // La 3D native s'active seulement pour les échecs; les autres jeux gardent leur plateau lisible."," // 3D WebGPU/WebGL locale pour échecs, jeux M800, Nim et jeux bonus ; vue 2D en secours.")
needle="""   }catch(err){console.warn('Retour au plateau 2D :',err)}
  }
 }
 document.body?.classList"""
assert needle in s
s=s.replace(needle,"""   }catch(err){console.warn('Retour au plateau 2D :',err)}
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
 document.body?.classList""",1)
# boardHTML open3d generic all
s=s.replace("const open3D=g.kind==='chess'?", "const open3D=",1)
s=s.replace("<span>Blancs, Noirs et 4 couleurs en volume</span>","<span>WebGPU si disponible · WebGL sinon · 2D en secours</span>",1)
# Nim standalone 3d holder
s=s.replace("${game.id==='nim'?renderNim():game.type==='chess4'?", "${game.id==='nim'?nim3DHolder()+renderNim():game.type==='chess4'?",1)
# extra toggle in toolbar, plus slot
needle="""<button class="btn sm teal" data-action="toggle-game-options" aria-expanded="${gameOptionsOpen}" aria-controls="game-options">⚙ Options ${gameOptionsOpen?'▴':'▾'}</button></div><div id="game-options">${renderGameOptions(false,true)}</div><h2>${EXTRA_GAMES.find(x=>x.id===g.id)?.name}</h2>${board}"""
assert needle in s
s=s.replace(needle,"""<button class="btn sm teal" data-action="toggle-game-options" aria-expanded="${gameOptionsOpen}" aria-controls="game-options">⚙ Options ${gameOptionsOpen?'▴':'▾'}</button><button class="btn sm ${real3D?'teal':'outline'}" data-action="toggle-real3d">${real3D?'▦ Vue 2D':'◈ Vue 3D 360°'}</button></div><div id="game-options">${renderGameOptions(false,true)}</div><h2>${EXTRA_GAMES.find(x=>x.id===g.id)?.name}</h2><div id="bonus-3d" class="board-3d-viewport" aria-label="Plateau de jeu bonus en 3D tactile"><div class="three-caption">◈ Véritable plateau volumétrique · 360°</div><div class="three-canvas-wrap"><canvas class="webgl-board" tabindex="0" aria-label="Jeu 3D interactif"></canvas><canvas class="webgl-labels" aria-hidden="true"></canvas></div><div class="three-controls"><button class="btn sm outline" data-action="reset-3d-camera">◎ Recentrer</button><span>Joue directement en 3D</span></div></div><div class="bonus-2d-alternative">${board}</div>""",1)
# renderPlay button for mini also
s=s.replace("${isChess?`<button class=\"btn sm ${real3D?\"teal\":\"outline\"}\" data-action=\"toggle-real3d\">${real3D?\"▦ Vue 2D tactile\":\"◈ Vue 3D 360°\"}</button>`:\"\"}", "<button class=\"btn sm ${real3D?'teal':'outline'}\" data-action=\"toggle-real3d\">${real3D?'▦ Vue 2D tactile':'◈ Vue 3D 360°'}</button>",1)
s=s.replace("${isChess?`<button class=\"btn sm ${real3D?'teal':'outline'}\" data-action=\"toggle-real3d\" aria-pressed=\"${real3D}\">♟ ${real3D?'3D 360° activée':'Activer les pièces 3D 360°'}</button>`:''}","<button class=\"btn sm ${real3D?'teal':'outline'}\" data-action=\"toggle-real3d\" aria-pressed=\"${real3D}\">◈ ${real3D?'3D 360° activée':'Activer la 3D 360°'}</button>",1)
# Nim holder helper before renderNim
idx=s.index('function renderNim()')
nim="""function nim3DHolder(){return `<div id="board-3d-viewport" class="board-3d-viewport" data-context="play" aria-label="Jeu de Nim en 3D"><div class="three-caption">◈ Nim en 3D — touche un pion pour enlever ceux à sa droite</div><div class="three-canvas-wrap"><canvas class="webgl-board" tabindex="0" aria-label="Nim 3D interactif"></canvas><canvas class="webgl-labels" aria-hidden="true"></canvas></div><div class="three-controls"><button class="btn sm outline" data-action="reset-3d-camera">◎ Recentrer</button><span>Les boutons −1, −2… restent disponibles</span></div></div>`;}
"""
s=s[:idx]+nim+s[idx:]
# extra 2d hide when ready ; nim 2D visible for buttons
p.write_text(s)
print('app patched length',len(s))
