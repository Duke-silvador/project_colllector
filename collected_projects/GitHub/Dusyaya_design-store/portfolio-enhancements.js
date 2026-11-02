/* Portfolio-wide lightbox and consistent, accessible perspective galleries. */
(function(){
  const root=document.querySelector('main');
  if(!root)return;
  const overlay=document.createElement('div');
  overlay.className='portfolio-lightbox';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Просмотр изображения');
  overlay.innerHTML='<button class="portfolio-lightbox-close" type="button" aria-label="Закрыть">×</button><img alt="">';
  document.body.appendChild(overlay);
  const preview=overlay.querySelector('img');
  let lastFocus=null;
  function close(){overlay.classList.remove('is-open');document.body.classList.remove('lightbox-open');preview.removeAttribute('src');if(lastFocus&&lastFocus.focus)lastFocus.focus();}
  function open(img){lastFocus=document.activeElement;preview.src=img.currentSrc||img.src;preview.alt=img.alt||'Увеличенное изображение';overlay.classList.add('is-open');document.body.classList.add('lightbox-open');overlay.querySelector('button').focus();}
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.portfolio-lightbox-close'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))close();});
  root.addEventListener('click',event=>{
    const img=event.target.closest('.portfolio-zoomable');
    if(!img||!img.closest('.portfolio-perspective'))return;
    // Active image opens full screen; side images are selected by the carousel controls.
    if(!img.closest('.portfolio-active'))return;
  },true);
  root.querySelectorAll('img').forEach(img=>{
    if(img.closest('.sevstar-tv'))return;
    if(img.closest('.zin-book')||img.closest('.book-book')){img.addEventListener('dblclick',e=>{e.stopPropagation();open(img);});return;}
    img.classList.add('portfolio-zoomable');
    img.setAttribute('tabindex','0');img.setAttribute('role','button');img.setAttribute('aria-label',(img.alt||'Изображение')+' — увеличить');
    img.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();open(img);},true);
    img.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopImmediatePropagation();e.preventDefault();open(img);}},true);
  });
  window.PORTFOLIO_DECK_ENHANCED=true;
  const configs=[
    ['.dance-carousel','.dance-carousel-slide','.dance-carousel-prev','.dance-carousel-next','.dance-carousel-count'],
    ['.extra-carousel','.extra-slides img','.extra-prev','.extra-next','.extra-count'],
    ['.baker-carousel','.baker-slides img','.baker-prev','.baker-next','.baker-count'],
    ['.showcase-media.is-carousel','.showcase-slide',null,null,null]
  ];
  configs.forEach(([selector,slideSelector,prevSelector,nextSelector,countSelector])=>{
    root.querySelectorAll(selector).forEach(carousel=>{
      const slides=[...carousel.querySelectorAll(slideSelector)];
      if(slides.length<2)return;
      const isShowcase=carousel.matches('.showcase-media.is-carousel');
      carousel.classList.add('portfolio-perspective');
      if(isShowcase)carousel.classList.add('portfolio-showcase-deck');
      let active=0;
      let controls=carousel.querySelector('.portfolio-perspective-controls');
      if(!controls&&!prevSelector){
        controls=document.createElement('div');controls.className='portfolio-perspective-controls';
        controls.innerHTML='<button type="button" class="portfolio-perspective-prev" aria-label="Предыдущее изображение">←</button><span class="portfolio-perspective-count"></span><button type="button" class="portfolio-perspective-next" aria-label="Следующее изображение">→</button>';
        carousel.appendChild(controls);
      }
      const prev=prevSelector?carousel.querySelector(prevSelector):controls.querySelector('.portfolio-perspective-prev');
      const next=nextSelector?carousel.querySelector(nextSelector):controls.querySelector('.portfolio-perspective-next');
      const counter=countSelector?carousel.querySelector(countSelector):controls.querySelector('.portfolio-perspective-count');
      function show(n){
        active=(n+slides.length)%slides.length;
        slides.forEach((slide,i)=>{
          const distance=(i-active+slides.length)%slides.length;
          const offset=distance>slides.length/2?distance-slides.length:distance;
          slide.hidden=false;
          slide.classList.toggle('portfolio-active',offset===0);
          slide.classList.toggle('portfolio-offstage',Math.abs(offset)>1);
          slide.style.setProperty('--perspective-offset',offset);
          slide.style.zIndex=String(20-Math.abs(offset));
          slide.setAttribute('aria-hidden',String(Math.abs(offset)>1));
        });
        if(counter)counter.textContent=String(active+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
      }
      prev.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();show(active-1);},true);
      next.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();show(active+1);},true);
      carousel.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'||e.target.tagName==='IMG')return;if(e.key==='ArrowRight')show(active+1);if(e.key==='ArrowLeft')show(active-1);});
      show(0);
    });
  });
})();