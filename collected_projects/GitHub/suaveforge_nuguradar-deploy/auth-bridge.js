(()=>{
  const KEY_ID='nuguVisitorId';
  const KEY_NAME='nuguCommentName';
  let adapter=null;

  function anonymousId(){
    let id=localStorage.getItem(KEY_ID);
    if(!id){
      id=(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g,'');
      localStorage.setItem(KEY_ID,id);
    }
    return id;
  }

  function anonymousIdentity(){
    return {
      authenticated:false,
      provider:null,
      subject:null,
      visitorId:anonymousId(),
      displayName:localStorage.getItem(KEY_NAME)||'',
      accessToken:null
    };
  }

  function normalize(session){
    if(!session||!session.authenticated||!session.subject)return anonymousIdentity();
    return {
      authenticated:true,
      provider:String(session.provider||'authhub').slice(0,64),
      subject:String(session.subject).slice(0,255),
      visitorId:anonymousId(),
      displayName:String(session.displayName||localStorage.getItem(KEY_NAME)||'').slice(0,20),
      accessToken:session.accessToken||null
    };
  }

  function getIdentitySync(){
    try{
      if(adapter?.getSessionSync)return normalize(adapter.getSessionSync());
    }catch(e){console.warn('auth bridge sync session unavailable',e)}
    return anonymousIdentity();
  }

  async function getIdentity(){
    try{
      if(adapter?.getSession)return normalize(await adapter.getSession());
      if(adapter?.getSessionSync)return normalize(adapter.getSessionSync());
    }catch(e){console.warn('auth bridge session unavailable',e)}
    return anonymousIdentity();
  }

  function authHeaders(identity=getIdentitySync()){
    return identity?.authenticated&&identity.accessToken?{Authorization:`Bearer ${identity.accessToken}`} : {};
  }

  function communityPayload(extra={},identity=getIdentitySync()){
    return {visitorId:identity.visitorId,displayName:identity.displayName||'',...extra};
  }

  function setDisplayName(name){
    const clean=String(name||'').trim().slice(0,20);
    if(clean)localStorage.setItem(KEY_NAME,clean);
    else localStorage.removeItem(KEY_NAME);
    return clean;
  }

  function setAdapter(next){
    if(next!=null&&typeof next!=='object')throw new TypeError('Auth adapter must be an object');
    adapter=next||null;
    window.dispatchEvent(new CustomEvent('nugu-auth-changed'));
  }

  window.NUGU_AUTH={
    version:1,
    setAdapter,
    getIdentity,
    getIdentitySync,
    authHeaders,
    communityPayload,
    setDisplayName,
    anonymousId
  };
})();
