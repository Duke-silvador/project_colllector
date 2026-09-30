/* TradeFlow customer-dashboard authentication fallback.
 * Public publishable key only. No service-role credentials are used here.
 * This deliberately remains independent of the main controller so a controller
 * startup error cannot make the Sign in button appear dead.
 */
(()=>{
  const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
  const KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
  const KEY_STORAGE='tradeflow_testlab_publishable_key';
  const SESSION_STORAGE='tradeflow_testlab_session';

  localStorage.setItem(KEY_STORAGE,KEY);

  const message=(text,type='error')=>{
    const e=document.getElementById('customer-message');
    if(e){e.textContent=text;e.className=type;}
  };

  window.addEventListener('error',e=>{
    if(e.error||e.message) console.error('TradeFlow customer dashboard error:',e.error||e.message);
  });

  document.addEventListener('click',async e=>{
    const button=e.target.closest?.('#auth-sign-in');
    if(!button)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const email=document.getElementById('auth-email')?.value.trim();
    const password=document.getElementById('auth-password')?.value||'';
    if(!email||!password){message('Enter your email and password.');return;}
    button.disabled=true;
    const oldLabel=button.textContent;
    button.textContent='Signing in…';
    message('Signing in…','message');
    try{
      const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
        method:'POST',
        headers:{apikey:KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const text=await response.text();
      let data=null;try{data=text?JSON.parse(text):null}catch{}
      if(!response.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||text||`Authentication failed (HTTP ${response.status})`);
      if(!data?.access_token)throw new Error('Authentication succeeded without a session token.');
      localStorage.setItem(SESSION_STORAGE,JSON.stringify(data));
      message('Signed in. Loading your customer portal…','success');
      setTimeout(()=>location.reload(),100);
    }catch(err){
      console.error('TradeFlow customer sign-in failed:',err);
      message(err?.message||String(err));
      button.disabled=false;
      button.textContent=oldLabel;
    }
  },true);
})();
