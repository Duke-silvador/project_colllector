/* Bundled legacy interaction aimroutine-visual-v14.js */
/* AimRoutine V14 visual interactions: chapter navigation and sample timeline.
 * No APIs, accounts, persistent storage, or external requests. */
(function () {
  "use strict";
  const chapterLinks=[...document.querySelectorAll(".v14-chapters-links [data-v14-section]")];
  const chapters=chapterLinks.map(link=>({
    link,section:document.getElementById(link.dataset.v14Section)
  })).filter(item=>item.section);
  if(chapters.length){
    let scheduled=false;
    const paint=()=>{
      scheduled=false;
      const header=document.querySelector(".site31-header, .v5-header");
      const rail=document.querySelector(".v14-chapters");
      const cutoff=(header?.offsetHeight||0)+(rail?.offsetHeight||0)+52;
      let current=chapters[0];
      for(const candidate of chapters){
        if(candidate.section.getBoundingClientRect().top<=cutoff){
          current=candidate;
        } else break;
      }
      for(const item of chapters){
        if(item===current)item.link.setAttribute("aria-current","location");
        else item.link.removeAttribute("aria-current");
      }
    };
    const schedule=()=>{
      if(!scheduled){
        scheduled=true;
        window.requestAnimationFrame(paint);
      }
    };
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule,{passive:true});
    window.addEventListener("hashchange",schedule);
    schedule();
  }
  const root=document.getElementById("routine");
  if(!root)return;
  const dur=root.querySelector("[data-exp-duration]");
  const pace=root.querySelector("[data-exp-pace]");
  const total=root.querySelector("[data-v14-allocation]");
  const segments=[...root.querySelectorAll("[data-v14-part]")];
  const track=root.querySelector(".v14-timeline-track");
  if(!dur||!pace||!total||!track||segments.length!==3)return;
  function update(){
    const min=Number(dur.value)||30;
    const isWarmup=pace.value==="warmup";
    const splits=isWarmup?
      (min===15?[3,5,7]:min===30?[7,10,13]:[10,15,20]):
      (min===15?[4,5,6]:min===30?[8,10,12]:[12,15,18]);
    const fr=document.documentElement.lang==="fr";
    const labels=fr?["Exercice 1","Exercice 2","Exercice 3"]:["Drill 1","Drill 2","Drill 3"];
    const readable=splits.map((value,i)=>labels[i]+": "+value+" min").join(", ");
    for(let i=0;i<segments.length;i++){
      segments[i].style.flexGrow=String(splits[i]);
      segments[i].title=labels[i]+": "+splits[i]+" min";
    }
    total.textContent=min+" MIN";
    track.setAttribute("aria-label",(fr?"Répartition fictive de la séance : ":"Fictional session allocation: ")+readable);
  }
  dur.addEventListener("change",update);
  pace.addEventListener("change",update);
  root.querySelector("[data-exp-reset]")?.addEventListener("click",update);
  document.querySelectorAll("[data-switch-lang]").forEach(button=>button.addEventListener("click",update));
  update();
})();

/* Bundled legacy interaction aimroutine-visual-v15.js */
/* AimRoutine V15: small, honest product entry point. All controls only
   preconfigure the existing fictional routine demo. Nothing is persisted. */
(function(){
  "use strict";
  const root=document.getElementById("choose-focus");
  const routine=document.getElementById("routine");
  const select=document.getElementById("exp-goal");
  const buttons=root?[...root.querySelectorAll("[data-v15-focus]")]:[];
  if(!root||!routine||!select||!buttons.length)return;
  const allowed=new Set(["precision","tracking","switching"]);
  const feedback=document.createElement("p");
  feedback.className="v15-focus-confirm";
  feedback.hidden=true;
  feedback.setAttribute("role","status");
  root.appendChild(feedback);
  const labels={
    precision:{fr:"Précision du premier tir",en:"First-shot precision"},
    tracking:{fr:"Tracking et stabilité",en:"Tracking & stability"},
    switching:{fr:"Transitions entre cibles",en:"Target switching"}
  };
  const locale=()=>document.documentElement.lang==="fr"?"fr":"en";
  function choose(key){
    if(!allowed.has(key))return;
    select.value=key;
    select.dispatchEvent(new Event("change",{bubbles:true}));
    for(const b of buttons)b.setAttribute("aria-pressed",String(b.dataset.v15Focus===key));
    const l=labels[key][locale()];
    feedback.textContent=locale()==="fr"
      ? "Objectif « "+l+" » sélectionné dans la routine de démonstration."
      : "Goal “"+l+"” selected in the sample routine.";
    feedback.hidden=false;
    routine.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"start"
    });
  }
  for(const button of buttons){
    button.setAttribute("aria-pressed",String(button.dataset.v15Focus===select.value));
    button.addEventListener("click",()=>choose(button.dataset.v15Focus));
  }
  // Keep the visual selection in sync if a different goal is chosen in the
  // existing routine configurator instead of using the three cards.
  select.addEventListener("change",()=>{
    for(const b of buttons)b.setAttribute("aria-pressed",String(b.dataset.v15Focus===select.value));
  });
  document.querySelectorAll("[data-switch-lang]").forEach(b=>b.addEventListener("click",()=>{
    if(feedback.hidden)return;
    const key=select.value;
    if(!labels[key])return;
    const l=labels[key][locale()];
    feedback.textContent=locale()==="fr"
      ? "Objectif « "+l+" » sélectionné dans la routine de démonstration."
      : "Goal “"+l+"” selected in the sample routine.";
  }));
})();
/* V16 — accessible real-app gallery and user-controlled illustrated walkthrough.
 * No real account actions, no match data or third-party API requests. */
(function(){
 "use strict";
 const tabs=[...document.querySelectorAll("[data-v16-gallery]")];
 const gallery=document.getElementById("app-gallery");
 if(tabs.length&&gallery){
   const panels=tabs.map(tab=>document.getElementById("v16-gallery-"+tab.dataset.v16Gallery));
   const dots=[...gallery.querySelectorAll(".v16-gallery-dots span")];
   const expand=gallery.querySelector("[data-v16-expand]");
   const dialog=document.getElementById("v16-real-shot-dialog");
   let index=0;
   function show(i,focus){
     index=(i+tabs.length)%tabs.length;
     tabs.forEach((tab,j)=>{
       tab.setAttribute("aria-selected",String(j===index));
       tab.tabIndex=j===index?0:-1;
       if(panels[j])panels[j].hidden=j!==index;
       dots[j]?.classList.toggle("active",j===index);
     });
     if(expand)expand.hidden=!panels[index]?.querySelector('img.v16-real-shot');
     if(focus)tabs[index].focus();
   }
   tabs.forEach((tab,i)=>{
     tab.addEventListener("click",()=>show(i,false));
     tab.addEventListener("keydown",event=>{
       let next=null;
       if(event.key==="ArrowRight")next=i+1;
       else if(event.key==="ArrowLeft")next=i-1;
       else if(event.key==="Home")next=0;
       else if(event.key==="End")next=tabs.length-1;
       if(next!==null){event.preventDefault();show(next,true);}
     });
   });
   expand?.addEventListener("click",()=>{
     if(!dialog)return;
     const selected=panels[index]?.querySelector('img.v16-real-shot');
     const enlarged=dialog.querySelector('img');
     if(selected&&enlarged){enlarged.src=selected.src;enlarged.alt=selected.alt;}
     if(typeof dialog.showModal==="function")dialog.showModal();
     else dialog.setAttribute("open","");
   });
   dialog?.querySelector("[data-v16-close]")?.addEventListener("click",()=>dialog.close?.()||dialog.removeAttribute("open"));
   dialog?.addEventListener("click",event=>{
     if(event.target===dialog){dialog.close?.();dialog.removeAttribute("open");}
   });
   show(0,false);
 }
 const root=document.getElementById("product-tour");
 if(!root)return;
 const phase=root.querySelector("[data-v16-tour-phase]");
 const heading=root.querySelector("[data-v16-tour-heading]");
 const description=root.querySelector("[data-v16-tour-description]");
 const visual=root.querySelector("[data-v16-tour-visual]");
 const counter=root.querySelector("[data-v16-tour-counter]");
 const progress=root.querySelector("[data-v16-tour-progress]");
 const play=root.querySelector("[data-v16-tour-play]");
 const prev=root.querySelector("[data-v16-tour-prev]");
 const next=root.querySelector("[data-v16-tour-next]");
 const steps=[...root.querySelectorAll("[data-v16-tour-step]")];
 if(!phase||!heading||!description||!visual||!counter||!progress||!play||!prev||!next||!steps.length)return;
 const content={
  fr:[
   {phase:"01 / PROFIL JOUEUR",title:"Commence par ton niveau.",body:"Une séance adaptée part de ton rang et de ton temps disponible. Ici, le profil affiché est entièrement fictif.",
    html:'<div class="v16-tour-profile"><span class="v16-tour-avatar">A</span><div><strong>Profil fictif</strong><small>VALORANT · OR</small></div><span class="v16-tour-chip">30 MIN</span></div>'},
   {phase:"02 / OBJECTIF D’AIM",title:"Choisis ce que tu veux travailler.",body:"Précision, tracking ou transitions : chaque entraînement doit répondre à un objectif identifiable.",
    html:'<div class="v16-visual-tags"><span>⌖ Précision</span><span>◎ Tracking</span><span>↗ Switching</span></div>'},
   {phase:"03 / SÉANCE D’EXEMPLE",title:"Une séance claire, minute par minute.",body:"Une routine illustrative répartit le temps entre des catégories d’exercices. Elle ne contrôle aucun logiciel tiers.",
    html:'<div class="v16-visual-line"><b>01</b> Flicks contrôlés <span>08 min</span></div><div class="v16-visual-line"><b>02</b> Clicking dynamique <span>10 min</span></div><div class="v16-visual-line"><b>03</b> Transfert en jeu <span>12 min</span></div>'},
   {phase:"04 / BILAN FICTIF",title:"Comprends ce que tes séances racontent.",body:"Les graphiques montrent à quoi pourrait ressembler un suivi de progression. Aucun résultat réel n’est collecté.",
    html:'<div class="v16-fake-chart" aria-hidden="true"><i style="height:32%"></i><i style="height:42%"></i><i style="height:38%"></i><i style="height:57%"></i><i style="height:70%"></i><i style="height:63%"></i><i style="height:83%"></i></div>'}
  ],
  en:[
   {phase:"01 / PLAYER PROFILE",title:"Start with your level.",body:"A useful training session begins with your current rank and available time. The profile here is entirely fictional.",
    html:'<div class="v16-tour-profile"><span class="v16-tour-avatar">A</span><div><strong>Fictional profile</strong><small>VALORANT · GOLD</small></div><span class="v16-tour-chip">30 MIN</span></div>'},
   {phase:"02 / AIM GOAL",title:"Know what you want to practice.",body:"Precision, tracking or switching: each session is easier to understand when it serves a clear purpose.",
    html:'<div class="v16-visual-tags"><span>⌖ Precision</span><span>◎ Tracking</span><span>↗ Switching</span></div>'},
   {phase:"03 / SAMPLE SESSION",title:"A readable plan, minute by minute.",body:"An illustrative routine divides available time into exercise categories. It does not control third-party trainers.",
    html:'<div class="v16-visual-line"><b>01</b> Controlled flicks <span>08 min</span></div><div class="v16-visual-line"><b>02</b> Dynamic clicking <span>10 min</span></div><div class="v16-visual-line"><b>03</b> In-game transfer <span>12 min</span></div>'},
   {phase:"04 / FICTIONAL REPORT",title:"Understand what practice patterns mean.",body:"The charts illustrate how progress might be displayed. No actual training results are collected.",
    html:'<div class="v16-fake-chart" aria-hidden="true"><i style="height:32%"></i><i style="height:42%"></i><i style="height:38%"></i><i style="height:57%"></i><i style="height:70%"></i><i style="height:63%"></i><i style="height:83%"></i></div>'}
  ]
 };
 let selected=0,playing=false,timer=null;
 function locale(){return document.documentElement.lang==="fr"?"fr":"en";}
 function stop(){
   if(timer!==null){window.clearInterval(timer);timer=null;}
   playing=false;updatePlayLabel();
 }
 function updatePlayLabel(){
   const isFR=locale()==="fr";
   play.innerHTML=(playing?"❚❚ ":"▶ ")+'<span>'+(playing?(isFR?"Mettre en pause":"Pause"):(isFR?"Lancer la visite":"Play walkthrough"))+"</span>";
   play.setAttribute("aria-label",playing?(isFR?"Mettre la visite en pause":"Pause the walkthrough"):(isFR?"Lancer la visite guidée":"Play the walkthrough"));
 }
 function render(){
   const s=content[locale()][selected];
   phase.textContent=s.phase;heading.textContent=s.title;description.textContent=s.body;
   visual.innerHTML=s.html;
   counter.textContent=String(selected+1).padStart(2,"0")+" / "+String(content.fr.length).padStart(2,"0");
   progress.style.width=((selected+1)/content.fr.length*100)+"%";
   prev.disabled=selected===0;next.disabled=selected===content.fr.length-1;
   steps.forEach((b,i)=>{
     b.classList.toggle("active",i===selected);
     b.setAttribute("aria-current",i===selected?"step":"false");
   });
   updatePlayLabel();
 }
 function goto(i){
   if(i<0||i>=content.fr.length)return;
   selected=i;render();
 }
 function start(){
   if(selected===content.fr.length-1)selected=0;
   playing=true;render();
   timer=window.setInterval(()=>{
     if(selected===content.fr.length-1){stop();return;}
     selected+=1;render();
   },3900);
 }
 play.addEventListener("click",()=>{if(playing)stop();else start();});
 prev.addEventListener("click",()=>{stop();goto(selected-1);});
 next.addEventListener("click",()=>{stop();goto(selected+1);});
 steps.forEach((b,i)=>b.addEventListener("click",()=>{stop();goto(i);}));
 document.querySelectorAll("[data-switch-lang]").forEach(b=>b.addEventListener("click",render));
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
 render();
})();
