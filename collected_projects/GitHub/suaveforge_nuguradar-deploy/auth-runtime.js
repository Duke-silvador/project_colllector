(()=>{
  const API='https://api-authhub.suaveforge.com';
  const HOSTED='https://authhub.suaveforge.com/login/';
  const PROJECT='p42';
  const ENV='production';
  const CALLBACK='https://nuguradar.suaveforge.com/auth-callback.html';
  const PROFILE_KEY='nuguAuthProfile:p42';
  if(!window.AuthHubClient||!window.NUGU_AUTH)return;
  const client=new window.AuthHubClient({apiBase:API,project:PROJECT,environment:ENV});

  function claims(token){try{const raw=String(token||'').split('.')[1];if(!raw)return null;let p=raw.replace(/-/g,'+').replace(/_/g,'/');p=p.padEnd(Math.ceil(p.length/4)*4,'=');return JSON.parse(atob(p))}catch{return null}}
  function cachedProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}}
  function profileName(profile,sessionClaims){
    const name=String(profile?.displayName||profile?.user?.displayName||'').trim();if(name)return name.slice(0,20);
    const email=String(profile?.email||profile?.user?.email||sessionClaims?.email||'');const local=email.split('@')[0].trim();return local.slice(0,20);
  }
  function saveProfile(me){
    const user=me?.user||{};const value={displayName:String(user.displayName||'').slice(0,20),email:user.email||'',avatarUrl:user.avatarUrl||'',role:me?.membership?.role||'user',updatedAt:Date.now()};
    localStorage.setItem(PROFILE_KEY,JSON.stringify(value));
    if(value.displayName)window.NUGU_AUTH.setDisplayName(value.displayName);
    return value;
  }
  function normalizedFromSession(session,profile=cachedProfile()){
    if(!session?.accessToken)return null;const c=claims(session.accessToken);if(!c?.sub||c.project!==PROJECT)return null;
    if(c.exp&&Date.now()>=Number(c.exp)*1000)return null;
    return {authenticated:true,provider:'authhub',subject:String(c.sub),displayName:profileName(profile,c),accessToken:session.accessToken};
  }
  const adapter={
    getSessionSync(){return normalizedFromSession(client.session())},
    async getSession(){
      let session=client.session();if(!session?.accessToken)return null;
      let c=claims(session.accessToken);
      try{
        if(!c?.exp||Date.now()+60000>=Number(c.exp)*1000){session=await client.refresh();c=claims(session.accessToken)}
        let profile=cachedProfile();
        if(!profile||Date.now()-Number(profile.updatedAt||0)>300000)profile=saveProfile(await client.me());
        return normalizedFromSession(session,profile);
      }catch(error){
        if(error?.status===401){try{await client.logout()}catch{}localStorage.removeItem(PROFILE_KEY);window.dispatchEvent(new CustomEvent('nugu-auth-changed'));return null}
        throw error;
      }
    }
  };
  window.NUGU_AUTH.setAdapter(adapter);

  function safeReturnTo(value){
    try{const u=new URL(value||'/',location.origin);return u.origin===location.origin?`${u.pathname}${u.search}${u.hash}`:'/community.html'}catch{return'/community.html'}
  }
  function hosted(mode='login',returnTo=location.href){
    const u=new URL(HOSTED);u.searchParams.set('project',PROJECT);u.searchParams.set('environment',ENV);u.searchParams.set('redirect_uri',CALLBACK);u.searchParams.set('state',safeReturnTo(returnTo));u.searchParams.set('mode',mode==='signup'?'signup':'login');return u.toString();
  }
  async function completeCallback(){
    const result=await client.consumeOAuthCallback(location.href);if(!result)throw new Error('missing_authhub_code');if(result.pendingApproval)throw new Error('pending_approval');
    saveProfile(await client.me());window.dispatchEvent(new CustomEvent('nugu-auth-changed'));return safeReturnTo(result.state||'/community.html');
  }
  async function logout(){try{await client.logout()}finally{localStorage.removeItem(PROFILE_KEY);window.dispatchEvent(new CustomEvent('nugu-auth-changed'))}}
  window.NUGU_AUTH_UI={client,project:PROJECT,environment:ENV,callback:CALLBACK,signIn:(returnTo)=>location.assign(hosted('login',returnTo)),signUp:(returnTo)=>location.assign(hosted('signup',returnTo)),logout,completeCallback,hostedUrl:hosted};
  window.NUGU_AUTH.getIdentity().then(()=>window.dispatchEvent(new CustomEvent('nugu-auth-ready'))).catch(e=>console.warn('AuthHub session bootstrap failed',e));
})();
