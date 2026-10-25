// Arrangement timeline controller: viewport, pointer gestures, keyboard, edge autoscroll and the
// accessible DOM that mirrors the canvas. It edits the composition only through callbacks (one
// undoable edit per finished gesture) and never touches audio.
import {clamp,barSeconds,escapeHTML as esc} from './engine.js';
import * as M from './timeline-model.js';
import {createPainter} from './timeline-canvas.js';

const VIEW_KEY='words-sf9YLsZGuls-view-v1',MIN_BARS=.125;
const cursorSvg=paths=>`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke-linecap='round' stroke-linejoin='round'><g stroke='black' stroke-width='4'>${paths}</g><g stroke='white' stroke-width='1.6'>${paths}</g></svg>`)}") 12 12, ew-resize`;
const CURSORS={trimLeft:cursorSvg("<path d='M15 5h-3v14h3'/><path d='M3 12h6M6 9l-3 3 3 3'/><path d='M15 12h6M18 9l3 3-3 3'/>"),trimRight:cursorSvg("<path d='M9 5h3v14H9'/><path d='M3 12h6M6 9l-3 3 3 3'/><path d='M15 12h6M18 9l3 3-3 3'/>")};

export function readViewPrefs(){
  try{const v=JSON.parse(localStorage.getItem(VIEW_KEY));if(v?.version===1&&v.studio&&typeof v.studio==='object')return {
    zoom:Number.isFinite(v.studio.zoom)?clamp(v.studio.zoom,0,M.ZOOM_MAX):null,fit:v.studio.fit!==false,scroll:Number.isFinite(v.studio.scroll)?Math.max(0,v.studio.scroll):0,
    rowHeight:M.ROW_HEIGHTS[v.studio.rowHeight]?v.studio.rowHeight:'standard',snap:v.studio.snap!==false};}catch{}
  return {zoom:null,fit:true,scroll:0,rowHeight:'standard',snap:true};
}

export function createTimeline(host,cb){
  host.innerHTML=`<div class="tl"><div class="tl-rail" role="group" aria-label="Layers"></div><div class="tl-view"><div class="tl-scroller"><div class="tl-spacer"><div class="tl-stage"><canvas class="tl-canvas"></canvas><canvas class="tl-canvas tl-dynamic"></canvas></div><div class="tl-sections"></div></div></div><div class="tl-ruler-focus" role="slider" tabindex="0" aria-label="Playhead position" aria-valuemin="1"></div><div class="sr-only tl-clips" role="group" aria-label="Clips"></div></div></div>`;
  const $=s=>host.querySelector(s),root=$('.tl'),rail=$('.tl-rail'),scroller=$('.tl-scroller'),spacer=$('.tl-spacer'),stage=$('.tl-stage'),sectionsEl=$('.tl-sections'),clipsEl=$('.tl-clips'),rulerEl=$('.tl-ruler-focus');
  const [contentCanvas,dynamicCanvas]=stage.querySelectorAll('canvas'),painter=createPainter(contentCanvas,dynamicCanvas);
  const prefs=readViewPrefs();
  let state={project:null,selectedTrack:null,selectedClip:null,position:0,playing:false},items=[],rows=M.rowLayout(0,prefs.rowHeight);
  let view={zoom:prefs.zoom??0,px:M.pxPerBarForZoom(prefs.zoom??0),scroll:prefs.scroll,width:1,fit:prefs.fit||prefs.zoom==null};
  let hover=null,skimmer=null,gesture=null,guide=null,badge=null,focused=false,dirty={content:true,dynamic:true},raf=0,persistTimer=0,autoRaf=0,lastPointer=null,railKey='',clipsKey='',sectionsKey='';

  // ---------- scene ----------
  const playheadBar=()=>state.project?1+state.position/barSeconds(state.project.bpm):1;
  function buildItems(){
    const p=state.project,solo=p.tracks.some(t=>t.solo);items=[];
    p.tracks.forEach((track,trackIndex)=>{for(const clip of track.clips){if(clip.bar>p.bars)continue;
      const asset=cb.asset(clip.asset),edit=cb.edit(clip.asset);
      items.push({id:clip.id,trackIndex,track,clip,bar:clip.bar,bars:Math.min(clip.bars,p.bars-clip.bar+1),kind:clip.asset.startsWith('synth-')?'synth':'audio',
        name:asset?.name||'Missing audio',asset,edit,audio:M.clipAudio(clip,p,asset,edit),dimmed:track.mute||(solo&&!track.solo)});}});
  }
  // While a gesture runs, the dragged clip is drawn from its preview (and its audio mapping is
  // recomputed, so a left trim keeps the waveform in place) with a landing wash at its origin.
  function sceneItems(){
    if(!gesture?.active||!gesture.preview)return items;
    const p=state.project,pv=gesture.preview;
    return items.map(it=>{if(it.id!==gesture.item.id)return it;
      const track=p.tracks[pv.trackIndex],clip={...it.clip,bar:pv.bar,bars:pv.bars,offset:pv.offset??it.clip.offset,fadeIn:pv.fadeIn??it.clip.fadeIn,fadeOut:pv.fadeOut??it.clip.fadeOut,pattern:pv.pattern??it.clip.pattern};
      return {...it,track,clip,trackIndex:pv.trackIndex,bar:pv.bar,bars:Math.min(pv.bars,p.bars-pv.bar+1),audio:M.clipAudio(clip,p,it.asset,it.edit),dragging:true,trimEdge:gesture.type==='trim'?gesture.edge:null,
        ghost:gesture.type==='move'&&(pv.bar!==it.bar||pv.trackIndex!==it.trackIndex)?{trackIndex:it.trackIndex,bar:it.bar,bars:it.bars}:null};});
  }
  function scene(){
    return {view,rows,project:state.project,items:sceneItems(),selectedClip:state.selectedClip,selectedTrack:state.selectedTrack,activeTrack:gesture?.active&&gesture.type==='move'?state.project.tracks[gesture.preview.trackIndex]?.id:null,
      hover:gesture?.active?null:hover,focused,invalid:gesture?.preview?.invalid,peaksFor:cb.peaks,playheadBar:gesture?.type==='seek'&&gesture.active?gesture.bar:playheadBar(),playing:state.playing,
      skimmer:gesture?.active||state.playing?null:skimmer,guide,badge,onion:gesture?.active&&gesture.type==='trim'?{trackIndex:gesture.item.trackIndex,bar:gesture.item.bar,bars:gesture.item.bars}:null};
  }
  function request(layer='all'){if(layer!=='dynamic')dirty.content=true;dirty.dynamic=true;if(!raf)raf=requestAnimationFrame(flush);}
  function flush(){raf=0;if(!state.project)return;const s=scene();if(dirty.content){painter.paintContent(s);placeSections();}painter.paintDynamic(s);dirty={content:false,dynamic:false};}
  // Pointer feedback paints synchronously so the line lands in the same frame as the event (renderDynamicNow).
  function paintDynamicNow(){if(!state.project)return;if(dirty.content)return flush();painter.paintDynamic(scene());}

  // ---------- viewport ----------
  function layout(){
    if(!state.project)return;rows=M.rowLayout(state.project.tracks.length,prefs.rowHeight);
    view.width=Math.max(1,scroller.clientWidth);
    // Automatic zoom fits the arrangement, but narrow screens keep bars at least 36 px wide and scroll.
    if(view.fit){view.zoom=M.fitZoom(view.width,state.project.bars);if(view.width<520&&M.pxPerBarForZoom(view.zoom)<36)view.zoom=M.zoomForPxPerBar(36);}
    view.px=M.pxPerBarForZoom(view.zoom);
    spacer.style.width=M.contentWidth(view,state.project.bars)+'px';spacer.style.height=rows.total+'px';
    stage.style.width=view.width+'px';stage.style.height=rows.total+'px';
    const dpr=window.devicePixelRatio||1,s=painter.size;
    if(s.width!==view.width||s.height!==rows.total||s.dpr!==dpr)painter.resize(view.width,rows.total,dpr);
    view.scroll=clamp(view.scroll,0,M.maxScroll(view,state.project.bars));if(Math.abs(scroller.scrollLeft-view.scroll)>.5)scroller.scrollLeft=view.scroll;view.scroll=scroller.scrollLeft;
    rulerEl.style.height=M.RULER_H+'px';request();
  }
  function persist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{try{localStorage.setItem(VIEW_KEY,JSON.stringify({version:1,studio:{zoom:view.zoom,fit:view.fit,scroll:view.scroll,rowHeight:prefs.rowHeight,snap:prefs.snap}}));}catch{}},200);}
  function setZoom(z,anchorX){
    if(!state.project)return;const next=M.zoomAround(view,z,anchorX??zoomAnchor(),state.project.bars);
    view={...next,fit:false};spacer.style.width=M.contentWidth(view,state.project.bars)+'px';scroller.scrollLeft=view.scroll;view.scroll=scroller.scrollLeft;
    request();persist();cb.viewChanged?.();
  }
  const zoomAnchor=()=>{const x=M.barToX(view,playheadBar());return x>=0&&x<=view.width?x:view.width/2;};
  function fit(){view.fit=true;view.scroll=0;layout();persist();cb.viewChanged?.();}
  function reveal(bar,bars=0){if(!state.project)return;const end=M.scrollToReveal(view,bar+bars,state.project.bars),s=M.scrollToReveal({...view,scroll:end},bar,state.project.bars);if(s!==view.scroll){scroller.scrollLeft=s;view.scroll=scroller.scrollLeft;request();persist();}}
  scroller.addEventListener('scroll',()=>{view.scroll=scroller.scrollLeft;request();persist();},{passive:true});
  scroller.addEventListener('wheel',e=>{
    if(!(e.ctrlKey||e.altKey))return; // plain wheel and trackpad swipes pan natively
    e.preventDefault();const d=M.wheelZoomDelta(e);if(d)setZoom(view.zoom+d,e.clientX-scroller.getBoundingClientRect().left);
  },{passive:false});
  new ResizeObserver(()=>layout()).observe(scroller);
  matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`).addEventListener?.('change',()=>layout());

  // ---------- pointer geometry ----------
  const local=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,meta:e.metaKey||e.ctrlKey,shift:e.shiftKey,clientX:e.clientX,clientY:e.clientY};};
  const fades=it=>{const pps=view.px/barSeconds(state.project.bpm),audible=it.audio?.audible||0;return it.audio?{fadeIn:Math.min(it.clip.fadeIn,audible/2),fadeOut:Math.min(it.clip.fadeOut,audible/2),pxPerSec:pps,endPx:Math.min(it.bars*view.px,audible*pps)}:null;};
  const hitAt=pt=>M.hitTest({x:pt.x,y:pt.y,view,rows,items,fades});
  const gridUnit=()=>Math.max(1,M.rulerIntervals(view.px).minor);
  function candidates(excludeId,{grid=true}={}){
    return M.snapCandidates({items,excludeId,playheadBar:playheadBar(),sections:state.project.sections,bars:state.project.bars,gridUnit:grid?gridUnit():Infinity,range:M.visibleBars(view)})
      .filter(c=>grid||c.priority<3);
  }
  function snap(edges,excludeId,pt,opts){
    if(!prefs.snap||pt.meta)return {adjustment:0,guide:null}; // Cmd/Ctrl suspends snapping, as Kino's snapDisabled
    return M.findSnap({edges,candidates:candidates(excludeId,opts),thresholdBars:M.SNAP_PX/view.px});
  }

  // ---------- gestures ----------
  function setCursor(c){if(stage.style.cursor!==c)stage.style.cursor=c;}
  function cursorFor(hit){return hit.type==='trim'?(hit.edge==='left'?CURSORS.trimLeft:CURSORS.trimRight):hit.type==='fade'?'ew-resize':hit.type==='clip'?'grab':'default';}
  function hoverKey(h){return h?`${h.type}:${h.item?.id||''}:${h.edge||h.side||''}`:'';}
  function updateHover(pt){
    const hit=hitAt(pt),next=['clip','trim','fade'].includes(hit.type)?hit:null;setCursor(cursorFor(hit));
    if(hoverKey(next)!==hoverKey(hover)){hover=next;request('content');}
    const bar=M.quantize(M.xToBar(view,pt.x)),marks=items.flatMap(it=>[it.bar,it.bar+it.bars]),r=M.resolveSkimmer(clamp(bar,1,state.project.bars+1),playheadBar(),marks,b=>M.barToX(view,b));
    skimmer={bar:r.bar,fused:r.fused,label:pt.y<M.RULER_H};paintDynamicNow();
  }
  stage.addEventListener('pointermove',e=>{if(!state.project)return;const pt=local(e);lastPointer=pt;if(gesture)return moveGesture(pt);updateHover(pt);});
  stage.addEventListener('pointerleave',()=>{if(gesture)return;skimmer=null;if(hover){hover=null;request('content');}else paintDynamicNow();});
  stage.addEventListener('pointerdown',e=>{
    if(!state.project||e.button!==0||e.target.closest('input'))return;
    const pt=local(e),hit=hitAt(pt);lastPointer=pt;e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    if(hit.type==='ruler'||hit.type==='sections'){gesture={type:'seek',pointerId:e.pointerId,active:true,bar:playheadBar()};cb.pause();rulerEl.focus({preventScroll:true});moveGesture(pt);startAutoscroll();return;}
    if(hit.item){
      cb.select(hit.item.track.id,hit.item.id);focusClipButton(hit.item.id);
      gesture={type:hit.type==='clip'?'move':hit.type,edge:hit.edge,side:hit.side,pointerId:e.pointerId,start:pt,startBar:M.xToBar(view,pt.x),item:hit.item,active:false,trackDelta:0};
      setCursor(hit.type==='clip'?'grabbing':cursorFor(hit));return;
    }
    if(hit.type==='lane'){gesture={type:'lane',pointerId:e.pointerId,start:pt,scroll:view.scroll,trackIndex:hit.trackIndex,active:false};scroller.focus({preventScroll:true});}
  });
  stage.addEventListener('pointerup',e=>{if(gesture&&e.pointerId===gesture.pointerId)endGesture(local(e));});
  stage.addEventListener('pointercancel',e=>{if(gesture&&e.pointerId===gesture.pointerId)cancelGesture();});
  stage.addEventListener('lostpointercapture',e=>{if(gesture&&e.pointerId===gesture.pointerId)cancelGesture();});
  stage.addEventListener('dblclick',e=>{
    if(!state.project||e.target.closest('input'))return;const pt=local(e),hit=hitAt(pt);if(hit.type!=='lane')return;
    const raw=M.quantize(M.xToBar(view,pt.x)),s=snap([raw],null,pt);cb.insert(state.project.tracks[hit.trackIndex].id,clamp(raw+s.adjustment,1,state.project.bars));
  });

  function moveGesture(pt){
    const g=gesture,p=state.project;
    if(g.type==='seek'){
      let bar=clamp(M.quantize(M.xToBar(view,pt.x)),1,p.bars+1);const s=snap([bar],null,pt,{grid:false});
      if(s.guide&&s.guide.kind!=='playhead'){bar+=s.adjustment;guide=s.guide;}else guide=null;
      g.bar=bar;cb.seek((bar-1)*barSeconds(p.bpm));badge=null;request('dynamic');return;
    }
    if(!g.active){if(Math.abs(pt.x-g.start.x)<=M.DRAG_THRESHOLD_PX&&Math.abs(pt.y-g.start.y)<=M.DRAG_THRESHOLD_PX)return;
      g.active=true;hover=null;skimmer=null;if(g.type!=='lane'){cb.pause();startAutoscroll();}}
    if(g.type==='lane'){scroller.scrollLeft=g.scroll-(pt.x-g.start.x);view.scroll=scroller.scrollLeft;setCursor('grabbing');request();return;}
    const it=g.item,clip=it.clip,delta=Math.round((M.xToBar(view,pt.x)-g.startBar)*M.STEPS)/M.STEPS;guide=null;
    if(g.type==='move'){
      let bar=clamp(it.bar+delta,1,p.bars-it.bars+1);const s=snap([bar,bar+it.bars],it.id,pt);
      if(s.guide){bar=clamp(bar+s.adjustment,1,p.bars-it.bars+1);guide=s.guide;}
      const probeY=rows.top(it.trackIndex)+rows.height/2+(pt.y-g.start.y),candidate=clamp(rows.indexAt(probeY)-it.trackIndex,-it.trackIndex,rows.count-1-it.trackIndex);
      g.trackDelta=M.resolveTrackDelta({candidate,committed:g.trackDelta,probeY,sourceIndex:it.trackIndex,top:rows.top});
      const trackIndex=it.trackIndex+g.trackDelta,invalid=M.overlaps(items,it.id,trackIndex,bar,it.bars);
      g.preview={trackIndex,bar,bars:it.bars,invalid};badge={x:pt.x+12,y:Math.max(M.HEAD_H+2,pt.y-26),text:`${M.formatPosition(bar,1)} · ${p.tracks[trackIndex].name}${invalid?' · overlaps':''}`};
    }else if(g.type==='trim'){
      const gaps=M.neighbourGaps(items,it),end=it.bar+it.bars,rate=it.audio?.span?.rate||1,bar0=barSeconds(p.bpm);
      if(g.edge==='right'){
        let next=end+delta;const s=snap([next],it.id,pt);if(s.guide){next+=s.adjustment;guide=s.guide;}
        next=clamp(next,it.bar+MIN_BARS,Math.min(p.bars+1,end+gaps.after));
        g.preview={trackIndex:it.trackIndex,bar:it.bar,bars:next-it.bar};
      }else{
        let next=it.bar+delta;const s=snap([next],it.id,pt);if(s.guide){next+=s.adjustment;guide=s.guide;}
        const shiftsSource=it.kind==='audio'&&!clip.loop,earliest=Math.max(1,it.bar-gaps.before,shiftsSource?it.bar-clip.offset/(bar0*rate):1);
        next=clamp(next,Math.ceil((earliest-1)*M.STEPS-1e-6)/M.STEPS+1,end-MIN_BARS);
        const moved=next-it.bar,steps=Math.round(moved*M.STEPS);
        g.preview={trackIndex:it.trackIndex,bar:next,bars:end-next,offset:shiftsSource?Math.max(0,clip.offset+moved*bar0*rate):clip.offset,
          pattern:it.kind==='synth'?clip.pattern.map((_,i)=>clip.pattern[((i+steps)%16+16)%16]):clip.pattern};
        if(guide&&Math.abs(guide.bar-next)>1e-6)guide=null;
      }
      if(guide&&g.edge==='right'&&Math.abs(guide.bar-(g.preview.bar+g.preview.bars))>1e-6)guide=null;
      const bars=g.preview.bars;badge={x:pt.x+12,y:Math.max(M.HEAD_H+2,pt.y-26),text:`${+bars.toFixed(3)} bar${bars===1?'':'s'} · ${(Math.min(bars,p.bars-g.preview.bar+1)*bar0).toFixed(2)} s`};
    }else if(g.type==='fade'){
      const pps=view.px/barSeconds(p.bpm),x0=M.barToX(view,it.bar),half=(it.audio?.audible||0)/2,f=fades(it);
      const value=g.side==='in'?clamp((pt.x-x0)/pps,0,Math.min(2,half)):clamp((x0+f.endPx-pt.x)/pps,0,Math.min(3,half)),rounded=Math.round(value*100)/100;
      g.preview={trackIndex:it.trackIndex,bar:it.bar,bars:it.bars,[g.side==='in'?'fadeIn':'fadeOut']:rounded};
      badge={x:pt.x+12,y:Math.max(M.HEAD_H+2,pt.y-26),text:`Fade ${g.side} ${rounded.toFixed(2)} s`};
    }
    request();
  }
  function endGesture(pt){
    const g=gesture;stopAutoscroll();
    if(g.type==='seek'){gesture=null;guide=null;cb.seek((g.bar-1)*barSeconds(state.project.bpm));cb.resume();request();return;}
    gesture=null;guide=null;badge=null;
    if(g.type==='lane'){if(!g.active){const p=state.project,raw=clamp(M.quantize(M.xToBar(view,pt.x)),1,p.bars+1),s=snap([raw],null,pt,{grid:false});
        cb.select(p.tracks[g.trackIndex].id,null);cb.seekTo((raw+(s.guide?.kind==='clip edge'?s.adjustment:0)-1)*barSeconds(p.bpm));}
      updateHover(pt);request();return;}
    if(!g.active){updateHover(pt);request();return;}
    const pv=g.preview,it=g.item;
    if(pv&&!pv.invalid&&(pv.bar!==it.bar||pv.bars!==it.bars||pv.trackIndex!==it.trackIndex||pv.offset!==undefined&&pv.offset!==it.clip.offset||pv.fadeIn!==undefined||pv.fadeOut!==undefined)){
      const destId=state.project.tracks[pv.trackIndex].id,label=g.type==='move'?'Move clip':g.type==='trim'?'Trim clip':'Fade';
      cb.commit(label,p=>{const from=p.tracks.find(t=>t.clips.some(c=>c.id===it.id)),clip=from.clips.find(c=>c.id===it.id);
        Object.assign(clip,{bar:pv.bar,bars:pv.bars},pv.offset!==undefined?{offset:pv.offset}:{},pv.pattern?{pattern:pv.pattern}:{},pv.fadeIn!==undefined?{fadeIn:pv.fadeIn}:{},pv.fadeOut!==undefined?{fadeOut:pv.fadeOut}:{});
        if(from.id!==destId){from.clips=from.clips.filter(c=>c.id!==it.id);p.tracks.find(t=>t.id===destId).clips.push(clip);}
        return {trackId:destId,clipId:it.id};});
    }else if(pv?.invalid)cb.notice?.('That spot overlaps another clip on this layer.');
    cb.resume();updateHover(pt);request();
  }
  function cancelGesture(){if(!gesture)return;const g=gesture;gesture=null;guide=null;badge=null;stopAutoscroll();if(g.type==='seek')cb.resume();else if(g.active)cb.resume();request();}

  // Edge autoscroll: a dt-scaled rAF loop that keeps replaying the gesture at the last pointer
  // position, so a clip keeps following the content while the view scrolls under a still cursor.
  function startAutoscroll(){
    stopAutoscroll();let last=performance.now();
    const tick=now=>{autoRaf=0;if(!gesture?.active||gesture.type==='lane')return;const dt=Math.min(.1,(now-last)/1000);last=now;
      if(lastPointer&&dt>0){const v=M.edgeScrollVelocity({cursor:lastPointer.x,edgeLow:0,edgeHigh:view.width,maxSpeed:gesture.type==='seek'?M.AUTOSCROLL_SEEK_MAX:M.AUTOSCROLL_MAX});
        if(v){const before=scroller.scrollLeft;scroller.scrollLeft=clamp(before+v*dt,0,M.maxScroll(view,state.project.bars));
          if(scroller.scrollLeft!==before){view.scroll=scroller.scrollLeft;const r=stage.getBoundingClientRect();moveGesture({...lastPointer,x:lastPointer.clientX-r.left,y:lastPointer.clientY-r.top});}}}
      autoRaf=requestAnimationFrame(tick);};
    autoRaf=requestAnimationFrame(tick);
  }
  function stopAutoscroll(){if(autoRaf)cancelAnimationFrame(autoRaf);autoRaf=0;}

  // ---------- keyboard ----------
  function handleKey(e){
    if(!state.project)return false;const key=e.key,p=state.project,sel=items.find(it=>it.id===state.selectedClip);
    if(key==='Escape'){if(gesture){cancelGesture();return true;}if(sel){cb.select(sel.track.id,null);return true;}return false;}
    if(e.metaKey||e.ctrlKey)return false;
    if((key==='ArrowLeft'||key==='ArrowRight')&&e.shiftKey&&!e.altKey){scroller.scrollLeft+=(key==='ArrowLeft'?-1:1)*view.width/4;return true;}
    if((key==='ArrowLeft'||key==='ArrowRight')&&e.shiftKey&&e.altKey&&sel){
      const step=gridUnit()/M.STEPS,bar=clamp(sel.bar+(key==='ArrowLeft'?-step:step),1,p.bars-sel.bars+1);
      if(bar!==sel.bar&&!M.overlaps(items,sel.id,sel.trackIndex,bar,sel.bars))cb.commit('Nudge clip',q=>{q.tracks[sel.trackIndex].clips.find(c=>c.id===sel.id).bar=bar;return {trackId:sel.track.id,clipId:sel.id};});
      reveal(bar,sel.bars);return true;
    }
    if(key.startsWith('Arrow')&&!e.altKey&&!e.shiftKey){
      if(!items.length)return false;const dir=key.slice(5).toLowerCase();let id=sel?M.keyboardTarget(items,sel.id,dir):null;
      if(!sel){const t=p.tracks.findIndex(t=>t.id===state.selectedTrack),pool=items.filter(it=>it.trackIndex===Math.max(0,t));id=(pool.find(it=>it.bar+it.bars>playheadBar())||pool[0]||items[0]).id;}
      if(id){const it=items.find(x=>x.id===id);cb.select(it.track.id,it.id);reveal(it.bar,it.bars);focusClipButton(id);}
      return true;
    }
    if((key==='Delete'||key==='Backspace')&&sel){cb.remove();return true;}
    if(key==='Home'||key==='End'){cb.seekTo(key==='Home'?0:p.bars*barSeconds(p.bpm));reveal(key==='Home'?1:p.bars+1);return true;}
    if(key==='='||key==='+'){setZoom(view.zoom+M.ZOOM_STEP);return true;}
    if(key==='-'||key==='_'){setZoom(view.zoom-M.ZOOM_STEP);return true;}
    if(key==='\\'){fit();return true;}
    return false;
  }
  rulerEl.addEventListener('keydown',e=>{
    const p=state.project;if(!p)return;const step={ArrowLeft:-.25,ArrowRight:.25,PageUp:-1,PageDown:1}[e.key];
    if(step===undefined&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();e.stopPropagation();
    const bar=e.key==='Home'?1:e.key==='End'?p.bars+1:clamp(M.quantize(playheadBar()+(e.shiftKey?step/4:step)),1,p.bars+1);
    cb.seekTo((bar-1)*barSeconds(p.bpm));reveal(bar);
  });
  root.addEventListener('focusin',()=>{const f=clipsEl.contains(document.activeElement);if(f!==focused){focused=f;request('content');}});
  root.addEventListener('focusout',()=>setTimeout(()=>{const f=clipsEl.contains(document.activeElement);if(f!==focused){focused=f;request('content');}}));

  // ---------- DOM: rail, sections, accessible clip list ----------
  function renderRail(){
    const p=state.project,key=JSON.stringify([prefs.rowHeight,state.selectedTrack,p.tracks.map(t=>[t.id,t.name,t.mute,t.solo,t.gain,t.color])]);if(key===railKey)return;railKey=key;
    keepFocus(rail,()=>{rail.innerHTML=`<div class="tl-rail-head" style="height:${M.HEAD_H}px"><span>Layers</span><span class="tl-count">${p.tracks.length}</span></div>`+p.tracks.map(t=>`<div class="track-head${t.id===state.selectedTrack?' selected':''}" data-track="${esc(t.id)}" data-select-track="${esc(t.id)}" data-color="${t.color}" style="height:${rows.height}px"><input data-track-name="${esc(t.id)}" value="${esc(t.name)}" aria-label="${esc(t.name)} layer name"><div class="track-buttons"><button class="toggle" data-mute="${esc(t.id)}" aria-label="Mute ${esc(t.name)}" aria-pressed="${t.mute}">M</button><button class="toggle" data-solo="${esc(t.id)}" aria-label="Solo ${esc(t.name)}" aria-pressed="${t.solo}">S</button><span class="db mono">${t.gain>0?'+':''}${t.gain} dB</span></div></div>`).join('');});
  }
  rail.addEventListener('input',e=>{const id=e.target.dataset.trackName;if(id)cb.trackName(id,e.target.value);});
  rail.addEventListener('click',e=>{const m=e.target.closest('[data-mute]'),s=e.target.closest('[data-solo]');if(m)return cb.toggle(m.dataset.mute,'mute');if(s)return cb.toggle(s.dataset.solo,'solo');
    const cell=e.target.closest('[data-select-track]');if(cell&&!e.target.matches('input'))cb.select(cell.dataset.selectTrack,null);});
  function renderSections(){
    const p=state.project,key=JSON.stringify(p.sections.map(s=>[s.name,s.bar,s.bars]))+p.bars;if(key!==sectionsKey){sectionsKey=key;
      keepFocus(sectionsEl,()=>{sectionsEl.innerHTML=p.sections.map((s,i)=>s.bar>p.bars?'':`<input data-section="${i}" value="${esc(s.name)}" aria-label="Section ${i+1} name" spellcheck="false">`).join('');});}
    placeSections();
  }
  function placeSections(){
    // Section names stick to the visible left edge of their section, like clip titles.
    const p=state.project;for(const input of sectionsEl.children){const s=p.sections[Number(input.dataset.section)],x0=M.ORIGIN+(s.bar-1)*view.px,x1=x0+Math.min(s.bars,p.bars-s.bar+1)*view.px,left=Math.max(x0,view.scroll);
      input.style.left=left+3+'px';input.style.width=Math.max(0,x1-left-6)+'px';input.hidden=x1-left<28;}
  }
  sectionsEl.addEventListener('input',e=>{const i=e.target.dataset.section;if(i!==undefined)cb.sectionName(Number(i),e.target.value);});
  function renderClipList(){
    const p=state.project,key=JSON.stringify([state.selectedClip,items.map(it=>[it.id,it.name,it.track.name,it.bar,it.bars])]);if(key===clipsKey)return;clipsKey=key;
    const had=clipsEl.contains(document.activeElement),first=items.find(it=>it.id===state.selectedClip)?.id??items[0]?.id;
    clipsEl.innerHTML=p.tracks.map((t,i)=>`<div role="list" aria-label="${esc(t.name)} clips">${items.filter(it=>it.trackIndex===i).sort((a,b)=>a.bar-b.bar).map(it=>`<div role="listitem"><button type="button" data-clip="${esc(it.id)}" tabindex="${it.id===first?0:-1}" aria-pressed="${it.id===state.selectedClip}" aria-label="${esc(it.name)}, ${esc(t.name)}, bar ${M.formatPosition(it.bar,1)} for ${+it.bars.toFixed(3)} bars">${esc(it.name)}</button></div>`).join('')}</div>`).join('');
    if(had&&state.selectedClip)focusClipButton(state.selectedClip);
  }
  function focusClipButton(id){const b=clipsEl.querySelector(`[data-clip="${CSS.escape(id)}"]`);if(b&&document.activeElement!==b)b.focus({preventScroll:true});}
  clipsEl.addEventListener('focusin',e=>{const id=e.target.dataset?.clip;if(id&&id!==state.selectedClip){const it=items.find(x=>x.id===id);if(it){cb.select(it.track.id,id);reveal(it.bar,it.bars);}}});
  function updateRulerAria(){
    const p=state.project,bar=playheadBar();rulerEl.setAttribute('aria-valuemax',String(p.bars+1));rulerEl.setAttribute('aria-valuenow',String(+bar.toFixed(4)));
    rulerEl.setAttribute('aria-valuetext',`Bar ${M.formatPosition(M.quantize(bar),1)}, ${state.position.toFixed(2)} seconds`);
  }

  // ---------- public ----------
  return {
    update(next){
      const structural=!state.project||next.project.tracks.length!==state.project.tracks.length||next.project.bars!==state.project.bars;
      state={...state,...next};buildItems();if(structural)layout();else{rows=M.rowLayout(state.project.tracks.length,prefs.rowHeight);}
      renderRail();renderSections();renderClipList();updateRulerAria();request();
    },
    setPosition(seconds,playing){
      state.position=seconds;state.playing=playing;if(!state.project)return;
      if(playing&&!gesture){const x=M.barToX(view,playheadBar());if(x>view.width-24||x<M.ORIGIN-1){scroller.scrollLeft=clamp(view.scroll+x-M.ORIGIN-24,0,M.maxScroll(view,state.project.bars));view.scroll=scroller.scrollLeft;request();}}
      updateRulerAria();request('dynamic');
    },
    handleKey,zoomIn:()=>setZoom(view.zoom+M.ZOOM_STEP),zoomOut:()=>setZoom(view.zoom-M.ZOOM_STEP),fit,setZoom,reveal,
    get prefs(){return {...prefs};},
    setPref(key,value){prefs[key]=value;railKey='';if(key==='rowHeight')layout();persist();request();},
    repaint:()=>request(),
    // Read-only geometry for scripted checks: client coordinates of what the canvas draws.
    debug(){
      const r=stage.getBoundingClientRect();
      return {view:{...view},rowHeight:rows.height,headHeight:M.HEAD_H,rulerHeight:M.RULER_H,stage:{left:r.left,top:r.top,width:r.width,height:r.height},
        guide:guide&&{...guide},gesture:gesture&&{type:gesture.type,active:gesture.active,preview:gesture.preview&&{...gesture.preview}},
        barToClientX:bar=>r.left+M.barToX(view,bar),rowClientY:i=>r.top+rows.top(i),
        clipRect:id=>{const it=items.find(x=>x.id===id);if(!it)return null;const c=M.clipRect(view,rows,it.trackIndex,it.bar,it.bars);return {x:r.left+c.x,y:r.top+c.y,width:c.w,height:c.h,trimZone:M.trimEdgeZonePx(c.w)};}};
    },
  };
}
// Rebuilding DOM must not steal an in-progress edit: restore focus and caret by data attribute.
function keepFocus(container,fn){
  const a=document.activeElement,inside=container.contains(a),attr=inside&&[...a.attributes].find(x=>x.name.startsWith('data-'));
  const caret=inside&&'selectionStart' in a?[a.selectionStart,a.selectionEnd]:null;fn();
  if(attr){const b=container.querySelector(`[${attr.name}="${CSS.escape(attr.value)}"]`);if(b){b.focus({preventScroll:true});if(caret)try{b.setSelectionRange(...caret);}catch{}}}
}
