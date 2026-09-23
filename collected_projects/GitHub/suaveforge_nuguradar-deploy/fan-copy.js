(()=>{
  const replacements=[
    [/Latest real snapshot deltas only/g,'최근 실제 성장 흐름으로 순위를 보고 있어요'],
    [/DATA WARM-UP/g,'RANKING SOON'],
    [/Waiting for \d+ snapshots/g,'순위를 만들 만큼 움직임이 쌓이는 중'],
    [/The site stays unranked until real deltas exist\./g,'조금만 더 지켜보면 첫 순위가 열려요.'],
    [/(\d+)% coverage/g,'활동 신호 $1%'],
    [/(\d+) verified endpoints/g,'공식 채널 $1곳'],
    [/Debut verified/g,'데뷔 정보 확인됨'],
    [/members pending/g,'멤버 정보 준비 중'],
    [/Verified canonical source/g,'Official source'],
    [/Verified drops are warming up\./g,'새 콘텐츠를 모으는 중이에요.'],
    [/Verified signals building/g,'요즘 움직임이 조금씩 커지고 있어요'],
    [/Agency verified/g,'소속사 정보'],
    [/Verified · /g,'New · '],
    [/identity locked/g,'newly added'],
    [/Audience warming/g,'팬 규모를 더 살펴보는 중'],
    [/ largest live audience signal/g,' biggest audience'],
    [/No verified acts in this filter yet\./g,'아직 이 조건에 맞는 팀이 없어요.'],
    [/Waiting for positive delta\./g,'아직 새롭게 치고 올라오는 팀이 없어요.'],
    [/real snapshots pending/g,'조금 더 활동을 지켜보는 중'],
    [/real deltas/g,'recent growth'],
    [/✓ VERIFIED ENTITY/g,'✓ OFFICIAL PROFILE'],
    [/Official network/g,'Official links'],
    [/(\d+) verified/g,'공식 링크 $1개'],
    [/verified source/g,'official source'],
    [/Verified videos & posts/g,'Official videos & posts'],
    [/No verified content yet\. We leave it empty instead of guessing\./g,'아직 공식 영상이나 포스트가 없어요.'],
    [/Canonical identity/g,'Artist info'],
    [/Image provenance/g,'Photo credit'],
    [/Graduation gate close/g,'이제 정말 크게 뜰지도 몰라요'],
    [/(YouTube subs|YouTube views|Last\.fm listeners|Last\.fm plays) already strong/g,'팬 규모가 눈에 띄게 커졌어요'],
    [/(YouTube subs|YouTube views|Last\.fm listeners|Last\.fm plays) building fast/g,'요즘 빠르게 커지고 있어요'],
    [/graduation pressure/g,'breakout meter'],
    [/No monster signal yet\./g,'아직 MONSTER 팀은 없어요.'],
    [/아직 졸업 게이트에 가까워진 팀이 없습니다\./g,'아직 “이제 진짜 뜨겠다” 싶은 팀은 없어요.'],
    [/ALL VERIFIED ACTS/g,'ALL RADAR ACTS'],
    [/Loading verified content…/g,'새 콘텐츠를 불러오는 중…'],
    [/No verified content for this filter\./g,'이 조건에는 아직 볼 콘텐츠가 없어요.'],
    [/Could not load verified content\. Retry by changing a filter\./g,'콘텐츠를 불러오지 못했어요. 다른 조건으로 다시 봐주세요.'],
    [/✓ VERIFIED SOURCE/g,'✓ OFFICIAL SOURCE'],
    [/Signed in with AuthHub · history syncs across devices/g,'Signed in · your history follows you across devices'],
    [/Searching verified catalog…/g,'Radar에서 찾는 중…'],
    [/No verified artist matched that search\./g,'검색한 이름과 맞는 팀을 찾지 못했어요.'],
    [/That act has crossed the NUGU RADAR mainstream gate\./g,'이 팀은 이제 Radar를 졸업했어요. Hall of Fame에서 만날 수 있어요.'],
    [/OUTSIDE RADAR/g,'RADAR GRADUATE'],
    [/momentum warming/g,'rise building'],
    [/Giant signal/g,'Big breakthrough'],
    [/Multiple strong signals/g,'Growing everywhere'],
    [/Established scale/g,'No longer a small team'],
    [/graduation signal/g,'why they graduated'],
    [/Verified media pending/g,'Photo coming soon'],
    [/API configuration unavailable\./g,'Hall of Fame is taking a short break.'],
    [/Loading real graduates…/g,'불러오는 중…'],
    [/Hall of Fame data unavailable\./g,'지금은 명예의 전당을 불러오지 못했어요.'],
    [/다시 연결되면 실제 졸업 기록만 표시됩니다\./g,'잠시 후 다시 확인해 주세요.'],
    [/Verified artist room/g,'A room for early fans'],
    [/This act crossed the discovery gate\. Its early-room history stays readable, but new Radar Time, Glow and posts are paused\./g,'이 팀은 이제 Radar를 졸업했어요. 먼저 좋아했던 기록은 그대로 남아 있고, 이 방은 추억을 보는 공간으로 남습니다.'],
    [/Community Glow never changes Momentum Rank/g,'Community Glow는 팬들의 응원이고, Momentum은 팀이 얼마나 빠르게 커지는지를 보여줘요'],
    [/This act graduated from the discovery pool\. Existing early-support records stay preserved\./g,'이 팀은 Radar를 졸업했어요. 먼저 좋아했던 기록은 그대로 남습니다.'],
    [/Visible, active room time earns up to one minute per minute\. Idle or hidden tabs stop earning\./g,'이 방에서 실제로 보고 놀고 있는 시간만 Radar Time으로 차곡차곡 쌓여요.'],
    [/account synced/g,'saved to your account'],
    [/Outside Radar — history preserved\./g,'Radar graduate — your memories stay.'],
    [/Earliest supporters keep their original timestamp\. You cannot buy or backdate this\./g,'먼저 좋아했던 사람의 자리는 그대로 남아요. 나중에 돈으로 살 수도, 시간을 되돌릴 수도 없어요.'],
    [/Name comes from your AuthHub account/g,'Name comes from your signed-in profile'],
    [/This act has crossed the NUGU RADAR mainstream gate\./g,'이 팀은 이제 Radar를 졸업했어요.'],
    [/This room has graduated outside the Radar\./g,'이 방의 팀은 이제 Radar를 졸업했어요.'],
    [/Archived room · new posts paused/g,'Hall of Fame room · 추억만 남겨두는 공간이에요']
  ];
  const direct={READY:'LIVE',WARMING:'COMING IN',IDENTITY:'CONNECTED',DISPLAY:'CONNECTED',MEDIA:'CONNECTED',OFFICIAL:'CONNECTED',LINK:'CONNECTED',UNKNOWN:'CHECKING'};
  function polishText(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    for(const n of nodes){
      let t=n.nodeValue||'',next=t;
      for(const [re,to] of replacements)next=next.replace(re,to);
      const trimmed=next.trim();
      if(direct[trimmed])next=next.replace(trimmed,direct[trimmed]);
      if(next!==t)n.nodeValue=next;
    }
    document.querySelectorAll('.feed-copy em,.video-copy em,.watch-copy em').forEach(el=>{
      const play=/^▶\s*Play here/i.test(el.textContent||'');
      el.textContent=play?'▶ Play here · ✓ 공식 계정에서 확인한 콘텐츠':'✓ 공식 계정에서 확인한 콘텐츠';
    });
    document.querySelectorAll('.official-network a small').forEach(el=>{el.textContent='✓ Official link'});
    document.querySelectorAll('.ribbon-item small').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^LIVE\s*·/i.test(t))el.textContent='live updates';
      else if(/^(DISPLAY|OFFICIAL|LINK)\s*·/i.test(t))el.textContent='official link';
      else if(/^IDENTITY\s*·/i.test(t))el.textContent='artist info';
      else if(/^MEDIA\s*·/i.test(t))el.textContent='photo source';
    });
    document.querySelectorAll('.connector-row small').forEach(el=>{
      const t=el.textContent.trim().toLowerCase();
      if(['source','rank','display','identity','media','official','link','official channel id','business discovery','exact user id','musicbrainz mbid','verified url + oembed','canonical url + embed','verified official page','cc0 entity graph','cc0 mbid','license checked','verified official link'].includes(t))el.textContent='watching';
    });
    document.querySelectorAll('.connector-row strong').forEach(el=>{
      const t=el.textContent.trim().toLowerCase();
      if(['30m','60m'].includes(t))el.textContent='frequent';
      else if(t==='6h')el.textContent='regular';
      else if(['link','identity'].includes(t))el.textContent='linked';
    });
    document.querySelectorAll('.connector-status').forEach(el=>{
      const t=el.textContent.trim().toUpperCase();
      if(['READY','LIVE'].includes(t))el.textContent='LIVE';
      else if(['DISPLAY','IDENTITY','MEDIA','OFFICIAL','LINK','CONNECTED'].includes(t))el.textContent='CONNECTED';
      else if(['WARMING','COMING IN'].includes(t))el.textContent='COMING IN';
      else el.textContent='CHECKING';
    });
    document.querySelectorAll('.detail-section').forEach(section=>{
      const h=section.querySelector('h3');
      if(h&&['Canonical identity','Artist info'].includes(h.textContent.trim()))section.style.display='none';
    });
  }
  let queued=false;
  const run=()=>{queued=false;polishText()};
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(run)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{polishText();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true})},{once:true});
  else{polishText();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true})}
})();