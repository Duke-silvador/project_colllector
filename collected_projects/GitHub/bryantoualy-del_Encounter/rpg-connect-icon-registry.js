/* RPG Connect icon registry v3 — central source: bryantoualy-del/RPG-Connect */
(()=>{'use strict';
const ROOT='https://raw.githubusercontent.com/bryantoualy-del/RPG-Connect/main/';
const creatureBase=ROOT+'assets/icons/creatures/';
const types=['aberration','beast','celestial','construct','dragon','elemental','fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead'];
const labels={aberration:'Aberration',beast:'Bête',celestial:'Céleste',construct:'Artificiel',dragon:'Dragon',elemental:'Élémentaire',fey:'Fée',fiend:'Fiélon',giant:'Géant',humanoid:'Humanoïde',monstrosity:'Monstruosité',ooze:'Vase',plant:'Plante',undead:'Mort-vivant',unknown:'Inconnu'};
const conditionAliases={aveugle:'aveugle',charme:'charme',assourdi:'assourdi',effraye:'effraye',empoisonne:'empoisonne',entrave:'entrave',etourdi:'etourdi',inconscient:'inconscient',invisible:'invisible',paralyse:'paralyse',petrifie:'petrifie',a_terre:'a_terre',agrippe:'agrippe',incapacite:'incapacite',epuisement:'epuisement',epuise:'epuisement'};
const conditionNorm=v=>{const k=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');return conditionAliases[k]||k};
const aliases={humanoide:'humanoid',fee:'fey',celeste:'celestial',mort_vivant:'undead',geant:'giant',fielon:'fiend',plante:'plant',vase:'ooze',artificiel:'construct',monstruosite:'monstrosity',elementaire:'elemental',bete:'beast'};
const norm=v=>{const raw=String(v||'unknown').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();const base=raw.replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');const exact=aliases[base]||base;if(types.includes(exact))return exact;const tokens=base.split('_').filter(Boolean);for(const token of tokens){const mapped=aliases[token]||token;if(types.includes(mapped))return mapped}return exact||'unknown'};
const data=Object.create(null);
const shards=[...Array(10)].map((_,i)=>ROOT+'assets/icon-data/icon-data-'+String(i).padStart(2,'0')+'.json');shards.push(ROOT+'assets/icon-data/condition-icons.json');
const ready=Promise.all(shards.map(u=>fetch(u,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('RPG icon shard '+r.status);return r.json()}))).then(rows=>{for(const row of rows)Object.assign(data,row.icons||{});return api}).catch(err=>{console.warn('RPG Connect extended icons unavailable',err);return api});
const key=(group,name)=>group+'/'+String(name||'').toLowerCase().trim().replace(/[ -]+/g,'_');
const api={
 version:4,source:'RPG-Connect',ready,bossReady:true,creatureTypes:[...types],
 label:t=>labels[norm(t)]||labels.unknown,
 creature:(t,isBoss=false)=>{const k=norm(t);return types.includes(k)?creatureBase+(isBoss?'boss':'standard')+'/'+k+'.webp':''},
 ui:name=>data[key('ui',name)]||null,
 classIcon:name=>data[key('classes',name)]||null,
 magicSchool:name=>data[key('magic-schools',name)]||null,
 inventory:name=>data[key('inventory',name)]||null,
 condition:name=>data[key('conditions',conditionNorm(name))]||null,
 get:async(group,name,options={})=>{await ready;if(group==='creature')return api.creature(name,!!options.boss);const groups={class:'classes',classes:'classes',school:'magic-schools','magic-school':'magic-schools',ui:'ui',inventory:'inventory',condition:'conditions',conditions:'conditions'};return data[key(groups[group]||group,group==='condition'||group==='conditions'?conditionNorm(name):name)]||null}
};
window.RPGConnectIcons=Object.freeze(api);
})();