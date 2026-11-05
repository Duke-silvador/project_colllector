/* AimRoutine Tracker — client-only illustrative routine builder.
   No Riot API, accounts, downloads, telemetry or persistence. */
(function () {
  "use strict";
  const root=document.querySelector("#routine");
  if(!root)return;
  const goal=root.querySelector("[data-exp-goal]");
  const duration=root.querySelector("[data-exp-duration]");
  const tool=root.querySelector("[data-exp-tool]");
  const pace=root.querySelector("[data-exp-pace]");
  const title=root.querySelector("[data-routine-title]");
  const total=root.querySelector("[data-routine-total]");
  const note=root.querySelector("[data-routine-note]");
  const rankButtons=[...root.querySelectorAll("[data-demo-rank]")];
  if(!goal||!duration||!tool||!pace||!title||!total||!note||rankButtons.length===0)return;
  const lang=()=>document.documentElement.lang==="fr"?"fr":"en";
  const dict={
    fr:{
      levels:{iron:"Fer",gold:"Or",immortal:"Immortel"},
      goals:{precision:"Précision et clicking",tracking:"Tracking et fluidité",switching:"Transitions de cible"},
      sources:{valorant:"VALORANT",aimlab:"Aim Lab",kovaaks:"KovaaK’s",oblivity:"Oblivity"},
      precision:{
        iron:["Placement du viseur","Arrêt et premier tir","Pratique au stand"],
        gold:["Flicks contrôlés","Clicking dynamique","Transfert en jeu"],
        immortal:["Micro-ajustements fins","Clics sur cibles mobiles","Duels contrôlés"]
      },
      tracking:{
        iron:["Suivi lent et régulier","Trajectoires simples","Suivi en jeu"],
        gold:["Tracking sur cible mobile","Contrôle de la fluidité","Application en jeu"],
        immortal:["Tracking avec changements","Stabilité sur cible rapide","Transfert en duel"]
      },
      switching:{
        iron:["Deux cibles successives","Arrêt précis du viseur","Transitions au stand"],
        gold:["Changements de cible","Lecture de cibles multiples","Transitions en jeu"],
        immortal:["Transitions rapides contrôlées","Réacquisition de la cible","Application en duel"]
      },
      note:(source,level,min,style)=>"Exemple "+(style==="warmup"?"d’échauffement":"d’entraînement")+" de "+min+" min pour "+level+" avec "+source+". Choisis manuellement des scénarios adaptés ; cette démo ne contrôle aucun logiciel et ne garantit aucun gain de rang.",
      title:(objective,level)=>objective+" · "+level
    },
    en:{
      levels:{iron:"Iron",gold:"Gold",immortal:"Immortal"},
      goals:{precision:"Precision & clicking",tracking:"Tracking & smoothness",switching:"Target switching"},
      sources:{valorant:"VALORANT",aimlab:"Aim Lab",kovaaks:"KovaaK’s",oblivity:"Oblivity"},
      precision:{
        iron:["Crosshair placement","Stop-and-shoot control","Practice range"],
        gold:["Controlled flicks","Dynamic clicking","In-game transfer"],
        immortal:["Fine micro-adjustments","Moving target clicks","Controlled duels"]
      },
      tracking:{
        iron:["Slow target following","Smooth basic paths","In-game tracking"],
        gold:["Moving target tracking","Smoothness control","In-game transfer"],
        immortal:["Direction change tracking","Fast target stability","Duel transfer"]
      },
      switching:{
        iron:["Switch between two targets","Controlled stopping","Range transitions"],
        gold:["Target switching","Multiple-target reading","In-game switching"],
        immortal:["Fast controlled switching","Target reacquisition","Duel transfer"]
      },
      note:(source,level,min,style)=>"Illustrative "+(style==="warmup"?"warm-up":"training")+" of "+min+" min for "+level+" using "+source+". Choose relevant scenarios manually; this demo does not control any software or guarantee rank gains.",
      title:(objective,level)=>objective+" · "+level
    }
  };
  function activeRank(){
    return rankButtons.find(x=>x.getAttribute("aria-pressed")==="true")?.dataset.demoRank||"gold";
  }
  function render(){
    const d=dict[lang()];
    root.querySelectorAll("option[data-"+lang()+"]").forEach(option=>{
      const translated=option.dataset[lang()];
      if(translated)option.textContent=translated;
    });
    const r=activeRank(),type=goal.value||"precision";
    const min=[15,30,45].includes(Number(duration.value))?Number(duration.value):30;
    const minutes=pace.value==="warmup"?(min===15?[3,5,7]:min===30?[7,10,13]:[10,15,20]):(min===15?[4,5,6]:min===30?[8,10,12]:[12,15,18]);
    const ex=(d[type]&&d[type][r])||d.precision.gold;
    title.textContent=d.title(d.goals[type],d.levels[r]);
    total.textContent=min+" MIN";
    for(let i=0;i<3;i++){
      const name=root.querySelector('[data-exercise-title="'+i+'"]');
      const time=root.querySelector('[data-exercise-time="'+i+'"]');
      if(name)name.textContent=ex[i];
      if(time)time.textContent=minutes[i]+"m";
    }
    note.textContent=d.note(d.sources[tool.value]||"VALORANT",d.levels[r],min,pace.value);
  }
  for(const control of [goal,duration,tool,pace]){
    control.addEventListener("change",render);
  }
  rankButtons.forEach(button=>button.addEventListener("click",render));
  document.querySelectorAll("[data-switch-lang]").forEach(button=>button.addEventListener("click",render));
  root.querySelector("[data-exp-reset]")?.addEventListener("click",()=>{
    goal.value="precision";
    duration.value="30";
    tool.value="valorant";
    pace.value="balanced";
    rankButtons.find(x=>x.dataset.demoRank==="gold")?.click();
    render();
  });
  render();
})();
