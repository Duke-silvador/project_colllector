const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replaceAll('ß','ss');
export function applyRuleSearch(root,query,language='de') {
    const terms=normalize(query).trim().split(/\s+/).filter(Boolean),sections=[...root.querySelectorAll('[data-rule-search-section]')];let matches=0;
    for(const section of sections){
        const text=normalize(section.textContent+' '+(section.dataset.searchTerms??''));
        const match=terms.every(t=>text.includes(t));section.hidden=!match;if(match)matches++;
        if(section.tagName==='DETAILS'){
            if(terms.length&&match){if(section.dataset.searchOpen===undefined){section.dataset.searchOpen='true';section.dataset.searchWasOpen=String(section.open);}section.open=true;}
            else if(section.dataset.searchOpen!==undefined){section.open=section.dataset.searchWasOpen==='true';delete section.dataset.searchOpen;delete section.dataset.searchWasOpen;}
        }
    }
    const status=root.querySelector('[data-rule-search-status]');
    if(status)status.textContent=!terms.length?'':language==='en'?(matches?matches+' / '+sections.length+' sections':'No matching rule section'):(matches?matches+' / '+sections.length+' Bereiche':'Kein passender Regelbereich');
    return {matches,total:sections.length};
}
