/* Gifted Brainz EduSpace student portal v12 */
(() => {
  const cfg={url:String(window.GB_SUPABASE_URL||''),key:String(window.GB_SUPABASE_ANON_KEY||'')};
  const apiBase=String(window.GB_STUDENT_API_URL||'').replace(/\/$/,'');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const configured=Boolean(cfg.url&&cfg.key)&&!/YOUR[-_]/.test(cfg.url+' '+cfg.key);
  const CONFIG_MSG='Sign-in is not configured yet. Set GB_SUPABASE_URL and GB_SUPABASE_ANON_KEY in supabase-config.js to your project URL and publishable/anon key.';
  const supa=configured?window.supabase?.createClient?.(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const el=id=>document.getElementById(id);
  const note=(message,type='info')=>{const n=el('message');if(n){n.className=type;n.textContent=message;}};
  const origin=location.origin;
  const SECURITY_QUESTIONS=[
    ['first_school','What was the name of your first school?'],
    ['birth_city','What city or town were you born in?'],
    ['favourite_subject','What is your favourite school subject?'],
    ['childhood_nickname','What nickname did you use as a child?'],
    ['first_teacher','What was the name of your first teacher?'],
    ['special_word','What special word or phrase would you remember for verification?']
  ];
  const securityQuestionOptions=()=>SECURITY_QUESTIONS.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
  async function adminContact(){
    try{const r=await fetch((apiBase||'')+'/api/student/support-contact',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(r.ok&&d.contact)return String(d.contact)}catch{}
    return String(window.GB_ADMIN_CONTACT||'').trim()||'the administrator';
  }
  async function signInWithRetry(email,password){
    let lastError=null;
    for(let i=0;i<3;i++){
      const {data,error}=await supa.auth.signInWithPassword({email,password});
      if(!error&&data?.session)return data;
      lastError=error||new Error('Sign-in session was not created.');
      if(i<2)await new Promise(r=>setTimeout(r,500*(i+1)));
    }
    throw lastError;
  }
  async function session(){if(!supa)throw Error('Supabase configuration is missing.');const {data,error}=await supa.auth.getSession();if(error)throw error;return data.session;}
  async function authFetch(path,options={}){const s=await session();if(!s?.access_token){location.href='/login.html?reason=signin';throw Error('Please sign in again.');}const r=await fetch((apiBase||'')+path,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`Request failed (${r.status}).`);return data;}
  async function ensureProfile(fullName=''){return authFetch('/api/student/bootstrap',{method:'POST',body:JSON.stringify({fullName})});}
  async function signOut(){try{await supa?.auth.signOut();}finally{location.href='/';}}
  function shell(active,title,content){document.body.innerHTML=`<div class="portal"><header class="portal-top"><a class="brand" href="/dashboard.html"><span class="brand-mark">GB</span><span><b>Gifted Brainz</b><small>EduSpace</small></span></a><nav><a class="${active==='dashboard'?'active':''}" href="/dashboard.html">Dashboard</a><a href="/account.html">My Account</a><button id="logoutBtn" class="btn light">Log out</button></nav></header><main class="portal-main"><div class="eyebrow">STUDENT EDUSPACE</div><h1>${esc(title)}</h1>${content}</main></div>`;el('logoutBtn')?.addEventListener('click',signOut);}
  async function boot(){
    if(!supa){document.body.innerHTML='<main class="center"><h1>Portal configuration required</h1><p>Set the Supabase URL and publishable key in <code>supabase-config.js</code>.</p></main>';return;}
    const s=await session(); if(!s?.access_token){location.href='/login.html?reason=signin';return;}
    return s;
  }

  async function loginPage(){
    const reason=new URLSearchParams(location.search).get('reason');
    if(!supa){note(CONFIG_MSG,'error');return;}
    const support=await adminContact();
    const supportHost=el('adminContact'); if(supportHost) supportHost.textContent=support;
    const signup=el('signupForm');
    signup?.querySelector('[data-security-fields]')?.remove();
    if(signup){
      const box=document.createElement('div');box.dataset.securityFields='1';box.className='security-fields';
      box.innerHTML=`<div class="security-heading"><b>Password recovery verification</b><small>Choose two questions and answers. The administrator will use these to verify you if you forget your password.</small></div><div class="field"><label>Security question 1</label><select id="signupSecurityQ1" required>${securityQuestionOptions()}</select></div><div class="field"><label>Answer 1</label><input id="signupSecurityA1" maxlength=160 autocomplete="off" required></div><div class="field"><label>Security question 2</label><select id="signupSecurityQ2" required>${securityQuestionOptions()}</select></div><div class="field"><label>Answer 2</label><input id="signupSecurityA2" maxlength=160 autocomplete="off" required></div>`;
      const submit=signup.querySelector('button[type=submit]');signup.insertBefore(box,submit||null);
      const sync=()=>{const a=el('signupSecurityQ1'),b=el('signupSecurityQ2');if(!a||!b)return;[...b.options].forEach(o=>o.disabled=o.value===a.value);if(b.value===a.value)b.value=[...b.options].find(o=>!o.disabled)?.value||'';};
      el('signupSecurityQ1')?.addEventListener('change',sync);sync();
    }
    signup?.addEventListener('submit',async e=>{
      e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;
      try{
        const email=el('signupEmail').value.trim(),password=el('signupPassword').value,fullName=el('signupName').value.trim();try{if(fullName)localStorage.setItem('gb_student_name',fullName);}catch{}
        const q1=el('signupSecurityQ1')?.value||'',a1=el('signupSecurityA1')?.value.trim()||'',q2=el('signupSecurityQ2')?.value||'',a2=el('signupSecurityA2')?.value.trim()||'';
        if(password.length<8)throw Error('Password must be at least 8 characters.');
        if(!email||!fullName)throw Error('Full name and email are required.');
        if(!a1||!a2)throw Error('Both security question answers are required.');
        if(q1===q2)throw Error('Choose two different security questions.');
        const r=await fetch((apiBase||'')+'/api/student/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,fullName,securityQuestions:[{key:q1,answer:a1},{key:q2,answer:a2}]})});
        const d=await r.json().catch(()=>({}));if(r.status===404||r.status===405)throw Error('The Student registration API is not deployed at /api/student/register. Deploy the included edge-functions folder with the Student site.');if(r.status===503)throw Error(d.error||'The Student registration backend is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in EdgeOne Edge Functions, then deploy again.');if(r.status===409||r.status===422)throw Error(d.error||'An account with this email already exists. Please sign in instead.');if(!r.ok)throw Error(d.error||`Registration failed (${r.status}). Please try again.`);
        const data=await signInWithRetry(email,password);
        if(!data.session)throw Error('Account was created, but the login session could not be opened. Please sign in once with the same details.');
        await ensureProfile(fullName);location.href='/auth-callback.html';
      }catch(err){note(err.message||'Registration failed.','error')}finally{b.disabled=false;}
    });
    el('loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;try{const {data,error}=await supa.auth.signInWithPassword({email:el('loginEmail').value.trim(),password:el('loginPassword').value});if(error)throw error;await ensureProfile();location.href='/auth-callback.html';}catch(err){note(err.message||'Sign in failed.','error')}finally{b.disabled=false;}});
    if(reason==='signin')note('Please sign in to open your student portal.','info');
  }

  async function callbackPage(){try{if(!supa)throw Error('Supabase configuration is missing.');let current=(await supa.auth.getSession())?.data?.session;if(!current){const code=new URLSearchParams(location.search).get('code');if(code){const r=await supa.auth.exchangeCodeForSession(code);if(r.error)throw r.error;current=r.data?.session||null;}}if(!current)throw Error('Your account session could not be opened. Please return to the login page and sign in again.');const out=await ensureProfile();if(out.needsSubjects)location.href='/subject-register.html';else location.href='/dashboard.html';}catch(err){note(err.message||'Unable to open your account.','error');}}
  async function registerSubjects(){try{await boot();const data=await authFetch('/api/student/subjects');if(data.length){location.href='/dashboard.html';return;}const subjects=await fetch((apiBase||'')+'/api/subjects').then(async r=>{const d=await r.json().catch(()=>[]);if(!r.ok)throw Error(d.error||'Subjects could not be loaded.');return d;});const host=el('subjectChoices');host.innerHTML=subjects.filter(x=>x.active).map(x=>`<label class="subject-choice"><input type="checkbox" value="${esc(x.id)}"><span class="sub-icon">${esc(x.icon)}</span><span><b>${esc(x.name)}</b><small>Select this subject</small></span></label>`).join('');el('subjectForm').addEventListener('submit',async e=>{e.preventDefault();const ids=[...host.querySelectorAll('input:checked')].map(x=>x.value);if(!ids.length){note('Select at least one subject.','error');return;}const b=e.currentTarget.querySelector('button');b.disabled=true;try{await authFetch('/api/student/subjects/register',{method:'POST',body:JSON.stringify({subjectIds:ids})});location.href='/dashboard.html';}catch(err){note(err.message,'error')}finally{b.disabled=false;}});}catch(err){note(err.message,'error');}}
  async function dashboard(){try{await boot();const p=await ensureProfile();const data=await authFetch('/api/student/subjects');shell('dashboard','My Subjects',`<p class="sub">Choose a subject to open its collections of notes, videos, images and CBT assessments.</p><div class="subject-grid">${data.map(x=>`<a class="subject-card" href="/subject.html?id=${encodeURIComponent(x.id)}"><span class="subject-icon">${esc(x.icon)}</span><span><b>${esc(x.name)}</b><small>Open subject →</small></span></a>`).join('')||'<div class="empty">No subjects are registered yet.</div>'}</div><div class="notice"><b>Subject registration:</b> Your initial registration is locked after submission. Ask the administrator to add or remove subjects.</div>`);}catch(err){note(err.message,'error');}}
  async function subjectPage(){try{await boot();const id=new URLSearchParams(location.search).get('id');if(!id)throw Error('Subject identifier is missing.');const data=await authFetch('/api/student/subjects/detail?id='+encodeURIComponent(id));shell('dashboard',data.subject.name,`<p class="sub">${esc(data.subject.icon)} Collections for this subject</p><div class="collection-grid">${data.collections.map(c=>`<section class="collection-card"><div class="collection-head"><div><h2>${esc(c.name)}</h2><p>${esc(c.description||'')}</p></div><span class="sort-pill">${esc(c.sort_mode||'manual')}</span></div><div class="collection-items">${c.items.map(item=>item.type==='cbt'?`<a class="collection-item assessment" href="/assessment/?quiz=${encodeURIComponent(item.quiz.slug)}"><span class="item-icon">🎯</span><span><b>${esc(item.title)}</b><small>CBT • ${Number(item.quiz.duration)||0} min • ${esc(item.quiz.description||'')}</small></span><em>Begin →</em></a>`:`<article class="collection-item material"><span class="item-icon">${item.material.material_type==='video'?'🎬':item.material.material_type==='image'?'🖼️':item.material.material_type==='audio'?'🎧':'📚'}</span><div><h3>${esc(item.title)}</h3><small>${esc(item.material.topic||'')}</small><div class="rich">${item.material.body||''}</div>${(item.material.files||[]).map(f=>{const u=f.signedUrl||f.url||'';return u?`<a class="media-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(f.file_name||f.fileName||'Open file')}</a>`:''}).join('')}</div></article>`).join('')||'<p class="muted">Nothing has been added to this collection yet.</p>'}</div></section>`).join('')||'<div class="empty">No collections have been published for this subject yet.</div>'}`);}catch(err){document.body.innerHTML=`<main class="center"><h1>Subject unavailable</h1><p>${esc(err.message)}</p><a class="btn primary" href="/dashboard.html">Back to Dashboard</a></main>`;}}
  async function activationSettings(){
    try{const r=await fetch((apiBase||'')+'/api/student/activation-settings',{cache:'no-store'});if(r.ok)return await r.json();}catch{}
    const fallback=String(window.GB_ACTIVATION_PRICE||'').trim();
    return {configured:Boolean(fallback),priceLabel:fallback,currency:String(window.GB_ACTIVATION_CURRENCY||'NGN')};
  }
  function activationPriceLabel(settings){
    const raw=String(settings?.priceLabel||'').trim();
    if(!raw)return 'Activation price not configured';
    return raw;
  }
  function accountDetailsMarkup(profile,subjects,settings){
    const activated=Boolean(profile?.activated);
    const subjectLabel=subjects.length?subjects.map(s=>esc(s.name)).join(', '):'No subjects registered';
    const username=String(profile?.username||'').trim()||'Not assigned';
    const email=String(profile?.email||'').trim()||'Not available';
    const displayName=String(profile?.full_name||'Student').trim()||'Student';try{if(profile?.full_name)localStorage.setItem('gb_student_name',String(profile.full_name));if(profile?.product_key)localStorage.setItem('gb_product_key',String(profile.product_key));}catch{}
    return `<section class="account-section">
      <div class="section-heading">
        <div><div class="eyebrow">ACCOUNT OVERVIEW</div><h2>Your Details</h2></div>
        <span class="status-chip ${activated?'active':'pending'}">${activated?'Activated':'Not activated'}</span>
      </div>
      <div class="account-details-grid">
        <article class="account-detail-card"><small>Full name</small><strong>${esc(displayName)}</strong></article>
        <article class="account-detail-card"><small>Username</small><strong>${esc(username)}</strong></article>
        <article class="account-detail-card account-detail-email"><small>Email</small><strong title="${esc(email)}">${esc(email)}</strong></article>
        <article class="account-detail-card account-detail-subjects"><small>Subjects</small><strong>${subjectLabel}</strong></article>
        <article class="account-detail-card"><small>Tests taken</small><strong>0</strong></article>
        <article class="account-detail-card"><small>Average score</small><strong>0%</strong></article>
        <article class="account-detail-card"><small>Overall rank</small><strong>#0</strong></article>
      </div>
      ${activated?'':`<div class="activation-price-card">
        <div><span class="activation-kicker">ACTIVATION</span><h3>Activate your EduSpace account</h3><p>The current activation price is shown below. Your account remains registered while activation is pending.</p></div>
        <div class="activation-price">${esc(activationPriceLabel(settings))}</div>
        <a class="btn gold-action" href="/activation.html">View activation details</a>
      </div>`}
    </section>`;
  }
  async function accountPage(){try{await boot();const [p,subjects,settings]=await Promise.all([ensureProfile(),authFetch('/api/student/subjects'),activationSettings()]);const host=el('accountContent');if(host)host.innerHTML=accountDetailsMarkup(p?.profile||{},subjects||[],settings);el('accountPassword').addEventListener('submit',async e=>{e.preventDefault();const pw=el('accountNewPassword').value;if(pw.length<8){note('Password must be at least 8 characters.','error');return;}try{const {error}=await supa.auth.updateUser({password:pw});if(error)throw error;note('Password updated successfully.','ok');el('accountPassword').reset();}catch(err){note(err.message,'error')}});el('logout').addEventListener('click',signOut);}catch(err){const host=el('accountContent');if(host)host.innerHTML=`<div class="error">${esc(err.message||'Unable to load account details.')}</div>`;else note(err.message,'error');}}
  async function activationPage(){try{await boot();const [p,settings]=await Promise.all([ensureProfile(),activationSettings()]);const profile=p?.profile||{};try{if(profile.full_name)localStorage.setItem('gb_student_name',String(profile.full_name));if(profile.product_key)localStorage.setItem('gb_product_key',String(profile.product_key));}catch{}const activated=Boolean(profile.activated);el('activationContent').innerHTML=`<section class="activation-price-card activation-page-card"><div><span class="activation-kicker">CURRENT ACTIVATION PRICE</span><h2>${activated?'Your account is already activated':'Activate your EduSpace account'}</h2><p>${activated?'Your account currently has activated access.':'Activation is completed by the administrator. Contact the administrator after making the required payment/arrangement so your account can be activated.'}</p></div><div class="activation-price-large">${esc(activationPriceLabel(settings))}</div><div class="activation-status-line"><span class="status-chip ${activated?'active':'pending'}">${activated?'Activated':'Not activated'}</span><a class="btn" href="/account.html">Back to My Account</a></div></section>`;}catch(err){const host=el('activationContent');if(host)host.innerHTML=`<div class="error">${esc(err.message||'Unable to load activation details.')}</div>`;}}
  async function resetPasswordPage(){
    const support=await adminContact();
    const m=el('message');if(m){m.className='info';m.textContent=`Password resets are handled by the administrator. Contact ${support} and answer the verification questions you set when creating your account.`;}
  }
  window.GBPortal={loginPage,callbackPage,registerSubjects,dashboard,subjectPage,resetPasswordPage,accountPage,activationPage,signOut};
})();
