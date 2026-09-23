(()=>{
  const player=document.getElementById('watchPlayer');
  if(!player)return;
  let locked=false,scrollY=0;
  function lock(){
    if(locked)return;
    locked=true;scrollY=window.scrollY||0;
    document.documentElement.style.overflow='hidden';
    document.documentElement.style.height='100%';
    Object.assign(document.body.style,{position:'fixed',top:`-${scrollY}px`,left:'0',right:'0',width:'100%',overflow:'hidden'});
    player.style.overflow='hidden';
  }
  function unlock(){
    if(!locked)return;
    locked=false;
    document.documentElement.style.overflow='';
    document.documentElement.style.height='';
    Object.assign(document.body.style,{position:'',top:'',left:'',right:'',width:'',overflow:''});
    window.scrollTo(0,scrollY);
  }
  window.addEventListener('nugu-watch-opened',()=>{lock();requestAnimationFrame(()=>{player.style.overflow='hidden'})});
  player.addEventListener('close',unlock);
})();
