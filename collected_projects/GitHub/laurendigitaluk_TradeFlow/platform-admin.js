const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const KEY_STORAGE='tradeflow_platform_admin_publishable_key';
const SESSION_STORAGE='tradeflow_platform_admin_session';
let key=null,session=null;
const $=id=>document.getElementById(id);
function status(text,type=''){const e=$('connection-status');e.textContent=text;e.className=`small ${type}`.trim()}
function authStatus(text,type=''){const e=$('auth-status');e.textContent=text;e.className=`small ${type}`.trim()}
function msg(text,type=''){const e=$('create-message');e.textContent=text;e.className=type}
function showDenied(){ $('admin').hidden=true; $('denied').hidden=false; status('Platform Owner access required.','error'); }
function showSignIn(message='Your TradeFlow session has expired. Please sign in again.'){
  saveSession(null);
  $('app').hidden=true;
  $('admin').hidden=true;
  $('denied').hidden=true;
  $('auth').hidden=false;
  const current=$('auth-email').value.trim()||session?.user?.email||'';
  if(current)$('auth-email').value=current;
  authStatus(message,'error');
}
function isAccessDeniedError(e){
  if(e?.authFailure)return false;
  const text=String([e?.message,e?.details,e?.hint,e?.code].filter(Boolean).join(' ')).toLowerCase();
  return e?.platformDenied===true || e?.status===403 || text.includes('platform owner access required') || text.includes('platform owner') || text.includes('identity mismatch');
}
function tokenExpiry(token){
  try{
    const part=token.split('.')[1];
    if(!part)return 0;
    const b64=part.replace(/-/g,'+').replace(/_/g,'/');
    const json=decodeURIComponent(atob(b64.padEnd(b64.length+((4-b64.length%4)%4),'=')).split('').map(c=>`%${('00'+c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    return Number(JSON.parse(json).exp||0);
  }catch{return 0}
}
async function refreshSession(){
  if(!key||!session?.refresh_token){const e=new Error('Your TradeFlow session has expired. Please sign in again.');e.authFailure=true;throw e;}
  const h=new Headers();h.set('apikey',key);h.set('Content-Type','application/json');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:h,body:JSON.stringify({refresh_token:session.refresh_token})});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{j=null}
  if(!r.ok){saveSession(null);const e=new Error(j?.msg||j?.message||j?.error_description||j?.error||'Your TradeFlow session has expired. Please sign in again.');e.status=r.status;e.authFailure=true;throw e;}
  saveSession(j);return j;
}
async function ensureFreshSession(){
  if(!session?.access_token)return;
  const exp=tokenExpiry(session.access_token);
  if(exp && exp <= Math.floor(Date.now()/1000)+300)await refreshSession();
}
async function api(path,options={},allowRefresh=true){
  if(!key)throw new Error('TradeFlow Supabase is not connected.');
  if(allowRefresh)await ensureFreshSession();
  const h=new Headers(options.headers||{});
  h.set('apikey',key);h.set('Content-Type','application/json');
  if(session?.access_token)h.set('Authorization',`Bearer ${session.access_token}`);
  const r=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:h});
  const t=await r.text();
  let b=null;try{b=t?JSON.parse(t):null}catch{b=t}
  if(!r.ok){
    if((r.status===401||r.status===403)&&allowRefresh&&session?.refresh_token){
      try{
        await refreshSession();
        return api(path,options,false);
      }catch(refreshError){throw refreshError;}
    }
    const d=b?.message||b?.msg||b?.error_description||b?.error||t||`HTTP ${r.status}`;
    const e=new Error(d);e.status=r.status;e.details=b?.details;e.hint=b?.hint;e.code=b?.code;
    if(r.status===403)e.platformDenied=true;
    throw e;
  }
  return b;
}
function saveSession(s){session=s||null;if(s?.access_token)localStorage.setItem(SESSION_STORAGE,JSON.stringify(s));else localStorage.removeItem(SESSION_STORAGE)}
async function signOut(){saveSession(null);location.reload()}
async function loadAdmin(){
  $('admin').hidden=true;$('denied').hidden=true;
  try{
    const rows=await api('/rest/v1/rpc/platform_admin_list_tenants',{method:'POST',body:'{}'});
    $('admin').hidden=false;
    renderTenants(Array.isArray(rows)?rows:[]);
    status('Platform Owner access verified.','success');
  }catch(e){
    if(e?.authFailure){showSignIn(e.message);return;}
    if(isAccessDeniedError(e)){showDenied();return;}
    status(`Platform administration check failed: ${e.message}`,'error');
  }
}
function renderTenants(rows){if(!rows.length){$('tenant-list').innerHTML='<p class="small">No subscriber businesses exist yet.</p>';return}const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));$('tenant-list').innerHTML=`<table class="tenant-table"><thead><tr><th>Business</th><th>Slug</th><th>Status</th><th>Plan</th><th>Subscription</th><th>Members</th><th>Created</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.tenant_name)}</strong></td><td>${esc(r.tenant_slug)}</td><td><span class="status ${esc(r.tenant_status)}">${esc(r.tenant_status)}</span></td><td>${esc(r.plan_name||r.plan_code||'—')}</td><td>${esc(r.subscription_status||'—')}</td><td>${esc(r.member_count)}</td><td>${esc(new Date(r.created_at).toLocaleDateString('en-GB'))}</td></tr>`).join('')}</tbody></table>`}
async function createTenant(e){e.preventDefault();const button=$('create');button.disabled=true;button.textContent='Creating…';msg('');try{const email=$('owner-email').value.trim();const users=await api('/rest/v1/rpc/platform_admin_find_user',{method:'POST',body:JSON.stringify({p_email:email})});const user=Array.isArray(users)?users[0]:null;if(!user)throw new Error('No TradeFlow Auth account was found for that owner email. Create the owner account first, then retry.');if(!user.email_confirmed)throw new Error('The owner Auth account exists but its email is not confirmed.');const id=await api('/rest/v1/rpc/platform_admin_create_tenant',{method:'POST',body:JSON.stringify({p_name:$('tenant-name').value.trim(),p_slug:$('tenant-slug').value.trim().toLowerCase(),p_owner_user_id:user.user_id,p_plan_code:$('plan-code').value})});msg(`Subscriber business created successfully. Tenant ID: ${id}`,'success');$('create-form').reset();await loadAdmin()}catch(e){if(e?.authFailure){showSignIn(e.message);return}if(isAccessDeniedError(e)){showDenied();msg('Platform Owner access required.','error')}else{msg(e.message||String(e),'error')}}finally{button.disabled=false;button.textContent='Create subscriber business'}}
async function signIn(e){e.preventDefault();const email=$('auth-email').value.trim(),password=$('auth-password').value;if(!email||!password){authStatus('Enter email and password.','error');return}const button=$('sign-in');button.disabled=true;button.textContent='Signing in…';authStatus('');try{const h=new Headers();h.set('apikey',key);h.set('Content-Type','application/json');const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:h,body:JSON.stringify({email,password})});const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{j={}}if(!r.ok)throw new Error(j?.msg||j?.message||j?.error_description||j?.error||'Authentication failed.');saveSession(j);authStatus('Signed in.');$('auth').hidden=true;$('app').hidden=false;$('session-email').textContent=j.user?.email||email;await loadAdmin()}catch(e){saveSession(null);authStatus(e.message||String(e),'error')}finally{button.disabled=false;button.textContent='Sign in'}}
async function connect(k){try{if(!k||!k.startsWith('sb_')){status('Enter the TradeFlow Supabase publishable key beginning with sb_.','error');return}key=k;localStorage.setItem(KEY_STORAGE,k);status('Connected. Sign in with the account you want to test.');$('config').hidden=true;$('auth').hidden=false;$('app').hidden=true}catch(e){key=null;status(`Connection failed: ${e.message||e}`,'error')}}
$('connect').addEventListener('click',()=>connect($('supabase-key').value.trim()));$('auth-form').addEventListener('submit',signIn);$('sign-out').addEventListener('click',signOut);$('refresh').addEventListener('click',loadAdmin);$('create-form').addEventListener('submit',createTenant);
const savedKey=localStorage.getItem(KEY_STORAGE);if(savedKey)$('supabase-key').value=savedKey;
const savedSession=localStorage.getItem(SESSION_STORAGE);if(savedSession){try{session=JSON.parse(savedSession)}catch{saveSession(null)}}
