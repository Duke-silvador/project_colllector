// Read-only roster extraction. Nothing here imports participants or changes combat.
import { parseRosterBlock } from './engine.js?v=2.0.0-beta.2-hotfix.2';

export function rosterSource(chat) {
    const entries = chat.map((m, index) => ({ m, index })).filter(({ m }) => !m.is_system && !m.extra?.deterministic_combat_v1?.mechanical);
    const recent = entries.slice(-30), recentIds = new Set(recent.map(e => e.index));
    const statLines = /\b(?:HP|DC|AC|DEF|Armor|Hit points|Strength|Dexterity|Constitution|STR|DEX|CON|INT|CHA|PER|Melee|Ranged|Range|Nahkampf|Fernkampf|Trefferbonus|Schaden|Schadenswürfel|attack_mod|damage|maxHp|stats)\b|\b\d{1,2}[dw](?:4|6|8|10|12|20|100)\b|combat-roster/i;
    const excerpt = value => {
        const lines = String(value).split('\n'), selected = new Set();
        for (let i = 0; i < lines.length; i++) if (statLines.test(lines[i])) {
            for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 2); j++) selected.add(j);
        }
        // Long flavor paragraphs near stat blocks must not displace later weapon lines.
        return [...selected].sort((a, b) => a - b).map(i => statLines.test(lines[i]) ? lines[i] : lines[i].slice(0, 100)).join('\n');
    };
    let remaining = 16000;
    const earlier = [];
    for (const entry of entries.slice().reverse()) {
        if (recentIds.has(entry.index) || !statLines.test(String(entry.m.mes))) continue;
        const selectedText = excerpt(entry.m.mes).slice(0, Math.min(4000, remaining));
        if (!selectedText) break;
        earlier.push({ ...entry, text: selectedText }); remaining -= selectedText.length;
        if (!remaining) break;
    }
    return [...earlier.reverse(), ...recent].map(({ m, index, text }) => {
        const full = String(m.mes), stats = full.length > 1200 ? excerpt(full) : '';
        const recentText = stats ? full.slice(0, 200) + '\n…\n' + stats.slice(0, 990) : full.slice(0, 1200);
        return { message: index, name: m.name, user: Boolean(m.is_user), text: text ?? recentText };
    });
}

export function parseRosterResponse(message, statMode = 'scores', language = 'de') {
    const source = String(message).trim();
    if (/```combat-roster\s*\n/i.test(source)) return parseRosterBlock(source, statMode, language);
    // Accept relaxed formatting only from an explicit extraction request, never chat actions.
    const fenced = [...source.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)];
    if (fenced.length > 1) throw new Error('Nur ein combat-roster-Block pro Nachricht.');
    let raw;
    try { raw = JSON.parse(fenced.length === 1 ? fenced[0][1] : source); }
    catch { throw new Error(language === 'en' ? 'Roster extraction returned no readable JSON list. Try again or enter participants manually.' : 'Beim Einlesen kam keine lesbare JSON-Liste zurück. Erneut versuchen oder Figuren manuell anlegen.'); }
    if (!Array.isArray(raw)) throw new Error('combat-roster muss eine Liste von Figuren sein.');
    return parseRosterBlock('```combat-roster\n' + JSON.stringify(raw) + '\n```', statMode, language);
}
