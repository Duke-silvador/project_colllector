(()=>{
  const style=document.createElement('style');
  style.textContent='.nugu-image-unavailable{position:absolute;inset:0;display:grid;place-items:center;padding:12px;background:linear-gradient(135deg,#111,#1b1b1b);color:#9b9b9b;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-align:center}.feed-thumb,.watch-thumb,.artist-card,.breakout-card,.compact-artist,.detail-hero,.watch-artist,.community-card,.spotlight-card,.room-hero{position:relative}';
  document.head.appendChild(style);
  const cfg=window.NUGU_CONFIG||{};
  const api=String(cfg.apiBase||'').replace(/\/$/,'');
  let fallbackPromise=null;
  const fallbacks=new Map();

  const isArtistImage=img=>Boolean(img.closest('.artist-card,.breakout-card,.compact-artist,.detail-hero,.watch-artist,.community-card,.spotlight-card,.room-hero'));
  const isContentImage=img=>Boolean(img.closest('.feed-thumb,.video-row,.watch-thumb'));
  const youtubeSafe=url=>{
    const s=String(url||'');
    const m=s.match(/^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/([^/]+)\/(?:maxresdefault|sddefault|hq720)\.(?:jpg|webp)(?:\?.*)?$/i);
    return m?`https://i.ytimg.com/vi/${encodeURIComponent(m[1])}/hqdefault.jpg`:null;
  };
  const itemSrc=item=>{
    if(!item)return '';
    if(item.platform==='bstage'&&item.platform_content_id&&api)return `${api}/api/v1/content/${encodeURIComponent(item.platform)}/${encodeURIComponent(item.platform_content_id)}/thumbnail`;
    return item.thumbnail_url||'';
  };
  async function ensureFallbacks(){
    if(fallbackPromise)return fallbackPromise;
    fallbackPromise=(async()=>{
      if(!api)return;
      try{
        const r=await fetch(`${api}/api/v1/media/artist-fallbacks`,{headers:{Accept:'application/json'},cache:'no-store'});
        if(!r.ok)return;
        const data=await r.json();
        for(const item of data.items||[])fallbacks.set(item.slug,item);
      }catch(e){console.warn('image fallback map unavailable',e)}
    })();
    return fallbackPromise;
  }
  function artistSlugFor(img){
    const direct=img.closest('[data-slug]')?.dataset.slug;if(direct)return direct;
    const link=img.closest('a[href*="room.html?artist="]');if(link){try{return new URL(link.href,location.href).searchParams.get('artist')||''}catch{}}
    if(img.closest('.room-hero'))return new URLSearchParams(location.search).get('artist')||'';
    return '';
  }
  function hideBroken(img,label=''){
    img.dataset.nuguImageFinal='1';
    img.style.visibility='hidden';
    const box=img.parentElement;
    if(box&&!box.querySelector('.nugu-image-unavailable')){
      const p=document.createElement('span');p.className='nugu-image-unavailable';p.textContent=label||'Image unavailable';box.appendChild(p);
    }
  }
  async function recover(img){
    if(!(img instanceof HTMLImageElement)||img.dataset.nuguImageFinal==='1'||img.dataset.nuguRecovering==='1')return;
    img.dataset.nuguRecovering='1';
    try{
      const current=img.currentSrc||img.src||img.getAttribute('src')||'';
      const yt=youtubeSafe(current);
      if(yt&&img.dataset.nuguImageStage!=='youtube-safe'){
        img.dataset.nuguImageStage='youtube-safe';img.src=yt;return;
      }
      if(isArtistImage(img)){
        const local=img.closest('.watch-card')?.querySelector('.watch-thumb img')||img.closest('#dialogBody')?.querySelector('.video-row img');
        if(local&&local!==img&&local.src&&local.src!==current){img.dataset.nuguImageStage='local-content';img.src=local.src;return}
        const slug=artistSlugFor(img);
        if(slug){await ensureFallbacks();const src=itemSrc(fallbacks.get(slug));if(src&&src!==current){img.dataset.nuguImageStage='artist-content';img.src=src;return}}
        hideBroken(img,'Verified media pending');return;
      }
      if(isContentImage(img)){hideBroken(img,'Thumbnail unavailable');return}
      hideBroken(img);
    }finally{delete img.dataset.nuguRecovering}
  }
  function scan(root=document){
    root.querySelectorAll?.('img').forEach(img=>{
      const raw=img.getAttribute('src');
      if(!raw||raw==='null'||raw==='undefined')recover(img);
    });
  }
  document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)recover(e.target)},true);
  const mo=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')scan(n.parentElement||document);else scan(n)}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();mo.observe(document.body,{childList:true,subtree:true})},{once:true});
  else{scan();mo.observe(document.body,{childList:true,subtree:true})}
})();
