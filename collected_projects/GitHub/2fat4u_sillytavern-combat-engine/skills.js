import { parseDice } from './dice.js?v=2.0.0-beta.2-hotfix.2';
import { CLASSIC_STATUSES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
import { damageType, isImmune } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { mechanicsFrom } from './custom-effects.js?v=2.0.0-beta.2-hotfix.2';
import { TACTICS } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
import { unitCost } from './consumption.js?v=2.0.0-beta.2-hotfix.2';
import { decimal, rounded } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
const require = (ok,message) => { if(!ok) throw new Error(message); };
const integer = (v,min,max) => { const n=Number(v); require(v !== '' && v != null && typeof v !== 'boolean' && Number.isSafeInteger(n) && n>=min && n<=max,'Fähigkeit: ganze Zahl erforderlich.'); return n; };
const text = (v, max=100) => String(v??'').trim().slice(0,max);
export const SKILLS = Object.freeze({
    narrative:{de:'Eigene Fähigkeit',en:'Custom ability',stat:'intelligence',target:'context',range:10,check:true,dc:15,turns:1},
    jump:{de:'Akrobatiksprung',en:'Acrobatic jump',stat:'dexterity',target:'self',range:2,check:true,dc:10,turns:1},
    dominate:{de:'Beherrschen',en:'Dominate',stat:'charisma',target:'enemy',range:5,check:true,dc:15,turns:3},
    raise:{de:'Toten erheben',en:'Raise dead',stat:'intelligence',target:'dead',range:3,check:false,dc:15,turns:3},
    revive:{de:'Wiederbeleben',en:'Revive',stat:'intelligence',target:'dead',range:3,check:false,dc:15,turns:1},
    hide:{de:'Verstecken / Schleichen',en:'Hide / sneak',stat:'dexterity',target:'self',range:0,check:true,dc:15,turns:3},
    intimidate:{de:'Einschüchtern',en:'Intimidate',stat:'charisma',target:'enemy',range:5,check:true,dc:15,turns:1},
    provoke:{de:'Provozieren',en:'Provoke',stat:'charisma',target:'enemy',range:5,check:true,dc:15,turns:1},
    distract:{de:'Ablenken',en:'Distract',stat:'intelligence',target:'enemy',range:5,check:true,dc:15,turns:1},
    aim:{de:'Zielen',en:'Aim',stat:'perception',target:'self',range:0,check:false,dc:15,turns:1},
    support:{de:'Unterstützen',en:'Support',stat:'charisma',target:'ally',range:3,check:false,dc:15,turns:1},
    sprint:{de:'Sprinten',en:'Sprint',stat:'dexterity',target:'self',range:0,check:false,dc:15,turns:1},
    acrobatics:{de:'Akrobatik',en:'Acrobatics',stat:'dexterity',target:'self',range:0,check:true,dc:15,turns:1},
    shove:{de:'Schubsen',en:'Shove',stat:'strength',target:'enemy',range:1,check:true,dc:15,turns:1},
    hold:{de:'Festhalten',en:'Hold',stat:'strength',target:'enemy',range:1,check:true,dc:15,turns:1},
    stun:{de:'Betäuben / Lähmen',en:'Stun / paralyze',stat:'strength',target:'enemy',range:1,check:true,dc:20,turns:1},
    disarm:{de:'Entwaffnen',en:'Disarm',stat:'dexterity',target:'enemy',range:1,check:true,dc:15,turns:1},
    carry:{de:'Verbündeten bergen',en:'Carry ally',stat:'strength',target:'ally',range:1,check:false,dc:15,turns:1},
    status:{de:'Zustand verursachen',en:'Inflict status',stat:'intelligence',target:'enemy',range:5,check:true,dc:15,turns:2},
});
export function skillsFrom(raw = [], stats = [], resources = []) {
    require(Array.isArray(raw) && raw.length<=100,'Höchstens 100 Fähigkeiten.');
    const result=raw.map(v=>{
        require(v && Object.hasOwn(SKILLS,v.kind),'Unbekannte Fähigkeit.'); const p=SKILLS[v.kind];
        const id=text(v.id)||globalThis.crypto.randomUUID(), name=text(v.name)||p.en, stat=v.stat??p.stat;
        require(stats.includes(stat),'Ungültiges Fähigkeitsattribut.');
        const resource=v.resource?text(v.resource):null;require(!resource||resources.some(r=>r.id===resource),'Fähigkeitsressource fehlt.');
        require(v.check===undefined||typeof v.check==='boolean','Fähigkeitsprobe: Boolean erforderlich.');
        require(v.ai===undefined||typeof v.ai==='boolean','Fähigkeits-KI: Boolean erforderlich.');
        require(v.acrobaticsGroup===undefined||typeof v.acrobaticsGroup==='string'&&v.acrobaticsGroup.length<=100,'Ungültige Akrobatikgruppe.');
        const status=v.status??'slowed';require(Object.hasOwn(CLASSIC_STATUSES,status),'Unbekannter Statuseffekt.');
        require(v.permanent===undefined||typeof v.permanent==='boolean','Dauerhaft: Boolean erforderlich.');
        require(v.raiseOnce===undefined||typeof v.raiseOnce==='boolean','Nur einmal erheben: Boolean erforderlich.');
        require(v.description===undefined||typeof v.description==='string'&&v.description.length<=500,'Beschreibung: höchstens 500 Zeichen.');
        require(v.reaction===undefined||typeof v.reaction==='boolean','Eigene Reaktion: Boolean erforderlich.');
        const servantControl=v.servantControl??'manual';require(['manual','basic'].includes(servantControl),'Ungültige Dienersteuerung.');
        const mechanics=mechanicsFrom(v.mechanics);require(!mechanics||v.kind==='narrative','Eigene Wirkungen nur bei einer eigenen Fähigkeit.');const reactionTiming=v.reactionTiming||null;require(!reactionTiming||['before','after'].includes(reactionTiming),'Ungültiger Reaktionszeitpunkt.');require(!mechanics||!v.reaction||reactionTiming,'Reaktionszeitpunkt wählen: Vorher oder Nachher.');
        const dcMode=v.dcMode??'fixed';require(['fixed','target-dc','best-physical',...stats].includes(dcMode),'Ungültige Abwehrbasis.');
        if(v.dcBase!==undefined)decimal(v.dcBase,0,100,'Basis-DC');
        return {id,name,kind:v.kind,...(['acrobatics','jump'].includes(v.kind)&&v.acrobaticsGroup?{acrobaticsGroup:text(v.acrobaticsGroup)}:{}),...(v.kind==='narrative'?{description:text(v.description,500),reaction:v.reaction??false,...(reactionTiming?{reactionTiming}:{}),...(mechanics?{mechanics}:{})}:{}),permanent:v.permanent??true,raiseOnce:v.raiseOnce??false,servantControl,reviveHp:integer(v.reviveHp??5,1,1000000),stat,cost:unitCost(v.cost===undefined?1:v.cost),range:integer(v.range??p.range,0,100),check:v.check??p.check,dc:decimal(v.dc??p.dc,0,100,'Fähigkeits-DC'),dcMode,...(!['fixed','target-dc'].includes(dcMode)?{dcBase:decimal(v.dcBase??10,0,100,'Basis-DC')}:{}),dcAdjustment:decimal(v.dcAdjustment??0,-100,100,'Abwehranpassung'),bonus:decimal(v.bonus??0,-100,100,'Fähigkeitsbonus'),turns:integer(v.turns??p.turns,1,100),resource,status,...(v.statusDamageType!==undefined?{statusDamageType:damageType(v.statusDamageType)}:{}),statusDamage:/^\d+$/.test(String(v.statusDamage??2))?integer(v.statusDamage??2,0,1000000):parseDice(String(v.statusDamage)).formula,ai:v.ai??false};
    });require(new Set(result.map(v=>v.id)).size===result.length,'Doppelte Fähigkeits-ID.');return result;
}
export function skillPreset(kind, language='de') { require(Object.hasOwn(SKILLS,kind),'Unbekannte Fähigkeit.'); return {id:globalThis.crypto.randomUUID(),kind,name:SKILLS[kind][language],...SKILLS[kind],dcMode:kind==='shove'?'best-physical':kind==='dominate'?'target-dc':'fixed',dcAdjustment:0,bonus:0,resource:null,status:'slowed',statusDamage:2,ai:false}; }
export function skillDefense(s,target,skill) {
    const mode=skill.dcMode??'fixed',adjustment=mode==='fixed'?0:skill.dcAdjustment??0,base=Number(skill.dcBase??10);
    if(mode==='fixed')return {dc:skill.dc,mode,base:skill.dc,attribute:null,bonus:0,adjustment};
    if(!target)return {dc:null,mode,base:mode==='target-dc'?null:base,attribute:null,bonus:null,adjustment};
    if(mode==='target-dc')return {dc:rounded(target.dc+adjustment),mode,base:target.dc,attribute:null,bonus:0,adjustment};
    const bonusOf=stat=>s.rules.statMode==='bonuses'?target.stats[stat]:Math.floor((target.stats[stat]-10)/2);
    const attribute=mode==='best-physical'?(bonusOf('strength')>=bonusOf('dexterity')?'strength':'dexterity'):mode,bonus=bonusOf(attribute);
    return {dc:rounded(base+bonus+adjustment),mode,base,attribute,bonus,adjustment};
}
export function skillDefenseText(s,target,skill,language='de') {
    return defenseText(skillDefense(s,target,skill),language);
}
export function defenseText(d,language='de') {
    const l=(de,en)=>language==='en'?en:de,signed=v=>v>=0?'+'+v:String(v),labels=statLabels(language);
    if(d.mode==='fixed')return 'DC '+d.dc;
    if(d.dc===null)return (d.mode==='target-dc'?l('Ziel-DC','Target DC'):d.mode==='best-physical'?d.base+' + '+l('höherer Stärke-/Geschicklichkeitsbonus des Ziels','higher target Strength/Dexterity bonus'):d.base+' + '+labels[d.mode]+' ('+l('Zielbonus','target bonus')+')')+' '+signed(d.adjustment);
    return 'DC '+d.dc+' = '+d.base+(d.attribute?' '+signed(d.bonus)+' ('+labels[d.attribute]+')':' ('+l('Ziel-DC','Target DC')+')')+' '+signed(d.adjustment);
}
export { TACTICS };
export function tacticsFrom(raw = []) {
    require(Array.isArray(raw)&&raw.length<=20,'Ungültige taktische Zustände.');
    const result=raw.map(v=>{ require(v&&Object.hasOwn(TACTICS,v.type),'Unbekannter taktischer Zustand.');require(v.policy===undefined||['cover','flee'].includes(v.policy),'Ungültige Fluchtabsicht.');return {type:v.type,turns:integer(v.turns??1,1,100),appliedTurn:integer(v.appliedTurn??0,0,Number.MAX_SAFE_INTEGER),source:text(v.source),weapon:text(v.weapon),amount:decimal(v.amount??2,0,100,'Fähigkeitswirkung'),policy:v.policy??'cover'};});
    require(new Set(result.map(v=>v.type)).size===result.length,'Doppelter taktischer Zustand.');return result;
}
export function tactic(s,a,type) { return s.rules.skillsEnabled ? a?.tactics?.find(v=>v.type===type) : undefined; }
export function addTactic(s,a,type,skill,extra={}) {
    if(isImmune(a,type))return {immune:true,type};
    const old=a.tactics.find(v=>v.type===type), next={type,turns:Math.max(old?.turns??0,s.rules.effectDurationOverrides?.[type]??skill.turns),appliedTurn:s.turnSerial,source:'',weapon:'',amount:s.rules[{aimed:'aimBonus',supported:'supportBonus',distracted:'distractBonus'}[type]]??2,policy:'cover',...extra};
    if(old)Object.assign(old,next);else a.tactics.push(next);
}
export function tickTactics(s,a,outside=false) { if(!s.rules.skillsEnabled||!a)return; a.tactics=(a.tactics??[]).filter(v=>{if(outside||v.appliedTurn!==s.turnSerial)v.turns--;return v.turns>0;}); }

export function abilityGroups(skills) {
    const groups=[],acro=[];
    for(const skill of skills){
        if(!['acrobatics','jump'].includes(skill.kind)){groups.push({id:skill.id,skills:[skill],acrobatics:false});continue;}
        let group=acro.find(g=>!g.skills.some(v=>v.kind===skill.kind)&&(skill.acrobaticsGroup?g.family===skill.acrobaticsGroup:!g.family));
        if(!group){group={id:skill.id,skills:[],acrobatics:true,family:skill.acrobaticsGroup??''};acro.push(group);groups.push(group);}group.skills.push(skill);
    }
    return groups;
}
export function acrobaticsPresets(language='de') {
    const group=globalThis.crypto.randomUUID();return ['acrobatics','jump'].map(kind=>({...skillPreset(kind,language),acrobaticsGroup:group,name:kind==='acrobatics'?(language==='en'?'Overcome cover':'Deckung überwinden'):(language==='en'?'Jump':'Springen')}));
}
export function defaultSkillName(skill) {
    return [SKILLS[skill.kind]?.de,SKILLS[skill.kind]?.en,...(skill.kind==='narrative'?['Eigene Fähigkeit – erzählerisch','Custom narrative ability']:skill.kind==='acrobatics'?['Deckung überwinden','Overcome cover']:skill.kind==='jump'?['Springen','Jump']:[])].includes(skill.name);
}
export function skillLabel(skill,language='de') {return defaultSkillName(skill)?(['acrobatics','jump'].includes(skill.kind)?applicationLabel(skill,language):SKILLS[skill.kind][language]):skill.name;}
export function applicationTitle(skill,language='de') {return applicationLabel(skill,language)+(defaultSkillName(skill)?'':' · '+skill.name);}
export function abilityChoices(skills,language='de') {return abilityGroups(skills).map(g=>[g.id,g.acrobatics?(language==='en'?'Acrobatics':'Akrobatik'):skillLabel(g.skills[0],language)]);}
export function applicationLabel(skill,language='de'){return skill.kind==='acrobatics'?(language==='en'?'Overcome cover':'Deckung überwinden'):skill.kind==='jump'?(language==='en'?'Jump':'Springen'):skill.name;}
