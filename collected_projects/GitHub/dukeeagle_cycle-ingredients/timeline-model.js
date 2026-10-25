// Timeline geometry, snapping, navigation and waveform peaks. Pure functions shared by the
// canvas painter, the gesture controller and the Bun tests. Positions are 1-based bars,
// matching the project model; x values are CSS pixels inside the timeline viewport.
// Constants and formulas cite the Kino timeline-webgpu source they were adapted from.
import {clamp,barSeconds,clipSpan} from './engine.js';

export const RULER_H=30,SECTION_H=26,HEAD_H=RULER_H+SECTION_H;
export const ORIGIN=8,END_PAD=16; // TIMELINE_START_PADDING_PX
export const ROW_HEIGHTS={short:56,standard:80,tall:112};
export const CLIP_PAD=3,LABEL_LANE=14,MIN_CLIP_PX=3,BODY_ONLY_PX=8,DETAIL_MIN_PX=42; // constants.ts
export const SNAP_PX=8,DRAG_THRESHOLD_PX=4,TRACK_HYSTERESIS_PX=6,TRIM_OUTSIDE_PX=6,SKIMMER_MAGNET_PX=6;
export const FADE_HANDLE_W=6,FADE_HANDLE_H=10,FADE_HIT_H=13,FADE_HIT_PAD=3,FADE_MIN_CLIP_PX=24,FADE_MIN_RAMP_PX=6;
export const AUTOSCROLL_EDGE_PX=10,AUTOSCROLL_MAX=25*60,AUTOSCROLL_SEEK_MAX=5*60; // edge-autoscroll.ts
export const BIPOLAR_MIN_BAND_PX=48; // WAVEFORM_BIPOLAR_MIN_BAND_PX
export const STEPS=16; // the quantizer unit: one sixteenth note, the "frame" of a musical timeline
export const ZOOM_MAX=3,ZOOM_STEP=.15,PX_PER_BAR_MIN=16,PX_PER_BAR_MAX=3200; // MAX_TIMELINE_ZOOM, TIMELINE_ZOOM_BUTTON_STEP

// Zoom is logarithmic over [0, 3] like Kino's getZoomMultiplier, so each step scales by the same ratio.
export const pxPerBarForZoom=z=>Math.exp(Math.log(PX_PER_BAR_MIN)+clamp(z,0,ZOOM_MAX)/ZOOM_MAX*Math.log(PX_PER_BAR_MAX/PX_PER_BAR_MIN));
export const zoomForPxPerBar=px=>clamp(Math.log(clamp(px,PX_PER_BAR_MIN,PX_PER_BAR_MAX)/PX_PER_BAR_MIN)/Math.log(PX_PER_BAR_MAX/PX_PER_BAR_MIN)*ZOOM_MAX,0,ZOOM_MAX);
export const fitZoom=(width,bars)=>zoomForPxPerBar((Math.max(1,width)-ORIGIN-END_PAD)/Math.max(1,bars));
export const contentWidth=(view,bars)=>Math.max(view.width,ORIGIN+bars*view.px+END_PAD);
export const maxScroll=(view,bars)=>Math.max(0,contentWidth(view,bars)-view.width);
export const barToX=(view,bar)=>ORIGIN+(bar-1)*view.px-view.scroll; // frameToScreenX
export const xToBar=(view,x)=>(x+view.scroll-ORIGIN)/view.px+1;
export const quantize=bar=>1+Math.round((bar-1)*STEPS)/STEPS;
export const visibleBars=(view)=>[xToBar(view,0),xToBar(view,view.width)];

// Anchor a zoom at a viewport x: the bar under that x stays under it (use-timeline-zoom-gestures.ts,
// computed from the exact px-per-bar ratio rather than a scroll-width ratio).
export function zoomAround(view,nextZoom,anchorX,bars){
  const px=pxPerBarForZoom(nextZoom),bar=(view.scroll+anchorX-ORIGIN)/view.px;
  const next={...view,zoom:clamp(nextZoom,0,ZOOM_MAX),px};
  next.scroll=clamp(bar*px+ORIGIN-anchorX,0,maxScroll(next,bars));return next;
}
// timelineWheelZoomDelta: pinch arrives as ctrl+wheel; Alt+wheel is the mouse fallback.
export function wheelZoomDelta(e){
  if(Math.abs(e.deltaX)>=Math.abs(e.deltaY))return 0;
  const trackpad=e.deltaMode===0&&Math.abs(e.deltaY)<50,sensitivity=e.ctrlKey?(trackpad?.01:.002):trackpad?.004:.001;
  return clamp(-e.deltaY*sensitivity,-.2,.2);
}
// Reveal a bar without recentering one that is already visible (getScrollLeftToRevealTimelineFrame).
export function scrollToReveal(view,bar,bars,margin=16){
  const x=barToX(view,bar);if(x>=ORIGIN+margin&&x<=view.width-margin)return view.scroll;
  return clamp(view.scroll+x-(x<ORIGIN+margin?ORIGIN+margin:view.width-margin),0,maxScroll(view,bars));
}

// Musical ruler: ticks anchored on integer sixteenth indices (ruler-ticks.ts anchors on integer
// frames) so minors, majors, clips and the playhead coincide exactly. Minors stay at least 8 px
// apart (FRAME_TICK_MIN_SPACING_PX); labels at least 52 px.
const MINOR_UNITS=[1,2,4,8,16,32,64,128],MAJOR_UNITS=[4,16,32,64,128,256];
export function rulerIntervals(pxPerBar){
  const px16=pxPerBar/STEPS,minor=MINOR_UNITS.find(u=>u*px16>=8)??128;
  const major=MAJOR_UNITS.find(u=>u>minor&&u%minor===0&&u*px16>=52)??256;
  return {minor,major};
}
export function formatPosition(bar,unit=1){
  const step=Math.round((bar-1)*STEPS),b=Math.floor(step/16)+1,beat=Math.floor(step%16/4)+1,six=step%4+1;
  return unit>=16?`${b}`:unit>=4?`${b}.${beat}`:`${b}.${beat}.${six}`;
}

// Track rows. Every y in the timeline comes from this layout, as Kino's TimelineRowLayout.
export function rowLayout(trackCount,rowHeight){
  const h=ROW_HEIGHTS[rowHeight]||ROW_HEIGHTS.standard;
  return {height:h,count:trackCount,top:i=>HEAD_H+i*h,total:HEAD_H+trackCount*h,indexAt:y=>y<HEAD_H?-1:Math.floor((y-HEAD_H)/h)};
}
export function clipRect(view,rows,trackIndex,bar,bars){
  return {x:barToX(view,bar),y:rows.top(trackIndex)+CLIP_PAD,w:Math.max(MIN_CLIP_PX,bars*view.px),h:rows.height-CLIP_PAD*2};
}

// Trim zones recovered from Premiere's EdgeEditor (Kino model.ts trimEdgeZonePx): 10% of the clip,
// clamped 9-15 px, but the middle always keeps at least a 9 px move zone.
export function trimEdgeZonePx(w){
  const wanted=clamp(Math.round(w*.1),9,15),middle=clamp(w-wanted*2,9,Math.max(0,w));
  return Math.max(0,Math.round((w-middle)/2));
}
export function trimEdgeAtLocalX(lx,w){const zone=trimEdgeZonePx(w);if(zone<=0)return null;if(lx<=zone)return 'left';if(lx>=w-zone)return 'right';return null;}
// Fade geometry (model.ts fadeRampWidthPx / fadeHandleLeftPx), in pixels. The out ramp ends where the
// audio ends, which can be before the clip box ends: the engine fades the audible span.
export const fadeRampPx=(fade,pxPerSec)=>fade>0?Math.max(FADE_MIN_RAMP_PX,fade*pxPerSec):0;
export function fadeHandleLeftPx(side,rampPx,endPx){const at=rampPx<=0?0:Math.max(0,rampPx-FADE_HANDLE_W/2);return side==='in'?at:endPx-at-FADE_HANDLE_W;}

// The audible part of a clip and the mapping from timeline seconds (relative to the clip start)
// to source seconds, from the same clipSpan the audio engine schedules.
export function clipAudio(clip,project,asset,edit){
  const span=clipSpan(clip,project,asset,edit),box=Math.min(clip.bars,project.bars-clip.bar+1)*barSeconds(project.bpm);
  if(!span)return {box,audible:0,span:null,sourceAt:()=>null};
  const length=span.loopEnd-span.offset;
  return {box,audible:span.duration,span,sourceAt:t=>t<0||t>=span.duration?null:clip.loop&&length>0?span.offset+(t*span.rate)%length:span.offset+t*span.rate,
    loopPoints:clip.loop&&length>0?Array.from({length:Math.max(0,Math.ceil(span.duration*span.rate/length)-1)},(_,i)=>(i+1)*length/span.rate).slice(0,256):[]};
}

// Hit testing for one pointer position. Priority follows Kino's pointerdown order: fade dots in the
// top strip, then trim edges, then the clip body, then a trim edge grabbed from the gap beside it.
export function hitTest({x,y,view,rows,items,fades}){
  if(y<RULER_H)return {type:'ruler'};
  if(y<HEAD_H)return {type:'sections'};
  const trackIndex=rows.indexAt(y);if(trackIndex<0||trackIndex>=rows.count)return {type:'none'};
  const onRow=items.filter(it=>it.trackIndex===trackIndex);
  for(const it of [...onRow].reverse()){
    const r=clipRect(view,rows,trackIndex,it.bar,it.bars);
    if(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h)continue;
    const lx=x-r.x,g=fades?.(it);
    if(g&&g.endPx>=FADE_MIN_CLIP_PX&&y-r.y<=FADE_HIT_H){
      for(const side of ['in','out']){
        const fade=side==='in'?g.fadeIn:g.fadeOut,left=fadeHandleLeftPx(side,fadeRampPx(fade,g.pxPerSec),g.endPx),pad=fade>0?FADE_HIT_PAD:0;
        if(lx>=left-pad&&lx<=left+FADE_HANDLE_W+pad)return {type:'fade',side,item:it,trackIndex};
      }
    }
    const edge=trimEdgeAtLocalX(lx,r.w);
    return edge?{type:'trim',edge,item:it,trackIndex}:{type:'clip',item:it,trackIndex};
  }
  let best=null;
  for(const it of onRow){const r=clipRect(view,rows,trackIndex,it.bar,it.bars);
    for(const [edge,ex] of [['left',r.x],['right',r.x+r.w]]){const d=Math.abs(x-ex);if(d<=TRIM_OUTSIDE_PX&&(!best||d<best.d))best={d,type:'trim',edge,item:it,trackIndex};}}
  return best?{type:best.type,edge:best.edge,item:best.item,trackIndex}:{type:'lane',trackIndex};
}

// Snapping (parity.ts findSnapAdjustment). Candidates carry what they are, so the guide can say what
// it caught. Distance wins; priority breaks exact ties (clip edges before playhead, sections, grid).
export function snapCandidates({items,excludeId,playheadBar,sections=[],bars,gridUnit,range}){
  const out=[];
  for(const it of items){if(it.id===excludeId)continue;out.push({bar:it.bar,kind:'clip edge',priority:0},{bar:it.bar+it.bars,kind:'clip edge',priority:0});}
  if(playheadBar!=null)out.push({bar:playheadBar,kind:'playhead',priority:1});
  for(const s of sections)out.push({bar:s.bar,kind:'section',priority:2});
  const [from,to]=range??[1,bars+1],step=gridUnit/STEPS;
  for(let b=Math.max(1,Math.floor((from-1)/step)*step+1);b<=Math.min(bars+1,to+step);b+=step)out.push({bar:Math.round((b-1)*STEPS)/STEPS+1,kind:gridUnit>=16?'bar':gridUnit>=4?'beat':'grid',priority:3});
  return out;
}
export function findSnap({edges,candidates,thresholdBars}){
  let best=null;
  for(const c of candidates)for(const edge of edges){const d=Math.abs(c.bar-edge);
    if(d<=thresholdBars&&(!best||d<best.d-1e-9||(Math.abs(d-best.d)<1e-9&&c.priority<best.c.priority)))best={d,c,adjustment:c.bar-edge};}
  return best?{adjustment:best.adjustment,guide:best.c}:{adjustment:0,guide:null};
}

// Skimmer magnet (ruler-seek.ts resolveRulerSkimmer): within 6 px the line fuses with the playhead,
// otherwise it catches the nearest mark (clip edges here).
export function resolveSkimmer(bar,playheadBar,marks,toX){
  const x=toX(bar),fused=Math.abs(x-toX(playheadBar))<=SKIMMER_MAGNET_PX;let out=fused?playheadBar:bar,caught=null;
  if(!fused){let nearest=Infinity;for(const m of marks){const d=Math.abs(x-toX(m));if(d<=SKIMMER_MAGNET_PX&&d<nearest){nearest=d;out=m;caught=m;}}}
  return {bar:out,fused,caught};
}

// edge-autoscroll.ts: linear ramp from zero at the threshold to max at the edge, held past it.
export function edgeScrollVelocity({cursor,edgeLow,edgeHigh,threshold=AUTOSCROLL_EDGE_PX,maxSpeed=AUTOSCROLL_MAX}){
  if(cursor<edgeLow+threshold)return -maxSpeed*(1-Math.max(0,cursor-edgeLow)/threshold);
  if(cursor>edgeHigh-threshold)return maxSpeed*(1-Math.max(0,edgeHigh-cursor)/threshold);
  return 0;
}

// Row change with hysteresis (model.ts resolveDragDeltaTracks): the probe must cross into the
// candidate row by TRACK_HYSTERESIS_PX, and the same margin has to be re-crossed to come back.
export function resolveTrackDelta({candidate,committed,probeY,sourceIndex,top,hysteresis=TRACK_HYSTERESIS_PX}){
  if(candidate===committed)return committed;
  const row=sourceIndex+candidate,boundary=candidate>committed?top(row):top(row+1);
  return Math.abs(probeY-boundary)>=hysteresis?candidate:committed;
}

// Keyboard navigation (parity.ts getTimelineKeyboardNavigationTarget): left/right walk the clips of
// the selected layer in time order; up/down take the nearest clip centre on the next layer that has one.
export function keyboardTarget(items,selectedId,direction){
  const sel=items.find(it=>it.id===selectedId);if(!sel)return null;
  if(direction==='left'||direction==='right'){
    const row=items.filter(it=>it.trackIndex===sel.trackIndex).sort((a,b)=>a.bar-b.bar||(a.bar+a.bars)-(b.bar+b.bars)||a.id.localeCompare(b.id));
    return row[row.findIndex(it=>it.id===sel.id)+(direction==='left'?-1:1)]?.id??null;
  }
  const mid=sel.bar+sel.bars/2,step=direction==='up'?-1:1,last=Math.max(...items.map(it=>it.trackIndex));
  for(let t=sel.trackIndex+step;t>=0&&t<=last;t+=step){
    let best=null;for(const it of items){if(it.trackIndex!==t)continue;const d=Math.abs(it.bar+it.bars/2-mid);if(!best||d<best.d||(d===best.d&&it.bar<best.it.bar))best={d,it};}
    if(best)return best.it.id;
  }
  return null;
}

// Room a clip has before it runs into a stationary neighbour on its layer (getTrimNeighborGapFrames).
export function neighbourGaps(items,item,trackIndex=item.trackIndex){
  let before=Infinity,after=Infinity;const end=item.bar+item.bars;
  for(const n of items){if(n.id===item.id||n.trackIndex!==trackIndex)continue;const nEnd=n.bar+n.bars;
    if(nEnd<=item.bar+1e-9)before=Math.min(before,item.bar-nEnd);else if(n.bar>=end-1e-9)after=Math.min(after,n.bar-end);else{before=0;after=0;}}
  return {before,after};
}
export const overlaps=(items,id,trackIndex,bar,bars)=>items.some(n=>n.id!==id&&n.trackIndex===trackIndex&&bar<n.bar+n.bars-1e-9&&bar+bars>n.bar+1e-9);

// Waveform peaks after Kino's waveform-peak-data.ts: signed min/max per channel, levels growing by a
// factor of 4, and per-pixel level choice (selectPeakLevel: the coarsest level that still has at
// least one peak per device pixel).
export const PEAK_BASE=64,PEAK_FACTOR=4;
export function buildPeaks(channels,sampleRate){
  const length=channels[0]?.length||0,levels=[];let spp=PEAK_BASE,prev=null;
  while(true){
    const count=Math.ceil(length/spp),data=new Float32Array(channels.length*count*2);
    for(let c=0;c<channels.length;c++){const x=channels[c],base=c*count*2;
      for(let i=0;i<count;i++){let lo=0,hi=0;
        if(!prev){const a=i*spp,b=Math.min(length,a+spp);for(let j=a;j<b;j++){const v=x[j];if(v<lo)lo=v;else if(v>hi)hi=v;}}
        else{const pc=prev.count,pb=c*pc*2;for(let k=i*PEAK_FACTOR;k<Math.min(pc,(i+1)*PEAK_FACTOR);k++){lo=Math.min(lo,prev.data[pb+k*2]);hi=Math.max(hi,prev.data[pb+k*2+1]);}}
        data[base+i*2]=lo;data[base+i*2+1]=hi;}}
    prev={spp,count,data};levels.push(prev);if(count<=64)break;spp*=PEAK_FACTOR;
  }
  return {sampleRate,length,channels:channels.length,levels,exact:true};
}
// Before audio is decoded, the manifest's 240-point envelope stands in as a single coarse level.
export function envelopePeaks(waveform,seconds){
  const n=waveform?.length||0,max=Math.max(...(waveform||[0]),1e-6),rate=n/Math.max(.001,seconds),data=new Float32Array(n*2);
  for(let i=0;i<n;i++){data[i*2]=-waveform[i]/max*.8;data[i*2+1]=waveform[i]/max*.8;}
  return {sampleRate:rate,length:n,channels:1,levels:[{spp:1,count:n,data}],exact:false};
}
export function selectLevel(peaks,samplesPerPixel){let best=peaks.levels[0];for(const l of peaks.levels){if(l.spp<=samplesPerPixel)best=l;else break;}return best;}
export function peakRange(peaks,level,channel,s0,s1){
  const c=Math.min(channel,peaks.channels-1),base=c*level.count*2;let lo=0,hi=0;
  const a=clamp(Math.floor(s0/level.spp),0,level.count-1),b=clamp(Math.ceil(s1/level.spp),a+1,level.count);
  for(let i=a;i<b;i++){const l=level.data[base+i*2],h=level.data[base+i*2+1];if(l<lo)lo=l;if(h>hi)hi=h;}
  return [lo,hi];
}
