(()=>{
const SUPABASE_URL='https://twfbmjwwqzxdxvclxbun.supabase.co';
const SUPABASE_KEY='sb_publishable_AvcMgtUKV0O5k8H6k94mZQ_qH4pEIS9';
const tenantId=new URLSearchParams(location.search).get('tenant_id');
const CUSTOMER_SITE_BASE='https://laurendigitaluk.github.io/TradeFlow/';
let businessName='this business';
const SESSION_STORAGE=tenantId?'tradeflow_customer_session:'+tenantId:'tradeflow_customer_session:unknown';
const PENDING_STORAGE=tenantId?'tradeflow_pending_customer_registration:'+tenantId:'tradeflow_pending_customer_registration:unknown';
const LEGACY_KEYS=['tradeflow_customer_session','tradeflow_customer_tenant_id','tradeflow_testlab_session','tradeflow_pending_customer_registration'];
let authReadyResolve;
window.tradeflowCustomerAuthReady=new Promise(resolve=>{authReadyResolve=resolve});
const $=id=>document.getElementById(id);
const message=(text,type='')=>{const e=$('customer-message');if(e){e.textContent=text;e.className=type}};
const busy=(button,value,label)=>{if(!button)return;button.disabled=value;if(value){button.dataset.authLabel=button.textContent;if(label)button.textContent=label}else if(button.dataset.authLabel)button.textContent=button.dataset.authLabel};
function clearLegacySharedState(){LEGACY_KEYS.forEach(k=>{try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch{}})}
async function authRequest(path,body){
 const response=await fetch(SUPABASE_URL+path,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const text=await response.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
 if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||data?.error||text||'Authentication request failed.');
 return data;
}
function saveSession(data){
 if(data?.access_token)sessionStorage.setItem(SESSION_STORAGE,JSON.stringify(data));
 else sessionStorage.removeItem(SESSION_STORAGE);
 clearLegacySharedState();
}
function dispatchAuthSuccess(data){
 window.tradeflowPendingAuthSession=data;
 window.dispatchEvent(new CustomEvent('tradeflow-auth-success',{detail:data}));
}
async function loadBusinessName(){try{const r=await fetch(SUPABASE_URL+'/rest/v1/tenant_public_profiles?select=business_name&tenant_id=eq.'+encodeURIComponent(tenantId),{headers:{apikey:SUPABASE_KEY}});const rows=await r.json();businessName=rows?.[0]?.business_name||businessName}catch{}}
async function resendConfirmation(){
 const email=$('auth-email')?.value.trim(),button=$('auth-resend');
 if(!tenantId)return message('This Customer Portal link is missing its business identifier.','error');
 if(!email)return message('Enter your email address first, then choose Resend confirmation email.','error');
 busy(button,true,'Sending…');
 try{
  const emailRedirectTo=new URL('customer-email-confirmed.html',CUSTOMER_SITE_BASE);emailRedirectTo.searchParams.set('tenant_id',tenantId);
  await authRequest('/auth/v1/resend',{type:'signup',email,options:{email_redirect_to:emailRedirectTo.href}});
  message('If your email address still needs confirmation, we’ll send you a new confirmation link. Please check your inbox and spam folder.','success');
 }catch(error){
  message(error.message||String(error),'error');
 }finally{busy(button,false)}
}
async function requestPasswordReset(){
 const email=$('auth-email')?.value.trim(),button=$('auth-reset');
 if(!tenantId)return message('This Customer Portal link is missing its business identifier.','error');
 if(!email)return message('Enter your email address first, then choose Forgot password.','error');
 busy(button,true,'Sending…');
 try{
  const resetUrl=new URL('customer-password-reset.html',location.href);
  resetUrl.searchParams.set('tenant_id',tenantId);
  const response=await authRequest('/auth/v1/recover?redirect_to='+encodeURIComponent(resetUrl.href),{email});
  void response;
  message('If an account exists for that email, a password reset email has been sent. Check your inbox and spam folder.','success');
 }catch(error){
  message(error.message||String(error),'error');
 }finally{busy(button,false)}
}
async function registerCustomer(accessToken,first,last){
 if(!tenantId)throw Error('This Customer Portal link is missing its business identifier.');
 const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/customer_register_for_tenant',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({p_tenant_id:tenantId,p_first_name:first,p_last_name:last||null,p_phone:null})});
 const text=await response.text();if(!response.ok){let detail=text;try{const parsed=JSON.parse(text);detail=parsed.message||parsed.msg||parsed.error||text}catch{}throw Error(detail||'Customer registration could not be completed.')}return true;
}
async function signIn(){
 const email=$('auth-email')?.value.trim(),password=$('auth-password')?.value||'',button=$('auth-sign-in');
 if(!tenantId)return message('This Customer Portal link is missing its business identifier.','error');
 if(!email||!password)return message('Enter your email and password.','error');
 busy(button,true,'Signing in…');
 try{
  sessionStorage.removeItem(SESSION_STORAGE);clearLegacySharedState();
  const data=await authRequest('/auth/v1/token?grant_type=password',{email,password});
  if(!data?.access_token)throw Error('Supabase did not return a customer session.');
  const userResponse=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+data.access_token}});
  if(!userResponse.ok)throw Error('Sign-in succeeded but the customer session could not be verified. Please try again.');
  saveSession(data);
  let pending=null;try{pending=JSON.parse(sessionStorage.getItem(PENDING_STORAGE)||'null')}catch{}
  if(pending?.tenant_id===tenantId&&pending?.email?.toLowerCase()===email.toLowerCase()){
    await registerCustomer(data.access_token,pending.first_name,pending.last_name);
    sessionStorage.removeItem(PENDING_STORAGE);
  }
  dispatchAuthSuccess(data);
 }catch(error){sessionStorage.removeItem(SESSION_STORAGE);message(error.message||String(error),'error')}finally{busy(button,false)}
}
async function signUp(){
 if(!tenantId)return message('This Customer Portal link is missing its business identifier.','error');
 const email=$('auth-email')?.value.trim(),password=$('auth-password')?.value||'',first=$('auth-first-name')?.value.trim(),last=$('auth-last-name')?.value.trim(),button=$('auth-sign-up');
 if(!email||!password||!first)return message('Email, password and first name are required.','error');
 busy(button,true,'Creating account…');
 try{
  sessionStorage.removeItem(SESSION_STORAGE);clearLegacySharedState();
  sessionStorage.setItem(PENDING_STORAGE,JSON.stringify({tenant_id:tenantId,email,first_name:first,last_name:last||null}));
  const emailRedirectTo=new URL('customer-email-confirmed.html',CUSTOMER_SITE_BASE);emailRedirectTo.searchParams.set('tenant_id',tenantId);
  const data=await authRequest('/auth/v1/signup',{email,password,options:{email_redirect_to:emailRedirectTo.href}});
  if(!data?.access_token){
   setAuthMode(false);
   message('This email already has a TradeFlow customer login, or email confirmation is still required. Use Sign in to connect this customer to '+businessName+'. If this is a new account, check your email first.','error');
   return;
  }
  saveSession(data);
  await registerCustomer(data.access_token,first,last);
  sessionStorage.removeItem(PENDING_STORAGE);
  dispatchAuthSuccess(data);
 }catch(error){
  const detail=error.message||String(error);
  if(/already registered|already exists|user exists|email.*exists/i.test(detail)){
   setAuthMode(false);
   message('This email already has a TradeFlow customer login. Use Sign in to connect this customer to '+businessName+'.','error');
  }else{
   message(detail,'error');
  }
  sessionStorage.removeItem(SESSION_STORAGE);
 }finally{busy(button,false)}
}
async function restoreExistingSession(){
 const raw=sessionStorage.getItem(SESSION_STORAGE);if(!raw)return;
 try{
  let data=JSON.parse(raw);if(!data?.access_token)throw Error('Invalid customer session.');
  let response=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+data.access_token}});
  if(!response.ok&&data?.refresh_token){
   const refreshed=await authRequest('/auth/v1/token?grant_type=refresh_token',{refresh_token:data.refresh_token});
   if(!refreshed?.access_token)throw Error('Customer session could not be refreshed.');
   data=refreshed;saveSession(data);response=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+data.access_token}});
  }
  if(!response.ok)throw Error('Customer session is no longer valid.');
  dispatchAuthSuccess(data);
 }catch{sessionStorage.removeItem(SESSION_STORAGE)}
}
function setAuthMode(signup){
 const signupFields=$('auth-signup-fields'),signIn=$('auth-sign-in'),signUp=$('auth-sign-up'),create=$('auth-create-account'),back=$('auth-back-sign-in'),title=$('auth-title'),intro=$('auth-intro'),password=$('auth-password');
 const isSignup=Boolean(signup);
 if(signupFields)signupFields.hidden=!isSignup;
 if(signIn)signIn.hidden=isSignup;
 if(signUp)signUp.hidden=!isSignup;
 if(create)create.hidden=isSignup;
 if(back)back.hidden=!isSignup;
 if(password)password.autocomplete=isSignup?'new-password':'current-password';
 if(title)title.textContent=isSignup?'Create your customer account':'Sign in to your customer account';
 if(intro)intro.textContent=isSignup?'Create an account for this business using your name, email address and password.':'Use your email address and password to sign in to this business’s customer portal.';
}
window.tradeflowCustomerSetAuthMode=setAuthMode;
function bind(){
 clearLegacySharedState();
 $('auth-sign-in')?.addEventListener('click',signIn);
 $('auth-sign-up')?.addEventListener('click',signUp);
 $('auth-create-account')?.addEventListener('click',()=>setAuthMode(true));
 $('auth-back-sign-in')?.addEventListener('click',()=>setAuthMode(false));
 setAuthMode(false);
 $('auth-resend')?.addEventListener('click',resendConfirmation);
 $('auth-reset')?.addEventListener('click',requestPasswordReset);
 $('auth-password')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();signIn()}});
 loadBusinessName().finally(()=>{setAuthMode(false);restoreExistingSession().finally(()=>authReadyResolve())});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
