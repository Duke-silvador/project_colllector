(()=>{
  const $=s=>document.querySelector(s),$$=(s,root=document)=>[...root.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const apiBase=()=>String((window.NUGU_CONFIG||{}).apiBase||'').replace(/\/$/,'');
  const state={gallerySort:'saved',gallery:[],savedIds:new Set(),compare:[],vaultScope:'mine',vaultView:'fan',vaultGroup:'all',savedVault:[],balance:null,makerWindow:'current',makerRanking:null};

  const bucketLabels={
    mine:{north:'완성',east:'자랑할 것',south:'다시 손볼 것',west:'보관',inbox:'미분류'},
    saved:{north:'최애',east:'참고할 것',south:'나중에',west:'보관',inbox:'미분류'}
  };
  const bucketArrows={north:'↑',east:'→',south:'↓',west:'←'};

  async function identity(required=false,message='로그인하면 사용할 수 있어요.'){
    let id=null;try{id=await window.NUGU_AUTH?.getIdentity?.()}catch{}
    if(id?.authenticated&&id.accessToken)return id;
    if(required)window.NUGU_AUTH_UI?.signIn?.(location.href);
    return null;
  }
  const authHeaders=id=>id?{...(window.NUGU_AUTH?.authHeaders?.(id)||{})}:{};

  function socialCard(item){
    const saved=state.savedIds.has(Number(item.id)),stats=item.stats||{};
    return `<article class="social-topkku-card" data-social-id="${Number(item.id)}">
      <button class="social-topkku-image" type="button" data-compare-add="${Number(item.id)}"><img src="${esc(item.display_url||item.secure_url)}" alt="${esc(item.artist_name||'탑꾸')}"></button>
      <div class="social-topkku-meta"><b>${esc(item.artist_name||'탑꾸')}</b><span>${esc(item.maker_name||'팬')} · 담김 ${Number(stats.saved||0)} · 댓글 ${Number(stats.comments||0)} · 참고완성 ${Number(stats.referenced||0)}</span></div>
      <div class="social-topkku-actions">
        <button type="button" class="${saved?'active':''}" data-taste="${Number(item.id)}">${saved?'♥ 취향함':'♡ 취향함'}</button>
        <button type="button" data-comments="${Number(item.id)}">댓글 ${Number(stats.comments||0)}</button>
        <button type="button" data-compare-add="${Number(item.id)}">비교 +</button>
        <button type="button" data-reference="${Number(item.id)}">참고해서 꾸미기</button>
      </div>
    </article>`;
  }

  async function loadSavedIds(){
    const id=await identity(false);if(!id)return;
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/saved?visitorId=${encodeURIComponent(id.visitorId)}&limit=60`,{headers:{Accept:'application/json',...authHeaders(id)},cache:'no-store'});
      if(!r.ok)return;const data=await r.json();state.savedVault=data.items||[];state.savedIds=new Set(state.savedVault.map(x=>Number(x.id)));
    }catch{}
  }

  async function loadGallery(sort=state.gallerySort){
    state.gallerySort=sort;const root=$('#topkkuGalleryGrid');if(!root)return;
    root.innerHTML='<div class="topkku-loading">탑꾸 구경 불러오는 중…</div>';
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku-gallery?sort=${encodeURIComponent(sort)}&limit=30`,{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'gallery_failed');
      state.gallery=data.items||[];renderGallery();
    }catch{root.innerHTML='<div class="topkku-loading">탑꾸 구경을 잠시 불러오지 못했어요.</div>'}
  }

  function renderGallery(){
    const root=$('#topkkuGalleryGrid');if(!root)return;
    root.innerHTML=state.gallery.length?state.gallery.map(socialCard).join(''):'<div class="topkku-loading">아직 공개된 탑꾸가 없어요.</div>';
    root.querySelectorAll('[data-taste]').forEach(b=>b.onclick=()=>toggleTaste(Number(b.dataset.taste)));
    root.querySelectorAll('[data-compare-add]').forEach(b=>b.onclick=()=>toggleCompare(Number(b.dataset.compareAdd)));
    root.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>startReference(Number(b.dataset.reference)));
    root.querySelectorAll('[data-comments]').forEach(b=>b.onclick=()=>openComments(Number(b.dataset.comments)));
  }

  function fanModal(html){
    const root=$('#topkkuFanModal');if(!root)return null;
    root.hidden=false;root.innerHTML='<div class="fan-modal-backdrop"><section class="fan-modal-sheet">'+html+'</section></div>';
    root.querySelectorAll('[data-fan-modal-close]').forEach(b=>b.onclick=()=>{root.hidden=true;root.innerHTML=''});
    return root;
  }
  function stickerGiftVisual(item){
    if(item?.asset)return '<img src="'+esc(item.asset)+'" alt="">';
    return '<span>'+esc(item?.value||'✦')+'</span>';
  }
  async function openComments(id){
    const item=state.gallery.find(x=>Number(x.id)===Number(id));
    const root=fanModal('<button class="fan-modal-x" type="button" data-fan-modal-close>×</button><span class="fan-modal-kicker">TOPKKU NOTE</span><h3>이 탑꾸에 남긴 말들</h3><div class="fan-modal-loading">댓글 불러오는 중…</div>');
    if(!root)return;
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/comments?limit=60`,{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'comments_failed');
      const user=await identity(false);
      const sheet=root.querySelector('.fan-modal-sheet');
      sheet.innerHTML=`<button class="fan-modal-x" type="button" data-fan-modal-close>×</button>
        <div class="fan-modal-topkku">${item?'<img src="'+esc(item.display_url||item.secure_url)+'" alt="">':''}<div><span class="fan-modal-kicker">TOPKKU NOTE</span><h3>예쁘다고 말해주고 가요 ♡</h3><small>좋아하는 마음만 남기고, 비교하거나 깎아내리는 말은 두고 가지 않아요.</small></div></div>
        <div class="topkku-comment-list">${data.items?.length?data.items.map(x=>`<article><b>${esc(x.displayName||'팬')}</b><p>${esc(x.body)}</p></article>`).join(''):'<p class="fan-modal-empty">아직 첫 댓글을 기다리고 있어요.</p>'}</div>
        <div class="topkku-comment-compose"><textarea id="topkkuCommentBody" maxlength="240" placeholder="예쁜 탑꾸에 한마디 남겨주세요"></textarea><button id="sendTopkkuComment" type="button">${user?'남기기':'로그인하고 남기기'}</button></div>`;
      sheet.querySelectorAll('[data-fan-modal-close]').forEach(b=>b.onclick=()=>{root.hidden=true;root.innerHTML=''});
      $('#sendTopkkuComment')?.addEventListener('click',async()=>{
        const me=await identity(true);if(!me)return;
        const body=$('#topkkuCommentBody')?.value?.trim();if(!body)return;
        const rr=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/comments`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(me)},body:JSON.stringify({visitorId:me.visitorId,body})});
        const out=await rr.json();if(!rr.ok){$('#topkkuCommentBody').placeholder=out.error==='comment_rate_limit'?'조금만 천천히 남겨주세요.':'지금은 댓글을 남기지 못했어요.';return}
        const list=sheet.querySelector('.topkku-comment-list');list.querySelector('.fan-modal-empty')?.remove();list.insertAdjacentHTML('beforeend',`<article><b>${esc(out.item.displayName||'팬')}</b><p>${esc(out.item.body)}</p></article>`);$('#topkkuCommentBody').value='';loadMakerTrend('current');
      });
    }catch{const box=root.querySelector('.fan-modal-loading');if(box)box.textContent='댓글을 잠시 불러오지 못했어요.'}
  }

  async function openReactions(id){
    const user=await identity(true);if(!user)return;
    const root=fanModal('<button class="fan-modal-x" type="button" data-fan-modal-close>×</button><span class="fan-modal-kicker">PEOPLE WHO LIKED YOUR TOPKKU</span><h3>내 탑꾸를 좋아해준 팬들</h3><div class="fan-modal-loading">반응을 모아보는 중…</div>');
    if(!root)return;
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/reactions?visitorId=${encodeURIComponent(user.visitorId)}`,{headers:{Accept:'application/json',...authHeaders(user)},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'reactions_failed');
      const sheet=root.querySelector('.fan-modal-sheet');
      sheet.innerHTML=`<button class="fan-modal-x" type="button" data-fan-modal-close>×</button><span class="fan-modal-kicker">THANK YOU LIST</span><h3>내 탑꾸를 좋아해준 팬들 ♡</h3><p class="fan-modal-sub">취향함에 담아주거나 댓글을 남겨준 팬에게 작은 꾸미기를 건넬 수 있어요. 오늘 선물 ${Number(data.giftUsage?.sentToday||0)}/${Number(data.giftUsage?.limit||3)}</p>
        <div class="reaction-fan-list">${data.items?.length?data.items.map(x=>`<article><div><b>${esc(x.displayName)}</b><span>${x.tasted?'♡ 취향함 ':''}${x.commented?'✎ 댓글':''}</span></div><button type="button" data-gift-fan="${esc(x.fanKey)}">🎁 선물하기</button></article>`).join(''):'<p class="fan-modal-empty">아직 반응한 팬이 없어요.</p>'}</div>`;
      sheet.querySelectorAll('[data-fan-modal-close]').forEach(b=>b.onclick=()=>{root.hidden=true;root.innerHTML=''});
      sheet.querySelectorAll('[data-gift-fan]').forEach(b=>b.onclick=()=>openGift(id,b.dataset.giftFan));
    }catch{const box=root.querySelector('.fan-modal-loading');if(box)box.textContent='반응 목록을 잠시 불러오지 못했어요.'}
  }

  async function openGift(id,fanKey){
    const user=await identity(true);if(!user)return;
    const root=fanModal('<button class="fan-modal-x" type="button" data-fan-modal-close>×</button><span class="fan-modal-kicker">A SMALL GIFT</span><h3>작은 선물 고르는 중…</h3><div class="fan-modal-loading">보낼 수 있는 꾸미기를 찾고 있어요.</div>');
    if(!root)return;
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/gift-options?visitorId=${encodeURIComponent(user.visitorId)}&fanKey=${encodeURIComponent(fanKey)}`,{headers:{Accept:'application/json',...authHeaders(user)},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'gift_options_failed');
      const sheet=root.querySelector('.fan-modal-sheet');
      sheet.innerHTML=`<button class="fan-modal-x" type="button" data-fan-modal-close>×</button><span class="fan-modal-kicker">A SMALL GIFT</span><h3>${esc(data.fan?.displayName||'팬')}님에게 마음 보내기</h3><p class="fan-modal-sub">내가 지금 피운 잎보다 아래에서 열리는 꾸미기만 건넬 수 있어요. 희귀 포인트 아이템은 선물 대상이 아니에요. · 오늘 ${Number(data.usage?.sentToday||0)}/${Number(data.usage?.limit||3)}</p>
        <div class="gift-item-picker">${data.items?.length?data.items.map(x=>`<button type="button" data-gift-item="${esc(x.id)}"><i>${stickerGiftVisual(x)}</i><b>${esc(x.label)}</b></button>`).join(''):'<p class="fan-modal-empty">지금 이 팬에게 건넬 수 있는 새 꾸미기가 없어요.</p>'}</div>
        <textarea class="gift-note" id="giftNote" maxlength="120" placeholder="고마운 마음을 짧게 적어도 좋아요 ♡"></textarea>
        <button class="gift-send-main" id="sendGiftNow" type="button" disabled>선물 보내기</button>`;
      sheet.querySelectorAll('[data-fan-modal-close]').forEach(b=>b.onclick=()=>{root.hidden=true;root.innerHTML=''});
      let selected='';
      sheet.querySelectorAll('[data-gift-item]').forEach(b=>b.onclick=()=>{selected=b.dataset.giftItem;sheet.querySelectorAll('[data-gift-item]').forEach(x=>x.classList.toggle('selected',x===b));$('#sendGiftNow').disabled=false});
      $('#sendGiftNow')?.addEventListener('click',async()=>{
        if(!selected)return;const send=$('#sendGiftNow');send.disabled=true;send.textContent='포장하는 중…';
        const rr=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/gift`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(user)},body:JSON.stringify({visitorId:user.visitorId,fanKey,itemId:selected,message:$('#giftNote')?.value||''})});
        const out=await rr.json();if(!rr.ok){send.disabled=false;send.textContent=out.error==='daily_gift_limit'?'오늘 선물은 다 건넸어요':'이 선물은 지금 보낼 수 없어요';return}
        sheet.innerHTML=`<div class="gift-sent-celebration"><span>🎁</span><h3>잘 포장해서 보냈어요.</h3><p>${esc(out.gift.receiverName)}님 서랍에 <b>${esc(out.gift.label)}</b>이 진짜 선물처럼 남아요.</p><button type="button" data-fan-modal-close>다른 탑꾸 보러가기</button></div>`;
        sheet.querySelector('[data-fan-modal-close]').onclick=()=>{root.hidden=true;root.innerHTML=''};window.NUGU_TOPKKU_LOAD_STYLE?.();
      });
    }catch{const box=root.querySelector('.fan-modal-loading');if(box)box.textContent='선물 서랍을 잠시 열지 못했어요.'}
  }

  async function toggleTaste(id){
    const user=await identity(true);if(!user)return;
    const saved=!state.savedIds.has(id);
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/taste`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(user)},body:JSON.stringify({visitorId:user.visitorId,saved})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'taste_failed');
      if(saved)state.savedIds.add(id);else state.savedIds.delete(id);
      await loadSavedIds();renderGallery();if(state.vaultScope==='saved')renderSavedVault();loadMakerTrend('current');
    }catch{}
  }

  function toggleCompare(id){
    if(state.compare.includes(id))state.compare=state.compare.filter(x=>x!==id);
    else{if(state.compare.length>=2)state.compare.shift();state.compare.push(id)}
    renderCompareTray();
  }
  function renderCompareTray(){
    const tray=$('#topkkuCompareTray');if(!tray)return;
    if(!state.compare.length){tray.hidden=true;tray.innerHTML='';return}
    const items=state.compare.map(id=>state.gallery.find(x=>Number(x.id)===id)).filter(Boolean);
    tray.hidden=false;tray.innerHTML=`<b>비교함 ${items.length}/2</b><div>${items.map(x=>`<img src="${esc(x.display_url||x.secure_url)}" alt="">`).join('')}</div><button type="button" id="openTopkkuCompare" ${items.length===2?'':'disabled'}>2장 나란히 보기</button><button type="button" id="clearTopkkuCompare">비우기</button>`;
    $('#openTopkkuCompare')?.addEventListener('click',()=>openCompare(items));
    $('#clearTopkkuCompare')?.addEventListener('click',()=>{state.compare=[];renderCompareTray()});
  }
  function openCompare(items){
    if(items.length!==2)return;const modal=$('#topkkuCompareModal');if(!modal)return;
    modal.hidden=false;modal.innerHTML=`<div class="compare-sheet"><button class="compare-close" id="closeTopkkuCompare" type="button">닫기 ×</button><div class="compare-pair">${items.map(x=>`<figure><img src="${esc(x.display_url||x.secure_url)}" alt=""><figcaption>${esc(x.artist_name||'탑꾸')} · ${esc(x.maker_name||'팬')}</figcaption></figure>`).join('')}</div></div>`;
    $('#closeTopkkuCompare').onclick=()=>{modal.hidden=true;modal.innerHTML=''};
  }

  async function startReference(id){
    const user=await identity(true);if(!user)return;
    const eventKey=`topkku_ref_${Date.now()}_${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`.replace(/[^A-Za-z0-9:_-]/g,'').slice(0,120);
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/reference`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(user)},body:JSON.stringify({visitorId:user.visitorId,eventKey})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'reference_failed');
      try{sessionStorage.setItem('nuguTopkkuReference',JSON.stringify({...data.item,eventKey:data.eventKey}))}catch{}
      location.href=`topkku.html${data.item?.artist_slug?`?artist=${encodeURIComponent(data.item.artist_slug)}`:''}`;
    }catch{}
  }

  function makerRewardCopy(windowType){
    if(windowType==='weekly')return '이번 주가 끝나면 1위 +3P · 2~3위 +2P · 4~10위 +1P';
    if(windowType==='monthly')return '이번 달이 끝나면 1위 +8P · 2~3위 +6P · 4~10위 +4P · 11~20위 +2P';
    return '지금 순위는 보상 없이 흐름만 보여줘요.';
  }
  function renderMakerTrend(){
    const root=$('#makerTrendGrid'),note=$('#makerTrendReward');if(!root||!note)return;
    const data=state.makerRanking;note.textContent=makerRewardCopy(state.makerWindow);
    if(!data?.items?.length){root.innerHTML='<div class="topkku-loading">아직 취향이 모이는 중이에요. 마음껏 꾸미고 놀아주세요 ♡</div>';return}
    root.innerHTML=data.items.map(x=>`<article class="maker-trend-card ${Number(x.rank)<=3?'top-maker':''}">
      <span class="maker-trend-place">${Number(x.rank)}</span>
      <div class="maker-trend-copy"><b>${esc(x.displayName||'팬')}</b><strong>함께 취향 남긴 팬 ${Number(x.uniqueFans||0)}명</strong><small>취향함 ${Number(x.tasteFans||0)} · 댓글 ${Number(x.commentFans||0)} · 참고완성 ${Number(x.referenceFans||0)} · 취향선택 ${Number(x.battleFans||0)}</small></div>
      ${Number(x.rewardPoints||0)>0?`<em>+${Number(x.rewardPoints)}P</em>`:''}
    </article>`).join('');
  }
  async function loadMakerTrend(windowType=state.makerWindow){
    state.makerWindow=windowType;const root=$('#makerTrendGrid');if(!root)return;
    root.innerHTML='<div class="topkku-loading">요즘 취향이 모이는 곳을 불러오는 중…</div>';
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/maker-ranking?window=${encodeURIComponent(windowType)}&limit=30`,{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'maker_ranking_failed');
      state.makerRanking=data;renderMakerTrend();
    }catch{root.innerHTML='<div class="topkku-loading">요즘 취향 흐름을 잠시 불러오지 못했어요.</div>'}
  }

  function balanceSide(item,matchNo,side,myWinner){
    const chosen=Number(myWinner)===Number(item.id);
    return `<button type="button" class="balance-side ${chosen?'chosen':''}" data-balance-vote="${Number(item.id)}" data-match-no="${Number(matchNo)}" ${myWinner?'disabled':''}>
      <img src="${esc(item.display_url||item.secure_url)}" alt="">
      <span><b>${esc(item.artist_name||'탑꾸')}</b><small>${esc(item.maker_name||'팬')}${chosen?' · 내 선택':''}</small></span>
    </button>`;
  }
  function renderBalance(){
    const root=$('#topkkuBalanceGrid'),rank=$('#topkkuBalanceRanking');if(!root||!rank)return;
    const game=state.balance;
    if(!game?.matchups?.length){root.innerHTML='<div class="topkku-loading">이번 주 대결을 만들 만큼 탑꾸가 아직 모이지 않았어요.</div>';rank.innerHTML='';return}
    root.innerHTML=game.matchups.map(m=>`<article class="balance-match">${balanceSide(m.left,m.matchNo,'left',m.myWinner)}<span class="balance-vs">VS</span>${balanceSide(m.right,m.matchNo,'right',m.myWinner)}${m.myWinner?`<p>${Number(m.left.stats.balanceWins||0)} : ${Number(m.right.stats.balanceWins||0)}표</p>`:''}</article>`).join('');
    root.querySelectorAll('[data-balance-vote]').forEach(b=>b.onclick=()=>voteBalance(Number(b.dataset.matchNo),Number(b.dataset.balanceVote)));
    rank.innerHTML='<b>이번 주 취향대결 순위</b><ol>'+game.ranking.map((x,i)=>`<li><span>${i+1}</span><img src="${esc(x.display_url||x.secure_url)}" alt=""><strong>${esc(x.artist_name||'탑꾸')}</strong><em>${Number(x.stats.balanceWins||0)}승</em></li>`).join('')+'</ol>';
  }
  async function loadBalance(){
    const user=await identity(false);const qs=user?`?visitorId=${encodeURIComponent(user.visitorId)}`:'';
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/balance-weekly${qs}`,{headers:{Accept:'application/json',...authHeaders(user)},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'balance_failed');state.balance=data;renderBalance();
    }catch{$('#topkkuBalanceGrid').innerHTML='<div class="topkku-loading">취향대결을 잠시 불러오지 못했어요.</div>'}
  }
  async function voteBalance(matchNo,winnerId){
    const user=await identity(true);if(!user)return;
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/balance/${matchNo}/vote`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(user)},body:JSON.stringify({visitorId:user.visitorId,winnerId})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'vote_failed');state.balance=data.game;renderBalance();
      if(data.awarded){const rank=$('#topkkuBalanceRanking');rank?.insertAdjacentHTML('afterbegin','<div class="point-pop">+1P 취향 포인트 적립 ✦</div>')}loadMakerTrend('current');
    }catch{}
  }

  function savedVaultCard(item){
    return `<article class="vault-card" data-vault-id="${Number(item.id)}" data-bucket="${esc(item.bucket_key||'inbox')}"><a href="${esc(item.secure_url)}" target="_blank" rel="noopener"><img src="${esc(item.display_url||item.secure_url)}" alt="${esc(item.artist_name||'탑꾸')}" loading="lazy"></a><div><b>${esc(item.artist_name||'탑꾸')}</b><span>${esc(item.maker_name||'팬')} · 취향함</span><div class="vault-actions"><button type="button" data-reference="${Number(item.id)}">참고해서 꾸미기</button><button type="button" data-taste="${Number(item.id)}">취향함에서 빼기</button></div></div></article>`;
  }

  async function loadVaultScope(scope){
    state.vaultScope=scope;
    if(scope==='mine'){window.NUGU_TOPKKU_LOAD_VAULT?.();return}
    const root=$('#topkkuVaultGrid'),status=$('#topkkuVaultState');if(!root||!status)return;
    const user=await identity(false);
    if(!user){root.innerHTML='';status.innerHTML='로그인하면 내가 담은 탑꾸를 카드처럼 정리할 수 있어요. <button type="button" id="savedVaultLogin">로그인</button>';$('#savedVaultLogin')?.addEventListener('click',()=>window.NUGU_AUTH_UI?.signIn?.(location.href));return}
    status.textContent='내 취향함을 불러오는 중…';
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/saved?visitorId=${encodeURIComponent(user.visitorId)}&limit=60`,{headers:{Accept:'application/json',...authHeaders(user)},cache:'no-store'});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'saved_failed');state.savedVault=data.items||[];state.savedIds=new Set(state.savedVault.map(x=>Number(x.id)));
      status.textContent=`내가 담아둔 탑꾸 ${state.savedVault.length}장`;renderSavedVault();
    }catch{status.textContent='취향함을 잠시 불러오지 못했어요.'}
  }
  function renderSavedVault(){
    if(state.vaultScope!=='saved')return;const root=$('#topkkuVaultGrid');if(!root)return;
    root.innerHTML=state.savedVault.length?state.savedVault.map(savedVaultCard).join(''):'<div class="topkku-vault-empty">아직 취향함에 담은 탑꾸가 없어요.</div>';
    root.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>startReference(Number(b.dataset.reference)));
    root.querySelectorAll('[data-taste]').forEach(b=>b.onclick=()=>toggleTaste(Number(b.dataset.taste)));
    decorateVault();
  }

  function renderDropZones(){
    const labels=bucketLabels[state.vaultScope];
    $$('.vault-drop-zone').forEach(z=>{const k=z.dataset.dropBucket;z.textContent=`${bucketArrows[k]} ${labels[k]}`});
    const filters=$('#vaultGroupFilters');if(!filters)return;
    const cards=$$('#topkkuVaultGrid .vault-card'),counts={inbox:0,north:0,east:0,south:0,west:0};cards.forEach(c=>counts[c.dataset.bucket||'inbox']++);
    filters.innerHTML=`<button class="${state.vaultGroup==='all'?'active':''}" data-vault-group="all">전체 ${cards.length}</button>`+Object.keys(counts).map(k=>`<button class="${state.vaultGroup===k?'active':''}" data-vault-group="${k}">${esc(labels[k])} ${counts[k]}</button>`).join('');
    filters.querySelectorAll('[data-vault-group]').forEach(b=>b.onclick=()=>{state.vaultGroup=b.dataset.vaultGroup;decorateVault()});
  }

  function decorateVault(){
    const root=$('#topkkuVaultGrid');if(!root)return;
    root.classList.toggle('is-fan',state.vaultView==='fan');root.classList.toggle('is-grid',state.vaultView==='grid');
    const cards=$$('.vault-card',root);
    cards.forEach((card,i)=>{
      const show=state.vaultGroup==='all'||card.dataset.bucket===state.vaultGroup;card.hidden=!show;
      card.style.setProperty('--card-index',String(i));card.onpointerdown=null;
      card.addEventListener('pointerdown',ev=>startCardDrag(ev,card),{once:true});
    });
    renderDropZones();
  }

  function startCardDrag(ev,card){
    if(ev.target.closest('a,button')){card.addEventListener('pointerdown',e=>startCardDrag(e,card),{once:true});return}
    const start={x:ev.clientX,y:ev.clientY};let dx=0,dy=0;card.setPointerCapture?.(ev.pointerId);card.classList.add('dragging');
    const move=e=>{dx=e.clientX-start.x;dy=e.clientY-start.y;card.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/28}deg)`;highlightDirection(dx,dy)};
    const end=async()=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',end);card.removeEventListener('pointercancel',end);card.classList.remove('dragging');clearDropHighlights();
      const bucket=directionBucket(dx,dy);card.style.transform='';
      if(bucket)await organizeCard(card,bucket);else card.addEventListener('pointerdown',e=>startCardDrag(e,card),{once:true});
    };
    card.addEventListener('pointermove',move);card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
  }
  function directionBucket(dx,dy){
    if(Math.hypot(dx,dy)<65)return null;
    if(Math.abs(dx)>Math.abs(dy))return dx>0?'east':'west';
    return dy>0?'south':'north';
  }
  function highlightDirection(dx,dy){const bucket=directionBucket(dx,dy);clearDropHighlights();if(bucket)$('[data-drop-bucket="'+bucket+'"]')?.classList.add('hot')}
  function clearDropHighlights(){$$('.vault-drop-zone').forEach(x=>x.classList.remove('hot'))}

  async function organizeCard(card,bucket){
    const user=await identity(true);if(!user)return;const id=Number(card.dataset.vaultId);
    try{
      const r=await fetch(`${apiBase()}/api/v1/community/topkku/${id}/organize`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(user)},body:JSON.stringify({visitorId:user.visitorId,scope:state.vaultScope,bucketKey:bucket})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'organize_failed');
      card.dataset.bucket=bucket;card.classList.add('just-sorted');setTimeout(()=>card.classList.remove('just-sorted'),420);
      if(state.vaultGroup!=='all'&&state.vaultGroup!==bucket)card.hidden=true;
      renderDropZones();card.addEventListener('pointerdown',e=>startCardDrag(e,card),{once:true});
    }catch{card.addEventListener('pointerdown',e=>startCardDrag(e,card),{once:true})}
  }

  function initControls(){
    $('#topkkuGalleryTabs [data-gallery-sort]').forEach(b=>b.onclick=()=>{$('#topkkuGalleryTabs [data-gallery-sort]').forEach(x=>x.classList.toggle('active',x===b));loadGallery(b.dataset.gallerySort)});
    $('#makerTrendTabs [data-maker-window]').forEach(b=>b.onclick=()=>{$('#makerTrendTabs [data-maker-window]').forEach(x=>x.classList.toggle('active',x===b));loadMakerTrend(b.dataset.makerWindow)});
    $$('#vaultScopeTabs [data-vault-scope]').forEach(b=>b.onclick=()=>{$$('#vaultScopeTabs [data-vault-scope]').forEach(x=>x.classList.toggle('active',x===b));state.vaultGroup='all';loadVaultScope(b.dataset.vaultScope)});
    $$('#vaultViewTabs [data-vault-view]').forEach(b=>b.onclick=()=>{$$('#vaultViewTabs [data-vault-view]').forEach(x=>x.classList.toggle('active',x===b));state.vaultView=b.dataset.vaultView;decorateVault()});
  }

  window.addEventListener('nugu-topkku-vault-rendered',ev=>{if(state.vaultScope==='mine'){state.vaultScope='mine';decorateVault();$('#topkkuVaultGrid [data-reactions]').forEach(b=>b.onclick=()=>openReactions(Number(b.dataset.reactions)))}});
  window.addEventListener('nugu-auth-changed',async()=>{await loadSavedIds();renderGallery();loadBalance();loadVaultScope(state.vaultScope)});

  initControls();
  Promise.resolve().then(loadSavedIds).then(()=>loadGallery());
  loadBalance();
  loadMakerTrend();
  setTimeout(()=>{if(state.vaultScope==='mine')decorateVault()},250);
})();