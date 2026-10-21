// System notes remain visible in chat; ST's automatic TTS ignores this flag.
// Mechanical facts are supplied to the model by the authoritative state bridge.
export function silenceMechanicalNotes(chat) {
    let changed=false;
    for(const m of chat??[])if(m.name==='CombatEngine'&&!m.is_user&&m.extra?.deterministic_combat_v1?.mechanical&&!m.is_system){m.is_system=true;changed=true;}
    return changed;
}
