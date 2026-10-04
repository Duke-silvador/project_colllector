'use strict';
/* ENCOUNTER V4.1 — icônes automatiques des 14 types de créatures D&D 5e.
   Les 28 PNG restent à la racine du dépôt pour conserver une structure plate.
   Ce module observe les rerendus de l'interface au lieu de remplacer les
   fonctions métier de l'application : il reste donc isolé et réversible. */
(()=>{
  const KEYS=['aberration','artificiel','bete','celeste','dragon','elementaire','fee','fielon','geant','humanoide','monstruosite','mort_vivant','plante','vase'];
  const ALIASES=[
    ['mort_vivant',['mort vivant','mort-vivant','undead']],
    ['aberration',['aberration']],
    ['artificiel',['artificiel','construct']],
    ['bete',['bete','beast']],
    ['celeste',['celeste','celestial']],
    ['dragon',['dragon']],
    ['elementaire',['elementaire','elemental']],
    ['fee',['fee','fey']],
    ['fielon',['fielon','fiend']],
    ['geant',['geant','giant']],
    ['humanoide',['humanoide','humanoid']],
    ['monstruosite',['monstruosite','monstrosity']],
    ['plante',['plante','plant']],
    ['vase',['vase','ooze']]
  ];

  function fold(value=''){
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function typeKey(value=''){
    const normalized=fold(value);if(!normalized)return null;
    for(const [key,aliases] of ALIASES){
      if(aliases.some(alias=>{const a=fold(alias);return normalized===a||normalized.startsWith(a+' ')||normalized.includes(' '+a+' ');}))return key;
    }
    return null;
  }
  function isPermanentBoss(model){return !!(model&&(model.isBoss||model.legendaryActions?.length));}
  function isEnemy(model,participant=null){
    if(!model||model.category!=='enemy')return false;
    return !participant||participant.kind==='enemy'||participant.kind==null;
  }
  function iconPath(model,boss=false){
    const key=typeKey(model?.type);return key?`creature-${boss?'boss':'standard'}-${key}.png`:'';
  }

  const api=Object.freeze({keys:Object.freeze([...KEYS]),typeKey,iconPath,isPermanentBoss});
  globalThis.ENCOUNTER_CREATURE_ICONS=api;
  if(typeof document==='undefined')return;

  function participantBoss(participant,model){
    if(participant&&typeof isBossParticipant==='function')return isBossParticipant(participant);
    return isPermanentBoss(model);
  }
  function createIcon(model,boss=false,className=''){
    const src=iconPath(model,boss);if(!src)return null;
    const img=document.createElement('img');
    img.src=src;img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';img.loading='eager';
    img.className=`creature-type-icon ${className}`.trim();
    img.dataset.creatureType=typeKey(model.type)||'';img.dataset.creatureVariant=boss?'boss':'standard';
    // En cas d'asset absent, conserver un élément masqué évite une boucle de
    // réinsertion avec le MutationObserver tout en laissant l'UI utilisable.
    img.addEventListener('error',()=>{img.hidden=true;img.dataset.assetError='1';},{once:true});
    return img;
  }
  function prependOnce(target,img){
    if(!target||!img)return;
    const existing=target.querySelector(':scope > .creature-type-icon');
    if(existing){
      if(existing.getAttribute('src')!==img.getAttribute('src'))existing.replaceWith(img);
      return;
    }
    target.classList.add('has-creature-icon');target.prepend(img);
  }
  function libraryMonster(card){
    const add=card.querySelector('[data-add-monster]'),edit=card.querySelector('[data-edit-monster]');
    const id=add?.dataset.addMonster||edit?.dataset.editMonster;
    return id&&typeof state!=='undefined'?state.monsters.find(m=>m.id===id):null;
  }
  function applyLibraryIcons(){
    if(typeof state==='undefined')return;
    document.querySelectorAll('#monsterLibrary .library-card').forEach(card=>{
      const model=libraryMonster(card);if(!isEnemy(model))return;
      prependOnce(card.querySelector('.library-title'),createIcon(model,isPermanentBoss(model),'library-creature-icon'));
    });
  }
  function applyPrepIcons(){
    if(typeof state==='undefined'||typeof modelFor!=='function')return;
    document.querySelectorAll('#prepParticipants .prep-row').forEach(row=>{
      const id=row.dataset.select||row.querySelector('[data-select]')?.dataset.select;
      const participant=state.encounter.participants.find(p=>p.id===id),model=participant&&modelFor(participant);
      if(!participant||(typeof isLair==='function'&&isLair(participant))||!isEnemy(model,participant))return;
      prependOnce(row.querySelector(':scope > div:first-child'),createIcon(model,participantBoss(participant,model),'prep-creature-icon'));
    });
  }
  function applyPreviewAndDetailIcons(){
    if(typeof selectedParticipant!=='function'||typeof modelFor!=='function')return;
    const participant=selectedParticipant(),model=participant&&modelFor(participant);
    if(!participant||(typeof isLair==='function'&&isLair(participant))||!isEnemy(model,participant))return;
    const iconBoss=participantBoss(participant,model);
    prependOnce(document.querySelector('#prepPreview .preview-head > div:first-child'),createIcon(model,iconBoss,'detail-creature-icon'));
    prependOnce(document.querySelector('#activeDetail .detail-header > div:first-child'),createIcon(model,iconBoss,'detail-creature-icon'));
  }
  function applyCombatIcons(){
    if(typeof state==='undefined'||typeof modelFor!=='function')return;
    document.querySelectorAll('#combatList [data-row-id]').forEach(row=>{
      const participant=state.encounter.participants.find(p=>p.id===row.dataset.rowId),model=participant&&modelFor(participant);
      if(!participant||(typeof isLair==='function'&&isLair(participant))||!isEnemy(model,participant))return;
      prependOnce(row.querySelector('.table-name'),createIcon(model,participantBoss(participant,model),'combat-creature-icon'));
    });
    // Fallback pour l'ancien rendu de carte si le mode Table est désactivé.
    document.querySelectorAll('#combatList .combat-card:not([data-row-id])').forEach(card=>{
      const trigger=card.querySelector('[data-select],[data-multi]'),id=trigger?.dataset.select||trigger?.dataset.multi;
      const participant=id&&state.encounter.participants.find(p=>p.id===id),model=participant&&modelFor(participant);
      if(!participant||(typeof isLair==='function'&&isLair(participant))||!isEnemy(model,participant))return;
      prependOnce(card.querySelector('.combat-ident'),createIcon(model,participantBoss(participant,model),'combat-creature-icon'));
    });
  }
  function applyInitiativeIcons(){
    if(typeof state==='undefined'||typeof modelFor!=='function')return;
    document.querySelectorAll('#initiativeRibbon .init-chip').forEach(chip=>{
      const participant=state.encounter.participants.find(p=>p.id===chip.dataset.select),model=participant&&modelFor(participant);
      if(!participant||(typeof isLair==='function'&&isLair(participant))||!isEnemy(model,participant))return;
      prependOnce(chip,createIcon(model,participantBoss(participant,model),'initiative-creature-icon'));
    });
  }
  function applyAll(){applyLibraryIcons();applyPrepIcons();applyPreviewAndDetailIcons();applyCombatIcons();applyInitiativeIcons();}

  let scheduled=false;
  function scheduleApply(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;applyAll();});
  }
  const observer=new MutationObserver(scheduleApply);
  observer.observe(document.body,{childList:true,subtree:true});
  scheduleApply();
})();
