from pathlib import Path
p=Path('/mnt/data/chess_work/shogi-app.js');s=p.read_text()
# draw inject JS after final markup; replace unique end at line render string 
needle="""</p></div>`;
}
function chooseCourse"""
assert needle in s
s=s.replace(needle,"""</p></div>`;
 const g=activeGame(),slot=state.root.querySelector('.shogi-webgl-slot');
 if(slot&&g&&state.options.webgl!==false){
  const legal=shogiMoves(g),sel=state.selection,targets=sel?legal.filter(m=>sel.drop?m.drop===sel.drop:!m.drop&&m.from?.r===sel.r&&m.from?.c===sel.c).map(m=>m.to):[];
  try{shogi3d=mountExtra360({canvas:slot.querySelector('.shogi-webgl-canvas'),overlay:slot.querySelector('.shogi-webgl-labels'),kind:'shogi',size:9,board:g.board,selection:sel,targets,onSquare:(r,c)=>square(r,c)});
   if(shogi3d){if(savedOrbit)shogi3d.setOrbit(savedOrbit)}else{slot.classList.remove('active');state.root.querySelector('.shogi-board-outer')?.classList.remove('hidden-when-3d');}
  }catch(err){console.warn('3D Shogi :',err);slot.classList.remove('active');state.root.querySelector('.shogi-board-outer')?.classList.remove('hidden-when-3d');}
 }
}
function chooseCourse""",1)
s=s.replace(" if(action==='view')state.options.perspective=!state.options.perspective;", " if(action==='webgl')state.options.webgl=state.options.webgl===false;\n if(action==='view')state.options.perspective=!state.options.perspective;",1)
s += "\nexport function unmountShogi(){if(shogi3d){savedOrbit=shogi3d.getOrbit();shogi3d.dispose();shogi3d=null;}}\n"
p.write_text(s)
css=Path('/mnt/data/chess_work/styles.css');t=css.read_text();t+='''\n/* Version 3.8 : 3D matérielle sur les onze jeux + jeux bonus */
.shogi-webgl-slot{position:relative;width:min(100%,690px);aspect-ratio:1.18;display:none;border-radius:16px;background:radial-gradient(ellipse at 50% 40%,#2b4966,#111e31);box-shadow:0 12px 25px #12274355;overflow:hidden;border:4px solid #987346}
.shogi-webgl-slot.active{display:block}
.shogi-webgl-slot .shogi-webgl-canvas,.shogi-webgl-slot .shogi-webgl-labels{position:absolute;inset:0;width:100%;height:100%;display:block}
.shogi-webgl-canvas{touch-action:none;cursor:grab}
.shogi-webgl-labels{pointer-events:none;z-index:2}
.shogi-board-outer.hidden-when-3d{display:none}
.three-canvas-wrap .webgl-labels{z-index:2}
#bonus-3d.webgl-ready+.bonus-2d-alternative{display:none}
#board-3d-viewport.webgl-ready~.nim-piles{display:flex}
@media(max-width:600px){.shogi-webgl-slot{aspect-ratio:1.04}.shogi-webgl-slot .shogi-webgl-labels{font-size:14px}}
''';css.write_text(t)
print('shogi css patched')
