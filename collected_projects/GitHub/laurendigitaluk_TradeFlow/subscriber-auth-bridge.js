// Compatibility bridge: existing subscriber controllers still read the old test-lab
// storage keys. Keep those controllers isolated from the customer session by
// translating reads on subscriber workspace pages only.
(()=>{
  const oldKey='tradeflow_testlab_publishable_key',oldSession='tradeflow_testlab_session';
  const newKey='tradeflow_subscriber_publishable_key',newSession='tradeflow_subscriber_session';
  const nativeGet=Storage.prototype.getItem;
  Storage.prototype.getItem=function(name){
    if(this===localStorage&&name===oldKey){
      return nativeGet.call(this,newKey)||nativeGet.call(this,'tradeflow_platform_admin_publishable_key')||nativeGet.call(this,oldKey);
    }
    if(this===localStorage&&name===oldSession){
      return nativeGet.call(this,newSession)||nativeGet.call(this,oldSession);
    }
    return nativeGet.call(this,name);
  };
  // The controller scripts execute immediately. If the user signs in through
  // the dedicated subscriber dialog after bootstrap, reload once the new
  // subscriber session exists so the existing controller starts with it.
  const started=Boolean(nativeGet.call(localStorage,newSession));
  if(!started){
    const timer=setInterval(()=>{
      if(nativeGet.call(localStorage,newSession)){
        clearInterval(timer);
        location.reload();
      }
    },500);
    setTimeout(()=>clearInterval(timer),120000);
  }
})();