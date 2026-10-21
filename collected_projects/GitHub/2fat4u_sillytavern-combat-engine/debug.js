import { VERSION } from './version.js?v=2.0.0-beta.2-hotfix.2';
const sensitive = /password|secret|token|api.?key|authorization|cookie/i;
export function debugValue(value, depth = 0) {
    if (depth > 5) return '[depth limit]';
    if (typeof value === 'string') return value.startsWith('data:') ? '[media omitted]' : value.replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/\bsk-[\w-]{8,}/g,'[redacted]').slice(0,1500);
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.slice(0,50).map(v=>debugValue(v,depth+1));
    return Object.fromEntries(Object.entries(value).slice(0,48).filter(([k])=>!sensitive.test(k)&&!['notes','images','portraitImage','chat'].includes(k)).map(([k,v])=>[k,debugValue(v,depth+1)]));
}
export function createDebug(enabled, snapshot, limit = 200) {
    let entries=[];
    function record(type, detail = {}) {
        try { if(type!=='error'&&!enabled())return; entries.push({at:new Date().toISOString(),type,detail:debugValue(detail),state:type==='timing'?undefined:debugValue(snapshot())});entries=entries.slice(-limit); } catch { /* Diagnostics cannot stop combat. */ }
    }
    return { record, entries:()=>structuredClone(entries), clear:()=>{entries=[];},
        text:()=>JSON.stringify({extension:'Deterministic Combat',version:VERSION,exportedAt:new Date().toISOString(),entries},null,2) };
}
