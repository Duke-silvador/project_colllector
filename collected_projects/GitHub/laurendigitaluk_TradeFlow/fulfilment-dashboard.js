const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
let tenantId=null,session=null,authKey=null,services=[],selectedServiceCode=null,rows=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function msg(t,type=''){const e=$('message');e.className=('small '+type).trim();e.textContent=t||''}
function rpc(name,body={}){return api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(Object.assign({p_tenant_id:tenantId},body))})}
async function api(path,o={}){
  const a=await window.tradeflowSubscriberAuthReady;
  if(!a?.session?.access_token)throw Error('Subscriber authentication did not provide an access token.');
  tenantId=a.tenantId;session=a.session;authKey=a.key;
  const h=new Headers(o.headers||{});
  h.set('apikey',authKey);h.set('Authorization','Bearer '+session.access_token);
  if(o.body)h.set('Content-Type','application/json');
  const r=await fetch(SUPABASE_URL+path,{...o,headers:h});
  const t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok)throw Error(b?.message||b?.msg||b?.error||t||('HTTP '+r.status));
  return b;
}
async function upload(path,file){
  if(!file)throw Error('No file selected.');
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/tradeflow-media/'+path,{
    method:'POST',
    headers:{apikey:authKey,Authorization:'Bearer '+session.access_token,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},
    body:file
  });
  const t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok)throw Error('File upload failed: '+(b?.message||b?.error||t||('HTTP '+r.status)));
  return path;
}
async function signed(path){
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/sign/tradeflow-media/'+path,{
    method:'POST',
    headers:{apikey:authKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({expiresIn:86400})
  });
  const t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok)throw Error(b?.message||b?.error||t||'Could not open shipping file');
  const u=b?.signedURL;if(!u)throw Error('Could not create a secure shipping file link.');
  return u.startsWith('http')?u:(u.startsWith('/storage/v1/')?SUPABASE_URL+u:(u.startsWith('/')?SUPABASE_URL+'/storage/v1'+u:SUPABASE_URL+'/storage/v1/'+u));
}
function address(a){
  if(!a)return'—';
  if(typeof a==='string')return a;
  return [a.recipient||a.name,a.address_line_1||a.line1,a.address_line_2||a.line2,a.city||a.town,a.county,a.postcode||a.post_code,a.country].filter(Boolean).join(', ');
}
function itemHtml(items){
  const list=Array.isArray(items)?items:[];
  if(!list.length)return'<div class="small">No item details were returned.</div>';
  return list.map(i=>'<div class="item-line"><div><span class="field-label">Product</span><strong>'+esc(i.title||'Item')+'</strong><div class="small">'+esc(i.asset_reference||'')+'</div></div><div><span class="field-label">Condition</span><span>'+esc(i.condition||'—')+'</span></div><div><span class="field-label">Quantity / value</span><span>'+esc(i.quantity||1)+' × '+esc(i.unit_price!=null?('£'+Number(i.unit_price).toFixed(2)):'—')+'</span></div></div>').join('');
}
function selectedService(){
  return services.find(s=>s.service_code===selectedServiceCode)||null;
}
function renderProviders(){
  const box=$('shipping-providers');
  if(!services.length){
    box.innerHTML='<div class="error-panel"><strong>No shipping services are configured.</strong><div class="small" style="margin-top:4px">Open Shipping Settings, select the services this business uses, save them, then return here.</div></div>';
    return;
  }
  box.innerHTML='<div class="provider-grid">'+services.map(s=>{
    const selected=s.service_code===selectedServiceCode;
    return '<div class="provider-card '+(selected?'selected':'')+'"><div class="provider-head"><div><h3>'+esc(s.service_name||s.service_code)+'</h3><p>'+esc(s.description||'Configured business shipping service')+'</p></div>'+(selected?'<span class="provider-badge">Selected</span>':'')+'</div><div class="provider-actions"><button class="provider-select" type="button" data-use-service="'+esc(s.service_code)+'">'+(selected?'Selected':'Use this service')+'</button><a class="provider-link" href="'+esc(s.service_url||'#')+'" target="_blank" rel="noopener">Open provider →</a></div></div>';
  }).join('')+'</div>';
}
function updatePreview(r){
  const service=selectedService();
  $('preview-item').textContent=(r?.items||[]).map(i=>((i.quantity||1)+' × '+(i.title||'Item'))).join(', ')||'Order item';
  $('preview-service').textContent='Service: '+(service?.service_name||$('service').value||'Not selected')+( $('carrier').value?' · Carrier: '+$('carrier').value:'');
  $('preview-tracking').textContent=$('tracking').value?'Tracking: '+$('tracking').value:'Tracking number will be included if you enter one.';
  $('preview-instructions').textContent=$('instructions').value||'Shipping instructions will be shown in the customer portal.';
}
function fileButton(kind,label,path,url){
  return path||url?'<button type="button" data-file-kind="'+kind+'" data-file-path="'+esc(path||'')+'" data-file-url="'+esc(url||'')+'">'+label+'</button>':'';
}
function updateFileCards(r){
  const hasLabel=Boolean(r?.label_storage_path||r?.label_url||$('label-file').files?.length);
  const hasQr=Boolean(r?.qr_storage_path||r?.qr_url||$('qr-file').files?.length);
  const carrier=String($('carrier')?.value||'').trim();
  const tracking=String($('tracking')?.value||'').trim();
  const ready=Boolean(carrier&&tracking);
  $('label-card').classList.toggle('has-file',hasLabel);
  $('qr-card').classList.toggle('has-file',hasQr);
  $('label-file-status').innerHTML=r?.label_storage_path||r?.label_url?'<strong>Label already saved.</strong> '+fileButton('label','Add label',r.label_storage_path,r.label_url):$('label-file').files?.length?'<strong>New label selected.</strong>':'No label uploaded yet.';
  $('qr-file-status').innerHTML=r?.qr_storage_path||r?.qr_url?'<strong>QR code already saved.</strong> '+fileButton('qr','Add QR code',r.qr_storage_path,r.qr_url):$('qr-file').files?.length?'<strong>New QR code selected.</strong>':'No QR code uploaded yet.';
  $('handoff-validation').textContent=ready?'Carrier and tracking number are ready. You can complete the shipment.':'Enter a carrier and tracking number to complete the shipment. A label or QR code is optional.';
  $('save-shipping').disabled=!ready;
}
function renderOrder(){
  const id=$('order').value,r=rows.find(x=>x.retail_order_id===id),panel=$('order-details');
  if(!r){panel.hidden=true;return}
  panel.hidden=false;
  if(r.shipping_provider){
    const match=services.find(s=>(s.service_name||'').toLowerCase()===String(r.shipping_provider).toLowerCase());
    selectedServiceCode=match?.service_code||selectedServiceCode;
  }
  renderProviders();
  $('item-details').innerHTML=itemHtml(r.items);
  $('recipient-name-display').textContent=r.customer_name||'—';
  $('recipient-email-display').textContent=r.customer_email||'—';
  $('recipient-address').textContent=address(r.shipping_address);
  const service=selectedService();
  $('carrier').value=r.carrier||service?.service_name||r.shipping_provider||'';
  $('service').value=r.service||'';
  $('tracking').value=r.tracking_number||'';
  $('tracking-url').value=r.tracking_url||'';
  $('shipping-service-url').value=r.shipping_service_url||service?.service_url||'';
  $('instructions').value=r.shipping_instructions||'Please follow the shipping label or QR code provided. Keep your tracking details and take the parcel to the booked courier or drop-off point shown by the shipping provider.';
  const s=r.fulfilment_status||'awaiting';
  $('handoff-status').innerHTML=s==='label'?'<div class="notice success"><strong>Shipping handoff complete.</strong><div class="small">The customer has been sent the shipping details and the order is ready for dispatch.</div></div>':s==='dispatched'?'<div class="notice success"><strong>Dispatched.</strong><div class="small">The shipment has been marked as sent.</div></div>':'<div class="notice"><strong>Shipping handoff required.</strong><div class="small">Enter the carrier/service and tracking number, then send the shipping details to the customer. A label or QR code is not required.</div></div>';
  $('status-actions').innerHTML=s==='dispatched'?'<button type="button" data-transition="delivered">Mark delivered</button><button type="button" data-transition="returned">Mark returned</button>':s==='delivered'?'<button type="button" data-transition="returned">Mark returned</button>':'';
  updateFileCards(r);updatePreview(r);
}
async function load(){
  try{
    const a=await window.tradeflowSubscriberAuthReady;
    if(!a?.tenantId)throw Error('No active subscriber tenant is selected.');
    tenantId=a.tenantId;session=a.session;authKey=a.key;
    $('business-name').textContent=a.tenantLabel||'Subscriber Business';
    const settings=await rpc('subscriber_get_shipping_service_settings');
    services=Array.isArray(settings?.selected)?settings.selected.map(s=>Object.assign({},(settings.catalog||[]).find(x=>x.service_code===s.service_code)||{},s)):[];    
    selectedServiceCode=services[0]?.service_code||null;
    renderProviders();
    rows=await rpc('subscriber_get_retail_fulfilment_shipping');rows=Array.isArray(rows)?rows:[];
    const sel=$('order');
    sel.innerHTML='<option value="">Select a paid order…</option>'+rows.map(r=>'<option value="'+esc(r.retail_order_id)+'">'+esc(r.order_reference)+' — '+esc(r.customer_name||'Customer')+' — '+esc(r.fulfilment_status||'awaiting')+'</option>').join('');
    const requested=new URLSearchParams(location.search).get('order_id');
    if(requested&&rows.some(r=>r.retail_order_id===requested))sel.value=requested;else if(rows.length)sel.value=rows[0].retail_order_id;
    renderOrder();
    msg(rows.length+' fulfilment order(s) loaded.','success');
  }catch(e){msg(e.message||String(e),'error')}
}
async function saveShipping(){
  const id=$('order').value,r=rows.find(x=>x.retail_order_id===id),b=$('save-shipping');
  if(!r)return msg('Select a paid order first.','error');
  const service=selectedService();
  const lf=$('label-file').files?.[0],qf=$('qr-file').files?.[0];
  if(!service&&!r.shipping_provider)return msg('Select one of the configured shipping services first.','error');
  if(!$('carrier').value.trim() && !service?.service_name && !r.shipping_provider)return msg('Enter the shipping carrier or select a configured shipping service before completing the handoff.','error');
  if(!$('tracking').value.trim() && !r.tracking_number)return msg('Enter the tracking number before completing the handoff.','error');
  b.disabled=true;b.textContent='Saving and sending…';msg('Uploading the shipping handoff…');
  try{
    let labelPath=r.label_storage_path||null,qrPath=r.qr_storage_path||null;
    if(lf){if(lf.size>10*1024*1024)throw Error('Shipping label must be 10 MB or smaller.');const ext=(lf.name.split('.').pop()||'pdf').toLowerCase();labelPath=await upload(tenantId+'/fulfilments/'+r.fulfilment_id+'/shipping-label-'+Date.now()+'.'+ext,lf);}
    if(qf){if(qf.size>10*1024*1024)throw Error('QR code must be 10 MB or smaller.');const ext=(qf.name.split('.').pop()||'png').toLowerCase();qrPath=await upload(tenantId+'/fulfilments/'+r.fulfilment_id+'/shipping-qr-'+Date.now()+'.'+ext,qf);}
    const result=await rpc('subscriber_complete_retail_fulfilment_shipping',{
      p_fulfilment_id:r.fulfilment_id,
      p_shipping_method:'subscriber_override',
      p_shipping_provider:service?.service_name||r.shipping_provider||$('carrier').value.trim()||null,
      p_shipping_service_url:service?.service_url||r.shipping_service_url||null,
      p_shipping_carrier:$('carrier').value.trim()||service?.service_name||r.shipping_provider||null,
      p_shipping_service:$('service').value.trim()||null,
      p_shipping_tracking_number:$('tracking').value.trim()||null,
      p_shipping_tracking_url:$('tracking-url').value.trim()||null,
      p_shipping_label_url:null,
      p_shipping_label_storage_path:labelPath,
      p_shipping_qr_url:null,
      p_shipping_qr_storage_path:qrPath,
      p_shipping_instructions:$('instructions').value.trim()||null,
      p_weight:null,p_length:null,p_width:null,p_height:null,
      p_notes:null
    });
    msg(result?.notification_queued?'Shipping handoff completed. The customer notification has been queued.':'Shipping handoff completed.','success');
    $('label-file').value='';$('qr-file').value='';
    window.location.href='selling-dashboard.html';
  }catch(e){
    msg(e.message||String(e),'error');
    const err=$('handoff-status');if(err)err.innerHTML='<div class="error-panel"><strong>Shipping handoff was not completed.</strong><div class="small" style="margin-top:4px">'+esc(e.message||String(e))+'</div></div>';
    updateFileCards(r);
  }finally{b.disabled=false;b.textContent='Save & send shipping details'}
}
async function transition(to,b){
  const r=rows.find(x=>x.retail_order_id===$('order').value);if(!r)return;
  b.disabled=true;
  try{await rpc('subscriber_transition_retail_fulfilment',{p_fulfilment_id:r.fulfilment_id,p_expected_from:r.fulfilment_status,p_to_status:to,p_notes:'Updated from Fulfilment dashboard.'});msg(to==='dispatched'?'Order marked as sent. The customer has been notified.':'Fulfilment updated.','success');await load()}catch(e){msg(e.message||String(e),'error')}finally{b.disabled=false}
}
async function openFile(kind,path,direct){
  const popup=window.open('','tradeflowFulfilmentFile','width=1000,height=850,resizable=yes,scrollbars=yes');
  if(!popup)return msg('Please allow pop-ups to view the shipping file.','error');
  try{
    popup.document.open();popup.document.write('<!doctype html><html><head><title>Shipping '+(kind==='label'?'Label':'QR Code')+'</title><style>body{margin:0;background:#eef0f2;font-family:Arial;color:#17202a}.toolbar{padding:12px;background:#fff;border-bottom:1px solid #d8dee5;display:flex;gap:8px}.toolbar strong{margin-right:auto}.toolbar button{padding:8px 12px}.page{width:6in;height:4in;margin:24px auto;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.12)}.page img,.page iframe{width:100%;height:100%;border:0;object-fit:contain}@media print{.toolbar{display:none}.page{margin:0;box-shadow:none}}</style></head><body><div class="toolbar"><strong>Shipping '+(kind==='label'?'Label':'QR Code')+'</strong><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div id="status" style="padding:30px;text-align:center">Opening secure file…</div></body></html>');popup.document.close();
    const u=direct||await signed(path);const isImage=/\.(png|jpe?g|gif|webp)(\?|$)/i.test(u);
    popup.document.getElementById('status').outerHTML=isImage?'<div class="page"><img src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></div>':'<div class="page"><iframe src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe></div>';
    popup.focus();
  }catch(e){try{popup.close()}catch{}msg(e.message||String(e),'error')}
}
document.addEventListener('click',e=>{
  const u=e.target.closest('[data-use-service]');
  if(u){selectedServiceCode=u.dataset.useService;const s=selectedService();renderProviders();const r=rows.find(x=>x.retail_order_id===$('order').value);if(r){$('carrier').value=s?.service_name||'';$('shipping-service-url').value=s?.service_url||'';updatePreview(r)}msg((s?.service_name||'Shipping service')+' selected. Open the provider and complete the shipment there.','success');return}
  const f=e.target.closest('[data-file-kind]');
  if(f){
    const input=$(f.dataset.fileKind==='label'?'label-file':'qr-file');
    if(input){input.click();}
    return;
  }
  const t=e.target.closest('[data-transition]');
  if(t){transition(t.dataset.transition,t);return}
});
$('order').addEventListener('change',renderOrder);
$('save-shipping').addEventListener('click',saveShipping);
$('refresh').addEventListener('click',load);
$('label-file').addEventListener('change',()=>updateFileCards(rows.find(x=>x.retail_order_id===$('order').value)||{}));
$('qr-file').addEventListener('change',()=>updateFileCards(rows.find(x=>x.retail_order_id===$('order').value)||{}));
['carrier','service','tracking','tracking-url','instructions'].forEach(id=>$(id).addEventListener('input',()=>{const r=rows.find(x=>x.retail_order_id===$('order').value)||{};updatePreview(r);updateFileCards(r)}));
$('sign-out').onclick=()=>window.tradeflowSubscriberSignOut?.();
let booted=false;
function boot(){if(booted)return;booted=true;load()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();