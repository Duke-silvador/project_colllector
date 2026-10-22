(()=>{
  const API='https://wvlrp-chat-production.up.railway.app/api/analytics/event';
  const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  const stored=(storage,key)=>{let value=storage.getItem(key);if(!value){value=id();storage.setItem(key,value)}return value};
  const visitorId=stored(localStorage,'wvlrpAnalyticsVisitor');
  const sessionId=stored(sessionStorage,'wvlrpAnalyticsSession');
  const visitId=id();
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const openedAt=Date.now();
  let visibleSince=document.hidden?0:performance.now(),pageMs=0,lastSent=-1,timer=null;
  const videos=new Map();

  function videoKey(video,index){
    const camera=document.currentScript?.dataset?.camera||document.querySelector('script[data-camera]')?.dataset.camera;
    return (video.dataset.analyticsVideo||video.id||camera||`video-${index+1}`).slice(0,100);
  }
  function stopVideo(state,now=performance.now()){
    if(state.since){state.ms+=Math.max(0,now-state.since);state.since=0}
  }
  function startVideo(state,now=performance.now()){
    if(!document.hidden&&!state.video.paused&&!state.video.ended&&!state.since)state.since=now;
  }
  [...document.querySelectorAll('video')].forEach((video,index)=>{
    const state={video,key:videoKey(video,index),viewed:false,ms:0,since:0};
    videos.set(video,state);
    video.addEventListener('playing',()=>{if(!state.viewed)state.viewed=true;startVideo(state);send(false)});
    ['pause','ended','waiting','stalled','error','emptied'].forEach(type=>video.addEventListener(type,()=>stopVideo(state)));
  });

  function totals(){
    const now=performance.now();
    const pageTotal=pageMs+(visibleSince?Math.max(0,now-visibleSince):0);
    return {
      visit_id:visitId,visitor_id:visitorId,session_id:sessionId,path,title:document.title.slice(0,200),
      opened_at:new Date(openedAt).toISOString(),page_seconds:Math.max(0,Math.round(pageTotal/1000)),
      videos:[...videos.values()].filter(v=>v.viewed).map(v=>({
        video_key:v.key,watch_seconds:Math.max(0,Math.round((v.ms+(v.since?Math.max(0,now-v.since):0))/1000))
      }))
    };
  }
  function transmit(payload,closing){
    const body=JSON.stringify(payload);
    if(closing&&navigator.sendBeacon){
      try{if(navigator.sendBeacon(API,new Blob([body],{type:'text/plain;charset=UTF-8'})))return}catch{}
    }
    fetch(API,{method:'POST',body,headers:{'Content-Type':'text/plain;charset=UTF-8'},cache:'no-store',keepalive:closing}).catch(()=>{});
  }
  function send(closing=false,force=false){
    const payload=totals();
    if(!force&&!closing&&payload.page_seconds===lastSent&&!payload.videos.some(v=>v.watch_seconds))return;
    lastSent=payload.page_seconds;
    transmit(payload,closing);
  }
  function hide(){
    const now=performance.now();
    if(visibleSince){pageMs+=Math.max(0,now-visibleSince);visibleSince=0}
    videos.forEach(v=>stopVideo(v,now));
    send(false,true);
  }
  function show(){
    if(!visibleSince)visibleSince=performance.now();
    videos.forEach(v=>startVideo(v));
  }
  document.addEventListener('visibilitychange',()=>document.hidden?hide():show());
  window.addEventListener('pagehide',()=>{hide();send(true,true)});
  transmit(totals(),false);
  timer=setInterval(()=>send(false,true),15000);
})();
