import { calculationDetails } from './calculation-details.js?v=2.0.0-beta.2-hotfix.2';
import { defenseText } from './skills.js?v=2.0.0-beta.2-hotfix.2';
import { mechanicsFrom, effectRange } from './custom-effects.js?v=2.0.0-beta.2-hotfix.2';
import { unitCost } from './consumption.js?v=2.0.0-beta.2-hotfix.2';
import { decimal, rounded } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
const require=(ok,message)=>{if(!ok)throw new Error(message);};
export function checkInput(intent,stats,skills) {
    require(typeof intent.description==='string'&&intent.description.trim().length>0&&intent.description.trim().length<=500,'Eigene Probe: Beschreibung mit 1 bis 500 Zeichen erforderlich.');
    require(typeof intent.stat==='string'&&Object.hasOwn(stats,intent.stat),'Eigene Probe: Attribut auswählen.');
    require(intent.free===undefined||typeof intent.free==='boolean','Eigene Probe: kostenlose Erzählprobe muss Boolean sein.');
    const actionSource=intent.actionSource??'auto';require(typeof actionSource==='string'&&(actionSource==='auto'||actionSource==='normal'||/^bonus:.+/.test(actionSource)),'Ungültige Aktionsquelle.');require(!intent.free||actionSource==='auto','Kostenlose Probe hat keine Aktionsquelle.');
    const effect=intent.effect??null;require(effect===null||typeof effect==='string'&&skills.some(s=>s.id===effect),'Eigene Probe: zugewiesene Fähigkeit für die Wirkung auswählen.');
    require(!intent.free||!effect,'Kostenlose Erzählproben erlauben keine Regelwirkung.');
    const mechanics=mechanicsFrom(intent.mechanics);require(!mechanics||!intent.free&&!effect,'Eigene Wirkungen nicht mit kostenloser Probe oder anderem Wirkungsprofil kombinieren.');require(intent.effectRange===undefined||mechanics,'Wirkungsreichweite nur mit eigenen Wirkungen.');
    const resource=intent.resource??null;require(resource===null||typeof resource==='string'&&resource.length>0&&resource.length<=100,'Eigene Probe: ungültiger Vorrat.');
    require(!resource||!effect&&!intent.free,'Direkte Kosten nur für bezahlte Proben ohne verknüpfte Wirkung.');
    const dcMode=intent.dcMode??'fixed';require(['fixed','target-dc','best-physical',...Object.keys(stats)].includes(dcMode),'Ungültige Probenabwehr.');
    return {mechanics,effectRange:mechanics?effectRange(intent.effectRange):5,resource,cost:unitCost(intent.cost??1),dcMode,...(intent.dcBase!==undefined?{dcBase:decimal(intent.dcBase,0,100,'Basis-DC')}:{}),dcAdjustment:decimal(intent.dcAdjustment??0,-100,100,'Abwehranpassung'),description:intent.description.trim(),stat:intent.stat,bonus:decimal(intent.bonus??0,-100,100,'Probenbonus'),dc:decimal(intent.dc,0,100,'Proben-DC'),free:intent.free??false,effect,actionSource};
}
export function checkOutcome(rules,natural,ability,bonus,dc) {
    const total=rounded(natural+ability+bonus),critical=Boolean(rules.natural20&&natural===20);
    let success=rules.hitEqual?total>=dc:total>dc;
    if(rules.natural20&&[1,20].includes(natural))success=natural===20;
    return {natural,ability,bonus,total,dc,critical,criticalFailure:Boolean(rules.natural20&&natural===1),success};
}
export function checkText(r,language='de') {
    const en=language==='en',signed=n=>n>=0?'+'+n:String(n);
    return r.actorName+(r.target&&r.target!==r.actor?' → '+r.targetName:'')+': '+r.description+'\n'+
        (en?'Own check: ':'Eigene Probe: ')+(r.success?(en?'SUCCESS':'ERFOLG'):(en?'FAILED':'FEHLSCHLAG'))+(r.critical?(en?' · natural 20':' · natürliche 20'):'')+(r.criticalFailure?(en?' · CRITICAL FAILURE (natural 1)':' · KRITISCHER MISSERFOLG (natürliche 1)'):'')+
        ' · '+(en?'d20 ':'W20 ')+r.natural+' '+signed(r.ability)+' '+signed(r.bonus)+' = '+r.total+' / DC '+r.dc+' ('+(statLabels(language)[r.stat]??r.stat)+').\n'+
        (r.defense&&r.defense.mode!=='fixed'?(en?'Defense: ':'Abwehr: ')+defenseText(r.defense,language)+'.\n':'')+
        (r.free?(en?'Free narrative check; no mechanical effect.': 'Kostenlose Erzählprobe; keine Regelwirkung.'):
            r.custom?r.outcome[en?'en':'de']:r.effectName?(en?'Effect profile: ':'Wirkungsprofil: ')+r.effectName+'. '+r.outcome[en?'en':'de']:(en?'No additional mechanical effect.':'Keine zusätzliche Regelwirkung.'))+
        calculationDetails(r,language)+(r.resource?'\n'+r.resource.name+': −'+r.resource.cost+'; '+r.resource.quantity+(en?' remaining.':' übrig.'):'');
}
