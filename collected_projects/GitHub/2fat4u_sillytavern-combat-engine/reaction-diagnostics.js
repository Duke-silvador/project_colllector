import { reactionBudget, reactionMode } from './reaction-budget.js?v=2.0.0-beta.2-hotfix.2';
import { isCombatant, canPay, canReserveReaction, reactionOptions } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { hasEffect } from './effects.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function customReactionStatus(s,a,language='de'){
    const l=(de,en)=>language==='en'?en:de,issues=[];
    const profiles=(a.skills??[]).filter(v=>v.kind==='narrative'&&v.reaction);
    const budget=reactionBudget(s,a);
    const control=reactionMode(a);
    if(s.phase!=='active')issues.push(l('Der Kampf läuft derzeit nicht.','Combat is not currently active.'));
    if(!s.rules.reactionsEnabled)issues.push(l('Reaktionen sind unter Regeln ausgeschaltet.','Reactions are disabled under Rules.'));
    if(!s.rules.skillsEnabled)issues.push(l('Fähigkeiten sind unter Regeln ausgeschaltet.','Abilities are disabled under Rules.'));
    if(!isCombatant(a))issues.push(l('Diese Figur ist derzeit nicht handlungsfähig oder nicht im Kampf.','This participant is currently incapacitated or outside combat.'));
    if(hasEffect(s,a,'stunned'))issues.push(l('Betäubt: keine Reaktion möglich.','Stunned: reactions are unavailable.'));
    if(control==='off')issues.push(l('Die Reaktionssteuerung dieser Figur steht auf Aus.','This participant’s reaction control is Off.'));
    if(control==='auto')issues.push(l('Automatik öffnet kein Auswahlfenster. Advanced AI kann berechnete eigene Reaktionen wählen; reine Erzählreaktionen bleiben manuell. Für ein Auswahlfenster Reaktionssteuerung auf Nachfrage setzen.','Automatic control does not open a choice popup. Advanced AI may select mechanical custom reactions; pure narrative reactions remain manual. Select Always ask to open a choice popup.'));
    if(budget.remaining===0)issues.push(l('Reaktion bereits verbraucht; Erneuerung am nächsten eigenen Zug.','Reaction already spent; it resets at the next own turn.'));
    if(!(a.reactionChoices??[]).includes('narrative'))issues.push(l('Eigene erzählerische Reaktionen sind bei dieser Figur nicht erlaubt.','Custom narrative reactions are not allowed for this participant.'));
    if(!profiles.length)issues.push(l('Keine eigene Fähigkeit als Reaktion angeboten. Im Fähigkeiteneditor markieren; bei berechneter Wirkung Vorher oder Nachher wählen und übernehmen.','No custom ability is offered as a reaction. Check it in Abilities; for mechanical effects choose Before or After, then apply.'));
    if(a.reactionCost!=='extra'&&budget.reserved===0)issues.push(l('Kostenquelle verlangt Reservierung: im eigenen Zug „Reaktion reservieren“ drücken. Die Kostenwahl allein reserviert nichts.','This cost source requires reservation: press “Reserve reaction” during the own turn. Choosing the cost source alone does not reserve it.'));
    if(profiles.length&&profiles.every(p=>!canPay(s,a,p)))issues.push(l('Vorrat reicht für keine der angebotenen eigenen Reaktionen.','Insufficient stock for every offered custom reaction.'));
    const opponents=s.actors.filter(b=>b.id!==a.id&&isCombatant(b)&&(b.side==='enemy')!==(a.side==='enemy'));
    const reachable=opponents.filter(b=>reactionOptions(s,a,b).some(v=>v.kind==='narrative'));
    if(profiles.length&&!reachable.length&&!issues.length)issues.push(l('Kein derzeitiger Gegner liegt in der Reaktionsreichweite/Sichtlinie. Reichweite 0 bedeutet eigene Figur und braucht keine Reichweite zum Angreifer.','No current opponent is within reaction range/line of sight. Range 0 means self and does not require reach to the attacker.'));
    return {ready:!issues.length,issues,profiles,reachable:reachable.map(b=>b.name),canReserve:canReserveReaction(s,a)};
}
export function customReactionStatusMarkup(s,a,language='de'){
    const l=(de,en)=>language==='en'?en:de,r=customReactionStatus(s,a,language);
    return '<details class="ct-fold ct-reaction-diagnostic"><summary>'+l('Eigene Reaktion: ','Custom reaction: ')+(r.ready?l('bereit für Nachfrage','ready to ask'):l('Voraussetzungen prüfen','check requirements'))+'</summary><div class="ct-fold-body">'+(r.issues.length?'<ul>'+r.issues.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'<p>'+l('Beim nächsten eingehenden Waffenangriff erscheint die Auswahl, solange diese Voraussetzungen gelten.','The next incoming weapon attack opens the choice while these conditions hold.')+'</p>')+'<p>'+l('Auslöser ist ein gegnerischer Waffenangriff, auch wenn er später verfehlt. Eigene Fähigkeiten, Zustandsschaden und die eigene Aktion lösen dieses Fenster nicht aus.','The trigger is an opposing weapon attack, even if it later misses. Custom abilities, status damage and the participant’s own action do not trigger this window.')+'</p></div></details>';
}
