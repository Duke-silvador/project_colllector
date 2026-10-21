import { customDraft, recipeFromDraft, customEffectMarkup } from './custom-effects-ui.js?v=2.0.0-beta.2-hotfix.2';
import { mechanicsFrom, mechanicsText, effectRange } from './custom-effects.js?v=2.0.0-beta.2-hotfix.2';
import { selfAbility, abilityRestriction, coordinateInput, carrySelection, carryDestinationMarkup } from './ability-ui.js?v=2.0.0-beta.2-hotfix.2';
import { poolBudget } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';
import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { defenseText, skillPreset, SKILLS, abilityGroups, abilityChoices, applicationLabel } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function createCheckDrafts() {
    const drafts=new Map();
    const get=(chat,actor)=>{const key=JSON.stringify([chat,actor]);let value=drafts.get(key);if(!value){value={...customDraft(),description:'',stat:'charisma',bonus:'0',dc:'15',mode:'paid',resource:'',cost:'1',dcMode:'fixed',dcAdjustment:'0',effect:'',target:'',actionSource:'auto',weapon:'',destination:'',carryCell:'',carrierCell:''};drafts.set(key,value);}return value;};
    return {get,update(chat,a,input,s){
        if(!input.name?.startsWith('check-'))return false;
        const name=input.name.slice(6),d=get(chat,a.id);if(!Object.hasOwn(d,name)&&!['difficulty','effectApplication'].includes(name))return false;
        if(name==='difficulty'){if(input.value!=='custom')d.dc=input.value;}
        else if(name==='effectApplication')d.effect=input.value;else d[name]=['damageOn','healingOn'].includes(name)?input.checked:input.value;
        if(name==='mode'&&input.value==='narrative'){d.effect='';d.resource='';d.weapon='';d.destination='';d.damageOn=false;d.healingOn=false;d.statusMode='none';}
        if(name==='effect'||name==='effectApplication'){const skill=a.skills.find(v=>v.id===d.effect);d.weapon='';d.destination='';d.carryCell='';d.carrierCell='';if(skill){d.damageOn=false;d.healingOn=false;d.statusMode='none';d.resource='';d.stat=skill.stat;d.target=SKILLS[skill.kind].target==='self'?a.id:s.actors.find(b=>E.canUseSkill(s,a,b,skill))?.id??'';}}
        if(name==='carryCell')d.carrierCell='';
        if(name==='target'){d.weapon='';d.destination='';d.carryCell='';d.carrierCell='';}
        return true;
    }};
}
export function checkIntent(s,a,d) {
    const intent={type:'check',actor:a.id,turn:E.turnToken(s),description:d.description,stat:d.stat,bonus:d.bonus,dc:d.dc,free:d.mode==='narrative'};
    if(d.mode!=='narrative'&&!d.effect&&d.resource){intent.resource=d.resource;intent.cost=d.cost;}intent.dcMode=d.dcMode;intent.dcAdjustment=d.dcAdjustment;if(!['fixed','target-dc'].includes(d.dcMode))intent.dcBase=d.dc;
    intent.actionSource=d.mode==='narrative'?'auto':d.actionSource;
    if(d.mode==='paid'&&!d.effect){const mechanics=mechanicsFrom(recipeFromDraft(d));if(mechanics){intent.mechanics=mechanics;intent.effectRange=effectRange(d.effectRange);}}
    if(d.target)intent.target=d.target;if(d.effect)intent.effect=d.effect;if(d.weapon)intent.weapon=d.weapon;
    if(a.skills.find(v=>v.id===d.effect)?.kind==='carry'){const choice=carrySelection(s,a,s.actors.find(b=>b.id===d.target),d.carryCell,s.rules.language,null,d.carrierCell);if(!choice.plan)throw Error(choice.error);d.destination=choice.point.x+','+choice.point.y;intent.carrierDestination={...choice.plan.carrier};}
    if(d.destination){const [x,y]=d.destination.split(',').map(Number);intent.destination={x,y};}
    return intent;
}
export function narrativeFromCheck(d,name) {const mechanics=mechanicsFrom(recipeFromDraft(d));return {...skillPreset('narrative'),name,description:d.description,stat:d.stat,bonus:d.bonus,dc:d.dc,dcBase:d.dc,dcMode:d.dcMode,dcAdjustment:d.dcAdjustment,resource:d.resource||null,cost:Number(d.cost),reaction:false,...(mechanics?{mechanics,range:effectRange(d.effectRange)}:{})};}
export function checkMarkup(s,a,d,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    const field=(title,name,value,type='text',extra='')=>'<label class="ct-field"><span>'+esc(title)+'</span><input name="check-'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
    const select=(title,name,value,options,extra='')=>'<label class="ct-field"><span>'+esc(title)+'</span><select name="check-'+name+'" '+extra+'>'+options.map(([key,label])=>'<option value="'+esc(key)+'" '+(String(value)===String(key)?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
    if(d.effect&&!a.skills.some(v=>v.id===d.effect)){d.effect='';d.weapon='';d.destination='';}
    const skill=a.skills.find(v=>v.id===d.effect),own=selfAbility(skill??(d.mode==='paid'?{kind:'narrative',mechanics:recipeFromDraft(d)}:null),d.dcMode),targets=own?[a]:s.actors.filter(b=>!skill||E.canUseSkill(s,a,b,skill));if(own)d.target=a.id;
    if((skill||d.target)&&!targets.some(b=>b.id===d.target))d.target=targets.find(b=>b.id===a.id)?.id??targets[0]?.id??'';
    const b=s.actors.find(b=>b.id===d.target);let mechanics=null,mechanicsError='';try{mechanics=!skill&&d.mode==='paid'?mechanicsFrom(recipeFromDraft(d)):null;if(mechanics)E.customEffectTarget(s,a,b,mechanics,effectRange(d.effectRange));}catch(error){mechanicsError=language==='en'?'Check the effect dice, bonus, condition, recipient, range and target.':error.message;}
    const selfContext=(skill?.mechanics??mechanics)?.target==='self'&&d.dcMode!=='fixed';
    const budget=poolBudget(s,a),kind=skill||mechanics?'skill':'other';
    const eligible=budget.bonus.filter(p=>p.remaining&&p.allowed.includes(kind));
    if(d.actionSource.startsWith('bonus:')&&!eligible.some(p=>'bonus:'+p.id===d.actionSource))d.actionSource='auto';
    const difficulty=[['5',l('Sehr leicht · 5','Very easy · 5')],['10',l('Leicht · 10','Easy · 10')],['15',l('Normal · 15','Normal · 15')],['20',l('Schwer · 20','Hard · 20')],['25',l('Sehr schwer · 25','Very hard · 25')],['30',l('Fast unmöglich · 30','Nearly impossible · 30')],['custom',l('Eigener DC','Custom DC')]];
    const capable=E.isCombatant(a)&&!(s.rules.effectsEnabled&&a.effects.some(e=>e.type==='stunned'));
    let cost=null,costError='';try{cost=skill?E.consumption(s,a,skill):E.consumption(s,a,{resource:d.mode==='narrative'?null:d.resource||null,cost:d.cost});}catch(error){costError=error.message;}
    let allowed=!mechanicsError&&!costError&&cost?.available!==false&&capable&&(d.mode==='narrative'||E.canManualAction(s,a,kind));
    const restriction=skill?abilityRestriction(s,a,b,skill,language):'';if(restriction)allowed=false;
    const defense=E.skillDefense(s,b,{dc:d.dc,dcBase:Number(String(d.dc).replace(',','.')),dcMode:d.dcMode,dcAdjustment:Number(String(d.dcAdjustment).replace(',','.'))});
    const destinations=skill?.kind==='jump'?E.jumpDestinations(s,a,skill):['revive','raise'].includes(skill?.kind)&&b?E.revivalDestinations(s,a,b,skill):skill?.kind==='carry'&&b?(coordinateInput(d.carryCell)?E.carryPlans(s,a,b,a.position,coordinateInput(d.carryCell)):[]):skill?.kind==='shove'&&b?E.forcedDestinations(s,a,b):[];
    const weapons=skill?.kind==='disarm'&&b?E.listWeapons(b).filter(w=>E.tacticalEffect(s,b,'disarmed')?.weapon!==w.id):[];
    if(skill?.kind==='carry'){const choice=carrySelection(s,a,b,d.carryCell,language,destinations,d.carrierCell);d.destination=choice.plan?choice.point.x+','+choice.point.y:'';allowed&&=Boolean(choice.plan);}
    const advanced=(skill?.kind==='carry'?carryDestinationMarkup(s,a,b,d.carryCell,language,'check',destinations,d.carrierCell):destinations.length?select(l('Zielfeld der Wirkung','Effect destination'),'destination',d.destination,[['',l('Erstes legales Feld','First legal cell')],...destinations.map(p=>[p.x+','+p.y,E.coordinate(p)+(p.carrier?' · '+a.name+' '+E.coordinate(p.carrier)+' · '+p.cost+l(' Bewegung',' movement'):'')])]):'')+(weapons.length?select(l('Zu entwaffnende Waffe','Weapon to disarm'),'weapon',d.weapon,[['',l('Bevorzugte Waffe','Preferred weapon')],...weapons.map(w=>[w.id,w.name])]):'');
    return '<section class="ct-check-panel"><label class="ct-field"><span>'+l('Beschreibe deine Probe','Describe your check')+'</span><textarea name="check-description" rows="3" maxlength="500">'+esc(d.description)+'</textarea></label><div class="ct-form-grid">'+
        select(l('Kostenart','Cost mode'),'mode',d.mode,[['paid',l('Aktion bezahlen','Pay an action')],['narrative',l('Kostenlose Erzählprobe · ohne Regelwirkung','Free narrative check · no mechanical effect')]])+
        (d.mode==='paid'?select(l('Aktion bezahlen mit','Pay action with'),'actionSource',d.actionSource,[['auto',l('Automatisch · passende Zusatzaktion zuerst','Automatic · matching extra first')],['normal',l('Normale Aktion','Normal action')],...eligible.map(p=>['bonus:'+p.id,p.name+' · '+p.remaining+'/'+p.total])]):'')+select(l('Attribut','Attribute'),'stat',d.stat,Object.entries(statLabels(language)))+field(l('Zusätzlicher Bonus','Additional bonus'),'bonus',d.bonus,'text','inputmode="decimal"')+
        select(l('Abwehrbasis','Defense basis'),'dcMode',d.dcMode,[['fixed',l('Fester DC','Fixed DC')],['target-dc',l('Profil-DC des Ziels','Target profile DC')],['best-physical',l('Basis + höherer Stärke-/Geschicklichkeitsbonus','Base + higher Strength/Dexterity bonus')],...Object.entries(statLabels(language)).map(([key,name])=>[key,l('Basis + ','Base + ')+name+' ('+l('Zielbonus','target bonus')+')'])])+field(l('Anpassung der Zielabwehr','Target defense adjustment'),'dcAdjustment',d.dcAdjustment,'text','inputmode="decimal"')+
        select(l('Schwierigkeit','Difficulty'),'difficulty',difficulty.some(([v])=>v===d.dc)?d.dc:'custom',difficulty)+field(l('Basis-DC (ohne Zielbonus)','Base DC (before target bonus)'),'dc',d.dc,'text','inputmode="decimal"'+(d.dcMode==='target-dc'?' disabled':''))+
        (own?'<p class="ct-self-ability">'+esc(l('Wirkt auf die eigene Figur: ','Applies to the acting participant: ')+a.name)+'</p>':select(selfContext?l('Bezugsfigur für Abwehr (Wirkung auf selbst)','Defense reference (effect on self)'):(skill?.mechanics??mechanics)?.target==='selected'?l('Zielfigur für die Wirkung','Effect target'):l('Ziel / Bezug (optional)','Target / context (optional)'),'target',d.target,[...(!skill?[['',mechanics?.target==='selected'?l('Wirkungsziel wählen','Choose effect recipient'):l('Kein Figurenbezug / siehe Beschreibung','None / see description')]]:[]),[a.id,l('Eigene Figur: ','Self: ')+a.name],...targets.filter(b=>b.id!==a.id).map(b=>[b.id,b.name])].filter(([id])=>!skill||targets.some(b=>b.id===id))))+(selfContext?'<p class="ct-self-ability">'+esc(l('Wirkt auf die eigene Figur: ','Applies to the acting participant: ')+a.name)+'</p>':'')+
        select(l('Wirkung bei Erfolg','Effect on success'),'effect',abilityGroups(a.skills).find(g=>g.skills.some(v=>v.id===d.effect))?.id??d.effect,[['',l('Keine Profilwirkung / eigene Wirkungen unten','No profile effect / custom effects below')],...abilityChoices(a.skills,language)],d.mode==='narrative'?'disabled':'')+(skill&&['acrobatics','jump'].includes(skill.kind)?select(l('Anwendung','Application'),'effectApplication',d.effect,(abilityGroups(a.skills).find(g=>g.skills.some(v=>v.id===d.effect))?.skills??[skill]).map(v=>[v.id,applicationLabel(v,language)]),d.mode==='narrative'?'disabled':''):'')+advanced+'</div>'+
        (d.mode==='paid'&&!skill?customEffectMarkup(d,language)+select(l('Vorrat / Mana / Ki (optional)','Stock / mana / ki (optional)'),'resource',d.resource,[['',l('Ohne Verbrauch','No consumption')],...a.resources.map(r=>[r.id,r.name+' · '+r.quantity])])+field(l('Kosten pro Versuch','Cost per attempt'),'cost',d.cost,'number','min="0" max="1000000"'):'')+'<p class="ct-muted">'+esc(defenseText(defense,language))+(defense.dc===null?' · '+l('Zielfigur auswählen.','Choose a target.'):'')+'</p>'+
        '<p class="ct-check-cost">'+(d.mode==='narrative'?l('Keine Aktion, kein Verbrauch und keine Regelwirkung.','No action, no consumption and no mechanical effect.'):
            (skill||mechanics?l('Kosten: normale oder Fähigkeiten-Zusatzaktion.','Cost: normal or ability extra action.'):l('Kosten: normale oder Eigene-Aktion-Zusatzaktion.','Cost: normal or custom-action extra.'))+(costError?' '+esc(costError):cost?.available===false?' '+l('Vorrat reicht nicht.','Insufficient stock.'):'')+(cost?.id?' '+l('Verbrauch auch bei Fehlschlag: ','Consumption even on failure: ')+cost.cost+' '+esc(cost.stock?.name??'')+'.':''))+'</p>'+
        (mechanicsError?'<p class="ct-warning" role="status">'+esc(mechanicsError)+'</p>':'')+(restriction?'<p class="ct-warning ct-ability-restriction" role="status">'+esc(restriction)+'</p>':'')+'<div class="ct-editor-help-links"><button type="button" class="ct-button" data-help-section="checks">'+l('Hilfe zur eigenen Probe','Own-check help')+'</button></div>'+
        '<button type="button" class="ct-button ct-primary ct-full" data-action="resolve-check" '+(!allowed||defense.dc===null||skill&&!targets.length?'disabled':'')+'>'+l('Eigene Probe auswürfeln','Roll own check')+'</button>'+(d.mode==='paid'&&!skill?'<button type="button" class="ct-button ct-full" data-action="save-check-ability">'+l('Als eigene Fähigkeit speichern','Save as custom ability')+'</button>':'')+'</section>';
}
