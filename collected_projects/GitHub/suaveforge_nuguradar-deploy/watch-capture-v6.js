(()=>{
  const dialog=document.getElementById('watchPlayer');
  const body=document.getElementById('playerBody');
  if(!dialog||!body)return;

  let busy=false;
  const config=window.NUGU_CONFIG||{},api=String(config.apiBase||'').replace(/\/$/,'');
  const MIN_STAGE_CSS=120;
  const MIN_CAPTURE_PX=64;
  const $=(s,r=document)=>r.querySelector(s);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const sourceFrame=()=>$('.player-frame iframe',body);
  function pauseSourcePlayer(){
    const frame=sourceFrame();
    if(!frame?.contentWindow)return;
    try{frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'*')}catch{}
  }
  function beginTopkkuTransition(){
    const frame=sourceFrame(),host=frame?.closest?.('.player-frame');
    if(!frame||!host)return null;
    host.classList.add('nugu-topkku-transition');
    let screen=host.querySelector('.nugu-topkku-transition-screen');
    if(!screen){screen=document.createElement('div');screen.className='nugu-topkku-transition-screen';screen.textContent='장면을 깨끗하게 준비하는 중…';host.appendChild(screen);}
    const action=host.querySelector('.frame-topkku-action');if(action)action.hidden=true;
    return{frame,host,screen,action};
  }
  function endTopkkuTransition(state){
    if(!state)return;
    state.host?.classList?.remove('nugu-topkku-transition');
    state.screen?.remove?.();
    if(state.action)state.action.hidden=false;
  }
  const luma=(r,g,b)=>r*.2126+g*.7152+b*.0722;

  function setState(text,state=''){
    const el=$('#frameTopkkuState',body);
    if(el){el.textContent=text;el.dataset.state=state;}
  }
  function targetTime(){
    const exact=Number(body.dataset.sceneTime);
    if(Number.isFinite(exact)&&exact>=0)return exact;
    const raw=(($('#frameTopkkuTime',body)?.textContent)||'0:00').trim();
    const p=raw.split(':').map(Number);
    if(p.length===3)return Math.max(0,(p[0]||0)*3600+(p[1]||0)*60+(p[2]||0));
    return Math.max(0,(p[0]||0)*60+(p[1]||0));
  }
  function timeLabel(s){
    const n=Math.max(0,Number(s)||0),m=Math.floor(n/60),sec=n-m*60;
    return `${m}:${sec.toFixed(1).padStart(4,'0')}`;
  }
  function videoId(){
    const src=sourceFrame()?.src||'';
    const m=src.match(/\/embed\/([^?&#/]+)/);
    return m?decodeURIComponent(m[1]):'';
  }
  function portraitMode(){return dialog.classList.contains('is-vertical');}

  function toast(text,state='working'){
    let el=document.getElementById('nuguTopkkuProgressV6');
    if(!el){
      el=document.createElement('div');
      el.id='nuguTopkkuProgressV6';
      Object.assign(el.style,{position:'fixed',right:'28px',bottom:'28px',zIndex:'2147483647',maxWidth:'390px',padding:'13px 16px',borderRadius:'16px',font:'700 14px/1.45 system-ui,sans-serif',color:'#fff',background:'rgba(14,17,22,.94)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 16px 50px rgba(0,0,0,.45)',backdropFilter:'blur(14px)',pointerEvents:'none'});
      document.body.appendChild(el);
    }
    el.textContent=text;el.dataset.state=state;el.style.display='block';
    el.style.borderColor=state==='error'?'rgba(255,110,140,.65)':state==='success'?'rgba(82,224,172,.65)':'rgba(177,157,255,.55)';
    return el;
  }
  function hideToast(){const el=document.getElementById('nuguTopkkuProgressV6');if(el)el.style.display='none';}

  async function requestShare(){
    if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('unsupported');
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false,preferCurrentTab:true,selfBrowserSurface:'include'});
    const track=stream.getVideoTracks()[0];
    if(track?.getSettings?.().displaySurface&&track.getSettings().displaySurface!=='browser'){
      stream.getTracks().forEach(t=>t.stop());
      throw new Error('choose_tab');
    }
    return stream;
  }
  async function streamVideo(stream){
    const v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.srcObject=stream;
    await new Promise((ok,bad)=>{
      const timer=setTimeout(()=>bad(new Error('capture_timeout')),6500);
      v.onloadedmetadata=()=>{clearTimeout(timer);ok();};
      v.onerror=()=>{clearTimeout(timer);bad(new Error('capture_video_error'));};
    });
    await v.play();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return v;
  }
  async function tryRegionCapture(stream,v,stage,expectedRatio){
    const track=stream?.getVideoTracks?.()[0];
    if(!track||typeof track.cropTo!=='function'||typeof globalThis.CropTarget?.fromElement!=='function')return null;
    try{
      const target=await globalThis.CropTarget.fromElement(stage);
      await track.cropTo(target);
    }catch(err){
      const name=String(err?.name||'');
      if(name==='NotSupportedError'||name==='TypeError')return null;
      const e=new Error(name==='NotAllowedError'||name==='InvalidStateError'?'region_capture_wrong_tab':'region_capture_failed_'+(name||'unknown'));
      e.regionError=name||String(err?.message||'unknown');throw e;
    }
    const start=performance.now();
    while(performance.now()-start<3500){
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const w=Number(v.videoWidth||0),h=Number(v.videoHeight||0),ratio=h?w/h:0;
      if(w>=MIN_CAPTURE_PX&&h>=MIN_CAPTURE_PX&&ratio>0&&Math.abs(ratio-expectedRatio)/expectedRatio<=.08){
        return{rect:{x:0,y:0,w,h,sx:1,sy:1,regionCapture:true},mode:'region-capture'};
      }
      await wait(55);
    }
    const e=new Error('region_capture_resize_timeout');e.captureSize=`${v.videoWidth||0}x${v.videoHeight||0}`;throw e;
  }
  function snap(v){
    const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);return c;
  }
  function crop(src,x,y,w,h,max=1800){
    x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));
    w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
    const k=Math.min(1,max/Math.max(w,h)),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(w*k));out.height=Math.max(1,Math.round(h*k));
    const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(src,x,y,w,h,0,0,out.width,out.height);return out;
  }
  function small(src,max=520){
    const k=Math.min(1,max/Math.max(src.width,src.height));if(k===1)return src;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*k));c.height=Math.max(1,Math.round(src.height*k));c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c;
  }

  function loadYT(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(window.__nuguYTApiPromise)return window.__nuguYTApiPromise;
    window.__nuguYTApiPromise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('yt_api_timeout')),9000);
      const prev=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{try{if(typeof prev==='function')prev();}catch{}clearTimeout(timer);resolve(window.YT);};
      let script=document.querySelector('script[data-nugu-yt-api]');
      if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.nuguYtApi='1';script.onerror=()=>{clearTimeout(timer);reject(new Error('yt_api_load'));};document.head.appendChild(script);}
      const poll=setInterval(()=>{if(window.YT?.Player){clearInterval(poll);clearTimeout(timer);resolve(window.YT);}},100);
      setTimeout(()=>clearInterval(poll),9200);
    });
    return window.__nuguYTApiPromise;
  }

  function fittedBox(W,H,ratio){
    let w=Math.max(1,W),h=w/ratio;
    if(h>H){h=Math.max(1,H);w=h*ratio;}
    return{w:Math.round(w),h:Math.round(h)};
  }
  async function waitDuration(yt,timeout=5000){
    const start=performance.now();
    while(performance.now()-start<timeout){
      let d=0;try{d=Number(yt.getDuration());}catch{}
      if(Number.isFinite(d)&&d>.15)return d;
      await wait(60);
    }
    return 0;
  }
  function safeTarget(requested,duration){
    const q=Math.max(.08,Number(requested)||0);
    if(Number.isFinite(duration)&&duration>.75)return Math.min(q,Math.max(.08,duration-.38));
    return q;
  }

  async function makeCleanPlayer(id,requested){
    const portrait=portraitMode(),ratio=portrait?9/16:16/9;
    const vw=Math.max(320,window.innerWidth||document.documentElement.clientWidth||1280);
    const vh=Math.max(320,window.innerHeight||document.documentElement.clientHeight||720);
    const box=fittedBox(vw*.88,vh*.88,ratio);
    if(box.w<MIN_STAGE_CSS||box.h<MIN_STAGE_CSS)throw new Error('frame_too_small');

    const veil=document.createElement('div');
    veil.className='nugu-capture-veil-v6';
    Object.assign(veil.style,{position:'fixed',inset:'0',zIndex:'2147482000',background:'#000',pointerEvents:'none'});
    const stage=document.createElement('div');
    stage.className='nugu-capture-stage-v6';
    Object.assign(stage.style,{position:'fixed',width:`${box.w}px`,height:`${box.h}px`,left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:'2147483000',background:'#000',overflow:'hidden',pointerEvents:'none'});

    const frame=document.createElement('iframe');
    frame.id=`nuguCapturePlayerV6_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    frame.title='NUGU clean capture player';
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.allow='autoplay; encrypted-media; picture-in-picture';
    frame.setAttribute('frameborder','0');
    Object.assign(frame.style,{width:'100%',height:'100%',display:'block',border:'0',background:'#000'});
    const origin=encodeURIComponent(location.origin);
    frame.src=`https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1&autoplay=1&mute=1&controls=0&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&origin=${origin}`;
    stage.appendChild(frame);
    document.body.appendChild(veil);document.body.appendChild(stage);

    const YT=await loadYT();let yt=null;
    try{
      yt=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('clean_player_timeout')),9000);
        const p=new YT.Player(frame.id,{events:{
          onReady:()=>{clearTimeout(timer);resolve(p);},
          onError:e=>{clearTimeout(timer);reject(new Error('clean_player_error_'+String(e?.data??'unknown')));}
        }});
      });
      yt.mute();
      try{yt.setOption?.('captions','track',{});}catch{}
      try{yt.setOption?.('captions','fontSize',0);}catch{}
      const duration=await waitDuration(yt),target=safeTarget(requested,duration),preRoll=Math.max(0,target-Math.min(1.1,target));
      yt.seekTo(preRoll,true);yt.playVideo();
      return{veil,stage,yt,portrait,ratio,box,duration,target};
    }catch(e){try{yt?.destroy?.();}catch{}stage.remove();veil.remove();throw e;}
  }

  async function syncPlayingTarget(yt,target,timeout=9000){
    const start=performance.now();let last=-1,stalled=0,retries=0;
    while(performance.now()-start<timeout){
      let state=-99,t=-1;try{state=yt.getPlayerState();t=Number(yt.getCurrentTime());}catch{}
      if(Number.isFinite(t)){
        if(Math.abs(t-last)<.008)stalled++;else stalled=0;
        last=t;
      }
      if(state===YT.PlayerState.PLAYING&&Number.isFinite(t)&&t>=target-.035&&t<=target+.22)return t;
      if((state===YT.PlayerState.BUFFERING||stalled>35)&&retries<2){retries++;const back=Math.max(0,target-.8);try{yt.seekTo(back,true);yt.playVideo();}catch{}stalled=0;await wait(120);}
      if(Number.isFinite(t)&&t>target+.28&&retries<2){retries++;try{yt.seekTo(Math.max(0,target-.65),true);yt.playVideo();}catch{}await wait(80);}
      await wait(22);
    }
    throw new Error('frame_sync_failed');
  }

  function geometryRect(stage,full){
    const r=stage.getBoundingClientRect();
    const vw=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
    const vh=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    if(!r.width||!r.height||!full.width||!full.height)return null;
    const sx=full.width/vw,sy=full.height/vh;
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<=0||sy<=0)return null;
    if(Math.abs(sx-sy)/Math.max(sx,sy)>.12)return null;
    const x=Math.round(r.left*sx),y=Math.round(r.top*sy),w=Math.round(r.width*sx),h=Math.round(r.height*sy);
    if(w<MIN_CAPTURE_PX||h<MIN_CAPTURE_PX||x<0||y<0||x+w>full.width+3||y+h>full.height+3)return null;
    return{x:Math.max(0,x),y:Math.max(0,y),w:Math.min(w,full.width-Math.max(0,x)),h:Math.min(h,full.height-Math.max(0,y)),sx,sy};
  }
  const CAL_MARKER_SIZE=40,CAL_MARKER_INSET=12;
  const CAL_MARKERS=[
    {key:'tl',rgb:[0,255,0],style:{left:`${CAL_MARKER_INSET}px`,top:`${CAL_MARKER_INSET}px`}},
    {key:'tr',rgb:[255,0,255],style:{right:`${CAL_MARKER_INSET}px`,top:`${CAL_MARKER_INSET}px`}},
    {key:'bl',rgb:[0,190,255],style:{left:`${CAL_MARKER_INSET}px`,bottom:`${CAL_MARKER_INSET}px`}},
    {key:'br',rgb:[255,230,0],style:{right:`${CAL_MARKER_INSET}px`,bottom:`${CAL_MARKER_INSET}px`}}
  ];
  function mountCalibration(){
    const layer=document.createElement('div');
    layer.className='nugu-capture-calibration-v6';
    Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:'2147483647',pointerEvents:'none'});
    for(const m of CAL_MARKERS){
      const dot=document.createElement('i');
      dot.dataset.marker=m.key;
      Object.assign(dot.style,{position:'absolute',width:`${CAL_MARKER_SIZE}px`,height:`${CAL_MARKER_SIZE}px`,borderRadius:'5px',boxShadow:'0 0 0 5px #000, inset 0 0 0 3px rgba(255,255,255,.95)',background:`rgb(${m.rgb.join(',')})`,...m.style});
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
    return layer;
  }
  function markerPixelMatch(key,R,G,B){
    if(key==='tl')return G>145&&G>R+55&&G>B+35;
    if(key==='tr')return R>145&&B>115&&R>G+55&&B>G+35;
    if(key==='bl')return B>145&&G>85&&B>R+60&&G>R+20;
    if(key==='br')return R>150&&G>120&&B<135&&R>B+55&&G>B+40;
    return false;
  }
  function markerSearchBox(src,key){
    const w=src.width,h=src.height,edgeX=Math.max(96,Math.floor(w*.34)),edgeY=Math.max(96,Math.floor(h*.34));
    if(key==='tl')return{x0:0,y0:0,x1:edgeX,y1:edgeY};
    if(key==='tr')return{x0:Math.max(0,w-edgeX),y0:0,x1:w-1,y1:edgeY};
    if(key==='bl')return{x0:0,y0:Math.max(0,h-edgeY),x1:edgeX,y1:h-1};
    return{x0:Math.max(0,w-edgeX),y0:Math.max(0,h-edgeY),x1:w-1,y1:h-1};
  }
  function markerCenter(src,key){
    const ctx=src.getContext('2d',{willReadFrequently:true}),d=ctx.getImageData(0,0,src.width,src.height).data;
    const box=markerSearchBox(src,key);
    let minX=src.width,minY=src.height,maxX=-1,maxY=-1,n=0,sumX=0,sumY=0;
    for(let y=box.y0;y<=box.y1;y++){
      for(let x=box.x0;x<=box.x1;x++){
        const i=(y*src.width+x)*4,R=d[i],G=d[i+1],B=d[i+2];
        if(markerPixelMatch(key,R,G,B)){
          minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);n++;sumX+=x;sumY+=y;
        }
      }
    }
    if(n<80||maxX<minX||maxY<minY)return null;
    const w=maxX-minX+1,h=maxY-minY+1;
    if(w<8||h<8||w>src.width*.18||h>src.height*.18)return null;
    return{x:sumX/n,y:sumY/n,w,h,n};
  }
  function calibrationRect(stage,full){
    const pts={};
    for(const m of CAL_MARKERS){const p=markerCenter(full,m.key);if(!p)return null;pts[m.key]=p;}
    const vw=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
    const vh=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);
    const markerCenterCss=CAL_MARKER_INSET+CAL_MARKER_SIZE/2;
    const cssDx=Math.max(1,vw-markerCenterCss*2),cssDy=Math.max(1,vh-markerCenterCss*2);
    const dx=((pts.tr.x-pts.tl.x)+(pts.br.x-pts.bl.x))/2;
    const dy=((pts.bl.y-pts.tl.y)+(pts.br.y-pts.tr.y))/2;
    const sx=dx/cssDx,sy=dy/cssDy;
    if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<=0||sy<=0)return null;
    if(Math.abs(sx-sy)/Math.max(sx,sy)>.18)return null;
    const ox=((pts.tl.x+pts.bl.x)/2)-markerCenterCss*sx;
    const oy=((pts.tl.y+pts.tr.y)/2)-markerCenterCss*sy;
    const css=stage.getBoundingClientRect();
    const x=Math.max(0,Math.round(ox+css.left*sx)),y=Math.max(0,Math.round(oy+css.top*sy));
    const ww=Math.min(full.width-x,Math.round(css.width*sx)),hh=Math.min(full.height-y,Math.round(css.height*sy));
    if(ww<MIN_CAPTURE_PX||hh<MIN_CAPTURE_PX||x+ww>full.width||y+hh>full.height)return null;
    return{x,y,w:ww,h:hh,sx,sy,ox,oy,calibrated:true};
  }
  async function waitForCalibration(streamVideoEl,stage,timeout=6500){
    const start=performance.now();let lastSize='';
    while(performance.now()-start<timeout){
      const full=snap(streamVideoEl),rect=calibrationRect(stage,full);
      lastSize=`${full.width}x${full.height}`;
      if(rect)return{full,rect};
      await wait(55);
    }
    const err=new Error('capture_surface_not_synced');err.captureSize=lastSize;throw err;
  }

  function horizontalRedBar(src){
    const a=small(src,480),w=a.width,h=a.height,d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    let best=0;
    for(let y=Math.floor(h*.90);y<h;y++){
      let run=0,maxRun=0;
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2];
        if(R>165&&R>G*1.65&&R>B*1.5){run++;maxRun=Math.max(maxRun,run);}else run=0;
      }
      best=Math.max(best,maxRun/w);
    }
    return best;
  }
  function frameQuality(src){
    const a=small(src,420),w=a.width,h=a.height,d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    let dark=0,flat=0,n=0,edges=0;let prev=null;
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const i=(y*w+x)*4,L=luma(d[i],d[i+1],d[i+2]);n++;if(L<8)dark++;if(prev!==null){const e=Math.abs(L-prev);if(e<1.5)flat++;edges+=e;}prev=L;}
    const darkRatio=dark/Math.max(1,n),flatRatio=flat/Math.max(1,n),redRun=horizontalRedBar(a),detail=edges/Math.max(1,n);
    const bad=darkRatio>.92||redRun>.58||detail<1.2;
    return{bad,score:redRun*60+darkRatio*8+flatRatio*1.5-detail*.03,redRun:+redRun.toFixed(4),dark:+darkRatio.toFixed(4),detail:+detail.toFixed(2)};
  }

  async function dataUrl(c,q=.94){return await new Promise((ok,bad)=>c.toBlob(b=>{if(!b)return bad(new Error('encode'));const r=new FileReader;r.onload=()=>ok(String(r.result||''));r.onerror=()=>bad(new Error('encode'));r.readAsDataURL(b);},'image/jpeg',q));}
  async function blobDataUrl(blob){return await new Promise((ok,bad)=>{const r=new FileReader;r.onload=()=>ok(String(r.result||''));r.onerror=()=>bad(new Error('read'));r.readAsDataURL(blob);});}
  function storeIncomingPayload(p){sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));return p;}
  async function save(c,m){
    const p={version:16,source:'watch',image:await dataUrl(c),artist:m.artist,artistSlug:m.artistSlug||'',title:m.title,contentUrl:m.url,time:m.requestedTime,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,captureMode:'canonical-fixed-render-v6',width:c.width,height:c.height,portrait:m.portrait,renderRatio:m.renderRatio,duration:m.duration,capturedVideoTime:m.capturedVideoTime,quality:m.quality,geometry:m.geometry};
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
    catch{const k=Math.min(1,1100/Math.max(c.width,c.height)),d=document.createElement('canvas');d.width=Math.round(c.width*k);d.height=Math.round(c.height*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);p.image=await dataUrl(d,.86);p.width=d.width;p.height=d.height;sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
    return p;
  }
  function showCaptureFailure(message,diag,transition){
    const screen=transition?.screen;
    if(!screen)return false;
    hideToast();
    screen.className='nugu-topkku-transition-screen nugu-topkku-failure';
    screen.textContent='';

    const panel=document.createElement('div');
    panel.className='nugu-topkku-failure-panel';
    const title=document.createElement('strong');
    title.textContent='탑꾸 장면 준비를 끝내지 못했어요';
    const bodyText=document.createElement('p');
    bodyText.textContent=message;
    const detail=document.createElement('small');
    detail.textContent=`단계: ${diag.phase||'unknown'} · ${diag.message||diag.name||'unknown'}${diag.captureSize?` · ${diag.captureSize}`:''}`;

    const actions=document.createElement('div');
    actions.className='nugu-topkku-preview-actions';
    const cancel=document.createElement('button');
    cancel.type='button';
    cancel.className='nugu-topkku-preview-retry';
    cancel.textContent='원래 영상 보기';
    const retry=document.createElement('button');
    retry.type='button';
    retry.className='nugu-topkku-preview-confirm';
    retry.textContent='다시 시도';
    actions.append(cancel,retry);
    panel.append(title,bodyText,detail,actions);
    screen.append(panel);

    cancel.addEventListener('click',()=>{endTopkkuTransition(transition);},{once:true});
    retry.addEventListener('click',()=>{
      endTopkkuTransition(transition);
      capture();
    },{once:true});
    requestAnimationFrame(()=>retry.focus());
    return true;
  }

  async function capture(){
    if(busy)return;busy=true;
    const buttons=[...body.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const id=videoId(),title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch',mt=$('.player-title p',body)?.textContent?.trim()||'',artist=mt.split('·')[0]?.trim()||'',artistSlug=body.dataset.artistSlug||'',url=$('.player-title a',body)?.href||'';
    pauseSourcePlayer();
    let transition=null,done=false,holdTransition=false,phase='server-frame';
    try{
      if(!id)throw new Error('video_id');
      if(!api)throw new Error('api_unavailable');
      await wait(80);
      const requested=targetTime();
      transition=beginTopkkuTransition();
      if(!transition)throw new Error('transition_unavailable');
      setState(`${timeLabel(requested)} 장면에서 YouTube UI 없는 영상 프레임을 만드는 중…`,'working');
      toast(`${timeLabel(requested)} · 순수 영상 프레임 준비 중…`);

      const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),28000);
      let r;
      try{
        r=await fetch(api+'/api/v1/media/youtube-frame',{
          method:'POST',
          headers:{'Content-Type':'application/json',Accept:'image/jpeg'},
          body:JSON.stringify({videoId:id,time:requested}),
          signal:ac.signal
        });
      }finally{clearTimeout(timer);}
      if(!r.ok){
        let code='server_frame_failed';
        try{const j=await r.json();code=j.error||code}catch{}
        throw new Error(code);
      }
      phase='server-frame-read';
      const blob=await r.blob(),image=await blobDataUrl(blob);
      const width=Number(r.headers.get('X-NUGU-Frame-Width')||0),height=Number(r.headers.get('X-NUGU-Frame-Height')||0);
      const capturedVideoTime=Number(r.headers.get('X-NUGU-Frame-Time')||requested);
      if(!image||width<MIN_CAPTURE_PX||height<MIN_CAPTURE_PX)throw new Error('invalid_server_frame');

      const payload=storeIncomingPayload({
        version:18,source:'watch',image,artist,artistSlug,title,contentUrl:url,time:requested,
        capturedVideoTime,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,
        manualCapture:false,captureMode:'server-decoded-video-frame-v1',width,height,
        quality:{uiFree:true,source:'decoded-video-element'},geometry:{mode:'server-video-element'}
      });

      phase='handoff';
      setState(`장면 준비 완료 ✓ ${width}×${height} · 탑꾸 편집기로 이동합니다`,'success');
      done=true;
      toast('탑꾸 편집기로 이동합니다','success');
      await wait(80);
      location.href='topkku.html?from=watch-clean-frame';
    }catch(err){
      console.error('server clean-frame Topkku failed',err);
      const c=String(err?.message||err),name=String(err?.name||'');
      const diag={version:18,phase,name,message:c,at:new Date().toISOString()};
      try{sessionStorage.setItem('nuguTopkkuCaptureDiag',JSON.stringify(diag));}catch{}
      window.__NUGU_TOPKKU_CAPTURE_DIAG__=diag;
      const msg=name==='AbortError'?'UI 없는 영상 프레임 준비가 지연됐어요. 다시 시도해 주세요.':c==='invalid_server_frame'?'서버가 영상 프레임을 만들었지만 결과 검증에 실패했어요.':c==='video_id'?'현재 영상 ID를 확인하지 못했어요.':c==='api_unavailable'?'탑꾸 프레임 서버에 연결할 수 없어요.':'UI 없는 영상 프레임을 만들지 못했어요. 다시 시도해 주세요.';
      setState(msg,'error');
      holdTransition=showCaptureFailure(msg,diag,transition);
      if(!holdTransition){toast(msg,'error');setTimeout(hideToast,4200);}
    }finally{
      if(!done&&!holdTransition)endTopkkuTransition(transition);
      buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  async function captureBrowserFallback(){
    if(busy)return;busy=true;
    const buttons=[...body.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const requested=targetTime(),id=videoId(),title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch',mt=$('.player-title p',body)?.textContent?.trim()||'',artist=mt.split('·')[0]?.trim()||'',artistSlug=body.dataset.artistSlug||'',url=$('.player-title a',body)?.href||'';
    pauseSourcePlayer();
    let transition=null;
    let stream=null,veil=null,stage=null,yt=null,done=false,holdTransition=false,phase='share-request';
    try{
      if(!id)throw new Error('video_id');
      setState(`${timeLabel(requested)} 장면을 멈췄어요. 현재 탭 허용을 기다리고 있어요.`,'working');toast(`① ${timeLabel(requested)} 장면 고정 ✓ · 현재 탭을 허용해 주세요`);
      const sharePromise=requestShare();
      stream=await sharePromise;
      phase='share-granted';
      setState('허용됐어요 · 캡처 화면을 연결하고 있어요.','working');toast('허용 완료 ✓ · 캡처 화면 연결 중…');
      const v=await streamVideo(stream);
      transition=beginTopkkuTransition();
      if(!transition)throw new Error('transition_unavailable');
      phase='transition';
      await wait(120);
      toast('② 화면 중앙에 UI 없는 전용 영상 프레임을 만드는 중…');setState('깨끗한 영상 프레임을 준비하고 있어요.','working');
      phase='clean-player';
      const clean=await makeCleanPlayer(id,requested);veil=clean.veil;stage=clean.stage;yt=clean.yt;

      let rect=null,captureGeometryMode='calibration',calibration=null;
      phase='region-crop';
      const region=await tryRegionCapture(stream,v,stage,clean.ratio);
      if(region){
        rect=region.rect;captureGeometryMode=region.mode;
        setState('브라우저가 영상 영역만 직접 분리했어요.','working');
      }else{
        phase='calibration';
        calibration=mountCalibration();
        const synced=await waitForCalibration(v,stage);
        rect=synced.rect;
        calibration.remove();calibration=null;
        await wait(120);
      }

      if(clean.duration>.75&&requested>clean.duration-.38)toast(`③ 영상 끝 UI를 피해서 ${timeLabel(clean.target)} 장면으로 자동 보정했어요`);
      else toast(`③ ${timeLabel(clean.target)} 장면을 깨끗하게 맞추는 중…`);
      const actualTime=await syncPlayingTarget(yt,clean.target);
      await wait(70);

      phase='frame-verify';
      toast('④ 영상 프레임 픽셀만 검증하는 중…');
      const candidates=[];
      for(let i=0;i<3;i++){
        if(i)await wait(8);
        let state=-99,t=-1;try{state=yt.getPlayerState();t=Number(yt.getCurrentTime());}catch{}
        if(state!==YT.PlayerState.PLAYING)continue;
        const full=snap(v),freshRect=captureGeometryMode==='region-capture'?{x:0,y:0,w:full.width,h:full.height,sx:1,sy:1,regionCapture:true}:{...rect};
        if(!freshRect)continue;
        const shot=crop(full,freshRect.x,freshRect.y,freshRect.w,freshRect.h),quality=frameQuality(shot);
        candidates.push({canvas:shot,quality,time:t,geometry:{sx:+freshRect.sx.toFixed(4),sy:+freshRect.sy.toFixed(4),mode:captureGeometryMode}});
      }
      candidates.sort((a,b)=>a.quality.score-b.quality.score);
      const best=candidates.find(x=>!x.quality.bad);
      if(!best)throw new Error('clean_frame_not_found');
      const expected=clean.ratio,got=best.canvas.width/best.canvas.height;
      if(Math.abs(got-expected)/expected>.055)throw new Error('ratio_mismatch');

      const payload=await save(best.canvas,{artist,artistSlug,title,url,requestedTime:requested,portrait:clean.portrait,renderRatio:+clean.ratio.toFixed(4),duration:+clean.duration.toFixed(3),capturedVideoTime:Number.isFinite(best.time)?best.time:actualTime,quality:best.quality,geometry:best.geometry});

      try{yt?.destroy?.();}catch{}yt=null;
      stage?.remove();stage=null;
      veil?.remove();veil=null;
      stream?.getTracks?.().forEach(t=>t.stop());stream=null;

      phase='handoff';
      setState(`장면 준비 완료 ✓ ${payload.width}×${payload.height} · 탑꾸 편집기로 이동합니다`,'success');
      done=true;
      toast('탑꾸 편집기로 이동합니다','success');
      await wait(80);
      location.href='topkku.html?from=watch';
    }catch(err){
      console.error('topkku capture v6 failed',err);
      const c=String(err?.message||err),name=String(err?.name||'');
      const diag={version:16,phase,name,message:c,captureSize:err?.captureSize||'',at:new Date().toISOString()};
      try{sessionStorage.setItem('nuguTopkkuCaptureDiag',JSON.stringify(diag));}catch{}
      window.__NUGU_TOPKKU_CAPTURE_DIAG__=diag;
      const msg=name==='InvalidStateError'?'브라우저가 화면 선택창을 열지 못했어요. 탑꾸 버튼을 다시 눌러 주세요.':name==='NotAllowedError'?'화면 선택이 취소되었거나 차단됐어요. 다시 눌러 현재 탭을 선택해 주세요.':name==='NotReadableError'?'현재 탭 화면을 읽지 못했어요. 다른 화면 공유를 닫고 다시 시도해 주세요.':c==='region_capture_wrong_tab'?'탑꾸가 열린 현재 NUGU RADAR 탭을 선택해 주세요. 다른 탭은 영상 영역만 분리할 수 없어요.':c.startsWith('region_capture_failed_')||c==='region_capture_resize_timeout'?'브라우저가 영상 영역 분리를 완료하지 못했어요. 다시 시도해 주세요.':c==='choose_tab'?'“현재 탭”을 선택해 주세요.':c==='frame_sync_failed'?'영상 장면이 안정적으로 재생되지 않아 저장하지 않았어요. 다시 시도해 주세요.':c==='clean_player_timeout'||c==='yt_api_timeout'?'캡처 전용 플레이어 준비가 지연됐어요. 다시 시도해 주세요.':c.startsWith('clean_player_error_')?'캡처 전용 YouTube 플레이어가 장면을 열지 못했어요.':c==='capture_surface_not_synced'?'현재 탭 캡처 화면이 영상 전용 프레임으로 바뀐 걸 확인하지 못했어요. 잘못된 영역은 저장하지 않았습니다.':c==='clean_frame_not_found'?'UI 없는 깨끗한 영상 프레임을 확인하지 못해 저장하지 않았어요.':c==='ratio_mismatch'?'영상 비율 검증에 실패해 잘못된 사진은 저장하지 않았어요.':c==='transition_unavailable'?'허용 후 캡처 화면 전환을 시작하지 못했어요. 다시 시도해 주세요.':'장면을 가져오지 못했어요. 다시 시도해 주세요.';
      setState(msg,'error');
      holdTransition=showCaptureFailure(msg,diag,transition);
      if(!holdTransition){toast(msg,'error');setTimeout(hideToast,4200);}
    }finally{
      try{yt?.destroy?.();}catch{}
      try{document.querySelector('.nugu-capture-calibration-v6')?.remove();}catch{}
      stage?.remove();veil?.remove();stream?.getTracks?.().forEach(t=>t.stop());
      if(!done&&!holdTransition)endTopkkuTransition(transition);
      buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  window.__NUGU_TOPKKU_BROWSER_FALLBACK__=captureBrowserFallback;
  const prewarmCaptureRuntime=()=>{loadYT().catch(()=>{})};
  window.addEventListener('nugu-watch-opened',prewarmCaptureRuntime);
  if(dialog.open)prewarmCaptureRuntime();
  document.addEventListener('click',e=>{const b=e.target.closest?.('#frameTopkkuButton');if(!b)return;e.preventDefault();e.stopImmediatePropagation();capture();},true);
})();
