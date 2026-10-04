'use strict';
/* V4 : présentation de table, moteur et sauvegardes V3 conservés. */
for(const id of ['btnEncounterManager','btnLibraryDrawer','btnJournalDrawer','btnCombatLock']){
  const button=document.getElementById(id);document.getElementById('moreMenu').prepend(button);
}
document.getElementById('btnModePrep').textContent='Préparer';
document.getElementById('btnModeCombat').textContent='Combat';
document.getElementById('btnMore').setAttribute('aria-label','Rencontres, bibliothèque et outils');
document.getElementById('btnUndo').setAttribute('aria-label','Annuler la dernière modification');
document.getElementById('btnCombatLock').setAttribute('aria-label','Verrouiller les modifications de structure');
let tableDetailOpen=false;
let lastTurnId=null;
let lastSelectedId=null;
function tableConditionIcon(name){
 const src=window.RPGConnectIcons?.condition?.(name)||'';
 return src?`<img class="table-condition-icon" src="${src}" alt="" aria-hidden="true">`:'';
}
function tableConditionPill(c,compact=false){return `<span class="table-condition${compact?' compact':''}" title="${esc(c.name)} · ${esc(conditionDurationLabel(c))}">${tableConditionIcon(c.name)}<span>${esc(c.name)}${compact?'':conditionShort(c)}</span></span>`;}
function tableConditionSummary(list,limit=3,compact=false){list=Array.isArray(list)?list:[];const shown=list.slice(0,limit),more=list.length-shown.length;return shown.map(c=>tableConditionPill(c,compact)).join('')+(more?`<span class="table-condition more" title="${more} état${more>1?'s':''} supplémentaire${more>1?'s':''}">+${more}</span>`:'');}

function tableRow(p,active){
 const lair=isLair(p),selected=p.id===selectedParticipant()?.id,chosen=ui.multiSelection.has(p.id),phase=currentPhase(p);
 const select=ui.multiMode&&!lair?`data-multi="${esc(p.id)}"`:`data-select="${esc(p.id)}"`;
 const economy=[['A',p.actionUsed],['B',p.bonusActionUsed],['R',p.reactionUsed]].map(([label,spent])=>`<span class="table-eco ${spent?'spent':''}" title="${label==='A'?'Action':label==='B'?'Action bonus':'Réaction'} ${spent?'utilisée':'disponible'}">${label}</span>`).join('');
 return `<article class="table-row combat-card ${targetClassFor(p)} ${flashClassFor(p)} ${p.id===active?.id?'active':''} ${selected?'selected':''} ${chosen?'multi-selected':''} ${p.hp<=0&&!lair?'down':''}" data-row-id="${esc(p.id)}">
 <button class="row-select" ${select} aria-label="${ui.multiMode?'Cibler':'Sélectionner'} ${esc(p.name)}" aria-pressed="${ui.multiMode?chosen:selected}"></button>
 <span class="table-init">${ui.multiMode&&!lair?(chosen?'☑':'☐'):p.initiative}</span>
 <div class="table-name"><strong>${esc(p.name)}</strong><div class="table-meta"><span class="table-role ${p.kind}">${lair?'REPAIRE':roleLabel(p)}</span>${p.id===active?.id?'<span class="playing-tag">À JOUER</span>':''}${!lair?economy:''}</div>
 ${(p.conditions.length||phase||p.hp<=0&&!lair)?`<div class="table-conditions">${p.hp<=0&&!lair?'<span class="table-condition zero">À 0 PV</span>':''}${phase?`<span class="table-condition">${esc(phase.name)}</span>`:''}${tableConditionSummary(p.conditions,2,true)}</div>`:''}</div>
 <div class="table-hp ${hpClass(p)}">${lair?'<small>Action<br>de repaire</small>':`<div><b>${p.hp}</b><small> / ${p.maxHp}</small></div>${p.tempHp?`<em>+${p.tempHp} temp.</em>`:''}<div class="table-health"><i style="width:${hpPct(p)}%"></i></div>`}</div>
 <div class="table-ac">${lair?'—':effectiveAc(p)}</div>
 <button class="row-sheet" data-table-sheet="${esc(p.id)}" aria-label="Ouvrir la fiche de ${esc(p.name)}">↗</button></article>`;
}
renderCombat=function(){
 const active=activeParticipant(),list=sortedParticipants();let previous=null;
 $('#combatList').innerHTML=list.length?list.map(p=>{
 let heading='';if(p.groupId&&p.groupId!==previous){const members=list.filter(q=>q.groupId===p.groupId);heading=`<div class="table-group"><span>${esc(p.baseName)} · ${members.filter(q=>q.hp>0).length}/${members.length} actifs</span>${ui.multiMode?`<button data-multi-group="${esc(p.groupId)}">Tout cibler</button>`:''}</div>`;}previous=p.groupId;return heading+tableRow(p,active);
 }).join(''):'<div class="table-empty"><span>⚔</span><h2>La table est prête.</h2><p>Ajoute tes personnages et adversaires pour commencer.</p><button id="btnEmptyLibrary" class="primary">+ Ajouter des combattants</button></div>';
};
const tableOriginalPrep=renderPrep;
renderPrep=function(){tableOriginalPrep();for(const row of $$('#prepParticipants .prep-row')){const p=state.encounter.participants.find(p=>p.id===row.dataset.select);if(p&&!isLair(p)&&!row.querySelector('[data-edit-participant]'))row.querySelector('[data-remove]')?.insertAdjacentHTML('beforebegin',`<button class="ghost small" data-edit-participant="${esc(p.id)}">Modifier</button>`);}};
const tableOriginalDetail=renderDetail;
renderDetail=function(){
 tableOriginalDetail();const p=selectedParticipant();if(!p)return;
 const eyebrow=$('#activeDetail .detail-header .eyebrow');if(eyebrow)eyebrow.textContent=p.id===activeParticipant()?.id?'À JOUER · FICHE':'CIBLE SÉLECTIONNÉE · FICHE';
 const head=$('#activeDetail .detail-header');if(head&&!isLair(p)&&!head.querySelector('[data-edit-participant]'))head.insertAdjacentHTML('beforeend',`<button class="ghost small" data-edit-participant="${esc(p.id)}" aria-label="Modifier ${esc(p.name)}">Modifier</button>`);
 const conditions=$('#activeDetail .detail-tabs');if(conditions&&p.conditions.length)conditions.insertAdjacentHTML('beforebegin',`<button class="detail-condition-summary" data-open-condition="${esc(p.id)}">${tableConditionSummary(p.conditions,5)}<span class="detail-condition-manage">Gérer</span></button>`);
};
const tableOriginalQuick=renderQuickbar;
renderQuickbar=function(){
 tableOriginalQuick();const ids=currentTargetIds(),amount=Number($('#quickAmount').value),valid=Number.isSafeInteger(amount)&&amount>0;
 const button=$('#btnQuickApply');button.disabled=!ids.length||!valid||!!ui.targeting;
 button.textContent=valid?`${ui.quickMode==='heal'?'Soigner +':'Infliger −'}${amount}`:'Appliquer';
 button.classList.toggle('heal',ui.quickMode==='heal');button.classList.toggle('damage-apply',ui.quickMode==='damage');
 $('#btnQuickState').disabled=!ids.length;$('#btnMobileDetail').disabled=!selectedParticipant();
 $('#btnQuickDamage').setAttribute('aria-pressed',String(ui.quickMode==='damage'));$('#btnQuickHeal').setAttribute('aria-pressed',String(ui.quickMode==='heal'));
 $('#quickBar').classList.toggle('healing',ui.quickMode==='heal');
};
const tableApply=applyQuickAmount;
applyQuickAmount=function(amount){
 amount=Number(amount);if(!Number.isSafeInteger(amount)||amount<=0)return toast('Entre un nombre entier supérieur à zéro.');
 if(ui.targeting)return toast('Termine ou annule le ciblage en cours.');
 if(!currentTargetIds().length)return toast('Sélectionne une cible.');
 tableApply(amount);$('#quickAmount').value='';renderQuickbar();
};
const tableOriginalRender=render;
render=function(){
 const list=$('#combatList'),detail=$('#activeDetail .detail-tab-body'),listTop=list.scrollTop,detailTop=detail?.scrollTop||0;
 tableOriginalRender();
 const active=activeParticipant();$('#tableReminders').innerHTML=active?renderTurnReminders(active,modelFor(active)):'';$('#nowPlaying').textContent=active?.name||'Aucun combattant';
 $('#btnReturnActive').disabled=!active;$('#btnNextTurn').disabled=!active||!!ui.targeting;
 $('#btnUndo').disabled=!undoStack.length;$('#btnUndo').title=undoStack.length?'Annuler la dernière modification':'Aucune modification à annuler';
 const lock=$('#btnCombatLock');lock.textContent=state.ui.locked?'🔒 Déverrouiller la structure':'🔓 Verrouiller la structure';
 const event=state.encounter.log[0];$('#lastEvent').textContent=event?`${event.time} · ${event.text}`:'Sélectionne une cible, saisis le montant, puis applique.';
 if(ui.targeting)tableDetailOpen=false;
 document.body.classList.toggle('table-detail-open',tableDetailOpen&&state.ui.mode==='combat');
 list.scrollTop=listTop;const body=$('#activeDetail .detail-tab-body');if(body)body.scrollTop=lastSelectedId===selectedParticipant()?.id?detailTop:0;lastSelectedId=selectedParticipant()?.id;
 if(active?.id!==lastTurnId&&state.ui.mode==='combat'){
  requestAnimationFrame(()=>{const row=[...list.querySelectorAll('[data-row-id]')].find(el=>el.dataset.rowId===active?.id);if(row){const top=row.offsetTop-list.offsetTop;if(top<list.scrollTop||top+row.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=Math.max(0,top-24);}});
 }
 lastTurnId=active?.id;
};
// Non-modal feedback: the persistent journal line retains the complete result.
showActionPopup=function(msg,title='Résolution'){
 const box=$('#actionPopup');$('#actionPopupTitle').textContent=title;$('#actionPopupText').textContent=msg;box.classList.add('show');clearTimeout(showActionPopup.t);showActionPopup.t=setTimeout(()=>box.classList.remove('show'),5000);
};
function openTableDetail(id){if(id)state.encounter.selectedId=id;tableDetailOpen=true;saveState();render();$('#btnCloseDetail').focus();}
$('#btnMobileDetail').addEventListener('click',()=>openTableDetail());
$('#btnCloseDetail').addEventListener('click',()=>{tableDetailOpen=false;render();$('#btnMobileDetail').focus();});
$('#btnReturnActive').addEventListener('click',()=>{const p=activeParticipant();if(!p)return;state.encounter.selectedId=p.id;ui.multiMode=false;ui.multiSelection.clear();saveState();render();const row=[...$('#combatList').querySelectorAll('[data-row-id]')].find(el=>el.dataset.rowId===p.id);row?.scrollIntoView({block:'nearest'});});
$('#quickAmount').addEventListener('input',renderQuickbar);
$('#quickAmount').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyQuickAmount(e.target.value);}});
$('#importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{$('#importText').value=await file.text();toast('Fichier chargé. Appuie sur Importer.');}catch{toast('Impossible de lire ce fichier.');}e.target.value='';});
addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.tableSheet){if(ui.targeting){resolveTargetSelection(button.dataset.tableSheet);return;}openTableDetail(button.dataset.tableSheet);}if(button.id==='btnEmptyLibrary')openDrawer('library');});
addEventListener('keydown',e=>{
 if(e.key==='Escape'){tableDetailOpen=false;closeDrawers();$('#moreMenu').classList.add('hidden');document.body.classList.remove('table-detail-open');}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,select,[contenteditable]')&&!document.querySelector('dialog[open]')){e.preventDefault();undo();}
});
addEventListener('click',e=>{if(!e.target.closest('#moreMenu,#btnMore'))$('#moreMenu').classList.add('hidden');});
// Measure actual occupied space, including safe-area insets and text wrapping.
if('ResizeObserver' in window){const obs=new ResizeObserver(()=>{for(const [selector,variable] of [['.topbar','--top-height'],['.roundbar','--round-height'],['#quickBar','--dock-height'],['#targetingBanner','--target-height']]){const el=$(selector);document.documentElement.style.setProperty(variable,el.getBoundingClientRect().height+'px');}});['.topbar','.roundbar','#quickBar','#targetingBanner'].forEach(s=>obs.observe($(s)));}
render();
window.RPGConnectIcons?.ready?.then(()=>{try{render()}catch{}}).catch(()=>{});
