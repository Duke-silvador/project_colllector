import { STATUS_TYPES } from './status-types.js?v=2.0.0-beta.2-hotfix.2';
import { EFFECTS } from './effects.js?v=2.0.0-beta.2-hotfix.2';
import { statLabels } from './stat-labels.js?v=2.0.0-beta.2-hotfix.2';
import { englishError } from './i18n.js?v=2.0.0-beta.2-hotfix.2';
import { resourceDependencies } from './profiles.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function combatFilename(name) { return (String(name??'').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').slice(0,180)||'kampf')+'.json'; }
export function downloadJSON(value,name) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function profileToolbar(kind,id,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    const labels={actor:l('Figur','Participant'),weapons:l('Waffen','Weapons'),skills:l('Fähigkeiten','Abilities'),budget:l('Aktionsbudget','Action budget'),resources:l('Ressourcen','Resources'),effects:l('Aktuelle Zustände','Current statuses')};
    return `<div class="ct-profile-tools"><strong>${labels[kind]??kind}</strong><button type="button" class="ct-button" data-profile-kind="${kind}" data-profile-id="${esc(id)}" data-profile-direction="import">${l('Importieren','Import')}</button><button type="button" class="ct-button" data-profile-kind="${kind}" data-profile-id="${esc(id)}" data-profile-direction="export">${l('Exportieren','Export')}</button><small>${l('Export enthält gespeicherte Werte. Änderungen zuerst übernehmen. Import öffnet den Transfer-Dialog und verwirft ungespeicherte Eingaben.','Export uses saved values. Apply edits first. Import opens the transfer dialog and discards unsaved input.')}</small></div>`;
}
export function openProfiles(c,dialog,options={}) {
    const chat=c.chatKey(),l=(de,en)=>c.preferences().language==='en'?en:de;
    const kinds={actors:l('Neue Figuren','New participants'),actor:l('Eine Figur','One participant'),weapons:l('Waffenliste mit Vorräten','Weapon list with stocks'),skills:l('Fähigkeiten mit Vorräten','Abilities with stocks'),budget:l('Aktionsbudget','Action budget'),resources:l('Ressourcenpaket','Resource pack'),effects:l('Aktuelle Zustände (ausdrücklich)','Current statuses (explicit)')};
    const kind=options.kind??'actors',chosen=options.id??'',exportActor=chosen||c.state().actors[0]?.id||'';
    const content='<p>'+l('Die Datei bestimmt den Importtyp. Figurenprofile fügen neue Figuren hinzu. Andere Profile werden nur auf ausdrücklich ausgewählte Zielfiguren angewendet.','The file determines the import type. Participant profiles add new participants. Other profiles apply only to recipients you explicitly select.')+'</p>'+
        '<label class="ct-field"><span>'+l('Profildatei importieren','Import profile file')+'</span><input type="file" data-profile-file accept=".json,application/json"></label>'+
        '<pre class="ct-profile-preview" data-profile-preview></pre><p data-profile-status class="ct-muted" role="status">'+l('Datei wählen, Vorschau prüfen, dann Importieren drücken.','Select a file, check the preview, then choose Import.')+'</p>'+
        '<p data-profile-import-summary role="status"></p><div data-profile-target-options hidden>'+
        '<fieldset><legend>'+l('Zielfiguren für dieses Profil','Recipients for this profile')+'</legend>'+c.state().actors.map(a=>'<label class="ct-recipient"><input type="checkbox" name="recipient" value="'+esc(a.id)+'" '+(a.id===chosen?'checked ':'')+'disabled> '+esc(a.name)+'</label>').join('')+'</fieldset>'+
        '<label class="ct-field"><span>'+l('Importmodus für diesen Bereich','Import mode for this section')+'</span><select name="importMode" disabled><option value="append">'+l('Ergänzen – vorhandene Mengen erhalten','Add – retain existing quantities')+'</option><option value="replace">'+l('Diesen Bereich ersetzen – verknüpfte Vorräte erhalten','Replace this section – retain linked stocks')+'</option></select></label></div>'+
        '<div class="ct-divider"></div><details class="ct-fold"><summary>'+l('Profile exportieren','Export profiles')+'</summary><div class="ct-fold-body">'+
        '<label class="ct-field"><span>'+l('Profiltyp für Export','Export profile type')+'</span><select name="profileKind">'+Object.entries(kinds).map(([k,n])=>'<option value="'+k+'" '+(k===kind?'selected':'')+'>'+esc(k==='actors'?l('Alle Figuren','All participants'):n)+'</option>').join('')+'</select></label>'+
        '<div data-profile-export-actor><label class="ct-field"><span>'+l('Exportfigur','Export participant')+'</span><select name="actor">'+c.state().actors.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===exportActor?'selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></label></div>'+
        '<div data-entry-selection></div><button type="button" class="ct-button" data-profile-export>'+l('Auswahl exportieren','Export selection')+'</button></div></details>';
    let draft=null,loading=false,generation=0;
    const d=dialog(l('Profile übertragen','Transfer profiles'),content,async form=>{
        if(c.chatKey()!==chat)throw new Error(l('Chat wurde gewechselt.','Chat changed.'));
        if(loading)throw new Error(l('Datei wird noch gelesen.','The file is still being read.'));
        if(!draft)throw new Error(l('Zuerst eine gültige Profildatei auswählen.','Select a valid profile file first.'));
        if(draft.kind==='combat-actors')await c.importProfiles(draft);
        else {
            const ids=[...form.querySelectorAll('[name="recipient"]:checked')].map(v=>v.value);
            if(!ids.length)throw new Error(l('Mindestens eine Zielfigur ausdrücklich auswählen.','Explicitly select at least one recipient.'));
            await c.importProfiles(draft,ids,{mode:form.elements.importMode?.value??'append'});
        }
    },l('Importieren','Import'));
    const form=d.querySelector('form'),status=d.querySelector('[data-profile-status]'),summary=d.querySelector('[data-profile-import-summary]'),preview=d.querySelector('[data-profile-preview]');
    const submit=form.querySelector('[type=submit]');
    const errorText=error=>c.preferences().language==='en'?englishError(error.message,c.state().actors.map(a=>a.name)):error.message;
    function importOptions(){
        const targets=Boolean(draft&&draft.kind!=='combat-actors'),panel=d.querySelector('[data-profile-target-options]');
        if(panel)panel.hidden=!targets;
        for(const input of form.querySelectorAll('[name="recipient"]'))input.disabled=!targets;
        if(form.elements.importMode)form.elements.importMode.disabled=!targets;
        submit.disabled=loading||!draft;
        submit.textContent=draft?.kind==='combat-actors'?l('Neue Figuren hinzufügen','Add new participants'):l('Profil auf Auswahl anwenden','Apply profile to selected recipients');
    }
    function entries(){
        const host=d.querySelector('[data-entry-selection]');if(!host||!form.elements.profileKind||!form.elements.actor)return;
        const k=form.elements.profileKind.value,a=c.state().actors.find(v=>v.id===form.elements.actor.value),actorPanel=d.querySelector('[data-profile-export-actor]');
        if(actorPanel)actorPanel.hidden=k==='actors';
        const list=k==='resources'?a?.resources:k==='skills'?a?.skills:k==='effects'?[...(a?.effects??[]),...(a?.tactics??[])]:null;
        host.innerHTML=list?'<fieldset><legend>'+l('Einträge exportieren','Export entries')+'</legend>'+list.map(v=>'<label class="ct-recipient"><input type="checkbox" name="entry" value="'+esc(v.id??v.type)+'" checked> '+esc(v.name??STATUS_TYPES[v.type]?.[c.preferences().language]??v.type)+'</label>').join('')+(k==='effects'?'<label><input type="checkbox" name="includeTraits" checked> '+l('Immunitäten und Resistenzen mit exportieren','Include immunities and resistances')+'</label>':'')+'</fieldset>':'';
    }
    function loadProfile(raw){
        draft=null;summary.textContent='';preview.textContent='';
        try{
            const valid=c.checkProfiles(raw),labels=statLabels(c.preferences().language),name=v=>v.name??STATUS_TYPES[v.type]?.[c.preferences().language]??v.type,lines=[];
            if(valid.actors)for(const a of valid.actors)lines.push(a.name+' · '+a.maxHp+' HP · '+a.weaponList.map(w=>w.name).join(', '));
            if(valid.weaponList)for(const w of valid.weaponList)lines.push(w.name+' · '+w.damage+' · '+l('Reichweite','Range')+' '+w.range);
            if(valid.skills)for(const v of valid.skills)lines.push(v.name+' · '+labels[v.stat]+' · DC '+v.dc+' · '+l('Reichweite','Range')+' '+v.range);
            if(valid.resources)for(const r of valid.resources)lines.push(r.name+' · '+r.quantity+' '+l('Einheiten','units')+' · '+l('Heilung','Healing')+' '+r.heal);
            if(valid.effects)for(const v of [...valid.effects,...(valid.tactics??[])])lines.push(name(v)+' · '+v.turns+' '+l('eigene Züge','own turns')+' · '+v.damage);
            if(valid.kind==='combat-budget')lines.push(valid.actionsPerTurn+' '+l('normale Aktionen','normal actions'),...valid.bonusActions.map(v=>v.name+' · '+v.count+' · '+v.allowed.join(', ')));
            const duplicateNames=valid.actors?.filter(a=>c.state().actors.some(v=>v.name.toLowerCase()===a.name.toLowerCase())).map(a=>a.name)??[];
            if(duplicateNames.length)lines.push(l('Bereits vorhandene Namen; Import fügt weitere Figuren hinzu: ','Existing names; import adds more participants: ')+duplicateNames.join(', '));
            const count=valid.actors?.length??valid.weaponList?.length??valid.skills?.length??valid.resources?.length??(valid.effects?valid.effects.length+(valid.tactics?.length??0):undefined)??valid.bonusActions?.length??0;
            preview.textContent=lines.join('\n');
            status.textContent=(kinds[valid.kind.replace('combat-','')]??valid.kind)+' · '+count+' '+l('Einträge.','entries.');
            summary.textContent=valid.kind==='combat-actors'?l('Es werden neue Figuren mit vollen HP ohne Position hinzugefügt. Bestehende Figuren, Karte und Regeln bleiben erhalten.','New participants are added at full HP without positions. Existing participants, map and rules are retained.'):
                l('Zielfiguren ausdrücklich auswählen. Ergänzen erhält vorhandene Einträge; Ersetzen ändert nur diesen Profilbereich.','Explicitly select recipients. Add retains existing entries; Replace changes only this profile section.');
            if(valid.actors?.some(a=>a.side==='enemy')&&c.state().rules.visionEnabled&&c.state().rules.hideUnseenEnemies&&c.state().rules.boardEnabled)summary.textContent+=' '+l('Unplatzierte Gegner werden ausgeblendet. Unter Figuren „Ausgeblendete Gegner anzeigen“ wählen. Zum Aufstellen auf dem Board „Spielleitung: Positionen korrigieren“ einschalten.','Unplaced enemies are hidden. Under Participants, select “Show hidden enemies”. To deploy them, enable “GM: correct positions” on the Board.');
            draft=valid;d.querySelector('.ct-editor-error').textContent='';
        }catch(error){
            status.textContent=l('Datei nicht importierbar.','The file cannot be imported.');
            c.debugRecord?.('error',{operation:'import file',message:error.message});d.querySelector('.ct-editor-error').textContent=errorText(error);
        }
        importOptions();
    }
    form.addEventListener('change',e=>{if(['profileKind','actor'].includes(e.target.name))entries();});
    form.addEventListener('click',e=>{
        if(!e.target.closest('[data-profile-export]'))return;
        try{
            const k=form.elements.profileKind.value,id=form.elements.actor.value,profile=c.exportProfiles(k,id),checked=new Set([...form.querySelectorAll('[name="entry"]:checked')].map(v=>v.value));
            if(k==='resources')profile.resources=resourceDependencies(profile.resources,checked);
            if(k==='effects'){if(form.elements.includeTraits&&!form.elements.includeTraits.checked){delete profile.conditionImmunities;delete profile.damageResistances;delete profile.damageImmunities;}profile.effects=profile.effects.filter(v=>checked.has(v.type));profile.tactics=profile.tactics.filter(v=>checked.has(v.type));}
            if(k==='skills'){profile.skills=profile.skills.filter(v=>checked.has(v.id));profile.resources=resourceDependencies(profile.resources,profile.skills.map(v=>v.resource));}
            downloadJSON(profile,(profile.name??c.state().actors.find(a=>a.id===id)?.name??'Combat')+'-'+k);
        }catch(error){c.debugRecord?.('error',{operation:'export',message:error.message});d.querySelector('.ct-editor-error').textContent=errorText(error);}
    });
    d.querySelector('[data-profile-file]')?.addEventListener('change',async e=>{
        const ticket=++generation,file=e.target.files?.[0];draft=null;loading=Boolean(file);preview.textContent='';summary.textContent='';d.querySelector('.ct-editor-error').textContent='';
        status.textContent=file?l('Datei wird gelesen …','Reading file …'):l('Keine Datei ausgewählt.','No file selected.');importOptions();if(!file)return;
        try{
            if(file.size>20*1024*1024)throw new Error(l('Profildatei zu groß (20 MB).','Profile file too large (20 MB).'));
            const raw=JSON.parse(await file.text());if(ticket!==generation||!d.open||d.isConnected===false||c.chatKey()!==chat)return;
            loading=false;loadProfile(raw);
        }catch(error){
            if(ticket!==generation||!d.open||d.isConnected===false||c.chatKey()!==chat)return;
            loading=false;status.textContent=l('Datei nicht importierbar.','The file cannot be imported.');
            c.debugRecord?.('error',{operation:'import file',message:error.message});d.querySelector('.ct-editor-error').textContent=errorText(error);importOptions();
        }
    });
    entries();importOptions();if(options.profile)loadProfile(options.profile);return d;
}
