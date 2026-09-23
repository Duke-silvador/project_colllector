(()=>{
  const config=window.NUGU_CONFIG||{};
  const api=String(config.apiBase||'').replace(/\/$/,'');
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:0};
  const metric=(a,platform,key)=>{
    const row=(a.metrics||[]).find(x=>x.platform===platform);
    return num(row?.metrics?.[key]);
  };
  const values=a=>{
    const cached=a.radar_eligibility?.values||{};
    return {
      youtubeSubscribers:num(cached.youtubeSubscribers??metric(a,'youtube','subscribers')),
      youtubeViews:num(cached.youtubeViews??metric(a,'youtube','views')),
      lastfmListeners:num(cached.lastfmListeners??metric(a,'lastfm','listeners')),
      lastfmPlaycount:num(cached.lastfmPlaycount??metric(a,'lastfm','playcount'))
    };
  };
  const strongestDelta=a=>Math.max(0,...(a.reasons||[]).map(r=>num(r.delta)));
  function monsterInfo(a){
    if(a.radar_eligible===false)return {level:0,pressure:0,reason:''};
    const v=values(a);
    const strong=[
      ['YouTube subs',v.youtubeSubscribers/1_000_000],
      ['YouTube views',v.youtubeViews/1_000_000_000],
      ['Last.fm listeners',v.lastfmListeners/750_000],
      ['Last.fm plays',v.lastfmPlaycount/100_000_000],
    ].sort((x,y)=>y[1]-x[1]);
    const giant=[
      ['YouTube subs',v.youtubeSubscribers/10_000_000],
      ['YouTube views',v.youtubeViews/5_000_000_000],
      ['Last.fm listeners',v.lastfmListeners/2_000_000],
      ['Last.fm plays',v.lastfmPlaycount/500_000_000],
    ].sort((x,y)=>y[1]-x[1]);
    const moderate=[
      ['YouTube subs',v.youtubeSubscribers/500_000],
      ['YouTube views',v.youtubeViews/150_000_000],
      ['Last.fm listeners',v.lastfmListeners/250_000],
      ['Last.fm plays',v.lastfmPlaycount/15_000_000],
    ].sort((x,y)=>y[1]-x[1]);
    const age=num(a.radar_eligibility?.debutAgeYears);
    const growth=strongestDelta(a);
    const pressure=Math.min(100,Math.round(Math.max(
      giant[0][1]*100,
      ((strong[0][1]+strong[1][1])/2)*100,
      age>=8?((moderate[0][1]+moderate[1][1])/2)*100:0
    )));
    let level=0;
    if(giant[0][1]>=.70||(strong[0][1]>=1&&strong[1][1]>=.70)||(age>=8&&moderate[0][1]>=1&&moderate[1][1]>=.70))level=3;
    else if(strong[0][1]>=1||strong[1][1]>=.50||giant[0][1]>=.40||(age>=8&&moderate[0][1]>=1))level=2;
    else if(moderate[0][1]>=.65||strong[0][1]>=.35||(growth>=.10&&strong[0][1]>=.20))level=1;
    const lead=strong[0];
    const reason=level===3?'Graduation gate close':level===2?`${lead[0]} already strong`:`${lead[0]} building fast`;
    return {level,pressure,reason,lead:lead[0],leadRatio:lead[1],growth};
  }
  const badge=info=>`<span class="monster-badge monster-lv${info.level}">MONSTER LV.${info.level}</span>`;
  function decorateMonsterBadges(data){
    const map=new Map((data.artists||[]).map(a=>[a.slug,monsterInfo(a)]));
    document.querySelectorAll('[data-slug]').forEach(card=>{
      const info=map.get(card.dataset.slug);
      const old=card.querySelector('.monster-badge');
      if(!info?.level){old?.remove();return}
      if(old){
        const cls=`monster-badge monster-lv${info.level}`,text=`MONSTER LV.${info.level}`;
        if(old.className!==cls)old.className=cls;
        if(old.textContent!==text)old.textContent=text;
        return;
      }
      const holder=card.querySelector('.card-rankline')||card.querySelector('.breakout-copy>div')||card.querySelector('div');
      if(holder)holder.insertAdjacentHTML('afterbegin',badge(info));
    });
    const heroName=document.querySelector('#heroProof .proof-name');
    const leader=(data.artists||[]).find(a=>Number(a.rank)===1)||(data.artists||[])[0];
    if(heroName&&leader){
      const info=monsterInfo(leader);
      const old=heroName.querySelector('.monster-badge');
      if(!info.level){old?.remove()}
      else if(old){
        const cls=`monster-badge monster-lv${info.level}`,text=`MONSTER LV.${info.level}`;
        if(old.className!==cls)old.className=cls;
        if(old.textContent!==text)old.textContent=text;
      }else heroName.insertAdjacentHTML('beforeend',badge(info));
    }
  }
  function renderMonsterWatch(data){
    const root=document.getElementById('monsterGrid');
    if(!root)return;
    const rows=(data.artists||[])
      .map(a=>({a,info:monsterInfo(a)}))
      .filter(x=>x.info.level>0)
      .sort((x,y)=>y.info.level-x.info.level||y.info.pressure-x.info.pressure||Number(x.a.rank||999)-Number(y.a.rank||999))
      .slice(0,6);
    root.innerHTML=rows.length?rows.map(({a,info})=>`
      <article class="monster-card" data-monster-slug="${esc(a.slug)}" tabindex="0">
        <img src="${esc(a.image_url||a.content?.[0]?.thumbnail_url||'')}" alt="${esc(a.name)}" loading="lazy" referrerpolicy="no-referrer">
        <div class="monster-card-shade"></div>
        <div class="monster-card-copy">
          ${badge(info)}
          <h3>${esc(a.name)}</h3>
          <p>${esc(info.reason)}</p>
          <div class="monster-pressure"><span style="width:${info.pressure}%"></span></div>
          <small>${info.pressure}/100 graduation pressure${a.rank?` · Momentum #${esc(a.rank)}`:''}</small>
        </div>
      </article>`).join(''):`<div class="monster-empty"><b>No monster signal yet.</b><span>아직 졸업 게이트에 가까워진 팀이 없습니다.</span></div>`;
    root.querySelectorAll('[data-monster-slug]').forEach(el=>{
      const open=()=>window.openArtist?.(el.dataset.monsterSlug);
      el.addEventListener('click',open);
      el.addEventListener('keydown',e=>{if(e.key==='Enter')open()});
    });
  }
  const safeYoutube=url=>{
    const s=String(url||'');
    const m=s.match(/^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/([^/]+)\/(?:maxresdefault|sddefault|hq720)\.(?:jpg|webp)(?:\?.*)?$/i);
    return m?`https://i.ytimg.com/vi/${encodeURIComponent(m[1])}/hqdefault.jpg`:s;
  };
  const preload=url=>new Promise(resolve=>{
    if(!url)return resolve(false);
    const img=new Image();
    const timer=setTimeout(()=>{img.src='';resolve(false)},8000);
    img.onload=()=>{clearTimeout(timer);resolve(true)};
    img.onerror=()=>{clearTimeout(timer);resolve(false)};
    img.referrerPolicy='no-referrer';
    img.src=url;
  });
  let heroSeq=0;
  async function repairHero(data){
    const seq=++heroSeq;
    const media=document.getElementById('heroMedia');
    const leader=(data.artists||[]).find(a=>Number(a.rank)===1)||(data.artists||[])[0];
    if(!media||!leader)return;
    const candidates=[];
    const push=u=>{u=safeYoutube(u);if(u&&!candidates.includes(u))candidates.push(u)};
    push(leader.image_url);
    for(const c of leader.content||[])push(c.thumbnail_url);
    for(const url of candidates){
      if(await preload(url)){
        if(seq!==heroSeq)return;
        media.style.backgroundImage=`url("${String(url).replace(/"/g,'')}")`;
        media.dataset.heroImage='verified';
        media.dataset.heroArtist=leader.slug;
        return;
      }
    }
    if(seq===heroSeq){
      media.style.backgroundImage='none';
      media.dataset.heroImage='unavailable';
      media.dataset.heroArtist=leader.slug;
    }
  }
  async function load(){
    let data=window.NUGU_FALLBACK||{artists:[]};
    if(api){
      try{
        const r=await fetch(`${api}/api/v1/home`,{headers:{Accept:'application/json'},cache:'no-store'});
        if(r.ok)data=await r.json();
      }catch(e){console.warn('enhancement home read failed',e)}
    }
    renderMonsterWatch(data);
    decorateMonsterBadges(data);
    repairHero(data);
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;decorateMonsterBadges(data)});
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
