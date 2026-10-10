const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];

// Smooth navigation
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});$('.mobile-menu')?.classList.remove('open');}}));

// Mobile menu
const menuBtn=$('.menu-btn'), mobileMenu=$('.mobile-menu');
menuBtn?.addEventListener('click',()=>{const open=mobileMenu.classList.toggle('open');mobileMenu.setAttribute('aria-hidden',String(!open));});

// Active navigation
const sections=$$('[id]'); const navLinks=$$('.main-nav a');
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));}}),{rootMargin:'-35% 0px -55% 0px',threshold:0});
sections.forEach(s=>observer.observe(s));

// Car cards -> functional modal
const cars={
 street:{kicker:'STREET CLASS',title:'ГОРОДСКОЙ СПОРТ',desc:'Автомобиль для первых серьёзных шагов. Настройка двигателя, подвески, шин и тормозов меняет его поведение на дороге.',engine:'2.0 TURBO',drive:'RWD',tune:'ЭКСТЕРЬЕР + ТЕХНИКА',img:'assets/car-clean.jpg'},
 performance:{kicker:'PERFORMANCE',title:'СКОРОСТЬ',desc:'Более мощная конфигурация для тех, кто хочет чувствовать разницу между обычной городской машиной и спортивным автомобилем.',engine:'3.0 TWIN-TURBO',drive:'AWD',tune:'ПОЛНЫЙ ТЮНИНГ',img:'assets/hero-clean.jpg'},
 garage:{kicker:'GARAGE',title:'ТЮНИНГ',desc:'Гараж — место, где машина становится твоей. Внешние детали и технические компоненты работают как единая система.',engine:'НАСТРОЙКА',drive:'RWD / AWD',tune:'БЕЗ ОГРАНИЧЕНИЙ',img:'assets/city-clean.jpg'},
 street2:{kicker:'STREET CLASS',title:'НОЧНОЙ STREET',desc:'Городская конфигурация для вечерних улиц. Баланс тяги, тормозов и управляемости.',engine:'2.4 TURBO',drive:'RWD',tune:'STREET SETUP',img:'assets/street-01.jpg'},
 performance2:{kicker:'TRACK / STREET',title:'TRACK BUILD',desc:'Сборка, рассчитанная на скорость, торможение и стабильность на высокой скорости.',engine:'3.5 V6 TURBO',drive:'AWD',tune:'TRACK SETUP',img:'assets/hero-clean.jpg'},
 garage2:{kicker:'GARAGE PROJECT',title:'PROJECT CAR',desc:'Базовый автомобиль для долгого проекта: меняй детали постепенно и собирай собственный характер машины.',engine:'PROJECT',drive:'RWD / AWD',tune:'FULL PROJECT',img:'assets/city-clean.jpg'},

};
const modal=$('#carModal');
$$('.car-card').forEach(card=>card.addEventListener('click',()=>{const d=cars[card.dataset.car];if(!d)return;$('#modalKicker').textContent=d.kicker;$('#modalTitle').textContent=d.title;$('#modalDesc').textContent=d.desc;$('#modalEngine').textContent=d.engine;$('#modalDrive').textContent=d.drive;$('#modalTune').textContent=d.tune;$('#modalImg').style.backgroundImage=`url("${d.img}")`;modal.classList.add('open');modal.setAttribute('aria-hidden','false');}));
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
$('#carModal .modal-close')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeModal()});modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});


// Gallery filters
$$('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const filter=btn.dataset.filter;
  $$('.car-card').forEach(card=>{
    const show=filter==='all'||card.dataset.category===filter;
    card.hidden=!show;
  });
}));


// CMS data: cars and development news are managed from admin.html
async function loadSiteData(){
  try{
    const [carsRes,newsRes]=await Promise.all([fetch('data/manufacturers.json'),fetch('data/news.json')]);
    if(!carsRes.ok||!newsRes.ok) throw new Error('CMS data unavailable');
    const siteCars=await carsRes.json(), siteNews=await newsRes.json();
    renderSiteCars(siteCars); renderSiteNews(siteNews);
    const hash=decodeURIComponent(location.hash||'');
    if(hash.startsWith('#news-')){const item=siteNews.find(n=>n.id===hash.slice(6));if(item)openNewsModal(item);}
  }catch(e){ console.warn('SpeedForStreet CMS:',e); }
}
function renderSiteCars(list){
 const grid=$('.gallery-grid');if(!grid)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 grid.innerHTML=list.map((m,i)=>`<button type="button" class="car-card manufacturer-card ${i===0?'featured':''}" data-manufacturer="${esc(m.id)}" data-category="${esc(m.category)}"><div class="manufacturer-card-brand"><img src="${esc(m.logo||'assets/varex-logo.svg')}" alt="${esc(m.fullName||m.title)} logo" loading="lazy"></div><div class="car-image"><img src="${esc(m.image||'assets/hero-clean.jpg')}" alt="Концепт бренда ${esc(m.title)}" loading="lazy"></div><div class="card-copy"><small>${esc(m.kicker||'AUTOMOTIVE BRAND')}</small><h3>${esc(m.fullName||m.title)}</h3><p>${esc(m.desc||'')}</p><b>ИЗУЧИТЬ ИСТОРИЮ И МОДЕЛИ →</b></div></button>`).join('');
 grid.querySelectorAll('.manufacturer-card').forEach(card=>card.addEventListener('click',()=>{
  const d=list.find(x=>x.id===card.dataset.manufacturer);if(!d||!modal)return;
  $('#modalKicker').textContent=d.kicker||'AUTOMOTIVE BRAND';$('#modalTitle').textContent=d.fullName||d.title;$('#modalDesc').textContent=d.desc||'';
  $('#modalFounded').textContent=d.founded||'—';$('#modalFocus').textContent=d.focus||'—';$('#modalTune').textContent=d.philosophy||d.tagline||'—';
  const left=$('#modalImg');
  left.style.backgroundImage=`url("${d.logo||'assets/varex-logo.svg'}")`;
  left.dataset.brandCaption=(d.fullName||d.title)+' • '+(d.tagline||'AUTOMOTIVE');
  left.classList.add('manufacturer-logo-panel');
  const extra=$('#manufacturerExtra');
  const section=(title,body)=>`<section class="manufacturer-detail-section"><h3>${title}</h3>${body}</section>`;
  const cards=(arr)=>`<div class="manufacturer-subgrid">${(arr||[]).map(x=>`<article><strong>${esc(x.name)}</strong><p>${esc(x.text)}</p></article>`).join('')}</div>`;
  extra.innerHTML=
   section('ИСТОРИЯ БРЕНДА',`<div class="manufacturer-history">${(d.history||[]).map(h=>`<article><b>${esc(h.year)}</b><div><strong>${esc(h.title)}</strong><p>${esc(h.text)}</p></div></article>`).join('')}</div>`)+
   section('СТРУКТУРА КОНЦЕРНА',cards(d.divisions))+
   section('МОДЕЛЬНЫЙ РЯД',`${d.lineupImage?'<img class="manufacturer-lineup-board" src="'+esc(d.lineupImage)+'" alt="Концепт-лист модельного ряда '+esc(d.fullName||d.title)+'">':''}<div class="manufacturer-models">${(d.models||[]).map(x=>`<article><small>${esc(x.series)}</small><h4>${esc(x.name)}</h4><b>${esc(x.spec)}</b><p>${esc(x.text)}</p></article>`).join('')}</div>`)+
   section('ФИРМЕННЫЕ ТЕХНОЛОГИИ',cards(d.technologies))+
   section('ФИРМЕННЫЙ СТИЛЬ',cards(d.brandIdentity))+
   section('ПРОИЗВОДСТВО И ИСПЫТАНИЯ',cards(d.production))+
   section('АВТОСПОРТ',cards(d.motorsport))+
   section(`${esc(d.title||d.fullName)} В МИРЕ SPEEDFORSTREET`,cards(d.world))+
   section('РАЗРАБОТКА АВТОМОБИЛЯ',`<p>${esc(d.development?.description||'')}</p><div class="manufacturer-subgrid">${(d.development?.stages||[]).map(x=>`<article><strong>${esc(x.name)}</strong><p>${esc(x.text)}</p></article>`).join('')}</div>`);
  const lineup=extra.querySelector('.manufacturer-lineup-board');
  if(lineup){
   lineup.tabIndex=0;lineup.setAttribute('role','button');lineup.setAttribute('aria-label','Открыть изображение модельного ряда в большом масштабе');lineup.title='Нажмите, чтобы увеличить';
   const openLineupZoom=()=>{
    const overlay=document.createElement('div');overlay.className='lineup-lightbox';overlay.innerHTML='<button type="button" class="lineup-lightbox-close" aria-label="Закрыть увеличенное изображение">×</button><img alt="'+(lineup.alt||'Модельный ряд производителя').replace(/"/g,'&quot;')+'" src="'+lineup.src+'"><div class="lineup-lightbox-hint">ESC или нажмите вне изображения, чтобы закрыть</div>';
    const close=()=>{overlay.remove();document.removeEventListener('keydown',onKey);};
    const onKey=e=>{if(e.key==='Escape')close();};
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.lineup-lightbox-close'))close();});
    document.addEventListener('keydown',onKey);document.body.appendChild(overlay);
   };
   lineup.addEventListener('click',openLineupZoom);
   lineup.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLineupZoom();}});
  }
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');modal.querySelector('.modal-box')?.scrollTo(0,0);
 }));
 $$('.filter-btn').forEach(btn=>btn.onclick=()=>{$$('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;grid.querySelectorAll('.manufacturer-card').forEach(c=>c.hidden=!(f==='all'||c.dataset.category===f));});
}

function renderSiteNews(list){
  const grid=$('.news-grid'); if(!grid)return;
  list=list.filter(n=>n.published!==false);
  grid.innerHTML=list.map((n,i)=>`<article class="news-card ${i===0?'featured-news':''}" data-news-id="${n.id}"><div class="news-image" style="background-image:url('${n.image||''}')"></div><div class="news-body"><span>${n.date} • ${n.tag}</span><h3>${n.title}</h3><div class="news-short">${n.shortDescription||n.text||''}</div><a href="#" class="news-read-more" data-news-id="${n.id}">ЧИТАТЬ ДАЛЬШЕ →</a></div></article>`).join('');
  grid.querySelectorAll('.news-card').forEach(card=>{
    card.addEventListener('click',e=>{
      if(e.target.closest('a')){e.preventDefault();}
      const item=list.find(n=>n.id===card.dataset.newsId); if(item)openNewsModal(item);
    });
  });
}
function openNewsModal(n){
  if(!n||!$('#newsModal'))return;
  window.currentNews=n;
  $('#newsModalKicker').textContent=(n.date?n.date+' • ':'')+(n.tag||'');
  $('#newsModalTitle').textContent=n.title||'';
  $('#newsModalDesc').innerHTML=n.fullDescription||n.text||n.shortDescription||'';
  $('#newsModalImg').style.backgroundImage=n.image?"url('"+n.image+"')":'none';
  $('#newsModal').classList.add('open');
  $('#newsModal').setAttribute('aria-hidden','false');
  $('#newsModal').scrollTop=0;
  const box=$('.news-modal-box'); if(box)box.scrollIntoView({block:'start',behavior:'auto'});
  updateNewsReactions(n.id);
}
function closeNewsModal(){const m=$('#newsModal');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');}
function reactionKey(id){return 'ssf_news_reactions_'+id}
function getNewsReactions(id){try{return JSON.parse(localStorage.getItem(reactionKey(id))||'{"like":0,"dislike":0,"vote":""}')}catch(e){return {like:0,dislike:0,vote:''}}}
function updateNewsReactions(id){
  const r=getNewsReactions(id);
  const like=$('#newsLike'),dislike=$('#newsDislike');
  if(like){like.querySelector('span').textContent=r.like;like.classList.toggle('active',r.vote==='like')}
  if(dislike){dislike.querySelector('span').textContent=r.dislike;dislike.classList.toggle('active',r.vote==='dislike')}
}
function voteNews(type){
  const n=window.currentNews;if(!n)return;
  const key=reactionKey(n.id),r=getNewsReactions(n.id);
  if(r.vote===type){r[type]--;r.vote='';}
  else{if(r.vote)r[r.vote]--;r[type]++;r.vote=type;}
  localStorage.setItem(key,JSON.stringify(r));updateNewsReactions(n.id);
}
async function shareNews(){
  const n=window.currentNews;if(!n)return;
  const url=location.origin+location.pathname+'#news-'+encodeURIComponent(n.id);
  const data={title:n.title||'SpeedForStreet',text:n.shortDescription||n.text||'',url};
  try{if(navigator.share){await navigator.share(data);return;}}catch(e){if(e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(url);alert('Ссылка на новость скопирована.');}
  catch(e){prompt('Скопируй ссылку:',url);}
}
$('#newsLike')?.addEventListener('click',()=>voteNews('like'));
$('#newsDislike')?.addEventListener('click',()=>voteNews('dislike'));
$('#newsShare')?.addEventListener('click',shareNews);
document.addEventListener('click',e=>{if(e.target.closest('.news-modal-close'))closeNewsModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNewsModal();});
const newsModalEl=$('#newsModal'); newsModalEl?.addEventListener('click',e=>{if(e.target===newsModalEl)closeNewsModal();});
loadSiteData();


// Site loading screen
(function(){
  const loader=document.getElementById('siteLoader');
  const percent=document.getElementById('loaderPercent');
  const status=document.getElementById('loaderStatus');
  if(!loader)return;
  const staticAssets=['assets/hero-clean.jpg','assets/world-clean.jpg','assets/car-clean.jpg','assets/city-clean.jpg','assets/city-01.jpg','assets/street-01.jpg'];
  const setProgress=(n,label)=>{if(percent)percent.textContent=Math.round(n)+'%';if(status&&label)status.firstChild.nodeValue=label;};
  const preloadImage=src=>new Promise(resolve=>{
    const img=new Image();
    img.onload=img.onerror=()=>resolve();
    img.src=src;
  });
  const hideLoader=()=>{
    if(loader.classList.contains('done'))return;
    setProgress(100,'ГОТОВО');
    loader.classList.add('done');
    setTimeout(()=>loader.remove(),700);
  };
  const start=async()=>{
    let imageUrls=[...staticAssets];
    setProgress(5,'ЗАПУСК SPEEDFOR STREET');
    try{
      const [carsRes,newsRes]=await Promise.all([fetch('data/cars.json'),fetch('data/news.json')]);
      setProgress(15,'ПОЛУЧЕНИЕ ДАННЫХ');
      if(carsRes.ok){const data=await carsRes.json();data.forEach(x=>x.image&&imageUrls.push(x.image));}
      if(newsRes.ok){const data=await newsRes.json();data.forEach(x=>x.image&&imageUrls.push(x.image));}
    }catch(e){}
    imageUrls=[...new Set(imageUrls)];
    let loaded=0;
    setProgress(20,'ЗАГРУЗКА ИЗОБРАЖЕНИЙ');
    await Promise.all(imageUrls.map(async src=>{
      await preloadImage(src);
      loaded++;
      setProgress(20+Math.round((loaded/imageUrls.length)*70),'ЗАГРУЗКА ИЗОБРАЖЕНИЙ');
    }));
    setProgress(94,'ПОДГОТОВКА САЙТА');
    if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(e){}
    setProgress(98,'ПОЧТИ ГОТОВО');
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    hideLoader();
  };
  if(document.readyState==='complete')start();
  else window.addEventListener('load',start,{once:true});
  setTimeout(hideLoader,15000);
})();

