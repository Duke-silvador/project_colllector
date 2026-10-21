const fail=m=>{throw new Error(m);};
const integer=(v,min,max,name)=>{if(v==null||v===''||typeof v==='boolean'||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)fail(name+': ungültige Zahl.');return Number(v);};
const bool=(v,name,fallback=false)=>{if(v===undefined)return fallback;if(typeof v!=='boolean')fail(name+': Boolean erforderlich.');return v;};
export function storedPoint(v) {if(v==null)return null;if(typeof v!=='object'||Array.isArray(v))fail('Ungültige gespeicherte Position.');return {x:integer(v.x,0,49,'Spalte'),y:integer(v.y,0,49,'Zeile')};}
export function encounterFields(v) {
    const hidden=v.hidden==null?null:{turns:integer(v.hidden.turns,1,100,'Versteckdauer'),appliedTurn:integer(v.hidden.appliedTurn??0,0,Number.MAX_SAFE_INTEGER,'Versteckzug')};
    const hanging=v.hanging==null?null:{anchor:storedPoint(v.hanging.anchor),turns:integer(v.hanging.turns,1,100,'Abgrundfrist'),round:integer(v.hanging.round,0,1000000,'Abgrundrunde')};
    if(hanging&&!hanging.anchor)fail('Abgrundposition fehlt.');
    return {reserve:bool(v.reserve,'Reserve'),initiativeReady:bool(v.initiativeReady,'Initiative'),lastPosition:storedPoint(v.lastPosition),lastHeight:integer(v.lastHeight??0,0,1,'Letzte Höhe'),joinRound:integer(v.joinRound??0,0,1000000,'Beitrittsrunde'),turnRound:integer(v.turnRound??-1,-1,1000000,'Letzter eigener Zug'),unlimitedTurn:integer(v.unlimitedTurn??-1,-1,Number.MAX_SAFE_INTEGER,'Aktionsfreigabe'),hidden,hanging};
}
export const encounterRuleDefaults=Object.freeze({visionEnabled:false,visionBase:8,visionPerception:false,hideUnseenEnemies:false,ambushStacksCritical:false,autoRemoveDead:false,joinInitiative:'profile',joinTiming:'remaining',stealthEnabled:true,hideNeedsTerrain:true,hiddenDamageMultiplier:2,coverDistanceEnabled:false,coverFarPercent:75,shotRiskEnabled:false,shotRiskPenalty:2,friendlyFireArea:true,pitRescueRounds:3});
export function encounterRules(input,decimal) {
    const r={...encounterRuleDefaults};
    for(const k of ['visionEnabled','visionPerception','hideUnseenEnemies','ambushStacksCritical','autoRemoveDead','stealthEnabled','hideNeedsTerrain','coverDistanceEnabled','shotRiskEnabled','friendlyFireArea'])r[k]=bool(input[k],k,r[k]);
    for(const [k,choices] of [['joinInitiative',['profile','roll','manual']],['joinTiming',['remaining','next']]]){r[k]=input[k]??r[k];if(!choices.includes(r[k]))fail(k+': ungültiger Wert.');}
    r.visionBase=integer(input.visionBase??8,0,100,'Sichtweite');
    r.hiddenDamageMultiplier=decimal(input.hiddenDamageMultiplier??2,1,10,'Hinterhaltfaktor');r.shotRiskPenalty=decimal(input.shotRiskPenalty??2,0,100,'Schusserschwernis');
    r.coverFarPercent=integer(input.coverFarPercent??75,0,100,'Entfernte Deckung');r.pitRescueRounds=integer(input.pitRescueRounds??3,1,100,'Abgrundfrist');return r;
}
export function visibleTo(s,a,b) {return Boolean(b&&!b.reserve&&!b.hanging&&(!s.rules.stealthEnabled||!b.hidden||a?.id===b.id||(a?.side==='enemy')===(b.side==='enemy')));}
export function concealment(s,a,from=a?.position) {
    if(!s.rules.stealthEnabled||!from||!s.rules.boardEnabled)return false;
    if(!s.rules.hideNeedsTerrain)return true;
    const distance=p=>Math.max(Math.abs(p.x-from.x),Math.abs(p.y-from.y));
    const height=p=>Number(s.rules.heightsEnabled&&(s.board.heights??[]).some(q=>q.x===p.x&&q.y===p.y));
    return s.board.blocked.some(p=>distance(p)<=1)||(s.board.cover??[]).some(p=>distance(p)<=1&&height(p)===height(from));
}
export function isPit(s,p) {return Boolean(s.rules.boardEnabled&&p&&(s.board.pits??[]).some(q=>q.x===p.x&&q.y===p.y));}
