export function promptText(value) {
    if(typeof value==='string')return value;
    if(value==null)return '';
    if(Array.isArray(value))return value.map(promptText).join('\n');
    return promptText(value.chat??value.messages??value.content??value.text??value.prompt??value.input??'');
}
// Only complete engine state blocks at a line boundary belong to this bridge.
// Inline marker references in character cards and user/assistant history are not ours.
const stateBlock = /^[ \t]*\[DETERMINISTIC COMBAT — AUTHORITATIVE STATE\]\r?\n(?=Phase: |Reserve participants\b)[\s\S]*?^\[\/DETERMINISTIC COMBAT\][ \t]*(?:\r?\n)?/gm;
function withoutState(content) {
    if(typeof content==='string')return content.replace(stateBlock,'');
    if(!Array.isArray(content))return content;
    let changed=false;
    const parts=content.map(part=>{
        if(part?.type!=='text'||typeof part.text!=='string')return part;
        const text=withoutState(part.text);
        if(text===part.text)return part;
        changed=true;return {...part,text};
    });
    return changed?parts:content;
}
const blankContent=content=>typeof content==='string'? !content.trim():Array.isArray(content)&&content.every(p=>p?.type==='text'&&!p.text?.trim());
// Place one fresh, owned system block after history, summaries and other instructions.
// Work only on the outgoing array; preserve stored chat and unrelated prompt text.
export function ensureCombatContext(payload,expected) {
    if(!expected||payload?.dryRun)return false;
    const messages=Array.isArray(payload)?payload:payload?.chat??payload?.messages??payload?.prompt;
    if(!Array.isArray(messages))return false;
    const last=messages.at(-1);
    if(last?.role==='system'&&last.content===expected&&messages.slice(0,-1).every(m=>m?.role!=='system'||withoutState(m.content)===m.content))return false;
    const kept=[];
    for(const message of messages){
        if(message?.role!=='system'){kept.push(message);continue;}
        const content=withoutState(message.content);
        if(content===message.content){kept.push(message);continue;}
        if(!blankContent(content))kept.push({...message,content});
    }
    kept.push({role:'system',content:expected});
    messages.splice(0,messages.length,...kept);return true;
}
