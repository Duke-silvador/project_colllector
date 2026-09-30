const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
let key='',token='',tenantId='',catalog=[],selected=[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
async function api(path,o={}){const h=new Headers(o.headers||{});h.set('apikey',key);h.set('Authorization','Bearer '+token);if(o.body)h.set('Content-Type','application/json');const r=await fetch(SUPABASE_URL+path,{...o,headers:h});const t=await r.text();let b;try{b=t?JSON.parse(t):null}catch{b=t}if(!r.ok)throw Error(b?.message||b?.msg||b?.error||t||'Request failed');return b}
function render(){
 const box=$('shipping-service-list');
 box.innerHTML='<div class="shipping-service-grid">'+catalog.map(x=>{
   const s=selected.find(v=>v.service_code===x.service_code);
   return '<label class="shipping-service-option"><input type="checkbox" data-service-code="'+esc(x.service_code)+'" '+(s?'checked':'')+'><span class="service-body"><span class="service-head"><strong>'+esc(x.service_name)+'</strong><a class="service-link" href="'+esc(x.service_url)+'" target="_blank" rel="noopener">Open website</a></span><span class="small">'+esc(x.description||'')+'</span></span></label>';
 }).join('')+'</div>';
}
async function load(){
 try{
  const a=await window.tradeflowSubscriberAuthReady;key=a.key;token=a.session.access_token;tenantId=a.tenantId;
  $('business-name').textContent=a.tenants?.[tenantId]||'Shipping Settings';
  const settings=await api('/rest/v1/rpc/subscriber_get_shipping_service_settings',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId})});
  catalog=Array.isArray(settings?.catalog)?settings.catalog:[];
  selected=Array.isArray(settings?.selected)?settings.selected:[];
  render();
 }catch(e){$('message').textContent=e.message||String(e);$('message').className='small error'}
}
$('save-shipping-services').onclick=async()=>{
 const status=$('shipping-save-status'),button=$('save-shipping-services');
 try{
  button.disabled=true;status.textContent='Saving selected shipping services…';
  const items=[...document.querySelectorAll('[data-service-code]:checked')].map((e,i)=>{
    const c=catalog.find(x=>x.service_code===e.dataset.serviceCode);
    return {service_code:e.dataset.serviceCode,service_url:c?.service_url||'',enabled:true,sort_order:i+1};
  });
  await api('/rest/v1/rpc/subscriber_save_shipping_services',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId,p_services:items})});
  status.textContent=items.length?items.length+' shipping service'+(items.length===1?'':'s')+' saved.':'No shipping services selected.';
  selected=items.map(x=>Object.assign({},x,{service_name:catalog.find(c=>c.service_code===x.service_code)?.service_name||x.service_code}));
 }catch(e){status.textContent=e.message||String(e)}
 finally{button.disabled=false}
};

$('sign-out').onclick=()=>window.tradeflowSubscriberSignOut();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
