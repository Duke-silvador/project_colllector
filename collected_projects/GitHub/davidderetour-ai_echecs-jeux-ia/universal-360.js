/* Vue tactile orbitale pour les plateaux HTML des jeux non-échecs. */
let cleanup=()=>{};
export function mountUniversal360(root=document){cleanup();const targets=[...root.querySelectorAll('.board-scene, .shogi-board-outer')].filter(el=>!el.closest('#board-3d-viewport'));
const off=[];for(const el of targets){let ax=Number(sessionStorage.getItem('orbit-x')||'48'),az=Number(sessionStorage.getItem('orbit-z')||'0'),scale=1,drag=null;
el.classList.add('universal-orbit');const parent=el.parentElement;parent?.classList.add('universal-orbit-container');
const toolbar=document.createElement('div');toolbar.className='orbit-toolbar';toolbar.innerHTML='<span>◈ Plateau 360° · glisser pour tourner</span><button type="button" class="orbit-reset">◎ Recentrer</button><button type="button" class="orbit-flat">▦ À plat</button>';parent?.insertBefore(toolbar,el);
const update=()=>{el.style.setProperty('--orbit-x',ax+'deg');el.style.setProperty('--orbit-z',az+'deg');el.style.setProperty('--orbit-scale',scale)};update();
const down=e=>{if(e.target.closest('button,.cell,[data-r],[data-c]'))return;drag={x:e.clientX,y:e.clientY,ax,az};el.setPointerCapture?.(e.pointerId)};
const move=e=>{if(!drag)return;az=drag.az+(e.clientX-drag.x)*.7;ax=Math.max(8,Math.min(80,drag.ax-(e.clientY-drag.y)*.45));update()};
const up=()=>{if(drag){drag=null;try{sessionStorage.setItem('orbit-x',String(ax));sessionStorage.setItem('orbit-z',String(az))}catch{}}};
el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
const reset=()=>{ax=48;az=0;scale=1;update()};const flat=()=>{ax=0;az=0;scale=1;update()};toolbar.querySelector('.orbit-reset').addEventListener('click',reset);toolbar.querySelector('.orbit-flat').addEventListener('click',flat);
off.push(()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);toolbar.remove()});}
cleanup=()=>off.forEach(f=>f());}
