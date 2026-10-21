import { compactEditorHelp } from './editor-help.js?v=2.0.0-beta.2-hotfix.2';
import { profileToolbar } from './profiles-ui.js?v=2.0.0-beta.2-hotfix.2';
import { ACTION_KINDS } from './action-pools.js?v=2.0.0-beta.2-hotfix.2';
import { uid } from './engine.js?v=2.0.0-beta.2-hotfix.2';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function openActions(c, actor, dialog, options = {}) {
    const chat = c.chatKey(), l = (de,en) => c.preferences().language === 'en' ? en : de;
    let groupSides=['player','ally','enemy'],groupMode='append';
    let count = actor.actionsPerTurn, pools = structuredClone(actor.bonusActions);
    const labels = Object.fromEntries(Object.entries(ACTION_KINDS).map(([kind,names]) => [kind,l(names.de,names.en)]));
    function read(form) {
        const d = new FormData(form);if(options.groups){groupSides=['player','ally','enemy'].filter(side=>d.has('group-'+side));groupMode=d.get('groupMode')??'append';} count = Number(d.get('actionsPerTurn'));
        pools = pools.map((v,i) => ({ ...v, name: d.get(`pool-${i}-name`), count: Number(d.get(`pool-${i}-count`)), allowed: Object.keys(ACTION_KINDS).filter(k => d.has(`pool-${i}-${k}`)) }));
    }
    function render() {
        const content = (options.groups?'':profileToolbar('budget',actor.id,c.preferences().language)) +  (options.groups ? `<div class="ct-cure-options">${['player','ally','enemy'].map(side=>`<label><input name="group-${side}" type="checkbox" ${groupSides.includes(side)?'checked':''}>${({player:l('Spieler','Players'),ally:l('Verbündete','Allies'),enemy:l('Gegner','Enemies')})[side]}</label>`).join('')}</div><label class="ct-field"><span>${l('Gruppenmodus','Group mode')}</span><select name="groupMode"><option value="append" ${groupMode==='append'?'selected':''}>${l('Zusatzbudgets ergänzen – normale Aktionen erhalten','Add restricted extras – retain normal actions')}</option><option value="replace" ${groupMode==='replace'?'selected':''}>${l('Gesamtes Budget ersetzen','Replace entire budget')}</option></select></label>` : '') + `<p>${l('Normale Aktionen erlauben alles. Zusatzaktionen erlauben nur angehakte Arten. Beispiel: 1 normale Aktion + 1 Heil-Zusatzaktion ergibt Heilen und Angreifen, in beliebiger Reihenfolge. Heilen nutzt zuerst die passende Zusatzaktion. Unter Regeln Mehrere Aktionen aktivieren. Bewegung bleibt ein gemeinsamer Vorrat; Fliehen beendet den Zug.', 'Normal actions allow anything. Additional actions allow only checked kinds. Example: 1 normal action + 1 healing extra allows healing and attacking, in either order. Healing spends its matching extra first. Enable Multiple actions under Rules. Movement remains one shared budget; fleeing ends the turn.')}</p><label class="ct-field" style="${options.groups&&groupMode==='append'?'display:none':''}"><span>${l('Normale Aktionen pro Zug – für alles','Normal actions per turn – any action')}</span><input name="actionsPerTurn" type="number" min="1" max="20" value="${count}"></label>` + pools.map((v,i) => `<section class="ct-supply-editor"><div class="ct-form-grid"><label class="ct-field"><span>${l('Name','Name')}</span><input name="pool-${i}-name" maxlength="100" value="${esc(v.name)}"></label><label class="ct-field"><span>${l('Anzahl','Count')}</span><input name="pool-${i}-count" type="number" min="1" max="20" value="${v.count}"></label></div><div class="ct-cure-options">${Object.keys(ACTION_KINDS).map(k => `<label><input type="checkbox" name="pool-${i}-${k}" ${v.allowed.includes(k) ? 'checked' : ''}> ${labels[k]}</label>`).join('')}</div><button type="button" class="ct-button ct-danger" data-pool-remove="${i}">${l('Entfernen','Remove')}</button></section>`).join('') + `<button type="button" class="ct-button" data-pool-add>+ ${l('Zusätzliche Aktionen – eingeschränkt','Additional actions – restricted')}</button><p class="ct-muted">${l('Mindestens eine erlaubte Aktionsart je Zusatzbudget wählen. Änderungen gelten sofort, erneuern aber keinen bereits verbrauchten Vorrat dieses Zuges.', 'Choose at least one allowed action kind per bonus pool. Changes apply immediately but do not restore actions already spent this turn.')}</p>`;
        const d = dialog(actor.name + ' · ' + l('Aktionsbudget','Action budget'), compactEditorHelp(content,'turns',c.preferences().language), async form => {
            if (c.chatKey() !== chat) throw new Error(l('Chat wurde gewechselt.','Chat changed.'));
            read(form); if(options.groups){const d=new FormData(form);await c.groupBudgets(groupSides,{actionsPerTurn:count,bonusActions:pools},groupMode);}else await c.edit(actor.id, { actionsPerTurn: count, bonusActions: pools });
        }, l('Änderungen übernehmen','Apply changes'));
        d.querySelector('form').addEventListener('change',e=>{if(e.target.name==='groupMode'){read(d.querySelector('form'));render();}});
        d.querySelector('form').addEventListener('click', e => {
            const b = e.target.closest('[data-pool-add], [data-pool-remove]'); if (!b) return;
            read(d.querySelector('form'));
            if (b.dataset.poolRemove !== undefined) pools.splice(Number(b.dataset.poolRemove),1);
            else pools.push({ id: uid(), name: l('Zusatzaktion','Additional action'), count: 1, allowed: ['attack'] });
            render();
        });
    }
    render();
}
