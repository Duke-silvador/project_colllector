// O(1) geometry per cell; range is not a promise of line of sight.
export function rangeFrame(board,position,range) {
    if(!position||!Number.isFinite(range)||range<0)return null;
    const reach=Math.floor(range);
    return {left:Math.max(0,position.x-reach),right:Math.min(board.width-1,position.x+reach),top:Math.max(0,position.y-reach),bottom:Math.min(board.height-1,position.y+reach)};
}
export function rangeEdges(frame,x,y) {
    if(!frame||x<frame.left||x>frame.right||y<frame.top||y>frame.bottom)return '';
    return [y===frame.top?'top':'',x===frame.right?'right':'',y===frame.bottom?'bottom':'',x===frame.left?'left':''].filter(Boolean).map(v=>'ct-range-'+v).join(' ');
}
export function movementEdges(cells,x,y) {
    if(!cells.has(x+','+y))return '';
    return [[0,-1,'top'],[1,0,'right'],[0,1,'bottom'],[-1,0,'left']].filter(([dx,dy])=>!cells.has((x+dx)+','+(y+dy))).map(([, ,side])=>'ct-move-'+side).join(' ');
}

export function visibleCells(board,position,reach,sight){
    const frame=rangeFrame(board,position,reach),cells=new Set();if(!frame)return cells;
    for(let y=frame.top;y<=frame.bottom;y++)for(let x=frame.left;x<=frame.right;x++)if(sight(position,{x,y}))cells.add(x+','+y);
    return cells;
}
export function visionEdges(cells,x,y){return movementEdges(cells,x,y).replaceAll('ct-move-','ct-vision-');}
