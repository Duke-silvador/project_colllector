// TradeFlow subscriber tenant context.
// The subscriber authentication layer is the single source of truth for the
// active test tenant. This file must never read Customer/Test-Lab session state.
(()=>{
  const apply=async()=>{
    if(!window.tradeflowSubscriberAuthReady)throw Error('Subscriber authentication layer did not load.');
    const auth=await window.tradeflowSubscriberAuthReady;
    const tenantId=auth?.tenantId;
    const name=auth?.tenants?.[tenantId];
    if(!tenantId||!name)throw Error('Subscriber authentication did not provide a valid tenant.');
    document.documentElement.dataset.tradeflowTenantId=tenantId;
    document.documentElement.dataset.tradeflowTenantName=name;
    const params=new URLSearchParams(location.search);
    if(params.get('tenant_id')!==tenantId){
      params.set('tenant_id',tenantId);
      history.replaceState(null,'',`${location.pathname}?${params.toString()}`);
    }
    return auth;
  };
  window.tradeflowSubscriberTenantReady=apply();
})();