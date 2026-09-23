(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const apiBase=()=>String((window.NUGU_CONFIG||{}).apiBase||'').replace(/\/$/,'');
  let lastBandShown='',giftBatchShown='';

  async function identity(){
    try{const id=await window.NUGU_AUTH?.getIdentity?.();return id?.authenticated&&id.accessToken?id:null}catch{return null}
  }
  const authHeaders=id=>id?{...(window.NUGU_AUTH?.authHeaders?.(id)||{})}:{};

  function itemVisual(itemId){
    const item=window.NUGU_TOPKKU_STICKERS?.byId?.get?.(itemId);
    if(!item)return '<span class="keepsake-glyph">✦</span>';
    if(item.asset)return '<img src="'+esc(item.asset)+'" alt="" draggable="false">';
    return '<span class="keepsake-glyph">'+esc(item.value||'✦')+'</span>';
  }

  async function ackMail(){
    const id=await identity();if(!id)return;
    fetch(apiBase()+'/api/v1/community/style/mail/ack',{
      method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(id)},
      body:JSON.stringify({visitorId:id.visitorId})
    }).catch(()=>{});
  }

  async function ackGifts(ids){
    const id=await identity();if(!id||!ids?.length)return;
    fetch(apiBase()+'/api/v1/community/style/gifts/open',{
      method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...authHeaders(id)},
      body:JSON.stringify({visitorId:id.visitorId,giftIds:ids})
    }).catch(()=>{});
  }

  function showMail(profile){
    const pending=profile?.mail?.pending,root=$('#growthKeepsakeLayer');
    if(!pending||!root||pending.bandId===lastBandShown)return false;
    lastBandShown=pending.bandId;
    const visibleItems=(window.NUGU_TOPKKU_STYLE_STATE?.items||[]).filter(x=>x.visible&&Number(x.minBand||1)===Number(profile.growth?.bandIndex||1)).slice(0,6);
    root.hidden=false;
    root.innerHTML=`<div class="keepsake-backdrop" data-keepsake-close>
      <section class="growth-keepsake" role="dialog" aria-modal="true" aria-label="새 편지">
        <button class="keepsake-x" type="button" data-keepsake-close aria-label="닫기">×</button>
        <button class="keepsake-envelope" type="button" id="openGrowthLetter" aria-label="편지 열기">
          <span class="envelope-flap"></span><span class="envelope-seal">♡</span>
          <b>당신에게 온 편지가 있어요</b><small>눌러서 열어보기</small>
        </button>
        <div class="growth-letter" id="growthLetter" hidden>
          <div class="letter-tape"></div>
          <span class="letter-kicker">FROM NUGU RADAR</span>
          <h2>${esc(pending.title)}</h2>
          <p>${esc(pending.body)}</p>
          <div class="letter-sign">— NUGU RADAR 드림 ♡</div>
          <div class="keepsake-benefits">
            <b>이번에 같이 온 것들</b>
            <div class="keepsake-item-row">
              ${visibleItems.length?visibleItems.map(x=>`<article>${itemVisual(x.id)}<span>${esc(x.label)}</span></article>`).join(''):pending.benefits.map(x=>`<article><span class="keepsake-glyph">✦</span><span>${esc(x)}</span></article>`).join('')}
            </div>
            <ul>${pending.benefits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
          </div>
          ${pending.next?`<aside class="next-envelope-peek"><span>조금 더 함께 놀면…</span><b>${esc(pending.next.label)}</b><small>${esc(pending.next.teaser)}</small></aside>`:''}
          <button class="keepsake-main" type="button" data-keepsake-close>편지 접어두기 ♡</button>
        </div>
      </section>
    </div>`;
    const letter=$('#growthLetter'),envelope=$('#openGrowthLetter');
    envelope?.addEventListener('click',()=>{envelope.classList.add('opened');setTimeout(()=>{envelope.hidden=true;letter.hidden=false;letter.classList.add('arrive')},360)});
    root.querySelectorAll('[data-keepsake-close]').forEach(b=>b.addEventListener('click',ev=>{
      if(ev.target.closest('.growth-keepsake')&&ev.currentTarget.classList.contains('keepsake-backdrop'))return;
      root.hidden=true;root.innerHTML='';ackMail();setTimeout(()=>showGifts(window.NUGU_TOPKKU_STYLE_STATE?.profile),120);
    }));
    return true;
  }

  function showGifts(profile){
    const gifts=profile?.gifts?.unopened||[],root=$('#growthKeepsakeLayer');
    if(!gifts.length||!root)return false;
    const batch=gifts.map(x=>x.id).join('|');if(batch===giftBatchShown)return false;giftBatchShown=batch;
    root.hidden=false;
    root.innerHTML=`<div class="keepsake-backdrop">
      <section class="gift-keepsake" role="dialog" aria-modal="true" aria-label="받은 선물">
        <button class="keepsake-x" type="button" id="closeGiftKeepsake" aria-label="닫기">×</button>
        <div class="gift-ribbon">FOR YOU</div>
        <span class="letter-kicker">SOMEONE LEFT YOU A GIFT</span>
        <h2>누가 작은 선물을 두고 갔어요 ♡</h2>
        <div class="gift-stack">${gifts.map(g=>{
          const item=window.NUGU_TOPKKU_STICKERS?.byId?.get?.(g.itemId);
          return `<article class="received-gift-card"><div class="received-gift-object">${itemVisual(g.itemId)}</div><div><b>${esc(item?.label||g.itemId)}</b><span>${esc(g.senderName)}님이 보냈어요</span>${g.message?`<p>“${esc(g.message)}”</p>`:''}<small>이 꾸미기는 이제 내 서랍에 계속 남아요.</small></div></article>`;
        }).join('')}</div>
        <button class="keepsake-main" type="button" id="acceptGiftKeepsake">내 서랍에 잘 넣어둘게요 ♡</button>
      </section>
    </div>`;
    const close=()=>{root.hidden=true;root.innerHTML='';ackGifts(gifts.map(x=>x.id))};
    $('#closeGiftKeepsake')?.addEventListener('click',close);$('#acceptGiftKeepsake')?.addEventListener('click',close);
    return true;
  }

  function handleState(data){
    const profile=data?.profile;if(!profile)return;
    if(showMail(profile))return;
    showGifts(profile);
  }

  window.addEventListener('nugu-topkku-style-state',ev=>handleState(ev.detail));
  if(window.NUGU_TOPKKU_STYLE_STATE)handleState(window.NUGU_TOPKKU_STYLE_STATE);
})();