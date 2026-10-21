import { STATUS_TYPES, PERIODIC_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
export const DAMAGE_TYPES=Object.freeze({physical:{de:'Physisch',en:'Physical'},fire:{de:'Feuer',en:'Fire'},cold:{de:'Kälte',en:'Cold'},lightning:{de:'Blitz',en:'Lightning'},poison:{de:'Gift',en:'Poison'},acid:{de:'Säure',en:'Acid'},necrotic:{de:'Nekrotisch',en:'Necrotic'},radiant:{de:'Strahlend',en:'Radiant'},psychic:{de:'Psychisch',en:'Psychic'},force:{de:'Kraft',en:'Force'}});
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function damageType(value='physical'){check(typeof value==='string'&&Object.hasOwn(DAMAGE_TYPES,value),'Unbekannte Schadensart.');return value;}
export function periodicDamageType(effect){return damageType(effect.damageType??(Object.entries(PERIODIC_TYPES).find(([,status])=>status===effect.type)?.[0]??'physical'));}
export function traitsFrom(input={}){
 const list=(raw,keys,label)=>{check(Array.isArray(raw)&&raw.length<=keys.length&&raw.every(v=>typeof v==='string'&&keys.includes(v))&&new Set(raw).size===raw.length,label);return [...raw];};
 return {conditionImmunities:list(input.conditionImmunities??[],Object.keys(STATUS_TYPES),'Ungültige Zustandsimmunitäten.'),damageResistances:list(input.damageResistances??[],Object.keys(DAMAGE_TYPES),'Ungültige Schadensresistenzen.'),damageImmunities:list(input.damageImmunities??[],Object.keys(DAMAGE_TYPES),'Ungültige Schadensimmunitäten.')};
}
export function isImmune(actor,type){return Boolean(actor?.conditionImmunities?.includes(type));}
export function resistDamage(actor,amount,type='physical'){
 type=damageType(type);const beforeResistance=Math.max(0,Math.floor(amount)),resistancePercent=actor.damageImmunities?.includes(type)?0:actor.damageResistances?.includes(type)?50:100,damage=Math.floor(beforeResistance*resistancePercent/100);
 return {damageType:type,beforeResistance,resistancePercent,resistanceReduction:beforeResistance-damage,damage};
}
export function resistanceText(d,language='de'){
 const l=(de,en)=>language==='en'?en:de;return DAMAGE_TYPES[d.damageType??'physical'][language]+': '+d.beforeResistance+' × '+d.resistancePercent+'% = '+(d.beforeResistance-d.resistanceReduction)+l(' vor Schild/Block',' before shield/block')+(d.shieldReduction?' − '+d.shieldReduction+l(' Schild',' shield'):'')+(d.blockReduction?' − '+d.blockReduction+l(' Block',' block'):'')+(d.absorbed?l(' · absorbiert: 0 Schaden',' · absorbed: 0 damage'):' → '+d.damage+l(' Schaden',' damage'));
}
