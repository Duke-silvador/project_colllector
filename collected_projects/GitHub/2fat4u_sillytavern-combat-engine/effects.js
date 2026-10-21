import { damageType, periodicDamageType } from './combat-traits.js?v=2.0.0-beta.2-hotfix.2';
import { unitCost } from './consumption.js?v=2.0.0-beta.2-hotfix.2';
// Optional resources and status data. All state changes and dice stay in the engine.
import { CLASSIC_STATUSES, STATUS_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
export const EFFECTS = CLASSIC_STATUSES;
function assert(ok, message) { if (!ok) throw new Error(message); }
function integer(v, min, max) {
    assert(v !== '' && v != null && typeof v !== 'boolean' && Number.isSafeInteger(Number(v)) && Number(v) >= min && Number(v) <= max, 'Ressourcen und Zustände: ungültige Zahl.');
    return Number(v);
}
export function amountFormula(value, parseDice) {
    const text = String(value ?? '0').trim() || '0';
    return /^\d+$/.test(text) ? String(integer(text, 0, 1000000)) : parseDice(text).formula;
}
export function effectsFrom(raw = [], parseDice, applied = false) {
    assert(Array.isArray(raw) && raw.length <= Object.keys(EFFECTS).length*10, 'Zustände: ungültige Liste.');
    const result = raw.map(v => {
        assert(v && Object.hasOwn(EFFECTS, v.type), 'Unbekannter Statuseffekt.');
        const d = EFFECTS[v.type];
        return { type: v.type,...(v.damageType!==undefined?{damageType:damageType(v.damageType)}:{}), turns: integer(v.turns ?? d.turns, 1, 100), damage: ['stunned', 'slowed'].includes(v.type) ? '0' : amountFormula(v.damage ?? d.damage, parseDice),
            ...(applied ? { appliedTurn: integer(v.appliedTurn ?? 0, 0, Number.MAX_SAFE_INTEGER) } : {}) };
    });
    assert(new Set(result.map(v => ['stunned','slowed'].includes(v.type)?v.type:[v.type,periodicDamageType(v)].join(':'))).size === result.length, 'Doppelter Statuseffekt.');
    return result;
}
export function resourcesFrom(raw = [], parseDice) {
    assert(Array.isArray(raw) && raw.length <= 100, 'Ressourcen: höchstens 100 Einträge.');
    const result = raw.map(v => {
        assert(v && typeof v === 'object' && !Array.isArray(v), 'Ressource: Objekt erforderlich.');
        const kind = v.kind ?? 'supply'; assert(['supply', 'ammo'].includes(kind), 'Ungültiger Ressourcentyp.');
        const id = String(v.id ?? globalThis.crypto.randomUUID()).trim().slice(0, 100), name = String(v.name ?? '').trim().slice(0, 100);
        assert(id && name, 'Ressourcenname fehlt.');
        const cures = v.cures ?? []; assert(Array.isArray(cures) && cures.every(k => Object.hasOwn(STATUS_TYPES, k)) && new Set(cures).size === cures.length, 'Ungültige Gegenmittel-Auswahl.');
        const consumption=v.consumption??'own';assert(['own','linked','none'].includes(consumption),'Ungültige Verbrauchsquelle.');
        const quantity=integer(v.quantity??1,0,1000000);
        const capacity=kind==='ammo'&&v.capacity!=null&&v.capacity!==''?integer(v.capacity,1,1000000):null;
        assert(capacity===null||quantity<=capacity,'Vorrat überschreitet das eingestellte Maximum.');
        const refill=v.refill==null?null:v.refill;
        assert(refill===null||kind==='supply'&&typeof refill==='object'&&!Array.isArray(refill),'Ungültiges Aufladeitem.');
        const refillProfile=refill?{stock:String(refill.stock??'').trim().slice(0,100),amount:integer(refill.amount,1,1000000)}:null;
        return { id, name, kind, cost:unitCost(v.cost===undefined?1:v.cost),consumption,stock:v.stock?String(v.stock).trim().slice(0,100):null,radius:integer(v.radius??0,0,10),falloff:v.falloff??'half',targets:v.targets??'all',quantity, heal: kind === 'ammo' ? '0' : amountFormula(v.heal, parseDice),
            range: integer(v.range ?? 1, 0, 100), cures: kind === 'ammo' ? [] : [...cures],capacity,refill:refillProfile };
    });
    assert(new Set(result.map(v => v.id)).size === result.length, 'Doppelte Ressourcen-ID.');
    for(const v of result){
        assert(['half','uniform'].includes(v.falloff)&&['all','allies'].includes(v.targets),'Ungültiges Heilflächenprofil.');
        if(v.consumption==='linked')assert(v.stock&&result.some(r=>r.id===v.stock&&r.kind==='ammo'),'Verknüpfter Heilvorrat fehlt.');
        if(v.refill){
            assert(v.refill.stock&&result.some(r=>r.id===v.refill.stock&&r.kind==='ammo'),'Aufzuladenden Mana-/Munitionsvorrat auswählen.');
            assert(v.heal==='0'&&!v.cures.length&&!v.radius&&v.range===0,'Aufladeitems wirken nur auf den eigenen Vorrat und haben keine Heilung oder Fläche.');
            assert(v.consumption!=='linked'||v.stock!==v.refill.stock,'Aufladeitem darf nicht den aufzuladenden Vorrat verbrauchen.');
        }
    }
    return result;
}
export function hasEffect(s, a, type) { return Boolean(s.rules.effectsEnabled && a?.effects?.some(v => v.type === type)); }
export function effectsText(a, language = 'de') { return (a.effects ?? []).map(v => `${EFFECTS[v.type][language]} (${v.turns})`).join(', '); }
export function resourcePreset(type, language = 'de') {
    const presets = {
        area:{de:'Wurf-Heiltrank',en:'Thrown healing potion',heal:'2d8+2',cures:[],radius:1,range:5},
        calming:{de:'Beruhigung',en:'Calming remedy',heal:'0',cures:['frightened','provoked']},
        focus:{de:'Fokus',en:'Focus remedy',heal:'0',cures:['distracted']},
        release:{de:'Befreiung',en:'Release remedy',heal:'0',cures:['rooted','disarmed']},
        healing: { de: 'Heilung', en: 'Healing', heal: '1d8+2', cures: [] },
        antidote: { de: 'Gegengift', en: 'Antidote', heal: '0', cures: ['poisoned'] },
        bandage: { de: 'Verband', en: 'Bandage', heal: '2', cures: ['bleeding'] },
        water: { de: 'Löschmittel', en: 'Extinguishing supply', heal: '0', cures: ['burning'] },
        recovery: { de: 'Erholung', en: 'Recovery', heal: '0', cures: ['stunned', 'slowed'] },
        ammo: { de: 'Munition / Ladungen / Mana', en: 'Ammo / charges / mana', heal: '0', cures: [], kind: 'ammo' },
        refill:{de:'Mana-/Munitionsnachschub',en:'Mana / ammo refill',heal:'0',cures:[],range:0,refill:{stock:null,amount:5}},
    };
    const p = presets[type]; assert(p, 'Unbekannte Ressourcenvorlage.');
    return { id: globalThis.crypto.randomUUID(), name: p[language], kind: p.kind ?? 'supply', quantity: type === 'ammo' ? 10 : 3, heal: p.heal,radius:p.radius??0,range:p.range??1,cures: [...p.cures],...(p.refill?{refill:{...p.refill}}:{}) };
}
