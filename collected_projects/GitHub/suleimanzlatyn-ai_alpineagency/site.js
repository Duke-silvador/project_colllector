(function(){
  const menu=document.querySelector('.menu,.menu-toggle');
  const nav=document.querySelector('.navlinks,.nav-links,.links');
  if(menu&&nav){
    menu.setAttribute('aria-expanded','false');
    menu.addEventListener('click',function(e){
      e.preventDefault();
      const open=!nav.classList.contains('is-open');
      nav.classList.toggle('is-open',open);
      menu.setAttribute('aria-expanded',String(open));
      menu.setAttribute('aria-label',open?'Close menu':'Open menu');
      menu.textContent=open?'×':'☰';
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','Open menu');menu.textContent='☰';
    }));
    document.addEventListener('click',e=>{
      if(!nav.contains(e.target)&&!menu.contains(e.target)){
        nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');
        menu.setAttribute('aria-label','Open menu');menu.textContent='☰';
      }
    });
  }
  const path=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.navlinks a,.nav-links a,.links a').forEach(a=>{
    const target=(a.getAttribute('href')||'').split('#')[0];
    if(target===path)a.setAttribute('aria-current','page');
  });
  const obs='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}
  }),{threshold:.12}):null;
  document.querySelectorAll('.reveal').forEach(el=>obs?obs.observe(el):el.classList.add('in'));
  const form=document.querySelector('[data-enquiry-form]');
  if(form)form.addEventListener('submit',e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const d=new FormData(form);
    const msg=['Alpine Agencies enquiry','Name: '+(d.get('name')||''),'Organisation: '+(d.get('organisation')||'Not provided'),'Email: '+(d.get('email')||''),'Phone: '+(d.get('phone')||'Not provided'),'Service: '+(d.get('service')||'General enquiry'),'Message: '+(d.get('message')||'')].join('\n');
    location.href='https://wa.me/254721449727?text='+encodeURIComponent(msg);
  });
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();