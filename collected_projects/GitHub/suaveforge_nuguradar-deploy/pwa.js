(()=>{
  if(!('serviceWorker' in navigator))return;
  const register=()=>navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).then(reg=>{
    window.NUGU_PWA_READY={registered:true,scope:reg.scope};
    document.documentElement.classList.toggle('pwa-standalone',matchMedia('(display-mode: standalone)').matches||navigator.standalone===true);
  }).catch(err=>console.warn('PWA service worker registration failed',err));
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
})();