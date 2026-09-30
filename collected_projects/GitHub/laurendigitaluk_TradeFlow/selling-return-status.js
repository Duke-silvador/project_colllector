const TF_RETURN_STATUS_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
(function(){
  let attempts=0;
  async function run(){
    try{
      const a=await window.tradeflowSubscriberAuthReady;
      const key=a?.key,session=a?.session,tenantId=a?.tenantId;
      if(!key||!session?.access_token||!tenantId)return;
      const h={apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
      const r=await fetch(TF_RETURN_STATUS_URL+'/rest/v1/rpc/subscriber_get_returns',{method:'POST',headers:h,body:JSON.stringify({p_tenant_id:tenantId})});
      if(!r.ok)return;
      const returns=await r.json();
      const byOrder=new Map();
      const priority={requested:3,authorised:2,rejected:1,denied:1};
      for(const x of (Array.isArray(returns)?returns:[])){
        if(!x?.order_id)continue;
        const old=byOrder.get(x.order_id);
        if(!old||(priority[x.status]||0)>(priority[old.status]||0))byOrder.set(x.order_id,x);
      }
      if(!byOrder.size)return;
      const domRows=[...document.querySelectorAll('#sold-listings .listing-row.sold')];
      if(!domRows.length){if(attempts++<8)setTimeout(run,1000);return;}
      const sold=await fetch(TF_RETURN_STATUS_URL+'/rest/v1/rpc/subscriber_get_sold_retail_items',{method:'POST',headers:h,body:JSON.stringify({p_tenant_id:tenantId})});
      if(!sold.ok)return;
      const soldRows=await sold.json();
      const rows=Array.isArray(soldRows)?soldRows:[];
      rows.forEach((x,i)=>{
        const ret=byOrder.get(x.order_id);
        const row=domRows[i];
        if(!ret||!row)return;
        const cell=row.querySelector('.listing-cell-label:nth-child(1)')?.parentElement;
        const shipping=[...row.children].find(el=>el.querySelector('.listing-cell-label')?.textContent?.trim()==='Shipping');
        if(!shipping)return;
        const old=shipping.querySelector('.tf-return-status');if(old)old.remove();
        const box=document.createElement('div');box.className='tf-return-status';box.style.cssText='margin-top:7px;padding:7px 9px;border-radius:7px;font-size:10px;font-weight:800;line-height:1.35;';
        if(ret.status==='rejected'||ret.status==='denied'){
          box.style.cssText+='background:#f8eeee;color:#8d3434;border:1px solid #d9a0a0;';
          box.innerHTML='<strong>CLOSED — RETURN REFUSED</strong><br><span style="font-weight:600">'+(ret.return_reference||'Return request')+'</span>';
          shipping.appendChild(box);
        }else if(ret.status==='authorised'){
          box.style.cssText+='background:#fff8e7;color:#805d00;border:1px solid #d39b22;';
          box.innerHTML='<strong>RETURN ACCEPTED — AWAITING RETURN</strong><br><span style="font-weight:600">Sale remains open until the returned item is received and the return is completed.</span>';
          shipping.appendChild(box);
        }else if(ret.status==='requested'){
          box.style.cssText+='background:#fff8e7;color:#805d00;border:1px solid #d39b22;';
          box.innerHTML='<strong>RETURN REQUEST — AWAITING DECISION</strong><br><span style="font-weight:600">'+(ret.return_reference||'Return request')+'</span>';
          shipping.appendChild(box);
        }
      });
    }catch{}
  }
  function boot(){setTimeout(run,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
