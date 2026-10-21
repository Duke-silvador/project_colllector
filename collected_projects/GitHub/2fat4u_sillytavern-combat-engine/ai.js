import { poolBudget } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';
import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { hasEffect } from './effects.js?v=2.0.0-beta.2-hotfix.2';
import { protection } from './defense.js?v=2.0.0-beta.2-hotfix.2';

// No model or random choices. Tie-breaking uses roster order and fixed cell coordinates.
const enemyOf = (a, b) => (a.side === 'enemy') !== (b.side === 'enemy');
const key = p => `${p.x},${p.y}`;
const pos = k => { const [x, y] = k.split(',').map(Number); return { x, y }; };
const cellOrder = (a, b) => a.cost - b.cost || a.position.y - b.position.y || a.position.x - b.position.x;
const challengePriority=(s,a,b,c)=>{
    const source=E.tacticalEffect(s,a,'provoked')?.source;
    return Number(c.b.id===source)-Number(b.b.id===source);
};
function safeBlast(s, a, b, mode, from, variant = 'profile', weaponId = null) {
    if(mode==='ranged'&&E.shotObstacles(s,a,b,from).some(v=>!enemyOf(a,v)))return false;
    const weapon = E.weaponFor(a, mode, variant, weaponId);
    if (!weapon?.radius) return true;
    const moved = { ...s, actors: s.actors.map(v => v.id === a.id ? { ...v, position: from } : v) };
    const dice = E.parseDice(weapon.damage);
    const modifier=dice.bonus+(weapon.damageBonus??a.damageBonus??0)+(s.rules.damageAbility?E.statBonus(s,a,E.weaponStat(s,a,weapon)):0);
    const normal=dice.count*dice.sides+modifier;const critical=s.rules.criticalDamage==='doubleMax'?2*normal:s.rules.criticalDamage==='max'?normal:2*dice.count*dice.sides+modifier;
    const maxDamage=Math.max(0,normal,s.rules.natural20?critical:normal);
    return !E.blastPreview(moved, b.position, weapon.radius).some(v => !v.blocked && !enemyOf(a, v) && Math.floor(maxDamage / 2 ** v.distance) > 0);
}
function budgetDestination(s, route, remaining, occupied) {
    let destination = route[0];
    let spent = 0;
    for (let i = 1; i < route.length; i++) {
        spent += E.stepCost(s, route[i - 1], route[i]); if (spent > remaining) break;
        if (!occupied.has(key(route[i])) && E.canOccupy(s, route[i])) destination = route[i];
    }
    return destination;
}
function planTreatment(s, a, cells) {
    if (!s.rules.resourcesEnabled || !E.canSpendAction(s, a, 'use')) return null;
    const options = [], supportive = a.aiBehavior === 'support', threshold = a.aiBehavior === 'aggressive' ? .25 : .5;
    for (const b of s.actors.filter(b => !b.escaped && b.condition !== 'dead' && !enemyOf(a, b) && (b.id === a.id || supportive))) {
        for (const item of a.resources.filter(v => v.kind === 'supply' && E.canPay(s,a,v,true))) {
            const formula=/^\d+$/.test(item.heal)?null:E.parseDice(item.heal);
            const average=formula?Math.max(0,formula.count*(formula.sides+1)/2+formula.bonus):Number(item.heal);
            const healing = item.heal !== '0' && b.hp < b.maxHp && (b.hp === 0 || b.hp <= b.maxHp * threshold);
            const curing = E.curableStatuses(s,b,item.cures).length>0;
            const areaNeed=item.radius>0 && b.position && E.healingTargets(s,a,item,b.position).some(v=>!enemyOf(a,v.actor)&&(v.needsHealing||v.cures.length));
            if (!healing && !curing && !areaNeed) continue;
            const spot = cells.find(c => {
                if(!E.canUseResource(s,a,b,item,c.position))return false;
                if(!item.radius)return true;
                const recipients=E.healingTargets(s,a,item,b.position,c.position);
                const benefit=recipients.reduce((sum,v)=>sum+(enemyOf(a,v.actor)?-1:1)*((v.needsHealing?Math.min(v.actor.maxHp-v.actor.hp,Math.floor(average/2**(item.falloff==='uniform'?0:v.distance))):0)+v.cures.length*5),0);
                return benefit>0;
            }); if (!spot) continue;
            const priority = b.hp === 0 && healing ? 0 : b.id === a.id && healing ? 1 : curing ? 2 : 3;
            options.push({ b, item, spot, priority });
        }
    }
    options.sort((b, c) => b.priority - c.priority || b.b.hp / b.b.maxHp - c.b.hp / c.b.maxHp || b.spot.cost - c.spot.cost || s.actors.indexOf(b.b) - s.actors.indexOf(c.b) || a.resources.indexOf(b.item) - a.resources.indexOf(c.item));
    if (!options.length) return null;
    const { b, item, spot } = options[0];
    return { actor: a.id, move: s.rules.boardEnabled && E.distance(a.position, spot.position) ? spot.position : null,
        intent: { type: 'use', actor: a.id, target: b.id, resource: item.id, turn: E.turnToken(s) } };
}
function planRefill(s,a) {
    if(!s.rules.resourcesEnabled||!E.canSpendAction(s,a,'refill'))return null;
    for(const item of a.resources.filter(v=>v.refill&&E.canUseResource(s,a,a,v))) {
        const stock=a.resources.find(v=>v.id===item.refill.stock);
        const profiles=[...E.listWeapons(a).flatMap(w=>[w,w.standard]).filter(Boolean),...a.skills.filter(v=>s.rules.skillsEnabled&&v.ai),...a.shieldProfiles.filter(v=>s.rules.shieldsEnabled&&v.ai),...a.resources.filter(v=>v.kind==='supply'&&!v.refill&&v.consumption==='linked'&&(v.heal!=='0'||v.cures.length)).map(v=>({...v,resource:v.stock}))];
        if(profiles.some(v=>v.resource===stock.id&&stock.quantity<(v.cost??1)&&(stock.capacity??1000000)>=(v.cost??1)))return {actor:a.id,move:null,intent:{type:'use',actor:a.id,target:a.id,resource:item.id,turn:E.turnToken(s)}};
    }
    return null;
}
function planSkill(s,a,cells,context) {
    if(!E.canSpendAction(s,a,'skill'))return null;
    const options=[];const budget=poolBudget(s,a);
    const enemies=s.actors.filter(e=>E.isCombatant(e)&&e.position&&enemyOf(a,e)&&E.visibleTo(s,a,e));
    const safety=p=>enemies.reduce((m,e)=>Math.min(m,E.distance(p,e.position)),1000);
    for(const skill of a.skills.filter(v=>v.ai)) {
        if(['narrative','jump','hide','sprint','acrobatics','revive','raise','dominate'].includes(skill.kind))continue;
        if(skill.kind==='aim' && (E.tacticalEffect(s,a,'aimed') || !(budget.free.remaining>1 || budget.bonus.some(p=>p.remaining&&p.allowed.includes('attack')) || budget.bonus.some(p=>p.remaining&&p.allowed.includes('skill'))&&budget.free.remaining)))continue;
        for(const b of s.actors){
            const status={intimidate:'frightened',provoke:'provoked',distract:'distracted',support:'supported',hold:'rooted',disarm:'disarmed',aim:'aimed'}[skill.kind];if(status&&E.tacticalEffect(s,b,status))continue;
            if(skill.kind==='status'&&b.effects.some(e=>e.type===skill.status)||skill.kind==='stun'&&hasEffect(s,b,'stunned'))continue;
            if(skill.kind==='carry'&&b.hp>0)continue;
            if(skill.kind==='carry'&&!enemies.length)continue;
            const spot=cells.find(c=>E.canUseSkill(s,a,b,skill,c.position,context));if(!spot)continue;
            const transport=skill.kind==='carry'?E.carryDestinations(s,a,b,spot.position).filter(p=>safety(p)>safety(b.position)).sort((p,q)=>safety(q)-safety(p)||p.cost-q.cost||p.y-q.y||p.x-q.x)[0]:null;
            if(skill.kind==='carry'&&!transport)continue;
            options.push({skill,b,spot,transport,priority:skill.kind==='carry'?0:skill.kind==='support'?2:skill.kind==='aim'?3:1});
        }
    }
    options.sort((b,c)=>b.priority-c.priority||challengePriority(s,a,b,c)||b.spot.cost-c.spot.cost||s.actors.indexOf(b.b)-s.actors.indexOf(c.b)||a.skills.indexOf(b.skill)-a.skills.indexOf(c.skill));
    if(!options.length)return null;const {skill,b,spot,transport}=options[0];return {actor:a.id,move:s.rules.boardEnabled&&E.distance(a.position,spot.position)?spot.position:null,intent:{type:'skill',actor:a.id,target:b.id,skill:skill.id,turn:E.turnToken(s),...(transport?{destination:{x:transport.x,y:transport.y},carrierDestination:transport.carrier}:{})}};
}
function planRestMovement(s,a) {
    const base={type:'endTurn',actor:a.id,turn:E.turnToken(s)},budget=E.movementBudget(s,a);
    if(!s.rules.boardEnabled||!a.position||!E.movementOpen(s,a)||budget.remaining<=0)return {actor:a.id,move:null,intent:base};
    const reaction=E.reactionDestination(s,a);if(reaction)return {actor:a.id,move:reaction.position,intent:base};
    const enemies=s.actors.filter(b=>E.isCombatant(b)&&E.visibleTo(s,a,b)&&enemyOf(a,b)&&b.position), routing=E.movementPaths(s,a.position,a.id,budget.total),context=E.planningContext(s,a,routing.costs);
    const occupied=new Set(s.actors.filter(b=>b.id!==a.id&&b.position).map(b=>key(b.position)));
    const cells=[...routing.costs].map(([k,cost])=>({position:pos(k),cost})).filter(c=>!occupied.has(key(c.position))&&E.canOccupy(s,c.position)).sort(cellOrder);
    const weapons=E.listWeapons(a).flatMap(w=>['profile','standard'].map(variant=>({weapon:E.weaponFor(a,w.mode,variant,w.id),variant})).filter(v=>v.weapon&&E.canPay(s,a,v.weapon)));
    const goals=[];
    for(const b of enemies)for(const {weapon:w,variant} of weapons){const spot=cells.find(c=>E.canAttack(s,a,b,w.mode,c.position,variant,w.id,context)&&safeBlast(s,a,b,w.mode,c.position,variant,w.id));if(spot)goals.push({b,spot});}
    goals.sort((b,c)=>challengePriority(s,a,b,c)||b.spot.cost-c.spot.cost||b.b.hp-c.b.hp||s.actors.indexOf(b.b)-s.actors.indexOf(c.b));
    const goal=goals[0];if(!goal||goal.spot.cost===0)return {actor:a.id,move:null,intent:base};
    const destination=budgetDestination(s,routing.pathTo(goal.spot.position),budget.remaining,occupied);
    return {actor:a.id,move:E.distance(a.position,destination)?destination:null,intent:base};
}
export function planBasicTurn(s) {
    const a = E.currentActor(s);
    if (s.phase !== 'active' || !a || a.control !== 'basic') throw new Error('Die aktive Figur muss auf Basic-KI eingestellt sein.');
    if(hasEffect(s,a,'stunned'))return {actor:a.id,move:null,intent:{type:'endTurn',actor:a.id,turn:E.turnToken(s)}};
    if(E.actionBudget(s,a).used)return planRestMovement(s,a);
    const context=E.planningContext(s,a);
    const enemies = s.actors.filter(b => E.isCombatant(b) && E.visibleTo(s,a,b) && enemyOf(a, b));

    const token = E.turnToken(s), base = { actor: a.id, turn: token };
    const pools=poolBudget(s,a);
    if(E.canReserveReaction(s,a)) {
        const reserve=a.reactionCost==='bonus'?pools.bonus.some(p=>p.remaining&&p.allowed.includes('reserve')):pools.free.remaining>1||a.hp*4<=a.maxHp;
        if(reserve)return {actor:a.id,move:null,intent:{...base,type:'reserve'}};
    }
    if(s.rules.shieldsEnabled&&E.canSpendAction(s,a,'shield')&&(a.hp*2<=a.maxHp||a.aiBehavior==='cautious')&&enemies.some(b=>!s.rules.boardEnabled||b.position&&a.position&&E.distance(a.position,b.position)<=Math.max(3,b.range))) {
        const p=a.shieldProfiles.find(p=>p.ai&&E.canActivateShield(s,a,p)&&!protection(s,a).active.some(v=>v.kind===p.kind));
        if(p)return {actor:a.id,move:null,intent:{...base,type:'shield',profile:p.id}};
    }
    if (s.rules.boardEnabled && (!a.position || enemies.some(b => !b.position))) throw new Error('Vor dem KI-Zug alle kampffähigen Figuren platzieren.');
    const usable = w => w && E.canPay(s,a,w);
    const weapons = (E.canSpendAction(s, a, 'attack') ? E.listWeapons(a) : []).map(w => {
        const variant = usable(w) ? 'profile' : usable(E.weaponFor(a, w.mode, 'standard', w.id)) ? 'standard' : null;
        return variant ? { ...E.weaponFor(a, w.mode, variant, w.id), variant } : null;
    }).filter(Boolean).sort((b,c) => Number(c.id === a.preferredWeapon) - Number(b.id === a.preferredWeapon) || Number(c.mode === a.attackMode) - Number(b.mode === a.attackMode));
    const fear=E.tacticalEffect(s,a,'frightened'), reaction=E.reactionDestination(s,a);
    if(reaction || fear?.policy==='flee'&&E.canFlee(s,a)) {
        const moved=reaction?E.moveActor(s,a.id,reaction.position).state:s, current=E.currentActor(moved);
        if(fear.policy==='flee')return {actor:a.id,move:reaction?.position??null,intent:{...base,type:E.canFlee(moved,current)&&E.canSpendAction(moved,current,'flee')?'flee':'endTurn'}};
        const challenge=E.tacticalEffect(moved,current,'provoked')?.source;
        const b=[...enemies].sort((b,c)=>Number(c.id===challenge)-Number(b.id===challenge)).find(b=>weapons.some(w=>E.canAttack(moved,current,b,w.mode,current.position,w.variant,w.id)&&safeBlast(moved,current,b,w.mode,current.position,w.variant,w.id)));
        const w=b&&weapons.find(w=>E.canAttack(moved,current,b,w.mode,current.position,w.variant,w.id)&&safeBlast(moved,current,b,w.mode,current.position,w.variant,w.id));
        return {actor:a.id,move:reaction.position,intent:w?{...base,type:'attack',target:b.id,weapon:w.id,mode:w.mode,variant:w.variant}:{...base,type:'endTurn'}};
    }
    const retreat = E.canSpendAction(s, a, 'flee') && a.aiBehavior === 'cautious' && a.hp * 4 <= a.maxHp;
    if (!s.rules.boardEnabled) {
        const treatment = planTreatment(s, a, [{ position: a.position, cost: 0 }]);
        if (treatment) return treatment;
        const refill=planRefill(s,a);if(refill)return refill;
        const ability=planSkill(s,a,[{position:a.position,cost:0}],context);if(ability)return ability;
        if (retreat) return { actor: a.id, move: null, intent: { ...base, type: 'flee' } };
        const choices=enemies.flatMap(b=>weapons.filter(w=>!w.radius&&E.canAttack(s,a,b,w.mode,a.position,w.variant,w.id)).map(weapon=>({b,weapon})));
        choices.sort((b,c)=>challengePriority(s,a,b,c)||b.b.hp-c.b.hp||s.actors.indexOf(b.b)-s.actors.indexOf(c.b));
        const target=choices[0]?.b,weapon=choices[0]?.weapon;
        return { actor: a.id, move: null, intent: target && weapon ? { ...base, type: 'attack', target: target.id, weapon: weapon.id, mode: weapon.mode, variant: weapon.variant } : E.canSpendAction(s, a, 'other') ? { ...base, type: 'other', description: s.rules.language === 'en' ? 'Wait' : 'Warten' } : { ...base, type: 'endTurn' } };
    }
    const budget = E.movementBudget(s, a), remaining = budget.remaining, routing = E.movementPaths(s, a.position, a.id, budget.total), costs = routing.costs;
    context.paths=costs;
    const occupied = new Set(s.actors.filter(b => b.id !== a.id && b.position).map(b => key(b.position)));
    const cells = [...costs].filter(([k]) => !occupied.has(k) && E.canOccupy(s, pos(k))).map(([k, cost]) => ({ position: pos(k), cost })).sort(cellOrder);
    if(a.aiBehavior==='support'&&E.canSpendAction(s,a,'stabilize')){for(const b of s.actors.filter(b=>b.hanging&&!enemyOf(a,b))){const spot=cells.find(v=>v.cost<=remaining&&E.canRescue(s,a,b,v.position));if(spot)return {actor:a.id,move:spot.cost?spot.position:null,intent:{...base,type:'rescue',target:b.id}};}}
    const treatment = planTreatment(s, a, cells.filter(v => v.cost <= remaining));
    if (treatment) return treatment;
    const refill=planRefill(s,a);if(refill)return refill;
    if (retreat) {
        const exit = cells.find(c => E.isExit(s, c.position));
        if (exit) {
            const route = routing.pathTo(exit.position);
            const destination = budgetDestination(s, route, remaining, occupied);
            return { actor: a.id, move: E.distance(a.position, destination) ? destination : null, intent: {
                ...base, type: E.isExit(s, destination) ? 'flee' : E.canSpendAction(s, a, 'other') ? 'other' : 'endTurn',
                ...(E.isExit(s, destination) ? {} : { description: s.rules.language === 'en' ? 'Retreat toward a reachable exit' : 'Rückzug zu einem erreichbaren Ausgang' })
            } };
        }
    }
    if (a.aiBehavior === 'support' && E.canSpendAction(s, a, 'stabilize')) {
        const rescues = [];
        for (const b of s.actors.filter(b => b.hp === 0 && b.condition === 'unconscious' && !enemyOf(a, b) && b.position)) {
            const spot = cells.find(c => c.cost <= remaining && E.adjacentAccess(s, c.position, b.position));
            if (spot) rescues.push({ b, spot });
        }
        rescues.sort((b, c) => b.b.roundsLeft - c.b.roundsLeft || b.spot.cost - c.spot.cost || s.actors.indexOf(b.b) - s.actors.indexOf(c.b));
        if (rescues.length) { const { b, spot } = rescues[0]; return { actor: a.id, move: spot.cost ? spot.position : null, intent: { ...base, type: 'stabilize', target: b.id } }; }
    }
    const ability=planSkill(s,a,cells.filter(v=>v.cost<=remaining),context);if(ability)return ability;
    if(!enemies.length&&s.rules.boardEnabled){const destination=E.patrolDestination(s,a);return {actor:a.id,move:destination,intent:{type:'endTurn',actor:a.id,turn:E.turnToken(s)},patrol:true};}
    const attacks = [], approaches = [];
    for (const b of enemies) for (const [preference, weapon] of weapons.entries()) {
        const spot = cells.find(c => E.canAttack(s, a, b, weapon.mode, c.position, weapon.variant, weapon.id,context) && safeBlast(s, a, b, weapon.mode, c.position, weapon.variant, weapon.id));
        if (!spot) continue;
        const option = { b, weapon, preference, spot, range: E.distance(a.position, b.position) };
        (spot.cost <= remaining ? attacks : approaches).push(option);
    }
    attacks.sort((b, c) => challengePriority(s,a,b,c)||b.b.hp - c.b.hp || b.spot.cost - c.spot.cost || b.preference - c.preference || b.range - c.range || s.actors.indexOf(b.b) - s.actors.indexOf(c.b));
    if (attacks.length) {
        let { b, weapon, spot } = attacks[0];
        if (a.aiBehavior === 'cautious' && weapon.mode === 'ranged') {
            const protectedSpot = E.coverDestination(s, a);
            if (protectedSpot && E.canAttack(s, a, b, weapon.mode, protectedSpot.position, weapon.variant, weapon.id,context) && safeBlast(s, a, b, weapon.mode, protectedSpot.position, weapon.variant, weapon.id)) spot = protectedSpot;
        }
        return { actor: a.id, move: spot.cost ? spot.position : null, intent: { ...base, type: 'attack', target: b.id, weapon: weapon.id, mode: weapon.mode, variant: weapon.variant } };
    }
    approaches.sort((b, c) => challengePriority(s,a,b,c)||b.spot.cost - c.spot.cost || b.b.hp - c.b.hp || b.preference - c.preference || s.actors.indexOf(b.b) - s.actors.indexOf(c.b));
    const sprint=a.skills.find(v=>v.ai&&v.kind==='sprint'&&E.canUseSkill(s,a,a,v));
    if(approaches.length&&sprint&&E.canSpendAction(s,a,'skill'))return {actor:a.id,move:null,intent:{...base,type:'skill',skill:sprint.id,target:a.id}};
    if (!E.canSpendAction(s, a, 'other')) return planRestMovement(s,a);
    const route = approaches.length ? routing.pathTo(approaches[0].spot.position) : [a.position];
    const destination = budgetDestination(s, route, remaining, occupied);
    return { actor: a.id, move: E.distance(a.position, destination) ? destination : null,
        intent: { ...base, type: 'other', description: s.rules.language === 'en' ? (route.length > 1 ? 'Approach a reachable firing or melee position' : 'Wait; no safe reachable attack') : (route.length > 1 ? 'Auf eine erreichbare Angriffsposition zugehen' : 'Warten; kein sicherer erreichbarer Angriff') } };
}
function resolveBasicAction(s, options = {}) {
    const started=globalThis.performance?.now?.()??Date.now(),plan = planBasicTurn(s);
    try{options.onPlanTiming?.({planMs:Math.round(((globalThis.performance?.now?.()??Date.now())-started)*100)/100,actor:plan.actor,type:plan.intent.type});}catch{/* Optional diagnostics must never interrupt combat. */}
    const moved = plan.move ? E.moveActor(s, plan.actor, plan.move).state : s;
    if(plan.intent.type==='endTurn'&&moved.turnSerial!==s.turnSerial){const actual=moved.log.findLast(e=>e.type==='turn'&&e.details?.actor===plan.actor);return {state:moved,result:{...(actual?.details??{type:'endTurn',actor:plan.actor,actorName:E.findActor(s,plan.actor).name,automatic:true,actionUsed:true}),basicAI:true,plan}};}
    if (plan.intent.type === 'endTurn') { const resolved = E.endTurn(moved, plan.intent, options); return { ...resolved, result: { ...resolved.result, basicAI: true, plan } }; }
    const { state, result } = E.resolveAction(moved, plan.intent, { ...options, source: 'basic' });
    if (plan.move) {
        result.movement = { from: E.coordinate(E.findActor(s, plan.actor).position), to: E.coordinate(plan.move) };
        const event = [...state.log].reverse().find(e => e.details === result);
        if (event) { event.textDe = E.resultText(result, 'de'); event.textEn = E.resultText(result, 'en'); event.text = state.rules.language === 'en' ? event.textEn : event.textDe; }
    }
    return { state, result: { ...result, basicAI: true, plan } };
}
function aggregate(state,results,actorId,paused=false) {
    const last=results.at(-1),ended=state.phase!=='active'||E.currentActor(state)?.id!==actorId;
    return {state,result:last?{...last,...(results.length>1?{actions:results}:{}),initiative:E.turnOverview(state),turnEnded:ended,...(paused&&!ended?{paused:true}: {})}:{basicAI:true,paused:true,actions:[]}};
}
function* basicSteps(s,options) {
    const actor=E.currentActor(s),results=[];let state=s;
    for(let i=0;i<250&&state.phase==='active'&&E.currentActor(state)?.id===actor?.id;i++){
        const resolved=resolveBasicAction(state,options);state=resolved.state;results.push(resolved.result);
        if(resolved.result.type==='other'&&state.phase==='active'&&E.currentActor(state)?.id===actor.id){state=E.endTurn(state,{actor:actor.id,turn:E.turnToken(state)},options).state;resolved.result.turnEnded=true;resolved.result.initiative=E.turnOverview(state);delete resolved.result.remainingActions;delete resolved.result.remainingMovement;}
        yield {state,results};
    }
    if(state.phase==='active'&&E.currentActor(state)?.id===actor?.id)state=E.endTurn(state).state;
    return aggregate(state,results,actor?.id);
}
export function resolveBasicTurn(s,options={}) {const steps=basicSteps(s,options);let step;do{step=steps.next();}while(!step.done);return step.value;}
export async function resolveBasicTurnAsync(s,options={}) {
    const actorId=E.currentActor(s)?.id;let state=s,results=[];
    for(let i=0;i<250&&state.phase==='active'&&E.currentActor(state)?.id===actorId;i++) {
        if(options.shouldStop?.())return aggregate(state,results,actorId,true);
        const started=globalThis.performance?.now?.()??Date.now(),plan=planBasicTurn(state);
        options.onPlanTiming?.({planMs:Math.round(((globalThis.performance?.now?.()??Date.now())-started)*100)/100,actor:plan.actor,type:plan.intent.type});
        const before=state,moved=plan.move?E.moveActor(state,plan.actor,plan.move).state:state;
        let resolved;
        if(plan.intent.type==='endTurn'&&moved.turnSerial!==state.turnSerial)resolved={state:moved,result:{...moved.log.findLast(e=>e.type==='turn'&&e.details?.actor===plan.actor)?.details,type:'endTurn'}};
        else if(plan.intent.type==='endTurn')resolved=E.endTurn(moved,plan.intent,options);
        else resolved=await (options.resolve??E.resolveAction)(moved,plan.intent,{...options,source:'basic'});
        if(resolved.result?.cancelled)return aggregate(before,results,actorId,true);
        state=resolved.state;const result={...resolved.result,basicAI:true,plan};
        if(plan.move&&plan.intent.type!=='endTurn'){
            result.movement={from:E.coordinate(E.findActor(before,plan.actor).position),to:E.coordinate(plan.move)};
            const event=state.log.findLast(e=>e.details===resolved.result);if(event){Object.assign(event.details,result);event.textDe=E.resultText(result,'de');event.textEn=E.resultText(result,'en');event.text=state.rules.language==='en'?event.textEn:event.textDe;}
        }
        results.push(result);
        if(result.type==='other'&&state.phase==='active'&&E.currentActor(state)?.id===actorId){state=E.endTurn(state,{actor:actorId,turn:E.turnToken(state)},options).state;result.turnEnded=true;result.initiative=E.turnOverview(state);delete result.remainingActions;delete result.remainingMovement;}
        await (options.yield?.()??new Promise(resolve=>setTimeout(resolve,0)));
    }
    if(state.phase==='active'&&E.currentActor(state)?.id===actorId)state=E.endTurn(state).state;
    return aggregate(state,results,actorId);
}
