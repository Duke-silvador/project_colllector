/* Échecs & Jeux IA : passerelle pour une application native Capacitor.
   En PWA web (Safari, Brave ou Netlify), le Bluetooth direct est indisponible.
   Le prototype requiert le plugin natif EJNativeBLE fourni dans /native/.
*/
export const BLE_SERVICE='d8f6bca1-08f0-4bb3-a981-0a1826e91941';
export const BLE_CHARACTERISTIC='d8f6bca2-08f0-4bb3-a981-0a1826e91941';
export const MAX_CHAT_CHARS=160;
export function validChat(text){
  if(typeof text!=='string'||!text.trim()||Array.from(text).length>MAX_CHAT_CHARS)throw Error('Message requis : maximum 160 caractères.');
  if(new TextEncoder().encode(text.trim()).length>500)throw Error('Message trop volumineux pour le Bluetooth.');
  return text.trim();
}
export function nativeBLEPlugin(){
  // Exposé uniquement par la version compilée de l’application.
  return globalThis.Capacitor?.Plugins?.EJNativeBLE || null;
}
export class BLEChat {
  constructor({onStatus=()=>{},onMessage=()=>{}}={}){this.api=nativeBLEPlugin();this.onStatus=onStatus;this.onMessage=onMessage;this.subs=[];this.connected=false;}
  get available(){return !!this.api;}
  async init(){
    if(!this.api)throw Error('Bluetooth natif absent. Installe la version compilée sur iOS ou Android.');
    this.subs.push(await this.api.addListener('bleStatus',e=>{this.connected=e.state==='connected';this.onStatus(e.state);}));
    this.subs.push(await this.api.addListener('bleMessage',e=>{if(typeof e?.text==='string')this.onMessage(e.text);}));
    const status=await this.api.available();if(status.available!==true)throw Error(status.reason||'Bluetooth indisponible sur cet appareil.');
  }
  async host(){await this.api.host();this.onStatus('advertising');}
  async join(){await this.api.join();this.onStatus('scanning');}
  async send(text){if(!this.connected)throw Error('Aucun ami connecté en Bluetooth.');await this.api.send({text:validChat(text)});}
  async close(){try{await this.api?.disconnect();}finally{for(const s of this.subs)await s.remove?.();this.subs=[];this.connected=false;}}
}
