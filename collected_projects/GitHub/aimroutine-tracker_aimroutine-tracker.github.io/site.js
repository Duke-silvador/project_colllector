(function(){
  function setLang(v){
    document.documentElement.lang=v;
    try { localStorage.setItem('aimroutine_site_lang',v); } catch(e) {}
    document.querySelectorAll('[data-switch-lang]').forEach(b=>{
       b.setAttribute('aria-label',v==='en'?'Switch to French':'Passer en anglais');
       b.textContent=v==='en'?'FR':'EN';
    });
  }
  // Honor the saved choice; otherwise use the visitor's browser language.
  let preferred = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  try { preferred = localStorage.getItem('aimroutine_site_lang') || preferred; } catch(e) {}
  setLang(preferred==='fr'?'fr':'en');
  document.querySelectorAll('[data-switch-lang]').forEach(b=>b.addEventListener('click',()=>setLang(document.documentElement.lang==='en'?'fr':'en')));
})();

/* Public, illustrative rank-based routine preview.
   It does not use accounts, player data or Riot's APIs. */
(function(){
  const routines = {
    iron:{
      en:{title:"First-shot fundamentals",note:"Build crosshair discipline and stop before shooting. These are illustrative categories, not official recommendations.",exercises:["Crosshair placement","Stop-and-shoot control","VALORANT practice range"]},
      fr:{title:"Les bases du premier tir",note:"Travaille le placement du viseur et l'arrêt avant le tir. Ces exercices sont illustratifs, pas des recommandations officielles.",exercises:["Placement du viseur","Arrêt avant tir","Stand de tir VALORANT"]},
      times:["06m","06m","08m"],total:"20 MIN"
    },
    gold:{
      en:{title:"Precision and consistency",note:"Build controlled accuracy before adding speed. Exact scenarios depend on your available tools.",exercises:["Controlled flicks","Dynamic clicking","In-game transfer"]},
      fr:{title:"Précision et régularité",note:"Privilégie la précision contrôlée avant la vitesse. Les scénarios exacts dépendent des logiciels disponibles.",exercises:["Flicks contrôlés","Clicking dynamique","Transfert dans VALORANT"]},
      times:["08m","10m","12m"],total:"30 MIN"
    },
    immortal:{
      en:{title:"Advanced micro-corrections",note:"Focus on fine adjustments, timing and repeatability. Use your actual performance, not rank alone, to adapt difficulty.",exercises:["Fine aim corrections","Fast target reading","Controlled in-game duels"]},
      fr:{title:"Micro-corrections avancées",note:"Cible les ajustements fins, le timing et la régularité. Adapte la difficulté à tes résultats, pas uniquement au rang.",exercises:["Micro-corrections fines","Lecture rapide des cibles","Duels contrôlés en jeu"]},
      times:["10m","10m","15m"],total:"35 MIN"
    }
  };
  const buttons=[...document.querySelectorAll("[data-demo-rank]")];
  if(buttons.length){
    let selected=buttons.find(b=>b.getAttribute("aria-pressed")==="true")?.dataset.demoRank || "gold";
    function render(){
      const entry=routines[selected] || routines.gold;
      const lang=document.documentElement.lang==="fr"?"fr":"en";
      const title=document.querySelector("[data-routine-title]");
      const total=document.querySelector("[data-routine-total]");
      const note=document.querySelector("[data-routine-note]");
      if(title) title.textContent=entry[lang].title;
      if(total) total.textContent=entry.total;
      if(note) note.textContent=entry[lang].note;
      for(let i=0;i<3;i++){
        const t=document.querySelector('[data-exercise-title="'+i+'"]');
        const d=document.querySelector('[data-exercise-time="'+i+'"]');
        if(t)t.textContent=entry[lang].exercises[i];
        if(d)d.textContent=entry.times[i];
      }
      buttons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.demoRank===selected)));
    }
    buttons.forEach(b=>b.addEventListener("click",()=>{selected=b.dataset.demoRank;render()}));
    document.querySelectorAll("[data-switch-lang]").forEach(b=>b.addEventListener("click",render));
    render();
  }
  const menu=document.querySelector(".site31-mobile-nav, .v5-mobile-nav");
  if(menu){
    menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{menu.open=false}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")menu.open=false});
    document.addEventListener("click",e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
  }
})();


/* Training Insights: accessible client-side demo tabs; entirely fictional
 * presentation data, no Riot auth, APIs, cookies or network requests. */
(function(){
  const list=document.querySelector('.ti-tabs[role="tablist"]');
  if(!list) return;
  const tabs=Array.from(list.querySelectorAll('[role="tab"]'));
  function activate(index, focus){
    const normalized=(index+tabs.length)%tabs.length;
    tabs.forEach((tab,i)=>{
      const active=i===normalized;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      const panel=document.getElementById(tab.getAttribute('aria-controls'));
      if(panel) panel.hidden=!active;
    });
    if(focus) tabs[normalized].focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(index,false));
    tab.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){e.preventDefault();activate(index+1,true);}
      else if(e.key==='ArrowLeft'){e.preventDefault();activate(index-1,true);}
      else if(e.key==='Home'){e.preventDefault();activate(0,true);}
      else if(e.key==='End'){e.preventDefault();activate(tabs.length-1,true);}
    });
  });
  const initial=tabs.findIndex(x=>x.getAttribute('aria-selected')==='true');
  activate(initial<0?0:initial,false);
})();
