(()=>{
  const canvas=document.getElementById('topkkuCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  const DEFAULT_PHOTO_BOX={x:96,y:126,w:528,h:792,r:30};
  const WATCH_PHOTO_BOUNDS={x:48,y:48,w:624,h:984};
  const photoBox={...DEFAULT_PHOTO_BOX};
  const themes={
    lavender:{bg:'#eee9ff',ink:'#57468b',frame:'#b9a8f5',accent:'#ff86bb',paper:'#fffdf8'},
    pink:{bg:'#ffe8f1',ink:'#8a4564',frame:'#ff9dc4',accent:'#ffc55f',paper:'#fffaf7'},
    mint:{bg:'#e7fff5',ink:'#3d7563',frame:'#8fe6c2',accent:'#8da4ff',paper:'#fbfffd'},
    midnight:{bg:'#171724',ink:'#f1ecff',frame:'#6d5ba8',accent:'#ff6cac',paper:'#252436'}
  };
  const catalog=window.NUGU_TOPKKU_STICKERS||{items:[],byId:new Map(),limits:{totalObjects:90,motionObjects:6,privateSavesPerDay:30,publicPostsPerDay:10}};
  const limits=catalog.limits;
  const defaultPhotoView=()=>({zoom:1,x:0,y:0});
  let theme='lavender',photo=null,photoView=defaultPhotoView(),elements=[],selected=-1,drag=null,history=[],sourceMeta=null,compositionEventKey='',selectedArtist=null,saveBusy=false,searchTimer=null;
  let activeStickerPack='all',styleState=null,vaultUsage=null,currentSavedId=null,currentSavedPublished=false,lastSavedEventKey='',referenceSource=null;
  const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const assetImages=new Map(),assetPromises=new Map();
  function ensureAsset(item){
    if(!item?.asset)return Promise.resolve(null);
    const cached=assetImages.get(item.asset);
    if(cached?.complete&&cached.naturalWidth)return Promise.resolve(cached);
    if(assetPromises.has(item.asset))return assetPromises.get(item.asset);
    const pending=new Promise((resolve,reject)=>{
      const img=cached||new Image();
      img.decoding='async';
      img.onload=()=>{assetImages.set(item.asset,img);draw();resolve(img)};
      img.onerror=()=>reject(new Error('asset_load_failed'));
      assetImages.set(item.asset,img);
      if(!img.src)img.src=item.asset;
    }).finally(()=>assetPromises.delete(item.asset));
    assetPromises.set(item.asset,pending);
    return pending;
  }
  function preloadStickerAssets(){catalog.items.filter(item=>item.asset).forEach(item=>ensureAsset(item).catch(()=>{}))}
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const esc=s=>String(s??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  const apiBase=()=>String((window.NUGU_CONFIG||{}).apiBase||'').replace(/\/$/,'');
  const timeLabel=s=>{const n=Math.max(0,Math.floor(Number(s)||0)),m=Math.floor(n/60),sec=n%60;return`${m}:${String(sec).padStart(2,'0')}`};
  const itemById=id=>catalog.byId?.get?.(id)||catalog.items.find(x=>x.id===id)||null;
  function roundedPath(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
  function heartPath(size){const s=size/100;ctx.beginPath();ctx.moveTo(0,35*s);ctx.bezierCurveTo(-58*s,-4*s,-45*s,-55*s,-10*s,-43*s);ctx.bezierCurveTo(0,-58*s,38*s,-56*s,48*s,-27*s);ctx.bezierCurveTo(62*s,10*s,24*s,35*s,0,55*s);ctx.bezierCurveTo(-24*s,35*s,-62*s,10*s,-48*s,-27*s);ctx.bezierCurveTo(-38*s,-56*s,0,-58*s,10*s,-43*s);ctx.closePath()}
  function starPath(size,points=5){const outer=size*.52,inner=outer*.43;ctx.beginPath();for(let i=0;i<points*2;i++){const r=i%2?inner:outer,a=-Math.PI/2+i*Math.PI/points,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath()}
  function gradient(stops,x1,y1,x2,y2){const g=ctx.createLinearGradient(x1,y1,x2,y2);for(const [p,col] of stops)g.addColorStop(p,col);return g}
  function resetPhotoBox(){Object.assign(photoBox,DEFAULT_PHOTO_BOX)}
  function fitBoxToSource(img,bounds=WATCH_PHOTO_BOUNDS){
    const sw=Number(img?.naturalWidth||0),sh=Number(img?.naturalHeight||0);
    if(sw<1||sh<1)return{...DEFAULT_PHOTO_BOX};
    const ratio=sw/sh;
    let w=bounds.w,h=w/ratio;
    if(h>bounds.h){h=bounds.h;w=h*ratio}
    w=Math.max(1,Math.min(bounds.w,w));h=Math.max(1,Math.min(bounds.h,h));
    return{
      x:(W-w)/2,
      y:(H-h)/2,
      w,
      h,
      r:Math.min(30,Math.max(18,Math.min(w,h)*.055))
    };
  }
  function configurePhotoBox(img,meta){
    resetPhotoBox();
    if(meta?.source==='watch')Object.assign(photoBox,fitBoxToSource(img));
  }
  function coverImage(img,x,y,w,h){const base=Math.max(w/img.naturalWidth,h/img.naturalHeight),scale=base*photoView.zoom;const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;const maxX=Math.max(0,(dw-w)/2),maxY=Math.max(0,(dh-h)/2);photoView.x=clamp(photoView.x,-maxX,maxX);photoView.y=clamp(photoView.y,-maxY,maxY);ctx.drawImage(img,x+(w-dw)/2+photoView.x,y+(h-dh)/2+photoView.y,dw,dh)}
  function fitWatchImage(img,x,y,w,h){
    if(photoView.zoom===1&&photoView.x===0&&photoView.y===0){ctx.drawImage(img,x,y,w,h);return}
    const fit=Math.min(w/img.naturalWidth,h/img.naturalHeight),scale=fit*photoView.zoom;
    const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale,maxX=Math.max(0,(dw-w)/2),maxY=Math.max(0,(dh-h)/2);
    photoView.x=clamp(photoView.x,-maxX,maxX);photoView.y=clamp(photoView.y,-maxY,maxY);
    ctx.drawImage(img,x+(w-dw)/2+photoView.x,y+(h-dh)/2+photoView.y,dw,dh);
  }
  function drawPhoto(img,x,y,w,h){if(sourceMeta?.source==='watch')fitWatchImage(img,x,y,w,h);else coverImage(img,x,y,w,h)}
  function snapshot(){return{theme,elements:elements.map(e=>({...e})),photoView:{...photoView}}}
  function renderUsage(){const root=$('#topkkuLimitLine');if(!root)return;const s=Number(vaultUsage?.savedToday||0),p=Number(vaultUsage?.publishedToday||0),sl=Number(vaultUsage?.saveLimit||limits.privateSavesPerDay),pl=Number(vaultUsage?.publishLimit||limits.publicPostsPerDay);root.textContent=`만들기·PNG 저장 무제한 · 웹 보관 ${s}/${sl} · 아지트 공개 ${p}/${pl} · 모션 장식 작품당 ${limits.motionObjects}개`}
  function renderSaveState(){const a=$('#webSaveBtn'),b=$('#publishBtn');if(a)a.disabled=saveBusy;if(b){b.disabled=saveBusy;b.textContent=currentSavedPublished?'아지트 벽에 붙음 ✓':'아지트 벽에 붙이기 ✦'}renderUsage()}
  function markDirty(){if(currentSavedId!=null){currentSavedId=null;currentSavedPublished=false;if(compositionEventKey===lastSavedEventKey)compositionEventKey=newCompositionKey();renderSaveState()}}
  function saveHistory(){markDirty();history.push(snapshot());if(history.length>30)history.shift()}
  function restore(s){if(!s)return;markDirty();theme=s.theme;elements=s.elements.map(e=>({...e}));photoView=s.photoView?{...s.photoView}:defaultPhotoView();selected=-1;$$('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));draw()}
  function guide(message){const root=$('#stickerGuide');if(root)root.textContent=message}
  function itemCount(id){return elements.filter(e=>e.type==='sticker'&&e.stickerId===id).length}
  function motionCount(){return elements.filter(e=>e.type==='sticker'&&itemById(e.stickerId)?.motion).length}
  function canAddItem(item){if(elements.length>=limits.totalObjects)return{ok:false,msg:`한 작품에는 최대 ${limits.totalObjects}개까지 붙일 수 있어요.`};if(item.motion&&motionCount()>=limits.motionObjects)return{ok:false,msg:`움직이는 장식은 한 작품에 ${limits.motionObjects}개까지 써요.`};if(item.maxPerCanvas&&itemCount(item.id)>=item.maxPerCanvas)return{ok:false,msg:`${item.label}은 한 작품에 ${item.maxPerCanvas}개까지 쓸 수 있어요.`};return{ok:true}}
  function addStickerItem(item){const check=canAddItem(item);if(!check.ok){guide(check.msg);return}saveHistory();const size=item.kind==='frame'?100:item.kind==='tape'?90:item.kind==='lace'?86:76;const y=item.kind==='frame'?photoBox.y+photoBox.h/2:H/2;elements.push({type:'sticker',stickerId:item.id,value:item.value||'',x:W/2,y,size,rotation:0});selected=elements.length-1;guide(`${item.label} 붙였어 ♡`);draw()}
  function addText(value){const text=String(value||'').trim();if(!text)return;if(elements.length>=limits.totalObjects){guide(`한 작품에는 최대 ${limits.totalObjects}개 오브젝트까지 붙일 수 있어요.`);return}saveHistory();elements.push({type:'text',value:text,x:W/2,y:H-112,size:34,rotation:0});selected=elements.length-1;draw();$('#textInput').value=''}
  function elementRadius(e){if(e.type!=='sticker')return Math.max(e.size*1.1,e.value.length*e.size*.27);const item=itemById(e.stickerId);if(item?.kind==='frame'&&!item?.asset)return Math.max(photoBox.w,photoBox.h)*.48;return e.size*.75*Number(item?.assetScale||1)}
  function drawBackdrop(t){ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W*.18,H*.12,20,W*.18,H*.12,420);g.addColorStop(0,t.accent+'55');g.addColorStop(1,t.bg+'00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle=t.frame;ctx.lineWidth=2;for(let y=30;y<H;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-18);ctx.stroke()}ctx.restore()}
  function drawFrame(t){ctx.save();ctx.shadowColor='rgba(0,0,0,.20)';ctx.shadowBlur=28;ctx.shadowOffsetY=18;roundedPath(photoBox.x-24,photoBox.y-24,photoBox.w+48,photoBox.h+48,46);ctx.fillStyle=t.paper;ctx.fill();ctx.restore();ctx.save();roundedPath(photoBox.x,photoBox.y,photoBox.w,photoBox.h,photoBox.r);ctx.clip();if(photo)drawPhoto(photo,photoBox.x,photoBox.y,photoBox.w,photoBox.h);else{ctx.fillStyle=theme==='midnight'?'#313044':'#f4f1f7';ctx.fillRect(photoBox.x,photoBox.y,photoBox.w,photoBox.h);ctx.fillStyle=theme==='midnight'?'#aba5c6':'#90899b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 28px system-ui,sans-serif';ctx.fillText('최애 사진을 올려주세요 ♡',W/2,H/2-8);ctx.font='500 17px system-ui,sans-serif';ctx.fillText('사진은 이 브라우저 밖으로 나가지 않아요',W/2,H/2+34)}ctx.restore();ctx.save();roundedPath(photoBox.x-11,photoBox.y-11,photoBox.w+22,photoBox.h+22,38);ctx.strokeStyle=t.frame;ctx.lineWidth=12;ctx.stroke();ctx.restore()}
  function drawMaterial(e,item,now){
    const s=e.size,t=(Number(now)||0)/1000;
    if(item.asset){
      const img=assetImages.get(item.asset);
      if(img?.complete&&img.naturalWidth){
        const scale=Number(item.assetScale||1),ratio=img.naturalHeight/img.naturalWidth;
        let w=s*scale,h=w*ratio;
        const maxH=s*1.65;if(h>maxH){const k=maxH/h;h*=k;w*=k}
        ctx.save();
        if(item.assetTone==='chrome')ctx.filter='grayscale(1) contrast(1.28) brightness(1.16)';
        if(item.motion&&!reducedMotion){
          const pulse=.98+.035*Math.sin(t*3.2);ctx.scale(pulse,pulse);
          ctx.globalAlpha=.9+.1*Math.sin(t*2.4);
          ctx.shadowColor=item.motion==='sparkle'?'rgba(255,185,230,.65)':'rgba(220,210,255,.45)';
          ctx.shadowBlur=8;
        }
        ctx.drawImage(img,-w/2,-h/2,w,h);
        ctx.restore();
        return;
      }
      ensureAsset(item).catch(()=>{});
    }
    if(item.kind==='emoji'){ctx.font=`${s}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.fillText(item.value,0,0);return}
    if(item.kind==='tape'){const w=s*1.65,h=s*.48;ctx.globalAlpha=.86;ctx.fillStyle=item.variant==='pink'?'#ffb7d5':item.variant==='lilac'?'#d9c5ff':gradient([[0,'#ffc1df'],[.2,'#bfe8ff'],[.45,'#d7c3ff'],[.7,'#fff0ae'],[1,'#ffc7ec']],-w/2,0,w/2,0);ctx.fillRect(-w/2,-h/2,w,h);ctx.globalAlpha=.35;ctx.strokeStyle='#fff';ctx.lineWidth=3;for(let x=-w/2;x<w/2;x+=18){ctx.beginPath();ctx.moveTo(x,-h/2);ctx.lineTo(x+18,h/2);ctx.stroke()}ctx.globalAlpha=1;return}
    if(item.kind==='paper'){const w=s*1.5,h=s*1.05;ctx.shadowColor='rgba(50,35,65,.18)';ctx.shadowBlur=8;ctx.fillStyle=item.variant==='ticket'?'#fff0d7':'#fffaf0';roundedPath(-w/2,-h/2,w,h,8);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(99,75,120,.22)';ctx.lineWidth=2;ctx.stroke();if(item.variant==='ticket'){ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(-w*.28,-h*.35);ctx.lineTo(-w*.28,h*.35);ctx.stroke();ctx.setLineDash([])}return}
    if(item.kind==='pearl'){const count=item.variant==='chain'?6:1,r=s*.18,start=-(count-1)*r*1.25;for(let i=0;i<count;i++){const x=start+i*r*2.5,g=ctx.createRadialGradient(x-r*.35,-r*.4,r*.1,x,0,r);g.addColorStop(0,'#fff');g.addColorStop(.45,'#fff8fb');g.addColorStop(.75,'#e5dce9');g.addColorStop(1,'#aaa0b1');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,0,r,0,Math.PI*2);ctx.fill()}return}
    if(item.kind==='gem'){const r=s*.46;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.8,-r*.15);ctx.lineTo(r*.55,r*.7);ctx.lineTo(0,r);ctx.lineTo(-r*.55,r*.7);ctx.lineTo(-r*.8,-r*.15);ctx.closePath();ctx.fillStyle=gradient([[0,'#fff'],[.18,'#aee7ff'],[.42,'#e7c0ff'],[.66,'#ffb8d8'],[.85,'#fff5af'],[1,'#c4d6ff']],-r,-r,r,r);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=3;ctx.stroke();if(item.motion&&!reducedMotion){const sweep=((t*.8)%1)*r*3-r*1.5;ctx.save();ctx.clip();const g=ctx.createLinearGradient(sweep-r*.25,0,sweep+r*.25,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore()}return}
    if(item.kind==='chrome'){const r=s*.48;ctx.fillStyle=gradient([[0,'#777'],[.16,'#fff'],[.32,'#a8b1c1'],[.5,'#fff'],[.7,'#737b8b'],[.86,'#fff'],[1,'#9098a6']],-r,-r,r,r);if(item.variant==='heart')heartPath(s);else starPath(s);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.stroke();return}
    if(item.kind==='jelly'){ctx.globalAlpha=.82;heartPath(s);ctx.fillStyle=gradient([[0,'#ff81bd'],[.5,'#ffa8d1'],[1,'#d773ff']],-s*.5,-s*.5,s*.5,s*.5);ctx.fill();ctx.globalAlpha=.7;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;return}
    if(item.kind==='lace'){const w=s*1.45,h=s*.8;ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.shadowColor='rgba(81,56,94,.24)';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(-w/2,h/2);ctx.lineTo(-w/2,-h/2);ctx.lineTo(w/2,-h/2);ctx.stroke();ctx.shadowBlur=0;ctx.lineWidth=3;for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(-w/2+i*w/5,-h/2,9,0,Math.PI);ctx.stroke()}for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-w/2,h/2-i*h/3,9,-Math.PI/2,Math.PI/2);ctx.stroke()}return}
    if(item.kind==='acrylic'){const r=s*.48;ctx.globalAlpha=.58;ctx.fillStyle=gradient([[0,'#c8e9ff'],[.48,'#ffd5eb'],[1,'#dfcaff']],-r,-r,r,r);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=4;ctx.stroke();ctx.save();ctx.scale(.52,.52);heartPath(s);ctx.fillStyle='#ff79b6';ctx.fill();ctx.restore();ctx.beginPath();ctx.arc(0,-r-8,8,0,Math.PI*2);ctx.stroke();return}
    if(item.kind==='frame'){const scale=s/100,w=(photoBox.w+50)*scale,h=(photoBox.h+50)*scale,phase=reducedMotion?.5:((t*.12)%1);ctx.lineWidth=18*scale;const g=ctx.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,'#ffb8db');g.addColorStop(clamp(phase-.18,0,1),'#c9c5ff');g.addColorStop(phase,'#fff');g.addColorStop(clamp(phase+.18,0,1),'#bfeaff');g.addColorStop(1,'#ffe4a8');ctx.strokeStyle=g;roundedPath(-w/2,-h/2,w,h,44*scale);ctx.stroke();return}
    if(item.kind==='sparkle'){const phase=reducedMotion?1:(.72+.28*Math.sin(t*4));ctx.globalAlpha=phase;ctx.fillStyle=gradient([[0,'#fff'],[.35,'#d4c2ff'],[.66,'#ff9dce'],[1,'#a7efff']],-s/2,0,s/2,0);ctx.beginPath();ctx.moveTo(0,-s*.55);ctx.quadraticCurveTo(s*.08,-s*.08,s*.55,0);ctx.quadraticCurveTo(s*.08,s*.08,0,s*.55);ctx.quadraticCurveTo(-s*.08,s*.08,-s*.55,0);ctx.quadraticCurveTo(-s*.08,-s*.08,0,-s*.55);ctx.fill();ctx.globalAlpha=1}
  }
  function drawElement(e,i,t,now){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.rotation);ctx.textAlign='center';ctx.textBaseline='middle';if(e.type==='sticker'){const item=itemById(e.stickerId);if(item)drawMaterial(e,item,now)}else{ctx.font=`800 ${e.size}px system-ui,-apple-system,"Segoe UI",sans-serif`;ctx.lineWidth=Math.max(3,e.size*.16);ctx.strokeStyle=theme==='midnight'?'#171724':'#fffdf8';ctx.strokeText(e.value,0,0);ctx.fillStyle=t.ink;ctx.fillText(e.value,0,0)}if(i===selected){const r=elementRadius(e);ctx.strokeStyle='#7ff6c2';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.strokeRect(-r,-r*.58,r*2,r*1.16);ctx.setLineDash([])}ctx.restore()}
  function statusText(){if(selected>=0)return`선택됨 · ${elements.length}/${limits.totalObjects}개 · 드래그해서 옮겨요`;if(photo&&sourceMeta?.source==='watch'){const who=sourceMeta.artist?`${sourceMeta.artist} · `:'';const when=Number.isFinite(Number(sourceMeta.time))?`${timeLabel(sourceMeta.time)} 장면`:'영상 장면';return`${who}${when}을 가져왔어요 ✨`}if(photo)return`꾸미는 중 · ${elements.length}/${limits.totalObjects}개`;return'사진을 먼저 골라주세요'}
  function draw(now=performance.now()){const t=themes[theme];ctx.clearRect(0,0,W,H);drawBackdrop(t);drawFrame(t);elements.forEach((e,i)=>drawElement(e,i,t,now));$('#selectionState').textContent=statusText()}
  function animationLoop(now){if(!reducedMotion&&document.visibilityState==='visible'&&elements.some(e=>e.type==='sticker'&&itemById(e.stickerId)?.motion))draw(now);requestAnimationFrame(animationLoop)}
  function canvasPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}}
  function hitTest(p){for(let i=elements.length-1;i>=0;i--){const e=elements[i],r=elementRadius(e);if(Math.hypot(p.x-e.x,p.y-e.y)<=r*1.05)return i}return-1}
  function newCompositionKey(){return `topkku_${Date.now()}_${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`.replace(/[^A-Za-z0-9:_-]/g,'').slice(0,120)}
  function loadReferenceSource(){
    let raw='';try{raw=sessionStorage.getItem('nuguTopkkuReference')||''}catch{}
    if(!raw){referenceSource=null;return}
    try{const data=JSON.parse(raw);if(!data?.id||!data?.eventKey||!data?.display_url)throw new Error('invalid_reference');referenceSource=data}catch{referenceSource=null}
    const panel=$('#topkkuReferencePanel');if(!panel)return;
    if(!referenceSource){panel.hidden=true;panel.innerHTML='';return}
    panel.hidden=false;panel.innerHTML=`<div class="reference-copy"><span>INSPIRED BY</span><b>${esc(referenceSource.artist_name||'다른 팬의 탑꾸')}</b><small>${esc(referenceSource.maker_name||'팬')}의 탑꾸를 옆에 두고 참고 중</small></div><img src="${esc(referenceSource.display_url)}" alt="참고 중인 탑꾸"><button type="button" id="clearTopkkuReference">참고 끝내기</button>`;
    $('#clearTopkkuReference')?.addEventListener('click',()=>{referenceSource=null;try{sessionStorage.removeItem('nuguTopkkuReference')}catch{}panel.hidden=true;panel.innerHTML=''});
  }
  function serverCatalogItem(id){return styleState?.items?.find?.(x=>x.id===id)||null}
  function accessFor(item){const server=serverCatalogItem(item.id);if(server)return{unlocked:!!server.unlocked,visible:server.visible!==false,gifted:!!server.gifted,label:server.gifted?'선물받음':item.access==='points'?`${item.unlockCost}P`:'사용 가능'};const starter=item.access==='free'&&Number(item.minBand||1)<=1;return{unlocked:starter,visible:starter,gifted:false,label:starter?'사용 가능':'아직 비공개'}}
  function emitStyleState(){window.NUGU_TOPKKU_STYLE_STATE=styleState;window.dispatchEvent(new CustomEvent('nugu-topkku-style-state',{detail:styleState||null}))}
  function leafMark(profile){const g=profile?.growth||{},phase=Math.max(1,Math.min(5,Number(g.leafPhase||1)));return `<span class="growth-leaf-mark band-${Number(g.bandIndex||1)}" aria-label="${esc(g.title||'성장 중')}">${[1,2,3,4,5].map(i=>`<i class="${i<=phase?'grown':''}">❧</i>`).join('')}</span>`}
  function previewGlyph(item){if(item.kind==='emoji')return item.value;return{tape:'▰',paper:'▤',pearl:'○',gem:'◆',chrome:item.variant==='heart'?'♡':'★',jelly:'♥',lace:'⌜',acrylic:'◉',frame:'▣',sparkle:'✦'}[item.kind]||'✦'}
  function renderStickerProfile(){const root=$('#stickerProfile');if(!root)return;const identity=window.NUGU_AUTH?.getIdentitySync?.();if(!identity?.authenticated){root.innerHTML='<b>기본 꾸미기는 바로 가능 ♡</b><span>로그인하면 놀았던 방식대로 잎과 덕질 결이 자라요.</span>';return}const p=styleState?.profile;if(!p){root.innerHTML='<b>꾸미기 서랍 불러오는 중…</b><span>지금까지의 덕질 기록을 살펴보고 있어요.</span>';return}const trait=p.traits?.primary?.label||'둘러보는 중',secondary=(p.traits?.secondary||[]).map(x=>x.label).join(' · ');root.innerHTML=`<div class="growth-profile-line">${leafMark(p)}<div><b>${esc(p.growth?.title||'반가운 새잎')} · ${esc(trait)}</b><span>${secondary?esc(secondary)+' · ':''}사용 가능한 활동포인트 ${Number(p.points?.balance||0)}P</span></div></div>`}
  function renderStickerGrid(){const root=$('#stickerGrid');if(!root)return;const rows=catalog.items.filter(item=>{const a=accessFor(item);return a.visible&&(activeStickerPack==='all'||item.pack===activeStickerPack)});root.innerHTML=rows.length?rows.map(item=>{const a=accessFor(item),motion=item.motion&&!reducedMotion,visual=item.asset?`<img src="${esc(item.asset)}" alt="" loading="lazy" draggable="false">`:esc(previewGlyph(item));return `<button type="button" class="material-sticker ${a.unlocked?'':'locked'} ${a.gifted?'gifted-item':''} ${motion?'motion-item':''}" data-sticker-id="${esc(item.id)}" title="${esc(item.label)}"><span class="sticker-swatch kind-${esc(item.kind)} variant-${esc(item.variant||'base')} ${item.asset?'has-asset':''}">${visual}</span><b>${esc(item.label)}</b><small>${a.unlocked?(a.gifted?'🎁 선물받음':motion?'LIVE ✦':'사용 가능'):`🔒 ${esc(a.label)}`}</small></button>`}).join(''):'<div class="sticker-empty-band">지금 이 서랍에서 꺼낼 수 있는 꾸미기는 여기까지예요. ♡</div>';root.querySelectorAll('[data-sticker-id]').forEach(b=>b.onclick=()=>handleStickerClick(b.dataset.stickerId))}
  async function signedIdentity(message='이 기능은 로그인 후 사용할 수 있어요.'){let identity=null;try{identity=await window.NUGU_AUTH?.getIdentity?.()}catch{}if(identity?.authenticated&&identity.accessToken)return identity;const state=$('#webSaveState');if(state)state.textContent=message;window.NUGU_AUTH_UI?.signIn?.(location.href);return null}
  async function unlockSticker(item){const identity=await signedIdentity('희귀 스티커는 로그인 후 영구 해금할 수 있어요.');if(!identity)return;const balance=Number(styleState?.profile?.points?.balance||0);if(balance<Number(item.unlockCost||0)){guide(`${item.label}은 ${item.unlockCost}P가 필요해요. 지금은 ${balance}P 있어요.`);return}guide(`${item.label} 영구 해금 중…`);try{const r=await fetch(`${apiBase()}/api/v1/community/style/unlock/${encodeURIComponent(item.id)}`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(window.NUGU_AUTH?.authHeaders?.(identity)||{})},body:JSON.stringify({visitorId:identity.visitorId})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||'unlock_failed'),{code:data.error});styleState={profile:data.profile,items:data.items};renderStickerProfile();renderStickerGrid();emitStyleState();guide(`${item.label} 영구 해금 완료 ♡ 이제 횟수 차감 없이 계속 쓸 수 있어요.`)}catch(e){guide(e.code==='insufficient_style_points'?'포인트가 조금 부족해요. 덕질하다 보면 자연스럽게 쌓여요.':'지금은 해금하지 못했어요.')}}
  async function handleStickerClick(id){const item=itemById(id);if(!item)return;const access=accessFor(item);if(!access.unlocked){if(item.access==='points'){await unlockSticker(item);return}const identity=window.NUGU_AUTH?.getIdentitySync?.();if(!identity?.authenticated){await signedIdentity('꾸미기 서랍은 로그인 후 덕질 기록과 연결돼요.');return}guide('조금 더 놀다 보면 다음 꾸미기 서랍이 편지와 함께 열려요. ♡');return}if(item.asset){try{await ensureAsset(item)}catch{guide(`${item.label} 벡터 장식을 불러오지 못했어요. 다시 눌러줘.`);return}}addStickerItem(item)}
  async function loadStyleState(){const sync=window.NUGU_AUTH?.getIdentitySync?.();if(!sync?.authenticated){styleState=null;renderStickerProfile();renderStickerGrid();emitStyleState();return}try{const identity=await window.NUGU_AUTH.getIdentity();if(!identity?.authenticated)return;const r=await fetch(`${apiBase()}/api/v1/community/style/me?visitorId=${encodeURIComponent(identity.visitorId)}`,{headers:{Accept:'application/json',...(window.NUGU_AUTH?.authHeaders?.(identity)||{})},cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'style_failed');styleState=data}catch(e){console.warn('style state',e);styleState=null}renderStickerProfile();renderStickerGrid();emitStyleState()}
  function setArtist(artist){const next=artist?.slug?{slug:String(artist.slug).toLowerCase(),name:String(artist.name||artist.korean_name||artist.slug)}:null;if(selectedArtist?.slug!==next?.slug)markDirty();selectedArtist=next;const box=$('#topkkuArtistConnected');if(box)box.innerHTML=selectedArtist?`<b>${esc(selectedArtist.name)}</b><span>웹 보관함과 아지트 공개 대상을 이 팀으로 연결했어요.</span>`:'아직 팀이 연결되지 않았어요.';const results=$('#topkkuArtistResults');if(results)results.innerHTML='';const input=$('#topkkuArtistSearch');if(input&&selectedArtist)input.value=selectedArtist.name}
  function loadPhotoData(src,meta=null){if(!src)return;const img=new Image();img.onload=()=>{photo=img;photoView=defaultPhotoView();sourceMeta=meta;configurePhotoBox(img,meta);compositionEventKey=newCompositionKey();currentSavedId=null;currentSavedPublished=false;lastSavedEventKey='';if(meta?.artistSlug)setArtist({slug:meta.artistSlug,name:meta.artist||meta.artistSlug});selected=-1;draw();renderSaveState()};img.onerror=()=>{sourceMeta=null;resetPhotoBox();compositionEventKey='';draw()};img.src=src}
  function loadIncoming(){let raw='';try{raw=sessionStorage.getItem('nuguTopkkuIncoming')||'';sessionStorage.removeItem('nuguTopkkuIncoming')}catch{}if(!raw)return false;try{const data=JSON.parse(raw);if(!data?.image)return false;loadPhotoData(data.image,data);return true}catch{return false}}
  canvas.addEventListener('pointerdown',ev=>{const p=canvasPoint(ev),i=hitTest(p);selected=i;if(i>=0){markDirty();drag={dx:p.x-elements[i].x,dy:p.y-elements[i].y,before:{...elements[i]}};canvas.setPointerCapture?.(ev.pointerId)}draw()});
  canvas.addEventListener('pointermove',ev=>{if(!drag||selected<0)return;const p=canvasPoint(ev),e=elements[selected];e.x=clamp(p.x-drag.dx,24,W-24);e.y=clamp(p.y-drag.dy,24,H-24);draw()});
  canvas.addEventListener('pointerup',()=>{if(drag&&selected>=0){const before=drag.before,after=elements[selected];if(before.x!==after.x||before.y!==after.y){history.push({theme,elements:elements.map((e,i)=>i===selected?{...before}:{...e}),photoView:{...photoView}});if(history.length>30)history.shift()}}drag=null});
  $('#photoInput').addEventListener('change',ev=>{const file=ev.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>loadPhotoData(reader.result,null);reader.readAsDataURL(file)});
  function editPhoto(fn){if(!photo)return;saveHistory();fn(photoView);selected=-1;draw()}
  $('#photoZoomOut').onclick=()=>editPhoto(v=>v.zoom=clamp(v.zoom/1.12,1,3));$('#photoZoomIn').onclick=()=>editPhoto(v=>v.zoom=clamp(v.zoom*1.12,1,3));$('#photoLeft').onclick=()=>editPhoto(v=>v.x-=34);$('#photoRight').onclick=()=>editPhoto(v=>v.x+=34);$('#photoUp').onclick=()=>editPhoto(v=>v.y-=34);$('#photoDown').onclick=()=>editPhoto(v=>v.y+=34);$('#photoCenter').onclick=()=>editPhoto(v=>{v.zoom=1;v.x=0;v.y=0});
  $$('#themeGrid [data-theme]').forEach(b=>b.addEventListener('click',()=>{if(theme===b.dataset.theme)return;saveHistory();theme=b.dataset.theme;$$('[data-theme]').forEach(x=>x.classList.toggle('active',x===b));draw()}));
  $$('#stickerPackTabs [data-sticker-pack]').forEach(b=>b.addEventListener('click',()=>{activeStickerPack=b.dataset.stickerPack;$$('#stickerPackTabs [data-sticker-pack]').forEach(x=>x.classList.toggle('active',x===b));renderStickerGrid()}));
  $('#addText').addEventListener('click',()=>addText($('#textInput').value));$('#textInput').addEventListener('keydown',e=>{if(e.key==='Enter')addText(e.currentTarget.value)});
  $$('.quick-copy [data-copy]').forEach(b=>b.addEventListener('click',()=>addText(b.dataset.copy)));
  function editSelected(fn){if(selected<0)return;saveHistory();fn(elements[selected]);draw()}
  $('#smaller').onclick=()=>editSelected(e=>e.size=clamp(e.size*.88,18,180));$('#bigger').onclick=()=>editSelected(e=>e.size=clamp(e.size*1.12,18,180));$('#rotateLeft').onclick=()=>editSelected(e=>e.rotation-=Math.PI/18);$('#rotateRight').onclick=()=>editSelected(e=>e.rotation+=Math.PI/18);$('#deleteElement').onclick=()=>{if(selected<0)return;saveHistory();elements.splice(selected,1);selected=-1;draw()};
  $('#undoBtn').onclick=()=>restore(history.pop());
  $('#resetBtn').onclick=()=>{if(!photo&&!elements.length&&theme==='lavender')return;saveHistory();photo=null;photoView=defaultPhotoView();sourceMeta=null;resetPhotoBox();compositionEventKey='';elements=[];selected=-1;theme='lavender';currentSavedId=null;currentSavedPublished=false;lastSavedEventKey='';setArtist(null);$$('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme==='lavender'));$('#photoInput').value='';draw();renderSaveState()};
  function visitorId(){const a=window.NUGU_AUTH?.getIdentitySync?.();if(a?.visitorId)return a.visitorId;let id=localStorage.getItem('nuguVisitorId');if(!id){id=(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g,'');localStorage.setItem('nuguVisitorId',id)}return id}
  async function searchArtists(q){const root=$('#topkkuArtistResults'),base=apiBase();if(!root||!base||q.trim().length<1){if(root)root.innerHTML='';return}try{const r=await fetch(`${base}/api/v1/search?q=${encodeURIComponent(q.trim())}`,{headers:{Accept:'application/json'},cache:'no-store'});const data=await r.json();const rows=(data.items||[]).slice(0,6);root.innerHTML=rows.length?rows.map(a=>`<button type="button" data-topkku-artist="${esc(a.slug)}" data-topkku-name="${esc(a.name)}">${a.image_url?`<img src="${esc(a.image_url)}" alt="">`:''}<span><b>${esc(a.name)}</b><small>${esc(a.korean_name||a.agency||'')}</small></span></button>`).join(''):'<div class="topkku-team-empty">검색되는 팀이 없어요.</div>';root.querySelectorAll('[data-topkku-artist]').forEach(b=>b.onclick=()=>setArtist({slug:b.dataset.topkkuArtist,name:b.dataset.topkkuName}))}catch{root.innerHTML='<div class="topkku-team-empty">팀 검색을 잠시 불러오지 못했어요.</div>'}}
  $('#topkkuArtistSearch')?.addEventListener('input',e=>{clearTimeout(searchTimer);const q=e.currentTarget.value;searchTimer=setTimeout(()=>searchArtists(q),220)});
  function motionEffects(){return elements.filter(e=>e.type==='sticker'&&itemById(e.stickerId)?.motion).slice(0,limits.motionObjects).map(e=>({id:e.stickerId,x:Number((e.x/W*100).toFixed(3)),y:Number((e.y/H*100).toFixed(3)),size:Number((e.size/W*100).toFixed(3)),rotation:Number((e.rotation*180/Math.PI).toFixed(2))}))}
  function stickerIds(){return elements.filter(e=>e.type==='sticker').map(e=>e.stickerId).filter(Boolean)}
  function canvasPngData(){const old=selected;selected=-1;draw(performance.now());const data=canvas.toDataURL('image/png',1);selected=old;draw();return data}
  async function saveWeb(){
    const state=$('#webSaveState');if(saveBusy)return null;
    if(!photo){state.textContent='사진을 먼저 골라줘 ♡';return null}
    if(!selectedArtist){state.textContent='웹에 저장하려면 어느 팀 탑꾸인지 먼저 연결해줘.';$('#topkkuArtistSearch')?.focus();return null}
    const identity=await signedIdentity('웹 보관함 저장은 로그인 후 가능해요. 편집과 PNG 저장은 로그인 없이도 계속 할 수 있어요.');if(!identity)return null;
    if(currentSavedId){state.textContent='이 버전은 이미 내 웹 보관함에 저장돼 있어요 ♡';return{id:currentSavedId,published:currentSavedPublished}}
    saveBusy=true;renderSaveState();state.textContent='Cloudinary에 완성본을 보관하는 중…';
    try{
      const key=compositionEventKey||newCompositionKey();compositionEventKey=key;
      const url=apiBase()+'/api/v1/community/topkku/'+encodeURIComponent(selectedArtist.slug)+'/save';
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(window.NUGU_AUTH?.authHeaders?.(identity)||{})},body:JSON.stringify({visitorId:identity.visitorId,eventKey:key,imageData:canvasPngData(),source:sourceMeta?.source==='watch'?'watch-topkku':'topkku',sourceContentUrl:sourceMeta?.contentUrl||'',sourceTitle:sourceMeta?.title||'',objectCount:elements.length,stickerIds:stickerIds(),effects:motionEffects(),referenceEventKey:referenceSource?.eventKey||''})});
      const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||'save_failed'),{code:data.error,status:r.status,data});
      currentSavedId=Number(data.item?.id)||null;currentSavedPublished=!!data.published||!!data.item?.published_at;lastSavedEventKey=key;if(data.usage)vaultUsage={...(vaultUsage||{}),...data.usage};
      state.innerHTML='내 웹 보관함에 저장 완료 ♡ '+(data.item?.secure_url?'<a href="'+esc(data.item.secure_url)+'" target="_blank" rel="noopener">Cloudinary 원본 보기</a>':'');
      await Promise.all([loadVault(),loadStyleState()]);renderSaveState();return{id:currentSavedId,published:currentSavedPublished}
    }catch(e){
      state.textContent=e.code==='daily_topkku_save_limit'?'오늘 웹 보관 한도 '+limits.privateSavesPerDay+'개를 다 썼어요. 만들기와 PNG 저장은 계속 무제한이에요.':e.code==='sticker_locked'?'잠긴 스티커가 포함되어 있어요. 해금 상태를 다시 확인해줘.':e.code==='topkku_motion_limit'?'움직이는 장식은 작품당 '+limits.motionObjects+'개까지예요.':e.code==='sign_in_required'?'로그인이 필요해요.':e.code==='FST_ERR_CTP_BODY_TOO_LARGE'||e.status===413?'완성본 용량이 커서 저장하지 못했어요. 자동 최적화 후 다시 시도해줘.':e.code==='cloudinary_not_configured'?'이미지 보관 서버 연결을 확인하고 있어요.':e.code==='cloudinary_request_failed'?'이미지 보관 서버 응답이 늦어요. 다시 시도해줘.':'웹에 저장하지 못했어요. 다시 시도해줘.';return null
    }finally{saveBusy=false;renderSaveState()}
  }
  async function publishSaved(id,artistSlug=selectedArtist?.slug){
    const identity=await signedIdentity('아지트 공개는 로그인 후 가능해요.');if(!identity||!id||!artistSlug)return false;
    saveBusy=true;renderSaveState();$('#webSaveState').textContent='아지트 탑꾸 벽에 붙이는 중…';
    try{
      const url=apiBase()+'/api/v1/community/topkku/'+encodeURIComponent(artistSlug)+'/'+encodeURIComponent(id)+'/publish';
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(window.NUGU_AUTH?.authHeaders?.(identity)||{})},body:JSON.stringify({visitorId:identity.visitorId})});
      const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.error||'publish_failed'),{code:data.error,data});
      if(Number(id)===Number(currentSavedId))currentSavedPublished=true;if(data.usage)vaultUsage={...(vaultUsage||{}),...data.usage};
      $('#webSaveState').innerHTML='아지트 벽에 붙였어 ♡ <a href="room.html?artist='+encodeURIComponent(artistSlug)+'&tab=topkku">바로 보러가기 →</a>';
      await Promise.all([loadVault(),loadStyleState()]);renderSaveState();return true
    }catch(e){$('#webSaveState').textContent=e.code==='daily_topkku_publish_limit'?'오늘 아지트 공개 한도 '+limits.publicPostsPerDay+'개를 다 썼어요. 내 웹 보관함 저장은 계속 가능해요.':e.code==='sign_in_required'?'로그인이 필요해요.':'아지트 벽에 붙이지 못했어요.';return false}
    finally{saveBusy=false;renderSaveState()}
  }
  $('#webSaveBtn').onclick=()=>saveWeb();
  $('#publishBtn').onclick=async()=>{const saved=currentSavedId?{id:currentSavedId}:await saveWeb();if(saved?.id)await publishSaved(saved.id,selectedArtist?.slug)};
  $('#downloadBtn').onclick=()=>{const old=selected;selected=-1;draw();canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');const url=URL.createObjectURL(blob);const who=String(selectedArtist?.name||sourceMeta?.artist||'').trim().replace(/[^0-9A-Za-z가-힣_-]+/g,'-').replace(/^-+|-+$/g,'');a.href=url;a.download=`nugu-radar-topkku${who?`-${who}`:''}-${Date.now()}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);selected=old;draw()},'image/png',1)};
  function vaultCard(item){return '<article class="vault-card" data-vault-id="'+Number(item.id)+'" data-bucket="'+esc(item.bucket_key||'inbox')+'"><a href="'+esc(item.secure_url)+'" target="_blank" rel="noopener"><img src="'+esc(item.display_url||item.secure_url)+'" alt="'+esc(item.artist_name||'탑꾸')+'" loading="lazy"></a><div><b>'+esc(item.artist_name||item.artist_slug||'탑꾸')+'</b><span>'+(item.published_at?'아지트 공개됨':'내 보관함만')+'</span><div class="vault-actions">'+(item.published_at?'<a href="room.html?artist='+encodeURIComponent(item.artist_slug)+'&tab=topkku">벽 보기</a><button type="button" data-reactions="'+Number(item.id)+'">반응한 팬들 🎁</button>':'<button type="button" data-vault-publish="'+Number(item.id)+'" data-vault-artist="'+esc(item.artist_slug)+'">아지트에 붙이기</button>')+'</div></div></article>'}
  async function loadVault(){
    const state=$('#topkkuVaultState'),root=$('#topkkuVaultGrid');if(!state||!root)return;
    const sync=window.NUGU_AUTH?.getIdentitySync?.();
    if(!sync?.authenticated){vaultUsage=null;root.innerHTML='';state.innerHTML='로그인하면 최근 웹 저장 탑꾸를 여기서 볼 수 있어요. <button type="button" id="vaultLogin">로그인</button>';$('#vaultLogin')?.addEventListener('click',()=>window.NUGU_AUTH_UI?.signIn?.(location.href));renderUsage();return}
    try{
      const identity=await window.NUGU_AUTH.getIdentity();
      const url=apiBase()+'/api/v1/community/topkku/me?visitorId='+encodeURIComponent(identity.visitorId)+'&limit=24';
      const r=await fetch(url,{headers:{Accept:'application/json',...(window.NUGU_AUTH?.authHeaders?.(identity)||{})},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'vault_failed');
      vaultUsage=data.usage||null;
      state.textContent='오늘 웹 보관 '+Number(data.usage?.savedToday||0)+'/'+Number(data.usage?.saveLimit||30)+' · 아지트 공개 '+Number(data.usage?.publishedToday||0)+'/'+Number(data.usage?.publishLimit||10);
      root.innerHTML=data.items?.length?data.items.map(vaultCard).join(''):'<div class="topkku-vault-empty">아직 웹에 저장한 탑꾸가 없어요.</div>';
      root.querySelectorAll('[data-vault-publish]').forEach(b=>b.onclick=()=>publishSaved(Number(b.dataset.vaultPublish),b.dataset.vaultArtist));
      renderUsage();window.dispatchEvent(new CustomEvent('nugu-topkku-vault-rendered',{detail:{scope:'mine',items:data.items||[]}}));
    }catch(e){console.warn('vault',e);state.textContent='내 웹 보관함을 잠시 불러오지 못했어요.'}
  }
  async function loadArtistFromQuery(){const slug=new URLSearchParams(location.search).get('artist');if(!slug||!apiBase())return;try{const r=await fetch(`${apiBase()}/api/v1/community/topkku/${encodeURIComponent(slug)}?limit=1`,{headers:{Accept:'application/json'},cache:'no-store'});if(r.ok){const data=await r.json();if(data.artist?.slug)setArtist(data.artist)}}catch{}}
  window.__NUGU_TOPKKU_FRAME_STATE__=()=>({photoBox:{...photoBox},source:sourceMeta?.source||'',sourceSize:photo?{width:photo.naturalWidth,height:photo.naturalHeight}:null,zoom:photoView.zoom});
  window.addEventListener('nugu-auth-changed',()=>{loadStyleState();loadVault()});
  window.NUGU_TOPKKU_LOAD_VAULT=loadVault;window.NUGU_TOPKKU_LOAD_STYLE=loadStyleState;window.NUGU_TOPKKU_API_BASE=apiBase;$('#versionLabel').textContent=(window.NUGU_CONFIG||{}).build||'Updated 2026.09.12';preloadStickerAssets();setArtist(null);loadReferenceSource();renderStickerProfile();renderStickerGrid();renderSaveState();draw();requestAnimationFrame(animationLoop);const incoming=loadIncoming();if(!incoming)loadArtistFromQuery();loadStyleState();loadVault();
})();
