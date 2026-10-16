/* Atelier de suggestions V2.4. Règles locales explicites : pas de modèle génératif,
   pas d'exécution de code, aucune publication ni envoi automatique. */
export const FEEDBACK_LIMIT=1200;
export const CATEGORIES={
 apparence:'Apparence', puissance:'Intelligence de jeu', reseau:'Réseau / amis', sauvegarde:'Sauvegardes', exercice:'Exercices et magazines', bug:'Réparation / erreur', autre:'Nouvelle fonctionnalité'
};
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function analyseComment(text){
 const original=String(text||'').trim().slice(0,FEEDBACK_LIMIT);
 if(original.length<5)throw Error('Décris ton idée en quelques mots (5 caractères minimum).');
 const s=clean(original);let category='autre',suggestion=null;
 if(/bug|erreur|panne|plante|bloque|ne marche|ecran noir|probleme/.test(s))category='bug';
 else if(/internet|bluetooth|wifi|reseau|ami|connexion|ligne/.test(s))category='reseau';
 else if(/sauveg|recuper|import|export|partie perdue/.test(s))category='sauvegarde';
 else if(/exercice|junior|cours|lecon|professeur|magazine|quiz/.test(s))category='exercice';
 else if(/echiquier|apparence|icone|couleur|texte|lisible|bois|theme|3d|grossir/.test(s))category='apparence';
 else if(/ia|difficil|facile|intelligen|forte|puissance|strategie/.test(s))category='puissance';
 if(/\bbois\b/.test(s))suggestion={kind:'theme',value:'wood',label:'Utiliser le thème bois'};
 else if(/\b3d\b/.test(s))suggestion={kind:'theme',value:'3d',label:'Activer la perspective 3D'};
 else if(/theme classique|echiquier classique/.test(s))suggestion={kind:'theme',value:'classic',label:'Utiliser le thème classique'};
 else if(/grand texte|textes? plus grands?|grossir le texte|agrandir (la |le )?(police|texte)|plus lisible/.test(s))suggestion={kind:'bigtext',value:true,label:'Agrandir les textes'};
 else if(/petit texte|texte normal|reduire le texte/.test(s))suggestion={kind:'bigtext',value:false,label:'Revenir au texte normal'};
 else if(/hors.?ligne|sans internet|offline/.test(s))suggestion={kind:'aimode',value:'offline',label:'Utiliser l’IA locale hors ligne'};
 else if(/\ben ligne\b|serveur ia/.test(s))suggestion={kind:'aimode',value:'online',label:'Choisir le mode IA réseau (serveur requis)'};
 else if(/plus (forte|fort|difficile|intelligente)|niveau expert|ia experte/.test(s))suggestion={kind:'level',value:6,label:'Activer l’IA niveau 6 — Expertise locale'};
 else if(/plus facile|niveau facile|ia facile/.test(s))suggestion={kind:'level',value:2,label:'Passer à une IA plus facile'};
 let response= category==='bug'?'Je peux vérifier le stockage, le mode réseau et le système de mise à jour dans le diagnostic.':
 category==='reseau'?'Le jeu Bluetooth direct n’est pas disponible dans cette application web ; le Wi-Fi local expérimental et les salons avec serveur restent séparés.':
 category==='exercice'?'Je peux te proposer des défis de l’Atelier Junior. Pour en créer de nouveaux, cette demande sera à examiner dans une prochaine version.':
 'J’ai classé ta demande. Je peux appliquer les réglages déjà prévus dans l’application ou conserver l’idée pour une prochaine version.';
 return {message:original,category,categoryLabel:CATEGORIES[category],response,suggestion};
}
export function buildChangeRequest(items){
 const list=(items||[]).filter(it=>it&&typeof it.message==='string').slice(-60).map(it=>({date:it.date||'',category:it.category||'autre',commentaire:it.message.slice(0,FEEDBACK_LIMIT),etat:it.status||'à examiner'}));
 return {format:'echecs-jeux-ia-demandes',version:'2.4',createdAt:new Date().toISOString(),note:'Propositions pour le développeur à valider, aucun changement de code ni déploiement automatique.',demandes:list};
}
export function diagnosticLocal({online=false,serviceWorker=false,storage=false,serverUrl='',mode='offline'}={}){
 return [
 {titre:'Internet',ok:!!online,detail:online?'Connexion détectée':'Hors connexion : les jeux et l’IA locale doivent rester utilisables'},
 {titre:'Cache hors ligne',ok:!!serviceWorker,detail:serviceWorker?'Service worker disponible':'Non détecté : ouvrir le site en HTTPS, puis recharger avec Internet'},
 {titre:'Sauvegardes locales',ok:!!storage,detail:storage?'Stockage accessible, ne pas effacer les données du site':'Stockage indisponible : exporter les parties dès que possible'},
 {titre:'IA choisie',ok:mode==='offline'||!!serverUrl,detail:mode==='offline'?'IA sur cet appareil':serverUrl?'Serveur configuré (non testé ici)':'Mode réseau choisi sans adresse de serveur : repli sur IA locale'}
 ];
}
