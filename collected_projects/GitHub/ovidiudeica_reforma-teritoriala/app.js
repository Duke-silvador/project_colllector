import {entityGeometryStyle,selectedStyle,renderLegend,renderGlobalProvenance,entityProvenanceHtml,labelMapControls,wireAtlasSkipLinks} from './atlas-presentation.mjs';
import {createAtlasMobileUi} from './atlas-mobile-ui.mjs';
import {createAtlasExplorerShell} from './atlas-explorer-shell.mjs';
import {createAtlasInfoPanel} from './atlas-info-panel.mjs';
import {createAtlasAdvancedNavigation} from './atlas-advanced-navigation.mjs';
import {createAtlasUrlState,createUrlConfig,defaultViewport} from './atlas-url-state.mjs';
import {createAtlasSearch,createSearchIndex,typeLabel} from './atlas-search.mjs';
import {createAtlasFilters} from './atlas-filters.mjs';
import {ancestorPath,createAtlasTree} from './atlas-tree.mjs';
import {validateConsolidatedHierarchy} from './atlas-hierarchy-validate.mjs';
import {formatEntityName} from './atlas-name-format.mjs';
import {geometryClass,geometryVisible,geometryLabels,geometrySubtypeLabels,createGeometryFilterIndex} from './geometry-taxonomy.mjs';

const map=L.map('map',{zoomControl:true,minZoom:0,maxZoom:19}).setView([46.8,26.6],6);
let osmBasemapVisible=true;
const statisticalPane=map.createPane?.('statistical-boundaries');
if(statisticalPane?.style)statisticalPane.style.zIndex='450';
const osmTiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
function setOsmBasemapVisible(value){
 const visible=Boolean(value);
 if(visible!==osmBasemapVisible){if(visible)osmTiles.addTo(map);else map.removeLayer(osmTiles);osmBasemapVisible=visible;}
 const button=document.getElementById('basemap-toggle');
 if(button){button.setAttribute('aria-pressed',String(visible));button.textContent=visible?'Fundal OSM: activ':'Fundal OSM: dezactivat';button.setAttribute('aria-label',visible?'Fundal OpenStreetMap activ. Dezactivează fundalul':'Fundal OpenStreetMap dezactivat. Activează fundalul');}
}
L.control.scale({imperial:false}).addTo(map);
labelMapControls(document);
const atlasExplorerShell=createAtlasExplorerShell({document,map,window:globalThis.window});

const roots={RO:L.layerGroup().addTo(map),MD:L.layerGroup().addTo(map)};
const tiers=['overview','local','detail'];
const tierGroups=Object.fromEntries(['RO','MD'].flatMap(j=>tiers.map(t=>[j+'_'+t,L.layerGroup()])));
const tierData=new Map();
const chunkData=new Map();
const chunkGroups=new Map();
const geometryRequests=new Map();
let geometrySyncRevision=0;
// Selection and viewport sync share in-flight requests; failed loads remain retryable.
function geometryRequest(key,load){
 if(geometryRequests.has(key))return geometryRequests.get(key);
 const pending=load().finally(()=>geometryRequests.delete(key));
 geometryRequests.set(key,pending);return pending;
}
let chunkIndex=null;
const entityById=new Map();
const activeFilterGroups=new Set(Object.keys(geometryLabels));
const activeGeometryClasses=activeFilterGroups; // Compatibility alias, not a second class state.
const activeGeometrySubtypes=new Set(Object.keys(geometrySubtypeLabels));
let geometryFilterIndex=null;
let atlasFilters=null;
let filtersPanelOpen=false;
let navigationTab='entities';
function setNavigationTab(tab){
 navigationTab=tab==='results'?'results':'entities';
 for(const key of ['entities','results']){
  const selected=key===navigationTab;
  const button=document.getElementById('tab-'+key),panel=document.getElementById(key+'-panel');
  if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
  if(panel)panel.hidden=!selected;
 }
}
function setFiltersPanelOpen(value,{restoreFocus=false}={}){
 filtersPanelOpen=Boolean(value);
 const panel=document.getElementById('filters-panel'),trigger=document.getElementById('filters-toggle');
 if(!panel||!trigger)return;
 panel.hidden=!filtersPanelOpen;panel.inert=!filtersPanelOpen;
 trigger.setAttribute('aria-expanded',String(filtersPanelOpen));
 if(filtersPanelOpen)document.getElementById('filters-close')?.focus?.();
 else if(restoreFocus)trigger.focus?.();
}
function updateFilterCount(){
 const count=document.getElementById('filters-count');if(!count)return;
 const inactive=(geometryFilterIndex?.groups||[]).filter(group=>!activeGeometryClasses.has(group.id)).length+
  [...geometryFilterIndex?.subtypeMembers?.keys?.()||[]].filter(id=>!activeGeometrySubtypes.has(id)).length+
  [1,2,3,'unclassified'].filter(level=>!activeStatisticalLevels.has(level)).length+
  ['RO','MD'].filter(j=>document.getElementById('layer-'+j.toLowerCase())?.checked===false).length+
  Number(!separateStatisticalGeometry);
 count.textContent=inactive?'('+inactive+' '+(inactive===1?'dezactivat':'dezactivate')+')':'';
 const reset=document.getElementById('filters-reset');if(reset)reset.disabled=inactive===0;
}
const activeStatisticalLevels=new Set([1,2,3,'unclassified']);
let separateStatisticalGeometry=true;
const statisticalGroups={RO:L.layerGroup(),MD:L.layerGroup()};
let selectedEntityId=null;
let selectedLayer=null;
let indexData=null;
let releaseData=null;
let hierarchyTree=null;
const hierarchyNodeById=new Map();
const visibleEntityIds=new Set(); // Explicit checkbox state; independent of taxonomy filters.
let atlasTree=null;
let atlasSearch=null;
let atlasUrl=null;
let atlasAdvanced=null;
const mobileMedia=globalThis.window?.matchMedia?.('(max-width: 899px)')||{matches:false};
const atlasMobile=createAtlasMobileUi({document,media:mobileMedia,onClear:clearSelection,isSearchOpen:()=>Boolean(atlasSearch?.state.open)||filtersPanelOpen,onOpen:()=>atlasTree?.revealSelected(),onCloseDrawer:()=>setFiltersPanelOpen(false),onOpenFilters:()=>setFiltersPanelOpen(true)});
wireAtlasSkipLinks({document,mobile:atlasMobile});
const statisticalFeatureById=new Map();
const statisticalGeometryLoaded=new Set();


const filterLabels=geometryLabels;
const statusLabels={
 statistical_identity:'identitate statistică oficială',
 reconciled:'identitate oficială reconciliată',
 outside_current_legal_registry:'reprezentare în afara registrului legal curent',
 reviewed_representation_without_legal_identity:'reprezentare de-facto auditată, fără geometrie juridică atribuită',
 unresolved:'identitate oficială nerezolvată',
 not_bound_to_official_registry:'fără legătură cu registrul oficial în contract'
};

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function filterGroup(entity){return geometryClass(entity);}
function isVisible(entity){
 return Boolean(entity&&visibleEntityIds.has(entity.id)&&geometryVisible(entity,{geometryClasses:activeFilterGroups,geometrySubtypes:activeGeometrySubtypes,statisticalLevels:activeStatisticalLevels,separateStatisticalGeometry}));
}
function styleFor(feature){return entityGeometryStyle(entityById.get(feature.properties?.entity_id));}

const actualReleasePromise=(async()=>{
 const status=document.getElementById('actual-release-status');
 try{
  const [manifestResponse,gateResponse,buildInfoResponse]=await Promise.all([
   fetch('data/current/actual-release-manifest.json',{cache:'no-cache'}),
   fetch('data/current/actual-release-gate.json',{cache:'no-cache'}),
   fetch('public/data/app-build-info.json',{cache:'no-cache'}).catch(()=>({ok:false}))
  ]);
  if(!manifestResponse.ok||!gateResponse.ok)throw new Error('Release ACTUAL indisponibil');
  const [manifest,gate,buildInfo]=await Promise.all([
   manifestResponse.json(),gateResponse.json(),buildInfoResponse.ok?buildInfoResponse.json().catch(()=>null):Promise.resolve(null)
  ]);
  if(gate.status!=='PASS')throw new Error('Release ACTUAL nu a trecut gate-ul combinat');
  if(!manifest.snapshot_id||gate.snapshot_id!==manifest.snapshot_id)throw new Error('Manifestul ACTUAL nu corespunde gate-ului');
  if(!['actual-public-entity-v1','actual-public-entity-v2','actual-public-entity-v3'].includes(manifest.public_contract?.contract))throw new Error('Contractul public ACTUAL lipsește din manifest');
  releaseData={manifest,gate,buildInfo};
  const provenance=renderGlobalProvenance({container:document.getElementById('global-provenance'),document,...releaseData});
  if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='ACTUAL curent: '+manifest.snapshot_id+' · gate '+gate.status+' · publicat: '+(provenance.publication?.tag||'neconfirmat pentru acest snapshot');}
  return releaseData;
 }catch(e){
  if(status){status.setAttribute('role','alert');status.setAttribute('aria-live','assertive');status.textContent='ACTUAL: release indisponibil sau nevalidat. Datele nu au fost activate.';}
  console.error('Nu s-a putut valida release-ul ACTUAL',e);
  throw e;
 }
})();

async function loadIndex(){
 const release=await actualReleasePromise;
 const response=await fetch(release.manifest.public_contract.path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Indexul public ACTUAL este indisponibil');
 const index=await response.json();
 if(index.contract!==release.manifest.public_contract.contract||index.entity_count!==release.manifest.public_contract.entity_count)throw new Error('Indexul public nu corespunde manifestului');
 indexData=index;
 for(const entity of index.entities||[])entityById.set(entity.id,entity);
 geometryFilterIndex=createGeometryFilterIndex(index.entities||[]);
 for(const subtype of geometryFilterIndex.subtypeMembers.keys())activeGeometrySubtypes.add(subtype);
 renderFilters();
 renderLegend({container:document.getElementById('atlas-legend'),document,entities:index.entities});
 renderGlobalProvenance({container:document.getElementById('global-provenance'),document,...releaseData,index});
 wireSearch();
 updateJurisdictionStatus();
 return index;
}

async function loadChunkIndex(){
 const path=releaseData?.manifest?.public_contract?.geometry_chunks?.path;
 if(!path)return null;
 const response=await fetch(path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Indexul chunk-urilor geometrice ACTUAL este indisponibil');
 const data=await response.json();
 if(data.contract!=='actual-public-geometry-chunks-v1'||data.chunk_count!==(data.chunks||[]).length)throw new Error('Index chunk-uri ACTUAL invalid');
 chunkIndex=data;
 return data;
}

function updateJurisdictionStatus(){
 if(!releaseData||!indexData)return;
 for(const j of ['RO','MD']){
  const el=document.getElementById(j.toLowerCase()+'-source-status');
  const gate=releaseData.manifest.jurisdiction_gates?.[j];
  const count=indexData.entity_count_by_jurisdiction?.[j]??0;
  const stamp=gate?.generated_at?new Date(gate.generated_at).toLocaleString('ro-RO'):'—';
  if(el)el.textContent=j+': '+count.toLocaleString('ro-RO')+' entități · gate '+gate?.status+' · '+stamp;
 }
}

function renderFilters(){
 const state={geometryClasses:activeGeometryClasses,geometrySubtypes:activeGeometrySubtypes,statisticalLevels:activeStatisticalLevels,
  get separateStatisticalGeometry(){return separateStatisticalGeometry;}};
 atlasFilters=createAtlasFilters({container:document.getElementById('filter-list'),document,index:geometryFilterIndex,state,
  onSeparate:setSeparateStatisticalGeometry,onChange:()=>{refreshGeometryVisibility();atlasUrl?.commit('push');}});
}
function setSeparateStatisticalGeometry(value){separateStatisticalGeometry=Boolean(value);}
function resetGlobalFilters(){
 activeGeometryClasses.clear();for(const id of Object.keys(geometryLabels))activeGeometryClasses.add(id);
 activeGeometrySubtypes.clear();for(const id of Object.keys(geometrySubtypeLabels))activeGeometrySubtypes.add(id);
 for(const id of geometryFilterIndex?.subtypeMembers?.keys?.()||[])activeGeometrySubtypes.add(id);
 activeStatisticalLevels.clear();for(const level of [1,2,3,'unclassified'])activeStatisticalLevels.add(level);
 setSeparateStatisticalGeometry(true);
 for(const jurisdiction of ['RO','MD']){
  const input=document.getElementById('layer-'+jurisdiction.toLowerCase());
  if(input)input.checked=true;
  roots[jurisdiction].addTo(map);
 }
 refreshGeometryVisibility();syncTiers().catch(console.error);atlasUrl?.commit('push');
}
function refreshGeometryVisibility(){
 atlasFilters?.sync();
 updateFilterCount();
 rerenderLoadedTiers();
 atlasTree?.refreshVisibility();
 updateSelectionVisibility();
 atlasAdvanced?.refresh();
}
function updateSelectionVisibility(){
 const entity=entityById.get(selectedEntityId);
 const status=document.getElementById('selection-visibility');
 const action=document.getElementById('selection-visibility-action');
 if(!status)return;
 if(action)action.hidden=true;
 if(!entity){status.textContent='';return;}
 if(!entity.map?.bbox){status.textContent='Geometria acestei entități nu este disponibilă în snapshot.';return;}
 const checked=visibleEntityIds.has(entity.id);
 const jurisdictionAllowed=document.getElementById('layer-'+entity.jurisdiction.toLowerCase())?.checked!==false;
 if(isVisible(entity)&&jurisdictionAllowed){status.textContent='';return;}
 if(!checked){
  status.textContent='Geometria este ascunsă. Activează explicit această entitate pentru afișare; filtrele rămân independente.';
  if(action){action.hidden=false;action.textContent='Afișează geometria';action.dataset.action='show';}
 }else{
  status.textContent='Geometria este ascunsă de filtre. Selecția și detaliile rămân disponibile.';
  if(action){action.hidden=false;action.textContent='Deschide filtrele';action.dataset.action='filters';}
 }
}

function wireSearch(){
  const input=document.getElementById('entity-search');
  atlasSearch=createAtlasSearch({input,container:document.getElementById('search-results'),status:document.getElementById('search-status'),document,index:createSearchIndex([...entityById.values()],hierarchyNodeById),onSelect:async(id,options)=>{setFiltersPanelOpen(false);setNavigationTab('entities');await selectEntity(id,options);}});
  input.addEventListener('focus',()=>{if(filtersPanelOpen)setFiltersPanelOpen(false);});
  input.addEventListener('input',()=>{if(input.value.trim())setNavigationTab('results');else setNavigationTab('entities');});
  input.addEventListener('keydown',event=>{if(event.key==='Escape')setNavigationTab('entities');});
}

async function loadHierarchyTree(){
 const descriptor=releaseData?.manifest?.public_contract?.hierarchy;
 const container=document.getElementById('hierarchy-tree');
 if(!descriptor?.path){
  if(container)container.innerHTML='<p class="muted">Ierarhia consolidată va fi disponibilă după activarea P2.3.</p>';
  return null;
 }
 const response=await fetch(descriptor.path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Arborele consolidat ACTUAL este indisponibil');
 const tree=await response.json();
 // Fail closed before changing any controller or exposing partially validated nodes.
 const validated=validateConsolidatedHierarchy(tree,entityById,{expectedCount:releaseData.manifest.public_contract.entity_count});
 hierarchyNodeById.clear();
 for(const [id,node] of validated)hierarchyNodeById.set(id,node);
 hierarchyTree=tree;
  visibleEntityIds.clear();
  for(const id of tree.root_ids)visibleEntityIds.add(id);
  renderHierarchyTree();
 atlasSearch?.updateIndex(createSearchIndex([...entityById.values()],hierarchyNodeById));
 atlasAdvanced=createAtlasAdvancedNavigation({
  document,entities:[...entityById.values()],getChecked:()=>visibleEntityIds,
  storage:globalThis.window?.localStorage,
  onOpen:()=>{setFiltersPanelOpen(false);if(atlasMobile.state.mobile&&atlasMobile.state.drawer)atlasMobile.closeDrawer(false);},
  onFocusReturn:origin=>atlasMobile.state.mobile?document.getElementById('mobile-navigation'):origin,
  onCheck:(id,checked)=>{
   if(!entityById.has(id))return;
   if(checked)visibleEntityIds.add(id);else visibleEntityIds.delete(id);
   refreshGeometryVisibility();syncTiers().catch(console.error);atlasUrl?.commit('push');
  },
  onSelect:id=>selectEntity(id,{zoom:true,source:'advanced'}),
  onZoomPair:entities=>{
   if(entities.length!==2||entities.some(entity=>!Array.isArray(entity?.map?.bbox)))return;
   const bounds=entities.map(entity=>entity.map.bbox);
   map.fitBounds([[Math.min(...bounds.map(b=>b[1])),Math.min(...bounds.map(b=>b[0]))],[Math.max(...bounds.map(b=>b[3])),Math.max(...bounds.map(b=>b[2]))]],{padding:[30,30],maxZoom:12});
  }
 });
 return tree;
}

function renderHierarchyTree(){
 const container=document.getElementById('hierarchy-tree');
 if(!container||!hierarchyTree)return;
 const isTreeGeometryVisible=id=>{
  const entity=entityById.get(id);
  return Boolean(entity&&isVisible(entity)&&document.getElementById('layer-'+entity.jurisdiction.toLowerCase())?.checked!==false);
 };
 atlasTree=createAtlasTree({container,nodeById:hierarchyNodeById,rootIds:hierarchyTree.root_ids,document,typeLabel,
  isGeometryVisible:isTreeGeometryVisible,isEntityChecked:id=>visibleEntityIds.has(id),
  onVisibilityChange:(id,checked)=>{
   if(checked)visibleEntityIds.add(id);else visibleEntityIds.delete(id);
   refreshGeometryVisibility();syncTiers().catch(console.error);atlasUrl?.commit('push');
  },
  onDisclosureChange:()=>atlasUrl?.commit('replace'),
  onSelect:(id,options)=>selectEntity(id,options).catch(console.error)});
 if(selectedEntityId){
  atlasTree.select(selectedEntityId);renderDetails(entityById.get(selectedEntityId));updateSelectionVisibility();
 }
}
function selectedPath(id){
 if(!hierarchyTree)return [];
 return ancestorPath(hierarchyNodeById,hierarchyTree.root_ids,id);
}
function renderBreadcrumb(entity){
 const nav=document.createElement('nav');
 nav.className='hierarchy-breadcrumb';nav.setAttribute('aria-label','Ierarhie teritorială');
 const list=document.createElement('ol');
 for(const id of selectedPath(entity.id)){
  const node=hierarchyNodeById.get(id),item=document.createElement('li'),button=document.createElement('button');
  button.type='button';button.className='parent-button';button.textContent=formatEntityName(node.display_name);
  button.dataset.entityId=id;
  if(id===entity.id)button.setAttribute('aria-current','location');
  if(node.statistical_code){
   const code=document.createElement('span');code.className='tree-code';code.textContent=node.statistical_code;button.appendChild(code);
  }
  button.addEventListener('click',()=>selectEntity(id,{zoom:true,source:'breadcrumb'}).catch(console.error));
  item.appendChild(button);list.appendChild(item);
 }
 nav.appendChild(list);
 const body=document.getElementById('details-body');
 if(body.prepend)body.prepend(nav);else body.appendChild(nav);
}

async function ensureStatisticalGeometry(jurisdiction){
 if(statisticalGeometryLoaded.has(jurisdiction))return;
 return geometryRequest('statistical:'+jurisdiction,async()=>{
 const descriptor=releaseData?.manifest?.public_contract?.statistical_geometry?.[jurisdiction];
 if(!descriptor?.path)throw new Error('Lipsește geometria statistică publică pentru '+jurisdiction);
 const response=await fetch(descriptor.path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Nu se poate încărca '+descriptor.path);
 const data=await response.json();
 if(data.metadata?.contract!=='actual-public-statistical-geometry-v1'||data.metadata?.jurisdiction!==jurisdiction)throw new Error('Geometrie statistică publică invalidă '+jurisdiction);
 for(const feature of data.features||[]){
  const id=feature.properties?.entity_id;
  if(geometryClass(entityById.get(id))!=='statistical_only')throw new Error('Geometrie statistică duplicată sau nevalidă: '+id);
  statisticalFeatureById.set(id,feature);
 }
 statisticalGeometryLoaded.add(jurisdiction);
 renderStatisticalGeometry(jurisdiction);
 if(!roots[jurisdiction].hasLayer(statisticalGroups[jurisdiction]))roots[jurisdiction].addLayer(statisticalGroups[jurisdiction]);
 });
}

function tierPath(jurisdiction,tier){
 return releaseData?.manifest?.public_contract?.geometry_tiers?.[jurisdiction]?.[tier]?.path||null;
}
async function ensureTier(jurisdiction,tier){
 const key=jurisdiction+'_'+tier;
 if(tierData.has(key))return tierData.get(key);
 return geometryRequest('tier:'+key,async()=>{
 const path=tierPath(jurisdiction,tier);
 if(!path)throw new Error('Lipsește path-ul pentru '+key);
 const response=await fetch(path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Nu se poate încărca '+path);
 const data=await response.json();
 if(data.metadata?.jurisdiction!==jurisdiction||data.metadata?.tier!==tier)throw new Error('Tier public inconsistent: '+key);
 tierData.set(key,data);
 renderTier(jurisdiction,tier);
 return data;
 });
}

function renderCollection(group,data,options={}){
 if(!group||!data)return;
 group.clearLayers();
 L.geoJSON(data,{
  ...options,
  smoothFactor:0,
  filter:feature=>{
   const entity=entityById.get(feature.properties?.entity_id);
   return Boolean(entity&&isVisible(entity));
  },
  style:styleFor,
  onEachFeature:(feature,layer)=>{
   const id=feature.properties?.entity_id;
   const entity=entityById.get(id);
   if(!entity)return;
   layer.bindTooltip(formatEntityName(entity.display_name),{sticky:true,className:'entity-tooltip'});
   layer.on('click',()=>selectEntity(id,{source:'map'},layer).catch(console.error));
   if(id===selectedEntityId){layer.setStyle(selectedStyle);selectedLayer=layer;}
  }
 }).addTo(group);
}
function renderTier(jurisdiction,tier){
 const key=jurisdiction+'_'+tier;
 renderCollection(tierGroups[key],tierData.get(key));
}
function renderChunk(key){
 renderCollection(chunkGroups.get(key),chunkData.get(key));
}
function renderStatisticalGeometry(jurisdiction){
 renderCollection(statisticalGroups[jurisdiction],{type:'FeatureCollection',features:[...statisticalFeatureById.values()].filter(feature=>entityById.get(feature.properties?.entity_id)?.jurisdiction===jurisdiction)},{pane:'statistical-boundaries'});
}
function rerenderLoadedTiers(){
 selectedLayer=null;
 for(const jurisdiction of statisticalGeometryLoaded)renderStatisticalGeometry(jurisdiction);
 for(const key of tierData.keys()){
  const [jurisdiction,tier]=key.split('_');
  renderTier(jurisdiction,tier);
 }
 for(const key of chunkData.keys())renderChunk(key);
}
function overviewRootIdFor(entity){
 let cursor=entity,depth=0;
 while(cursor&&cursor.map?.tier!=='overview'&&depth++<32)cursor=entityById.get(cursor.hierarchy?.parent_catalog_id)||null;
 return cursor?.map?.tier==='overview'?cursor.id:null;
}
function chunkKey(entry){return entry.jurisdiction+'_'+entry.tier+'_'+entry.root_entity_id;}
function chunkEntries(jurisdiction,tier){
 return (chunkIndex?.chunks||[]).filter(entry=>entry.jurisdiction===jurisdiction&&entry.tier===tier);
}
function bboxIntersectsViewport(bbox){
 if(!Array.isArray(bbox)||bbox.length!==4)return false;
 return map.getBounds().intersects(L.latLngBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]]));
}
async function ensureChunk(entry){
 const key=chunkKey(entry);
 if(chunkData.has(key))return chunkData.get(key);
 return geometryRequest('chunk:'+key,async()=>{
 const response=await fetch(entry.path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Nu se poate încărca '+entry.path);
 const data=await response.json();
 if(data.metadata?.jurisdiction!==entry.jurisdiction||data.metadata?.tier!==entry.tier||data.metadata?.root_entity_id!==entry.root_entity_id)throw new Error('Chunk public inconsistent: '+key);
 if(Number(data.metadata?.feature_count)!==Number(entry.feature_count))throw new Error('Chunk public cu cardinalitate inconsistentă: '+key);
 const group=L.layerGroup();
 chunkGroups.set(key,group);
 chunkData.set(key,data);
 renderChunk(key);
 return data;
 });
}

function tierWanted(tier,zoom){
 if(tier==='overview')return true;
 if(tier==='local')return zoom>=7;
 return zoom>=10;
}
async function syncTiers(){
 const revision=++geometrySyncRevision;
 if(!releaseData||!indexData)return;
 const zoom=map.getZoom();
 for(const jurisdiction of ['RO','MD']){
  const enabled=document.getElementById('layer-'+jurisdiction.toLowerCase())?.checked!==false;
  const overviewGroup=tierGroups[jurisdiction+'_overview'];
  if(enabled){
   await ensureTier(jurisdiction,'overview');
   if(revision!==geometrySyncRevision)return;
   if(!roots[jurisdiction].hasLayer(overviewGroup))roots[jurisdiction].addLayer(overviewGroup);
  }
  for(const tier of ['local','detail']){
   const legacyGroup=tierGroups[jurisdiction+'_'+tier];
   if(chunkIndex){
    if(roots[jurisdiction].hasLayer(legacyGroup))roots[jurisdiction].removeLayer(legacyGroup);
    const wanted=new Set();
    if(enabled&&tierWanted(tier,zoom)){
     for(const entry of chunkEntries(jurisdiction,tier)){
      const root=entityById.get(entry.root_entity_id);
      if(!root||!bboxIntersectsViewport(root.map?.bbox))continue;
      const key=chunkKey(entry);
      wanted.add(key);
      await ensureChunk(entry);
      if(revision!==geometrySyncRevision)return;
      const group=chunkGroups.get(key);
      if(group&&!roots[jurisdiction].hasLayer(group))roots[jurisdiction].addLayer(group);
     }
    }
    for(const [key,group] of chunkGroups){
     if(!key.startsWith(jurisdiction+'_'+tier+'_'))continue;
     if(!wanted.has(key)&&roots[jurisdiction].hasLayer(group))roots[jurisdiction].removeLayer(group);
    }
   }else{
    if(enabled&&tierWanted(tier,zoom)){
     await ensureTier(jurisdiction,tier);
     if(revision!==geometrySyncRevision)return;
     if(!roots[jurisdiction].hasLayer(legacyGroup))roots[jurisdiction].addLayer(legacyGroup);
    }else if(roots[jurisdiction].hasLayer(legacyGroup))roots[jurisdiction].removeLayer(legacyGroup);
   }
  }
 }
}

function clearSelection(){
 selectedEntityId=null;
 atlasMobile.selection(null);
 document.getElementById('details-summary').textContent='';
 document.getElementById('selection-visibility').textContent='';
 const visibilityAction=document.getElementById('selection-visibility-action');if(visibilityAction)visibilityAction.hidden=true;
 document.getElementById('geometry-status').textContent='';
 atlasTree?.clear();
 if(selectedLayer){selectedLayer.setStyle(styleFor(selectedLayer.feature));selectedLayer=null;}
 rerenderLoadedTiers();

 document.getElementById('details-title').textContent='Nicio selecție';
 document.getElementById('details-body').innerHTML='<p class="muted">Selectează o limită de pe hartă sau caută o entitate după nume ori identificator.</p>';
 atlasUrl?.commit('push');
}

function detailRow(label,value){
 return '<dt>'+escapeHtml(label)+'</dt><dd>'+escapeHtml(value==null||value===''?'—':value)+'</dd>';
}
function renderDetails(entity){
 const title=document.getElementById('details-title');
 const body=document.getElementById('details-body');
 title.textContent=formatEntityName(entity.display_name);
 document.getElementById('details-summary').textContent=typeLabel(entity.representation.inferred_type);
 body.innerHTML=
  '<section class="details-section"><span class="tag'+(entity.validation.legal_identity_status==='unresolved'?' warning-tag':'')+'">'+escapeHtml(statusLabels[entity.validation.legal_identity_status]||entity.validation.legal_identity_status)+'</span><dl class="kv" style="margin-top:10px">'+
  detailRow('Jurisdicție',entity.jurisdiction)+detailRow('Clasă geometrică',filterLabels[geometryClass(entity)]||'Limită statistică separată')+
  '</dl></section>'+entityProvenanceHtml(entity,{typeLabel,statusLabel:value=>statusLabels[value]||value});
 renderBreadcrumb(entity);
 const zoomButton=body.querySelector('#zoom-selected');
 if(zoomButton)zoomButton.addEventListener('click',()=>zoomToEntity(entity));
 const compare=document.createElement('button');compare.type='button';compare.id='compare-selected';compare.className='action-button';compare.textContent='Adaugă la comparație';compare.addEventListener('click',()=>atlasAdvanced?.addCompare(entity.id));body.appendChild(compare);
}

function zoomToEntity(entity,options={}){
 const b=entity.map?.bbox;
 if(Array.isArray(b)&&b.length===4)map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[30,30],maxZoom:12,...options});
}
async function selectEntity(id,options=false,clickedLayer=null){
 try{return await (atlasUrl?atlasUrl.action('push',()=>applySelection(id,options,clickedLayer)):applySelection(id,options,clickedLayer));}
 catch(error){if(selectedEntityId===id)document.getElementById('geometry-status').textContent='Geometria nu a putut fi încărcată pentru '+id+'. Identitatea și selecția rămân disponibile.';throw error;}
}
async function applySelection(id,options=false,clickedLayer=null){
 const {zoom=false,source}=typeof options==='boolean'?{zoom:options}:options;
 const entity=entityById.get(id);
 if(!entity)return;
 // Validate and materialize the consolidated path before updating selection.
 try{atlasTree?.select(id);}catch(error){
  console.error('Atlas selection failed for '+id,error);
  const status=document.getElementById('hierarchy-error');
  if(status)status.textContent='Ierarhie indisponibilă pentru '+id;
  throw error;
 }
 const status=document.getElementById('hierarchy-error');
 if(status)status.textContent='';
 if(selectedLayer){selectedLayer.setStyle(styleFor(selectedLayer.feature));selectedLayer=null;}
 selectedEntityId=id;
 document.getElementById('geometry-status').textContent='';
 atlasMobile.selection(id,{source});
 renderDetails(entity);
 updateSelectionVisibility();
 rerenderLoadedTiers();
 atlasAdvanced?.record(id);
 if(!isVisible(entity))return;
 if(zoom)zoomToEntity(entity,source==='url'?{animate:false}:{});

 updateSelectionVisibility();
 if(entity.category==='statistical'){
  await ensureStatisticalGeometry(entity.jurisdiction);
  const feature=statisticalFeatureById.get(entity.id);
  if(!feature)throw new Error('Lipsește geometria statistică pentru '+entity.id);
  if(selectedEntityId!==id||!isVisible(entity))return;
  renderStatisticalGeometry(entity.jurisdiction);
  return;
 }
 if(entity.map.tier==='overview'||!chunkIndex)await ensureTier(entity.jurisdiction,entity.map.tier);
 else{
  const rootId=overviewRootIdFor(entity);
  const entry=chunkEntries(entity.jurisdiction,entity.map.tier).find(item=>item.root_entity_id===rootId);
  if(!entry)throw new Error('Lipsește chunk-ul pentru '+entity.id);
  await ensureChunk(entry);
 }
 await syncTiers();
 if(selectedEntityId!==id||!isVisible(entity))return;
 for(const group of [...Object.values(tierGroups),...chunkGroups.values(),...Object.values(statisticalGroups)]){
  group.eachLayer(container=>{
   const inspect=layer=>{
    if(layer.feature?.properties?.entity_id===id){layer.setStyle(selectedStyle);selectedLayer=layer;}
   };
   if(typeof container.eachLayer==='function')container.eachLayer(inspect);else inspect(container);
  });
 }
}

function captureUrlState(){
 const current=map.getCenter?.()||{lat:defaultViewport.lat,lng:defaultViewport.lon};
 const center=map.wrapLatLng?.(current)||current;
 return {osmBasemapVisible,entityId:selectedEntityId,viewport:{lat:center.lat,lon:center.lng,z:map.getZoom()},viewportExplicit:true,jurisdictions:['RO','MD'].filter(j=>document.getElementById('layer-'+j.toLowerCase()).checked),geometryClasses:activeGeometryClasses,geometrySubtypes:activeGeometrySubtypes,statisticalLevels:activeStatisticalLevels,separateStatisticalGeometry,openIds:atlasTree.getOpenIds(),visibleEntityIds};
}
async function applyUrlState(state){
 const replace=(target,values)=>{target.clear();for(const value of values)target.add(value);};
 replace(activeGeometryClasses,state.geometryClasses);replace(activeGeometrySubtypes,state.geometrySubtypes);replace(activeStatisticalLevels,state.statisticalLevels);replace(visibleEntityIds,state.visibleEntityIds);setSeparateStatisticalGeometry(state.separateStatisticalGeometry);setOsmBasemapVisible(state.osmBasemapVisible);
 for(const j of ['RO','MD']){const enabled=state.jurisdictions.includes(j);document.getElementById('layer-'+j.toLowerCase()).checked=enabled;if(enabled)roots[j].addTo(map);else map.removeLayer(roots[j]);}
 atlasTree.setOpenIds(state.openIds);refreshGeometryVisibility();
 map.setView([state.viewport.lat,state.viewport.lon],state.viewport.z,{animate:false});
 if(state.entityId)await selectEntity(state.entityId,{source:'url',zoom:!state.viewportExplicit});else clearSelection();
 await syncTiers();updateSelectionVisibility();
}
async function initializeUrlState(){
 const browser=globalThis.window;
 if(!browser?.location||!browser?.history||!browser.addEventListener)return;
 const config=createUrlConfig({entityById,nodeById:hierarchyNodeById,rootIds:hierarchyTree.root_ids,filterIndex:geometryFilterIndex});
 atlasUrl=createAtlasUrlState({browser,config,capture:captureUrlState,apply:applyUrlState});await atlasUrl.restore();
}
document.getElementById('copy-link').addEventListener('click',async()=>{
 const status=document.getElementById('share-status');
 try{if(!atlasUrl||!globalThis.navigator?.clipboard?.writeText)throw new Error('Clipboard unavailable');await globalThis.navigator.clipboard.writeText(atlasUrl.shareUrl());status.textContent='Link copiat.';}catch{status.textContent='Copiere indisponibilă. Copiază URL-ul din bara de adrese.';}
});

createAtlasInfoPanel({
 document,
 onOpen:()=>{
  setFiltersPanelOpen(false);
  if(atlasMobile.state.mobile&&atlasMobile.state.drawer)atlasMobile.closeDrawer(false);
 },
 getReturnFocus:()=>document.getElementById(atlasMobile.state.mobile?'mobile-navigation':'info-toggle')
});
document.getElementById('details-close').addEventListener('click',()=>atlasMobile.clear());
document.getElementById('map-home')?.addEventListener('click',()=>{map.setView([defaultViewport.lat,defaultViewport.lon],defaultViewport.z,{animate:false});atlasUrl?.commit('push');});
document.getElementById('explorer-collapse')?.addEventListener('click',()=>atlasExplorerShell.toggleCollapsed?.());
document.getElementById('basemap-toggle')?.addEventListener('click',()=>{setOsmBasemapVisible(!osmBasemapVisible);atlasUrl?.commit('push');});
document.getElementById('filters-toggle')?.addEventListener('click',()=>setFiltersPanelOpen(!filtersPanelOpen));
document.getElementById('filters-close')?.addEventListener('click',()=>setFiltersPanelOpen(false,{restoreFocus:true}));
document.getElementById('filters-reset')?.addEventListener('click',resetGlobalFilters);
document.getElementById('selection-visibility-action')?.addEventListener('click',()=>{
 const entity=entityById.get(selectedEntityId);if(!entity)return;
 const action=document.getElementById('selection-visibility-action');
 if(action?.dataset.action==='show'){
  visibleEntityIds.add(entity.id);refreshGeometryVisibility();syncTiers().catch(console.error);atlasUrl?.commit('push');
 }else if(action?.dataset.action==='filters'){
  if(atlasMobile.state.mobile&&!atlasMobile.state.drawer)atlasMobile.openDrawer();
  setFiltersPanelOpen(true);
 }
});
for(const key of ['entities','results'])document.getElementById('tab-'+key)?.addEventListener('click',()=>setNavigationTab(key));
document.getElementById('tab-entities')?.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();setNavigationTab('results');document.getElementById('tab-results').focus();}});
document.getElementById('tab-results')?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();setNavigationTab('entities');document.getElementById('tab-entities').focus();}});
document.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&filtersPanelOpen){event.preventDefault();setFiltersPanelOpen(false,{restoreFocus:true});}},true);
document.getElementById('layer-ro').addEventListener('change',event=>{updateFilterCount();event.target.checked?roots.RO.addTo(map):map.removeLayer(roots.RO);syncTiers().catch(console.error);atlasTree?.refreshVisibility();updateSelectionVisibility();atlasUrl?.commit('push');});
document.getElementById('layer-md').addEventListener('change',event=>{updateFilterCount();event.target.checked?roots.MD.addTo(map):map.removeLayer(roots.MD);syncTiers().catch(console.error);atlasTree?.refreshVisibility();updateSelectionVisibility();atlasUrl?.commit('push');});
map.on('zoomend moveend',()=>{if(!atlasUrl?.isRestoring)syncTiers().catch(console.error);atlasUrl?.commit('replace');});

const frontendReady=(async()=>{
 let phase='index';
 try{
  await loadIndex();
  phase='hierarchy';await loadHierarchyTree();
  phase='geometry';await loadChunkIndex();
  await initializeUrlState();
  updateFilterCount();
  await Promise.all(['RO','MD'].map(ensureStatisticalGeometry));
  await Promise.all([ensureTier('RO','overview'),ensureTier('MD','overview')]);
  await syncTiers();
 }catch(e){
  console.error('Inițializarea modulului ACTUAL a eșuat',e);
  if(phase==='hierarchy')document.getElementById('hierarchy-error').textContent='Ierarhia consolidată este indisponibilă. Indexul de căutare rămâne încărcat.';
  else if(phase==='geometry')document.getElementById('geometry-load-status').textContent='Geometria este indisponibilă. Identitățile și arborele rămân încărcate.';
  else document.getElementById('filter-list').innerHTML='<p role="alert" class="muted">Indexul ACTUAL nu a putut fi validat. Verifică statusul release-ului.</p>';
 }
})();

export {styleFor,atlasMobile,atlasUrl,captureUrlState,applyUrlState,atlasSearch,frontendReady,entityById,activeFilterGroups,activeGeometryClasses,activeGeometrySubtypes,activeStatisticalLevels,statisticalFeatureById,statisticalGeometryLoaded,statisticalGroups,selectedEntityId,selectEntity,clearSelection,hierarchyNodeById,visibleEntityIds,renderCollection,ensureChunk,ensureTier,syncTiers,chunkGroups,tierGroups,ensureStatisticalGeometry,refreshGeometryVisibility,setSeparateStatisticalGeometry,atlasAdvanced,atlasExplorerShell};
