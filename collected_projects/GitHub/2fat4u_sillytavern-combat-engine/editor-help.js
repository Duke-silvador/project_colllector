const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function compactEditorHelp(html,section,language='de') {
    const notes=[];
    const fields=html.replace(/<p(?: class="ct-muted")?>[\s\S]*?<\/p>|<dl class="ct-defense-help">[\s\S]*?<\/dl>|<small class="ct-muted">[\s\S]*?<\/small>/g,part=>{
        if(/<(input|select|button|textarea)\b/.test(part))return part;
        if(!notes.includes(part))notes.push(part);return '';
    });
    return '<div class="ct-editor-help-links"><button type="button" class="ct-button" data-help-section="'+esc(section)+'">'+(language==='en'?'Help for this section':'Hilfe zu diesem Bereich')+'</button></div>'+
        '<button type="button" class="ct-button" data-help-section="calculations">'+(language==='en'?'Calculations':'Berechnungen')+'</button>'+
        (notes.length?'<details class="ct-fold ct-description"><summary>'+(language==='en'?'Expand explanation':'Erklärung aufklappen')+'</summary><div class="ct-fold-body">'+notes.join('')+'</div></details>':'')+fields;
}
