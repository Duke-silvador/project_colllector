// Optional UI feedback observes committed events; it never changes combat state.
export function visualCues(before,after,events) {
    if(events.some(e=>['import','undo','reset'].includes(e.type)))return [];
    const cues=[];const add=(id,kind)=>{const p=after.actors.find(a=>a.id===id)?.position;if(p)cues.push({...p,kind});};
    for(const e of events){const r=e.details??{};
        if(['skill','check'].includes(e.type)&&r.custom){const v=r.custom;add(v.target,!v.success?'miss':v.damage?.applied>0?'hit':v.healing?.applied>0?'heal':'move');continue;}
        if(e.type==='hit')for(const v of r.affected??[{id:r.target}])if(!v.blocked&&(v.id===r.target||v.damage===undefined||v.damage>0))add(v.id,'hit');
        if(e.type==='miss')add(r.target,'miss');
        if(e.type==='use'&&r.refill)add(r.actor,'move');
        if(e.type==='use')for(const v of r.affected??[{id:r.target,healing:1}])if(v.healing>0||v.cures?.length)add(v.id,'heal');
        if(e.type==='shield')add(r.actor,'move');
        if(e.type==='effect'&&r.damage>0)add(r.actor,'hit');
        if(e.type==='move')add(r.actor??r.id,'move');
        if(e.type==='skill')add(r.target??r.actor,r.success?'move':'miss');
        if(e.type==='check'&&!r.free)add(r.target??r.actor,r.success?'move':'miss');
    }
    if(after.phase==='active'&&(before.phase!=='active'||before.turnSerial!==after.turnSerial))add(after.order[after.turn],'turn');
    return cues.filter((v,i)=>cues.findIndex(q=>q.x===v.x&&q.y===v.y&&q.kind===v.kind)===i);
}
export function createVisualEffects(root,preferences,{schedule=setTimeout,cancel=clearTimeout}={}) {
    const timers=new Map();
    function remove(item){for(const cell of item.nodes)for(const name of item.classes)cell.classList.remove(name);}
    function clear(){for(const item of timers.values()){cancel(item.timer);remove(item);}timers.clear();}
    function attach(item){const cell=root.querySelector(`.ct-cell[data-x="${item.x}"][data-y="${item.y}"]`);if(!cell)return;item.nodes.add(cell);for(const name of item.classes)cell.classList.add(name);cell.style?.setProperty?.('--ct-flash-delay',Math.min(0,item.started-Date.now())+'ms');}
    function refresh(){if(preferences().visualEffects===false){clear();return;}for(const item of timers.values())attach(item);}
    function play(cues){if(preferences().visualEffects===false){clear();return;}for(const cue of cues){
        if(!['hit','miss','heal','move','turn'].includes(cue.kind))continue;
        const key=cue.x+','+cue.y,old=timers.get(key);if(old)cancel(old.timer);
        if(old&&['hit','miss','heal'].includes(cue.kind))remove(old);
        const classes=['hit','miss','heal'].includes(cue.kind)?new Set():old?.classes??new Set();classes.add('ct-flash-'+cue.kind);
        const item={x:cue.x,y:cue.y,started:Date.now(),classes,nodes:old?.nodes??new Set()};
        item.timer=schedule(()=>{remove(item);timers.delete(key);},650);timers.set(key,item);attach(item);
    }}
    return {play,refresh,clear,destroy:clear};
}
