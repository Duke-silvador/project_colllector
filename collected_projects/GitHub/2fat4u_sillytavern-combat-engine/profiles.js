import { traitsFrom } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { actorFrom, clone, uid, STATS, parseDice } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { resourcesFrom, effectsFrom } from './effects.js?v=2.0.0-beta.2-hotfix.2';
import { skillsFrom, tacticsFrom } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { actionConfig } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';
import { imageFrom } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
const require=(ok,m)=>{if(!ok)throw new Error(m);};
export function resourceDependencies(resources,ids) {
    const selected=new Set(ids);
    let previous;
    do{previous=selected.size;for(const r of resources)if(selected.has(r.id)){if(r.stock)selected.add(r.stock);if(r.refill?.stock)selected.add(r.refill.stock);}}while(selected.size!==previous);
    return resources.filter(r=>selected.has(r.id));
}
export function exportProfiles(s,kind,actorId,image=()=>null) {
    const a=s.actors.find(v=>v.id===actorId);require(kind==='actors'||a,'Figur fehlt.');
    if(['actors','actor'].includes(kind))return {kind:'combat-actors',version:1,statMode:s.rules.statMode,actors:(kind==='actor'?[a]:s.actors).map(v=>{const copy=clone(v);copy.side=v.allegiance?.originalSide??v.side;copy.control=v.allegiance?.originalControl??v.control;copy.allegiance=null;copy.aiMemory=null;if(copy.aiConfig){copy.aiConfig.home=null;copy.aiConfig.homeMode='deployment';}copy.raiseLocked=false;copy.hp=copy.maxHp;copy.position=null;copy.escaped=false;copy.condition='fit';copy.roundsLeft=null;copy.downedRound=null;copy.effects=[];copy.tactics=[];copy.shields=[];copy.reactionSpent=0;copy.reactionReserved=0;copy.reactionUsed=false;copy.reactionReserve=false;copy.reactionTurn=-1;copy.stance='neutral';copy.stanceTurn=-1;copy.sprintTurn=-1;copy.acrobaticsTurn=-1;copy.acrobaticsUsedTurn=-1;Object.assign(copy,{reserve:false,initiativeReady:false,lastPosition:null,lastHeight:0,joinRound:0,turnRound:-1,unlimitedTurn:-1,hidden:null,hanging:null});copy.portraitImage=image(v.portrait);copy.portrait=null;delete copy.id;return copy;})};
    if(kind==='weapons')return {kind:'combat-weapons',version:1,name:a.name,weaponList:clone(a.weaponList),preferredWeapon:a.preferredWeapon,resources:clone(a.resources.filter(r=>a.weaponList.some(w=>w.resource===r.id||w.standard?.resource===r.id)))};
    if(kind==='skills')return {kind:'combat-skills',version:1,name:a.name,skills:clone(a.skills),resources:clone(resourceDependencies(a.resources,a.skills.map(v=>v.resource)))};
    if(kind==='resources')return {kind:'combat-resources',version:1,name:a.name,resources:clone(a.resources)};
    if(kind==='effects')return {kind:'combat-effects',version:1,name:a.name,...traitsFrom(a),effects:a.effects.map(({appliedTurn,...v})=>clone(v)),tactics:a.tactics.map(({appliedTurn,...v})=>({...clone(v),sourceName:s.actors.find(x=>x.id===v.source)?.name??'',weaponName:a.weaponList.find(w=>w.id===v.weapon)?.name??''}))};
    require(kind==='budget','Unbekannter Profiltyp.');return {kind:'combat-budget',version:1,name:a.name,...actionConfig(a)};
}
export function profileFrom(raw) {
    require(raw&&raw.version===1&&['combat-actors','combat-weapons','combat-budget','combat-skills','combat-resources','combat-effects'].includes(raw.kind),'Ungültige Profildatei.');
    if(raw.kind==='combat-budget')return {...actionConfig(raw),kind:raw.kind,version:1};
    if(raw.kind==='combat-effects') { require(Array.isArray(raw.effects),'Zustandsliste fehlt.');return {kind:raw.kind,version:1,...Object.fromEntries(Object.entries(traitsFrom(raw)).filter(([key])=>Object.hasOwn(raw,key))),effects:effectsFrom(raw.effects,parseDice),...(Object.hasOwn(raw,'tactics')?{tactics:tacticsFrom(raw.tactics).map((v,i)=>({...v,sourceName:String(raw.tactics[i].sourceName??'').slice(0,100),weaponName:String(raw.tactics[i].weaponName??'').slice(0,100)}))}:{})}; }
    if(raw.kind==='combat-resources') {require(Array.isArray(raw.resources),'Ressourcenliste fehlt.');return {kind:raw.kind,version:1,resources:resourcesFrom(raw.resources,parseDice)};}
    if(raw.kind==='combat-skills') {require(Array.isArray(raw.skills),'Fähigkeitenliste fehlt.');const resources=resourcesFrom(raw.resources??[],parseDice);return {kind:raw.kind,version:1,resources,skills:skillsFrom(raw.skills,Object.keys(STATS),resources)};}
    if(raw.kind==='combat-actors') {
        require(['scores','bonuses'].includes(raw.statMode)&&Array.isArray(raw.actors)&&raw.actors.length<=300,'Ungültige Figurenprofile.');
        const actors=raw.actors.map(v=>{const a=actorFrom({...v,aiMemory:null,aiConfig:v.aiConfig?{...v.aiConfig,home:null,homeMode:'deployment'}:undefined,...(!Object.hasOwn(v,'reactionsPerTurn')?{reactionsPerTurn:1}:{}),side:v.allegiance?.originalSide??v.side,control:v.allegiance?.originalControl??v.control,allegiance:null,raiseLocked:false,reserve:false,initiativeReady:false,lastPosition:null,lastHeight:0,joinRound:0,turnRound:-1,unlimitedTurn:-1,hidden:null,hanging:null,portrait:null,position:null,hp:v.maxHp,condition:'fit',escaped:false,effects:[],shields:[],reactionSpent:0,reactionReserved:0,reactionUsed:false,reactionReserve:false,reactionTurn:-1,tactics:[],stance:'neutral',stanceTurn:-1,sprintTurn:-1,acrobaticsTurn:-1,acrobaticsUsedTurn:-1},false,raw.statMode);return {...a,portraitImage:v.portraitImage?imageFrom(v.portraitImage):null};});
        require(actors.every(a=>!a.portraitImage||a.portraitImage.kind==='portrait'),'Ungültiger Bildtyp.');return {kind:raw.kind,version:1,statMode:raw.statMode,actors};
    }
    const a=actorFrom({weaponList:raw.weaponList,preferredWeapon:raw.preferredWeapon,attackMode:raw.weaponList?.find(w=>w.id===raw.preferredWeapon)?.mode,resources:raw.resources,stats:Object.fromEntries(Object.keys(STATS).map(k=>[k,10]))});
    return {kind:raw.kind,version:1,weaponList:a.weaponList,resources:a.resources,preferredWeapon:a.preferredWeapon};
}
export function weaponProfilePatch(a,profile) {
    const valid=profileFrom(profile),ids=new Map(valid.resources.map(r=>[r.id,uid()]));require(valid.kind==='combat-weapons','Waffenprofil erforderlich.');
    const weaponList=valid.weaponList.map(w=>({...w,id:uid(),resource:ids.get(w.resource)??null,standard:w.standard?{...w.standard,resource:ids.get(w.standard.resource)??null}:null}));
    const preferredWeapon=weaponList[valid.weaponList.findIndex(w=>w.id===valid.preferredWeapon)]?.id??weaponList[0]?.id??null;
    return {weaponList,preferredWeapon,attackMode:weaponList.find(w=>w.id===preferredWeapon)?.mode??'melee',resources:[...clone(a.resources),...valid.resources.map(r=>({...r,id:ids.get(r.id),stock:r.stock?ids.get(r.stock):null,refill:r.refill?{...r.refill,stock:ids.get(r.refill.stock)}:null}))]};
}
const signature = v => JSON.stringify(Object.fromEntries(Object.entries(v).filter(([k])=>!['id','quantity','appliedTurn','acrobaticsGroup'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));
function mergeEntries(old, incoming, mode) {
    const result=mode==='replace'?[]:clone(old), ids=new Map();
    for(const v of [...incoming].sort((a,b)=>Number(b.kind==='ammo')-Number(a.kind==='ammo'))){const mapped={...clone(v),stock:v.stock?(ids.get(v.stock)??v.stock):null,refill:v.refill?{...v.refill,stock:ids.get(v.refill.stock)??v.refill.stock}:null},match=result.find(r=>signature(r)===signature(mapped));if(match){ids.set(v.id,match.id);continue;}const next={...mapped,id:uid()};result.push(next);ids.set(v.id,next.id);}

    return {result,ids};
}
export function transferPatch(a,raw,mode='replace',context=null) {
    require(['append','replace'].includes(mode),'Ungültiger Importmodus.');const p=profileFrom(raw);
    if(p.kind==='combat-effects'){
        const traits={};for(const key of ['conditionImmunities','damageResistances','damageImmunities'])if(Object.hasOwn(p,key))traits[key]=mode==='replace'?p[key]:[...new Set([...(a[key]??[]),...p[key]])];
        const effects=mode==='replace'?p.effects:clone(a.effects);if(mode==='append')for(const e of p.effects)if(!effects.some(v=>v.type===e.type))effects.push(e);
        if(!Object.hasOwn(p,'tactics'))return {...traits,effects};
        const incoming=p.tactics.map(v=>{
            let source=v.source,weapon=v.weapon;
            if(context&&source&&!context.actors.some(x=>x.id===source)){const matches=context.actors.filter(x=>x.id!==a.id&&x.name===v.sourceName);source=matches.length===1?matches[0].id:'';}
            if(context&&(v.type==='provoked'||v.type==='frightened'&&v.policy==='cover'))require(source&&source!==a.id&&context.actors.some(x=>x.id===source),'Auslösende Figur des importierten Zustands fehlt. Zustand unter Ressourcen & Zustände mit passender Quelle setzen.');
            if(v.type==='disarmed'&&!a.weaponList.some(w=>w.id===weapon))weapon=a.weaponList.find(w=>w.name===v.weaponName)?.id??a.preferredWeapon??'';
            if(v.type==='disarmed')require(weapon,'Entwaffnet benötigt eine vorhandene Zielwaffe.');
            return {...v,source,weapon};
        });
        const tactics=mode==='replace'?incoming:clone(a.tactics);if(mode==='append')for(const v of incoming)if(!tactics.some(x=>x.type===v.type))tactics.push(v);return {...traits,effects,tactics};
    }
    if(p.kind==='combat-budget'){
        if(mode==='replace')return {actionsPerTurn:p.actionsPerTurn,bonusActions:p.bonusActions.map(v=>({...v,id:a.bonusActions.find(x=>x.name===v.name&&JSON.stringify([...x.allowed].sort())===JSON.stringify([...v.allowed].sort()))?.id??uid()}))};
        const bonusActions=clone(a.bonusActions);for(const v of p.bonusActions)if(!bonusActions.some(x=>x.name===v.name&&JSON.stringify([...x.allowed].sort())===JSON.stringify([...v.allowed].sort())))bonusActions.push({...v,id:uid()});return {bonusActions};
    }
    if(p.kind==='combat-resources'){
        const referenced=a.resources.filter(r=>a.weaponList.some(w=>w.resource===r.id||w.standard?.resource===r.id)||a.skills.some(v=>v.resource===r.id)||(a.shieldProfiles??[]).some(v=>v.resource===r.id)||a.resources.some(v=>v.consumption==='linked'&&v.stock===r.id||v.refill?.stock===r.id));
        // Linked stocks survive replacement; importing a matching definition explicitly updates its quantity.
        const base=mode==='replace'?clone(referenced):clone(a.resources), {result,ids}=mergeEntries(base,p.resources,'append');
        if(mode==='replace')for(const v of p.resources){const old=result.find(r=>r.id===ids.get(v.id));if(old)old.quantity=v.quantity;}
        return {resources:result};
    }
    require(['combat-weapons','combat-skills'].includes(p.kind),'Dieser Profiltyp benötigt einen Figurenimport.');
    const {result:resources,ids}=mergeEntries(a.resources,p.resources,'append');
    if(p.kind==='combat-skills'){
        const skills=mode==='replace'?[]:clone(a.skills),groups=new Map();for(const v of p.skills){if(v.acrobaticsGroup&&!groups.has(v.acrobaticsGroup))groups.set(v.acrobaticsGroup,uid());const mapped={...v,...(v.acrobaticsGroup?{acrobaticsGroup:groups.get(v.acrobaticsGroup)}:{}),resource:ids.get(v.resource)??null};const match=mode==='append'&&skills.find(x=>signature(x)===signature(mapped));if(match){if(v.acrobaticsGroup){const family=match.acrobaticsGroup??groups.get(v.acrobaticsGroup);match.acrobaticsGroup=family;groups.set(v.acrobaticsGroup,family);}continue;}skills.push({...mapped,id:uid()});}return {resources,skills};
    }
    const weaponList=mode==='replace'?[]:clone(a.weaponList);let importedPreferred=null;
    for(const v of p.weaponList){const mapped={...v,resource:ids.get(v.resource)??null,standard:v.standard?{...v.standard,resource:ids.get(v.standard.resource)??null}:null};const match=mode==='append'&&weaponList.find(x=>signature(x)===signature(mapped));const next=match||{...mapped,id:uid()};if(!match)weaponList.push(next);if(v.id===p.preferredWeapon)importedPreferred=next.id;}
    const preferredWeapon=mode==='append'?a.preferredWeapon:importedPreferred??weaponList[0]?.id??null;
    return {resources,weaponList,preferredWeapon,attackMode:weaponList.find(w=>w.id===preferredWeapon)?.mode??'melee'};
}
