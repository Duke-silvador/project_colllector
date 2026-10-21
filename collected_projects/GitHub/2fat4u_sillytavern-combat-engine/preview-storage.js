import { historyCount } from './history-codec.js?v=2.0.0-beta.2-hotfix.2';
// Standalone preview only. Never clear unrelated browser/application storage.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const previewStorageKey=key=>typeof key==='string'&&/^(ct-combat-demo-v1|ct-features-test1917-v1|ct-(eigene-faehigkeiten|bergen-zustaende|adventure-testpack|reaktionen)-[a-z0-9-]{1,64}-v1)$/.test(key);
export function previewInventory(storage,currentKey){
    const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(previewStorageKey);
    return keys.map(key=>{const value=storage.getItem(key);let data;try{data=JSON.parse(value);}catch{/* Keep damaged preview records recoverable. */}
        return {key,value,bytes:2*(key.length+(value?.length??0)),name:data?.state?.name??key,actors:data?.state?.actors?.length??0,history:historyCount(data?.history),current:key===currentKey};
    }).filter(v=>v.value!==null).sort((a,b)=>Number(b.current)-Number(a.current)||b.bytes-a.bytes);
}
export function createPreviewStorage({storage,key,getBundle,setBundle,onChange=()=>{},onStatus=()=>{}}){
    let status={saved:false,error:null};
    const report=(saved,error=null)=>{status={saved,error};onStatus(status);return saved;};
    const write=value=>{try{storage().setItem(key,value);return report(true);}catch(error){return report(false,error?.name==='QuotaExceededError'||[22,1014].includes(error?.code)?'quota':'storage');}};
    const save=()=>write(JSON.stringify(getBundle()));
    function backup(){const entries=previewInventory(storage(),key).map(({key,value})=>({key,value}));return {type:'deterministic-combat-preview-backup',version:1,createdAt:new Date().toISOString(),entries,current:{key,value:JSON.stringify(getBundle())}};}
    function remove(keys,snapshot){
        const wanted=[...new Set(keys)];if(!wanted.length)throw Error('empty');
        if(wanted.some(k=>!previewStorageKey(k)||k===key))throw Error('protected');
        if(snapshot?.type!=='deterministic-combat-preview-backup'||snapshot.version!==1)throw Error('backup');
        const target=storage(),entries=new Map(snapshot.entries.map(v=>[v.key,v.value]));
        // Recheck every selected record before any deletion, including changes from old tabs.
        if(wanted.some(k=>!entries.has(k)||target.getItem(k)!==entries.get(k)))throw Error('changed');
        let removed=0;try{for(const k of wanted){target.removeItem(k);removed++;}}catch{throw Object.assign(Error('delete'),{removed});}
        save();return removed;
    }
    function trimHistory(snapshot){
        const bundle=getBundle();if(snapshot?.current?.key!==key||snapshot.current.value!==JSON.stringify(bundle))throw Error('changed');
        const next={...bundle,history:[]};if(!write(JSON.stringify(next)))return false;
        setBundle(next);onChange();return true;
    }
    return {key,save,backup,remove,trimHistory,inventory:()=>previewInventory(storage(),key),status:()=>({...status})};
}
export function mountPreviewStorage(store,{getBundle,language=()=> 'de',mount=document.body}={}){
    const bar=document.createElement('section');bar.className='ct-ui ct-preview-storage';mount.append(bar);
    const l=(de,en)=>language()==='en'?en:de;let dialog=null,selected=new Set(),snapshot=null,confirmed=false,note='';
    const download=(value,name)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
    const statusText=()=>store.status().saved?l('Vorschau im Browser gespeichert.','Preview saved in this browser.'):store.status().error==='quota'?l('Nicht gespeichert: Browserspeicher voll. Aktueller Stand bleibt nur in diesem offenen Tab. Vor Neuladen exportieren oder aufräumen.','Not saved: browser storage is full. The current state is held only in this open tab. Export or clean up before reloading.'):store.status().error?l('Nicht gespeichert: Browserspeicher nicht verfügbar. Aktuellen Kampf vor dem Schließen exportieren.','Not saved: browser storage is unavailable. Export the current combat before closing.'):l('Vorschau-Speicher','Preview storage');
    function refresh(){bar.innerHTML='<div class="ct-controls"><button type="button" class="ct-button" data-storage-open>'+l('Vorschau-Speicher aufräumen','Clean up preview storage')+'</button><button type="button" class="ct-button" data-storage-retry>'+l('Jetzt speichern','Save now')+'</button></div><p role="status" class="'+(store.status().error?'ct-error':'ct-muted')+'">'+esc(statusText())+'</p>';}
    const errorText=error=>({empty:l('Zuerst alte Stände auswählen.','Select old records first.'),protected:l('Die aktuelle Vorschau und fremde Browserdaten sind geschützt.','The current preview and unrelated browser data are protected.'),backup:l('Zuerst eine Sicherung herunterladen.','Download a backup first.'),changed:l('Der Stand wurde inzwischen geändert. Liste neu öffnen und eine neue Sicherung herunterladen. Nichts wurde gelöscht.','The data changed meanwhile. Reopen the list and download a new backup. Nothing was deleted.'),delete:l('Löschen wurde unterbrochen. Die Sicherung behalten und Liste neu öffnen.','Deletion was interrupted. Keep the backup and reopen the list.')}[error.message]??l('Speicher nicht zugänglich. Aktuellen Kampf über Export sichern.','Storage is inaccessible. Back up the current combat using Export.'));
    function renderDialog(){
        let entries=[];try{entries=store.inventory();}catch(error){note=errorText(error);}
        const old=entries.filter(v=>!v.current);selected=new Set([...selected].filter(k=>old.some(v=>v.key===k)));
        dialog.innerHTML='<header class="ct-section-heading"><h2>'+l('Vorschau-Speicher aufräumen','Clean up preview storage')+'</h2><button type="button" class="ct-button" data-storage-close>'+l('Schließen','Close')+'</button></header><p>'+l('Hier stehen nur erkannte Kampf-Vorschauen, auf die diese Seite zugreifen kann. Die aktuelle Vorschau bleibt geschützt. Alte Vorschau-Tabs nach dem Export schließen, damit sie gelöschte Stände nicht erneut speichern.','Only recognized combat previews accessible to this page are listed. The current preview is protected. Close old preview tabs after exporting so they cannot save deleted records again.')+'</p><p>'+l('Größen sind Näherungen. Falls andere Dateien einen getrennten Browserspeicher haben, erscheinen sie hier nicht.','Sizes are approximate. Other files with separate browser storage will not appear here.')+'</p><div class="ct-storage-list">'+entries.map(v=>'<label><input type="checkbox" data-storage-key="'+esc(v.key)+'" '+(v.current?'disabled':selected.has(v.key)?'checked':'')+'><span><strong>'+esc(v.name)+(v.current?' · '+l('aktuelle Vorschau','current preview'):'')+'</strong><small>'+esc(v.key)+' · '+Math.ceil(v.bytes/1024)+' KiB · '+v.actors+' '+l('Figuren','participants')+' · '+v.history+' '+l('Rückgängig-Stände','undo states')+'</small></span></label>').join('')+(entries.length&&!old.length?'<p class="ct-muted">'+l('Nur die geschützte aktuelle Vorschau ist hier zugänglich. Für diese Vorschau unten nach der Sicherung den Rückgängig-Verlauf leeren.','Only the protected current preview is accessible here. Back it up, then clear its undo history using the button below.')+'</p>':'')+(entries.length?'':'<p>'+l('Keine zugänglichen gespeicherten Vorschau-Stände.','No accessible saved preview records.')+'</p>')+'</div><div class="ct-controls"><button type="button" class="ct-button" data-storage-backup>'+l('Vollständige Sicherung herunterladen','Download full backup')+'</button></div><p>'+l('Die Sicherung enthält alle aufgelisteten Vorschau-Daten und den aktuellen Stand dieses Tabs – auch noch nicht gespeicherte Änderungen, Bilder, Kartenbibliothek, Vorlagen und Rückgängig-Verlauf.','The backup contains all listed preview data and the current in-memory state, including unsaved changes, images, map library, templates and undo history.')+'</p><label><input type="checkbox" data-storage-confirm '+(confirmed?'checked':'')+' '+(!snapshot?'disabled':'')+'>'+l('Ich habe die Sicherungsdatei gespeichert. Die gewählte Bereinigung darf ausgeführt werden.','I have saved the backup file. The selected cleanup may proceed.')+'</label><div class="ct-controls"><button type="button" class="ct-button ct-danger" data-storage-delete '+(!confirmed||!selected.size?'disabled':'')+'>'+l('Ausgewählte alte Stände löschen','Delete selected old records')+'</button><button type="button" class="ct-button" data-storage-trim '+(!confirmed||!getBundle().history?.length?'disabled':'')+'>'+l('Nur aktuellen Rückgängig-Verlauf leeren','Clear current undo history only')+' ('+(getBundle().history?.length??0)+')</button></div><p class="ct-muted">'+l('Das Leeren des aktuellen Rückgängig-Verlaufs erhält Kampf, Figuren, Bilder, Karten, Vorlagen und Einstellungen.','Clearing current undo history retains combat, participants, images, maps, templates and settings.')+'</p><p role="status">'+esc(note)+'</p>';
    }
    bar.addEventListener('click',event=>{if(event.target.closest('[data-storage-retry]')){store.save();refresh();}if(!event.target.closest('[data-storage-open]'))return;if(dialog){dialog.showModal();return;}selected=new Set();snapshot=null;confirmed=false;note='';dialog=document.createElement('dialog');dialog.className='ct-ui ct-editor ct-storage-dialog';mount.append(dialog);renderDialog();
        dialog.addEventListener('close',()=>{dialog.remove();dialog=null;});
        dialog.addEventListener('change',event=>{if(event.target.dataset?.storageKey){if(event.target.checked)selected.add(event.target.dataset.storageKey);else selected.delete(event.target.dataset.storageKey);}if(event.target.hasAttribute?.('data-storage-confirm'))confirmed=event.target.checked;renderDialog();});
        dialog.addEventListener('click',event=>{const closest=q=>event.target.closest(q);
            // Leave checkbox/label activation to the browser. Replacing the controls
            // during their click prevented the following native change event.
            if(!['close','backup','delete','trim'].some(action=>closest('[data-storage-'+action+']')))return;
            try{
            if(closest('[data-storage-close]')){dialog.close();return;}
            if(closest('[data-storage-backup]')){const next=store.backup();download(next,'Combat-Vorschau-Sicherung-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');snapshot=next;confirmed=false;note=l('Download gestartet. Erst nach dem Speichern bestätigen.','Download started. Confirm only after saving the file.');}
            if(closest('[data-storage-delete]')&&confirmed&&selected.size){const count=store.remove([...selected],snapshot);selected.clear();snapshot=null;confirmed=false;note=count+' '+l('alte Stände gelöscht. ','old records deleted. ')+statusText();}
            if(closest('[data-storage-trim]')&&confirmed){const saved=store.trimHistory(snapshot);note=saved?l('Rückgängig-Verlauf geleert; Kampf und Bibliotheken erhalten.','Undo history cleared; combat and libraries retained.'):statusText();if(saved){snapshot=null;confirmed=false;}}
        }catch(error){note=errorText(error);snapshot=null;confirmed=false;}if(dialog)renderDialog();refresh();});dialog.showModal();
    });refresh();return {refresh};
}
