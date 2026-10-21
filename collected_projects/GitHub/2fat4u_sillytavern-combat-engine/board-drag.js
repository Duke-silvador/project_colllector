// Pointer-driven figure movement; independent of native HTML drag-and-drop.
// The controller still validates every move. A gesture never changes game state.
export function bindBoardDrag(root, callbacks) {
    const doc=root.ownerDocument??globalThis.document;
    const events=doc?.addEventListener?doc:root;
    let gesture=null, target=null, frame=null, suppressedAt=-Infinity;
    const listen=(host,name,fn,capture=false)=>{host.addEventListener(name,fn,capture);return ()=>host.removeEventListener?.(name,fn,capture);};
    function hit() {
        const node=doc?.elementFromPoint?.(gesture.x,gesture.y);
        const cell=node?.closest?.('.ct-cell');
        const reserve=!cell&&callbacks.reserve?node?.closest?.('[data-reserve-drop]'):null;
        if(reserve&&root.contains?.(reserve)!==false)return {cell:reserve,position:null};
        if(!cell||root.contains?.(cell)===false)return null;
        const p={x:Number(cell.dataset.x),y:Number(cell.dataset.y)};
        return Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.y)?{cell,position:p}:null;
    }
    function mark() {
        const next=gesture?hit():null;
        if(target?.cell!==next?.cell){target?.cell.classList?.remove('ct-drag-target','ct-drag-invalid');target=next;}
        if(target){const allowed=callbacks.preview?.(gesture.id,target.position,gesture.context)!==false;target.cell.classList?.toggle('ct-drag-target',allowed);target.cell.classList?.toggle('ct-drag-invalid',!allowed);}
    }
    function scroll() {
        if(!gesture?.active)return;
        const pane=root.querySelector('.ct-board-scroll'),r=pane?.getBoundingClientRect?.();
        if(!r||gesture.x<r.left||gesture.x>r.right||gesture.y<r.top||gesture.y>r.bottom)return;
        const delta=(v,min,max)=>v<min+24?-10:v>max-24?10:0;
        const dx=delta(gesture.x,r.left,r.right),dy=delta(gesture.y,r.top,r.bottom);
        if(!dx&&!dy)return;
        const left=pane.scrollLeft,top=pane.scrollTop;pane.scrollLeft+=dx;pane.scrollTop+=dy;
        if(left===pane.scrollLeft&&top===pane.scrollTop)return;
        mark();if(globalThis.requestAnimationFrame)frame=globalThis.requestAnimationFrame(()=>{frame=null;scroll();});
    }
    function finish(suppress=false) {
        if(!gesture)return;
        const old=gesture;gesture=null;
        if(frame!==null){globalThis.cancelAnimationFrame?.(frame);frame=null;}
        target?.cell.classList?.remove('ct-drag-target','ct-drag-invalid');target=null;
        root.classList?.remove('ct-dragging');
        old.source.draggable=old.draggable;
        if(suppress&&old.active)suppressedAt=Date.now();
        try{if(root.hasPointerCapture?.(old.pointerId))root.releasePointerCapture(old.pointerId);}catch{/* The browser may have released capture already. */}
        callbacks.end?.();
    }
    function down(e) {
        suppressedAt=-Infinity;
        if(e.button!==0||e.isPrimary===false||callbacks.enabled()===false)return;
        const source=e.target.closest?.('[data-drag-actor], [data-id][data-x]');
        if(!source?.dataset.id)return;
        finish();
        gesture={id:source.dataset.id,source,draggable:source.draggable,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,active:false,context:callbacks.begin?.(source.dataset.id)};
        // Retain ordinary click behavior while preventing a competing native drag.
        source.draggable=false;
    }
    function move(e) {
        if(!gesture||e.pointerId!==gesture.pointerId)return;
        gesture.x=e.clientX;gesture.y=e.clientY;
        if(!gesture.active){if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)<4)return;gesture.active=true;root.classList?.add('ct-dragging');callbacks.start?.(gesture.id);try{root.setPointerCapture?.(e.pointerId);}catch{/* Document listeners still track the gesture. */}}
        e.preventDefault();mark();if(frame===null)scroll();
    }
    function up(e) {
        if(!gesture||e.pointerId!==gesture.pointerId)return;
        gesture.x=e.clientX;gesture.y=e.clientY;
        const old=gesture,drop=old.active?hit():null;
        if(old.active)e.preventDefault();finish(old.active);
        if(drop&&callbacks.enabled()!==false){if(drop.position===null)callbacks.reserve?.(old.id,old.context);else callbacks.drop(old.id,drop.position,old.context);}
    }
    function cancel(e) {if(gesture&&(e?.pointerId===undefined||e.pointerId===gesture.pointerId))finish(gesture.active);}
    function key(e) {if(e.key==='Escape'&&gesture){e.preventDefault();cancel();}}
    function consumeClick(e) {if(Date.now()-suppressedAt<500&&e.detail!==0){suppressedAt=-Infinity;e.preventDefault();e.stopImmediatePropagation();return true;}return false;}
    const remove=[listen(root,'pointerdown',down),listen(events,'pointermove',move),listen(events,'pointerup',up),listen(events,'pointercancel',cancel),listen(root,'lostpointercapture',cancel),listen(events,'keydown',key)];
    if(doc?.defaultView?.addEventListener)remove.push(listen(doc.defaultView,'blur',()=>cancel()));
    return {pending:()=>Boolean(gesture),cancel:()=>cancel(),consumeClick,suppressClick:()=>{suppressedAt=Date.now();},destroy(){finish();for(const dispose of remove)dispose();}};
}
