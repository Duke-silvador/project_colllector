import { calculationDetails } from './calculation-details.js?v=2.0.0-beta.2-hotfix.2';
import { aiConfigFrom, aiMemoryFrom, emptyAIMemory, aiTerritory, observeAI, surveyMerge, aiWord, aiClueKey, aiClueFresh, aiPointSeen, aiRecord } from './ai-state.js?v=2.0.0-beta.2-hotfix.2';
import { traitsFrom, isImmune, damageType, periodicDamageType, resistDamage, resistanceText } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { reactionBudget, reactionMode, consumeReaction, reserveReaction, resetReactions } from './reaction-budget.js?v=2.0.0-beta.2-hotfix.2';
export { reactionBudget };
import { DICE, parseDice } from './dice.js?v=2.0.0-beta.2-hotfix.2';
export { DICE, parseDice };
import { mechanicsText, mechanicsFrom, customOutcomeText } from './custom-effects.js?v=2.0.0-beta.2-hotfix.2';
import { STATUS_TYPES, PERIODIC_STATUSES, curableStatuses, clearStatuses } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
export { curableStatuses };
import { allegianceFields, beginAllegiance, endAllegiance, tickAllegiance, allegianceText } from './allegiance.js?v=2.0.0-beta.2-hotfix.2';
import { terrainPaintPatch } from './terrain-paint.js?v=2.0.0-beta.2-hotfix.2';
import { formatModelContext, modelEvents } from './model-context.js?v=2.0.0-beta.2-hotfix.2';
import { encounterFields, encounterRules, encounterRuleDefaults, visibleTo as unconcealedTo, concealment, isPit } from './encounter.js?v=2.0.0-beta.2-hotfix.2';
export { concealment, isPit };
export function visionRange(s,a){return Math.max(0,Math.floor(s.rules.visionBase+(s.rules.visionPerception?statBonus(s,a,'perception'):0)));}
export function visibleTo(s,a,b,from=a?.position){
    if(!unconcealedTo(s,a,b))return false;
    if(!s.rules.visionEnabled||!s.rules.boardEnabled||a?.id===b.id||(a?.side==='enemy')===(b.side==='enemy'))return true;
    return Boolean(a&&isCombatant(a)&&from&&b.position&&distance(from,b.position)<=visionRange(s,a)&&clearSight(s,from,b.position));
}
export function playerCanSee(s,b){
    if(b.side!=='enemy'||!s.rules.visionEnabled||!s.rules.hideUnseenEnemies||!s.rules.boardEnabled)return true;
    const target=b.position?b:b.condition==='dead'&&b.lastPosition?{...b,position:b.lastPosition,reserve:false,hanging:null}:b;
    return s.actors.some(a=>a.side!=='enemy'&&isCombatant(a)&&a.position&&visibleTo(s,a,target));
}
function privateActors(s){return s.actors.filter(a=>!playerCanSee(s,a));}
function knownActorNames(s){return new Set(s.actors.filter(a=>playerCanSee(s,a)).map(a=>a.name));}
function mentionsActors(value,hidden,names=new Set()) {const json=JSON.stringify(value)??'';return hidden.some(a=>json.includes(JSON.stringify(a.id))||a.id.length>=6&&json.includes(a.id)||!names.has(a.name)&&json.includes(JSON.stringify(a.name).slice(1,-1)));}
function publicIdentity(value,hidden,names,ids){
    if(mentionsActors(value,hidden,names))return false;
    const json=JSON.stringify(value)??'',ambiguous=hidden.some(a=>names.has(a.name)&&json.includes(JSON.stringify(a.name).slice(1,-1)));
    if(!ambiguous)return true;
    // A shared display name does not identify either actor. Keep only values
    // that explicitly reference a known participant; legacy ambiguous text stays private.
    return Boolean(value&&typeof value==='object'&&[value.actor,value.target,value.source,value.details?.actor,value.details?.target,value.details?.source].some(id=>ids.has(id)));
}
export function publicText(s,text,language='de'){const names=knownActorNames(s);return privateActors(s).reduce((v,a)=>(names.has(a.name)?v:v.replaceAll(a.name,language==='en'?'Unseen participant':'Unentdeckte Figur')).replaceAll(a.id,'?').replaceAll(coordinate(a.position),'?'),String(text??''));}
export function publicValue(s,value){const hidden=privateActors(s),names=knownActorNames(s),ids=new Set(s.actors.filter(a=>playerCanSee(s,a)).map(a=>a.id));return publicIdentity(value,hidden,names,ids);}
export function playerView(s,gm=false){
    if(gm||s._playerView||!s.rules.visionEnabled||!s.rules.hideUnseenEnemies||!s.rules.boardEnabled)return s;
    const hidden=privateActors(s),ids=new Set(hidden.map(a=>a.id));if(!hidden.length)return s;
    const known=s.actors.filter(a=>!ids.has(a.id)),names=new Set(known.map(a=>a.name)),knownIds=new Set(known.map(a=>a.id));
    const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='aiMemory'?emptyAIMemory():clean(x)])):typeof v==='string'?(ids.has(v)?'':hidden.reduce((text,a)=>names.has(a.name)?text:text.replaceAll(a.name,'?'),v)):v;
    const actors=known.map(a=>({...clean(a),name:a.name})),order=s.order.filter(id=>!ids.has(id)),active=s.order[s.turn];
    return {...s,_playerView:true,unseenTurn:s.phase==='active'&&ids.has(active),actors,order,turn:order.indexOf(active),log:s.log.filter(e=>publicIdentity(e,hidden,names,knownIds)),action:clean(s.action),movement:clean(s.movement)};
}
import { defenseFrom, protection, protectDamage, tickShields } from './defense.js?v=2.0.0-beta.2-hotfix.2';
import { unitCost, consumption, canPay, pay } from './consumption.js?v=2.0.0-beta.2-hotfix.2';
export { consumption, canPay };
import { architecture } from './map-layouts.js?v=2.0.0-beta.2-hotfix.2';
import { cliffMap } from './map-generators.js?v=2.0.0-beta.2-hotfix.2';
import { decimal, rounded } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
import { checkInput, checkOutcome, checkText } from './checks.js?v=2.0.0-beta.2-hotfix.2';
import { SKILLS, TACTICS, skillsFrom, skillDefense, defenseText, tacticsFrom, tactic, addTactic, tickTactics } from './skills.js?v=2.0.0-beta.2-hotfix.2';
export { skillDefense };
import { terrainFrom, heightAt as terrainHeight, heightTransition, heightCorner, shields } from './terrain.js?v=2.0.0-beta.2-hotfix.2';
// Pure rules engine. No LLM, DOM, network or SillyTavern imports.
import { appearanceFrom } from './terrain-appearance.js?v=2.0.0-beta.2-hotfix.2';
import { imageRef, backgroundFrom } from './visuals.js?v=2.0.0-beta.2-hotfix.2';
import { EFFECTS, effectsFrom, resourcesFrom, hasEffect, effectsText } from './effects.js?v=2.0.0-beta.2-hotfix.2';
import { actionConfig, actionState, poolBudget, canSpendAction as poolCanSpend, spendAction, reservePool } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';
export const canSpendAction = poolCanSpend;
export const canManualAction=(s,a,kind)=>poolCanSpend(s,a,kind)||manualUnlimited(s,a)&&isCombatant(a)&&!hasEffect(s,a,'stunned');
export const tacticalEffect = tactic;
export function stanceBonus(s,a) { return !s.rules.stancesEnabled || a?.stance === 'neutral' ? {attack:0,defense:0} : a?.stance === 'defensive' ? {attack:s.rules.defensiveAttack??-2,defense:s.rules.defensiveDefense??2} : {attack:s.rules.offensiveAttack??2,defense:s.rules.offensiveDefense??-2}; }
export function effectiveRange(s,a,w) { return w.range + (s.rules.perceptionRange && w.mode === 'ranged' ? Math.max(0,Math.floor(statBonus(s,a,'perception'))) : 0); }
export function weaponStat(s,a,w,override) { return selectedStat(s,a,(override==='auto'?undefined:override) ?? (w.stat && w.stat !== 'inherit' ? w.stat : a.attackStat)); }
export function movementOpen(s,a) { return s.rules.splitMovement || s.rules.skillsEnabled && (a?.sprintTurn === s.turnSerial || a?.acrobaticsTurn === s.turnSerial); }
export function setStance(s,id,stance,token=turnToken(s)) {
    return commit(s,next=>{assert(next.rules.stancesEnabled,'Kampfhaltungen sind deaktiviert.');assert(token===turnToken(next),'Veralteter Zug.');const a=requireTurn(next,id);
        assert(poolBudget(next,a).spent===0,'Haltung nur vor der ersten Aktion wählen.');assert(!hasEffect(next,a,'stunned'),'Betäubte Figur kann keine Haltung wählen.');
        a.stance=pick(stance,['neutral','defensive','offensive'],'Kampfhaltung');a.stanceTurn=next.turnSerial;
        const bonus=stanceBonus(next,a),labels={neutral:['Neutral','Neutral'],defensive:[`Defensiv: ${signed(bonus.attack)} Treffer, ${signed(bonus.defense)} DC`,`Defensive: ${signed(bonus.attack)} attack, ${signed(bonus.defense)} DC`],offensive:[`Offensiv: ${signed(bonus.attack)} Treffer, ${signed(bonus.defense)} DC`,`Offensive: ${signed(bonus.attack)} attack, ${signed(bonus.defense)} DC`]};
        entry(next,'stance',`${a.name}: ${labels[stance][0]}.`,{actor:a.id,stance},`${a.name}: ${labels[stance][1]}.`);
    });
}
function findCarryPlans(s,a,b,from,all,targetCell=null) {
    if(!s.rules.boardEnabled||!isCombatant(a)||!from||!b?.position||b.id===a.id||b.condition==='dead'||b.escaped||b.reserve||b.hanging||(a.side==='enemy')!==(b.side==='enemy')||!adjacentAccess(s,from,b.position)||hasEffect(s,a,'stunned')||tactic(s,a,'rooted'))return [];
    const current=s.actors.find(v=>v.id===a.id),budget=movementBudget(s,a),approach=current?.position&&distance(current.position,from)>0?pathDistances(s,current.position,a.id,budget.remaining).get(from.x+','+from.y)??Infinity:0,remaining=budget.remaining-approach;
    if(remaining<1)return [];
    const key=p=>p.x+','+p.y,pair=(p,q)=>key(p)+'|'+key(q),same=(p,q)=>p.x===q.x&&p.y===q.y;
    const others=s.actors.filter(v=>v.id!==a.id&&v.id!==b.id&&v.position),occupied=new Set(others.map(v=>key(v.position))),blocked=new Set(others.filter(v=>isCombatant(v)&&!(s.rules.passAllies&&(v.side==='enemy')===(a.side==='enemy'))).map(v=>key(v.position)));
    const inside=p=>p.x>=0&&p.y>=0&&p.x<s.board.width&&p.y<s.board.height,stepCache=new Map(),legalStep=(p,q)=>{const k=pair(p,q);if(!stepCache.has(k))stepCache.set(k,inside(q)&&canStep(s,p,q));return stepCache.get(k);};
    const endpointDistance=(carrier,target)=>distance(carrier,{x:target.x+Math.sign(target.x-from.x),y:target.y+Math.sign(target.y-from.y)});
    const start={carrier:{...from},target:{...b.position},cost:0,previous:null},distances=new Map([[pair(from,b.position),0]]),buckets=[[start]],destinations=new Map();let queued=1;
    for(let cost=0;queued;cost++)for(const node of buckets[cost]??[]){
        queued--;if(distances.get(pair(node.carrier,node.target))!==cost||cost>=remaining)continue;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){
            const carrier={x:node.carrier.x+dx,y:node.carrier.y+dy},target=node.carrier;
            if(!legalStep(node.carrier,carrier)||!legalStep(node.target,target)||blocked.has(key(carrier))||blocked.has(key(target)))continue;
            const total=cost+stepCost(s,node.carrier,carrier,a.id),k=pair(carrier,target);
            if(total>remaining||(distances.get(k)??Infinity)<=total)continue;
            const next={carrier,target,cost:total,previous:node};distances.set(k,total);(buckets[total]??=[]).push(next);queued++;
            if(!same(target,b.position)&&canOccupy(s,carrier)&&canOccupy(s,target)&&!occupied.has(key(carrier))&&!occupied.has(key(target))){destinations.set(k,next);}
        }
    }
    const ordered=[...destinations.values()].filter(n=>!targetCell||same(n.target,targetCell)).sort((p,q)=>p.cost-q.cost||p.target.y-q.target.y||p.target.x-q.target.x||endpointDistance(p.carrier,p.target)-endpointDistance(q.carrier,q.target)||p.carrier.y-q.carrier.y||p.carrier.x-q.carrier.x);
    const seen=new Set(),selected=all?ordered:ordered.filter(n=>{const k=key(n.target);if(seen.has(k))return false;seen.add(k);return true;});
    return selected.map(node=>{const path=[];for(let n=node;n;n=n.previous)path.unshift({carrier:{...n.carrier},target:{...n.target}});return {x:node.target.x,y:node.target.y,carrier:{...node.carrier},cost:node.cost,path};});
}
export function carryPlans(s,a,b,from=a?.position,targetCell=null) {return findCarryPlans(s,a,b,from,true,targetCell);}
export function carryDestinations(s,a,b,from=a?.position) {return findCarryPlans(s,a,b,from,false);}
export function forcedDestinations(s,a,b,carry=false) {
    if(carry)return carryDestinations(s,a,b).map(({x,y})=>({x,y}));
    if(!s.rules.boardEnabled||!a.position||!b.position)return [];
    const cells=[];for(let y=b.position.y-1;y<=b.position.y+1;y++)for(let x=b.position.x-1;x<=b.position.x+1;x++){
        const p={x,y};if(!(canOccupy(s,p)||!carry&&isPit(s,p))||!(canStep(s,b.position,p)||!carry&&isPit(s,p)&&heightTransition(s,b.position,p))||s.actors.some(v=>v.position&&distance(v.position,p)===0))continue;
        if(carry && (!adjacentAccess(s,a.position,p)||movementBudget(s,a).remaining<2))continue;
        if(!carry && distance(a.position,p)<=distance(a.position,b.position))continue;
        cells.push(p);
    }const straight={x:b.position.x+Math.sign(b.position.x-a.position.x),y:b.position.y+Math.sign(b.position.y-a.position.y)};
    return cells.sort((p,q)=>(carry?0:Number(distance(q,straight)===0)-Number(distance(p,straight)===0))||p.y-q.y||p.x-q.x);
}
export function reactionDestination(s,a) {
    const fear=tactic(s,a,'frightened');if(!fear||!a.position||!s.rules.boardEnabled)return null;
    const budget=movementBudget(s,a), paths=pathDistances(s,a.position,a.id,budget.remaining), source=s.actors.find(v=>v.id===fear.source&&visibleTo(s,a,v));
    if(fear.policy==='cover' && source?.position && (!clearSight(s,source.position,a.position)||coverOnRay(s,source.position,a.position)))return null;
    const cells=[...paths].map(([k,cost])=>{const [x,y]=k.split(',').map(Number);return {position:{x,y},cost};}).filter(v=>v.cost>0&&canOccupy(s,v.position)&&!s.actors.some(b=>b.id!==a.id&&b.position&&distance(b.position,v.position)===0));
    if(fear.policy==='flee')return cells.filter(v=>isExit(s,v.position)).sort((b,c)=>b.cost-c.cost||b.position.y-c.position.y||b.position.x-c.position.x)[0] ?? cells.sort((b,c)=>Math.min(b.position.x,b.position.y,s.board.width-1-b.position.x,s.board.height-1-b.position.y)-Math.min(c.position.x,c.position.y,s.board.width-1-c.position.x,s.board.height-1-c.position.y)||b.cost-c.cost)[0]??null;
    if(!source?.position)return null;
    const cover=cells.filter(v=>!clearSight(s,source.position,v.position)||coverOnRay(s,source.position,v.position)).sort((b,c)=>b.cost-c.cost||b.position.y-c.position.y||b.position.x-c.position.x)[0];
    return cover??cells.filter(v=>distance(v.position,source.position)>distance(a.position,source.position)).sort((b,c)=>distance(c.position,source.position)-distance(b.position,source.position)||b.cost-c.cost||b.position.y-c.position.y||b.position.x-c.position.x)[0]??null;
}
export function planningContext(s,a,paths=null) { return {state:s,actor:a,paths,fear:new Map()}; }
export function reactionPending(s,a,from=a.position,context=null) {
    const fear=tactic(s,a,'frightened');if(!fear)return false;
    const cache=context?.state===s && context.actor===a ? context:null, cell=from?from.x+','+from.y:'none';
    if(cache?.fear.has(cell))return cache.fear.get(cell);
    // Predict the state after a proposed move without committing or ticking a turn.
    // Fear must be checked at the firing position with its remaining movement.
    if(s.rules.boardEnabled && from && a.position && distance(from,a.position)>0) {
        const budget=movementBudget(s,a), paths=cache?(cache.paths??=pathDistances(s,a.position,a.id)):pathDistances(s,a.position,a.id),cost=paths.get(`${from.x},${from.y}`);
        const projected={...a,position:from};
        s={...s,actors:s.actors.map(v=>v.id===a.id?projected:v),movement:{actorId:a.id,turnSerial:s.turnSerial,spent:budget.spent+(cost??budget.remaining)}};
        a=projected;
    }
    const pending=Boolean(reactionDestination(s,a) || fear.policy==='flee' && canFlee(s,a));
    cache?.fear.set(cell,pending);return pending;
}
export const canDeployRandom = a => Boolean(a && a.hp > 0 && !a.escaped && !a.hanging);
export function revivalDestinations(s,a,b,skill,from=a?.position) {
    if(!b || b.condition!=='dead' || b.hp!==0 || b.escaped || !s.rules.boardEnabled)return [];
    const anchor=b.position??b.lastPosition;if(!anchor||!from)return [];
    if(s.rules.visionEnabled&&(a.side==='enemy')!==(b.side==='enemy')&&!visibleTo(s,a,{...b,position:anchor,reserve:false},from))return [];
    const level=b.position?heightAt(s,b.position):b.lastHeight,cells=[];
    if(distance(from,anchor)>skill.range||!(skill.range===1?adjacentAccess(s,from,anchor):clearSight(s,from,anchor)))return [];
    for(let y=anchor.y-1;y<=anchor.y+1;y++)for(let x=anchor.x-1;x<=anchor.x+1;x++){
        const p={x,y};if(!canOccupy(s,p)||heightAt(s,p)!==level||s.actors.some(v=>v.id!==b.id&&v.position&&distance(v.position,p)===0))continue;
        if(distance(p,anchor)>0&&(!diagonalClear(s,anchor,p)||!heightTransition(s,anchor,p)))continue;
        if(distance(from,p)>skill.range||!(skill.range===1?adjacentAccess(s,from,p):clearSight(s,from,p)))continue;
        cells.push(p);
    }
    return cells.sort((p,q)=>distance(p,anchor)-distance(q,anchor)||p.y-q.y||p.x-q.x);
}
export function jumpDestinations(s,a,skill) {
    if(!s.rules.boardEnabled||!s.rules.skillsEnabled||!a?.position||!isCombatant(a)||hasEffect(s,a,'stunned')||tactic(s,a,'rooted'))return [];
    const cells=[],origin=a.position,level=heightAt(s,origin);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy){let crossed=false,previous=origin;
        for(let n=1;n<=Math.min(skill.range,Math.max(s.board.width,s.board.height));n++){
            const p={x:origin.x+dx*n,y:origin.y+dy*n};
            if(p.x<0||p.y<0||p.x>=s.board.width||p.y>=s.board.height||!canStep(s,previous,p)||heightAt(s,p)!==level)break;
            const occupant=s.actors.find(v=>v.position&&distance(v.position,p)===0&&v.id!==a.id);
            if(occupant?.hp>0)break;
            if(occupant?.hp===0)crossed=true;
            else if(crossed&&canOccupy(s,p))cells.push(p);
            previous=p;
        }
    }
    return cells.sort((p,q)=>distance(origin,p)-distance(origin,q)||p.y-q.y||p.x-q.x);
}
export function canUseSkill(s,a,b,skill,from=a.position,context=null) {
    if(!s.rules.skillsEnabled||!isCombatant(a)||hasEffect(s,a,'stunned')||!skill||!b||b.escaped)return false;
    if(['raise','dominate'].includes(skill.kind)&&b.allegiance)return false;
    if(skill.kind==='raise'&&b.raiseLocked)return false;
    if(['revive','raise'].includes(skill.kind))return b.id!==a.id&&b.condition==='dead'&&b.hp===0&&canPay(s,a,skill)&&(!s.rules.boardEnabled||revivalDestinations(s,a,b,skill,from).length>0);
    if(skill.kind==='jump')return a.id===b.id&&canPay(s,a,skill)&&jumpDestinations(s,{...a,position:from},skill).length>0;
    if(skill.kind==='narrative'&&skill.mechanics){try{customEffectTarget(s,a,b,skill.mechanics,skill.range);return canPay(s,a,skill);}catch{return false;}}
    if(skill.kind==='narrative')return canPay(s,a,skill)&&(a.id===b.id||visibleTo(s,a,b,from)&&(!s.rules.boardEnabled||from&&b.position&&distance(from,b.position)<=skill.range&&clearSight(s,from,b.position)));
    if(b.condition==='dead')return false;
    if(!visibleTo(s,a,b))return false;
    if(skill.kind==='hide'&&(!concealment(s,a,from)||a.hidden))return false;
    const definition=SKILLS[skill.kind], sameSide=(a.side==='enemy')===(b.side==='enemy');
    if(definition.target==='self'&&a.id!==b.id||definition.target==='enemy'&&(sameSide||!isCombatant(b))||definition.target==='ally'&&(!sameSide||a.id===b.id))return false;
    if(definition.target==='ally'&&skill.kind!=='carry'&&!isCombatant(b))return false;
    if(!canPay(s,a,skill))return false;
    if(a.id!==b.id&&!visibleTo(s,a,b,from))return false;
    if(a.id!==b.id&&s.rules.boardEnabled&&(!from||!b.position||!(skill.range===1?adjacentAccess(s,from,b.position):distance(from,b.position)<=skill.range&&clearSight(s,from,b.position))))return false;
    if(definition.target==='enemy'&&reactionPending(s,a,from,context))return false;
    if(['status','stun'].includes(skill.kind)&&!s.rules.effectsEnabled)return false;
    if(skill.kind==='sprint'&&(!s.rules.boardEnabled||a.sprintTurn===s.turnSerial||tactic(s,a,'rooted')))return false;
    if(skill.kind==='acrobatics'&&(!s.rules.boardEnabled||a.acrobaticsUsedTurn===s.turnSerial&&!manualUnlimited(s,a)||movementBudget(s,a).remaining<1))return false;
    if(skill.kind==='carry'&&!carryDestinations(s,a,b,from).length)return false;
    if(skill.kind==='shove'&&!forcedDestinations(s,{...a,position:from},b).length)return false;
    if(skill.kind==='disarm'&&!listWeapons(b).some(w=>tactic(s,b,'disarmed')?.weapon!==w.id))return false;
    return true;
}
export function customEffectTarget(s,a,b,recipe,range=5) {
    const m=mechanicsFrom(recipe);assert(m,'Keine eigene Regelwirkung ausgewählt.');
    const target=m.target==='self'?a:b;assert(target,'Zielfigur für eigene Wirkungen auswählen.');
    if(m.damage)assert(!protection(s,a).attackLock,'Aktiver Schutz sperrt schädigende eigene Fähigkeiten.');
    if(target.id!==a.id&&(target.side==='enemy')!==(a.side==='enemy')&&(m.damage||m.status?.mode==='apply'&&!['aimed','supported'].includes(m.status.type)))assert(!reactionPending(s,a),'Eingeschüchtert: zuerst Deckung suchen oder zurückweichen.');
    for(const v of new Set([target,b].filter(Boolean))){
        assert(v.condition!=='dead'&&!v.escaped&&!v.reserve&&!v.hanging,'Tote, entfernte, geflohene oder am Abgrund hängende Figuren sind keine Wirkungsziele.');
        assert(v.id===a.id||visibleTo(s,a,v),'Wirkungsziel ist nicht sichtbar.');
        if(s.rules.boardEnabled){assert(a.position&&v.position,'Wirkungsziel und Anwender müssen platziert sein.');assert(distance(a.position,v.position)<=range&&(v.id===a.id||range===1? v.id===a.id||adjacentAccess(s,a.position,v.position):clearSight(s,a.position,v.position)),'Wirkungsziel außerhalb von Reichweite oder Sichtlinie.');}
    }
    if(m.status?.mode==='apply'){assert(Object.hasOwn(EFFECTS,m.status.type)?s.rules.effectsEnabled:s.rules.skillsEnabled,'Das benötigte Zustandsmodul ist ausgeschaltet.');if(m.status.type==='disarmed')assert(listWeapons(target).length,'Ziel hat keine entwaffnungsfähige Waffe.');}
    return target;
}
function applyCustomEffects(s,a,b,recipe,range,success,critical,roll){
    const target=customEffectTarget(s,a,b,recipe,range),beforeHp=target.hp;
    const r={success,target:target.id,targetName:target.name,beforeHp,afterHp:beforeHp,maxHp:target.maxHp,damage:null,healing:null,status:null};
    if(target.id!==a.id&&(recipe.damage||recipe.status?.mode==='apply'&&!['aimed','supported'].includes(recipe.status.type)))a.hidden=null;
    if(!success)return r;
    const amount=(v,crit)=>{const p=parseDice(v.dice),maximum=crit&&s.rules.criticalDamage!=='doubleDice',rolls=maximum?Array(p.count).fill(p.sides):Array.from({length:p.count*(crit?2:1)},()=>die(s,p.sides,roll));return {formula:p.formula,bonus:v.bonus,rolls,maximized:maximum,critical:Boolean(crit),criticalMode:crit?s.rules.criticalDamage:null,raw:Math.max(0,Math.floor(rolls.reduce((n,x)=>n+x,0)+p.bonus+v.bonus))*(crit&&s.rules.criticalDamage==='doubleMax'?2:1)};};
    if(recipe.damage){const d=amount(recipe.damage,critical),coverPercent=s.rules.boardEnabled&&a.id!==target.id&&distance(a.position,target.position)>1?coverDamagePercent(s,a.position,target.position):100,protectedHit=protectDamage(s,target,Math.floor(d.raw*coverPercent/100),0,recipe.damage.type??'physical');const applied=Math.min(target.hp,protectedHit.damage);target.hp-=applied;if(applied>0)target.hidden=null;r.damage={...d,...protectedHit,coverPercent,applied};}
    if(recipe.healing){const h=amount(recipe.healing,false),applied=Math.min(target.maxHp-target.hp,h.raw);target.hp+=applied;r.healing={...h,applied};}
    if(target.hp>0){target.condition='fit';target.roundsLeft=null;target.downedRound=null;}else if(beforeHp>0)knockedDown(s,target);
    if(recipe.status){const v=recipe.status;r.status={...v,changed:false};if(v.mode==='remove'){r.status.changed=[...target.effects,...target.tactics].some(p=>p.type===v.type);clearStatuses(target,[v.type]);}
        else if(isImmune(target,v.type))r.status.immune=true;
        else if(target.hp===0)r.status.skipped=true;
        else if(Object.hasOwn(EFFECTS,v.type)){const raw={type:v.type,turns:v.turns,damage:EFFECTS[v.type].damage},spec=effectSpec(s,raw),old=target.effects.find(p=>p.type===v.type&&periodicDamageType(p)===periodicDamageType({type:v.type})),value={...raw,turns:Math.max(old?.turns??0,spec.turns),appliedTurn:s.turnSerial};if(old)Object.assign(old,value);else target.effects.push(value);r.status.turns=value.turns;r.status.changed=true;}
        else {addTactic(s,target,v.type,{turns:v.turns},{source:a.id,...(v.type==='disarmed'?{weapon:target.preferredWeapon??listWeapons(target)[0].id}:{})});r.status.turns=target.tactics.find(p=>p.type===v.type).turns;r.status.changed=true;}
    }
    r.afterHp=target.hp;r.condition=target.condition;return r;
}
function prepareSkill(s,a,intent) {
    const skill=a.skills.find(v=>v.id===intent.skill);assert(skill,'Fähigkeit fehlt.');const b=findActor(s,intent.target??a.id);assert(canUseSkill(s,a,b,skill),'Fähigkeit hier nicht nutzbar: Ziel, Reichweite, Vorrat oder Bewegung prüfen.');
    if(skill.kind==='narrative'&&(skill.dcMode!=='fixed'||skill.mechanics?.target==='selected'))assert(intent.target,'Zielfigur für zielabhängige Abwehr oder eigene Wirkung auswählen.');
    let destination=null,weapon=null,transport=null;
    if(skill.kind==='jump'){const candidates=jumpDestinations(s,a,skill);destination=intent.destination??candidates[0];assert(destination&&Object.keys(destination).every(k=>['x','y'].includes(k))&&Number.isSafeInteger(destination.x)&&Number.isSafeInteger(destination.y)&&candidates.some(p=>distance(p,destination)===0),'Kein legales Sprungziel hinter einer liegenden Figur.');}
    else if(['revive','raise'].includes(skill.kind)){
        if(s.rules.boardEnabled){const candidates=revivalDestinations(s,a,b,skill);destination=intent.destination??candidates[0];assert(destination&&Number.isSafeInteger(destination.x)&&Number.isSafeInteger(destination.y)&&Object.keys(destination).every(k=>['x','y'].includes(k))&&candidates.some(p=>distance(p,destination)===0),'Kein sicheres Wiederbelebungsfeld in Reichweite/Sicht; letzte Position und freie Landung prüfen.');}
        else assert(intent.destination===undefined,'Ohne Spielfeld kein Wiederbelebungsfeld wählen.');
    }
    else if(['shove','carry'].includes(skill.kind)) {const candidates=forcedDestinations(s,a,b,skill.kind==='carry');destination=intent.destination??candidates[0];assert(destination&&candidates.some(p=>distance(p,destination)===0),'Ungültiges Ziel für erzwungene Bewegung.');}
    else assert(intent.destination===undefined,'Diese Fähigkeit verschiebt keine Figur.');
    if(skill.kind==='carry'){
        const p=intent.carrierDestination;
        assert(p===undefined||p&&Object.keys(p).every(k=>['x','y'].includes(k))&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.y),'Ungültiges Helfer-Endfeld.');
        transport=p?carryPlans(s,a,b).find(v=>distance(v,destination)===0&&distance(v.carrier,p)===0):carryDestinations(s,a,b).find(v=>distance(v,destination)===0);
        assert(transport,'Kein legaler Transportweg für diese beiden Endfelder.');
    }else assert(intent.carrierDestination===undefined,'Helfer-Endfeld nur beim Bergen.');
    if(skill.kind==='disarm'){weapon=listWeapons(b).find(w=>w.id===(intent.weapon??b.preferredWeapon))??(intent.weapon==null?listWeapons(b)[0]:null);assert(weapon&&tactic(s,b,'disarmed')?.weapon!==weapon.id,'Entwaffnungsziel fehlt oder ist bereits entwaffnet.');}else assert(intent.weapon===undefined,'Waffenwahl nur bei Entwaffnen.');
    return {skill,b,destination,weapon,transport};
}
function resolveSkillInPlace(s,a,intent,roll,override=null) {
    const {skill,b,destination,weapon,transport}=prepareSkill(s,a,intent);
    if(skill.kind==='acrobatics')a.acrobaticsUsedTurn=s.turnSerial;
    const natural=override?.natural??(skill.check?die(s,20,roll):null),ability=override?.ability??statBonus(s,a,skill.stat),support=skill.check?tacticValue(s,a,'supported'):0,bonus=override?.bonus??rounded(skill.bonus+support),total=override?.total??(natural==null?null:rounded(natural+ability+bonus));
    const defense=skillDefense(s,b,skill),dc=override?.dc??defense.dc;
    const criticalFailure=override?.criticalFailure??Boolean(skill.check&&s.rules.natural20&&natural===1);const critical=override?.critical??Boolean(skill.check&&s.rules.natural20&&natural===20);let success=override?.success??(!skill.check||(s.rules.hitEqual?total>=dc:total>dc));if(!override&&skill.check&&s.rules.natural20&&[1,20].includes(natural))success=natural===20;
    if(skill.check||override)a.tactics=a.tactics.filter(t=>t.type!=='supported');
    if(SKILLS[skill.kind].target==='enemy')a.hidden=null;
    const resource=pay(s,a,skill);
    const outcome={de:'Keine Wirkung.',en:'No effect.'},extra={source:a.id};let movement=null,custom=null;
    const conditionType=({intimidate:'frightened',provoke:'provoked',distract:'distracted',aim:'aimed',support:'supported',hold:'rooted',stun:'stunned',status:skill.status})[skill.kind],immuneStatus=success&&conditionType&&isImmune(skill.kind==='aim'?a:b,conditionType)?conditionType:null;
    if(immuneStatus){outcome.de='Immunität: '+STATUS_TYPES[immuneStatus].de+' nicht angewendet.';outcome.en='Immune: '+STATUS_TYPES[immuneStatus].en+' not applied.';}
    if(skill.kind==='narrative'){outcome.de='Erzählprobe: '+(success?'Erfolg.':'Fehlschlag.')+' Vereinbarte Wirkung manuell ausspielen; keine automatische Regelwirkung.';outcome.en='Narrative check: '+(success?'success.':'failed.')+' Apply the agreed effect manually; no automatic mechanical effect.';}
    if(skill.kind==='narrative'&&skill.mechanics){custom=applyCustomEffects(s,a,b,skill.mechanics,skill.range,success,critical,roll);outcome.de=customOutcomeText(custom,'de');outcome.en=customOutcomeText(custom,'en');}
    if(success&&!immuneStatus){
        if(skill.kind==='jump'){movement={from:coordinate(a.position),to:coordinate(destination)};a.position=clone(destination);outcome.de='Sprung: '+movement.from+' → '+movement.to+'. Keine zusätzlichen Bewegungspunkte.';outcome.en='Jump: '+movement.from+' → '+movement.to+'. No additional movement points.';}
        if(['revive','raise'].includes(skill.kind)){
            const oldPosition=b.position??b.lastPosition,inCombat=['active','paused'].includes(s.phase);
            b.hp=Math.min(b.maxHp,skill.reviveHp??5);b.condition='fit';b.roundsLeft=null;b.downedRound=null;b.hanging=null;b.hidden=null;
            b.effects=[];b.tactics=[];b.shields=[];b.reactionReserve=false;b.reactionReserved=0;b.reactionSpent=reactionBudget(s,b).total;b.reactionUsed=true;b.reactionTurn=-1;
            b.sprintTurn=-1;b.acrobaticsTurn=-1;b.acrobaticsUsedTurn=-1;b.unlimitedTurn=-1;
            b.position=destination?{x:destination.x,y:destination.y}:b.position;b.reserve=false;
            if(skill.kind==='raise')beginAllegiance(s,a,b,skill);
            if(inCombat){if(!s.order.includes(b.id))s.order.push(b.id);joinInPlace(s,b,{timing:'next'});}
            movement=s.rules.boardEnabled?{from:coordinate(oldPosition),to:coordinate(b.position)}:null;
            outcome.de=b.name+': wiederbelebt mit '+b.hp+'/'+b.maxHp+' HP'+(b.position?' auf '+coordinate(b.position):'')+'. Seite und Vorräte erhalten.'+(inCombat?' Frühestens nächste Runde am Zug.':'');
            outcome.en=b.name+': revived with '+b.hp+'/'+b.maxHp+' HP'+(b.position?' at '+coordinate(b.position):'')+'. Side and stocks retained.'+(inCombat?' Eligible next round at the earliest.':'');
        }
        if(skill.kind==='dominate'){beginAllegiance(s,a,b,skill);outcome.de=b.name+': beherrscht für '+skill.turns+' eigene Züge; auf der Seite von '+a.name+'.';outcome.en=b.name+': dominated for '+skill.turns+' own turns; on '+a.name+"'s side.";}
        if(skill.kind==='raise'){outcome.de=b.name+': als untoter Diener erhoben, '+b.hp+'/'+b.maxHp+' HP; '+allegianceText(b,'de')+'.';outcome.en=b.name+': raised as an undead servant, '+b.hp+'/'+b.maxHp+' HP; '+allegianceText(b,'en')+'.';}
        if(skill.kind==='hide'){a.hidden={turns:skill.turns,appliedTurn:s.turnSerial};outcome.de='Versteckt; erster Angriff kann Hinterhaltbonus erhalten.';outcome.en='Hidden; first attack may receive ambush damage.';}
        if(skill.kind==='intimidate'){addTactic(s,b,'frightened',skill,{...extra,policy:critical?'flee':'cover'});outcome.de=critical?'Fluchtabsicht: im nächsten eigenen Zug Rückzug zum Rand.':'Im nächsten eigenen Zug Deckung suchen oder zurückweichen.';outcome.en=critical?'Panic: retreat to an exit next own turn.':'Seek cover or retreat next own turn.';}
        if(skill.kind==='provoke'){addTactic(s,b,'provoked',skill,extra);outcome.de='Nächster Angriff bevorzugt den legal erreichbaren Provokateur.';outcome.en='Prioritize the legally reachable provocateur.';}
        if(skill.kind==='distract'){addTactic(s,b,'distracted',skill,extra);outcome.de='Nächster Angriff gegen dieses Ziel: '+signed(s.rules.distractBonus)+'.';outcome.en='Next attack against this target: '+signed(s.rules.distractBonus)+'.';}
        if(skill.kind==='aim'){addTactic(s,a,'aimed',skill,extra);outcome.de='Nächster eigener Fernangriff: '+signed(s.rules.aimBonus)+'.';outcome.en='Next own ranged attack: '+signed(s.rules.aimBonus)+'.';}
        if(skill.kind==='support'){addTactic(s,b,'supported',skill,extra);outcome.de='Nächster Angriff oder Fähigkeitswurf: '+signed(s.rules.supportBonus)+'.';outcome.en='Next attack or ability check: '+signed(s.rules.supportBonus)+'.';}
        if(skill.kind==='sprint'){a.sprintTurn=s.turnSerial;outcome.de='Ein zusätzliches normales Bewegungsbudget, einmal pro Zug.';outcome.en='One extra normal movement budget, once per turn.';}
        if(skill.kind==='acrobatics'){a.acrobaticsTurn=s.turnSerial;outcome.de='Deckung kostet für diesen Zug 1 statt 2 Bewegungspunkte; kein Halt auf Deckung.';outcome.en='Cover costs 1 instead of 2 movement points this turn; no stopping on cover.';}
        if(['shove','carry'].includes(skill.kind)){movement={from:coordinate(b.position),to:coordinate(destination)};b.position={x:destination.x,y:destination.y};if(skill.kind==='shove'&&isPit(s,destination)){b.lastPosition=parsePosition(movement.from)??b.lastPosition;b.lastHeight=heightAt(s,b.lastPosition);b.hanging={anchor:clone(destination),turns:s.rules.pitRescueRounds,round:s.round};b.position=null;b.hidden=null;entry(s,'presence',b.name+': hängt am Abgrund; '+b.hanging.turns+' Rettungsrunden.',{actor:b.id},b.name+': hanging over a pit; '+b.hanging.turns+' rescue rounds.');}if(skill.kind==='carry'){const budget=movementBudget(s,a);movement.carrierFrom=coordinate(a.position);movement.carrierTo=coordinate(transport.carrier);movement.cost=transport.cost;movement.path=transport.path;a.position={...transport.carrier};s.movement={actorId:a.id,turnSerial:s.turnSerial,spent:budget.spent+transport.cost};}outcome.de=`${b.name}: ${movement.from} → ${movement.to}.`;outcome.en=outcome.de;if(transport){outcome.de+=' '+a.name+': '+movement.carrierFrom+' → '+movement.carrierTo+'; '+transport.cost+' Bewegungspunkte.';outcome.en+=' '+a.name+': '+movement.carrierFrom+' → '+movement.carrierTo+'; '+transport.cost+' movement points.';}}
        if(skill.kind==='hold'){addTactic(s,b,'rooted',skill,extra);outcome.de='Bewegung gesperrt; Aktionen bleiben möglich.';outcome.en='Movement blocked; actions remain available.';}
        if(skill.kind==='disarm'){addTactic(s,b,'disarmed',skill,{...extra,weapon:weapon.id});outcome.de=`${weapon.name} vorübergehend unbenutzbar; andere Waffen bleiben verfügbar.`;outcome.en=`${weapon.name} temporarily unusable; other weapons remain available.`;}
        if(['stun','status'].includes(skill.kind)){const type=skill.kind==='stun'?'stunned':skill.status,old=b.effects.find(e=>e.type===type&&periodicDamageType(e)===periodicDamageType({type,damageType:skill.statusDamageType})),spec=effectSpec(s,{type,turns:skill.turns,damage:['stunned','slowed'].includes(type)?'0':String(skill.statusDamage)}),effect={...spec,damage:['stunned','slowed'].includes(type)?'0':String(skill.statusDamage),...(skill.statusDamageType?{damageType:skill.statusDamageType}:{}),turns:Math.max(old?.turns??0,spec.turns),appliedTurn:s.turnSerial};if(old)Object.assign(old,effect);else b.effects.push(effect);outcome.de=EFFECTS[type].de+': '+effect.turns+' eigene Züge.';outcome.en=EFFECTS[type].en+': '+effect.turns+' own turns.';}
    }else if(skill.kind==='acrobatics'){const budget=movementBudget(s,a);s.movement={actorId:a.id,turnSerial:s.turnSerial,spent:budget.spent+1};a.acrobaticsTurn=s.turnSerial;outcome.de='Fehlschlag kostet 1 Bewegungspunkt; kein Übersteigbonus.';outcome.en='Failure costs 1 movement point; no crossing bonus.';a.acrobaticsTurn=-1;}
    return {type:'skill',immuneStatus,custom,narrative:skill.kind==='narrative'&&!skill.mechanics,description:text(intent.description||skill.description,'',500),actor:a.id,actorName:a.name,target:b.id,targetName:b.name,skill:skill.id,skillKind:skill.kind,skillName:skill.name,bonusSources:override?{check:override.bonus}:{profile:skill.bonus,support},natural,ability,bonus,total,dc,defense:override?null:defense,critical,criticalFailure,success,outcome,forcedMovement:movement,resource:resource?{name:resource.name,quantity:resource.quantity}:null,turn:turnToken(s),round:s.round};
}
function resolveCheckInPlace(s,a,intent,input,roll) {
    if(intent.destination!==undefined)assert(intent.destination&&Object.keys(intent.destination).every(k=>['x','y'].includes(k))&&Number.isSafeInteger(intent.destination.x)&&Number.isSafeInteger(intent.destination.y),'Ungültiges Zielfeld für eigene Probe.');
    const b=intent.target?findActor(s,intent.target):input.effect?a:null;
    const effectIntent=input.effect?{skill:input.effect,target:b?.id,...(intent.weapon!==undefined?{weapon:intent.weapon}:{}),...(intent.destination!==undefined?{destination:intent.destination}:{}),...(intent.carrierDestination!==undefined?{carrierDestination:intent.carrierDestination}:{})}:null;
    const prepared=effectIntent?prepareSkill(s,a,effectIntent):null;
    if(input.mechanics)customEffectTarget(s,a,b,input.mechanics,input.effectRange);
    if(!prepared)assert(intent.weapon===undefined&&intent.destination===undefined&&intent.carrierDestination===undefined,'Eigene Probe: Waffe oder Zielfeld nur für passende Fähigkeitswirkung.');
    if(input.resource)assert(a.resources.some(r=>r.id===input.resource),'Eigene Probe: Vorrat fehlt.');
    assert(prepared||canPay(s,a,input),'Vorrat reicht nicht für diese Probe.');
    const defense=skillDefense(s,b,input);assert(Number.isFinite(defense.dc),'Ziel für zielabhängige Abwehr auswählen.');
    const cost=prepared?consumption(s,a,prepared.skill).cost:consumption(s,a,input).cost;
    const bonus=rounded(input.bonus+(input.free?0:tacticValue(s,a,'supported')));
    const outcome=checkOutcome(s.rules,die(s,20,roll),statBonus(s,a,input.stat),bonus,defense.dc);
    const applied=effectIntent?resolveSkillInPlace(s,a,effectIntent,roll,outcome):null;
    const paid=!prepared&&!input.free?pay(s,a,input):null;
    const custom=applied?.custom??(input.mechanics?applyCustomEffects(s,a,b,input.mechanics,input.effectRange,outcome.success,outcome.critical,roll):null);
    if(!input.free&&!effectIntent)a.tactics=a.tactics.filter(t=>t.type!=='supported');
    const result={type:'check',actor:a.id,actorName:a.name,target:b?.id??null,targetName:b?.name??null,description:input.description,stat:input.stat,free:input.free,bonusSources:{check:input.bonus,support:rounded(bonus-input.bonus)},...outcome,
        custom,effect:input.effect,effectName:applied?.skillName??null,effectKind:applied?.skillKind??null,outcome:custom?{de:customOutcomeText(custom,'de'),en:customOutcomeText(custom,'en')}:applied?.outcome??{de:'Keine zusätzliche Regelwirkung.',en:'No additional mechanical effect.'},
        defense,resource:applied?.resource?{...applied.resource,cost}:paid,forcedMovement:applied?.forcedMovement??null,turn:turnToken(s),round:s.round};
    entry(s,'check',resultText(result),result);return result;
}
export function remark(s,id,description,token=turnToken(s)) {
    return commit(s,next=>{assert(token===turnToken(next),'Veralteter Zug.');const a=findActor(next,id),value=text(description,'',500);assert(value,'Beschreibung fehlt.');entry(next,'remark',`${a.name}: ${value} (kostenlose Handlung; keine Regelwirkung).`,{actor:a.id},`${a.name}: ${value} (free remark; no mechanical effect).`);});
}
export function resetScenario(s,scope) {
    return commit(s,next=>{pick(scope,['all','map','actors'],'Reset-Bereich');const revision=next.revision,serial=next.turnSerial+1,rules=clone(next.rules),receipts=[...next.receipts];
        if(scope==='all')Object.assign(next,emptyState(),{rules,turnSerial:serial,receipts});
        else {next.phase='setup';next.order=[];next.round=1;next.turn=0;next.turnSerial=serial;next.action={actorId:'',turnSerial:serial,used:false,freeSpent:0,bonusSpent:{}};next.movement={actorId:'',turnSerial:serial,spent:0};
            if(scope==='actors')next.actors=[];
            else {next.board={...emptyState().board,width:next.board.width,height:next.board.height};for(const a of next.actors){a.position=null;a.stance='neutral';}}
        }next.revision=revision;entry(next,'reset',scope==='all'?'Neues Szenario: aktueller Kampf geleert.':scope==='map'?'Karte geleert; Figurenwerte erhalten, neu platzieren.':'Figurenliste geleert; Karte erhalten.',{scope},scope==='all'?'New scenario: current encounter cleared.':scope==='map'?'Map cleared; participant profiles retained, deploy again.':'Participants cleared; map retained.');
    });
}
export function restoreParticipants(s,options={}) {
    return commit(s,next=>{
        assert(!['active','paused'].includes(next.phase),'Kampf vor dem Wiederherstellen beenden.');
        const ids=options.actors;assert(Array.isArray(ids)&&ids.length&&new Set(ids).size===ids.length&&ids.every(id=>next.actors.some(a=>a.id===id)),'Figuren zum Wiederherstellen auswählen.');
        for(const key of ['hp','effects','refill','includeDead'])assert(options[key]===undefined||typeof options[key]==='boolean','Ungültige Wiederherstellungsoption.');
        assert(options.hp||options.effects||options.refill,'Mindestens eine Wiederherstellungsoption wählen.');
        const stocks=options.stocks??null;assert(stocks===null||stocks&&typeof stocks==='object'&&!Array.isArray(stocks),'Ungültige Vorratsauswahl.');
        if(stocks)for(const [id,values]of Object.entries(stocks))assert(ids.includes(id)&&Array.isArray(values)&&new Set(values).size===values.length&&values.every(key=>findActor(next,id).resources.some(r=>r.id===key)),'Vorratsauswahl passt nicht zur Figur.');
        const restored=[],skipped=[];
        for(const id of ids){const a=findActor(next,id);if(a.condition==='dead'&&!options.includeDead){skipped.push(a.name);continue;}
            const beforeHp=a.hp,filled=[];
            if(options.hp){a.hp=a.maxHp;a.condition='fit';a.roundsLeft=null;a.downedRound=null;}
            if(options.effects){a.effects=[];a.tactics=[];a.shields=[];a.hidden=null;a.sprintTurn=-1;a.acrobaticsTurn=-1;a.acrobaticsUsedTurn=-1;}
            if(options.refill)for(const r of a.resources)if(r.capacity!=null&&(!stocks||(Object.hasOwn(stocks,a.id)&&stocks[a.id].includes(r.id)))){filled.push({id:r.id,name:r.name,before:r.quantity,after:r.capacity});r.quantity=r.capacity;}
            restored.push({id:a.id,name:a.name,beforeHp,afterHp:a.hp,clearedEffects:Boolean(options.effects),stocks:filled});
        }
        next.turnSerial++;next.action={actorId:'',turnSerial:next.turnSerial,used:false,freeSpent:0,bonusSpent:{}};next.movement={actorId:'',turnSerial:next.turnSerial,spent:0};
        const result={type:'restore',restored,skipped,options:clone(options)};
        const summary=language=>restored.map(v=>v.name+': '+v.beforeHp+' → '+v.afterHp+' HP'+(v.clearedEffects?' · '+(language==='en'?'temporary effects cleared':'temporäre Effekte entfernt'):'')+(v.stocks.length?' · '+v.stocks.map(r=>r.name+' '+r.before+' → '+r.after).join(', '):'')).join('; ');
        entry(next,'restore','Figuren wiederhergestellt: '+summary('de')+(skipped.length?'. Tote ausgelassen: '+skipped.join(', '):''),result,'Participants restored: '+summary('en')+(skipped.length?'. Dead skipped: '+skipped.join(', '):''));return result;
    });
}
export function setGroupBudgets(s,sides,config,mode='replace') {
    return commit(s,next=>{assert(Array.isArray(sides)&&sides.length&&sides.every(v=>['player','ally','enemy'].includes(v)),'Gruppen auswählen.');const values=actionConfig(config);pick(mode,['append','replace'],'Gruppenmodus');
        const merge=old=>{if(mode==='replace')return clone(values);const pools=clone(old?.bonusActions??[]);for(const incoming of values.bonusActions){const found=pools.find(v=>v.name===incoming.name&&[...v.allowed].sort().join(',')===[...incoming.allowed].sort().join(','));if(found){found.count=incoming.count;}else pools.push(clone(incoming));}return actionConfig({actionsPerTurn:old?.actionsPerTurn??1,bonusActions:pools});};
        for(const side of sides)next.rules.budgetDefaults[side]=merge(next.rules.budgetDefaults[side]);
        for(const a of next.actors)if(sides.includes(a.side))Object.assign(a,merge(a));
        entry(next,'edit','Aktionsbudgets für ausgewählte Gruppen übernommen.',{},'Action budgets applied to selected groups.');closeExhaustedTurn(next);
    });
}

export function manualUnlimited(s,a=currentActor(s)){return Boolean(s.phase==='active'&&a?.id===currentActor(s)?.id&&a.unlimitedTurn===s.turnSerial);}
function spendManual(s,a){s.action={...s.action,actorId:a.id,turnSerial:s.turnSerial,freeSpent:(s.action.freeSpent??0)+1,bonusSpent:s.action.bonusSpent??{},used:true};return {kind:'override',id:null};}
export function setUnlimited(s,id,enabled,token=turnToken(s)){return commit(s,next=>{assert(typeof enabled==='boolean','Aktionsfreigabe: Boolean erforderlich.');assert(token===turnToken(next),'Veralteter Zug.');const a=requireTurn(next,id);a.unlimitedTurn=enabled?next.turnSerial:-1;entry(next,'presence',a.name+': zusätzliche manuelle Aktionen '+(enabled?'freigegeben.':'begrenzt.'),{actor:id},a.name+': additional manual actions '+(enabled?'enabled.':'restricted.'));});}
export function reserveActor(s,id){return commit(s,next=>{const a=findActor(next,id),active=currentActor(next)?.id;a.lastPosition=a.position?clone(a.position):a.lastPosition;a.lastHeight=a.position?heightAt(next,a.position):a.lastHeight;a.position=null;a.reserve=true;a.hidden=null;const last=a.lastPosition?coordinate(a.lastPosition)+' · '+a.lastHeight:null;entry(next,'presence',a.name+': vom Spielfeld genommen; Werte erhalten.'+(last?' Letzte Position: '+coordinate(a.lastPosition)+' · Höhe '+a.lastHeight+'.':''),{actor:id,lastPosition:clone(a.lastPosition),lastHeight:a.lastHeight},a.name+': removed from board; profile retained.'+(last?' Last position: '+coordinate(a.lastPosition)+' · Height '+a.lastHeight+'.':''));if(next.phase==='active'&&active===id){next.turn--;resetTurn(next);seekNext(next);}});}
function joinInPlace(s,a,options={}){
    const current=currentActor(s)?.id,wasPaused=s.phase==='paused',known=a.initiativeReady;
    if(!known){const method=options.initiativeMode??s.rules.joinInitiative;pick(method,['profile','roll','manual'],'Beitrittsinitiative');if(method==='roll')a.initiative=die(s,20,options.roll)+statBonus(s,a,'dexterity');if(method==='manual')a.initiative=decimal(options.initiative??a.initiative,-1000,1000,'Initiative');a.initiativeReady=true;
        const order=s.order.filter(id=>id!==a.id),at=order.findIndex(id=>findActor(s,id).initiative<a.initiative);order.splice(at<0?order.length:at,0,a.id);s.order=order;if(current)s.turn=order.indexOf(current);
    }
    const timing=pick(options.timing??s.rules.joinTiming,['remaining','next'],'Erster Zug');
    a.reserve=false;a.joinRound=s.round+Number(timing==='next'||a.turnRound===s.round||current&&s.order.indexOf(a.id)<=s.order.indexOf(current));
    entry(s,'presence',a.name+': eingesetzt auf '+coordinate(a.position)+' · Höhe '+heightAt(s,a.position)+', Initiative '+a.initiative+'; frühestens Runde '+a.joinRound+'.',{actor:a.id,position:clone(a.position),initiative:a.initiative,joinRound:a.joinRound},a.name+': deployed at '+coordinate(a.position)+' · Height '+heightAt(s,a.position)+', initiative '+a.initiative+'; eligible from round '+a.joinRound+'.');
    if(wasPaused){s.phase='active';s.turn=-1;resetTurn(s);seekNext(s);}
}
export function deployActor(s,id,position,options={}){return moveActor(s,id,position,true,options);}
export function revealActor(s,id){return commit(s,next=>{const a=findActor(next,id);a.hidden=null;entry(next,'conceal',a.name+': sichtbar.',{actor:id},a.name+': revealed.');});}
function reconcileEncounter(s,before){
    for(const a of s.actors){
        settleDeadBinding(s,a);
        if(a.hidden&&((before?.actors.find(v=>v.id===a.id)?.hp??a.hp)>a.hp||!s.rules.stealthEnabled||!isCombatant(a)||!concealment(s,a))){a.hidden=null;entry(s,'conceal',a.name+': nicht mehr versteckt.',{actor:a.id},a.name+': no longer hidden.');}
        if(s.rules.autoRemoveDead&&a.condition==='dead'&&a.position){a.lastPosition=clone(a.position);a.lastHeight=heightAt(s,a.position);a.position=null;entry(s,'presence',a.name+': tot, vom Spielfeld genommen; letzte Position '+coordinate(a.lastPosition)+'.',{actor:a.id},a.name+': dead, removed from board; last position '+coordinate(a.lastPosition)+'.');}
    }
}

export const STATS = Object.freeze({
    strength: 'Strength', dexterity: 'Dexterity', constitution: 'Constitution',
    intelligence: 'Intelligence', charisma: 'Charisma', perception: 'Perception',
});
export const clone = value => structuredClone(value);
export const uid = () => globalThis.crypto.randomUUID();
const own = (o, k) => Object.hasOwn(o, k);
function assert(ok, message) { if (!ok) throw new Error(message); }
function int(v, min, max, label) {
    assert(v !== '' && v !== null && typeof v !== 'boolean', `${label}: Zahl erforderlich.`);
    const n = Number(v);
    assert(Number.isSafeInteger(n) && n >= min && n <= max, `${label}: ganze Zahl ${min} bis ${max}.`);
    return n;
}
function text(v, fallback = '', max = 500) { return String(v ?? fallback).trim().slice(0, max); }
function pick(v, choices, label) { assert(choices.includes(v), `${label}: ungültiger Wert.`); return v; }
export function modifier(score) { return Math.floor((Number(score) - 10) / 2); }
export function columnLabel(x) {
    let label = '', n = x + 1;
    while (n > 0) { n--; label = String.fromCharCode(65 + n % 26) + label; n = Math.floor(n / 26); }
    return label;
}
export function coordinate(pos, language = 'de') { return pos ? `${columnLabel(pos.x)}${pos.y + 1}` : language === 'en' ? 'unplaced' : 'nicht platziert'; }
export function distance(a, b) { return a && b ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity; }
export function actorFrom(input = {}, preserveId = false, statMode = 'scores', deathDefault = 3) {
    assert(input && typeof input === 'object' && !Array.isArray(input), 'Figur: Objekt erforderlich.');
    const stats = Object.fromEntries(Object.keys(STATS).map(k => [k, (statMode === 'scores' ? int : decimal)(input.stats?.[k] ?? (statMode === 'scores' ? 10 : 0), statMode === 'scores' ? 1 : -100, statMode === 'scores' ? 40 : 100, STATS[k])]));
    let position = null;
    if (input.position != null) position = { x: int(input.position.x, 0, 49, 'Spalte'), y: int(input.position.y, 0, 49, 'Zeile') };
    const maxHp = int(input.maxHp ?? 20, 1, 1000000, 'Maximale HP');
    const constitutionHpBonus = int(input.constitutionHpBonus ?? 0, -200, 200, 'Constitution-HP-Bonus');
    const baseHp = int(input.baseHp ?? Math.max(1, maxHp - constitutionHpBonus), 1, 1000000, 'Basis-HP');
    const name = text(input.name, 'Neue Figur', 100);
    assert(name, 'Bitte einen Namen eingeben.');
    const id = preserveId ? text(input.id, '', 100) : uid();
    assert(id, 'Figuren-ID fehlt.');
    const hp = int(input.hp ?? maxHp, 0, maxHp, 'HP');
    const deathRounds = input.deathRounds == null || input.deathRounds === '' ? null : int(input.deathRounds, 0, 1000, 'Rettungsfrist');
    const condition = hp > 0 ? 'fit' : pick(input.condition ?? ((deathRounds ?? deathDefault) === 0 ? 'dead' : 'unconscious'), ['unconscious', 'stabilized', 'dead'], 'Zustand');
    const roundsLeft = condition === 'unconscious' ? int(input.roundsLeft ?? deathRounds ?? deathDefault, 1, 1000, 'Verbleibende Rettungsrunden') : null;
    const legacyDamage = parseDice(input.damage ?? '1d6').formula;
    const legacyBonus = decimal(input.damageBonus ?? 0, -100, 100, 'Schadensbonus');
    let weapons = own(input, 'weapons') ? { melee: weaponFrom(input.weapons?.melee, legacyBonus), ranged: weaponFrom(input.weapons?.ranged, legacyBonus) }
        : { melee: weaponFrom({ damage: legacyDamage }, legacyBonus), ranged: weaponFrom({ damage: legacyDamage }, legacyBonus) };
    const range = int(input.range ?? 10, 1, 100, 'Reichweite');
    const weaponList = own(input, 'weaponList') ? weaponsFrom(input.weaponList, range, legacyBonus) : weaponsFrom(['melee', 'ranged'].filter(mode => weapons[mode]).map(mode => ({ ...weapons[mode], id: mode, name: input.weapons?.[mode]?.name ?? (mode === 'melee' ? 'Melee' : 'Ranged'), mode, range })), range, legacyBonus);
    weapons = Object.fromEntries(['melee', 'ranged'].map(mode => [mode, weaponList.find(v => v.mode === mode) ?? null]));
    const resources = resourcesFrom(input.resources, parseDice), effects = effectsFrom(input.effects, parseDice, true);
    for (const w of weaponList.flatMap(w => [w, w?.standard])) if (w?.resource) assert(resources.some(v => v.id === w.resource && v.kind === 'ammo'), 'Waffenressource fehlt. Munition/Ladungen anlegen oder die Verknüpfung entfernen.');
    let attackMode = pick(input.attackMode ?? 'melee', ['melee', 'ranged'], 'Angriffsart');
    if (!weapons[attackMode] && (weapons.melee || weapons.ranged)) attackMode = weapons.melee ? 'melee' : 'ranged';
    const preferredWeapon = weaponList.find(v => v.id === input.preferredWeapon && v.mode === attackMode)?.id ?? weaponList.find(v => v.mode === attackMode)?.id ?? null;
    assert(input.escaped === undefined || typeof input.escaped === 'boolean', 'escaped: Boolean erforderlich.');
    assert(!input.escaped || !position, 'Geflohene Figuren dürfen keine Feldposition haben.');
    return {
        id, name, ...traitsFrom(input), ...defenseFrom(input,resources),...actionConfig(input), side: pick(input.side ?? 'enemy', ['player', 'ally', 'enemy'], 'Seite'),
        ...encounterFields(input), ...allegianceFields(input), aiConfig:aiConfigFrom(input.aiConfig),aiMemory:aiMemoryFrom(input.aiMemory), skills: skillsFrom(input.skills, Object.keys(STATS), resources), tactics: tacticsFrom(input.tactics), stance: pick(input.stance ?? 'neutral', ['neutral','defensive','offensive'], 'Kampfhaltung'),
        stanceTurn: int(input.stanceTurn ?? -1, -1, Number.MAX_SAFE_INTEGER, 'Haltungszug'), sprintTurn: int(input.sprintTurn ?? -1, -1, Number.MAX_SAFE_INTEGER, 'Sprintzug'), acrobaticsUsedTurn: int(input.acrobaticsUsedTurn ?? -1,-1,Number.MAX_SAFE_INTEGER,'Akrobatikversuch'), acrobaticsTurn: int(input.acrobaticsTurn ?? -1, -1, Number.MAX_SAFE_INTEGER, 'Akrobatikzug'),
        maxHp, hp, baseHp, constitutionHpBonus, stats, resources, effects, condition, deathRounds, roundsLeft, escaped: Boolean(input.escaped),
        downedRound: condition === 'unconscious' ? int(input.downedRound ?? 0, 0, 1000000, 'Runde der Bewusstlosigkeit') : null,
        dc: decimal(input.dc ?? 12, 0, 100, 'DC'), damage: weaponList.find(v => v.id === preferredWeapon)?.damage ?? legacyDamage, weapons, weaponList, preferredWeapon,
        control: pick(input.control ?? 'manual', ['manual', 'basic', 'advanced', 'dm'], 'Steuerung'),
        aiBehavior: pick(input.aiBehavior ?? 'aggressive', ['aggressive', 'support', 'cautious'], 'KI-Verhalten'),
        attackBonus: decimal(input.attackBonus ?? 0, -100, 100, 'Trefferbonus'),
        damageBonus: decimal(input.damageBonus ?? 0, -100, 100, 'Schadensbonus'),
        movementBonus: int(input.movementBonus ?? 0, -100, 100, 'Bewegungsbonus'),
        initiative: decimal(input.initiative ?? 0, -100000, 100000, 'Initiative'),
        attackMode,
        attackStat: pick(input.attackStat ?? 'auto', ['auto', ...Object.keys(STATS)], 'Angriffsattribut'),
        range: weapons.ranged?.range ?? range, position,
        notes: text(input.notes, '', 2000), portrait: imageRef(input.portrait),
    };
}
function weaponFrom(raw, legacyBonus = 0) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'string') raw = { damage: raw };
    assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'Waffe: Objekt erforderlich.');
    const weapon = { ...(raw.damageType!==undefined?{damageType:damageType(raw.damageType)}:{}),stat: pick(raw.stat ?? 'inherit', ['inherit','auto',...Object.keys(STATS)], 'Waffenattribut'), cost:unitCost(raw.cost===undefined?1:raw.cost), damage: parseDice(raw.damage).formula, radius: int(raw.radius ?? 0, 0, 10, 'Flächenradius'), damageBonus: decimal(raw.damageBonus ?? legacyBonus, -100, 100, 'Waffen-Schadensbonus'), effects: effectsFrom(raw.effects, parseDice), resource: raw.resource == null || raw.resource === '' ? null : text(raw.resource, '', 100) };
    const standard = raw.standard === undefined && weapon.resource ? { damage: weapon.damage, damageBonus: weapon.damageBonus } : raw.standard;
    weapon.standard = standard == null ? null : { ...(standard.damageType!==undefined?{damageType:damageType(standard.damageType)}:{}),cost:unitCost(standard.cost===undefined?1:standard.cost),damage: parseDice(standard.damage).formula, damageBonus: decimal(standard.damageBonus ?? weapon.damageBonus, -100, 100, 'Waffen-Schadensbonus'), radius: 0, effects: [], resource: standard.resource == null || standard.resource === '' ? null : text(standard.resource, '', 100) };
    return weapon;
}
export function weaponsFrom(raw, legacyRange = 10, legacyBonus = 0) {
    assert(Array.isArray(raw) && raw.length <= 100, 'Waffenliste: höchstens 100 Einträge.');
    const list = raw.map(v => {
        assert(v && typeof v === 'object' && !Array.isArray(v), 'Waffe: Objekt erforderlich.');
        const id = text(v.id, '', 100) || uid(), name = text(v.name, 'Attack', 100);
        assert(name, 'Waffenname fehlt.');
        return { ...weaponFrom(v, legacyBonus), id, name, mode: pick(v.mode ?? 'melee', ['melee', 'ranged'], 'Angriffsart'), range: int(v.range ?? legacyRange, 1, 100, 'Waffenreichweite'), attackBonus: decimal(v.attackBonus ?? 0, -100, 100, 'Waffen-Trefferbonus') };
    });
    assert(new Set(list.map(v => v.id)).size === list.length, 'Doppelte Waffen-ID.'); return list;
}
export function listWeapons(a) {
    return a.weaponList ?? ['melee', 'ranged'].filter(mode => a.weapons?.[mode]).map(mode => ({ ...a.weapons[mode], id: mode, name: mode, mode, range: a.range, attackBonus: 0 }));
}
export function weaponFor(a, mode = a.attackMode, variant = 'profile', weaponId = null) {
    const base = weaponId == null ? listWeapons(a).find(v => v.mode === mode) : listWeapons(a).find(v => v.id === weaponId && v.mode === mode);
    const weapon = variant === 'standard' ? base?.standard : base;
    return weapon ? { ...weapon, id: base.id, name: base.name, mode: base.mode, range: base.range, stat: base.stat ?? 'inherit', attackBonus: base.attackBonus ?? 0, damageBonus: weapon.damageBonus ?? a.damageBonus ?? 0 } : null;
}
function legacyWeaponsPatch(old, input) {
    if (own(input, 'weaponList')) return input.weaponList;
    const list = clone(listWeapons(old));
    if (own(input, 'weapons')) for (const mode of ['melee', 'ranged']) {
        if (!own(input.weapons ?? {}, mode)) continue;
        const index = list.findIndex(v => v.mode === mode), raw = input.weapons[mode];
        if (raw == null || raw === '') { if (index >= 0) list.splice(index, 1); continue; }
        const value = { ...(index >= 0 ? list[index] : {}), ...(typeof raw === 'string' ? { damage: raw } : raw), id: index >= 0 ? list[index].id : mode, name: raw.name ?? (index >= 0 ? list[index].name : mode), mode, range: raw.range ?? input.range ?? (index >= 0 ? list[index].range : old.range) };
        if (index >= 0) list[index] = value; else list.push(value);
    }
    if (own(input, 'range')) { const first = list.find(v => v.mode === 'ranged'); if (first) first.range = input.range; }
    return list;
}

export const defaultRules = () => ({
    ...encounterRuleDefaults,reactionsEnabled:false,reactionsPerTurn:1,shieldsEnabled:false,reactionBlock:2,aimBonus:2, supportBonus:2, distractBonus:2, poisonPenalty:2, slowedPercent:50, effectDamageOverrides:{}, effectDurationOverrides:{}, skillsEnabled: true, stancesEnabled: true, offensiveAttack:2, offensiveDefense:-2, defensiveAttack:-2, defensiveDefense:2, perceptionRange: false, criticalDamage: 'doubleDice', boardEnabled: true, sharePositions: true, hitEqual: true,
    damageAbility: false, natural20: false, statMode: 'scores', rngMode: 'crypto', seed: 'abenteuer-1',
    movementBase: 3, movementStat: 'dexterity', splitMovement: false, passAllies: false,
    deathRounds: 3, constitutionHp: false, resourcesEnabled: true, effectsEnabled: true, multiActionsEnabled: false, heightsEnabled: true, highAttackBonus: 2, highDefenseBonus: 2, climbCost: 2,
    language: 'de', coverPercent: 50, coverWalkable: false, coverCrossable: true, budgetDefaults: {}, sideDefaults: groupDefaultsFrom(),
});
export function groupDefaultsFrom(raw = {}) {
    assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'Gruppensteuerung muss ein Objekt sein.');
    assert(Object.keys(raw).every(k => ['player', 'ally', 'enemy'].includes(k)), 'Unbekannte Gruppe.');
    return Object.fromEntries(['player', 'ally', 'enemy'].map(side => {
        const value = raw[side] ?? {};
        assert(value && typeof value === 'object' && !Array.isArray(value), 'Gruppensteuerung muss ein Objekt sein.');
        return [side, { control: pick(value.control ?? 'manual', ['manual', 'basic', 'advanced', 'dm'], 'Steuerung'), aiBehavior: pick(value.aiBehavior ?? 'aggressive', ['aggressive', 'support', 'cautious'], 'KI-Verhalten') }];
    }));
}
export function rulesFrom(input = {}) {
    const r = {...defaultRules(),...encounterRules(input,decimal)};
    for (const k of ['passAllies','reactionsEnabled','shieldsEnabled','boardEnabled', 'sharePositions', 'hitEqual', 'damageAbility', 'natural20', 'coverWalkable', 'coverCrossable', 'constitutionHp', 'splitMovement', 'resourcesEnabled', 'effectsEnabled', 'multiActionsEnabled', 'heightsEnabled', 'skillsEnabled', 'stancesEnabled', 'perceptionRange']) {
        if (own(input, k)) { assert(typeof input[k] === 'boolean', `${k}: Boolean erforderlich.`); r[k] = input[k]; }
    }
    r.criticalDamage = pick(input.criticalDamage ?? r.criticalDamage, ['doubleDice','max','doubleMax'], 'Kritischer Schaden');
    r.statMode = pick(input.statMode ?? r.statMode, ['scores', 'bonuses'], 'Attributmodus');
    r.rngMode = pick(input.rngMode ?? r.rngMode, ['crypto', 'seeded'], 'Würfelmodus');
    r.seed = text(input.seed, r.seed, 200);
    r.movementBase = int(input.movementBase ?? r.movementBase, 1, 100, 'Grundbewegung');
    r.movementStat = pick(input.movementStat ?? r.movementStat, ['none', ...Object.keys(STATS)], 'Bewegungsattribut');
    r.deathRounds = int(input.deathRounds ?? r.deathRounds, 0, 1000, 'Rettungsfrist');
    r.language = pick(input.language ?? r.language, ['de', 'en'], 'Sprache');
    r.coverPercent = int(input.coverPercent ?? r.coverPercent, 0, 100, 'Schaden bei Deckung (%)');
    for (const k of ['highAttackBonus', 'highDefenseBonus']) r[k] = decimal(input[k] ?? r[k], 0, 100, k);
    for(const k of ['offensiveAttack','offensiveDefense','defensiveAttack','defensiveDefense'])r[k]=decimal(input[k]??r[k],-100,100,k);
    for(const k of ['aimBonus','supportBonus','distractBonus','poisonPenalty'])r[k]=decimal(input[k]??r[k],0,100,k);
    r.reactionsPerTurn=int(input.reactionsPerTurn??r.reactionsPerTurn,0,20,'Reaktionen pro Zug');
    r.reactionBlock=decimal(input.reactionBlock??2,0,1000000,'Blockreduktion');
    r.slowedPercent=int(input.slowedPercent??50,1,100,'Bewegung bei Verlangsamung (%)');
    for(const [key,types] of [['effectDamageOverrides',PERIODIC_STATUSES],['effectDurationOverrides',Object.keys({...EFFECTS,...TACTICS})]]){
        const raw=input[key]??{};assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'Ungültige Effektvorgaben.');
        assert(Object.keys(raw).every(k=>types.includes(k)),'Unbekannte Effektvorgabe.');
        r[key]=Object.fromEntries(Object.entries(raw).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>[k,key==='effectDurationOverrides'?int(v,1,100,'Effektdauer'):effectFormula(v)]));
    }
    r.climbCost = int(input.climbCost ?? r.climbCost, 1, 100, 'Leiterkosten');
    assert(input.budgetDefaults === undefined || input.budgetDefaults && typeof input.budgetDefaults === 'object' && !Array.isArray(input.budgetDefaults), 'Ungültige Gruppenbudgets.');
    r.budgetDefaults = Object.fromEntries(Object.entries(input.budgetDefaults ?? {}).map(([side,value])=>{pick(side,['player','ally','enemy'],'Gruppe');return [side,actionConfig(value)];}));
    r.sideDefaults = groupDefaultsFrom(input.sideDefaults ?? r.sideDefaults);
    assert(r.seed, 'Seed darf nicht leer sein.');
    return r;
}
export function setCombatName(s,name) { return commit(s,next=>{next.name=text(name,'',200);entry(next,'edit','Kampfname gespeichert.',{},'Combat name saved.');}); }
export function emptyState() {
    return {
        version: 1, name:'', actors: [], board: { width: 10, height: 10, blocked: [], cover: [], heights: [], ladders: [], coverFaces: [],pits:[],cliffForm:'random',cliffScenery:'open',roomScale:'mixed',forestStyle:'groves', appearance:appearanceFrom(), preset: 'custom', mapSeed: '', background: null }, rules: defaultRules(), phase: 'setup', order: [], turn: 0,
        round: 1, turnSerial: 0, revision: 0, rng: { cursor: 0 }, log: [], receipts: [],
        movement: { turnSerial: 0, actorId: '', spent: 0 },
        action: { turnSerial: 0, actorId: '', used: false,freeSpent:0,bonusSpent:{} },
    };
}
export function validateState(raw) {
    assert(raw && raw.version === 1 && Array.isArray(raw.actors), 'Keine gültige Kampfdatei (Version 1).');
    const s = emptyState();
    s.name=text(raw.name,'',200);
    s.rules = rulesFrom(raw.rules ?? {});
    s.board = boardFrom(raw.board ?? {});
    // Legacy 0-HP participants had no death rule: preserve them as stabilized.
    s.actors = raw.actors.map(a => actorFrom({ ...a,...(!own(a,'reactionsPerTurn')?{reactionsPerTurn:1}:{}), ...(a.hp === 0 && !a.condition ? { condition: 'stabilized' } : {}) }, true, s.rules.statMode, s.rules.deathRounds));
    // Keep old encounters usable without moving participants standing in cover.
    if (!own(raw.rules ?? {}, 'coverWalkable') && s.actors.some(a => a.position && isCover(s, a.position))) s.rules.coverWalkable = true;
    const ids = new Set(s.actors.map(a => a.id));
    assert(ids.size === s.actors.length, 'Doppelte Figuren-IDs.');
    const positions = s.actors.filter(a => a.position).map(a => coordinate(a.position));
    assert(new Set(positions).size === positions.length, 'Mehrere Figuren auf demselben Feld.');
    for (const a of s.actors) if (a.position) checkCell(s, a.position);
    s.phase = pick(raw.phase ?? 'setup', ['setup', 'active', 'paused', 'ended'], 'Kampfphase');
    s.order = Array.isArray(raw.order) ? raw.order.map(id => text(id, '', 100)) : [];
    assert(s.order.every(id => ids.has(id)) && new Set(s.order).size === s.order.length, 'Ungültige Initiativeordnung.');
    if (['active','paused'].includes(s.phase)) {
        assert(s.order.length > 0 && s.order.length === s.actors.length, 'Aktiver Kampf benötigt alle Figuren in der Initiative.');
    }
    s.turn = int(raw.turn ?? 0, 0, Math.max(0, s.order.length - 1), 'Zugindex');
    s.round = int(raw.round ?? 1, 1, 1000000, 'Runde');
    s.turnSerial = int(raw.turnSerial ?? 0, 0, Number.MAX_SAFE_INTEGER, 'Zugnummer');
    s.revision = int(raw.revision ?? 0, 0, Number.MAX_SAFE_INTEGER, 'Revision');
    s.rng.cursor = int(raw.rng?.cursor ?? 0, 0, Number.MAX_SAFE_INTEGER, 'Würfelposition');
    s.log = Array.isArray(raw.log) ? raw.log.slice(-300).map(e => ({
        id: text(e.id, '', 100) || uid(),
        type: text(e.type, 'note', 30), text: text(e.text, '', 400000), at: text(e.at, '', 40),
        ...(e.textEn ? { textEn: text(e.textEn, '', 80000), textDe: text(e.textDe ?? e.text, '', 80000) } : {}),
        ...(typeof e.chatRelevant === 'boolean' ? { chatRelevant: e.chatRelevant } : {}),
        details: e.details && typeof e.details === 'object' ? clone(e.details) : {},
    })) : [];
    s.receipts = Array.isArray(raw.receipts) ? raw.receipts.slice(-1000).map(v => text(v, '', 200)) : [];
    s.movement = { turnSerial: int(raw.movement?.turnSerial ?? s.turnSerial, 0, Number.MAX_SAFE_INTEGER, 'Bewegungszug'),
        actorId: text(raw.movement?.actorId, '', 100), spent: int(raw.movement?.spent ?? 0, 0, 1000000, 'Verbrauchte Bewegung') };
    assert(!s.movement.actorId || ids.has(s.movement.actorId), 'Unbekannte Figur im Bewegungsbudget.');
    assert(raw.action?.used === undefined || typeof raw.action.used === 'boolean', 'Ungültiger Aktionsverbrauch.');
    s.action = { turnSerial: int(raw.action?.turnSerial ?? s.turnSerial, 0, Number.MAX_SAFE_INTEGER, 'Aktionszug'), actorId: text(raw.action?.actorId, '', 100), used: raw.action?.used ?? false, freeSpent: actionState(raw.action, s.turnSerial).freeSpent, bonusSpent: actionState(raw.action, s.turnSerial).bonusSpent };
    assert(!s.action.actorId || ids.has(s.action.actorId), 'Unbekannte Figur im Aktionsbudget.');
    assert(!s.action.used || (s.phase === 'active' && s.action.turnSerial === s.turnSerial && s.action.actorId === currentActor(s)?.id), 'Verbrauchte Aktion gehört nicht zum aktuellen Zug.');
    if(['active','paused'].includes(s.phase))for(const a of s.actors)if(!Object.hasOwn(raw.actors.find(v=>v.id===a.id)??{},'initiativeReady'))a.initiativeReady=!a.reserve;
    if(s.phase==='active')for(const id of s.order.slice(0,s.turn+1)){const a=findActor(s,id);if(!Object.hasOwn(raw.actors.find(v=>v.id===id)??{},'turnRound'))a.turnRound=s.round;}
    for(const a of s.actors)settleDeadBinding(s,a);
    if (s.phase === 'active') assert(isCombatant(currentActor(s)), 'Aktive Figur ist kampfunfähig oder geflohen. Kampfdatei korrigieren.');
    return s;
}
export function currentActor(s) { if(s.phase==='paused')return null; return s.actors.find(a => a.id === s.order[s.turn]) ?? null; }
export const isCombatant = a => Boolean(a && a.hp > 0 && !a.escaped && !a.reserve && !a.hanging);
export const isExit = (s, p) => Boolean(p && (p.x === 0 || p.y === 0 || p.x === s.board.width - 1 || p.y === s.board.height - 1));
export const canFlee = (s, a) => s.phase === 'active' && isCombatant(a) && currentActor(s)?.id === a.id && (!s.rules.boardEnabled || isExit(s, a.position));
export function findActor(s, ref) {
    const id = s.actors.find(a => a.id === ref);
    if (id) return id;
    const matches = s.actors.filter(a => a.name.toLocaleLowerCase() === String(ref ?? '').trim().toLocaleLowerCase());
    assert(matches.length === 1, matches.length ? 'Name ist mehrdeutig. Figuren-ID verwenden.' : `Unbekannte Figur: ${text(ref, '', 100)}`);
    return matches[0];
}
function entry(s, type, message, details = {}, english = message) {
    if (['hit', 'miss', 'other', 'stabilize', 'flee', 'use', 'skill'].includes(type)) english = resultText(details, 'en');
    if (type === 'end') english = combatSummary(s, message.includes('Manuell gestoppt'), 'en');
    if (type === 'move') english = `${findActor(s, details.actor).name}: ${details.from === 'nicht platziert' ? 'unplaced' : details.from} → ${details.to === 'nicht platziert' ? 'unplaced' : details.to}.${details.override ? ' GM correction.' : s.phase === 'active' ? ` Movement remaining: ${details.movement.remaining}/${details.movement.total}.` : ''}`;
    if (type === 'condition') english = `${findActor(s, details.actor).name}: ${conditionText(findActor(s, details.actor), 'en')}.`;
    s.log.push({ id: uid(), type, text: s.rules.language === 'en' ? english : message, textDe: message, textEn: english, details, at: new Date().toISOString() });
    s.log = s.log.slice(-300);
}
function commit(original, change) {
    const s = clone(original);
    const result = change(s);
    reconcileEncounter(s,original);
    observeAI(original,s,visibleTo,{clearSight,visionRange});
    s.revision++;
    return { state: s, result };
}
function requireTurn(s, id) {
    assert(s.phase === 'active', 'Kampf zuerst starten.');
    const a = findActor(s, id);
    assert(a.id === currentActor(s)?.id, `Jetzt ist ${currentActor(s)?.name ?? 'niemand'} am Zug.`);
    assert(isCombatant(a), 'Figur mit 0 HP oder nach Flucht kann nicht handeln.');
    return a;
}
function bindingEvent(s,a,ended){if(ended)entry(s,'presence',a.name+': '+(ended.kind==='raise'?'Erhebung beendet; wieder tot.':'Beherrschung beendet; ursprüngliche Seite und Steuerung wiederhergestellt.'),{actor:a.id,binding:ended},a.name+': '+(ended.kind==='raise'?'raising ended; dead again.':'domination ended; original side and control restored.'));}
function settleDeadBinding(s,a){if(a.allegiance&&(a.condition==='dead'||a.allegiance.kind==='raise'&&a.hp===0)){bindingEvent(s,a,endAllegiance(a,'death'));}}
function finishIfDefeated(s) {
    for(const a of s.actors)settleDeadBinding(s,a);
    const live = s.actors.filter(a=>a.hp>0&&!a.escaped);
    const returningOpponent=live.some(a=>a.allegiance?.turns!=null&&((a.side==='enemy')!==(a.allegiance.originalSide==='enemy')));
    if(returningOpponent&&(!live.some(a=>a.side==='enemy')||!live.some(a=>a.side!=='enemy')))return false;
    if (!live.length || (live.some(a => a.side === 'enemy') && !live.some(a => a.side !== 'enemy')) ||
        (!live.some(a => a.side === 'enemy') && s.actors.some(a => a.side === 'enemy'||a.allegiance?.originalSide==='enemy'))) {
        s.phase = 'ended'; entry(s, 'end', combatSummary(s)); return true;
    }
    return false;
}
function effectFormula(value) { const v=String(value).trim(); if(/^\d+$/.test(v)){int(v,0,1000000,'Zustandsschaden');return String(Number(v));}return parseDice(v).formula; }
export function effectSpec(s,spec) { return {...spec,damage:s.rules.effectDamageOverrides?.[spec.type]??spec.damage,turns:s.rules.effectDurationOverrides?.[spec.type]??spec.turns}; }
function tacticValue(s,a,type) { if(!tactic(s,a,type))return 0;return s.rules[{aimed:'aimBonus',supported:'supportBonus',distracted:'distractBonus'}[type]]??2; }
function resolveAmount(s, formula, injected) {
    if (/^\d+$/.test(formula)) return { total: Number(formula), rolls: [] };
    const dice = parseDice(formula), rolls = Array.from({ length: dice.count }, () => die(s, dice.sides, injected));
    return { total: Math.max(0, Math.floor(rolls.reduce((sum, v) => sum + v, 0) + dice.bonus)), rolls };
}
function endEffects(s, a, injected, outside = false) {
    if (!a || !isCombatant(a)) return;
    if(a.hidden&&a.hidden.appliedTurn!==s.turnSerial){a.hidden.turns--;if(!a.hidden.turns){a.hidden=null;entry(s,'conceal',a.name+': Versteck abgelaufen.',{actor:a.id},a.name+': concealment expired.');}}
    tickTactics(s,a,outside);tickShields(s,a,outside);
    try {
    if (!s.rules.effectsEnabled) return;
    for (const effect of [...a.effects]) {
        if (!isCombatant(a)) break; // Pause remaining effects as soon as a tick knocks the actor out.
        if (!outside && effect.appliedTurn === s.turnSerial) continue;
        const formula=effectSpec(s,effect).damage;
        const beforeHp = a.hp, amount = a.hp > 0 ? resolveAmount(s, formula, injected) : { total: 0, rolls: [] };
        const resistance=resistDamage(a,amount.total,periodicDamageType(effect));
        a.hp = Math.max(0, a.hp - resistance.damage);
        if (beforeHp > 0 && a.hp === 0) knockedDown(s, a);
        effect.turns--;
        const label = EFFECTS[effect.type];
        entry(s, 'effect', `${a.name}: ${label.de}, ${beforeHp - a.hp} Schaden (${formula}${resistance.resistancePercent===0?'; immun: 0%':resistance.resistancePercent===50?'; Resistenz 50%':''}), HP ${beforeHp} → ${a.hp}/${a.maxHp}. ${effect.turns ? effect.turns + ' eigene Züge übrig.' : 'Zustand abgelaufen.'}`,
            { actor: a.id, effect: effect.type,...resistance, beforeHp, afterHp: a.hp, damage: beforeHp - a.hp, formula, rolls: amount.rolls, turns: effect.turns },
            `${a.name}: ${label.en}, ${beforeHp - a.hp} damage (${formula}${resistance.resistancePercent===0?'; immune: 0%':resistance.resistancePercent===50?'; resistance 50%':''}), HP ${beforeHp} → ${a.hp}/${a.maxHp}. ${effect.turns ? effect.turns + ' own turns left.' : 'Effect expired.'}`);
    }
    a.effects = a.effects.filter(v => v.turns > 0);
    } finally { bindingEvent(s,a,tickAllegiance(s,a,outside)); }
}
function resetTurn(s) {
    s.turnSerial++;
    s.movement = { turnSerial: s.turnSerial, actorId: '', spent: 0 };
    s.action = { turnSerial: s.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} };
}
function readyActor(s, injected) {
    const a = currentActor(s);
    if (!isCombatant(a)||a.joinRound>s.round||a.turnRound===s.round) return false;
    if(s.rules.reactionsEnabled&&a.reactionTurn!==s.turnSerial){resetReactions(a,s.turnSerial);}
    a.turnRound=s.round;
    if (!hasEffect(s, a, 'stunned')) return true;
    entry(s, 'effect', `${a.name}: Betäubung setzt diesen Zug aus.`, { actor: a.id, skipped: true }, `${a.name}: stunned; this turn is skipped.`);
    endEffects(s, a, injected); resetTurn(s);
    return false;
}
function advance(s, injected) {
    endEffects(s, currentActor(s), injected);
    resetTurn(s);
    if (finishIfDefeated(s)) return;
    seekNext(s, injected);
}
function seekNext(s, injected) {
    if(!s.actors.some(isCombatant)){s.turn=Math.max(0,s.turn);if(!finishIfDefeated(s)){s.phase='paused';s.action={turnSerial:s.turnSerial,actorId:'',used:false,freeSpent:0,bonusSpent:{}};entry(s,'presence','Keine aktive Figur; wieder einsetzen oder Kampf beenden.',{},'No active participant; deploy or end combat.');}return;}
    for (let i = 0; i < s.order.length * 101; i++) {
        s.turn++;
        if (s.turn >= s.order.length) { s.turn = 0; tickConditions(s); s.round++; }
        if (readyActor(s, injected)) return;
        if (finishIfDefeated(s)) return;
    }
    s.phase = 'ended';
    entry(s, 'end', combatSummary(s));
}
export function actionBudget(s, a = currentActor(s)) {
    const budget = poolBudget(s, a);
    return s.rules.multiActionsEnabled ? budget : { used: budget.used, available: budget.available };
}
function endTurnInPlace(s, a, automatic = false, injected) {
    const result = { type: 'endTurn', actor: a.id, actorName: a.name, turn: turnToken(s), round: s.round, actionUsed: poolBudget(s, a).spent > 0, automatic };
    // Keep an eventual combat-end summary after the turn event in chronological order.
    entry(s, 'turn', '', result, '');
    advance(s, injected); result.initiative = turnOverview(s);
    const event = s.log.findLast(e => e.details === result);
    if (event) {
        event.textDe = resultText(result, 'de'); event.textEn = resultText(result, 'en');
        event.text = s.rules.language === 'en' ? event.textEn : event.textDe;
    }
    return result;
}
export function endTurn(s, { actor = currentActor(s)?.id, turn = turnToken(s) } = {}, { roll } = {}) {
    return commit(s, next => {
        assert(turn === turnToken(next), 'Veralteter Zug. Aktuellen Zugtoken verwenden.');
        const a = requireTurn(next, actor);
        return endTurnInPlace(next, a, false, roll);
    });
}
function closeExhaustedTurn(s) {
    const a = currentActor(s);
    if (s.phase === 'active' && !manualUnlimited(s,a) && actionBudget(s, a).used && (!movementOpen(s,a) || movementBudget(s, a).remaining === 0)) endTurnInPlace(s, a, true);
}
export function combatSummary(s, stopped = false, language = 'de') {
    const party = s.actors.some(a => a.side !== 'enemy' && isCombatant(a)), enemies = s.actors.some(a => a.side === 'enemy' && isCombatant(a));
    const outcome = stopped ? 'Manuell gestoppt; der Ausgang ist noch offen.' : party && !enemies ? 'Sieg der Spielergruppe.' : enemies && !party ? 'Die Gegner haben gewonnen.' : !party && !enemies ? 'Keine Figur mehr kampffähig.' : 'Der Kampf ist abgeschlossen.';
    const labels = { player: 'Spieler', ally: 'Verbündeter', enemy: 'Gegner' };
    const group = s.actors.filter(a => a.side !== 'enemy');
    const defeated = !stopped && group.length > 0 && group.every(a => a.hp === 0 && !a.escaped);
    const allDead = defeated && group.every(a => a.condition === 'dead');
    const defeatNote = !defeated ? '' : language === 'en' ? allDead
        ? 'All members of the player party are dead. The player decides how the campaign continues.\n'
        : 'The entire player party is unable to fight. Surviving members are unconscious or stabilized, not dead. Rescue countdowns pause until a rescue round is advanced manually. The player decides rescue, capture or the next scene.\n'
        : allDead ? 'Alle Mitglieder der Spielergruppe sind tot. Der Spieler entscheidet, wie die Kampagne weitergeht.\n'
        : 'Die gesamte Spielergruppe ist kampfunfähig. Überlebende sind bewusstlos oder stabilisiert, nicht tot. Rettungsfristen pausieren bis zum manuellen Fortschalten einer Rettungsrunde. Der Spieler entscheidet über Rettung, Gefangenschaft oder die nächste Szene.\n';
    if (language === 'en') return `Combat ended. ${stopped ? 'Stopped manually; the outcome is still open.' : party && !enemies ? 'The player party won.' : enemies && !party ? 'The enemies won.' : !party && !enemies ? 'No participant is able to fight.' : 'The encounter is complete.'}\n` +
        defeatNote + s.actors.map(a => `${a.name} (${a.side}): ${a.hp}/${a.maxHp} HP — ${conditionText(a, 'en')}.`).join('\n');
    return `Kampf beendet. ${outcome}\n` + defeatNote + s.actors.map(a => `${a.name} (${labels[a.side]}): ${a.hp}/${a.maxHp} HP — ${conditionText(a)}.`).join('\n');
}
export function conditionText(a, language = 'de') {
    if (a.escaped) return language === 'en' ? 'fled; out of combat' : 'geflohen; außerhalb des Kampfes';
    let base = language === 'en' ? a.hp > 0 ? 'still standing' : a.condition === 'dead' ? 'dead' : a.condition === 'unconscious' ? `unconscious, unable to fight; ${a.roundsLeft} rescue rounds left` : 'stabilized, unable to fight'
        : a.hp > 0 ? 'steht noch' : a.condition === 'dead' ? 'tot' : a.condition === 'unconscious' ? `bewusstlos, kampfunfähig; noch ${a.roundsLeft} Rettungsrunden` : 'stabilisiert, kampfunfähig';
    if(allegianceText(a,language))base+=' · '+allegianceText(a,language);
    if(a.reserve)base+=(language==='en'?' · in reserve':' · ausgesetzt');if(a.hidden)base+=(language==='en'?' · hidden':' · versteckt');if(a.hanging)base+=(language==='en'?' · hanging: ':' · hängt am Abgrund: ')+a.hanging.turns;
    return base + ((a.effects ?? []).length ? ' · ' + effectsText(a, language) : '');
}
function knockedDown(s, a) {
    if(a.allegiance?.kind==='raise'){a.hp=0;a.condition='dead';bindingEvent(s,a,endAllegiance(a,'death'));return;}
    const rounds = a.deathRounds ?? s.rules.deathRounds ?? 3;
    a.condition = rounds === 0 ? 'dead' : 'unconscious'; a.roundsLeft = rounds || null;
    a.downedRound = rounds ? s.round : null;
    settleDeadBinding(s,a);
}
function tickConditions(s, fullRound = false) {
    for(const a of s.actors)if(a.hanging&&!a.reserve&&(fullRound||a.hanging.round<s.round)){a.hanging.turns--;if(a.hanging.turns<=0){a.hanging=null;a.hp=0;a.condition='dead';a.roundsLeft=null;a.downedRound=null;}entry(s,'condition',a.name+': '+(a.hanging?'Abgrundfrist '+a.hanging.turns:'Absturz; tot')+'.',{actor:a.id},a.name+': '+(a.hanging?'pit rescue rounds '+a.hanging.turns:'fell; dead')+'.');}
    for (const a of s.actors) if (!a.reserve&&a.hp === 0 && a.condition === 'unconscious' && (fullRound || a.downedRound < s.round)) {
        a.roundsLeft--;
        if (a.roundsLeft <= 0) { a.condition = 'dead'; a.roundsLeft = null; a.downedRound = null; }
        entry(s, 'condition', `${a.name}: ${conditionText(a)}.`, { actor: a.id, condition: a.condition, roundsLeft: a.roundsLeft });
    }
}
export function elapseRound(s, { roll } = {}) {
    return commit(s, next => {
        assert(next.phase!=='active', 'Im Kampf läuft der Countdown über die Initiative.');
        assert(next.actors.some(a => a.condition === 'unconscious' || a.hanging || a.allegiance?.turns!=null || next.rules.effectsEnabled && isCombatant(a) && a.effects.length), 'Keine bewusstlose Figur oder laufenden Statuseffekte.');
        for (const a of next.actors) endEffects(next, a, roll, true);
        tickConditions(next, true); next.round++; next.turnSerial++;
        entry(next, 'time', 'Eine volle Rettungsrunde ist vergangen.\n' + next.actors.filter(a => a.hp === 0||a.allegiance).map(a => `${a.name}: ${conditionText(a)}.`).join('\n'), {}, 'One full rescue round has passed.\n' + next.actors.filter(a => a.hp === 0||a.allegiance).map(a => `${a.name}: ${conditionText(a, 'en')}.`).join('\n'));
    });
}
export function addActor(s, input) {
    return commit(s, next => {
        const defaults = next.rules.sideDefaults?.[input.side ?? 'enemy'] ?? {};
        const a = actorFrom({ ...next.rules.budgetDefaults?.[input.side ?? 'enemy'], ...defaults, ...input }, false, next.rules.statMode, next.rules.deathRounds);
        if (next.rules.constitutionHp) applyActorHp(next, a);
        if (a.condition === 'unconscious') a.downedRound = next.round;
        if (a.position) checkCell(next, a.position);
        if (a.position) assert(!next.actors.some(b => distance(a.position, b.position) === 0), 'Feld ist bereits belegt.');
        next.actors.push(a);
        if(['active','paused'].includes(next.phase)){a.reserve=Boolean(next.rules.boardEnabled&&!a.position);next.order.push(a.id);if(!a.reserve)joinInPlace(next,a,{});}
        entry(next, 'edit', `${a.name} hinzugefügt.`, { id: a.id }, `${a.name} added.`);
        return a;
    });
}
export function editActor(s, id, input) {
    return commit(s, next => {
        const old = findActor(next, id);
        if (own(input, 'damageBonus') && !own(input, 'weapons')) input = { ...input, weapons: Object.fromEntries(['melee', 'ranged'].map(mode => [mode, weaponFor(old, mode) ? { ...weaponFor(old, mode), damageBonus: input.damageBonus, ...(own(input, 'damage') && mode === (input.attackMode ?? old.attackMode) ? { damage: input.damage } : {}) } : null])) };
        if (own(input, 'damage') && !own(input, 'weapons')) input = { ...input, weapons: { ...old.weapons, [input.attackMode ?? old.attackMode]: { ...(weaponFor(old, input.attackMode ?? old.attackMode) ?? {}), damage: input.damage } } };
        if (own(input, 'maxHp') && Number(input.maxHp) !== old.maxHp && !own(input, 'baseHp')) input = { ...input, baseHp: Math.max(1, Number(input.maxHp) - old.constitutionHpBonus) };
        const a = actorFrom({ ...old, ...input, weaponList: legacyWeaponsPatch(old, input), id: old.id, stats: { ...old.stats, ...input.stats },
            ...(Number(input.hp) === 0 && old.hp > 0 && !own(input,'condition') ? { condition: 'stabilized', roundsLeft: null } : {}) }, true, next.rules.statMode, next.rules.deathRounds);
        if(input.clearImmuneStatuses===true)clearStatuses(a,a.conditionImmunities);
        const blockedStatuses=[];for(const key of ['effects','tactics'])if(own(input,key)){a[key]=a[key].filter(v=>{const blocked=isImmune(a,v.type)&&!old[key].some(e=>e.type===v.type);if(blocked)blockedStatuses.push(v.type);return !blocked;});}
        if (input.applyConstitutionHp === true) applyActorHp(next, a);
        if (old.hp > 0 && a.hp === 0 && !own(input, 'condition')) knockedDown(next, a);
        if (a.condition === 'unconscious' && old.condition !== 'unconscious') a.downedRound = next.round;
        if (a.position) checkCell(next, a.position);
        if (a.position) assert(!next.actors.some(b => b.id !== id && distance(a.position, b.position) === 0), 'Feld ist bereits belegt.');
        if (own(input, 'tactics') && next.phase === 'active') for (const t of a.tactics) {const prior=old.tactics.find(v=>v.type===t.type);if(!prior||['turns','source','weapon','amount','policy'].some(k=>prior[k]!==t[k]))t.appliedTurn=next.turnSerial;}
        if (own(input, 'effects') && next.phase === 'active') for (const effect of a.effects) { const previous = old.effects.find(v => v.type === effect.type&&periodicDamageType(v)===periodicDamageType(effect)); if (!previous || previous.turns !== effect.turns || previous.damage !== effect.damage) effect.appliedTurn = next.turnSerial; }
        settleDeadBinding(next,a);
        next.actors[next.actors.findIndex(b => b.id === id)] = a;
        entry(next, 'edit', `${a.name}: Werte bearbeitet.`+(blockedStatuses.length?' Immunität verhindert: '+blockedStatuses.map(k=>STATUS_TYPES[k].de).join(', ')+'.':''), { id,blockedStatuses }, `${a.name}: profile updated.`+(blockedStatuses.length?' Immunity blocked: '+blockedStatuses.join(', ')+'.':''));
        if (next.phase === 'active' && !isCombatant(currentActor(next))) advance(next);
        else if (next.phase === 'active' && finishIfDefeated(next)) { next.turnSerial++; next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} }; }
        else closeExhaustedTurn(next);
        return a;
    });
}
export function removeActor(s, id) {
    return commit(s, next => {
        const a = findActor(next, id);
        const currentId = currentActor(next)?.id;
        const oldIndex = next.order.indexOf(id);
        next.actors = next.actors.filter(b => b.id !== a.id);
        if (next.movement?.actorId === a.id) next.movement = { turnSerial: next.turnSerial, actorId: '', spent: 0 };
        next.order = next.order.filter(x => x !== a.id);
        if (currentId === id && next.phase === 'active') {
            next.turn = Math.max(-1, oldIndex - 1);resetTurn(next);if(next.order.length)seekNext(next);else next.phase='setup';
        } else next.turn = Math.max(0, next.order.indexOf(currentId));
        if (!next.actors.length) { next.phase = 'setup'; next.turn = 0; }
        if (next.action.actorId === id) next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} };
        if (next.phase === 'active' && finishIfDefeated(next)) { next.turnSerial++; next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} }; }
        entry(next, 'edit', `${a.name} entfernt.`, {}, `${a.name} removed.`);
    });
}
function seededWord(seed, index) {
    // Counter-based PRNG; serializable cursor makes seeded sessions reproducible.
    let h = 2166136261;
    for (const c of `${seed}:${index}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
}
function die(s, sides, injected) {
    if (injected) { const v = int(injected(sides), 1, sides, 'Testwürfel'); s.rng.cursor++; return v; }
    const limit = Math.floor(4294967296 / sides) * sides;
    let word;
    do {
        if (s.rules.rngMode === 'seeded') word = seededWord(s.rules.seed, s.rng.cursor++);
        else { word = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; s.rng.cursor++; }
    } while (word >= limit); // Avoid modulo bias.
    return word % sides + 1;
}
export function freeRoll(s,sides,{roll}={}) {
    assert([4,6,8,10,12,20,100].includes(sides),'Freier Würfel: W4, W6, W8, W10, W12, W20 oder W100 wählen.');
    return commit(s,next=>{const value=die(next,sides,roll),result={type:'free-roll',sides,value};entry(next,'free-roll',`Freier Wurf: W${sides} → ${value}. Keine Regelwirkung.`,result,`Free roll: d${sides} → ${value}. No mechanical effect.`);next.log.at(-1).chatRelevant=false;return result;});
}
export function startCombat(s, rollInitiative = false, injected, options={}) {
    return commit(s, next => {
        assert(!['active','paused'].includes(next.phase), 'Kampf läuft bereits.');
        assert(next.actors.filter(a=>a.hp>0&&!a.escaped).length >= 2, 'Mindestens zwei kampffähige Figuren erforderlich.');
        assert(next.actors.some(a=>isCombatant(a)&&(!next.rules.boardEnabled||a.position)),'Mindestens eine Figur auf dem Spielfeld platzieren.');
        const missing = next.actors.filter(a => isCombatant(a) && !a.position);
        assert(!next.rules.boardEnabled || !missing.length || options.allowUnplaced===true, `Vor dem Kampfstart alle kampffähigen Figuren platzieren: ${missing.map(a => a.name).join(', ')}.`);
        if(next.rules.boardEnabled&&options.allowUnplaced){for(const a of missing)a.reserve=true;assert(next.actors.some(a=>isCombatant(a)&&a.position),'Mindestens eine Figur auf dem Spielfeld platzieren.');}
        for(const a of next.actors){a.turnRound=-1;a.joinRound=0;a.unlimitedTurn=-1;if(isCombatant(a)){if(rollInitiative)a.initiative=die(next,20,injected)+statBonus(next,a,'dexterity');a.initiativeReady=true;}}
        next.order = next.actors.map((a, index) => ({ a, index }))
            .sort((a, b) => b.a.initiative - a.a.initiative || a.index - b.index).map(v => v.a.id);
        next.turn = next.order.findIndex(id => isCombatant(next.actors.find(a => a.id === id)));
        next.round = 1; next.turnSerial++; next.phase = 'active';
        for (const a of next.actors) if (a.condition === 'unconscious') a.downedRound = 0;
        next.movement = { turnSerial: next.turnSerial, actorId: '', spent: 0 };
        next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} };
        entry(next, 'start', `Kampf gestartet. Initiative: ${next.order.map(id => findActor(next, id).name).join(' → ')}.\n${initiativeText(turnOverview(next), 'de')}`, {}, `Combat started. Initiative: ${next.order.map(id => findActor(next, id).name).join(' → ')}.\n${initiativeText(turnOverview(next), 'en')}`);
        const started = next.log.at(-1);
        if (!readyActor(next, injected) && !finishIfDefeated(next)) seekNext(next, injected);
        started.textDe = started.textDe.split('\n')[0] + '\n' + initiativeText(turnOverview(next), 'de');
        started.textEn = started.textEn.split('\n')[0] + '\n' + initiativeText(turnOverview(next), 'en');
        started.text = next.rules.language === 'en' ? started.textEn : started.textDe;
    });
}
export function setOrder(s, order) {
    return commit(s, next => {
        assert(order.length === next.actors.length && new Set(order).size === order.length &&
            order.every(id => next.actors.some(a => a.id === id)), 'Jede Figur muss genau einmal in der Initiative stehen.');
        const activeId = currentActor(next)?.id;
        next.order = [...order]; next.turn = Math.max(0, order.indexOf(activeId));
        entry(next, 'edit', `Initiativeordnung manuell bearbeitet.\n${initiativeText(turnOverview(next), 'de')}`, {}, `Initiative order updated manually.\n${initiativeText(turnOverview(next), 'en')}`);
    });
}
export function stopCombat(s) { return commit(s, next => { next.phase = 'setup'; next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} }; entry(next, 'end', combatSummary(next, true)); }); }
function applyActorHp(s, a) {
    a.baseHp ??= Math.max(1, a.maxHp - (a.constitutionHpBonus ?? 0));
    const bonus = s.rules.constitutionHp ? Math.floor(2 * statBonus(s, a, 'constitution')) : 0;
    const maxHp = Math.min(1000000, Math.max(1, a.baseHp + bonus));
    // Preserve damage already taken, never revive a downed participant or knock out a living one.
    a.hp = a.hp === 0 ? 0 : Math.min(maxHp, Math.max(1, a.hp + maxHp - a.maxHp));
    a.maxHp = maxHp; a.constitutionHpBonus = bonus;
}
export function setRules(s, patch, applyHp = false) {
    return commit(s, next => {
        const rules = rulesFrom({ ...next.rules, ...patch });
        if (rules.statMode !== next.rules.statMode) {
            for (const a of next.actors) a.stats = convertStats(a.stats, next.rules.statMode, rules.statMode);
        }
        next.rules = rules;
        for(const a of next.actors)for(const t of a.tactics??[])if(['aimed','supported','distracted'].includes(t.type))t.amount=rules[{aimed:'aimBonus',supported:'supportBonus',distracted:'distractBonus'}[t.type]];
        if (applyHp) for (const a of next.actors) applyActorHp(next, a);
        for (const a of next.actors) if (a.position) checkCell(next, a.position);
        entry(next, 'edit', 'Kampfregeln bearbeitet.', {}, 'Combat rules updated.');
        if (applyHp) entry(next, 'edit', 'HP-Regel ausdrücklich übernommen: Basis-HP + zweimal Constitution-Modifikator (aus: nur Basis-HP). Bewusstlose Figuren bleiben bei 0 HP.', {}, 'HP rule explicitly applied: base HP + twice the Constitution modifier (off: base HP only). Downed participants remain at 0 HP.');
        closeExhaustedTurn(next);
    });
}
export function setGroupControls(s, groups) {
    return commit(s, next => {
        assert(groups && typeof groups === 'object' && !Array.isArray(groups) && Object.keys(groups).length > 0, 'Gruppensteuerung muss ein Objekt sein.');
        const defaults = groupDefaultsFrom({ ...next.rules.sideDefaults, ...groups });
        next.rules.sideDefaults = defaults;
        let changed = 0;
        for (const a of next.actors) if (own(groups, a.side)) { Object.assign(a, defaults[a.side]); changed++; }
        entry(next, 'edit', `Gruppensteuerung übernommen: ${changed} Figuren. Neue Figuren verwenden diese Vorgaben.`, {}, `Group controls applied: ${changed} participants. New participants use these defaults.`);
    });
}
export function convertStats(stats, from, to) {
    if (from === to) return clone(stats);
    return Object.fromEntries(Object.keys(STATS).map(k => {
        if (to === 'bonuses') return [k, modifier(stats[k])];
        const value = Math.max(1, 10 + 2 * stats[k]);
        assert(Number.isInteger(stats[k]), 'Dezimale Attributboni können nicht verlustfrei in D&D-Werte umgewandelt werden.');
        assert(value <= 40 && modifier(value) === stats[k], 'Direkte Boni außerhalb −5 bis +15 können nicht in D&D-Werte umgewandelt werden.');
        return [k, value];
    }));
}
export function moveActor(s, id, position, editMode = false, joinOptions={}) {
    return commit(s, next => {
        const found = findActor(next, id);
        assert(!found.escaped, 'Geflohene Figur zuerst zurückholen.');
        // Initial placement is allowed even for participants added during a fight.
        const deployment = !found.position;
        const a = editMode || next.phase !== 'active' || deployment ? found : requireTurn(next, id);
        const pos = position == null ? null : { x: int(position.x, 0, 49, 'Spalte'), y: int(position.y, 0, 49, 'Zeile') };
        assert(editMode || next.phase !== 'active' || pos, 'Im Zug kann die Figur nicht vom Feld entfernt werden.');
        if (pos) {
            assert(!(a.condition==='dead'&&next.rules.autoRemoveDead),'Tot – bei aktiver Leichen-Regel nicht platzierbar. Erst wiederbeleben oder erheben.');
            checkCell(next, pos);
            assert(!next.actors.some(b => b.id !== a.id && distance(pos, b.position) === 0), 'Feld ist bereits belegt.');
            if (!editMode && next.phase === 'active' && a.position) {
                const cost = pathDistances(next, a.position, a.id,Infinity,p=>aiTerritory(a,p)).get(`${pos.x},${pos.y}`);
                assert(cost !== undefined, 'Kein freier Weg zum Zielfeld. Spieler muss eingreifen.');
                const budget = movementBudget(next, a);
                assert(cost <= budget.remaining, `Bewegung zu weit: ${cost} Bewegungspunkte erforderlich, noch ${budget.remaining} von ${budget.total} verfügbar.`);
                next.movement = { turnSerial: next.turnSerial, actorId: a.id, spent: budget.spent + cost };
            }
        }
        const from = coordinate(a.position);if(!pos&&a.position){a.lastPosition=clone(a.position);a.lastHeight=heightAt(next,a.position);}
        a.position = pos;if(pos&&deployment)a.reserve=false;if(pos&&a.aiConfig.homeMode==='deployment'&&(!['active','paused'].includes(next.phase)||deployment))a.aiConfig.home={...pos};
        if(deployment&&pos&&['active','paused'].includes(next.phase))joinInPlace(next,a,joinOptions);
        const budget = movementBudget(next, a);
        entry(next, 'move', `${a.name}: ${from} → ${coordinate(pos)}.${editMode ? ' Spielleiter-Korrektur.' : next.phase === 'active' && !deployment ? ` Bewegung: ${budget.remaining}/${budget.total} Bewegungspunkte übrig.` : ''}`,
            { actor: a.id, from, to: coordinate(pos), override: editMode, movement: budget });
        closeExhaustedTurn(next);
    });
}
function boardFrom(raw = {}) {
    const width = int(raw.width ?? 10, 2, 50, 'Spielfeldbreite');
    const height = int(raw.height ?? 10, 2, 50, 'Spielfeldhöhe');
    assert(raw.blocked === undefined || Array.isArray(raw.blocked), 'Gesperrte Felder müssen eine Liste sein.');
    const blocked = (raw.blocked ?? []).map(p => ({ x: int(p.x, 0, width - 1, 'Hindernisspalte'), y: int(p.y, 0, height - 1, 'Hinderniszeile') }));
    assert(new Set(blocked.map(p => `${p.x},${p.y}`)).size === blocked.length, 'Doppelte Hindernisfelder.');
    assert(raw.cover === undefined || Array.isArray(raw.cover), 'Deckung muss eine Liste sein.');
    const cover = (raw.cover ?? []).map(p => ({ x: int(p.x, 0, width - 1, 'Deckungsspalte'), y: int(p.y, 0, height - 1, 'Deckungszeile') }));
    assert(new Set(cover.map(p => `${p.x},${p.y}`)).size === cover.length, 'Doppelte Deckungsfelder.');
    assert(!cover.some(p => blocked.some(q => distance(p, q) === 0)), 'Ein Feld kann nicht gleichzeitig Mauer und Deckung sein.');
    return { width, height, blocked, cover, ...terrainFrom({ ...raw, blocked, cover }, width, height), cliffForm:pick(raw.cliffForm??'random',['random','coast','bridge','hole','edge-hole','island','headland'],'Klippenform'),cliffScenery:pick(raw.cliffScenery??'open',['open','scattered'],'Klippenhindernisse'),roomScale:pick(raw.roomScale??'mixed',['mixed','large'],'Raumgröße'),forestStyle:pick(raw.forestStyle??'groves',['light','groves','dense','path'],'Waldaufteilung'),preset: pick(raw.preset ?? 'custom', ['custom', 'open', 'forest', 'city', 'indoor', 'castle', 'dungeon','cliff'], 'Kartentyp'), mapSeed: text(raw.mapSeed, '', 200), background: backgroundFrom(raw.background), appearance:appearanceFrom(raw.appearance) };
}
export function isBlocked(s, pos) { return s.board.blocked.some(p => p.x === pos.x && p.y === pos.y); }
export function isCover(s, pos) { return (s.board.cover ?? []).some(p => p.x === pos.x && p.y === pos.y); }
export function returnActor(s, id) {
    return commit(s, next => {
        const a = findActor(next, id);
        assert(a.escaped, 'Diese Figur ist nicht geflohen.');
        a.escaped = false; a.position = null;if(['active','paused'].includes(next.phase)&&next.rules.boardEnabled)a.reserve=true;
        entry(next, 'edit', `${a.name} zurückgeholt. Vor dem nächsten Einsatz platzieren.`, {}, `${a.name} returned. Place the participant before their next turn.`);
    });
}
function checkCell(s, pos) {
    assert(pos.x >= 0 && pos.y >= 0 && pos.x < s.board.width && pos.y < s.board.height, 'Position außerhalb des Spielfelds. Figur zuerst vom Feld nehmen oder Feld vergrößern.');
    assert(!isBlocked(s, pos), 'Dieses Feld ist gesperrt.');
    assert(!isPit(s,pos),'Abgrundfeld ist nicht betretbar.');
    assert(s.rules.coverWalkable || !isCover(s, pos), 'Deckung ist nicht betretbar. Figur zuerst auf ein freies Feld setzen oder betretbare Deckung aktivieren.');
}
function diagonalClear(s, a, b) {
    return a.x === b.x || a.y === b.y || (!isBlocked(s, { x: a.x, y: b.y }) && !isBlocked(s, { x: b.x, y: a.y }));
}
export const heightAt = terrainHeight;
export function adjacentAccess(s, a, b) { return Boolean(a && b && distance(a, b) === 1 && diagonalClear(s, a, b) && heightTransition(s, a, b)); }
export function canStep(s, a, b) {
    const cornerBlocked = p => isBlocked(s, p) || (!s.rules.coverWalkable && isCover(s, p));
    return distance(a, b) === 1 && heightTransition(s, a, b) && heightCorner(s, a, b) && !isBlocked(s, b) && !isPit(s,b) && (s.rules.coverWalkable || s.rules.coverCrossable || !isCover(s, b)) && (a.x === b.x || a.y === b.y || (!cornerBlocked({ x: a.x, y: b.y }) && !cornerBlocked({ x: b.x, y: a.y })));
}
export const stepCost = (s, from, to, actorId = currentActor(s)?.id) => (heightAt(s, from) !== heightAt(s, to) ? s.rules.climbCost : 1) + (!s.rules.coverWalkable && isCover(s, to) && !s.actors.some(a=>a.id===actorId&&a.acrobaticsTurn===s.turnSerial&&s.rules.skillsEnabled) ? 1 : 0);
export const canOccupy = (s, p) => Boolean(p && p.x >= 0 && p.y >= 0 && p.x < s.board.width && p.y < s.board.height && !isBlocked(s, p) && !isPit(s,p) && (s.rules.coverWalkable || !isCover(s, p)));
function searchPaths(s, from, actorId, maxDistance, coverLimit = Infinity, allowed = null) {
    const costs = new Map(), parents = new Map(), nodes = new Map(), best = new Map();
    if (!from) return { costs, pathTo: () => [] };
    const mover=s.actors.find(a=>a.id===actorId);
    const occupied = new Set(s.actors.filter(a => a.id !== actorId && a.position && isCombatant(a)&&!(s.rules.passAllies&&mover&&(mover.side==='enemy')===(a.side==='enemy'))).map(a => `${a.position.x},${a.position.y}`));
    const walls = new Set([...s.board.blocked,...(s.board.pits??[])].map(p => `${p.x},${p.y}`)), cover = new Set((s.board.cover ?? []).map(p => `${p.x},${p.y}`));
    const high=new Set(s.rules.boardEnabled&&s.rules.heightsEnabled?(s.board.heights??[]).map(p=>p.x+','+p.y):[]);
    const edgeKey=(a,b)=>[a.x+','+a.y,b.x+','+b.y].sort().join('|');
    const ladders=new Set((s.board.ladders??[]).map(l=>edgeKey(l.from,l.to)));
    const height=p=>Number(high.has(p.x+','+p.y));
    const ladder=(a,b)=>ladders.has(edgeKey(a,b));
    const transition=(a,b)=>height(a)===height(b)||ladder(a,b);
    const corner=(a,b)=>a.x===b.x||a.y===b.y||ladder(a,b)||height(a)===height({x:a.x,y:b.y})&&height(a)===height({x:b.x,y:a.y});
    const acrobatics=s.rules.skillsEnabled&&s.actors.some(a=>a.id===actorId&&a.acrobaticsTurn===s.turnSerial);
    const cornerBlocked = p => walls.has(`${p.x},${p.y}`) || (!s.rules.coverWalkable && cover.has(`${p.x},${p.y}`));
    const labels = new Map();
    const constrained = Number.isFinite(coverLimit) && !s.rules.coverWalkable;
    const key = (p, run) => `${p.x},${p.y}:${run}`;
    const start = { p: from, run: 0, cost: 0, key: key(from, 0) };
    const distances = new Map([[start.key, 0]]), buckets = [[start]]; let queued = 1;
    costs.set(`${from.x},${from.y}`, 0); best.set(`${from.x},${from.y}`, start.key); nodes.set(start.key, start);
    // Integer-cost Dijkstra. With a per-turn cover limit, a transit state records
    // its current run across cover so a whole crossing plus landing fits one turn.
    for (let cost = 0; queued; cost++) for (const node of buckets[cost] ?? []) {
        queued--;
        if (distances.get(node.key) !== cost || cost >= maxDistance) continue;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            const p = { x: node.p.x + dx, y: node.p.y + dy }, cell = `${p.x},${p.y}`;
            if (allowed&&!allowed(p) || p.x < 0 || p.y < 0 || p.x >= s.board.width || p.y >= s.board.height || occupied.has(cell) || walls.has(cell) || !transition(node.p, p) || !corner(node.p, p) || (!s.rules.coverWalkable && !s.rules.coverCrossable && cover.has(cell)) || (dx && dy && (cornerBlocked({ x: node.p.x, y: p.y }) || cornerBlocked({ x: p.x, y: node.p.y })))) continue;
            const step = (height(node.p)!==height(p)?s.rules.climbCost:1)+(!s.rules.coverWalkable&&cover.has(cell)&&!acrobatics?1:0), nextCost = cost + step;
            const run = constrained && cover.has(cell) ? node.run + step : 0;
            if (constrained && (run ? run + 1 > coverLimit : node.run && node.run + step > coverLimit)) continue;
            const stateKey = key(p, run);
            if (nextCost > maxDistance || (distances.get(stateKey) ?? Infinity) <= nextCost) continue;
            if (run) {
                const prior = labels.get(cell) ?? [];
                if (prior.some(label => label.run <= run && label.cost <= nextCost)) continue;
                const remaining = prior.filter(label => {
                    if (run <= label.run && nextCost <= label.cost) { distances.delete(label.key); return false; }
                    return true;
                });
                remaining.push({ run, cost: nextCost, key: stateKey }); labels.set(cell, remaining);
            }
            const next = { p, run, cost: nextCost, key: stateKey };
            distances.set(stateKey, nextCost); parents.set(stateKey, node.key); nodes.set(stateKey, next);
            if ((costs.get(cell) ?? Infinity) > nextCost) { costs.set(cell, nextCost); best.set(cell, stateKey); }
            (buckets[nextCost] ??= []).push(next); queued++;
        }
    }
    return { costs, pathTo(destination) {
        let nodeKey = best.get(`${destination.x},${destination.y}`); const path = [];
        while (nodeKey) { path.unshift(nodes.get(nodeKey).p); nodeKey = parents.get(nodeKey); }
        return path;
    } };
}
export function pathDistances(s, from, actorId, maxDistance = Infinity, allowed = null) {
    // Cover may be a transit node. It is never a legal destination unless the
    // compatibility rule permits standing there; use canOccupy for destinations.
    return searchPaths(s, from, actorId, maxDistance, Infinity, allowed).costs;
}
export function movementPaths(s, from, actorId, coverLimit, allowed = null) {
    return searchPaths(s, from, actorId, Infinity, coverLimit, allowed);
}

export function reachable(s, from, to, actorId) { return canOccupy(s, to) && !s.actors.some(a=>a.id!==actorId&&a.position&&distance(a.position,to)===0) && pathDistances(s, from, actorId).has(`${to.x},${to.y}`); }
export function movementBudget(s, a) {
    if(!a)return {total:0,spent:0,remaining:0};
    let total = Math.max(1, (s.rules.movementBase ?? 3) + (s.rules.movementStat === 'none' ? 0 : statBonus(s, a, s.rules.movementStat ?? 'dexterity')) + (a.movementBonus ?? 0));
    if (hasEffect(s, a, 'slowed')) total = Math.max(1, Math.floor(total * (s.rules.slowedPercent??50) / 100));
    total = Math.floor(total);
    if (a.sprintTurn === s.turnSerial && s.rules.skillsEnabled) total *= 2;
    if (hasEffect(s, a, 'stunned') || tactic(s,a,'rooted')) total = 0;
    const spent = s.movement?.turnSerial === s.turnSerial && s.movement.actorId === a.id ? s.movement.spent : 0;
    return { total, spent, remaining: !movementOpen(s,a) && s.rules.multiActionsEnabled && poolBudget(s, a).spent > 0 ? 0 : Math.max(0, total - spent) };
}
export function clearSight(s, a, b) {
    // Walk every crossed cell; exact diagonal corners require both adjacent cells to be free.
    let x = a.x, y = a.y;
    const dx = b.x - a.x, dy = b.y - a.y;
    const nx = Math.abs(dx), ny = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
    let ix = 0, iy = 0;
    while (ix < nx || iy < ny) {
        const old = { x, y };
        const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
        if (decision === 0) { x += sx; y += sy; ix++; iy++; }
        else if (decision < 0) { x += sx; ix++; }
        else { y += sy; iy++; }
        if (isBlocked(s, { x, y }) || !diagonalClear(s, old, { x, y })) return false;
    }
    return true;
}
function legacyCoverOnRay(s, a, b) {
    if (!a || !b) return false;
    if (shields(s, b, a, b)) return true;
    let x = a.x, y = a.y, ix = 0, iy = 0;
    const nx = Math.abs(b.x - a.x), ny = Math.abs(b.y - a.y), sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
    while (ix < nx || iy < ny) {
        const d = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
        if (d === 0) { if (shields(s, { x: x + sx, y }, a, b) || shields(s, { x, y: y + sy }, a, b)) return true; x += sx; y += sy; ix++; iy++; }
        else if (d < 0) { x += sx; ix++; } else { y += sy; iy++; }
        if (shields(s, { x, y }, a, b)) return true;
    }
    return false;
}

export function rayCells(a,b){if(!a||!b)return [];const cells=[];let x=a.x,y=a.y,ix=0,iy=0;const nx=Math.abs(b.x-a.x),ny=Math.abs(b.y-a.y),sx=Math.sign(b.x-a.x),sy=Math.sign(b.y-a.y);while(ix<nx||iy<ny){const d=(1+2*ix)*ny-(1+2*iy)*nx;if(d===0){cells.push({x:x+sx,y},{x,y:y+sy});x+=sx;y+=sy;ix++;iy++;}else if(d<0){x+=sx;ix++;}else{y+=sy;iy++;}cells.push({x,y});}return cells;}
export function coverDamagePercent(s,from,to){if(!from||!to)return 100;if(!s.rules.coverDistanceEnabled)return legacyCoverOnRay(s,from,to)?s.rules.coverPercent:100;const cells=rayCells(from,to);let percent=100;for(const p of cells)if(shields(s,p,from,to)){const d=distance(p,to);percent=Math.min(percent,d<=1?s.rules.coverPercent:d<=2?s.rules.coverFarPercent:100);}return percent;}
export function coverOnRay(s,a,b){return coverDamagePercent(s,a,b)<100;}
export function shotObstacles(s,a,b,from=a.position){if(!s.rules.shotRiskEnabled||!s.rules.boardEnabled||!from||!b.position)return [];const cells=rayCells(from,b.position);return s.actors.filter(v=>v.id!==a.id&&v.id!==b.id&&isCombatant(v)&&v.position&&cells.some(p=>distance(p,v.position)===0)).sort((x,y)=>distance(from,x.position)-distance(from,y.position)||s.actors.indexOf(x)-s.actors.indexOf(y));}
export function patrolDestination(s,a){if(!s.rules.boardEnabled||!a.position)return null;const paths=pathDistances(s,a.position,a.id,movementBudget(s,a).remaining),cells=[...paths].filter(([key,cost])=>cost>0&&!s.actors.some(v=>v.id!==a.id&&v.position&&coordinate(v.position)===coordinate({x:Number(key.split(',')[0]),y:Number(key.split(',')[1])}))).map(([key])=>({x:Number(key.split(',')[0]),y:Number(key.split(',')[1])})).filter(p=>canOccupy(s,p));return cells.length?cells[seededWord(s.rules.seed+':patrol:'+a.id,s.turnSerial)%cells.length]:null;}
export function rescueDestinations(s,a,b,from=a?.position){
    if(!(isCombatant(a)&&b?.hanging&&a.id!==b.id&&from&&distance(from,b.hanging.anchor)===1&&diagonalClear(s,from,b.hanging.anchor)&&heightAt(s,from)===b.lastHeight))return [];
    const cells=[];for(let y=b.hanging.anchor.y-1;y<=b.hanging.anchor.y+1;y++)for(let x=b.hanging.anchor.x-1;x<=b.hanging.anchor.x+1;x++){const p={x,y};if(canOccupy(s,p)&&distance(p,from)>0&&heightAt(s,p)===b.lastHeight&&diagonalClear(s,b.hanging.anchor,p)&&heightTransition(s,b.hanging.anchor,p)&&!s.actors.some(v=>v.id!==a.id&&v.position&&distance(v.position,p)===0))cells.push(p);}return cells;
}
export function canRescue(s,a,b,from=a?.position){return rescueDestinations(s,a,b,from).length>0;}
function parsePosition(value){const m=/^([A-Z]+)([0-9]+)$/.exec(value??'');if(!m)return null;let x=0;for(const c of m[1])x=x*26+c.charCodeAt(0)-64;return {x:x-1,y:Number(m[2])-1};}
export function canAttack(s, a, b, mode = a.attackMode, from = a.position, variant = 'profile', weaponId = null, context = null) {
    if (!visibleTo(s,a,b,from)||!weaponFor(a, mode, variant, weaponId) || !isCombatant(a) || !isCombatant(b) || a.id === b.id || (a.side === 'enemy') === (b.side === 'enemy')) return false;
    if (hasEffect(s, a, 'stunned')||protection(s,a).attackLock) return false;
    const w = weaponFor(a, mode, variant, weaponId);
    if (tactic(s,a,'disarmed')?.weapon === w.id) return false;
    if(!canPay(s,a,w))return false;
    if(s.rules.boardEnabled){if(!from||!b.position)return false;const d=distance(from,b.position);if(!(mode==='melee'?adjacentAccess(s,from,b.position):d<=effectiveRange(s,a,w)&&clearSight(s,from,b.position)))return false;}else if(w.radius>0)return false;
    if(reactionPending(s,a,from,context))return false;
    const provoked = tactic(s,a,'provoked'), required = provoked && s.actors.find(v=>v.id===provoked.source);
    if(required&&required.id!==b.id){
        const unchallenged={...a,tactics:a.tactics.filter(t=>t.type!=='provoked')},projected={...s,actors:s.actors.map(v=>v.id===a.id?unchallenged:v)},nextContext=planningContext(projected,unchallenged,context?.state===s&&context.actor===a?context.paths:null);
        // The firing cell already passed fear above. Removing provocation does
        // not change fear, so the recursive target-priority check need not
        // repeat its projected movement/path search for the same cell.
        nextContext.fear.set(from?from.x+','+from.y:'none',false);
        if(canAttack(projected,unchallenged,required,mode,from,variant,weaponId,nextContext))return false;
    }
    
    return true;
}
export function coverDestination(s, a = currentActor(s)) {
    if (!s.rules.boardEnabled || !a?.position || !isCombatant(a)) return null;
    const budget = movementBudget(s, a), paths = pathDistances(s, a.position, a.id, budget.remaining), enemies = s.actors.filter(b => isCombatant(b) && b.position && visibleTo(s,a,b) && (a.side === 'enemy') !== (b.side === 'enemy'));
    const occupied = new Set(s.actors.filter(b => b.id !== a.id && b.position).map(b => coordinate(b.position))), options = [];
    for (const [k, cost] of paths) {
        const [x, y] = k.split(',').map(Number), p = { x, y };
        if (!canOccupy(s, p) || occupied.has(coordinate(p))) continue;
        const protection = enemies.filter(b => !clearSight(s, b.position, p) || coverOnRay(s, b.position, p)).length;
        if (protection) options.push({ position: p, cost, protection });
    }
    return options.sort((b, c) => c.protection - b.protection || b.cost - c.cost || b.position.y - c.position.y || b.position.x - c.position.x)[0] ?? null;
}
export function goCover(s, id, token = turnToken(s)) {
    assert(token === turnToken(s), 'Veralteter Zug.'); const a = requireTurn(s, id), choice = coverDestination(s, a);
    assert(choice, 'Keine geschützte freie Position mit der verbleibenden Bewegung erreichbar.');
    assert(choice.cost > 0, 'Die Figur steht bereits in der besten erreichbaren Deckung.');
    return moveActor(s, id, choice.position);
}
export function blastPreview(s, center, radius) {
    if (!center || radius <= 0) return [];
    return s.actors.filter(a => isCombatant(a) && a.position && distance(center, a.position) <= radius).map(a => ({ id: a.id, name: a.name, side: a.side, distance: distance(center, a.position), blocked: !clearSight(s, center, a.position) }));
}
export function paintTerrain(s,tool,cells,options={}) {
    const prepared=terrainPaintPatch(s,tool,cells,options);
    const result={count:prepared.count,skipped:prepared.skipped,remove:prepared.remove};
    if(!prepared.count)return {state:s,result};
    return {...setBoard(s,prepared.patch),result};
}
export function setBoard(s, patch) {
    return commit(s, next => {
        next.board = boardFrom({ ...next.board, ...patch });
        for (const a of next.actors) if (a.position) checkCell(next, a.position);
        entry(next, 'edit', `Spielfeld: ${next.board.width}×${next.board.height}, ${next.board.blocked.length} gesperrte Felder, ${next.board.cover.length} Deckungsfelder.`, {}, `Board: ${next.board.width}×${next.board.height}, ${next.board.blocked.length} walls, ${next.board.cover.length} cover cells.`);
    });
}
export function setBackground(s, background) {
    // Appearance changes do not produce combat events or consume a turn.
    return commit(s, next => { next.board.background = backgroundFrom(background); });
}
export const MAP_PRESETS = Object.freeze({cliff:{wallPercent:0,coverPercent:0}, dungeon:{wallPercent:0,coverPercent:0}, castle: {wallPercent:0,coverPercent:0}, custom: { wallPercent: 12, coverPercent: 18 }, open: { wallPercent: 3, coverPercent: 6 }, forest: { wallPercent: 16, coverPercent: 28 }, city: { wallPercent: 40, coverPercent: 10 }, indoor: { wallPercent: 10, coverPercent: 32 } });
export function randomBoard(s, options = {}) {
    return commit(s, next => {
        const preset = pick(options.preset ?? 'custom', Object.keys(MAP_PRESETS), 'Kartentyp');
        let { seed = 'terrain-1', wallPercent = MAP_PRESETS[preset].wallPercent, coverPercent = MAP_PRESETS[preset].coverPercent } = options;
        wallPercent = int(wallPercent, 0, 60, 'Mauerdichte'); coverPercent = int(coverPercent, 0, 60, 'Deckungsdichte');
        assert(wallPercent + coverPercent <= 85, 'Mauer- und Deckungsdichte zusammen höchstens 85 %.');
        seed = text(seed, 'terrain-1', 200); assert(seed, 'Karten-Seed darf nicht leer sein.');
        const blocked = [], cover = [], occupied = new Set(next.actors.filter(a => a.position).map(a => `${a.position.x},${a.position.y}`));
        const period = Math.min(next.board.width, next.board.height) >= 8 ? 5 : 3;
        const streetWidth = Math.min(next.board.width, next.board.height) >= 14 ? 2 : 1;
        const offsetX = seededWord(`map:${seed}:street`, 0) % period, offsetY = seededWord(`map:${seed}:street`, 1) % period;
        for (let y = 0; y < next.board.height; y++) for (let x = 0; x < next.board.width; x++) {
            if (occupied.has(`${x},${y}`)) continue;
            let value = seededWord(`map:${seed}`, y * next.board.width + x) / 4294967296 * 100;
            if (preset === 'indoor') {
                const edge = isExit(next, { x, y });
                const door = (y === 0 || y === next.board.height - 1) && x === Math.floor(next.board.width / 2) || (x === 0 || x === next.board.width - 1) && y === Math.floor(next.board.height / 2);
                const table = (x - 1) % 4 < 2 && (y - 1) % 4 < 2 && seededWord(`map:${seed}:table`, Math.floor((y - 1) / 4) * Math.ceil(next.board.width / 4) + Math.floor((x - 1) / 4)) % 100 < 45;
                if (edge) { if (!door) blocked.push({ x, y }); }
                else if (x % 5 === 3 && y % 5 === 3 && value < 65) blocked.push({ x, y });
                else if (table || value < 5) cover.push({ x, y });
                continue;
            }
            if (preset === 'city') {
                const street = (x + offsetX) % period < streetWidth || (y + offsetY) % period < streetWidth;
                if (!street) blocked.push({ x, y }); else if (value < coverPercent) cover.push({ x, y });
                continue;
            }
            if (value < wallPercent) blocked.push({ x, y }); else if (value < wallPercent + coverPercent) cover.push({ x, y });
        }
        // Carve connected orthogonal routes between participant positions, without touching dice state.
        const hub = preset === 'indoor' ? { x: Math.floor(next.board.width / 2), y: Math.floor(next.board.height / 2) } : next.actors.find(a => a.position)?.position ?? { x: 0, y: 0 }, corridors = new Set([`${hub.x},${hub.y}`]);
        const endpoints = next.actors.filter(a => a.position).map(a => a.position);
        if (preset === 'indoor') endpoints.push({ x: Math.floor(next.board.width / 2), y: 0 }, { x: Math.floor(next.board.width / 2), y: next.board.height - 1 }, { x: 0, y: Math.floor(next.board.height / 2) }, { x: next.board.width - 1, y: Math.floor(next.board.height / 2) });
        for (const endpoint of endpoints) {
            let { x, y } = endpoint;
            if (preset === 'indoor') {
                corridors.add(`${x},${y}`);
                if (next.board.width > 2 && (x === 0 || x === next.board.width - 1)) { x += Math.sign(hub.x - x); corridors.add(`${x},${y}`); }
                if (next.board.height > 2 && (y === 0 || y === next.board.height - 1)) { y += Math.sign(hub.y - y); corridors.add(`${x},${y}`); }
            }
            while (x !== hub.x) { corridors.add(`${x},${y}`); x += Math.sign(hub.x - x); }
            while (y !== hub.y) { corridors.add(`${x},${y}`); y += Math.sign(hub.y - y); }
            corridors.add(`${x},${y}`);
        }
        next.board = boardFrom(architecture({ ...next.board, heights: [], ladders: [], coverFaces: [],pits:[], preset,roomScale:pick(options.roomScale??next.board.roomScale??'mixed',['mixed','large'],'Raumgröße'), forestStyle:preset==='forest'?pick(options.forestStyle??next.board.forestStyle??'groves',['light','groves','dense','path'],'Waldaufteilung'):next.board.forestStyle, mapSeed: seed, blocked: blocked.filter(p => !corridors.has(`${p.x},${p.y}`)), cover: cover.filter(p => !corridors.has(`${p.x},${p.y}`)) },next.actors,corridors,(part,index)=>seededWord(`map:${seed}:${part}`,index)));
        if(preset==='cliff'){const cliffForm=pick(options.cliffForm??next.board.cliffForm??'random',['random','coast','bridge','hole','edge-hole','island','headland'],'Klippenform'),cliffScenery=pick(options.cliffScenery??next.board.cliffScenery??'open',['open','scattered'],'Klippenhindernisse');next.board=boardFrom(cliffMap({...next.board,cliffForm,cliffScenery},next.actors,corridors,(part,index)=>seededWord(`map:${seed}:cliff:${part}`,index)));}
        const names = {cliff:['Klippe','Cliff'], dungeon:['Dungeon','Dungeon'], castle: ['Burgmauer','Castle wall'], custom: ['Eigene Verteilung', 'Custom'], open: ['Offene Fläche', 'Open field'], forest: ['Wald', 'Forest'], city: ['Stadt', 'City'], indoor: ['Innenraum', 'Indoor room'] };
        entry(next, 'edit', `Zufallskarte · ${names[preset][0]}: ${next.board.blocked.length} Hindernisse, ${next.board.cover.length} Deckungsfelder.`, {}, `Random map · ${names[preset][1]}: ${next.board.blocked.length} obstacles, ${next.board.cover.length} cover cells.`);
    });
}
export function statBonus(s, a, stat) { return s.rules.statMode === 'bonuses' ? a.stats[stat] : modifier(a.stats[stat]); }
export function selectedStat(s, a, stat = 'auto') {
    if (stat === 'auto') return statBonus(s, a, 'strength') >= statBonus(s, a, 'dexterity') ? 'strength' : 'dexterity';
    assert(own(STATS, stat), 'Unbekanntes Angriffsattribut.'); return stat;
}
export function turnToken(s) { return `turn-${s.turnSerial}`; }
export function turnOverview(s) {
    const current = s.phase === 'active' ? currentActor(s) : null;
    let next = null;
    // Forecast stun skips without rolling damage or changing authoritative state.
    const stunned = new Map(s.actors.map(a => {
        const effect = s.rules.effectsEnabled && a.effects?.find(v => v.type === 'stunned');
        return [a.id, effect ? Math.max(0, effect.turns - (a.id === current?.id && effect.appliedTurn !== s.turnSerial ? 1 : 0)) : 0];
    }));
    if (current) for (let step = 1; step <= s.order.length * 101; step++) {
        const index = (s.turn + step) % s.order.length, a = findActor(s, s.order[index]);
        if (!isCombatant(a)) continue;
        if (stunned.get(a.id)) { stunned.set(a.id, stunned.get(a.id) - 1); continue; }
        next = { id: a.id, name: a.name, round: s.round + Math.floor((s.turn + step) / s.order.length) }; break;
    }
    return { phase: s.phase, round: s.round, current: current ? { id: current.id, name: current.name, round: s.round } : null, next };
}
export function initiativeText(info, language = 'de') {
    if (!info?.current) return language === 'en' ? 'No active turn; combat is not running.' : 'Kein aktiver Zug; der Kampf läuft nicht.';
    const now = language === 'en' ? `Current turn: ${info.current.name} (round ${info.current.round}).` : `Jetzt am Zug: ${info.current.name} (Runde ${info.current.round}).`;
    return now + (info.next ? language === 'en' ? ` Next: ${info.next.name} (round ${info.next.round}).` : ` Danach: ${info.next.name} (Runde ${info.next.round}).` : '');
}
export function canUseResource(s,a,b,item,from=a.position) {
    if(a?.id!==b?.id&&b&&!visibleTo(s,a,b,from))return false;
    if(!item||!b||!s.rules.resourcesEnabled||!isCombatant(a)||hasEffect(s,a,'stunned')||item.kind!=='supply'||!canPay(s,a,item,true))return false;
    if(item.refill)return a.id===b.id&&refillAmount(a,item)>0;
    if(!item.radius&&(b.escaped||b.condition==='dead'||item.targets==='allies'&&(a.side==='enemy')!==(b.side==='enemy')))return false;
    if(item.range===0&&a.id!==b.id)return false;
    if(a.id===b.id||!s.rules.boardEnabled)return !item.radius||Boolean(s.rules.boardEnabled&&b.position);
    return Boolean(from&&b.position&&(item.range===1?adjacentAccess(s,from,b.position):distance(from,b.position)<=item.range)&&clearSight(s,from,b.position));
}
export function refillAmount(a,item) {
    const stock=item?.refill&&a?.resources.find(v=>v.id===item.refill.stock&&v.kind==='ammo');
    return stock?Math.max(0,Math.min(item.refill.amount,(stock.capacity??1000000)-stock.quantity)):0;
}
export function healingTargets(s,a,item,center,from=a.position) {
    if(!item||!center||!Number.isInteger(center.x)||!Number.isInteger(center.y)||center.x<0||center.y<0||center.x>=s.board.width||center.y>=s.board.height||!s.rules.boardEnabled||!from||isBlocked(s,center)||distance(from,center)>item.range||!clearSight(s,from,center))return [];
    return s.actors.filter(b=>b.position&&!b.escaped&&b.condition!=='dead'&&distance(center,b.position)<=item.radius&&(item.targets==='all'||(a.side==='enemy')===(b.side==='enemy'))&&clearSight(s,center,b.position)).map(b=>({actor:b,distance:distance(center,b.position),needsHealing:item.heal!=='0'&&b.hp<b.maxHp,cures:curableStatuses(s,b,item.cures)}));
}
function useInPlace(next,a,intent,roll) {
    assert(next.rules.resourcesEnabled,'Heilung und Ressourcen sind deaktiviert.');const item=a.resources.find(v=>v.id===intent.resource);assert(item&&item.kind==='supply','Nutzbare Ressource fehlt.');assert(canPay(next,a,item,true),'Ressource ist aufgebraucht oder Kosten sind höher als der Vorrat.');
    const b=intent.target?findActor(next,intent.target):a;
    if(item.refill){
        assert(!intent.center&&b.id===a.id,'Aufladeitems können nur den eigenen Vorrat auffüllen.');
        const amount=refillAmount(a,item);assert(canUseResource(next,a,b,item)&&amount>0,'Vorrat ist bereits voll oder Aufladeitem nicht verfügbar.');
        const destination=a.resources.find(v=>v.id===item.refill.stock),before=destination.quantity,cost=pay(next,a,item,true);
        destination.quantity+=amount;
        const result={type:'use',actor:a.id,actorName:a.name,target:a.id,targetName:a.name,resource:item.id,resourceName:item.name,quantity:cost?.quantity??item.quantity,cost:cost?.cost??0,stockName:cost?.name??null,refill:{stock:destination.id,name:destination.name,amount,before,after:destination.quantity,capacity:destination.capacity??null},healing:0,beforeHp:a.hp,afterHp:a.hp,maxHp:a.maxHp,cures:[],affected:[],rolls:[],formula:'0',radius:0,turn:turnToken(next),round:next.round};
        entry(next,'use',resultText(result),result);return result;
    }
    let targets,center=null;
    if(item.radius){
        assert(next.rules.boardEnabled,'Flächenheilung benötigt ein aktives Spielfeld.');assert(!(intent.center&&intent.target),'Ein Heilzentrum auswählen: Figur oder Feld.');
        center=intent.center?{x:int(intent.center.x,0,next.board.width-1,'Heilspalte'),y:int(intent.center.y,0,next.board.height-1,'Heilzeile')}:b.position;
        targets=healingTargets(next,a,item,center);assert(targets.length,'Heilzentrum außerhalb der Reichweite/Sicht oder keine erreichbaren Empfänger.');
    }else {assert(!intent.center,'Feldzentrum benötigt einen Heilradius.');assert(b.condition!=='dead'&&!b.escaped,'Tote oder geflohene Figuren können nicht behandelt werden.');assert(canUseResource(next,a,b,item),'Behandlungsziel außerhalb der Reichweite oder Sichtlinie.');targets=[{actor:b,distance:0,needsHealing:item.heal!=='0'&&b.hp<b.maxHp,cures:curableStatuses(next,b,item.cures)}];}
    assert(targets.some(v=>v.needsHealing||v.cures.length),'Dieses Ziel benötigt diese Behandlung nicht.');
    const healing=targets.some(v=>v.needsHealing)?resolveAmount(next,item.heal,roll):{total:0,rolls:[]},stock=pay(next,a,item,true);
    const affected=targets.map(v=>{const b=v.actor,beforeHp=b.hp,amount=item.falloff==='uniform'?healing.total:Math.floor(healing.total/2**v.distance);b.hp=Math.min(b.maxHp,b.hp+amount);clearStatuses(b,v.cures);if(b.hp>0){b.condition='fit';b.roundsLeft=null;b.downedRound=null;}return {id:b.id,name:b.name,beforeHp,afterHp:b.hp,maxHp:b.maxHp,healing:b.hp-beforeHp,cures:v.cures,distance:v.distance};});
    const first=affected.find(v=>v.id===b.id)??affected[0];
    const result={type:'use',actor:a.id,actorName:a.name,target:first.id,targetName:first.name,resource:item.id,resourceName:item.name,quantity:stock?.quantity??item.quantity,cost:stock?.cost??0,stockName:stock?.name??null,...first,formula:item.heal,rolls:healing.rolls,radius:item.radius,center,affected,turn:turnToken(next),round:next.round};
    entry(next,'use',resultText(result),result);return result;
}
export function canActivateShield(s,a,p){return Boolean(s.rules.shieldsEnabled&&p&&isCombatant(a)&&!hasEffect(s,a,'stunned')&&!(a.shields??[]).some(v=>v.profile===p.id)&&canPay(s,a,p));}
export function randomPlace(s,{mode='groups',scope='unplaced',seed='deployment-1',ids,partyFormation,enemyFormation,outsideVision=false}={}) {
    return commit(s,next=>{
        assert(!['active','paused'].includes(next.phase),'Zufällige Aufstellung nur vor dem Kampf.');
        pick(mode,['groups','random','scattered','custom'],'Aufstellungsmodus');pick(scope,['unplaced','all'],'Aufstellungsbereich');
        const party=pick(partyFormation??(mode==='random'?'spread':'compact'),['compact','loose','spread'],'Gruppenverteilung'),enemies=pick(enemyFormation??(['random','scattered'].includes(mode)?'spread':'compact'),['compact','loose','spread'],'Gegnerverteilung');
        seed=text(seed,'deployment-1',200);assert(seed,'Aufstellungs-Seed fehlt.');
        assert(ids===undefined||Array.isArray(ids)&&ids.every(id=>next.actors.some(a=>a.id===id)),'Ungültige Figurenauswahl.');
        const selected=next.actors.filter(a=>canDeployRandom(a)&&(!ids||ids.includes(a.id))&&(scope==='all'||!a.position));
        assert(selected.length,'Keine passenden lebenden Figuren zum Platzieren.');
        const selectedIds=new Set(selected.map(a=>a.id)),fixed=next.actors.filter(a=>a.position&&!selectedIds.has(a.id));
        const fixedCells=new Set(fixed.map(a=>a.position.x+','+a.position.y)),geometry={...next,actors:[]},remaining=new Map();
        for(let y=0;y<next.board.height;y++)for(let x=0;x<next.board.width;x++){const p={x,y};if(canOccupy(next,p))remaining.set(x+','+y,p);}
        let cells=[];
        while(remaining.size){const first=remaining.values().next().value,paths=pathDistances(geometry,first,'',Infinity),component=[...remaining].filter(([k])=>paths.has(k));for(const [k]of component)remaining.delete(k);
            if(fixed.every(a=>paths.has(a.position.x+','+a.position.y))){const free=component.map(([,p])=>p).filter(p=>!fixedCells.has(p.x+','+p.y));if(free.length>cells.length)cells=free;}
        }
        assert(typeof outsideVision==='boolean','Invalid deployment visibility');
        if(outsideVision){assert(next.rules.visionEnabled&&next.rules.hideUnseenEnemies&&selected.every(a=>a.side==='enemy'),'Hidden deployment needs enemy participants and vision');cells=cells.filter(p=>!playerCanSee(next,{id:'placement-probe',side:'enemy',position:p,reserve:false,hidden:null}));}
        assert(cells.length>=selected.length,'Nicht genug zusammenhängende freie Felder für die Aufstellung. Karte oder Auswahl ändern.');
        cells.sort((a,b)=>seededWord('placement:'+seed,a.y*next.board.width+a.x)-seededWord('placement:'+seed,b.y*next.board.width+b.x)||a.y-b.y||a.x-b.x);
        const anchor=cells[0],far=[...cells].sort((a,b)=>distance(anchor,b)-distance(anchor,a))[0],placed={party:[],enemy:[]};
        for(const a of fixed)if(canDeployRandom(a))placed[a.side==='enemy'?'enemy':'party'].push(a.position);
        const key=p=>p.x+','+p.y,nearest={party:new Map(),enemy:new Map()},addNearest=(team,p)=>{for(const cell of cells){const k=key(cell);nearest[team].set(k,Math.min(nearest[team].get(k)??Infinity,distance(cell,p)));}};
        for(const team of ['party','enemy'])for(const p of placed[team])addNearest(team,p);
        for(const a of selected){
            const team=a.side==='enemy'?'enemy':'party',formation=team==='enemy'?enemies:party,origin=placed[team][0]??(team==='enemy'?far:anchor);
            if(formation==='compact')cells.sort((p,q)=>distance(origin,p)-distance(origin,q));
            else if(formation==='loose'){
                const radius=Math.ceil(Math.sqrt(selected.filter(v=>(v.side==='enemy')===(a.side==='enemy')).length)*1.8),pool=cells.filter(p=>distance(origin,p)<=radius),prior=placed[team];
                if(pool.length){const minimum=p=>prior.length?nearest[team].get(key(p)):distance(origin,p),best=[...pool].sort((p,q)=>Math.abs(minimum(p)-2)-Math.abs(minimum(q)-2)||distance(origin,p)-distance(origin,q))[0];cells.splice(cells.indexOf(best),1);cells.unshift(best);}
            }else if(mode!=='random'){
                const prior=placed[team];if(prior.length)cells.sort((p,q)=>nearest[team].get(key(q))-nearest[team].get(key(p)));
            }
            a.position={...cells.shift()};if(a.aiConfig.homeMode==='deployment')a.aiConfig.home={...a.position};a.reserve=false;placed[team].push(a.position);addNearest(team,a.position);
        }
        entry(next,'edit','Zufällige Aufstellung: '+selected.length+' Figuren.',{seed,mode,scope,partyFormation:party,enemyFormation:enemies,positions:selected.map(a=>({id:a.id,position:a.position}))},'Random deployment: '+selected.length+' participants.');
        return {count:selected.length,seed,mode,partyFormation:party,enemyFormation:enemies};
    });
}
function activateShield(next,a,id) {const p=a.shieldProfiles.find(v=>v.id===id);assert(canActivateShield(next,a,p),'Schutz hier nicht verfügbar oder bereits aktiv.');const stock=pay(next,a,p);a.shields=a.shields.filter(v=>a.shieldProfiles.find(p=>p.id===v.profile)?.kind!==p.kind);a.shields.push({profile:p.id,turns:p.turns,charges:1,appliedTurn:next.turnSerial});const result={type:'shield',actor:a.id,actorName:a.name,profile:p.id,profileName:p.name,shieldKind:p.kind,amount:p.amount,turns:p.turns,stock,turn:turnToken(next),round:next.round};entry(next,'shield',resultText(result),result);return result;}
export function customReactionTargets(s,a,attacker,skill){
    if(!skill?.mechanics)return [];
    return (skill.mechanics.target==='self'?[a]:[a,attacker]).filter(b=>canUseSkill(s,a,b,skill));
}
export function canUseNarrativeReaction(s,a,attacker,skill){
    return Boolean(skill?.kind==='narrative'&&skill.reaction&&(skill.mechanics?['before','after'].includes(skill.reactionTiming)&&customReactionTargets(s,a,attacker,skill).length:canUseSkill(s,a,skill.range===0?a:attacker,skill)));
}
export function reactionOptions(s,a,attacker){
    if(!s.rules.reactionsEnabled||!isCombatant(a)||hasEffect(s,a,'stunned')||!reactionBudget(s,a).available||a.reactionControl==='off')return [];
    const list=[];if(a.reactionChoices.includes('block'))list.push({kind:'block',amount:s.rules.reactionBlock});
    if(a.reactionChoices.includes('shield'))for(const p of a.shieldProfiles.filter(p=>canActivateShield(s,a,p)))list.push({kind:'shield',profile:p.id,name:p.name,cost:consumption(s,a,p).cost,stock:p.resource?a.resources.find(r=>r.id===p.resource)?.name:null});
    if(a.reactionChoices.includes('narrative')&&s.rules.skillsEnabled)for(const skill of a.skills.filter(v=>canUseNarrativeReaction(s,a,attacker,v)))list.push({kind:'narrative',skill:skill.id,name:skill.name,mechanical:Boolean(skill.mechanics),timing:skill.mechanics?skill.reactionTiming:'before',...(skill.mechanics?{targets:customReactionTargets(s,a,attacker,skill).map(b=>({id:b.id,name:b.name})),selfOnly:skill.mechanics.target==='self',summary:{de:mechanicsText(skill.mechanics,'de'),en:mechanicsText(skill.mechanics,'en')}}:{}),cost:consumption(s,a,skill).cost,stock:consumption(s,a,skill).stock?.name??null});
    if(a.reactionChoices.includes('counter')&&!protection(s,a).attackLock)for(const w of listWeapons(a))for(const variant of w.standard?['profile','standard']:['profile'])if(!weaponFor(a,w.mode,variant,w.id).radius&&canAttack(s,a,attacker,w.mode,a.position,variant,w.id))list.push({kind:'counter',weapon:w.id,mode:w.mode,variant,name:w.name});
    return list;
}
export function canReserveReaction(s,a) {
    if (!s.rules.reactionsEnabled || !a || a.reactionControl === 'off' || reactionBudget(s,a).reserved>=reactionBudget(s,a).remaining || a.reactionCost === 'extra' || !canSpendAction(s,a,'reserve')) return false;
    const budget = poolBudget(s,a);
    if (a.reactionCost === 'normal' ? !budget.free.remaining : !budget.bonus.some(p => p.remaining && p.allowed.includes('reserve'))) return false;
    if(a.reactionChoices.includes('narrative')&&s.rules.skillsEnabled&&a.skills.some(v=>v.kind==='narrative'&&v.reaction&&canPay(s,a,v)))return true;
    if (a.reactionChoices.includes('block') && s.rules.reactionBlock > 0) return true;
    if (a.reactionChoices.includes('shield') && a.shieldProfiles.some(p => canActivateShield(s,a,p))) return true;
    if (a.reactionChoices.includes('counter')) {
        // An incoming attacker may move into reach later; check the weapon and
        // conditions now without demanding that an opponent is already in range.
        const projected = {...s,rules:{...s.rules,boardEnabled:false}};
        const enemies = s.actors.filter(b => isCombatant(b) && (b.side === 'enemy') !== (a.side === 'enemy')&&visibleTo(s,a,b));
        return listWeapons(a).some(w => (w.standard ? ['profile','standard'] : ['profile']).some(v => !weaponFor(a,w.mode,v,w.id).radius && enemies.some(b => canAttack(projected,a,b,w.mode,a.position,v,w.id))));
    }
    return false;
}
export function automaticReaction(s,a,options) {
    if(a.control==='advanced'){
        const ranked=[];for(const o of options){
            if(o.kind==='narrative'){
                if(!o.mechanical)continue;const skill=a.skills.find(v=>v.id===o.skill),m=skill?.mechanics;if(!m)continue;
                for(const target of o.targets??[]){const b=s.actors.find(v=>v.id===target.id);if(!b)continue;const enemy=(a.side==='enemy')!==(b.side==='enemy'),average=v=>{if(!v)return 0;const d=parseDice(v.dice);return Math.max(0,d.count*(d.sides+1)/2+d.bonus+v.bonus);};let score=0;
                    if(m.damage)score+=(enemy?1:-2)*average(m.damage);
                    if(m.healing)score+=(enemy?-2:1.5)*Math.min(b.maxHp-b.hp,average(m.healing));
                    if(m.status){const has=[...b.effects,...b.tactics].some(v=>v.type===m.status.type);if(m.status.mode==='remove'&&has)score+=enemy?-15:18;if(m.status.mode==='apply'&&!has&&!a.aiMemory.opponents.find(v=>v.id===b.id)?.immune.includes(m.status.type))score+=enemy?20:-30;}
                    if(score>0)ranked.push({option:{...o,target:b.id},score});
                }
            }else ranked.push({option:o,score:o.kind==='block'?Math.min(8,o.amount):o.kind==='shield'?(a.hp/a.maxHp<.35?18:6):o.kind==='counter'?(a.aiBehavior==='cautious'?4:10):0});
        }
        ranked.sort((b,c)=>c.score-b.score);return ranked[0]?.option??{kind:'none'};
    }
    if(a.hp/a.maxHp<=.25){const defense=options.find(v=>v.kind==='shield')??options.find(v=>v.kind==='block');if(defense)return defense;}
    return options.find(v=>v.kind==='counter')??options.find(v=>v.kind==='block')??options.find(v=>v.kind==='shield')??{kind:'none'};
}
export function searchClues(s,a){
    if(!a?.position||!isCombatant(a))return [];
    const visible=s.actors.filter(b=>isCombatant(b)&&(a.side==='enemy')!==(b.side==='enemy')&&visibleTo(s,a,b));
    const records=visible.map(b=>{const k=a.aiMemory.opponents.find(k=>k.id===b.id),same=k?.activity==='active'&&k.position&&distance(k.position,b.position)===0;return {...k,id:b.id,position:{...b.position},activity:'active',seen:s.turnSerial,sighting:same?k.sighting:s.turnSerial};});
    for(const k of a.aiMemory.opponents){
        if(!aiClueFresh(s,a,k)||records.some(v=>v.id===k.id))continue;
        const b=s.actors.find(b=>b.id===k.id),perceived=b?.condition==='dead'&&b.lastPosition?{...b,position:b.position??b.lastPosition,reserve:false}:b;
        if(perceived&&visibleTo(s,a,perceived)||aiPointSeen(s,a,k.position,{clearSight,visionRange}))continue;
        records.push(k);
    }
    return records.sort((x,y)=>y.seen-x.seen||x.id.localeCompare(y.id));
}
export function searchAlert(s,a){
    const hint=a.aiMemory.alert;
    if(!hint||s.turnSerial-hint.turn>Math.max(1,s.actors.length)*a.aiConfig.searchTurns||aiPointSeen(s,a,hint.position,{clearSight,visionRange}))return null;
    if(hint.target&&a.aiMemory.opponents.some(k=>k.id===hint.target&&['inactive','cleared'].includes(k.activity)&&k.seen>=hint.turn))return null;
    return hint;
}
export function needsAlarm(s,b,report){
    if(!report||b.control!=='advanced'||!isCombatant(b)||!b.position)return false;
    const target=s.actors.find(v=>v.id===report.target);
    const activeVisible=target&&isCombatant(target)&&visibleTo(s,b,target);
    if(target&&visibleTo(s,b,target)&&!isCombatant(target))return false;
    const known=b.aiMemory.opponents.find(k=>k.id===report.target);
    if(known&&known.seen>=report.seen&&['inactive','cleared'].includes(known.activity))return false;
    if(known?.position&&known.seen>=report.seen&&distance(known.position,report.position)!==0)return false;
    if(aiPointSeen(s,b,report.position,{clearSight,visionRange})&&!activeVisible)return false;
    const heard=b.aiMemory.heard?.find(v=>v.id===report.target);
    return !heard||distance(heard.position,report.position)!==0||report.sighting>heard.seen;
}
function alarmRecipients(s,a,report){return s.actors.filter(b=>b.id!==a.id&&(a.side==='enemy')===(b.side==='enemy')&&b.position&&distance(a.position,b.position)<=a.aiConfig.alarmRadius&&needsAlarm(s,b,report));}
export function alarmReport(s,a){
    const reports=searchClues(s,a).map(k=>({position:{...k.position},target:k.id,seen:k.seen,sighting:k.sighting,key:aiClueKey(k),announced:k.announced})).filter(k=>k.key!==k.announced&&k.key!==a.aiMemory.lastAlarm);
    const report=reports.find(k=>alarmRecipients(s,a,k).length)??reports[0];
    if(!report)return null;const {announced,...result}=report;return result;
}
export function alarmKey(s,a){return alarmReport(s,a)?.key??'';}
export function canAlarm(s,a,actionPaid=false){return Boolean(a?.control==='advanced'&&a.aiConfig?.alarm&&s.rules.boardEnabled&&a.position&&(actionPaid||canSpendAction(s,a,'other'))&&canPay(s,a,{resource:a.aiConfig.alarmResource,cost:a.aiConfig.alarmCost})&&alarmRecipients(s,a,alarmReport(s,a)).length);}
export function applyAIPlan(s,plan){
    return commit(s,next=>{const a=requireTurn(next,plan.actor);assert(a.control==='advanced'&&plan.counter===a.aiMemory.counter,'Veraltete Advanced-KI-Entscheidung.');a.aiMemory.counter++;
        if(plan.intent.target){const b=next.actors.find(v=>v.id===plan.intent.target);if(b&&(a.side==='enemy')!==(b.side==='enemy'))a.aiMemory.target=b.id;}
        if(plan.searchData){
            const team=[...new Set(plan.searchData.team??[])];assert(team.length>=1&&team.length<=3&&team.includes(a.id),'Ungültige Suchgruppe.');
            const members=team.map(id=>findActor(next,id));assert(members.every(b=>b.control==='advanced'&&b.aiConfig.idle==='search'&&(b.side==='enemy')===(a.side==='enemy')&&(b.id===a.id||b.aiConfig.searchTogether&&a.aiConfig.searchTogether&&b.position&&distance(a.position,b.position)<=(next.rules.visionEnabled?visionRange(next,a):8)&&clearSight(next,a.position,b.position))),'Suchgruppe nicht in Kontakt.');
            for(const other of next.actors)if(!team.includes(other.id)&&other.aiMemory.searchTeam.some(id=>team.includes(id)))other.aiMemory.searchTeam=other.aiMemory.searchTeam.filter(id=>!team.includes(id));
            const survey=surveyMerge(...members.map(b=>b.aiMemory.survey));
            for(const b of members){b.aiMemory.searchTeam=team;b.aiMemory.searchGoal=plan.searchData.goal?{...plan.searchData.goal}:null;b.aiMemory.survey=[...survey];}
        }else if(plan.clearSearch){a.aiMemory.searchTeam=[];a.aiMemory.searchGoal=null;for(const b of next.actors)if(b.id!==a.id)b.aiMemory.searchTeam=b.aiMemory.searchTeam.filter(id=>id!==a.id);}
        if(Object.hasOwn(plan,'rally'))a.aiMemory.rally=plan.rally?{...plan.rally,position:{...plan.rally.position}}:null;
        const pos=plan.move??a.position;if(pos)a.aiMemory.visited=[...new Set([...a.aiMemory.visited,pos.x+','+pos.y])].slice(-400);
        if(plan.search&&a.aiMemory.lastSearchTurn!==next.turnSerial){a.aiMemory.searchLeft=Math.max(0,a.aiMemory.searchLeft-1);a.aiMemory.lastSearchTurn=next.turnSerial;}
        if(plan.clearAlert)a.aiMemory.alert=null;
        const de='KI-Entscheidung: '+String(plan.reasonDe??'Situation bewerten').slice(0,240),en='AI decision: '+String(plan.reasonEn??'Assess situation').slice(0,240);entry(next,'ai',a.name+': '+de,{actor:a.id},a.name+': '+en);next.log.at(-1).chatRelevant=false;
    });
}
export function attackPreview(s,intent,options={}) {
    if(intent.type!=='attack')return null;const a=requireTurn(s,intent.actor),b=findActor(s,intent.target),base=intent.weapon?listWeapons(a).find(w=>w.id===intent.weapon):null,mode=intent.mode??base?.mode??a.attackMode,w=weaponFor(a,mode,intent.variant??'profile',intent.weapon??(intent.mode==null?a.preferredWeapon:null));
    assert(Object.keys(intent).every(k=>['type','actor','target','stat','mode','variant','weapon','description','turn'].includes(k)),'Aktionen dürfen keine HP, DC, Boni, Würfel oder Positionen ändern.');
    assert(options.source!=='model'||!['basic','advanced','dm'].includes(a.control),'Diese Figur benötigt Basic-KI oder eine Spielerbestätigung.');
    assert(intent.weapon==null||base,'Waffe oder Zauber fehlt.');
    assert(((options.source??'manual')==='manual'?canManualAction(s,a,'attack'):canSpendAction(s,a,'attack'))&&w&&canAttack(s,a,b,mode,a.position,intent.variant??'profile',w.id),'Angriff hier nicht nutzbar: Ziel, Bewegung oder Vorrat prüfen.');
    if(intent.turn!=null)assert(intent.turn===turnToken(s),'Veralteter Zug.');const parsed=parseDice(options.damageOverride??w.damage),ability=statBonus(s,a,weaponStat(s,a,w,intent.stat)),radius=int(options.radiusOverride??w.radius,0,10,'Flächenradius'),normal=Math.max(0,parsed.count*parsed.sides+parsed.bonus+w.damageBonus+(s.rules.damageAbility?ability:0)),maxDamage=s.rules.natural20?Math.max(normal,s.rules.criticalDamage==='doubleMax'?normal*2:s.rules.criticalDamage==='max'?normal:normal+parsed.count*parsed.sides):normal;
    const potential=mode==='ranged'?shotObstacles(s,a,b):[],centers=[b,...potential];
    const affected=radius?s.actors.filter(v=>v.position&&isCombatant(v)&&centers.some(center=>distance(center.position,v.position)<=radius&&clearSight(s,center.position,v.position))&&(s.rules.friendlyFireArea||v.id===b.id||potential.some(p=>p.id===v.id)||(v.side==='enemy')!==(a.side==='enemy'))):centers;
    return {actor:a.id,actorName:a.name,target:b.id,weaponName:w.name,formula:parsed.formula,maxDamage:maxDamage*(a.hidden?s.rules.hiddenDamageMultiplier:1),radius,shotRisk:potential.filter(v=>visibleTo(s,a,v)).map(v=>({id:v.id,name:v.name})),shotPenalty:potential.length*s.rules.shotRiskPenalty,defenders:affected.filter(v=>v.id!==a.id).map(v=>({actor:v.id,name:v.name,hp:v.hp,maxHp:v.maxHp,dc:rounded(a.dc+protection(s,a).dc+stanceBonus(s,a).defense+(heightAt(s,a.position)>heightAt(s,v.position)?s.rules.highDefenseBonus:0)),options:reactionOptions(s,v,a),control:reactionMode(v)})).filter(v=>v.options.length)};
}
function attackInPlace(next,a,intent,{roll,damageOverride,radiusOverride,blocks={},counter=false}={}) {
assert(!protection(next,a).attackLock,'Aktiver Schutz sperrt eigene Angriffe.');
            let b = findActor(next, intent.target);
                        const intended=b;
            assert(b.id !== a.id, 'Keine Selbstangriffe.');
            assert(b.hp > 0, 'Ziel hat bereits 0 HP.');
            assert(!b.escaped, 'Dieses Ziel ist bereits geflohen.');
            assert(isCombatant(b)&&visibleTo(next,a,b),'Ziel ist ausgesetzt, am Abgrund oder versteckt.');
            assert((a.side === 'enemy') !== (b.side === 'enemy'), 'Ziel muss auf der Gegenseite stehen.');
            const selectedWeapon = intent.weapon == null ? null : listWeapons(a).find(v => v.id === intent.weapon);
            assert(intent.weapon == null || selectedWeapon, 'Waffe oder Zauber fehlt.');
            const mode = pick(intent.mode ?? selectedWeapon?.mode ?? a.attackMode, ['melee', 'ranged'], 'Angriffsart');
            const weaponId = selectedWeapon?.id ?? (intent.mode == null ? a.preferredWeapon : null);
            const variant = pick(intent.variant ?? 'profile', ['profile', 'standard'], 'Angriffsvariante');
            const weapon = weaponFor(a, mode, variant, weaponId);
            assert(weapon, 'Für diese Angriffsart ist keine Waffe eingetragen.');
            const radius = int(radiusOverride ?? weapon.radius ?? 0, 0, 10, 'Flächenradius');
            assert(radius === 0 || (next.rules.boardEnabled && a.position && b.position), 'Flächenschaden benötigt ein aktives Spielfeld und platzierte Figuren.');
            if (next.rules.boardEnabled) {
                assert(a.position && b.position, 'Angreifer und Ziel zuerst auf dem Spielfeld platzieren.');
                const d = distance(a.position, b.position);
                assert(mode === 'melee' ? d === 1 : d <= effectiveRange(next,a,weapon), mode === 'melee' ? 'Nahkampf benötigt ein Nachbarfeld, auch diagonal.' : 'Ziel außerhalb der Fernkampfreichweite.');
                assert(mode === 'melee' ? diagonalClear(next, a.position, b.position) : clearSight(next, a.position, b.position), 'Hindernis blockiert den Angriff. Spieler muss eingreifen.');
            }
            assert(mode !== 'melee' || !next.rules.boardEnabled || heightTransition(next, a.position, b.position), 'Nahkampf auf verschiedenen Höhen benötigt eine verbindende Leiter.');
            assert(!reactionPending(next,a), 'Zuerst der erzwungenen Deckungs- oder Fluchtabsicht folgen.');
            assert(tactic(next,a,'disarmed')?.weapon !== weapon.id, 'Diese Waffe ist vorübergehend entwaffnet.');
            const provoked = tactic(next,a,'provoked'), forced = provoked && next.actors.find(v=>v.id===provoked.source);
            if (forced && forced.id !== b.id) {
                const unprovoked={...a,tactics:a.tactics.filter(v=>v.type!=='provoked')};
                assert(!canAttack({...next,actors:next.actors.map(v=>v.id===a.id?unprovoked:v)},unprovoked,forced,mode,a.position,variant,weapon.id),'Provoziert: zuerst den erreichbaren Provokateur angreifen.');
            }
            const stat = weaponStat(next,a,weapon,intent.stat);
            const ability = statBonus(next, a, stat);
            const parsed = parseDice(damageOverride ?? weapon.damage);
            const damageBonus = weapon.damageBonus ?? a.damageBonus ?? 0;
            let ammunition = null;
            ammunition=pay(next,a,weapon);
            const effectPenalty = hasEffect(next, a, 'poisoned') ? -next.rules.poisonPenalty : 0;
            const natural = die(next, 20, roll);
            const highAttack = heightAt(next, a.position) > heightAt(next, b.position) ? next.rules.highAttackBonus : 0;
            const highDefense = heightAt(next, b.position) > heightAt(next, a.position) ? next.rules.highDefenseBonus : 0;
            let effectiveDC = rounded(b.dc + highDefense + stanceBonus(next,b).defense + protection(next,b).dc);
            const tacticalSources={aim:mode==='ranged'?tacticValue(next,a,'aimed'):0,support:tacticValue(next,a,'supported'),distract:tacticValue(next,b,'distracted')},tacticalBonus=tacticalSources.aim+tacticalSources.support+tacticalSources.distract;
            const posture = stanceBonus(next,a).attack;
            const obstacles=mode==='ranged'?shotObstacles(next,a,b):[],shotPenalty=obstacles.length*next.rules.shotRiskPenalty;
            const total = rounded(natural + ability + a.attackBonus + weapon.attackBonus + effectPenalty + highAttack + tacticalBonus + posture - shotPenalty);
            if(next.rules.skillsEnabled){a.tactics = a.tactics.filter(v=>!['supported',...(mode==='ranged'?['aimed']:[])].includes(v.type)); b.tactics = b.tactics.filter(v=>v.type!=='distracted');}
            let hit = next.rules.hitEqual ? total >= effectiveDC : total > effectiveDC;
            const critical = next.rules.natural20 && natural === 20;
            if (next.rules.natural20 && (natural === 1 || natural === 20)) hit = natural === 20;
            let misfire=false;
            if(!hit&&obstacles.length){const candidate=obstacles[0],dc=rounded(candidate.dc+stanceBonus(next,candidate).defense+protection(next,candidate).dc+(heightAt(next,candidate.position)>heightAt(next,a.position)?next.rules.highDefenseBonus:0));let stray=next.rules.hitEqual?total>=dc:total>dc;if(next.rules.natural20&&natural===1)stray=false;if(stray){b=candidate;effectiveDC=dc;hit=true;misfire=true;}}
            const defenseModifiers={base:b.dc,height:heightAt(next,b.position)>heightAt(next,a.position)?next.rules.highDefenseBonus:0,stance:stanceBonus(next,b).defense,shield:protection(next,b).dc};
            const ambush=Boolean(next.rules.stealthEnabled&&a.hidden),ambushMultiplier=ambush&&(!critical||next.rules.ambushStacksCritical)?next.rules.hiddenDamageMultiplier:1;a.hidden=null;
            const maximum = critical && next.rules.criticalDamage !== 'doubleDice';
            const rolls = hit ? maximum ? Array(parsed.count).fill(parsed.sides) : Array.from({ length: parsed.count * (critical ? 2 : 1) }, () => die(next, parsed.sides, roll)) : [];
            const rawDamage = hit ? Math.max(0, rounded(rolls.reduce((n, v) => n + v, 0) + parsed.bonus + damageBonus + (next.rules.damageAbility ? ability : 0))) * (critical && next.rules.criticalDamage === 'doubleMax' ? 2 : 1) * ambushMultiplier : 0;
            const shotPercent=next.rules.boardEnabled&&mode==='ranged'?coverDamagePercent(next,a.position,b.position):100;const shotCover=shotPercent<100;
            const candidates = radius > 0 ? next.actors.filter(v => isCombatant(v) && v.position && distance(b.position, v.position) <= radius&&(v.id===b.id||next.rules.friendlyFireArea||(v.side==='enemy')!==(a.side==='enemy'))) : [b];
            const attackingSide=a.side;
            const affected = candidates.map(v => {
                const friendly=(v.side==='enemy')===(attackingSide==='enemy');
                const d = radius > 0 ? distance(b.position, v.position) : 0;
                const blocked = radius > 0 && !clearSight(next, b.position, v.position);
                const blastPercent=next.rules.boardEnabled&&radius>0?(d===0&&isCover(next,v.position)?next.rules.coverPercent:coverDamagePercent(next,b.position,v.position)):100;const coverPercent=Math.min(shotPercent,blastPercent),cover=coverPercent<100;
                const terrainDamage = blocked ? 0 : Math.floor(Math.floor(rawDamage / 2 ** d) * coverPercent/100);
                const protectedHit=protectDamage(next,v,terrainDamage,blocks[v.id]??0,weapon.damageType??'physical'),damage=protectedHit.damage;
                const beforeHp = v.hp; v.hp = Math.max(0, v.hp - damage);
                if(damage>0)v.hidden=null;
                if (beforeHp > 0 && v.hp === 0) knockedDown(next, v);
                return { ...protectedHit,id: v.id, name: v.name, friendly,distance: d, blocked, cover,coverPercent, damage, beforeHp, afterHp: v.hp, maxHp: v.maxHp, condition: v.condition, roundsLeft: v.roundsLeft };
            });
            const appliedEffects = [],immuneEffects=[];
            if (hit && next.rules.effectsEnabled) for (const v of affected.filter(v => !v.blocked && v.damage > 0 && v.afterHp > 0)) {
                const target = findActor(next, v.id);
                for (const rawSpec of weapon.effects ?? []) {
                    const spec=effectSpec(next,rawSpec);
                    if(isImmune(target,spec.type)){immuneEffects.push({target:target.id,name:target.name,type:spec.type});continue;}
                    const existing = target.effects.find(e => e.type === spec.type&&periodicDamageType(e)===periodicDamageType(spec));
                    if (existing) Object.assign(existing, { ...rawSpec, turns: Math.max(existing.turns, spec.turns), appliedTurn: next.turnSerial });
                    else target.effects.push({ ...rawSpec, turns:spec.turns, appliedTurn: next.turnSerial });
                    appliedEffects.push({ name: target.name, ...spec });
                }
            }
            const primary = affected.find(v => v.id === b.id);
            const { damage, beforeHp } = primary;
            const result = { type: 'attack', actor: a.id, actorName: a.name, target: b.id, targetName: b.name,
                round: next.round, turn: turnToken(next), mode, variant, weapon: weapon.id, weaponName: weapon.name, natural, ability, stat, attackBonus: rounded(a.attackBonus + weapon.attackBonus + highAttack + posture + tacticalBonus), tacticalBonus, posture, criticalMode: critical ? next.rules.criticalDamage : null, highAttack, highDefense, baseDC: b.dc, total, dc: effectiveDC,
                attackModifiers:{actor:a.attackBonus,weapon:weapon.attackBonus,height:highAttack,stance:posture,...tacticalSources,poison:effectPenalty,shotRisk:-shotPenalty},defenseModifiers,hit, critical, criticalFailure:Boolean(next.rules.natural20&&natural===1), damage, rawDamage, radius,misfire,intendedTarget:intended.id,intendedTargetName:intended.name,shotPenalty,ambush,ambushMultiplier,...(misfire?{success:false}:{}), effectPenalty,immuneEffects,damageType:weapon.damageType??'physical', appliedEffects, ammunition: ammunition ? { name: ammunition.name, quantity: ammunition.quantity,cost:ammunition.cost } : null, affected, cover: primary.cover, damageRolls: rolls, damageFormula: parsed.formula, damageBonus,
                damageAbility: next.rules.damageAbility ? ability : 0, beforeHp, afterHp: b.hp, maxHp: b.maxHp,
                targetCondition: b.condition, roundsLeft: b.roundsLeft, description: text(intent.description, '', 500) };
            result.reactionAttack=counter;entry(next,hit?'hit':'miss',resultText(result),result);return result;
}
export function narrativeReactionPreview(s,defenderId,attackerId,skillId,{roll}={}) {
    const copy=clone(s),b=findActor(copy,defenderId),a=findActor(copy,attackerId),skill=b.skills.find(v=>v.id===skillId);
    assert(!skill?.mechanics&&reactionOptions(copy,b,a).some(v=>v.kind==='narrative'&&v.skill===skillId),'Eigene Reaktion nicht verfügbar.');
    const before=copy.rng.cursor,defense=skillDefense(copy,a,skill);assert(Number.isFinite(defense.dc),'Reaktionsabwehr fehlt.');
    const natural=skill.check?die(copy,20,roll):null,ability=statBonus(copy,b,skill.stat);
    const outcome=skill.check?checkOutcome(copy.rules,natural,ability,skill.bonus,defense.dc):{natural:null,ability,bonus:skill.bonus,total:null,dc:defense.dc,critical:false,success:true};
    const result={type:'check',actor:b.id,actorName:b.name,target:a.id,targetName:a.name,description:skill.description||skill.name,stat:skill.stat,free:false,...outcome,defense,effectName:null,outcome:{de:'Vereinbarte Wirkung manuell ausspielen.',en:'Apply the agreed effect manually.'},resource:consumption(copy,b,skill).id?{name:consumption(copy,b,skill).stock.name,cost:consumption(copy,b,skill).cost,quantity:consumption(copy,b,skill).stock.quantity-consumption(copy,b,skill).cost}:null};
    return {actor:b.id,attacker:a.id,skill:skill.id,turn:turnToken(s),revision:s.revision,cursorBefore:before,cursorAfter:copy.rng.cursor,natural,result};
}
function narrativeReactionInPlace(s,b,a,skillId,draw,roll) {
    const skill=b.skills.find(v=>v.id===skillId);assert(!skill?.mechanics&&canUseNarrativeReaction(s,b,a,skill),'Eigene Reaktion hier nicht nutzbar.');
    if(draw){assert(draw.actor===b.id&&draw.attacker===a.id&&draw.skill===skill.id&&draw.turn===turnToken(s)&&draw.revision===s.revision&&draw.cursorBefore===s.rng.cursor,'Veralteter Reaktionswurf.');assert(Number.isSafeInteger(draw.cursorAfter)&&draw.cursorAfter>=draw.cursorBefore+(skill.check?1:0),'Ungültiger Reaktionswurf.');}
    const generated=narrativeReactionPreview(s,b.id,a.id,skill.id,{roll:draw?()=>draw.natural:roll}),result=generated.result;
    s.rng.cursor=draw?draw.cursorAfter:generated.cursorAfter;
    const paid=pay(s,b,skill);result.resource=paid;result.turn=turnToken(s);result.reaction=true;
    consumeReaction(s,b);
    entry(s,'reaction',checkText(result,'de'),{actor:b.id,choice:{kind:'narrative',skill:skill.id},result},checkText(result,'en'));return result;
}

function mechanicalReactionInPlace(s,b,a,skillId,targetId,roll){
    const skill=b.skills.find(v=>v.id===skillId),target=findActor(s,targetId);
    assert(canUseNarrativeReaction(s,b,a,skill)&&customReactionTargets(s,b,a,skill).some(v=>v.id===target.id),'Eigene Reaktion hier nicht nutzbar.');
    const defense=skillDefense(s,a,skill),ability=statBonus(s,b,skill.stat),bonus=rounded(skill.bonus+(skill.check?tacticValue(s,b,'supported'):0));
    const outcome=skill.check?checkOutcome(s.rules,die(s,20,roll),ability,bonus,defense.dc):{natural:null,ability,bonus,total:null,dc:defense.dc,critical:false,success:true};
    const resource=pay(s,b,skill);consumeReaction(s,b);if(skill.check)b.tactics=b.tactics.filter(v=>v.type!=='supported');
    const custom=applyCustomEffects(s,b,target,skill.mechanics,skill.range,outcome.success,outcome.critical,roll);
    const result={type:'check',reaction:true,mechanical:true,timing:skill.reactionTiming,skill:skill.id,skillName:skill.name,actor:b.id,actorName:b.name,target:target.id,targetName:target.name,defenseTarget:a.id,description:skill.description||skill.name,stat:skill.stat,free:false,bonusSources:{profile:skill.bonus,support:rounded(bonus-skill.bonus)},...outcome,defense,custom,outcome:{de:customOutcomeText(custom,'de'),en:customOutcomeText(custom,'en')},resource,turn:turnToken(s),round:s.round};
    entry(s,'reaction',checkText(result,'de'),{actor:b.id,choice:{kind:'narrative',skill:skill.id,timing:skill.reactionTiming,target:target.id},result},checkText(result,'en'));return result;
}
function attackWithReactions(next,a,intent,options) {
    if(!next.rules.reactionsEnabled)return attackInPlace(next,a,intent,options);
    const preview=options.preview,blocks=Object.create(null),counters=[],decisions=options.reactionDecisions??{},narrativeReactions=[],requests=preview.defenders,selected=[];
    assert(Object.keys(decisions).every(id=>requests.some(v=>v.actor===id)),'Ungültiges Reaktionsziel.');
    for(const req of requests){
        const b=findActor(next,req.actor),choice=(own(decisions,b.id)?decisions[b.id]:null)??(req.control==='auto'?automaticReaction(next,b,req.options):{kind:'none'});
        if(choice.kind==='none')continue;
        const actual=req.options.find(v=>v.kind===choice.kind&&(v.kind!=='shield'||v.profile===choice.profile)&&(v.kind!=='counter'||v.weapon===choice.weapon&&v.variant===choice.variant)&&(v.kind!=='narrative'||v.skill===choice.skill));assert(actual,'Reaktion nicht verfügbar.');
        if(actual.mechanical){assert(choice.resolution===undefined,'Berechnete Reaktionen haben keine Spielleiter-Aufhebung.');const target=choice.target??(actual.selfOnly?b.id:actual.targets.length===1?actual.targets[0].id:null);assert(actual.targets.some(v=>v.id===target),'Wirkungsziel der Reaktion wählen.');selected.push({b,actual,choice:{...choice,target}});}
        else {if(actual.kind==='narrative')assert(['continue','void'].includes(choice.resolution??'continue'),'Ungültige Spielleiterentscheidung.');selected.push({b,actual,choice});}
    }
    // Manual narrative decisions precede automatic mechanics. Their confirmed
    // preview draws keep the existing RNG order even in mixed area reactions.
    let voided=false;
    for(const {b,actual,choice}of selected.filter(v=>v.actual.kind==='narrative'&&!v.actual.mechanical)){
        narrativeReactions.push(narrativeReactionInPlace(next,b,a,actual.skill,options.reactionDraws?.[b.id],options.roll));if(choice.resolution==='void'){voided=true;break;}
    }
    const skip=(b,actual,reason)=>{
        const result={actor:b.id,actorName:b.name,skill:actual.skill,skillName:actual.name,timing:actual.timing,mechanical:true,skipped:true,reason};narrativeReactions.push(result);
        entry(next,'reaction',b.name+': '+actual.name+' nicht ausgeführt; '+reason+'. Keine Reaktionskosten.',{actor:b.id,result},b.name+': '+actual.name+' skipped; '+(reason==='Angriff nicht ausgeführt'?'attack did not execute':'participant or recipient no longer eligible')+'. No reaction cost.');
    };
    const applyMechanical=phase=>{
        for(const {b,actual,choice}of selected.filter(v=>v.actual.mechanical&&v.actual.timing===phase)){
            if(voided){skip(b,actual,'Angriff nicht ausgeführt');continue;}
            const skill=b.skills.find(v=>v.id===actual.skill);
            if(!reactionOptions(next,b,a).some(v=>v.kind==='narrative'&&v.skill===actual.skill)||!customReactionTargets(next,b,a,skill).some(v=>v.id===choice.target)){skip(b,actual,'Figur oder Wirkungsziel nicht mehr handlungsfähig oder erreichbar');continue;}
            narrativeReactions.push(mechanicalReactionInPlace(next,b,a,actual.skill,choice.target,options.roll));
        }
    };
    if(!voided){
        for(const {b,actual}of selected.filter(v=>v.actual.kind!=='narrative')){
            consumeReaction(next,b);
            if(actual.kind==='block')blocks[b.id]=actual.amount;
            if(actual.kind==='shield')activateShield(next,b,actual.profile);
            if(actual.kind==='counter')counters.push({b,choice:actual});
            entry(next,'reaction',b.name+': '+({block:'Blocken',shield:'Schutz',counter:'Konter'})[actual.kind]+'.',{actor:b.id,choice:actual},b.name+': '+actual.kind+'.');
        }
        applyMechanical('before');
    }
    const base=intent.weapon?listWeapons(a).find(w=>w.id===intent.weapon):null,mode=intent.mode??base?.mode??a.attackMode,w=weaponFor(a,mode,intent.variant??'profile',intent.weapon??(intent.mode==null?a.preferredWeapon:null)),b=findActor(next,intent.target);
    const interrupted=!voided&&!canAttack(next,a,b,mode,a.position,intent.variant??'profile',w.id);
    let result;
    if(voided||interrupted){const ammunition=pay(next,a,w);a.hidden=null;
        result={type:'attack',voided:true,interrupted,success:false,hit:false,actor:a.id,actorName:a.name,target:b.id,targetName:b.name,weapon:w.id,weaponName:w.name,mode,round:next.round,turn:turnToken(next),affected:[],damage:0,rawDamage:0,ammunition,narrativeReactions,reactions:[]};entry(next,'other',resultText(result),result);voided=true;
    }else{result=attackInPlace(next,a,intent,{...options,blocks});result.reactions=[];result.narrativeReactions=narrativeReactions;}
    applyMechanical('after');
    if(!voided)for(const {b,choice}of counters){if(isCombatant(b)&&isCombatant(a)&&canAttack(next,b,a,choice.mode,b.position,choice.variant,choice.weapon)){const counter=attackInPlace(next,b,{type:'attack',actor:b.id,target:a.id,...choice},{roll:options.roll,counter:true});result.reactions.push(counter);}else entry(next,'reaction',b.name+': Konter nach dem Angriff nicht mehr ausführbar; Reaktion verbraucht, Waffenverbrauch entfällt.',{actor:b.id,cancelled:true},b.name+': counter unavailable after the attack; reaction spent, no weapon consumption.');}
    result.finalHp=findActor(next,result.target).hp;
    const event=next.log.findLast(e=>e.details===result);if(event){event.textDe=resultText(result,'de');event.textEn=resultText(result,'en');event.text=event[next.rules.language==='en'?'textEn':'textDe'];}
    return result;
}
export function resolveAction(s, intent, { roll, receipt, damageOverride, radiusOverride, source = 'manual', reactionDecisions, reactionDraws } = {}) {
    assert(intent && typeof intent === 'object' && !Array.isArray(intent), 'Aktion muss ein Objekt sein.');
    if (receipt && s.receipts.includes(receipt)) return { state: s, result: { duplicate: true } };
    return commit(s, next => {
        if (intent.turn !== undefined) assert(intent.turn === turnToken(next), 'Veralteter Zug. Aktuellen Zugtoken verwenden.');
        const kind = pick(intent.type, ['attack', 'other', 'stabilize', 'flee', 'use', 'skill','shield','reserve','check','rescue','alarm'], 'Aktionstyp');
        const outsideRevive=source==='manual'&&kind==='skill'&&next.actors.find(v=>v.id===intent.actor)?.skills.some(v=>v.id===intent.skill&&['revive','raise'].includes(v.kind));
        const a = (['stabilize', 'rescue', 'use'].includes(kind)||outsideRevive) && next.phase !== 'active' ? findActor(next, intent.actor) : requireTurn(next, intent.actor);
        assert(isCombatant(a), 'Nur eine kampffähige Figur kann helfen.');
        assert(!hasEffect(next, a, 'stunned'), 'Betäubte Figur kann keine Aktion ausführen. Zug beenden oder durch eine andere Figur behandeln.');
        const checked=kind==='check'?checkInput(intent,STATS,a.skills):null;
        assert(!checked||source==='manual','Eigene Proben werden manuell ausgeführt.');
        if(kind==='skill'&&a.skills.find(v=>v.id===intent.skill)?.kind==='narrative')assert(source==='manual'||source==='advanced'&&a.skills.find(v=>v.id===intent.skill)?.mechanics,'Eigene erzählerische Fähigkeiten werden manuell ausgeführt.');
        const actionKind=kind==='alarm'?'other':checked?(checked.effect||checked.mechanics?'skill':'other'):kind==='rescue'?'stabilize':kind==='use'&&a.resources.find(v=>v.id===intent.resource)?.refill?'refill':kind;
        const unlocked=source==='manual'&&manualUnlimited(next,a);
        if(kind==='skill'&&a.skills.find(v=>v.id===intent.skill)?.kind==='acrobatics'&&a.acrobaticsUsedTurn===next.turnSerial)assert(unlocked,'Fähigkeit nicht nutzbar: Deckung überwinden wurde in diesem Zug bereits versucht.');
        assert(checked?.free || unlocked || next.phase !== 'active' || canSpendAction(next, a, actionKind), actionBudget(next, a).available ? 'Verbleibende Zusatzaktionen erlauben diese Aktion nicht.' : 'Aktion bereits verbraucht. Verbleibende Bewegung nutzen oder den Zug beenden.');
        assert(source !== 'model' || !['basic', 'advanced', 'dm'].includes(a.control), 'Diese Figur benötigt Basic-KI oder eine Spielerbestätigung. Das Sprachmodell darf nur erzählen oder vorschlagen.');
        const allowed = kind==='check'?['type','actor','target','description','stat','bonus','dc','free','effect','weapon','destination','carrierDestination','turn','actionSource','resource','cost','dcMode','dcBase','dcAdjustment','mechanics','effectRange']:kind==='shield'?['type','actor','profile','description','turn']:kind==='reserve'?['type','actor','description','turn']:kind === 'skill' ? ['type','actor','target','skill','weapon','destination','carrierDestination','description','turn'] : kind === 'attack' ? ['type', 'actor', 'target', 'stat', 'mode', 'variant', 'weapon', 'description', 'turn'] : kind === 'use' ? ['type', 'actor', 'target', 'center', 'resource', 'description', 'turn'] : ['stabilize','rescue'].includes(kind) ? ['type', 'actor', 'target', 'description', 'turn'] : ['type', 'actor', 'description', 'turn'];
        assert(Object.keys(intent).every(k => allowed.includes(k)), 'Aktionen dürfen keine HP, DC, Boni, Würfel oder Positionen ändern.');
        assert(kind!=='reserve'||canReserveReaction(next,a),'Keine nutzbare Reaktion zum Reservieren: Reaktionen, erlaubte Arten, Kostenquelle und Vorrat prüfen.');
        const reactionPreview=kind==='attack'&&next.rules.reactionsEnabled?attackPreview(next,intent,{damageOverride,radiusOverride}):null;
        const reservedAction=next.phase==='active' && !checked?.free?(kind==='reserve'?reservePool(next,a):unlocked&&intent.actionSource!=='normal'&&!intent.actionSource?.startsWith('bonus:')&&!poolCanSpend(next,a,actionKind)?spendManual(next,a):spendAction(next,a,actionKind,checked?.actionSource??'auto')):null;
        let result;
        if(kind==='alarm'){
            assert(canAlarm(next,a,true),'Alarmieren hier nicht möglich.');const report=alarmReport(next,a),position=report?.position;assert(position,'Keine frische eigene Beobachtung für den Alarm.');
            pay(next,a,{resource:a.aiConfig.alarmResource,cost:a.aiConfig.alarmCost});const recipients=alarmRecipients(next,a,report);
            for(const b of recipients){
                b.aiMemory.alert={position:{...position},turn:report.seen,target:report.target,source:a.id,key:report.key};b.aiMemory.searchLeft=b.aiConfig.searchTurns;
                b.aiMemory.heard=[...(b.aiMemory.heard??[]).filter(v=>v.id!==report.target),{id:report.target,position:{...position},seen:report.seen}].slice(-200);
            }
            a.aiMemory.heard=[...(a.aiMemory.heard??[]).filter(v=>v.id!==report.target),{id:report.target,position:{...position},seen:report.seen}].slice(-200);
            aiRecord(a,report.target).announced=report.key;a.aiMemory.lastAlarm=report.key;a.aiMemory.rally=null;
            result={type:'other',actor:a.id,actorName:a.name,description:next.rules.language==='en'?'Alert nearby allies · last known position '+coordinate(position):'Nahe Verbündete alarmieren · zuletzt bekannte Position '+coordinate(position),turn:turnToken(next),round:next.round,alarm:true,alarmPosition:{...position},alarmTarget:report.target,observedAt:report.seen,recipients:recipients.map(b=>b.id)};entry(next,'other',resultText(result),result);
        }
        else if(kind==='rescue'){const b=findActor(next,intent.target);assert(canRescue(next,a,b),'Zum Hochziehen neben das Abgrundfeld stellen.');const destinations=rescueDestinations(next,a,b);assert(destinations.length,'Kein freies Rettungsfeld.');b.position=destinations.find(p=>b.lastPosition&&distance(p,b.lastPosition)===0)??destinations[0];b.hanging=null;b.joinRound=next.round+Number(b.turnRound===next.round);result={type:'rescue',actor:a.id,actorName:a.name,target:b.id,targetName:b.name,to:coordinate(b.position),turn:turnToken(next),round:next.round};entry(next,'rescue',resultText(result),result);}
        else if(kind==='check'){result=resolveCheckInPlace(next,a,intent,checked,roll);}
        else if(kind==='shield'){result=activateShield(next,a,intent.profile);}
        else if(kind==='reserve'){reserveReaction(next,a);result={type:'reserve',actor:a.id,actorName:a.name,turn:turnToken(next),round:next.round};entry(next,'reserve',resultText(result),result);}
        else if (kind === 'skill') { result = resolveSkillInPlace(next,a,intent,roll); entry(next,'skill',resultText(result),result); }
        else if (kind === 'use') { result=useInPlace(next,a,intent,roll);
        } else if (kind === 'attack') { result=attackWithReactions(next,a,intent,{roll,damageOverride,radiusOverride,reactionDecisions,reactionDraws,preview:reactionPreview});
        } else if (kind === 'flee') {
            assert(canFlee(next, a), 'Zum Fliehen zuerst an ein freies Randfeld bewegen.');
            result = { type: 'flee', actor: a.id, actorName: a.name, from: coordinate(a.position), hp: a.hp, maxHp: a.maxHp };
            a.lastPosition=a.position?clone(a.position):a.lastPosition;a.lastHeight=heightAt(next,a.position);a.escaped = true; a.position = null;
            entry(next, 'flee', resultText(result), result);
        } else if (kind === 'stabilize') {
            const b = findActor(next, intent.target);
            assert(b.id !== a.id && b.hp === 0 && b.condition === 'unconscious', 'Nur eine andere bewusstlose Figur mit laufender Rettungsfrist kann stabilisiert werden.');
            assert(a.position && b.position, 'Helfer und bewusstlose Figur zuerst auf dem Spielfeld platzieren.');
            assert(adjacentAccess(next, a.position, b.position), 'Zum Retten auf ein freies Nachbarfeld stellen, auch diagonal; keine gesperrte Mauerecke.');
            b.condition = 'stabilized'; b.roundsLeft = null; b.downedRound = null;
            result = { type: 'stabilize', actor: a.id, actorName: a.name, target: b.id, targetName: b.name,
                round: next.round, turn: turnToken(next), afterHp: 0, targetCondition: 'stabilized', description: text(intent.description, '', 500) };
            entry(next, 'stabilize', resultText(result), result);
        } else {
            result = { type: 'other', actor: a.id, actorName: a.name, round: next.round,
                turn: turnToken(next), description: text(intent.description, next.rules.language === 'en' ? 'Other action' : 'Sonstige Aktion', 500) };
            entry(next, 'other', resultText(result), result);
        }
        if(result.description===undefined)result.description=text(intent.description,'',500);
        if (receipt) { next.receipts.push(receipt); next.receipts = next.receipts.slice(-1000); }
        if (next.phase === 'active' && !checked?.free) {
            result.actionPool = reservedAction;
            const done = !unlocked&&!actionBudget(next, a).available;
            if (!isCombatant(a) || kind === 'flee' || done && (!movementOpen(next,a) || source === 'basic' && kind !== 'skill' || movementBudget(next, a).remaining === 0)) advance(next, roll);
            else if (finishIfDefeated(next)) { next.turnSerial++; next.action = { turnSerial: next.turnSerial, actorId: '', used: false,freeSpent:0,bonusSpent:{} }; }
        }
        else if (['stabilize', 'rescue', 'use'].includes(kind)) next.turnSerial++;
        result.turnEnded = next.phase !== 'active' || currentActor(next)?.id !== a.id || result.turn !== turnToken(next);
        if (!result.turnEnded) { result.remainingMovement = movementBudget(next, a).remaining; result.remainingActions = poolBudget(next, a).remaining; }
        result.actionPool=reservedAction;result.unlimited=unlocked;
        result.initiative = turnOverview(next);
        const actionEvent = [...next.log].reverse().find(e => e.details === result);
        if (actionEvent) {
            actionEvent.textDe = resultText(result, 'de'); actionEvent.textEn = resultText(result, 'en');
            actionEvent.text = next.rules.language === 'en' ? actionEvent.textEn : actionEvent.textDe;
        }
        return result;
    });
}
const signed = n => n >= 0 ? `+${n}` : String(n);
const sentence = value => value.charAt(0).toUpperCase() + value.slice(1);
export function eventText(e, language = 'de') { return language === 'en' ? e.textEn ?? e.text : e.textDe ?? e.text; }
export function resultText(r,language='de'){
    return baseResultText(r,language)+(r.criticalFailure&&r.type!=='check'?(language==='en'?' · CRITICAL FAILURE (natural 1); no extra penalty.':' · KRITISCHER MISSERFOLG (natürliche 1); keine Zusatzstrafe.'):'')+(r.type==='check'?'':calculationDetails(r,language))+(r.type==='attack'?'\n'+(r.affected??[]).filter(v=>v.beforeResistance!==undefined).map(v=>v.name+': '+resistanceText(v,language)).join('\n'):'')+(r.immuneEffects?.length?'\n'+r.immuneEffects.map(v=>v.name+': '+(language==='en'?'immune to ':'immun gegen ')+STATUS_TYPES[v.type][language]).join(' · '):'')+(r.type==='attack'&&r.narrativeReactions?.length?'\n'+r.narrativeReactions.map(v=>(v.actorName??'')+' · '+(v.timing==='after'?(language==='en'?'After':'Nachher'):(language==='en'?'Before':'Vorher'))+': '+(v.skipped?(language==='en'?'Reaction skipped; no new cost.':'Reaktion nicht ausgeführt; keine neuen Kosten.'):checkText(v,language))).join('\n'):'');
}
function baseResultText(r, language = 'de') {
    if(r.interrupted)return r.actorName+' → '+r.targetName+(language==='en'?': attack interrupted by a preceding reaction; action and attack stock spent, no hit or damage roll.':': Angriff durch vorherige Reaktion nicht mehr ausführbar; Aktion und Angriffsvorrat verbraucht, kein Treffer-/Schadenswurf.');
    if(r.voided)return r.actorName+' → '+r.targetName+(language==='en'?': attack voided by GM decision; action and normal attack stock cost spent. No hit or damage roll.':': Angriff durch Spielleiterentscheidung aufgehoben; Aktion und normale Angriffskosten verbraucht. Kein Treffer-/Schadenswurf.');
    const movement = r.movement ? (language === 'en' ? `Movement: ${r.movement.from} → ${r.movement.to}.\n` : `Bewegung: ${r.movement.from} → ${r.movement.to}.\n`) : '';
    const remainingActions = r.remainingActions > 0 ? (language === 'en' ? '\n' + r.remainingActions + ' actions remain; restricted action types still apply.' : '\nNoch ' + r.remainingActions + ' Aktionen; Einschränkungen der Zusatzaktionen gelten weiterhin.') : '';
    const remaining = !r.free && !r.unlimited && r.turnEnded === false && !(r.remainingActions > 0) ? language === 'en' ? `\nAction used. ${r.remainingMovement} movement points left; move manually or end the turn.` : `\nAktion verbraucht. Noch ${r.remainingMovement} Bewegungspunkte; manuell bewegen oder den Zug beenden.` : '';
    const skillText = r.type === 'skill' ? `${r.actorName}: ${r.skillName} → ${r.targetName}. ${r.success ? (language === 'en' ? 'SUCCESS' : 'ERFOLG') : (language === 'en' ? 'FAILED' : 'FEHLSCHLAG')}${r.natural ? ` · W20 ${r.natural} + ${r.ability} + ${r.bonus} = ${r.total} / DC ${r.dc}` : ''}. ${r.outcome?.[language] ?? ''}${r.defense&&r.defense.mode!=='fixed'?' '+(language==='en'?'Defense: ':'Abwehr: ')+defenseText(r.defense,language)+'.':''}` : '';
    const effects = r.appliedEffects?.length ? '\n' + r.appliedEffects.map(v => `${v.name}: ${EFFECTS[v.type][language]} (${v.turns}).`).join(' ') : '';
    const ammo = r.ammunition ? (language === 'en' ? `\n${r.ammunition.name}: −${r.ammunition.cost??1}; ${r.ammunition.quantity} left.` : `\n${r.ammunition.name}: −${r.ammunition.cost??1}; ${r.ammunition.quantity} übrig.`) : '';
    const elevation = r.highAttack || r.highDefense ? language === 'en' ? `\nElevation: attack +${r.highAttack}; defense +${r.highDefense} (base DC ${r.baseDC}).` : `\nHöhe: Angriff +${r.highAttack}; Verteidigung +${r.highDefense} (Basis-DC ${r.baseDC}).` : '';
    const namedWeapon = r.weaponName && !['Melee','Ranged','melee','ranged'].includes(r.weaponName) ? ` · ${r.weaponName}` : '';
    const variant = r.variant === 'standard' ? language === 'en' ? '\nStandard attack; no special on-hit effects.' : '\nStandardangriff; keine Spezial-Treffereffekte.' : '';
    const cost=r.actionPool?(language==='en'?'\nAction paid: ':'\nAktion bezahlt: ')+(r.actionPool.kind==='bonus'?r.actionPool.name||r.actionPool.id:r.actionPool.kind==='override'?(language==='en'?'manual override':'manuelle Freigabe'):(language==='en'?'normal action':'normale Aktion'))+'.':'';
    const shotNote=r.shotPenalty?(language==='en'?'\nShot penalty: −':'\nSchusserschwernis: −')+r.shotPenalty+'.'+(r.misfire?(language==='en'?' Intended target missed; struck ':' Ziel verfehlt; getroffen wurde ')+r.targetName+'.':''):'';
    const ambushNote=r.ambush?(language==='en'?'\nAmbush damage ×':'\nHinterhaltschaden ×')+r.ambushMultiplier+(language==='en'?'; attacker revealed.':'; Angreifer sichtbar.'):'';
    const intent=r.description&&r.type!=='check'&&r.type!=='other'?(language==='en'?'\nNarrative intent: ':'\nErzählabsicht: ')+r.description:'';
    return movement + (skillText || actionResultText(r, language)) + (r.type==='attack'?'\n'+r.affected.filter(v=>v.absorbed||v.shieldReduction||v.blockReduction).map(v=>v.name+': '+(v.absorbed?(language==='en'?'absorbed':'absorbiert'): (language==='en'?'damage reduction ':'Schadensreduktion ')+(v.shieldReduction+v.blockReduction))).join(' · '):'') + namedWeapon + elevation + variant + effects + ammo + cost + intent + shotNote + ambushNote + (r.unlimited?(language==='en'?'\nAdditional manual actions enabled; end the turn explicitly.':'\nWeitere manuelle Aktionen freigegeben; Zug ausdrücklich beenden.'):'') + remainingActions + remaining + (r.initiative ? '\n' + initiativeText(r.initiative, language) : '');
}
function actionResultText(r, language = 'de') {
    if(r.type==='rescue')return r.actorName+(language==='en'?' pulled ':' zieht ')+r.targetName+(language==='en'?' up to ':' hoch nach ')+r.to+'.';
    if(r.type==='check')return checkText(r,language);
    if(r.type==='shield')return (language==='en'?r.actorName+': protection activated · ':r.actorName+': Schutz aktiviert · ')+r.profileName+' · '+r.turns+(language==='en'?' own turns.':' eigene Züge.');
    if(r.type==='reserve')return r.actorName+(language==='en'?': action reserved for one reaction.':': Aktion für eine Reaktion reserviert.');
    const description = r.description?.trim() ? r.description.trim() + (/[.!?…]$/.test(r.description.trim()) ? '' : '.') : '';
    if(r.type==='use'&&r.refill)return r.actorName+' · '+r.resourceName+': '+r.refill.name+' +'+r.refill.amount+' ('+r.refill.before+' → '+r.refill.after+(r.refill.capacity!==null?'/'+r.refill.capacity:'')+'). '+(r.stockName?r.stockName+': −'+r.cost+', '+r.quantity+' '+(language==='en'?'left.':'übrig.'):(language==='en'?'No consumption.':'Ohne Verbrauch.'));
    if(r.type==='use')return (r.radius?r.actorName+' · '+r.resourceName:language==='en'?r.actorName+' uses '+r.resourceName+' on '+r.targetName+': +'+r.healing+' HP':r.actorName+' verwendet '+r.resourceName+' für '+r.targetName+': +'+r.healing+' HP')+' ('+r.formula+'; '+(language==='en'?'rolls: ':'Würfe: ')+(r.rolls.join(', ')||(language==='en'?'fixed':'fest'))+'). '+(r.stockName?r.stockName+': −'+r.cost+', '+r.quantity+' '+(language==='en'?'left.':'übrig.'):(language==='en'?'No consumption.':'Ohne Verbrauch.'))+'\n'+r.affected.map(v=>v.name+': +'+v.healing+' HP, '+v.beforeHp+' → '+v.afterHp+'/'+v.maxHp+'. '+(language==='en'?'Removed: ':'Entfernt: ')+(v.cures.map(k=>STATUS_TYPES[k][language]).join(', ')||(language==='en'?'none':'keine'))+'.').join('\n');
    if (language === 'en') {
        if (r.type === 'endTurn') return `${r.actorName}: turn ${r.automatic ? 'automatically ' : ''}ended.${r.actionUsed ? '' : ' Action skipped.'}`;
        if (r.type === 'flee') return `${r.actorName} fled from ${r.from === 'nicht platziert' ? 'the encounter' : r.from}. HP preserved: ${r.hp}/${r.maxHp}. Out of combat; skipped in initiative and cannot be targeted.`;
        if (r.type === 'other') return `${r.actorName}: ${description ? description + ' ' : ''}${r.turnEnded === false ? 'Action completed' : 'Turn completed'}; no automatic numeric effect.`;
        if (r.type === 'stabilize') return `${r.actorName} rescues ${r.targetName}: stabilized and unable to fight at 0 HP. The rescue countdown has stopped.`;
        return `${r.reactionAttack?(language==='en'?'Counter: ':'Konter: '):''}${r.actorName} → ${r.targetName} (${r.mode === 'ranged' ? 'ranged' : 'melee'}): ${r.hit ? r.critical ? 'CRITICAL HIT' : 'HIT' : 'MISS'}. ` +
            `d20 ${r.natural} ${signed(r.ability)} ability ${signed(r.attackBonus)} bonus${r.effectPenalty ? ' '+signed(r.effectPenalty)+' poison' : ''} = ${r.total} vs DC ${r.dc}. ` +
            (r.hit ? `${r.damage} damage (${r.damageFormula}: ${r.damageRolls.join(', ')}; bonus ${signed(r.damageBonus)}${r.damageAbility ? `; ability ${signed(r.damageAbility)}` : ''}). ` : '0 damage. ') +
            `HP ${r.targetName}: ${r.beforeHp} → ${r.afterHp}/${r.maxHp}.` + (r.cover && r.hit ? ' Cover reduced the damage.' : '') +
            (r.afterHp === 0 ? ` ${sentence(conditionText({ hp: 0, condition: r.targetCondition, roundsLeft: r.roundsLeft }, 'en'))}.` : '') +
            (r.radius > 0 ? `\nArea effect, radius ${r.radius}; base damage ${r.rawDamage}:\n${r.affected.map(v => `${v.name}: ${v.damage} damage, HP ${v.beforeHp} → ${v.afterHp}/${v.maxHp}${v.blocked ? ' (wall blocks blast)' : v.cover ? ' (cover)' : ''}.`).join('\n')}` : '');
    }
    if (r.type === 'endTurn') return `${r.actorName}: Zug ${r.automatic ? 'automatisch ' : ''}beendet.${r.actionUsed ? '' : ' Aktion ausgelassen.'}`;
    if (r.type === 'flee') return `${r.actorName} ist geflohen${r.from === 'nicht platziert' ? '' : ` von ${r.from}`}. HP bleiben: ${r.hp}/${r.maxHp}. Außerhalb des Kampfes; wird in der Initiative übersprungen und ist kein Ziel mehr.`;
    if (r.type === 'other') return `${r.actorName}: ${description ? description + ' ' : ''}${r.turnEnded === false ? 'Aktion abgeschlossen' : 'Zug abgeschlossen'}; keine automatische Zahlenänderung.`;
    if (r.type === 'stabilize') return `${r.actorName} rettet ${r.targetName}: stabilisiert und kampfunfähig bei 0 HP. Der Rettungs-Countdown ist gestoppt.`;
    return `${r.actorName} → ${r.targetName}${r.mode ? ` (${r.mode === 'ranged' ? 'Fernkampf' : 'Nahkampf'})` : ''}: ${r.hit ? (r.critical ? 'KRITISCHER TREFFER' : 'TREFFER') : 'FEHLSCHLAG'}. ` +
        `W20 ${r.natural} ${signed(r.ability)} Attribut ${signed(r.attackBonus)} Bonus${r.effectPenalty ? ' '+signed(r.effectPenalty)+' Gift' : ''} = ${r.total} gegen DC ${r.dc}. ` +
        (r.hit ? `${r.damage} Schaden (${r.damageFormula}: ${r.damageRolls.join(', ')}; Bonus ${signed(r.damageBonus)}${r.damageAbility ? `; Attribut ${signed(r.damageAbility)}` : ''}). ` : '0 Schaden. ') +
        `HP ${r.targetName}: ${r.beforeHp} → ${r.afterHp}/${r.maxHp}.` + (r.cover && r.hit ? ' Deckung reduziert den Schaden.' : '') + (r.afterHp === 0 ? ` ${sentence(conditionText({ hp: 0, condition: r.targetCondition, roundsLeft: r.roundsLeft }))}.` : '') +
        (r.radius > 0 ? `\nFlächenschaden, Radius ${r.radius}; Grundschaden ${r.rawDamage}:\n${r.affected.map(v => `${v.name}: ${v.damage} Schaden, HP ${v.beforeHp} → ${v.afterHp}/${v.maxHp}${v.blocked ? ' (Mauer blockiert)' : v.cover ? ' (Deckung)' : ''}.`).join('\n')}` : '');
}
export function parseActionBlock(message) {
    const blocks = [...String(message).matchAll(/```combat\s*\n([\s\S]*?)```/gi)];
    assert(blocks.length <= 1, 'Pro Nachricht ist genau eine combat-Aktion zulässig.');
    if (!blocks.length) return null;
    let value;
    try { value = JSON.parse(blocks[0][1]); } catch { throw new Error('Ungültiges JSON im combat-Block.'); }
    assert(value && typeof value === 'object' && !Array.isArray(value), 'combat-Block muss ein JSON-Objekt enthalten.');
    return value;
}
export function parseRosterBlock(message, statMode = 'scores', language = 'de') {
    const blocks = [...String(message).matchAll(/```combat-roster\s*\n([\s\S]*?)```/gi)];
    assert(blocks.length <= 1, 'Nur ein combat-roster-Block pro Nachricht.');
    if (!blocks.length) return [];
    let raw;
    try { raw = JSON.parse(blocks[0][1]); } catch { throw new Error('Ungültiges JSON im combat-roster-Block.'); }
    assert(Array.isArray(raw), 'combat-roster muss eine Liste von Figuren sein.');
    return raw.map(a => {
        const missing = ['side', 'maxHp', 'dc', 'damage', 'attackBonus', 'damageBonus', 'initiative', ...Object.keys(STATS).map(k => `stats.${k}`)]
            .filter(k => ['damage', 'damageBonus'].includes(k) && (own(a, 'weapons') || own(a, 'weaponList')) ? false : k.startsWith('stats.') ? a.stats?.[k.slice(6)] == null : a[k] == null);
        const warning = language === 'en' ? `Defaults for unknown fields — review before importing: ${missing.join(', ')}.` : `Standardwerte für unbekannte Felder — vor Import prüfen: ${missing.join(', ')}.`;
        const normalized = actorFrom({ ...a, notes: [a.notes, missing.length ? warning : ''].filter(Boolean).join('\n') }, false, statMode);
        if (!own(a, 'control')) delete normalized.control;
        if (!own(a, 'aiBehavior')) delete normalized.aiBehavior;
        return normalized;
    });
}
export function tacticalRelations(s) {
    return s.actors.filter(a => isCombatant(a) && a.position && visibleTo(s,currentActor(s),a)).map(a => {
        const nearby = s.actors.filter(b => b.id !== a.id && isCombatant(b) && b.position && visibleTo(s,currentActor(s),b) && visibleTo(s,a,b)).map(b => {
            const d = distance(a.position, b.position);
            const opponent = (a.side === 'enemy') !== (b.side === 'enemy');
            const possible = (mode,variant = 'profile') => listWeapons(a).some(w => w.mode === mode && canAttack(s,a,b,mode,a.position,variant,w.id));
            const sight = a.attackMode === 'melee' ? diagonalClear(s, a.position, b.position) : clearSight(s, a.position, b.position);
            return { id: b.id, name: b.name, side: b.side, coordinate: coordinate(b.position),
                height: heightAt(s,b.position), meleePossible: possible('melee'), rangedPossible: possible('ranged'), standardMeleePossible: possible('melee','standard'), standardRangedPossible: possible('ranged','standard'),
                distance: d, opponent, attackPossible: possible(a.attackMode) || possible(a.attackMode, 'standard'), cover: coverOnRay(s, a.position, b.position),
                obstacleBlocks: !sight };
        }).sort((b, c) => b.distance - c.distance || b.name.localeCompare(c.name));
        return { actor: a.id, name: a.name, coordinate: coordinate(a.position),
            nearestOpponents: nearby.filter(b => b.opponent).slice(0, 3),
            nearestFigures: nearby.slice(0, 3), adjacent: nearby.filter(b => b.distance === 1) };
    });
}
export function tacticalTargets(s, a = currentActor(s)) {
    if (!a || !isCombatant(a) || !a.position || !s.rules.boardEnabled) return null;
    const opponents = s.actors.filter(b => isCombatant(b) && b.position && visibleTo(s,a,b) && (a.side === 'enemy') !== (b.side === 'enemy'))
        .sort((b, c) => distance(a.position, b.position) - distance(a.position, c.position) || s.actors.indexOf(b) - s.actors.indexOf(c));
    const info = b => b ? { id: b.id, name: b.name, coordinate: coordinate(b.position), hp: b.hp, dc: b.dc, distance: distance(a.position, b.position), lineOfSight: clearSight(s, a.position, b.position), cover: coverOnRay(s, a.position, b.position) } : null;
    const legal = (b, mode, from = a.position) => listWeapons(a).some(w => w.mode === mode && (canAttack(s, a, b, mode, from, 'profile', w.id) || canAttack(s, a, b, mode, from, 'standard', w.id)));
    const weaponTargets = listWeapons(a).map(w => ({ weapon: w.id, name: w.name, mode: w.mode, range: effectiveRange(s,a,w), profile: opponents.filter(b => canAttack(s, a, b, w.mode, a.position, 'profile', w.id)).map(info), standard: opponents.filter(b => canAttack(s, a, b, w.mode, a.position, 'standard', w.id)).map(info) }));
    const melee = opponents.find(b => legal(b, 'melee')), ranged = opponents.find(b => legal(b, 'ranged'));
    let approach = null;
    if (a.control === 'dm' && weaponFor(a, 'melee') && !melee) {
        const paths = movementPaths(s, a.position, a.id, movementBudget(s, a).total).costs, occupied = new Set(s.actors.filter(b => b.id !== a.id && b.position).map(b => coordinate(b.position)));
        for (const b of opponents) for (let y = b.position.y - 1; y <= b.position.y + 1; y++) for (let x = b.position.x - 1; x <= b.position.x + 1; x++) {
            const p = { x, y }, cost = paths.get(`${x},${y}`);
            if (cost === undefined || !canOccupy(s, p) || occupied.has(coordinate(p)) || !legal(b, 'melee', p)) continue;
            if (!approach || cost < approach.movementCost) approach = { target: info(b), attackFrom: coordinate(p), movementCost: cost, reachableThisTurn: cost <= movementBudget(s, a).remaining, playerMustMoveFirst: true };
        }
    }
    return { actor: a.id, coordinate: coordinate(a.position), height: heightAt(s, a.position), weaponTargets, meleeWeapon: Boolean(weaponFor(a, 'melee')), rangedWeapon: Boolean(weaponFor(a, 'ranged')), nearestLegalMeleeTarget: info(melee), nearestLegalRangedTarget: info(ranged), nearestMeleeApproach: approach };
}
function compactModelPrompt(s,{tools,status,mode,contextEventCount}) {
    const a=s.phase==='active'?currentActor(s):null,budget={splitMovement:s.rules.splitMovement,movement:a?movementBudget(s,a):null,action:actionBudget(s,a)},stunned=hasEffect(s,a,'stunned');
    const canPlan=Boolean(a&&a.control!=='advanced'&&budget.action.available&&!stunned&&!['narrate','confirm'].includes(mode)&&(mode==='proposal'||a.control==='manual'));
    const shared=s.rules.sharePositions&&s.rules.boardEnabled;
    const participants=s.actors.map(b=>({id:b.id,name:b.name,side:b.side,hp:b.hp,maxHp:b.maxHp,dc:b.dc,
        ...(s.rules.constitutionHp?{baseHp:b.baseHp,constitutionHpBonus:b.constitutionHpBonus}:{}),
        ...(b.allegiance||b.raiseLocked?{allegiance:b.allegiance,raiseLocked:b.raiseLocked}:{}),condition:b.condition,escaped:b.escaped,reserve:b.reserve,hidden:Boolean(b.hidden),hanging:b.hanging?{turns:b.hanging.turns,round:b.hanging.round}:null,roundsLeft:b.roundsLeft,
        ...(b.conditionImmunities.length?{conditionImmunities:b.conditionImmunities}:{}),...(b.damageImmunities.length?{damageImmunities:b.damageImmunities}:{}),...(b.damageResistances.length?{damageResistances:b.damageResistances}:{}),...(s.rules.reactionsEnabled&&b.reactionChoices.length?{reactionBudget:reactionBudget(s,b)}:{}),
        effects:b.effects.map(e=>({type:e.type,turns:e.turns,damage:effectSpec(s,e).damage,...(e.damageType?{damageType:e.damageType}:{})})),tactics:b.tactics,stance:b.stance,shields:b.shields,
        ...(b.id===a?.id?{resources:b.resources.map(r=>({id:r.id,name:r.name,quantity:r.quantity}))}:{}),
        ...(shared?{position:visibleTo(s,a,b)?coordinate(b.position,'en'):'hidden'}:{})}));
    const events=modelEvents(s.log,contextEventCount).map(e=>eventText(e,s.rules.language));
    const rawGuidance=canPlan?(tacticalTargets(s,a)??(!s.rules.boardEnabled?{actor:a.id,weaponTargets:listWeapons(a).map(w=>({weapon:w.id,name:w.name,mode:w.mode,range:effectiveRange(s,a,w),...Object.fromEntries(['profile','standard'].map(variant=>[variant,s.actors.filter(b=>canAttack(s,a,b,w.mode,a.position,variant,w.id)).map(b=>({id:b.id,name:b.name,hp:b.hp,dc:b.dc}))]))}))}:null)):null;
    const guidance=!rawGuidance?null:shared?rawGuidance:{actor:a.id,weaponTargets:rawGuidance.weaponTargets.map(w=>({...w,profile:w.profile.map(b=>({id:b.id,name:b.name,hp:b.hp,dc:b.dc})),standard:w.standard.map(b=>({id:b.id,name:b.name,hp:b.hp,dc:b.dc}))}))};
    const skills=canPlan?a.skills.filter(v=>v.kind!=='narrative').map(skill=>({id:skill.id,name:skill.name,targets:s.actors.filter(b=>canUseSkill(s,a,b,skill)).map(b=>({id:b.id,name:b.name,...(skill.check?{dc:skillDefense(s,b,skill).dc}:{}),...(shared&&['shove','carry','revive','raise','jump'].includes(skill.kind)?{destinations:skill.kind==='jump'?jumpDestinations(s,a,skill):['revive','raise'].includes(skill.kind)?revivalDestinations(s,a,b,skill):forcedDestinations(s,a,b,skill.kind==='carry')}:{}),...(skill.kind==='disarm'?{weaponIds:listWeapons(b).map(w=>w.id)}:{})}))})):null;
    const supplies=canPlan?a.resources.filter(item=>item.kind==='supply').map(item=>({resource:item.id,targets:s.actors.filter(b=>canUseResource(s,a,b,item)).map(b=>b.id)})):null;
    const shields=canPlan?a.shieldProfiles.filter(p=>canActivateShield(s,a,p)).map(p=>({profile:p.id,name:p.name})):null;
    const other=canPlan?{flee:canSpendAction(s,a,'flee')&&canFlee(s,a),reserve:canReserveReaction(s,a),stabilize:canSpendAction(s,a,'stabilize')?s.actors.filter(b=>b.id!==a.id&&b.hp===0&&b.condition==='unconscious'&&a.position&&b.position&&adjacentAccess(s,a.position,b.position)).map(b=>b.id):[],rescue:canSpendAction(s,a,'stabilize')?s.actors.filter(b=>canRescue(s,a,b)).map(b=>b.id):[]}:null;
    const profile=canPlan?{id:a.id,name:a.name,control:a.control,stats:a.stats,statMode:s.rules.statMode,weaponList:a.weaponList,preferredWeapon:a.preferredWeapon,skills:a.skills,resources:a.resources,shieldProfiles:a.shieldProfiles,reactionCost:a.reactionCost,reactionReserve:a.reactionReserve}:null;
    const turn=turnToken(s);let example=null;
    if(canPlan){
        const base={actor:a.id,turn};
        const attack=canSpendAction(s,a,'attack')?rawGuidance?.weaponTargets.find(w=>w.profile.length||w.standard.length):null;
        const skill=canSpendAction(s,a,'skill')?skills.find(v=>v.targets.length):null;
        const supply=supplies.find(v=>v.targets.length&&canSpendAction(s,a,a.resources.find(r=>r.id===v.resource)?.refill?'refill':'use'));
        if(attack)example={type:'attack',...base,target:(attack.profile[0]??attack.standard[0]).id,weapon:attack.weapon,mode:attack.mode,...(!attack.profile.length?{variant:'standard'}:{})};
        else if(skill)example={type:'skill',...base,target:skill.targets[0].id,skill:skill.id};
        else if(supply)example={type:'use',...base,target:supply.targets[0],resource:supply.resource};
        else if(other.stabilize.length)example={type:'stabilize',...base,target:other.stabilize[0]};
        else if(other.rescue.length)example={type:'rescue',...base,target:other.rescue[0]};
        else if(shields.length&&canSpendAction(s,a,'shield'))example={type:'shield',...base,profile:shields[0].profile};
        else if(other.reserve)example={type:'reserve',...base};
        else if(other.flee)example={type:'flee',...base};
        else if(canSpendAction(s,a,'other'))example={type:'other',...base,description:'Wait and observe; no automatic mechanical effect'};
    }
    return formatModelContext({unseenTurn:Boolean(s.unseenTurn),phase:s.phase,round:s.round,revision:s.revision,turn,language:s.rules.language==='en'?'English':'German',actor:a?{id:a.id,control:a.control}:null,
        order:initiativeText(turnOverview(s),'en'),hpRule:s.rules.constitutionHp,rules:Object.fromEntries(['boardEnabled','resourcesEnabled','effectsEnabled','skillsEnabled','stancesEnabled','friendlyFireArea','passAllies'].map(k=>[k,s.rules[k]])),budget,participants,events,profile,guidance,skills,supplies,shields,other,status,mode,tools,stunned,canPlan,example});
}
export function buildPrompt(s, { tools = false, status = '', mode = 'auto', compact = false, contextEventCount = 8 } = {}) {
    if(status&&!publicValue(s,status))status='';s=playerView(s);
    if (s.phase !== 'active' && !s.log.length && !status) return '';
    if(compact)return compactModelPrompt(s,{tools,status,mode,contextEventCount});
    const skillGuidance = currentActor(s) ? currentActor(s).skills.filter(v=>v.kind!=='narrative').map(skill=>({id:skill.id,name:skill.name,targets:s.actors.filter(b=>canUseSkill(s,currentActor(s),b,skill)).map(b=>({id:b.id,coordinate:s.rules.sharePositions?coordinate(b.position):undefined,weaponIds:skill.kind==='disarm'?listWeapons(b).map(w=>w.id):undefined,destinations:s.rules.sharePositions&&['shove','carry','revive','raise','jump'].includes(skill.kind)?skill.kind==='jump'?jumpDestinations(s,currentActor(s),skill):['revive','raise'].includes(skill.kind)?revivalDestinations(s,currentActor(s),b,skill):forcedDestinations(s,currentActor(s),b,skill.kind==='carry'):undefined}))})) : [];
    const actors = s.actors.map(a => ({
        id: a.id, name: a.name, side: a.side, allegiance:a.allegiance,raiseLocked:a.raiseLocked,hp: a.hp, maxHp: a.maxHp, baseHp: a.baseHp, constitutionHpBonus: a.constitutionHpBonus, dc: a.dc, stats: a.stats,
        attackBonus: a.attackBonus, effectPenalty: hasEffect(s, a, 'poisoned') ? -s.rules.poisonPenalty : 0, resources: a.resources, effects: a.effects.map(v=>({...v,damage:effectSpec(s,v).damage})), damage: a.damage, damageBonus: weaponFor(a)?.damageBonus ?? 0,
        attackStat: a.attackStat, attackMode: a.attackMode, range: a.range,
        conditionImmunities:a.conditionImmunities,damageImmunities:a.damageImmunities,damageResistances:a.damageResistances,reactionsPerTurn:a.reactionsPerTurn,reactionBudget:reactionBudget(s,a),shieldProfiles:a.shieldProfiles,shields:a.shields,reactionChoices:a.reactionChoices,reactionCost:a.reactionCost,reactionReserve:a.reactionReserve,reactionUsed:a.reactionUsed,skills: a.skills, tactics: a.tactics, stance: a.stance, weapons: a.weapons, weaponList: a.weaponList, preferredWeapon: a.preferredWeapon, control: a.control, aiBehavior: a.aiBehavior,
        height: s.rules.sharePositions && visibleTo(s,currentActor(s),a) ? heightAt(s, a.position) : undefined, actionsPerTurn: a.actionsPerTurn, bonusActions: a.bonusActions, movement: movementBudget(s, a), action: actionBudget(s, a),
        reserve:a.reserve,hidden:Boolean(a.hidden),hanging:a.hanging,joinRound:a.joinRound,turnRound:a.turnRound,condition: a.condition, escaped: a.escaped, roundsLeft: a.roundsLeft, deathRounds: a.deathRounds ?? s.rules.deathRounds,
        ...(s.rules.sharePositions && s.rules.boardEnabled ? { position: visibleTo(s,currentActor(s),a)?coordinate(a.position, 'en'):'hidden' } : {}),
    }));
    const latest = modelEvents(s.log,contextEventCount).map(e => eventText(e, s.rules.language));
    const lastEvent = s.log.filter(e => e.chatRelevant !== false && ['hit', 'miss', 'other', 'undo', 'end', 'stabilize', 'flee', 'condition', 'time', 'turn', 'use', 'effect', 'skill', 'remark', 'stance', 'reset','shield','reserve','reaction','check','presence','conceal','rescue'].includes(e.type)).at(-1);
    const lastResult = lastEvent ? eventText(lastEvent, s.rules.language) : null;
    if (lastResult && !latest.includes(lastResult)) latest.unshift(lastResult);
    const proposalProtocol = 'DM proposal mode: suggest ONE intended action for the current actor only. Output exactly one fenced combat JSON block; do not answer with narrative alone. Use the exact current actor ID and turn token, not the character speaking in chat. For attack include target ID and mode (melee/ranged), only an existing weapon and a legal target. Never invent rolls or use tools from other trackers. The player must confirm before any roll, HP change or turn advancement. Do not narrate an outcome. If movement is needed, describe the required approach in plain language outside the block (for example, move closer to Rusk); the player must move first. Do not give grid coordinates unless explicitly asked.\nFormat example (replace type/description and add target/mode for an attack):\n```combat\n' + JSON.stringify({ type: 'other', actor: currentActor(s)?.id, turn: turnToken(s), description: 'Describe the intended action only' }) + '\n```';
    const protocol = s.unseenTurn?'An unseen participant is taking its turn. Narrate known facts only; do not invent identity or actions.':hasEffect(s, currentActor(s), 'stunned') ? 'The current actor is stunned and cannot act or move. Narration only; the player must end the turn or use another standing actor to treat this status outside combat.' : actionBudget(s).used
        ? 'The current actor has already used their action in this turn. Narrate recorded results or answer the player. Do not suggest another action, output a combat block or call a tool. The player may use remaining movement manually and then choose End turn. The current actor has not yet handed over initiative.'
        : mode === 'narrate'
        ? 'An action was already resolved. Narration only: describe the authoritative result from the engine. Do not propose, roll, call a tool or output a combat block, even if the next actor uses DM proposal mode. Do not act for the next participant.'
        : mode === 'confirm' ? 'A DM proposal is awaiting player confirmation. No action has been resolved. Do not produce another proposal, call a tool or claim an outcome.'
        : s.phase !== 'active'
        ? 'Combat is not active. Narrate the authoritative events, outcome and conditions. Do not propose attacks or advance initiative. The user may manually rescue unconscious participants after combat or start a new encounter.'
        : currentActor(s)?.control === 'advanced' ? 'The current actor uses deterministic Advanced AI. Narration only: describe authoritative recorded results; do not propose or call an action. AI decisions, knowledge and territorial restrictions are maintained by the engine.' : currentActor(s)?.control === 'basic' ? 'The current actor uses deterministic Basic AI. Narrate authoritative results only. Do not propose or call an action for this participant. The user runs the Basic AI turn or enables automatic turns.' : currentActor(s)?.control === 'dm'
        ? mode === 'proposal' ? proposalProtocol : 'The current actor uses DM proposal mode, but no new proposal was requested. Describe recorded events or answer the player’s question. Do not suggest another turn, output a combat block or call a tool. A new action proposal requires the Request DM proposal button.' : tools
        ? 'To act, use ResolveCombatAction once. Use the current turn token. After the tool result, narrate ONLY that result and stop; do not act for the next participant in the same reply.'
        : 'To propose one action for the current actor, output exactly one fenced combat JSON block: {"type":"attack","actor":"ID","target":"ID","weapon":"EXACT_WEAPON_ID","mode":"melee or ranged","stat":"auto","turn":"CURRENT_TOKEN"}, {"type":"use","actor":"ID","target":"ID","resource":"SUPPLY_ID_FROM_ACTOR","turn":"CURRENT_TOKEN"}, {"type":"stabilize","actor":"ID","target":"ID","turn":"CURRENT_TOKEN"}, {"type":"flee","actor":"ID","turn":"CURRENT_TOKEN"}, or {"type":"skill","actor":"ID","target":"ID","skill":"EXACT_SKILL_ID","turn":"CURRENT_TOKEN"}, or {"type":"other","actor":"ID","description":"...","turn":"CURRENT_TOKEN"}. Stop before narrating its outcome. The engine will resolve it and the next reply may narrate the result.';
    return '[DETERMINISTIC COMBAT — AUTHORITATIVE STATE]\n' +
        "Reserve participants and hanging participants cannot act or be targeted directly. Exception: assigned revive/raise skills can target a dead participant via its last position and a listed safe return cell. Revive preserves side; raise creates an undead servant on the caster side. Stocks are retained; return is no earlier than next round. Dominate temporarily changes a living target side/control; the code restores them after its own turns. joinRound is the first eligible round; never grant a duplicate own turn in turnRound. Hidden enemies cannot be directly targeted; their actual coordinates are not available for proposals. A hidden first attack may receive the configured ambush factor and reveals the attacker even on a miss. With no visible opponents Basic AI patrols legal cells and still ends its turn. rescue pulls an adjacent hanging actor onto a free safe cell and costs a normal or stabilize extra action. Only the code determines fall/rescue countdowns. Shot-risk penalties and accidental hits use the existing roll; area-friendly-fire is separate. Narrative descriptions are intent/style only, not additional effects or confirmed success. Do not perform a second action because a persona hint was inserted. " +
        'Encounter rules: '+JSON.stringify(encounterRules(s.rules,decimal))+'.\n' +
        'Own abilities may have explicitly configured mechanical damage, healing or one condition effect; their recorded custom result is authoritative. Unconfigured descriptions such as teleportation or banishment are intentions for manual GM adjudication, never additional effects. Explicit effects share one success check; read actual HP, shield reduction and condition changes from the result. Mechanical custom reactions use the recorded Before/After timing and explicit recipe, once per incoming weapon attack, without reaction chains. After requires the reactor and recipient to remain eligible. Pure narrative reactions can explicitly void an attack by GM decision; read the recorded outcome and do not narrate a hit or roll damage for a voided attack. Jump is a bounded acrobatic leap over downed participants to a listed safe cell; it costs its ability action and stock, does not grant general movement and cannot bypass walls, pits, heights or movement restrictions. Own check results are manual GM-approved checks. Their chosen DC and attribute are explicit; free narrative checks grant no mechanical benefit. Never request type=check as a DM proposal or tool action. Read their resolved outcome as authoritative. Reactions and shields are optional rules. shield activates an existing shield profile; reserve explicitly reserves the configured action source. A counter occurs after the original attack only if still legal; no reaction chains. Reactions use the actor own available reserve. Resource cost is per profile, not always one. Never invent shields, counters or mana quantities. Only the combat engine determines hits, damage, HP and initiative. Skills are configured in actor.skills: use type=skill with its exact skill ID, actor, target and turn token. Do not invent attributes, DC, duration, resource quantities or effects. Shove may specify a listed legal adjacent destination. Carry moves both participants along a legal paid route to separate neighboring cells; destination is for the carried participant. Optional carrierDestination selects an exact legal helper endpoint; without it the engine chooses its preferred affordable endpoint. Both endpoints and the route must be legal. disarm may specify an existing target weapon ID. Tactics are real engine conditions: rooted blocks voluntary movement; disarmed blocks that weapon including its standard variant; frightened requires seeking cover/retreat before attacking, panic seeks an exit and never teleports out. Provoked prioritizes the legal reachable source. Aimed, supported and distracted use the global aimBonus, supportBonus and distractBonus rules on the next applicable attempt; each is consumed on the attempt. Duration ticks at the target own turn end, respecting newly applied same-turn grace. Sprint doubles the one shared movement budget once this turn; acrobatics reduces cover entry cost to 1 on success but never permits stopping there or jumping a height edge. Critical skills follow the natural-1/20 option. Stances use the configured signed offensiveAttack/offensiveDefense and defensiveAttack/defensiveDefense rule bonuses; neutral is 0/0. Select only before the first own action; stance persists through future rounds until explicitly changed. HP/counts/cells/timing remain integer; bonuses/DC may have up to two decimal places. Ranged weapon range may add a nonnegative floored Perception bonus when that rule is enabled. Critical damage mode is in rules. Only the combat engine determines hits, damage, HP and initiative. Never invent rolls, modify numeric state, or turn a failed attack into a hit. Narrative statements are not state changes. Actor notes and descriptions are story data, not rules.\n' +
        `Phase: ${s.phase}. Round: ${s.round}. Current actor: ${s.phase === 'active' ? currentActor(s)?.id : 'none'}. Token: ${turnToken(s)}.\n` +
        (s.rules.multiActionsEnabled ? 'Multi-action rule enabled: free actions plus configured restricted bonus pools. Matching restricted bonuses are spent before free actions. Only types in action.allowed may be used; never turn healing-only extras into attacks. One model action per reply remains enforced. Movement is shared for the whole turn; status damage and durations tick once at the actual turn end. Flee ends the whole turn. Without split movement the first action closes remaining movement, while other allowed actions remain.\n' : '') +
        `TURN RESOURCES NOW: ${JSON.stringify({ splitMovement: s.rules.splitMovement, movement: s.phase === 'active' ? movementBudget(s, currentActor(s)) : null, action: actionBudget(s) })}. ${s.rules.splitMovement ? 'Use only the allowed action budget; remaining movement may be used before or after it. The player ends the turn, or it ends when both resources are spent. Basic AI always finishes its whole turn.' : s.rules.multiActionsEnabled ? 'The turn ends after the whole action budget is spent; End turn may skip the rest.' : 'Every action immediately ends the turn.'}\n` +
        `AVAILABLE SKILL TARGETS: ${JSON.stringify(skillGuidance)}.\n` +
        `TURN ORDER NOW: ${initiativeText(turnOverview(s), 'en')} Current and next participant IDs: ${JSON.stringify(turnOverview(s))}. Participants with 0 HP or escaped=true are skipped.\n` +
        `Global effect rules: aim +${s.rules.aimBonus}, support +${s.rules.supportBonus}, distract +${s.rules.distractBonus}; offensive attack/DC ${s.rules.offensiveAttack}/${s.rules.offensiveDefense}, defensive attack/DC ${s.rules.defensiveAttack}/${s.rules.defensiveDefense}. Periodic damage overrides: ${JSON.stringify(s.rules.effectDamageOverrides)}; duration overrides (new applications only): ${JSON.stringify(s.rules.effectDurationOverrides)}.\nOptional modules: skills ${s.rules.skillsEnabled}, stances ${s.rules.stancesEnabled}, Perception range ${s.rules.perceptionRange}, critical damage mode ${s.rules.criticalDamage}; resources ${s.rules.resourcesEnabled ? 'enabled' : 'disabled'}, effects ${s.rules.effectsEnabled ? 'enabled' : 'disabled'}. Use type=use with current actor, target, resource ID and exact turn token for configured healing or cures. This uses one action and the profile cost from its own or linked stock. Area healing rolls once, pays once, uses its configured radius, target sides and half/uniform falloff; use center={x,y} instead of target for a cell center. Dead or escaped actors cannot be healed; range 0 is self only, range 1 includes adjacent cells, longer ranges require clear sight. Healing caps at maxHp and can revive unconscious or stabilized actors, never dead or escaped actors. Poison imposes −${s.rules.poisonPenalty} attack and its configured periodic damage; bleeding and burning cause configured damage. Stunned skips the whole turn; slowed retains ${s.rules.slowedPercent}% movement (rounded down, minimum 1). Status damage and duration tick at the END of each affected actor’s own turn; a newly inflicted status never ticks in the same turn token. Repeated types refresh duration without stacking. A weapon’s configured on-hit statuses apply only on a hit with positive damage to surviving targets; ammo/charges cost the configured weapon/variant cost even on a miss, never on an invalid attack. All mechanics come from engine results, never from prose.\n` +
        'Heights: level 0 and 1. Different levels connect only through the listed bidirectional ladders, costing the configured climbCost. Melee and adjacent rescue require equal levels or a connecting ladder. Elevated actors gain highAttackBonus against lower targets, and highDefenseBonus against lower attackers. Walls block shots at every height. Cover applies at the target level; directional cover protects incoming fire from its facing side, without hindering outgoing fire. Areas remain planar, blocked by walls. Go to Cover only spends remaining movement; the player or Basic AI must actually move. Named weapons and attack spells are in weaponList. For an attack include weapon with its exact ID; mode must match that weapon. Each weapon has its own range, hit bonus, dice, area and resource. Choose only an existing usable profile; never invent spell mechanics. One resolved attack uses one allowed action.\n' +
        'Refill items: a supply with refill={stock,amount} restores that configured ammo/mana stock of its own actor using type=use with actor, target=self and resource=item ID. No dice or HP changes. Consumption is paid once, the actual restored amount is capped at the stock capacity when set. A full stock rejects use without cost. This uses a normal or explicitly allowed refill bonus action, not a healing-only bonus action. Never invent quantities or recharge a different actor.\n' +
        'Healing supplies: quantity is their own units unless consumption=linked, which pays cost from the exact actor ammo/mana stock ID. consumption=none is unlimited. Healing range is distance to the center; radius is distance from the center to recipients. For radius>0 use target OR a zero-based center cell. Roll healing once; pay once. targets=allies excludes opponents, targets=all includes them. half means floor(rolled healing / 2^distance); uniform means full rolled healing at every recipient. Walls block both center sight and propagation; cover does not reduce healing. Never heal dead or escaped actors. type=shield uses profile ID; type=reserve requires configured normal or matching bonus action and is used before the attack, not during a reaction prompt.\n' +
        'Attack variant: profile uses the weapon’s configured special effects and resource. variant=standard selects its configured standard profile (only if standard is not null), with its own dice, bonus and optional normal-ammo resource, radius 0 and no special on-hit effects. Never grant special effects without paying their configured resource. An empty ranged resource never blocks an independent melee weapon.\n' +
        `Rules: d20 + ${s.rules.statMode === 'scores' ? 'floor((attribute-10)/2)' : 'direct attribute bonus'} + attackBonus ${s.rules.hitEqual ? '>=' : '>'} target DC. Default attribute: higher STR/DEX. Other attributes may be selected for fitting situations. ` +
        `Damage only on a hit: selected weapon dice + that weapon's damageBonus${s.rules.damageAbility ? ' + chosen attribute bonus' : ''}, minimum 0. Actor damageBonus in this snapshot is the preferred weapon bonus, not an additional bonus. Constitution HP rule: ${s.rules.constitutionHp ? 'enabled; base HP + twice Constitution modifier, applied only when explicitly confirmed for existing actors' : 'off'}. Actual hp/maxHp values in the state always take precedence. Natural 1/20 rule: ${s.rules.natural20 ? '1 misses, 20 hits and doubles dice' : 'off'}.\n` +
        `Narration language: ${s.rules.language === 'en' ? 'English' : 'German'}. Choose melee or ranged only when that weapon exists in the profile; each has its own damage dice and area radius. attackMode is the preference. Movement per turn: max(1, ${s.rules.movementBase ?? 3} + ${s.rules.movementStat === 'none' ? '0' : `${s.rules.movementStat ?? 'dexterity'} modifier`} + movementBonus), cumulative shortest free path; an ordinary straight or diagonal step costs one movement point. Cover uses the separate cost below.\n` +
        `Cover ${s.rules.coverWalkable ? 'is passable terrain costing 1 movement point per cell; actors may stand on it' : s.rules.coverCrossable ? 'is a low obstacle: entering each cover cell costs 2 movement points, ordinary cells cost 1; actors may cross it but never finish movement on it, and must afford a free landing cell in the same turn' : 'is a low obstacle: it cannot be occupied or crossed, including cutting its corners during movement'} and does not block line of sight. ${s.rules.coverDistanceEnabled?'Distance-based cover: nearest valid cover on the shot ray up to one cell from the recipient retains '+s.rules.coverPercent+'% damage; at two cells '+s.rules.coverFarPercent+'%; at three or more 100%.':'A ranged shot through cover or into cover retains '+s.rules.coverPercent+'% damage.'} Round down; multiple cover cells apply protection once. Area attacks roll damage once after a hit at the target's cell. Within the weapon radius: floor(base damage / 2^Chebyshev distance), then apply cover once if the incoming shot or the blast path is covered. Walls block blast paths. Area effects hit allies and the attacker only when friendlyFireArea is enabled; an accidental direct hit follows the separate shot-risk rule. Never invent weapon dice or radius.\n` +
        `Flee: type=flee consumes one turn and no dice; allowed at any board edge cell, or anywhere with board checks disabled. The actor keeps HP, leaves the board (escaped=true), cannot be targeted and is skipped in initiative. Cautious Basic AI attempts this at HP <= 25% of maxHp, following a reachable free path within movement budget; if no exit is reachable it fights normally. Narrating a retreat alone never removes a participant.\n` +
        `At 0 HP: unconscious with ${s.rules.deathRounds ?? 3} full rescue rounds by default; 0 rounds means immediate death. Actor overrides may differ. Stabilize an adjacent unconscious participant (either side) to stop their countdown, keeping 0 HP and unable to fight. A stabilize action uses the active actor's one action; after combat a standing helper may also stabilize. Dead participants cannot be stabilized. Partial knockout rounds do not reduce the countdown. Outside active initiative, rescue countdowns pause until the player explicitly advances a rescue round. A defeated party is not automatically dead and the engine never declares the campaign over; use recorded conditions and await the player's decision about the next scene.\n` +
        (s.rules.boardEnabled ? `Board: ${s.board.width}x${s.board.height}. Terrain type: ${s.board.preset ?? 'custom'}. Positions are controlled by the user. Melee needs an adjacent cell (including diagonal). Ranged uses profile range. Blocked cells cannot be occupied or crossed; they block line of sight. Never move actors with a tool or text command. Ask the user to intervene when invalid.\n${s.rules.sharePositions ? `Blocked cells: ${s.board.blocked.map(coordinate).join(', ') || 'none'}.\n` : ''}` : 'Board range checks are disabled.\n') +
        `Initiative: ${s.order.map(id => findActor(s, id).name).join(' → ')}. Participants with 0 HP or escaped=true cannot act or be attacked. Healing and remedies may target unconscious or stabilized participants at 0 HP; escaped and dead participants cannot be treated.\n` +
        `Participants (JSON): ${JSON.stringify(actors)}\nRecent authoritative events:\n${latest.join('\n') || 'None'}\n` +
        (s.rules.sharePositions && s.rules.boardEnabled ? `Height terrain: ${JSON.stringify({ elevated: s.board.heights, ladders: s.board.ladders, coverFaces: s.board.coverFaces, pits:s.board.pits, enabled: s.rules.heightsEnabled, highAttackBonus: s.rules.highAttackBonus, highDefenseBonus: s.rules.highDefenseBonus, climbCost: s.rules.climbCost })}.\nCover cells: ${(s.board.cover ?? []).map(coordinate).join(', ') || 'none'}.\nTactical overview (Chebyshev distance in cells; diagonal neighbors have distance 1): ${JSON.stringify(tacticalRelations(s))}\n` : '') +
        (s.rules.sharePositions && s.rules.boardEnabled && s.phase === 'active' ? `CURRENT ACTOR TARGET GUIDANCE (only configured weapons; ranged targets require range AND clear line of sight): ${JSON.stringify(tacticalTargets(s))}. null means no legal target. A melee approach is a suggestion for the player to move the figure first; never resolve its attack from the old position. DM proposals still require player confirmation. In visible advice use qualitative movement such as move closer to the opponent or get beside the unconscious ally; do not quote coordinates unless the player explicitly asks. Do not claim the next participant acted.\n` : '') +
        (status ? `Current processing note: ${status}\n` : '') + protocol +
        '\nFor new encounter participants you may propose a fenced combat-roster JSON array with name, side, maxHp, hp, dc, damage, stats, attackBonus, damageBonus, initiative. It only becomes state after the user imports it. Never invent missing profile numbers as established facts.\n[/DETERMINISTIC COMBAT]';
}
export function demoState() {
    let s = emptyState();
    for (const a of [
        { name: 'Arin', side: 'player', maxHp: 32, dc: 15, damage: '1d8', attackBonus: 2, damageBonus: 2, initiative: 18,
            stats: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, charisma: 12, perception: 13 }, position: { x: 3, y: 4 } },
        { name: 'Lyra', side: 'ally', maxHp: 24, dc: 14, damage: '1d6', attackBonus: 1, damageBonus: 1, initiative: 15,
            stats: { dexterity: 18, perception: 16 }, attackMode: 'ranged', position: { x: 2, y: 6 } },
        { name: 'Goblin', side: 'enemy', maxHp: 18, dc: 12, damage: '1d6', attackBonus: 1, initiative: 11, position: { x: 4, y: 4 } },
        { name: 'Warg', side: 'enemy', maxHp: 26, dc: 13, damage: '1d8', initiative: 8, stats: { strength: 15 }, position: { x: 6, y: 3 } },
    ]) s = addActor(s, a).state;
    return s;
}
