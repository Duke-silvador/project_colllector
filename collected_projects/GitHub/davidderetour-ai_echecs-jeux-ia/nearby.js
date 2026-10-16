/* Liaison WebRTC directe expérimentale via échange manuel de codes.
 * Aucun serveur ni Bluetooth Web. Une connexion Wi-Fi locale/hotspot peut suffire.
 * Les pairs doivent pouvoir s'atteindre sur leur réseau; pas garanti par tous les systèmes.
 */
export function parseSignal(text){
 let value=String(text||'').trim();
 if(value.startsWith('EJIA23:')){
  try{value=decodeURIComponent(escape(atob(value.slice(7))));}catch{throw Error('Code de connexion illisible.');}
 }
 let data;try{data=JSON.parse(value);}catch{throw Error('Code mal formé.');}
 if(data?.app!=='ejia23'||!['offer','answer'].includes(data?.type)||typeof data.sdp!=='string'||data.sdp.length<40||data.sdp.length>30000)throw Error('Code non compatible avec Échecs & Jeux IA 2.3.');
 return data;
}
export function packSignal(description){
 if(!description||!['offer','answer'].includes(description.type)||typeof description.sdp!=='string')throw Error('Signal impossible à générer');
 return 'EJIA23:'+btoa(unescape(encodeURIComponent(JSON.stringify({app:'ejia23',type:description.type,sdp:description.sdp}))));
}
const gathered=(pc)=>new Promise((resolve,reject)=>{
 if(pc.iceGatheringState==='complete'){resolve();return;}
 const timeout=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',check);resolve();},10000);
 const check=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',check);resolve();}};
 pc.addEventListener('icegatheringstatechange',check);
});
export class NearbyPeer{
 constructor(callbacks={}){this.cb=callbacks;this.pc=null;this.channel=null;}
 create(){
  if(typeof RTCPeerConnection==='undefined')throw Error('WebRTC non pris en charge par ce navigateur.');
  this.close();this.pc=new RTCPeerConnection({iceServers:[]});
  this.pc.onconnectionstatechange=()=>this.cb.state?.(this.pc.connectionState);
  this.pc.ondatachannel=e=>this.attach(e.channel);
 }
 attach(channel){this.channel=channel;
  channel.onopen=()=>this.cb.state?.('connected');
  channel.onclose=()=>this.cb.state?.('disconnected');
  channel.onerror=()=>this.cb.state?.('error');
  channel.onmessage=e=>{try{const o=JSON.parse(e.data);this.cb.message?.(o);}catch{}}
 }
 async offer(){this.create();this.attach(this.pc.createDataChannel('echecs-jeux',{ordered:true}));
  await this.pc.setLocalDescription(await this.pc.createOffer());await gathered(this.pc);
  return packSignal(this.pc.localDescription);
 }
 async answer(text){const data=parseSignal(text);if(data.type!=='offer')throw Error('Un code d’invitation est nécessaire.');
  this.create();await this.pc.setRemoteDescription({type:'offer',sdp:data.sdp});
  await this.pc.setLocalDescription(await this.pc.createAnswer());await gathered(this.pc);
  return packSignal(this.pc.localDescription);
 }
 async finish(text){const data=parseSignal(text);if(data.type!=='answer')throw Error('Il faut un code de réponse.');
  if(!this.pc||this.pc.signalingState!=='have-local-offer')throw Error('Crée d’abord une invitation sur cet appareil.');
  await this.pc.setRemoteDescription({type:'answer',sdp:data.sdp});
 }
 send(message){if(this.channel?.readyState!=='open')return false;this.channel.send(JSON.stringify(message));return true;}
 close(){try{this.channel?.close();this.pc?.close();}catch{}this.channel=null;this.pc=null;}
}
