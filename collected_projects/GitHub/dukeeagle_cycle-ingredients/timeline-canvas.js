// Canvas2D painter for the arrangement. Two layers, as in Kino's render controller: "content"
// (ruler, lanes, clips, waveforms) repaints on edits, scroll and zoom; "dynamic" (playhead,
// skimmer, snap guide, gesture badges) repaints on every pointer move and playback frame.
// The painter reads a prepared scene and never touches the composition or audio.
import {amp,barSeconds} from './engine.js';
import {RULER_H,SECTION_H,HEAD_H,LABEL_LANE,BODY_ONLY_PX,DETAIL_MIN_PX,BIPOLAR_MIN_BAND_PX,FADE_HANDLE_W,FADE_HANDLE_H,FADE_MIN_CLIP_PX,STEPS,
  barToX,clipRect,rulerIntervals,formatPosition,fadeRampPx,fadeHandleLeftPx,selectLevel,peakRange} from './timeline-model.js';

export const COLORS={ground:'#171717',hairline:'#262626',tick:'#525252',tickMajor:'#8a8a8a',rulerText:'#a3a3a3',
  brand:'#0e9fff',hover:'rgba(14,159,255,.4)',playhead:'#dc2626',fused:'rgb(255,214,10)',skimmer:'rgb(255,201,107)',
  edge:'rgba(18,219,18,.95)',lane:'rgba(0,0,0,.22)',fadeRamp:'rgba(0,0,0,.6)'};
// Clip material (Kino constants.ts): opaque bodies so a sliver is still a thing, and the signal in
// the light of the same triad. The light tones are Resonance's layer colours.
export const MATERIAL={mint:{body:'#1d4a33',signal:'180,242,204'},gold:{body:'#4d3b17',signal:'237,202,133'},blue:{body:'#22375a',signal:'155,184,237'},
  purple:{body:'#3e2d55',signal:'197,173,232'},rose:{body:'#4f2830',signal:'230,165,173'}};
const FONT='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

export function createPainter(content,dynamic){
  const cx=content.getContext('2d'),dx=dynamic.getContext('2d');let size={width:1,height:1,dpr:1};
  function resize(width,height,dpr){
    size={width:Math.max(1,width),height:Math.max(1,height),dpr};
    for(const c of [content,dynamic]){c.width=Math.floor(size.width*dpr);c.height=Math.floor(size.height*dpr);c.style.width=size.width+'px';c.style.height=size.height+'px';}
  }
  function paintContent(s){
    const g=cx,{width,height,dpr}=size,{view,rows,project}=s;g.setTransform(dpr,0,0,dpr,0,0);
    g.fillStyle=COLORS.ground;g.fillRect(0,0,width,height);
    const {minor,major}=rulerIntervals(view.px),endX=barToX(view,project.bars+1);
    drawLanes(g,s,minor,major,endX);
    drawRuler(g,s,minor,major,endX);
    drawSections(g,s,endX);
    for(const it of s.items)if(it.ghost)ghost(g,s,it);
    for(const it of s.items)drawClip(g,s,it);
  }
  function drawRuler(g,{view,project},minor,major,endX){
    const {width}=size,first=Math.max(0,Math.floor((view.scroll/view.px-1)*STEPS/major)*major),last=project.bars*STEPS;
    g.fillStyle=COLORS.hairline;g.fillRect(0,0,width,1);
    if(endX<width){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(endX,0,width-endX,RULER_H);}
    const minors=new Path2D(),majors=new Path2D(),labels=[];
    for(let step=first;step<=last;step+=minor){
      const x=Math.round(barToX(view,1+step/STEPS))+.5;if(x>width+1)break;if(x<-60)continue;
      if(step%major===0){majors.moveTo(x,0);majors.lineTo(x,step%STEPS===0?22:16);labels.push([x,step]);}else{minors.moveTo(x,0);minors.lineTo(x,8);}
    }
    g.lineWidth=1;g.strokeStyle=COLORS.tick;g.stroke(minors);g.strokeStyle=COLORS.tickMajor;g.stroke(majors);
    g.font=`10px ${FONT}`;g.textBaseline='top';g.textAlign='left';
    for(const [x,step] of labels){g.fillStyle=step%STEPS===0?COLORS.rulerText:'#737373';g.fillText(formatPosition(1+step/STEPS,major),x+4,12);}
  }
  function drawSections(g,{view,project},endX){
    const {width}=size;g.fillStyle=COLORS.ground;g.fillRect(0,RULER_H,width,SECTION_H);
    project.sections.forEach((sec,i)=>{const x=barToX(view,sec.bar),w=Math.min(sec.bars,project.bars-sec.bar+1)*view.px;if(x>width||x+w<0||w<=0)return;
      g.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(255,255,255,.06)';g.fillRect(x,RULER_H+3,w-1,SECTION_H-6);
      g.fillStyle='rgba(255,255,255,.18)';g.fillRect(Math.round(x),RULER_H+3,1,SECTION_H-6);});
    if(endX<width){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(endX,RULER_H,width-endX,SECTION_H);}
    g.fillStyle=COLORS.hairline;g.fillRect(0,HEAD_H-1,width,1);
  }
  function drawLanes(g,{view,rows,project,selectedTrack,activeTrack},minor,major,endX){
    const {width,height}=size,grid=Math.max(minor,4),lanesTop=HEAD_H,first=Math.max(0,Math.floor((view.scroll/view.px-1)*STEPS/grid)*grid);
    project.tracks.forEach((t,i)=>{const y=rows.top(i);
      if(t.id===selectedTrack){g.fillStyle='rgba(255,255,255,.03)';g.fillRect(0,y,width,rows.height);}
      if(t.id===activeTrack){g.fillStyle='rgba(14,159,255,.08)';g.fillRect(0,y,width,rows.height);}
      g.fillStyle='rgba(255,255,255,.045)';g.fillRect(0,y+rows.height-1,width,1);});
    const bars=new Path2D(),beats=new Path2D(),sections=new Path2D(),starts=new Set(project.sections.map(s=>Math.round((s.bar-1)*STEPS)));
    for(let step=first;step<=project.bars*STEPS;step+=grid){const x=Math.round(barToX(view,1+step/STEPS))+.5;if(x>width)break;if(x<0)continue;
      const path=starts.has(step)?sections:step%STEPS===0?bars:beats;path.moveTo(x,lanesTop);path.lineTo(x,rows.total);}
    g.lineWidth=1;g.strokeStyle='rgba(255,255,255,.028)';g.stroke(beats);g.strokeStyle='rgba(255,255,255,.07)';g.stroke(bars);g.strokeStyle='rgba(255,255,255,.13)';g.stroke(sections);
    if(endX<width){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(endX,lanesTop,width-endX,height-lanesTop);}
    project.tracks.forEach((t,i)=>drawAutomation(g,view,rows,project,t,i));
  }
  function drawAutomation(g,view,rows,project,t,i){
    if(!t.automation.length)return;const top=rows.top(i)+LABEL_LANE+6,h=rows.height-LABEL_LANE-12,y=db=>top+h*(1-(db+48)/54);
    g.save();g.strokeStyle='rgba(255,255,255,.55)';g.setLineDash([3,3]);g.lineWidth=1;g.beginPath();
    g.moveTo(Math.min(barToX(view,1),barToX(view,t.automation[0].bar)),y(t.automation[0].db));
    for(const p of t.automation)g.lineTo(barToX(view,p.bar),y(p.db));
    g.lineTo(barToX(view,project.bars+1),y(t.automation.at(-1).db));g.stroke();g.setLineDash([]);g.fillStyle='#fff';
    for(const p of t.automation){g.beginPath();g.arc(barToX(view,p.bar),y(p.db),2.5,0,Math.PI*2);g.fill();}g.restore();
  }
  function ghost(g,{view,rows},it){
    const r=clipRect(view,rows,it.ghost.trackIndex,it.ghost.bar,it.ghost.bars);if(r.x>size.width||r.x+r.w<0)return;
    g.fillStyle='rgba(120,120,120,.25)';round(g,r.x,r.y,r.w,r.h,4);g.fill();
  }
  function drawClip(g,s,it){
    const {view,rows}=s,r=clipRect(view,rows,it.trackIndex,it.bar,it.bars);
    if(r.x>size.width+2||r.x+r.w<-2)return; // viewport culling
    const m=MATERIAL[it.track.color]||MATERIAL.mint,selected=it.id===s.selectedClip,hovered=s.hover?.item?.id===it.id;
    g.save();if(it.dimmed)g.globalAlpha=.42;
    g.fillStyle='rgba(0,0,0,.25)';round(g,r.x-1,r.y-1,r.w+2,r.h+2,5);g.fill();g.fillStyle='rgba(0,0,0,.16)';round(g,r.x,r.y+1,r.w,r.h,4);g.fill();
    round(g,r.x,r.y,r.w,r.h,Math.min(4,r.w/2));g.fillStyle=m.body;g.fill();
    if(r.w>BODY_ONLY_PX){
      g.save();round(g,r.x,r.y,r.w,r.h,4);g.clip();
      const audio=it.audio,pxPerSec=view.px/barSeconds(s.project.bpm),endPx=audio?Math.min(r.w,audio.audible*pxPerSec):r.w;
      g.fillStyle=COLORS.lane;g.fillRect(r.x,r.y,r.w,LABEL_LANE);
      const band={x:r.x,y:r.y+LABEL_LANE+1,w:r.w,h:r.h-LABEL_LANE-3};
      if(r.w>=DETAIL_MIN_PX/3&&band.h>6){
        if(it.kind==='synth')drawPattern(g,s,it,band,m);
        else if(audio){drawWave(g,s,it,band,m,pxPerSec,endPx);
          if(endPx<r.w-1){g.fillStyle='rgba(0,0,0,.32)';g.fillRect(r.x+endPx,band.y,r.w-endPx,band.h+2);hatch(g,r.x+endPx,band.y,r.w-endPx,band.h+2);}
          g.strokeStyle=`rgba(${m.signal},.45)`;g.setLineDash([2,3]);g.beginPath();for(const t of audio.loopPoints){const x=Math.round(r.x+t*pxPerSec)+.5;if(x>r.x+r.w)break;g.moveTo(x,band.y);g.lineTo(x,band.y+band.h);}g.stroke();g.setLineDash([]);}
      }
      if(audio&&endPx>=FADE_MIN_CLIP_PX)drawFades(g,it,r,pxPerSec,endPx,selected||hovered); // slivers keep their colour, as Kino hides fade dots below 24 px
      label(g,it,r,m);g.restore();
    }
    if(s.invalid&&it.dragging){g.fillStyle='rgba(202,82,82,.22)';round(g,r.x,r.y,r.w,r.h,4);g.fill();g.strokeStyle='rgba(239,68,68,.9)';round(g,r.x-.5,r.y-.5,r.w+1,r.h+1,4.5);g.lineWidth=1;g.stroke();}
    else if(selected){g.strokeStyle=COLORS.brand;g.lineWidth=s.focused?2:1;const o=s.focused?1:.5;round(g,r.x-o,r.y-o,r.w+o*2,r.h+o*2,4+o);g.stroke();}
    else if(hovered){g.strokeStyle=COLORS.hover;g.lineWidth=1;round(g,r.x+.5,r.y+.5,r.w-1,r.h-1,3.5);g.stroke();}
    const edge=s.hover?.item?.id===it.id&&s.hover.type==='trim'?s.hover.edge:it.trimEdge;
    if(edge&&r.w>=14){g.fillStyle=COLORS.edge;g.fillRect(edge==='left'?r.x:r.x+r.w-2,r.y,2,r.h);}
    g.restore();
  }
  function label(g,it,r,m){
    if(r.w<16)return;g.font=`500 11px ${FONT}`;g.textBaseline='middle';g.textAlign='left';
    const meta=[it.clip.semitones?`${it.clip.semitones>0?'+':''}${it.clip.semitones} st`:'',it.clip.loop?'loop':'',it.clip.gain?`${it.clip.gain>0?'+':''}${it.clip.gain.toFixed(1)} dB`:''].filter(Boolean).join(' · ');
    // Titles stick to the visible left edge when a clip starts off screen.
    const left=Math.max(r.x,0)+8,right=Math.min(r.x+r.w,size.width);let room=right-left-4;const metaW=meta?g.measureText(meta).width:0,showMeta=meta&&r.x+r.w<=size.width&&room-metaW>70;if(showMeta)room-=metaW+10;
    g.fillStyle='rgba(255,255,255,.92)';g.fillText(truncateMiddle(g,it.name,room),left,r.y+LABEL_LANE/2+.5);
    if(showMeta){g.fillStyle=`rgba(${m.signal},.75)`;g.textAlign='right';g.fillText(meta,r.x+r.w-6,r.y+LABEL_LANE/2+.5);}
  }
  // Waveform: per device-pixel column, map timeline time to source time through the clip's real
  // playback span (trim, offset, pitch/tempo rate, loop wrap) and read the peak level that has one
  // bucket per pixel. Short bands draw a folded bottom-anchored mountain; tall bands go bipolar.
  function drawWave(g,s,it,band,m,pxPerSec,endPx){
    const peaks=s.peaksFor(it.clip.asset),audio=it.audio;if(!peaks||!audio?.span)return;
    const {dpr,width}=size,from=Math.max(band.x,0),to=Math.min(band.x+endPx,width);if(to<=from)return;
    const step=1/dpr,colSec=step/pxPerSec,spp=colSec*audio.span.rate*peaks.sampleRate,level=selectLevel(peaks,spp),gain=Math.min(4,amp(it.clip.gain+(it.edit?.gain||0)));
    const bipolar=band.h>=BIPOLAR_MIN_BAND_PX,lanes=bipolar?Math.min(2,peaks.channels):1,laneH=band.h/lanes;
    g.fillStyle=`rgba(${m.signal},${peaks.exact?.72:.4})`;
    for(let lane=0;lane<lanes;lane++){
      const top=[],bottom=[],mid=band.y+laneH*(lane+.5),floor=band.y+band.h;
      for(let x=from;x<to;x+=step){
        const src=audio.sourceAt((x-band.x)/pxPerSec);let lo=0,hi=0;
        if(src!=null){const s0=src*peaks.sampleRate,s1=s0+Math.max(1,spp);
          if(bipolar)[lo,hi]=peakRange(peaks,level,lane,s0,s1);else for(let c=0;c<peaks.channels;c++){const [l,h]=peakRange(peaks,level,c,s0,s1);hi=Math.max(hi,h,-l);}}
        if(bipolar){top.push(x,mid-shape(hi*gain)*laneH/2);bottom.push(x,mid-shape(lo*gain)*laneH/2);}
        else top.push(x,floor-shape(hi*gain)*band.h);
      }
      g.beginPath();g.moveTo(from,bipolar?mid:floor);
      for(let i=0;i<top.length;i+=2)g.lineTo(top[i],top[i+1]);
      if(bipolar)for(let i=bottom.length-2;i>=0;i-=2)g.lineTo(bottom[i],bottom[i+1]);else g.lineTo(to,floor);
      g.closePath();g.fill();
    }
  }
  function drawPattern(g,{view,project},it,band,m){
    const stepPx=view.px/STEPS,pattern=it.clip.pattern||[],steps=Math.round(it.bars*STEPS);
    g.fillStyle=`rgba(${m.signal},.75)`;
    for(let i=0;i<steps;i++){const v=pattern[i%16]||0;if(!v)continue;const x=band.x+i*stepPx;if(x>size.width)break;if(x+stepPx<0)continue;
      const h=Math.max(2,v*band.h);g.fillRect(x+(stepPx>4?1:0),band.y+band.h-h,Math.max(1,stepPx-(stepPx>4?2:0)),h);}
  }
  function drawFades(g,it,r,pxPerSec,endPx,handles){
    const half=it.audio.audible/2,fadeIn=Math.min(it.clip.fadeIn,half),fadeOut=Math.min(it.clip.fadeOut,half),inPx=fadeRampPx(fadeIn,pxPerSec),outPx=fadeRampPx(fadeOut,pxPerSec),top=r.y+LABEL_LANE,bottom=r.y+r.h;
    g.fillStyle=COLORS.fadeRamp;
    if(inPx>0){g.beginPath();g.moveTo(r.x,top);g.lineTo(r.x+inPx,top);g.lineTo(r.x,bottom);g.closePath();g.fill();}
    if(outPx>0){g.beginPath();g.moveTo(r.x+endPx-outPx,top);g.lineTo(r.x+endPx,top);g.lineTo(r.x+endPx,bottom);g.closePath();g.fill();}
    if(!handles)return;
    g.fillStyle='rgba(255,255,255,.92)';
    for(const [side,ramp] of [['in',inPx],['out',outPx]]){const x=r.x+fadeHandleLeftPx(side,ramp,endPx);round(g,x,r.y+2,FADE_HANDLE_W,FADE_HANDLE_H,2);g.fill();}
  }

  function paintDynamic(s){
    const g=dx,{width,height,dpr}=size,{view}=s;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,width,height);
    if(s.onion){g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=1.5;const r=clipRect(view,s.rows,s.onion.trackIndex,s.onion.bar,s.onion.bars);round(g,r.x,r.y,r.w,r.h,4);g.stroke();}
    if(s.guide){const x=Math.round(barToX(view,s.guide.bar))+.5;g.strokeStyle=COLORS.skimmer;g.lineWidth=1;g.beginPath();g.moveTo(x,0);g.lineTo(x,s.rows.total);g.stroke();
      chip(g,x,2,`${capital(s.guide.kind)} ${formatPosition(s.guide.bar,1)}`,COLORS.skimmer,true);}
    const px=Math.round(barToX(view,s.playheadBar))+.5,fused=s.skimmer?.fused&&!s.playing;
    if(s.skimmer&&!fused){const x=Math.round(barToX(view,s.skimmer.bar))+.5;g.strokeStyle=COLORS.skimmer;g.lineWidth=1;g.beginPath();g.moveTo(x,0);g.lineTo(x,s.rows.total);g.stroke();
      if(s.skimmer.label)chip(g,x,2,formatPosition(s.skimmer.bar,1),COLORS.skimmer,true);}
    if(px>-8&&px<width+8){const color=fused?COLORS.fused:COLORS.playhead;g.strokeStyle=color;g.lineWidth=1;g.beginPath();g.moveTo(px,0);g.lineTo(px,s.rows.total);g.stroke();
      cap(g,px,13);g.fillStyle='#000';g.fill();cap(g,px,11);g.fillStyle=color;g.fill();}
    if(s.badge)chip(g,s.badge.x,s.badge.y,s.badge.text,'#e5e5e5');
  }
  // Playhead cap from ruler.tsx playheadCapPath: a 13 x 9 pentagon with its shoulder at 38%.
  function cap(g,x,w){const half=w/2,shoulder=9*.38;g.beginPath();g.moveTo(x-half,0);g.lineTo(x+half,0);g.lineTo(x+half,shoulder);g.lineTo(x,9);g.lineTo(x-half,shoulder);g.closePath();}
  function chip(g,x,y,text,color,center=false){
    g.font=`500 10px ${FONT}`;const w=Math.ceil(g.measureText(text).width)+10;let left=center?x-w/2:x+4;left=Math.max(2,Math.min(size.width-w-2,left));
    g.fillStyle='rgba(23,23,23,.94)';round(g,left,y,w,16,4);g.fill();g.strokeStyle=color;g.lineWidth=1;round(g,left+.5,y+.5,w-1,15,3.5);g.stroke();
    g.fillStyle=color;g.textBaseline='middle';g.textAlign='left';g.fillText(text,left+5,y+8.5);
  }
  return {resize,paintContent,paintDynamic,get size(){return size;}};
}
// Square-root display curve: quiet passages stay visible while gain changes still scale the drawing.
export const shape=v=>Math.sign(v)*Math.sqrt(Math.min(1,Math.abs(v)));
const capital=s=>s[0].toUpperCase()+s.slice(1);
function round(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,Math.max(0,w),Math.max(0,h),Math.max(0,Math.min(r,w/2,h/2)));}
function hatch(g,x,y,w,h){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=1;g.beginPath();for(let i=-h;i<w;i+=6){g.moveTo(x+i,y+h);g.lineTo(x+i+h,y);}g.stroke();g.restore();}
// Kino truncates clip titles in the middle so both ends of a name stay readable.
export function truncateMiddle(g,text,max){
  if(max<=8)return '';if(g.measureText(text).width<=max)return text;
  let lo=0,hi=text.length;while(lo<hi){const mid=(lo+hi+1)>>1,a=Math.ceil(mid/2),b=Math.floor(mid/2),t=text.slice(0,a)+'…'+text.slice(text.length-b);if(g.measureText(t).width<=max)lo=mid;else hi=mid-1;}
  return lo<=0?'':text.slice(0,Math.ceil(lo/2))+'…'+text.slice(text.length-Math.floor(lo/2));
}
