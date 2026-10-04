'use strict';

const STORAGE_KEY = 'encounter-console-v1'; // compatibilité V1/V2.x
const APP_VERSION = '4.1';
const BACKUP_KEY = 'encounter-console-backups-v3';
const BACKUP_INTERVAL = 5*60*1000;
const ABILITIES = ['FOR','DEX','CON','INT','SAG','CHA'];

const SKILLS = [
  {name:'Athlétisme',key:'athletisme',ability:'FOR'},{name:'Acrobaties',key:'acrobaties',ability:'DEX'},{name:'Escamotage',key:'escamotage',ability:'DEX'},{name:'Discrétion',key:'discretion',ability:'DEX'},
  {name:'Arcanes',key:'arcanes',ability:'INT'},{name:'Histoire',key:'histoire',ability:'INT'},{name:'Investigation',key:'investigation',ability:'INT'},{name:'Nature',key:'nature',ability:'INT'},{name:'Religion',key:'religion',ability:'INT'},
  {name:'Dressage',key:'dressage',ability:'SAG'},{name:'Intuition',key:'intuition',ability:'SAG'},{name:'Médecine',key:'medecine',ability:'SAG'},{name:'Perception',key:'perception',ability:'SAG'},{name:'Survie',key:'survie',ability:'SAG'},
  {name:'Intimidation',key:'intimidation',ability:'CHA'},{name:'Persuasion',key:'persuasion',ability:'CHA'},{name:'Représentation',key:'representation',ability:'CHA'},{name:'Tromperie',key:'tromperie',ability:'CHA'}
];
const PROFILE_SKILLS = {
 'pj-pik-ekrok':{
  athletisme:{mod:0},acrobaties:{mod:1},escamotage:{mod:1},discretion:{mod:1,note:'Désavantage en demi-plate'},arcanes:{mod:2},histoire:{mod:2},investigation:{mod:2},nature:{mod:5,status:'Maîtrise'},religion:{mod:5,status:'Maîtrise'},dressage:{mod:5},intuition:{mod:8,status:'Maîtrise'},medecine:{mod:11,status:'Expertise'},perception:{mod:8,status:'Maîtrise'},survie:{mod:5},intimidation:{mod:-1},persuasion:{mod:-1},representation:{mod:-1},tromperie:{mod:-1}},
 'pj-tuskhan-sand-ivoire':{
  athletisme:{mod:7,status:'Maîtrise'},acrobaties:{mod:2},escamotage:{mod:2},discretion:{mod:2},arcanes:{mod:-1},histoire:{mod:-1},investigation:{mod:-1,note:'Avantage si fondé sur l’odorat'},nature:{mod:-1},religion:{mod:-1},dressage:{mod:1},intuition:{mod:4,status:'Maîtrise'},medecine:{mod:1},perception:{mod:4,status:'Maîtrise',note:'Avantage si fondé sur l’odorat'},survie:{mod:1,note:'Avantage si fondé sur l’odorat'},intimidation:{mod:0},persuasion:{mod:3,status:'Maîtrise'},representation:{mod:0},tromperie:{mod:0}},
 'pj-wonq':{
  athletisme:{mod:0,status:'Touche-à-tout'},acrobaties:{mod:3,status:'Touche-à-tout'},escamotage:{mod:3,status:'Touche-à-tout'},discretion:{mod:3,status:'Touche-à-tout'},arcanes:{mod:3,status:'Maîtrise'},histoire:{mod:6,status:'Expertise'},investigation:{mod:1,status:'Touche-à-tout'},nature:{mod:1,status:'Touche-à-tout'},religion:{mod:1,status:'Touche-à-tout'},dressage:{mod:2,status:'Touche-à-tout'},intuition:{mod:7,status:'Expertise'},medecine:{mod:2,status:'Touche-à-tout'},perception:{mod:4,status:'Maîtrise'},survie:{mod:2,status:'Touche-à-tout'},intimidation:{mod:6,status:'Touche-à-tout'},persuasion:{mod:8,status:'Maîtrise'},representation:{mod:6,status:'Touche-à-tout'},tromperie:{mod:6,status:'Touche-à-tout'}},
 'pj-silas-veyr':{
  athletisme:{mod:-1},acrobaties:{mod:2},escamotage:{mod:5,status:'Maîtrise'},discretion:{mod:2,note:'Désavantage en demi-plate'},arcanes:{mod:8,status:'Maîtrise'},histoire:{mod:5},investigation:{mod:8,status:'Maîtrise'},nature:{mod:5},religion:{mod:5},dressage:{mod:1},intuition:{mod:1},medecine:{mod:4,status:'Maîtrise'},perception:{mod:4,status:'Maîtrise'},survie:{mod:1},intimidation:{mod:0},persuasion:{mod:0},representation:{mod:0},tromperie:{mod:0}}
};

const CONDITIONS = ['Aveuglé','Charmé','Assourdi','Effrayé','Empoisonné','Entravé','Étourdi','Inconscient','Invisible','Paralysé','Pétrifié','À terre','Agrippé','Incapacité','Épuisement'];
const DAMAGE_TYPES = ['acide','contondants','feu','force','foudre','froid','nécrotiques','perforants','poison','psychiques','radiants','tonnerre','tranchants'];
const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const SAMPLE_MONSTERS = window.ENCOUNTER_BUILTINS || [];

function numOrNull(v){ return v==='' || v==null ? null : Number(v); }
function normKey(v){ return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }
function splitList(v){
  if(Array.isArray(v)) return v.map(x=>String(x).trim()).filter(Boolean);
  return String(v||'').split(/[;,·]/).map(x=>x.trim()).filter(Boolean);
}
function formatList(v){ return (v||[]).join(' ; '); }
function parseSaveString(str=''){
  const out={};
  String(str).replace(/−/g,'-').split(/[;,]/).forEach(part=>{
    const m=part.trim().match(/^(FOR|DEX|CON|INT|SAG|CHA)\s*([+-]?\d+)/i);
    if(m) out[m[1].toUpperCase()]=Number(m[2]);
  });
  return out;
}
function abilityMod(score){ return Math.floor((Number(score)-10)/2); }
function signed(n){ n=Number(n)||0; return n>=0?`+${n}`:`${n}`; }

function normalizeAbility(a={}){
  return {
    id:a.id||uid('ab'),name:a.name||'Capacité',detail:a.detail||'',kind:a.kind||'text',economy:a.economy||'',
    bonus:numOrNull(a.bonus),damage:a.damage||'',damageType:a.damageType||'',dc:numOrNull(a.dc),save:(a.save||'').toUpperCase(),
    cost:Number(a.cost)||1,recharge:a.recharge||'',sequence:a.sequence||'',timing:a.timing||'',target:a.target||'auto'
  };
}
function normalizeResource(r={}){
  const max=Math.max(0,Number(r.max)||0),start=r.start==null?max:Math.max(0,Math.min(max,Number(r.start)||0));
  return {id:r.id||uid('res'),name:r.name||'Ressource',max,start,reset:r.reset||''};
}
function normalizeCondition(c){
  if(typeof c==='string') return {id:uid('cond'),name:c,durationType:'indefinite',remaining:null,saveAbility:'',dc:null,source:''};
  c=c||{};
  return {id:c.id||uid('cond'),name:c.name||'État',durationType:c.durationType||'indefinite',remaining:c.remaining==null?null:Math.max(0,Number(c.remaining)||0),saveAbility:(c.saveAbility||'').toUpperCase(),dc:numOrNull(c.dc),source:c.source||'',sourceCharacterId:c.sourceCharacterId||'',sourceParticipantId:c.sourceParticipantId||'',attackAgainstCharacterId:c.attackAgainstCharacterId||'',attackAgainstParticipantId:c.attackAgainstParticipantId||'',consumeOnMatch:!!c.consumeOnMatch};
}
function classifyLegacyImmunities(v){
  const items=splitList(v),damage=[],conditions=[];
  items.forEach(x=>{
    const k=normKey(x.replace(/^dégâts\s*:\s*/i,'').replace(/^états?\s*:\s*/i,''));
    const condition=CONDITIONS.find(c=>normKey(c)===k);
    const damageType=DAMAGE_TYPES.find(d=>normKey(d)===k);
    if(condition)conditions.push(condition); else if(damageType)damage.push(damageType);
  });
  return {damage,conditions};
}
function normalizePhase(p={}){
  return {id:p.id||uid('phase'),name:p.name||'Phase',threshold:Math.max(0,Number(p.threshold)||0),ac:numOrNull(p.ac),legendaryMax:numOrNull(p.legendaryMax),speed:p.speed||'',addResistances:splitList(p.addResistances),addImmunities:splitList(p.addImmunities),note:p.note||''};
}
function normalizeMonster(m={}){
  const legacyImm=classifyLegacyImmunities(m.immunities||'');
  const abilities={}; ABILITIES.forEach(a=>{if(m.abilities?.[a]!=null&&m.abilities[a]!=='')abilities[a]=Number(m.abilities[a]);});
  const saveMods=Object.assign({},parseSaveString(m.saves||''),m.saveMods||{});
  return {
    id:m.id||uid('monster'),category:['character','companion','npc','enemy'].includes(m.category)?m.category:'enemy',source:m.source||'',subtitle:m.subtitle||'',name:m.name||'Adversaire',type:m.type||'',size:m.size||'',cr:String(m.cr??''),
    favorite:!!m.favorite,tags:splitList(m.tags),isBoss:!!m.isBoss,
    ac:Number(m.ac)||10,hp:Math.max(1,Number(m.hp)||1),initiative:Number(m.initiative)||0,speed:m.speed||'',saves:m.saves||'',abilities,saveMods,
    skills:Object.assign({},PROFILE_SKILLS[m.id]||{},m.skills||{}),attacksPerAction:Math.max(1,Number(m.attacksPerAction)||0),
    damageResistances:splitList(m.damageResistances?.length?m.damageResistances:m.resistances),
    damageVulnerabilities:splitList(m.damageVulnerabilities?.length?m.damageVulnerabilities:m.vulnerabilities),
    damageImmunities:splitList(m.damageImmunities?.length?m.damageImmunities:legacyImm.damage),
    conditionImmunities:splitList(m.conditionImmunities?.length?m.conditionImmunities:legacyImm.conditions),
    senses:m.senses||'',
    traits:(m.traits||[]).map(normalizeAbility),actions:(m.actions||[]).map(normalizeAbility),reactions:(m.reactions||[]).map(normalizeAbility),legendaryActions:(m.legendaryActions||[]).map(normalizeAbility),lairActions:(m.lairActions||[]).map(normalizeAbility),
    legendaryMax:Number(m.legendaryMax)||((m.legendaryActions||[]).length?3:0),lairInitiative:Number.isFinite(Number(m.lairInitiative))?Number(m.lairInitiative):20,
    resources:(m.resources||[]).map(normalizeResource),phases:(m.phases||[]).map(normalizePhase).sort((a,b)=>b.threshold-a.threshold),notes:m.notes||''
  };
}
function normalizeParticipant(p={}){
  return {
    id:p.id||uid('p'),modelId:p.modelId||null,groupId:p.groupId||null,name:p.name||'Participant',baseName:p.baseName||p.name||'Participant',kind:p.kind||'enemy',
    ac:Number(p.ac)||10,acOverride:p.acOverride==null?null:Number(p.acOverride),maxHp:Math.max(1,Number(p.maxHp)||1),hp:Math.max(0,Number.isFinite(Number(p.hp))?Number(p.hp):1),tempHp:Math.max(0,Number(p.tempHp)||0),initiative:Number(p.initiative)||0,
    conditions:(p.conditions||[]).map(normalizeCondition),dynamicDefenses:{resistances:splitList(p.dynamicDefenses?.resistances),immunities:splitList(p.dynamicDefenses?.immunities),vulnerabilities:splitList(p.dynamicDefenses?.vulnerabilities),conditionImmunities:splitList(p.dynamicDefenses?.conditionImmunities),sources:Array.isArray(p.dynamicDefenses?.sources)?p.dynamicDefenses.sources:[]},actionUsed:!!p.actionUsed,bonusActionUsed:!!p.bonusActionUsed,reactionUsed:!!p.reactionUsed,
    legendaryRemaining:Number(p.legendaryRemaining)||0,currentPhaseId:p.currentPhaseId||null,abilityState:p.abilityState||{},resourceState:p.resourceState||{},companionOf:p.companionOf||null,lairOwnerId:p.lairOwnerId||null,bossOverride:!!p.bossOverride,attackProgress:Math.max(0,Number(p.attackProgress)||0),speedOverride:p.speedOverride||''
  };
}
function mergeBuiltinEnhancements(stored,builtin){
  if(!builtin)return stored;
  const b=normalizeMonster(builtin),s=normalizeMonster(stored);
  s.abilities=Object.assign({},b.abilities||{},s.abilities||{});
  s.saveMods=Object.assign({},b.saveMods||{},s.saveMods||{});
  s.skills=Object.assign({},b.skills||{},s.skills||{});
  ['damageResistances','damageVulnerabilities','damageImmunities','conditionImmunities'].forEach(k=>{if(!s[k]?.length&&b[k]?.length)s[k]=b[k];});
  if(!s.lairActions.length&&b.lairActions.length)s.lairActions=b.lairActions;
  if(b.lairActions.length&&(!Number.isFinite(Number(s.lairInitiative))))s.lairInitiative=b.lairInitiative;
  const enrichList=(target,source)=>target.map(a=>{const src=source.find(x=>x.name===a.name);return src?Object.assign({},src,a,{economy:a.economy||src.economy||'',sequence:a.sequence||src.sequence||'',timing:a.timing||src.timing||''}):a;});
  s.actions=enrichList(s.actions,b.actions);s.reactions=enrichList(s.reactions,b.reactions);s.legendaryActions=enrichList(s.legendaryActions,b.legendaryActions);s.traits=enrichList(s.traits,b.traits);
  // Les nouvelles multiattaques V2.5 sont ajoutées aux profils intégrés existants sans écraser les actions personnalisées.
  b.actions.filter(a=>a.kind==='multiattack'&&!s.actions.some(x=>x.name===a.name)).forEach(a=>s.actions.unshift(normalizeAbility(a)));
  b.actions.filter(a=>a.kind==='multiattack'&&!s.actions.some(x=>x.name===a.name)).forEach(a=>s.actions.unshift(a));
  if(!s.phases.length&&b.phases.length)s.phases=b.phases; else s.phases=s.phases.map(p=>{const bp=b.phases.find(x=>x.name===p.name);return bp?Object.assign({},bp,p,{addResistances:p.addResistances?.length?p.addResistances:bp.addResistances,addImmunities:p.addImmunities?.length?p.addImmunities:bp.addImmunities}):p;});
  return s;
}
const CC_PLAYERS=[
  {id:'cc-kentaro',modelId:'cc-kentaro-model',name:'Kentaro',hp:103,ac:18},
  {id:'cc-samoth',modelId:'cc-samoth-model',name:'Samoth',hp:72,ac:15},
  {id:'cc-brackmard',modelId:'cc-brackmard-model',name:'Brack Mard',hp:104,ac:19},
  {id:'cc-rufus',modelId:'cc-rufus-model',name:'Rufus',hp:53,ac:16},
  {id:'cc-nans',modelId:'cc-nans-model',name:'Nans',hp:125,ac:18},
  {id:'cc-zephyr',modelId:'cc-zephyr-model',name:'Zéphyr',hp:84,ac:20}
];
function ccParticipant(x){return{id:x.id,modelId:x.modelId||null,groupId:null,name:x.name,baseName:x.name,kind:'player',ac:x.ac,maxHp:x.hp,hp:x.hp,tempHp:0,initiative:0,conditions:[],actionUsed:false,bonusActionUsed:false,reactionUsed:false,legendaryRemaining:0,currentPhaseId:null,abilityState:{},resourceState:{},companionOf:null,lairOwnerId:null,bossOverride:false,attackProgress:0,speedOverride:''}}
function ensureCCPlayers(encounter){
  // Les six fiches CC restent dans la bibliothèque, mais ne sont plus injectées
  // automatiquement dans la rencontre active. RPG Connect instancie uniquement
  // les Companions réellement connectés/utilisés.
  encounter=encounter||{};
  encounter.participants=Array.isArray(encounter.participants)?encounter.participants:[];
  return encounter;
}
function pruneLegacyAutoCCPlayers(encounter){
  if(!encounter||!Array.isArray(encounter.participants))return encounter;
  const ccIds=new Set(CC_PLAYERS.map(x=>x.id));
  encounter.participants=encounter.participants.filter(p=>!ccIds.has(p.id));
  if(encounter.selectedId&&ccIds.has(encounter.selectedId))encounter.selectedId=null;
  return encounter;
}
function blankState(){
  return {version:APP_VERSION,ui:{mode:'prep',locked:false,density:'comfortable',deviceProfile:'ipad'},encounter:{name:'Rencontre sans titre',savedId:null,round:1,currentTurn:0,selectedId:null,participants:[],log:[],turnNotices:[],pendingPhase:null},monsters:clone(SAMPLE_MONSTERS).map(normalizeMonster),savedEncounters:[],trash:[]};
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return blankState();
    const s=JSON.parse(raw); s.version=APP_VERSION;s.ui=Object.assign({mode:'prep',locked:false,density:'comfortable',deviceProfile:'ipad'},s.ui||{});s.savedEncounters=Array.isArray(s.savedEncounters)?s.savedEncounters:[];s.trash=Array.isArray(s.trash)?s.trash:[];
    if(!s.monsters?.length)s.monsters=clone(SAMPLE_MONSTERS);
    const builtinMap=new Map(SAMPLE_MONSTERS.map(x=>[x.id,x]));
    s.monsters=s.monsters.map(m=>mergeBuiltinEnhancements(m,builtinMap.get(m.id)));
    const known=new Set(s.monsters.map(m=>m.id));
    SAMPLE_MONSTERS.map(normalizeMonster).forEach(m=>{if(!known.has(m.id))s.monsters.push(m);});
    s.encounter=Object.assign(blankState().encounter,s.encounter||{});s.encounter.participants=(s.encounter.participants||[]).map(normalizeParticipant);pruneLegacyAutoCCPlayers(s.encounter);s.encounter.log=s.encounter.log||[];s.encounter.turnNotices=s.encounter.turnNotices||[];
    return s;
  }catch(err){console.warn(err);return blankState();}
}

let state=loadState();
let undoStack=[];
const ui={detailTab:'actions',multiMode:false,multiSelection:new Set(),drawer:null,libraryFilter:'all',libraryTag:'',favoritesOnly:false,quickMode:'damage',conditionName:CONDITIONS[0],checkDc:15,pendingAdvance:false,targeting:null};

function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));maybeAutoBackup();}
function checkpoint(){undoStack.push(JSON.stringify(state));if(undoStack.length>50)undoStack.shift();}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200);}
function log(msg){state.encounter.log.unshift({id:uid('log'),time:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),text:msg});state.encounter.log=state.encounter.log.slice(0,220);}
function mutate(fn,msg){checkpoint();fn();if(msg)log(msg);saveState();render();}
function undo(){if(!undoStack.length)return toast('Rien à annuler.');state=JSON.parse(undoStack.pop());saveState();render();toast('Dernière action annulée.');}
function modelFor(p){return p?.modelId?state.monsters.find(m=>m.id===p.modelId):null;}
function isLair(p){return p?.kind==='lair';}
function makeParticipant(monster,n=1,initiative=10,groupId=null,companionOf=null){
  const m=normalizeMonster(monster),abilityState={},resourceState={};[...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions].forEach(a=>abilityState[a.id]={ready:true});m.resources.forEach(r=>resourceState[r.id]=r.start);
  return {id:uid('p'),modelId:m.id,groupId,name:groupId?`${m.name} ${n}`:m.name,baseName:m.name,kind:m.category==='enemy'?'enemy':m.category==='character'?'player':'ally',ac:m.ac,maxHp:m.hp,hp:m.hp,tempHp:0,initiative:Number(initiative)||0,conditions:[],actionUsed:false,bonusActionUsed:false,reactionUsed:false,legendaryRemaining:m.legendaryMax,currentPhaseId:null,abilityState,resourceState,companionOf,lairOwnerId:null,bossOverride:false,attackProgress:0};
}
function makeLairParticipant(owner,m){return {id:uid('lair'),modelId:m.id,groupId:null,name:`Repaire — ${owner.baseName}`,baseName:`Repaire — ${owner.baseName}`,kind:'lair',ac:0,maxHp:1,hp:1,tempHp:0,initiative:m.lairInitiative??20,conditions:[],actionUsed:false,bonusActionUsed:false,reactionUsed:false,legendaryRemaining:0,currentPhaseId:null,abilityState:{},resourceState:{},companionOf:null,lairOwnerId:owner.id};}
function sortedParticipants(){
  const all=state.encounter.participants;
  const tieKey=p=>{if(p.companionOf){const parent=all.find(x=>x.id===p.companionOf);if(parent)return `${parent.name}\u0001${p.name}`;}if(p.kind==='lair')return `\uffff${p.name}`;return `${p.name}\u0000`;};
  return [...all].sort((a,b)=>b.initiative-a.initiative||tieKey(a).localeCompare(tieKey(b),'fr'));
}
function activeParticipant(){const list=sortedParticipants();if(!list.length)return null;state.encounter.currentTurn=Math.max(0,Math.min(state.encounter.currentTurn,list.length-1));return list[state.encounter.currentTurn];}
function selectedParticipant(){return state.encounter.participants.find(p=>p.id===state.encounter.selectedId)||activeParticipant();}
function phaseForHp(p,m=modelFor(p)){if(!m?.phases?.length)return null;return m.phases.filter(ph=>p.hp<=ph.threshold).sort((a,b)=>a.threshold-b.threshold)[0]||null;}
function currentPhase(p,m=modelFor(p)){if(!m?.phases?.length)return null;if(p.currentPhaseId)return m.phases.find(ph=>ph.id===p.currentPhaseId)||phaseForHp(p,m);return null;}
function phaseDepth(ph,m){if(!ph)return 0;const ordered=[...m.phases].sort((a,b)=>b.threshold-a.threshold);return ordered.findIndex(x=>x.id===ph.id)+1;}
function nextPhase(p,m=modelFor(p)){
  if(!m?.phases?.length)return null;const ordered=[...m.phases].sort((a,b)=>b.threshold-a.threshold),cur=currentPhase(p,m);if(!cur)return ordered[0]||null;const i=ordered.findIndex(x=>x.id===cur.id);return ordered[i+1]||null;
}
function checkPhaseTransition(p){
  const m=modelFor(p);if(!m?.phases?.length||isLair(p))return;const candidate=phaseForHp(p,m);if(!candidate)return;const cur=currentPhase(p,m);if(cur&&phaseDepth(candidate,m)<=phaseDepth(cur,m))return;
  p.currentPhaseId=candidate.id;const cap=effectiveLegendaryMax(p,m);if(cap)p.legendaryRemaining=Math.min(p.legendaryRemaining,cap);state.encounter.pendingPhase={participantId:p.id,phaseId:candidate.id};log(`⚠ ${p.name} entre dans « ${candidate.name} » — ${candidate.note||'changement de phase.'}`);
}
function effectiveAc(p){const ph=currentPhase(p);return p?.acOverride!=null?p.acOverride:(ph?.ac??p.ac);}
function effectiveSpeed(p,m=modelFor(p)){return p?.speedOverride||currentPhase(p,m)?.speed||m?.speed||'—';}
function effectiveLegendaryMax(p,m=modelFor(p)){const ph=currentPhase(p,m);return ph?.legendaryMax??m?.legendaryMax??0;}
function effectiveDamageResistances(p,m=modelFor(p)){return [...new Set([...(m?.damageResistances||[]),...(currentPhase(p,m)?.addResistances||[]),...(p?.dynamicDefenses?.resistances||[])])];}
function effectiveDamageImmunities(p,m=modelFor(p)){return [...new Set([...(m?.damageImmunities||[]),...(currentPhase(p,m)?.addImmunities||[]),...(p?.dynamicDefenses?.immunities||[])])];}
function effectiveDamageVulnerabilities(p,m=modelFor(p)){return [...new Set([...(m?.damageVulnerabilities||[]),...(p?.dynamicDefenses?.vulnerabilities||[])])];}
function effectiveConditionImmunities(p,m=modelFor(p)){return [...new Set([...(m?.conditionImmunities||[]),...(p?.dynamicDefenses?.conditionImmunities||[])])];}
function hpPct(p){return Math.max(0,Math.min(100,p.hp/p.maxHp*100));}
function hpClass(p){const pct=hpPct(p);return pct>60?'healthy':pct>30?'mid':'low';}
function hpBandClass(p){const pct=hpPct(p);return p.hp<=0?'hp-down':pct>75?'hp-high':pct>50?'hp-good':pct>25?'hp-warn':'hp-critical';}
function isLocked(){return state.ui.mode==='combat'&&state.ui.locked;}
function structuralGuard(){if(isLocked()){toast('Combat verrouillé : déverrouille pour modifier la structure.');return true;}return false;}

function rollDie(s){return Math.floor(Math.random()*s)+1;}
function rollD20(mode='normal'){const a=rollDie(20),b=rollDie(20);if(mode==='adv')return{roll:Math.max(a,b),detail:`${a}/${b}`};if(mode==='dis')return{roll:Math.min(a,b),detail:`${a}/${b}`};return{roll:a,detail:String(a)};}
function rollExpression(expr){
  if(!expr)return{total:0,detail:'0'};const clean=String(expr).replace(/\s/g,'').replace(/−/g,'-'),parts=clean.match(/[+-]?[^+-]+/g)||[];let total=0;const details=[];
  for(const raw of parts){let sign=1,part=raw;if(part[0]==='+')part=part.slice(1);else if(part[0]==='-'){sign=-1;part=part.slice(1);}const dm=part.match(/^(\d*)d(\d+)$/i);if(dm){const n=Number(dm[1]||1),s=Number(dm[2]),rolls=Array.from({length:n},()=>rollDie(s));total+=rolls.reduce((x,y)=>x+y,0)*sign;details.push(`${sign<0?'-':''}${rolls.join('+')}`);}else if(!Number.isNaN(Number(part))){total+=Number(part)*sign;details.push(`${sign<0?'-':''}${part}`);}else details.push(part);}
  return{total,detail:details.join(' + ').replace(/\+ -/g,'- ')};
}
function setMode(mode){if(mode==='prep')state.ui.locked=false;state.ui.mode=mode;ui.multiMode=false;ui.multiSelection.clear();if(mode==='combat'){const a=activeParticipant();if(a){state.encounter.selectedId=a.id;}}saveState();render();}
function openDrawer(name){ui.drawer=name;if(name==='library')renderLibrary();renderDrawers();}
function closeDrawers(){ui.drawer=null;renderDrawers();}
function renderDrawers(){const lib=$('#libraryDrawer'),jr=$('#journalDrawer'),scrim=$('#drawerScrim');lib.classList.toggle('open',ui.drawer==='library');jr.classList.toggle('open',ui.drawer==='journal');scrim.classList.toggle('open',!!ui.drawer);lib.setAttribute('aria-hidden',ui.drawer==='library'?'false':'true');jr.setAttribute('aria-hidden',ui.drawer==='journal'?'false':'true');}

function render(){
  $('#encounterName').value=state.encounter.name;$('#roundNumber').textContent=state.encounter.round;document.body.classList.toggle('combat-mode',state.ui.mode==='combat');
  $('#prepView').classList.toggle('hidden',state.ui.mode!=='prep');$('#combatView').classList.toggle('hidden',state.ui.mode!=='combat');$('#quickBar').classList.add('hidden');
  $('#btnModePrep').classList.toggle('active',state.ui.mode==='prep');$('#btnModeCombat').classList.toggle('active',state.ui.mode==='combat');$('#btnCombatLock').textContent=state.ui.locked?'🔒':'🔓';$('#btnCombatLock').classList.toggle('locked',state.ui.locked);$('#btnCombatLock').disabled=state.ui.mode!=='combat';
  renderInitiative();if(ui.drawer==='library')renderLibrary();if(state.ui.mode==='prep')renderPrep();else{renderCombat();renderDetail();}renderLog();renderDrawers();renderMultiState();renderPendingPhase();
  requestAnimationFrame(()=>document.querySelector('.init-chip.active')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
}
function renderInitiative(){
  const list=sortedParticipants(),active=activeParticipant();
  $('#initiativeRibbon').innerHTML=list.length?list.map(p=>`<button class="init-chip ${p.id===active?.id?'active':''} ${p.hp<=0&&!isLair(p)?'dead':''} ${isLair(p)?'lair-chip':''}" data-select="${p.id}"><span>${isLair(p)?'🏰 ':''}${esc(p.name)}</span><b>${p.initiative}</b></button>`).join(''):'<span class="muted">Aucune initiative</span>';
  if(!list.length){$('#nextTurnHint').textContent='Aucun participant';return;}const idx=Math.min(state.encounter.currentTurn,list.length-1),next=list[(idx+1)%list.length];$('#nextTurnHint').textContent=`Suivant : ${next.name} · ${next.initiative}`;
}
function renderLibrary(){
  const q=$('#monsterSearch').value.trim().toLowerCase(),locked=isLocked();const ms=state.monsters.filter(m=>(ui.libraryFilter==='all'||m.category===ui.libraryFilter)&&`${m.name} ${m.type} ${m.cr} ${m.source} ${m.subtitle}`.toLowerCase().includes(q));
  $('#monsterLibrary').innerHTML=ms.map(m=>{const isChar=m.category==='character',isComp=m.category==='companion',cardClass=isChar?'character-card':isComp?'companion-card':'',badgeClass=isChar?'character-badge':isComp?'companion-badge':'',badge=isChar?'PJ':isComp?'COMP.':`FP ${esc(m.cr||'—')}`;return `<article class="library-card ${cardClass}"><div class="library-title"><h3>${esc(m.name)}</h3><span class="cr-badge ${badgeClass}">${badge}</span></div><div class="library-meta">${esc(m.subtitle||[m.size,m.type].filter(Boolean).join(' · '))} · CA ${m.ac} · ${m.hp} PV${m.lairActions.length?' · 🏰 repaire':''}</div>${m.source?`<div class="source-badge">${esc(m.source)}</div>`:''}<div class="library-actions"><button class="primary small" data-add-monster="${m.id}" ${locked?'disabled':''}>+ Ajouter</button><button class="ghost small" data-edit-monster="${m.id}" ${locked?'disabled':''}>Modifier</button></div></article>`;}).join('')||'<p class="muted">Aucun résultat.</p>';
  $('#btnCreateMonster').disabled=locked;$$('[data-library-filter]').forEach(b=>b.classList.toggle('active',b.dataset.libraryFilter===ui.libraryFilter));
}
function renderPrep(){
  const list=sortedParticipants();$('#prepCount').textContent=list.length;$('#prepParticipants').innerHTML=list.length?list.map(p=>isLair(p)?`<article class="prep-row lair-row ${p.id===state.encounter.selectedId?'selected':''}" data-select="${p.id}"><div><strong>🏰 ${esc(p.name)}</strong><small>Action de repaire · initiative ${p.initiative}</small></div><label>INI <input data-init="${p.id}" type="number" value="${p.initiative}"></label><div></div><button class="danger ghost small" data-remove="${p.id}">Retirer</button></article>`:`<article class="prep-row ${p.id===state.encounter.selectedId?'selected':''} ${hpBandClass(p)}" data-select="${p.id}"><div><strong>${esc(p.name)}</strong><small>${modelFor(p)?.category==='character'?esc(modelFor(p)?.subtitle||'Personnage'):modelFor(p)?.category==='companion'?esc(modelFor(p)?.subtitle||'Compagnon'):p.kind==='enemy'?esc(modelFor(p)?.type||'Adversaire'):'PJ / PNJ'} · CA ${effectiveAc(p)} · ${p.hp}/${p.maxHp} PV</small></div><label>INI <input data-init="${p.id}" type="number" value="${p.initiative}"></label><div class="mini-hp"><i style="width:${hpPct(p)}%"></i></div><button class="danger ghost small" data-remove="${p.id}">Retirer</button></article>`).join(''):'<div class="empty-prep">Aucun participant. Ouvre la bibliothèque pour ajouter tes adversaires.</div>';
  const p=selectedParticipant();if(!p){$('#prepPreview').innerHTML='<div class="empty-detail"><div class="empty-crest">✦</div><p>Sélectionne un participant.</p></div>';return;}const m=modelFor(p);
  $('#prepPreview').innerHTML=isLair(p)?`<div class="preview-head"><div><span class="eyebrow">REPAIRE</span><h2>${esc(p.name)}</h2><p>${m?.lairActions.length||0} action(s) de repaire</p></div></div>`:`<div class="preview-head"><div><span class="eyebrow">${m?.category==='character'?'PERSONNAGE':m?.category==='companion'?'COMPAGNON':p.kind==='enemy'?'ADVERSAIRE':'PARTICIPANT'}</span><h2>${esc(p.name)}</h2><p>${m?esc(m.category==='character'||m.category==='companion'?(m.subtitle||m.type):[m.size,m.type,`FP ${m.cr||'—'}`].filter(Boolean).join(' · ')):'PJ / PNJ'}</p></div>${m?`<button class="ghost small" data-edit-monster="${m.id}">✎ Modifier</button>`:''}</div><div class="stat-grid"><div class="statbox"><span>CA</span><b>${effectiveAc(p)}</b></div><div class="statbox"><span>PV</span><b>${p.hp}/${p.maxHp}</b></div><div class="statbox"><span>INI</span><b>${p.initiative}</b></div><div class="statbox"><span>VIT</span><b>${esc(effectiveSpeed(p,m))}</b></div></div>${m?`<div class="preview-summary"><b>${m.actions.length}</b> action(s) · <b>${m.reactions.length}</b> réaction(s) · <b>${m.legendaryActions.length}</b> légendaire(s)</div><p class="detail-notes">${esc(m.notes||'')}</p>`:'<p class="detail-notes">Suivi simple des PV, CA et initiative.</p>'}`;
}
function groupedEntries(){const list=sortedParticipants(),seen=new Set(),entries=[];for(const p of list){if(p.groupId){if(seen.has(p.groupId))continue;seen.add(p.groupId);entries.push({type:'group',id:p.groupId,members:list.filter(x=>x.groupId===p.groupId)});}else entries.push({type:'single',id:p.id,members:[p]});}return entries;}
function renderCombat(){const entries=groupedEntries(),active=activeParticipant();$('#combatList').innerHTML=entries.length?entries.map(entry=>entry.type==='group'?renderGroupCard(entry.members,active):renderSingleCard(entry.members[0],active)).join(''):'<div class="empty-combat">Aucun participant.</div>';}
function renderSingleCard(p,active){
  if(isLair(p))return `<article class="combat-card lair-card ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''}"><button class="select-hit" data-select="${p.id}"></button><div class="combat-card-main"><span class="turn-dot">🏰</span><div class="combat-ident"><strong>${esc(p.name)}</strong><small>Action de repaire · ${modelFor(p)?.lairActions.length||0} option(s)</small></div><span class="ini-badge">${p.initiative}</span></div><div class="lair-card-foot">Initiative spéciale de repaire</div></article>`;
  const selected=p.id===state.encounter.selectedId,multiSelected=ui.multiSelection.has(p.id),phase=currentPhase(p),pct=hpPct(p);
  return `<article class="combat-card ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${selected?'selected':''} ${p.hp<=0?'dead':''}"><button class="select-hit" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`} aria-label="Sélectionner ${esc(p.name)}"></button><div class="combat-card-main">${ui.multiMode?`<span class="multi-check ${multiSelected?'on':''}">${multiSelected?'✓':''}</span>`:'<span class="turn-dot"></span>'}<div class="combat-ident"><strong>${esc(p.name)}</strong><small>${modelFor(p)?.category==='character'?esc(modelFor(p)?.subtitle||'Personnage'):modelFor(p)?.category==='companion'?esc(modelFor(p)?.subtitle||'Compagnon'):p.kind==='enemy'?esc(modelFor(p)?.type||'Adversaire'):'PJ / PNJ'} · CA ${effectiveAc(p)}</small></div><span class="ini-badge">${p.initiative}</span></div><div class="hp-line"><div class="hpbar"><div class="hpfill ${hpClass(p)}" style="width:${pct}%"></div></div><div class="hptext">${p.hp}${p.tempHp?` +${p.tempHp}`:''}/${p.maxHp}</div></div><div class="economy-mini"><i class="eco-action ${p.actionUsed?'spent':''}">A</i><i class="eco-bonus ${p.bonusActionUsed?'spent':''}">B</i><i class="eco-reaction ${p.reactionUsed?'spent':''}">R</i></div><div class="condition-pills">${p.hp<=0?'<span class="pill dead-pill">0 PV</span>':''}${phase?`<span class="pill phase-pill">${esc(phase.name)}</span>`:''}${p.conditions.slice(0,3).map(c=>`<span class="pill">${esc(c.name)}${conditionShort(c)}</span>`).join('')}${p.conditions.length>3?`<span class="pill">+${p.conditions.length-3}</span>`:''}</div></article>`;
}
function renderGroupCard(members,active){
  const first=members[0],activeInside=members.some(p=>p.id===active?.id),alive=members.filter(p=>p.hp>0).length,ini=first.initiative,allSelected=members.every(p=>ui.multiSelection.has(p.id)),sharedInitiative=new Set(members.map(p=>p.initiative)).size===1;
  const worst=members.reduce((a,b)=>hpPct(a)<hpPct(b)?a:b,members[0]);
  return `<article class="group-card ${hpBandClass(worst)} ${activeInside?'active':''}"><div class="group-head"><button class="group-title" ${ui.multiMode?`data-multi-group="${first.groupId}"`:`data-select="${activeInside?active.id:first.id}"`}><span class="group-icon">${ui.multiMode?(allSelected?'☑':'☐'):'▾'}</span><span><strong>${esc(first.baseName)}</strong><small>${alive}/${members.length} actifs · ${sharedInitiative?'initiative commune':'initiatives individuelles'}</small></span></button><span class="ini-badge">${sharedInitiative?ini:'×'}</span></div><div class="group-members">${members.map((p,i)=>{const sel=ui.multiSelection.has(p.id),pct=hpPct(p);return `<button class="member-chip ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''} ${p.hp<=0?'dead':''} ${sel?'multi-selected':''}" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`}><span>${i+1}${sharedInitiative?'':` · I${p.initiative}`}</span><b>${p.hp<=0?'☠':`${p.hp}/${p.maxHp}`}</b><i><em style="width:${pct}%"></em></i></button>`;}).join('')}</div></article>`;
}
function conditionShort(c){if(c.durationType==='rounds')return ` · ${c.remaining}t`;if(c.durationType==='saveEnd')return ` · JS ${c.saveAbility} DD${c.dc||'?'}`;if(c.durationType==='untilStart')return ' · début';if(c.durationType==='untilEnd')return c.consumeOnMatch?' · prochaine attaque ou fin':c.attackAgainstCharacterId?` · prochaine attaque vs ${c.attackAgainstCharacterId}`:' · fin';if(c.durationType==='sourceTurnEnd')return ' · fin tour source';if(c.durationType==='nextAttack')return ' · prochaine attaque';return '';}
function economyStrip(p){return `<div class="economy-strip"><button class="economy-marker action ${p.actionUsed?'spent':''}" data-economy="${p.id}|action"><span>●</span><b>Action</b><small>${p.actionUsed?'utilisée':'disponible'}</small></button><button class="economy-marker bonus ${p.bonusActionUsed?'spent':''}" data-economy="${p.id}|bonus"><span>◆</span><b>Action bonus</b><small>${p.bonusActionUsed?'utilisée':'disponible'}</small></button><button class="economy-marker reaction ${p.reactionUsed?'spent':''}" data-economy="${p.id}|reaction"><span>↯</span><b>Réaction</b><small>${p.reactionUsed?'utilisée':'disponible'}</small></button></div>`;}
function renderTurnReminders(p,m){
  if(p.id!==activeParticipant()?.id)return'';const start=(state.encounter.turnNotices||[]).filter(n=>n.participantId===p.id);const end=[];
  p.conditions.forEach(c=>{if(c.durationType==='saveEnd')end.push({text:`${c.name} : JS ${c.saveAbility||'?'} DD ${c.dc||'?'} en fin de tour.`,condition:c});else if(c.durationType==='untilEnd')end.push({text:`${c.name} prend fin à la fin de ce tour.`});else if(c.durationType==='rounds')end.push({text:`${c.name} : ${c.remaining} tour${c.remaining>1?'s':''} restant${c.remaining>1?'s':''}.`});});
  (m?.traits||[]).filter(t=>t.timing==='end').forEach(t=>end.push({text:`${t.name} — ${t.detail}`}));
  if(!start.length&&!end.length)return'';
  return `<section class="turn-reminders"><div><span class="eyebrow">À NE PAS OUBLIER</span><h3>Tour de ${esc(p.name)}</h3></div>${start.map(n=>`<div class="reminder-row done"><span>✓</span><p>${esc(n.text)}</p></div>`).join('')}${end.map(n=>`<div class="reminder-row"><span>⚠</span><p>${esc(n.text)}</p>${n.condition?`<div class="reminder-actions">${canRollConditionSave(p,n.condition)?`<button class="primary" data-condition-roll="${p.id}|${n.condition.id}">🎲 Lancer</button>`:''}<button data-condition-result="${p.id}|${n.condition.id}|success">Réussite</button><button data-condition-result="${p.id}|${n.condition.id}|fail">Échec</button></div>`:''}</div>`).join('')}</section>`;
}
function renderDetail(){
  const p=selectedParticipant(),root=$('#activeDetail');if(!p){root.className='active-detail empty-detail';root.innerHTML='<div class="empty-crest">✦</div><h2>Aucune créature sélectionnée</h2><p>Ajoute un adversaire ou un PJ/PNJ.</p>';return;}const m=modelFor(p);
  if(isLair(p)){root.className='active-detail lair-detail';root.innerHTML=`<div class="detail-header"><div><span class="eyebrow">INITIATIVE ${p.initiative}</span><h2>🏰 ${esc(p.name)}</h2><div class="detail-meta">Action de repaire contextualisée</div></div></div><div class="detail-tab-body">${renderLairTab(p,m)}</div>`;return;}
  const phase=currentPhase(p,m),next=nextPhase(p,m),cap=effectiveLegendaryMax(p,m);root.className=`active-detail ${hpBandClass(p)}`;
  root.innerHTML=`${phase?`<div class="boss-alert"><strong>⚠ ${esc(phase.name)}</strong><span>${esc(phase.note||'')}</span>${next?`<small>Prochaine phase à ${next.threshold} PV · ${Math.max(0,p.hp-next.threshold)} PV avant transition</small>`:'<small>Phase finale</small>'}</div>`:m?.phases?.length&&next?`<div class="boss-alert upcoming"><strong>Boss · Phase I</strong><span>Prochaine phase à ${next.threshold} PV · ${Math.max(0,p.hp-next.threshold)} PV avant transition</span></div>`:''}<div class="detail-header"><div><span class="eyebrow">${m?.category==='character'?'PERSONNAGE ACTIF':m?.category==='companion'?'COMPAGNON ACTIF':'CRÉATURE ACTIVE'}</span><h2>${esc(p.name)}</h2><div class="detail-meta">${m?esc(m.category==='character'||m.category==='companion'?(m.subtitle||m.type):[m.size,m.type,`FP ${m.cr||'—'}`].filter(Boolean).join(' · ')):'Participant manuel'}</div></div><div class="header-resources">${cap?`<span class="resource-chip">★ ${p.legendaryRemaining}/${cap}</span>`:''}${m?.reactions?.length?`<span class="resource-chip ${p.reactionUsed?'spent':''}">↯ ${p.reactionUsed?'Utilisée':'Prête'}</span>`:''}</div></div>${economyStrip(p)}${renderTurnReminders(p,m)}<div class="stat-grid"><div class="statbox"><span>CA</span><b>${effectiveAc(p)}</b></div><div class="statbox hp-stat"><span>PV</span><b>${p.hp}/${p.maxHp}</b></div><div class="statbox"><span>INI</span><b>${p.initiative}</b></div><div class="statbox"><span>VIT</span><b>${esc(effectiveSpeed(p,m))}</b></div></div><nav class="detail-tabs"><button class="${ui.detailTab==='actions'?'active':''}" data-detail-tab="actions">⚔ Actions</button><button class="${ui.detailTab==='state'?'active':''}" data-detail-tab="state">◈ État</button><button class="${ui.detailTab==='sheet'?'active':''}" data-detail-tab="sheet">☰ Fiche</button></nav><div class="detail-tab-body">${ui.detailTab==='actions'?renderActionsTab(p,m):ui.detailTab==='state'?renderStateTab(p,m):renderSheetTab(p,m)}</div>`;
}
function renderActionsTab(p,m){
  if(!m)return'<div class="empty-tab">Participant manuel : aucune action enregistrée.</div>';const blocks=[];
  if(m.actions.length)blocks.push(`<section class="detail-section"><h3>Actions</h3>${m.actions.map(a=>abilityCard(p,a,'action')).join('')}</section>`);
  if(m.reactions.length)blocks.push(`<section class="detail-section"><h3>Réactions · ${p.reactionUsed?'UTILISÉE':'PRÊTE'}</h3>${m.reactions.map(a=>abilityCard(p,a,'reaction')).join('')}</section>`);
  if(m.legendaryActions.length){const cap=effectiveLegendaryMax(p,m);blocks.push(`<section class="detail-section"><div class="section-title-row"><h3>Actions légendaires</h3><span class="legendary-meter">${Array.from({length:cap},(_,i)=>`<b class="${i<p.legendaryRemaining?'':'off'}">★</b>`).join('')}</span></div><p class="muted tiny">ENCOUNTER les proposera automatiquement à la fin du tour d’une autre créature.</p>${m.legendaryActions.map(a=>abilityCard(p,a,'legendary')).join('')}</section>`);}
  return blocks.join('')||'<div class="empty-tab">Aucune action enregistrée.</div>';
}
function renderLairTab(p,m){if(!m?.lairActions?.length)return'<div class="empty-tab">Aucune action de repaire.</div>';return `<section class="detail-section"><div class="section-title-row"><h3>Actions de repaire</h3><span class="resource-chip">Initiative ${p.initiative}</span></div><p class="muted tiny">Choisis une option. Le marqueur Action de repaire est remis à zéro à chaque passage sur cette initiative.</p>${m.lairActions.map(a=>abilityCard(p,a,'lair')).join('')}</section>`;}
function conditionDurationLabel(c){if(c.durationType==='rounds')return `${c.remaining} tour${c.remaining>1?'s':''}`;if(c.durationType==='untilStart')return 'jusqu’au début du prochain tour';if(c.durationType==='untilEnd')return c.consumeOnMatch?'jusqu’à la prochaine attaque, au plus tard fin du tour':c.attackAgainstCharacterId?`prochaine attaque contre ${c.attackAgainstCharacterId}, au plus tard fin du prochain tour`:'jusqu’à la fin du prochain tour';if(c.durationType==='sourceTurnEnd')return 'jusqu’à la fin du prochain tour de la source';if(c.durationType==='saveEnd')return `JS ${c.saveAbility||'?'} DD ${c.dc||'?'} en fin de tour`;if(c.durationType==='nextAttack')return 'jusqu’à la prochaine attaque';return 'durée indéfinie';}
function renderStateTab(p,m){
  const resources=m?.resources?.length?`<section class="detail-section"><h3>Ressources</h3><div class="resource-list">${m.resources.map(r=>{const cur=Number.isFinite(Number(p.resourceState?.[r.id]))?Number(p.resourceState[r.id]):r.start;return `<div class="resource-counter"><div><b>${esc(r.name)}</b><small>${esc(r.reset||'')}</small></div><div class="resource-stepper"><button data-resource="${p.id}|${r.id}|-1">−</button><strong>${cur}/${r.max}</strong><button data-resource="${p.id}|${r.id}|1">+</button></div></div>`;}).join('')}</div></section>`:'';
  const conditions=p.conditions.length?p.conditions.map(c=>`<div class="condition-active"><div><b>${esc(c.name)}</b><small>${esc(conditionDurationLabel(c))}${c.source?` · ${esc(c.source)}`:''}</small></div><button class="danger ghost small" data-remove-condition="${p.id}|${c.id}">Retirer</button></div>`).join(''):'<p class="muted">Aucun état actif.</p>';
  const cap=effectiveLegendaryMax(p,m),bossResources=cap?`<section class="detail-section"><h3>Boss</h3><div class="resource-row"><span>Actions légendaires</span><strong>${p.legendaryRemaining}/${cap}</strong></div><div class="resource-row"><span>Réaction</span><strong>${p.reactionUsed?'Utilisée':'Disponible'}</strong></div></section>`:'';
  const damageOptions=DAMAGE_TYPES.map(type=>`<option value="${esc(type)}">${esc(type)}</option>`).join('');
  return `<section class="hp-manager">
    <div class="hp-manager-title">POINTS DE VIE</div>
    <div class="hp-manager-top">
      <article class="hp-card hp-card-main">
        <div class="hp-card-head">
          <div>
            <span>PV ACTUELS</span>
            <strong>${p.hp} / ${p.maxHp}</strong>
          </div>
          <button class="ghost small" data-sethp="${p.id}">Fixer les PV</button>
        </div>
        <div class="hpbar large"><div class="hpfill ${hpClass(p)}" style="width:${hpPct(p)}%"></div></div>
        <small>${Math.max(0,p.maxHp-p.hp)} PV manquants</small>
      </article>

      <article class="hp-card temp-hp-card ${p.tempHp>0?'active':''}">
        <div class="temp-hp-head">
          <div>
            <span>PV TEMPORAIRES</span>
            <strong>+${p.tempHp||0}</strong>
          </div>
          <span class="temp-hp-shield">◇</span>
        </div>
        <div class="temp-hp-controls">
          <input id="stateTempHpAmount" type="number" min="0" step="1" inputmode="numeric" value="${p.tempHp||0}" aria-label="PV temporaires">
          <button class="primary" data-temp-set="${p.id}">Définir</button>
          <button class="ghost" data-temp-clear="${p.id}" ${p.tempHp?'':'disabled'}>Effacer</button>
        </div>
        <small>Absorbés avant les PV.</small>
      </article>
    </div>

    <article class="hp-card hp-adjust-card">
      <div class="hp-adjust-head">
        <span>AJUSTEMENTS</span>
        <div class="hp-mode" role="group" aria-label="Dégâts ou soins">
          <button class="danger ${ui.quickMode==='damage'?'active':''}" data-hp-mode="damage">DÉGÂTS</button>
          <button class="heal ${ui.quickMode==='heal'?'active':''}" data-hp-mode="heal">SOINS</button>
        </div>
      </div>
      <div class="hp-manager-tools">
        <div class="hp-presets" aria-label="Valeurs rapides">
          <button data-hp-preset="1">1</button><button data-hp-preset="5">5</button><button data-hp-preset="10">10</button>
        </div>
        <input id="stateHpAmount" type="number" min="1" step="1" inputmode="numeric" placeholder="Valeur" aria-label="Valeur dégâts ou soins">
        <select id="stateHpDamageType" class="${ui.quickMode==='heal'?'hidden':''}" aria-label="Type de dégâts"><option value="">Type de dégâts…</option>${damageOptions}</select>
        <button class="primary hp-apply ${ui.quickMode==='heal'?'heal':'damage-apply'}" data-hp-apply="${p.id}">Appliquer</button>
      </div>
    </article>
  </section>${resources}<section class="detail-section"><div class="section-title-row"><h3>États & durées</h3><button class="ghost small" data-open-condition="${p.id}">+ Ajouter</button></div><div class="condition-active-list">${conditions}</div></section>${bossResources}`;
}
function characterChecks(p,m){
  if(!m||!Object.keys(m.abilities||{}).length)return'';const rows=ABILITIES.map(a=>{const score=m.abilities[a];if(score==null)return'';const mod=abilityMod(score),save=m.saveMods?.[a]??mod;return `<div class="check-row"><div><b>${a}</b><span>${score} (${signed(mod)})</span></div><button data-ability-check="${p.id}|${a}">Test ${signed(mod)}</button><button data-save-check="${p.id}|${a}">JS ${signed(save)}</button></div>`;}).join('');
  return `<section class="detail-section checks-section"><div class="section-title-row"><h3>Tests & sauvegardes</h3><label class="dc-field">DD <input id="checkDc" type="number" min="1" value="${ui.checkDc}" inputmode="numeric"></label></div><p class="muted tiny">Le jet utilise automatiquement le modificateur de caractéristique ou le modificateur de sauvegarde enregistré sur la fiche.</p><div class="checks-grid">${rows}</div></section>`;
}
function renderSheetTab(p,m){
  if(!m)return'<div class="empty-tab">Participant manuel : CA, PV et initiative uniquement.</div>';const res=effectiveDamageResistances(p,m),imm=effectiveDamageImmunities(p,m),condImm=effectiveConditionImmunities(p,m),vul=effectiveDamageVulnerabilities(p,m);
  const defenses=[m.saves&&`<b>JS :</b> ${esc(m.saves)}`,vul.length&&`<b>Vulnérabilités :</b> ${esc(formatList(vul))}`,res.length&&`<b>Résistances :</b> ${esc(formatList(res))}`,imm.length&&`<b>Immunités dégâts :</b> ${esc(formatList(imm))}`,condImm.length&&`<b>Immunités états :</b> ${esc(formatList(condImm))}`,m.senses&&`<b>Sens & langues :</b> ${esc(m.senses)}`].filter(Boolean).join('<br>');
  return `${characterChecks(p,m)}${defenses?`<section class="detail-section"><h3>Défenses structurées & sens</h3><p class="detail-notes">${defenses}</p></section>`:''}${m.traits.length?`<section class="detail-section"><h3>Traits</h3>${m.traits.map(a=>`<div class="trait-card"><b>${esc(a.name)}</b>${a.timing?`<span class="timing-badge">${a.timing==='start'?'Début de tour':'Fin de tour'}</span>`:''}<p>${esc(a.detail)}</p></div>`).join('')}</section>`:''}${m.source?`<section class="detail-section"><h3>Source</h3><p class="detail-notes">${esc(m.source)}</p></section>`:''}${m.notes?`<section class="detail-section"><h3>Notes MJ</h3><p class="detail-notes">${esc(m.notes)}</p></section>`:''}${!isLocked()?`<section class="detail-section"><button class="ghost" data-edit-monster="${m.id}">✎ Modifier la fiche</button></section>`:''}`;
}
function abilityEconomy(a,section){if(section==='reaction')return'reaction';if(section==='legendary'||section==='lair')return'none';if(a.economy)return a.economy;if(/action bonus/i.test(a.detail||''))return'bonus';return'action';}
function abilityCard(p,a,section){
  const st=p.abilityState?.[a.id]||{ready:true},eco=abilityEconomy(a,section),economySpent=eco==='action'?p.actionUsed:eco==='bonus'?p.bonusActionUsed:eco==='reaction'?p.reactionUsed:false;
  const unavailable=(a.kind==='recharge'&&!st.ready)||(section==='legendary'&&p.legendaryRemaining<(a.cost||1))||(section==='lair'&&p.actionUsed)||(section!=='legendary'&&section!=='lair'&&economySpent);const tags=[];
  if(a.bonus!=null)tags.push(`${signed(a.bonus)}`);if(a.dc!=null)tags.push(`${a.save||'JS'} DD ${a.dc}`);if(a.damage)tags.push(`${a.kind==='heal'?'Soins ':''}${a.damage}${a.damageType?` ${a.damageType}`:''}`);if(a.kind==='recharge')tags.push(`Recharge ${a.recharge||'5–6'}`);if(a.kind==='multiattack'&&a.sequence)tags.push(a.sequence);if(section==='legendary')tags.push(`${a.cost||1} ★`);if(eco!=='none'&&section!=='legendary'&&section!=='lair')tags.push(eco==='bonus'?'Action bonus':eco==='reaction'?'Réaction':'Action');
  const label=a.kind==='attack'?'Attaquer':a.kind==='heal'?'Soigner':a.kind==='multiattack'?'Multiattaque':'Utiliser';
  return `<article class="ability-card ${unavailable?'unavailable':''}"><div class="ability-head"><div><b>${esc(a.name)}</b><small>${esc(tags.join(' · '))}</small></div>${a.kind==='recharge'&&!st.ready?'<span class="status-badge">Recharge en attente</span>':''}</div>${a.detail?`<p>${esc(a.detail)}</p>`:''}<div class="ability-buttons">${a.kind==='recharge'&&!st.ready?`<button class="primary" data-recharge="${p.id}|${a.id}">🎲 Tester maintenant</button>`:`<button class="primary" ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|normal">${label}</button>`}${a.kind==='attack'?`<button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|adv">Avantage</button><button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|dis">Désav.</button>`:''}</div></article>`;
}
function renderLog(){$('#combatLog').innerHTML=state.encounter.log.length?state.encounter.log.map(x=>`<div class="log-entry"><span>${esc(x.time)}</span><p>${esc(x.text)}</p></div>`).join(''):'<div class="empty-log">Le journal est vide.</div>';}
function renderMultiState(){$('#btnMultiMode').classList.toggle('active',ui.multiMode);$('#multiCount').classList.toggle('hidden',!ui.multiMode);$('#multiCount').textContent=ui.multiSelection.size;document.body.classList.toggle('multi-mode',ui.multiMode);}
function currentTargetIds(){if(ui.multiMode)return [...ui.multiSelection].filter(id=>state.encounter.participants.some(p=>p.id===id&&!isLair(p)));const p=selectedParticipant();return p&&!isLair(p)?[p.id]:[];}
function renderQuickbar(){
  const ids=currentTargetIds(),targets=ids.map(id=>state.encounter.participants.find(p=>p.id===id)).filter(Boolean);$('#btnQuickDamage').classList.toggle('active',ui.quickMode==='damage');$('#btnQuickHeal').classList.toggle('active',ui.quickMode==='heal');$('#quickDamageType').classList.toggle('hidden',ui.quickMode==='heal');
  if(!targets.length){$('#quickTargetName').textContent='—';$('#quickTargetMeta').textContent='Aucune cible';return;}$('#quickTargetName').textContent=targets.length===1?targets[0].name:`${targets.length} cibles`;$('#quickTargetMeta').textContent=targets.length===1?`${targets[0].hp}/${targets[0].maxHp} PV · CA ${effectiveAc(targets[0])}`:targets.map(p=>p.name).slice(0,3).join(', ')+(targets.length>3?'…':'');
}
function resolveDamageAmount(p,amount,type){
  amount=Math.max(0,Number(amount)||0);if(!amount||!type)return{amount,reason:''};const k=normKey(type),imm=effectiveDamageImmunities(p).some(x=>normKey(x)===k),res=effectiveDamageResistances(p).some(x=>normKey(x)===k),vul=effectiveDamageVulnerabilities(p).some(x=>normKey(x)===k);if(imm)return{amount:0,reason:'immunité'};if(res&&vul)return{amount,reason:'résistance + vulnérabilité : annulation'};if(res)return{amount:Math.floor(amount/2),reason:'résistance'};if(vul)return{amount:amount*2,reason:'vulnérabilité'};return{amount,reason:''};
}
function applyDamageMany(ids,amount,type=''){
  amount=Math.max(0,Number(amount)||0);if(!amount||!ids.length)return;const details=[];checkpoint();ids.forEach(id=>{const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;const r=resolveDamageAmount(p,amount,type);let left=r.amount;if(p.tempHp>0){const used=Math.min(p.tempHp,left);p.tempHp-=used;left-=used;}p.hp=Math.max(0,p.hp-left);checkPhaseTransition(p);details.push(`${p.name}: ${r.amount}${r.reason?` (${r.reason})`:''}`);});if(ids.length===1)state.encounter.selectedId=ids[0];const msg=`${amount} dégâts${type?` ${type}`:''} → ${details.join(' · ')}`;log(msg);saveState();render();if(typeof showActionPopup==='function')showActionPopup(msg,'Dégâts');
}
function applyHealMany(ids,amount){amount=Math.max(0,Number(amount)||0);if(!amount||!ids.length)return;const details=[];checkpoint();ids.forEach(id=>{const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+amount);details.push(`${p.name}: +${p.hp-before} PV`);});if(ids.length===1)state.encounter.selectedId=ids[0];const msg=details.join(' · ');log(msg);saveState();render();if(typeof showActionPopup==='function')showActionPopup(msg,'Soins');}
function applyQuickAmount(amount){const ids=currentTargetIds();if(!ids.length)return toast('Sélectionne une cible.');if(ui.quickMode==='heal')applyHealMany(ids,amount);else applyDamageMany(ids,amount,$('#quickDamageType').value);}
function applyStateHp(pid){const p=state.encounter.participants.find(x=>x.id===pid);if(!p||isLair(p))return;const amount=Math.max(0,Number($('#stateHpAmount')?.value)||0);if(!amount)return toast('Renseigne une valeur.');if(ui.quickMode==='heal')applyHealMany([pid],amount);else applyDamageMany([pid],amount,$('#stateHpDamageType')?.value||'');}
function removeParticipant(id){if(structuralGuard())return;const p=state.encounter.participants.find(x=>x.id===id);if(!p)return;mutate(()=>{const ids=new Set([id]);if(!isLair(p))state.encounter.participants.filter(x=>x.lairOwnerId===id).forEach(x=>ids.add(x.id));state.encounter.participants=state.encounter.participants.filter(x=>!ids.has(x.id));ids.forEach(x=>ui.multiSelection.delete(x));if(ids.has(state.encounter.selectedId))state.encounter.selectedId=null;state.encounter.currentTurn=Math.min(state.encounter.currentTurn,Math.max(0,sortedParticipants().length-1));},`${p.name} est retiré du combat.`);}

function rechargeThreshold(a){const nums=((a.recharge||'5-6').match(/\d/g)||[]).map(Number);return nums.length?Math.min(...nums):5;}
function processStartTurn(p,silent=false){
  if(!p)return;const m=modelFor(p),notices=[];p.actionUsed=false;p.bonusActionUsed=false;p.reactionUsed=false;if(isLair(p)){notices.push('Action de repaire disponible.');}
  else{
    const cap=effectiveLegendaryMax(p,m);if(cap)p.legendaryRemaining=cap;
    const expired=p.conditions.filter(c=>c.durationType==='untilStart');if(expired.length){p.conditions=p.conditions.filter(c=>c.durationType!=='untilStart');expired.forEach(c=>notices.push(`${c.name} prend fin au début du tour.`));}
    [...(m?.actions||[]),...(m?.reactions||[]),...(m?.legendaryActions||[])].filter(a=>a.kind==='recharge').forEach(a=>{const st=p.abilityState[a.id]||(p.abilityState[a.id]={ready:true});if(!st.ready){const roll=rollDie(6),ok=roll>=rechargeThreshold(a);st.ready=ok;notices.push(`${a.name} : recharge automatique d6 = ${roll} → ${ok?'DISPONIBLE':'indisponible'}.`);log(`${p.name} — ${a.name} : recharge automatique d6 = ${roll} → ${ok?'rechargée':'non rechargée'}.`);}});
    (m?.traits||[]).filter(t=>t.timing==='start').forEach(t=>notices.push(`${t.name} — ${t.detail}`));
  }
  state.encounter.turnNotices=notices.map(text=>({id:uid('notice'),participantId:p.id,text}));if(!silent)log(`▶ Début du tour de ${p.name} — round ${state.encounter.round}.`);
}
function processEndTurn(p){
  if(!p||isLair(p))return;const removed=[];p.conditions.forEach(c=>{if(c.durationType==='untilEnd')removed.push(c.id);else if(c.durationType==='rounds'){c.remaining=Math.max(0,(Number(c.remaining)||1)-1);if(c.remaining<=0)removed.push(c.id);}});if(removed.length){const names=p.conditions.filter(c=>removed.includes(c.id)).map(c=>c.name);p.conditions=p.conditions.filter(c=>!removed.includes(c.id));log(`${p.name} : fin automatique de ${names.join(', ')}.`);}
  const sourceExpired=[];for(const other of state.encounter.participants){if(!other?.conditions?.length)continue;const ids=[];for(const c of other.conditions){if(c.durationType!=='sourceTurnEnd'||c.sourceParticipantId!==p.id)continue;c.remaining=Math.max(0,(Number(c.remaining)||1)-1);if(c.remaining<=0){ids.push(c.id);sourceExpired.push(`${other.name} : ${c.name}`)}}if(ids.length)other.conditions=other.conditions.filter(c=>!ids.includes(c.id));}
  if(sourceExpired.length)log(`Fin du tour de ${p.name} : ${sourceExpired.join(', ')} prend fin.`);
  const m=modelFor(p);(m?.traits||[]).filter(t=>t.timing==='end').forEach(t=>log(`⏱ Fin de tour ${p.name} — rappel : ${t.name}.`));
}
function eligibleLegendaryBosses(ending){if(!ending||isLair(ending))return[];return state.encounter.participants.filter(p=>p.id!==ending.id&&!isLair(p)&&p.hp>0&&modelFor(p)?.legendaryActions?.length&&p.legendaryRemaining>0);}
function requestNextTurn(){const current=activeParticipant();if(!current)return toast('Aucun participant.');const bosses=eligibleLegendaryBosses(current);if(bosses.length){ui.pendingAdvance=true;renderLegendaryDialog(current,bosses);$('#legendaryDialog').showModal();return;}actualAdvanceTurn();}
function renderLegendaryDialog(ending,bosses){
  $('#legendaryContext').textContent=`Fin du tour de ${ending.name}. Avant de passer au suivant, ces boss peuvent dépenser des actions légendaires.`;$('#legendaryOptions').innerHTML=bosses.map(p=>{const m=modelFor(p),cap=effectiveLegendaryMax(p,m);return `<section class="legendary-context-block"><div class="section-title-row"><h3>${esc(p.name)}</h3><span class="legendary-meter">${Array.from({length:cap},(_,i)=>`<b class="${i<p.legendaryRemaining?'':'off'}">★</b>`).join('')}</span></div>${m.legendaryActions.map(a=>abilityCard(p,a,'legendary')).join('')}</section>`;}).join('');
}
function actualAdvanceTurn(){
  const list=sortedParticipants();if(!list.length)return toast('Aucun participant.');checkpoint();const ending=activeParticipant();processEndTurn(ending);let idx=state.encounter.currentTurn+1;if(idx>=list.length){idx=0;state.encounter.round++;}state.encounter.currentTurn=idx;const p=sortedParticipants()[idx];state.encounter.selectedId=p.id;processStartTurn(p);ui.detailTab='actions';ui.pendingAdvance=false;saveState();render();
}
function markEconomy(p,eco,value=true){if(eco==='action')p.actionUsed=value;if(eco==='bonus')p.bonusActionUsed=value;if(eco==='reaction')p.reactionUsed=value;}
function toggleEconomy(pid,eco){const p=state.encounter.participants.find(x=>x.id===pid);if(!p)return;mutate(()=>{if(eco==='action')p.actionUsed=!p.actionUsed;else if(eco==='bonus')p.bonusActionUsed=!p.bonusActionUsed;else if(eco==='reaction')p.reactionUsed=!p.reactionUsed;},`${p.name} — ${eco==='bonus'?'action bonus':eco==='reaction'?'réaction':'action'} ${eco==='action'?(p.actionUsed?'rendue disponible':'marquée utilisée'):eco==='bonus'?(p.bonusActionUsed?'rendue disponible':'marquée utilisée'):(p.reactionUsed?'rendue disponible':'marquée utilisée')}.`);}
function parseMultiSequence(sequence){return String(sequence||'').split(';').map(s=>s.trim()).filter(Boolean).map(part=>{const m=part.match(/^(.*?)(?:\*|x)(\d+)$/i);return{name:(m?m[1]:part).trim(),count:m?Number(m[2]):1};});}
function useMultiattack(p,m,a,mode='normal'){
  const seq=parseMultiSequence(a.sequence);if(!seq.length)return `${p.name} — ${a.name} : aucune séquence configurée.`;const results=[];seq.forEach(item=>{const attack=m.actions.find(x=>x.name===item.name);if(!attack){results.push(`${item.name} introuvable`);return;}for(let i=0;i<item.count;i++){const r=rollD20(mode),bonus=Number(attack.bonus)||0,total=r.roll+bonus,dmg=rollExpression(attack.damage);results.push(`${attack.name} ${i+1}/${item.count}: ${r.detail}${bonus?` ${signed(bonus)}`:''} = ${total}${attack.damage?` · ${dmg.total} ${attack.damageType||''}`:''}`);}});return `${p.name} — ${a.name} : ${results.join(' | ')}`;
}
function useAbility(pid,aid,section,mode='normal'){
  const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p);if(!p||!m)return;const a=[...m.traits,...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions].find(x=>x.id===aid);if(!a)return;const st=p.abilityState[aid]||(p.abilityState[aid]={ready:true});
  if(a.kind==='recharge'&&!st.ready)return toast('Cette capacité doit d’abord se recharger.');if(section==='reaction'&&p.reactionUsed)return toast('Réaction déjà utilisée.');if(section==='legendary'&&p.legendaryRemaining<(a.cost||1))return toast('Pas assez d’actions légendaires.');checkpoint();let text='';
  if(a.kind==='multiattack')text=useMultiattack(p,m,a,mode);else{ text=`${p.name} — ${a.name}`;if(a.kind==='attack'){const r=rollD20(mode),bonus=Number(a.bonus)||0,total=r.roll+bonus,dmg=rollExpression(a.damage);text+=` : d20 ${r.detail}${mode==='adv'?' (avantage)':mode==='dis'?' (désavantage)':''} ${signed(bonus)} = ${total}`;if(a.damage)text+=` · dégâts ${dmg.total} ${a.damageType||''} [${dmg.detail}]`;}else if(a.kind==='heal'){const heal=rollExpression(a.damage);text+=` : soins ${heal.total} PV [${heal.detail}]`;}else if(a.kind==='recharge'&&a.bonus!=null){const r=rollD20(mode),bonus=Number(a.bonus)||0,total=r.roll+bonus,dmg=rollExpression(a.damage);text+=` : d20 ${r.detail} ${signed(bonus)} = ${total}`;if(a.dc)text+=` · ${a.save||'JS'} DD ${a.dc}`;if(a.damage)text+=` · dégâts ${dmg.total} ${a.damageType||''} [${dmg.detail}]`;}else if(a.kind==='save'||a.kind==='recharge'){const dmg=rollExpression(a.damage);if(a.dc)text+=` : ${a.save||'JS'} DD ${a.dc}`;if(a.damage)text+=` · dégâts ${dmg.total} ${a.damageType||''} [${dmg.detail}]`;else if(!a.dc&&a.detail)text+=` : ${a.detail}`;}else text+=a.detail?` : ${a.detail}`:'';}
  if(a.kind==='recharge')st.ready=false;if(section==='reaction')p.reactionUsed=true;if(section==='legendary')p.legendaryRemaining-=a.cost||1;if(section==='lair')p.actionUsed=true;else markEconomy(p,abilityEconomy(a,section),true);log(text);saveState();render();if($('#legendaryDialog').open){const ending=activeParticipant(),bosses=eligibleLegendaryBosses(ending);if(bosses.length)renderLegendaryDialog(ending,bosses);else{$('#legendaryDialog').close();actualAdvanceTurn();}}toast(`${a.name} utilisé.`);
}
function testRecharge(pid,aid){const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p);if(!p||!m)return;const a=[...m.actions,...m.reactions,...m.legendaryActions].find(x=>x.id===aid);if(!a)return;const roll=rollDie(6),ok=roll>=rechargeThreshold(a);mutate(()=>{p.abilityState[aid]=p.abilityState[aid]||{};p.abilityState[aid].ready=ok;},`${p.name} teste la recharge de ${a.name} : d6 = ${roll} → ${ok?'rechargée':'indisponible'}.`);}
function adjustResource(pid,rid,delta){const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p),r=m?.resources?.find(x=>x.id===rid);if(!p||!r)return;const current=Number.isFinite(Number(p.resourceState?.[rid]))?Number(p.resourceState[rid]):r.start,next=Math.max(0,Math.min(r.max,current+Number(delta)));mutate(()=>{p.resourceState=p.resourceState||{};p.resourceState[rid]=next;},`${p.name} — ${r.name} : ${next}/${r.max}.`);}

function conditionImmune(p,name){return effectiveConditionImmunities(p).some(x=>normKey(x)===normKey(name));}
function addConditionMany(ids,data){if(!ids.length)return;const ps=ids.map(id=>state.encounter.participants.find(p=>p.id===id)).filter(p=>p&&!isLair(p));const applied=[],immune=[];mutate(()=>{ps.forEach(p=>{if(conditionImmune(p,data.name)){immune.push(p.name);return;}p.conditions=p.conditions.filter(c=>normKey(c.name)!==normKey(data.name));p.conditions.push(normalizeCondition(Object.assign({},data,{id:uid('cond')})));applied.push(p.name);});},`${data.name} : ${applied.length} cible(s) affectée(s)${immune.length?` · immunité : ${immune.join(', ')}`:''}.`);}
function removeCondition(pid,cid){const p=state.encounter.participants.find(x=>x.id===pid);if(!p)return;const c=p.conditions.find(x=>x.id===cid);if(!c)return;mutate(()=>p.conditions=p.conditions.filter(x=>x.id!==cid),`${p.name} : ${c.name} retiré.`);}
function resolveCondition(pid,cid,success){const p=state.encounter.participants.find(x=>x.id===pid),c=p?.conditions.find(x=>x.id===cid);if(!p||!c)return;mutate(()=>{if(success)p.conditions=p.conditions.filter(x=>x.id!==cid);},`${p.name} — ${c.name} : sauvegarde ${success?'réussie, état retiré':'échouée, état maintenu'}.`);}
function conditionSaveMod(p,c){const m=modelFor(p),a=c?.saveAbility;if(!m||!a)return null;if(m.saveMods?.[a]!=null)return Number(m.saveMods[a]);if(m.abilities?.[a]!=null)return abilityMod(m.abilities[a]);return null;}
function canRollConditionSave(p,c){return c?.durationType==='saveEnd'&&conditionSaveMod(p,c)!=null&&c.dc!=null;}
function rollConditionSave(pid,cid){const p=state.encounter.participants.find(x=>x.id===pid),c=p?.conditions.find(x=>x.id===cid);if(!p||!c)return;const mod=conditionSaveMod(p,c);if(mod==null||c.dc==null)return toast('Aucun modificateur de sauvegarde exploitable.');const r=rollD20(),total=r.roll+mod,success=total>=c.dc;mutate(()=>{if(success)p.conditions=p.conditions.filter(x=>x.id!==cid);},`${p.name} — ${c.name} : JS ${c.saveAbility} DD ${c.dc} = ${r.roll} ${signed(mod)} = ${total} → ${success?'RÉUSSITE, état retiré':'ÉCHEC, état maintenu'}.`);toast(`${p.name} : ${total} vs DD ${c.dc} — ${success?'RÉUSSITE':'ÉCHEC'}`);}
function renderConditionModal(){
  const ids=currentTargetIds(),ps=ids.map(id=>state.encounter.participants.find(p=>p.id===id)).filter(Boolean);$('#conditionTargetText').textContent=ps.length===1?ps[0].name:`${ps.length} cibles sélectionnées`;$('#conditionModalGrid').innerHTML=CONDITIONS.map(c=>`<button type="button" class="condition-btn ${ui.conditionName===c?'active':''}" data-choose-condition="${esc(c)}">${esc(c)}</button>`).join('');
  const current=ps.length===1?ps[0].conditions:[];$('#conditionCurrentList').innerHTML=current.length?`<h3>Déjà actifs</h3>${current.map(c=>`<div class="condition-active"><div><b>${esc(c.name)}</b><small>${esc(conditionDurationLabel(c))}</small></div><button type="button" class="danger ghost small" data-remove-condition="${ps[0].id}|${c.id}">Retirer</button></div>`).join('')}`:'';updateConditionOptionVisibility();
}
function updateConditionOptionVisibility(){const v=$('#conditionDuration').value;$('#conditionRoundsWrap').classList.toggle('hidden',v!=='rounds');$('#conditionSaveWrap').classList.toggle('hidden',v!=='saveEnd');$('#conditionDcWrap').classList.toggle('hidden',v!=='saveEnd');}
function openConditionDialog(){if(!currentTargetIds().length)return toast('Sélectionne une cible.');ui.conditionName=CONDITIONS[0];$('#conditionDuration').value='indefinite';$('#conditionRounds').value=1;$('#conditionSaveAbility').value='CON';$('#conditionDc').value=15;$('#conditionSource').value='';renderConditionModal();$('#conditionDialog').showModal();}

function rollCharacter(pid,ability,isSave){const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p);if(!p||m?.abilities?.[ability]==null)return;const dc=Math.max(1,Number($('#checkDc')?.value)||ui.checkDc);ui.checkDc=dc;const mod=isSave?(m.saveMods?.[ability]??abilityMod(m.abilities[ability])):abilityMod(m.abilities[ability]),r=rollD20(),total=r.roll+mod,ok=total>=dc,msg=`${p.name} — ${isSave?'JS':'test'} ${ability} DD ${dc} : ${r.roll} ${signed(mod)} = ${total} → ${ok?'RÉUSSITE':'ÉCHEC'}.`;actionLog(msg,isSave?'Jet de sauvegarde':'Test de caractéristique');saveState();renderLog();}

function openAddMonster(id){if(structuralGuard())return;const m=state.monsters.find(x=>x.id===id);if(!m)return;$('#addMonsterName').textContent=m.name;const f=$('#addMonsterForm');f.reset();f.elements.monsterId.value=id;f.elements.initiative.value=m.initiative||10;f.elements.count.value=1;const single=m.category!=='enemy';f.elements.count.max=single?1:50;f.elements.count.disabled=single;f.elements.sharedInitiative.checked=true;f.elements.sharedInitiative.closest('label').classList.toggle('hidden',single);const comp=$('#companionOption');if(comp){const show=id==='pj-silas-veyr';comp.classList.toggle('hidden',!show);f.elements.includeCompanion.checked=show;}const lair=$('#lairOption');if(lair){const show=!!m.lairActions.length;lair.classList.toggle('hidden',!show);f.elements.includeLair.checked=show;}$('#addMonsterDialog').showModal();}
function addMonsterToCombat(id,count,initiative,shared,includeCompanion=false,includeLair=false){
  if(structuralGuard())return;const m=state.monsters.find(x=>x.id===id);if(!m)return;count=m.category==='enemy'?Math.max(1,Math.min(50,Number(count)||1)):1;const groupId=count>1?uid('group'):null,wantsCompanion=id==='pj-silas-veyr'&&includeCompanion&&state.monsters.some(x=>x.id==='comp-crasseuse');mutate(()=>{let main=null;for(let i=1;i<=count;i++){const ini=shared?Number(initiative)||0:(Number(initiative)||0)+rollDie(6)-3,p=makeParticipant(m,count>1?i:1,ini,groupId);state.encounter.participants.push(p);if(i===1)main=p;}if(wantsCompanion&&main){const cm=state.monsters.find(x=>x.id==='comp-crasseuse');state.encounter.participants.push(makeParticipant(cm,1,main.initiative,null,main.id));}if(includeLair&&m.lairActions.length&&main)state.encounter.participants.push(makeLairParticipant(main,m));state.encounter.currentTurn=0;state.encounter.selectedId=sortedParticipants()[0]?.id||null;},`${count} × ${m.name} ajouté${count>1?'s':''}${wantsCompanion?' avec C.R.A.S.S.E.U.S.E.':''}${includeLair&&m.lairActions.length?' + repaire':''}.`);closeDrawers();}
function addPlayer(data){if(structuralGuard())return;const p={id:uid('p'),modelId:null,groupId:null,name:data.name,baseName:data.name,kind:data.role==='pj'?'player':'ally',ac:Number(data.ac)||10,maxHp:Math.max(1,Number(data.hp)||1),hp:Math.max(1,Number(data.hp)||1),tempHp:0,initiative:Number(data.initiative)||0,conditions:[],actionUsed:false,bonusActionUsed:false,reactionUsed:false,legendaryRemaining:0,currentPhaseId:null,abilityState:{},resourceState:{},companionOf:null,lairOwnerId:null,bossOverride:false,attackProgress:0};mutate(()=>{state.encounter.participants.push(p);state.encounter.selectedId=p.id;},`${p.name} rejoint le combat.`);}

function addDynamicRow(type,data={}){const map={traits:'#traitsRows',actions:'#actionsRows',reactions:'#reactionsRows',legendaryActions:'#legendaryRows',lairActions:'#lairRows',phases:'#phasesRows',resources:'#resourcesRows'},container=$(map[type]);if(!container)return;const tpl=$(type==='phases'?'#phaseRowTemplate':type==='resources'?'#resourceRowTemplate':'#abilityRowTemplate'),node=tpl.content.firstElementChild.cloneNode(true);node.dataset.rowType=type;node.dataset.rowId=data.id||uid(type==='phases'?'phase':type==='resources'?'res':'ab');node.querySelectorAll('[data-field]').forEach(el=>{const k=el.dataset.field;if(data[k]!=null)el.value=Array.isArray(data[k])?formatList(data[k]):data[k];});container.appendChild(node);}
function clearEditorRows(){['#traitsRows','#actionsRows','#reactionsRows','#legendaryRows','#lairRows','#phasesRows','#resourcesRows'].forEach(s=>$(s).innerHTML='');}
function openMonsterEditor(id=null){
  if(structuralGuard())return;const f=$('#monsterForm');f.reset();clearEditorRows();const m=id?state.monsters.find(x=>x.id===id):null;$('#monsterEditorTitle').textContent=m?'Modifier la fiche':'Nouvelle fiche';$('#btnDeleteMonster').classList.toggle('hidden',!m);
  if(m){Object.entries({category:m.category,source:m.source,subtitle:m.subtitle,name:m.name,type:m.type,size:m.size,cr:m.cr,ac:m.ac,hp:m.hp,initiative:m.initiative,speed:m.speed,saves:m.saves,damageVulnerabilities:formatList(m.damageVulnerabilities),damageResistances:formatList(m.damageResistances),damageImmunities:formatList(m.damageImmunities),conditionImmunities:formatList(m.conditionImmunities),senses:m.senses,notes:m.notes,legendaryMax:m.legendaryMax,lairInitiative:m.lairInitiative,monsterId:m.id}).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??'';});ABILITIES.forEach(a=>{if(f.elements[`ability_${a}`])f.elements[`ability_${a}`].value=m.abilities?.[a]??'';if(f.elements[`save_${a}`])f.elements[`save_${a}`].value=m.saveMods?.[a]??'';});m.traits.forEach(x=>addDynamicRow('traits',x));m.actions.forEach(x=>addDynamicRow('actions',x));m.reactions.forEach(x=>addDynamicRow('reactions',x));m.legendaryActions.forEach(x=>addDynamicRow('legendaryActions',x));m.lairActions.forEach(x=>addDynamicRow('lairActions',x));m.phases.forEach(x=>addDynamicRow('phases',x));m.resources.forEach(x=>addDynamicRow('resources',x));}
  else{f.elements.monsterId.value='';f.elements.category.value='enemy';f.elements.lairInitiative.value=20;addDynamicRow('actions',{name:'Attaque',kind:'attack',economy:'action',bonus:5,damage:'1d8+3',damageType:'tranchants'});}$('#monsterEditor').showModal();
}
function collectRows(sel,type){return $$(sel+' .dynamic-row').map(row=>{const o={id:row.dataset.rowId};row.querySelectorAll('[data-field]').forEach(el=>{const k=el.dataset.field;o[k]=el.type==='number'?numOrNull(el.value):el.value;});if(type!=='phases'&&type!=='resources')o.cost=Number(o.cost)||1;if(type==='resources'){o.max=Math.max(0,Number(o.max)||0);o.start=o.start==null?o.max:Math.max(0,Math.min(o.max,Number(o.start)||0));}if(type==='phases'){o.addResistances=splitList(o.addResistances);o.addImmunities=splitList(o.addImmunities);}return o;}).filter(o=>o.name);}
function saveMonsterFromForm(){
  if(structuralGuard())return;const f=$('#monsterForm'),id=f.elements.monsterId.value||uid('monster'),existing=state.monsters.find(x=>x.id===id),abilities={},saveMods={};ABILITIES.forEach(a=>{if(f.elements[`ability_${a}`].value!=='')abilities[a]=Number(f.elements[`ability_${a}`].value);if(f.elements[`save_${a}`].value!=='')saveMods[a]=Number(f.elements[`save_${a}`].value);});
  const m=normalizeMonster({id,category:f.elements.category.value,source:f.elements.source.value,subtitle:f.elements.subtitle.value,name:f.elements.name.value,type:f.elements.type.value,size:f.elements.size.value,cr:f.elements.cr.value,ac:f.elements.ac.value,hp:f.elements.hp.value,initiative:f.elements.initiative.value,speed:f.elements.speed.value,saves:f.elements.saves.value,abilities,saveMods,damageVulnerabilities:splitList(f.elements.damageVulnerabilities.value),damageResistances:splitList(f.elements.damageResistances.value),damageImmunities:splitList(f.elements.damageImmunities.value),conditionImmunities:splitList(f.elements.conditionImmunities.value),senses:f.elements.senses.value,notes:f.elements.notes.value,legendaryMax:f.elements.legendaryMax.value,lairInitiative:f.elements.lairInitiative.value,traits:collectRows('#traitsRows','traits'),actions:collectRows('#actionsRows','actions'),reactions:collectRows('#reactionsRows','reactions'),legendaryActions:collectRows('#legendaryRows','legendaryActions'),lairActions:collectRows('#lairRows','lairActions'),phases:collectRows('#phasesRows','phases'),resources:collectRows('#resourcesRows','resources')});m.legendaryMax=m.legendaryActions.length?(Number(f.elements.legendaryMax.value)||3):0;mutate(()=>{const idx=state.monsters.findIndex(x=>x.id===id);if(idx>=0)state.monsters[idx]=m;else state.monsters.push(m);},`${m.name} ${existing?'modifié':'créé'} dans la bibliothèque.`);$('#monsterEditor').close();
}
function deleteMonster(id){if(structuralGuard())return;const m=state.monsters.find(x=>x.id===id);if(!m)return;if(!confirm(`Supprimer « ${m.name} » de la bibliothèque ?`))return;mutate(()=>{state.monsters=state.monsters.filter(x=>x.id!==id);state.encounter.participants.filter(p=>p.modelId===id).forEach(p=>p.modelId=null);},`${m.name} supprimé de la bibliothèque.`);$('#monsterEditor').close();}
function exportData(){const data={app:'ENCOUNTER',version:APP_VERSION,exportedAt:new Date().toISOString(),monsters:state.monsters,encounter:state.encounter};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`encounter-${state.encounter.name.toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'combat'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export JSON créé.');}
function importData(raw){if(!String(raw).trim())throw new Error('Aucune donnée JSON fournie.');const data=JSON.parse(raw);checkpoint();if(data.app==='ENCOUNTER'&&data.monsters){state.monsters=data.monsters.map(normalizeMonster);if(data.encounter)state.encounter=pruneLegacyAutoCCPlayers(Object.assign(blankState().encounter,data.encounter,{participants:(data.encounter.participants||[]).map(normalizeParticipant)}));}else if(Array.isArray(data))data.forEach(m=>state.monsters.push(normalizeMonster(m)));else if(data.name)state.monsters.push(normalizeMonster(data));else throw new Error('Format non reconnu');const known=new Set(state.monsters.map(m=>m.id));SAMPLE_MONSTERS.map(normalizeMonster).forEach(m=>{if(!known.has(m.id))state.monsters.push(m);});saveState();render();log('Import JSON effectué.');}
function newEncounter(){if(state.encounter.participants.length&&!confirm('Créer une nouvelle rencontre ? La bibliothèque sera conservée.'))return;mutate(()=>{state.encounter={name:'Rencontre sans titre',round:1,currentTurn:0,selectedId:null,participants:[],log:[],turnNotices:[],pendingPhase:null};ui.multiSelection.clear();ui.multiMode=false;},'Nouvelle rencontre créée.');}
function resetAll(){if(!confirm('Réinitialiser toute l’application, bibliothèque comprise ?'))return;checkpoint();state=blankState();ui.multiSelection.clear();saveState();render();toast('Application réinitialisée.');}
function renderPendingPhase(){const pending=state.encounter.pendingPhase,dlg=$('#phaseDialog');if(!pending||dlg.open)return;const p=state.encounter.participants.find(x=>x.id===pending.participantId),m=modelFor(p),ph=m?.phases.find(x=>x.id===pending.phaseId);if(!p||!ph){state.encounter.pendingPhase=null;saveState();return;}$('#phaseDialogTitle').textContent=`${p.name} — ${ph.name}`;$('#phaseDialogText').textContent=ph.note||'Le boss change de phase.';const stats=[];if(ph.ac!=null)stats.push(`CA ${ph.ac}`);if(ph.speed)stats.push(`Vitesse ${ph.speed}`);if(ph.legendaryMax!=null)stats.push(`${ph.legendaryMax} actions légendaires`);if(ph.addResistances.length)stats.push(`Résistances : ${formatList(ph.addResistances)}`);if(ph.addImmunities.length)stats.push(`Immunités : ${formatList(ph.addImmunities)}`);$('#phaseDialogStats').innerHTML=stats.map(x=>`<span>${esc(x)}</span>`).join('');dlg.showModal();state.encounter.pendingPhase=null;saveState();}
function closeDialogById(id){const d=document.getElementById(id);if(d?.open)d.close();}

addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.dialogClose){e.preventDefault();closeDialogById(t.dataset.dialogClose);return;}
  if(t.value==='cancel'&&t.closest('dialog')){e.preventDefault();t.closest('dialog').close();return;}
  if(t.dataset.closeDrawers!=null){closeDrawers();return;}
  if(t.dataset.addMonster)openAddMonster(t.dataset.addMonster);
  else if(t.dataset.editMonster)openMonsterEditor(t.dataset.editMonster);
  else if(t.dataset.select){state.encounter.selectedId=t.dataset.select;saveState();render();}
  else if(t.dataset.multi){const id=t.dataset.multi;ui.multiSelection.has(id)?ui.multiSelection.delete(id):ui.multiSelection.add(id);render();}
  else if(t.dataset.multiGroup){const members=state.encounter.participants.filter(p=>p.groupId===t.dataset.multiGroup),all=members.every(p=>ui.multiSelection.has(p.id));members.forEach(p=>all?ui.multiSelection.delete(p.id):ui.multiSelection.add(p.id));render();}
  else if(t.dataset.remove)removeParticipant(t.dataset.remove);
  else if(t.dataset.resource){const [pid,rid,delta]=t.dataset.resource.split('|');adjustResource(pid,rid,Number(delta));}
  else if(t.dataset.libraryFilter){ui.libraryFilter=t.dataset.libraryFilter;renderLibrary();}
  else if(t.dataset.quickMode){ui.quickMode=t.dataset.quickMode;renderQuickbar();}
  else if(t.dataset.quickAmount){$('#quickAmount').value=t.dataset.quickAmount;renderQuickbar();}
  else if(t.dataset.hpMode){ui.quickMode=t.dataset.hpMode;renderDetail();}
  else if(t.dataset.hpPreset){const input=$('#stateHpAmount');if(input){input.value=t.dataset.hpPreset;input.focus();}}
  else if(t.dataset.hpApply){applyStateHp(t.dataset.hpApply);}
  else if(t.dataset.tempSet){const p=state.encounter.participants.find(x=>x.id===t.dataset.tempSet),input=$('#stateTempHpAmount'),n=Math.max(0,Number(input?.value)||0);if(p&&!isLair(p))mutate(()=>p.tempHp=n,`${p.name} possède ${n} PV temporaires.`);}
  else if(t.dataset.tempClear){const p=state.encounter.participants.find(x=>x.id===t.dataset.tempClear);if(p&&!isLair(p))mutate(()=>p.tempHp=0,`${p.name} n’a plus de PV temporaires.`);}
  else if(t.dataset.temp){const p=state.encounter.participants.find(x=>x.id===t.dataset.temp),n=Number(prompt('PV temporaires :',p?.tempHp||0));if(p&&!Number.isNaN(n))mutate(()=>p.tempHp=Math.max(0,n),`${p.name} possède ${Math.max(0,n)} PV temporaires.`);}
  else if(t.dataset.sethp){const p=state.encounter.participants.find(x=>x.id===t.dataset.sethp),n=Number(prompt('Fixer les PV actuels :',p?.hp||0));if(p&&!Number.isNaN(n))mutate(()=>{p.hp=Math.max(0,Math.min(p.maxHp,n));checkPhaseTransition(p);},`${p.name} est fixé à ${Math.max(0,Math.min(p.maxHp,n))} PV.`);}
  else if(t.dataset.openCondition){state.encounter.selectedId=t.dataset.openCondition;openConditionDialog();}
  else if(t.dataset.chooseCondition){ui.conditionName=t.dataset.chooseCondition;renderConditionModal();}
  else if(t.dataset.removeCondition){const [pid,cid]=t.dataset.removeCondition.split('|');removeCondition(pid,cid);if($('#conditionDialog').open)renderConditionModal();}
  else if(t.dataset.conditionResult){const [pid,cid,res]=t.dataset.conditionResult.split('|');resolveCondition(pid,cid,res==='success');}
  else if(t.dataset.conditionRoll){const [pid,cid]=t.dataset.conditionRoll.split('|');rollConditionSave(pid,cid);}
  else if(t.dataset.useAbility){const [pid,aid,section,mode]=t.dataset.useAbility.split('|');useAbility(pid,aid,section,mode);}
  else if(t.dataset.recharge){const [pid,aid]=t.dataset.recharge.split('|');testRecharge(pid,aid);}
  else if(t.dataset.economy){const [pid,eco]=t.dataset.economy.split('|');toggleEconomy(pid,eco);}
  else if(t.dataset.abilityCheck){const [pid,a]=t.dataset.abilityCheck.split('|');rollCharacter(pid,a,false);}
  else if(t.dataset.saveCheck){const [pid,a]=t.dataset.saveCheck.split('|');rollCharacter(pid,a,true);}
  else if(t.dataset.detailTab){ui.detailTab=t.dataset.detailTab;renderDetail();}
  else if(t.dataset.addRow)addDynamicRow(t.dataset.addRow);
  else if(t.classList.contains('remove-row'))t.closest('.dynamic-row')?.remove();
});

addEventListener('change',e=>{
  if(e.target.matches('[data-init]')){if(structuralGuard()){render();return;}const p=state.encounter.participants.find(x=>x.id===e.target.dataset.init);if(p){checkpoint();p.initiative=Number(e.target.value)||0;state.encounter.currentTurn=0;state.encounter.selectedId=sortedParticipants()[0]?.id||null;saveState();render();}}
  if(e.target.id==='conditionDuration')updateConditionOptionVisibility();if(e.target.id==='checkDc')ui.checkDc=Math.max(1,Number(e.target.value)||15);
});

$('#monsterSearch').addEventListener('input',renderLibrary);
$('#encounterName').addEventListener('change',e=>{state.encounter.name=e.target.value.trim()||'Rencontre sans titre';saveState();render();});
$('#btnNextTurn').addEventListener('click',requestNextTurn);
$('#btnModePrep').addEventListener('click',()=>setMode('prep'));$('#btnModeCombat').addEventListener('click',()=>setMode('combat'));$('#btnStartCombat').addEventListener('click',()=>{if(window.RPGConnectMJ?.requestFightStart?.())return;setMode('combat')});
$('#btnCombatLock').addEventListener('click',()=>{if(state.ui.mode!=='combat')return;state.ui.locked=!state.ui.locked;saveState();render();toast(state.ui.locked?'Combat verrouillé.':'Combat déverrouillé.');});
$('#btnLibraryDrawer').addEventListener('click',()=>openDrawer('library'));$('#btnPrepOpenLibrary').addEventListener('click',()=>openDrawer('library'));$('#btnJournalDrawer').addEventListener('click',()=>openDrawer('journal'));$('#drawerScrim').addEventListener('click',closeDrawers);
$('#btnMore').addEventListener('click',()=>$('#moreMenu').classList.toggle('hidden'));$('#btnCreateMonster').addEventListener('click',()=>openMonsterEditor());
$('#btnAddPlayer').addEventListener('click',()=>{if(structuralGuard())return;$('#addPlayerForm').reset();$('#addPlayerDialog').showModal();});
$('#btnSortInitiative').addEventListener('click',()=>{if(structuralGuard())return;state.encounter.currentTurn=0;state.encounter.selectedId=sortedParticipants()[0]?.id||null;saveState();render();toast('Initiative retriée.');});
$('#btnMultiMode').addEventListener('click',()=>{ui.multiMode=!ui.multiMode;if(!ui.multiMode)ui.multiSelection.clear();render();});
$('#btnQuickApply').addEventListener('click',()=>applyQuickAmount($('#quickAmount').value));$('#btnQuickState').addEventListener('click',openConditionDialog);
$('#btnNewEncounter').addEventListener('click',newEncounter);$('#btnReset').addEventListener('click',resetAll);$('#btnExport').addEventListener('click',exportData);$('#btnImport').addEventListener('click',()=>{$('#importText').value='';$('#importDialog').showModal();});
$('#btnUndo').addEventListener('click',undo);$('#btnUndoDrawer').addEventListener('click',undo);$('#btnClearLog').addEventListener('click',()=>mutate(()=>state.encounter.log=[],null));
$('#btnLegendaryContinue').addEventListener('click',()=>{$('#legendaryDialog').close();actualAdvanceTurn();});$('#btnLegendaryContinueTop').addEventListener('click',()=>{$('#legendaryDialog').close();actualAdvanceTurn();});
$('#addMonsterForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;addMonsterToCombat(f.elements.monsterId.value,f.elements.count.value,f.elements.initiative.value,f.elements.sharedInitiative.checked,f.elements.includeCompanion?.checked,f.elements.includeLair?.checked);$('#addMonsterDialog').close();});
$('#addPlayerForm').addEventListener('submit',e=>{e.preventDefault();addPlayer(Object.fromEntries(new FormData(e.currentTarget)));$('#addPlayerDialog').close();});
$('#conditionForm').addEventListener('submit',e=>{e.preventDefault();const duration=$('#conditionDuration').value,data={name:ui.conditionName,durationType:duration,remaining:duration==='rounds'?Math.max(1,Number($('#conditionRounds').value)||1):null,saveAbility:duration==='saveEnd'?$('#conditionSaveAbility').value:'',dc:duration==='saveEnd'?Math.max(1,Number($('#conditionDc').value)||15):null,source:$('#conditionSource').value.trim()};addConditionMany(currentTargetIds(),data);$('#conditionDialog').close();});
$('#monsterForm').addEventListener('submit',e=>{e.preventDefault();saveMonsterFromForm();});$('#btnDeleteMonster').addEventListener('click',()=>deleteMonster($('#monsterForm').elements.monsterId.value));
$('#importForm').addEventListener('submit',e=>{e.preventDefault();try{importData($('#importText').value);$('#importDialog').close();toast('Import réussi.');}catch(err){alert('Import impossible : '+err.message);}});


/* =========================================================
   ENCOUNTER V3 — Confort Premium
   ========================================================= */
let lastBackupAt=0;
function backupStore(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');}catch{return[];}}
function writeBackupStore(items){try{localStorage.setItem(BACKUP_KEY,JSON.stringify(items.slice(0,12)));}catch(err){console.warn('Backup local impossible',err);}}
function forceBackup(reason='Backup automatique'){
  const snapshot={id:uid('backup'),createdAt:new Date().toISOString(),reason,name:state.encounter?.name||'Rencontre',state:clone(state)};
  const items=backupStore();items.unshift(snapshot);writeBackupStore(items);lastBackupAt=Date.now();return snapshot;
}
function maybeAutoBackup(){const now=Date.now();if(now-lastBackupAt<BACKUP_INTERVAL)return;forceBackup('Sauvegarde automatique');}
function restoreBackup(id){const b=backupStore().find(x=>x.id===id);if(!b)return;forceBackup('Avant restauration');state=b.state;state.version=APP_VERSION;state.ui=Object.assign({mode:'prep',locked:false,density:'comfortable',deviceProfile:'ipad'},state.ui||{});state.savedEncounters=state.savedEncounters||[];state.trash=state.trash||[];localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render();renderBackupDialog();toast('Backup restauré.');}

function showActionPopup(msg,title='Résolution'){
  const box=$('#actionPopup');if(!box)return;$('#actionPopupTitle').textContent=title;$('#actionPopupText').textContent=msg;box.classList.add('show');clearTimeout(showActionPopup.t);showActionPopup.t=setTimeout(()=>box.classList.remove('show'),3600);
}
function actionLog(msg,title='Action'){log(msg);showActionPopup(msg,title);}

function isBossParticipant(p){const m=modelFor(p);return !!(p?.bossOverride||m?.isBoss||m?.legendaryActions?.length);}
function participantRole(p){const m=modelFor(p);if(isBossParticipant(p))return'boss';if(m?.category==='character'||p.kind==='player')return'pj';if(m?.category==='companion')return'companion';if(m?.category==='npc'||p.kind==='ally')return'npc';return'enemy';}
function roleClass(p){return `role-${participantRole(p)}`;}
function roleLabel(p){return ({boss:'BOSS',pj:'PJ',companion:'COMP.',npc:'PNJ',enemy:'ADVERSAIRE'})[participantRole(p)]||'PARTICIPANT';}

// Remplace le normaliseur V2.5 pour ajouter compétences, catégories, favoris et multiattaque.
const normalizeMonsterV25=normalizeMonster;
normalizeMonster=function(m={}){
  const base=normalizeMonsterV25(m);
  base.category=['character','companion','npc','enemy'].includes(m.category)?m.category:base.category;
  base.favorite=!!m.favorite;base.tags=splitList(m.tags);base.isBoss=!!m.isBoss;
  const mergedSkills=Object.assign({},PROFILE_SKILLS[base.id]||{},m.skills||{});base.skills={};
  SKILLS.forEach(sk=>{const raw=mergedSkills[sk.key];if(raw==null)return;if(typeof raw==='number')base.skills[sk.key]={mod:Number(raw),status:'',note:''};else base.skills[sk.key]={mod:Number(raw.mod)||0,status:raw.status||'',note:raw.note||''};});
  const multiCounts=(base.actions||[]).filter(a=>a.kind==='multiattack').map(a=>parseMultiSequence(a.sequence).reduce((n,x)=>n+x.count,0)).filter(Boolean);
  base.attacksPerAction=Math.max(1,Number(m.attacksPerAction)||0,...multiCounts,base.id==='pj-tuskhan-sand-ivoire'?2:1);
  return base;
};
// Renormalise l'état déjà chargé avant l'override.
state.monsters=state.monsters.map(normalizeMonster);state.encounter.participants=state.encounter.participants.map(normalizeParticipant);
state.ui=Object.assign({mode:'prep',locked:false,density:'comfortable',deviceProfile:'ipad'},state.ui||{});state.savedEncounters=state.savedEncounters||[];state.trash=state.trash||[];

function categoriesForMonster(m){const cats=[...(m.tags||[])];if(m.category==='character')cats.push('PJ');else if(m.category==='companion')cats.push('Compagnons');else if(m.category==='npc')cats.push('PNJ alliés');else cats.push('Adversaires');if(m.isBoss||m.legendaryActions?.length)cats.push('Boss');if(/SRD 5\.1/i.test(m.source||''))cats.push('SRD 5.1');else if(/dossier utilisateur/i.test(m.source||''))cats.push('Dossiers utilisateur');const types=['Aberration','Artificiel','Bête','Céleste','Dragon','Élémentaire','Fée','Fiélon','Géant','Humanoïde','Monstruosité','Mort-vivant','Plante','Vase'];types.forEach(t=>{if(normKey(m.type).includes(normKey(t)))cats.push(t);});return [...new Set(cats.filter(Boolean))];}
function tagsForLibrary(){return [...new Set(state.monsters.flatMap(categoriesForMonster))].sort((a,b)=>a.localeCompare(b,'fr'));}
function toggleFavorite(id){const m=state.monsters.find(x=>x.id===id);if(!m)return;const willFavorite=!m.favorite;mutate(()=>m.favorite=willFavorite,`${m.name} ${willFavorite?'ajouté aux':'retiré des'} favoris.`);}
function renderLibrary(){
  const q=$('#monsterSearch').value.trim().toLowerCase(),locked=isLocked(),tag=ui.libraryTag;
  const ms=state.monsters.filter(m=>(ui.libraryFilter==='all'||m.category===ui.libraryFilter)&&(!ui.favoritesOnly||m.favorite)&&(!tag||categoriesForMonster(m).includes(tag))&&`${m.name} ${m.type} ${m.cr} ${m.source} ${m.subtitle} ${(m.tags||[]).join(' ')}`.toLowerCase().includes(q));
  $('#monsterLibrary').innerHTML=ms.map(m=>{const isChar=m.category==='character',isComp=m.category==='companion',isNpc=m.category==='npc',boss=!!(m.isBoss||m.legendaryActions?.length),cardClass=isChar?'character-card':isComp?'companion-card':isNpc?'npc-card':'',badgeClass=boss?'boss-badge':isChar?'character-badge':isComp?'companion-badge':isNpc?'npc-badge':'',badge=boss?'BOSS':isChar?'PJ':isComp?'COMP.':isNpc?'PNJ':`FP ${esc(m.cr||'—')}`;return `<article class="library-card ${cardClass} ${boss?'boss-library-card':''}"><div class="library-title"><h3>${esc(m.name)}</h3><div class="library-title-badges"><button class="favorite-star ${m.favorite?'on':''}" data-favorite="${m.id}" title="Favori">${m.favorite?'★':'☆'}</button><span class="cr-badge ${badgeClass}">${badge}</span></div></div><div class="library-meta">${esc(m.subtitle||[m.size,m.type].filter(Boolean).join(' · '))} · CA ${m.ac} · ${m.hp} PV${m.lairActions.length?' · 🏰 repaire':''}</div>${m.tags?.length?`<div class="tag-list">${m.tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${m.source?`<div class="source-badge">${esc(m.source)}</div>`:''}<div class="library-actions"><button class="primary small" data-add-monster="${m.id}" ${locked?'disabled':''}>+ Ajouter</button><button class="ghost small" data-edit-monster="${m.id}" ${locked?'disabled':''}>Modifier</button></div></article>`;}).join('')||'<p class="muted">Aucun résultat.</p>';
  $('#btnCreateMonster').disabled=locked;$$('[data-library-filter]').forEach(b=>b.classList.toggle('active',b.dataset.libraryFilter===ui.libraryFilter));
  const sel=$('#libraryTagFilter');if(sel){const old=ui.libraryTag;sel.innerHTML='<option value="">Toutes les catégories</option>'+tagsForLibrary().map(x=>`<option ${x===old?'selected':''}>${esc(x)}</option>`).join('');}
  $('#btnFavoriteFilter')?.classList.toggle('active',ui.favoritesOnly);
}

function targetRule(a){if(a.target&&a.target!=='auto')return a.target;if(a.kind==='heal')return'ally';if(['attack','save','recharge','multiattack'].includes(a.kind))return'enemy';return'none';}
function participantSide(p){if(isLair(p)){const owner=state.encounter.participants.find(x=>x.id===p.lairOwnerId);return owner?participantSide(owner):'enemy';}const m=modelFor(p);if(m?.category==='character'||m?.category==='companion'||m?.category==='npc'||p?.kind==='player'||p?.kind==='ally')return'ally';return'enemy';}
function eligibleTarget(actor,target,a){if(!actor||!target||isLair(target)||target.hp<=0&&a.kind!=='heal')return false;const rule=targetRule(a);if(rule==='any')return true;if(rule==='self')return actor.id===target.id;if(rule==='ally')return participantSide(actor)===participantSide(target);if(rule==='enemy')return participantSide(actor)!==participantSide(target);return false;}
function targetClassFor(p){if(!ui.targeting||isLair(p))return'';const actor=state.encounter.participants.find(x=>x.id===ui.targeting.actorId),a=currentTargetingAbility();return eligibleTarget(actor,p,a)?'target-eligible':'target-ineligible';}
function currentTargetingAbility(){if(!ui.targeting)return null;const actor=state.encounter.participants.find(x=>x.id===ui.targeting.actorId),m=modelFor(actor);if(!m)return null;if(ui.targeting.steps?.length){const id=ui.targeting.steps[ui.targeting.step];return [...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions].find(x=>x.id===id)||null;}return [...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions,...m.traits].find(x=>x.id===ui.targeting.abilityId)||null;}
function renderTargeting(){const bar=$('#targetingBanner');if(!bar)return;if(!ui.targeting){bar.classList.add('hidden');bar.innerHTML='';document.body.classList.remove('targeting-mode');return;}const actor=state.encounter.participants.find(x=>x.id===ui.targeting.actorId),a=currentTargetingAbility();if(!actor||!a){ui.targeting=null;return renderTargeting();}document.body.classList.add('targeting-mode');bar.classList.remove('hidden');const pos=ui.targeting.steps?.length?` · cible ${ui.targeting.step+1}/${ui.targeting.steps.length}`:'';bar.innerHTML=`<div><span class="eyebrow">CIBLAGE</span><strong>${esc(actor.name)} — ${esc(a.name)}${pos}</strong><small>Les cibles possibles sont mises en évidence. Touche une cible pour résoudre l’action.</small></div><button class="ghost" id="btnCancelTargeting">Annuler</button>`;}
function cancelTargeting(){ui.targeting=null;render();}
function startTargeting(pid,aid,section,mode='normal'){
  const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p);if(!p||!m)return;const a=[...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions,...m.traits].find(x=>x.id===aid);if(!a)return;
  if(a.kind==='multiattack'){
    const steps=[];parseMultiSequence(a.sequence).forEach(item=>{const attack=m.actions.find(x=>x.name===item.name);if(attack)for(let i=0;i<item.count;i++)steps.push(attack.id);});
    if(!steps.length)return toast('Séquence de multiattaque incomplète.');ui.targeting={actorId:pid,abilityId:aid,rootAbilityId:aid,section,mode,steps,step:0};
  }else ui.targeting={actorId:pid,abilityId:aid,section,mode,steps:null,step:0};
  state.encounter.selectedId=pid;saveState();render();
}
function getTargetSaveMod(target,ability){const m=modelFor(target),a=ability.save;if(!a)return 0;if(m?.saveMods?.[a]!=null)return Number(m.saveMods[a]);if(m?.abilities?.[a]!=null)return abilityMod(m.abilities[a]);const raw=prompt(`Modificateur du JS ${a} de ${target.name} :`,'0');if(raw===null)return null;return Number(raw)||0;}
function rollDamageCrit(expr,crit=false){if(!crit)return rollExpression(expr);const doubled=String(expr||'').replace(/(\d*)d(\d+)/gi,(_,n,d)=>`${(Number(n)||1)*2}d${d}`);return rollExpression(doubled);}
function applyDamageDirect(target,amount,type=''){const r=resolveDamageAmount(target,amount,type);let left=r.amount;if(target.tempHp>0){const used=Math.min(target.tempHp,left);target.tempHp-=used;left-=used;}target.hp=Math.max(0,target.hp-left);checkPhaseTransition(target);return r;}
function applyHealDirect(target,amount){const before=target.hp;target.hp=Math.min(target.maxHp,target.hp+Math.max(0,amount));return target.hp-before;}
function attacksPerAction(p){return Math.max(1,Number(modelFor(p)?.attacksPerAction)||1);}
function consumeEconomyAfterResolution(p,a,section,{forceAction=false}={}){
  if(section==='legendary'){p.legendaryRemaining=Math.max(0,p.legendaryRemaining-(a.cost||1));return;}if(section==='lair'){p.actionUsed=true;return;}if(section==='reaction'){p.reactionUsed=true;return;}
  const eco=abilityEconomy(a,section);if(eco==='bonus'){p.bonusActionUsed=true;return;}if(eco==='reaction'){p.reactionUsed=true;return;}if(eco!=='action')return;
  if(forceAction||a.kind!=='attack'){p.actionUsed=true;p.attackProgress=attacksPerAction(p);return;}
  p.attackProgress=(p.attackProgress||0)+1;if(p.attackProgress>=attacksPerAction(p))p.actionUsed=true;
}
function resolveTargetSelection(targetId){
  if(!ui.targeting)return false;const t=ui.targeting,actor=state.encounter.participants.find(x=>x.id===t.actorId),target=state.encounter.participants.find(x=>x.id===targetId),m=modelFor(actor),a=currentTargetingAbility();if(!actor||!target||!m||!a)return false;if(!eligibleTarget(actor,target,a)){toast('Cette cible n’est pas valide pour cette action.');return true;}
  checkpoint();let msg=`${actor.name} — ${a.name} → ${target.name}`;let success=true;
  if(a.kind==='attack'||(a.kind==='recharge'&&a.bonus!=null)){
    const r=rollD20(t.mode),bonus=Number(a.bonus)||0,total=r.roll+bonus,crit=r.roll===20,hit=crit||total>=effectiveAc(target);msg+=` : d20 ${r.detail} ${signed(bonus)} = ${total} vs CA ${effectiveAc(target)} → ${hit?'TOUCHÉ':'RATÉ'}`;
    if(hit&&a.damage){const dmg=rollDamageCrit(a.damage,crit),ap=applyDamageDirect(target,dmg.total,a.damageType);msg+=` · ${crit?'CRITIQUE · ':''}${ap.amount} dégâts ${a.damageType||''}${ap.reason?` (${ap.reason})`:''} [${dmg.detail}]`;}
    success=hit;
  }else if(a.kind==='save'||(a.kind==='recharge'&&a.dc!=null)){
    const mod=getTargetSaveMod(target,a);if(mod==null){msg+=` : JS ${a.save||'?'} DD ${a.dc||'?'} à résoudre manuellement`;success=false;}else{const r=rollD20(),total=r.roll+mod,ok=total>=(a.dc||10);msg+=` : JS ${a.save||'?'} ${r.roll} ${signed(mod)} = ${total} vs DD ${a.dc} → ${ok?'RÉUSSITE':'ÉCHEC'}`;if(a.damage){const dmg=rollExpression(a.damage),half=/moiti[ée]/i.test(a.detail||''),raw=ok?(half?Math.floor(dmg.total/2):0):dmg.total,ap=applyDamageDirect(target,raw,a.damageType);msg+=` · ${ap.amount} dégâts ${a.damageType||''}${ap.reason?` (${ap.reason})`:''}`;}success=!ok;}
  }else if(a.kind==='heal'){const heal=rollExpression(a.damage),given=applyHealDirect(target,heal.total);msg+=` : +${given} PV [${heal.detail}]`;}
  if(a.kind==='recharge'){actor.abilityState[a.id]=actor.abilityState[a.id]||{};actor.abilityState[a.id].ready=false;}
  const isMulti=!!t.steps?.length,finalMulti=isMulti&&t.step>=t.steps.length-1;
  consumeEconomyAfterResolution(actor,a,t.section,{forceAction:finalMulti});actionLog(msg,a.name);
  if(isMulti&&!finalMulti){t.step++;state.encounter.selectedId=actor.id;saveState();render();return true;}
  ui.targeting=null;state.encounter.selectedId=actor.id;saveState();render();
  if($('#legendaryDialog').open){const ending=activeParticipant(),bosses=eligibleLegendaryBosses(ending);if(bosses.length)renderLegendaryDialog(ending,bosses);else{$('#legendaryDialog').close();actualAdvanceTurn();}}
  return true;
}

function abilityCard(p,a,section){
  const st=p.abilityState?.[a.id]||{ready:true},eco=abilityEconomy(a,section),economySpent=eco==='action'?p.actionUsed:eco==='bonus'?p.bonusActionUsed:eco==='reaction'?p.reactionUsed:false;
  const unavailable=(a.kind==='recharge'&&!st.ready)||(section==='legendary'&&p.legendaryRemaining<(a.cost||1))||(section==='lair'&&p.actionUsed)||(section!=='legendary'&&section!=='lair'&&economySpent),tags=[];
  if(a.bonus!=null)tags.push(`${signed(a.bonus)}`);if(a.dc!=null)tags.push(`${a.save||'JS'} DD ${a.dc}`);if(a.damage)tags.push(`${a.kind==='heal'?'Soins ':''}${a.damage}${a.damageType?` ${a.damageType}`:''}`);if(a.kind==='recharge')tags.push(`Recharge ${a.recharge||'5–6'}`);if(a.kind==='multiattack'&&a.sequence)tags.push(a.sequence);if(section==='legendary')tags.push(`${a.cost||1} ★`);if(eco!=='none'&&section!=='legendary'&&section!=='lair')tags.push(eco==='bonus'?'Action bonus':eco==='reaction'?'Réaction':'Action');
  if(a.kind==='attack'&&eco==='action'&&attacksPerAction(p)>1&&!p.actionUsed)tags.push(`Attaque ${(p.attackProgress||0)+1}/${attacksPerAction(p)}`);
  const label=a.kind==='attack'?'Cibler':a.kind==='heal'?'Cibler & soigner':a.kind==='multiattack'?'Lancer la multiattaque':'Utiliser';
  return `<article class="ability-card ${unavailable?'unavailable':''}"><div class="ability-head"><div><b>${esc(a.name)}</b><small>${esc(tags.join(' · '))}</small></div>${a.kind==='recharge'&&!st.ready?'<span class="status-badge">Recharge en attente</span>':''}</div>${a.detail?`<p>${esc(a.detail)}</p>`:''}<div class="ability-buttons">${a.kind==='recharge'&&!st.ready?`<button class="primary" data-recharge="${p.id}|${a.id}">🎲 Tester maintenant</button>`:`<button class="primary" ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|normal">${label}</button>`}${a.kind==='attack'?`<button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|adv">Avantage</button><button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|dis">Désav.</button>`:''}</div></article>`;
}
function useAbility(pid,aid,section,mode='normal'){
  const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p);if(!p||!m)return;const a=[...m.traits,...m.actions,...m.reactions,...m.legendaryActions,...m.lairActions].find(x=>x.id===aid);if(!a)return;const st=p.abilityState[aid]||(p.abilityState[aid]={ready:true});
  if(a.kind==='recharge'&&!st.ready)return toast('Cette capacité doit d’abord se recharger.');if(section==='reaction'&&p.reactionUsed)return toast('Réaction déjà utilisée.');if(section==='legendary'&&p.legendaryRemaining<(a.cost||1))return toast('Pas assez d’actions légendaires.');
  if(targetRule(a)!=='none'&&['attack','heal','save','recharge','multiattack'].includes(a.kind))return startTargeting(pid,aid,section,mode);
  checkpoint();let text=`${p.name} — ${a.name}${a.detail?` : ${a.detail}`:''}`;if(a.kind==='recharge')st.ready=false;consumeEconomyAfterResolution(p,a,section,{forceAction:a.kind==='multiattack'});actionLog(text,a.name);saveState();render();
}

function economyStrip(p){const max=attacksPerAction(p),progress=Math.min(max,p.attackProgress||0),actionLabel=p.actionUsed?'utilisée':max>1&&progress?`${progress}/${max} attaques`:'disponible';return `<div class="economy-strip"><button class="economy-marker action ${p.actionUsed?'spent':''}" data-economy="${p.id}|action"><span>●</span><b>Action</b><small>${actionLabel}</small></button><button class="economy-marker bonus ${p.bonusActionUsed?'spent':''}" data-economy="${p.id}|bonus"><span>◆</span><b>Action bonus</b><small>${p.bonusActionUsed?'utilisée':'disponible'}</small></button><button class="economy-marker reaction ${p.reactionUsed?'spent':''}" data-economy="${p.id}|reaction"><span>↯</span><b>Réaction</b><small>${p.reactionUsed?'utilisée':'disponible'}</small></button></div>`;}
const processStartTurnV25=processStartTurn;
processStartTurn=function(p,silent=false){processStartTurnV25(p,silent);if(p)p.attackProgress=0;};
const toggleEconomyV25=toggleEconomy;
toggleEconomy=function(pid,eco){const p=state.encounter.participants.find(x=>x.id===pid);if(!p)return;if(eco!=='action')return toggleEconomyV25(pid,eco);mutate(()=>{p.actionUsed=!p.actionUsed;p.attackProgress=p.actionUsed?attacksPerAction(p):0;},`${p.name} — action ${p.actionUsed?'marquée utilisée':'rendue disponible'}.`);};

function skillData(m,sk){const own=m?.skills?.[sk.key];if(own!=null)return typeof own==='number'?{mod:Number(own),status:'',note:''}:own;if(m?.abilities?.[sk.ability]!=null)return{mod:abilityMod(m.abilities[sk.ability]),status:'',note:''};return null;}
function rollSkill(pid,key){const p=state.encounter.participants.find(x=>x.id===pid),m=modelFor(p),sk=SKILLS.find(x=>x.key===key),data=sk&&skillData(m,sk);if(!p||!sk||!data)return;const dc=Math.max(1,Number($('#checkDc')?.value)||ui.checkDc);ui.checkDc=dc;const r=rollD20(),total=r.roll+Number(data.mod),ok=total>=dc,msg=`${p.name} — ${sk.name} (${sk.ability}) DD ${dc} : ${r.roll} ${signed(data.mod)} = ${total} → ${ok?'RÉUSSITE':'ÉCHEC'}${data.note?` · ${data.note}`:''}.`;actionLog(msg,'Test de compétence');saveState();renderLog();}
function characterChecks(p,m){
  if(!m||!Object.keys(m.abilities||{}).length)return'';
  const abilityRows=ABILITIES.map(a=>{const score=m.abilities[a];if(score==null)return'';const mod=abilityMod(score),save=m.saveMods?.[a]??mod;return `<div class="check-row"><div><b>${a}</b><span>${score} (${signed(mod)})</span></div><button data-ability-check="${p.id}|${a}">Test ${signed(mod)}</button><button data-save-check="${p.id}|${a}">JS ${signed(save)}</button></div>`;}).join('');
  const skillRows=SKILLS.map(sk=>{const d=skillData(m,sk);if(!d)return'';return `<button class="skill-check" data-skill-check="${p.id}|${sk.key}"><span><b>${esc(sk.name)}</b><small>${sk.ability}${d.status?` · ${esc(d.status)}`:''}${d.note?` · ${esc(d.note)}`:''}</small></span><strong>${signed(d.mod)}</strong></button>`;}).join('');
  return `<section class="detail-section checks-section"><div class="section-title-row"><h3>Tests & sauvegardes</h3><label class="dc-field">DD <input id="checkDc" type="number" min="1" value="${ui.checkDc}" inputmode="numeric"></label></div><div class="checks-grid">${abilityRows}</div></section><section class="detail-section"><h3>Compétences</h3><p class="muted tiny">Les 18 compétences utilisent les bonus finaux de la fiche ; maîtrise, expertise et Touche-à-tout sont déjà intégrés.</p><div class="skill-grid">${skillRows}</div></section>`;
}

function saveEncounterSnapshot(asNew=false){if(!state.encounter.participants.length&&!confirm('Sauvegarder une rencontre vide ?'))return;let id=!asNew?state.encounter.savedId:null;let name=state.encounter.name;if(asNew||!id){name=prompt('Nom de la rencontre sauvegardée :',state.encounter.name)||state.encounter.name;id=uid('enc');}const snap=clone(state.encounter);snap.name=name;snap.savedId=id;const record={id,name,updatedAt:new Date().toISOString(),encounter:snap};const idx=state.savedEncounters.findIndex(x=>x.id===id);mutate(()=>{if(idx>=0)state.savedEncounters[idx]=record;else state.savedEncounters.unshift(record);state.encounter.savedId=id;state.encounter.name=name;},`Rencontre « ${name} » sauvegardée.`);renderEncounterManager();}
function loadSavedEncounter(id,launch=false){const rec=state.savedEncounters.find(x=>x.id===id);if(!rec)return;forceBackup('Avant chargement de rencontre');checkpoint();state.encounter=clone(rec.encounter);state.encounter.savedId=id;state.ui.mode=launch?'combat':'prep';state.ui.locked=false;state.encounter.currentTurn=0;state.encounter.selectedId=sortedParticipants()[0]?.id||null;if(launch&&activeParticipant())processStartTurn(activeParticipant(),true);saveState();render();$('#encounterManagerDialog')?.close();toast(`Rencontre « ${rec.name} » ${launch?'lancée':'chargée'}.`);}
function deleteSavedEncounter(id){const idx=state.savedEncounters.findIndex(x=>x.id===id);if(idx<0)return;const rec=state.savedEncounters[idx];mutate(()=>{state.trash.unshift({id:uid('trash'),kind:'encounter',label:rec.name,deletedAt:new Date().toISOString(),data:rec});state.savedEncounters.splice(idx,1);if(state.encounter.savedId===id)state.encounter.savedId=null;},`Rencontre « ${rec.name} » placée dans la corbeille.`);renderEncounterManager();}
function renderEncounterManager(){const el=$('#savedEncounterList');if(!el)return;el.innerHTML=state.savedEncounters.length?state.savedEncounters.map(r=>`<article class="saved-encounter-card"><div><strong>${esc(r.name)}</strong><small>${r.encounter.participants?.length||0} participant(s) · modifiée ${new Date(r.updatedAt).toLocaleString('fr-FR')}</small></div><div><button data-load-encounter="${r.id}">Charger</button><button class="primary" data-launch-encounter="${r.id}">⚔ Lancer</button><button class="danger ghost" data-delete-saved="${r.id}">Corbeille</button></div></article>`).join(''):'<p class="muted">Aucune rencontre sauvegardée.</p>';}
function openEncounterManager(){renderEncounterManager();$('#encounterManagerDialog').showModal();}

function pushTrash(kind,label,data){state.trash.unshift({id:uid('trash'),kind,label,deletedAt:new Date().toISOString(),data:clone(data)});state.trash=state.trash.slice(0,80);}
function renderTrash(){const el=$('#trashList');if(!el)return;el.innerHTML=state.trash.length?state.trash.map(x=>`<article class="trash-card"><div><strong>${esc(x.label)}</strong><small>${x.kind} · ${new Date(x.deletedAt).toLocaleString('fr-FR')}</small></div><button class="primary small" data-restore-trash="${x.id}">Restaurer</button></article>`).join(''):'<p class="muted">La corbeille est vide.</p>';}
function restoreTrash(id){const idx=state.trash.findIndex(x=>x.id===id);if(idx<0)return;const item=state.trash[idx];mutate(()=>{if(item.kind==='monster')state.monsters.push(normalizeMonster(item.data));else if(item.kind==='participant'){(item.data.participants||[item.data]).forEach(p=>state.encounter.participants.push(normalizeParticipant(p)));}else if(item.kind==='encounter')state.savedEncounters.unshift(item.data);state.trash.splice(idx,1);},`${item.label} restauré depuis la corbeille.`);renderTrash();}
function removeParticipant(id){if(structuralGuard())return;const p=state.encounter.participants.find(x=>x.id===id);if(!p)return;mutate(()=>{const ids=new Set([id]);if(!isLair(p))state.encounter.participants.filter(x=>x.lairOwnerId===id).forEach(x=>ids.add(x.id));const removed=state.encounter.participants.filter(x=>ids.has(x.id));pushTrash('participant',p.name,{participants:removed});state.encounter.participants=state.encounter.participants.filter(x=>!ids.has(x.id));ids.forEach(x=>ui.multiSelection.delete(x));if(ids.has(state.encounter.selectedId))state.encounter.selectedId=null;state.encounter.currentTurn=Math.min(state.encounter.currentTurn,Math.max(0,sortedParticipants().length-1));},`${p.name} est placé dans la corbeille.`);}
function deleteMonster(id){if(structuralGuard())return;const m=state.monsters.find(x=>x.id===id);if(!m)return;if(!confirm(`Placer « ${m.name} » dans la corbeille ?`))return;mutate(()=>{pushTrash('monster',m.name,m);state.monsters=state.monsters.filter(x=>x.id!==id);state.encounter.participants.filter(p=>p.modelId===id).forEach(p=>p.modelId=null);},`${m.name} placé dans la corbeille.`);$('#monsterEditor').close();}

function renderBackupDialog(){const el=$('#backupList');if(!el)return;const items=backupStore();el.innerHTML=items.length?items.map(b=>`<article class="backup-card"><div><strong>${esc(b.name)}</strong><small>${esc(b.reason)} · ${new Date(b.createdAt).toLocaleString('fr-FR')}</small></div><button data-restore-backup="${b.id}" class="primary small">Restaurer</button></article>`).join(''):'<p class="muted">Aucun backup disponible.</p>';}

function renderSingleCard(p,active){
  if(isLair(p))return `<article class="combat-card lair-card ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''}"><button class="select-hit" data-select="${p.id}"></button><div class="combat-card-main"><span class="turn-dot">🏰</span><div class="combat-ident"><strong>${esc(p.name)}</strong><small>Action de repaire · ${modelFor(p)?.lairActions.length||0} option(s)</small></div><span class="ini-badge">${p.initiative}</span></div><div class="lair-card-foot">Initiative spéciale de repaire</div></article>`;
  const selected=p.id===state.encounter.selectedId,multiSelected=ui.multiSelection.has(p.id),phase=currentPhase(p),pct=hpPct(p),boss=isBossParticipant(p);
  return `<article class="combat-card ${roleClass(p)} ${targetClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${selected?'selected':''} ${p.hp<=0?'dead':''}"><button class="select-hit" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`} aria-label="Sélectionner ${esc(p.name)}"></button><div class="combat-card-main">${ui.multiMode?`<span class="multi-check ${multiSelected?'on':''}">${multiSelected?'✓':''}</span>`:'<span class="turn-dot"></span>'}<div class="combat-ident"><div class="combat-name-line"><strong>${esc(p.name)}</strong>${boss?'<span class="boss-name-badge">BOSS</span>':''}<span class="role-name-badge">${roleLabel(p)}</span></div><small>${modelFor(p)?.category==='character'?esc(modelFor(p)?.subtitle||'Personnage'):modelFor(p)?.category==='companion'?esc(modelFor(p)?.subtitle||'Compagnon'):modelFor(p)?.category==='npc'?esc(modelFor(p)?.subtitle||'PNJ allié'):p.kind==='enemy'?esc(modelFor(p)?.type||'Adversaire'):'PJ / PNJ'} · CA ${effectiveAc(p)}</small></div><span class="ini-badge">${p.initiative}</span></div><div class="hp-line"><div class="hpbar"><div class="hpfill ${hpClass(p)}" style="width:${pct}%"></div></div><div class="hptext">${p.hp}${p.tempHp?` +${p.tempHp}`:''}/${p.maxHp}</div></div><div class="economy-mini"><i class="eco-action ${p.actionUsed?'spent':''}">A${attacksPerAction(p)>1&&!p.actionUsed?` ${p.attackProgress||0}/${attacksPerAction(p)}`:''}</i><i class="eco-bonus ${p.bonusActionUsed?'spent':''}">B</i><i class="eco-reaction ${p.reactionUsed?'spent':''}">R</i></div><div class="condition-pills">${p.hp<=0?'<span class="pill dead-pill">0 PV</span>':''}${phase?`<span class="pill phase-pill">${esc(phase.name)}</span>`:''}${p.conditions.slice(0,3).map(c=>`<span class="pill">${esc(c.name)}${conditionShort(c)}</span>`).join('')}${p.conditions.length>3?`<span class="pill">+${p.conditions.length-3}</span>`:''}</div></article>`;
}
function renderGroupCard(members,active){
  const first=members[0],activeInside=members.some(p=>p.id===active?.id),alive=members.filter(p=>p.hp>0).length,ini=first.initiative,allSelected=members.every(p=>ui.multiSelection.has(p.id)),sharedInitiative=new Set(members.map(p=>p.initiative)).size===1,worst=members.reduce((a,b)=>hpPct(a)<hpPct(b)?a:b,members[0]);
  return `<article class="group-card ${roleClass(first)} ${hpBandClass(worst)} ${activeInside?'active':''}"><div class="group-head"><button class="group-title" ${ui.multiMode?`data-multi-group="${first.groupId}"`:`data-select="${activeInside?active.id:first.id}"`}><span class="group-icon">${ui.multiMode?(allSelected?'☑':'☐'):'▾'}</span><span><strong>${esc(first.baseName)}</strong><small>${alive}/${members.length} actifs · ${sharedInitiative?'initiative commune':'initiatives individuelles'}</small></span></button><span class="ini-badge">${sharedInitiative?ini:'×'}</span></div><div class="group-members">${members.map((p,i)=>`<button class="member-chip ${roleClass(p)} ${targetClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''} ${ui.multiSelection.has(p.id)?'multi-selected':''}" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`}><span>${i+1}</span><b>${p.hp>0?p.hp:'☠'}</b><small>/${p.maxHp}</small></button>`).join('')}</div></article>`;
}

const renderPrepV25=renderPrep;
renderPrep=function(){renderPrepV25();$$('#prepParticipants .prep-row').forEach(row=>{const id=row.querySelector('[data-select]')?.dataset.select||row.dataset.select;if(!id)return;const p=state.encounter.participants.find(x=>x.id===id),m=modelFor(p);if(!p||isLair(p)||!(m?.category==='enemy'||p.kind==='enemy'))return;const remove=row.querySelector('[data-remove]');if(!remove)return;const permanent=!!(m?.isBoss||m?.legendaryActions?.length),b=document.createElement('button');b.type='button';b.className=`boss-toggle small ${isBossParticipant(p)?'active':''}`;b.dataset.toggleBoss=id;b.textContent=isBossParticipant(p)?'BOSS ✓':'BOSS';b.disabled=permanent;b.title=permanent?'Boss défini sur la fiche':'Basculer le statut BOSS pour cette rencontre';remove.before(b);});};
function toggleBossInstance(id){const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;const m=modelFor(p),permanent=!!(m?.isBoss||m?.legendaryActions?.length);if(permanent)return toast(`${p.name} est défini comme BOSS sur sa fiche.`);mutate(()=>p.bossOverride=!p.bossOverride,`${p.name} ${p.bossOverride?'devient':'cesse d’être'} un BOSS pour cette rencontre.`);}

const renderDetailV25=renderDetail;
renderDetail=function(){renderDetailV25();const p=selectedParticipant();if(!p||isLair(p))return;const h=$('#activeDetail .detail-header h2');if(h&&isBossParticipant(p)&&!h.querySelector('.boss-name-badge'))h.insertAdjacentHTML('beforeend',' <span class="boss-name-badge">BOSS</span>');};
const renderV25=render;
render=function(){const deviceProfile=state.ui.deviceProfile==='samsung-s7fe'?'samsung-s7fe':'ipad';document.body.classList.toggle('density-compact',state.ui.density==='compact');document.body.classList.toggle('device-samsung-s7fe',deviceProfile==='samsung-s7fe');document.body.classList.toggle('device-ipad',deviceProfile==='ipad');renderV25();renderTargeting();const d=$('#btnDensity');if(d)d.textContent=`Densité : ${state.ui.density==='compact'?'Compacte':'Confortable'}`;const device=$('#deviceProfile');if(device&&device.value!==deviceProfile)device.value=deviceProfile;};

function saveMonsterFromForm(){
  if(structuralGuard())return;const f=$('#monsterForm'),id=f.elements.monsterId.value||uid('monster'),existing=state.monsters.find(x=>x.id===id),abilities={},saveMods={},skills={};ABILITIES.forEach(a=>{if(f.elements[`ability_${a}`].value!=='')abilities[a]=Number(f.elements[`ability_${a}`].value);if(f.elements[`save_${a}`].value!=='')saveMods[a]=Number(f.elements[`save_${a}`].value);});SKILLS.forEach(sk=>{const val=f.elements[`skill_${sk.key}`]?.value,status=f.elements[`skillstatus_${sk.key}`]?.value||'';if(val!=='')skills[sk.key]={mod:Number(val),status,note:existing?.skills?.[sk.key]?.note||''};});
  const m=normalizeMonster({id,category:f.elements.category.value,source:f.elements.source.value,subtitle:f.elements.subtitle.value,tags:splitList(f.elements.tags.value),favorite:f.elements.favorite.checked,isBoss:f.elements.isBoss.checked,name:f.elements.name.value,type:f.elements.type.value,size:f.elements.size.value,cr:f.elements.cr.value,ac:f.elements.ac.value,hp:f.elements.hp.value,initiative:f.elements.initiative.value,speed:f.elements.speed.value,attacksPerAction:f.elements.attacksPerAction.value,saves:f.elements.saves.value,abilities,saveMods,skills,damageVulnerabilities:splitList(f.elements.damageVulnerabilities.value),damageResistances:splitList(f.elements.damageResistances.value),damageImmunities:splitList(f.elements.damageImmunities.value),conditionImmunities:splitList(f.elements.conditionImmunities.value),senses:f.elements.senses.value,notes:f.elements.notes.value,legendaryMax:f.elements.legendaryMax.value,lairInitiative:f.elements.lairInitiative.value,traits:collectRows('#traitsRows','traits'),actions:collectRows('#actionsRows','actions'),reactions:collectRows('#reactionsRows','reactions'),legendaryActions:collectRows('#legendaryRows','legendaryActions'),lairActions:collectRows('#lairRows','lairActions'),phases:collectRows('#phasesRows','phases'),resources:collectRows('#resourcesRows','resources')});m.legendaryMax=m.legendaryActions.length?(Number(f.elements.legendaryMax.value)||3):0;mutate(()=>{const idx=state.monsters.findIndex(x=>x.id===id);if(idx>=0)state.monsters[idx]=m;else state.monsters.push(m);},`${m.name} ${existing?'modifié':'créé'} dans la bibliothèque.`);$('#monsterEditor').close();
}
const openMonsterEditorV25=openMonsterEditor;
openMonsterEditor=function(id=null){openMonsterEditorV25(id);const f=$('#monsterForm'),m=id?state.monsters.find(x=>x.id===id):null;if(m){if(f.elements.tags)f.elements.tags.value=formatList(m.tags);if(f.elements.favorite)f.elements.favorite.checked=!!m.favorite;if(f.elements.isBoss)f.elements.isBoss.checked=!!m.isBoss;if(f.elements.attacksPerAction)f.elements.attacksPerAction.value=m.attacksPerAction||1;SKILLS.forEach(sk=>{const d=m.skills?.[sk.key];if(f.elements[`skill_${sk.key}`])f.elements[`skill_${sk.key}`].value=d?.mod??'';if(f.elements[`skillstatus_${sk.key}`])f.elements[`skillstatus_${sk.key}`].value=d?.status||'';});}else{if(f.elements.attacksPerAction)f.elements.attacksPerAction.value=1;}};


function exportData(){
  const data={app:'ENCOUNTER',version:APP_VERSION,exportedAt:new Date().toISOString(),monsters:state.monsters,encounter:state.encounter,savedEncounters:state.savedEncounters,trash:state.trash};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`encounter-v4-${state.encounter.name.toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'combat'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export V4 créé.');
}
function importData(raw){
  if(!String(raw).trim())throw new Error('Aucune donnée JSON fournie.');const data=JSON.parse(raw);forceBackup('Avant import JSON');checkpoint();
  if(data.app==='ENCOUNTER'&&data.monsters){state.monsters=data.monsters.map(normalizeMonster);if(data.encounter)state.encounter=Object.assign(blankState().encounter,data.encounter,{participants:(data.encounter.participants||[]).map(normalizeParticipant)});if(Array.isArray(data.savedEncounters))state.savedEncounters=data.savedEncounters;if(Array.isArray(data.trash))state.trash=data.trash;}
  else if(Array.isArray(data))data.forEach(m=>state.monsters.push(normalizeMonster(m)));else if(data.name)state.monsters.push(normalizeMonster(data));else throw new Error('Format non reconnu');
  const known=new Set(state.monsters.map(m=>m.id));SAMPLE_MONSTERS.map(normalizeMonster).forEach(m=>{if(!known.has(m.id))state.monsters.push(m);});saveState();render();log('Import JSON effectué.');
}
function newEncounter(){if(state.encounter.participants.length&&!confirm('Créer une nouvelle rencontre ? La bibliothèque sera conservée.'))return;forceBackup('Avant nouvelle rencontre');mutate(()=>{state.encounter={name:'Rencontre sans titre',savedId:null,round:1,currentTurn:0,selectedId:null,participants:[],log:[],turnNotices:[],pendingPhase:null};ui.multiSelection.clear();ui.multiMode=false;ui.targeting=null;},'Nouvelle rencontre créée.');}
function resetAll(){if(!confirm('Réinitialiser toute l’application, bibliothèque comprise ?'))return;forceBackup('Avant réinitialisation complète');checkpoint();state=blankState();ui.multiSelection.clear();ui.targeting=null;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render();toast('Application réinitialisée. Un backup a été conservé.');}

// V3 : événements supplémentaires en délégation globale.
addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.closest('#moreMenu')&&t.id!=='btnMore')$('#moreMenu')?.classList.add('hidden');
  if(ui.targeting&&t.dataset.select){e.preventDefault();e.stopImmediatePropagation();resolveTargetSelection(t.dataset.select);return;}
  if(t.id==='btnCancelTargeting'){cancelTargeting();return;}
  if(t.dataset.favorite){toggleFavorite(t.dataset.favorite);return;}
  if(t.dataset.skillCheck){const [pid,key]=t.dataset.skillCheck.split('|');rollSkill(pid,key);return;}
  if(t.dataset.toggleBoss){toggleBossInstance(t.dataset.toggleBoss);return;}
  if(t.dataset.loadEncounter){loadSavedEncounter(t.dataset.loadEncounter,false);return;}
  if(t.dataset.launchEncounter){loadSavedEncounter(t.dataset.launchEncounter,true);return;}
  if(t.dataset.deleteSaved){deleteSavedEncounter(t.dataset.deleteSaved);return;}
  if(t.dataset.restoreTrash){restoreTrash(t.dataset.restoreTrash);return;}
  if(t.dataset.restoreBackup){restoreBackup(t.dataset.restoreBackup);return;}
},true);

$('#btnEncounterManager')?.addEventListener('click',openEncounterManager);$('#btnPrepEncounters')?.addEventListener('click',openEncounterManager);
$('#btnSaveEncounter')?.addEventListener('click',()=>saveEncounterSnapshot(false));$('#btnSaveEncounterAs')?.addEventListener('click',()=>saveEncounterSnapshot(true));
$('#btnBackups')?.addEventListener('click',()=>{renderBackupDialog();$('#backupDialog').showModal();});$('#btnBackupNow')?.addEventListener('click',()=>{forceBackup('Backup manuel');renderBackupDialog();toast('Backup créé.');});
$('#btnTrash')?.addEventListener('click',()=>{renderTrash();$('#trashDialog').showModal();});$('#btnEmptyTrash')?.addEventListener('click',()=>{if(confirm('Vider définitivement la corbeille ?'))mutate(()=>state.trash=[], 'Corbeille vidée.');renderTrash();});
$('#btnDensity')?.addEventListener('click',()=>{state.ui.density=state.ui.density==='compact'?'comfortable':'compact';saveState();render();});
$('#deviceProfile')?.addEventListener('change',e=>{state.ui.deviceProfile=e.target.value==='samsung-s7fe'?'samsung-s7fe':'ipad';saveState();render();toast(state.ui.deviceProfile==='samsung-s7fe'?'Interface Samsung S7 FE activée.':'Interface iPad activée.');});
$('#btnFavoriteFilter')?.addEventListener('click',()=>{ui.favoritesOnly=!ui.favoritesOnly;renderLibrary();});$('#libraryTagFilter')?.addEventListener('change',e=>{ui.libraryTag=e.target.value;renderLibrary();});

// Démarre avec un backup de migration V3 et maintient des snapshots périodiques.
if(!backupStore().length)forceBackup('Migration vers V3');
setInterval(maybeAutoBackup,BACKUP_INTERVAL);
// Les opérations sensibles créent leur propre backup dans newEncounter(), resetAll() et importData().


/* =========================================================
   ENCOUNTER V3.5 — Confort Premium Boost
   ========================================================= */
ui.flashEffects=ui.flashEffects||{};
function setTargetFlash(id,type){ui.flashEffects[id]={type,until:Date.now()+1500};}
function flashClassFor(p){const f=ui.flashEffects?.[p.id];return f&&f.until>Date.now()?`flash-${f.type}`:'';}
function miniEconomyButtons(p){const max=attacksPerAction(p),progress=Math.min(max,p.attackProgress||0),aText=max>1&&!p.actionUsed?`A ${progress}/${max}`:'A';return `<span class="economy-mini-inline"><button type="button" class="mini-eco-btn eco-action ${p.actionUsed?'spent':''}" data-economy="${p.id}|action" title="Action">${aText}</button><button type="button" class="mini-eco-btn eco-bonus ${p.bonusActionUsed?'spent':''}" data-economy="${p.id}|bonus" title="Action bonus">B</button><button type="button" class="mini-eco-btn eco-reaction ${p.reactionUsed?'spent':''}" data-economy="${p.id}|reaction" title="Réaction">R</button></span>`;}

showActionPopup=function(msg,title='Résolution'){
  const box=$('#actionPopup');if(!box)return;$('#actionPopupTitle').textContent=title;$('#actionPopupText').textContent=msg;box.classList.add('show');clearTimeout(showActionPopup.t);showActionPopup.t=setTimeout(()=>box.classList.remove('show'),3000);
};
$('#actionPopup')?.addEventListener('click',()=>{clearTimeout(showActionPopup.t);$('#actionPopup').classList.remove('show');});

function openParticipantEditor(id){
  const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;
  const f=$('#participantEditorForm'),m=modelFor(p),permanent=!!(m?.isBoss||m?.legendaryActions?.length),enemyInstance=p.kind==='enemy'||m?.category==='enemy';
  f.elements.participantId.value=p.id;f.elements.name.value=p.name;f.elements.kind.value=p.kind==='player'?'player':p.kind==='ally'?'ally':'enemy';f.elements.ac.value=effectiveAc(p);f.dataset.originalAc=String(effectiveAc(p));f.elements.hp.value=p.hp;f.elements.maxHp.value=p.maxHp;f.elements.tempHp.value=p.tempHp||0;f.elements.initiative.value=p.initiative;f.elements.speedOverride.value=p.speedOverride||'';
  f.elements.bossOverride.checked=permanent||!!p.bossOverride;f.elements.bossOverride.disabled=permanent||!enemyInstance;
  const hint=$('#participantEditorHint');
  hint.textContent=permanent?`${m?`Modèle : ${m.name}. `:''}Le statut BOSS est imposé par la fiche et ne peut pas être retiré sur cette instance.`:`${m?`Modèle : ${m.name}. `:''}Les changements ci-dessus ne modifient que cette instance${p.groupId?' du groupe':''}.`;
  $('#participantEditorDialog').showModal();
}
function saveParticipantInstance(){
  const f=$('#participantEditorForm'),p=state.encounter.participants.find(x=>x.id===f.elements.participantId.value);if(!p)return;
  const m=modelFor(p),permanent=!!(m?.isBoss||m?.legendaryActions?.length),maxHp=Math.max(1,Number(f.elements.maxHp.value)||1),hp=Math.max(0,Math.min(maxHp,Number(f.elements.hp.value)||0));
  mutate(()=>{p.name=f.elements.name.value.trim()||p.name;p.kind=f.elements.kind.value;const newAc=Math.max(0,Number(f.elements.ac.value)||0),originalAc=Number(f.dataset.originalAc);if(p.acOverride!=null||newAc!==originalAc)p.acOverride=newAc;else p.ac=newAc;p.maxHp=maxHp;p.hp=hp;p.tempHp=Math.max(0,Number(f.elements.tempHp.value)||0);p.initiative=Number(f.elements.initiative.value)||0;p.speedOverride=f.elements.speedOverride.value.trim();if(!permanent)p.bossOverride=p.kind==='enemy'&&!!f.elements.bossOverride.checked;checkPhaseTransition(p);},`${p.name} — instance de combat modifiée.`);$('#participantEditorDialog').close();
}
$('#participantEditorForm')?.addEventListener('submit',e=>{e.preventDefault();saveParticipantInstance();});
addEventListener('click',e=>{const b=e.target.closest('[data-edit-participant]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openParticipantEditor(b.dataset.editParticipant);},true);

// Surbrillance aussi pour les ajustements rapides de la barre inférieure.
applyDamageMany=function(ids,amount,type=''){amount=Math.max(0,Number(amount)||0);if(!amount||!ids.length)return;const details=[];checkpoint();ids.forEach(id=>{const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;const r=resolveDamageAmount(p,amount,type);let left=r.amount;if(p.tempHp>0){const used=Math.min(p.tempHp,left);p.tempHp-=used;left-=used;}p.hp=Math.max(0,p.hp-left);checkPhaseTransition(p);setTargetFlash(p.id,r.amount>0?'damage':'miss');details.push(`${p.name}: ${r.amount}${r.reason?` (${r.reason})`:''}`);});if(ids.length===1)state.encounter.selectedId=ids[0];const msg=`${amount} dégâts${type?` ${type}`:''} → ${details.join(' · ')}`;log(msg);saveState();render();showActionPopup(msg,'Dégâts');};
applyHealMany=function(ids,amount){amount=Math.max(0,Number(amount)||0);if(!amount||!ids.length)return;const details=[];checkpoint();ids.forEach(id=>{const p=state.encounter.participants.find(x=>x.id===id);if(!p||isLair(p))return;const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+amount);const given=p.hp-before;setTargetFlash(p.id,given>0?'heal':'miss');details.push(`${p.name}: +${given} PV`);});if(ids.length===1)state.encounter.selectedId=ids[0];const msg=details.join(' · ');log(msg);saveState();render();showActionPopup(msg,'Soins');};

// Ciblage V3.5 : flash rouge/vert/blanc selon le résultat.
resolveTargetSelection=function(targetId){
  if(!ui.targeting)return false;const t=ui.targeting,actor=state.encounter.participants.find(x=>x.id===t.actorId),target=state.encounter.participants.find(x=>x.id===targetId),m=modelFor(actor),a=currentTargetingAbility();if(!actor||!target||!m||!a)return false;if(!eligibleTarget(actor,target,a)){toast('Cette cible n’est pas valide pour cette action.');return true;}
  checkpoint();let msg=`${actor.name} — ${a.name} → ${target.name}`;let flash='miss';
  if(a.kind==='attack'||(a.kind==='recharge'&&a.bonus!=null)){
    const r=rollD20(t.mode),bonus=Number(a.bonus)||0,total=r.roll+bonus,crit=r.roll===20,hit=crit||total>=effectiveAc(target);msg+=` : d20 ${r.detail} ${signed(bonus)} = ${total} vs CA ${effectiveAc(target)} → ${hit?'TOUCHÉ':'RATÉ'}`;
    if(hit&&a.damage){const dmg=rollDamageCrit(a.damage,crit),ap=applyDamageDirect(target,dmg.total,a.damageType);msg+=` · ${crit?'CRITIQUE · ':''}${ap.amount} dégâts ${a.damageType||''}${ap.reason?` (${ap.reason})`:''} [${dmg.detail}]`;flash=ap.amount>0?'damage':'miss';} else flash=hit?'miss':'miss';
  }else if(a.kind==='save'||(a.kind==='recharge'&&a.dc!=null)){
    const mod=getTargetSaveMod(target,a);if(mod==null){msg+=` : JS ${a.save||'?'} DD ${a.dc||'?'} à résoudre manuellement`;flash='miss';}else{const r=rollD20(),total=r.roll+mod,ok=total>=(a.dc||10);msg+=` : JS ${a.save||'?'} ${r.roll} ${signed(mod)} = ${total} vs DD ${a.dc} → ${ok?'RÉUSSITE':'ÉCHEC'}`;if(a.damage){const dmg=rollExpression(a.damage),half=/moiti[ée]/i.test(a.detail||''),raw=ok?(half?Math.floor(dmg.total/2):0):dmg.total,ap=applyDamageDirect(target,raw,a.damageType);msg+=` · ${ap.amount} dégâts ${a.damageType||''}${ap.reason?` (${ap.reason})`:''}`;flash=ap.amount>0?'damage':'miss';}}
  }else if(a.kind==='heal'){const heal=rollExpression(a.damage),given=applyHealDirect(target,heal.total);msg+=` : +${given} PV [${heal.detail}]`;flash=given>0?'heal':'miss';}
  setTargetFlash(target.id,flash);
  if(a.kind==='recharge'){actor.abilityState[a.id]=actor.abilityState[a.id]||{};actor.abilityState[a.id].ready=false;}
  const isMulti=!!t.steps?.length,finalMulti=isMulti&&t.step>=t.steps.length-1;consumeEconomyAfterResolution(actor,a,t.section,{forceAction:finalMulti});actionLog(msg,a.name);
  if(isMulti&&!finalMulti){t.step++;state.encounter.selectedId=actor.id;saveState();render();return true;}ui.targeting=null;state.encounter.selectedId=actor.id;saveState();render();if($('#legendaryDialog').open){const ending=activeParticipant(),bosses=eligibleLegendaryBosses(ending);if(bosses.length)renderLegendaryDialog(ending,bosses);else{$('#legendaryDialog').close();actualAdvanceTurn();}}return true;
};

// Une seule pastille BOSS : role-name-badge fait foi sur la ligne de combat.
renderSingleCard=function(p,active){
  if(isLair(p))return `<article class="combat-card lair-card ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''}"><button class="select-hit" data-select="${p.id}"></button><div class="combat-card-main"><span class="turn-dot">🏰</span><div class="combat-ident"><strong>${esc(p.name)}</strong><small>Action de repaire · ${modelFor(p)?.lairActions.length||0} option(s)</small></div><span class="ini-badge">${p.initiative}</span></div><div class="lair-card-foot">Initiative spéciale de repaire</div></article>`;
  const selected=p.id===state.encounter.selectedId,multiSelected=ui.multiSelection.has(p.id),phase=currentPhase(p),pct=hpPct(p);
  return `<article class="combat-card ${roleClass(p)} ${targetClassFor(p)} ${flashClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${selected?'selected':''} ${p.hp<=0?'dead':''}"><button class="select-hit" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`} aria-label="Sélectionner ${esc(p.name)}"></button><button type="button" class="instance-edit-btn" data-edit-participant="${p.id}" title="Modifier cette instance">✎</button><div class="combat-card-main">${ui.multiMode?`<span class="multi-check ${multiSelected?'on':''}">${multiSelected?'✓':''}</span>`:'<span class="turn-dot"></span>'}<div class="combat-ident"><div class="combat-name-line"><strong>${esc(p.name)}</strong><span class="role-name-badge">${roleLabel(p)}</span>${miniEconomyButtons(p)}</div><small>${modelFor(p)?.category==='character'?esc(modelFor(p)?.subtitle||'Personnage'):modelFor(p)?.category==='companion'?esc(modelFor(p)?.subtitle||'Compagnon'):modelFor(p)?.category==='npc'?esc(modelFor(p)?.subtitle||'PNJ allié'):p.kind==='enemy'?esc(modelFor(p)?.type||'Adversaire'):'PJ / PNJ'} · CA ${effectiveAc(p)}</small></div><span class="ini-badge">${p.initiative}</span></div><div class="hp-line"><div class="hpbar"><div class="hpfill ${hpClass(p)}" style="width:${pct}%"></div></div><div class="hptext">${p.hp}${p.tempHp?` +${p.tempHp}`:''}/${p.maxHp}</div></div><div class="condition-pills">${p.hp<=0?'<span class="pill dead-pill">0 PV</span>':''}${phase?`<span class="pill phase-pill">${esc(phase.name)}</span>`:''}${p.conditions.slice(0,3).map(c=>`<span class="pill">${esc(c.name)}${conditionShort(c)}</span>`).join('')}${p.conditions.length>3?`<span class="pill">+${p.conditions.length-3}</span>`:''}</div></article>`;
};
renderGroupCard=function(members,active){
  const first=members[0],activeInside=members.some(p=>p.id===active?.id),alive=members.filter(p=>p.hp>0).length,ini=first.initiative,allSelected=members.every(p=>ui.multiSelection.has(p.id)),sharedInitiative=new Set(members.map(p=>p.initiative)).size===1,worst=members.reduce((a,b)=>hpPct(a)<hpPct(b)?a:b,members[0]);
  return `<article class="group-card ${roleClass(first)} ${hpBandClass(worst)} ${activeInside?'active':''}"><div class="group-head"><button class="group-title" ${ui.multiMode?`data-multi-group="${first.groupId}"`:`data-select="${activeInside?active.id:first.id}"`}><span class="group-icon">${ui.multiMode?(allSelected?'☑':'☐'):'▾'}</span><span><strong>${esc(first.baseName)}</strong><small>${alive}/${members.length} actifs · ${sharedInitiative?'initiative commune':'initiatives individuelles'}</small></span></button><span class="role-name-badge">${roleLabel(first)}</span><span class="ini-badge">${sharedInitiative?ini:'×'}</span></div><div class="group-members">${members.map((p,i)=>`<div class="member-wrap"><button class="member-chip ${roleClass(p)} ${targetClassFor(p)} ${flashClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''} ${ui.multiSelection.has(p.id)?'multi-selected':''}" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`}><span>${i+1}</span><b>${p.hp>0?p.hp:'☠'}</b><small>/${p.maxHp} · CA ${effectiveAc(p)}</small><span class="member-mini-economy"><em class="${p.actionUsed?'spent':''}">A</em><em class="${p.bonusActionUsed?'spent':''}">B</em><em class="${p.reactionUsed?'spent':''}">R</em></span></button><button type="button" class="instance-edit-btn" data-edit-participant="${p.id}" title="Modifier ${esc(p.name)}">✎</button></div>`).join('')}</div></article>`;
};

// Ajoute un crayon d'instance sur chaque ligne de préparation sans modifier le modèle de bibliothèque.
const renderPrepV3BeforeBoost=renderPrep;
renderPrep=function(){renderPrepV3BeforeBoost();$$('#prepParticipants .prep-row').forEach(row=>{const id=row.dataset.select||row.querySelector('[data-select]')?.dataset.select;if(!id||state.encounter.participants.find(x=>x.id===id&&isLair(x)))return;if(row.querySelector('[data-edit-participant]'))return;const remove=row.querySelector('[data-remove]');if(!remove)return;const b=document.createElement('button');b.type='button';b.className='ghost small instance-edit-prep';b.dataset.editParticipant=id;b.textContent='✎';b.title='Modifier cette instance';remove.before(b);});};

// Le détail permet aussi d'éditer immédiatement l'instance sélectionnée.
const renderDetailV3BeforeBoost=renderDetail;
renderDetail=function(){renderDetailV3BeforeBoost();const p=selectedParticipant();if(!p||isLair(p))return;const host=$('#activeDetail .header-resources');if(host&&!host.querySelector('[data-edit-participant]'))host.insertAdjacentHTML('beforeend',`<button type="button" class="ghost small" data-edit-participant="${p.id}">✎ Instance</button>`);};


/* =========================================================
   ENCOUNTER V3.6 — Correctifs ergonomiques
   ========================================================= */

// Pop-up : 5 secondes, fermeture immédiate au toucher.
showActionPopup=function(msg,title='Résolution'){
  const box=$('#actionPopup');if(!box)return;
  $('#actionPopupTitle').textContent=title;$('#actionPopupText').textContent=msg;
  box.classList.add('show');clearTimeout(showActionPopup.t);
  showActionPopup.t=setTimeout(()=>box.classList.remove('show'),5000);
};

// Surbrillance cible : 2,5 secondes.
setTargetFlash=function(id,type){ui.flashEffects[id]={type,until:Date.now()+2500};};

// L'action est dépensée dès la première attaque. Les attaques supplémentaires de la même
// action restent néanmoins utilisables jusqu'à la limite attaques/action.
consumeEconomyAfterResolution=function(p,a,section,{forceAction=false}={}){
  if(section==='legendary'){p.legendaryRemaining=Math.max(0,p.legendaryRemaining-(a.cost||1));return;}
  if(section==='lair'){p.actionUsed=true;return;}
  if(section==='reaction'){p.reactionUsed=true;return;}
  const eco=abilityEconomy(a,section);
  if(eco==='bonus'){p.bonusActionUsed=true;return;}
  if(eco==='reaction'){p.reactionUsed=true;return;}
  if(eco!=='action')return;
  p.actionUsed=true;
  if(a.kind==='attack'){
    p.attackProgress=Math.min(attacksPerAction(p),(p.attackProgress||0)+1);
    return;
  }
  p.attackProgress=attacksPerAction(p);
};

// Une attaque reste cliquable après consommation de l'Action uniquement si elle constitue
// une attaque supplémentaire encore permise par cette même action.
abilityCard=function(p,a,section){
  const st=p.abilityState?.[a.id]||{ready:true},eco=abilityEconomy(a,section);
  const max=attacksPerAction(p),progress=Math.min(max,p.attackProgress||0);
  const continuation=eco==='action'&&a.kind==='attack'&&p.actionUsed&&progress<max;
  const economySpent=eco==='action'?p.actionUsed:eco==='bonus'?p.bonusActionUsed:eco==='reaction'?p.reactionUsed:false;
  const unavailable=(a.kind==='recharge'&&!st.ready)||(section==='legendary'&&p.legendaryRemaining<(a.cost||1))||(section==='lair'&&p.actionUsed)||(section!=='legendary'&&section!=='lair'&&economySpent&&!continuation),tags=[];
  if(a.bonus!=null)tags.push(`${signed(a.bonus)}`);if(a.dc!=null)tags.push(`${a.save||'JS'} DD ${a.dc}`);if(a.damage)tags.push(`${a.kind==='heal'?'Soins ':''}${a.damage}${a.damageType?` ${a.damageType}`:''}`);if(a.kind==='recharge')tags.push(`Recharge ${a.recharge||'5–6'}`);if(a.kind==='multiattack'&&a.sequence)tags.push(a.sequence);if(section==='legendary')tags.push(`${a.cost||1} ★`);if(eco!=='none'&&section!=='legendary'&&section!=='lair')tags.push(eco==='bonus'?'Action bonus':eco==='reaction'?'Réaction':'Action');
  if(a.kind==='attack'&&eco==='action'&&max>1)tags.push(`Attaque ${Math.min(max,progress+1)}/${max}`);
  const label=a.kind==='attack'?'Cibler':a.kind==='heal'?'Cibler & soigner':a.kind==='multiattack'?'Lancer la multiattaque':'Utiliser';
  return `<article class="ability-card ${unavailable?'unavailable':''}"><div class="ability-head"><div><b>${esc(a.name)}</b><small>${esc(tags.join(' · '))}</small></div>${a.kind==='recharge'&&!st.ready?'<span class="status-badge">Recharge en attente</span>':''}</div>${a.detail?`<p>${esc(a.detail)}</p>`:''}<div class="ability-buttons">${a.kind==='recharge'&&!st.ready?`<button class="primary" data-recharge="${p.id}|${a.id}">🎲 Tester maintenant</button>`:`<button class="primary" ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|normal">${label}</button>`}${a.kind==='attack'?`<button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|adv">Avantage</button><button ${unavailable?'disabled':''} data-use-ability="${p.id}|${a.id}|${section}|dis">Désav.</button>`:''}</div></article>`;
};

miniEconomyButtons=function(p){
  const max=attacksPerAction(p),progress=Math.min(max,p.attackProgress||0),aText=max>1?`A ${progress}/${max}`:'A';
  return `<span class="economy-mini-inline"><button type="button" class="mini-eco-btn eco-action ${p.actionUsed?'spent':''} ${p.actionUsed&&progress<max?'partial':''}" data-economy="${p.id}|action" title="Action">${aText}</button><button type="button" class="mini-eco-btn eco-bonus ${p.bonusActionUsed?'spent':''}" data-economy="${p.id}|bonus" title="Action bonus">B</button><button type="button" class="mini-eco-btn eco-reaction ${p.reactionUsed?'spent':''}" data-economy="${p.id}|reaction" title="Réaction">R</button></span>`;
};

economyStrip=function(p){
  const max=attacksPerAction(p),progress=Math.min(max,p.attackProgress||0);
  const actionLabel=p.actionUsed?(max>1&&progress<max?`utilisée · ${progress}/${max} attaques`:'utilisée'):'disponible';
  return `<div class="economy-strip"><button class="economy-marker action ${p.actionUsed?'spent':''} ${p.actionUsed&&progress<max?'partial':''}" data-economy="${p.id}|action"><span>●</span><b>Action</b><small>${actionLabel}</small></button><button class="economy-marker bonus ${p.bonusActionUsed?'spent':''}" data-economy="${p.id}|bonus"><span>◆</span><b>Action bonus</b><small>${p.bonusActionUsed?'utilisée':'disponible'}</small></button><button class="economy-marker reaction ${p.reactionUsed?'spent':''}" data-economy="${p.id}|reaction"><span>↯</span><b>Réaction</b><small>${p.reactionUsed?'utilisée':'disponible'}</small></button></div>`;
};

// Conserve le tiroir Bibliothèque ouvert après ajout. Le scrim extérieur reste son moyen
// normal de fermeture.
const addMonsterToCombatV35=addMonsterToCombat;
addMonsterToCombat=function(...args){
  const keepLibrary=ui.drawer==='library';
  addMonsterToCombatV35(...args);
  if(keepLibrary){ui.drawer='library';renderDrawers();}
};

// Backups : suppression individuelle.
function deleteBackup(id){
  const items=backupStore(),found=items.find(x=>x.id===id);if(!found)return;
  writeBackupStore(items.filter(x=>x.id!==id));renderBackupDialog();toast('Backup supprimé.');
}
renderBackupDialog=function(){
  const el=$('#backupList');if(!el)return;const items=backupStore();
  el.innerHTML=items.length?items.map(b=>`<article class="backup-card"><div><strong>${esc(b.name)}</strong><small>${esc(b.reason)} · ${new Date(b.createdAt).toLocaleString('fr-FR')}</small></div><div class="backup-card-actions"><button data-restore-backup="${b.id}" class="primary small">Restaurer</button><button data-delete-backup="${b.id}" class="danger ghost small">Supprimer</button></div></article>`).join(''):'<p class="muted">Aucun backup disponible.</p>';
};
addEventListener('click',e=>{const b=e.target.closest('[data-delete-backup]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(confirm('Supprimer définitivement ce backup ?'))deleteBackup(b.dataset.deleteBackup);},true);

// Lisibilité combat : PV prioritaires, CA secondaire.
renderSingleCard=function(p,active){
  if(isLair(p))return `<article class="combat-card lair-card ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''}"><button class="select-hit" data-select="${p.id}"></button><div class="combat-card-main"><span class="turn-dot">🏰</span><div class="combat-ident"><strong>${esc(p.name)}</strong><small>Action de repaire · ${modelFor(p)?.lairActions.length||0} option(s)</small></div><span class="ini-badge">${p.initiative}</span></div><div class="lair-card-foot">Initiative spéciale de repaire</div></article>`;
  const selected=p.id===state.encounter.selectedId,multiSelected=ui.multiSelection.has(p.id),phase=currentPhase(p),pct=hpPct(p);
  return `<article class="combat-card ${roleClass(p)} ${targetClassFor(p)} ${flashClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${selected?'selected':''} ${p.hp<=0?'dead':''}"><button class="select-hit" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`} aria-label="Sélectionner ${esc(p.name)}"></button><button type="button" class="instance-edit-btn" data-edit-participant="${p.id}" title="Modifier cette instance">✎</button><div class="combat-card-main">${ui.multiMode?`<span class="multi-check ${multiSelected?'on':''}">${multiSelected?'✓':''}</span>`:'<span class="turn-dot"></span>'}<div class="combat-ident"><div class="combat-name-line"><strong>${esc(p.name)}</strong><span class="role-name-badge">${roleLabel(p)}</span>${miniEconomyButtons(p)}</div><small>${modelFor(p)?.category==='character'?esc(modelFor(p)?.subtitle||'Personnage'):modelFor(p)?.category==='companion'?esc(modelFor(p)?.subtitle||'Compagnon'):modelFor(p)?.category==='npc'?esc(modelFor(p)?.subtitle||'PNJ allié'):p.kind==='enemy'?esc(modelFor(p)?.type||'Adversaire'):'PJ / PNJ'} · <span class="ca-secondary">CA ${effectiveAc(p)}</span></small></div><span class="ini-badge">${p.initiative}</span></div><div class="hp-line"><div class="hpbar"><div class="hpfill ${hpClass(p)}" style="width:${pct}%"></div></div><div class="hptext"><span>PV</span> ${p.hp}${p.tempHp?` +${p.tempHp}`:''}<small>/${p.maxHp}</small></div></div><div class="condition-pills">${p.hp<=0?'<span class="pill dead-pill">0 PV</span>':''}${phase?`<span class="pill phase-pill">${esc(phase.name)}</span>`:''}${p.conditions.slice(0,3).map(c=>`<span class="pill">${esc(c.name)}${conditionShort(c)}</span>`).join('')}${p.conditions.length>3?`<span class="pill">+${p.conditions.length-3}</span>`:''}</div></article>`;
};

renderGroupCard=function(members,active){
  const first=members[0],activeInside=members.some(p=>p.id===active?.id),alive=members.filter(p=>p.hp>0).length,ini=first.initiative,allSelected=members.every(p=>ui.multiSelection.has(p.id)),sharedInitiative=new Set(members.map(p=>p.initiative)).size===1,worst=members.reduce((a,b)=>hpPct(a)<hpPct(b)?a:b,members[0]);
  return `<article class="group-card ${roleClass(first)} ${hpBandClass(worst)} ${activeInside?'active':''}"><div class="group-head"><button class="group-title" ${ui.multiMode?`data-multi-group="${first.groupId}"`:`data-select="${activeInside?active.id:first.id}"`}><span class="group-icon">${ui.multiMode?(allSelected?'☑':'☐'):'▾'}</span><span><strong>${esc(first.baseName)}</strong><small>${alive}/${members.length} actifs · ${sharedInitiative?'initiative commune':'initiatives individuelles'}</small></span></button><span class="role-name-badge">${roleLabel(first)}</span><span class="ini-badge">${sharedInitiative?ini:'×'}</span></div><div class="group-members">${members.map((p,i)=>`<div class="member-wrap"><button class="member-chip ${roleClass(p)} ${targetClassFor(p)} ${flashClassFor(p)} ${hpBandClass(p)} ${p.id===active?.id?'active':''} ${p.id===state.encounter.selectedId?'selected':''} ${ui.multiSelection.has(p.id)?'multi-selected':''}" ${ui.multiMode?`data-multi="${p.id}"`:`data-select="${p.id}"`}><span class="member-index">${i+1}</span><div class="member-vitals"><b>${p.hp>0?p.hp:'☠'}<small>/${p.maxHp}</small></b><em>PV</em></div><div class="member-ca">CA ${effectiveAc(p)}</div><span class="member-mini-economy"><em class="${p.actionUsed?'spent':''}">A${attacksPerAction(p)>1?` ${Math.min(attacksPerAction(p),p.attackProgress||0)}/${attacksPerAction(p)}`:''}</em><em class="${p.bonusActionUsed?'spent':''}">B</em><em class="${p.reactionUsed?'spent':''}">R</em></span></button><button type="button" class="instance-edit-btn" data-edit-participant="${p.id}" title="Modifier ${esc(p.name)}">✎</button></div>`).join('')}</div></article>`;
};

// Dans le panneau détaillé en combat, PV passent avant CA et deviennent la valeur dominante.
const renderV35Final=render;
render=function(){
  renderV35Final();
  if(state.ui.mode==='combat'){
    const grid=$('#activeDetail .stat-grid');if(grid&&grid.children.length>=2){const ac=grid.children[0],hp=grid.children[1];hp.classList.add('v36-pv-primary');ac.classList.add('v36-ca-secondary');if(grid.firstElementChild!==hp)grid.insertBefore(hp,ac);}
  }
};


render();
