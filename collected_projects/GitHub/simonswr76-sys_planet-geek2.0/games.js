(() => {
const host = document.getElementById('game-host');
const title = document.getElementById('modal-title');
const help = document.getElementById('game-help');
let cleanup = () => {};
const colors = {cyan:'#4aeaff',pink:'#ff5ac8',purple:'#a78bfa',yellow:'#ffe47a',white:'#f2fbff',red:'#ff6680'};
function canvasGame(name, instructions, setup) {
  host.innerHTML = '<canvas class="game-canvas" width="720" height="390" aria-label="'+name+'"></canvas><div class="game-note">'+instructions+'</div>';
  const c = host.querySelector('canvas'), ctx = c.getContext('2d');
  let running = true, frame = 0, raf, state = setup(c,ctx);
  const loop = () => { if(!running) return; frame++; state.draw(frame); raf=requestAnimationFrame(loop); };
  loop();
  cleanup = () => {running=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',key);window.removeEventListener('keyup',keyup);c.removeEventListener('pointerdown',pointer);};
  function key(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','a','d','w','s'].includes(e.key)){e.preventDefault();state.key?.(e.key,true);}}
  function keyup(e){state.key?.(e.key,false);}
  function pointer(e){const r=c.getBoundingClientRect();state.pointer?.((e.clientX-r.left)/r.width*c.width,(e.clientY-r.top)/r.height*c.height);}
  window.addEventListener('keydown',key);window.addEventListener('keyup',keyup);c.addEventListener('pointerdown',pointer);
}
function racer(){
 canvasGame('Neon Racer','Utilise ← → ou A / D pour changer de voie. Sur téléphone, touche à gauche ou à droite.',(c,x)=>{
 let lane=1,obs=[],score=0,over=false,tick=0;
 function draw(){
  x.fillStyle='#071222';x.fillRect(0,0,720,390);
  x.fillStyle='#102641';x.beginPath();x.moveTo(180,0);x.lineTo(540,0);x.lineTo(680,390);x.lineTo(40,390);x.closePath();x.fill();
  x.strokeStyle='#4aeaff';x.lineWidth=3;x.beginPath();x.moveTo(180,0);x.lineTo(40,390);x.moveTo(540,0);x.lineTo(680,390);x.stroke();
  for(let k=1;k<3;k++){x.strokeStyle='#ffffff55';x.setLineDash([18,18]);x.beginPath();x.moveTo(180+k*120,0);x.lineTo(40+k*213,390);x.stroke();}x.setLineDash([]);
  if(!over&&tick%42===0)obs.push({lane:Math.floor(Math.random()*3),y:-35});
  obs.forEach(o=>{o.y+=3.1+Math.min(score/300,4);x.fillStyle='#ff4fc8';x.shadowColor='#ff4fc8';x.shadowBlur=15;x.fillRect(170+o.lane*126-o.y*.08,o.y,35,30);x.shadowBlur=0;});
  const px=170+lane*126,py=305;
  x.fillStyle='#4aeaff';x.shadowColor='#4aeaff';x.shadowBlur=20;x.beginPath();x.moveTo(px+18,py-23);x.lineTo(px+35,py+15);x.lineTo(px,py+15);x.closePath();x.fill();x.shadowBlur=0;
  obs=obs.filter(o=>{if(o.y>280&&o.y<335&&o.lane===lane)over=true;return o.y<420;});
  if(!over)score++;
  x.fillStyle='#f4fbff';x.font='bold 19px Orbitron';x.fillText('SCORE '+Math.floor(score/5),22,35);
  if(over){x.fillStyle='#030918bb';x.fillRect(0,0,720,390);x.fillStyle='#ff79d6';x.textAlign='center';x.font='bold 34px Orbitron';x.fillText('CRASH !',360,175);x.fillStyle='white';x.font='18px Rajdhani';x.fillText('Score : '+Math.floor(score/5)+' · Recommence pour rejouer',360,215);x.textAlign='left';}
  tick++;
 }
 return {draw,key:(k)=>{if(k==='ArrowLeft'||k==='a')lane=Math.max(0,lane-1);if(k==='ArrowRight'||k==='d')lane=Math.min(2,lane+1);},pointer:(px)=>{lane=px<c.width/2?Math.max(0,lane-1):Math.min(2,lane+1);}};
 });
}
function jumper(){
 canvasGame('Pixel Jumper','Utilise ← → pour bouger et Espace / ↑ pour sauter. Sur téléphone, touche à gauche ou à droite.',(c,x)=>{
 let px=350,py=285,vx=0,vy=0,ground=false,keys={},plats=[{x:280,y:335,w:160},{x:130,y:270,w:115},{x:420,y:210,w:115},{x:220,y:150,w:100},{x:500,y:95,w:100}],cam=0,score=0;
 function draw(){
 x.fillStyle='#101a43';x.fillRect(0,0,720,390);
 for(let i=0;i<55;i++){x.fillStyle=i%3?'#6adfff':'#bd9cff';x.fillRect((i*97)%720,(i*53)%390,2,2);}
 x.fillStyle='#ffdf79';x.beginPath();x.arc(600,60,28,0,7);x.fill();
 vx=(keys.ArrowLeft||keys.a?-4:0)+(keys.ArrowRight||keys.d?4:0);px+=vx;vy+=.42;py+=vy;
 if((keys[' ']||keys.ArrowUp||keys.w)&&ground){vy=-10;ground=false;}
 ground=false;
 plats.forEach(p=>{let yy=p.y+cam;x.fillStyle='#48ebd7';x.shadowColor='#48ebd7';x.shadowBlur=8;x.fillRect(p.x,yy,p.w,8);x.shadowBlur=0;if(vy>0&&py+24>=yy&&py+24<=yy+13&&px+20>p.x&&px<p.x+p.w){py=yy-24;vy=0;ground=true;score=Math.max(score,Math.floor((390-yy)/10));}});
 if(py<145)cam+=2.2;
 x.fillStyle='#ff68c9';x.fillRect(px,py,20,24);x.fillStyle='#fff';x.fillRect(px+12,py+5,4,4);
 if(px<0)px=0;if(px>700)px=700;
 x.fillStyle='white';x.font='bold 18px Orbitron';x.fillText('HAUTEUR '+score,20,30);
 if(py>420){x.fillStyle='#030918dd';x.fillRect(0,0,720,390);x.textAlign='center';x.fillStyle='#ff85d5';x.font='bold 30px Orbitron';x.fillText('OUPS !',360,180);x.fillStyle='white';x.font='18px Rajdhani';x.fillText('Recommence pour retenter ta chance',360,218);x.textAlign='left';}
 }
 return {draw,key:(k,v)=>{keys[k]=v;},pointer:(px)=>{keys.ArrowLeft=px<c.width/2;keys.ArrowRight=px>=c.width/2;setTimeout(()=>{keys.ArrowLeft=keys.ArrowRight=false;},180);}};
 });
}
function blaster(){
 canvasGame('Star Blaster','Déplace-toi avec ← → ou A / D. Esquive les météorites. Sur téléphone, touche à gauche ou à droite.',(c,x)=>{
 let px=350,rocks=[],score=0,t=0,over=false;
 function draw(){
 x.fillStyle='#050b20';x.fillRect(0,0,720,390);
 for(let i=0;i<65;i++){x.fillStyle=i%4?'#6ceeff':'#d7aaff';x.fillRect((i*71)%720,(i*43+t*.7)%390,2,2);}
 if(!over&&t%28===0)rocks.push({x:20+Math.random()*680,y:-20,r:8+Math.random()*12,v:2+Math.random()*2});
 rocks.forEach(r=>{r.y+=r.v;x.fillStyle='#ff6a94';x.shadowColor='#ff477f';x.shadowBlur=12;x.beginPath();x.arc(r.x,r.y,r.r,0,7);x.fill();x.shadowBlur=0;if(Math.abs(r.x-px)<r.r+15&&r.y>320&&r.y<365)over=true;});
 rocks=rocks.filter(r=>r.y<420);x.fillStyle='#4aeaff';x.shadowColor='#4aeaff';x.shadowBlur=16;x.beginPath();x.moveTo(px,315);x.lineTo(px-19,358);x.lineTo(px,350);x.lineTo(px+19,358);x.closePath();x.fill();x.shadowBlur=0;
 if(!over)score++;x.fillStyle='white';x.font='bold 18px Orbitron';x.fillText('SCORE '+Math.floor(score/4),20,30);
 if(over){x.fillStyle='#030918dd';x.fillRect(0,0,720,390);x.textAlign='center';x.fillStyle='#ff719b';x.font='bold 30px Orbitron';x.fillText('MISSION TERMINÉE',360,175);x.fillStyle='white';x.font='18px Rajdhani';x.fillText('Score : '+Math.floor(score/4),360,215);x.textAlign='left';}t++;
 }
 return {draw,key:(k,v)=>{if(k==='ArrowLeft'||k==='a')px=Math.max(20,px-25);if(k==='ArrowRight'||k==='d')px=Math.min(700,px+25);},pointer:(xpos)=>px=xpos};
 });
}
function memory(){
 const icons=['✦','◆','☀','♜','●','⚡','♥','✿'];
 let deck=[...icons,...icons].sort(()=>Math.random()-.5),first=null,lock=false,moves=0,pairs=0;
 host.innerHTML='<div class="score-line" id="memory-score">PAIRES 0 / 8 · COUPS 0</div><div class="memory-board" id="memory-board"></div><p class="game-note">Retourne deux cartes. Si elles sont identiques, elles restent visibles !</p>';
 const board=host.querySelector('#memory-board'),line=host.querySelector('#memory-score');
 deck.forEach((symbol,i)=>{const b=document.createElement('button');b.className='memory-card';b.textContent='?';b.setAttribute('aria-label','Carte cachée');b.onclick=()=>{if(lock||b.classList.contains('flipped')||b.classList.contains('matched'))return;b.textContent=symbol;b.classList.add('flipped');b.setAttribute('aria-label','Carte '+symbol);if(!first){first=b;return;}moves++;if(first.textContent===symbol){first.classList.add('matched');b.classList.add('matched');first=null;pairs++;}else{lock=true;const old=first;setTimeout(()=>{old.textContent='?';b.textContent='?';old.classList.remove('flipped');b.classList.remove('flipped');lock=false;},650);first=null;}line.textContent='PAIRES '+pairs+' / 8 · COUPS '+moves;if(pairs===8)line.textContent='BRAVO ! 8 PAIRES TROUVÉES EN '+moves+' COUPS';};board.appendChild(b);});
 cleanup=()=>{};
}
function launch(game){
 cleanup(); title.textContent=({racer:'Neon Racer',jumper:'Pixel Jumper',blaster:'Star Blaster',memory:'Memory Matrix'})[game]||'Jeu';
 help.textContent=({racer:'Évite les obstacles !',jumper:'Grimpe le plus haut possible !',blaster:'Survis dans l’espace !',memory:'Retrouve toutes les paires !'})[game]||'Amuse-toi bien !';
 ({racer, jumper, blaster, memory})[game]?.();
}
window.PlanetGames={launch,restart:()=>{const game=window.currentGame;if(game)launch(game);}};
window.addEventListener('beforeunload',()=>cleanup());
})();