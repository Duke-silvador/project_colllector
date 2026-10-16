/* Professeur IA pédagogique : explications locales, sans API ni compte. */
import {botChess,inCheck,moveText,legalMoves,PIECE_NAMES,VALUES} from './engine.js';
import {botMini} from './mini.js';
export function coachAdvice(g,level=3){
 if(!g||g.over)return {title:'Partie terminée',text:'Tu peux lancer une nouvelle partie ou revoir les règles.',move:null};
 if(g.kind==='mini'){
  const m=botMini(g,Math.max(2,level));return {title:'Observe et anticipe',text:'Cherche d’abord un coup autorisé, puis demande-toi ce que l’adversaire pourra faire au tour suivant. Le conseil proposé est calculé sur ton appareil.',move:m};
 }
 const color=g.colors[g.turn],moves=legalMoves(g);if(!moves.length)return {title:'Roi bloqué',text:inCheck(g,color)?'Ton roi est attaqué et ne peut plus être sauvé. C’est un échec et mat.':'Ton roi n’est pas attaqué, mais aucun coup n’est autorisé : c’est un pat.',move:null};
 const m=botChess(g,Math.max(2,level)),p=g.board[m.from.r][m.from.c],t=g.board[m.to.r][m.to.c];
 let text='';
 if(inCheck(g,color))text='Attention, ton roi est en échec ! Commence par le mettre en sécurité. ';
 if(t&&t.color!==color)text+=`Tu peux capturer un ${PIECE_NAMES[t.t]} adverse. Il vaut environ ${VALUES[t.t]} point(s) dans le barème de capture. `;
 else if(p?.t==='P')text+='Un pion avance et ouvre parfois la voie aux autres pièces. ';
 else if(p?.t==='N')text+='Le cavalier saute en L. Il peut attaquer sans suivre une ligne droite. ';
 else if(p?.t==='K')text+='Déplacer le roi demande de vérifier qu’il ne se met pas en danger. ';
 else text+='Ce déplacement développe une pièce ou cherche une meilleure case. ';
 text+=`Essaye : ${moveText(g,m)}. Après ce coup, regarde toujours si ton adversaire peut prendre ta pièce.`;
 return {title:'Le conseil de ton professeur',text,move:m};
}
export const LESSONS=[
 ['Premiers pas','Choisis une pièce, regarde les cases possibles en vert et joue seulement un coup à la fois.'],
 ['Protéger le roi','Quand le roi est menacé : déplacer le roi, capturer l’attaquant ou bloquer la ligne d’attaque.'],
 ['Échanger intelligemment','Compare les valeurs des pièces. Échanger une tour contre un pion n’est normalement pas intéressant.'],
 ['Les échecs à quatre','Rouge, bleu, jaune, vert jouent chacun à leur tour. En équipes, protège aussi ton partenaire.'],
 ['Faire échec et mat','Un mat n’est pas seulement un échec : le roi adverse doit n’avoir AUCUNE défense possible.'],
 ['Les pièges','Avant un coup, pense à la réponse de chacun des adversaires, surtout aux menaces contre ton roi.']
];
