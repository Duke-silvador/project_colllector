(()=>{
const U='https://twfbmjwwqzxdxvclxbun.supabase.co',K='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9',P=new URLSearchParams(location.search),T=P.get('tenant_id')||localStorage.getItem('tradeflow_customer_tenant_id')||'',L=P.get('listing_id')||'',BK='tradeflow_customer_basket';
let session=null,listing=null,credit=0,order=null,working=false;const PENDING_KEY='tradeflow_customer_pending_retail_order';const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const setAccountLink=()=>{const link=$('my-account-link');if(!link)return;const target=new URL('customer-dashboard.html',location.href);if(T)target.searchParams.set('tenant_id',T);link.href=target.href};
const money=(v,c='GBP')=>{try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(Number(v))}catch{return c+' '+v}};
const msg=(t,type='')=>{const e=$('basket-message');if(e){e.textContent=t||'';e.className='message '+type}};
const read=()=>{try{const x=JSON.parse(localStorage.getItem(BK)||'[]');return Array.isArray(x)?x.filter(v=>v&&v.tenant_id===T&&v.listing_id):[]}catch{return[]}};
const write=x=>localStorage.setItem(BK,JSON.stringify(x));
const add=id=>{if(!T||!id)return;write([{tenant_id:T,listing_id:id,added_at:new Date().toISOString()}]);};
const pending=()=>{try{const x=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');return x?.tenant_id===T&&x?.order_id?x:null}catch{return null}};
const setPending=x=>{if(x)localStorage.setItem(PENDING_KEY,JSON.stringify(x));else localStorage.removeItem(PENDING_KEY)};
const remove=async id=>{
 const p=pending();
 if(p?.order_id){
  try{
   await rpc('customer_cancel_retail_order',{p_order_id:p.order_id,p_reason:'Customer removed the purchase from the basket.'});
  }catch(e){msg(e.message||String(e),'error');return}
 }
 write(read().filter(v=>String(v.listing_id)!==String(id)));
 setPending(null);listing=null;order=null;credit=0;render();
 msg('Purchase removed from your basket. The item is available in the shop again.','success');
};
async function api(path,o={}){const h=new Headers(o.headers||{});h.set('apikey',K);h.set('Content-Type','application/json');if(session?.access_token)h.set('Authorization','Bearer '+session.access_token);const r=await fetch(U+path,{...o,headers:h}),t=await r.text();let b=null;try{b=t?JSON.parse(t):null}catch{b=t}if(!r.ok)throw Error(b?.message||b?.msg||b?.error_description||b?.error||t||('HTTP '+r.status));return b}
const rpc=(n,b={})=>api('/rest/v1/rpc/'+n,{method:'POST',body:JSON.stringify(Object.assign({p_tenant_id:T},b))});
async function loadListing(){
 const x=read();
 if(!x.length){listing=null;render();return}
 const rows=await api('/rest/v1/rpc/get_published_store_listings?p_tenant_id='+encodeURIComponent(T));
 const id=L||x[0].listing_id;
 const item=(Array.isArray(rows)?rows:[]).find(v=>String(v.listing_id)===String(id));
 if(!item)throw Error('The product in your basket is no longer available.');
 listing={id:item.listing_id,title:item.title,description:item.description,asking_price:item.asking_price,currency:item.currency,listing_data:item.listing_data||{}};
 try{
  const m=await api('/functions/v1/public-listing-media?listing_id='+encodeURIComponent(id)),a=Array.isArray(m?.media)?m.media.slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0]:null;
  if(a?.signed_url)listing.listing_data={...listing.listing_data,primary_image_url:a.signed_url};
 }catch{}
 const q=P.get('order_id'),p=pending();
 if(q&&(!p||p.order_id!==q))setPending({tenant_id:T,order_id:q,listing_id:id});
}
async function loadCustomer(){const p=await rpc('customer_get_profile'),profile=Array.isArray(p)?p[0]:p||{};$('customer-name').textContent=((profile.first_name||'')+' '+(profile.last_name||'')).trim()||'Customer';const a=await rpc('customer_get_addresses'),rows=Array.isArray(a)?a:[],s=rows.find(x=>x.address_type==='shipping')||{},b=rows.find(x=>x.address_type==='billing')||{};$('basket-delivery').innerHTML='<strong>Delivery address</strong><p class="small">'+esc([s.recipient_name,s.line1,s.city,s.postcode].filter(Boolean).join(', ')||'No delivery address saved.')+'</p><strong>Payment address</strong><p class="small">'+esc([b.recipient_name,b.line1,b.city,b.postcode].filter(Boolean).join(', ')||'No payment address saved.')+'</p>';const c=await rpc('customer_get_credit_account'),ca=Array.isArray(c)?c[0]:c||{};credit=Number(ca.balance||0)}
function render(){const e=$('empty-basket'),a=$('auth-panel'),c=$('checkout-panel');if(!listing){a.hidden=true;c.hidden=true;e.hidden=false;return}e.hidden=true;const d=listing.listing_data||{},img=d.primary_image_url||'';$('basket-item').innerHTML='<div class="basket-item">'+(img?'<img src="'+esc(img)+'" alt="'+esc(listing.title)+'">':'<div class="basket-placeholder"></div>')+'<div><span class="eyebrow">Basket</span><h2>'+esc(listing.title)+'</h2><p class="small">'+esc(listing.description||'')+'</p><strong class="basket-price">'+money(listing.asking_price,listing.currency)+'</strong></div><button type="button" class="remove-button" id="remove-item">Remove</button></div>';$('basket-summary').innerHTML='<p><strong>Item</strong><br>'+esc(listing.title)+'</p><p><strong>Total</strong><br><span class="basket-price">'+money(listing.asking_price,listing.currency)+'</span></p>';$('remove-item').textContent=pending()?.order_id?'Cancel purchase':'Remove';$('remove-item').onclick=()=>remove(listing.id);const total=Number(listing.asking_price||0),available=Math.max(0,credit),creditUse=Math.min(available,total),cardDue=Math.max(0,total-creditUse);$('payment-options').innerHTML='<div class="payment-option '+(creditUse>0?'selected':'disabled')+'"><label><input type="checkbox" id="use-customer-credit" '+(creditUse>0?'checked':'disabled')+'><strong>Use customer credit</strong></label><span>Available credit: '+money(available,listing.currency)+(creditUse>0?' · Applying '+money(creditUse,listing.currency):'')+'</span></div><div class="payment-option '+(cardDue>0?'selected':'')+'"><strong>Credit or debit card</strong><span>'+ (cardDue>0?'Pay the remaining '+money(cardDue,listing.currency)+' securely online.':'No card payment required.')+'</span></div><div id="payment-breakdown" class="payment-breakdown"><div><span>Purchase total</span><strong>'+money(total,listing.currency)+'</strong></div>'+(creditUse>0?'<div><span>Customer credit</span><strong>− '+money(creditUse,listing.currency)+'</strong></div>':'')+'<div><span>Card payment</span><strong>'+money(cardDue,listing.currency)+'</strong></div></div>';const cb=$('use-customer-credit');if(cb)cb.onchange=()=>{const use=cb.checked&&creditUse>0,cd=use?Math.max(0,total-creditUse):total;$('payment-breakdown').innerHTML='<div><span>Purchase total</span><strong>'+money(total,listing.currency)+'</strong></div>'+(use?'<div><span>Customer credit</span><strong>− '+money(creditUse,listing.currency)+'</strong></div>':'')+'<div><span>Card payment</span><strong>'+money(cd,listing.currency)+'</strong></div>';};a.hidden=!!session?.access_token;c.hidden=!session?.access_token}
async function createOrder(){
 if(order)return order;
 const p=pending();
 if(p?.order_id){
  try{
   const r=await rpc('customer_get_retail_order_for_checkout',{p_order_id:p.order_id});
   const x=Array.isArray(r)?r[0]:r;
   if(x?.order_id&&String(x.listing_id)===String(listing.id)){order=x;return order}
  }catch{}
  setPending(null);
 }
const a=await rpc('customer_get_addresses'),rows=Array.isArray(a)?a:[],s=rows.find(x=>x.address_type==='shipping')||{},b=rows.find(x=>x.address_type==='billing')||{};if(!s.line1||!s.postcode)throw Error('Add a delivery address in My Details before completing this purchase.');if(!b.line1||!b.postcode)throw Error('Add a payment address in My Details before completing this purchase.');const sa={recipient_name:s.recipient_name||null,line1:s.line1,line2:s.line2||null,city:s.city||null,county:s.county||null,postcode:s.postcode,country_code:s.country_code||'GB'},ba={recipient_name:b.recipient_name||null,line1:b.line1,line2:b.line2||null,city:b.city||null,county:b.county||null,postcode:b.postcode,country_code:b.country_code||'GB'};const r=await rpc('customer_create_retail_order',{p_listing_id:listing.id,p_shipping_address:sa,p_billing_address:ba,p_notes:null});order=Array.isArray(r)?r[0]:r;setPending({tenant_id:T,order_id:order.order_id,listing_id:listing.id});return order}
async function proceed(){if(working||!session?.access_token||!listing)return;working=true;const b=$('proceed');b.disabled=true;b.textContent='Preparing payment…';try{const useCredit=!!$('use-customer-credit')?.checked;let o=await createOrder();if(useCredit){let creditResult=null;try{creditResult=await rpc('customer_apply_retail_credit',{p_order_id:o.order_id})}catch(e){const em=String(e?.message||e);if(!/existing card payment attempt is active/i.test(em))throw e;msg('Refreshing the payment attempt so your customer credit can be used first…');await rpc('customer_cancel_retail_order',{p_order_id:o.order_id,p_reason:'Restarting checkout to apply customer credit before card payment.'});order=null;setPending(null);o=await createOrder();creditResult=await rpc('customer_apply_retail_credit',{p_order_id:o.order_id})}const cx=Array.isArray(creditResult)?creditResult[0]:creditResult;if(cx?.completed){write(read().filter(v=>String(v.listing_id)!==String(listing.id)));setPending(null);$('payment-options').innerHTML='<div class="success-box"><strong>Payment complete</strong><p>Your customer credit has been applied.</p><p>Order reference: '+esc(o.order_reference)+'</p></div>';msg('Payment complete. Order '+esc(o.order_reference)+' has been placed.','success');b.hidden=true;return}}const r=await fetch(U+'/functions/v1/create-stripe-checkout-session',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({tenant_id:T,order_id:o.order_id})}),t=await r.text();let x=null;try{x=t?JSON.parse(t):null}catch{x={error:t}}if(!r.ok||!x?.checkout_url)throw Error(x?.error||'Stripe payment could not be started.');location.href=x.checkout_url}catch(e){order=null;msg(e.message||String(e),'error');b.disabled=false;b.textContent='Proceed to payment';working=false}}
async function start(){
 try{
  setAccountLink();
  await loadListing();render();
  if(session?.access_token){
   await loadCustomer();render();
   $('proceed').onclick=proceed;
   if(P.get('payment')==='cancelled')msg('Payment was cancelled. Your purchase has not been paid for. You can retry payment or cancel the purchase to return the item to the shop.','error');
   else msg('Review your basket and choose how you want to pay.');
  }else if(listing)msg('Sign in to continue to payment.');
 }catch(e){msg(e.message||String(e),'error')}
}
window.addEventListener('tradeflow-auth-success',async e=>{session=e.detail||null;await start()});
try{const x=JSON.parse(localStorage.getItem('tradeflow_customer_session')||'null');if(x?.access_token)session=x}catch{}
if(L)add(L);
start();
})();