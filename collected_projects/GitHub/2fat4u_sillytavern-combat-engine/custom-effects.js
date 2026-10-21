import { DAMAGE_TYPES, damageType, resistanceText } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { parseDice } from './dice.js?v=2.0.0-beta.2-hotfix.2';
import { decimal } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
import { STATUS_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
const require=(ok,message)=>{if(!ok)throw Error(message);};
const object=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
export function effectRange(value=5){const n=Number(value);require(value!==''&&value!=null&&typeof value!=='boolean'&&Number.isSafeInteger(n)&&n>=0&&n<=100,'Wirkungsreichweite: ganze Zahl 0 bis 100.');return n;}
export function mechanicsFrom(raw){
    if(raw==null)return null;
    require(object(raw,['target','damage','healing','status']),'Ungültige eigene Wirkungen.');
    const target=raw.target??'self';require(['self','selected'].includes(target),'Wirkungsziel: eigene oder gewählte Figur.');
    const dice=(v,typed=false)=>{if(v==null)return null;require(object(v,['dice','bonus',...(typed?['type']:[])])&&typeof v.dice==='string','Wirkung: Würfelformel erforderlich.');return {...(typed&&v.type!==undefined?{type:damageType(v.type)}:{}),dice:parseDice(v.dice).formula,bonus:decimal(v.bonus??0,-1000000,1000000,'Wirkungsbonus')};};
    const damage=dice(raw.damage,true),healing=dice(raw.healing);let status=null;
    if(raw.status!=null){const v=raw.status;require(object(v,['mode','type','turns'])&&['apply','remove'].includes(v.mode)&&Object.hasOwn(STATUS_TYPES,v.type),'Ungültige Zustandswirkung.');const turns=v.mode==='apply'?Number(v.turns??1):1;require(v.mode!=='apply'||v.turns!==''&&typeof v.turns!=='boolean'&&Number.isSafeInteger(turns)&&turns>=1&&turns<=100,'Zustandsdauer: ganze Zahl 1 bis 100.');status={mode:v.mode,type:v.type,...(v.mode==='apply'?{turns}:{})};}
    return damage||healing||status?{target,damage,healing,status}:null;
}
export function mechanicsText(v,language='de'){
    if(!v)return language==='en'?'Narrative only; apply agreed effects manually.':'Rein erzählerisch; vereinbarte Wirkung manuell ausspielen.';
    const l=(de,en)=>language==='en'?en:de,parts=[v.target==='self'?l('Wirkung auf eigene Figur','Effect on self'):l('Wirkung auf gewählte Figur (selbst oder andere)','Effect on selected participant (self or another)')],amount=p=>p.dice+(p.bonus?(p.bonus>0?'+':'')+p.bonus:'');
    if(v.damage)parts.push(l('Schaden ','Damage ')+amount(v.damage)+(v.damage.type?' ('+DAMAGE_TYPES[v.damage.type][language]+')':''));if(v.healing)parts.push(l('Heilung ','Healing ')+amount(v.healing));
    if(v.status)parts.push((v.status.mode==='remove'?l('Entfernen: ','Remove: '):l('Verursachen: ','Apply: '))+STATUS_TYPES[v.status.type][language]+(v.status.mode==='apply'?' · '+v.status.turns+l(' eigene Zielzüge',' target turns'):''));
    return parts.join(' · ');
}
export function customOutcomeText(r,language='de'){
    const l=(de,en)=>language==='en'?en:de;
    if(!r.success)return l('Keine gewählte Wirkung angewendet.','No selected effect applied.');
    const parts=[r.targetName+': '+r.beforeHp+' → '+r.afterHp+'/'+r.maxHp+' HP.'],formula=v=>v.formula+(v.bonus?(v.bonus>0?' +':' ')+v.bonus:'');
    if(r.damage)parts.push(l('Schaden ','Damage ')+r.damage.applied+' ('+formula(r.damage)+', '+(r.damage.maximized?l('maximiert ','maximized '):l('gewürfelt ','rolled '))+r.damage.rolls.join('+')+l('; vor Schutz ','; before protection ')+r.damage.raw+').'+(r.damage.resistancePercent!==100?' '+resistanceText(r.damage,language)+'.':'')+(r.damage.absorbed?' '+l('Schild absorbiert den Schaden.','Shield absorbs the damage.'):'')+(r.damage.shieldReduction?' '+l('Schildreduktion ','Shield reduction ')+r.damage.shieldReduction+'.':''));
    if(r.healing)parts.push(l('Heilung ','Healing ')+r.healing.applied+' ('+formula(r.healing)+', '+l('gewürfelt ','rolled ')+r.healing.rolls.join('+')+').');
    if(r.status){const label=STATUS_TYPES[r.status.type][language];parts.push(r.status.immune?label+': '+l('Immunität verhindert die Anwendung.','Immunity prevented application.'):r.status.skipped?label+': '+l('nicht angewendet, Ziel handlungsunfähig.','not applied; target incapacitated.'):r.status.mode==='remove'?label+': '+(r.status.changed?l('entfernt.','removed.'):l('war nicht vorhanden.','was not present.')):label+': '+r.status.turns+l(' eigene Zielzüge.',' target own turns.'));}
    return parts.join(' ');
}
