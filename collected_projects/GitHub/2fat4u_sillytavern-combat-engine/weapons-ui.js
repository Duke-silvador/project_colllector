import { damageTypeSelect } from './traits-ui.js?v=2.0.0-beta.2-hotfix.2';
import { compactEditorHelp } from './editor-help.js?v=2.0.0-beta.2-hotfix.2';
import { profileToolbar } from './profiles-ui.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
import { STATS } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { englishError } from './i18n.js?v=2.0.0-beta.2-hotfix.2';
import { listWeapons, uid } from './engine.js?v=2.0.0-beta.2-hotfix.2';
import { effectFields, readEffects } from './supplies-ui.js?v=2.0.0-beta.2-hotfix.2';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function readWeaponDraft(data, weapons, resources) {
    const stocks = structuredClone(resources), changes = new Map();
    function stock(prefix, old) {
        const selected = data.get(prefix + '-resource');
        if (!selected) return null;
        const id = selected === '__own__' ? uid() : selected;
        let item = stocks.find(v => v.id === id);
        const quantity = Number(data.get(prefix + '-quantity'));
        if (!item) { item = { id, name: data.get(prefix + '-stockName') || data.get(prefix.split('-stock')[0] + '-name') || 'Ammo', kind: 'ammo', quantity: 0, heal: '0', range: 0, cures: [] }; stocks.push(item); }
        if (selected === '__own__' || quantity !== resources.find(v => v.id === id)?.quantity) {
            if (changes.has(id) && changes.get(id) !== quantity) throw new Error('Ein gemeinsamer Vorrat hat widersprüchliche Mengen.');
            changes.set(id, quantity); item.quantity = quantity;
        }
        return id;
    }
    const weaponList = weapons.map((v,i) => {
        const p='weapon-'+i, value = { ...v,...(data.has(p+'-damageType')?{damageType:data.get(p+'-damageType')}:{}), name: data.get(p+'-name'), mode: data.get(p+'-mode'), range: Number(data.get(p+'-range')), stat: data.get(p+'-stat') ?? v.stat ?? 'inherit', attackBonus: data.get(p+'-hit'), damage: data.get(p+'-damage'), damageBonus: data.get(p+'-bonus'), radius: Number(data.get(p+'-radius')), effects: readEffects(data,p+'-effect',v.effects), resource: stock(p+'-stock',v.resource),cost:Number(data.get(p+'-stock-cost')??v.cost??1), standard: null };
        const damage = String(data.get(p+'-standardDamage') ?? '').trim();
        if (damage) value.standard = { damage,...(data.has(p+'-standardDamageType')?{damageType:data.get(p+'-standardDamageType')}:v.standard?.damageType?{damageType:v.standard.damageType}:{}), damageBonus: data.get(p+'-standardBonus'), resource: stock(p+'-standard',v.standard?.resource),cost:Number(data.get(p+'-standard-cost')??v.standard?.cost??1) };
        return value;
    });
    const preferredWeapon = data.get('preferredWeapon') || weaponList[0]?.id || null;
    return { weaponList, resources: stocks, preferredWeapon, attackMode: weaponList.find(v => v.id === preferredWeapon)?.mode ?? 'melee' };
}
export function openWeapons(c, actor, dialog) {
    const chat = c.chatKey(), l = (de,en) => c.preferences().language === 'en' ? en : de;
    let weapons = structuredClone(listWeapons(actor)), resources = structuredClone(actor.resources), preferred = actor.preferredWeapon;
    const field = (title,name,value,type='text',extra='') => `<label class="ct-field"><span>${title}</span><input name="${name}" value="${esc(value)}" type="${type}" ${extra}></label>`;
    function stockFields(p,id) {
        const item = resources.find(v => v.id === id);
        return `<div class="ct-ammo-fields"><label class="ct-field"><span>${l('Verbrauch','Consumption')}</span><select name="${p}-resource" data-stock="${p}"><option value="">${l('Unbegrenzt / ohne Verbrauch','Unlimited / no consumption')}</option><option value="__own__">${l('Neuen eigenen Vorrat anlegen','Create own stock')}</option>${resources.filter(v => v.kind === 'ammo').map(v => `<option value="${esc(v.id)}" ${id === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>${field(l('Munition / Ladungen / Mana','Ammo / charges / mana'),p+'-quantity',item?.quantity ?? 10,'number','min="0" max="1000000"' + (id ? '' : ' disabled'))}${field(l('Kosten pro Einsatz','Cost per use'),p+'-cost',p.endsWith('-standard')?weapons[Number(p.split('-')[1])]?.standard?.cost??1:weapons[Number(p.split('-')[1])]?.cost??1,'number','min="0" max="1000000"')}${field(l('Name für neuen Vorrat','New stock name'),p+'-stockName','', 'text','maxlength="100" disabled')}</div>`;
    }
    function read(form) { const draft = readWeaponDraft(new FormData(form),weapons,resources); weapons = draft.weaponList; resources = draft.resources; preferred = draft.preferredWeapon; return draft; }
    function render() {
        const content = (profileToolbar('weapons',actor.id,c.preferences().language)) +  `<p>${l('Waffen und Angriffszauber mit eigenem Würfel, Bonus und Vorrat. Ohne Verbrauch sind Angriffe unbegrenzt. Ein Vorrat kann von mehreren Waffen geteilt werden. Heilzauber bleiben unter Ressourcen & Zustände.', 'Weapons and attack spells with their own dice, bonus and stock. No consumption means unlimited attacks. Multiple weapons may share a stock. Healing spells remain under Resources & statuses.')}</p><label class="ct-field"><span>${l('Bevorzugte Waffe','Preferred weapon')}</span><select name="preferredWeapon">${weapons.map(v => `<option value="${esc(v.id)}" ${preferred === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` + weapons.map((v,i) => {
            const p='weapon-'+i;
            return `<details class="ct-fold" ${i === 0 ? 'open' : ''}><summary>${esc(v.name)}</summary><div class="ct-fold-body"><div class="ct-form-grid">${field(l('Name','Name'),p+'-name',v.name,'text','required maxlength="100"')}<label class="ct-field"><span>${l('Art','Type')}</span><select name="${p}-mode"><option value="melee" ${v.mode === 'melee' ? 'selected' : ''}>${l('Nahkampf','Melee')}</option><option value="ranged" ${v.mode === 'ranged' ? 'selected' : ''}>${l('Fernkampf','Ranged')}</option></select></label>${field(l('Reichweite (Nahkampf: benachbart)','Range (melee: adjacent)'),p+'-range',v.range,'number','min="1" max="100"')}<label class="ct-field"><span>${l('Angriffsattribut dieser Waffe','This weapon attack attribute')}</span><select name="${p}-stat">${Object.entries({inherit:l('Figurenstandard','Participant default'),auto:l('Höheres STR / DEX','Higher STR / DEX'),...statLabels(c.preferences().language)}).map(([k,n])=>`<option value="${k}" ${(v.stat??'inherit')===k?'selected':''}>${n}</option>`).join('')}</select></label>${field(l('Waffen-Trefferbonus','Weapon attack bonus'),p+'-hit',v.attackBonus,'text','inputmode="decimal"')}${field(l('Schadenswürfel','Damage dice'),p+'-damage',v.damage)}${damageTypeSelect(p+'-damageType',v.damageType??'physical',c.preferences().language)}${field(l('Waffen-Schadensbonus','Weapon damage bonus'),p+'-bonus',v.damageBonus,'number','min="-100" max="100"')}${field(l('Flächenradius','Area radius'),p+'-radius',v.radius,'number','min="0" max="10"')}</div>${stockFields(p+'-stock',v.resource)}<details class="ct-fold"><summary>${l('Treffereffekte','On-hit effects')}</summary><div class="ct-fold-body">${effectFields(v.effects,p+'-effect',c.preferences().language)}</div></details><details class="ct-fold"><summary>${l('Standardvariante ohne Spezialeffekte','Standard variant without special effects')}</summary><div class="ct-fold-body"><div class="ct-form-grid">${field(l('Standardwürfel (leer = keine Variante)','Standard dice (empty = no variant)'),p+'-standardDamage',v.standard?.damage ?? '')}${damageTypeSelect(p+'-standardDamageType',v.standard?.damageType??'physical',c.preferences().language)}${field(l('Standard-Schadensbonus','Standard damage bonus'),p+'-standardBonus',v.standard?.damageBonus ?? v.damageBonus,'number','min="-100" max="100"')}</div>${stockFields(p+'-standard',v.standard?.resource)}</div></details><button type="button" class="ct-button ct-danger" data-weapon-remove="${i}">${l('Waffe entfernen','Remove weapon')}</button></div></details>`;
        }).join('') + `<button type="button" class="ct-button ct-primary" data-weapon-add>+ ${l('Waffe / Zauber','Weapon / spell')}</button><p class="ct-muted">${l('Eine gültige Attacke bezahlt ihre eingestellten Kosten, auch beim Fehlschlag. Nahkampf wird nur begrenzt, wenn du ihm selbst einen Vorrat zuweist. Speichern übernimmt alle Änderungen gemeinsam.', 'A valid attack pays its configured cost, including on a miss. Melee is limited only if you assign its own stock. Save applies all changes together.')}</p>`;
        const d = dialog(actor.name + ' · ' + l('Waffenliste','Weapon list'), compactEditorHelp(content,'attacks',c.preferences().language), async form => {
            if (c.chatKey() !== chat) throw new Error(l('Chat wurde gewechselt.','Chat changed.'));
            await c.edit(actor.id, read(form));
        },l('Änderungen übernehmen','Apply changes'));
        const form = d.querySelector('form');
        form.addEventListener('change', e => {
            const p = e.target.dataset.stock; if (!p) return;
            const id = e.target.value, item = resources.find(v => v.id === id), quantity = form.querySelector(`[name="${p}-quantity"]`);
            if (quantity) quantity.disabled = !id;
            const name = form.querySelector(`[name="${p}-stockName"]`); if (name) name.disabled = id !== '__own__';
            if (quantity && item) quantity.value = item.quantity;
        });
        form.addEventListener('click',e => {
            const b=e.target.closest('[data-weapon-add], [data-weapon-remove]'); if (!b) return;
            try { read(form);
                if (b.dataset.weaponRemove !== undefined) weapons.splice(Number(b.dataset.weaponRemove),1);
                else weapons.push({ id: uid(), name: l('Neue Waffe','New weapon'), mode:'melee', range:1, attackBonus:0, damage:'1d6', damageBonus:0, radius:0, resource:null, standard:null, effects:[] });
                render();
            } catch (error) { d.querySelector('.ct-editor-error').textContent = c.preferences().language === 'en' ? englishError(error.message, [actor.name]) : error.message; }
        });
    }
    render();
}
