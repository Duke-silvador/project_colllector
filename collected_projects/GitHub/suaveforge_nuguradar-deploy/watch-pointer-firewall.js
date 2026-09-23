(()=>{
  const body=document.getElementById('playerBody');
  if(!body)return;

  let playerState=-1;
  const iframe=()=>body.querySelector('.player-frame iframe');

  function send(func,args=[]){
    const frame=iframe();
    if(!frame?.contentWindow)return;
    try{
      frame.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'https://www.youtube-nocookie.com');
    }catch{}
  }

  function install(){
    const host=body.querySelector('.player-frame');
    const frame=iframe();
    if(!host||!frame)return;

    frame.style.pointerEvents='none';
    frame.setAttribute('tabindex','-1');
    frame.dataset.nuguPointerFirewall='1';

    if(host.querySelector('.nugu-watch-gesture-firewall'))return;
    const shield=document.createElement('button');
    shield.type='button';
    shield.className='nugu-watch-gesture-firewall';
    shield.setAttribute('aria-label','영상 재생 또는 일시정지');
    Object.assign(shield.style,{
      position:'absolute',
      inset:'0',
      zIndex:'5',
      width:'100%',
      height:'100%',
      margin:'0',
      padding:'0',
      border:'0',
      background:'transparent',
      cursor:'pointer',
      touchAction:'manipulation'
    });
    shield.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      send(playerState===1?'pauseVideo':'playVideo');
    });
    host.appendChild(shield);
  }

  window.addEventListener('message',event=>{
    const frame=iframe();
    if(!frame||event.source!==frame.contentWindow)return;
    let data=event.data;
    try{if(typeof data==='string')data=JSON.parse(data)}catch{return}
    const state=Number(data?.info?.playerState);
    if(Number.isFinite(state))playerState=state;
  });

  window.addEventListener('nugu-watch-opened',install);
  new MutationObserver(()=>queueMicrotask(install)).observe(body,{childList:true,subtree:true});
  install();
})();
