(()=>{
  const config=window.NUGU_CONFIG||{};
  const api=String(config.apiBase||'').replace(/\/$/,'');
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const dateLabel=d=>!d?'—':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(d));
  const ruleLabel=rule=>({
    'giant-single-signal':'Giant signal',
    'multi-platform-or-scale-mainstream':'Multiple strong signals',
    'established-legacy-mainstream':'Established scale'
  }[rule]||'Graduated from Radar');
  function card(a){
    const snap=a.graduation_snapshot||{};
    const img=a.image_url||a.latest_content_thumbnail||'';
    return `<article class="hall-card">
      <div class="hall-media">
        ${img?`<img src="${esc(img)}" data-fallback="${esc(a.latest_content_thumbnail||'')}" alt="${esc(a.name)}" loading="lazy" referrerpolicy="no-referrer">`:'<div class="hall-image-empty">Verified media pending</div>'}
        <span class="hall-seal">HALL OF FAME</span>
      </div>
      <div class="hall-copy">
        <small>GRADUATED ${esc(dateLabel(a.graduated_at))}</small>
        <h2>${esc(a.name)}</h2>
        <p>${esc(a.korean_name||'')}${a.agency?` · ${esc(a.agency)}`:''}</p>
        <div class="hall-stats">
          <span><b>${snap.lastRank?`#${esc(snap.lastRank)}`:'—'}</b>last Radar rank</span>
          <span><b>${snap.lastScore??'—'}</b>last momentum</span>
          <span><b>${esc(ruleLabel(a.radar_eligibility?.rule))}</b>graduation signal</span>
        </div>
        ${a.official_url?`<a href="${esc(a.official_url)}" target="_blank" rel="noopener">Official artist ↗</a>`:''}
      </div>
    </article>`;
  }
  async function load(){
    const grid=$('#hallGrid'),status=$('#hallStatus');
    if(!api){status.textContent='API configuration unavailable.';return}
    try{
      const r=await fetch(`${api}/api/v1/hall-of-fame`,{headers:{Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json(),items=Array.isArray(data.items)?data.items:[];
      status.textContent=items.length?`${items.length} Radar graduate${items.length===1?'':'s'}`:'Waiting for our first graduate.';
      grid.innerHTML=items.length?items.map(card).join(''):`<div class="hall-empty"><span>📡</span><h2>아직 첫 졸업생을 기다리는 중.</h2><p>Radar 안에서 실제로 발견된 팀이 성장해서 졸업하면 이곳에 기록됩니다. 이미 유명했던 팀을 소급해서 넣지는 않습니다.</p></div>`;
      grid.querySelectorAll('img[data-fallback]').forEach(img=>{
        img.addEventListener('error',()=>{
          const next=img.dataset.fallback;
          if(next&&img.src!==next){img.src=next;img.dataset.fallback='';return}
          img.style.visibility='hidden';
        });
      });
    }catch(e){
      console.warn('hall of fame read failed',e);
      status.textContent='Hall of Fame is temporarily unavailable.';
      grid.innerHTML='<div class="hall-empty"><h2>Hall of Fame data unavailable.</h2><p>다시 연결되면 실제 졸업 기록만 표시됩니다.</p></div>';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
