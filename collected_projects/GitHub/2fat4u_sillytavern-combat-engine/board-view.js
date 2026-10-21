// Camera state belongs to the UI, never to a figure's movement budget.
export function createBoardView(root) {
    let saved=null;
    const pane=()=>root.querySelector('.ct-board-scroll');
    function capture(key,zoom){const p=pane();if(p&&Number.isFinite(p.scrollLeft)&&p.clientWidth>0)saved={key,zoom,left:p.scrollLeft,top:p.scrollTop,width:p.clientWidth,height:p.clientHeight};}
    function restore(key,zoom){const p=pane();if(!p||!saved||saved.key!==key||!p.clientWidth)return;const ratio=(zoom+2)/(saved.zoom+2);
        const left=ratio===1?saved.left:(saved.left+saved.width/2-28)*ratio+28-p.clientWidth/2,top=ratio===1?saved.top:(saved.top+saved.height/2-28)*ratio+28-p.clientHeight/2;
        p.scrollLeft=Math.max(0,Math.min(Math.max(0,p.scrollWidth-p.clientWidth),left));p.scrollTop=Math.max(0,Math.min(Math.max(0,p.scrollHeight-p.clientHeight),top));}
    function center(position,zoom){const p=pane();if(!p||!position)return false;const cell=root.querySelector(`.ct-cell[data-x="${position.x}"][data-y="${position.y}"]`),rect=cell?.getBoundingClientRect?.(),r=p.getBoundingClientRect?.();
        p.scrollLeft=Math.max(0,Math.min(p.scrollWidth-p.clientWidth,rect&&r?p.scrollLeft+rect.left-r.left+rect.width/2-p.clientWidth/2:28+(position.x+.5)*zoom-p.clientWidth/2));
        p.scrollTop=Math.max(0,Math.min(p.scrollHeight-p.clientHeight,rect&&r?p.scrollTop+rect.top-r.top+rect.height/2-p.clientHeight/2:28+(position.y+.5)*zoom-p.clientHeight/2));return true;}
    return {capture,restore,center,clear(){saved=null;}};
}
