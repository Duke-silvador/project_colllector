import { planSearch, planRally } from './ai-search.js?v=2.0.0-beta.2-hotfix.2';
import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { aiTerritory, aiWord } from './ai-state.js?v=2.0.0-beta.2-hotfix.2';
import { protection } from './defense.js?v=2.0.0-beta.2-hotfix.2';
import { resistDamage, periodicDamageType } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { SKILLS } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { poolBudget } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';

const enemy=(a,b)=>(a.side==='enemy')!==(b.side==='enemy');
const key=p=>p.x+','+p.y;
const point=k=>{const [x,y]=k.split(',').map(Number);return {x,y};};
const average=formula=>{if(/^\d+$/.test(String(formula)))return Number(formula);const d=E.parseDice(formula);return Math.max(0,d.count*(d.sides+1)/2+d.bonus);};
const statusOf=skill=>({stun:'stunned',status:skill.status,hold:'rooted',intimidate:'frightened',provoke:'provoked',distract:'distracted',aim:'aimed',support:'supported',disarm:'disarmed'})[skill.kind];
const has=(a,type)=>[...a.effects,...a.tactics].some(v=>v.type===type);
const knowledge=(a,b)=>a.aiMemory.opponents.find(v=>v.id===b.id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function tickThreat(s,a){return s.rules.effectsEnabled?a.effects.filter(v=>v.appliedTurn!==s.turnSerial).reduce((sum,v)=>sum+resistDamage(a,Math.floor(average(E.effectSpec(s,v).damage)),periodicDamageType(v)).damage,0):0;}
function costPenalty(s,a,p,supply=false){const c=E.consumption(s,a,p,supply);return c.cost?Math.min(14,2+c.cost*.4+6*c.cost/Math.max(c.cost,c.stock?.quantity??1)):0;}
function observedThreat(s,a,b){const k=knowledge(a,b);if(!k?.samples.length)return 0;const groups=new Map();for(const o of k.observations?.length?k.observations:k.samples.map(amount=>({type:k.damageType,amount}))){const list=groups.get(o.type)??[];list.push(o.amount);groups.set(o.type,list);}const damage=Math.max(0,...[...groups].map(([type,values])=>resistDamage(a,Math.floor(values.reduce((n,v)=>n+v,0)/values.length),type).damage)),p=protection(s,a);return p.absorb?0:Math.max(0,damage-p.reduce);}
function targetValue(s,a,b,enemies){const k=knowledge(a,b),critical=observedThreat(s,a,b)>=a.hp;const hurt=enemies.some(v=>v.hp<v.maxHp*.7),fallen=a.aiMemory.opponents.some(v=>s.actors.some(b=>b.id===v.id&&b.condition==='dead'&&E.visibleTo(s,a,{...b,position:b.position??b.lastPosition,reserve:false})));return (critical?18:0)+(k?.roles.includes('healer')?(hurt?14:5):0)+(k?.roles.includes('reviver')?(fallen?24:7):0)+(a.aiMemory.target===b.id?3:0);}
function positionRisk(s,a,p,enemies){if(!p)return 0;return enemies.reduce((sum,b)=>{if(!b.position||!E.clearSight(s,b.position,p))return sum;const threat=observedThreat(s,a,b),distance=E.distance(p,b.position),cover=E.coverDamagePercent(s,b.position,p)/100;return sum+(distance<=1?5:distance<=3?2:0)*cover+(threat>=a.hp?12:threat/Math.max(1,a.maxHp)*8)*cover/Math.max(1,distance/3);},0);}
function successChance(s,bonus,dc){let hits=0;for(let n=1;n<=20;n++)if(s.rules.natural20&&n===20||!(s.rules.natural20&&n===1)&&(s.rules.hitEqual?n+bonus>=dc:n+bonus>dc))hits++;return hits/20;}
export function estimatedAttack(s,a,b,w,from=a.position){
    const d=E.parseDice(w.damage),ability=E.statBonus(s,a,E.weaponStat(s,a,w)),k=knowledge(a,b),p=protection(s,b);
    const known=k?.damageImmune.includes(w.damageType??'physical')?0:k?.resistant.includes(w.damageType??'physical')?.5:1;
    const cover=s.rules.boardEnabled&&w.mode==='ranged'?E.coverDamagePercent(s,from,b.position)/100:1;
    const bonus=d.bonus+(w.damageBonus??0)+(s.rules.damageAbility?ability:0),raw=Math.max(0,d.count*(d.sides+1)/2+bonus),maximum=Math.max(0,d.count*d.sides+bonus),minimum=Math.max(0,d.count+bonus);
    const damage=p.absorb?0:Math.max(0,Math.floor(raw*cover*known)-p.reduce);
    const high=s.rules.boardEnabled&&E.heightAt(s,from)>E.heightAt(s,b.position)?s.rules.highAttackBonus:0,defenseHigh=s.rules.boardEnabled&&E.heightAt(s,b.position)>E.heightAt(s,from)?s.rules.highDefenseBonus:0;
    const tactical=(w.mode==='ranged'?E.tacticalEffect(s,a,'aimed')?.amount??0:0)+(E.tacticalEffect(s,a,'supported')?.amount??0)+(E.tacticalEffect(s,b,'distracted')?.amount??0);
    const hit=successChance(s,ability+a.attackBonus+(w.attackBonus??0)+E.stanceBonus(s,a).attack+high+tactical-(has(a,'poisoned')?s.rules.poisonPenalty:0),b.dc+E.stanceBonus(s,b).defense+p.dc+defenseHigh);
    const needed=(b.hp+p.reduce)/Math.max(.0001,cover*known),kill=known===0||p.absorb?0:hit*clamp((maximum+1-needed)/Math.max(1,maximum-minimum+1),0,1);
    return {damage,hit,kill,expected:damage*hit,breaksShield:Boolean(p.absorb&&known>0&&raw*cover*known>p.reduce)};
}
function safeShot(s,a,b,w,from){
    if(w.mode==='ranged'&&E.shotObstacles(s,a,b,from).some(v=>!enemy(a,v)))return false;
    if(!w.radius)return true;
    return !s.actors.some(v=>v.position&&!enemy(a,v)&&E.isCombatant(v)&&E.distance(v.position,b.position)<=w.radius&&E.clearSight(s,b.position,v.position));
}
function bestWeighted(s,a,options){
    options=options.filter(v=>Number.isFinite(v.score)&&v.score>0).sort((b,c)=>c.score-b.score);
    if(!options.length)return null;const best=options[0].score,candidates=options.filter(v=>v.score>=Math.max(best*.25,best-35)).slice(0,12);
    let draw=aiWord(s.rules.seed+':advanced:'+a.id,a.aiMemory.counter)/4294967296;
    const weights=candidates.map(v=>v.score**2),total=weights.reduce((n,v)=>n+v,0);draw*=total;
    for(let i=0;i<candidates.length;i++){draw-=weights[i];if(draw<0)return candidates[i];}return candidates.at(-1);
}
function project(s,a,p){if(!p||E.distance(a.position,p)===0)return {state:s,actor:a};const actor={...a,position:p};return {state:{...s,actors:s.actors.map(v=>v.id===a.id?actor:v)},actor};}
export function planAdvancedTurn(s){
    const a=E.currentActor(s);if(s.phase!=='active'||!a||a.control!=='advanced')throw Error('Die aktive Figur muss auf Advanced AI eingestellt sein.');
    const base={actor:a.id,turn:E.turnToken(s)},wrap=(intent,move=null,reasonDe='Situation bewerten',reasonEn='Assess situation',extra={})=>({actor:a.id,counter:a.aiMemory.counter,move,intent:{...base,...intent},reasonDe,reasonEn,...extra});
    if(has(a,'stunned'))return wrap({type:'endTurn'},null,'Betäubt: Zug beenden','Stunned: end turn');
    if(s.rules.boardEnabled&&!a.position)throw Error('Advanced AI: Figur zuerst aufstellen.');
    const enemies=s.actors.filter(b=>enemy(a,b)&&E.isCombatant(b)&&E.visibleTo(s,a,b)),allies=s.actors.filter(b=>!enemy(a,b)&&!b.escaped&&!b.reserve);
    const risks=new Map(),riskAt=p=>{const k=p?key(p):'';if(!risks.has(k))risks.set(k,positionRisk(s,a,p,enemies));return risks.get(k);};
    const present=allies.filter(b=>E.isCombatant(b)&&(!s.rules.boardEnabled||b.position&&E.distance(a.position,b.position)<=E.visionRange(s,a)&&E.clearSight(s,a.position,b.position)));
    const strength=b=>.3+.7*b.hp/b.maxHp,overmatch=enemies.reduce((n,b)=>n+strength(b),0)/Math.max(.1,present.reduce((n,b)=>n+strength(b),0)),overwhelmed=enemies.length>1&&overmatch>1.7;
    const budget=E.movementBudget(s,a),bound=p=>aiTerritory(a,p),routing=s.rules.boardEnabled?E.movementPaths(s,a.position,a.id,budget.total,bound):null,occupied=new Set(s.actors.filter(v=>v.id!==a.id&&v.position).map(v=>key(v.position)));
    const allCells=s.rules.boardEnabled?[...routing.costs].map(([k,cost])=>({position:point(k),cost})).filter(v=>E.canOccupy(s,v.position)&&!occupied.has(key(v.position))):[{position:a.position,cost:0}];
    const canMove=!s.rules.boardEnabled||E.movementOpen(s,a)||!E.actionBudget(s,a).used;
    const cells=allCells.filter(v=>v.cost<=(canMove?budget.remaining:0)).sort((b,c)=>b.cost-c.cost||b.position.y-c.position.y||b.position.x-c.position.x);
    const fear=E.reactionDestination(s,a);if(fear){if(bound(fear.position)&&routing.costs.has(key(fear.position)))return wrap({type:'endTurn'},fear.position,'Angst: geschützten Rückzug ausführen','Fear: retreat to safety');return wrap({type:'endTurn'},null,'Angst: kein erlaubter Rückzugsweg im Revier','Fear: no permitted retreat within territory');}
    const pools=poolBudget(s,a),spent=pools.spent??(s.action.actorId===a.id?s.action.freeSpent+Object.values(s.action.bonusSpent??{}).reduce((n,v)=>n+v,0):0);
    if(s.rules.stancesEnabled&&spent===0&&a.stanceTurn!==s.turnSerial){
        const danger=enemies.some(b=>observedThreat(s,a,b)>=a.hp),stance=a.aiBehavior==='cautious'||a.hp<a.maxHp*.35||danger||overwhelmed?'defensive':a.aiBehavior==='aggressive'&&enemies.length?'offensive':'neutral';
        if(a.stance!==stance)return wrap({type:'stance',stance},null,stance==='defensive'?'Defensive Haltung: eigene Gefahr begrenzen':'Kampfhaltung an die Lage anpassen',stance==='defensive'?'Defensive stance: limit incoming danger':'Adapt combat stance to the situation');
    }
    const riskWeight=a.aiBehavior==='cautious'?1.4:a.aiBehavior==='aggressive'?.35:.75;
    const rankedCells=b=>{const safe=cells.slice().sort((x,y)=>x.cost+riskAt(x.position)*riskWeight*.3-y.cost-riskAt(y.position)*riskWeight*.3).slice(0,8),near=b?.position?cells.slice().sort((x,y)=>E.distance(x.position,b.position)-E.distance(y.position,b.position)||x.cost-y.cost).slice(0,8):[];return [...new Map([...safe,...near].map(v=>[v.position?key(v.position):'',v])).values()];};
    const options=[];
    const push=(score,intent,spot,reasonDe,reasonEn)=>{if(score>0)options.push({...wrap(intent,spot?.cost?spot.position:null,reasonDe,reasonEn),score:score-(spot?.cost??0)*.4-riskAt(spot?.position??a.position)*riskWeight});};
    const lethal=enemies.some(b=>observedThreat(s,a,b)>=a.hp),retreatChance=clamp((overwhelmed?(overmatch-1.5)*.16:0)+(a.hp<a.maxHp*.3?.25:0)+(lethal?.15:0),0,.8);
    if(a.aiConfig.retreat&&a.aiConfig.free&&enemies.length&&aiWord(s.rules.seed+':retreat:'+a.id,a.aiMemory.counter)/4294967296<retreatChance){
        const score=35+Math.min(35,overmatch*6)+(a.hp<a.maxHp*.25?25:0),reasonDe='Bedrohung abwägen: Rückzug vor Übermacht oder Lebensgefahr',reasonEn='Assess danger: retreat from overwhelming force or lethal threat';
        if(E.canFlee(s,a)&&E.canSpendAction(s,a,'flee'))push(score,{type:'flee'},null,reasonDe,reasonEn);
        else if(routing){const exit=allCells.filter(v=>E.isExit(s,v.position)).sort((x,y)=>x.cost-y.cost||riskAt(x.position)-riskAt(y.position))[0],path=exit?routing.pathTo(exit.position):[],p=path.slice().reverse().find(p=>routing.costs.get(key(p))<=(canMove?budget.remaining:0)&&E.canOccupy(s,p)&&!occupied.has(key(p)));
            if(p&&E.distance(p,a.position)>0)push(score,{type:E.isExit(s,p)&&E.canSpendAction(s,a,'flee')?'flee':'endTurn'},{position:p,cost:routing.costs.get(key(p))},reasonDe,reasonEn);
        }
    }
    const rallyPlan=routing?planRally(s,a,{enemies,overwhelmed,lethal,cells,routing,riskAt,wrap}):null;if(rallyPlan)options.push(rallyPlan);
    if(E.canAlarm(s,a))push(18,{type:'alarm'},null,'Entdeckte Gegner: nahe Verbündete alarmieren','Detected opponents: alert nearby allies');
    if(E.canReserveReaction(s,a)&&enemies.length&&(pools.remaining>1||a.hp<a.maxHp*.3))push(12+(a.hp<a.maxHp*.3?18:0),{type:'reserve'},null,'Aktion für eine verfügbare Reaktion reservieren','Reserve an action for an available reaction');
    if(s.rules.shieldsEnabled&&E.canSpendAction(s,a,'shield')&&enemies.length)for(const p of a.shieldProfiles.filter(v=>v.ai&&E.canActivateShield(s,a,v))){
        const danger=enemies.some(b=>observedThreat(s,a,b)>=a.hp);push((danger?80:a.hp<a.maxHp*.4?35:a.aiBehavior==='cautious'?17:6)-costPenalty(s,a,p)-(p.attackLock?10:0),{type:'shield',profile:p.id},null,'Schutz vor einer aktuellen Bedrohung','Protection against a current threat');
    }
    if(E.canSpendAction(s,a,'use')||E.canSpendAction(s,a,'refill'))for(const item of a.resources.filter(v=>v.kind==='supply'&&E.canPay(s,a,v,true))){
        if(item.refill){if(E.canSpendAction(s,a,'refill')&&E.canUseResource(s,a,a,item)&&a.resources.find(v=>v.id===item.refill.stock)?.quantity<Math.max(2,item.refill.amount/2))push(15,{type:'use',resource:item.id,target:a.id},null,'Knappen eigenen Vorrat auffüllen','Refill a depleted personal stock');continue;}
        if(!E.canSpendAction(s,a,'use'))continue;
        for(const b of allies.filter(b=>b.condition!=='dead')){
            for(const spot of rankedCells(b)){if(!E.canUseResource(s,a,b,item,spot.position))continue;
                const recipients=item.radius?E.healingTargets(s,a,item,b.position,spot.position):[{actor:b,distance:0,needsHealing:b.hp<b.maxHp,cures:E.curableStatuses(s,b,item.cures)}];
                let score=0;for(const v of recipients){const healed=Math.min(v.actor.maxHp-v.actor.hp,average(item.heal)/2**(item.falloff==='uniform'?0:v.distance)),urgent=v.actor.hp===0||v.actor.hp<v.actor.maxHp*.25||tickThreat(s,v.actor)>=v.actor.hp;
                    score+=(enemy(a,v.actor)?-2:1)*(healed*(urgent?2:1)+v.cures.length*10+(v.actor.hp===0&&healed>0?55:0)+(urgent&&(healed>0||v.cures.length)?25:0));}
                if(score>0)push(score-costPenalty(s,a,item,true),{type:'use',resource:item.id,target:b.id},spot,'Verwundete heilen oder hindernde Zustände entfernen','Heal injuries or remove harmful conditions');break;
            }
        }
    }
    if(E.canSpendAction(s,a,'stabilize'))for(const b of allies){
        if(b.hanging){const spot=cells.find(v=>E.canRescue(s,a,b,v.position));if(spot)push(100-Math.min(30,b.hanging.turns*5),{type:'rescue',target:b.id},spot,'Verbündeten vor dem Absturz retten','Rescue an ally before they fall');}
        else if(b.condition==='unconscious'&&b.position){const spot=cells.find(v=>E.adjacentAccess(s,v.position,b.position));if(spot)push(75-Math.min(30,(b.roundsLeft??3)*7),{type:'stabilize',target:b.id},spot,'Rettungsfrist: bewusstlosen Verbündeten stabilisieren','Rescue deadline: stabilize an unconscious ally');}
    }
    const canAttack=E.canSpendAction(s,a,'attack');
    if(canAttack)for(const w0 of E.listWeapons(a))for(const variant of w0.standard?['profile','standard']:['profile']){
        const w=E.weaponFor(a,w0.mode,variant,w0.id);if(!w||!E.canPay(s,a,w))continue;
        for(const b of enemies){
            let best=null;for(const spot of rankedCells(b)){
                if(!E.canAttack(s,a,b,w.mode,spot.position,variant,w.id,E.planningContext(s,a,routing?.costs))||!safeShot(s,a,b,w,spot.position))continue;
                const v=estimatedAttack(s,a,b,w,spot.position);let area=0;if(w.radius)for(const other of enemies)if(other.id!==b.id&&other.position&&E.distance(other.position,b.position)<=w.radius&&E.clearSight(s,b.position,other.position))area+=Math.min(other.hp,v.expected/2**E.distance(other.position,b.position));
                const status=v.damage>0?(w.effects??[]).filter(e=>!has(b,e.type)&&!knowledge(a,b)?.immune.includes(e.type)).length*3:0;
                const score=8+v.expected+v.kill*150+area+targetValue(s,a,b,enemies)+status+(v.breaksShield?10:0)-costPenalty(s,a,w)-spot.cost*.4-riskAt(spot.position)*riskWeight;
                if(v.expected+status>0||v.breaksShield)if(!best||score>best.score)best={score,spot,v};
            }
            if(best)options.push({...wrap({type:'attack',target:b.id,weapon:w.id,mode:w.mode,variant},best.spot.cost?best.spot.position:null,best.v.kill>.45?'Ziel bevorzugt: wahrscheinlich ausschaltbar':observedThreat(s,a,b)>=a.hp?'Gefährlichen Gegner gezielt angreifen':knowledge(a,b)?.roles.length?'Beobachtete Unterstützungsrolle berücksichtigen':'Wirksamen erreichbaren Angriff wählen',best.v.kill>.45?'Preferred target: likely to be incapacitated':observedThreat(s,a,b)>=a.hp?'Focus a dangerous opponent':knowledge(a,b)?.roles.length?'Account for an observed support role':'Choose an effective reachable attack'),score:best.score});
        }
    }
    if(E.canSpendAction(s,a,'skill'))for(const skill of a.skills.filter(v=>v.ai)){
        if(skill.kind==='narrative'&&!skill.mechanics)continue;
        const status=statusOf(skill);
        const targets=SKILLS[skill.kind].target==='self'?[a]:['revive','raise'].includes(skill.kind)?s.actors.filter(b=>b.condition==='dead'&&(!enemy(a,b)||knowledge(a,b))):skill.kind==='narrative'&&skill.mechanics.target==='self'?[a]:s.actors.filter(b=>b.id===a.id||!enemy(a,b)||enemies.some(v=>v.id===b.id));
        for(const b of targets){
            if(status&&(has(b,status)||knowledge(a,b)?.immune.includes(status)))continue;
            if(skill.kind==='revive'&&enemy(a,b))continue;
            let best=null;const sites=['carry','aim','sprint','acrobatics'].includes(skill.kind)?cells.filter(v=>v.cost===0):rankedCells(b);
            for(const spot of sites){
                const projected=project(s,a,spot.position),ps=projected.state,pa=projected.actor,pb=b.id===a.id?pa:b;
                if(!E.canUseSkill(ps,pa,pb,skill,spot.position,E.planningContext(ps,pa,routing?.costs)))continue;
                let score=0,extra={};
                if(skill.kind==='narrative'){
                    const m=skill.mechanics,enemyTarget=enemy(a,pb);if(m.damage){const k=knowledge(a,pb),factor=k?.damageImmune.includes(m.damage.type??'physical')?0:k?.resistant.includes(m.damage.type??'physical')?.5:1;score+=(enemyTarget?1:-3)*(average(m.damage.dice)+m.damage.bonus)*factor;if(enemyTarget&&factor>0)score+=8;}
                    if(m.healing)score+=(enemyTarget?-3:1.5)*Math.min(pb.maxHp-pb.hp,average(m.healing.dice)+m.healing.bonus)+(pb.hp===0?40:0);
                    if(m.status){const v=m.status;if(v.mode==='remove'&&has(pb,v.type))score+=enemyTarget?-20:25;if(v.mode==='apply'&&!has(pb,v.type)&&!knowledge(a,pb)?.immune.includes(v.type))score+=enemyTarget?22:-30;}
                }else if(['revive','raise'].includes(skill.kind)){
                    const destinations=s.rules.boardEnabled?E.revivalDestinations(ps,pa,pb,skill):[null];if(!destinations.length)continue;extra=s.rules.boardEnabled?{destination:destinations[0]}:{};score=skill.kind==='revive'?55+Math.min(30,skill.reviveHp):32+Math.min(20,skill.reviveHp);
                }else if(skill.kind==='dominate')score=30+Math.min(25,b.hp*.3)+targetValue(s,a,b,enemies);
                else if(skill.kind==='shove'){
                    const dest=E.forcedDestinations(ps,pa,pb).sort((x,y)=>Number(E.isPit(ps,y))-Number(E.isPit(ps,x)))[0];if(!dest)continue;extra={destination:dest};score=E.isPit(ps,dest)?80:5;
                }else if(skill.kind==='carry'){
                    if(b.hp>0||!enemies.length)continue;const safety=p=>Math.min(...enemies.filter(v=>v.position).map(v=>E.distance(p,v.position))),old=safety(b.position);
                    const plans=E.carryPlans(ps,pa,pb).filter(v=>v.path.every(n=>bound(n.carrier))&&safety(v)>old).sort((x,y)=>safety(y)-safety(x)||x.cost-y.cost);if(!plans.length)continue;const p=plans[0];extra={destination:{x:p.x,y:p.y},carrierDestination:p.carrier};score=18+(safety(p)-old)*3;
                }else if(skill.kind==='jump'){
                    const dest=E.jumpDestinations(ps,pa,skill).filter(bound).sort((x,y)=>Math.min(...enemies.map(b=>E.distance(x,b.position)))-Math.min(...enemies.map(b=>E.distance(y,b.position))))[0];if(!dest||!enemies.length||Math.min(...enemies.map(b=>E.distance(dest,b.position)))>=Math.min(...enemies.map(b=>E.distance(pa.position,b.position))))continue;extra={destination:dest};score=8;
                }else if(skill.kind==='sprint'){if(!enemies.length||a.sprintTurn===s.turnSerial||canAttack&&options.some(v=>v.intent.type==='attack'))continue;score=9;}
                else if(skill.kind==='acrobatics'){if(a.acrobaticsUsedTurn===s.turnSerial||!s.board.cover.length||!enemies.length)continue;score=7;}
                else if(skill.kind==='hide'){if(!enemies.length)continue;score=a.aiBehavior==='cautious'?14:7;}
                else if(skill.kind==='aim'){if(pools.remaining<2||!canAttack||!E.listWeapons(a).some(w=>w.mode==='ranged'))continue;score=6+s.rules.aimBonus*2;}
                else if(skill.kind==='support')score=8+s.rules.supportBonus*2;
                else if(status)score=({stunned:26,rooted:16,frightened:15,disarmed:20,distracted:10,provoked:8})[status]??14;
                if(enemy(a,b)&&status)score+=targetValue(s,a,b,enemies)*.4;
                const chance=skill.check?successChance(ps,E.statBonus(ps,pa,skill.stat)+skill.bonus,E.skillDefense(ps,pb,skill).dc):1;
                score=score*chance-costPenalty(s,a,skill)-spot.cost*.4-riskAt(spot.position)*riskWeight;
                if(score>0&&(!best||score>best.score))best={score,spot,extra};
            }
            if(best)options.push({...wrap({type:'skill',skill:skill.id,target:b.id,...best.extra},best.spot.cost?best.spot.position:null,['revive','raise'].includes(skill.kind)?'Gefallene mit vorhandener Fähigkeit zurückbringen':skill.kind==='narrative'?'Berechenbare eigene Wirkung nutzen':skill.kind==='shove'?'Gegner aus günstiger Position schubsen':'Passende verfügbare Fähigkeit nutzen',['revive','raise'].includes(skill.kind)?'Return a fallen participant with an assigned ability':skill.kind==='narrative'?'Use an explicit custom mechanical effect':skill.kind==='shove'?'Shove an opponent from a useful position':'Use an appropriate available ability'),score:best.score});
        }
    }
    const chosen=bestWeighted(s,a,options);if(chosen)return {...chosen,clearSearch:true,...(!Object.hasOwn(chosen,'rally')?{rally:null}:{})};
    if(!s.rules.boardEnabled)return wrap({type:'endTurn'},null,'Keine sinnvolle bezahlbare Handlung','No useful affordable action');
    if(E.actionBudget(s,a).used){const currentRisk=positionRisk(s,a,a.position,enemies),safe=cells.filter(v=>v.cost>0).sort((x,y)=>positionRisk(s,a,x.position,enemies)-positionRisk(s,a,y.position,enemies)||x.cost-y.cost)[0];return safe&&positionRisk(s,a,safe.position,enemies)+2<currentRisk?wrap({type:'endTurn'},safe.position,'Restbewegung: sicherere Position einnehmen','Remaining movement: take a safer position'):wrap({type:'endTurn'},null,'Zug abschließen','Finish turn');}
    const stepToward=goal=>{const path=routing.pathTo(goal);return path.slice().reverse().find(p=>routing.costs.get(key(p))<=budget.remaining&&!occupied.has(key(p))&&E.canOccupy(s,p));};
    if(enemies.length){
        const approaches=[];for(const b of enemies)for(const w0 of E.listWeapons(a)){
            const w=E.weaponFor(a,w0.mode,'profile',w0.id);if(!E.canPay(s,a,w))continue;
            const spot=allCells.filter(v=>v.cost>budget.remaining).sort((x,y)=>x.cost-y.cost).find(v=>E.canAttack(s,a,b,w.mode,v.position,'profile',w.id,E.planningContext(s,a,routing.costs))&&safeShot(s,a,b,w,v.position));if(spot)approaches.push({b,spot});
        }
        approaches.sort((x,y)=>x.spot.cost-y.spot.cost-targetValue(s,a,x.b,enemies)*.1+targetValue(s,a,y.b,enemies)*.1);
        const p=approaches[0]&&stepToward(approaches[0].spot.position);if(p&&E.distance(p,a.position)>0)return wrap({type:'endTurn'},p,'Erreichbare Angriffsposition vorbereiten','Approach a reachable attack position');
        return wrap({type:'endTurn'},null,'Im erlaubten Bereich warten; kein sinnvoller Angriff','Wait in the allowed area; no useful attack');
    }
    const c=a.aiConfig,m=a.aiMemory,remembered=E.searchClues(s,a)[0],alert=E.searchAlert(s,a);
    const searchGoal=c.idle==='search'&&m.searchLeft>0?(alert?.position??remembered?.position):null;
    if(searchGoal&&bound(searchGoal)){
        // Inspect from a free neighboring cell; the remembered cell may still be occupied.
        const near=allCells.filter(v=>E.distance(v.position,searchGoal)<=1).sort((x,y)=>x.cost-y.cost),p=near[0]&&stepToward(near[0].position);
        if(p&&E.distance(p,a.position)>0)return wrap({type:'endTurn'},p,'Zuletzt bekannte Position untersuchen','Investigate the last known position',{search:true});
    }
    if(c.home&&!(c.free&&c.idle==='search')&&E.distance(a.position,c.home)>c.radius){const p=stepToward(c.home);if(p&&E.distance(p,a.position)>0)return wrap({type:'endTurn'},p,'Zum Heimatbereich zurückkehren','Return to home territory',{search:c.idle==='search'});}
    if(c.idle==='wait')return wrap({type:'endTurn'},null,'Revier bewachen und auf Gegner warten','Guard territory and wait for opponents');
    if(c.idle==='search')return planSearch(s,a,{routing,allCells,cells,budget,wrap});
    const roaming=cells.filter(v=>v.cost>0&&(!c.home||c.free&&c.idle==='search'||E.distance(v.position,c.home)<=c.radius));
    roaming.sort((x,y)=>Number(m.visited.includes(key(x.position)))-Number(m.visited.includes(key(y.position)))||y.cost-x.cost||key(x.position).localeCompare(key(y.position)));
    const unvisited=roaming.filter(v=>!m.visited.includes(key(v.position))),pool=(unvisited.length?unvisited:roaming).slice(0,12),destination=pool.length?pool[aiWord(s.rules.seed+':roam:'+a.id,m.counter)%pool.length].position:null;
    return wrap({type:'endTurn'},destination,c.idle==='search'?'Erlaubten Bereich gezielt erkunden':'Im Heimatbereich patrouillieren',c.idle==='search'?'Explore the permitted area':'Patrol the home territory',{search:c.idle==='search',clearAlert:!alert});
}
