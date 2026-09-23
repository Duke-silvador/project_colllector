(()=>{
  const player=document.getElementById('watchPlayer');
  const body=document.getElementById('playerBody');
  if(!player||!body)return;

  let busy=false,ytTime=0,ytState=-1;
  const $=(s,r=document)=>r.querySelector(s);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const frame=()=>$('.player-frame',body);
  const iframe=()=>$('.player-frame iframe',body);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function state(text,type=''){
    const el=$('#frameTopkkuState',body);
    if(el){el.textContent=text;el.dataset.state=type}
  }
  function targetTime(){
    const raw=($('#frameTopkkuTime',body)?.textContent||'0:00').trim();
    const p=raw.split(':');
    return Math.max(0,(Number(p[0])||0)*60+(Number(p[1])||0));
  }
  function label(sec){
    const n=Math.max(0,Number(sec)||0),m=Math.floor(n/60),s=n-m*60;
    return `${m}:${s.toFixed(1).padStart(4,'0')}`;
  }
  function sendYT(func,args=[]){
    const f=iframe();
    if(!f?.contentWindow)return;
    try{f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*')}catch{}
  }
  function listenYT(){
    const f=iframe();
    if(!f?.contentWindow)return;
    try{f.contentWindow.postMessage(JSON.stringify({event:'listening',id:'nugu-topkku-strict'}),'*')}catch{}
  }
  window.addEventListener('message',ev=>{
    const f=iframe();if(!f||ev.source!==f.contentWindow)return;
    let d=ev.data;try{if(typeof d==='string')d=JSON.parse(d)}catch{return}
    const t=Number(d?.info?.currentTime);if(Number.isFinite(t)&&t>=0)ytTime=t;
    const ps=Number(d?.info?.playerState);if(Number.isFinite(ps))ytState=ps;
  });

  async function videoFor(stream){
    const v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.srcObject=stream;
    await new Promise((ok,bad)=>{
      const timer=setTimeout(()=>bad(new Error('capture_timeout')),7000);
      v.onloadedmetadata=()=>{clearTimeout(timer);ok()};
      v.onerror=()=>{clearTimeout(timer);bad(new Error('capture_video_error'))};
    });
    await v.play();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return v;
  }
  function snap(v){
    const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);return c;
  }
  function crop(src,x,y,w,h,max=1600){
    x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));
    w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
    const k=Math.min(1,max/Math.max(w,h)),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(w*k));out.height=Math.max(1,Math.round(h*k));
    const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(src,x,y,w,h,0,0,out.width,out.height);return out;
  }
  function small(src,max=460){
    const k=Math.min(1,max/Math.max(src.width,src.height));if(k===1)return src;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*k));c.height=Math.max(1,Math.round(src.height*k));
    c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c;
  }
  const luma=(r,g,b)=>r*.2126+g*.7152+b*.0722;

  function axisStats(data,w,h,axis,index,a0,a1){
    let n=0,sum=0,sum2=0,edge=0,prev=null;
    const step=2;
    if(axis==='x'){
      for(let y=a0;y<a1;y+=step){const i=(y*w+index)*4,L=luma(data[i],data[i+1],data[i+2]);n++;sum+=L;sum2+=L*L;if(prev!==null)edge+=Math.abs(L-prev);prev=L}
    }else{
      for(let x=a0;x<a1;x+=step){const i=(index*w+x)*4,L=luma(data[i],data[i+1],data[i+2]);n++;sum+=L;sum2+=L*L;if(prev!==null)edge+=Math.abs(L-prev);prev=L}
    }
    const mean=n?sum/n:0,variance=n?Math.max(0,sum2/n-mean*mean):0;
    return{mean,std:Math.sqrt(variance),edge:n>1?edge/(n-1):0};
  }
  function activeStat(s){return s.mean>27||s.std>13||s.edge>5.2}
  function firstActive(flags,fromLeft=true){
    const n=flags.length,run=Math.max(5,Math.round(n*.018));
    if(fromLeft){
      for(let i=0;i<n-run;i++){let yes=0;for(let j=0;j<run;j++)if(flags[i+j])yes++;if(yes>=run*.72)return i}
      return 0;
    }
    for(let i=n-1;i>=run;i--){let yes=0;for(let j=0;j<run;j++)if(flags[i-j])yes++;if(yes>=run*.72)return i}
    return n-1;
  }
  function detectContentBox(src){
    const a=small(src,460),w=a.width,h=a.height,ctx=a.getContext('2d',{willReadFrequently:true});
    const d=ctx.getImageData(0,0,w,h).data;
    const y0=Math.floor(h*.12),y1=Math.ceil(h*.86);
    const col=[];for(let x=0;x<w;x++)col.push(activeStat(axisStats(d,w,h,'x',x,y0,y1)));
    let l=firstActive(col,true),r=firstActive(col,false);
    const leftFrac=l/w,rightFrac=(w-1-r)/w;
    // One-sided dark edges are more likely scene content; only trim them lightly.
    if((leftFrac>.035)!==(rightFrac>.035)){
      if(leftFrac>rightFrac)l=Math.min(l,Math.round(w*.10));else r=Math.max(r,Math.round(w*.90));
    }
    if(l>w*.40||r<w*.60||r-l<w*.36){l=0;r=w-1}

    const x0=Math.floor(l+(r-l)*.10),x1=Math.ceil(r-(r-l)*.10);
    const row=[];for(let y=0;y<h;y++)row.push(activeStat(axisStats(d,w,h,'y',y,x0,x1)));
    let t=firstActive(row,true),b=firstActive(row,false);
    const topFrac=t/h,bottomFrac=(h-1-b)/h;
    if((topFrac>.025)!==(bottomFrac>.025)){
      if(topFrac>bottomFrac)t=Math.min(t,Math.round(h*.10));else b=Math.max(b,Math.round(h*.90));
    }
    if(t>h*.25||b<h*.75||b-t<h*.52){t=0;b=h-1}

    // Preserve a tiny safety margin so hair/hands at the edge are not shaved off.
    l=Math.max(0,l-Math.round(w*.006));r=Math.min(w-1,r+Math.round(w*.006));
    t=Math.max(0,t-Math.round(h*.006));b=Math.min(h-1,b+Math.round(h*.006));
    const sx=src.width/w,sy=src.height/h;
    return{x:l*sx,y:t*sy,w:(r-l+1)*sx,h:(b-t+1)*sy,leftFrac,rightFrac,topFrac,bottomFrac};
  }
  function extractActualVideo(src){
    const box=detectContentBox(src);
    let out=crop(src,box.x,box.y,box.w,box.h);
    if(out.width<180||out.height<220)throw new Error('content_too_small');
    const before=src.width/src.height,after=out.width/out.height;
    // If a wide player clearly had dark bars, the result must meaningfully shrink them.
    const hadSideBars=box.leftFrac>.07&&box.rightFrac>.07;
    if(hadSideBars&&out.width>src.width*.82)throw new Error('sidebars_not_removed');
    // Never manufacture a blurred/matted portrait from a wide player.
    return{canvas:out,meta:{beforeRatio:+before.toFixed(3),afterRatio:+after.toFixed(3),box:{x:Math.round(box.x),y:Math.round(box.y),w:Math.round(box.w),h:Math.round(box.h)},sideBars:hadSideBars}};
  }

  function centerOverlay(src){
    const a=small(src,420),w=a.width,h=a.height,d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const cx=w/2,cy=h/2,min=Math.min(w,h),r0=min*.025,r1=min*.105;
    let ring=0,ringN=0,core=0,coreN=0;
    for(let y=Math.max(0,Math.floor(cy-r1));y<Math.min(h,Math.ceil(cy+r1));y+=2){
      for(let x=Math.max(0,Math.floor(cx-r1));x<Math.min(w,Math.ceil(cx+r1));x+=2){
        const rr=Math.hypot(x-cx,y-cy),i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2],L=luma(R,G,B),sat=Math.max(R,G,B)-Math.min(R,G,B);
        if(rr>=r0&&rr<=r1){ringN++;if(L>185&&sat<70)ring++}
        if(rr<r0){coreN++;if(L>185&&sat<70)core++}
      }
    }
    const q=ringN?ring/ringN:0,qc=coreN?core/coreN:0;
    return q>.16&&qc<.60;
  }

  async function cropTrack(track){
    const Crop=globalThis.CropTarget,f=iframe();
    if(!Crop?.fromElement||typeof track?.cropTo!=='function'||!f)return false;
    try{
      const target=await Crop.fromElement(f);
      await Promise.race([track.cropTo(target),new Promise((_,bad)=>setTimeout(()=>bad(new Error('region_timeout')),2200))]);
      await wait(220);return true;
    }catch{return false}
  }

  const marks=[['tl',[12,244,166]],['tr',[244,31,169]],['bl',[31,169,244]],['br',[244,205,31]]];
  function addMarkers(){
    const host=frame();if(!host)return null;host.style.position='relative';
    const layer=document.createElement('div');layer.className='nugu-strict-cal';
    Object.assign(layer.style,{position:'absolute',inset:'0',zIndex:'2147483646',pointerEvents:'none'});
    for(const [key,rgb] of marks){const n=document.createElement('i');n.dataset.k=key;Object.assign(n.style,{position:'absolute',width:'40px',height:'40px',background:`rgb(${rgb.join(',')})`,border:'5px solid #fff',boxShadow:'0 0 0 5px #000 inset',boxSizing:'border-box'});if(key[0]==='t')n.style.top='0';else n.style.bottom='0';if(key[1]==='l')n.style.left='0';else n.style.right='0';layer.appendChild(n)}
    host.appendChild(layer);return layer;
  }
  function markerRect(full){
    const c=full.getContext('2d',{willReadFrequently:true}),d=c.getImageData(0,0,full.width,full.height).data,w=full.width,h=full.height;
    const hit=(target,q)=>{let minX=w,maxX=-1,minY=h,maxY=-1,n=0;const lx=q[1]==='l',ty=q[0]==='t',x0=lx?0:Math.floor(w*.45),x1=lx?Math.ceil(w*.55):w,y0=ty?0:Math.floor(h*.30),y1=ty?Math.ceil(h*.70):h;for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){const i=(y*w+x)*4;if(Math.abs(d[i]-target[0])<32&&Math.abs(d[i+1]-target[1])<32&&Math.abs(d[i+2]-target[2])<32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++}}return n>28?{minX,maxX,minY,maxY}:null};
    const H={};for(const [k,rgb] of marks)H[k]=hit(rgb,k);if(!H.tl||!H.tr||!H.bl||!H.br)return null;
    const x=Math.min(H.tl.minX,H.bl.minX),y=Math.min(H.tl.minY,H.tr.minY),r=Math.max(H.tr.maxX,H.br.maxX),b=Math.max(H.bl.maxY,H.br.maxY);
    if(r-x<200||b-y<200)return null;return{x,y,w:r-x+1,h:b-y+1};
  }

  async function waitCurrent(target,timeout=5500){
    const start=performance.now();listenYT();
    while(performance.now()-start<timeout){
      if(ytState!==3&&ytTime>=Math.max(0,target-.055))return true;
      await wait(45);listenYT();
    }
    return false;
  }
  async function cleanTargetSnapshot(v,target){
    const f=iframe(),oldPointer=f?.style.pointerEvents||'';
    if(f)f.style.pointerEvents='none';
    try{
      // First let YouTube's controls fade while the iframe is not hoverable.
      sendYT('playVideo');await wait(2200);
      sendYT('seekTo',[target,true]);sendYT('playVideo');
      const synced=await waitCurrent(target,6000);
      if(!synced)await wait(750);
      let shot=snap(v);
      // A buffering spinner / central playback control is not a usable fan photo.
      if(centerOverlay(shot)){
        await wait(650);shot=snap(v);
        if(centerOverlay(shot))throw new Error('player_overlay_visible');
      }
      return shot;
    }finally{
      sendYT('pauseVideo');sendYT('seekTo',[target,true]);if(f)f.style.pointerEvents=oldPointer;
    }
  }
  async function dataUrl(c,q=.92){return await new Promise((ok,bad)=>c.toBlob(b=>{if(!b)return bad(new Error('encode'));const r=new FileReader;r.onload=()=>ok(String(r.result||''));r.onerror=()=>bad(new Error('encode'));r.readAsDataURL(b)},'image/jpeg',q))}
  async function save(c,meta){
    const payload={version:10,source:'watch',image:await dataUrl(c),artist:meta.artist,title:meta.title,contentUrl:meta.url,time:meta.time,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,captureMode:meta.mode,width:c.width,height:c.height,autoFrame:meta.extract};
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(payload))}
    catch{
      const k=Math.min(1,1000/Math.max(c.width,c.height)),d=document.createElement('canvas');d.width=Math.round(c.width*k);d.height=Math.round(c.height*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);payload.image=await dataUrl(d,.84);payload.width=d.width;payload.height=d.height;sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(payload));
    }
  }

  async function capture(){
    if(busy)return;busy=true;
    const buttons=[...body.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const target=targetTime(),title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch',metaText=$('.player-title p',body)?.textContent?.trim()||'',artist=metaText.split('·')[0]?.trim()||'',url=$('.player-title a',body)?.href||'';
    let stream=null,v=null,marker=null;
    try{
      if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('unsupported');
      state(`${label(target)} 장면에서 실제 영상 영역만 가져오는 중이에요. “현재 탭”을 허용해 주세요.`,'working');
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false,preferCurrentTab:true,selfBrowserSurface:'include'});
      const track=stream.getVideoTracks()[0];if(track?.getSettings?.().displaySurface&&track.getSettings().displaySurface!=='browser')throw new Error('choose_tab');
      let mode='strict-region',rect=null;
      const region=await cropTrack(track);
      v=await videoFor(stream);
      if(!region){
        mode='strict-pixel';marker=addMarkers();if(!marker)throw new Error('frame_not_found');await wait(300);rect=markerRect(snap(v));marker.remove();marker=null;if(!rect)throw new Error('frame_detection_failed');
      }
      let raw=await cleanTargetSnapshot(v,target);
      if(rect)raw=crop(raw,rect.x,rect.y,rect.w,rect.h);
      const extracted=extractActualVideo(raw),out=extracted.canvas;
      if(player.classList.contains('is-vertical')&&out.width/out.height>1.05)throw new Error('vertical_content_not_found');
      await save(out,{artist,title,url,time:target,mode,extract:extracted.meta});
      state(`영상 픽셀만 가져왔어요 ✓ ${out.width}×${out.height}`,'success');
      await wait(120);location.href='topkku.html?from=watch';
    }catch(err){
      console.error('strict topkku capture failed',err);
      const code=String(err?.message||err);
      const msg=code==='choose_tab'?'브라우저에서 “현재 탭”을 선택해 주세요.':code==='player_overlay_visible'?'영상이 아직 로딩 중이거나 재생 UI가 남아 있어요. 잠시 뒤 다시 눌러주세요.':code.includes('content')||code.includes('sidebar')||code.includes('vertical')||code.includes('frame_')?'실제 영상 영역을 확실하게 찾지 못해 잘못된 캡처는 저장하지 않았어요.':'장면을 가져오지 못했어요. 다시 한 번 시도해 주세요.';
      state(msg,'error');
    }finally{
      marker?.remove();stream?.getTracks?.().forEach(t=>t.stop());buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  // Loaded before watch-runtime-fix.js: this listener owns Topkku capture and blocks legacy capture only.
  document.addEventListener('click',ev=>{
    const b=ev.target.closest?.('#frameTopkkuButton');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();capture();
  },true);
})();
