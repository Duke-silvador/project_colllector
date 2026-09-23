(async()=>{
  const title=document.getElementById('authCallbackTitle');const state=document.getElementById('authCallbackState');
  try{
    if(!window.NUGU_AUTH_UI)throw new Error('auth_runtime_unavailable');
    const destination=await window.NUGU_AUTH_UI.completeCallback();
    title.textContent='You’re in.';state.textContent='Your picks, Radar Time, Glow and comments are ready.';
    setTimeout(()=>location.replace(destination),250);
  }catch(error){
    console.warn('sign-in callback failed',error);
    title.textContent=error?.message==='pending_approval'?'Almost there.':'Sign in did not finish.';
    state.textContent=error?.message==='pending_approval'?'This account is still waiting for approval. Please try again a little later.':'We could not finish signing you in. Return and try again.';
  }
})();