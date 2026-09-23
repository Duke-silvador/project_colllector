(()=>{
  if(window.__NUGU_LIVE_PULSE__)return;window.__NUGU_LIVE_PULSE__=true;
  const cfg=window.NUGU_CONFIG||{},api=String(cfg.apiBase||'').replace(/\/$/,'');
  if(!api)return;
  const cursorKey='nugu_live_pulse_cursor';
  const mutedUntil=()=>Number(localStorage.getItem('nugu_live_pulse_muted_until')||0);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const icons={
    'topkku-published':'🎀','topkku-taste-milestone':'♡','topkku-comment-milestone':'💬',
    'gift-arrived':'🎁','room-video-added':'📼','glow-burst':'✦'
  };
  let cursor=Math.max(0,Number(localStorage.getItem(cursorKey)||0)),queue=[],showing=false,timer=null,pollTimer=null,booted=false;
  const root=document.createElement('aside');
  root.className='live-pulse-root';root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');
  document.body.appendChild(root);

  const ageMs=item=>Date.now()-Date.parse(item?.createdAt||0);
  function remember(id){cursor=Math.max(cursor,Number(id)||0);localStorage.setItem(cursorKey,String(cursor))}
  function enqueue(items,{initial=false}={}){
    for(const item of items||[]){
      remember(item.id);
      if(initial&&ageMs(item)>10*60*1000)continue;
      if(!queue.some(x=>x.id===item.id))queue.push(item);
    }
    if(queue.length>12)queue=queue.slice(-12);
    showNext();
  }
  function hideCurrent(){
    root.classList.remove('is-visible','importance-2','importance-3');
    showing=false;
    clearTimeout(timer);
    timer=setTimeout(showNext,350);
  }
  function mute(){
    localStorage.setItem('nugu_live_pulse_muted_until',String(Date.now()+30*60*1000));
    queue=[];hideCurrent();
  }
  function showNext(){
    if(showing||document.hidden||Date.now()<mutedUntil()||!queue.length)return;
    const item=queue.shift();showing=true;
    const href=item.href?esc(item.href):'';
    root.className=`live-pulse-root importance-${Number(item.importance)||1}`;
    root.innerHTML=`<div class="live-pulse-card">
      <span class="live-pulse-dot" aria-hidden="true"></span>
      <div class="live-pulse-icon" aria-hidden="true">${icons[item.kind]||'✦'}</div>
      <div class="live-pulse-copy"><small>지금 NUGU RADAR에서</small><b>${esc(item.title)}</b>${item.body?`<span>${esc(item.body)}</span>`:''}</div>
      ${href?`<a class="live-pulse-open" href="${href}">보러가기</a>`:''}
      <button class="live-pulse-close" type="button" aria-label="30분 동안 숨기기">×</button>
    </div>`;
    root.querySelector('.live-pulse-close')?.addEventListener('click',mute);
    requestAnimationFrame(()=>root.classList.add('is-visible'));
    clearTimeout(timer);timer=setTimeout(hideCurrent,Number(item.importance)>=2?6500:5200);
  }
  async function poll({initial=false}={}){
    if(document.hidden)return;
    try{
      const url=initial&&cursor===0
        ?`${api}/api/v1/community/broadcasts?latest=1`
        :`${api}/api/v1/community/broadcasts?after=${encodeURIComponent(cursor)}&limit=12`;
      const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error(String(r.status));
      const data=await r.json();
      enqueue(data.items||[],{initial});
    }catch(e){console.warn('live pulse',e)}
  }
  async function boot(){
    if(booted)return;booted=true;
    await poll({initial:true});
    pollTimer=setInterval(()=>poll(),5000);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){poll();showNext()}});
  window.addEventListener('online',()=>poll());
  boot();
})();