const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co',KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
const $=id=>document.getElementById(id);
$('signup-form').onsubmit=async e=>{e.preventDefault();const b=$('submit'),m=$('message');b.disabled=true;b.textContent='Creating account…';m.textContent='';
try{
 const email=$('email').value.trim(),password=$('password').value,businessName=$('business-name').value.trim(),ownerName=$('owner-name').value.trim(),plan='enhanced',nameParts=ownerName.split(/\\s+/).filter(Boolean),firstName=nameParts.shift()||'',lastName=nameParts.join(' '),slug=businessName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'business';
 if(!businessName||!ownerName||!email||!password)throw Error('Please complete all required fields.');
 const authRes=await fetch(SUPABASE_URL+'/auth/v1/signup',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{full_name:ownerName,first_name:firstName,last_name:lastName,business_name:businessName,plan_code:plan}})});
 const authText=await authRes.text();let auth;try{auth=authText?JSON.parse(authText):null}catch{auth=authText}
 if(!authRes.ok)throw Error(auth?.msg||auth?.message||auth?.error_description||authText||'Account creation failed.');
 if(!auth?.access_token){m.className='success';m.textContent='Account created. Check your email to confirm your account. Taking you to Sign in…';setTimeout(()=>{location.href='subscriber-login.html?signup=created'},900);return}
 const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/subscriber_create_business',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_name:businessName,p_slug:slug,p_plan_code:plan})});
 const t=await r.text();let body;try{body=t?JSON.parse(t):null}catch{body=t}
 if(!r.ok)throw Error(body?.message||body?.hint||body?.details||body||'Business setup failed.');
 const tenantId=Array.isArray(body)?body[0]:body;localStorage.setItem('tradeflow_subscriber_session',JSON.stringify(auth));localStorage.setItem('tradeflow_subscriber_tenant_id',tenantId);location.href='subscriber-dashboard.html?tenant_id='+encodeURIComponent(tenantId);
}catch(err){m.className='error';m.textContent=err.message||String(err)}finally{b.disabled=false;b.textContent='Create TradeFlow account'}};