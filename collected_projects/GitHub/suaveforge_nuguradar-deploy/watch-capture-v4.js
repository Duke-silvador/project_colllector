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

  function toast(text,state='working'){
    let el=document.getElementById('nuguTopkkuProgressV4');
    if(!el){
      el=document.createElement('div');
      el.id='nuguTopkkuProgressV4';
      Object.assign(el.style,{position:'fixed',right:'28px',bottom:'28px',zIndex:'2147483647',maxWidth:'360px',padding:'13px 16px',borderRadius:'16px',font:'700 14px/1.45 system-ui,sans-serif',color:'#fff',background:'rgba(14,17,22,.94)',border:'1px solid rgba(255,255,255,.16)',boxShadow:'0 16px 50px rgba(0,0,0,.45)',backdropFilter:'blur(14px)',pointerEvents:'none'});
      document.body.appendChild(el);
    }
    el.textContent=text;
    el.dataset.state=state;
    el.style.display='block';
    if(state==='error')el.style.borderColor='rgba(255,110,140,.65)';
    else if(state==='success')el.style.borderColor='rgba(82,224,172,.65)';
    else el.style.borderColor='rgba(177,157,255,.55)';
    return el;
  }
  function hideToast(){const el=document.getElementById('nuguTopkkuProgressV4');if(el)el.style.display='none';}

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
    const c=document.createElement('canvas');
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    return c;
  }
  function crop(src,x,y,w,h,max=1800){
    x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));
    w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
    const k=Math.min(1,max/Math.max(w,h)),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(w*k));out.height=Math.max(1,Math.round(h*k));
    const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(src,x,y,w,h,0,0,out.width,out.height);
    return out;
  }
  function small(src,max=520){
    const k=Math.min(1,max/Math.max(src.width,src.height));
    if(k===1)return src;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*k));c.height=Math.max(1,Math.round(src.height*k));c.getContext('2d').drawImage(src,0,0,c.width,c.height);return c;
  }

  function loadYT(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(window.__nuguYTApiPromise)return window.__nuguYTApiPromise;
    window.__nuguYTApiPromise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('yt_api_timeout')),9000);
      const prev=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{
        try{if(typeof prev==='function')prev();}catch{}
        clearTimeout(timer);resolve(window.YT);
      };
      let script=document.querySelector('script[data-nugu-yt-api]');
      if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.nuguYtApi='1';script.onerror=()=>{clearTimeout(timer);reject(new Error('yt_api_load'));};document.head.appendChild(script);}
      const poll=setInterval(()=>{if(window.YT?.Player){clearInterval(poll);clearTimeout(timer);resolve(window.YT);}},100);
      setTimeout(()=>clearInterval(poll),9200);
    });
    return window.__nuguYTApiPromise;
  }

  async function makeCleanPlayer(id,target){
    const h=host();if(!h)throw new Error('frame_not_found');
    const cs=getComputedStyle(h);if(cs.position==='static')h.style.position='relative';
    const stage=document.createElement('div');stage.className='nugu-capture-stage-v4';
    Object.assign(stage.style,{position:'absolute',inset:'0',zIndex:'2147483000',background:'#000',overflow:'hidden',pointerEvents:'none'});
    const slot=document.createElement('div');slot.id=`nuguCapturePlayerV4_${Date.now()}_${Math.random().toString(36).slice(2)}`;Object.assign(slot.style,{width:'100%',height:'100%'});stage.appendChild(slot);h.appendChild(stage);
    const YT=await loadYT();
    let yt=null;
    try{
      yt=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('clean_player_timeout')),9000);
        const p=new YT.Player(slot.id,{host:'https://www.youtube-nocookie.com',videoId:id,width:'100%',height:'100%',playerVars:{autoplay:1,mute:1,controls:0,rel:0,playsinline:1,disablekb:1,fs:0,iv_load_policy:3,start:Math.max(0,Math.floor(target)-1)},events:{onReady:()=>{clearTimeout(timer);resolve(p);},onError:()=>{clearTimeout(timer);reject(new Error('clean_player_error'));}}});
      });
      yt.mute();
      yt.seekTo(Math.max(0,target),true);
      yt.playVideo();
      return{stage,yt};
    }catch(e){try{yt?.destroy?.();}catch{}stage.remove();throw e;}
  }

  async function syncYT(yt,target,timeout=8500){
    const started=performance.now();let reseeked=false;
    while(performance.now()-started<timeout){
      let state=-99,t=-1;
      try{state=yt.getPlayerState();t=Number(yt.getCurrentTime());}catch{}
      if(state===YT.PlayerState.PLAYING&&Number.isFinite(t)&&t>=Math.max(0,target-.08)&&t<=target+.55)return t;
      if(Number.isFinite(t)&&t>target+.65&&!reseeked){reseeked=true;try{yt.seekTo(target,true);yt.playVideo();}catch{}}
      await wait(30);
    }
    throw new Error('frame_sync_failed');
  }

  const marks=[['tl',[11,246,164]],['tr',[246,29,171]],['bl',[29,171,246]],['br',[246,208,29]]];
  function markers(stage){
    const layer=document.createElement('div');Object.assign(layer.style,{position:'absolute',inset:'0',zIndex:'2147483600',pointerEvents:'none'});
    for(const[k,rgb]of marks){const n=document.createElement('i');Object.assign(n.style,{position:'absolute',width:'42px',height:'42px',background:`rgb(${rgb.join(',')})`,border:'5px solid #fff',boxShadow:'0 0 0 5px #000 inset',boxSizing:'border-box'});if(k[0]==='t')n.style.top='0';else n.style.bottom='0';if(k[1]==='l')n.style.left='0';else n.style.right='0';layer.appendChild(n);}stage.appendChild(layer);return layer;
  }
  function markerRect(full){
    const g=full.getContext('2d',{willReadFrequently:true}),d=g.getImageData(0,0,full.width,full.height).data,w=full.width,h=full.height;
    const hit=(target,q)=>{let minX=w,maxX=-1,minY=h,maxY=-1,n=0;const left=q[1]==='l',top=q[0]==='t',x0=left?0:Math.floor(w*.42),x1=left?Math.ceil(w*.58):w,y0=top?0:Math.floor(h*.20),y1=top?Math.ceil(h*.80):h;for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){const i=(y*w+x)*4;if(Math.abs(d[i]-target[0])<34&&Math.abs(d[i+1]-target[1])<34&&Math.abs(d[i+2]-target[2])<34){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++;}}return n>24?{minX,maxX,minY,maxY}:null;};
    const H={};for(const[k,rgb]of marks)H[k]=hit(rgb,k);if(!H.tl||!H.tr||!H.bl||!H.br)return null;
    const x=Math.min(H.tl.minX,H.bl.minX),y=Math.min(H.tl.minY,H.tr.minY),r=Math.max(H.tr.maxX,H.br.maxX),b=Math.max(H.bl.maxY,H.br.maxY);
    if(r-x<180||b-y<180)return null;
    return{x,y,w:r-x+1,h:b-y+1};
  }

  function lineStats(d,w,h,axis,index,a0,a1){
    let n=0,sum=0,sum2=0,edge=0,prev=null;
    if(axis==='x')for(let y=a0;y<a1;y+=2){const i=(y*w+index)*4,L=luma(d[i],d[i+1],d[i+2]);n++;sum+=L;sum2+=L*L;if(prev!==null)edge+=Math.abs(L-prev);prev=L;}
    else for(let x=a0;x<a1;x+=2){const i=(index*w+x)*4,L=luma(d[i],d[i+1],d[i+2]);n++;sum+=L;sum2+=L*L;if(prev!==null)edge+=Math.abs(L-prev);prev=L;}
    const mean=n?sum/n:0,std=n?Math.sqrt(Math.max(0,sum2/n-mean*mean)):0;return{mean,std,edge:n>1?edge/(n-1):0};
  }
  const hasContent=s=>s.mean>26||s.edge>5.2||(s.mean>11&&s.std>18);
  function edgeRun(flags,fromStart){
    const n=flags.length,run=Math.max(5,Math.round(n*.018));
    if(fromStart){for(let i=0;i<n-run;i++){let q=0;for(let j=0;j<run;j++)if(flags[i+j])q++;if(q>=run*.72)return i;}return 0;}
    for(let i=n-1;i>=run;i--){let q=0;for(let j=0;j<run;j++)if(flags[i-j])q++;if(q>=run*.72)return i;}return n-1;
  }
  function actualVideo(src){
    const a=small(src),w=a.width,h=a.height,d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const cols=[];for(let x=0;x<w;x++)cols.push(hasContent(lineStats(d,w,h,'x',x,Math.floor(h*.10),Math.ceil(h*.90))));
    let l=edgeRun(cols,true),r=edgeRun(cols,false),lf=l/w,rf=(w-1-r)/w;
    const symmetricX=lf>.025&&rf>.025&&Math.abs(lf-rf)<.13&&(1-lf-rf)>.20;
    if(!symmetricX){l=0;r=w-1;lf=rf=0;}
    const rows=[],x0=Math.floor(l+(r-l)*.10),x1=Math.ceil(r-(r-l)*.10);for(let y=0;y<h;y++)rows.push(hasContent(lineStats(d,w,h,'y',y,x0,x1)));
    let t=edgeRun(rows,true),b=edgeRun(rows,false),tf=t/h,bf=(h-1-b)/h;
    const symmetricY=tf>.025&&bf>.025&&Math.abs(tf-bf)<.13&&(1-tf-bf)>.20;
    if(!symmetricY){t=0;b=h-1;tf=bf=0;}
    const padX=Math.round(w*.004),padY=Math.round(h*.004);l=Math.max(0,l-padX);r=Math.min(w-1,r+padX);t=Math.max(0,t-padY);b=Math.min(h-1,b+padY);
    const sx=src.width/w,sy=src.height/h,out=crop(src,l*sx,t*sy,(r-l+1)*sx,(b-t+1)*sy);
    if(out.width<180||out.height<220)throw new Error('content_too_small');
    return{canvas:out,meta:{left:+lf.toFixed(3),right:+rf.toFixed(3),top:+tf.toFixed(3),bottom:+bf.toFixed(3),ratio:+(out.width/out.height).toFixed(3)}};
  }

  function uiScore(src){
    const a=small(src,420),w=a.width,h=a.height,d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    let red=0,rn=0,centerWhite=0,cn=0;
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2],L=luma(R,G,B),sat=Math.max(R,G,B)-Math.min(R,G,B);if(y>h*.86){rn++;if(R>145&&R>G*1.45&&R>B*1.45)red++;}if(Math.abs(x-w/2)<w*.07&&Math.abs(y-h/2)<h*.07){cn++;if(L>190&&sat<70)centerWhite++;}}
    const rr=rn?red/rn:0,cr=cn?centerWhite/cn:0;return{score:rr*45+cr*18,bad:rr>.009||cr>.13,red:rr,center:cr};
  }

  async function dataUrl(c,q=.94){return await new Promise((ok,bad)=>c.toBlob(b=>{if(!b)return bad(new Error('encode'));const r=new FileReader;r.onload=()=>ok(String(r.result||''));r.onerror=()=>bad(new Error('encode'));r.readAsDataURL(b);},'image/jpeg',q));}
  async function save(c,m){
    const p={version:14,source:'watch',image:await dataUrl(c),artist:m.artist,title:m.title,contentUrl:m.url,time:m.time,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,captureMode:'clean-yt-api-v4',width:c.width,height:c.height,autoFrame:m.autoFrame,uiScore:m.uiScore,capturedVideoTime:m.capturedVideoTime};
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
    catch{const k=Math.min(1,1100/Math.max(c.width,c.height)),d=document.createElement('canvas');d.width=Math.round(c.width*k);d.height=Math.round(c.height*k);d.getContext('2d').drawImage(c,0,0,d.width,d.height);p.image=await dataUrl(d,.86);p.width=d.width;p.height=d.height;sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(p));}
  }

  async function capture(){
    if(busy)return;busy=true;
    const buttons=[...body.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const target=targetTime(),id=videoId(),title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch',mt=$('.player-title p',body)?.textContent?.trim()||'',artist=mt.split('·')[0]?.trim()||'',url=$('.player-title a',body)?.href||'';
    let stream=null,stage=null,yt=null,mark=null;
    try{
      if(!id)throw new Error('video_id');
      setState('현재 탭 허용을 기다리고 있어요.','working');toast('① 현재 탭을 허용해 주세요 · 허용 뒤 자동으로 계속 진행돼요');
      stream=await requestShare();
      toast('② 허용 완료 · UI 없는 영상 플레이어를 준비하는 중…');setState('허용 완료 · 깨끗한 영상 장면을 준비하고 있어요.','working');
      const v=await streamVideo(stream);
      const clean=await makeCleanPlayer(id,target);stage=clean.stage;yt=clean.yt;
      toast(`③ ${timeLabel(target)} 장면에 맞추는 중…`);
      const actualTime=await syncYT(yt,target);
      toast('④ 영상 위치 확인 완료 · 실제 영상 픽셀만 자르는 중…');
      mark=markers(stage);await wait(180);const rect=markerRect(snap(v));mark.remove();mark=null;if(!rect)throw new Error('frame_detection_failed');
      hideToast();await wait(120);
      const candidates=[];
      for(let i=0;i<7;i++){if(i)await wait(55);let shot=crop(snap(v),rect.x,rect.y,rect.w,rect.h);const e=actualVideo(shot),ui=uiScore(e.canvas);candidates.push({canvas:e.canvas,autoFrame:e.meta,ui});}
      candidates.sort((a,b)=>a.ui.score-b.ui.score);const best=candidates[0];if(!best||best.ui.bad)throw new Error('youtube_ui_visible');
      if(dialog.classList.contains('is-vertical')&&best.canvas.width/best.canvas.height>1.08)throw new Error('vertical_content_not_found');
      await save(best.canvas,{artist,title,url,time:target,autoFrame:best.autoFrame,uiScore:best.ui,capturedVideoTime:actualTime});
      setState(`영상만 가져왔어요 ✓ ${best.canvas.width}×${best.canvas.height}`,'success');toast('완료 ✓ 탑꾸로 이동합니다','success');await wait(180);location.href='topkku.html?from=watch';
    }catch(err){
      console.error('topkku capture v4 failed',err);const c=String(err?.message||err);
      const msg=c==='choose_tab'?'“현재 탭”을 선택해 주세요.':c==='frame_sync_failed'?'영상 장면 동기화에 실패했어요. 다시 누르면 새로 시도합니다.':c==='clean_player_timeout'||c==='yt_api_timeout'?'캡처 전용 플레이어 준비가 지연됐어요. 다시 시도해 주세요.':c==='youtube_ui_visible'?'플레이어 UI가 남아 있어 잘못된 사진은 저장하지 않았어요. 다시 시도해 주세요.':c.includes('frame')||c.includes('content')||c.includes('vertical')?'실제 영상 영역을 확실히 찾지 못해 저장하지 않았어요.':'장면을 가져오지 못했어요. 다시 시도해 주세요.';
      setState(msg,'error');toast(msg,'error');setTimeout(hideToast,4200);
    }finally{
      mark?.remove();try{yt?.destroy?.();}catch{}stage?.remove();stream?.getTracks?.().forEach(t=>t.stop());buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  document.addEventListener('click',e=>{const b=e.target.closest?.('#frameTopkkuButton');if(!b)return;e.preventDefault();e.stopImmediatePropagation();capture();},true);
})();
