import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { SKILLS } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { STATUS_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const selfAbility=(skill,dcMode=skill?.dcMode)=>SKILLS[skill?.kind]?.target==='self'||skill?.kind==='narrative'&&skill.mechanics?.target==='self'&&(dcMode??'fixed')==='fixed';
// Summarize the actual recipient and applied change, never infer mechanics from prose.
export function abilityFeedbackText(result,language='de'){
    const l=(de,en)=>language==='en'?en:de,parts=[],r=result.custom;
    if(result.type==='attack')return (result.narrativeReactions??[]).filter(v=>v.mechanical).map(v=>'<small class="ct-ability-feedback-detail">'+esc((v.skillName??v.actorName)+': '+(v.skipped?l('nicht ausgeführt','not executed'):v.criticalFailure?l('Kritischer Misserfolg','Critical failure'):v.success?l('Reaktion erfolgreich','Reaction succeeded'):l('Reaktion fehlgeschlagen','Reaction failed')))+'</small>'+(v.skipped?'':abilityFeedbackText(v,language))).join('');
    if(r?.success){
        if(r.damage)parts.push('−'+r.damage.applied+' HP');
        if(r.healing)parts.push('+'+r.healing.applied+' HP');
        if(r.status){const label=STATUS_TYPES[r.status.type]?.[language]??r.status.type;parts.push(label+': '+(r.status.immune?l('immun – nicht angewendet','immune – not applied'):r.status.skipped?l('nicht angewendet','not applied'):r.status.mode==='remove'?(r.status.changed?l('entfernt','removed'):l('war nicht vorhanden','was not present')):l('angewendet','applied')));}
    }
    const detail=parts.length?r.targetName+': '+parts.join(' · '):result.narrative?l('Keine automatische Wirkung eingestellt. Weitere beschriebene Effekte manuell ausspielen.','No automatic effect configured. Apply additional described effects manually.'):'';
    const intent=String(result.description??'').trim();
    return (detail?'<small class="ct-ability-feedback-detail">'+esc(detail)+'</small>':'')+(intent?'<small class="ct-ability-feedback-intent" title="'+esc(intent)+'">'+l('Erzählabsicht: ','Narrative intent: ')+esc(intent)+'</small>':'');
}
export function abilityRestriction(s,a,b,skill,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    if(!s.rules.skillsEnabled)return l('Fähigkeiten sind ausgeschaltet.','Abilities are disabled.');
    if(skill.kind==='acrobatics'&&a.acrobaticsUsedTurn===s.turnSerial&&!E.manualUnlimited(s,a))return l('Deckung überwinden wurde in diesem Zug bereits versucht. Für einen manuellen weiteren Versuch das Aktionslimit aufheben.','Overcome cover was already attempted this turn. Lift the action limit for a manual retry.');
    if(skill.kind==='sprint'&&a.sprintTurn===s.turnSerial)return l('Sprint ist in diesem Zug bereits aktiv.','Sprint is already active this turn.');
    if(!E.canPay(s,a,skill))return l('Der Vorrat reicht für diesen Einsatz nicht.','Insufficient stock for this use.');
    if(skill.kind==='jump'&&!E.jumpDestinations(s,a,skill).length)return l('Kein legales Sprungziel hinter einer liegenden Figur. Freie Landung, Richtung und Bewegungszustand prüfen.','No legal jump destination beyond a downed participant. Check free landing, direction and movement restrictions.');
    if(!b||!E.canUseSkill(s,a,b,skill))return l('Fähigkeit hier nicht nutzbar. Ziel, Bewegung, Reichweite und Zustand prüfen.','Ability unavailable here. Check target, movement, range and conditions.');
    if(s.phase==='active'&&!E.canManualAction(s,a,'skill'))return l('Keine passende Aktion übrig.','No matching action remaining.');
    return '';
}
export function coordinateInput(raw) {
    const m=/^([A-Z]{1,2})([1-9][0-9]?)$/.exec(String(raw??'').trim().replace(/\s+/g,'').toUpperCase());if(!m)return null;
    let x=0;for(const c of m[1])x=x*26+c.charCodeAt(0)-64;return {x:x-1,y:Number(m[2])-1};
}
export function carrySelection(s,a,b,raw,language='de',plans=null,carrierRaw='') {
    const l=(de,en)=>language==='en'?en:de,point=coordinateInput(raw);
    if(!String(raw??'').trim())return {point:null,plan:null,error:l('Zielfeld für die getragene Figur eingeben oder auf der Karte auswählen.','Enter the carried participant’s destination or choose it on the map.')};
    if(!point)return {point:null,plan:null,error:l('Koordinate wie A6 eingeben.','Enter a coordinate such as A6.')};
    if(point.x<0||point.y<0||point.x>=s.board.width||point.y>=s.board.height)return {point,plan:null,error:l('Das Zielfeld liegt außerhalb der Karte.','The destination is outside the board.')};
    const occupied=s.actors.find(v=>v.id!==a.id&&v.id!==b?.id&&v.position&&E.distance(v.position,point)===0);
    if(occupied)return {point,plan:null,error:l('Zielfeld belegt: ','Destination occupied: ')+occupied.name+'.'};
    if(!E.canOccupy(s,point))return {point,plan:null,error:l('Die getragene Figur kann auf diesem Gelände nicht landen.','The carried participant cannot land on this terrain.')};
    const choices=(plans??E.carryPlans(s,a,b,a?.position,point)).filter(p=>p.x===point.x&&p.y===point.y);
    let carrierPoint=null;
    if(carrierRaw){
        carrierPoint=coordinateInput(carrierRaw);
        if(!carrierPoint)return {point,choices,plan:null,error:l('Helfer-Endfeld als Koordinate wie A5 wählen.','Choose the helper endpoint as a coordinate such as A5.')};
        if(E.distance(point,carrierPoint)!==1||!E.adjacentAccess(s,point,carrierPoint))return {point,choices,plan:null,error:l('Die beiden Endfelder müssen verschieden und erreichbar benachbart sein.','The two endpoints must be distinct accessible neighbors.')};
        if(!E.canOccupy(s,carrierPoint))return {point,choices,plan:null,error:l('Der Helfer kann auf diesem Gelände nicht stehen.','The helper cannot stand on this terrain.')};
        const blocker=s.actors.find(v=>v.id!==a.id&&v.id!==b?.id&&v.position&&E.distance(v.position,carrierPoint)===0);
        if(blocker)return {point,choices,plan:null,error:l('Helfer-Endfeld belegt: ','Helper endpoint occupied: ')+blocker.name+'.'};
    }
    const plan=carrierPoint?choices.find(p=>E.distance(p.carrier,carrierPoint)===0):choices[0];
    return {point,choices,plan:plan??null,error:plan?'':l('Kein bezahlbarer Transportweg für diese Endfelder. Verbleibende Bewegung: ','No affordable carrying route for these endpoints. Remaining movement: ')+E.movementBudget(s,a).remaining+l('. Weg, Hindernisse und Platz für beide Figuren prüfen.','. Check the route, obstacles and space for both participants.')};
}
export function carryPreview(a,b,plan,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    return b.name+' → '+E.coordinate(plan)+'\n'+a.name+' → '+E.coordinate(plan.carrier)+'\n'+plan.cost+l(' Bewegungspunkte',' movement points');
}
export function carryPreviewMarkup(a,b,plan,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    return '<dl class="ct-carry-preview" role="status"><div><dt>'+l('Gerettete Figur','Carried participant')+'</dt><dd>'+esc(b.name+' → '+E.coordinate(plan))+'</dd></div><div><dt>'+l('Helfer','Helper')+'</dt><dd>'+esc(a.name+' → '+E.coordinate(plan.carrier))+'</dd></div><div><dt>'+l('Bewegungskosten','Movement cost')+'</dt><dd>'+esc(plan.cost+l(' Bewegungspunkte',' movement points'))+'</dd></div></dl>';
}
export function carryDestinationMarkup(s,a,b,raw,language='de',prefix='skill',plans=null,carrierRaw='') {
    const l=(de,en)=>language==='en'?en:de,selection=carrySelection(s,a,b,raw,language,plans,carrierRaw),choices=selection.choices??[],kind=prefix==='skill'?'skill':'check';
    return '<div class="ct-carry-choice"><label class="ct-field"><span>'+l('Zielfeld der getragenen Figur','Carried participant destination')+'</span><input name="'+(prefix==='skill'?'skillCarryCell':'check-carryCell')+'" type="text" value="'+esc(raw)+'" placeholder="A6" maxlength="6" autocomplete="off" spellcheck="false"></label><button type="button" class="ct-button" data-action="pick-carry-'+kind+'">'+l('Auf Karte wählen','Choose on map')+'</button>'+
        '<label class="ct-field"><span>'+l('Helfer-Endfeld','Helper endpoint')+'</span><select name="'+(prefix==='skill'?'skillCarrierCell':'check-carrierCell')+'" '+(!choices.length?'disabled':'')+'><option value="">'+l('Vorschlag verwenden','Use suggested endpoint')+'</option>'+choices.map(p=>{const cell=E.coordinate(p.carrier);return '<option value="'+cell+'" '+(cell===carrierRaw?'selected':'')+'>'+cell+' · '+p.cost+l(' Bewegung',' movement')+'</option>';}).join('')+'</select></label><button type="button" class="ct-button" data-action="pick-carrier-'+kind+'" '+(!choices.length?'disabled':'')+'>'+l('Helferfeld auf Karte wählen','Choose helper endpoint on map')+'</button>'+
        (selection.plan?carryPreviewMarkup(a,b,selection.plan,language):'<p class="ct-carry-preview '+(raw?'ct-warning':'ct-muted')+'" role="status">'+esc(selection.error)+'</p>')+'</div>';
}
