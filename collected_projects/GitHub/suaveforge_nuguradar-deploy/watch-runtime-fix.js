(()=>{
  const player=document.getElementById('watchPlayer');
  const playerBody=document.getElementById('playerBody');
  if(!player||!playerBody)return;

  const TOPKKU_RATIO=2/3;
  let lockY=0,locked=false,busy=false,ytCurrent=0;
  const $=(s,r=document)=>r.querySelector(s);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const iframe=()=>$('.player-frame iframe',playerBody);
  const frameHost=()=>$('.player-frame',playerBody);

  function sendYT(func,args=[]){
    const f=iframe();
    if(!f?.contentWindow)return;
    try{f.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*')}catch{}
  }
  function timeValue(){
    const t=($('#frameTopkkuTime',playerBody)?.textContent||'0:00').trim();
    const p=t.split(':');
    return Math.max(0,(Number(p[0])||0)*60+(Number(p[1])||0));
  }
  function timeLabel(s){
    const n=Math.max(0,Number(s)||0),m=Math.floor(n/60),x=n-m*60;
    return `${m}:${x.toFixed(1).padStart(4,'0')}`;
  }
  function state(text,type=''){
    const el=$('#frameTopkkuState',playerBody);
    if(el){el.textContent=text;el.dataset.state=type}
  }
  window.addEventListener('message',e=>{
    const f=iframe();if(!f||e.source!==f.contentWindow)return;
    let data=e.data;try{if(typeof data==='string')data=JSON.parse(data)}catch{return}
    const t=Number(data?.info?.currentTime);if(Number.isFinite(t)&&t>=0)ytCurrent=t;
  });

  function hardLock(){
    if(locked)return;
    locked=true;
    lockY=window.scrollY||0;
    document.documentElement.style.overflow='hidden';
    document.documentElement.style.height='100%';
    Object.assign(document.body.style,{position:'fixed',top:`-${lockY}px`,left:'0',right:'0',width:'100%',overflow:'hidden'});
    player.style.overflow='hidden';
  }
  function hardUnlock(){
    if(!locked)return;
    locked=false;
    document.documentElement.style.overflow='';
    document.documentElement.style.height='';
    Object.assign(document.body.style,{position:'',top:'',left:'',right:'',width:'',overflow:''});
    window.scrollTo(0,lockY);
  }
  window.addEventListener('nugu-watch-opened',()=>{hardLock();requestAnimationFrame(()=>{player.style.overflow='hidden'})});
  player.addEventListener('close',hardUnlock);

  async function streamVideo(stream){
    const v=document.createElement('video');
    v.muted=true;v.playsInline=true;v.srcObject=stream;
    await new Promise((ok,bad)=>{
      const id=setTimeout(()=>bad(new Error('capture_timeout')),7000);
      v.onloadedmetadata=()=>{clearTimeout(id);ok()};
      v.onerror=()=>{clearTimeout(id);bad(new Error('capture_video_error'))};
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
  function crop(src,x,y,w,h,max=1600){
    x=Math.max(0,Math.round(x));y=Math.max(0,Math.round(y));
    w=Math.max(1,Math.min(src.width-x,Math.round(w)));h=Math.max(1,Math.min(src.height-y,Math.round(h)));
    const k=Math.min(1,max/Math.max(w,h)),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(w*k));out.height=Math.max(1,Math.round(h*k));
    const c=out.getContext('2d');c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(src,x,y,w,h,0,0,out.width,out.height);
    return out;
  }
  function analysisCanvas(src,maxSide=360){
    const k=Math.min(1,maxSide/Math.max(src.width,src.height));
    if(k===1)return src;
    const out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(src.width*k));out.height=Math.max(1,Math.round(src.height*k));
    out.getContext('2d').drawImage(src,0,0,out.width,out.height);
    return out;
  }

  async function cropTrackToIframe(track){
    const Crop=globalThis.CropTarget;
    const el=iframe();
    if(!Crop?.fromElement||typeof track?.cropTo!=='function'||!el)return false;
    try{
      const target=await Crop.fromElement(el);
      await Promise.race([track.cropTo(target),new Promise((_,reject)=>setTimeout(()=>reject(new Error('region_timeout')),1800))]);
      await wait(180);
      return true;
    }catch(e){
      console.warn('Region Capture unavailable; trying strict pixel calibration',e);
      return false;
    }
  }

  const marks=[['tl',[0,255,153]],['tr',[255,0,153]],['bl',[0,153,255]],['br',[255,204,0]]];
  function addMarks(){
    const h=frameHost();if(!h)return null;
    h.style.position='relative';$('.nugu-pixel-cal',h)?.remove();
    const layer=document.createElement('div');layer.className='nugu-pixel-cal';
    Object.assign(layer.style,{position:'absolute',inset:'0',zIndex:'2147483646',pointerEvents:'none'});
    for(const [key,rgb] of marks){
      const m=document.createElement('i');m.dataset.k=key;
      Object.assign(m.style,{position:'absolute',width:'44px',height:'44px',background:`rgb(${rgb.join(',')})`,boxShadow:'0 0 0 6px #000 inset',border:'4px solid #fff',boxSizing:'border-box'});
      if(key.includes('t'))m.style.top='0';else m.style.bottom='0';
      if(key.includes('l'))m.style.left='0';else m.style.right='0';
      layer.appendChild(m);
    }
    h.appendChild(layer);return layer;
  }
  function near(rgb,t){return Math.abs(rgb[0]-t[0])<38&&Math.abs(rgb[1]-t[1])<38&&Math.abs(rgb[2]-t[2])<38}
  function locateColor(data,w,h,target,quadrant){
    let minX=w,maxX=-1,minY=h,maxY=-1,n=0;
    const x0=quadrant.includes('l')?0:Math.floor(w*.45),x1=quadrant.includes('l')?Math.ceil(w*.55):w;
    const y0=quadrant.includes('t')?0:Math.floor(h*.35),y1=quadrant.includes('t')?Math.ceil(h*.65):h;
    for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
      const i=(y*w+x)*4;
      if(near([data[i],data[i+1],data[i+2]],target)){
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++;
      }
    }
    return n>36?{minX,maxX,minY,maxY,n}:null;
  }
  function pixelRect(full){
    const ctx=full.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,full.width,full.height),hits={};
    for(const [key,rgb] of marks)hits[key]=locateColor(img.data,full.width,full.height,rgb,key);
    if(!hits.tl||!hits.tr||!hits.bl||!hits.br)return null;
    const left=Math.min(hits.tl.minX,hits.bl.minX),right=Math.max(hits.tr.maxX,hits.br.maxX),top=Math.min(hits.tl.minY,hits.tr.minY),bottom=Math.max(hits.bl.maxY,hits.br.maxY);
    if(right-left<220||bottom-top<220)return null;
    const ratio=(right-left)/(bottom-top);
    if(!Number.isFinite(ratio)||ratio<.35||ratio>3.2)return null;
    return{x:left,y:top,w:right-left+1,h:bottom-top+1};
  }

  function luma(r,g,b){return r*.2126+g*.7152+b*.0722}
  function edgeRow(d,w,y,x0,x1){
    let score=0,n=0,bright=0,dark=0;
    for(let x=Math.max(2,x0);x<x1-2;x+=2){
      const i=(y*w+x)*4,j=(y*w+x-2)*4;
      const L=luma(d[i],d[i+1],d[i+2]),P=luma(d[j],d[j+1],d[j+2]);
      score+=Math.abs(L-P);n++;if(L>185)bright++;if(L<55)dark++;
    }
    return n?{edge:score/n,bright:bright/n,dark:dark/n}:{edge:0,bright:0,dark:0};
  }
  function edgeCol(d,w,h,x,y0,y1){
    let score=0,n=0,dark=0;
    for(let y=Math.max(2,y0);y<y1-2;y+=2){
      const i=(y*w+x)*4,j=((y-2)*w+x)*4;
      const L=luma(d[i],d[i+1],d[i+2]),P=luma(d[j],d[j+1],d[j+2]);
      score+=Math.abs(L-P);n++;if(L<55)dark++;
    }
    return n?{edge:score/n,dark:dark/n}:{edge:0,dark:0};
  }
  function trimLetterbox(c){
    const a=analysisCanvas(c,420),w=a.width,h=a.height;
    if(w<120||h<160)return c;
    const d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    let l=0,r=w-1,t=0,b=h-1;
    const y0=Math.floor(h*.12),y1=Math.ceil(h*.88),x0=Math.floor(w*.15),x1=Math.ceil(w*.85);
    const sideCap=Math.floor(w*.28),vertCap=Math.floor(h*.18);
    while(l<sideCap){const s=edgeCol(d,w,h,l,y0,y1);if(s.dark<.86||s.edge>7.5)break;l+=2}
    while(r>w-1-sideCap){const s=edgeCol(d,w,h,r,y0,y1);if(s.dark<.86||s.edge>7.5)break;r-=2}
    while(t<vertCap){const s=edgeRow(d,w,t,Math.max(l,x0),Math.min(r,x1));if(s.dark<.88||s.edge>7.5)break;t+=2}
    while(b>h-1-vertCap){const s=edgeRow(d,w,b,Math.max(l,x0),Math.min(r,x1));if(s.dark<.88||s.edge>7.5)break;b-=2}
    if(r-l<w*.48||b-t<h*.55)return c;
    const sx=c.width/w,sy=c.height/h;
    return crop(c,l*sx,t*sy,(r-l+1)*sx,(b-t+1)*sy);
  }

  function trimYoutubeChrome(c){
    const a=analysisCanvas(c,420),w=a.width,h=a.height;
    if(w<160||h<220)return c;
    const ctx=a.getContext('2d',{willReadFrequently:true}),d=ctx.getImageData(0,0,w,h).data;
    let topCut=0,bottomCut=h;
    const topLimit=Math.floor(h*.135);
    let lastTop=-1,activeTop=0,darkTop=0;
    for(let y=2;y<topLimit;y+=2){
      const s=edgeRow(d,w,y,Math.floor(w*.035),Math.floor(w*.66));
      if(s.edge>18&&s.bright>.045){lastTop=y;activeTop++}
      darkTop+=s.dark;
    }
    darkTop/=Math.max(1,Math.floor(topLimit/2));
    if(activeTop>=4&&lastTop>4&&darkTop>.34)topCut=Math.min(Math.floor(h*.13),lastTop+8);

    let progressY=-1,progressRatio=0;
    for(let y=Math.floor(h*.84);y<h;y+=2){
      let red=0,n=0;
      for(let x=0;x<w;x+=3){
        const i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2];n++;
        if(R>145&&R>G*1.42&&R>B*1.42)red++;
      }
      const q=n?red/n:0;if(q>progressRatio){progressRatio=q;progressY=y}
    }
    let cornerBright=0,cornerN=0;
    for(let y=Math.floor(h*.91);y<h;y+=2){
      for(const [x0,x1] of [[0,Math.floor(w*.27)],[Math.floor(w*.78),w]]){
        for(let x=x0;x<x1;x+=3){const i=(y*w+x)*4,L=luma(d[i],d[i+1],d[i+2]);cornerN++;if(L>190)cornerBright++}
      }
    }
    const brightRatio=cornerN?cornerBright/cornerN:0;
    if(progressRatio>.032&&progressY>h*.84)bottomCut=Math.min(bottomCut,Math.max(Math.floor(h*.87),progressY-4));
    else if(brightRatio>.025)bottomCut=Math.floor(h*.955);

    if(!topCut&&bottomCut===h)return c;
    const sy=c.height/h;
    const y=topCut*sy,hh=(bottomCut-topCut)*sy;
    if(hh<c.height*.72)return c;
    return crop(c,0,y,c.width,hh);
  }

  function trimCutEdgeText(c){
    const a=analysisCanvas(c,420),w=a.width,h=a.height;
    if(w<160||h<220)return c;
    const d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    let noisy=0,first=h;
    for(let y=Math.floor(h*.91);y<h;y+=2){
      const s=edgeRow(d,w,y,Math.floor(w*.03),Math.floor(w*.84));
      if(s.edge>21&&s.bright>.025){noisy++;first=Math.min(first,y)}
    }
    if(noisy<3||first>h*.975)return c;
    const sy=c.height/h,cut=Math.min(c.height*.065,(h-first+4)*sy);
    return cut>=4?crop(c,0,0,c.width,c.height-cut):c;
  }

  function skinLike(r,g,b){
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    return r>80&&g>35&&b>18&&(mx-mn)>18&&r>g*.96&&r>b*1.05&&Math.abs(r-g)>6;
  }
  function saliencyProjection(c){
    const a=analysisCanvas(c,320),w=a.width,h=a.height;
    const d=a.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const rows=new Float64Array(h),cols=new Float64Array(w);
    let total=0,cx=0,cy=0;
    for(let y=1;y<h-1;y+=2){
      for(let x=1;x<w-1;x+=2){
        const i=(y*w+x)*4,ir=(y*w+x+1)*4,id=((y+1)*w+x)*4;
        const R=d[i],G=d[i+1],B=d[i+2],L=luma(R,G,B);
        const edge=Math.abs(L-luma(d[ir],d[ir+1],d[ir+2]))+Math.abs(L-luma(d[id],d[id+1],d[id+2]));
        const sat=Math.max(R,G,B)-Math.min(R,G,B);
        const skin=skinLike(R,G,B)?52:0;
        const centerX=1-Math.min(1,Math.abs(x/w-.5)*1.5),centerY=1-Math.min(1,Math.abs(y/h-.48)*1.25);
        const weight=Math.min(260,edge*.82+sat*.15+skin)*(0.82+0.18*centerX*centerY);
        rows[y]+=weight;cols[x]+=weight;total+=weight;cx+=x*weight;cy+=y*weight;
      }
    }
    for(let y=1;y<h;y++)if(rows[y]===0)rows[y]=rows[y-1];
    for(let x=1;x<w;x++)if(cols[x]===0)cols[x]=cols[x-1];
    const smooth=(arr,r=4)=>{
      const out=new Float64Array(arr.length),prefix=new Float64Array(arr.length+1);
      for(let i=0;i<arr.length;i++)prefix[i+1]=prefix[i]+arr[i];
      for(let i=0;i<arr.length;i++){const a=Math.max(0,i-r),b=Math.min(arr.length,i+r+1);out[i]=(prefix[b]-prefix[a])/(b-a)}
      return out;
    };
    return{rows:smooth(rows),cols:smooth(cols),cx:total?cx/total:w/2,cy:total?cy/total:h/2,w,h,total};
  }
  function chooseWindow(scores,win,centroid){
    const n=scores.length,limit=Math.max(0,n-win);
    if(limit<=1)return 0;
    const prefix=new Float64Array(n+1);for(let i=0;i<n;i++)prefix[i+1]=prefix[i]+scores[i];
    const total=prefix[n]||1,step=Math.max(1,Math.floor(limit/70)),edgeBand=Math.max(2,Math.floor(win*.025));
    let best=0,bestScore=-Infinity;
    for(let s=0;s<=limit;s+=step){
      const e=s+win,inside=prefix[e]-prefix[s];
      const edge=(prefix[Math.min(n,s+edgeBand)]-prefix[s])+(prefix[e]-prefix[Math.max(s,e-edgeBand)]);
      const center=s+win/2,centerPenalty=Math.abs(center-centroid)/n*total*.085;
      const frameCenterPenalty=Math.abs(center-n*.5)/n*total*.018;
      const score=inside-edge*.72-centerPenalty-frameCenterPenalty;
      if(score>bestScore){bestScore=score;best=s}
    }
    return Math.max(0,Math.min(limit,best));
  }
  function matteWide(c){
    const out=document.createElement('canvas'),W=900,H=1350;out.width=W;out.height=H;
    const g=out.getContext('2d');
    const cover=Math.max(W/c.width,H/c.height),cw=c.width*cover,ch=c.height*cover;
    g.save();g.filter='blur(34px) brightness(.62) saturate(.9)';g.drawImage(c,(W-cw)/2,(H-ch)/2,cw,ch);g.restore();
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,0,W,H);
    const contain=Math.min(W/c.width,H/c.height),fw=c.width*contain,fh=c.height*contain;
    g.drawImage(c,(W-fw)/2,(H-fh)/2,fw,fh);
    return out;
  }

  function balanceForTopkku(c){
    const ratio=c.width/c.height;
    if(!Number.isFinite(ratio)||c.width<180||c.height<240)return{canvas:c,balanced:false};
    if(Math.abs(ratio-TOPKKU_RATIO)<.025)return{canvas:c,balanced:false};
    if(ratio>1.02)return{canvas:matteWide(c),balanced:true,axis:'matte',preserveWide:true};

    const sal=saliencyProjection(c);
    if(ratio<TOPKKU_RATIO){
      const targetH=Math.min(c.height,Math.round(c.width/TOPKKU_RATIO));
      const win=Math.max(1,Math.round(targetH/c.height*sal.h));
      const start=chooseWindow(sal.rows,win,sal.cy);
      const y=start/sal.h*c.height;
      return{canvas:crop(c,0,y,c.width,targetH),balanced:true,axis:'y',offset:y};
    }
    const targetW=Math.min(c.width,Math.round(c.height*TOPKKU_RATIO));
    const win=Math.max(1,Math.round(targetW/c.width*sal.w));
    const start=chooseWindow(sal.cols,win,sal.cx);
    const x=start/sal.w*c.width;
    return{canvas:crop(c,x,0,targetW,c.height),balanced:true,axis:'x',offset:x};
  }
  function cleanAndBalance(c){
    const before={w:c.width,h:c.height};
    let out=trimLetterbox(c);
    const afterBars={w:out.width,h:out.height};
    out=trimYoutubeChrome(out);
    const afterChrome={w:out.width,h:out.height};
    out=trimCutEdgeText(out);
    const afterText={w:out.width,h:out.height};
    const framed=balanceForTopkku(out);
    out=framed.canvas;
    return{canvas:out,meta:{before,afterBars,afterChrome,afterText,balanced:!!framed.balanced,axis:framed.axis||'',preserveWide:!!framed.preserveWide,ratio:Number((out.width/out.height).toFixed(4))}};
  }

  const dataUrl=(c,q=.92)=>new Promise((ok,bad)=>c.toBlob(b=>{
    if(!b)return bad(new Error('encode'));
    const r=new FileReader;r.onload=()=>ok(String(r.result||''));r.onerror=()=>bad(new Error('encode'));r.readAsDataURL(b);
  },'image/jpeg',q));
  async function save(c,meta){
    const payload={version:9,source:'watch',image:await dataUrl(c),artist:meta.artist,title:meta.title,contentUrl:meta.url,time:meta.time,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,captureMode:meta.mode,width:c.width,height:c.height,autoFrame:meta.autoFrame||null};
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(payload))}
    catch{
      const k=Math.min(1,900/Math.max(c.width,c.height)),d=document.createElement('canvas');
      d.width=Math.max(1,Math.round(c.width*k));d.height=Math.max(1,Math.round(c.height*k));d.getContext('2d').drawImage(c,0,0,d.width,d.height);
      payload.image=await dataUrl(d,.82);payload.width=d.width;payload.height=d.height;
      sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(payload));
    }
  }

  async function snapshotAtTarget(v,target){
    const lead=Math.min(2.2,Math.max(.35,target));
    const warm=Math.max(0,target-lead);
    ytCurrent=warm;sendYT('seekTo',[warm,true]);sendYT('playVideo');
    const fallbackAt=performance.now()+lead*1000+140,deadline=performance.now()+Math.max(2600,lead*1000+1800);
    while(performance.now()<deadline){
      if(ytCurrent>=target-.07){await wait(35);return snap(v)}
      if(performance.now()>=fallbackAt)return snap(v);
      await wait(35);
    }
    return snap(v);
  }

  async function capture(){
    if(busy)return;busy=true;
    const buttons=[...playerBody.querySelectorAll('.frame-topkku-action button')];buttons.forEach(b=>b.disabled=true);
    const target=timeValue(),title=$('.player-title h2',playerBody)?.textContent?.trim()||'NUGU RADAR Watch',meta=$('.player-title p',playerBody)?.textContent?.trim()||'',artist=meta.split('·')[0]?.trim()||'',url=$('.player-title a',playerBody)?.href||'';
    let stream=null,layer=null;
    try{
      if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('unsupported');
      state(`${timeLabel(target)} 장면을 탑꾸에 맞게 정리하고 있어요. “현재 탭”을 허용해 주세요.`,'working');
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false,preferCurrentTab:true,selfBrowserSurface:'include'});
      const track=stream.getVideoTracks()[0];
      if(track?.getSettings?.().displaySurface&&track.getSettings().displaySurface!=='browser')throw new Error('choose_tab');

      let mode='region';
      const region=await cropTrackToIframe(track);
      const v=await streamVideo(stream);
      let out=null;
      if(region){
        out=await snapshotAtTarget(v,target);
      }else{
        mode='pixel-frame';
        layer=addMarks();if(!layer)throw new Error('frame_not_found');
        await wait(320);
        const calibration=snap(v),rect=pixelRect(calibration);
        layer.remove();layer=null;
        if(!rect)throw new Error('frame_detection_failed');
        const live=await snapshotAtTarget(v,target);out=crop(live,rect.x,rect.y,rect.w,rect.h);
      }
      sendYT('pauseVideo');sendYT('seekTo',[target,true]);

      const cleaned=cleanAndBalance(out);out=cleaned.canvas;
      if(out.width<180||out.height<240)throw new Error('clean_frame_too_small');
      await save(out,{artist,title,url,time:target,mode,autoFrame:cleaned.meta});
      state(`${timeLabel(target)} 장면을 여백 없이 균형 맞춰 가져왔어요 ✨`,'success');
      setTimeout(()=>location.href='topkku.html?from=watch',160);
    }catch(e){
      console.warn('watch strict capture failed',e);
      sendYT('pauseVideo');sendYT('seekTo',[target,true]);
      if(e?.name==='NotAllowedError')state('캡처를 취소했어요.','');
      else if(e?.message==='choose_tab')state('“현재 탭”을 선택해 주세요.','error');
      else if(e?.message==='frame_detection_failed')state('영상 영역을 정확히 찾지 못했어요. 잘못 자른 화면은 저장하지 않았어요. 다시 시도해 주세요.','error');
      else state('영상만 정확히 가져오지 못했어요. 잘못된 화면은 저장하지 않았어요. 다시 시도해 주세요.','error');
    }finally{
      layer?.remove();stream?.getTracks?.().forEach(t=>t.stop());buttons.forEach(b=>b.disabled=false);busy=false;
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#frameTopkkuButton');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();capture();
  },true);
})();