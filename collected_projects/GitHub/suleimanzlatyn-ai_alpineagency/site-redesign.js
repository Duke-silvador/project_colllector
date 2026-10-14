(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const page=location.pathname.split('/').pop()||'index.html',header=$('.header,.site-header'),nav=$('.navlinks,.nav-links'),menu=$('.menu-toggle');
if(header)header.classList.add('js-ready');
if(nav){$$('a',nav).forEach(a=>{if((a.getAttribute('href')||'').split('#')[0]===page){a.setAttribute('aria-current','page');a.classList.add('active')}});
 if(menu){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');menu.textContent=open?'×':'☰';document.body.classList.toggle('menu-open',open)});$$('a',nav).forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';document.body.classList.remove('menu-open')}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';document.body.classList.remove('menu-open')}})}
}
$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
if(header){const scroll=()=>header.classList.toggle('scrolled',window.scrollY>12);scroll();window.addEventListener('scroll',scroll,{passive:true})}
if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.1});$$('.reveal').forEach(el=>io.observe(el))}else $$('.reveal').forEach(el=>el.classList.add('visible'));
const serviceSearch=$('[data-service-search]'),serviceCategory=$('[data-service-category-filter]'),serviceCards=$('[data-service-card]');if(serviceCards.length&&(serviceSearch||serviceCategory)){const results=$('[data-service-results]');const applyFilters=()=>{const q=(serviceSearch?.value||'').trim().toLowerCase(),cat=serviceCategory?.value||'all';let n=0;serviceCards.forEach(card=>{const show=(!q||card.textContent.toLowerCase().includes(q))&&(cat==='all'||card.dataset.category===cat);card.hidden=!show;if(show)n++});if(results)results.textContent=n+' service area'+(n===1?'':'s')+' shown'};serviceSearch?.addEventListener('input',applyFilters);serviceCategory?.addEventListener('change',applyFilters);applyFilters()}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){$$('[data-tilt],.service-card,.feature-card,.sector-card').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='perspective(1100px) rotateY('+(x*2.6)+'deg) rotateX('+(-y*2.6)+'deg) translateY(-3px)'});el.addEventListener('pointerleave',()=>el.style.transform='')})}
$$('.hero,.page-hero').forEach(hero=>{if(!$('.hero-grid',hero)){const grid=document.createElement('div');grid.className='hero-grid';grid.setAttribute('aria-hidden','true');hero.prepend(grid)}});
if(!$('a.skip-link')){const skip=document.createElement('a');skip.className='skip-link';skip.href='#main';skip.textContent='Skip to content';document.body.prepend(skip)}
if(!$('#main')&&!$('main[id]')){const main=$('main');if(main)main.id='main'}
/* Reading progress and a back-to-top control are available on every page. */
const progress=document.createElement('div');progress.className='site-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
let top=$('.back-top,.site-back-top');if(!top){top=document.createElement('button');top.type='button';top.className='site-back-top';top.setAttribute('aria-label','Back to top');top.textContent='↑';document.body.appendChild(top)}top.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced?'auto':'smooth'}));
let busy=false;const updateScroll=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=(max>0?window.scrollY/max*100:0)+'%';top.classList.toggle('show',window.scrollY>500);busy=false};window.addEventListener('scroll',()=>{if(!busy){busy=true;requestAnimationFrame(updateScroll)}},{passive:true});updateScroll();
/* Global keyboard-accessible site search. */
const pages=[
['Home','index.html','Company overview, featured capabilities and contact'],
['Services','services.html','All service areas and capabilities'],
['Environmental services','environmental-services.html','Environmental strategy and compliance'],
['Environmental consultancy','environmental-consultancy.html','Environmental assessments and planning'],
['Infrastructure','infrastructure.html','Infrastructure and asset lifecycle'],
['Asset infrastructure','asset-infrastructure.html','Asset infrastructure services'],
['Asset maintenance','asset-maintenance.html','Planned maintenance and asset care'],
['Planned maintenance','planned-maintenance.html','Planned inspections and asset care'],
['Engineering maintenance','engineering-maintenance.html','Engineering and maintenance'],
['Water and drainage','water-drainage.html','Water systems, drainage and pollution control'],
['Drainage and environment','drainage-environment.html','Drainage and environmental concerns'],
['Water management','water-management.html','Water and wastewater management'],
['Fuel and energy','fuel-energy.html','Fuel systems and energy infrastructure'],
['Fuel infrastructure','fuel-infrastructure.html','Fuel asset support'],
['Energy infrastructure','energy-infrastructure.html','Energy systems and asset needs'],
['Energy transition','energy-transition.html','Energy transition and resilience'],
['Incident response','incident-response.html','Incident readiness and response'],
['Environmental response','environmental-response.html','Environmental incident support'],
['Emergency guidance','emergency.html','Urgent issue guidance and escalation'],
['Climate resilience','climate-resilience.html','Climate resilience and adaptation'],
['Contaminated land','contaminated-land.html','Site investigation and remediation'],
['Remediation','remediation.html','Remediation and restoration'],
['Health and safety','health-safety.html','Health and safety considerations'],
['Compliance','compliance.html','Compliance planning and documentation'],
['Compliance training','compliance-training.html','Training and awareness'],
['Industries','industries.html','Industries and operating environments'],
['Sectors','sectors.html','Sector-specific requirements'],
['Projects and experience','projects.html','Project approach and verifiable experience'],
['Our approach','approach.html','Process, scope and responsibilities'],
['About Alpine','about.html','Company information and principles'],
['Service network','network.html','Network and delivery coordination'],
['Insights','insights.html','Articles and practical insights'],
['Resources and FAQs','resources.html','Guides and common questions'],
['Resource checklist','resource-checklist.html','Prepare for an initial discussion'],
['Asset maintenance guide','asset-maintenance-guide.html','Asset maintenance planning guide'],
['Environmental risk guide','environmental-risk-guide.html','Environmental risk guide'],
['Climate resilience guide','climate-resilience-guide.html','Climate resilience guide'],
['FAQs','faqs.html','Frequently asked questions'],
['FAQ','faq.html','Questions about services'],
['Procurement','procurement.html','Procurement and supplier enquiries'],
['Request a quote','request-quote.html','Share your project requirement'],
['Contact','contact.html','Phone, email and enquiries'],
['Privacy','privacy.html','Privacy information']
];
const searchButton=document.createElement('button');searchButton.type='button';searchButton.className='site-search-trigger';searchButton.setAttribute('aria-label','Search website');searchButton.innerHTML='<span aria-hidden="true">⌕</span><span class="search-word">Search</span>';
const navHost=header&&$('.nav',header);if(navHost){if($('.nav-cta',navHost))$('.nav-cta',navHost).insertAdjacentElement('afterend',searchButton);else navHost.appendChild(searchButton)}
const overlay=document.createElement('div');overlay.className='site-search-overlay';overlay.hidden=true;overlay.innerHTML='<section class="site-search-dialog" role="dialog" aria-modal="true" aria-labelledby="site-search-title"><div class="site-search-top"><div><div class="eyebrow">Explore Alpine</div><h2 id="site-search-title">What are you looking for?</h2></div><button class="site-search-close" type="button" aria-label="Close search">×</button></div><label class="site-search-field"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" placeholder="Search services, industries, guides…" aria-label="Search pages"></label><div class="site-search-hint">Use keywords such as drainage, energy, compliance or maintenance.</div><div class="site-search-results" role="listbox" aria-label="Search results"></div><div class="site-search-footer"><span>↑ ↓ to navigate · Enter to open</span><span>ESC to close</span></div></section>';document.body.appendChild(overlay);
const searchInput=$('.site-search-field input',overlay),results=$('.site-search-results',overlay),closeSearch=$('.site-search-close',overlay);let chosen=-1,lastFocus=null;
function drawResults(){const q=searchInput.value.trim().toLowerCase();const found=pages.filter(p=>!q||(p[0]+' '+p[2]+' '+p[1]).toLowerCase().includes(q)).slice(0,12);chosen=found.length?0:-1;results.innerHTML=found.length?found.map((p,i)=>'<a role="option" aria-selected="'+(i===chosen)+'" class="site-search-result" href="'+p[1]+'"><span class="site-search-result-icon">↗</span><span><strong>'+p[0]+'</strong><small>'+p[2]+'</small></span><span class="site-search-result-arrow">↗</span></a>').join(''):'<div class="site-search-empty">No matching pages. Try a broader term or contact Alpine directly.</div>'}
function openSearch(){lastFocus=document.activeElement;overlay.hidden=false;document.body.classList.add('search-open');drawResults();searchInput.value='';drawResults();setTimeout(()=>searchInput.focus(),20)}
function closeSearchNow(){overlay.hidden=true;document.body.classList.remove('search-open');if(lastFocus&&lastFocus.focus)lastFocus.focus()}
searchButton.addEventListener('click',openSearch);closeSearch.addEventListener('click',closeSearchNow);overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearchNow()});searchInput.addEventListener('input',drawResults);searchInput.addEventListener('keydown',e=>{const items=$$('.site-search-result',results);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!items.length)return;chosen=(chosen+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((a,i)=>a.setAttribute('aria-selected',String(i===chosen)));items[chosen].scrollIntoView({block:'nearest'})}else if(e.key==='Enter'&&items[chosen]){location.href=items[chosen].getAttribute('href')}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'&&!overlay.hidden)closeSearchNow()});
/* Contact forms prepare an email rather than pretending to submit to a backend. */
$('form[data-email-form],form[data-mailto-form],form[data-mailto],form[data-enquiry-form],form#enquiry-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form),lines=[];data.forEach((v,k)=>lines.push(k+': '+v));const subject=encodeURIComponent('Website enquiry — Alpine Agencies'),body=encodeURIComponent(lines.join('\n'));location.href='mailto:ops@alpineagencies.co.ke?subject='+subject+'&body='+body;const status=$('[data-form-status]',form)||$('[role=status]',form);if(status)status.textContent='Your email app should open with your enquiry prepared. Please send it to complete submission.'}));

/* Service finder: send the visitor to the chosen dedicated page. */
$('form[data-service-finder]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const select=$('select',form),status=$('[data-finder-result]',form);if(!select||!select.value){if(status)status.textContent='Choose a service area to continue.';return}if(status)status.textContent='Opening the selected service page…';location.href=select.value}));
/* Accessible dropdown navigation: works with mouse, touch and keyboard. */
$$('.navdrop>button').forEach(button=>{button.addEventListener('click',e=>{e.preventDefault();const group=button.closest('.navdrop'),open=group.classList.toggle('open');button.setAttribute('aria-expanded',String(open))});button.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();button.closest('.navdrop').classList.add('open');button.setAttribute('aria-expanded','true');const first=$('a',button.nextElementSibling);if(first)first.focus()}})});document.addEventListener('click',e=>{if(!e.target.closest('.navdrop'))$$('.navdrop.open').forEach(group=>{group.classList.remove('open');const b=$('button',group);if(b)b.setAttribute('aria-expanded','false')})});document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.navdrop.open').forEach(group=>{group.classList.remove('open');const b=$('button',group);if(b){b.setAttribute('aria-expanded','false');b.focus()}})});

/* Homepage service finder routes directly to the selected dedicated page. */
const finder=$('[data-service-finder]');if(finder)finder.addEventListener('submit',e=>{e.preventDefault();const select=$('select',finder),status=$('[data-finder-result]',finder);if(select&&select.value){if(status)status.textContent='Opening your selected service area…';location.href=select.value}else if(status)status.textContent='Choose a topic first to find the most relevant page.'});

/* Premium UX details: reading progress, back-to-top and accessible FAQ accordions */
const progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
const topButton=document.createElement('button');topButton.className='back-top';topButton.type='button';topButton.setAttribute('aria-label','Back to top');topButton.textContent='↑';document.body.appendChild(topButton);
let rafLock=false;const updateScroll=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';topButton.classList.toggle('show',scrollY>550);rafLock=false};addEventListener('scroll',()=>{if(!rafLock){requestAnimationFrame(updateScroll);rafLock=true}},{passive:true});updateScroll();topButton.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
$$('[data-faq-toggle],.faq-trigger').forEach(button=>{const id=button.getAttribute('aria-controls')||button.dataset.target;if(!id)return;const panel=document.getElementById(id);if(!panel)return;button.setAttribute('aria-expanded',String(!panel.hidden));button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));panel.hidden=!open;const mark=button.querySelector('[data-faq-sign]');if(mark)mark.textContent=open?'−':'+'})});
$$('[data-checklist]').forEach(list=>{const inputs=$$('input[type=checkbox]',list),bar=$('[data-check-progress]',list),count=$('[data-check-count]',list);const refresh=()=>{const n=inputs.filter(i=>i.checked).length;if(bar){if(bar.tagName==='PROGRESS'){bar.max=inputs.length||1;bar.value=n}else bar.style.width=(inputs.length?n/inputs.length*100:0)+'%'}if(count)count.textContent=n+' of '+inputs.length+' completed'};inputs.forEach(i=>i.addEventListener('change',refresh));refresh()});


/* Premium interactions: reading progress, card depth, hero parallax and navigation polish */
(()=> {
 const doc=document,win=window;
 if(!doc.querySelector('.reading-progress')){const bar=doc.createElement('div');bar.className='reading-progress';bar.setAttribute('aria-hidden','true');doc.body.prepend(bar)}
 const progress=doc.querySelector('.reading-progress');
 const updateProgress=()=>{const max=doc.documentElement.scrollHeight-win.innerHeight;progress.style.width=(max>0?Math.min(100,win.scrollY/max*100):0)+'%';const top=doc.querySelector('[data-top],.back-top');if(top)top.classList.toggle('show',win.scrollY>450)};
 win.addEventListener('scroll',updateProgress,{passive:true});updateProgress();
 const reduce=win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduce&&win.matchMedia('(pointer:fine)').matches){
  doc.querySelectorAll('.service-card,.visual-card,.alpine-image-tile,.feature-tile').forEach(card=>{
   card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.transform='perspective(900px) rotateX('+((.5-y)*3)+'deg) rotateY('+((x-.5)*4)+'deg) translateY(-3px)'});
   card.addEventListener('pointerleave',()=>{card.style.transform=''});
  });
 }
 doc.querySelectorAll('[data-top],.back-top').forEach(b=>b.addEventListener('click',()=>win.scrollTo({top:0,behavior:reduce?'auto':'smooth'})));
 doc.querySelectorAll('[data-year]').forEach(el=>el.textContent=String(new Date().getFullYear()));
 doc.querySelectorAll('[data-count-to]').forEach(el=>{
  const target=Number(el.dataset.countTo||0);if(!Number.isFinite(target))return;
  const start=()=>{const t0=performance.now(),duration=1100;const tick=t=>{const p=Math.min(1,(t-t0)/duration);el.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)};
  if('IntersectionObserver'in win){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){start();io.disconnect()}},{threshold:.5});io.observe(el)}else el.textContent=String(target);
 });
 doc.querySelectorAll('.hero').forEach(hero=>{if(reduce)return;hero.addEventListener('pointermove',e=>{if(!win.matchMedia('(pointer:fine)').matches)return;const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;const orb=hero.querySelector('.hero-orb');if(orb)orb.style.transform='translate3d('+(x*15)+'px,'+(y*12)+'px,0)'})});

/* Premium interactive tools: checklists, accessible FAQs and guided project brief. */
document.querySelectorAll('[data-faq-toggle]').forEach(btn=>btn.addEventListener('click',()=>{const target=document.getElementById(btn.getAttribute('aria-controls'));const open=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',String(open));const sign=btn.querySelector('[data-faq-sign]');if(sign)sign.textContent=open?'−':'+';if(target)target.hidden=!open}));
document.querySelectorAll('[data-faq-filter]').forEach(input=>input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();document.querySelectorAll('[data-faq-item]').forEach(item=>item.hidden=!item.textContent.toLowerCase().includes(q))}));
document.querySelectorAll('[data-checklist]').forEach(box=>{const items=[...box.querySelectorAll('input[type="checkbox"]')],count=document.querySelector('[data-check-count]'),progress=document.querySelector('[data-check-progress]');const update=()=>{const done=items.filter(i=>i.checked).length;if(count)count.textContent=done+' / '+items.length;if(progress)progress.value=done};items.forEach(i=>i.addEventListener('change',update));update();const download=document.querySelector('[data-check-download]');if(download)download.addEventListener('click',()=>{const lines=['ALPINE AGENCIES — SITE READINESS CHECKLIST','Completed: '+items.filter(i=>i.checked).length+' of '+items.length,'',...items.map(i=>(i.checked?'[x] ':'[ ] ')+((i.closest('label')||i.parentElement).innerText||i.value).replace(/\s+/g,' ').trim())];const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='alpine-site-readiness-checklist.txt';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)})});
document.querySelectorAll('[data-planner-form]').forEach(form=>{const steps=[...form.querySelectorAll('[data-wizard-step]')],bars=[...form.querySelectorAll('[data-wizard-progress] span')],status=form.querySelector('[data-planner-status]'),number=form.querySelector('[data-step-number]');let current=0;const show=()=>{steps.forEach((s,i)=>s.hidden=i!==current);bars.forEach((b,i)=>b.classList.toggle('active',i<=current));if(number)number.textContent=String(current+1);const back=form.querySelector('[data-wizard-back]');if(back)back.hidden=current===0;const next=form.querySelector('[data-wizard-next]');if(next)next.hidden=current===steps.length-1;const submit=form.querySelector('[data-wizard-submit]');if(submit)submit.hidden=current!==steps.length-1};show();form.querySelectorAll('[data-wizard-next]').forEach(b=>b.addEventListener('click',()=>{const bad=[...steps[current].querySelectorAll('[required]')].find(el=>!el.checkValidity());if(bad){bad.reportValidity();return}current=Math.min(current+1,steps.length-1);show();if(status)status.textContent='';form.scrollIntoView({behavior:'smooth',block:'start'})}));form.querySelectorAll('[data-wizard-back]').forEach(b=>b.addEventListener('click',()=>{current=Math.max(0,current-1);show()}));form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const d=new FormData(form),g=k=>(d.get(k)||'Not provided').toString().trim();const subject=encodeURIComponent('Project brief — '+g('service'));const body=encodeURIComponent('PROJECT BRIEF\n\nOrganisation: '+g('organisation')+'\nContact name: '+g('name')+'\nEmail: '+g('email')+'\nPhone: '+g('phone')+'\nLocation: '+g('location')+'\nSector: '+g('sector')+'\nService area: '+g('service')+'\nTiming: '+g('timing')+'\n\nProject details:\n'+g('details')+'\n\nPrepared on the Alpine Agencies website.');if(status)status.textContent='Your email app should open with the project brief prepared. Send it there to complete the enquiry.';location.href='mailto:ops@alpineagencies.co.ke?subject='+subject+'&body='+body})});
/* Export the interactive site-readiness checklist without uploading user data. */
$$('[data-checklist] [data-check-download]').forEach(button=>button.addEventListener('click',()=>{const box=button.closest('[data-checklist]');if(!box)return;const rows=$$('input[type=checkbox]',box).map(input=>{const label=input.closest('label')||input.parentElement;return (input.checked?'[x] ':'[ ] ')+(label?label.innerText.replace(/\s+/g,' ').trim():input.value)});const blob=new Blob(['ALPINE AGENCIES — SITE READINESS CHECKLIST\n\n'+rows.join('\n')+'\n\nPlanning aid only. This is not a compliance certificate.'],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='alpine-site-readiness-checklist.txt';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}));

const searchDialog=$('.search-dialog'),searchInput=$('[data-site-search]'),searchResults=$('[data-search-results]');
$('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{if(searchDialog&&typeof searchDialog.showModal==='function'){searchDialog.showModal();setTimeout(()=>searchInput&&searchInput.focus(),40)}}));
$('[data-close-search]').forEach(b=>b.addEventListener('click',()=>searchDialog&&searchDialog.close()));
if(searchInput&&searchResults){const rows=$('a',searchResults);searchInput.addEventListener('input',()=>{const q=searchInput.value.trim().toLowerCase();let n=0;rows.forEach(a=>{const show=!q||(a.textContent+' '+(a.dataset.keywords||'')).toLowerCase().includes(q);a.hidden=!show;if(show)n++});let empty=$('.search-empty',searchResults);if(!empty){empty=document.createElement('p');empty.className='search-empty';empty.textContent='No matching pages. Try a broader search.';searchResults.appendChild(empty)}empty.hidden=n>0})}
$('[data-close-search]').forEach(b=>b.addEventListener('click',()=>searchDialog?.close()));
})();