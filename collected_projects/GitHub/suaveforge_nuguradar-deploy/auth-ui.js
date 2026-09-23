(()=>{
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function loadLivePulse(){
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const allowed=new Set(['','index.html','watch.html','topkku.html','community.html','room.html','fan-board.html','hall-of-fame.html']);
    if(!allowed.has(page))return;
    if(!document.querySelector('link[data-live-pulse]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='live-pulse.css';link.dataset.livePulse='1';document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-live-pulse]')){
      const script=document.createElement('script');script.src='live-pulse.js';script.async=true;script.dataset.livePulse='1';document.body.appendChild(script);
    }
  }
  function slot(){
    let el=document.getElementById('authSlot');if(el)return el;
    const header=document.querySelector('.topbar');if(!header)return null;
    el=document.createElement('div');el.id='authSlot';el.className='auth-slot';
    const before=header.querySelector('.search,.watch-home');header.insertBefore(el,before||null);return el;
  }
  async function render(){
    const root=slot();if(!root||!window.NUGU_AUTH||!window.NUGU_AUTH_UI)return;
    let identity;try{identity=await window.NUGU_AUTH.getIdentity()}catch{identity=window.NUGU_AUTH.getIdentitySync()}
    if(identity?.authenticated){
      const name=identity.displayName||'My Radar';
      root.innerHTML=`<a class="auth-account" href="community.html" title="Your NUGU RADAR account"><span class="auth-dot"></span><span>${esc(name)}</span></a><button class="auth-signout" type="button">Sign out</button>`;
      root.querySelector('.auth-signout').onclick=async()=>{await window.NUGU_AUTH_UI.logout();render()};
    }else{
      root.innerHTML='<button class="auth-signin" type="button">Sign in</button>';
      root.querySelector('.auth-signin').onclick=()=>window.NUGU_AUTH_UI.signIn(location.href);
    }
  }
  window.addEventListener('nugu-auth-changed',render);window.addEventListener('nugu-auth-ready',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{render();loadLivePulse()},{once:true});else{render();loadLivePulse()}
})();
