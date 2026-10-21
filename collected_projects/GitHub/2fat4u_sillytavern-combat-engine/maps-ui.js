import { englishError } from './i18n.js?v=2.0.0-beta.2-hotfix.2';
import { mapFilename } from './maps.js?v=2.0.0-beta.2-hotfix.2';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function openMaps(c, dialog) {
    const key = c.chatKey(), language = c.preferences().language, l = (de, en) => language === 'en' ? en : de;
    const guard = () => { if (key !== c.chatKey()) throw new Error('Chat wurde gewechselt. Aktion erneut im richtigen Chat ausführen.'); };
    function render(name = '') {
        const maps = c.maps(), active = c.state().phase === 'active';
        const lockedReason = l('Kartenladen gesperrt: Es läuft gerade ein Kampf. Stoppe den Kampf über „Kampf stoppen“, um eine andere Karte zu laden.', 'Map loading is locked while combat is running. Use “Stop combat” before loading another map.');
        const rows = maps.map(v => `<article class="ct-map-template"><div class="ct-map-thumb">${v.backgroundImage ? `<img src="${esc(v.backgroundImage.src)}" alt="" loading="lazy">` : '▦'}</div><div><input name="map-name-${esc(v.id)}" value="${esc(v.name)}" maxlength="100" aria-label="${l('Kartenname', 'Map name')}"><small>${v.board.width}×${v.board.height} · ${v.board.blocked.length} ${l('Mauern', 'walls')} · ${v.board.cover.length} ${l('Deckung', 'cover')}</small><div class="ct-controls"><button type="button" class="ct-button ct-primary" data-map-action="load" data-id="${esc(v.id)}" ${active ? 'disabled aria-describedby="ct-map-load-reason" title="' + esc(lockedReason) + '"' : ''}>${l('Karte laden', 'Load map')}</button><button type="button" class="ct-button" data-map-action="rename" data-id="${esc(v.id)}">${l('Umbenennen', 'Rename')}</button><button type="button" class="ct-button" data-map-action="export" data-id="${esc(v.id)}">Export</button><button type="button" class="ct-button ct-danger" data-map-action="delete" data-id="${esc(v.id)}">${l('Entfernen', 'Remove')}</button></div></div></article>`).join('');
        const content = `<p>${l('Wiederkehrende Orte mit Raster, Gelände und Hintergrundbild speichern. Die Bibliothek ist für alle Chats verfügbar.', 'Save recurring places with their grid, terrain and background image. The library is available across chats.')}</p>${active ? `<div id="ct-map-load-reason" class="ct-map-load-warning" role="status"><strong>${esc(lockedReason)}</strong></div>` : ''}<label class="ct-field"><span>${l('Aktuelle Karte speichern als', 'Save current map as')}</span><input name="name" value="${esc(name)}" maxlength="100" required></label><label class="ct-field"><span>${l('Kartenvorlage importieren (.json)', 'Import map template (.json)')}</span><input type="file" data-map-file accept=".json,application/json"></label><label><input type="checkbox" name="keepPositions"> ${l('Gültige Figurenpositionen beim Laden behalten', 'Keep valid participant positions when loading')}</label><p class="ct-muted">${l('Kampf vor dem Kartenwechsel stoppen. Standardmäßig werden Figuren zum erneuten Platzieren vom Feld genommen; ihre Werte bleiben erhalten. Speichern ist auch im Kampf möglich.', 'Stop combat before loading a map. By default participants are unplaced for a new deployment; their values are retained. Saving is also possible during combat.')}</p><div class="ct-map-library">${rows || `<p>${l('Noch keine gespeicherten Karten.', 'No saved maps yet.')}</p>`}</div>`;
        const d = dialog(l('Kartenbibliothek', 'Map library'), content, async form => { guard(); await c.saveMap(form.elements.name.value); render(); }, l('Aktuelle Karte speichern', 'Save current map'));
        const form = d.querySelector('form');
        const error = value => { form.querySelector('.ct-editor-error').textContent = language === 'en' ? englishError(value.message, c.state().actors.map(a => a.name)) : value.message; };
        let working = false;
        form.addEventListener('click', async event => {
            const b = event.target.closest('[data-map-action]'); if (!b || b.disabled || working) return;
            working = true; b.disabled = true;
            try {
                guard(); const id = b.dataset.id, action = b.dataset.mapAction;
                if (action === 'load') { await c.loadMap(id, { keepPositions: form.elements.keepPositions.checked }); d.close(); }
                else if (action === 'delete') { await c.deleteMap(id); render(form.elements.name.value); }
                else if (action === 'rename') { await c.renameMap(id, form.elements['map-name-' + id].value); render(form.elements.name.value); }
                else if (action === 'export') {
                    const map = c.exportMap(id), url = URL.createObjectURL(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' })), a = document.createElement('a');
                    a.href = url; a.download = mapFilename(map.name); a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
                }
            } catch (e) { error(e); } finally { working = false; b.disabled = false; }
        });
        d.querySelector('[data-map-file]')?.addEventListener('change', async event => {
            const file = event.target.files?.[0]; if (!file || working) return; working = true;
            try { guard(); if (file.size > 3 * 1024 * 1024) throw new Error(l('Kartendatei ist zu groß (maximal 3 MB).', 'Map file is too large (maximum 3 MB).')); const data = JSON.parse(await file.text()); guard(); await c.importMap(data); render(form.elements.name.value); }
            catch (e) { error(e); } finally { working = false; }
        });
    }
    render();
}
