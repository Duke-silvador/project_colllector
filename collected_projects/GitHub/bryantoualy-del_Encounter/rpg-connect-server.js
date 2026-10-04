import {createServer} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {WebSocketServer, WebSocket} from 'ws';

const characters=new Set(['kentaro','samoth','brackmard','rufus','nans','zephyr']);
const key=process.env.RPG_CONNECT_GM_KEY;
if(!key||key.length<24)throw Error('RPG_CONNECT_GM_KEY doit contenir au moins 24 caractères aléatoires.');
const origins=(process.env.RPG_CONNECT_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
const port=Number(process.env.PORT||3000),rooms=new Map();
const random=(bytes=18)=>randomBytes(bytes).toString('base64url');
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y)};
const send=(ws,message)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({v:1,...message}))};
const peers=room=>[...new Set([...room.tokens.keys(),...room.states.keys(),...room.players.keys()])].map(characterId=>({characterId,online:room.players.get(characterId)?.readyState===WebSocket.OPEN,state:room.states.get(characterId)||null}));
const notify=room=>send(room.gm,{type:'roster',room:room.id,payload:{players:peers(room)}});
const server=createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return}res.writeHead(404);res.end()});
const wss=new WebSocketServer({server,maxPayload:65536,verifyClient:({origin},done)=>done(!origins.length||origins.includes(origin),403,'Origin non autorisée')});
wss.on('connection',ws=>{
  let room=null,role=null,characterId=null;ws.isAlive=true;
  ws.on('pong',()=>ws.isAlive=true);
  ws.on('message',raw=>{try{
    const m=JSON.parse(String(raw));if(m.v!==1||typeof m.type!=='string'||!m.type||JSON.stringify(m).length>65000)throw Error('Message invalide');
    if(!role){
      if(m.type!=='hello')throw Error('Identification requise');
      if(m.role==='gm'){
        if(!equal(m.key,key))throw Error('Clé MJ invalide');
        const requested=String(m.room||'').trim();const roomId=requested&&/^[A-Z0-9_-]{6,32}$/i.test(requested)?requested:random(8);room=rooms.get(roomId);
        if(!room){room={id:roomId,gm:null,players:new Map(),tokens:new Map(),states:new Map(),seen:new Set(),pending:new Map()};rooms.set(roomId,room)}
        if(room.gm&&room.gm!==ws)room.gm.close(4001,'Autre session MJ');room.gm=ws;role='gm';send(ws,{type:'welcome',room:room.id,role:'gm',payload:{players:peers(room)}});notify(room);return;
      }
      if(m.role==='player'){
        const r=rooms.get(String(m.room||'')),id=String(m.characterId||'').toLowerCase();if(!r||!characters.has(id)||!equal(m.token,r.tokens.get(id)))throw Error('Invitation invalide');
        room=r;role='player';characterId=id;const old=room.players.get(id);if(old&&old!==ws)old.close(4001,'Nouvelle connexion');room.players.set(id,ws);send(ws,{type:'welcome',room:room.id,role:'player',characterId:id});for(const [commandId,cmd] of room.pending)if(cmd.characterId===id)send(ws,cmd);notify(room);return;
      }
      throw Error('Rôle invalide');
    }
    if(m.type==='invite'&&role==='gm'){const id=String(m.characterId||'').toLowerCase();if(!characters.has(id))throw Error('Personnage inconnu');const token=room.tokens.get(id)||random(24);room.tokens.set(id,token);send(ws,{type:'invite',room:room.id,characterId:id,payload:{token}});return}
    if(m.type==='event'&&role==='player'){
      const e=m.event;if(!e||typeof e.id!=='string'||e.id.length>120||typeof e.type!=='string'||e.characterId!==characterId)throw Error('Événement invalide');
      if(!room.seen.has(e.id)){room.seen.add(e.id);if(room.seen.size>3000)room.seen.delete(room.seen.values().next().value);if(e.type==='state:changed'&&e.payload?.state)room.states.set(characterId,e.payload.state);send(room.gm,{type:'event',room:room.id,characterId,event:e})}
      send(ws,{type:'ack',id:e.id});return;
    }
    if(m.type==='state'&&role==='player'){const value=m.state;if(!value||value.characterId!==characterId||!value.hp)throw Error('État invalide');room.states.set(characterId,value);send(room.gm,{type:'state',room:room.id,characterId,state:value});return}
    if(m.type==='command'&&role==='gm'){
      const e=m.event,id=String(m.characterId||'').toLowerCase();if(!characters.has(id)||!e||typeof e.id!=='string'||e.id.length>120||!/^[A-Za-z][A-Za-z-]*:[A-Za-z][A-Za-z-]*$/.test(e.type)||e.characterId!==id)throw Error('Commande invalide');
      const allowed=new Set(['hp:damage','hp:heal','hp:set','tempHp:set','resource:set','inventory:add','inventory:update','inventory:remove','turn:next','turn:close','turn:end-rejected','turn:grant','attack:decision','message:gm','reaction:requested','initiative:request','targets:set','target:clear','state:sync','conditions:set','defense:turn-ended','enemy:attack-result','save:result']);if(!allowed.has(e.type))throw Error('Commande non autorisée');
      if(!room.pending.has(e.id)){room.pending.set(e.id,{type:'command',room:room.id,characterId:id,event:e});if(room.pending.size>200)room.pending.delete(room.pending.keys().next().value)}
      send(room.players.get(id),room.pending.get(e.id));send(ws,{type:'queued',id:e.id,characterId:id,online:room.players.get(id)?.readyState===WebSocket.OPEN});return;
    }
    if(m.type==='command-ack'&&role==='player'){const command=room.pending.get(m.id);if(command?.characterId===characterId){room.pending.delete(m.id);send(room.gm,{type:'command-ack',id:m.id,characterId,result:m.result||'applied'})}return}
    throw Error('Opération refusée');
  }catch(error){send(ws,{type:'error',message:String(error.message||'Erreur')});if(!role)ws.close(4003,'Accès refusé')}});
  ws.on('close',()=>{if(!room)return;if(role==='gm'&&room.gm===ws)room.gm=null;if(role==='player'&&room.players.get(characterId)===ws)room.players.delete(characterId);notify(room)});
});
const pulse=setInterval(()=>{for(const ws of wss.clients){if(ws.readyState!==WebSocket.OPEN)continue;if(ws.isAlive===false){ws.terminate();continue}ws.isAlive=false;ws.ping()}},30000);pulse.unref();
server.listen(port,()=>console.log(`RPG Connect écoute sur ${server.address().port}`));
export {server,wss,rooms};
