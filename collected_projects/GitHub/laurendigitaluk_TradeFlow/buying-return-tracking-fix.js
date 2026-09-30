(function(){
  document.addEventListener('click',async function(e){
    const b=e.target.closest('[data-returnship]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=b.dataset.id;
    const status=document.getElementById('return-action-status-'+id);
    const setStatus=(text,type)=>{
      if(status){
        status.className='small '+(type||'');
        status.textContent=text;
      }
    };
    busy(b,true,'Sending tracking…');
    setStatus('Sending tracking information…');
    try{
      const tracking=document.getElementById('return-tracking-'+id)?.value.trim()||'';
      if(!tracking)throw Error('Enter the return tracking number before sending the return update.');
      const carrier=document.getElementById('return-carrier-'+id)?.value.trim()||null;
      const service=document.getElementById('return-service-'+id)?.value.trim()||null;
      const trackingUrl=document.getElementById('return-tracking-url-'+id)?.value.trim()||null;
      const instructions=document.getElementById('return-instructions-'+id)?.value.trim()||null;
      const result=await rpc('subscriber_publish_buying_item_return_shipping',{
        p_buying_item_id:id,
        p_shipping_method:'subscriber_override',
        p_shipping_label_url:null,
        p_shipping_label_storage_path:null,
        p_shipping_qr_url:null,
        p_shipping_qr_storage_path:null,
        p_shipping_carrier:carrier,
        p_shipping_service:service,
        p_shipping_tracking_number:tracking,
        p_shipping_tracking_url:trackingUrl,
        p_shipping_instructions:instructions,
        p_shipping_provider:carrier,
        p_shipping_service_url:null
      });
      if(!result?.ok)throw Error('The return tracking update was not accepted.');
      setStatus('Tracking information sent to the customer.','success');
      msg('Tracking information sent to the customer.','success');
      await load();
    }catch(err){
      const text=err?.message||String(err);
      setStatus(text,'error');
      msg(text,'error');
    }finally{
      busy(b,false);
    }
  },true);
})();