// Small original cues, synthesized locally. No external media or network requests.
export const SOUND_CUES = Object.freeze({
    hit: [[170, .055, 'triangle'], [110, .1, 'triangle']],
    miss: [[430, .065, 'sine'], [250, .12, 'sine']],
    turn: [[440, .075, 'sine'], [660, .09, 'sine']],
    heal: [[440, .055, 'sine'], [554, .055, 'sine'], [660, .12, 'sine']],
    effect: [[220, .065, 'triangle'], [330, .1, 'triangle']],
});
export function soundPreferences(raw = {}) {
    const volume = raw.soundVolume ?? 35;
    if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 100 || raw.soundEnabled !== undefined && typeof raw.soundEnabled !== 'boolean') throw new Error('Ungültige Sound-Einstellung.');
    if(raw.soundMuted!==undefined&&(!Array.isArray(raw.soundMuted)||raw.soundMuted.some(k=>!Object.hasOwn(SOUND_CUES,k))||new Set(raw.soundMuted).size!==raw.soundMuted.length))throw Error('Invalid muted sounds');
    return { soundEnabled: raw.soundEnabled ?? false, soundVolume: volume,...(raw.soundFiles!==undefined?{soundFiles:soundFilesFrom(raw.soundFiles)}:{}),...(raw.soundMuted!==undefined?{soundMuted:[...raw.soundMuted]}:{}) };
}
export const SOUND_FILE_LIMIT=128*1024;
export function soundFilesFrom(raw={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!Object.hasOwn(SOUND_CUES,k)))throw Error('Invalid sound files');
    return Object.fromEntries(Object.entries(raw).map(([cue,file])=>{
        if(!file||typeof file!=='object'||typeof file.name!=='string'||file.name.length>100||typeof file.src!=='string')throw Error('Invalid sound file');
        const m=/^data:audio\/(mpeg|wav|ogg|webm|mp4);base64,([A-Za-z0-9+/]+={0,2})$/.exec(file.src);
        if(!m||m[2].length%4||m[2].length>Math.ceil(SOUND_FILE_LIMIT/3)*4)throw Error('Sound file is invalid or too large (128 KB)');
        return [cue,{name:file.name,src:file.src}];
    }));
}
export async function prepareSound(file,environment={}){
    const aliases={'audio/mp3':'audio/mpeg','audio/x-wav':'audio/wav','audio/wave':'audio/wav','audio/x-m4a':'audio/mp4'},mime=aliases[file?.type]??file?.type;
    if(!file||!['audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp4'].includes(mime)||!Number.isFinite(file.size)||file.size<=0||file.size>SOUND_FILE_LIMIT)throw Error('Choose an audio file up to 128 KB');
    const bytes=await file.arrayBuffer();if(bytes.byteLength!==file.size)throw Error('Invalid sound file');
    const Type=environment.Context??globalThis.AudioContext??globalThis.webkitAudioContext;
    if(!Type)throw Error('Audio is unavailable in this browser');
    const context=new Type();
    try{const audio=await context.decodeAudioData(bytes.slice(0));if(!audio||!Number.isFinite(audio.duration)||audio.duration<=0||audio.duration>15)throw Error('Sound must be at most 15 seconds');}
    finally{await context.close?.();}
    let binary='';const data=new Uint8Array(bytes);for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));
    const src='data:'+mime+';base64,'+(environment.btoa??globalThis.btoa)(binary),name=String(file.name??'Sound').slice(0,100);
    return soundFilesFrom({hit:{name,src}}).hit;
}
export function createSounds(preferences, { contextFactory,onError=()=>{} } = {}) {
    let context, unlocked = false, nextAt = 0,generation=0;
    const cache=new Map();
    const make = contextFactory ?? (() => { const Type = globalThis.AudioContext ?? globalThis.webkitAudioContext; return Type ? new Type() : null; });
    async function unlock() {
        if (!preferences().soundEnabled) return false;
        try { context ??= make(); if (!context) return false; await context.resume?.(); unlocked = context.state === undefined || context.state === 'running'; return unlocked; }
        catch { unlocked = false; return false; }
    }
    function play(cue) {
        if (!unlocked || !context || !preferences().soundEnabled || context.state && context.state !== 'running') return;
        const prefs=preferences(),volume = soundPreferences(prefs).soundVolume / 100;
        if (!volume || !SOUND_CUES[cue]) return;
        if(prefs.soundMuted?.includes(cue))return;
        const file=prefs.soundFiles?.[cue];
        if(file){
            const epoch=generation,current=context;
            let pending=cache.get(file.src);
            if(!pending){
                if(cache.size>=5)cache.clear();
                pending=Promise.resolve().then(()=>{const encoded=file.src.split(',')[1],bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));return current.decodeAudioData(bytes.buffer);});cache.set(file.src,pending);
            }
            return pending.then(buffer=>{
                if(epoch!==generation||!unlocked||!preferences().soundEnabled||preferences().soundMuted?.includes(cue)||preferences().soundFiles?.[cue]?.src!==file.src)return;
                if(!buffer||buffer.duration>15)throw Error('Sound must be at most 15 seconds');
                const source=current.createBufferSource(),gain=current.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(current.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
            }).catch(error=>{if(epoch===generation){cache.delete(file.src);onError(error);}});
        }
        try {
            let at = Math.max(context.currentTime, Math.min(nextAt, context.currentTime + .6));
            for (const [frequency, duration, type] of SOUND_CUES[cue]) {
                const oscillator = context.createOscillator(), gain = context.createGain();
                oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
                gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume * .16, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
                oscillator.connect(gain); gain.connect(context.destination);
                oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
                oscillator.start(at); oscillator.stop(at + duration + .01); at += duration + .015;
            }
            nextAt = at;
        } catch { /* Audio must never interrupt combat. */ }
    }
    return { unlock, play, close() { unlocked = false;generation++;cache.clear(); try { const closing = context?.close?.(); closing?.catch?.(() => {}); } catch {} context = null; } };
}
export function cuesForChange(before, after, events) {
    const silent = events.some(v => ['undo', 'import'].includes(v.type));
    if (silent) return [];
    const cues = [];
    const custom=events.map(v=>v.details?.custom).filter(Boolean);
    if(custom.some(v=>v.damage?.applied>0))cues.push('hit');
    if(custom.some(v=>v.healing?.applied>0))cues.push('heal');
    if (events.some(v => v.type === 'hit')&&!cues.includes('hit')) cues.push('hit');
    else if (events.some(v => v.type === 'miss')) cues.push('miss');
    if (events.some(v => v.type === 'use')) cues.push('heal');
    if (events.some(v => v.type === 'effect' || v.details?.appliedEffects?.length)) cues.push('effect');
    if (events.some(v => v.type === 'skill' && v.details?.success) && !cues.includes('effect')) cues.push('effect');
    if (events.some(v => v.type === 'skill' && v.details?.success === false) && !cues.includes('miss')) cues.push('miss');
    if (events.some(v => v.type === 'check' && !v.details?.free && v.details?.success) && !cues.includes('effect')) cues.push('effect');
    if (events.some(v => v.type === 'check' && !v.details?.free && v.details?.success === false) && !cues.includes('miss')) cues.push('miss');
    if (after.phase === 'active' && (before.phase !== 'active' || before.turnSerial !== after.turnSerial)) cues.push('turn');
    return cues;
}
