/* Shared spherical viewer for the station and its approach. */
(()=>{
const config=window.RANGER_SCENE,c=document.querySelector('#scene'),g=c.getContext('webgl',{alpha:false}),message=document.querySelector('#sceneMessage');
let yaw=(config.startU??.5)*Math.PI*2,pitch=config.pitch??0,fov=1.6,ready=false,drawImage,frame=0;
const spots=config.spots||[],pointers=new Map();let moved=false,start=null,distance=0;
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw()})}
if(g){
 const vs='attribute vec2 a;varying vec2 p;void main(){p=a;gl_Position=vec4(a,0.,1.);}';
 const fs='precision highp float;varying vec2 p;uniform sampler2D tex;uniform float yaw,pitch,fov,aspect;void main(){float t=tan(fov*.5);vec3 d=normalize(vec3(p.x*t*aspect,p.y*t,1.));float yy=d.y*cos(pitch)+d.z*sin(pitch);float zz=d.z*cos(pitch)-d.y*sin(pitch);float xx=d.x*cos(yaw)+zz*sin(yaw);float z=zz*cos(yaw)-d.x*sin(yaw);float u=fract(atan(xx,z)/6.28318530718+1.);float v=.5-atan(yy,length(vec2(xx,z)))/3.14159265359;gl_FragColor=texture2D(tex,vec2(u,v));}';
 function shader(type,s){const a=g.createShader(type);g.shaderSource(a,s);g.compileShader(a);if(!g.getShaderParameter(a,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(a));return a}
 const p=g.createProgram();g.attachShader(p,shader(g.VERTEX_SHADER,vs));g.attachShader(p,shader(g.FRAGMENT_SHADER,fs));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error('Scene shader failed');g.useProgram(p);
 const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const a=g.getAttribLocation(p,'a');g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);
 const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.LINEAR);
 const loc={};for(const k of ['yaw','pitch','fov','aspect'])loc[k]=g.getUniformLocation(p,k);
 drawImage=()=>{const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(c.width!==w||c.height!==h){c.width=w;c.height=h}g.viewport(0,0,w,h);g.uniform1f(loc.yaw,yaw);g.uniform1f(loc.pitch,pitch);g.uniform1f(loc.fov,fov);g.uniform1f(loc.aspect,w/h);g.drawArrays(g.TRIANGLES,0,6)};
 config.upload=img=>g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,img);
}else{
 const old=c;const replacement=document.createElement('canvas');replacement.id='scene';replacement.tabIndex=0;replacement.setAttribute('aria-label',old.getAttribute('aria-label'));old.replaceWith(replacement);window.rangerFallback=replacement;
 const ctx=replacement.getContext('2d',{alpha:false});let pixels,w,h;
 config.upload=img=>{w=img.width;h=img.height;const src=document.createElement('canvas');src.width=w;src.height=h;const s=src.getContext('2d');s.drawImage(img,0,0);pixels=s.getImageData(0,0,w,h).data};
 drawImage=()=>{const W=Math.min(innerWidth,800),H=Math.round(W*innerHeight/innerWidth);replacement.width=W;replacement.height=H;const out=ctx.createImageData(W,H),t=Math.tan(fov/2);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=(2*(x+.5)/W-1)*t*W/H,dy=(1-2*(y+.5)/H)*t,yy=dy*Math.cos(pitch)+Math.sin(pitch),zz=Math.cos(pitch)-dy*Math.sin(pitch),xx=dx*Math.cos(yaw)+zz*Math.sin(yaw),z=zz*Math.cos(yaw)-dx*Math.sin(yaw),u=(Math.atan2(xx,z)/(2*Math.PI)+1)%1,v=.5-Math.atan2(yy,Math.hypot(xx,z))/Math.PI,i=(Math.min(h-1,Math.max(0,Math.floor(v*h)))*w+Math.floor(u*w))*4,j=(y*W+x)*4;out.data[j]=pixels[i];out.data[j+1]=pixels[i+1];out.data[j+2]=pixels[i+2];out.data[j+3]=255}ctx.putImageData(out,0,0)};
}
const surface=window.rangerFallback||c;
function project(u,v){const lat=(.5-v)*Math.PI,delta=u*2*Math.PI-yaw,x=Math.cos(lat)*Math.sin(delta),wy=Math.sin(lat),wz=Math.cos(lat)*Math.cos(delta),y=wy*Math.cos(pitch)-wz*Math.sin(pitch),z=wy*Math.sin(pitch)+wz*Math.cos(pitch),f=innerHeight/(2*Math.tan(fov/2));return{x:innerWidth/2+f*x/z,y:innerHeight/2-f*y/z,z,f}}
for(const s of spots){const b=document.createElement('button');b.className='object-target';b.setAttribute('aria-label',s.label);b.title=s.label;if(s.sign){b.classList.add('wooden-wayfinding');b.textContent=s.sign;b.dataset.arrow=s.arrow||'';}if(s.url||s.id)b.onclick=()=>activate(s);else{b.disabled=true;b.setAttribute('aria-disabled','true');b.style.pointerEvents='none';}s.element=b;document.body.append(b)}
function activate(s){if(s.url)travel(s.url,s.u,s.v);else window.rangerOpen?.(s.id)}
function travel(url,u=.5,v=.5){if(window.WVLRPTravel)WVLRPTravel.go({url,from:{yaw,pitch,fov},to:{yaw:u*2*Math.PI,pitch:(.5-v)*Math.PI,fov:Math.max(.65,fov*.78)},render:s=>{yaw=s.yaw;pitch=s.pitch;fov=s.fov;draw()}});else location.assign(url)}
function draw(){if(!ready)return;drawImage();for(const s of spots){const p=project(s.u,s.v),w=Math.max(44,p.f*(s.width||.08)*2*Math.PI/Math.max(p.z,.2)),h=Math.max(44,p.f*(s.height||.08)*Math.PI/Math.max(p.z,.2)),visible=p.z>.25&&p.x>-w&&p.x<innerWidth+w&&p.y>-h&&p.y<innerHeight+h;Object.assign(s.element.style,{visibility:visible?'visible':'hidden',left:p.x+'px',top:p.y+'px',width:w+'px',height:h+'px'})}window.rangerPosition?.(project)}
// The desk monitor and the object hotspots sit ABOVE the panorama canvas.
// Share gesture handling with those overlays so zooming in never traps the
// pointer over a giant camera button, preventing a reverse pinch or scroll.
const MIN_FOV=.65,MAX_FOV=1.6;
const clampZoom=v=>Math.max(MIN_FOV,Math.min(MAX_FOV,v));
function zoomBy(delta){if(window.WVLRPTravel?.busy)return;fov=clampZoom(fov+delta);schedule()}
window.rangerZoom=zoomBy;
window.rangerResetZoom=()=>{if(window.WVLRPTravel?.busy)return;fov=MAX_FOV;schedule()};
window.rangerGetZoom=()=>fov;
const touchSurfaces=[surface,...spots.map(s=>s.element),document.querySelector('#monitor')].filter(Boolean);
let suppressClickUntil=0;
function pinchDistance(){const ps=[...pointers.values()];return ps.length>1?Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]):0}
function pointerDown(e){
 if((e.pointerType==='mouse'&&e.button!==0)||window.WVLRPTravel?.busy)return;
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
 if(!pointers.size){start=[e.clientX,e.clientY];moved=false}else moved=true;
 pointers.set(e.pointerId,[e.clientX,e.clientY]);
 distance=pinchDistance();
}
function pointerMove(e){
 if(!pointers.has(e.pointerId))return;
 const prev=pointers.get(e.pointerId);
 if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)moved=true;
 pointers.set(e.pointerId,[e.clientX,e.clientY]);
 if(pointers.size===1){
  yaw-=(e.clientX-prev[0])*.000675*fov;
  pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-prev[1])*.000675*fov));
 }else{
  moved=true;
  const d=pinchDistance();
  if(distance>0&&d>0)fov=clampZoom(fov*distance/d);
  distance=d;
 }
 schedule();
}
function pointerEnd(e){
 if(!pointers.has(e.pointerId))return;
 if(moved)suppressClickUntil=Date.now()+250;
 pointers.delete(e.pointerId);
 distance=pinchDistance();
 if(pointers.size===1){
  const remaining=[...pointers.values()][0];
  start=[...remaining];
 }
 if(!pointers.size)start=null;
}
for(const layer of touchSurfaces){
 layer.style.touchAction='none';
 layer.addEventListener('pointerdown',pointerDown);
 layer.addEventListener('pointermove',pointerMove);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(type,pointerEnd);
 layer.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY*.0003)},{passive:false});
 // Dragging a hotspot or pinching the monitor must not open a modal on release.
 if(layer!==surface)layer.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();suppressClickUntil=0}},true);
}
surface.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key))return;
 e.preventDefault();
 if(e.key==='ArrowLeft')yaw-=.1;
 if(e.key==='ArrowRight')yaw+=.1;
 if(e.key==='ArrowUp')pitch=Math.min(1.4,pitch+.1);
 if(e.key==='ArrowDown')pitch=Math.max(-1.4,pitch-.1);
 if(e.key==='+')zoomBy(-.14);
 if(e.key==='-')zoomBy(.14);
 if(e.key==='0')window.rangerResetZoom();
 schedule();
});
window.WVLRP_QUEST_VIEW=()=>({yaw,pitch,fov});
window.rangerFace=(u,v=.5)=>{yaw=u*2*Math.PI;pitch=(.5-v)*Math.PI;fov=MAX_FOV;schedule()};
window.rangerTravel=travel;
const img=new Image();img.onload=()=>{try{config.upload(typeof config.prepareImage==='function'?config.prepareImage(img):img);ready=true;message.hidden=true;draw();dispatchEvent(new Event('wvlrp-scene-ready'))}catch(err){console.error(err);message.textContent='The forest could not finish loading. Please refresh.'}};img.onerror=()=>{message.textContent='The scene could not load. Please refresh.'};img.src=config.image;addEventListener('resize',schedule);
})();
