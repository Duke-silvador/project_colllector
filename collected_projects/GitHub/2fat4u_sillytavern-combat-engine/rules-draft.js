import { STATUS_TYPES, PERIODIC_STATUSES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
import { readEffectRules } from './effect-rules-ui.js?v=2.0.0-beta.2-hotfix.2';
const VISION_CHECKS=['visionEnabled','visionPerception','hideUnseenEnemies'];
const NEW_CHECKS=['autoRemoveDead','stealthEnabled','hideNeedsTerrain','ambushStacksCritical','coverDistanceEnabled','shotRiskEnabled','friendlyFireArea'];
const NEW_VALUES=['visionBase','reactionsPerTurn','joinInitiative','joinTiming','hiddenDamageMultiplier','coverFarPercent','shotRiskPenalty','pitRescueRounds'];
export const RULE_CHECKS = [...VISION_CHECKS,...NEW_CHECKS,'passAllies','hitEqual','damageAbility','natural20','boardEnabled','sharePositions','coverWalkable','coverCrossable','constitutionHp','splitMovement','resourcesEnabled','effectsEnabled','multiActionsEnabled','heightsEnabled','skillsEnabled','stancesEnabled','perceptionRange','reactionsEnabled','shieldsEnabled'];
const formValues = ['criticalDamage','statMode','rngMode','seed','movementBase','movementStat','deathRounds','coverPercent','highAttackBonus','highDefenseBonus','climbCost','reactionBlock'];
const values = [...NEW_VALUES,...formValues,'offensiveAttack','offensiveDefense','defensiveAttack','defensiveDefense','aimBonus','supportBonus','distractBonus','poisonPenalty','slowedPercent'];
const durations = Object.keys(STATUS_TYPES);
const damage = PERIODIC_STATUSES;
function path(name) {
    if (RULE_CHECKS.includes(name) || values.includes(name)) return [name];
    if (name.startsWith('effectDuration-') && durations.includes(name.slice(15))) return ['effectDurationOverrides',name.slice(15)];
    if (name.startsWith('effectDamage-') && damage.includes(name.slice(13))) return ['effectDamageOverrides',name.slice(13)];
    return null;
}
export function readRuleForm(data) {
    return { ...Object.fromEntries(RULE_CHECKS.filter(k=>VISION_CHECKS.includes(k)?data.has('rulesVision'):!NEW_CHECKS.includes(k)||data.has('rules199')).map(k => [k,data.has(k)])),
        ...Object.fromEntries(formValues.map(k => [k,data.get(k)])), ...readEffectRules(data),...Object.fromEntries(NEW_VALUES.filter(k=>data.has(k)).map(k=>[k,data.get(k)])) };
}
// Raw drafts belong to their chat. Combat state changes only through controller.rules.
export function createRulesDrafts() {
    const chats = new Map();
    function stage(key, rules, name, value) {
        const p = path(name); if (!p) return false;
        const original = p.length === 2 ? rules[p[0]]?.[p[1]] ?? '' : rules[name];
        const raw = RULE_CHECKS.includes(name) ? Boolean(value) : String(value ?? '');
        const edits = chats.get(key) ?? new Map();
        if (String(original) === String(raw)) edits.delete(name); else edits.set(name,raw);
        if (edits.size) chats.set(key,edits); else chats.delete(key);
        return true;
    }
    function patch(key, rules) {
        const result = {};
        for (const [name,value] of chats.get(key) ?? []) {
            const p = path(name);
            if (p.length === 1) result[name] = value;
            else (result[p[0]] ??= { ...rules[p[0]] })[p[1]] = value.trim() || null;
        }
        return result;
    }
    return { stage, patch,
        view: (key,rules) => ({ ...rules,...patch(key,rules) }),
        dirty: key => Boolean(chats.get(key)?.size),
        discard: key => chats.delete(key),
        stageForm(key,rules,data) {
            const input = readRuleForm(data);
            for (const [name,value] of Object.entries(input)) {
                if (['effectDurationOverrides','effectDamageOverrides'].includes(name)) {
                    const prefix = name === 'effectDurationOverrides' ? 'effectDuration-' : 'effectDamage-';
                    for (const [kind,amount] of Object.entries(value)) stage(key,rules,prefix+kind,amount);
                } else stage(key,rules,name,value);
            }
        }
    };
}
