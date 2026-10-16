/* Deux jeux supplémentaires entièrement hors ligne. */
export const EXTRA_GAMES=[
 {id:'tictactoe',name:'Morpion',emoji:'⭕',sub:'Trois symboles alignés contre une IA locale'},
 {id:'memory',name:'Jeu des paires',emoji:'🧩',sub:'Retrouve 8 paires de symboles et entraîne ta mémoire'}
];
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function newExtra(id){if(id==='tictactoe')return {id,board:Array(9).fill(''),over:null,turn:'X',moves:0};if(id==='memory'){
 const symbols=['♚','♛','♜','♝','♞','♟','★','☀'];const cards=symbols.flatMap(s=>[s,s]);
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 return {id,cards,open:[],found:[],turns:0,over:false};
}throw Error('Jeu inconnu');}
export function winner(board){for(const line of LINES){if(board[line[0]]&&board[line[0]]===board[line[1]]&&board[line[1]]===board[line[2]])return board[line[0]];}return board.every(Boolean)?'draw':null;}
export function ticBot(board,level=2){const blank=board.flatMap((x,i)=>x?[]:[i]);if(!blank.length)return null;
 if(level===1&&Math.random()<.6)return blank[Math.floor(Math.random()*blank.length)];
 for(const p of ['O','X'])for(const x of blank){let a=[...board];a[x]=p;if(winner(a)===p)return x;}
 if(board[4]==='')return 4;
 const corners=blank.filter(i=>[0,2,6,8].includes(i));return (corners.length?corners:blank)[Math.floor(Math.random()*(corners.length?corners:blank).length)];}
export function stepExtra(g,index,level=2){const n=structuredClone(g);if(g.id==='tictactoe'){
 if(n.over||index<0||index>8||n.board[index])return null;
 n.board[index]='X';n.moves++;n.over=winner(n.board);if(!n.over){const b=ticBot(n.board,level);if(b!==null){n.board[b]='O';n.moves++;n.over=winner(n.board);}}return n;
}
 if(n.over||index<0||index>15||n.found.includes(index)||n.open.includes(index)||n.open.length>=2)return null;
 n.open.push(index);if(n.open.length===2){n.turns++;if(n.cards[n.open[0]]===n.cards[n.open[1]]){n.found.push(...n.open);n.open=[];n.over=n.found.length===16;}}
 return n;
}
export function hideUnmatched(g){if(g.id!=='memory'||g.open.length!==2)return g;return {...g,open:[]};}
