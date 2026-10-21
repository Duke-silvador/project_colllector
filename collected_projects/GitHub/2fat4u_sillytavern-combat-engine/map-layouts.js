import { dungeonMap, castleMap, forestMap } from './map-generators.js?v=2.0.0-beta.2-hotfix.2';
const key=p=>`${p.x},${p.y}`;
export function architecture(board,actors,protectedCells,hash) {
    if(board.preset==='dungeon')return dungeonMap(board,actors,hash);
    if(board.preset==='forest')return forestMap(board,actors,protectedCells,hash);
    if(board.preset==='castle')return castleMap(board,actors,protectedCells,hash);
    if(!['city','castle'].includes(board.preset)||board.width<5||board.height<6)return board;
    const occupied=new Set(actors.filter(a=>a.position).map(a=>key(a.position))),heights=[],ladders=[],coverFaces=[];
    const blocked=new Map(board.blocked.map(p=>[key(p),p])),cover=new Map(board.cover.map(p=>[key(p),p]));
    const clear=p=>{blocked.delete(key(p));cover.delete(key(p));};
        const offset=hash('roof',0)%2;
        for(let y=2;y<board.height-3;y+=6)for(let x=2+offset;x<board.width-3;x+=6){
            const roof=[{x,y},{x:x+1,y},{x,y:y+1},{x:x+1,y:y+1}];if(roof.some(p=>occupied.has(key(p))||protectedCells.has(key(p))))continue;
            for(const p of roof){clear(p);heights.push(p);}const from={x:x-1,y},to={x,y};
            for(let row=0;row<board.height;row++)clear({x:x-1,y:row});for(let col=0;col<board.width;col++)clear({x:col,y:0});
            ladders.push({from,to});const railing={x:x+1,y:y+1};if(!occupied.has(key(railing))){cover.set(key(railing),railing);coverFaces.push({...railing,facing:'east'});}
        }
    for(const a of actors)if(a.position)clear(a.position);
    for(const l of ladders){clear(l.from);clear(l.to);}
    return {...board,blocked:[...blocked.values()],cover:[...cover.values()],heights,ladders,coverFaces};
}
