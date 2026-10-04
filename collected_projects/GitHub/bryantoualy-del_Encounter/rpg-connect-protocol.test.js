import {test} from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
process.env.RPG_CONNECT_GM_KEY='test-key-abcdefghijklmnopqrstuvwxyz';process.env.PORT='0';
const {server,wss}=await import('./rpg-connect-server.js');
await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));
const url=`ws://127.0.0.1:${server.address().port}`;
const open=()=>new Promise((resolve,reject)=>{let ws=new WebSocket(url);ws.once('open',()=>resolve(ws));ws.once('error',reject)});
const send=(ws,message)=>ws.send(JSON.stringify({v:1,...message}));
const wait=(ws,type)=>new Promise((resolve,reject)=>{let timer=setTimeout(()=>{ws.off('message',receive);reject(Error('timeout '+type))},1500);function receive(raw){const value=JSON.parse(String(raw));if(value.type!==type)return;clearTimeout(timer);ws.off('message',receive);resolve(value)}ws.on('message',receive)});

test('salle, invitation, événement, déduplication, commande MJ et ack',async()=>{
 const gm=await open();let welcome=wait(gm,'welcome');send(gm,{type:'hello',role:'gm',key:process.env.RPG_CONNECT_GM_KEY});const room=(await welcome).room;assert.ok(room);
 let invite=wait(gm,'invite');send(gm,{type:'invite',characterId:'samoth'});const token=(await invite).payload.token;assert.ok(token.length>24);
 invite=wait(gm,'invite');send(gm,{type:'invite',characterId:'samoth'});assert.equal((await invite).payload.token,token);
 const player=await open();let joined=wait(player,'welcome');send(player,{type:'hello',role:'player',room,characterId:'samoth',token});assert.equal((await joined).characterId,'samoth');
 let initiativeCommand=wait(player,'command');send(gm,{type:'command',characterId:'samoth',event:{id:'gm-init-1',type:'initiative:request',characterId:'samoth',payload:{requestId:'fight-1'}}});const initiativeMessage=await initiativeCommand;assert.equal(initiativeMessage.event.type,'initiative:request');assert.equal(initiativeMessage.event.payload.requestId,'fight-1'); let targetCommand=wait(player,'command');send(gm,{type:'command',characterId:'samoth',event:{id:'gm-targets-1',type:'targets:set',characterId:'samoth',payload:{targets:[{id:'enemy-1',name:'Othrion',creatureType:'dragon',boss:true}],selectedTargetId:null}}});const targetMessage=await targetCommand;assert.equal(targetMessage.event.type,'targets:set');assert.equal(targetMessage.event.payload.targets[0].id,'enemy-1'); let targetAck=wait(gm,'command-ack');send(player,{type:'command-ack',id:'gm-targets-1',result:'applied'});assert.equal((await targetAck).id,'gm-targets-1');
 let initiativeAck=wait(gm,'command-ack');send(player,{type:'command-ack',id:'gm-init-1',result:'applied'});assert.equal((await initiativeAck).id,'gm-init-1');
 const event={id:'samoth-attack-1',type:'attack:rolled',characterId:'samoth',timestamp:new Date().toISOString(),payload:{attackId:'samoth-attack-1',roll:23}};
 let sent=wait(gm,'event'),receipt=wait(player,'ack');send(player,{type:'event',event});assert.equal((await sent).event.id,event.id);assert.equal((await receipt).id,event.id);let duplicate=wait(player,'ack');send(player,{type:'event',event});assert.equal((await duplicate).id,event.id);
 let command=wait(player,'command');send(gm,{type:'command',characterId:'samoth',event:{id:'gm-command-1',type:'hp:damage',characterId:'samoth',payload:{amount:7}}});assert.equal((await command).event.payload.amount,7);
 let ack=wait(gm,'command-ack');send(player,{type:'command-ack',id:'gm-command-1',result:'applied'});assert.equal((await ack).id,'gm-command-1');
 player.close();await new Promise(r=>player.once('close',r));
 let queued=wait(gm,'queued');send(gm,{type:'command',characterId:'samoth',event:{id:'gm-offline-1',type:'tempHp:set',characterId:'samoth',payload:{value:12}}});assert.equal((await queued).online,false);
 const again=await open(),rejoined=wait(again,'welcome'),replayed=wait(again,'command');send(again,{type:'hello',role:'player',room,characterId:'samoth',token});await rejoined;assert.equal((await replayed).event.id,'gm-offline-1');
 let confirmed=wait(gm,'command-ack');send(again,{type:'command-ack',id:'gm-offline-1',result:'applied'});assert.equal((await confirmed).id,'gm-offline-1');
 const fake=await open();let error=wait(fake,'error');send(fake,{type:'hello',role:'gm',key:'incorrect'});assert.match((await error).message,/Clé MJ/);
 gm.close();again.close();fake.close();
});


test('contrat MJ étendu : toutes les commandes Encounter autorisées traversent le serveur',async()=>{
 const gm=await open();let welcome=wait(gm,'welcome');send(gm,{type:'hello',role:'gm',key:process.env.RPG_CONNECT_GM_KEY});const room=(await welcome).room;
 let invite=wait(gm,'invite');send(gm,{type:'invite',characterId:'kentaro'});const token=(await invite).payload.token;
 const player=await open();let joined=wait(player,'welcome');send(player,{type:'hello',role:'player',room,characterId:'kentaro',token});await joined;
 const commandTypes=['state:sync','conditions:set','turn:end-rejected','turn:close','defense:turn-ended','enemy:attack-result','save:result'];
 for(let i=0;i<commandTypes.length;i++){
   const type=commandTypes[i],id='gm-extended-'+i;
   const command=wait(player,'command');
   send(gm,{type:'command',characterId:'kentaro',event:{id,type,characterId:'kentaro',payload:{version:1,text:'test'}}});
   const received=await command;assert.equal(received.event.type,type);
   const ack=wait(gm,'command-ack');send(player,{type:'command-ack',id,result:'applied'});assert.equal((await ack).id,id);
 }
 player.close();gm.close();
});

test.after(async()=>{for(const client of wss.clients)client.terminate();await new Promise(resolve=>server.close(resolve))});
