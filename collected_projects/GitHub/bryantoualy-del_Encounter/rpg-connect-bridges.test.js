import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
for(const name of ['Kentaro','Nans','Samoth','Brackmard','Zephyr','Rufus'])test(`${name} : API locale et événements natifs`,async()=>{
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dir=join(root,name),dom=new JSDOM(readFileSync(join(dir,'index.html'),'utf8'),{url:`https://example.test/${name}/`,runScripts:'outside-only',virtualConsole});
 const w=dom.window;
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.URL.createObjectURL=()=>'';w.URL.revokeObjectURL=()=>{};w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.cancelAnimationFrame=id=>w.clearTimeout(id);w.fetch=async()=>({ok:true,status:200,json:async()=>({}),text:async()=>'',blob:async()=>new w.Blob([]),arrayBuffer:async()=>new ArrayBuffer(0)});
 w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});w.visualViewport={width:1024,height:768,offsetTop:0,offsetLeft:0,scale:1,addEventListener(){},removeEventListener(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const scripts=[...w.document.scripts].filter(s=>s.type!=='module').map(node=>{const src=node.getAttribute('src'),code=src?readFileSync(join(dir,src.split('?')[0]),'utf8'):node.textContent;return{src:src||'inline',code}});
 try{
  for(const script of scripts){assert.doesNotThrow(()=>new Function(script.code),name+' · syntaxe invalide : '+script.src)}
  const apiIndex=scripts.findIndex(script=>/companion-api\.js/i.test(script.src));assert.ok(apiIndex>=0,'companion-api.js absent');
  w.eval(scripts.slice(0,apiIndex+1).map(script=>script.code).join('\n;\n'));
  const api=w.CompanionAPI,events=[];assert.ok(w.__CompanionBridge,'bridge local absent');assert.ok(api,'CompanionAPI absent');assert.equal(api.getState().characterId,name.toLowerCase());api.subscribe(event=>events.push(event));
  const before=api.getState().hp.current;api.damage(1);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(api.getState().hp.current,before-1);assert.ok(events.some(e=>e.type==='hp:changed'));
  api.heal(1);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(api.getState().hp.current,before);
  api.nextTurn();await new Promise(resolve=>setTimeout(resolve,0));assert.ok(api.getState().turn.number>=2);api.resetCombat();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(api.getState().turn.number,1);assert.equal(api.getState().turn.round,1);
  const client=readFileSync(join(dir,'rpg-connect-client.js'),'utf8');
  assert.match(client,/event\.type==='state:sync'/,'state sync absent');
  assert.match(client,/event\.type==='conditions:set'/,'condition sync absent');
  assert.match(client,/event\.type==='save:result'/,'save result absent');
  assert.match(client,/event\.type==='attack:decision'/,'GM attack decision absent');
  assert.match(client,/attackTargetLocks/,'attack target lock absent');
  assert.match(client,/mechanics:t\?\.mechanics/,'target mechanics absent');
  assert.match(client,/durationType==='nextAttack'/,'next-attack state support absent');
  const mechanicSource=name==='Rufus'?readFileSync(join(dir,'companion-v3.js'),'utf8'):name==='Samoth'?readFileSync(join(dir,'companion.js'),'utf8'):readFileSync(join(dir,'index.html'),'utf8');
  if(name==='Kentaro'){
    assert.match(mechanicSource,/Perturbations synaptiques[\s\S]{0,2200}requestSave/,'Kentaro Synaptic save is not routed through Encounter');
    assert.match(mechanicSource,/Bannissement[\s\S]{0,2200}requestSave/,'Kentaro Banishment save is not routed through Encounter');
    const html=readFileSync(join(dir,'index.html'),'utf8');
    assert.match(html,/blade\('sun','bonus'(?:,'third')?\)/,'Kentaro bonus Solinar attack path absent');
    assert.match(html,/blade\('moon','bonus'(?:,'third')?\)/,'Kentaro bonus Selhane attack path absent');
    assert.match(html,/pending:\(\)=>S\.pendingHit/,'Kentaro bonus attack is not exposed through the shared pending pipeline');
    assert.match(html,/emitsAttackDamage:true/,'Kentaro explicit damage transport disabled');
    assert.match(html,/attack:damage[^\n]+p\.attackId/,'Kentaro damage is not correlated to the pending attackId');
  }
  if(name==='Brackmard'){
    assert.match(mechanicSource,/brackManeuverSave/,'Brack maneuver saves are not structured');
    assert.match(mechanicSource,/Souffle de la forge[\s\S]{0,1200}requestSave/,'Brack forge breath save is not routed through Encounter');
  }
  if(name==='Rufus'){
    assert.match(mechanicSource,/Dague spectrale \+1[\s\S]{0,900}rufusRequestSave|rufusRequestSave[\s\S]{0,900}Dague spectrale \+1/,'Rufus spectral dagger save is not routed through Encounter');
    assert.match(mechanicSource,/Motif hypnotique[\s\S]{0,1800}rufusRequestSave|rufusRequestSave[\s\S]{0,1800}Motif hypnotique/,'Rufus Hypnotic Pattern save is not routed through Encounter');
  }
  if(name==='Nans'){
    assert.match(mechanicSource,/Présence intimidante[\s\S]{0,1200}requestSave|requestSave[\s\S]{0,1200}Présence intimidante/,'Nans intimidating presence save is not routed through Encounter');
    assert.match(mechanicSource,/Fracas de guerre[\s\S]{0,1400}requestSave|requestSave[\s\S]{0,1400}Fracas de guerre/,'Nans horn crash save is not routed through Encounter');
    assert.match(mechanicSource,/Hurlement du Grand Saccageur[\s\S]{0,1400}requestSave|requestSave[\s\S]{0,1400}Hurlement du Grand Saccageur/,'Nans horn howl save is not routed through Encounter');
  }
  if(name==='Zephyr'){
    assert.match(mechanicSource,/Représailles infernales[\s\S]{0,1400}requestSave|requestSave[\s\S]{0,1400}Représailles infernales/,'Zephyr Hellish Rebuke save is not routed through Encounter');
    assert.match(mechanicSource,/triggerSpellSmite[\s\S]{0,2600}requestSave/,'Zephyr smite saves are not structured');
    assert.match(mechanicSource,/Présence conquérante[\s\S]{0,1200}requestSave|requestSave[\s\S]{0,1200}Présence conquérante/,'Zephyr conquest presence save is not routed through Encounter');
    assert.match(mechanicSource,/Décret de la Corne Brisée[\s\S]{0,1200}requestSave|requestSave[\s\S]{0,1200}Décret de la Corne Brisée/,'Zephyr decree save is not routed through Encounter');
  }
  if(name==='Samoth'){
    assert.match(mechanicSource,/Rayonnement écœurant[\s\S]{0,2200}sendEncounterSave/,'Samoth radiance exposure save is not routed through Encounter');
    assert.match(mechanicSource,/Esprit draconique · Souffle[\s\S]{0,1000}sendEncounterSave|sendEncounterSave[\s\S]{0,1000}Esprit draconique · Souffle/,'Samoth dragon breath save is not routed through Encounter');
  }
  assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));
 }finally{dom.window.close()}
});
