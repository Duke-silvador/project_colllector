import {makeGPUOverlay} from './webgpu-3d.js';
/* Échecs & Jeux IA 2.6 — moteur WebGL autonome, sans CDN.
   Maillages 3D originaux (révolution, sphères, sculpture du cavalier), caméra libre.
   Le moteur des règles demeure dans engine.js; ce fichier ne change jamais la partie. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const V=(x=0,y=0,z=0)=>[x,y,z];
const sub=(a,b)=>a.map((v,i)=>v-b[i]), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)};
const mul=(a,b)=>{const v=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)v[c*4+r]+=a[k*4+r]*b[c*4+k];return v};
const perspective=(fovy,aspect,n,f)=>{const h=1/Math.tan(fovy/2);return new Float32Array([h/aspect,0,0,0,0,h,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])};
const viewMatrix=(eye,target)=>{const f=norm(sub(target,eye)),s=norm(cross(f,[0,1,0])),u=cross(s,f);return new Float32Array([s[0],u[0],-f[0],0,s[1],u[1],-f[1],0,s[2],u[2],-f[2],0,-dot(s,eye),-dot(u,eye),dot(f,eye),1])};
const hex=h=>{const c=h.replace('#','');return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255)};
const lighten=(c,m)=>c.map(x=>clamp(x*m,0,1));
const palettes={
 '3d':['#e9d8b4','#4e7597','#72513a','#263849'],wood:['#e8c89b','#98623f','#7a4a2e','#352719'],classic:['#efecd9','#729275','#565d4d','#283d30'],marble:['#e3e7e9','#82919f','#c3c7cb','#4c555f'],royal:['#efd4a2','#8d4356','#c19a4c','#40303a'],onyx:['#d8bb81','#3d4252','#bea16c','#1d1e24'],neon:['#b6e7ea','#154c6a','#35b7bd','#08263b'],junior:['#f9dfa2','#7bc4d3','#eb9d58','#744a55']};
const pieceColors={white:'#f4ead5',black:'#212b3b',red:'#d7424c',blue:'#276bd0',green:'#14956a',yellow:'#efc12a'};
class Mesh {
 constructor(){this.data=[];}
 triangle(a,b,c,color){const nn=norm(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])this.data.push(...p,...nn,...color);}
 quad(a,b,c,d,color){this.triangle(a,b,c,color);this.triangle(a,c,d,color)}
 box(x,y,z,w,h,d,color){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
  const A=[x0,y0,z0],B=[x1,y0,z0],C=[x1,y1,z0],D=[x0,y1,z0],E=[x0,y0,z1],F=[x1,y0,z1],G=[x1,y1,z1],H=[x0,y1,z1];
  this.quad(D,C,B,A,color);this.quad(E,F,G,H,color);this.quad(A,E,H,D,color);this.quad(F,B,C,G,color);this.quad(D,H,G,C,color);this.quad(A,B,F,E,color);
 }
 // Profil [rayon, hauteur] = solide tourné de 360 degrés.
 lathe(x,y,z,profile,color,sides=16){for(let j=0;j<profile.length-1;j++)for(let i=0;i<sides;i++){
  const [r0,h0]=profile[j],[r1,h1]=profile[j+1],a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides;
  const p=(r,h,t)=>[x+r*Math.cos(t),y+h,z+r*Math.sin(t)];
  this.quad(p(r0,h0,b),p(r0,h0,a),p(r1,h1,a),p(r1,h1,b),color);
 }}
 sphere(x,y,z,r,color,steps=9,sides=14){const profile=[];for(let j=0;j<=steps;j++){const angle=-Math.PI/2+j*Math.PI/steps;profile.push([Math.max(.002,Math.cos(angle)*r),Math.sin(angle)*r])};this.lathe(x,y,z,profile,color,sides)}
 // Cavalier : sculpture extrudée, tête + museau + oreille en véritable volume.
 knight(x,y,z,color,face=1){const v=[[-.31,.34],[-.28,1.13],[-.10,1.49],[.02,1.68],[.13,1.59],[.17,1.37],[.41,1.16],[.49,.96],[.31,.85],[.06,.92],[-.03,.73],[.24,.65],[.28,.42]];
  const pts=v.map(([a,b])=>[x+a*face,y+b,z]);const z1=z-.17,z2=z+.17;
  for(let i=1;i<pts.length-1;i++){this.triangle([pts[0][0],pts[0][1],z1],[pts[i][0],pts[i][1],z1],[pts[i+1][0],pts[i+1][1],z1],color);this.triangle([pts[0][0],pts[0][1],z2],[pts[i+1][0],pts[i+1][1],z2],[pts[i][0],pts[i][1],z2],color)}
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];this.quad([a[0],a[1],z1],[b[0],b[1],z1],[b[0],b[1],z2],[a[0],a[1],z2],color)}
  this.sphere(x+.20*face,y+1.19,z-.175,.036,hex('#10151d'),5,9);this.sphere(x+.20*face,y+1.19,z+.175,.036,hex('#10151d'),5,9);
 }
 piece(x,z,p){const color=hex(pieceColors[p.color]||'#bdb6ae'),t=p.t,highlight=lighten(color,1.1);
  this.lathe(x,.09,z,[[0,.0],[.39,.0],[.40,.08],[.32,.16],[.26,.22],[.22,.26]],color,20);
  if(t==='N'){this.knight(x,.1,z,color,p.color==='white'||p.color==='red'?-1:1);return;}
  if(t==='P'){this.lathe(x,.27,z,[[.22,0],[.18,.08],[.12,.29],[.17,.39],[.13,.45]],color);this.sphere(x,.94,z,.215,highlight);return;}
  if(t==='R'){this.lathe(x,.28,z,[[.24,0],[.20,.12],[.19,.72],[.28,.77],[.30,.92],[.22,.94]],color);for(let i=0;i<6;i++){const a=i*Math.PI/3;this.box(x+.24*Math.cos(a),1.31,z+.24*Math.sin(a),.16,.25,.15,color)}return;}
  if(t==='B'){this.lathe(x,.27,z,[[.22,0],[.15,.12],[.14,.36],[.23,.47],[.28,.71],[.21,.98],[.06,1.20]],color);this.sphere(x,1.56,z,.09,highlight);return;}
  if(t==='Q'){this.lathe(x,.26,z,[[.24,0],[.18,.20],[.14,.50],[.27,.84],[.30,1.00],[.20,1.10]],color);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;this.sphere(x+.30*Math.cos(a),1.53,z+.30*Math.sin(a),.09,highlight,5,8)}this.sphere(x,1.62,z,.12,highlight);return;}
  if(t==='K'){this.lathe(x,.27,z,[[.23,0],[.17,.25],[.16,.65],[.30,.95],[.28,1.12],[.16,1.23]],color);this.sphere(x,1.56,z,.16,color);this.box(x,1.83,z,.12,.48,.13,highlight);this.box(x,1.87,z,.36,.12,.13,highlight);return;}
 }
}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Programme graphique non disponible : '+gl.getShaderInfoLog(s));return s}
function program(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uPV;varying vec3 vN;varying vec3 vC;varying vec3 vP;void main(){gl_Position=uPV*vec4(aP,1.0);vN=aN;vC=aC;vP=aP;}`));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vN;varying vec3 vC;varying vec3 vP;uniform vec3 uEye;void main(){vec3 n=normalize(vN);vec3 light=normalize(vec3(0.45,0.95,0.70));float diff=max(dot(n,light),0.0);vec3 ray=normalize(uEye-vP);vec3 halfvec=normalize(ray+light);float spec=pow(max(dot(n,halfvec),0.0),38.0)*0.18;float rim=pow(1.0-max(dot(n,ray),0.0),3.0)*0.13;vec3 outc=vC*(0.46+0.57*diff)+vec3(spec+rim);gl_FragColor=vec4(outc,1.0);}`));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Impossible d’initialiser WebGL');return p}
const canvasSize=(canvas,overlay)=>{const b=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);const w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;overlay.width=w;overlay.height=h}return {w,h,dpr}}
function valid(g,r,c){return g.type!=='chess4'||!((r<3||r>10)&&(c<3||c>10))}
export function mountChess360({holder,game,selection,targets=[],theme='3d',showCoordinates=true,rotation=0,onSquare}){
 if(!holder||game?.kind!=='chess')return null;
 const canvas=holder.querySelector('canvas.webgl-board'),overlay=holder.querySelector('canvas.webgl-labels');if(!canvas||!overlay)return null;
 let gl;try{gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL indisponible')}catch{return null}
 let prog,buffer;try{prog=program(gl);buffer=gl.createBuffer()}catch{ return null; }
 const mesh=new Mesh(),N=game.size,half=N/2,p=palettes[theme]||palettes['3d'];
 const light=hex(p[0]),dark=hex(p[1]),frame=hex(p[2]),wood=hex(p[3]);
 const topY=.07;
 // Plateau épais véritablement volumétrique, coins absents pour le jeu à 4.
 if(game.type==='chess4'){
   mesh.box(0,-.25,0,14,.50,8,wood);mesh.box(0,-.25,-5.5,8,.50,3,wood);mesh.box(0,-.25,5.5,8,.50,3,wood);
   mesh.box(0,-.49,0,14,.13,8,frame);mesh.box(0,-.49,-5.5,8,.13,3,frame);mesh.box(0,-.49,5.5,8,.13,3,frame);
 }else{mesh.box(0,-.25,0,N+.32,.5,N+.32,wood);mesh.box(0,-.50,0,N+.52,.12,N+.52,frame)}
 const green=hex('#37dc8a'),orange=hex('#eec45d'),selectedColor=hex('#ffc762');
 const hit=new Set(targets.map(t=>`${t.r}:${t.c}`));
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  if(!valid(game,r,c))continue;
  const key=r+':'+c,chosen=selection?.r===r&&selection?.c===c,x=c-half+.5,z=r-half+.5;
  const fill=chosen?selectedColor:hit.has(key)?(game.board[r][c]?orange:green):(r+c)%2===0?light:dark;
  mesh.box(x,.035,z,1.002,.09,1.002,fill);
  const piece=game.board[r][c];if(piece){mesh.piece(x,z,piece)}
 }
 gl.useProgram(prog);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);
 const stride=9*4;for(const [name,off] of [['aP',0],['aN',12],['aC',24]]){const loc=gl.getAttribLocation(prog,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,stride,off)}}
 const uPV=gl.getUniformLocation(prog,'uPV'),uEye=gl.getUniformLocation(prog,'uEye');
 let yaw=Number(localStorage.getItem('v26-3d-yaw')||0)+rotation*Math.PI/2;
 let pitch=Number(localStorage.getItem('v26-3d-pitch')||0.91);
 if(!Number.isFinite(yaw))yaw=rotation*Math.PI/2;if(!Number.isFinite(pitch))pitch=.91;
 let distance=Number(localStorage.getItem('v26-3d-distance')||N*1.72);
 if(!Number.isFinite(distance))distance=N*1.72;distance=clamp(distance,N*1.18,N*3.2);
 const getEye=()=>[distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),distance*Math.cos(pitch)*Math.cos(yaw)];
 let dead=false,raf=0,width=1,height=1;
 const gpu=makeGPUOverlay(canvas,()=>schedule());gpu?.upload(new Float32Array(mesh.data));
 function paint(){raf=0;if(dead||!canvas.isConnected)return;const sz=canvasSize(canvas,overlay);width=sz.w;height=sz.h;gl.viewport(0,0,width,height);gl.clearColor(.066,.11,.17,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const eye=getEye(),target=[0,0,0],PV=mul(perspective(.77,width/height,.1,N*12),viewMatrix(eye,target));gl.uniformMatrix4fv(uPV,false,PV);gl.uniform3fv(uEye,eye);if(!gpu?.draw(PV,eye,width,height))gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);
  const c=overlay.getContext('2d');c.clearRect(0,0,width,height);if(!showCoordinates)return;
  const project=pt=>{const x=pt[0],y=pt[1],z=pt[2],w=PV[3]*x+PV[7]*y+PV[11]*z+PV[15];if(w<=0)return null;return [(PV[0]*x+PV[4]*y+PV[8]*z+PV[12])/w,(PV[1]*x+PV[5]*y+PV[9]*z+PV[13])/w]};
  c.font=`bold ${Math.max(11,Math.round(width/(N*2.6)))}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3*sz.dpr;c.strokeStyle='#14243b';c.fillStyle='#fff6df';
  const label=(text,at)=>{const q=project(at);if(!q)return;const px=(q[0]+1)*width/2,py=(1-q[1])*height/2;if(px<5||px>width-5||py<5||py>height-5)return;c.strokeText(text,px,py);c.fillText(text,px,py)};
  for(let i=0;i<N;i++){
   const pos=i-half+.5;label(String.fromCharCode(65+i),[pos,.12,half+.44]);label(String.fromCharCode(65+i),[pos,.12,-half-.44]);
   label(String(N-i),[-half-.43,.12,pos]);label(String(N-i),[half+.43,.12,pos]);
  }
 }
 const schedule=()=>{if(!raf&&!dead)raf=requestAnimationFrame(paint)};
 const pointers=new Map();let down=null,moved=false;
 function downEvent(e){if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture?.(e.pointerId);if(pointers.size===1){down=[e.clientX,e.clientY];moved=false;}e.preventDefault()}
 function moveEvent(e){if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);const dx=e.clientX-old[0],dy=e.clientY-old[1];if(Math.abs(e.clientX-down?.[0])+Math.abs(e.clientY-down?.[1])>7)moved=true;if(pointers.size>1){distance=clamp(distance*(1+dy*.006),N*1.18,N*3.2)}else{yaw-=dx*.010;pitch=clamp(pitch+dy*.009,.30,1.46)}schedule();e.preventDefault()}
 function pick(x,y){const rect=canvas.getBoundingClientRect();const sx=((x-rect.left)/rect.width)*2-1,sy=1-((y-rect.top)/rect.height)*2;const eye=getEye(),forward=norm(sub([0,0,0],eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),t=Math.tan(.77/2);
  const ray=norm(forward.map((v,i)=>v+right[i]*sx*t*(width/height)+up[i]*sy*t));if(ray[1]>=-.001)return;const dist=(.13-eye[1])/ray[1];if(dist<=0)return;const wx=eye[0]+ray[0]*dist,wz=eye[2]+ray[2]*dist;
  const col=Math.floor(wx+half),row=Math.floor(wz+half);if(col>=0&&row>=0&&col<N&&row<N&&valid(game,row,col))onSquare(row,col);
 }
 function upEvent(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(!moved&&pointers.size===0&&down)pick(e.clientX,e.clientY);down=null;try{localStorage.setItem('v26-3d-yaw',String(yaw-rotation*Math.PI/2));localStorage.setItem('v26-3d-pitch',String(pitch));localStorage.setItem('v26-3d-distance',String(distance))}catch{}e.preventDefault()}
 const wheel=e=>{distance=clamp(distance*(1+Math.sign(e.deltaY)*.08),N*1.18,N*3.2);schedule();e.preventDefault()};
 canvas.addEventListener('pointerdown',downEvent);canvas.addEventListener('pointermove',moveEvent);canvas.addEventListener('pointerup',upEvent);canvas.addEventListener('pointercancel',upEvent);canvas.addEventListener('wheel',wheel,{passive:false});
 const resize=new ResizeObserver(schedule);resize.observe(canvas);holder.classList.add('webgl-ready');schedule();
 return {dispose(){dead=true;if(raf)cancelAnimationFrame(raf);resize.disconnect();gpu?.dispose();gl.deleteBuffer(buffer);gl.deleteProgram(prog);holder.classList.remove('webgl-ready');},resetCamera(){yaw=rotation*Math.PI/2;pitch=.91;distance=N*1.72;schedule()}};
}

/* V3.7 — plateaux Go et Défis de paix en vrais volumes WebGL.
   Code et modèles locaux : aucune bibliothèque, aucun réseau externe.
   La caméra tourne autour du plateau ; les clics sont reconvertis en cases/intersections. */
export function mountExtra360({canvas,overlay=null,kind='go',size=9,rows=null,cols=null,id='',board=[],pieces={},selection=null,targets=[],onSquare,labels=true}){
 if(!canvas||!['go','peace','shogi','mini','nim','tictactoe','memory'].includes(kind))return null;
 let gl,prog,buffer;
 try{
  gl=canvas.getContext('webgl',{antialias:true,alpha:false});if(!gl)throw Error('WebGL absent');
  prog=program(gl);buffer=gl.createBuffer();
 }catch(e){console.warn('Vue 3D non disponible :',e);return null}
 let nr=Number(rows)||size,nc=Number(cols)||size,n=Math.max(nr,nc),mesh=new Mesh(),dead=false,raf=0,width=1,height=1;let selected=selection,legalTargets=targets;
 let yaw=0,pitch=0.96,distance=n*1.9;
 const coord=(r,c)=>[c-(nc-1)/2,r-(nr-1)/2];
 function makeGeometry(){
  mesh=new Mesh();const wood=hex(kind==='go'?'#87562f':'#694327'),trim=hex('#4d2e1d');
  const widthFrame=nc+.62,heightFrame=nr+.62;
  mesh.box(0,-.26,0,widthFrame,.62,heightFrame,wood);
  mesh.box(0,-.58,0,widthFrame+.13,.09,heightFrame+.13,trim);
  if(kind==='go'){
   mesh.box(0,.072,0,n+.22,.065,n+.22,hex('#d6a66c'));
   const ink=hex('#544026');
   for(let i=0;i<n;i++){
    const p=i-(n-1)/2;
    mesh.box(0,.116,p,n-1,.013,.017,ink);
    mesh.box(p,.116,0,.017,.013,n-1,ink);
   }
   const stars=n===9?[2,4,6]:n===13?[3,6,9]:[3,9,15];
   for(const r of stars)for(const c of stars){const [x,z]=coord(r,c);mesh.sphere(x,.131,z,.065,ink,5,10)}
   for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const value=board?.[r]?.[c];if(!value)continue;
    const [x,z]=coord(r,c),stone=hex(value===1?'#18202a':'#eae7db');
    // Profil convexe fermé : une vraie pierre de Go en forme de lentille.
    mesh.lathe(x,.265,z,[[.02,-.144],[.30,-.137],[.42,-.107],[.45,-.025],[.41,.061],[.28,.133],[.02,.15]],stone,20);
    mesh.sphere(x-.10,.363,z-.10,.048,lighten(stone,1.13),5,9);
   }
  }else if(kind==='shogi'){
   for(let r=0;r<9;r++)for(let c=0;c<9;c++){
    const [x,z]=coord(r,c);
    const chosen=selected?.r===r&&selected?.c===c;
    const target=legalTargets.some(q=>q.r===r&&q.c===c);
    const color=chosen?'#e5b757':target?'#87c390':'#dbaf6f';
    mesh.box(x,.045,z,1.002,.09,1.002,hex(color));
    const piece=board?.[r]?.[c];if(!piece)continue;
    // Les pièces japonaises sont des prismes pentagonaux en bois, à pointe orientée.
    const sign=piece.side==='b'?1:-1,dy=.105,ht=.24;
    const verts=[[0,-.44],[-.36,-.23],[-.31,.39],[.31,.39],[.36,-.23]]
      .map(([a,b])=>[x+a,z+b*sign]);
    const top=hex(piece.pr?'#edc28d':'#f7d9a6'),side=hex('#a76e37');
    for(let i=0;i<verts.length;i++){
     const a=verts[i],b=verts[(i+1)%verts.length];
     const topA=[a[0],dy+ht,a[1]],topB=[b[0],dy+ht,b[1]],botA=[a[0],dy,a[1]],botB=[b[0],dy,b[1]];
     // Doubles faces : lisible aussi derrière lorsqu'on pivote à 360°.
     mesh.triangle([x,dy+ht,z],topA,topB,top);mesh.triangle([x,dy+ht,z],topB,topA,top);
     mesh.quad(botA,botB,topB,topA,side);mesh.quad(botB,botA,topA,topB,side);
    }
   }
  }else if(kind==='mini'||kind==='nim'||kind==='tictactoe'||kind==='memory'){
   const light=hex('#e6ca98'),dark=hex('#815e45');
   const active=new Set((legalTargets||[]).map(t=>`${t.r}:${t.c}`));
   const disc=(x,z,color,king=false)=>{mesh.lathe(x,.14,z,[[.01,.00],[.36,.0],[.39,.08],[.38,.24],[.32,.29],[.01,.29]],color,24);if(king){mesh.lathe(x,.44,z,[[.01,0],[.25,0],[.27,.12],[.01,.16]],hex('#e9c766'),18)}};
   for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){
    const [x,z]=coord(r,c),chosen=selected?.r===r&&selected?.c===c;
    const base=chosen?hex('#f8cd69'):active.has(`${r}:${c}`)?hex('#8bcfa5'):(r+c)%2===0?light:dark;
    mesh.box(x,.065,z,1.002,.105,1.002,base);
    const v=board?.[r]?.[c];
    if(v===null||v===undefined||v==='')continue;
    if(kind==='nim'&&v!==1)continue;
    if(kind==='tictactoe'){
     const ink=hex(v==='X'?'#28699e':'#bd534b');
     if(v==='X'){
      for(const sign of [-1,1])for(let i=0;i<5;i++){const a=(i-2)*.165;mesh.box(x+a,.20,z+sign*a,.16,.17,.18,ink)}
     }else{mesh.lathe(x,.16,z,[[.36,.0],[.34,.02],[.30,.14],[.34,.24],[.36,.26]],ink,32)}
    }else if(kind==='memory'){
      const face=v.visible===true;
      // Cartes rectangulaires épaisses, recto/verso en volume et relief.
      const card=hex(face?'#f8e8c5':'#253f5c');
      mesh.box(x,.17,z,.84,.17,.84,card);
      mesh.box(x,.267,z,.72,.025,.72,hex(face?'#fff4db':'#51769a'));
      if(!face){mesh.lathe(x,.29,z,[[.01,0],[.22,0],[.26,.07],[.23,.11],[.01,.11]],hex('#d7af70'),24)}
    }else if(kind==='mini'||kind==='nim'){
      const own=typeof v==='object'?v.player:(v==='F'?0:v==='G'?1:v);
      const col=hex(v==='F'?'#e98d49':v==='G'?'#f7ead0':id==='reversi'?(own===0?'#f0eee1':'#151a26'):id==='connect4'?(own===0?'#dd5a44':'#efd05c'):own===0?'#dd7460':'#253b62');
      if(v==='F'){
       disc(x,z,col);mesh.sphere(x,.71,z,.21,col,8,16);
       for(const dx of [-.13,.13])mesh.lathe(x+dx,.75,z-.09,[[.01,0],[.105,.20],[.01,.35]],col,9);
      }else if(v==='G'){
       disc(x,z,col);mesh.sphere(x,.67,z,.21,col,8,14);
       mesh.lathe(x,.80,z+.03,[[.02,0],[.11,.12],[.01,.19]],col,12);
      }else{disc(x,z,col,!!v?.king)}
    }
   }
  }else{
   for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const [x,z]=coord(r,c),color=(r+c)%2===0?hex('#ead5a5'):hex('#986740');
    mesh.box(x,.055,z,1.002,.11,1.002,color);
    const id=r*5+c,code=Object.keys(pieces||{}).find(k=>pieces[k]===id);
    if(code){mesh.piece(x,z,{t:code[1],color:code[0]==='W'?'white':'black'});}
   }
  }
  gl.useProgram(prog);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);
  gpu?.upload(new Float32Array(mesh.data));
  const stride=9*4;
  for(const [name,off] of [['aP',0],['aN',12],['aC',24]]){
   const loc=gl.getAttribLocation(prog,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,stride,off)}
  }
 }
 const uPV=gl.getUniformLocation(prog,'uPV'),uEye=gl.getUniformLocation(prog,'uEye');
 const eye=()=>[distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),distance*Math.cos(pitch)*Math.cos(yaw)];
 const gpu=makeGPUOverlay(canvas,()=>schedule());
 function paint(){raf=0;if(dead||!canvas.isConnected)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  width=Math.max(1,Math.round(rect.width*dpr));height=Math.max(1,Math.round(rect.height*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  gl.viewport(0,0,width,height);gl.clearColor(.071,.105,.165,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const cam=eye(),PV=mul(perspective(.78,width/height,.1,n*15),viewMatrix(cam,[0,0,0]));
  gl.useProgram(prog);gl.uniformMatrix4fv(uPV,false,PV);gl.uniform3fv(uEye,cam);
  if(!gpu?.draw(PV,cam,width,height))gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/9);
  if(overlay&&(kind==='shogi'||kind==='memory')){
   if(overlay.width!==width||overlay.height!==height){overlay.width=width;overlay.height=height}
   const o=overlay.getContext('2d');o.clearRect(0,0,width,height);
   const project=point=>{const [x,y,z]=point,w=PV[3]*x+PV[7]*y+PV[11]*z+PV[15];if(w<=0)return null;return [(PV[0]*x+PV[4]*y+PV[8]*z+PV[12])/w,(PV[1]*x+PV[5]*y+PV[9]*z+PV[13])/w]};
   const signs={K:'王',R:'飛',B:'角',G:'金',S:'銀',N:'桂',L:'香',P:'歩','+R':'龍','+B':'馬','+S':'全','+N':'圭','+L':'杏','+P':'と'};
   if(kind==='memory'){
    const memorySymbols={'♚':'♚','♛':'♛','♜':'♜','♝':'♝','♞':'♞','♟':'♟','★':'★','☀':'☀'};
    for(let r=0;r<nr;r++)for(let c=0;c<nc;c++){
     const v=board?.[r]?.[c];if(!v?.visible)continue;
     const [x,z]=coord(r,c),q=project([x,.305,z]);if(!q)continue;
     const px=(q[0]+1)*width/2,py=(1-q[1])*height/2;
     o.font=`900 ${Math.max(16,Math.round(width/14))}px serif`;o.textAlign='center';o.textBaseline='middle';o.fillStyle='#283d5c';
     o.fillText(memorySymbols[v.symbol]||v.symbol||'★',px,py);
    }
   }
   if(kind==='shogi')for(let r=0;r<9;r++)for(let c=0;c<9;c++){const piece=board?.[r]?.[c];if(!piece)continue;const [x,z]=coord(r,c),q=project([x,.38,z]);if(!q)continue;
    const px=(q[0]+1)*width/2,py=(1-q[1])*height/2;
    o.font=`900 ${Math.max(10,Math.round(width/19))}px serif`;o.textAlign='center';o.textBaseline='middle';o.strokeStyle='#f5deb7';o.lineWidth=1.5;o.fillStyle=piece.pr?'#a52e2e':'#302116';
    o.strokeText(signs[(piece.pr?'+':'')+piece.t]||piece.t,px,py);o.fillText(signs[(piece.pr?'+':'')+piece.t]||piece.t,px,py);
   }
  }
 }
 const schedule=()=>{if(!dead&&!raf)raf=requestAnimationFrame(paint)};
 const pointers=new Map();let origin=null,moved=false,pinchDistance=0;
 const sep=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1])};
 function pointerdown(e){if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture?.(e.pointerId);
  if(pointers.size===1){origin=[e.clientX,e.clientY];moved=false}else{moved=true;pinchDistance=sep()}
  e.preventDefault();
 }
 function pointermove(e){if(!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId),dx=e.clientX-old[0],dy=e.clientY-old[1];
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size>=2){const next=sep();if(pinchDistance>0&&next>0)distance=clamp(distance*pinchDistance/next,n*1.15,n*3.8);pinchDistance=next;moved=true}
  else{if(origin&&Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>6)moved=true;
   if(moved){yaw-=dx*.011;pitch=clamp(pitch+dy*.009,.24,1.54)}
  }
  schedule();e.preventDefault();
 }
 function pick(clientX,clientY){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const sx=((clientX-rect.left)/rect.width)*2-1,sy=1-((clientY-rect.top)/rect.height)*2;
  const cam=eye(),forward=norm(sub([0,0,0],cam)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),t=Math.tan(.78/2);
  const dir=norm(forward.map((v,i)=>v+right[i]*sx*t*(width/height)+up[i]*sy*t));
  if(dir[1]>=-.001)return;
  const y=kind==='go'?.13:.12,dist=(y-cam[1])/dir[1];if(dist<=0)return;
  const x=cam[0]+dir[0]*dist,z=cam[2]+dir[2]*dist;
  const c=Math.round(x+(nc-1)/2),r=Math.round(z+(nr-1)/2);
  if(r<0||c<0||r>=nr||c>=nc)return;
  const [px,pz]=coord(r,c);
  if(kind==='go'&&(Math.abs(x-px)>.48||Math.abs(z-pz)>.48))return;
  onSquare?.(r,c);
 }
 function pointerup(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(!moved&&!pointers.size)pick(e.clientX,e.clientY);
  if(!pointers.size)origin=null;
  e.preventDefault();
 }
 function wheel(e){distance=clamp(distance*(1+Math.sign(e.deltaY)*.07),n*1.15,n*3.8);schedule();e.preventDefault()}
 canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);
 canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointerup);
 canvas.addEventListener('wheel',wheel,{passive:false});
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
 observer?.observe(canvas);
 makeGeometry();schedule();
 return {
  update(next={}){if(dead)return;const was=n;nr=Number(next.rows)||Number(next.size)||nr;nc=Number(next.cols)||Number(next.size)||nc;n=Math.max(nr,nc);if(next.board)board=next.board;if(next.pieces)pieces=next.pieces;if('selection' in next)selected=next.selection;if(next.targets)legalTargets=next.targets;
   if(was!==n)distance=clamp(distance*n/was,n*1.15,n*3.8);makeGeometry();schedule()},
  setOrbit({azimuth,tilt,zoom}={}){if(Number.isFinite(azimuth))yaw=azimuth*Math.PI/180;
   if(Number.isFinite(tilt))pitch=clamp((90-tilt)*Math.PI/180,.24,1.54);if(Number.isFinite(zoom))distance=clamp(arguments[0].zoom*n,n*1.15,n*3.8);schedule()},
  getOrbit(){return {azimuth:yaw*180/Math.PI,tilt:90-pitch*180/Math.PI,zoom:distance/n}},
  resetCamera(){yaw=0;pitch=1.20;distance=n*1.9;schedule()},
  dispose(){dead=true;if(raf)cancelAnimationFrame(raf);observer?.disconnect();canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('pointercancel',pointerup);canvas.removeEventListener('wheel',wheel);gpu?.dispose();gl.deleteBuffer(buffer);gl.deleteProgram(prog)}
 };
}
