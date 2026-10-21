import { canDeployRandom } from './engine.js?v=2.0.0-beta.2-hotfix.2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function deploymentMarkup(s,language='de') {
    const l=(de,en)=>language==='en'?en:de;
    const select=(title,name,values)=>'<label class="ct-field"><span>'+title+'</span><select name="'+name+'">'+values.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+'</select></label>';
    const formations=[['compact',l('Eng zusammen','Close together')],['loose',l('Locker gruppiert','Loosely grouped')],['spread',l('Über die Karte verteilt','Spread across the map')]];
    return select(l('Schnelle Vorgabe','Quick preset'),'placementMode',[
        ['groups',l('Zwei Armeen gegenüber','Two opposing armies')],['scattered',l('Gruppe gegen verstreute Gegner','Party versus scattered enemies')],['random',l('Völlig zufällig','Fully random')],['custom',l('Eigene Verteilung','Custom formations')]])+
        '<div class="ct-form-grid">'+select(l('Spieler und Alliierte','Player and allies'),'partyFormation',formations)+select(l('Gegner','Enemies'),'enemyFormation',formations)+'</div>'+
        select(l('Figuren verschieben','Reposition participants'),'placementScope',[['unplaced',l('Nur noch nicht platzierte Figuren','Only unplaced participants')],['all',l('Alle ausgewählten Figuren neu aufstellen','Redeploy all selected participants')]])+
        '<label class="ct-field"><span>'+l('Aufstellungs-Seed (optional)','Deployment seed (optional)')+'</span><input name="placementSeed" type="text" value=""></label>'+
        '<div class="ct-controls"><button type="button" class="ct-button" data-deployment-select="all">'+l('Alle auswählen','Check all')+'</button><button type="button" class="ct-button" data-deployment-select="none">'+l('Alle abwählen','Uncheck all')+'</button></div><div class="ct-cure-options">'+s.actors.filter(canDeployRandom).map(a=>'<label><input type="checkbox" name="placeActor" value="'+esc(a.id)+'" checked>'+esc(a.name)+(a.reserve?l(' · Reserve',' · Reserve'):'')+'</label>').join('')+'</div><p>'+l('Nur vor dem Kampf. HP und Vorräte bleiben erhalten. Benötigt genügend verbundene freie Felder; Rückgängig nimmt die gesamte Aufstellung zurück.','Before combat only. HP and stocks are retained. Requires enough connected free cells; Undo reverts the entire deployment.')+'</p>';
}
export function bindDeployment(d) {
    const f=d.querySelector('form');
    f.addEventListener('click',event=>{const b=event.target.closest('[data-deployment-select]');if(!b)return;for(const checkbox of f.querySelectorAll('input[name="placeActor"]'))checkbox.checked=b.dataset.deploymentSelect==='all';});
    f.addEventListener('change',event=>{const e=f.elements;if(!e?.placementMode)return;
        if(event.target.name==='placementMode'){const mode=e.placementMode.value;if(mode==='custom')return;e.partyFormation.value=mode==='random'?'spread':'compact';e.enemyFormation.value=['random','scattered'].includes(mode)?'spread':'compact';}
        else if(['partyFormation','enemyFormation'].includes(event.target.name))e.placementMode.value='custom';
    });
}
export function bindMapOptions(d) {
    const f=d.querySelector('form'),update=()=>{
        if(!f.elements?.preset)return;
        for(const panel of d.querySelectorAll('[data-map-option]')){
            const enabled=panel.dataset.mapOption===f.elements.preset.value;panel.hidden=!enabled;
            for(const input of panel.querySelectorAll('input, select'))input.disabled=!enabled;
        }
    };
    f.addEventListener('change',event=>{if(event.target.name==='preset')update();});update();
}
