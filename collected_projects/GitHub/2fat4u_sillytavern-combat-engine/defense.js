import { resistDamage } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { reactionFieldsFrom } from './reaction-budget.js?v=2.0.0-beta.2-hotfix.2';
import { decimal } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
import { unitCost } from './consumption.js?v=2.0.0-beta.2-hotfix.2';
const check=(v,m)=>{if(!v)throw new Error(m);};
const integer=(v,min,max)=>{const n=Number(v);check(v!==''&&v!=null&&typeof v!=='boolean'&&Number.isSafeInteger(n)&&n>=min&&n<=max,'Ungültiger Schutzwert.');return n;};
export function defenseFrom(input,resources) {
    const shieldProfiles=input.shieldProfiles??[];check(Array.isArray(shieldProfiles)&&shieldProfiles.length<=30,'Höchstens 30 Schutzprofile.');
    const profiles=shieldProfiles.map(v=>{check(v&&['dc','reduce','absorb'].includes(v.kind),'Ungültiges Schutzprofil.');const id=String(v.id??crypto.randomUUID()).trim().slice(0,100),name=String(v.name??'Shield').trim().slice(0,100),resource=v.resource||null;check(id&&name,'Schutzname fehlt.');check(!resource||resources.some(r=>r.id===resource&&r.kind==='ammo'),'Schutzvorrat fehlt.');for(const k of ['attackLock','ai'])check(v[k]===undefined||typeof v[k]==='boolean','Ungültige Schutzoption.');return {id,name,kind:v.kind,amount:decimal(v.amount??2,0,1000000,'Schutzbonus'),turns:integer(v.turns??1,1,100),resource,cost:unitCost(v.cost===undefined?1:v.cost),attackLock:v.attackLock??false,ai:v.ai??true};});
    check(new Set(profiles.map(v=>v.id)).size===profiles.length,'Doppeltes Schutzprofil.');
    const choices=input.reactionChoices??[];check(Array.isArray(choices)&&choices.every(k=>['block','counter','shield','narrative'].includes(k))&&new Set(choices).size===choices.length,'Ungültige Reaktionsauswahl.');
    const control=input.reactionControl??'inherit',cost=input.reactionCost??'extra';check(['inherit','manual','auto','off'].includes(control)&&['extra','normal','bonus'].includes(cost),'Ungültige Reaktionssteuerung.');
    const raw=input.shields??[];check(Array.isArray(raw)&&raw.length<=30,'Ungültige aktive Schilde.');
    const shields=raw.map(v=>{check(profiles.some(p=>p.id===v.profile),'Aktives Schutzprofil fehlt.');return {profile:v.profile,turns:integer(v.turns,1,100),charges:integer(v.charges??1,1,100),appliedTurn:integer(v.appliedTurn??0,0,Number.MAX_SAFE_INTEGER)};});check(new Set(shields.map(v=>v.profile)).size===shields.length,'Doppelter aktiver Schild.');
    for(const k of ['reactionUsed','reactionReserve'])check(input[k]===undefined||typeof input[k]==='boolean','Ungültiger Reaktionsverbrauch.');
    return {...reactionFieldsFrom(input),shieldProfiles:profiles,shields,reactionChoices:[...choices],reactionControl:control,reactionCost:cost,reactionUsed:input.reactionUsed??false,reactionReserve:input.reactionReserve??false,reactionTurn:integer(input.reactionTurn??-1,-1,Number.MAX_SAFE_INTEGER)};
}
export function protection(s,a) {
    const active=s.rules.shieldsEnabled?(a.shields??[]).map(v=>({...a.shieldProfiles.find(p=>p.id===v.profile),active:v})):[];
    return {dc:Math.max(0,...active.filter(v=>v.kind==='dc').map(v=>v.amount)),reduce:Math.max(0,...active.filter(v=>v.kind==='reduce').map(v=>v.amount)),absorb:active.find(v=>v.kind==='absorb'),attackLock:active.some(v=>v.attackLock),active};
}
export function protectDamage(s,a,damage,block=0,type='physical') {
    const resistance=resistDamage(a,damage,type);damage=resistance.damage;
    const p=protection(s,a),after=Math.max(0,Math.floor(damage-p.reduce-block));let absorbed=false;
    if(after>0&&p.absorb){p.absorb.active.charges--;a.shields=a.shields.filter(v=>v.charges>0);absorbed=true;}
    return {...resistance,damage:absorbed?0:after,shieldReduction:Math.min(damage,p.reduce),blockReduction:Math.min(Math.max(0,damage-p.reduce),block),absorbed,shieldName:absorbed?p.absorb.name:null};
}
export function tickShields(s,a,outside=false) {if(!s.rules.shieldsEnabled||!a)return;a.shields=(a.shields??[]).filter(v=>{if(outside||v.appliedTurn!==s.turnSerial)v.turns--;return v.turns>0;});}
