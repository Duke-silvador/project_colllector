/* AimRoutine V2 look and optional explanations, scoped exclusively to the
   Training Insights demonstration. Nothing touches the marketing homepage. */
(function(){
  "use strict";
  const root=document.querySelector(".ti-section.ti-v2-mode");
  if(!root)return;
  const pick=(selector)=>root.querySelector(selector);
  const language=()=>document.documentElement.lang==="fr"?"fr":"en";
  const label=(en,fr)=>language()==="fr"?fr:en;
  const data={
    discovery:{week:"2h 10",days:"03 / 7",sessions:"06"},
    balanced:{week:"5h 20",days:"05 / 7",sessions:"12"},
    advanced:{week:"8h 15",days:"06 / 7",sessions:"18"}
  };
  const explain={
    week:{
      en:["This week · example","This card shows total practice time in a fictional week, not hours spent in VALORANT matches. The value changes with the selected demonstration profile."],
      fr:["Cette semaine · exemple","Cette carte affiche le temps consacré aux exercices pendant une semaine fictive, pas le temps de partie VALORANT. La valeur change selon le profil de démonstration."]
    },
    days:{
      en:["Practice days · example","This is the number of separate days with training. Multiple practice sessions on the same day still count as a single day. This is simulated, not read from your calendar."],
      fr:["Jours pratiqués · exemple","Nombre de jours distincts avec un entraînement. Plusieurs séances le même jour ne valent qu'un jour pratiqué. C'est une simulation, pas ton calendrier."]
    },
    sessions:{
      en:["Completed sessions · example","A completed session represents a finished training block. This counter illustrates a local Windows-app statistic; the public site does not save workouts or create a player history."],
      fr:["Séances complètes · exemple","Une séance complète est un bloc d'entraînement terminé. Le compteur illustre une fonction du logiciel Windows ; le site public n'enregistre aucune séance."]
    },
    aim:{
      en:["Measured AIM level","AIM skill assessment is separate from your VALORANT competitive rank. Here it is deliberately marked 'Not evaluated', because no real performance test was carried out."],
      fr:["Niveau AIM mesuré","L'évaluation du niveau de visée doit être indépendante du rang compétitif VALORANT. Ici, elle reste « Non évalué » car aucun véritable test n'a été réalisé."]
    },
    welcome:{
      en:["Welcome section","The Windows dashboard introduces the player's goals, available aim trainers and training schedule. This public example displays no actual player's profile."],
      fr:["Bloc de bienvenue","L'accueil Windows présente les objectifs du joueur, les aim trainers disponibles et ses séances. Cette maquette publique n'affiche aucune donnée personnelle."]
    },
    notice:{
      en:["The demonstration notice","It separates fictional VALORANT match data from the real app's locally managed sessions. On this website, all displayed training and match figures are fictional, and Riot Sign On is not connected."],
      fr:["Bannière de démonstration","Elle distingue les données VALORANT fictives des séances conservées localement dans l'application Windows. Sur ce site, tous les chiffres sont simulés et Riot Sign On n'est pas connecté."]
    },
    hero:{
      en:["Training banner","This banner presents the purpose of AimRoutine: first-shot control, micro-adjustments and consistency. 'Start guided tour' explains the interactive training statistics below."],
      fr:["Bannière d'entraînement","Cette bannière présente l'objectif d'AimRoutine : premier tir, micro-corrections et régularité. Le bouton « Lancer la visite guidée » explique les statistiques interactives situées plus bas."]
    },
    programs:{
      en:["Training programs","In the planned app, routines can be adapted to Aim Lab, KovaaK's, Oblivity or VALORANT-only practice. This page links to a real interactive sample elsewhere on the landing page."],
      fr:["Programmes d'entraînement","Le logiciel prévoit des routines selon Aim Lab, KovaaK's, Oblivity ou VALORANT seul. Ce site mène à une démonstration interactive plus bas sur l'accueil."]
    }
  };
  const surface=document.createElement("div");
  surface.className="ti-v2-context";
  surface.hidden=true;
  surface.setAttribute("role","status");
  surface.innerHTML='<div class="ti-v2-context-top"><strong data-ti-v2-context-title></strong><button type="button" class="ti-v2-context-close" aria-label="Close explanation">×</button></div><p data-ti-v2-context-text></p>';
  const statSection=pick(".ti-v2-summary-stats");
  if(statSection)statSection.after(surface);
  function show(key,element){
    const entry=explain[key]||explain.welcome;
    const locale=language();
    pick("[data-ti-v2-context-title]").textContent=entry[locale][0];
    pick("[data-ti-v2-context-text]").textContent=entry[locale][1];
    surface.hidden=false;
    surface.dataset.tiV2Open=key;
    root.querySelectorAll(".ti-v2-selected").forEach(el=>el.classList.remove("ti-v2-selected"));
    element?.classList.add("ti-v2-selected");
  }
  function dismiss(){
    surface.hidden=true;
    root.querySelectorAll(".ti-v2-selected").forEach(el=>el.classList.remove("ti-v2-selected"));
  }
  pick(".ti-v2-context-close")?.addEventListener("click",dismiss);
  function helpable(node,id){
    if(!node)return;
    node.setAttribute("role","button");
    node.setAttribute("tabindex","0");
    node.classList.add("ti-v2-helpable");
    node.addEventListener("click",e=>{
      if(e.target.closest("button,a"))return;
      show(id,node);
    });
    node.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){
        if(e.target!==node)return;
        e.preventDefault();show(id,node);
      }
    });
  }
  root.querySelectorAll("[data-ti-v2-stat]").forEach(node=>{
    const id=node.dataset.tiV2Stat;
    const card=node.closest(".ti-v2-stat");
    helpable(card,id);
  });
  helpable(pick(".ti-v2-dashboard-intro > div"),"welcome");
  helpable(pick(".ti-v2-hero-label"),"hero");
  const select=()=>document.getElementById("ti-example-profile");
  function refresh(){
    const selected=select()?.value||"balanced";
    const values=data[selected]||data.balanced;
    for(const id of ["week","days","sessions"]){
      const el=pick('[data-ti-v2-stat="'+id+'"]');
      if(el)el.textContent=values[id];
    }
    if(!surface.hidden)show(surface.dataset.tiV2Open);
    pick(".ti-v2-context-close")?.setAttribute("aria-label",label("Close explanation","Fermer l'explication"));
  }
  pick("[data-ti-v2-focus-profile]")?.addEventListener("click",()=>{
    const el=select();
    if(el){el.focus();el.scrollIntoView({behavior:"smooth",block:"center"});}
  });
  function startTour(){dismiss();document.getElementById("ti-start-tour")?.click()}
  pick("[data-ti-v2-guide]")?.addEventListener("click",startTour);
  pick("[data-ti-v2-start-tour]")?.addEventListener("click",startTour);
  root.querySelectorAll("[data-ti-v2-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    const tab=document.getElementById("ti-tab-"+btn.dataset.tiV2Tab);
    tab?.click();tab?.focus();tab?.scrollIntoView({behavior:"smooth",block:"center"});
  }));
  const profile=select();
  profile?.addEventListener("change",refresh);
  document.getElementById("ti-reset-demo")?.addEventListener("click",refresh);
  document.querySelectorAll("[data-switch-lang]").forEach(btn=>btn.addEventListener("click",refresh));
  const contextCSS='.ti-v2-mode .ti-v2-context{margin:0 0 15px;border:1px solid #47737d;background:#18313f;padding:13px 17px;color:#c4e0ec}.ti-v2-mode .ti-v2-context[hidden]{display:none}.ti-v2-mode .ti-v2-context-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.ti-v2-mode .ti-v2-context-top strong{color:#e9fbff;font-size:13px}.ti-v2-mode .ti-v2-context p{color:#b5cddd;font-size:11px;line-height:1.7;margin:7px 0 0}.ti-v2-mode .ti-v2-context-close{background:#223c4b;border:1px solid #547486;color:#fff;font-size:18px;width:28px;height:28px;cursor:pointer}.ti-v2-mode .ti-v2-helpable{cursor:pointer}.ti-v2-mode .ti-v2-helpable:hover,.ti-v2-mode .ti-v2-helpable.ti-v2-selected{border-color:#ff7185;background-color:#20303f}.ti-v2-mode .ti-v2-helpable:focus-visible{outline:2px solid #ff7d91;outline-offset:2px}';
  const style=document.createElement("style");style.textContent=contextCSS;document.head.append(style);
  refresh();
})();
