export const MAX_BARS=128;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const amp=db=>10**(db/20);
export const barSeconds=bpm=>240/bpm;
export const uid=()=>crypto.randomUUID();
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeNumber(v,fallback,min,max){return Number.isFinite(Number(v))?clamp(Number(v),min,max):fallback;}
export function defaultEdit(asset){return {in:0,out:asset.seconds,gain:0,semitones:0,cutoff:20000,note:'',favorite:asset.favorite??['words-melody-a','words-detail-a','words-drums-a','words-bass-a','words-vocal-a'].includes(asset.id)};}
export function validateProject(p){
  if(!p||typeof p!=='object'||!Array.isArray(p.tracks)||p.tracks.length>12)throw Error('This is not a Resonance project.');
  let count=0;const ids=new Set();
  const tracks=p.tracks.map((t,i)=>{
    const id=String(t.id||uid()).slice(0,80);if(ids.has(id))throw Error('Duplicate track id.');ids.add(id);
    const clips=(Array.isArray(t.clips)?t.clips:[]).map(c=>{
      if(++count>192)throw Error('Project has too many clips.');
      return {id:String(c.id||uid()).slice(0,80),asset:String(c.asset||'').slice(0,100),bar:safeNumber(c.bar,1,1,MAX_BARS+1),bars:safeNumber(c.bars,4,.125,MAX_BARS),
        offset:safeNumber(c.offset,0,0,3600),gain:safeNumber(c.gain,0,-48,12),semitones:safeNumber(c.semitones,0,-24,24),
        cutoff:safeNumber(c.cutoff,20000,300,20000),fadeIn:safeNumber(c.fadeIn,.008,0,12),fadeOut:safeNumber(c.fadeOut,.04,0,12),
        fit:c.fit!==false,loop:!!c.loop,pattern:Array.from({length:16},(_,j)=>safeNumber(c.pattern?.[j],j%2===0? .45:0,0,1)),note:safeNumber(c.note,36,24,72)};
    });
    const automation=(Array.isArray(t.automation)?t.automation:[]).slice(0,32).map(a=>({id:String(a.id||uid()).slice(0,80),bar:safeNumber(a.bar,1,1,MAX_BARS+1),db:safeNumber(a.db,0,-48,6)})).sort((a,b)=>a.bar-b.bar);
    return {id,name:String(t.name||`Layer ${i+1}`).slice(0,100),color:['mint','gold','blue','purple','rose'][i%5],gain:safeNumber(t.gain,0,-48,12),pan:safeNumber(t.pan,0,-1,1),mute:!!t.mute,solo:!!t.solo,automation,clips};
  });
  return {version:1,title:String(p.title||'Untitled composition').slice(0,120),bpm:safeNumber(p.bpm,74,50,180),bars:Math.round(safeNumber(p.bars,16,4,MAX_BARS)),
    master:safeNumber(p.master,-5,-36,6),loop:!!p.loop,notes:String(p.notes||'').slice(0,20000),
    sections:(Array.isArray(p.sections)?p.sections:[{name:'Opening',bar:1,bars:4},{name:'Full',bar:5,bars:4},{name:'Space',bar:9,bars:4},{name:'Return',bar:13,bars:4}]).slice(0,8).map(s=>({name:String(s.name||'Section').slice(0,60),bar:safeNumber(s.bar,1,1,MAX_BARS),bars:safeNumber(s.bars,4,.25,MAX_BARS)})),tracks};
}
export function createProject(assets){return validateProject({"version": 1, "title": "words / phrase study 01", "bpm": 134.0, "bars": 16, "master": -3, "loop": false, "notes": "Provisional FT source-derived phrase study, guided by two hosted comparison judgments, awaiting human audition. Compare isolation before changing pitch or adding layers. Vocal samples remain in the bank, outside this instrumental sketch. Bar phase is provisional.", "sections": [{"name": "Exposed", "bar": 1, "bars": 4}, {"name": "Full", "bar": 5, "bars": 4}, {"name": "Space", "bar": 9, "bars": 4}, {"name": "Return", "bar": 13, "bars": 4}], "tracks": [{"id": "melody", "name": "FT \u00b7 Synth / other", "gain": 0, "clips": [{"id": "words-melody-a-at-1", "asset": "words-melody-a", "bar": 1, "bars": 4, "gain": -0.0689333401941995, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.03, "fit": false, "loop": false}, {"id": "words-melody-a-at-5", "asset": "words-melody-a", "bar": 5, "bars": 4, "gain": -0.0689333401941995, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.03, "fit": false, "loop": false}, {"id": "words-melody-a-at-9", "asset": "words-melody-a", "bar": 9, "bars": 4, "gain": -0.0689333401941995, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.03, "fit": false, "loop": false}, {"id": "words-melody-a-at-13", "asset": "words-melody-a", "bar": 13, "bars": 4, "gain": -0.0689333401941995, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.4, "fit": false, "loop": false}]}, {"id": "drums", "name": "Drums", "gain": 0, "clips": [{"id": "words-drums-a-at-5", "asset": "words-drums-a", "bar": 5, "bars": 4, "gain": 2.158107946190392, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.03, "fit": false, "loop": false}, {"id": "words-drums-a-at-13", "asset": "words-drums-a", "bar": 13, "bars": 4, "gain": 2.158107946190392, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.4, "fit": false, "loop": false}]}, {"id": "bass", "name": "Bass", "gain": 0, "clips": [{"id": "words-bass-a-at-5", "asset": "words-bass-a", "bar": 5, "bars": 4, "gain": -0.6343276022596973, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.03, "fit": false, "loop": false}, {"id": "words-bass-a-at-13", "asset": "words-bass-a", "bar": 13, "bars": 4, "gain": -0.6343276022596973, "offset": 0, "semitones": 0, "cutoff": 20000, "fadeIn": 0.006, "fadeOut": 0.4, "fit": false, "loop": false}]}]});}
export function clipSpan(clip,project,asset,edit){
  const bar=barSeconds(project.bpm),limit=project.bars*bar,start=(clip.bar-1)*bar;
  if(start>=limit)return null;
  const requested=Math.min(clip.bars*bar,limit-start);
  if(clip.asset.startsWith('synth-'))return {start,duration:requested,rate:1,offset:0,loopEnd:requested};
  if(!asset)return null;
  const trim=edit??defaultEdit(asset),offset=clamp(trim.in+clip.offset,0,asset.seconds),loopEnd=clamp(trim.out,offset,asset.seconds);
  const rate=2**((clip.semitones+(trim.semitones||0))/12)*(clip.fit&&asset.bpm?project.bpm/asset.bpm:1);
  const available=(loopEnd-offset)/rate;
  return available>.001?{start,duration:clip.loop?requested:Math.min(requested,available),rate,offset,loopEnd}:null;
}
function noiseBuffer(context,seed){
  const n=roundFrames(.12,context.sampleRate),b=context.createBuffer(1,n,context.sampleRate);let state=seed>>>0;
  const data=b.getChannelData(0);for(let i=0;i<n;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=(state/2147483648-1)*Math.exp(-i/(context.sampleRate*.022));}return b;
}
const roundFrames=(seconds,sr)=>Math.max(1,Math.round(seconds*sr));
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function scheduleProject(context,destination,project,assets,edits,buffers,{at=0,seek=0,trackId=null}={}){
  const voices=new Set(),solo=project.tracks.some(t=>t.solo),master=context.createGain();master.gain.value=amp(project.master);master.connect(destination);
  const nodes=[master];
  const remember=s=>{voices.add(s);s.onended=()=>{voices.delete(s);try{s.disconnect();}catch{}};};
  for(const t of project.tracks){
    if(t.mute||(solo&&!t.solo)||(trackId&&t.id!==trackId))continue;
    const tg=context.createGain();tg.connect(master);nodes.push(tg);
    const points=t.automation??[],timeFor=a=>(a.bar-1)*barSeconds(project.bpm);
    let value=1;
    if(points.length){value=amp(points[0].db);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];if(seek>=timeFor(a)&&seek<=timeFor(b)){const blend=(seek-timeFor(a))/Math.max(.001,timeFor(b)-timeFor(a));value=amp(a.db)+(amp(b.db)-amp(a.db))*blend;break;}if(seek>timeFor(b))value=amp(b.db);}}
    tg.gain.setValueAtTime(amp(t.gain)*value,at);
    for(const point of points)if(timeFor(point)>seek)tg.gain.linearRampToValueAtTime(amp(t.gain+point.db),at+timeFor(point)-seek);
    for(const c of t.clips){
      const asset=assets.get(c.asset),edit=edits[c.asset]??(asset?defaultEdit(asset):{}),span=clipSpan(c,project,asset,edit);
      if(!span||span.start+span.duration<=seek)continue;
      const elapsed=Math.max(0,seek-span.start),when=at+Math.max(0,span.start-seek),duration=span.duration-elapsed;
      const envelope=context.createGain(),pan=context.createStereoPanner();pan.pan.value=t.pan;envelope.connect(pan);pan.connect(tg);nodes.push(envelope,pan);
      const level=amp(c.gain+(edit.gain||0));
      // Seeking must enter the existing envelope, including a long musical tail.
      const fadeIn=Math.max(.001,Math.min(c.fadeIn,span.duration/2)),fadeOut=Math.min(c.fadeOut,span.duration/2);
      const envAt=t=>Math.min(1,t/fadeIn,fadeOut?(span.duration-t)/fadeOut:1);
      envelope.gain.setValueAtTime(level*envAt(elapsed),when);
      if(elapsed<fadeIn)envelope.gain.linearRampToValueAtTime(level,when+fadeIn-elapsed);
      if(elapsed<span.duration-fadeOut)envelope.gain.setValueAtTime(level,when+span.duration-fadeOut-elapsed);
      if(fadeOut)envelope.gain.linearRampToValueAtTime(0,when+duration);
      let inlet=envelope;
      const cutoff=Math.min(c.cutoff,edit.cutoff||20000);
      if(cutoff<19500){const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.707;filter.connect(inlet);nodes.push(filter);inlet=filter;}
      if(c.asset.startsWith('synth-')){
        const step=60/project.bpm/4,pattern=c.pattern||[],steps=Math.ceil(span.duration/step);
        for(let i=0;i<steps;i++){
          const velocity=pattern[i%16]||0,pos=i*step;if(!velocity||pos<elapsed||pos>=span.duration)continue;
          const time=at+span.start+pos-seek,g=context.createGain(),length=Math.min(c.asset==='synth-sub'?.4:.12,span.duration-pos);
          if(length<.002)continue;
          g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(velocity,time+.004);g.gain.exponentialRampToValueAtTime(.00001,time+length);g.connect(inlet);nodes.push(g);
          if(c.asset==='synth-sub'){
            const s=context.createOscillator();s.type='sine';s.frequency.value=440*2**((c.note+c.semitones-69)/12);s.connect(g);s.start(time);s.stop(time+length);remember(s);
          }else{
            const s=context.createBufferSource(),hp=context.createBiquadFilter();s.buffer=noiseBuffer(context,hash(c.id+':'+i));hp.type='highpass';hp.frequency.value=3800;s.connect(hp);hp.connect(g);nodes.push(hp);s.start(time);s.stop(time+length);remember(s);
          }
        }
      }else{
        const buffer=buffers.get(c.asset);if(!buffer)throw Error(`Audio missing: ${asset?.name||c.asset}`);
        const s=context.createBufferSource();s.buffer=buffer;s.playbackRate.value=span.rate;s.loop=c.loop;
        s.loopStart=span.offset;s.loopEnd=span.loopEnd;s.connect(inlet);
        const offset=c.loop?span.offset+(elapsed*span.rate)%(span.loopEnd-span.offset):span.offset+elapsed*span.rate;
        s.start(when,offset);s.stop(when+duration);remember(s);
      }
    }
  }
  return {voices,stop(){for(const s of voices){try{s.stop();}catch{}try{s.disconnect();}catch{}}voices.clear();for(const n of nodes){try{n.disconnect();}catch{}}}};
}
export function wavBytes(buffer,gain=1){
  const channels=buffer.numberOfChannels,frames=buffer.length,bytes=new ArrayBuffer(44+frames*channels*3),v=new DataView(bytes);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*3,true);v.setUint16(32,channels*3,true);v.setUint16(34,24,true);str(36,'data');v.setUint32(40,bytes.byteLength-44,true);
  const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let offset=44;
  for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){let n=Math.round(clamp(data[c][i]*gain,-1,1)*8388607);v.setUint8(offset++,n&255);v.setUint8(offset++,(n>>8)&255);v.setUint8(offset++,(n>>16)&255);}
  return new Uint8Array(bytes);
}
export function peakOf(buffer){let peak=0;for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++)peak=Math.max(peak,Math.abs(d[i]));}return peak;}
export const exportGain=buffer=>Math.min(1,amp(-2)/Math.max(peakOf(buffer),1e-9));
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let n=0xffffffff;for(const v of b)n=crcTable[(n^v)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function zipFiles(files){
  const chunks=[],central=[];let offset=0,size=0;const encoder=new TextEncoder();
  for(const [name,data] of files){const bytes=data instanceof Uint8Array?data:encoder.encode(data),filename=encoder.encode(name),crc=crc32(bytes);
    const local=new Uint8Array(30+filename.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,filename.length,true);local.set(filename,30);
    const cd=new Uint8Array(46+filename.length),c=new DataView(cd.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);cd.set(filename,46);
    chunks.push(local,bytes);central.push(cd);offset+=local.length+bytes.length;size+=cd.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
}
export function unzipStored(bytes){
  const entries=new Map(),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let at=0;
  while(at+30<=bytes.length&&v.getUint32(at,true)===0x04034b50){
    if(v.getUint16(at+8,true)!==0)throw Error('Import a ZIP exported by Resonance, or its project.json.');
    const size=v.getUint32(at+18,true),nl=v.getUint16(at+26,true),extra=v.getUint16(at+28,true),start=at+30+nl+extra;
    if(size>60e6||start+size>bytes.length||entries.size>100)throw Error('Invalid or oversized project bundle.');
    const name=new TextDecoder().decode(bytes.slice(at+30,at+30+nl)),data=bytes.slice(start,start+size);
    if(crc32(data)!==v.getUint32(at+14,true))throw Error('Project bundle checksum mismatch.');
    entries.set(name,data);at=start+size;
  }return entries;
}
