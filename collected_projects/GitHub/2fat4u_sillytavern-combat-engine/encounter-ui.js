import * as E from './engine.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const field=(label,name,value,type='text',extra='')=>'<label class="ct-field"><span>'+label+'</span><input name="'+name+'" value="'+esc(value)+'" type="'+type+'" '+extra+'></label>';
const select=(label,name,value,options)=>'<label class="ct-field"><span>'+label+'</span><select name="'+name+'">'+options.map(([k,v])=>'<option value="'+k+'" '+(k===value?'selected':'')+'>'+v+'</option>').join('')+'</select></label>';
export function encounterRulesMarkup(r,language='de') {
    const l=(de,en)=>language==='en'?en:de,check=(name,title,note)=>'<label class="ct-rule"><input type="checkbox" name="'+name+'" '+(r[name]?'checked':'')+'><span><strong>'+title+'</strong><small>'+note+'</small></span></label>';
    return '<input type="hidden" name="rules199" value="1"><input type="hidden" name="rulesVision" value="1">'+
        '<h3>'+l('Sichtweite','Vision')+'</h3>'+check('visionEnabled',l('Sichtweite aktiv','Enable vision range'),l('Zusätzlich zur Sichtlinie. Grundweite plus optionaler Wahrnehmungsbonus, mindestens 0. Waffenreichweite bleibt separat.','In addition to line of sight. Base range plus optional Perception bonus, minimum 0. Weapon range remains separate.'))+
        field(l('Grundsichtweite (Felder)','Base vision (cells)'),'visionBase',r.visionBase??8,'number','min="0" max="100"')+
        check('visionPerception',l('Wahrnehmungsbonus addieren','Add Perception bonus'),l('Verwendet den gewählten Attributmodus, auch negative Boni.','Uses the selected attribute mode, including negative bonuses.'))+
        check('hideUnseenEnemies',l('Gegner außerhalb der Gruppensicht ausblenden','Hide enemies outside party vision'),l('Spieler und Alliierte teilen die Anzeige. Jede KI verwendet die eigene Sicht. GM-Korrektur zeigt alle Figuren.','Players and allies share display visibility. Each AI uses its own vision. GM correction reveals all participants.'))+
        check('autoRemoveDead',l('Tote automatisch vom Spielfeld nehmen','Automatically remove dead participants from the board'),l('Profil und letzte Position bleiben erhalten. Bewusstlose bleiben rettbar.','Retain profile and last position. Unconscious participants remain rescuable.'))+
        '<div class="ct-form-grid">'+select(l('Initiative neuer Figuren','New participant initiative'),'joinInitiative',r.joinInitiative,[['profile',l('Profilwert übernehmen','Use profile value')],['roll',l('W20 + Geschicklichkeit würfeln','Roll d20 + Dexterity')],['manual',l('Manuellen Wert verwenden','Use a manual value')]])+select(l('Erster Zug neuer Figuren','New participant first turn'),'joinTiming',r.joinTiming,[['remaining',l('Diese Runde, falls noch dran','This round, if not yet passed')],['next',l('Ab nächster Runde','From next round')]])+'</div>'+
        check('stealthEnabled',l('Verstecken / Schleichen aktiv','Enable hiding / sneaking'),l('Fähigkeit im Profil zuweisen. Versteckte Gegner sind kein direktes Ziel.','Assign the ability in the profile. Hidden enemies cannot be targeted directly.'))+
        check('hideNeedsTerrain',l('Nur nahe Deckung oder Mauern verstecken','Hide only near cover or walls'),l('Ein Feld Abstand, auch diagonal. Verlassen deckt auf.','One cell away, including diagonals. Leaving reveals the participant.'))+
        '<div class="ct-rule-setting">'+check('ambushStacksCritical',l('Hinterhaltbonus zusätzlich bei kritischen Treffern','Apply ambush bonus to critical hits too'),l('Der Faktor gilt für den ersten Angriff aus dem Versteck. Dieser Schalter ergänzt ihn auch bei kritischen Treffern.','The factor applies to the first attack from hiding. This switch also applies it to critical hits.'))+
        field(l('Schadensfaktor aus Versteck (1 = kein Bonus)','Hidden damage factor (1 = no bonus)'),'hiddenDamageMultiplier',r.hiddenDamageMultiplier,'text','inputmode="decimal"')+'</div>'+
        '<div class="ct-rule-setting">'+check('shotRiskEnabled',l('Friendly Fire – Schüsse durch Figuren','Friendly Fire – shots through participants'),l('Erschwerter Treffer; bei Fehlschlag kann die nächste Zwischenfigur mit demselben Wurf getroffen werden.','Hit penalty; a miss may strike the closest intervening participant using the same roll.'))+
        field(l('Schusserschwernis pro Zwischenfigur','Shot penalty per intervening participant'),'shotRiskPenalty',r.shotRiskPenalty,'text','inputmode="decimal"')+'</div>'+
        check('friendlyFireArea',l('Friendly Fire – Flächenschaden','Friendly Fire – area damage'),l('Flächenschaden trifft auch die eigene Seite. Unabhängig von Schüssen durch Figuren.','Area damage also affects your own side. Independent of shots through participants.'));
}
export function coverDistanceMarkup(r,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    return '<div class="ct-rule-setting"><label class="ct-rule"><input type="checkbox" name="coverDistanceEnabled" '+(r.coverDistanceEnabled?'checked':'')+'><span><strong>'+l('Entfernungsabhängige Deckung','Distance-based cover')+'</strong><small>'+l('Bis ein Feld volle Deckung; zwei Felder schwächer; ab drei ohne Schutz.','Within one cell full cover; two cells weaker; from three no protection.')+'</small></span></label>'+
        field(l('Schaden bei zwei Feldern Abstand (%)','Damage two cells behind cover (%)'),'coverFarPercent',r.coverFarPercent,'number','min="0" max="100"')+'</div>';
}
export function pitRescueRulesMarkup(r,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    return field(l('Rettungsrunden am Abgrund','Pit rescue rounds'),'pitRescueRounds',r.pitRescueRounds,'number','min="1" max="100"');
}
export function presenceMarkup(s,a,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    const last=!a.position&&a.lastPosition?'<small class="ct-last-position">'+l('Letzte Position: ','Last position: ')+E.coordinate(a.lastPosition)+' · '+l('Höhe ','Height ')+a.lastHeight+'</small>':'';
    const wait=a.joinRound>s.round?'<small>'+l('Wartet bis Runde ','Waiting until round ')+a.joinRound+'</small>':'';
    return last+wait;
}
export function joinMarkup(s,a,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    return (a.initiativeReady?'<p>'+l('Bisherige Initiative bleibt: ','Retaining initiative: ')+a.initiative+'. '+l('Kein Doppelzug durch Wiedereinsetzen.','Rejoining cannot grant a duplicate turn.')+'</p>':select(l('Initiative bestimmen','Determine initiative'),'initiativeMode',s.rules.joinInitiative,[['profile',l('Profilwert','Profile value')],['roll',l('W20 + Geschicklichkeit','d20 + Dexterity')],['manual',l('Manueller Wert','Manual value')]])+field(l('Initiative bei manueller Wahl','Initiative when choosing manual'),'initiative',a.initiative,'text','inputmode="decimal"'))+
        select(l('Erster Zug','First turn'),'joinTiming',s.rules.joinTiming,[['remaining',l('Diese Runde, falls noch dran','This round, if not yet passed')],['next',l('Ab nächster Runde','From next round')]]);
}
