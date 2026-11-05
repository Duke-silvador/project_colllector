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