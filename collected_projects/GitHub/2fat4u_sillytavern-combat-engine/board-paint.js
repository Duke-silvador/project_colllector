// A stroke previews locally and commits once on release. No per-cell saves.
export function paintLine(from,to) {
    const count=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));
    return Array.from({length:count+1},(_,i)=>count?{x:Math.round(from.x+(to.x-from.x)*i/count),y:Math.round(from.y+(to.y-from.y)*i/count)}:{...from});
}
export function bindBoardPaint(root,callbacks) {
    const doc=root.ownerDocument??globalThis.document,events=doc?.addEventListener?doc:root;
    let gesture=null,suppressedAt=-Infinity;
    const listen=(host,name,fn)=>{host.addEventListener(name,fn);return ()=>host.removeEventListener?.(name,fn);};
    function cellInfo(cell) {
        if(!cell||root.contains?.(cell)===false||cell.dataset.action!=='cell')return null;
        const position={x:Number(cell.dataset.x),y:Number(cell.dataset.y)};
        return Number.isSafeInteger(position.x)&&Number.isSafeInteger(position.y)&&position.x>=0&&position.y>=0&&position.x<50&&position.y<50?{cell,position}:null;
    }
    function hit(e) {return cellInfo((doc?.elementFromPoint?doc.elementFromPoint(e.clientX,e.clientY):e.target)?.closest?.('.ct-cell'));}
    function mark(info) {
        if(!gesture)return;
        if(!info){gesture.last=null;return;}
        const positions=gesture.last?paintLine(gesture.last,info.position):[info.position];
        for(const p of positions){
            const key=p.x+','+p.y;
            if(gesture.points.has(key)||callbacks.preview?.(p,gesture.context)===false)continue;
            gesture.points.set(key,p);
            const node=p.x===info.position.x&&p.y===info.position.y?info.cell:root.querySelector('[data-action="cell"][data-x="'+p.x+'"][data-y="'+p.y+'"]');
            if(node){node.classList?.add('ct-paint-preview');node.classList?.toggle('ct-paint-remove',gesture.context?.remove===true);gesture.nodes.add(node);}
        }
        gesture.last=info.position;
    }
    function finish() {
        const old=gesture;if(!old)return null;gesture=null;
        for(const node of old.nodes)node.classList?.remove('ct-paint-preview','ct-paint-remove');
        root.classList?.remove('ct-painting');
        try{if(root.hasPointerCapture?.(old.pointerId))root.releasePointerCapture(old.pointerId);}catch{/* Capture may already be released. */}
        return old;
    }
    function cancel(){if(finish())suppressedAt=Date.now();}
    function down(e) {
        suppressedAt=-Infinity;
        if(e.button!==0||e.isPrimary===false||callbacks.enabled()===false)return;
        const info=cellInfo(e.target.closest?.('.ct-cell'));if(!info)return;
        cancel();suppressedAt=-Infinity;
        gesture={pointerId:e.pointerId,context:callbacks.begin(info.position),points:new Map(),nodes:new Set(),last:null};
        root.classList?.add('ct-painting');mark(info);
        e.preventDefault();
        try{root.setPointerCapture?.(e.pointerId);}catch{/* Document listeners still track release. */}
    }
    function move(e) {
        if(!gesture||e.pointerId!==gesture.pointerId)return;
        if(callbacks.enabled()===false||e.buttons===0){cancel();return;}
        e.preventDefault();mark(hit(e));
    }
    async function up(e) {
        if(!gesture||e.pointerId!==gesture.pointerId)return;
        if(callbacks.enabled()===false){cancel();return;}
        e.preventDefault();mark(hit(e));const old=finish();suppressedAt=Date.now();
        if(old.points.size)await callbacks.commit([...old.points.values()],old.context);
    }
    function key(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel();}}
    const remove=[listen(root,'pointerdown',down),listen(events,'pointermove',move),listen(events,'pointerup',up),listen(events,'pointercancel',e=>{if(gesture?.pointerId===e.pointerId)cancel();}),listen(root,'lostpointercapture',()=>cancel()),listen(root,'close',cancel),listen(events,'keydown',key)];
    if(doc?.defaultView?.addEventListener)remove.push(listen(doc.defaultView,'blur',cancel));
    return {pending:()=>Boolean(gesture),cancel,consumeClick(e){if(Date.now()-suppressedAt<500&&e.detail!==0){suppressedAt=-Infinity;e.preventDefault();e.stopImmediatePropagation();return true;}return false;},destroy(){cancel();for(const dispose of remove)dispose();}};
}
