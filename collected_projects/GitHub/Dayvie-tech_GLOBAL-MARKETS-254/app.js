/* Global Marketing Agency frontend. Set the Supabase URL and anon key in config.js. */
(() => {
  const cfg = window.GMA_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  let currentUser = null, profile = null;
  const toast = (msg) => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3500); };
  const safe = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `KSh ${Number(v||0).toLocaleString('en-KE',{maximumFractionDigits:2})}`;
  const status = v => `<span class="status ${safe(String(v||'pending').toLowerCase())}">${safe(v||'pending')}</span>`;
  const msg = (id, text, bad=false) => { const el=$('#'+id); if(el){el.textContent=text;el.style.color=bad?'var(--red)':'var(--gold2)';} };
  const needConfig = () => { if(!client){toast('Backend not configured yet. Follow README.md to connect Supabase.');return false;}return true; };
  const setAuthVisibility = (authenticated) => {
    $('#auth').classList.toggle('hidden', authenticated);
    $('#navLogin').classList.toggle('hidden', authenticated);
    $('#navRegister').classList.toggle('hidden', authenticated);
    $('#heroRegister').classList.toggle('hidden', authenticated);
    $('#footerRegister').classList.toggle('hidden', authenticated);
  };
  const goAuth = (mode='register') => { $('#auth').scrollIntoView({behavior:'smooth'}); if(mode==='login') $('#loginForm input').focus(); else $('#registerForm input').focus(); };
  setAuthVisibility(false);
  $('#navRegister').onclick=()=>goAuth('register'); $('#heroRegister').onclick=()=>goAuth('register'); $('#navLogin').onclick=()=>goAuth('login');

  $('#registerForm').addEventListener('submit', async e => {
    e.preventDefault(); if(!needConfig()) return;
    const f=new FormData(e.currentTarget), full_name=String(f.get('full_name')).trim(), phone=String(f.get('phone')).trim(), email=String(f.get('email')).trim().toLowerCase(), password=String(f.get('password')), referralCode=String(f.get('referral_code')||'').trim();
    msg('registerMsg','Creating your account…');
    try {
      const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name,phone,referral_code:referralCode},emailRedirectTo:'https://dayvie-tech.github.io/GLOBAL-MARKETS-254/'}});
      if(error) throw error;
      if(data.user && data.session){ await ensureProfile(data.user,full_name,phone,referralCode); await refresh(); msg('registerMsg',''); }
      else {
        $('#authHeading').textContent='Check your email';
        $('#authSub').textContent='Your registration request was received. Confirm your email using the link we sent; then return to sign in and open your GMA workspace.';
        $('.auth-grid').classList.add('hidden');
      }
      document.querySelector('#registerForm').reset();
    } catch(err){msg('registerMsg',err.message||'Registration failed.',true);}
  });
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); if(!needConfig()) return;
    const f=new FormData(e.currentTarget); msg('loginMsg','Signing in…');
    try {const {error}=await client.auth.signInWithPassword({email:String(f.get('email')).trim().toLowerCase(),password:String(f.get('password'))});if(error)throw error;await refresh();$('#dashboard').scrollIntoView({behavior:'smooth'});msg('loginMsg','');}
    catch(err){msg('loginMsg',err.message||'Login failed.',true);}
  });
  $('#resetPassword').onclick=async()=>{if(!needConfig())return;const email=$('#loginForm [name=email]').value.trim();if(!email){msg('loginMsg','Enter your email address first.',true);return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});msg('loginMsg',error?error.message:'If that email belongs to an account, a reset link will be sent.');};
  $('#logoutBtn').onclick=async()=>{if(client)await client.auth.signOut();currentUser=null;profile=null;$('#dashboard').classList.add('hidden');setAuthVisibility(false);$('.auth-grid').classList.remove('hidden');$('#authHeading').textContent='Welcome to Global Marketing Agency';$('#authSub').textContent='Create an account or sign in to continue to your workspace.';toast('You have been logged out.');};

  async function ensureProfile(user, fullName, phone, referralCode){
    // The trusted database trigger creates the profile and records valid referral codes.
    // Do not let browser code write privileged profile fields.
    return true;
  }
  async function getProfile(){const {data,error}=await client.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();if(error)throw error;if(!data)throw new Error('Your profile is not ready yet. Confirm your email if required, then sign in again.');return data;}
  async function rows(table, query= q=>q){let q=client.from(table).select('*');q=query(q);const {data,error}=await q;if(error)throw error;return data||[];}
  async function refresh(){if(!client)return;const {data:{user}}=await client.auth.getUser();currentUser=user;setAuthVisibility(Boolean(user));if(!user){profile=null;$('#dashboard').classList.add('hidden');return;}try{profile=await getProfile();$('#dashboard').classList.remove('hidden');$('#welcomeText').textContent=`Signed in as ${profile.full_name} · Account ${profile.status}`;$('#dashTitle').textContent=profile.role==='admin'?'Admin dashboard':'Advertiser dashboard';const isAdmin=profile.role==='admin';$('#workspaceSwitcher').classList.toggle('hidden',!isAdmin);$('#userPanels').classList.toggle('hidden',isAdmin);$('#adminArea').classList.toggle('hidden',!isAdmin);$('#openAdminWorkspace')?.classList.toggle('active',isAdmin);$('#openMemberWorkspace')?.classList.toggle('active',!isAdmin);await renderDashboard();}catch(err){toast(err.message);}}
  function card(title, body){return `<section class="dash-card"><h3>${title}</h3>${body}</section>`;}
  function list(items, render){return items.length?`<div class="data-list">${items.map(render).join('')}</div>`:'<p class="empty">Nothing to show yet.</p>';}
  function item(title, detail, st='', extra=''){return `<div class="data-item"><strong>${safe(title)}</strong><small>${safe(detail||'')}</small>${st?status(st):''}${extra}</div>`;}
  async function renderDashboard(){
    const [payments,campaigns,subs,withdrawals,refs,notifications]=await Promise.all([
      rows('payments',q=>q.eq('user_id',currentUser.id).order('created_at',{ascending:false})),
      rows('campaigns',q=>q.eq('active',true).order('created_at',{ascending:false})),
      rows('submissions',q=>q.eq('user_id',currentUser.id).order('created_at',{ascending:false})),
      rows('withdrawals',q=>q.eq('user_id',currentUser.id).order('created_at',{ascending:false})),
      rows('referrals',q=>q.eq('referrer_id',currentUser.id).order('created_at',{ascending:false})),
      rows('notifications',q=>q.eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(100))
    ]);
    const approvedViews=subs.filter(s=>s.status==='approved').reduce((n,s)=>n+Number(s.approved_views||0),0);
    const submissionEarnings=subs.filter(s=>s.status==='approved').reduce((n,s)=>n+Number(s.approved_views||0)*Number(s.rate_per_view||0),0);
    const eligibleReferralEarnings=refs.filter(r=>r.eligible).reduce((n,r)=>n+Number(r.bonus||0),0);
    const paidReferralBonuses=refs.filter(r=>r.eligible&&r.paid).reduce((n,r)=>n+Number(r.bonus||0),0);
    const totalApprovedEarnings=submissionEarnings+eligibleReferralEarnings;
    const reservedWithdrawals=withdrawals.filter(w=>['pending','approved'].includes(w.status)).reduce((n,w)=>n+Number(w.amount||0),0);
    const paidWithdrawals=withdrawals.filter(w=>w.status==='paid').reduce((n,w)=>n+Number(w.amount||0),0);
    const availableBalance=Math.max(0,submissionEarnings+(eligibleReferralEarnings-paidReferralBonuses)-reservedWithdrawals-paidWithdrawals);
    const pendingSubmissions=subs.filter(s=>s.status==='pending').length;
    const unreadCount=notifications.filter(n=>!n.read_at).length;
    $('#stats').innerHTML=[['Account status',profile.status],['Approved views',approvedViews],['Approved submissions',subs.filter(s=>s.status==='approved').length],['Referral records',refs.length]].map(([a,b])=>`<div class="stat"><span>${safe(a)}</span><strong>${safe(b)}</strong></div>`).join('');
    const notice=$('#pendingNotice');if(profile.status!=='active'){notice.classList.remove('hidden');notice.textContent='Your account is '+profile.status+'. Submit the KSh 200 registration payment reference below. Campaign access is available only after an administrator approves your account and payment.';}else notice.classList.add('hidden');
    const canCampaign=profile.status==='active';
    const paymentForm=`<form id="paymentForm"><p>Pay KSh 200 to KCB Paybill <b>522522</b>, account <b>1343698359</b>. Enter the reference exactly as shown on your confirmation.</p><input name="payment_reference" required maxlength="120" placeholder="Payment transaction/reference"><button class="btn" type="submit">Submit payment for review</button></form>`;
    const campaignBody=canCampaign?list(campaigns,c=>item(c.title,`${c.description||'Campaign'} · ${money(c.rate_per_view)} per approved view · Expires ${c.expires_at?new Date(c.expires_at).toLocaleString():'as stated by admin'}`,c.active?'active':'pending',`<div class="row-actions"><button class="btn small campaignDetails" data-id="${c.id}">View / download</button></div>`)):'<p class="empty">Campaigns unlock after your account is approved.</p>';
    const subForm=canCampaign?`<form id="submissionForm"><label>Campaign<select name="campaign_id" required>${campaigns.map(c=>`<option value="${c.id}">${safe(c.title)}</option>`).join('')}</select></label><label>Screenshot proof<input type="file" name="proof" accept="image/png,image/jpeg,image/webp" required></label><label>Claimed views<input type="number" name="claimed_views" min="0" max="10000000" required value="0"></label><button class="btn" type="submit">Upload proof</button><small>Submit only genuine, readable evidence within the campaign period. All views are subject to manual review.</small></form>`:'<p class="empty">Proof submission is available after account approval.</p>';
    const refCode=profile.referral_code||'being generated';
    const earningsRows=[
      ...subs.filter(x=>x.status==='approved').map(x=>({title:'Approved campaign earnings',amount:Number(x.approved_views||0)*Number(x.rate_per_view||0),detail:x.approved_views+' approved views · '+new Date(x.created_at).toLocaleString(),date:x.created_at})),
      ...refs.filter(x=>x.eligible).map(x=>({title:'Referral bonus',amount:Number(x.bonus||0),detail:x.paid?'Marked as paid':'Eligible referral bonus · '+new Date(x.created_at).toLocaleString(),date:x.created_at,paid:x.paid})),
      ...withdrawals.map(x=>({title:'Withdrawal · '+x.status,amount:-Number(x.amount||0),detail:x.method+' · '+new Date(x.created_at).toLocaleString(),date:x.created_at}))
    ].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const earningsHistory=list(earningsRows,x=>item(x.title,(x.amount>=0?'+':'−')+money(Math.abs(x.amount))+' · '+x.detail,x.paid?'paid':''));
    const notificationList=notifications.length?'<div class="data-list">'+notifications.map(n=>'<div class="data-item '+(n.read_at?'':'notification-unread')+'"><strong>'+safe(n.title)+'</strong><small>'+safe(n.body)+' · '+new Date(n.created_at).toLocaleString()+'</small>'+(n.read_at?'':'<button class="btn small" type="button" data-notification-read="'+n.id+'">Mark as read</button>')+'</div>').join('')+'</div>':'<p class="empty">You have no notifications yet. Important account and campaign updates will appear here.</p>';
    const memberModules=[
      {id:'overview',label:'Overview',icon:'▦',html:card('Your GMA workspace','<p class="body-copy">Welcome to your advertiser workspace. Use the sections on the left to access each part of your account without scrolling through everything at once.</p><div class="member-quick-grid"><div><strong>'+safe(profile.status)+'</strong><span>Account status</span></div><div><strong>'+approvedViews+'</strong><span>Approved views</span></div><div><strong>'+money(availableBalance)+'</strong><span>Available balance</span></div><div><strong>'+unreadCount+'</strong><span>Unread notifications</span></div></div><p class="muted">Only approved work and eligible referral bonuses count toward available funds. Campaign terms and manual review apply.</p>')},
      {id:'earnings',label:'Earnings & Balance',icon:'KSh',html:card('Your earnings at a glance','<div class="member-quick-grid"><div><strong>'+money(availableBalance)+'</strong><span>Available to withdraw</span></div><div><strong>'+money(totalApprovedEarnings)+'</strong><span>Total approved earnings</span></div><div><strong>'+money(reservedWithdrawals)+'</strong><span>Reserved withdrawals</span></div><div><strong>'+money(paidWithdrawals+paidReferralBonuses)+'</strong><span>Already paid</span></div></div><p class="muted">Pending proof reviews: '+pendingSubmissions+' submission(s). These are not included in your earnings or available balance. Minimum withdrawal is KSh 1,000.</p>'+card('Earnings activity',earningsHistory))},
      {id:'campaigns',label:'Campaigns',icon:'◈',html:card('Available campaigns',campaignBody)},
      {id:'proof',label:'Submit Proof',icon:'↑',html:card('Submit campaign proof',subForm)},
      {id:'submissions',label:'My Submissions',icon:'✓',html:card('My submissions',list(subs,x=>item('Claimed '+x.claimed_views+' views · approved '+x.approved_views,'Campaign '+x.campaign_id+' · submitted '+new Date(x.created_at).toLocaleString(),x.status,x.reviewer_note?'<small>Review note: '+safe(x.reviewer_note)+'</small>':'')))},
      {id:'referrals',label:'Referrals',icon:'↗',html:card('Your referral activity','<p>Your referral code: <b>'+safe(refCode)+'</b></p><p>Share your code with people who genuinely want to participate. A KSh 25 referral bonus is considered only when eligibility rules are satisfied and admin approves it.</p>'+list(refs,r=>item('Referral bonus '+money(r.bonus),'Referred user '+r.referred_user_id,r.paid?'paid':r.eligible?'approved':'pending')))},
      {id:'withdrawals',label:'Withdrawals',icon:'⇄',html:card('Withdrawal requests','<p class="muted">Minimum withdrawal: <strong>KSh 1,000</strong>. Requests are checked against your available approved balance.</p><form id="withdrawForm"><label>Amount (KSh)<input type="number" name="amount" min="1000" step="1" max="'+Math.floor(availableBalance)+'" required placeholder="Minimum 1000"></label><label>Payment method<select name="method"><option>M-Pesa</option><option>Bank transfer</option></select></label><label>Destination phone/account<input name="destination" required maxlength="120"></label><button class="btn" type="submit" '+(availableBalance<1000?'disabled':'')+'>Request withdrawal</button></form>'+list(withdrawals,w=>item(money(w.amount),w.method+' · '+w.destination+' · '+new Date(w.created_at).toLocaleString(),w.status)))},
      {id:'notifications',label:'Notifications'+(unreadCount?' ('+unreadCount+')':''),icon:'●',html:card('Your notifications','<div class="row-actions"><button class="btn small" type="button" id="markAllNotifications" '+(unreadCount?'':'disabled')+'>Mark all as read</button></div>'+notificationList)},
      {id:'payment',label:'Registration Payment',icon:'₭',html:card('Registration payment',paymentForm+list(payments,p=>item(money(p.amount)+' · '+p.method,'Reference '+p.payment_reference+' · '+new Date(p.created_at).toLocaleString(),p.status)))},
      {id:'account',label:'My Account',icon:'♙',html:card('Account details','<div class="data-list">'+item(profile.full_name,profile.email,profile.status)+item('Phone number',profile.phone)+item('Referral code',refCode)+'</div><p class="muted">Keep your email and phone details current. Never share your password or verification codes.</p>')},
      {id:'support',label:'Help & Support',icon:'?',html:card('Need help?','<p>For payment, campaign review or withdrawal questions, keep your transaction reference and relevant campaign details ready when contacting the agency through its published support channel.</p><p class="muted">Never send your password, one-time verification code or full payment PIN to anyone claiming to be support.</p>')}
    ];
    $('#userPanels').innerHTML='<div class="member-shell"><nav class="member-nav" aria-label="Member modules">'+memberModules.map((m,i)=>'<button type="button" class="member-nav-item '+(i===0?'active':'')+'" data-member-tab="'+m.id+'"><span>'+m.icon+'</span>'+m.label+'</button>').join('')+'</nav><div class="member-workspace">'+memberModules.map((m,i)=>'<section class="member-module '+(i===0?'':'hidden')+'" data-member-module="'+m.id+'"><div class="member-module-heading"><p class="eyebrow">ADVERTISER WORKSPACE</p><h3>'+m.label+'</h3></div><div class="dashboard-grid">'+m.html+'</div></section>').join('')+'</div></div>';
    $('[data-member-tab]').forEach(button=>button.addEventListener('click',()=>{
      const target=button.dataset.memberTab;
      $('[data-member-tab]').forEach(x=>x.classList.toggle('active',x===button));
      $('[data-member-module]').forEach(section=>section.classList.toggle('hidden',section.dataset.memberModule!==target));
      $('#userPanels').scrollIntoView({behavior:'smooth',block:'start'});
    }));
    $('#paymentForm')?.addEventListener('submit',async e=>{e.preventDefault();const ref=new FormData(e.currentTarget).get('payment_reference').trim();const {error}=await client.from('payments').insert({user_id:currentUser.id,amount:200,method:'KCB Paybill',paybill:'522522',account_number:'1343698359',payment_reference:ref});if(error){toast(error.message);return;}toast('Payment reference submitted for admin review.');await renderDashboard();});
    $('#submissionForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('proof'),campaignId=f.get('campaign_id');if(!file||!file.size){toast('Choose a screenshot first.');return;}if(file.size>5*1024*1024){toast('Screenshot must be 5 MB or smaller.');return;}const ext=file.name.split('.').pop().toLowerCase();if(!['jpg','jpeg','png','webp'].includes(ext)){toast('Use JPG, PNG or WEBP.');return;}const path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;const {error:upErr}=await client.storage.from('proof-screenshots').upload(path,file,{contentType:file.type,upsert:false});if(upErr){toast(upErr.message);return;}const campaign=campaigns.find(c=>c.id===campaignId);const {error}=await client.from('submissions').insert({campaign_id:campaignId,user_id:currentUser.id,screenshot_path:path,claimed_views:Number(f.get('claimed_views')),rate_per_view:campaign?.rate_per_view||0});if(error){toast(error.message);return;}toast('Screenshot submitted for verification.');await renderDashboard();});
    $('#withdrawForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const amount=Number(f.get('amount'));if(!Number.isFinite(amount)||amount<1000){toast('The minimum withdrawal request is KSh 1,000.');return;}if(amount>availableBalance){toast('Your request exceeds your available approved balance of '+money(availableBalance)+'.');return;}const {error}=await client.from('withdrawals').insert({user_id:currentUser.id,amount,method:f.get('method'),destination:String(f.get('destination')).trim()});if(error){toast(error.message);return;}toast('Withdrawal request submitted.');await renderDashboard();});
    $('[data-notification-read]').forEach(btn=>btn.addEventListener('click',async()=>{const {error}=await client.from('notifications').update({read_at:new Date().toISOString()}).eq('id',btn.dataset.notificationRead).eq('user_id',currentUser.id);if(error){toast(error.message);return;}await renderDashboard();}));
    $('#markAllNotifications')?.addEventListener('click',async()=>{const {error}=await client.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',currentUser.id).is('read_at',null);if(error){toast(error.message);return;}toast('All notifications marked as read.');await renderDashboard();});
    $('.campaignDetails').forEach(btn=>btn.addEventListener('click',async()=>{const c=campaigns.find(x=>x.id===btn.dataset.id);if(!c)return;let media='';if(c.media_path){const {data}=await client.storage.from('campaign-media').createSignedUrl(c.media_path,300);media=data?.signedUrl||'';}const {error}=await client.from('campaign_assignments').upsert({campaign_id:c.id,user_id:currentUser.id,downloaded_at:new Date().toISOString()},{onConflict:'campaign_id,user_id'});if(error){toast(error.message);return;}if(media)window.open(media,'_blank','noopener');else toast('Campaign has no download file yet. Contact the administrator.');}));
    if(profile.role==='admin'){await renderAdmin();$('#openAdminWorkspace')?.addEventListener('click',()=>setWorkspace('admin'));$('#openMemberWorkspace')?.addEventListener('click',()=>setWorkspace('member'));}else $('#adminArea').classList.add('hidden');
  }
  function setWorkspace(which){
    const admin=which==='admin';
    $('#adminArea').classList.toggle('hidden',!admin);
    $('#userPanels').classList.toggle('hidden',admin);
    $('#openAdminWorkspace')?.classList.toggle('active',admin);
    $('#openMemberWorkspace')?.classList.toggle('active',!admin);
    $('#dashTitle').textContent=admin?'Admin dashboard':'Member portal';
    const target=admin?$('#adminArea'):$('#userPanels');
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function renderAdmin(){
    $('#adminArea').classList.remove('hidden');
    const [users,payments,campaigns,subs,withdrawals,refs,audit]=await Promise.all([
      rows('profiles',q=>q.order('created_at',{ascending:false})),rows('payments',q=>q.order('created_at',{ascending:false})),rows('campaigns',q=>q.order('created_at',{ascending:false})),rows('submissions',q=>q.order('created_at',{ascending:false})),rows('withdrawals',q=>q.order('created_at',{ascending:false})),rows('referrals',q=>q.order('created_at',{ascending:false})),rows('admin_audit_log',q=>q.order('created_at',{ascending:false}).limit(100))
    ]);
    const userCards=list(users,u=>item(u.full_name,`${u.email} · ${u.phone} · ${new Date(u.created_at).toLocaleDateString()}`,u.status,`<div class="row-actions">${u.role!=='admin'&&u.status!=='active'?`<button class="btn small" data-user-action="active" data-id="${u.id}">Activate</button>`:''}${u.role!=='admin'&&u.status!=='suspended'?`<button class="btn small ghost" data-user-action="suspended" data-id="${u.id}">Suspend</button>`:''}</div>`));
    const paymentCards=list(payments,p=>{const u=users.find(x=>x.id===p.user_id);return item(`${money(p.amount)} · ${u?.full_name||p.user_id}`,`Ref ${p.payment_reference} · ${new Date(p.created_at).toLocaleString()}`,p.status,`<div class="row-actions">${p.status==='pending'?`<button class="btn small" data-payment-action="approved" data-id="${p.id}" data-user="${p.user_id}">Approve payment</button><button class="btn small ghost" data-payment-action="rejected" data-id="${p.id}">Reject</button>`:''}</div>`)});
    const subCards=list(subs,s=>{const u=users.find(x=>x.id===s.user_id);return item(`${u?.full_name||s.user_id} · claimed ${s.claimed_views}`,`Campaign ${s.campaign_id} · ${new Date(s.created_at).toLocaleString()}`,s.status,`<div class="row-actions"><button class="btn small" data-proof="${s.id}" data-path="${safe(s.screenshot_path)}">View proof</button>${s.status==='pending'?`<input class="approved-input" data-approved-for="${s.id}" type="number" min="0" max="10000000" value="${s.claimed_views}" aria-label="Approved views"><button class="btn small" data-sub-action="approved" data-id="${s.id}">Approve views</button><button class="btn small ghost" data-sub-action="rejected" data-id="${s.id}">Reject</button>`:''}</div>`)});
    const campaignCards=list(campaigns,c=>item(c.title,`${money(c.rate_per_view)} per approved view · ${c.expires_at?`expires ${new Date(c.expires_at).toLocaleString()}`:'no expiry set'}`,c.active?'active':'inactive'));
    const withdrawalCards=list(withdrawals,w=>{const u=users.find(x=>x.id===w.user_id);return item(`${money(w.amount)} · ${u?.full_name||w.user_id}`,`${w.method} · ${w.destination}`,w.status,`<div class="row-actions">${w.status==='pending'?`<button class="btn small" data-withdraw-action="approved" data-id="${w.id}">Approve</button><button class="btn small ghost" data-withdraw-action="rejected" data-id="${w.id}">Reject</button>`:w.status==='approved'?`<button class="btn small" data-withdraw-action="paid" data-id="${w.id}">Mark paid</button>`:''}</div>`)});
    const referralCards=list(refs,r=>item(`Bonus ${money(r.bonus)}`,`Referrer ${r.referrer_id} · referred ${r.referred_user_id}`,r.eligible?'approved':'pending',`<div class="row-actions">${!r.eligible?`<button class="btn small" data-ref-action="approve" data-id="${r.id}">Approve referral</button>`:''}</div>`));
    const campaignForm=`<form id="campaignForm"><label>Campaign title<input name="title" required maxlength="140"></label><label>Description<textarea name="description" rows="3"></textarea></label><label>Rate per approved view (KSh)<input name="rate_per_view" type="number" min="0" step="0.01" value="50" required></label><label>Campaign duration: starts now and expires in 20 hours<input name="media" type="file" accept="image/png,image/jpeg,image/webp,video/mp4" required></label><button class="btn" type="submit">Create 20-hour campaign</button></form>`;

    const adminStats='<div class="admin-overview-grid">'+[
      ['Total members',users.length],
      ['Pending payments',payments.filter(x=>x.status==='pending').length],
      ['Active campaigns',campaigns.filter(x=>x.active).length],
      ['Pending proofs',subs.filter(x=>x.status==='pending').length],
      ['Pending withdrawals',withdrawals.filter(x=>x.status==='pending').length],
      ['Referral reviews',refs.filter(x=>!x.eligible).length]
    ].map(x=>'<div class="admin-metric"><span>'+safe(x[0])+'</span><strong>'+safe(x[1])+'</strong></div>').join('')+'</div>';
    const adminModules=[
      {id:'overview',label:'Overview',icon:'▦',html:card('Operations snapshot',adminStats+'<p class="muted">Use the sections on the left to manage the GMA platform. All approvals and account changes remain subject to database permissions.</p>')},
      {id:'members',label:'Member Management',icon:'♙',html:card('Advertisers ('+users.length+')',userCards)},
      {id:'payments',label:'Payment Verification',icon:'₭',html:card('Payment verification ('+payments.length+')',paymentCards)},
      {id:'campaigns',label:'Campaign Manager',icon:'◈',html:card('Create and manage campaigns',campaignForm+campaignCards)},
      {id:'proofs',label:'Submission & Proof Review',icon:'✓',html:card('Proof review ('+subs.length+')',subCards)},
      {id:'referrals',label:'Referral Management',icon:'↗',html:card('Referral reviews ('+refs.length+')',referralCards)},
      {id:'payouts',label:'Withdrawals & Payouts',icon:'₦',html:card('Withdrawal requests ('+withdrawals.length+')',withdrawalCards)},
      {id:'activity',label:'Activity & Audit History',icon:'◷',html:card('Latest administrative and platform events',list(audit,a=>item(a.action+' · '+a.entity_table,'Record '+(a.entity_id||'—')+' · '+(a.changed_fields||[]).join(', ')+' · '+new Date(a.created_at).toLocaleString(),a.action.toLowerCase()))+'<p class="muted">Showing the latest 100 recorded changes. Sensitive row contents are not stored in this audit view.</p>')},
      {id:'settings',label:'Admin Settings',icon:'⚙',html:card('Administrator account','<div class="data-list">'+item(profile.full_name,profile.email,'admin')+item('Access level','Authorised GMA administrator')+item('Security','Administrative actions are restricted by Supabase row-level security')+'</div><p class="muted">Role changes and security-sensitive settings are not editable from this public browser interface.</p>')}
    ];
    $('#adminPanels').innerHTML='<div class="admin-shell"><nav class="admin-nav" aria-label="Admin modules">'+adminModules.map((m,i)=>'<button type="button" class="admin-nav-item '+(i===0?'active':'')+'" data-admin-tab="'+m.id+'"><span>'+m.icon+'</span>'+m.label+'</button>').join('')+'</nav><div class="admin-workspace">'+adminModules.map((m,i)=>'<section class="admin-module '+(i===0?'':'hidden')+'" data-admin-module="'+m.id+'"><div class="admin-module-heading"><p class="eyebrow">GMA ADMINISTRATION</p><h3>'+m.label+'</h3></div><div class="dashboard-grid">'+m.html+'</div></section>').join('')+'</div></div>';
    $('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>{
      const target=button.dataset.adminTab;
      $('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===button));
      $('[data-admin-module]').forEach(section=>section.classList.toggle('hidden',section.dataset.adminModule!==target));
      $('#adminArea').scrollIntoView({behavior:'smooth',block:'start'});
    }));
    $$('[data-user-action]').forEach(b=>b.onclick=async()=>{const {error}=await client.from('profiles').update({status:b.dataset.userAction}).eq('id',b.dataset.id);if(error)toast(error.message);else{toast('Account status updated.');await renderDashboard();}});
    $$('[data-payment-action]').forEach(b=>b.onclick=async()=>{const {error}=await client.from('payments').update({status:b.dataset.paymentAction,verified_by:currentUser.id,verified_at:new Date().toISOString()}).eq('id',b.dataset.id);if(error){toast(error.message);return;}if(b.dataset.paymentAction==='approved'){const {error:e2}=await client.from('profiles').update({status:'active'}).eq('id',b.dataset.user);if(e2)toast('Payment approved but account status update failed: '+e2.message);}toast('Payment review saved.');await renderDashboard();});
    $$('[data-sub-action]').forEach(b=>b.onclick=async()=>{const id=b.dataset.id;const approved=Number($(`[data-approved-for="${id}"]`)?.value||0);const {error}=await client.from('submissions').update({status:b.dataset.subAction,approved_views:b.dataset.subAction==='approved'?approved:0,reviewed_by:currentUser.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(error)toast(error.message);else{toast('Submission review saved.');await renderDashboard();}});
    $$('[data-withdraw-action]').forEach(b=>b.onclick=async()=>{const {error}=await client.from('withdrawals').update({status:b.dataset.withdrawAction,processed_by:currentUser.id,processed_at:new Date().toISOString()}).eq('id',b.dataset.id);if(error)toast(error.message);else{toast('Withdrawal status updated.');await renderDashboard();}});
    $$('[data-ref-action]').forEach(b=>b.onclick=async()=>{const {error}=await client.from('referrals').update({eligible:true}).eq('id',b.dataset.id);if(error)toast(error.message);else{toast('Referral marked eligible.');await renderDashboard();}});
    $$('[data-proof]').forEach(b=>b.onclick=async()=>{const {data,error}=await client.storage.from('proof-screenshots').createSignedUrl(b.dataset.path,300);if(error)toast(error.message);else window.open(data.signedUrl,'_blank','noopener');});
    $('#campaignForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('media');if(!file||!file.size)return;const ext=file.name.split('.').pop().toLowerCase(),path=`${currentUser.id}/${crypto.randomUUID()}.${ext}`;const {error:up}=await client.storage.from('campaign-media').upload(path,file,{contentType:file.type,upsert:false});if(up){toast(up.message);return;}const starts=new Date(),expires=new Date(starts.getTime()+20*60*60*1000);const {error}=await client.from('campaigns').insert({title:String(f.get('title')).trim(),description:String(f.get('description')||''),rate_per_view:Number(f.get('rate_per_view')),starts_at:starts.toISOString(),expires_at:expires.toISOString(),media_path:path,active:true,created_by:currentUser.id});if(error){toast(error.message);return;}toast('Campaign created with a 20-hour window.');await renderDashboard();});
  }
  if(client){client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh().catch(console.error);} else {console.info('Supabase is not configured. Add config.js to enable authentication and dashboards.');}
})();
