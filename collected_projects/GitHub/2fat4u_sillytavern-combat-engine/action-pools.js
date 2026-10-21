import { hasEffect } from './effects.js?v=2.0.0-beta.2-hotfix.2';
export const ACTION_KINDS = Object.freeze({refill:{de:'Vorrat auffüllen',en:'Refill stock'},shield:{de:'Schutz aktivieren',en:'Activate protection'},reserve:{de:'Reaktion reservieren',en:'Reserve reaction'}, skill: { de:'Fähigkeiten', en:'Abilities' }, attack: { de: 'Angreifen', en: 'Attack' }, use: { de: 'Heilung / Gegenmittel', en: 'Healing / remedy' }, stabilize: { de: 'Stabilisieren', en: 'Stabilize' }, other: { de: 'Eigene Aktion', en: 'Custom action' }, flee: { de: 'Fliehen', en: 'Flee' } });
function require(ok, message) { if (!ok) throw new Error(message); }
function count(value, min, max) { require(value !== '' && value != null && typeof value !== 'boolean' && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max, 'Aktionsbudget: ungültige Zahl.'); return Number(value); }
export function actionConfig(input) {
    const actionsPerTurn = count(input.actionsPerTurn ?? 1, 1, 20), raw = input.bonusActions ?? [];
    require(Array.isArray(raw) && raw.length <= 10, 'Höchstens 10 Zusatzaktionsgruppen.');
    const bonusActions = raw.map(v => {
        require(v && typeof v === 'object' && !Array.isArray(v), 'Ungültige Zusatzaktion.');
        const id = String(v.id ?? globalThis.crypto.randomUUID()).trim().slice(0, 100), allowed = v.allowed ?? [];
        require(id && Array.isArray(allowed) && allowed.length && allowed.every(k => Object.hasOwn(ACTION_KINDS, k)) && new Set(allowed).size === allowed.length, 'Zusatzaktion: erlaubte Aktionen auswählen.');
        require(!['__proto__', 'constructor', 'prototype'].includes(id), 'Ungültige Zusatzaktions-ID.');
        return { id, name: String(v.name ?? '').trim().slice(0, 100), count: count(v.count ?? 1, 1, 20), allowed: [...allowed] };
    });
    require(new Set(bonusActions.map(v => v.id)).size === bonusActions.length, 'Doppelte Zusatzaktions-ID.');
    return { actionsPerTurn, bonusActions };
}
export function actionState(raw, serial) {
    const freeSpent = count(raw?.freeSpent ?? (raw?.used ? 1 : 0), 0, 1000000), bonusSpent = {};
    require(raw?.bonusSpent === undefined || raw.bonusSpent && typeof raw.bonusSpent === 'object' && !Array.isArray(raw.bonusSpent), 'Ungültiger Zusatzaktionsverbrauch.');
    for (const [id, value] of Object.entries(raw?.bonusSpent ?? {})) { require(id.length > 0 && id.length <= 100, 'Ungültiger Zusatzaktionsverbrauch.'); Object.defineProperty(bonusSpent, id, { value: count(value, 0, 1000000), enumerable: true, writable: true, configurable: true }); }
    return { turnSerial: raw?.turnSerial ?? serial, actorId: raw?.actorId ?? '', used: raw?.used ?? false, freeSpent, bonusSpent };
}
export function poolBudget(s, a) {
    const configured = s.rules.multiActionsEnabled, sameTurn = a && s.phase === 'active' && s.action?.turnSerial === s.turnSerial && s.action.actorId === a.id;
    const spent = sameTurn ? s.action.freeSpent ?? (s.action.used ? 1 : 0) : 0;
    const free = { total: configured ? a?.actionsPerTurn ?? 1 : 1, spent, remaining: 0 }; free.remaining = Math.max(0, free.total - spent);
    const bonus = configured && a ? (a.bonusActions ?? []).map(v => ({ ...v, total: v.count, spent: sameTurn ? s.action.bonusSpent?.[v.id] ?? 0 : 0, remaining: Math.max(0, v.count - (sameTurn ? s.action.bonusSpent?.[v.id] ?? 0 : 0)) })) : [];
    const remaining = free.remaining + bonus.reduce((n, v) => n + v.remaining, 0);
    const active = Boolean(a && s.phase === 'active' && s.order[s.turn] === a.id && a.hp > 0 && !a.escaped && !a.reserve && !a.hanging && !hasEffect(s, a, 'stunned'));
    const allowed = active ? Object.keys(ACTION_KINDS).filter(k => free.remaining || bonus.some(v => v.remaining && v.allowed.includes(k))) : [];
    return { used: Boolean(sameTurn && remaining === 0), available: active && remaining > 0, free, bonus, remaining, spent: spent + bonus.reduce((n, v) => n + v.spent, 0), allowed };
}
export function canSpendAction(s, a, kind) { return poolBudget(s, a).allowed.includes(kind); }
export function spendAction(s, a, kind, source='auto') {
    const budget = poolBudget(s, a); require(budget.allowed.includes(kind), budget.available ? 'Verbleibende Zusatzaktionen erlauben diese Aktion nicht.' : 'Aktion bereits verbraucht. Verbleibende Bewegung nutzen oder den Zug beenden.');
    const state = s.action?.turnSerial === s.turnSerial && s.action.actorId === a.id ? actionState(s.action, s.turnSerial) : actionState({ actorId: a.id }, s.turnSerial);
    require(typeof source==='string'&&(source==='auto'||source==='normal'||source.startsWith('bonus:')),'Ungültige Aktionsquelle.');
    if(source==='normal')require(budget.free.remaining>0,'Keine normale Aktion übrig.');
    if(source.startsWith('bonus:'))require(budget.bonus.some(v=>v.id===source.slice(6)&&v.remaining>0&&v.allowed.includes(kind)),'Ausgewählte Zusatzaktion nicht nutzbar.');
    const pool = source==='normal'?null:source.startsWith('bonus:')?budget.bonus.find(v=>v.id===source.slice(6)):budget.bonus.filter(v => v.remaining && v.allowed.includes(kind)).sort((a, b) => a.allowed.length - b.allowed.length)[0];
    if (pool) Object.defineProperty(state.bonusSpent, pool.id, { value: (state.bonusSpent[pool.id] ?? 0) + 1, enumerable: true, configurable: true, writable: true });
    else state.freeSpent++;
    s.action = state; s.action.used = poolBudget(s, a).remaining === 0;
    return { kind: pool ? 'bonus' : 'free', id: pool?.id ?? null,name:pool?.name??null };
}

export function reservePool(s,a) {const b=poolBudget(s,a);if(a.reactionCost==='normal'){require(b.free.remaining>0,'Keine normale Aktion zum Reservieren übrig.');const state=s.action.actorId===a.id?actionState(s.action,s.turnSerial):actionState({actorId:a.id},s.turnSerial);state.freeSpent++;s.action=state;}else {require(b.bonus.some(v=>v.remaining&&v.allowed.includes('reserve')),'Keine passende Zusatzaktion zum Reservieren übrig.');spendAction(s,a,'reserve');}s.action.used=poolBudget(s,a).remaining===0;return {kind:a.reactionCost};}
