import { currentActor, movementBudget, actionBudget, coordinate, conditionText, initiativeText, turnOverview } from './engine.js?v=2.0.0-beta.2-hotfix.2';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const active = (before, after) => before.phase === 'active' || after.phase === 'active';
const condition = a => [a.hp, a.maxHp, a.condition, a.roundsLeft, a.escaped, a.position, a.side, a.allegiance, a.raiseLocked, (a.effects ?? []).map(({ appliedTurn, ...v }) => v)];
function mechanics(s) {
    const { language, sharePositions, sideDefaults, ...rules } = s.rules;
    return { phase: s.phase, round: s.round, current: currentActor(s)?.id, order: s.order, rules,
        movement: [s.movement.actorId, s.movement.spent], action: s.rules.multiActionsEnabled ? [s.action.actorId, s.action.freeSpent ?? (s.action.used ? 1 : 0), s.action.bonusSpent ?? {}] : actionBudget(s).used,
        actors: s.actors.map(a => {
            const { portrait, notes, control, aiBehavior, effects,reactionTurn,shields,tactics,stanceTurn,sprintTurn,acrobaticsTurn,acrobaticsUsedTurn, ...values } = a;
            values.shields=(shields??[]).map(({appliedTurn,...v})=>v);
            values.tactics=(tactics??[]).map(({appliedTurn,...v})=>v);
            values.sprintActive=sprintTurn===s.turnSerial;
            values.acrobaticsActive=acrobaticsTurn===s.turnSerial;
            values.acrobaticsUsed=acrobaticsUsedTurn===s.turnSerial;
            values.effects = (effects ?? []).map(({ appliedTurn, ...v }) => v);
            return values;
        }) };
}
export function combatChanged(before, after) {
    if (active(before, after)) return !same(mechanics(before), mechanics(after));
    // Preparation stays quiet except for corrections to existing HP, conditions or positions.
    return before.actors.some(a => {
        const b = after.actors.find(v => v.id === a.id);
        return b && !same(condition(a), condition(b));
    });
}
export function correctionSummary(s, language = 'de', actors = s.actors) {
    const rows = actors.map(a => `${a.name}: ${a.hp}/${a.maxHp} HP, ${conditionText(a, language)}, ${coordinate(a.position, language)}.`+(a.allegiance||a.raiseLocked?(language==='en'?' Side: ':' Seite: ')+a.side+'.':''));
    for (const a of actors) if (a.resources?.length) rows.push(`${a.name}: ${a.resources.map(v => `${v.name} ${v.quantity}`).join(', ')}.`);
    if (s.phase === 'active') {
        const a = currentActor(s), movement = movementBudget(s, a), budget = actionBudget(s, a), used = budget.used;
        if (s.rules.multiActionsEnabled) rows.push(language === 'en' ? `Actions remaining: free ${budget.free.remaining}; ${budget.bonus.map(v => v.name + ' ' + v.remaining + ' (' + v.allowed.join(', ') + ')').join('; ')}.` : `Aktionen übrig: frei ${budget.free.remaining}; ${budget.bonus.map(v => v.name + ' ' + v.remaining + ' (' + v.allowed.join(', ') + ')').join('; ')}.`);
        rows.push(initiativeText(turnOverview(s), language));
        rows.push(language === 'en' ? `${a.name}: ${movement.remaining}/${movement.total} movement left; action ${used ? 'used' : 'available'}.`
            : `${a.name}: ${movement.remaining}/${movement.total} Bewegung übrig; Aktion ${used ? 'verbraucht' : 'verfügbar'}.`);
    }
    return rows.join('\n');
}
export function checksRevoked(before,after) {
    const remaining=new Set(after.log.map(e=>e.id));
    return before.log.some(e=>e.type==='check'&&e.chatRelevant!==false&&!remaining.has(e.id));
}
export function markChatEvents(before, after, events) {
    const changed = combatChanged(before, after), edits = events.filter(e => e.type === 'edit');
    for (const e of events) {
        e.chatRelevant = ['start', 'end', 'hit', 'miss', 'other', 'stabilize', 'flee', 'condition', 'time', 'turn', 'use', 'effect','skill','stance','remark','reset','restore','reaction','shield','reserve','check','presence','conceal','rescue'].includes(e.type)
            || e.type === 'move' && changed
            || e.type === 'edit' && e === edits.at(-1) && changed
            || e.type === 'undo' && (changed || checksRevoked(before,after))
            || e.type === 'import' && active(before, after) && changed;
        if (e.type === 'edit' && e.chatRelevant) {
            const actors = after.actors.filter(a => !same(a, before.actors.find(b => b.id === a.id)));
            const de = correctionSummary(after, 'de', actors), en = correctionSummary(after, 'en', actors);
            e.textDe = (e.textDe ?? e.text) + (de ? '\n' + de : '');
            e.textEn = (e.textEn ?? e.text) + (en ? '\n' + en : '');
            e.text = after.rules.language === 'en' ? e.textEn : e.textDe;
        }
    }
    return events;
}
