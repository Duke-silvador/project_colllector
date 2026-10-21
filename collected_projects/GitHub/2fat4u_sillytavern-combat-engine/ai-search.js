import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { aiWord, aiTerritory, surveyHas, surveyMerge, surveyView } from './ai-state.js?v=2.0.0-beta.2-hotfix.2';

const key=p=>p.x+','+p.y;
const same=(a,b)=>(a.side==='enemy')===(b.side==='enemy');
export function nearbySearchers(s,a,routing){
    if(!a.aiConfig.searchTogether)return [a];
    const range=s.rules.visionEnabled?E.visionRange(s,a):8;
    const eligible=b=>b.control==='advanced'&&b.aiConfig.idle==='search'&&b.aiConfig.searchTogether&&same(a,b)&&E.isCombatant(b)&&b.position&&E.movementBudget(s,b).total>0&&E.distance(a.position,b.position)<=range&&E.clearSight(s,a.position,b.position);
    const candidates=s.actors.filter(b=>b.id!==a.id&&eligible(b)&&[-1,0,1].some(dx=>[-1,0,1].some(dy=>(routing.costs.get((b.position.x+dx)+','+(b.position.y+dy))??Infinity)<=range+2)));
    const available=b=>{const claimed=b.aiMemory.searchTeam.filter(id=>id!==b.id&&s.actors.some(v=>v.id===id&&eligible(v)));return !claimed.length||claimed.includes(a.id)||a.aiMemory.searchTeam.includes(b.id);};
    candidates.sort((b,c)=>Number(!a.aiMemory.searchTeam.includes(b.id))-Number(!a.aiMemory.searchTeam.includes(c.id))||E.distance(a.position,b.position)-E.distance(a.position,c.position)||b.id.localeCompare(c.id));
    return [a,...candidates.filter(available).slice(0,2)].sort((b,c)=>b.id.localeCompare(c.id));
}
export function planSearch(s,a,{routing,allCells,cells,budget,wrap}){
    const team=nearbySearchers(s,a,routing),leader=team[0],survey=surveyMerge(...team.map(b=>surveyView(b.aiMemory.survey,s,b,s.rules.visionEnabled?E.visionRange(s,b):8,E.clearSight)));
    const oldGoal=team.map(b=>b.aiMemory.searchGoal).find(p=>p&&!surveyHas(survey,p)&&routing.costs.has(key(p))&&team.every(b=>aiTerritory(b,p)));
    const unexplored=allCells.filter(v=>!surveyHas(survey,v.position)&&team.every(b=>aiTerritory(b,v.position)));
    unexplored.sort((x,y)=>x.cost-y.cost||key(x.position).localeCompare(key(y.position)));
    const nearest=unexplored[0]?.cost,choices=unexplored.filter(v=>v.cost<=nearest+2).slice(0,12);
    const goal=oldGoal??(choices.length?choices[aiWord(s.rules.seed+':search:'+leader.id,leader.aiMemory.counter)%choices.length].position:null);
    const searchData={team:team.map(b=>b.id),goal};
    if(!goal){
        // Revisit a known endpoint only after all reachable terrain was surveyed.
        const roaming=cells.filter(v=>v.cost>0).sort((x,y)=>Number(a.aiMemory.visited.includes(key(x.position)))-Number(a.aiMemory.visited.includes(key(y.position)))||y.cost-x.cost);
        const pool=roaming.slice(0,12),p=pool.length?pool[aiWord(s.rules.seed+':surveyed:'+leader.id,a.aiMemory.counter)%pool.length].position:null;
        return wrap({type:'endTurn'},p,'Erkundeten Bereich erneut prüfen','Recheck the explored area',{search:true,searchData,clearAlert:true});
    }
    const path=routing.pathTo(goal),progress=new Map(path.map((p,i)=>[key(p),i]));
    const onPath=cells.filter(v=>progress.has(key(v.position)));
    const spread=p=>team.length<2?0:Math.max(...team.filter(b=>b.id!==a.id).map(b=>E.distance(p,b.position)));
    // Soft cohesion lets a slow member follow without forcing a rigid formation.
    const value=v=>(progress.get(key(v.position))??0)-Math.max(0,spread(v.position)-4)*3;
    onPath.sort((x,y)=>value(y)-value(x)||y.cost-x.cost);
    let destination=onPath[0]?.position??null;
    if(team.length>1&&leader.id!==a.id&&E.distance(a.position,leader.position)>4){
        const near=cells.slice().sort((x,y)=>E.distance(x.position,leader.position)-E.distance(y.position,leader.position)||E.distance(x.position,goal)-E.distance(y.position,goal)||x.cost-y.cost)[0];
        if(near&&E.distance(near.position,leader.position)<E.distance(a.position,leader.position))destination=near.position;
    }
    if(destination&&E.distance(destination,a.position)===0)destination=null;
    return wrap({type:'endTurn'},destination,team.length>1?'Suchgruppe: gemeinsam neuen Bereich untersuchen':'Neuen erreichbaren Bereich untersuchen',team.length>1?'Search party: explore a new area together':'Explore a new reachable area',{search:true,searchData,clearAlert:true});
}

export function planRally(s,a,{enemies,overwhelmed,lethal,cells,routing,riskAt,wrap}){
    if(!a.aiConfig.alarm||!a.aiConfig.retreat||!a.aiConfig.free||!a.position)return null;
    const lifetime=Math.max(1,s.actors.length)*a.aiConfig.searchTurns;
    const danger=overwhelmed||lethal||enemies.length&&a.hp<a.maxHp*.3;
    const prior=a.aiMemory.rally;
    if(!danger&&!(prior&&s.turnSerial-prior.started<=lifetime&&E.alarmReport(s,a)))return null;
    if(!E.alarmReport(s,a)||E.alarmReport(s,a).key===a.aiMemory.lastAlarm||!E.canPay(s,a,{resource:a.aiConfig.alarmResource,cost:a.aiConfig.alarmCost}))return null;
    const contacts=a.aiMemory.allyContacts.filter(v=>s.turnSerial-v.seen<=lifetime&&E.distance(a.position,v.position)<=Math.max(12,E.visionRange(s,a)+4)&&s.actors.some(b=>b.id===v.id&&b.control==='advanced'&&same(a,b)&&E.needsAlarm(s,b,E.alarmReport(s,a))));
    const contact=contacts.find(v=>v.id===prior?.id)??contacts.sort((x,y)=>E.distance(a.position,x.position)-E.distance(a.position,y.position)||y.seen-x.seen)[0];
    if(!contact)return null;
    const rally={id:contact.id,position:{...contact.position},started:prior?.id===contact.id?prior.started:s.turnSerial};
    const spots=cells.filter(v=>v.cost>0&&E.distance(v.position,contact.position)<=Math.max(0,E.distance(a.position,contact.position)-1));
    spots.sort((x,y)=>riskAt(x.position)-riskAt(y.position)||E.distance(x.position,contact.position)-E.distance(y.position,contact.position)||x.cost-y.cost);
    const safe=spots.find(v=>riskAt(v.position)<=riskAt(a.position));
    if(safe){
        const projected={...s,actors:s.actors.map(b=>b.id===a.id?{...a,position:safe.position}:b)},pa=E.findActor(projected,a.id);
        const type=E.canAlarm(projected,pa)?'alarm':'endTurn';
        return {...wrap({type},safe.position,type==='alarm'?'Zur Verstärkung zurückziehen und alarmieren':'Zu bekannten Verbündeten zurückziehen',type==='alarm'?'Fall back to reinforcements and raise the alarm':'Fall back toward known allies',{rally}),score:overwhelmed?68:55};
    }
    if(E.canAlarm(s,a))return {...wrap({type:'alarm'},null,'Nahe Verstärkung vor der Bedrohung warnen','Warn nearby reinforcements of the threat',{rally:null}),score:overwhelmed?68:55};
    return null;
}
