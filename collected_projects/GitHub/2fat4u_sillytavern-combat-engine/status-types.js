// Shared labels keep status editing, remedies and result text in agreement.
export const CLASSIC_STATUSES = Object.freeze({
    poisoned:{de:'Vergiftet',en:'Poisoned',damage:'1',turns:3},
    bleeding:{de:'Blutend',en:'Bleeding',damage:'2',turns:3},
    burning:{de:'Brennend',en:'Burning',damage:'2',turns:3},
    cold_damage:{de:'Anhaltende Kälte',en:'Ongoing cold',damage:'1',turns:3},
    lightning_damage:{de:'Anhaltender Blitzschaden',en:'Ongoing lightning',damage:'1',turns:3},
    acid_damage:{de:'Verätzt',en:'Corroding',damage:'1',turns:3},
    necrotic_damage:{de:'Nekrotischer Verfall',en:'Necrotic decay',damage:'1',turns:3},
    radiant_damage:{de:'Anhaltende Strahlung',en:'Ongoing radiant damage',damage:'1',turns:3},
    psychic_damage:{de:'Psychischer Schmerz',en:'Psychic pain',damage:'1',turns:3},
    force_damage:{de:'Anhaltende Kraftwirkung',en:'Ongoing force damage',damage:'1',turns:3},
    stunned:{de:'Betäubt',en:'Stunned',damage:'0',turns:1},
    slowed:{de:'Verlangsamt',en:'Slowed',damage:'0',turns:2},
});
export const PERIODIC_TYPES=Object.freeze({physical:'bleeding',fire:'burning',cold:'cold_damage',lightning:'lightning_damage',poison:'poisoned',acid:'acid_damage',necrotic:'necrotic_damage',radiant:'radiant_damage',psychic:'psychic_damage',force:'force_damage'});
export const PERIODIC_STATUSES=Object.freeze(Object.values(PERIODIC_TYPES));
export const TACTICS = Object.freeze({
    frightened:{de:'Eingeschüchtert',en:'Frightened',icon:'!'},provoked:{de:'Provoziert',en:'Provoked',icon:'⚑'},distracted:{de:'Abgelenkt',en:'Distracted',icon:'?'},aimed:{de:'Gezielt',en:'Aimed',icon:'◎'},supported:{de:'Unterstützt',en:'Supported',icon:'+'},rooted:{de:'Festgehalten',en:'Held',icon:'⛓'},disarmed:{de:'Entwaffnet',en:'Disarmed',icon:'⊘'},
});
export const STATUS_TYPES = Object.freeze({...CLASSIC_STATUSES,...TACTICS});
export function curableStatuses(s,a,cures=[]) {
    return [...(s.rules.effectsEnabled?a?.effects??[]:[]),...(s.rules.skillsEnabled?a?.tactics??[]:[])].filter(v=>cures.includes(v.type)).map(v=>v.type);
}
export function clearStatuses(a,types) {
    a.effects=(a.effects??[]).filter(v=>!types.includes(v.type));
    a.tactics=(a.tactics??[]).filter(v=>!types.includes(v.type));
}
