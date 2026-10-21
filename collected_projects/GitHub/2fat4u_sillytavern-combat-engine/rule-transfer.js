import { defaultRules, rulesFrom, clone } from './engine.js?v=2.0.0-beta.2-hotfix.2';
export const RULE_FILE_LIMIT=128*1024;
export function exportRules(s){const {language,...rules}=rulesFrom(s.rules);return {kind:'combat-rules',version:1,rules:clone(rules)};}
export function ruleFileFrom(raw){
    if(!raw||raw.kind!=='combat-rules'||raw.version!==1||!raw.rules||typeof raw.rules!=='object'||Array.isArray(raw.rules)||Object.keys(raw).some(k=>!['kind','version','rules'].includes(k)))throw Error('Invalid combat rules file');
    if(JSON.stringify(raw).length>RULE_FILE_LIMIT)throw Error('Rules file is too large');
    const keys=Object.keys(defaultRules()).filter(k=>k!=='language');
    if(Object.keys(raw.rules).some(k=>!keys.includes(k)))throw Error('Unknown rule in file');
    // Exported files contain a full recipe. Reject missing fields instead of
    // silently resetting the remaining rules to current defaults.
    if(keys.some(k=>!Object.hasOwn(raw.rules,k)))throw Error('Incomplete rules file');
    const {language,...rules}=rulesFrom(raw.rules);
    return {kind:'combat-rules',version:1,rules};
}
export function ruleChanges(current,raw){const valid=ruleFileFrom(raw);return Object.keys(valid.rules).filter(k=>JSON.stringify(current[k])!==JSON.stringify(valid.rules[k]));}
