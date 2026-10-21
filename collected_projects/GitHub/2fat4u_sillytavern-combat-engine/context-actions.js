import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { abilityGroups, SKILLS } from './skills.js?v=2.0.0-beta.2-hotfix.2';
export function contextActions(s,targetId,language='de') {
    const l=(de,en)=>language==='en'?en:de,a=E.currentActor(s),b=s.actors.find(v=>v.id===targetId),out=[];
    if(!a||s.phase!=='active'||!b)return out;
    const gate=kind=>!E.canManualAction(s,a,kind)?l('Keine passende Aktion übrig oder Figur kampfunfähig','No matching action remaining or actor incapacitated'):'';
    function location(from,to,range,melee=false){if(!s.rules.boardEnabled)return '';if(!from||!to)return l('Figur noch nicht platziert','Participant not placed');if(melee&&!E.adjacentAccess(s,from,to))return l('Benachbart auf erreichbarer Höhe nötig','Requires adjacency on an accessible level');if(E.distance(from,to)>range)return l('Außer Reichweite','Out of range');if(!E.clearSight(s,from,to))return l('Keine Sichtlinie','No line of sight');return '';}
    for(const w of E.listWeapons(a))for(const variant of w.standard?['profile','standard']:['profile']){
        const v=E.weaponFor(a,w.mode,variant,w.id);let reason=gate('attack');
        reason ||= !E.isCombatant(b)?l('Ziel kampfunfähig oder geflohen','Target incapacitated or escaped'): (a.side==='enemy')===(b.side==='enemy')?l('Angriff braucht ein gegnerisches Ziel','Attack requires an enemy target'):'';
        reason ||= !E.canPay(s,a,v)?l('Vorrat aufgebraucht','Stock depleted'):'';
        reason ||= location(a.position,b.position,E.effectiveRange(s,a,v),w.mode==='melee');
        reason ||= E.canAttack(s,a,b,w.mode,a.position,variant,w.id)?'':l('Zustand oder Zielvorgabe verhindert Angriff','Condition or target restriction prevents attack');
        out.push({group:l('Angriffe','Attacks'),kind:'attack',weapon:w.id,variant,mode:w.mode,target:b.id,label:w.name+(variant==='standard'?l(' · Standard',' · Standard'):''),reason});
    }
    for(const group of abilityGroups(a.skills)){const skill=group.skills.find(k=>E.canUseSkill(s,a,SKILLS[k.kind].target==='self'?a:b,k))??group.skills[0];const t=SKILLS[skill.kind].target==='self'?a:b;let reason=!s.rules.skillsEnabled?l('Fähigkeiten ausgeschaltet','Abilities disabled'):gate('skill');reason ||= E.canUseSkill(s,a,t,skill)?'':l('Ziel, Reichweite, Zustand oder Vorrat ungeeignet','Invalid target, range, condition or stock');out.push({group:l('Fähigkeiten','Abilities'),kind:'skill',skill:skill.id,target:t.id,label:group.acrobatics?l('Akrobatik','Acrobatics'):skill.name,reason});}
    for(const item of a.resources.filter(v=>v.kind==='supply')){
        const recipient=item.refill?a:b;let reason=!s.rules.resourcesEnabled?l('Ressourcen ausgeschaltet','Resources disabled'):gate(item.refill?'refill':'use');
        reason ||= E.canUseResource(s,a,recipient,item)?'':l('Ziel, Reichweite oder Vorrat ungeeignet','Invalid target, range or stock');
        const needs=item.refill?E.refillAmount(a,item)>0:item.radius>0&&E.healingTargets(s,a,item,b.position).some(v=>v.needsHealing||v.cures.length)||item.heal!=='0'&&b.hp<b.maxHp||E.curableStatuses(s,b,item.cures).length;
        reason ||= needs?'':item.refill?l('Vorrat bereits voll','Stock already full'):l('Kein Behandlungsbedarf','No treatment needed');
        out.push({group:item.refill?l('Vorräte','Stocks'):l('Behandlung','Treatment'),kind:item.refill?'refill':'heal',resource:item.id,target:recipient.id,label:item.name,reason});
    }
    if(s.rules.shieldsEnabled)for(const p of a.shieldProfiles)out.push({group:l('Schutz','Protection'),kind:'shield',profile:p.id,target:a.id,label:p.name,reason:gate('shield')||(E.canActivateShield(s,a,p)?'':l('Schutz bereits aktiv oder Vorrat zu gering','Shield already active or insufficient stock'))});
    if(s.rules.reactionsEnabled&&a.reactionCost!=='extra')out.push({group:l('Schutz','Protection'),kind:'reserve',target:a.id,label:l('Reaktion reservieren','Reserve reaction'),reason:E.canReserveReaction(s,a)?'':l('Keine nutzbare Reaktion oder passende reservierbare Aktion','No usable reaction or matching action to reserve')});
    if(b.hanging)out.push({group:l('Behandlung','Treatment'),kind:'rescue',target:b.id,label:l('Vom Abgrund hochziehen','Pull up from pit'),reason:gate('stabilize')||(E.canRescue(s,a,b)?'':l('Neben das Abgrundfeld stellen','Move adjacent to the pit'))});
    const stabilize=gate('stabilize')||(b.hp===0&&b.condition==='unconscious'?'':l('Ziel ist nicht bewusstlos','Target is not unconscious'))||location(a.position,b.position,1,true);
    out.push({group:l('Behandlung','Treatment'),kind:'stabilize',target:b.id,label:l('Stabilisieren','Stabilize'),reason:stabilize});
    out.push({group:l('Weitere Aktionen','Other actions'),kind:'cover',target:a.id,label:l('Deckung aufsuchen','Seek cover'),reason:E.coverDestination(s,a)?.cost>0?'':l('Keine erreichbare bessere Deckung','No better reachable cover')});
    out.push({group:l('Weitere Aktionen','Other actions'),kind:'flee',target:a.id,label:l('Fliehen','Flee'),reason:gate('flee')||(E.canFlee(s,a)?'':l('Erst zum Kartenrand bewegen','Move to the board edge first'))});
    out.push({group:l('Weitere Aktionen','Other actions'),kind:'describe',target:a.id,label:l('Eigene Aktion beschreiben','Describe your own action'),reason:gate('other')});
    out.push({group:l('Weitere Aktionen','Other actions'),kind:'remark',target:a.id,label:l('Kostenloser Zuruf','Free remark'),reason:''});
    out.push({group:l('Weitere Aktionen','Other actions'),kind:'check',target:b.id,label:l('Eigene DC-Probe','Own DC check'),reason:E.isCombatant(a)?'':l('Figur kampfunfähig','Participant incapacitated')});
    return out;
}
