const actions=new Set(['hit','miss','use','skill','other','stabilize','flee','shield','reserve','check','rescue']);
// Every completed action uses the same compact board feedback, regardless of
// whether it was a weapon attack, an ability, a check or a support action.
export function compactResultFeedback(result,language='de') {
    if(!result)return null;
    const l=(de,en)=>language==='en'?en:de,failed=result.hit===false||result.success===false;
    let label;
    switch(result.type){
        case 'attack':
            if(result.interrupted)return {label:l('Angriff unterbrochen','Attack interrupted'),kind:'info'};
            if(result.voided)return {label:l('Angriff aufgehoben','Attack voided'),kind:'info'};
            label=result.misfire?'Friendly Fire':result.hit===false?l('Angriff verfehlt','Attack missed'):result.critical?l('Kritischer Treffer','Critical hit'):l('Treffer','Hit');break;
        case 'skill':label=failed?l('Fähigkeit fehlgeschlagen','Ability failed'):l('Fähigkeit erfolgreich','Ability succeeded');break;
        case 'check':label=failed?l('Eigene Probe fehlgeschlagen','Own check failed'):l('Eigene Probe erfolgreich','Own check succeeded');break;
        case 'use':label=result.refill?l('Vorrat aufgefüllt','Stock refilled'):l('Behandlung ausgeführt','Treatment used');break;
        case 'shield':label=l('Schutz aktiviert','Shield activated');break;
        case 'reserve':label=l('Reaktion reserviert','Reaction reserved');break;
        case 'rescue':label=l('Figur hochgezogen','Participant pulled up');break;
        case 'stabilize':label=l('Figur stabilisiert','Participant stabilized');break;
        case 'flee':label=failed?l('Flucht fehlgeschlagen','Flee failed'):l('Figur geflohen','Participant fled');break;
        case 'other':label=l('Aktion abgeschlossen','Action completed');break;
        default:return null;
    }
    if(result.criticalFailure)label=l('Kritischer Misserfolg','Critical failure');
    return {label,kind:failed||result.misfire?'failure':'success'};
}
export function latestResult(log) {
    const visible=log.filter(e=>e.chatRelevant!==false&&[...actions,'undo','end','reset','restore','time','condition','turn','effect','remark'].includes(e.type));
    const latest=visible.at(-1);if(!latest)return {event:null,turn:null,following:[]};
    const action=visible.findLast(e=>actions.has(e.type)),turn=visible.findLast(e=>e.type==='turn'),boundary=visible.findLast(e=>['undo','end','reset','restore','time','condition'].includes(e.type));
    const ai=visible.indexOf(action),ti=visible.indexOf(turn),bi=visible.indexOf(boundary);
    const event=action&&turn&&ti>ai&&bi<ai?action:latest;
    return {event,turn:event===action&&ti>ai?turn:null,following:event===action?visible.slice(ai+1).filter(e=>e.type==='effect'):[]};
}
