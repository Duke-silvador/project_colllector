// Runtime history remains an ordinary array. Persist repeated actors, events and
// boards once, retaining every snapshot and every field for exact undo/reload.
const KIND='combat-history',VERSION=1;
const fail=()=>{throw new Error('Ungültiger Rückgängig-Verlauf. Daten zuerst sichern.');};
export function historyCount(raw){return Array.isArray(raw)?raw.length:raw?.kind===KIND&&Array.isArray(raw.frames)?raw.frames.length:0;}
export function unpackHistory(raw=[]){
    if(Array.isArray(raw))return raw;
    if(!raw||raw.kind!==KIND||raw.version!==VERSION||!['actors','events','boards','rules','frames'].every(k=>Array.isArray(raw[k]))||raw.frames.length>30)fail();
    const ref=(table,i)=>{if(!Number.isInteger(i)||i<0||i>=table.length)fail();return structuredClone(table[i]);};
    return raw.frames.map(frame=>{
        if(!frame||!Array.isArray(frame.actors)||!Array.isArray(frame.log))fail();
        return {...structuredClone(frame),actors:frame.actors.map(i=>ref(raw.actors,i)),log:frame.log.map(i=>ref(raw.events,i)),board:ref(raw.boards,frame.board),rules:ref(raw.rules,frame.rules)};
    });
}
export function packHistory(history){
    if(history.length<8)return Array.from(history);
    const actors=[],events=[],boards=[],rules=[],am=new Map(),em=new Map(),bm=new Map(),rm=new Map();
    const intern=(table,map,value)=>{const key=JSON.stringify(value);if(map.has(key))return map.get(key);const i=table.length;table.push(value);map.set(key,i);return i;};
    const frames=history.map(s=>({...s,actors:s.actors.map(a=>intern(actors,am,a)),log:s.log.map(e=>intern(events,em,e)),board:intern(boards,bm,s.board),rules:intern(rules,rm,s.rules)}));
    return {kind:KIND,version:VERSION,actors,events,boards,rules,frames};
}
export function prepareHistory(raw=[]){
    const history=unpackHistory(raw);
    if(!Object.hasOwn(history,'toJSON'))Object.defineProperty(history,'toJSON',{configurable:true,value(){return packHistory(this);}});
    return history;
}
