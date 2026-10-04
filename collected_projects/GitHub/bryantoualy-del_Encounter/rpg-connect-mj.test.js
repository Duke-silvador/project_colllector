import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import WebSocket from 'ws';
process.env.RPG_CONNECT_GM_KEY='test-key-abcdefghijklmnopqrstuvwxyz';process.env.PORT='0';
const {server,wss}=await import('./rpg-connect-server.js');await new Promise(r=>server.listening?r():server.once('listening',r));
const url=`ws://127.0.0.1:${server.address().port}`;
const until=fn=>new Promise((resolve,reject)=>{let start=Date.now();const check=()=>fn()?resolve():Date.now()-start>2000?reject(Error('timeout')):setTimeout(check,10);check()});
const wait=(ws,type)=>new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('timeout '+type)),2000);let fn=data=>{let m=JSON.parse(String(data));if(m.type!==type)return;clearTimeout(timer);ws.off('message',fn);resolve(m)};ws.on('message',fn)});
const waitCommand=(ws,eventType)=>new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('timeout command '+eventType)),2000);let fn=data=>{let m=JSON.parse(String(data));if(m.type!=='command'||m.event?.type!==eventType)return;clearTimeout(timer);ws.off('message',fn);resolve(m.event)};ws.on('message',fn)});
const waitSession=(ws,phase)=>new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('timeout session '+phase)),2000);let fn=data=>{let m=JSON.parse(String(data));if(m.type!=='command'||m.event?.type!=='message:gm'||m.event?.payload?.session?.phase!==phase)return;clearTimeout(timer);ws.off('message',fn);resolve(m.event.payload.session)};ws.on('message',fn)});
const send=(ws,m)=>ws.send(JSON.stringify({v:1,...m}));
test('ENCOUNTER reçoit l’état et route les dégâts au compagnon sans double mutation',async()=>{
 const dom=new JSDOM('<!doctype html><body><header class="topbar"></header></body>',{url:'https://biggie-mj.github.io/Table-de-jeu/',runScripts:'outside-only'});
 let player=null;
 try{
 dom.window.WebSocket=WebSocket;let copied='';Object.defineProperty(dom.window.navigator,'clipboard',{value:{writeText:async value=>{copied=String(value)}}});Object.defineProperty(dom.window.crypto,'randomUUID',{value:()=>Math.random().toString(36).slice(2)});
 dom.window.eval(`window.state={ui:{mode:'prep'},encounter:{participants:[{id:'p1',name:'Samoth',kind:'player',hp:72,maxHp:72,tempHp:0,ac:14,initiative:0},{id:'p2',name:'Nans',kind:'player',hp:95,maxHp:95,tempHp:0,ac:16,initiative:7},{id:'e1',name:'Gobelin A',kind:'enemy',hp:30,maxHp:30,tempHp:0,ac:13,initiative:5,conditions:[{id:'restrained-1',name:'Entravé'}]},{id:'e2',name:'Gobelin B',kind:'enemy',hp:30,maxHp:30,tempHp:0,ac:13,initiative:4,conditions:[]}],log:[],round:1,currentTurn:0,selectedId:null}};window.localDamage=0;window.__rolls=[];window.saveState=()=>{};window.render=()=>{};window.log=()=>{};window.actionEntries=[];window.actionLog=(msg,title)=>actionEntries.push({msg,title});window.checkpoint=()=>{};window.sortedParticipants=()=>[...state.encounter.participants].sort((a,b)=>b.initiative-a.initiative);window.activeParticipant=()=>sortedParticipants()[state.encounter.currentTurn]||null;window.processStartTurn=()=>{};window.setMode=mode=>{state.ui.mode=mode};window.modelFor=p=>p?.kind==='enemy'?{type:'humanoïde',saveMods:{DEX:2,FOR:1},abilities:{DEX:14,FOR:12}}:null;window.effectiveAc=p=>p.ac;window.isLair=()=>false;window.conditionImmune=()=>false;window.addConditionMany=(ids,data)=>{for(const id of ids){const p=state.encounter.participants.find(x=>x.id===id);if(p){p.conditions=p.conditions||[];p.conditions.push({id:'test-'+p.conditions.length,...data})}}};window.rollD20=()=>({roll:(window.__rolls.shift()??10)});window.applyDamageMany=(ids,amount)=>{localDamage+=amount};window.applyHealMany=()=>{};window.applyDamageDirect=(target,amount)=>{if(target?.kind==='enemy'){target.hp=Math.max(0,target.hp-amount);return{amount}}localDamage+=amount;return{amount}};window.applyHealDirect=()=>{};window.actualAdvanceTurn=()=>{}`);
 dom.window.eval(readFileSync(new URL('./rpg-connect-mj.js',import.meta.url),'utf8'));
 dom.window.document.querySelector('#rpgMjEndpoint').value=url;dom.window.document.querySelector('#rpgMjKey').value=process.env.RPG_CONNECT_GM_KEY;dom.window.document.querySelector('#rpgMjConnect').click();await until(()=>dom.window.RPGConnectMJ.getStatus().connected);const room=dom.window.RPGConnectMJ.getStatus().room;
 dom.window.document.querySelector('[data-invite="samoth"]').click();await until(()=>!!dom.window.document.querySelector('[data-copy="samoth"]'));dom.window.document.querySelector('[data-copy="samoth"]').click();await until(()=>copied.startsWith('RPGCONNECT|'));
 const token=copied.split('|').at(-1);
 player=new WebSocket(url);await new Promise(r=>player.once('open',r));let joined=wait(player,'welcome');send(player,{type:'hello',role:'player',room,characterId:'samoth',token});await joined;
 dom.window.RPGConnectMJ.bind('samoth','p1');dom.window.RPGConnectMJ.bind('nans','p2');send(player,{type:'state',state:{characterId:'samoth',hp:{current:60,max:72,temp:4},ac:15,concentration:'Hâte',statuses:['dragon invoqué']}});
 await new Promise(r=>setTimeout(r,80));
 assert.equal(dom.window.eval('state.encounter.participants[0].hp'),60);
 assert.equal(dom.window.eval("state.encounter.participants[0].conditions?.some(c=>c.name==='Concentration · Hâte')"),true);
 assert.equal(dom.window.eval("state.encounter.participants[0].conditions?.some(c=>c.name==='dragon invoqué')"),true);
 let prepState=waitSession(player,'preparation'),initiativeCommand=waitCommand(player,'initiative:request');assert.equal(dom.window.RPGConnectMJ.prepareFight(),true);const prep=await prepState;assert.equal(prep.resetCombat,true);const request=await initiativeCommand;assert.equal(request.type,'initiative:request');send(player,{type:'event',event:{id:'samoth-init-1',type:'initiative:rolled',characterId:'samoth',timestamp:new Date().toISOString(),payload:{requestId:request.payload.requestId,dice:[14],chosen:14,bonus:1,total:15,mode:'normal'}}});await until(()=>dom.window.document.querySelector('[data-fight-init="samoth"]')?.value==='15');let validatedState=waitSession(player,'initiative-validated');assert.equal(dom.window.RPGConnectMJ.validateInitiative('samoth',15),true);const validated=await validatedState;assert.equal(validated.phase,'initiative-validated');assert.equal(validated.ready,true);assert.equal(dom.window.eval('state.encounter.participants[0].initiative'),15);assert.equal(dom.window.RPGConnectMJ.getStatus().fight.validated.samoth,true);assert.equal(Array.from(dom.window.RPGConnectMJ.getStatus().fight.roster).join(','),'samoth');send(player,{type:'command-ack',id:request.id,result:'applied'});
 let fightState=waitSession(player,'fight'),turnGrant=waitCommand(player,'turn:grant');assert.equal(dom.window.RPGConnectMJ.startFight(),true);const fightMsg=await fightState;assert.equal(fightMsg.phase,'fight');assert.equal(fightMsg.activeCharacterId,'samoth');assert.equal((await turnGrant).type,'turn:grant');assert.equal(dom.window.eval('state.ui.mode'),'combat');
 let command=waitCommand(player,'hp:damage');dom.window.eval("applyDamageMany(['p1'],8,'froid')");assert.equal((await command).payload.amount,8);
 assert.equal(dom.window.eval('localDamage'),0);assert.equal(dom.window.eval('state.encounter.participants[0].hp'),60);

 dom.window.eval("window.__rolls=[18,3]");
 send(player,{type:'event',event:{id:'samoth-save-dis-1',type:'save:request',characterId:'samoth',timestamp:new Date().toISOString(),payload:{targetId:'e1',ability:'DEX',dc:12,source:'Vortex de test',damage:8,damageType:'froid',condition:'Aveuglé'}}});
 await until(()=>!!dom.window.document.querySelector('[data-save-auto="samoth-save-dis-1"]'));
 assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp"),30);
 assert.equal(dom.window.eval("actionEntries.some(x=>x.title==='RPG Connect · JdS en attente')"),true);
 let saveResultWait=waitCommand(player,'save:result');dom.window.document.querySelector('[data-save-auto="samoth-save-dis-1"]').click();
 const saveDis=await saveResultWait;
 assert.equal(saveDis.payload.mode,'dis');assert.equal(saveDis.payload.automaticFailure,false);assert.deepEqual(saveDis.payload.dice,[18,3]);assert.equal(saveDis.payload.total,5);assert.equal(saveDis.payload.success,false);assert.equal(saveDis.payload.effectiveDamage,8);assert.equal(saveDis.payload.conditionApplied,'Aveuglé');assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp"),22);
 send(player,{type:'command-ack',id:saveDis.id,result:'applied'});

 dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').conditions=[{id:'par-1',name:'Paralysé'}];window.__rolls=[20,20]");
 send(player,{type:'event',event:{id:'samoth-save-auto-1',type:'save:request',characterId:'samoth',timestamp:new Date().toISOString(),payload:{targetId:'e1',ability:'DEX',dc:1,source:'Test paralysie',damage:0}}});
 await until(()=>!!dom.window.document.querySelector('[data-save-auto="samoth-save-auto-1"]'));
 saveResultWait=waitCommand(player,'save:result');dom.window.document.querySelector('[data-save-auto="samoth-save-auto-1"]').click();
 const saveAuto=await saveResultWait;
 assert.equal(saveAuto.payload.mode,'auto-fail');assert.equal(saveAuto.payload.automaticFailure,true);assert.deepEqual(saveAuto.payload.dice,[]);assert.equal(saveAuto.payload.total,0);assert.equal(saveAuto.payload.success,false);
 send(player,{type:'command-ack',id:saveAuto.id,result:'applied'});

 // Save requests may impose disadvantage and carry multiple typed damage components + a structured condition.
 dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').conditions=[];window.__rolls=[17,4]");
 send(player,{type:'event',event:{id:'samoth-save-structured-1',type:'save:request',characterId:'samoth',timestamp:new Date().toISOString(),payload:{targetId:'e1',ability:'DEX',dc:12,source:'Tempête de test',saveMode:'dis',halfOnSuccess:true,components:[{amount:5,type:'contondants'},{amount:9,type:'froid'}],conditions:[{name:'Charmé',durationType:'rounds',remaining:10},{name:'Incapacité',durationType:'rounds',remaining:10}],failureEffect:'Vitesse réduite à 0'}}});
 await until(()=>!!dom.window.document.querySelector('[data-save-manual="samoth-save-structured-1"]'));
 const dieInput=dom.window.document.querySelector('[data-save-die]');dieInput.value='4';
 saveResultWait=waitCommand(player,'save:result');dom.window.document.querySelector('[data-save-manual="samoth-save-structured-1"]').click();
 const structuredSave=await saveResultWait;
 assert.equal(structuredSave.payload.mode,'dis');assert.equal(structuredSave.payload.rollSource,'manual');assert.deepEqual(structuredSave.payload.dice,[4]);assert.equal(structuredSave.payload.total,6);assert.equal(structuredSave.payload.success,false);assert.equal(structuredSave.payload.rawDamage,14);assert.equal(structuredSave.payload.requestedDamage,14);assert.equal(structuredSave.payload.effectiveDamage,14);assert.equal(structuredSave.payload.components.length,2);assert.deepEqual(structuredSave.payload.conditionsApplied,['Charmé','Incapacité']);assert.equal(structuredSave.payload.conditionApplied,'Charmé + Incapacité');assert.equal(structuredSave.payload.failureEffect,'Vitesse réduite à 0');assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp"),8);
 assert.equal(dom.window.eval("actionEntries.some(x=>x.title==='RPG Connect · JdS résolu')"),true);send(player,{type:'command-ack',id:structuredSave.id,result:'applied'});
 dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp=22;state.encounter.participants.find(p=>p.id==='e1').conditions=[]");

 // Attack IDs keep their original target even if a later payload names another target.
 send(player,{type:'event',event:{id:'samoth-roll-a',type:'attack:rolled',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-a',targetId:'e1',target:{id:'e1',name:'Gobelin A'},roll:19,total:19}}});
 await until(()=>dom.window.RPGConnectMJ.getStatus().connected);
 send(player,{type:'event',event:{id:'samoth-dmg-a',type:'attack:damage',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-a',targetId:'e2',amount:5,components:[{amount:5,type:'froid'}]}}});
 await until(()=>dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp")===17);
 assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e2').hp"),30);

 send(player,{type:'event',event:{id:'samoth-roll-b',type:'attack:rolled',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-b',targetId:'e2',target:{id:'e2',name:'Gobelin B'},roll:21,total:21}}});
 send(player,{type:'event',event:{id:'samoth-dmg-b',type:'attack:damage',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-b',targetId:'e1',amount:6,components:[{amount:6,type:'force'}]}}});
 await until(()=>dom.window.eval("state.encounter.participants.find(p=>p.id==='e2').hp")===24);
 assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e1').hp"),17);

 // Encounter remains authoritative even if an outdated client emits an attack while incapacitated.
 dom.window.eval("state.encounter.participants.find(p=>p.id==='p1').conditions=[{id:'pc-par-1',name:'Paralysé'}]");
 send(player,{type:'event',event:{id:'samoth-blocked-roll',type:'attack:rolled',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-blocked',targetId:'e2',target:{id:'e2',name:'Gobelin B'},roll:25,total:25}}});
 await new Promise(resolve=>setTimeout(resolve,20));
 send(player,{type:'event',event:{id:'samoth-blocked-dmg',type:'attack:damage',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'attack-blocked',targetId:'e2',amount:20,components:[{amount:20,type:'force'}]}}});
 await new Promise(resolve=>setTimeout(resolve,40));
 assert.equal(dom.window.eval("state.encounter.participants.find(p=>p.id==='e2').hp"),24);

 dom.window.RPGConnectMJ.getStatus();
 }finally{
  try{dom.window.document.querySelector('#rpgMjDisconnect')?.click()}catch{}
  try{if(player&&player.readyState!==WebSocket.CLOSED)player.terminate()}catch{}
  dom.window.close();
 }
});
test.after(async()=>{for(const ws of wss.clients)ws.terminate();await new Promise(r=>server.close(r))});
