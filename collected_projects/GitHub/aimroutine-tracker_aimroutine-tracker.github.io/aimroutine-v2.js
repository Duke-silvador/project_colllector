/* AimRoutine Tracker V2 site navigation and local demonstration.
 * No data is sent or persisted. No external game login or API access. */
(function(){
 "use strict";
 const sidebar=document.getElementById("v8-sidebar");
 const openButton=document.getElementById("v8-open-menu");
 const backdrop=document.getElementById("v8-backdrop");
 const navLinks=[...document.querySelectorAll(".v8-side-link[data-v8-nav]")];
 const breadcrumb=document.querySelector("[data-v8-current-page]");
 const desktop=()=>window.matchMedia("(min-width: 921px)").matches;
 let lastFocused=null;
 function mobileMenu(open){
  if(!sidebar||!openButton||!backdrop)return;
  const value=Boolean(open&&!desktop());
  sidebar.classList.toggle("is-open",value);
  backdrop.hidden=!value;
  openButton.setAttribute("aria-expanded",String(value));
  openButton.setAttribute("aria-label",document.documentElement.lang==="fr"?(value?"Fermer le menu":"Ouvrir le menu"):(value?"Close menu":"Open menu"));
  document.body.classList.toggle("v8-menu-open",value);
  if(value){
   lastFocused=document.activeElement;
   sidebar.querySelector(".v8-side-link")?.focus({preventScroll:true});
  }else if(lastFocused&&document.activeElement?.closest(".v8-sidebar")){
   lastFocused.focus({preventScroll:true});
  }
 }
 openButton?.addEventListener("click",()=>mobileMenu(!sidebar?.classList.contains("is-open")));
 backdrop?.addEventListener("click",()=>mobileMenu(false));
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&sidebar?.classList.contains("is-open"))mobileMenu(false);
  if(e.key==="Tab"&&sidebar?.classList.contains("is-open")){
    const focusable=[...sidebar.querySelectorAll('a[href],button:not([disabled])')];
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 });
 window.matchMedia("(min-width: 921px)").addEventListener("change",()=>mobileMenu(false));
 document.querySelectorAll(".v8-sidebar a[href^='#']").forEach(a=>a.addEventListener("click",()=>{
   const dest=a.getAttribute("href")?.slice(1);
   if(dest)setActive(dest);
   mobileMenu(false);
 }));
 const lang=()=>document.documentElement.lang==="fr"?"fr":"en";
 const labelFor=link=>link.querySelector("."+lang())?.textContent.trim()||link.textContent.trim();
 function setActive(section){
  const current=navLinks.find(x=>x.dataset.v8Nav===section)||navLinks[0];
  navLinks.forEach(link=>{
    const match=link===current;
    link.classList.toggle("is-current",match);
    if(match)link.setAttribute("aria-current","location");
    else link.removeAttribute("aria-current");
  });
  if(breadcrumb)breadcrumb.textContent=labelFor(current);
 }
 function syncHash(){let section=decodeURIComponent(location.hash.replace(/^#/,""));const c=navLinks.find(a=>a.dataset.v8Nav===section);if(c)setActive(section)}
 window.addEventListener("hashchange",syncHash);
 syncHash();
 const dateElement=document.querySelector("[data-v8-date]");
 if(dateElement){
   try{
     const formatted=new Intl.DateTimeFormat(lang()==="fr"?"fr-FR":"en-US",{day:"numeric",month:"long"}).format(new Date());
     dateElement.textContent=formatted;
   }catch(_e){}
 }
 // Result form affects only the visible, temporary demonstration counters.
 const dialog=document.getElementById("v8-result-dialog");
 const form=document.getElementById("v8-result-form");
 const stat=k=>document.querySelector('[data-v8-stat="'+k+'"]');
 const desc=k=>document.querySelector('[data-v8-stat-description="'+k+'"]');
 const progress=document.querySelector("[data-v8-stat-progress]");
 const sample={minutes:0,sessions:0,days:0};
 function renderSample(){
  const fr=lang()==="fr";
  if(stat("week"))stat("week").textContent=sample.minutes+" min";
  if(stat("days"))stat("days").textContent=sample.days+" / 3";
  if(stat("sessions"))stat("sessions").textContent=String(sample.sessions);
  if(progress)progress.style.width=Math.min(100,100*sample.minutes/180)+"%";
  const note=desc("sessions");
  if(note){
   note.textContent=sample.sessions>0?(fr?sample.sessions+" résultat(s) fictif(s), non enregistré(s)":sample.sessions+" fictional result(s), not saved"):(fr?"Aucun résultat ajouté":"No results added");
  }
  const week=desc("week");
  if(week)week.textContent=fr?"Objectif : 180 min":"Goal: 180 min";
  const days=desc("days");
  if(days)days.textContent=fr?"Exemple temporaire, cette page uniquement":"Temporary example, this page only";
  if(breadcrumb){
    const section=navLinks.find(x=>x.classList.contains("is-current"))?.dataset.v8Nav||"dashboard";
    setActive(section);
  }
  if(dateElement)try{dateElement.textContent=new Intl.DateTimeFormat(fr?"fr-FR":"en-US",{day:"numeric",month:"long"}).format(new Date())}catch(_e){}
 }
 function showResult(){
  if(!dialog)return;
  if(typeof dialog.showModal==="function"&&!dialog.open)dialog.showModal();
  else dialog.setAttribute("open","");
  dialog.querySelector('input[name="minutes"]')?.focus();
 }
 function closeResult(){
  if(!dialog)return;
  if(typeof dialog.close==="function"&&dialog.open)dialog.close();
  else dialog.removeAttribute("open");
 }
 document.querySelectorAll("[data-v8-open-result]").forEach(b=>b.addEventListener("click",showResult));
 document.querySelectorAll("[data-v8-close-result]").forEach(b=>b.addEventListener("click",closeResult));
 dialog?.addEventListener("click",e=>{if(e.target===dialog)closeResult()});
 form?.addEventListener("submit",e=>{
  e.preventDefault();
  const input=form.elements.namedItem("minutes");
  const amount=Number(input?.value);
  if(!Number.isFinite(amount)||amount<1||amount>180){
   input?.reportValidity();
   return;
  }
  sample.minutes+=Math.round(amount);
  sample.sessions+=1;
  sample.days=1; // Entries are made on one simulated day, not invented dates.
  renderSample();
  closeResult();
 });
 document.querySelectorAll("[data-switch-lang]").forEach(b=>b.addEventListener("click",()=>{
   // Registered after the bilingual language script, so the document language is updated.
   const section=navLinks.find(x=>x.classList.contains("is-current"))?.dataset.v8Nav||"dashboard";
   setActive(section);
   mobileMenu(false);
   renderSample();
 }));
 document.querySelectorAll('.v8-side-link[href^="#"]').forEach(link=>link.addEventListener("click",()=>setActive(link.dataset.v8Nav)));
 // Accessibility: no fake controls, any menu/link leads to a real section.
})();
