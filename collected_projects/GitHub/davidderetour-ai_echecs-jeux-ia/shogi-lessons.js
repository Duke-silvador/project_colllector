/* Parcours de Shogi original : aucune monnaie, aucun cœur, aucun cadenas.
   Chaque série comprend théorie, question, et manipulation d'un vrai plateau. */
import {shogiPosition} from './shogi-engine.js';
const k=[8,8,'K','b'], wk=[0,8,'K','w'];
const board=(title,lesson,tip,why,pieces,from,to,drop)=>({type:'board',title,lesson,tip,why,pieces,from,to,drop});
const question=(title,lesson,prompt,choices,correct,why,tip)=>({type:'quiz',title,lesson,prompt,choices,correct,why,tip});
export const SHOGI_COURSES=[
 {id:'debut',emoji:'🌸',name:'Découverte',subtitle:'Le plateau, les deux joueurs et le roi',steps:[
  question('Le plateau 9 × 9','Le Shogi se joue sur 81 cases. Le joueur du bas commence.', 'Combien de cases compte le plateau ?',['64','81','100'],1,'Neuf rangées multipliées par neuf colonnes : 81.','Compte neuf colonnes et neuf rangées.'),
  question('Le but de la partie','Comme aux échecs, on cherche à mater le roi adverse.', 'Comment gagne-t-on ?',['En capturant tous les pions','En mettant le roi adverse échec et mat','En occupant le centre'],1,'Un roi mat est attaqué et ne dispose d’aucune défense légale.','Le roi est la pièce la plus importante.'),
  board('Ton premier pion','Le pion avance d’une seule case droit devant lui. Le joueur du bas va vers le haut.','Sélectionne ton pion puis la case juste devant.', 'Le pion ne prend pas en diagonale au Shogi : il capture aussi droit devant.',[k,wk,[6,4,'P','b']],[6,4],[5,4])
 ]},
 {id:'pieces',emoji:'🐴',name:'Déplacement des pièces',subtitle:'Roi, or, argent, cavalier, tour et fou',steps:[
  question('Le général d’or','Le général d’or bouge devant, sur les diagonales avant, sur les côtés et directement derrière.', 'Le général d’or peut-il aller en diagonale vers l’arrière ?',['Oui','Non'],1,'Ses deux diagonales arrière sont interdites.','Souviens-toi : il avance dans trois directions, recule seulement tout droit.'),
  question('Le cavalier japonais','Le cavalier saute de deux cases vers l’avant puis d’une case de côté. Il ne recule jamais.', 'Peut-il sauter par-dessus une pièce ?',['Oui','Non'],0,'Le cavalier est la seule pièce du Shogi qui saute par-dessus les autres.','Il avance en L, uniquement vers l’avant.'),
  board('Déplacer la lance','La lance avance tout droit, de plusieurs cases, tant que le chemin reste libre.','Choisis la lance et avance de trois cases.', 'La lance ne peut pas reculer ni changer de colonne.',[k,wk,[6,2,'L','b']],[6,2],[3,2])
 ]},
 {id:'promotion',emoji:'✨',name:'Promotion',subtitle:'Comprendre la zone des trois dernières rangées',steps:[
  question('Zone de promotion','Les trois rangées les plus éloignées constituent la zone de promotion.', 'Quand une pièce éligible peut-elle être promue ?',['Lorsqu’elle entre, sort ou se déplace dans cette zone','Uniquement quand elle capture','À chaque tour'],0,'La promotion est parfois facultative, parfois obligatoire.','Regarde les trois rangées du fond du camp adverse.'),
  question('Promotion obligatoire','Le pion et la lance sont obligatoirement promus sur la dernière rangée ; le cavalier sur les deux dernières.', 'Un pion arrivant sur sa dernière rangée peut-il rester un pion ?',['Oui','Non'],1,'Il devient obligatoirement un tokin, car sinon il ne pourrait plus avancer.','Il faut que la pièce puisse encore bouger.'),
  board('Promouvoir le pion','Un pion situé juste avant la dernière rangée doit promouvoir en avançant.','Pousse le pion jusqu’à la dernière rangée.', 'Le pion devient « と » (tokin) et se déplace ensuite comme un général d’or.',[k,[0,8,'K','w'],[1,4,'P','b']],[1,4],[0,4])
 ]},
 {id:'drops',emoji:'👐',name:'Pièces capturées',subtitle:'Parachuter une pièce sur une case libre',steps:[
  question('Une pièce capturée revient','Au Shogi, les pièces capturées rejoignent la réserve du vainqueur. Elles peuvent être posées plus tard.', 'De quel côté joue une pièce redéposée ?',['Son ancien propriétaire','Le joueur qui l’a capturée'],1,'Une pièce capturée change de camp et revient non promue.','Le sens de la pointe de la pièce indique son propriétaire.'),
  question('Interdiction du nifu','Le nifu interdit de poser un deuxième pion non promu de ton camp sur une même colonne.', 'Puis-je poser un pion sur une colonne contenant déjà mon pion non promu ?',['Oui','Non'],1,'Il faut choisir une autre colonne ou jouer un autre type de pièce.','Cherche les pions déjà présents sur la colonne.'),
  board('Parachuter un général d’or','Un général d’or capturé est disponible dans ta réserve en bas du plateau.','Appuie sur « Or » dans ta réserve puis sur E5.','Tu viens de redéposer une pièce : une des règles les plus originales du Shogi.',[k,wk],null,[4,4],'G')
 ]},
 {id:'defense',emoji:'🛡️',name:'Protéger son roi',subtitle:'Reconnaître un échec et défendre',steps:[
  question('Échec','Un roi est en échec lorsqu’une pièce adverse menace de le capturer au prochain coup.', 'Que faut-il faire en priorité ?',['Défendre le roi','Capturer un pion ailleurs','Ignorer la menace'],0,'On doit obligatoirement répondre à l’échec.','Cherche un déplacement du roi, une prise ou une interposition.'),
  question('Trois défenses','Contre une attaque à distance, on peut parfois fuir, capturer la pièce menaçante ou interposer une pièce.', 'Quel coup n’est pas autorisé ?',['Bloquer la ligne','Laisser son roi en échec','Déplacer le roi'],1,'Un coup qui laisse ton roi en échec est illégal.','Ton roi doit être en sécurité après le coup.'),
  board('Bloquer une tour','La tour adverse attaque ton roi sur la colonne centrale. Ton général d’or peut bloquer la ligne.', 'Déplace le général d’or en E2, entre la tour et le roi.', 'La pièce d’or intercepte la ligne d’attaque : ton roi est protégé.',[[8,4,'K','b'],wk,[4,4,'R','w'],[7,3,'G','b']],[7,3],[7,4])
 ]},
 {id:'mate',emoji:'♚',name:'Comprendre le mat',subtitle:'Échec, défense et mat en un coup',steps:[
  question('Échec ou mat ?','Échec = roi attaqué. Mat = roi attaqué et aucune défense légale possible.', 'Quand y a-t-il échec et mat ?',['Quand un roi est attaqué et ne peut plus être sauvé','Quand une tour capture un pion','Quand le plateau est plein'],0,'Un échec n’est pas toujours un mat.','Imagine toutes les cases de fuite et les façons de bloquer.'),
  question('Règle du pion parachuté','Au Shogi, on ne peut pas donner immédiatement échec et mat en parachutant un pion.', 'Un mat immédiat par pose d’un pion est-il légal ?',['Oui','Non'],1,'C’est la règle dite uchifuzume. Un mat avec un pion déjà sur le plateau reste possible.','La règle concerne la POSE du pion, pas son déplacement normal.'),
  board('Mat en un coup !','Le roi adverse est coincé par ses propres pièces. Ton général d’or doit le mettre en échec sur la dernière case de fuite.', 'Déplace ton général d’or en E8 pour faire mat.', 'Le roi blanc ne peut ni fuir vers ses propres pièces ni capturer le général d’or, protégé par ta tour.',[[8,8,'K','b'],[0,4,'K','w'],[0,3,'P','w'],[0,5,'P','w'],[1,3,'P','w'],[1,5,'P','w'],[2,4,'G','b'],[3,4,'R','b']],[2,4],[1,4])
 ]},
 {id:'tactics',emoji:'🎯',name:'Tactiques',subtitle:'Capturer, menacer et calculer',steps:[
  question('Pièce non protégée','Une prise est intéressante si la pièce capturée a plus de valeur et si notre pièce peut ensuite être défendue.', 'Avant de capturer, que faut-il regarder ?',['La sécurité de sa pièce et du roi','Uniquement la couleur de la case'],0,'Une prise peut être un piège si elle abandonne son roi ou une pièce importante.','Observe les menaces après ton coup.'),
  question('Menacer à deux endroits','Une double attaque menace deux cibles en un seul coup, avec une tour, un fou ou une pièce promue.', 'Pourquoi est-ce utile ?',['L’adversaire ne peut pas toujours tout sauver','La partie s’arrête immédiatement'],0,'Une double menace peut gagner une pièce.','Attaque deux cibles avec un seul coup.'),
  board('Capture avec la tour','Ta tour peut capturer le fou adverse sur sa rangée.', 'Déplace la tour jusqu’à la case du fou.', 'Après la prise, le fou rejoint ta réserve. Tu pourras le parachuter au prochain tour.',[k,wk,[4,4,'R','b'],[4,1,'B','w']],[4,4],[4,1])
 ]},
 {id:'combat',emoji:'🏯',name:'Combat guidé',subtitle:'Mettre en pratique défense et attaque',steps:[
  question('Préparer un combat','Avant d’attaquer, vérifie les menaces sur ton roi et tes pièces exposées.', 'Quelle habitude est utile à chaque coup ?',['Vérifier la sécurité du roi','Jouer toujours son pion de gauche'],0,'La sécurité du roi est prioritaire.','Avant de jouer : est-ce que mon roi peut être attaqué ?'),
  question('Penser au prochain tour','Dans un combat, tu dois prévoir la réponse possible de l’adversaire.', 'À quoi sert de calculer une réponse ?',['À anticiper les défenses et les prises','À déplacer deux fois de suite'],0,'Un bon coup tient compte de la meilleure réponse ennemie.','Imagine « je joue ceci, il répond cela ».'),
  board('Ton premier combat','Déplace ton pion vers le camp adverse sans exposer ton roi.', 'Avance ton pion d’une case.', 'Bien joué ! Tu peux maintenant lancer une partie entière contre l’ordinateur.',[k,wk,[6,4,'P','b']],[6,4],[5,4])
 ]}
];
export const shogiCourse=id=>SHOGI_COURSES.find(c=>c.id===id);
export const shogiProgressClean=old=>Object.fromEntries(SHOGI_COURSES.map(c=>[c.id,Number.isInteger(old?.[c.id])?Math.max(0,Math.min(c.steps.length,old[c.id])):0]));
export function shogiPass(progress,id,index,success){const p=shogiProgressClean(progress),c=shogiCourse(id);if(!success||!c||index!==p[id]||index>=c.steps.length)return {progress:p,advanced:false};p[id]++;return {progress:p,advanced:true};}
export function shogiPuzzle(step){return shogiPosition(step.pieces,'b',step.drop?{b:{[step.drop]:1},w:{}}:undefined);}
