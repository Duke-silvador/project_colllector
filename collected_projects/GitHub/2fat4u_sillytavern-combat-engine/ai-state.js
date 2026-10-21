// Serializable configuration and bounded, per-observer knowledge. No combat RNG.
const require=(v,m)=>{if(!v)throw Error(m);};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min,max)=>{require(typeof v!=='boolean'&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max,'Advanced AI: ungültiger Zahlenwert.');return Number(v);};
const boolean=(v,d)=>{require(v===undefined||typeof v==='boolean','Advanced AI: Boolean erforderlich.');return v??d;};
const choice=(v,values,d)=>{require(values.includes(v??d),'Advanced AI: ungültige Auswahl.');return v??d;};
const point=v=>{require(obj(v),'Advanced AI: ungültiger Reviermittelpunkt.');return {x:integer(v.x,0,49),y:integer(v.y,0,49)};};
export function aiConfigFrom(raw={}) {
    require(obj(raw),'Advanced AI: Konfiguration erforderlich.');
    return {searchTogether:boolean(raw.searchTogether,false),homeMode:choice(raw.homeMode,['deployment','fixed'],raw.home==null?'deployment':'fixed'),idle:choice(raw.idle,['wait','patrol','search'],'patrol'),free:boolean(raw.free,true),retreat:boolean(raw.retreat,true),home:raw.home==null?null:point(raw.home),radius:integer(raw.radius??5,0,100),searchTurns:integer(raw.searchTurns??3,1,20),alarm:boolean(raw.alarm,false),alarmRadius:integer(raw.alarmRadius??6,1,100),alarmCost:integer(raw.alarmCost??0,0,1000),alarmResource:raw.alarmResource?String(raw.alarmResource).slice(0,100):null};
}
export function emptyAIMemory(){return {survey:[],searchTeam:[],searchGoal:null,allyContacts:[],heard:[],rally:null,counter:0,target:null,opponents:[],visited:[],searchLeft:0,lastSearchTurn:-1,lastAlarm:'',alert:null};}
export function aiMemoryFrom(raw) {
    if(raw==null)return emptyAIMemory();require(obj(raw),'Advanced AI: ungültiges Wissen.');
    const list=(v,max)=>{require(Array.isArray(v??[])&&(v??[]).length<=max,'Advanced AI: Wissenslimit überschritten.');return v??[];};
    const types=v=>list(v,50).map(t=>String(t).slice(0,40));
    const opponents=list(raw.opponents,200).map(v=>{require(obj(v)&&typeof v.id==='string'&&v.id.length<=100,'Advanced AI: ungültiger Wissenseintrag.');return {id:v.id,position:v.position==null?null:point(v.position),seen:integer(v.seen??0,0,Number.MAX_SAFE_INTEGER),activity:choice(v.activity,['unknown','active','inactive','cleared'],'unknown'),sighting:integer(v.sighting??v.seen??0,0,Number.MAX_SAFE_INTEGER),announced:String(v.announced??'').slice(0,200),roles:types(v.roles),immune:types(v.immune),damageImmune:types(v.damageImmune),resistant:types(v.resistant),samples:list(v.samples,12).map(n=>integer(n,0,10000000)),damageType:String(v.damageType??'physical').slice(0,40),observations:list(v.observations,12).map(o=>{require(obj(o)&&['physical','fire','cold','lightning','poison','acid','necrotic','radiant','psychic','force'].includes(o.type),'Advanced AI: ungültige Schadensbeobachtung.');return {type:o.type,amount:integer(o.amount,0,10000000)};})};});
    require(new Set(opponents.map(v=>v.id)).size===opponents.length,'Advanced AI: doppelte Wissenseinträge.');
    return {survey:list(raw.survey,50).map(v=>integer(v,0,2**50-1)),searchTeam:list(raw.searchTeam,3).map(v=>String(v).slice(0,100)),searchGoal:raw.searchGoal==null?null:point(raw.searchGoal),allyContacts:list(raw.allyContacts,200).map(v=>({id:String(v.id).slice(0,100),position:point(v.position),seen:integer(v.seen,0,Number.MAX_SAFE_INTEGER)})),heard:list(raw.heard,200).map(v=>({id:String(v.id).slice(0,100),position:point(v.position),seen:integer(v.seen,0,Number.MAX_SAFE_INTEGER)})),rally:raw.rally==null?null:{id:String(raw.rally.id).slice(0,100),position:point(raw.rally.position),started:integer(raw.rally.started,0,Number.MAX_SAFE_INTEGER)},counter:integer(raw.counter??0,0,Number.MAX_SAFE_INTEGER),target:raw.target?String(raw.target).slice(0,100):null,opponents,visited:list(raw.visited,400).map(v=>String(v).slice(0,10)),searchLeft:integer(raw.searchLeft??0,0,20),lastSearchTurn:integer(raw.lastSearchTurn??-1,-1,Number.MAX_SAFE_INTEGER),lastAlarm:String(raw.lastAlarm??'').slice(0,200),alert:raw.alert==null?null:{position:point(raw.alert.position),turn:integer(raw.alert.turn,0,Number.MAX_SAFE_INTEGER),target:raw.alert.target?String(raw.alert.target).slice(0,100):null,source:raw.alert.source?String(raw.alert.source).slice(0,100):null,key:String(raw.alert.key??'').slice(0,200)}};
}
export function aiRecord(a,id){let k=a.aiMemory.opponents.find(v=>v.id===id);if(!k){k={id,position:null,seen:0,activity:'unknown',sighting:0,announced:'',roles:[],immune:[],damageImmune:[],resistant:[],samples:[],damageType:'physical',observations:[]};a.aiMemory.opponents.push(k);if(a.aiMemory.opponents.length>200)a.aiMemory.opponents.shift();}return k;}
export function aiClueKey(k){return 'alarm:'+aiWord(k.id+'|'+k.position.x+','+k.position.y+'|'+k.sighting,0).toString(16);}
export function aiClueFresh(s,a,k){return Boolean(k.position&&k.seen>0&&!['inactive','cleared'].includes(k.activity)&&s.turnSerial-k.seen<=Math.max(1,s.actors.length)*a.aiConfig.searchTurns);}
export function aiPointSeen(s,a,p,{clearSight,visionRange}){return Boolean(a.position&&p&&(!s.rules.boardEnabled||!s.rules.visionEnabled||Math.max(Math.abs(a.position.x-p.x),Math.abs(a.position.y-p.y))<=visionRange(s,a)&&clearSight(s,a.position,p)));}
export function aiTerritory(a,p){const c=a.aiConfig,h=c?.home;if(a.control!=='advanced'||!h||c.free)return true;const dist=v=>Math.max(Math.abs(v.x-h.x),Math.abs(v.y-h.y));return dist(p)<=Math.max(c.radius,a.position?dist(a.position):c.radius);}
export function observeAI(before,after,visible,{clearSight,visionRange}={}) {
    const ids=new Set(before.log.map(e=>e.id)),fresh=after.log.filter(v=>!ids.has(v.id));
    const reset=fresh.some(e=>e.type==='start'||e.type==='reset');
    for(const a of after.actors){
        if(reset)a.aiMemory=emptyAIMemory();
        if(a.control!=='advanced')continue;
        a.aiConfig??=aiConfigFrom();a.aiMemory??=emptyAIMemory();
        if((!a.aiConfig.home||reset&&a.aiConfig.homeMode==='deployment')&&a.position&&after.phase==='active')a.aiConfig.home={...a.position};
        if(after.phase!=='active')continue;
        if(a.hp<=0||a.reserve||a.escaped||a.hanging)continue;
        const old=before.actors.find(v=>v.id===a.id);
        if(clearSight&&visionRange&&a.position&&a.hp>0&&!a.reserve){
            const range=after.rules.visionEnabled?visionRange(after,a):8;
            if(!a.aiMemory.survey.length||reset||old?.position?.x!==a.position.x||old?.position?.y!==a.position.y||before.rules.visionEnabled!==after.rules.visionEnabled||before.rules.visionBase!==after.rules.visionBase||before.rules.visionPerception!==after.rules.visionPerception||fresh.some(e=>e.type==='edit'))a.aiMemory.survey=surveyView(a.aiMemory.survey,after,a,range,clearSight);
            for(const b of after.actors)if(b.id!==a.id&&b.position&&b.hp>0&&!b.reserve&&!b.escaped&&(a.side==='enemy')===(b.side==='enemy')&&Math.max(Math.abs(b.position.x-a.position.x),Math.abs(b.position.y-a.position.y))<=range&&clearSight(after,a.position,b.position)&&visible(after,a,b)){
                let contact=a.aiMemory.allyContacts.find(v=>v.id===b.id);if(!contact){contact={id:b.id,position:{...b.position},seen:after.turnSerial};a.aiMemory.allyContacts.push(contact);}contact.position={...b.position};contact.seen=after.turnSerial;
            }
            a.aiMemory.allyContacts=a.aiMemory.allyContacts.slice(-200);
        }
        const canSee=id=>{const b=after.actors.find(v=>v.id===id),prior=before.actors.find(v=>v.id===id);return Boolean(b&&visible(after,a,b)||old&&prior&&visible(before,old,prior));};
        for(const b of after.actors){const perceived=b.condition==='dead'&&b.lastPosition?{...b,position:b.position??b.lastPosition,reserve:false}:b;if(b.id!==a.id&&(a.side==='enemy')!==(b.side==='enemy')&&visible(after,a,perceived)){
            const k=aiRecord(a,b.id),active=b.hp>0&&!b.reserve&&!b.escaped&&!b.hanging;
            if(active&&(k.activity!=='active'||k.position?.x!==perceived.position?.x||k.position?.y!==perceived.position?.y))k.sighting=after.turnSerial;
            k.position=perceived.position?{...perceived.position}:k.position;k.seen=after.turnSerial;k.activity=active?'active':'inactive';if(active)a.aiMemory.searchLeft=a.aiConfig.searchTurns;
        }
        }
        if(clearSight&&visionRange){
            for(const k of a.aiMemory.opponents)if(!['inactive','cleared'].includes(k.activity)&&k.position&&aiPointSeen(after,a,k.position,{clearSight,visionRange})&&!after.actors.some(b=>b.id===k.id&&visible(after,a,b))){k.activity='cleared';k.seen=after.turnSerial;}
            const hint=a.aiMemory.alert;
            if(hint&&(after.turnSerial-hint.turn>Math.max(1,after.actors.length)*a.aiConfig.searchTurns||aiPointSeen(after,a,hint.position,{clearSight,visionRange})||hint.target&&a.aiMemory.opponents.some(k=>k.id===hint.target&&['inactive','cleared'].includes(k.activity)&&k.seen>=hint.turn)))a.aiMemory.alert=null;
        }
        for(const event of fresh){const r=event.details??{};
            // Only the caster learns an explicit immunity result from its action.
            if(r.actor===a.id){
                if(r.immuneStatus&&r.target){const k=aiRecord(a,r.target);k.immune=[...new Set([...k.immune,r.immuneStatus])];}
                for(const v of r.immuneEffects??[]){const k=aiRecord(a,v.target);k.immune=[...new Set([...k.immune,v.type])];}
                for(const v of r.affected??[])if(v.resistancePercent===0||v.resistancePercent===50){const k=aiRecord(a,v.id),key=v.resistancePercent===0?'damageImmune':'resistant';k[key]=[...new Set([...k[key],r.damageType??v.damageType??'physical'])];}
                if(r.custom?.status?.immune){const k=aiRecord(a,r.custom.target);k.immune=[...new Set([...k.immune,r.custom.status.type])];}
                if(r.custom?.damage?.resistancePercent!==undefined&&r.custom.damage.resistancePercent<100){const k=aiRecord(a,r.custom.target),key=r.custom.damage.resistancePercent===0?'damageImmune':'resistant';k[key]=[...new Set([...k[key],r.custom.damage.damageType??'physical'])];}
            }
            if(!r.actor||r.actor===a.id||!canSee(r.actor))continue;
            const caster=after.actors.find(v=>v.id===r.actor);if(!caster||(caster.side==='enemy')===(a.side==='enemy'))continue;
            const k=aiRecord(a,r.actor);
            if(r.type==='use'&&(r.healing>0||r.affected?.some(v=>v.healing>0))||r.custom?.healing?.applied>0)k.roles=[...new Set([...k.roles,'healer'])];
            if(r.type==='skill'&&['revive','raise'].includes(r.skillKind)&&r.success)k.roles=[...new Set([...k.roles,'reviver'])];
            if(r.type==='attack'&&r.hit&&!r.critical&&r.rawDamage>0&&(r.affected??[]).some(v=>canSee(v.id))){k.samples=[...k.samples,Math.ceil(r.rawDamage)].slice(-12);k.damageType=r.damageType??'physical';k.observations=[...(k.observations??[]),{type:k.damageType,amount:Math.ceil(r.rawDamage)}].slice(-12);}
        }
        // Explicit changes to a target's traits invalidate outdated observations.
        for(const k of a.aiMemory.opponents){const oldTarget=before.actors.find(v=>v.id===k.id),target=after.actors.find(v=>v.id===k.id);if(oldTarget&&target){if(JSON.stringify(oldTarget.conditionImmunities)!==JSON.stringify(target.conditionImmunities))k.immune=[];if(JSON.stringify([oldTarget.damageImmunities,oldTarget.damageResistances])!==JSON.stringify([target.damageImmunities,target.damageResistances])){k.damageImmune=[];k.resistant=[];}}}
    }
}
export function aiWord(seed,index){let n=2166136261;for(const c of String(seed)+':'+index){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return n>>>0;}

// Each row is a safe 50-bit integer; compact enough for saved combat history.
export function surveyHas(rows,p){return Boolean(p&&Math.floor((rows[p.y]??0)/2**p.x)%2);}
export function surveyMerge(...maps){const rows=[];for(let y=0;y<Math.max(0,...maps.map(v=>v.length));y++)rows[y]=Number(maps.reduce((n,v)=>n|BigInt(v[y]??0),0n));return rows;}
export function surveyView(rows,s,a,range,clearSight){const next=[...rows];if(!a.position)return next;for(let y=Math.max(0,a.position.y-range);y<=Math.min(s.board.height-1,a.position.y+range);y++)for(let x=Math.max(0,a.position.x-range);x<=Math.min(s.board.width-1,a.position.x+range);x++){const p={x,y};if(!surveyHas(next,p)&&clearSight(s,a.position,p))next[y]=(next[y]??0)+2**x;}return Array.from({length:next.length},(_,y)=>next[y]??0);}
