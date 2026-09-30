const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
const SESSION_KEY='tradeflow_platform_owner_session';
let session=null;

const $=id=>document.getElementById(id);
try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{}

function save(){if(session?.access_token)localStorage.setItem(SESSION_KEY,JSON.stringify(session));else localStorage.removeItem(SESSION_KEY)}

async function request(path,options={},retry=true){
  const headers=new Headers(options.headers||{});
  headers.set('apikey',KEY);
  if(session?.access_token)headers.set('Authorization',`Bearer ${session.access_token}`);
  if(options.body)headers.set('Content-Type','application/json');
  const response=await fetch(`${SUPABASE_URL}${path}`,{...options,headers});
  const text=await response.text();
  let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
  if(!response.ok){
    if(response.status===401&&retry&&session?.refresh_token){
      const refreshed=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
      const rb=await refreshed.json();
      if(refreshed.ok&&rb?.access_token){session={...rb,user:session.user};save();return request(path,options,false)}
    }
    throw Error(body?.message||body?.msg||body?.error_description||body?.error||text||`HTTP ${response.status}`);
  }
  return body;
}

function showAuth(message=''){
  let overlay=document.getElementById('owner-auth');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='owner-auth';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:24px;z-index:999';
    overlay.innerHTML='<div style="width:min(430px,100%);background:#fff;border-radius:12px;padding:28px;box-shadow:0 20px 70px rgba(0,0,0,.3)"><div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#c46a2b">TradeFlow platform</div><h2>Owner sign in</h2><p>Sign in with your platform owner account.</p><label>Email<input id="owner-email-input" type="email" autocomplete="username" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px"></label><label style="display:block;margin-top:14px">Password<input id="owner-password-input" type="password" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px"></label><button id="owner-signin" type="button" style="margin-top:16px;padding:10px 16px">Sign in</button><div id="owner-auth-error" style="color:#a32929;margin-top:12px"></div></div>';
    document.body.appendChild(overlay);
    $('owner-signin').onclick=signIn;
    $('owner-password-input').onkeydown=e=>{if(e.key==='Enter')signIn()};
  }
  overlay.hidden=false;overlay.style.display='flex';$('owner-auth-error').textContent=message;
}

function hideAuth(){const el=$('owner-auth');if(el){el.hidden=true;el.style.display='none'}}

async function establish(){
  const user=await request('/auth/v1/user');
  session.user=user;save();
  const memberships=await request(`/rest/v1/platform_memberships?select=id,status&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&limit=1`);
  if(!Array.isArray(memberships)||!memberships.length)throw Error('This account is not an active TradeFlow platform owner.');
  $('owner-email').textContent=user.email||'Platform Owner';
}

async function signIn(){
  const button=$('owner-signin'),error=$('owner-auth-error');
  const email=$('owner-email-input').value.trim(),password=$('owner-password-input').value;
  if(!email||!password){error.textContent='Enter your email and password.';return}
  button.disabled=true;button.textContent='Signing in…';error.textContent='';
  try{
    session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    save();await establish();hideAuth();await loadTenants();await loadPlans();await loadPlatformEmail();
  }catch(e){session=null;save();error.textContent=e.message||String(e)}
  finally{button.disabled=false;button.textContent='Sign in'}
}

async function loadPlatformEmail(){
 const status=$('platform-email-status'),input=$('platform-email-input');if(!status||!input)return;
 try{
  const data=await request('/rest/v1/rpc/platform_owner_get_email',{method:'POST',body:'{}'});
  input.value=data?.sender_email||'';
  const s=data?.sender_verification_status||'not_configured';
  status.textContent=s==='verified'?'Status: Ready — TradeFlow can send platform emails.':s==='pending'?'Status: Saved — sender/domain verification is still required.':'Status: Not configured.';
 }catch(e){status.textContent=e.message||String(e)}
}
async function savePlatformEmail(e){
 e.preventDefault();const input=$('platform-email-input'),status=$('platform-email-status'),email=input.value.trim().toLowerCase();
 if(!email){status.textContent='Enter the TradeFlow email address.';return}
 try{
  status.textContent='Saving…';
  const data=await request('/rest/v1/rpc/platform_owner_save_email',{method:'POST',body:JSON.stringify({p_email:email})});
  status.textContent='Status: '+(data?.sender_verification_status==='verified'?'Ready — TradeFlow can send platform emails.':'Saved — sender/domain verification is still required.');
 }catch(e){status.textContent=e.message||String(e)}
}
function nextPlan(code){return null}
function setActionMessage(text,isError=false){const el=$('action-message');if(el){el.textContent=text;el.className=isError?'action-message error':'action-message'}}
async function manageSubscription(tenantId,action,planCode,name){if(action==='close'&&!confirm('Close the TradeFlow account for "'+name+'"? The tenant will be archived and its subscription cancelled. This does not delete its stored business data.'))return;if(action==='upgrade'&&!confirm('Upgrade "'+name+'" to '+planCode+'?'))return;setActionMessage(action==='close'?'Closing account…':'Updating subscription…');try{await request('/rest/v1/rpc/platform_admin_manage_subscription',{method:'POST',body:JSON.stringify({p_tenant_id:tenantId,p_action:action,p_plan_code:planCode})});setActionMessage(action==='close'?'Account closed.':'Subscription upgraded.');await loadTenants()}catch(e){setActionMessage(e.message||String(e),true)}}
async function loadTenants(){const error=$('error');error.textContent='';$('tenant-rows').innerHTML='<tr><td colspan="9">Loading…</td></tr>';try{const [rows,accounts]=await Promise.all([request('/rest/v1/rpc/platform_admin_list_tenants',{method:'POST',body:'{}'}),request('/rest/v1/rpc/platform_admin_list_subscriber_accounts',{method:'POST',body:'{}'})]);const tenants=Array.isArray(rows)?rows:[],subscriberAccounts=Array.isArray(accounts)?accounts:[],subscriberIds=new Set(subscriberAccounts.map(x=>x.tenant_id)),subscriberTenants=tenants.filter(x=>subscriberIds.has(x.tenant_id));$('tenant-count').textContent=subscriberAccounts.length;$('active-count').textContent=subscriberAccounts.filter(x=>x.business_status==='active').length;$('tradeflow-count').textContent=subscriberTenants.filter(x=>x.plan_code==='enhanced').length;if(!subscriberAccounts.length){$('tenant-rows').innerHTML='<tr><td colspan="9">No subscriber businesses found.</td></tr>';return}const tenantMap=new Map(subscriberTenants.map(x=>[x.tenant_id,x]));$('tenant-rows').innerHTML=subscriberAccounts.map(t=>{const d=tenantMap.get(t.tenant_id)||{},current=d.plan_code||'—',next=nextPlan(current);let actions='';if(t.business_status==='archived'){actions='<span class="muted">Closed</span>'}else{actions+='<button class="table-action danger" data-action="close" data-tenant="'+t.tenant_id+'" data-name="'+escapeAttr(t.business_name)+'">Close account</button>'}return '<tr><td><strong>'+escapeHtml(t.business_name||'—')+'</strong></td><td>'+escapeHtml(t.owner_name||'—')+'</td><td>'+escapeHtml(t.owner_email||'—')+'</td><td>'+escapeHtml(current)+'</td><td>'+escapeHtml(d.subscription_status||'—')+'</td><td>'+escapeHtml(t.business_status||'—')+'</td><td>'+formatDate(t.joined_at)+'</td><td><a class="table-action" href="public-site.html?tenant_id='+encodeURIComponent(t.tenant_id)+'" target="_blank" rel="noopener">View website</a></td><td class="actions-cell">'+actions+'</td></tr>'}).join('');document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>manageSubscription(b.dataset.tenant,b.dataset.action,b.dataset.plan,b.dataset.name))}catch(e){error.textContent=e.message||String(e);$('tenant-rows').innerHTML='<tr><td colspan="9">Unable to load platform data.</td></tr>'}}
function planPrice(value,currency='GBP'){if(value===null||value===undefined||value==='')return'';try{return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(Number(value))}catch{return String(value)}}
function renderPlanAdmin(plans){
 const host=$('plan-admin-list');if(!host)return;
 if(!plans.length){host.innerHTML='<p class="muted">No commercial plans configured.</p>';return}
 host.innerHTML=plans.map(p=>'<form class="plan-editor" data-plan-id="'+p.id+'">'+
 '<div class="plan-editor-head"><div><div class="eyebrow">'+escapeHtml(p.code)+'</div><h3>'+escapeHtml(p.name)+'</h3></div><label class="plan-live"><input name="website_visible" type="checkbox" '+(p.website_visible?'checked':'')+'> Live on website</label></div>'+
 '<label>Plan name<input name="name" value="'+escapeAttr(p.name)+'" required></label>'+
 '<label>Description<textarea name="description" rows="3">'+escapeHtml(p.description||'')+'</textarea></label>'+
 '<div class="plan-fields"><label>Monthly price<input name="monthly_price" type="number" min="0" step="0.01" value="'+(p.monthly_price??'')+'" placeholder="e.g. 29.00"></label>'+
 '<label>Annual price<input name="annual_price" type="number" min="0" step="0.01" value="'+(p.annual_price??'')+'" placeholder="Optional"></label>'+
 '<label>Currency<input name="currency" maxlength="3" value="'+escapeAttr(p.currency||'GBP')+'"></label></div>'+
 '<div class="stripe-box"><strong>Stripe</strong><span class="muted">Optional until billing is connected.</span>'+
 '<label>Stripe Product ID<input name="stripe_product_id" value="'+escapeAttr(p.stripe_product_id||'')+'" placeholder="prod_…"></label>'+
 '<label>Stripe monthly Price ID<input name="stripe_monthly_price_id" value="'+escapeAttr(p.stripe_monthly_price_id||'')+'" placeholder="price_…"></label>'+
 '<label>Stripe annual Price ID<input name="stripe_annual_price_id" value="'+escapeAttr(p.stripe_annual_price_id||'')+'" placeholder="price_…"></label></div>'+
 '<div class="plan-editor-foot"><span class="plan-status" aria-live="polite"></span><button class="table-action" type="submit">Save plan</button></div></form>').join('');
 document.querySelectorAll('.plan-editor').forEach(form=>form.onsubmit=savePlan);
}
async function loadPlans(){
 const error=$('plans-error'),host=$('plan-admin-list');if(!host)return;
 error.textContent='';host.innerHTML='<p class="muted">Loading plans…</p>';
 try{const rows=await request('/rest/v1/rpc/platform_owner_get_plans',{method:'POST',body:'{}'});renderPlanAdmin(Array.isArray(rows)?rows:[])}
 catch(e){error.textContent=e.message||String(e);host.innerHTML='<p class="muted">Unable to load commercial plans.</p>'}
}
async function savePlan(e){
 e.preventDefault();const form=e.currentTarget,status=form.querySelector('.plan-status'),button=form.querySelector('button[type="submit"]'),data=new FormData(form);
 const payload={p_plan_id:form.dataset.planId,p_name:String(data.get('name')||''),p_description:String(data.get('description')||''),p_website_visible:data.get('website_visible')==='on',p_monthly_price:String(data.get('monthly_price')||'')===''?null:Number(data.get('monthly_price')),p_annual_price:String(data.get('annual_price')||'')===''?null:Number(data.get('annual_price')),p_currency:String(data.get('currency')||'GBP'),p_stripe_product_id:String(data.get('stripe_product_id')||''),p_stripe_monthly_price_id:String(data.get('stripe_monthly_price_id')||''),p_stripe_annual_price_id:String(data.get('stripe_annual_price_id')||'')};
 button.disabled=true;status.textContent='Saving…';
 try{await request('/rest/v1/rpc/platform_owner_update_plan',{method:'POST',body:JSON.stringify(payload)});status.textContent='Saved.';await loadPlans()}
 catch(err){status.textContent=err.message||String(err)}
 finally{button.disabled=false}
}
function escapeAttr(value){return escapeHtml(value)}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function formatDate(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?escapeHtml(value):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}

$('refresh').onclick=loadTenants;$('refresh-plans').onclick=loadPlans;
$('platform-email-form').onsubmit=savePlatformEmail;
$('sign-out').onclick=()=>{session=null;save();location.reload()};

(async()=>{
  try{if(!session?.access_token)throw Error('Sign in required');await establish();hideAuth();await loadTenants();await loadPlans();await loadPlatformEmail()}
  catch(e){showAuth('')}
})();