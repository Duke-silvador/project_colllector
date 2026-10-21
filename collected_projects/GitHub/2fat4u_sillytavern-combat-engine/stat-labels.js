export function statLabels(language = 'de') {
    return language === 'en' ? { strength:'Strength', dexterity:'Dexterity', constitution:'Constitution', intelligence:'Intelligence', charisma:'Charisma', perception:'Perception' } : { strength:'Stärke', dexterity:'Geschicklichkeit', constitution:'Konstitution', intelligence:'Intelligenz', charisma:'Charisma', perception:'Wahrnehmung' };
}
