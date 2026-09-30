const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
let key=null,session=null,tenantId=null,rows=[];

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));

function msg(t,type=''){
  const e=$('message'); if(!e)return;
  e.textContent=t||''; e.className=('small '+type).trim();
}

async function auth(){
  const a=await window.tradeflowSubscriberAuthReady;
  key=a?.key||null; session=a?.session||null;
  tenantId=a?.tenantId||null;
  if(!key||!session?.access_token||!tenantId)throw Error('This Returns workspace requires a signed-in subscriber account.');
  return a;
}

async function api(path,o={}){
  await auth();
  const h=new Headers(o.headers||{});
  h.set('apikey',key); h.set('Authorization','Bearer '+session.access_token);
  if(o.body)h.set('Content-Type','application/json');
  const r=await fetch(SUPABASE_URL+path,{...o,headers:h});
  const t=await r.text(); let b=null; try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok)throw Error(b?.message||b?.hint||b?.details||b?.error||t||('HTTP '+r.status));
  return b;
}

async function uploadReturnLabel(returnId,file){
  if(!file)throw Error('Please choose a return label.');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
  const path=tenantId+'/returns/'+returnId+'/return-label-'+Date.now()+'-'+safe;
  const h=new Headers();
  h.set('apikey',key); h.set('Authorization','Bearer '+session.access_token);
  h.set('Content-Type',file.type||'application/octet-stream');
  h.set('x-upsert','true');
  const r=await fetch(SUPABASE_URL+'/storage/v1/object/tradeflow-media/'+path,{method:'POST',headers:h,body:file});
  const t=await r.text(); let b=null; try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok)throw Error(b?.message||b?.error||t||'Return label upload failed.');
  return path;
}

async function load(){
  const target=$('returns');
  if(target)target.innerHTML='<div class="empty">Loading…</div>';
  try{
    const a=await auth();
    const memberships=Array.isArray(a?.memberships)?a.memberships:[];
    const membership=memberships.find(x=>x.tenant_id===a?.tenantId)||memberships[0]||{};
    tenantId=membership.tenant_id||a?.tenantId||null;
    if(!tenantId||tenantId==='null'||tenantId==='undefined')throw Error('No valid subscriber tenant is selected. Please sign in again.');
    $('business-name').textContent=membership.tenant_name||membership.business_name||a?.tenants?.[tenantId]||'TradeFlow';
    rows=await api('/rest/v1/rpc/subscriber_get_returns',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId})})||[];
    rows=Array.isArray(rows)?rows:[];
    await loadReturnContext();
    render();
    msg(rows.length+' return(s) loaded.','success');
  }catch(e){
    msg(e.message||String(e),'error');
    if(target)target.innerHTML='<div class="empty">'+esc(e.message||String(e))+'</div>';
  }
}

async function loadReturnContext(){
  for(const r of rows){
    r.order_title=null; r.customer_name=null; r.customer_email=null;
    try{
      if(r.order_item_id){
        const items=await api('/rest/v1/retail_order_items?select=id,title,quantity,unit_price,line_total,currency&tenant_id=eq.'+encodeURIComponent(tenantId)+'&id=eq.'+encodeURIComponent(r.order_item_id)+'&limit=1');
        const item=Array.isArray(items)?items[0]:null;
        if(item)r.order_title=item.title||null;
      }
      if(r.customer_id){
        const customers=await api('/rest/v1/customers?select=id,customer_reference,first_name,last_name,email&tenant_id=eq.'+encodeURIComponent(tenantId)+'&id=eq.'+encodeURIComponent(r.customer_id)+'&limit=1');
        const customer=Array.isArray(customers)?customers[0]:null;
        if(customer)r.customer_name=(customer.first_name||'')+' '+(customer.last_name||''); r.customer_email=customer?.email||null;
      }
    }catch(e){ /* summary remains usable if context lookup is unavailable */ }
  }
}

function render(){
  const target=$('returns'); if(!target)return;
  if(!rows.length){target.innerHTML='<div class="empty">No returns have been requested.</div>';return;}

  target.innerHTML='<div class="return-list">'+rows.map(r=>{
    const type=r.return_type==='customer_retail'?'Customer retail return':r.return_type==='acquisition'?'Acquisition return':r.return_type||'Return';
    const status=(r.status||'—').replace(/_/g,' ');
    const statusClass=(r.status||'unknown').replace(/[^a-z0-9_-]/gi,'-');
    const pending=r.status==='requested';
    const meta=r.metadata||{};
    const postage=meta.postage_payer==='subscriber'?'Subscriber pays postage':meta.postage_payer==='customer'?'Customer pays postage':'—';
    const decision=meta.decision==='approved'?'Approved':meta.decision==='denied'?'Denied':'';
    return '<article class="return-tile">'+
      '<div class="return-tile-head"><div><div class="return-reference">'+esc(r.return_reference||'Return request')+'</div><div class="return-type">'+esc(type)+'</div></div><span class="return-status '+statusClass+'">'+esc(status)+'</span></div>'+
      '<div class="return-details">'+
        '<div class="return-detail"><span>Item</span><strong>'+esc(r.order_title||'Item details unavailable')+'</strong></div>'+ 
        '<div class="return-detail"><span>Customer</span><strong>'+esc((r.customer_name||'').trim()||'Customer')+'</strong></div>'+ 
        '<div class="return-detail"><span>Reason</span><strong>'+esc(r.reason||r.reason_code||'—')+'</strong></div>'+
        '<div class="return-detail"><span>Refund</span><strong>'+(r.refund_amount==null?'—':esc((r.currency||'GBP')+' '+r.refund_amount))+'</strong></div>'+
        '<div class="return-detail"><span>Requested</span><strong>'+esc(r.requested_at?new Date(r.requested_at).toLocaleString('en-GB'):'—')+'</strong></div>'+
        (pending?'':'<div class="return-detail"><span>Postage</span><strong>'+esc(postage)+'</strong></div>')+
      '</div>'+
      (pending?'<div class="return-decision"><div class="return-decision-title">Return decision</div><div class="return-decision-buttons"><button type="button" class="return-action-button deny" data-deny="'+esc(r.id)+'">Deny return</button><button type="button" class="return-action-button approve" data-approve="'+esc(r.id)+'">Approve return</button></div><div class="return-approval-form" data-form="'+esc(r.id)+'" hidden><label>Who pays return postage?<select data-payer><option value="">Select</option><option value="subscriber">Subscriber pays postage</option><option value="customer">Customer pays postage</option></select></label><label>Supply return label<input type="file" data-label accept=".pdf,.png,.jpg,.jpeg,.webp"></label><button type="button" class="return-confirm" data-confirm="'+esc(r.id)+'">Approve and supply return label</button></div></div>':'<div class="return-decision-result"><strong>'+esc(decision)+'</strong>'+(meta.return_label_path?' <span>Return label supplied</span>':'')+(r.status==='rejected'||r.status==='denied'?'<span>No further return action is required.</span>':'')+'</div>')+\n      (r.order_id?'<div class="actions" style="padding:0 20px 16px"><a class="return-confirm" href="orders-dashboard.html?order_id='+encodeURIComponent(r.order_id)+'">View related order details</a></div>':'')+'</article>';
  }).join('');

  target.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>{
    const f=target.querySelector('[data-form="'+CSS.escape(b.dataset.approve)+'"]');
    if(f){f.hidden=false;b.hidden=true;}
  });
  target.querySelectorAll('[data-deny]').forEach(b=>b.onclick=()=>decide(b.dataset.deny,'denied',null,null));
  target.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.confirm;
    const form=target.querySelector('[data-form="'+CSS.escape(id)+'"]');
    const payer=form?.querySelector('[data-payer]')?.value;
    const file=form?.querySelector('[data-label]')?.files?.[0];
    if(!payer){msg('Select who pays return postage.','error');return;}
    if(!file){msg('Please supply the return label.','error');return;}
    try{
      b.disabled=true; b.textContent='Uploading label…'; msg('Uploading return label…');
      const path=await uploadReturnLabel(id,file);
      await decide(id,'approved',payer,path);
    }catch(e){b.disabled=false;b.textContent='Approve and supply return label';msg(e.message||String(e),'error');}
  });
}

async function decide(id,decision,payer,labelPath){
  try{
    msg(decision==='approved'?'Approving return…':'Denying return…');
    await api('/rest/v1/rpc/subscriber_decide_customer_return',{
      method:'POST',
      body:JSON.stringify({
        p_tenant_id:tenantId,
        p_return_id:id,
        p_decision:decision,
        p_postage_payer:payer,
        p_return_label_path:labelPath,
        p_notes:null
      })
    });
    await load();
    msg(decision==='approved'?'Return approved and label supplied.':'Return denied.','success');
  }catch(e){msg(e.message||String(e),'error');}
}

document.addEventListener('DOMContentLoaded',()=>{
  $('refresh')?.addEventListener('click',load);
  $('sign-out')?.addEventListener('click',()=>window.tradeflowSubscriberSignOut?.());
  load();
});
