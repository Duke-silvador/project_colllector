/* Sauvegardes portables V2.2. Aucune clé de salon ni URL de serveur n'est exportée. */
export const BACKUP_KEYS = ['jeu-v1','fourmode','level','aimode','players','stats','v2-theme','v25-theme','v25-contrast','v251-pieces','v252-rotation','v252-rotation-mode','v252-view','v252-coordinates','v26-real3d','v2-extra','v2-saves','v23-ai-style','v23-courses','v27-academy-progress','v28-shogi-match','v28-shogi-progress','v28-shogi-options','v24-bigtext','v24-junior-done'];
export const BACKUP_FORMAT = 'echecs-jeux-ia-backup';
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const validGame = g => plain(g) && ['chess','mini'].includes(g.kind) &&
  ((g.kind === 'chess' && Array.isArray(g.board) && ['chess2','chess4'].includes(g.type)) ||
   (g.kind === 'mini' && ['checkers','reversi','connect4','fox','saut','nim','north'].includes(g.id) && (Array.isArray(g.board) || (g.id==='nim' && Array.isArray(g.piles)))));
const validShogi=g=>plain(g)&&g.kind==='shogi'&&Array.isArray(g.board)&&g.board.length===9&&g.board.every(row=>Array.isArray(row)&&row.length===9)&&['b','w'].includes(g.turn)&&plain(g.hand);
const validSlot = s => plain(s) && (typeof s.id === 'string' || typeof s.id === 'number') &&
  typeof s.name === 'string' && s.name.length <= 150 && typeof s.when === 'string' && validGame(s.game);
function validateData(data){
 if(!plain(data))throw Error('La sauvegarde ne contient pas de données valides.');
 for(const [k,v] of Object.entries(data)){
  if(!BACKUP_KEYS.includes(k))throw Error('Champ inconnu dans la sauvegarde : '+k);
  if(k==='v28-shogi-match'&&!validShogi(v))throw Error('Partie de Shogi invalide.');
  if(k==='v28-shogi-progress'&&(!plain(v)||Object.entries(v).some(([id,n])=>!['debut','pieces','promotion','drops','defense','mate','tactics','combat'].includes(id)||!Number.isInteger(n)||n<0||n>3)))throw Error('Progression Shogi invalide.');
  if(k==='v28-shogi-options'&&(!plain(v)||typeof v.perspective!=='boolean'||typeof v.coords!=='boolean'||!Number.isInteger(v.angle)||v.angle<0||v.angle>3||typeof v.againstBot!=='boolean'))throw Error('Options Shogi invalides.');
  if(k==='jeu-v1' && v!==null && !validGame(v))throw Error('Partie principale invalide.');
  if(k==='v2-saves' && (!Array.isArray(v) || v.length>50 || !v.every(validSlot)))throw Error('Liste de parties enregistrées invalide.');
  if(k==='stats' && (!plain(v)||!['xp','lessons','quizzes'].every(f=>Number.isSafeInteger(v[f]) && v[f]>=0)))throw Error('Progression invalide.');
  if(k==='level' && (!Number.isSafeInteger(v)||v<1||v>6))throw Error('Niveau IA invalide.');
  if(k==='players' && (!plain(v)||Object.values(v).some(p=>!['human','bot'].includes(p))))throw Error('Contrôles des joueurs invalides.');
  if(k==='fourmode' && !['chesscom-ffa','chesscom-teams','house-a','house-b','house-teams'].includes(v))throw Error('Mode à 4 invalide.');
  if(k==='aimode' && !['offline','online'].includes(v))throw Error('Mode IA invalide.');
  if(['v2-theme','v25-theme'].includes(k) && !['classic','wood','3d','marble','royal','onyx','neon','junior'].includes(v))throw Error('Thème invalide.');
  if(k==='v251-pieces' && !['sculpted','flat','round'].includes(v))throw Error('Style de pièces invalide.');
  if(k==='v252-rotation' && (!Number.isInteger(v)||v<0||v>3))throw Error('Rotation du plateau invalide.');
  if(k==='v252-rotation-mode' && !['manual','white','camp','turn'].includes(v))throw Error('Orientation du plateau invalide.');
  if(k==='v252-view' && !['flat','depth','cinema'].includes(v))throw Error('Vue 3D invalide.');
  if(k==='v26-real3d' && typeof v!=='boolean')throw Error('Option de vraie 3D invalide.');
  if(k==='v252-coordinates' && typeof v!=='boolean')throw Error('Option de coordonnées invalide.');
  if(k==='v23-ai-style' && !['balanced','offensive','cautious','explorer'].includes(v))throw Error('Style d’IA invalide.');
  if(k==='v25-contrast' && typeof v!=='boolean')throw Error('Option de contraste invalide.');
  if(k==='v24-bigtext' && typeof v!=='boolean')throw Error('Option de texte invalide.');
  if(k==='v24-junior-done' && (!Array.isArray(v)||v.length>30||v.some(x=>!Number.isInteger(x)||x<0||x>30)))throw Error('Résultats Junior invalides.');
  if(k==='v27-academy-progress' && (!plain(v)||Object.entries(v).some(([id,n])=>!['training','mate','lessons','strategy','tactics','combat'].includes(id)||!Number.isInteger(n)||n<0||n>3)))throw Error('Progression du parcours invalide.');
  if(k==='v23-courses' && (!Array.isArray(v)||v.length>9||v.some(i=>!Number.isSafeInteger(i)||i<0||i>8)))throw Error('Progression académie invalide.');
  if(k==='v2-extra' && (!plain(v)||!['tictactoe','memory'].includes(v.id)))throw Error('Jeu bonus invalide.');
 }
 return data;
}
export function makeBackup(data, now=new Date().toISOString()){
 const filtered=Object.fromEntries(BACKUP_KEYS.filter(k=>Object.prototype.hasOwnProperty.call(data,k)).map(k=>[k,data[k]]));
 validateData(filtered);
 return {format:BACKUP_FORMAT,schema:1,createdAt:now,appVersion:'2.8',data:filtered};
}
export function readBackup(text){
 if(typeof text !== 'string' || text.length>10_000_000)throw Error('Fichier trop volumineux (10 Mo maximum).');
 let obj;try{obj=JSON.parse(text)}catch{throw Error('Ce fichier n’est pas un JSON lisible.');}
 if(!plain(obj)||obj.format!==BACKUP_FORMAT||obj.schema!==1)throw Error('Ce fichier n’est pas une sauvegarde Échecs & Jeux IA compatible.');
 validateData(obj.data);return obj;
}
const copy=v=>JSON.parse(JSON.stringify(v));
export function mergeBackup(existing, backup){
 const imported=backup?.format===BACKUP_FORMAT && backup?.schema===1 ? validateData(backup.data) : (()=>{throw Error('Sauvegarde non reconnue.')})();
 const merged=copy(existing); const notes=[];
 const hadCurrent=validGame(merged['jeu-v1']);
 const incomingGame=imported['jeu-v1'];
 // Préserver les préférences existantes, importer seulement les préférences absentes.
 for(const key of BACKUP_KEYS.filter(k=>!['jeu-v1','v2-saves','stats'].includes(k))){
  if(!Object.prototype.hasOwnProperty.call(merged,key) && Object.prototype.hasOwnProperty.call(imported,key)) merged[key]=copy(imported[key]);
 }
 const currentStats=plain(existing.stats)?existing.stats:{xp:0,lessons:0,quizzes:0};
 const incomingStats=plain(imported.stats)?imported.stats:{xp:0,lessons:0,quizzes:0};
 merged.stats={lessons:Math.max(currentStats.lessons||0,incomingStats.lessons||0),quizzes:Math.max(currentStats.quizzes||0,incomingStats.quizzes||0),xp:Math.max(currentStats.xp||0,incomingStats.xp||0)};
 notes.push('Résultats historiques conservés.');
 const shogiBefore=plain(existing['v28-shogi-progress'])?existing['v28-shogi-progress']:{};
 const shogiImport=plain(imported['v28-shogi-progress'])?imported['v28-shogi-progress']:{};
 merged['v28-shogi-progress']=Object.fromEntries(['debut','pieces','promotion','drops','defense','mate','tactics','combat'].map(k=>[k,Math.max(shogiBefore[k]||0,shogiImport[k]||0)]));
 const existingPath=plain(existing['v27-academy-progress'])?existing['v27-academy-progress']:{};
 const incomingPath=plain(imported['v27-academy-progress'])?imported['v27-academy-progress']:{};
 merged['v27-academy-progress']=Object.fromEntries(['training','mate','lessons','strategy','tactics','combat'].map(k=>[k,Math.max(existingPath[k]||0,incomingPath[k]||0)]));
 merged['v24-junior-done']=[...new Set([...(existing['v24-junior-done']||[]),...(imported['v24-junior-done']||[])])].sort((x,y)=>x-y);
 merged['v23-courses']=[...new Set([...(existing['v23-courses']||[]),...(imported['v23-courses']||[])])].sort((x,y)=>x-y);
 const currentSlots=Array.isArray(existing['v2-saves'])?copy(existing['v2-saves']):[];
 const newSlots=Array.isArray(imported['v2-saves'])?imported['v2-saves']:[];
 const seen=new Set(currentSlots.map(s=>JSON.stringify([s.name,s.when,s.game])));
 let added=0,ignored=0;
 const append=(slot)=>{
   const signature=JSON.stringify([slot.name,slot.when,slot.game]);
   if(seen.has(signature))return;
   if(currentSlots.length>=8){ignored++;return;}
   const existingIds=new Set(currentSlots.map(s=>String(s.id)));
   let id=String(slot.id);if(existingIds.has(id)){id='import-'+Date.now()+'-'+currentSlots.length;}
   currentSlots.push({...copy(slot),id});seen.add(signature);added++;
 };
 for(const slot of newSlots)append(slot);
 if(incomingGame && validGame(incomingGame)){
   if(!hadCurrent){merged['jeu-v1']=copy(incomingGame);notes.push('Partie en cours restaurée.');}
   else if(JSON.stringify(existing['jeu-v1'])!==JSON.stringify(incomingGame)){
     append({id:'import-current',name:'Partie importée',when:backup.createdAt||new Date().toISOString(),game:incomingGame});
   }
 }
 merged['v2-saves']=currentSlots;
 notes.push(added+' partie(s) ajoutée(s) dans les emplacements libres.');
 if(ignored)notes.push(ignored+' partie(s) non ajoutée(s) : les 8 emplacements sont occupés. Garde ton fichier de sauvegarde.');
 validateData(Object.fromEntries(BACKUP_KEYS.filter(k=>k in merged).map(k=>[k,merged[k]])));
 return {data:merged,notes,added,ignored};
}
