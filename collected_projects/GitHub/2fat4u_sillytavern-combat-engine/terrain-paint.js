import { cleanTerrain } from './terrain.js?v=2.0.0-beta.2-hotfix.2';
const key=p=>p.x+','+p.y;
const require=(value,message)=>{if(!value)throw new Error(message);};
export function terrainPaintPatch(s,tool,points,options={}) {
    require(['wall','cover','height','pit','erase'].includes(tool),'Ungültiges Zeichenwerkzeug.');
    require(Array.isArray(points)&&points.length>0&&points.length<=2500,'Ungültiger Geländestrich.');
    require(options.revision===undefined||options.revision===s.revision,'Kampfzustand wurde während des Zeichnens geändert. Bitte erneut zeichnen.');
    require(options.remove===undefined||typeof options.remove==='boolean','Ungültiger Zeichenmodus.');
    const facing=options.facing??'';
    require(['','north','east','south','west'].includes(facing),'Ungültige Deckungsrichtung.');
    const unique=new Map();
    for(const p of points){require(p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<s.board.width&&p.y<s.board.height,'Zeichenfeld außerhalb der Karte.');unique.set(key(p),{x:p.x,y:p.y});}
    const names={wall:'blocked',cover:'cover',height:'heights',pit:'pits'};
    const fields=Object.fromEntries(['blocked','cover','heights','pits'].map(name=>[name,new Map((s.board[name]??[]).map(p=>[key(p),p]))]));
    const occupied=new Set(s.actors.flatMap(a=>[a.position,a.hanging?.anchor].filter(Boolean).map(key)));
    const faces=new Map((s.board.coverFaces??[]).map(p=>[key(p),p]));
    let ladders=[...(s.board.ladders??[])],count=0,skipped=0;
    const first=[...unique.values()].find(p=>!occupied.has(key(p)));
    const remove=tool==='erase'||(options.remove??Boolean(first&&fields[names[tool]].has(key(first))));
    for(const [cell,p] of unique) {
        if(occupied.has(cell)){skipped++;continue;}
        const before=JSON.stringify([Object.values(fields).map(m=>m.has(cell)),faces.get(cell),ladders.filter(v=>key(v.from)===cell||key(v.to)===cell)]);
        if(tool==='erase') {for(const m of Object.values(fields))m.delete(cell);faces.delete(cell);ladders=ladders.filter(v=>key(v.from)!==cell&&key(v.to)!==cell);}
        else if(remove){fields[names[tool]].delete(cell);if(tool==='cover')faces.delete(cell);}
        else {
            fields[names[tool]].set(cell,p);
            const incompatible={wall:['cover','heights','pits'],cover:['blocked','pits'],height:['blocked','pits'],pit:['blocked','cover','heights']}[tool];
            for(const name of incompatible)fields[name].delete(cell);
            if(tool==='cover'&&facing)faces.set(cell,{...p,facing});
            else if(tool!=='height')faces.delete(cell);
            if(['wall','cover','pit'].includes(tool))ladders=ladders.filter(v=>key(v.from)!==cell&&key(v.to)!==cell);
        }
        const after=JSON.stringify([Object.values(fields).map(m=>m.has(cell)),faces.get(cell),ladders.filter(v=>key(v.from)===cell||key(v.to)===cell)]);
        if(before!==after)count++;
    }
    const patch=cleanTerrain(s.board,{...Object.fromEntries(Object.entries(fields).map(([name,map])=>[name,[...map.values()]])),coverFaces:[...faces.values()],ladders});
    return {patch,count,skipped,remove};
}
