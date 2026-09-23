(()=>{
  const dialog=document.getElementById('watchPlayer');
  const body=document.getElementById('playerBody');
  if(!dialog||!body)return;

  let busy=false;
  const $=(s,r=document)=>r.querySelector(s);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const host=()=>$('.player-frame',body);
  const sourceFrame=()=>$('.player-frame iframe',body);
  const luma=(r,g,b)=>r*.2126+g*.7152+b*.0722;

  function setState(text,state=''){
    const el=$('#frameTopkkuState',body);
    if(el){el.textContent=text;el.dataset.state=state;}
  }
  function targetTime(){
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
    let el=document.getElementById('nuguTopkkuProgressV5');
    if(!el){
      el=document.createElement('div');
      el.id='nuguTopkkuProgressV5';
      Object.assign(el.style,{position:'fixed',right:'28px',bottom:'28px',zIndex:'2147483647',maxWidth:'390px',padding:'13px 16px',borderRadius:'16px',font:'700 14px/1.45 system-ui,sans-serif',color:'#fff',background:'rgba(14,17,22,.94)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 16px 50px rgba(0,0,0,.45)',backdropFilter:'blur(14px)',pointerEvents:'none'});
      document.body.appendChild(el);
    }
    el.textContent=text;el.dataset.state=state;el.style.display='block';
    el.style.borderColor=state==='error'?'rgba(255,110,140,.65)':state==='success'?'rgba(82,224,172,.65)':'rgba(177,157,255,.55)';
    return el;
  }
  function hideToast(){const el=document.getElementById('nuguTopkkuProgressV5');if(el)el.style.display='none';}

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
    const h=host();if(!h)throw new Error('frame_not_found');
    const cs=getComputedStyle(h);if(cs.position==='static')h.style.position='relative';
    const portrait=portraitMode(),ratio=portrait?9/16:16/9,box=fittedBox(h.clientWidth||h.getBoundingClientRect().width,h.clientHeight||h.getBoundingClientRect().height,ratio);
    if(box.w<180||box.h<180)throw new Error('frame_too_small');

    const stage=document.createElement('div');stage.className='nugu-capture-stage-v5';
    Object.assign(stage.style,{position:'absolute',width:`${box.w}px`,height:`${box.h}px`,left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:'2147483000',background:'#000',overflow:'hidden',pointerEvents:'none',contain:'strict'});
    const slot=document.createElement('div');slot.id=`nuguCapturePlayerV5_${Date.now()}_${Math.random().toString(36).slice(2)}`;Object.assign(slot.style,{width:'100%',height:'100%'});stage.appendChild(slot);h.appendChild(stage);

    const YT=await loadYT();let yt=null;
    try{
      yt=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('clean_player_timeout')),9000);
        const p=new YT.Player(slot.id,{host:'https://www.youtube-nocookie.com',videoId:id,width:'100%',height:'100%',playerVars:{autoplay:1,mute:1,controls:0,rel:0,playsinline:1,disablekb:1,fs:0,iv_load_policy:3,origin:location.origin},events:{onReady:()=>{clearTimeout(timer);resolve(p);},onError:()=>{clearTimeout(timer);reject(new Error('clean_player_error'));}}});
      });
      yt.mute();
      const duration=await waitDuration(yt),target=safeTarget(requested,duration),preRoll=Math.max(0,target-Math.min(1.1,target));
      yt.seekTo(preRoll,true);yt.playVideo();
      return{stage,yt,portrait,ratio,box,duration,target};
    }catch(e){try{yt?.destroy?.();}catch{}stage.remove();throw e;}
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

  const marks=[['tl',[13,241,157]],['tr',[241,31,169]],['bl',[31,167,241]],['br',[241,203,31]]];
  function markers(stage){
    const layer=document.createElement('div');Object.assign(layer.style,{position:'absolute',inset:'0',zIndex:'2147483600',pointerEvents:'none'});
    for(const[k,rgb]of marks){const n=document.createElement('i');Object.assign(n.style,{position:'absolute',width:'38px',height:'38px',background:`rgb(${rgb.join(',')})`,boxShadow:'0 0 0 5px #000 inset',boxSizing:'border-box'});if(k[0]==='t')n.style.top='0';else n.style.bottom='0';if(k[1]==='l')n.style.left='0';else n.style.right='0';layer.appendChild(n);}stage.appendChild(layer);return layer;
  }
  function markerRect(full){
    const g=full.getContext('2d',{willReadFrequently:true}),d=g.getImageData(0,0,full.width,full.height).data,w=full.width,h=full.height;
    const hit=(target,q)=>{let minX=w,maxX=-1,minY=h,maxY=-1,n=0;const left=q[1]==='l',top=q[0]==='t',x0=left?0:Math.floor(w*.40),x1=left?Math.ceil(w*.60):w,y0=top?0:Math.floor(h*.16),y1=top?Math.ceil(h*.84):h;for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){const i=(y*w+x)*4;if(Math.abs(d[i]-target[0])<38&&Math.abs(d[i+1]-target[1])<38&&Math.abs(d[i+2]-target[2])<38){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++;}}return n>18?{minX,maxX,minY,maxY}:null;};
    const H={};for(const[k,rgb]of marks)H[k]=hit(rgb,k);if(!H.tl||!H.tr||!H.bl||!H.br)return null;
    const x=Math.min(H.tl.minX,H.bl.minX),y=Math.min(H.tl.minY,H.tr.minY),r=Math.max(H.tr.maxX,H.br.maxX),b=Math.max(H.bl.maxY,H.br.maxY);
    if(r-x<150||b-y<150)return null;return{x,y,w:r-x+1,h:b-y+1};
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
  async function save(c,m){
    const p={version:15,source:'watch',image:await dataUrl(c),artist:m.artist,title:m.title,contentUrl:m.url,time:m.requestedTime,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,captureMode:'canonical-yt-render-v5',width:c.width,height:c.height,portrait:m.portrait,renderRatio:m.renderRatio,duration:m.duration,capturedVideoTime:m.capturedVideoTime,quality:m.quality};
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
    catch{const k=Math.min(1,1100/Math.max(c.width,c.height)),d=document.createElement('canvas');d.width=Math.round(c.width*k);d.height=Math.round(c.height*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);p.image=await dataUrl(d,.86);p.width=d.width;p.height=d.height;sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
  }

  async function capture(){
    if(busy)return;busy=true;
    const buttons=[...body.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const requested=targetTime(),id=videoId(),title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch',mt=$('.player-title p',body)?.textContent?.trim()||'',artist=mt.split('·')[0]?.trim()||'',url=$('.player-title a',body)?.href||'';
    let stream=null,stage=null,yt=null,mark=null;
    try{
      if(!id)throw new Error('video_id');
      setState('현재 탭 허용을 기다리고 있어요.','working');toast('① 현재 탭을 허용해 주세요 · 허용 뒤 자동으로 진행돼요');
      stream=await requestShare();
      toast('② UI 없는 전용 영상 프레임을 만드는 중…');setState('허용 완료 · 깨끗한 영상 프레임을 준비하고 있어요.','working');
      const v=await streamVideo(stream),clean=await makeCleanPlayer(id,requested);stage=clean.stage;yt=clean.yt;

      mark=markers(stage);await wait(180);const rect=markerRect(snap(v));mark.remove();mark=null;if(!rect)throw new Error('frame_detection_failed');
      await wait(100);

      if(clean.duration>.75&&requested>clean.duration-.38)toast(`③ 영상 끝 UI를 피해서 ${timeLabel(clean.target)} 장면으로 자동 보정했어요`);
      else toast(`③ ${timeLabel(clean.target)} 장면을 깨끗하게 맞추는 중…`);
      const actualTime=await syncPlayingTarget(yt,clean.target);
      await wait(75);

      toast('④ 실제 영상 프레임만 확인하는 중…');
      const candidates=[];
      for(let i=0;i<5;i++){
        if(i)await wait(34);
        let state=-99,t=-1;try{state=yt.getPlayerState();t=Number(yt.getCurrentTime());}catch{}
        if(state!==YT.PlayerState.PLAYING)continue;
        const shot=crop(snap(v),rect.x,rect.y,rect.w,rect.h),quality=frameQuality(shot);
        candidates.push({canvas:shot,quality,time:t});
      }
      candidates.sort((a,b)=>a.quality.score-b.quality.score);
      const best=candidates.find(x=>!x.quality.bad);
      if(!best)throw new Error('clean_frame_not_found');
      const expected=clean.ratio,got=best.canvas.width/best.canvas.height;
      if(Math.abs(got-expected)/expected>.075)throw new Error('ratio_mismatch');

      await save(best.canvas,{artist,title,url,requestedTime:requested,portrait:clean.portrait,renderRatio:+clean.ratio.toFixed(4),duration:+clean.duration.toFixed(3),capturedVideoTime:Number.isFinite(best.time)?best.time:actualTime,quality:best.quality});
      setState(`영상 프레임만 가져왔어요 ✓ ${best.canvas.width}×${best.canvas.height}`,'success');toast('완료 ✓ 탑꾸로 이동합니다','success');await wait(180);location.href='topkku.html?from=watch';
    }catch(err){
      console.error('topkku capture v5 failed',err);const c=String(err?.message||err);
      const msg=c==='choose_tab'?'“현재 탭”을 선택해 주세요.':c==='frame_sync_failed'?'영상 장면이 안정적으로 재생되지 않아 저장하지 않았어요. 다시 시도해 주세요.':c==='clean_player_timeout'||c==='yt_api_timeout'?'캡처 전용 플레이어 준비가 지연됐어요. 다시 시도해 주세요.':c==='clean_frame_not_found'?'UI 없는 깨끗한 영상 프레임을 확인하지 못해 저장하지 않았어요.':c==='ratio_mismatch'?'영상 비율 검증에 실패해 잘못된 사진은 저장하지 않았어요.':c.includes('frame')?'실제 영상 프레임 위치를 확실히 찾지 못해 저장하지 않았어요.':'장면을 가져오지 못했어요. 다시 시도해 주세요.';
      setState(msg,'error');toast(msg,'error');setTimeout(hideToast,4200);
    }finally{
      mark?.remove();try{yt?.destroy?.();}catch{}stage?.remove();stream?.getTracks?.().forEach(t=>t.stop());buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  document.addEventListener('click',e=>{const b=e.target.closest?.('#frameTopkkuButton');if(!b)return;e.preventDefault();e.stopImmediatePropagation();capture();},true);
})();
