(()=>{
  const TRANSITION_SPEED=1.3216;
  const activeAudio=new Set();
  let released=false;
  // A history entry must not retain a full panorama and GPU drawing buffer.
  function releaseScene(){
    if(released)return;
    released=true;
    for(const audio of activeAudio)audio.close().catch(()=>{});
    activeAudio.clear();
    for(const video of document.querySelectorAll('video')){
      video.pause();video.removeAttribute('src');
      for(const source of video.querySelectorAll('source'))source.removeAttribute('src');
      video.load();
    }
    for(const canvas of document.querySelectorAll('canvas')){
      try{
        const gl=canvas.getContext('webgl2')||canvas.getContext('webgl')||canvas.getContext('experimental-webgl');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      }catch{}
      canvas.width=1;canvas.height=1;
    }
  }
  addEventListener('pagehide',releaseScene);
  // Released scenes need a fresh renderer when restored from browser history.
  addEventListener('pageshow',event=>{if(event.persisted&&released)location.reload()});

  const veil=document.createElement('div');
  Object.assign(veil.style,{position:'fixed',inset:'0',background:'#06100b',opacity:'0',pointerEvents:'none',zIndex:'1000',transition:`opacity ${420/TRANSITION_SPEED}ms ease`});
  veil.setAttribute('aria-hidden','true');document.body.appendChild(veil);
  let arriving=false;try{arriving=sessionStorage.getItem('wvlrp-arriving')===location.pathname.split('/').pop()||(sessionStorage.getItem('wvlrp-arriving')==='index.html'&&location.pathname==='/');if(arriving)sessionStorage.removeItem('wvlrp-arriving')}catch{}
  if(arriving){veil.style.transition='none';veil.style.opacity='1';}
  function reveal(){if(!arriving)return;arriving=false;requestAnimationFrame(()=>{veil.style.transition=`opacity ${650/TRANSITION_SPEED}ms ease`;veil.style.opacity='0';});}
  addEventListener('wvlrp-scene-ready',reveal);setTimeout(reveal,8000);
  function ambience(duration){
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const audio=new C();activeAudio.add(audio);const count=Math.ceil(audio.sampleRate*duration),buffer=audio.createBuffer(1,count,audio.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<count;i++)data[i]=(Math.random()*2-1)*.3;
      const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
      source.buffer=buffer;filter.type='lowpass';filter.frequency.value=500;
      source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
      const now=audio.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.08,now+.3);gain.gain.linearRampToValueAtTime(0,now+duration);
      audio.resume().catch(()=>{});source.start();source.onended=()=>{activeAudio.delete(audio);audio.close().catch(()=>{})};
    }catch{}
  }
  window.WVLRPTravel={busy:false,go({url,from,to,render}){
    if(this.busy)return;this.busy=true;veil.style.pointerEvents='auto';veil.style.transition='none';
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=(reduced?180:1400)/TRANSITION_SPEED,start=performance.now();
    const delta=Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw));
    const destination=url.split('?')[0].split('#')[0].split('/').pop();
    // Load the destination panorama after leaving, avoiding two decoded scenes at once.
    if(!reduced)ambience(duration/1000+.2);
    function tick(now){
      const t=Math.min(1,(now-start)/duration),ease=t*t*(3-2*t);
      if(!reduced)render({yaw:from.yaw+delta*ease,pitch:from.pitch+(to.pitch-from.pitch)*ease,fov:from.fov+(to.fov-from.fov)*ease});
      if(t>(reduced?0:.65))veil.style.opacity=String(reduced?t:(t-.65)/.35);
      if(t<1)requestAnimationFrame(tick);else{try{sessionStorage.setItem('wvlrp-arriving',destination)}catch{}releaseScene();location.assign(url)}
    }
    requestAnimationFrame(tick);
  }};
})();