const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
let key=KEY,session=null,tenantId=new URLSearchParams(location.search).get('tenant_id'),profile=null;
const SESSION_STORAGE=tenantId?'tradeflow_customer_session:'+tenantId:'tradeflow_customer_session:unknown';
const LEGACY_SESSION_STORAGE='tradeflow_customer_session';
const $=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]||c))}
function money(v,c='GBP'){if(v==null)return'—';try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(Number(v))}catch{return c+' '+v}}
function message(t,type=''){const e=$('customer-message');if(e){e.textContent=t||'';e.className='message '+type}}
function showAuth(v){$('auth-panel').hidden=!v;$('portal').hidden=v;const account=$('customer-account');if(account)account.hidden=v;if($('purchase'))$('purchase').hidden=true}
async function api(path,o={}){const h=new Headers(o.headers||{});h.set('apikey',key);h.set('Content-Type','application/json');if(session?.access_token)h.set('Authorization','Bearer '+session.access_token);const r=await fetch(SUPABASE_URL+path,{...o,headers:h});const t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}if(!r.ok)throw Error(b?.message||b?.msg||b?.error_description||b?.error||t||('HTTP '+r.status));return b}
async function rpc(name,body){return api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(Object.assign({p_tenant_id:tenantId},body||{}))})}
function saveSession(v){
 session=v||null;
 if(session?.access_token){
  sessionStorage.setItem(SESSION_STORAGE,JSON.stringify(session));
  localStorage.removeItem(LEGACY_SESSION_STORAGE);
 }else{
  sessionStorage.removeItem(SESSION_STORAGE);
  localStorage.removeItem(LEGACY_SESSION_STORAGE);
 }
}
function restore(){
 try{
  const s=JSON.parse(sessionStorage.getItem(SESSION_STORAGE)||'null');
  if(s?.access_token)session=s;
  localStorage.removeItem(LEGACY_SESSION_STORAGE);
 }catch{}
}
async function profileCheck(){const p=await rpc('customer_get_profile');if(!p)return false;profile=Array.isArray(p)?p[0]:p;return Boolean(profile)}
async function loadBrand(){try{const r=await api('/rest/v1/tenant_public_profiles?select=business_name,logo_url&tenant_id=eq.'+encodeURIComponent(tenantId));const p=Array.isArray(r)?r[0]:r;const n=p?.business_name||'Customer Portal';$('brand-name').textContent=n;document.title=n+' Customer Portal';if(p?.logo_url)$('brand-logo').innerHTML='<img src="'+esc(p.logo_url)+'" alt="">';$('brand').href='public-site.html?tenant_id='+encodeURIComponent(tenantId)}catch{}}
function updatePortalNav(saleRows,orderRows){
 const saleLink=document.querySelector('.sidebar a[href="#selling"]');
 const orderLink=document.querySelector('.sidebar a[href="#orders"]');
 if(saleLink){
  saleLink.classList.remove('sale-progress','sale-action','sale-complete');
  if(saleRows!==null){if(!saleRows.length)saleLink.classList.add('sale-progress');
  else{
   const stages=saleRows.map(r=>r.stage||'submitted');
   const complete=stages.some(s=>s==='purchased');
   const action=stages.some(s=>['offer_ready','final_offer_sent','final_offer_required','awaiting_item','shipping','received','inspection'].includes(s));
   saleLink.classList.add(complete?'sale-complete':action?'sale-action':'sale-progress');
  }}
 }
 if(orderLink){
  orderLink.classList.remove('orders-empty','orders-active','orders-complete');
  orderLink.classList.add(orderRows.length?'orders-complete':'orders-empty');
 }
}
function orderFlow(s){const names=['Valuation','Offer','Shipping','Received','Inspection','Payment','Complete'];const map={Valuation:['submitted','under_review','valued'],Offer:['offer_ready','final_offer_sent','final_offer_required'],Shipping:['awaiting_item','shipping'],Received:['received'],Inspection:['inspection','testing','repair','return_pending'],Payment:['final_offer_accepted'],Complete:['purchased']};return '<div class="portal-flow">'+names.map(n=>'<div class="portal-step '+(map[n].includes(s)?'active':'')+'">'+n+'</div>').join('')+'</div>'}
async function loadSelling(){const data=await rpc('customer_get_selling_status');const rows=Array.isArray(data)?data:[];const activeRows=rows.filter(r=>(r.stage||'submitted')!=='offer_refused');const refusedRows=rows.filter(r=>(r.stage||'submitted')==='offer_refused');const offers=await rpc('customer_get_offers_v2');const offerRows=Array.isArray(offers)?offers:[];let shipping=[];try{shipping=await rpc('customer_get_pre_acquisition_shipping')||[]}catch{}const shippingByItem=Object.fromEntries((Array.isArray(shipping)?shipping:[]).map(x=>[x.buying_item_id,x]));if(!activeRows.length){$('selling-list').innerHTML='<div class="empty">No active sale or valuation yet.</div>'}const offerByItem={};for(const o of offerRows){if(!offerByItem[o.buying_item_id])offerByItem[o.buying_item_id]=o;}$('selling-list').innerHTML=activeRows.map(r=>{const s=r.stage||'submitted',o=offerByItem[r.buying_item_id],stageShipping=shippingByItem[r.buying_item_id],stageHasHandoff=Boolean(stageShipping?.shipping_status||stageShipping?.shipping_label_storage_path||stageShipping?.shipping_label_url||stageShipping?.shipping_qr_storage_path||stageShipping?.shipping_qr_url),stageDisplay=(s==='offer_refused'?'Business not proceeding':s==='return_pending'&&r.return_shipping_status==='return_shipped'?'Return shipped to you':s==='return_pending'?'Return to you':s==='awaiting_item'&&stageHasHandoff?'Shipping label received — post your item':s==='final_offer_sent'&&o?.offer_type==='final'?'Revised offer sent':s==='purchased'?'Complete':s.replaceAll('_',' '));let action='';if(s==='return_pending'){const shipped=r.return_shipping_status==='return_shipped';action='<div class="notice"><strong>'+(shipped?'Your item has been returned':'Your item is being returned')+'</strong><p class="small">'+esc(r.message||'The business has refused the purchase because the inspected condition did not match the condition described when you submitted it.')+'</p><p class="small"><strong>Reason:</strong> '+esc(r.return_reason||'Condition not as described.')+'</p>'+(r.return_carrier||r.return_service?'<p class="small"><strong>Return service:</strong> '+esc(r.return_service||r.return_carrier||'—')+(r.return_carrier&&r.return_service&&r.return_carrier!==r.return_service?' · '+esc(r.return_carrier):'')+'</p>':'')+(r.return_tracking_number?'<p class="small"><strong>Tracking:</strong> '+esc(r.return_tracking_number)+(r.return_tracking_url?' · <a href="'+esc(r.return_tracking_url)+'" target="_blank" rel="noopener">Track return →</a>':'')+'</p>':'')+(r.return_shipping_instructions?'<p class="small"><strong>Return instructions:</strong> '+esc(r.return_shipping_instructions)+'</p>':'')+'</div>'}if(s==='offer_refused'){action='<div class="notice"><strong>We will not be proceeding with this item</strong><p class="small">The business has decided not to proceed with the purchase. Your transaction is now closed. If you have already sent the item, please contact the business for return instructions.</p></div>'}if(s==='purchased'){action='<div class="offer"><strong>Payment paid</strong><p class="small">Your payment of '+money(o?.amount||r.amount,o?.currency||r.currency)+' has been paid into your bank account. Your sale is now complete.</p></div>'}else if(o?.status==='accepted'&&s!=='return_pending'&&!(s==='final_offer_accepted'&&o.offer_mode==='trade_in')){action='<div class="offer"><strong>Offer accepted</strong><div class="two offer-values" style="margin-top:10px"><div><span class="label">Customer choice</span><strong>'+(o.offer_mode==='trade_in'?'Trade-in offer':'Cash offer')+'</strong></div><div><span class="label">Accepted value</span><strong>'+money(o.amount,o.currency)+'</strong></div></div></div>'}if(s==='final_offer_accepted'&&o?.status==='accepted'&&o.offer_mode==='trade_in'){action='<div class="offer"><strong>Trade-in credit being processed</strong><p class="small">Your agreed trade-in value of '+money(o.amount,o.currency)+' is being added to your customer credit account.</p></div>'}if(o?.status==='published'){action='<div class="offer"><strong>Offer available</strong><div class="two offer-values" style="margin-top:10px"><div><span class="label">Cash offer</span><strong>'+money(o.cash_price!=null?o.cash_price:o.amount,o.currency)+'</strong></div><div><span class="label">Trade-in offer</span><strong>'+money(o.trade_in_price,o.currency)+'</strong></div></div><p class="small">Choose the cash or trade-in offer, or refuse.</p><div class="actions">'+(o.cash_price!=null?'<button data-offer="'+o.offer_id+'" data-choice="cash">Accept cash offer</button>':'')+(o.trade_in_price!=null?'<button data-offer="'+o.offer_id+'" data-choice="trade_in">Accept trade-in offer</button>':'')+'<button data-refuse="'+o.offer_id+'">Refuse offer</button></div></div>'}if(['awaiting_item','shipping'].includes(s)){const sh=shippingByItem[r.buying_item_id];const hasLabel=Boolean(sh?.shipping_label_storage_path||sh?.shipping_label_url);const hasQr=Boolean(sh?.shipping_qr_storage_path||sh?.shipping_qr_url);const hasHandoff=Boolean(sh?.shipping_status||hasLabel||hasQr);let ship='<div class="notice" style="margin-top:12px"><strong>'+(s==='awaiting_item'&&hasHandoff?'Postage label received — post your item':'Shipping')+'</strong>';if(hasHandoff){ship+='<p>'+(s==='awaiting_item'?'Your postage label and QR code are ready. Print the label, attach it to your parcel, and post your item. When you hand it to the courier, press “I have sent my item”.':esc(sh?.shipping_instructions||r.message||'Your shipping label and instructions are ready. Open or print the shipping label, then send your item to the business.'))+'</p>';if(sh?.shipping_carrier||sh?.shipping_service)ship+='<p class="small"><strong>Shipping service:</strong> '+esc(sh?.shipping_service||sh?.shipping_carrier||'—')+(sh?.shipping_carrier&&sh?.shipping_service&&sh.shipping_carrier!==sh.shipping_service?' · '+esc(sh.shipping_carrier):'')+'</p>';if(sh?.shipping_tracking_number)ship+='<p class="small"><strong>Tracking:</strong> '+esc(sh.shipping_tracking_number)+(sh?.shipping_tracking_url?' · <a href="'+esc(sh.shipping_tracking_url)+'" target="_blank" rel="noopener">Track item →</a>':'')+'</p>';if(hasLabel)ship+='<div class="actions"><button data-label="'+esc(r.buying_item_id)+'">Open / print shipping label</button></div>';if(hasQr)ship+='<div class="actions"><button data-qr="'+esc(r.buying_item_id)+'">Open / print QR code</button></div>';ship+='<div class="actions"><button data-post="'+r.buying_item_id+'">I have sent my item</button></div>'}else{ship+='<p>We are waiting for the business to prepare your shipping label and instructions. You will be able to open or print them here once they are ready.</p>'}ship+='</div>';action+=ship}if(s==='final_offer_sent'&&o?.status==='published'&&o?.offer_type==='final')action='<div class="offer"><strong>Revised offer received</strong><div class="two offer-values" style="margin-top:10px"><div><span class="label">Cash offer</span><strong>'+money(o.cash_price!=null?o.cash_price:o.amount,o.currency)+'</strong></div><div><span class="label">Trade-in offer</span><strong>'+money(o.trade_in_price,o.currency)+'</strong></div></div><p class="small">This is the revised final purchase offer after inspection. Please accept or refuse this offer.</p><div class="actions">'+(o.cash_price!=null?'<button data-offer="'+o.offer_id+'" data-choice="cash">Accept cash offer</button>':'')+(o.trade_in_price!=null?'<button data-offer="'+o.offer_id+'" data-choice="trade_in">Accept trade-in offer</button>':'')+'<button data-refuse="'+o.offer_id+'">Refuse final offer</button></div></div>';return '<details class="sale-card current"><summary class="sale-summary"><div class="sale-grid"><div><span class="label">Item</span><strong>'+esc(r.item_title||'Your item')+'</strong><div class="small">'+esc(r.item_reference||r.request_reference||'')+'</div></div><div><span class="label">Stage</span><span class="stage active">'+esc(stageDisplay)+'</span></div><div><span class="label">Status</span><strong>'+((s==='purchased')?('Paid '+money(o?.amount||r.amount,o?.currency||r.currency)):((o?.status==='accepted')?('Accepted: '+(o.offer_mode==='trade_in'?'Trade-in offer':'Cash offer')+' — '+money(o.amount,o.currency)):esc(r.message||'In progress')))+' </strong></div></div><span class="sale-toggle">View details</span></summary><div class="sale-details">'+orderFlow(s)+action+'</div></details>'}).join('');updatePortalNav(activeRows,[]);const cancelled=$('cancelled-list');
if(cancelled){
  const count=$('cancelled-count');if(count)count.textContent=refusedRows.length?' ('+refusedRows.length+')':'';cancelled.innerHTML=refusedRows.length?refusedRows.map(r=>{
    const itemTitle=r.item_title||'Your item', ref=r.item_reference||r.request_reference||'', msg=r.message||'The business has decided not to proceed with this item.';
    return '<details class="sale-card current"><summary class="sale-summary"><div class="sale-grid"><div><span class="label">Item</span><strong>'+esc(itemTitle)+'</strong><div class="small">'+esc(ref)+'</div></div><div><span class="label">Stage</span><span class="stage">'+esc('Refused / cancelled')+'</span></div><div><span class="label">Status</span><strong>'+esc(msg)+'</strong></div></div><span class="sale-toggle">View details</span></summary><div class="sale-details">'+orderFlow('offer_refused')+'<div class="notice"><strong>Business not proceeding</strong><p class="small">'+esc(msg)+'</p><p class="small">This item will not move forward to purchase, shipping, inspection or payment. If you have already sent the item, please contact the business for return instructions.</p><p class="small"><strong>Request reference:</strong> '+esc(r.request_reference||'—')+'</p></div></div></details>'
  }).join(''):'<div class="empty">No cancelled or refused items.</div>';
}document.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>respondOffer(b.dataset.offer,'accept',b.dataset.choice));document.querySelectorAll('[data-refuse]').forEach(b=>b.onclick=()=>respondOffer(b.dataset.refuse,'refuse'));document.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>postItem(b.dataset.post,b));document.querySelectorAll('[data-label]').forEach(b=>b.onclick=()=>openShip(b.dataset.label,'label'));document.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>openShip(b.dataset.qr,'qr'));document.querySelectorAll('[data-return-label]').forEach(b=>b.onclick=()=>openReturnBuyingLabel(b.dataset.returnLabel))}
async function respondOffer(id,a,mode){try{await rpc(a==='accept'?'customer_accept_offer_choice':'customer_refuse_offer',a==='accept'?{p_offer_id:id,p_offer_mode:mode||'cash',p_response_notes:null}:{p_offer_id:id,p_response_notes:null});message(a==='accept'?'Offer accepted.':'Offer refused.','success');await loadSelling()}catch(e){message(e.message||String(e),'error')}}
async function openShip(id,kind){
 const popup=window.open('','tradeflowShippingPrint','width=1000,height=850,resizable=yes,scrollbars=yes');
 if(!popup){message('Please allow pop-ups for the Customer Portal to open the shipping file.','error');return}
 let objectUrl=null;
 try{
  popup.document.open();
  popup.document.write('<!doctype html><html><head><title>Shipping '+(kind==='label'?'Label':'QR Code')+'</title><style>'+
   'html,body{margin:0;padding:0;background:#e5e7eb;color:#17202a;font-family:Arial,sans-serif}'+
   '.toolbar{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #d8dee5}'+
   '.toolbar strong{margin-right:auto}.toolbar button{padding:8px 14px;border:1px solid #17202a;background:#17202a;color:#fff;border-radius:4px;cursor:pointer}.toolbar button.secondary{background:#fff;color:#17202a}'+
   '.status{padding:30px;text-align:center}.page{width:4in;height:6in;margin:24px auto;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.16)}'+
   '.page img,.page iframe{display:block;width:100%;height:100%;max-width:100%;max-height:100%;border:0;background:#fff;object-fit:fill;transform:none}'+
   'body.a4 .page{width:4in;height:6in;margin:0;box-shadow:0 2px 12px rgba(0,0,0,.16)}'+
   '@page{size:4in 6in;margin:0}@media print{html,body{background:#fff!important}.toolbar{display:none!important}.page{width:4in!important;height:6in!important;margin:0!important;box-shadow:none!important}.page img,.page iframe{width:4in!important;height:6in!important;max-width:4in!important;max-height:6in!important;object-fit:fill!important;transform:none!important}body.a4 .page{width:4in!important;height:6in!important;margin:0!important}}'+
   'body.a4{background:#fff}'+
   '</style></head><body><div class="toolbar"><strong>Shipping '+(kind==='label'?'Label':'QR Code')+'</strong><button onclick="printLabel(false)">Print 6×4</button><button class="secondary" onclick="printLabel(true)">Print on A4</button><button class="secondary" onclick="window.close()">Close</button></div><div id="status" class="status">Opening secure shipping file…</div><script>function printLabel(a4){document.body.classList.toggle("a4",!!a4);var old=document.getElementById("print-size");if(old)old.remove();var s=document.createElement("style");s.id="print-size";s.textContent="@page{size:"+(a4?"A4 portrait":"4in 6in")+";margin:0}";document.head.appendChild(s);window.print()}</script></body></html>');
  popup.document.close();
  const rows=await rpc('customer_get_pre_acquisition_shipping');
  const x=(Array.isArray(rows)?rows:[]).find(r=>r.buying_item_id===id);
  const path=kind==='label'?x?.shipping_label_storage_path:x?.shipping_qr_storage_path;
  const direct=kind==='label'?x?.shipping_label_url:x?.shipping_qr_url;
  if(!path&&!direct)throw Error('Shipping file is not available yet.');
  let fileUrl=direct,fileMime='';
  if(path){
   const rr=await fetch(SUPABASE_URL+'/functions/v1/customer-buying-shipping-media?tenant_id='+encodeURIComponent(tenantId)+'&buying_item_id='+encodeURIComponent(id)+'&kind='+encodeURIComponent(kind),{method:'GET',headers:{apikey:key,Authorization:'Bearer '+(session?.access_token||'')}});
   if(!rr.ok){const t=await rr.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}throw Error(b?.message||b?.error||t||('Could not open shipping file (HTTP '+rr.status+').'))}
   const blob=await rr.blob();fileMime=blob.type||'';objectUrl=URL.createObjectURL(blob);fileUrl=objectUrl;
  }
  const type=kind==='label'?'label':'QR code';
  const isImage=fileMime.startsWith('image/')||/\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(fileUrl||''));
  const safe=String(fileUrl).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  popup.document.getElementById('status').outerHTML=isImage?'<div class="page"><img src="'+safe+'" alt="Shipping '+type+'"></div>':'<div class="page"><iframe src="'+safe+'" title="Shipping '+type+'"></iframe></div>';
  popup.focus();
 }catch(e){try{popup.document.getElementById('status').textContent=e.message||String(e)}catch{}message(e.message||String(e),'error')}
 finally{if(objectUrl)setTimeout(()=>URL.revokeObjectURL(objectUrl),15*60*1000)}
}
async function postItem(id,b){b.disabled=true;try{await rpc('customer_mark_buying_item_posted',{p_buying_item_id:id});message('Item sent status recorded.','success');await loadSelling()}catch(e){message(e.message||String(e),'error')}finally{b.disabled=false}}
async function loadCreditAccount(){try{const rows=await rpc('customer_get_credit_account');const a=Array.isArray(rows)?rows[0]:rows||{};$('credit-balance').textContent=money(Number(a.balance||0),a.currency||'GBP');$('credit-status').textContent='Available customer credit';}catch(e){$('credit-balance').textContent='—';$('credit-status').textContent='Unable to load customer credit';}}
async function openReturnBuyingLabel(id){const row=(await rpc('customer_get_selling_status')||[]).find(x=>x.buying_item_id===id);if(!row)return message('Return details are not available yet.','error');const path=row.return_label_storage_path,direct=row.return_label_url;if(!path&&!direct)return message('The return label is not available yet.','error');const popup=window.open('','tradeflowReturnShippingFile','width=1000,height=850,resizable=yes,scrollbars=yes');if(!popup){message('Please allow pop-ups to open the return label.','error');return}try{popup.document.write('<!doctype html><html><head><title>Return shipping label</title><style>body{margin:0;background:#eef0f2;font-family:Arial;color:#17202a}.toolbar{padding:12px;background:#fff;border-bottom:1px solid #d8dee5;display:flex;gap:8px}.toolbar strong{margin-right:auto}.page{width:4in;height:6in;margin:20px auto;background:#fff;display:flex;align-items:center;justify-content:center}.page img,.page iframe{width:4in;height:6in;border:0;object-fit:fill}@media print{.toolbar{display:none}.page{margin:0}}</style></head><body><div class="toolbar"><strong>Return shipping label</strong><button onclick="window.print()">Print 6×4</button><button onclick="window.close()">Close</button></div><div id="status">Opening secure return label…</div></body></html>');popup.document.close();let u=direct;if(!u&&path){const rr=await fetch(SUPABASE_URL+'/storage/v1/object/sign/tradeflow-media/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:86400})});const t=await rr.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}if(!rr.ok)throw Error(b?.message||b?.error||t||'Could not open return label');u=b?.signedURL;if(u&&!u.startsWith('http'))u=u.startsWith('/storage/v1/')?SUPABASE_URL+u:(u.startsWith('/')?SUPABASE_URL+'/storage/v1'+u:SUPABASE_URL+'/storage/v1/'+u)}const safe=String(u).replace(/&/g,'&amp;').replace(/"/g,'&quot;');const image=/\.(png|jpe?g|gif|webp)(\?|$)/i.test(String(u));popup.document.getElementById('status').outerHTML=image?'<div class="page"><img src="'+safe+'"></div>':'<div class="page"><iframe src="'+safe+'" title="Return shipping label"></iframe></div>';popup.focus()}catch(e){try{popup.close()}catch{}message(e.message||String(e),'error')}}
async function openRetailShip(orderId,kind){
 const popup=window.open('','tradeflowRetailShippingFile','width=1000,height=850,resizable=yes,scrollbars=yes');
 if(!popup){message('Please allow pop-ups for the Customer Portal to open the shipping file.','error');return}
 try{
  popup.document.write('<!doctype html><html><head><title>Shipping '+(kind==='label'?'Label':'QR Code')+'</title><style>body{margin:0;background:#eef0f2;font-family:Arial;color:#17202a}.toolbar{padding:12px;background:#fff;border-bottom:1px solid #d8dee5;display:flex;gap:8px}.toolbar strong{margin-right:auto}.page{width:4in;height:6in;margin:20px auto;background:#fff;display:flex;align-items:center;justify-content:center}.page img,.page iframe{width:6in;height:4in;border:0;object-fit:contain;transform:rotate(90deg)}@media print{.toolbar{display:none}.page{margin:0;box-shadow:none}}</style></head><body><div class="toolbar"><strong>Shipping '+(kind==='label'?'Label':'QR Code')+'</strong><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div id="status">Opening secure shipping file…</div></body></html>');
  popup.document.close();
  const rows=await rpc('customer_get_retail_fulfilment_shipping');
  const x=(Array.isArray(rows)?rows:[]).find(v=>v.retail_order_id===orderId);
  const path=kind==='label'?x?.label_storage_path:x?.qr_storage_path;
  const direct=kind==='label'?x?.label_url:x?.qr_url;
  if(!path&&!direct)throw Error('Shipping file is not available yet.');
  let u=direct;
  if(!u){
   const rr=await fetch(SUPABASE_URL+'/storage/v1/object/sign/tradeflow-media/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:86400})});
   const t=await rr.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}
   if(!rr.ok)throw Error(b?.message||b?.error||t||'Could not open shipping file');
   const su=b?.signedURL;if(!su)throw Error('Could not create a secure shipping file link.');
   u=su.startsWith('http')?su:(su.startsWith('/storage/v1/')?SUPABASE_URL+su:(su.startsWith('/')?SUPABASE_URL+'/storage/v1'+su:SUPABASE_URL+'/storage/v1/'+su));
  }
  const image=/\\.(png|jpe?g|gif|webp)(\\?|$)/i.test(u);
  popup.document.getElementById('status').outerHTML=image?'<div class="page"><img src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></div>':'<div class="page"><iframe src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe></div>';
  popup.focus();
 }catch(e){try{popup.close()}catch{}message(e.message||String(e),'error')}
}
async function requestRetailReturn(orderItemId,button){
 const existing=button?.dataset?.returnStatus||'';
 if(existing)return;
 const card=button.closest('.return-action');
 const form=card?.querySelector('[data-return-form]');
 if(form)form.hidden=false;
 if(!form)return;
 const reason=form.querySelector('[data-return-reason]')?.value||'other';
 const notes=form.querySelector('[data-return-notes]')?.value.trim()||'';
 const submit=form.querySelector('[data-return-submit]');
 if(submit)submit.disabled=true;
 try{
  const reasonText={
   damaged:'Item arrived damaged',
   faulty:'Item is faulty or not working',
   not_as_described:'Item is not as described',
   wrong_item:'Wrong item received',
   changed_mind:'Changed my mind',
   other:'Other'
  }[reason]||'Other';
  await rpc('customer_request_return',{
   p_order_item_id:orderItemId,
   p_reason_code:reason,
   p_reason:reasonText,
   p_customer_notes:notes
  });
  message('Return request submitted. The business will review it and update your return status.','success');
  await loadOrders();
 }catch(e){
  message(e.message||String(e),'error');
  if(submit)submit.disabled=false;
 }
}
async function loadOrders(){
 try{
  const [base,shipping,returns]=await Promise.all([
   rpc('customer_get_order_details'),
   rpc('customer_get_retail_fulfilment_shipping'),
   rpc('customer_get_returns')
  ]);
  const data=Array.isArray(base)?base:[],shipRows=Array.isArray(shipping)?shipping:[],returnRows=Array.isArray(returns)?returns:[];
  const shippingByOrder=Object.fromEntries(shipRows.map(x=>[x.retail_order_id,x]));
  const returnsByItem=Object.fromEntries(returnRows.map(x=>[x.order_item_id,x]));
  const groups=[],byId=new Map();
  data.forEach(x=>{if(!byId.has(x.order_id)){const g={...x,items:[]};byId.set(x.order_id,g);groups.push(g)}byId.get(x.order_id).items.push(x)});
  updatePortalNav(null,groups);
  $('order-list').innerHTML=groups.length?groups.map(o=>{
   const s=shippingByOrder[o.order_id]||{};
   const f=s.fulfilment_status||o.fulfilment_status;
   const shippingLabel=f==='delivered'?'Delivered':f==='dispatched'?'Shipped':f==='label'?'Preparing shipment':f==='awaiting'?'Preparing shipment':'Not yet shipped';
   const tracking=s.tracking_number?(s.tracking_url?'<div><strong><a href="'+esc(s.tracking_url)+'" target="_blank" rel="noopener" style="color:#245f3b;text-decoration:underline">'+esc(s.tracking_number)+'</a></strong></div><div class="actions" style="margin-top:8px"><a href="'+esc(s.tracking_url)+'" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">Track your order →</a></div>': '<div><strong>'+esc(s.tracking_number)+'</strong></div>'):'';
   const orderClass=f==='awaiting'?' order-preparing':f==='label'?' order-label-ready':f==='dispatched'?' order-shipped':f==='delivered'?' order-delivered':'';
   const shipDetails=f==='dispatched'||f==='delivered'?'<div class="detail-grid" style="margin-top:10px"><div><span class="label">Shipping service</span><strong>'+esc(s.service||'—')+'</strong></div><div><span class="label">Carrier</span><strong>'+esc(s.carrier||'—')+'</strong></div></div>':'';
   const instructions=f==='label'?'<p class="small"><strong>Shipping:</strong> Your parcel is ready for dispatch. You will receive a tracking update when it has been sent.</p>':f==='dispatched'?'<p class="small"><strong>Item sent:</strong> Your order has been handed to the shipping service. Use the tracking number above for delivery updates.</p>':f==='delivered'?'<p class="small"><strong>Item received:</strong> If you need to return this item, use the return option below.</p>':'';
   const itemRows=o.items.map(i=>{
    const ret=returnsByItem[i.item_id];
    const returnTerminal=ret&&['rejected','refunded','replaced','closed'].includes(ret.status);
    let returnHtml='';
    if(f==='dispatched'||f==='delivered'){
      if(ret){
       const rm=ret.metadata||{};
       const returnStatus=ret.status==='authorised'?'Return accepted':ret.status==='rejected'?'Return denied':'Return requested';
       const postage=rm.postage_payer==='subscriber'?'Subscriber pays return postage':rm.postage_payer==='customer'?'Customer pays return postage':'Postage decision pending';
       const labelPath=rm.return_label_path||'';
       let returnInstructions='';
       if(ret.status==='requested') returnInstructions='<p class="small"><strong>Next step:</strong> Your return request is being reviewed. Please wait for the business to approve or deny the return. Do not send the item back until instructions and a return label are provided.</p>';
       else if(ret.status==='authorised') returnInstructions='<p class="small"><strong>Next step:</strong> Your return has been accepted. '+esc(postage)+'. Follow the return instructions below and use the supplied return label to send the item back.</p>';
       returnHtml='<div class="return-action" style="margin-top:10px;padding:12px;border:1px solid #d8dee5;border-radius:8px;background:#fff"><span class="label">Return status</span><strong>'+esc(returnStatus)+'</strong><div class="small">Return reference '+esc(ret.return_reference||'')+'</div>'+ (ret.status==='authorised'?'<div class="small" style="margin-top:6px"><strong>'+esc(postage)+'</strong></div>':'') + returnInstructions + (labelPath?'<div class="actions"><button type="button" data-return-label="'+esc(ret.return_id)+'">Open return label</button></div>':'')+'</div>';
      }else if(!ret){
       returnHtml='<div class="return-action" data-item-id="'+esc(i.item_id)+'" style="margin-top:10px"><button type="button" data-start-return="'+esc(i.item_id)+'">Request a return</button><div data-return-form hidden style="margin-top:10px;padding:10px;border:1px solid #d8dee5;border-radius:8px;background:#fff"><label>Reason<select data-return-reason><option value="damaged">Item arrived damaged</option><option value="faulty">Item is faulty or not working</option><option value="not_as_described">Item is not as described</option><option value="wrong_item">Wrong item received</option><option value="changed_mind">Changed my mind</option><option value="other">Other</option></select></label><label>Additional details<textarea data-return-notes rows="3" placeholder="Optional details"></textarea></label><div class="actions"><button type="button" data-return-submit>Submit return request</button><button type="button" data-return-cancel>Cancel</button></div></div></div>';
      }
    }
    return '<div class="order-item"><div><strong>'+esc(i.item_title||'Item')+'</strong><div class="small">'+esc(i.item_quantity||1)+' × '+money(i.item_unit_price,o.currency)+'</div>'+returnHtml+'</div></div>';
   }).join('');
   return '<details class="sale-card order-card'+orderClass+'"><summary class="order-summary"><div class="sale-grid"><div><span class="label">Order</span><strong>'+esc(o.order_reference||'Order')+'</strong><div class="small">'+esc(o.paid_at?'Paid '+new Date(o.paid_at).toLocaleDateString('en-GB'):'')+'</div></div><div><span class="label">Status</span><span class="stage active">'+esc(shippingLabel)+'</span>'+(o.items.some(i=>{const rr=returnsByItem[i.item_id];return rr&&['requested','authorised','rejected'].includes(rr.status)})?'<div class="small" style="margin-top:5px"><strong>Return request:</strong> '+esc((returnsByItem[o.items.find(i=>returnsByItem[i.item_id])?.item_id]?.status==='rejected')?'Denied':(returnsByItem[o.items.find(i=>returnsByItem[i.item_id])?.item_id]?.status==='authorised'?'Accepted':'Under review'))+'</div>':'')+'</div><div><span class="label">Total</span><strong>'+money(o.total,o.currency)+'</strong></div></div><span class="order-toggle" aria-hidden="true">View order</span></summary><div class="order-details"><div class="order-items">'+itemRows+'</div>'+shipDetails+(tracking?'<p class="small"><strong>Tracking:</strong> '+tracking+'</p>':'')+instructions+'<p class="small">Fulfilment '+esc(o.fulfilment_reference||s.fulfilment_reference||'pending')+' · '+esc(shippingLabel)+'</p></div></details>'
  }).join(''):'<div class="empty">No orders yet.</div>';

  document.querySelectorAll('[data-start-return]').forEach(b=>{
   b.disabled=false;
   b.onclick=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    const form=b.parentElement?.querySelector('[data-return-form]');
    if(form){form.hidden=false;b.hidden=true}
   };
  });
  document.querySelectorAll('[data-return-cancel]').forEach(b=>b.onclick=()=>{
   const form=b.closest('[data-return-form]');if(form){form.hidden=true;const start=form.parentElement?.querySelector('[data-start-return]');if(start)start.hidden=false}
  });
  document.querySelectorAll('[data-return-submit]').forEach(b=>b.onclick=()=>{
   const form=b.closest('[data-return-form]');
   const itemId=form?.closest('.return-action')?.dataset?.itemId;
   if(itemId)requestRetailReturn(itemId,b);
  });
  document.querySelectorAll('[data-return-label]').forEach(b=>b.onclick=()=>openCustomerReturnLabel(b.dataset.returnLabel,b));
 }catch(e){$('order-list').textContent=e.message||String(e)}
}async function openCustomerReturnLabel(returnId,b){
 try{
  b.disabled=true;
  const rr=await fetch(SUPABASE_URL+'/storage/v1/object/list/tradeflow-media',{
   method:'POST',
   headers:{apikey:key,Authorization:'Bearer '+(session?.access_token||''),'Content-Type':'application/json'},
   body:JSON.stringify({prefix:tenantId+'/returns/'+returnId+'/',limit:20})
  });
  const t=await rr.text(); let files=null; try{files=t?JSON.parse(t):null}catch{}
  if(!rr.ok||!Array.isArray(files))throw Error('Return label is not available yet.');
  const file=files.find(x=>String(x.name||'').startsWith('return-label-'));
  if(!file)throw Error('Return label is not available yet.');
  const path=tenantId+'/returns/'+returnId+'/'+file.name;
  const signed=await fetch(SUPABASE_URL+'/storage/v1/object/sign/tradeflow-media/'+path,{
   method:'POST',headers:{apikey:key,Authorization:'Bearer '+(session?.access_token||''),'Content-Type':'application/json'},
   body:JSON.stringify({expiresIn:86400})
  });
  const st=await signed.text(); let sb=null; try{sb=st?JSON.parse(st):null}catch{}
  if(!signed.ok||!sb?.signedURL)throw Error('Could not open the return label.');
  const u=sb.signedURL.startsWith('http')?sb.signedURL:SUPABASE_URL+sb.signedURL;
  window.open(u,'tradeflowReturnLabel','width=900,height=800,resizable=yes,scrollbars=yes');
 }catch(e){message(e.message||String(e),'error')}finally{b.disabled=false}
}
async function loadDetails(){const p=await rpc('customer_get_profile');profile=Array.isArray(p)?p[0]:p||{};$('customer-name').textContent=(profile.first_name||'')+' '+(profile.last_name||'');$('profile-first-name').value=profile.first_name||'';$('profile-last-name').value=profile.last_name||'';$('profile-email').value=profile.email||'';$('profile-phone').value=profile.phone||'';const a=await rpc('customer_get_addresses');const addresses=Array.isArray(a)?a:[];const billing=addresses.find(x=>x.address_type==='billing')||{};const shipping=addresses.find(x=>x.address_type==='shipping')||{};$('customer-addresses').innerHTML='<h3>Addresses</h3><div class="two"><div class="sale-card"><strong>Payment address</strong><label>Recipient<input id="bill-recipient" value="'+esc(billing.recipient_name||'')+'"></label><label>Address<input id="bill-line1" value="'+esc(billing.line1||'')+'"></label><label>City<input id="bill-city" value="'+esc(billing.city||'')+'"></label><label>Postcode<input id="bill-postcode" value="'+esc(billing.postcode||'')+'"></label><div class="actions"><button data-address="billing" data-id="'+esc(billing.address_id||'')+'">Save payment address</button></div></div><div class="sale-card"><strong>Delivery address</strong><label>Recipient<input id="ship-recipient" value="'+esc(shipping.recipient_name||'')+'"></label><label>Address<input id="ship-line1" value="'+esc(shipping.line1||'')+'"></label><label>City<input id="ship-city" value="'+esc(shipping.city||'')+'"></label><label>Postcode<input id="ship-postcode" value="'+esc(shipping.postcode||'')+'"></label><div class="actions"><button data-address="shipping" data-id="'+esc(shipping.address_id||'')+'">Save delivery address</button></div></div></div><p class="small">Delivery address is stored internally as the shipping address type.</p>';document.querySelectorAll('[data-address]').forEach(b=>b.onclick=()=>saveAddress(b.dataset.address,b.dataset.id,b));const bank=await rpc('customer_get_bank_details');let sellingRows=[];try{const selling=await rpc('customer_get_selling_status');sellingRows=Array.isArray(selling)?selling:[]}catch{}const bankHasDetails=Boolean(bank?.account_holder_name&&bank?.sort_code&&bank?.account_number);const activeBuyingStage=new Set(['valuation_in_progress','manual_valuation','valued','offer_ready','final_offer_sent','final_offer_required','final_offer_accepted','awaiting_shipping_label','awaiting_item','shipping','received','inspection','testing','repair']);const hasActiveBuyingRequest=sellingRows.some(row=>activeBuyingStage.has(row?.stage));const bankWarning=hasActiveBuyingRequest&&!bankHasDetails?'<div class="bank-warning"><strong>Bank details required before payment</strong><p>You must add your bank details before we can make payment for an item you sell to us.</p><p>Please add your bank details below and save them. You can update them at any time.</p></div>':'';$('customer-bank-details').innerHTML=bankWarning+'<h3>Bank details</h3><div class="two"><label>Account holder<input id="bank-holder" value="'+esc(bank?.account_holder_name||'')+'"></label><label>Bank name<input id="bank-name" value="'+esc(bank?.bank_name||'')+'"></label><label>Sort code<input id="bank-sort" value="'+esc(bank?.sort_code||'')+'"></label><label>Account number<input id="bank-number" value="'+esc(bank?.account_number||'')+'"></label></div><div class="actions"><button id="save-bank" type="button">Save bank details</button></div>';$('save-bank').onclick=saveBank}async function saveAddress(type,id,b){try{b.disabled=true;const p={p_tenant_id:tenantId,p_address_id:id||null,p_address_type:type,p_recipient_name:$(type==='billing'?'bill-recipient':'ship-recipient').value.trim(),p_company_name:null,p_line1:$(type==='billing'?'bill-line1':'ship-line1').value.trim(),p_line2:null,p_city:$(type==='billing'?'bill-city':'ship-city').value.trim(),p_county:null,p_postcode:$(type==='billing'?'bill-postcode':'ship-postcode').value.trim(),p_country_code:'GB',p_is_default:true};await api('/rest/v1/rpc/customer_upsert_address',{method:'POST',body:JSON.stringify(p)});message(type==='billing'?'Payment address saved.':'Delivery address saved.','success');await loadDetails()}catch(e){message(e.message||String(e),'error')}finally{b.disabled=false}}
async function saveBank(){try{await api('/rest/v1/rpc/customer_save_bank_details',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId,p_account_holder_name:$('bank-holder').value.trim(),p_sort_code:$('bank-sort').value.trim(),p_account_number:$('bank-number').value.trim(),p_bank_name:$('bank-name').value.trim()||null})});message('Bank details saved.','success');await loadDetails()}catch(e){message(e.message||String(e),'error')}}
async function loadPortal(){try{const ok=await profileCheck();if(!ok){saveSession(null);showAuth(true);message('This login is not registered for this business. Use Create customer account to create a new account.','error');return}showAuth(false);await loadBrand();await Promise.all([loadSelling(),loadOrders(),loadDetails(),loadCreditAccount()]);}catch(e){showAuth(true);message(e.message||String(e),'error')}}
$('save-profile').onclick=async()=>{try{await rpc('customer_update_profile',{p_first_name:$('profile-first-name').value.trim(),p_last_name:$('profile-last-name').value.trim(),p_phone:$('profile-phone').value.trim()||null});message('Details saved.','success');await loadDetails()}catch(e){message(e.message||String(e),'error')}};
$('sign-out').onclick=()=>{saveSession(null);sessionStorage.removeItem('tradeflow_pending_customer_registration');showAuth(true);message('Signed out.','success');location.hash='';window.scrollTo(0,0);};
window.tradeflowCustomerDashboardRefresh=loadPortal;
let portalLoadInProgress=false;
async function loadPortalOnce(){
 if(portalLoadInProgress)return;
 portalLoadInProgress=true;
 try{await loadPortal()}finally{portalLoadInProgress=false}
}
window.addEventListener('tradeflow-auth-success',async(event)=>{
 if(event?.detail?.access_token)session=event.detail;else restore();
 await loadPortalOnce();
});
async function bootCustomerPortal(){
 try{
  if(window.tradeflowCustomerAuthReady)await window.tradeflowCustomerAuthReady;
  restore();
  if(session?.access_token)await loadPortalOnce();else showAuth(true);
 }catch(e){
  showAuth(true);
  message(e.message||String(e),'error');
 }
}
loadBrand();
bootCustomerPortal();