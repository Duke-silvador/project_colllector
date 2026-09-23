(()=>{
  const body=document.getElementById('playerBody');
  if(!body)return;
  const canDirectCapture=()=>typeof navigator.mediaDevices?.getDisplayMedia==='function';
  if(canDirectCapture())return;

  const config=window.NUGU_CONFIG||{},api=String(config.apiBase||'').replace(/\/$/,'');
  const $=(s,r=document)=>r.querySelector(s);
  let busy=false;

  const setState=(text,state='')=>{
    const el=$('#frameTopkkuState',body);
    if(!el)return;
    if(el.textContent!==text)el.textContent=text;
    if(el.dataset.state!==state)el.dataset.state=state;
  };
  const targetTime=()=>{
    const exact=Number(body.dataset.sceneTime);
    if(Number.isFinite(exact)&&exact>=0)return exact;
    const raw=(($('#frameTopkkuTime',body)?.textContent)||'0:00').trim(),p=raw.split(':').map(Number);
    if(p.length===3)return Math.max(0,(p[0]||0)*3600+(p[1]||0)*60+(p[2]||0));
    return Math.max(0,(p[0]||0)*60+(p[1]||0));
  };
  const meta=()=>{
    const title=$('.player-title h2',body)?.textContent?.trim()||'NUGU RADAR Watch';
    const mt=$('.player-title p',body)?.textContent?.trim()||'';
    const artist=mt.split('·')[0]?.trim()||'';
    const url=$('.player-title a',body)?.href||'';
    return{title,artist,artistSlug:body.dataset.artistSlug||'',videoId:body.dataset.playbackId||'',url,time:targetTime()};
  };
  const dataUrl=blob=>new Promise((resolve,reject)=>{
    const r=new FileReader();r.onerror=()=>reject(new Error('read'));r.onload=()=>resolve(String(r.result||''));r.readAsDataURL(blob);
  });
  const pauseSource=()=>{
    const frame=$('.player-frame iframe',body);
    try{frame?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'*')}catch{}
  };

  function manualButton(show=false){
    const wrap=$('.frame-topkku-action',body);if(!wrap)return null;
    let b=$('#frameTopkkuManualFallback',wrap);
    if(!b){
      b=document.createElement('button');
      b.id='frameTopkkuManualFallback';b.type='button';b.className='frame-topkku-manual';
      b.textContent='사진에서 직접 고르기';b.hidden=true;wrap.appendChild(b);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPicker()});
    }
    b.hidden=!show;return b;
  }

  function decorate(){
    const b=$('#frameTopkkuButton',body);
    if(!b||b.dataset.mobileServerFrame==='1')return;
    b.dataset.mobileServerFrame='1';
    b.textContent='✨ 탑꾸';
    b.title='현재 재생 장면을 자동으로 가져와 탑꾸로 이어갑니다.';
    setState('현재 장면을 자동으로 준비해요.','mobile-auto');
    manualButton(false);
  }

  function picker(){
    let input=document.getElementById('nuguMobileTopkkuPicker');
    if(input)return input;
    input=document.createElement('input');
    input.id='nuguMobileTopkkuPicker';input.type='file';input.accept='image/*';input.hidden=true;
    document.body.appendChild(input);return input;
  }
  function readImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=()=>reject(new Error('read'));
      reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('image'));img.onload=()=>resolve(img);img.src=String(reader.result||'')};
      reader.readAsDataURL(file);
    });
  }
  async function compressedData(file,max=1800){
    const img=await readImage(file),scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);
    const data=await new Promise((resolve,reject)=>c.toBlob(blob=>blob?dataUrl(blob).then(resolve,reject):reject(new Error('encode')),'image/jpeg',.92));
    return{data,width:c.width,height:c.height};
  }

  function handoffTopkku(payload,from){
    if(!payload?.image)throw new Error('handoff_payload');
    try{sessionStorage.setItem('nuguTopkkuIncoming',JSON.stringify(payload))}
    catch{throw new Error('handoff_storage')}
    location.href='topkku.html?from='+encodeURIComponent(from);
  }

  async function automaticFrame(){
    if(busy)return;
    pauseSource();
    await new Promise(r=>setTimeout(r,80));
    const m=meta(),button=$('#frameTopkkuButton',body);
    if(!api||!m.videoId){setState('현재 영상 정보를 확인하지 못했어요. 사진에서 직접 골라주세요.','error');manualButton(true);return}
    busy=true;if(button)button.disabled=true;manualButton(false);
    setState('현재 장면을 깨끗하게 준비하는 중…','working');
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),28000);
    try{
      const r=await fetch(api+'/api/v1/media/youtube-frame',{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'image/jpeg'},
        body:JSON.stringify({videoId:m.videoId,time:m.time}),signal:ac.signal
      });
      if(!r.ok){
        let code='frame_render_failed';try{const j=await r.json();code=j.error||code}catch{}
        throw new Error(code);
      }
      const blob=await r.blob(),image=await dataUrl(blob);
      const width=Number(r.headers.get('X-NUGU-Frame-Width')||0),height=Number(r.headers.get('X-NUGU-Frame-Height')||0);
      const capturedVideoTime=Number(r.headers.get('X-NUGU-Frame-Time')||m.time);
      if(!image||width<64||height<64)throw new Error('invalid_frame');
      const payload={version:18,source:'watch',image,artist:m.artist,artistSlug:m.artistSlug||'',title:m.title,contentUrl:m.url,time:m.time,capturedVideoTime,capturedAt:new Date().toISOString(),cleanCapture:true,videoOnly:true,strictCapture:true,manualCapture:false,captureMode:'mobile-server-youtube-frame-v1',width,height};
      setState('장면 준비 완료 ✓ · 탑꾸 편집기로 이동합니다.','success');
      handoffTopkku(payload,'watch-mobile-auto');
    }catch(err){
      console.error('mobile automatic Topkku frame failed',err);
      const msg=err?.name==='AbortError'?'장면 준비 시간이 너무 길어졌어요. 다시 시도하거나 사진에서 직접 골라주세요.':'현재 장면을 자동으로 가져오지 못했어요. 다시 시도하거나 사진에서 직접 골라주세요.';
      setState(msg,'error');manualButton(true);
    }finally{
      clearTimeout(timer);if(button)button.disabled=false;busy=false;
    }
  }

  async function usePhoto(file){
    if(!file)return;
    const m=meta();setState('사진을 탑꾸에 맞게 준비하고 있어요…','working');
    try{
      const img=await compressedData(file);
      const payload={version:18,source:'watch',image:img.data,artist:m.artist,artistSlug:m.artistSlug||'',title:m.title,contentUrl:m.url,time:m.time,capturedAt:new Date().toISOString(),cleanCapture:false,videoOnly:false,strictCapture:false,manualCapture:true,captureMode:'mobile-photo-picker-fallback',width:img.width,height:img.height};
      setState('사진 준비 완료 ✓ · 탑꾸 편집기로 이동합니다.','success');handoffTopkku(payload,'watch-mobile-photo');
    }catch(err){
      console.error('mobile Topkku photo fallback failed',err);setState('사진을 불러오지 못했어요. 다른 사진을 골라주세요.','error');
    }
  }
  function openPicker(){
    const input=picker();input.value='';input.onchange=()=>usePhoto(input.files?.[0]);input.click();
  }

  const observer=new MutationObserver(()=>{
    if(body.querySelector('#frameTopkkuButton:not([data-mobile-server-frame="1"])'))decorate();
  });
  observer.observe(body,{childList:true,subtree:true});decorate();

  window.addEventListener('click',e=>{
    const b=e.target.closest?.('#frameTopkkuButton');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();automaticFrame();
  },true);
})();
