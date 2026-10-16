/* Parcours original : validation sans étoiles, vies, attente ou niveau verrouillé. */
export const PATH_MODULES=[
 {id:'training',icon:'🎯',name:'Entraînement',subtitle:'Apprendre en déplaçant les pièces',steps:[{type:'board',index:0},{type:'board',index:1},{type:'board',index:3}]},
 {id:'mate',icon:'♔',name:'Échec et mat',subtitle:'Trouver le coup gagnant sur l’échiquier',steps:[{type:'board',index:7}]},
 {id:'lessons',icon:'📖',name:'Apprentissage',subtitle:'Comprendre les règles',steps:[{type:'course',index:0},{type:'course',index:1},{type:'course',index:2}]},
 {id:'strategy',icon:'🧠',name:'Stratégie',subtitle:'Réfléchir avant de jouer',steps:[{type:'course',index:3},{type:'course',index:4},{type:'course',index:5}]},
 {id:'tactics',icon:'⚔️',name:'Tactiques',subtitle:'Reconnaître les combinaisons',steps:[
  {type:'question',title:'Fourchette',lesson:'Une fourchette menace deux pièces avec un seul coup.',question:'Une fourchette attaque…',choices:['Deux pièces au moins','Une seule pièce','Uniquement des pions'],answer:0,why:'Une fourchette oblige souvent l’adversaire à choisir quelle pièce sauver.'},
  {type:'question',title:'Clouage',lesson:'Une pièce est clouée si son déplacement exposerait une pièce plus importante.',question:'Une pièce clouée peut-elle toujours s’échapper ?',choices:['Oui, toujours','Non, parfois elle doit rester devant son roi','Seulement avec le roi'],answer:1,why:'Déplacer une pièce absolument clouée devant le roi serait illégal.'},
  {type:'question',title:'Double attaque',lesson:'Cherche les coups qui attaquent deux menaces à la fois.',question:'Quelle option est une bonne idée tactique ?',choices:['Menacer deux pièces à la fois','Donner sa dame sans raison','Oublier son roi'],answer:0,why:'Une double attaque peut gagner du matériel si l’adversaire ne peut pas tout défendre.'}
 ]},
 {id:'combat',icon:'♟️',name:'Combat',subtitle:'Missions pratiques sur plateau à quatre joueurs',steps:[{type:'board',index:8},{type:'board',index:9},{type:'board',index:10}]}
];
const byId=Object.fromEntries(PATH_MODULES.map(m=>[m.id,m]));
export function cleanPathProgress(input){const out={};for(const m of PATH_MODULES){const n=input?.[m.id];out[m.id]=Number.isInteger(n)?Math.max(0,Math.min(n,m.steps.length)):0;}return out;}
export function pathModule(id){return byId[id]||null;}
export function validateLevel(progress,id,level,success){const m=pathModule(id);const cleaned=cleanPathProgress(progress);if(!m||!success||!Number.isInteger(level)||level!==cleaned[id]||level>=m.steps.length)return {progress:cleaned,advanced:false};cleaned[id]=level+1;return {progress:cleaned,advanced:true};}
