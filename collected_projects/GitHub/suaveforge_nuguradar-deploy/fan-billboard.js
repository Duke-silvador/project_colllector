(()=>{
  const root=document.getElementById('fanBillboard');
  const detail=document.getElementById('fanBoardHub');
  if(!root&&!detail)return;
  const api=String((window.NUGU_CONFIG||{}).apiBase||'').replace(/\/$/,'');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const slides=[
    {kind:'fan',key:'overall',title:'두루두루 신나게',sub:'여기저기 마음 가는 대로 놀고 있는 팬들'},
    {kind:'fan',key:'topkku',title:'꾸미기에 푹',sub:'탑꾸 서랍을 자주 열고 있는 팬들'},
    {kind:'fan',key:'hideout',title:'아지트에서 수다 중',sub:'말하고 기록하며 오래 머무는 팬들'},
    {kind:'fan',key:'watch',title:'같이 오래 보는 중',sub:'영상과 장면을 함께 오래 보고 있는 팬들'},
    {kind:'maker',key:'current',title:'지금 눈에 띄는 탑꾸러',sub:'최근 24시간, 취향이 모이고 있는 곳'},
    {kind:'maker',key:'weekly',title:'이번 주 자꾸 눈이 간 탑꾸러',sub:'이번 주 팬들의 마음이 자주 머문 곳'},
    {kind:'maker',key:'monthly',title:'이번 달 많이 사랑받은 탑꾸러',sub:'이번 달 오래 기억에 남은 탑꾸러들'}
  ];
  const cache=new Map();
  let active=Math.max(0,slides.findIndex(x=>x.key===new URLSearchParams(location.search).get('view')));
  let timer=null,startX=null;

  const initials=name=>String(name||'팬').trim().slice(0,2);
  const stat=(item,slide)=>{
    if(slide.kind==='maker')return `함께 취향 남긴 팬 ${Number(item.uniqueFans||0)}명`;
    if(slide.key==='topkku')return `탑꾸 ${Number(item.topkkuCount||0)} · 반응 ${Number(item.topkkuReactions||0)}`;
    if(slide.key==='hideout')return `이야기·기록 ${Number(item.hideoutActions||0)}개`;
    if(slide.key==='watch')return `함께 본 흔적 ${Number(item.watchActions||0)} · ${Number(item.activeMinutes||0)}분`;
    return `활동 ${Number(item.totalActions||0)} · 함께한 시간 ${Number(item.activeMinutes||0)}분`;
  };
  async function load(slide){
    const id=slide.kind+':'+slide.key;if(cache.has(id))return cache.get(id);
    const url=slide.kind==='maker'
      ?`${api}/api/v1/community/maker-ranking?window=${slide.key}&limit=30`
      :`${api}/api/v1/community/fan-board?mode=${slide.key}&limit=30`;
    const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('feed_failed');
    const data=await r.json();cache.set(id,data);return data;
  }
  function cards(items,slide,full=false){
    if(!items?.length)return '<div class="fan-board-empty">아직 여기 소개할 기록이 쌓이는 중이에요. 마음껏 놀다 가요 ♡</div>';
    const shown=items.slice(0,full?30:5);
    return shown.map((x,i)=>`<article class="fan-board-person ${i<3?'spotlight':''}">
      <div class="fan-board-avatar" aria-hidden="true"><span>${esc(initials(x.displayName))}</span><i>${i===0?'✦':i===1?'♡':i===2?'❧':'·'}</i></div>
      <div class="fan-board-person-copy"><b>${esc(x.displayName||'팬')}</b><span>${esc(stat(x,slide))}</span></div>
      ${i<3?'<em>오늘 여기 보여요</em>':''}
    </article>`).join('');
  }
  function dots(){
    return slides.map((s,i)=>`<button type="button" class="${i===active?'active':''}" data-fan-dot="${i}" aria-label="${esc(s.title)}"></button>`).join('');
  }
  async function renderMain(){
    if(!root)return;const slide=slides[active];
    root.innerHTML=`<div class="fan-billboard-shell">
      <div class="fan-billboard-head"><div><span class="kicker">FAN BILLBOARD</span><h2>지금 반짝이는 팬들 ✦</h2><p>좋아하는 만큼 마음껏 놀다 보면, 어느 날 여기서 만나게 될지도 몰라요.</p></div><a href="fan-board.html?view=${slide.key}">전광판 보러가기 →</a></div>
      <div class="fan-billboard-stage"><button class="fan-billboard-arrow prev" type="button" aria-label="이전">‹</button><div class="fan-billboard-content"><small>${esc(slide.sub)}</small><h3>${esc(slide.title)}</h3><div class="fan-billboard-people"><div class="fan-board-empty">불러오는 중…</div></div></div><button class="fan-billboard-arrow next" type="button" aria-label="다음">›</button></div>
      <div class="fan-billboard-dots">${dots()}</div>
    </div>`;
    bindMain();
    try{const data=await load(slide);const people=root.querySelector('.fan-billboard-people');if(people)people.innerHTML=cards(data.items||[],slide,false)}catch{const people=root.querySelector('.fan-billboard-people');if(people)people.innerHTML='<div class="fan-board-empty">전광판을 잠시 불러오지 못했어요.</div>'}
  }
  function go(n){active=(n+slides.length)%slides.length;renderMain();renderDetail();restart()}
  function bindMain(){
    root?.querySelector('.prev')?.addEventListener('click',()=>go(active-1));
    root?.querySelector('.next')?.addEventListener('click',()=>go(active+1));
    root?.querySelectorAll('[data-fan-dot]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.fanDot))));
    const stage=root?.querySelector('.fan-billboard-stage');
    stage?.addEventListener('pointerdown',e=>startX=e.clientX);
    stage?.addEventListener('pointerup',e=>{if(startX==null)return;const d=e.clientX-startX;startX=null;if(Math.abs(d)>55)go(active+(d<0?1:-1))});
    root?.addEventListener('mouseenter',stop);root?.addEventListener('mouseleave',restart);
    root?.addEventListener('focusin',stop);root?.addEventListener('focusout',restart);
  }
  function stop(){if(timer)clearInterval(timer);timer=null}
  function restart(){stop();if(root&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>go(active+1),6000)}
  async function renderDetail(){
    if(!detail)return;const slide=slides[active];
    detail.innerHTML=`<section class="fan-board-hero"><span class="kicker">FAN BILLBOARD</span><h1>팬 전광판 ♡</h1><p>같이 보고, 꾸미고, 떠들고, 좋아한 흔적들이 여기서 반짝여요.</p></section>
      <nav class="fan-board-tabs">${slides.map((s,i)=>`<button type="button" class="${i===active?'active':''}" data-board-tab="${i}">${esc(s.title)}</button>`).join('')}</nav>
      <section class="fan-board-panel"><div class="fan-board-panel-head"><div><small>${esc(slide.sub)}</small><h2>${esc(slide.title)}</h2></div><p>숫자보다 지금의 분위기를 가볍게 구경해요.</p></div><div class="fan-board-full-grid"><div class="fan-board-empty">불러오는 중…</div></div></section>
      <section class="fan-board-footcards"><article><b>이번에 여기 소개됐어요 ✦</b><p>주간·월간 탑꾸러 전광판에는 작은 활동포인트 선물도 따라와요.</p></article><article><b>어떻게 소개되나요?</b><p>같은 행동을 반복하는 것보다 여러 팬이 자연스럽게 남긴 취향과 활동 흔적을 소중하게 담아요.</p></article><article><b>지금, 당신도</b><p>좋아하는 만큼 마음껏 보고 꾸미고 떠들다 가요. ♡</p></article></section>`;
    detail.querySelectorAll('[data-board-tab]').forEach(b=>b.onclick=()=>{active=Number(b.dataset.boardTab);history.replaceState(null,'',`?view=${slides[active].key}`);renderDetail()});
    try{const data=await load(slide);detail.querySelector('.fan-board-full-grid').innerHTML=cards(data.items||[],slide,true)}catch{detail.querySelector('.fan-board-full-grid').innerHTML='<div class="fan-board-empty">전광판을 잠시 불러오지 못했어요.</div>'}
  }
  renderMain();renderDetail();restart();
})();