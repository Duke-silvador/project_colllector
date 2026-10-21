const require=(ok,message)=>{if(!ok)throw new Error(message);};
const side=v=>{require(['player','ally','enemy'].includes(v),'Ungültige ursprüngliche Seite.');return v;};
const control=v=>{require(['manual','basic','advanced','dm'].includes(v),'Ungültige ursprüngliche Steuerung.');return v;};
const integer=(v,min,max)=>{require(v!==''&&v!=null&&typeof v!=='boolean'&&Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max,'Ungültige Bindungsdauer.');return Number(v);};
export function allegianceFields(v){
    require(v.raiseLocked===undefined||typeof v.raiseLocked==='boolean','Erhebungssperre: Boolean erforderlich.');
    const raw=v.allegiance;let allegiance=null;
    if(raw!=null){
        require(typeof raw==='object'&&!Array.isArray(raw)&&['dominate','raise'].includes(raw.kind),'Ungültige Seitenbindung.');
        const source=String(raw.source??'').trim();require(source.length>0&&source.length<=100,'Bindungsquelle fehlt.');
        require(raw.turns!==null||raw.kind==='raise','Beherrschen benötigt eine Dauer.');
        allegiance={kind:raw.kind,source,originalSide:side(raw.originalSide),originalControl:control(raw.originalControl),turns:raw.turns===null?null:integer(raw.turns,1,100),appliedTurn:integer(raw.appliedTurn??0,0,Number.MAX_SAFE_INTEGER)};
    }
    return {allegiance,raiseLocked:v.raiseLocked??false};
}
export function beginAllegiance(s,a,b,skill){
    require(!b.allegiance,'Figur ist bereits gebunden.');
    b.allegiance={kind:skill.kind,source:a.id,originalSide:b.side,originalControl:b.control,turns:skill.kind==='raise'&&skill.permanent!==false?null:skill.turns,appliedTurn:s.turnSerial};
    b.side=a.side==='enemy'?'enemy':'ally';b.control=skill.servantControl??'manual';b.hidden=null;
    if(skill.kind==='raise'&&skill.raiseOnce)b.raiseLocked=true;
}
export function endAllegiance(a,reason='expired'){
    const previous=a.allegiance;if(!previous)return null;
    a.side=previous.originalSide;a.control=previous.originalControl;a.allegiance=null;
    if(previous.kind==='raise'){
        a.hp=0;a.condition='dead';a.roundsLeft=null;a.downedRound=null;a.hidden=null;a.hanging=null;
        a.effects=[];a.tactics=[];a.shields=[];a.reactionReserve=false;a.reactionReserved=0;
    }
    return {...previous,reason};
}
export function tickAllegiance(s,a,outside=false){
    const b=a?.allegiance;if(!b||b.turns===null||a.reserve||a.escaped||a.hanging||a.hp<=0||s.phase==='paused')return null;
    if(!outside&&b.appliedTurn===s.turnSerial)return null;
    b.turns--;return b.turns===0?endAllegiance(a):null;
}
export function allegianceText(a,language='de'){
    const b=a.allegiance,l=(de,en)=>language==='en'?en:de;
    return b?(b.kind==='raise'?l('Untot','Undead'):l('Beherrscht','Dominated'))+' · '+(b.turns===null?l('dauerhaft','permanent'):b.turns+' '+l('eigene Züge','own turns')):a.raiseLocked&&a.hp===0?l('Erneutes Erheben gesperrt','Cannot be raised again'):'';
}
