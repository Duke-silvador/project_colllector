/* Shogi pédagogique local. Règles principales : déplacements, échecs, promotion,
   parachutages, nifu, cases mortes, interdiction du mat par parachutage de pion.
   Sennichite / jishogi (répétition / impasse) non encore arbitrés. */
export const SHOGI_NAMES={K:'Roi',R:'Tour',B:'Fou',G:'Général d’or',S:'Général d’argent',N:'Cavalier',L:'Lance',P:'Pion'};
export const SHOGI_SIGNS={K:'王',R:'飛',B:'角',G:'金',S:'銀',N:'桂',L:'香',P:'歩','+R':'龍','+B':'馬','+S':'全','+N':'圭','+L':'杏','+P':'と'};
export const HAND_TYPES=['R','B','G','S','N','L','P'];
const promotionEligible=new Set(['R','B','S','N','L','P']);
const dirsKing=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const dirsGold=[[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]];
const dirsSilver=[[-1,0],[-1,1],[-1,-1],[1,1],[1,-1]];
const orth=[[1,0],[-1,0],[0,1],[0,-1]],diags=[[1,1],[1,-1],[-1,1],[-1,-1]];
const inside=(r,c)=>r>=0&&r<9&&c>=0&&c<9;
const other=s=>s==='b'?'w':'b';
const copy=g=>structuredClone(g);
const piece=(t,side,pr=false)=>({t,side,pr});
export function freshShogi(){
 const b=Array.from({length:9},()=>Array(9).fill(null)),back=['L','N','S','G','K','G','S','N','L'];
 for(let c=0;c<9;c++){b[0][c]=piece(back[c],'w');b[8][c]=piece(back[c],'b');b[2][c]=piece('P','w');b[6][c]=piece('P','b');}
 b[1][1]=piece('R','w');b[1][7]=piece('B','w');b[7][1]=piece('B','b');b[7][7]=piece('R','b');
 return {kind:'shogi',board:b,turn:'b',hand:{b:{},w:{}},ply:0,history:[],over:null};
}
export function shogiPosition(pieces,turn='b',hand={b:{},w:{}}){
 const b=Array.from({length:9},()=>Array(9).fill(null));
 for(const [r,c,t,side,pr=false] of pieces)b[r][c]=piece(t,side,pr);
 return {kind:'shogi',board:b,turn,hand:{b:{...(hand.b||{})},w:{...(hand.w||{})}},ply:0,history:[],over:null};
}
const enemyZone=(side,r)=>side==='b'?r<=2:r>=6;
const lastRank=(side,r)=>side==='b'?r===0:r===8;
const noFuture=(side,t,r)=>['P','L'].includes(t)?lastRank(side,r):t==='N'?(side==='b'?r<=1:r>=7):false;
function pattern(p,dr,dc){
 const forward=p.side==='b'?1:-1,fd=dr*forward, ad=Math.abs(dc), ar=Math.abs(dr);
 if(p.pr&&['P','L','N','S'].includes(p.t))return dirsGold.some(([r,c])=>r===fd&&c===dc)?1:0;
 switch(p.t){
  case 'K':return Math.max(ad,ar)===1?1:0;
  case 'G':return dirsGold.some(([r,c])=>r===fd&&c===dc)?1:0;
  case 'S':return dirsSilver.some(([r,c])=>r===fd&&c===dc)?1:0;
  case 'P':return fd===-1&&dc===0?1:0;
  case 'N':return fd===-2&&ad===1?1:0;
  case 'L':return fd<0&&dc===0?2:0;
  case 'R':return dr===0&&dc!==0||dc===0&&dr!==0?2:p.pr&&ar===1&&ad===1?1:0;
  case 'B':return ar===ad&&ar>0?2:p.pr&&ar+ad===1?1:0;
  default:return 0;
 }
}
function canTravel(g,from,to,p){
 const dr=to.r-from.r,dc=to.c-from.c,mode=pattern(p,dr,dc);
 if(!mode||g.board[to.r][to.c]?.side===p.side)return false;
 if(mode===1)return true;
 const sr=Math.sign(dr),sc=Math.sign(dc);
 for(let r=from.r+sr,c=from.c+sc;r!==to.r||c!==to.c;r+=sr,c+=sc){if(g.board[r][c])return false;}
 return true;
}
export function inShogiCheck(g,side){
 let kr=-1,kc=-1;
 for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(g.board[r][c]?.side===side&&g.board[r][c].t==='K'){kr=r;kc=c;}
 if(kr===-1)return true;
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const p=g.board[r][c];if(p?.side===other(side)&&canTravel(g,{r,c},{r:kr,c:kc},p))return true;}
 return false;
}
function pseudo(g){
 const out=[],side=g.turn;
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){
  const p=g.board[r][c];if(!p||p.side!==side)continue;
  for(let tr=0;tr<9;tr++)for(let tc=0;tc<9;tc++){
   if((tr===r&&tc===c)||g.board[tr][tc]?.t==='K'||!canTravel(g,{r,c},{r:tr,c:tc},p))continue;
   const prom=!p.pr&&promotionEligible.has(p.t)&&(enemyZone(side,r)||enemyZone(side,tr));
   const forced=!p.pr&&noFuture(side,p.t,tr);
   if(prom)out.push({from:{r,c},to:{r:tr,c:tc},promote:true});
   if(!forced)out.push({from:{r,c},to:{r:tr,c:tc},promote:false});
  }
 }
 for(const t of HAND_TYPES){if(!(g.hand[side]?.[t]>0))continue;
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){
   if(g.board[r][c]||noFuture(side,t,r))continue;
   if(t==='P'&&g.board.some(row=>row[c]?.side===side&&row[c].t==='P'&&!row[c].pr))continue;
   out.push({drop:t,to:{r,c}});
  }
 }
 return out;
}
function applyUnchecked(g,m,withHistory=false){
 const n=copy(g),side=n.turn;
 if(withHistory){n.history=(n.history||[]).slice(-31);n.history.push({board:copy(g.board),hand:copy(g.hand),turn:g.turn,ply:g.ply,over:g.over});}
 if(m.drop){n.hand[side][m.drop]--;if(n.hand[side][m.drop]<=0)delete n.hand[side][m.drop];n.board[m.to.r][m.to.c]=piece(m.drop,side);}
 else{
  const p=n.board[m.from.r][m.from.c],captured=n.board[m.to.r][m.to.c];
  if(captured)n.hand[side][captured.t]=(n.hand[side][captured.t]||0)+1;
  n.board[m.from.r][m.from.c]=null;n.board[m.to.r][m.to.c]={...p,pr:p.pr||!!m.promote};
 }
 n.turn=other(side);n.ply++;
 return n;
}
export function shogiMoves(g,{skipPawnDropMate=false}={}){
 if(g?.kind!=='shogi'||g.over)return [];
 const side=g.turn;
 return pseudo(g).filter(m=>{
  const next=applyUnchecked(g,m);
  if(inShogiCheck(next,side))return false;
  if(!skipPawnDropMate&&m.drop==='P'&&inShogiCheck(next,other(side))&&shogiMoves(next,{skipPawnDropMate:true}).length===0)return false;
  return true;
 });
}
const sameMove=(a,b)=>a.drop===b.drop&&a.from?.r===b.from?.r&&a.from?.c===b.from?.c&&a.to?.r===b.to?.r&&a.to?.c===b.to?.c&&!!a.promote===!!b.promote;
export function playShogi(g,m){
 if(!shogiMoves(g).some(x=>sameMove(x,m)))return null;
 const n=applyUnchecked(g,m,true);
 if(shogiMoves(n).length===0)n.over=inShogiCheck(n,n.turn)?{winner:g.turn,reason:'mat'}:{winner:g.turn,reason:'aucun coup légal'};
 return n;
}
export function undoShogi(g){const h=g.history||[];if(!h.length)return null;const prev=h[h.length-1];return {...g,...copy(prev),history:h.slice(0,-1)};}
export function shogiAdvice(g){
 const moves=shogiMoves(g);if(!moves.length)return {move:null,text:'Aucun coup légal disponible.'};
 function value(m){const p=m.drop?null:g.board[m.from.r][m.from.c],capture=g.board[m.to.r][m.to.c];
  const vals={K:10000,R:10,B:8,G:5,S:4,N:3,L:2,P:1};
  let score=capture?(vals[capture.t]||1)*4:0;score+=m.promote?3:0;
  const next=applyUnchecked(g,m);if(inShogiCheck(next,next.turn))score+=2;
  score+=p?.t==='K'?-1:0;return score;
 }
 const move=[...moves].sort((a,b)=>value(b)-value(a))[0];
 const source=move.drop?`Pose ton ${SHOGI_NAMES[move.drop]} capturé`:`Déplace ${SHOGI_NAMES[g.board[move.from.r][move.from.c].t]}`;
 return {move,text:`${source} vers ${String.fromCharCode(65+move.to.c)}${9-move.to.r}${move.promote?' et promeus la pièce':''}. C’est une possibilité légale à examiner, pas un meilleur coup garanti. Vérifie que ton roi reste protégé.`};
}
export function shogiBot(g){
 const moves=shogiMoves(g);if(!moves.length)return null;
 const priority={K:100,R:9,B:8,G:5,S:4,N:3,L:2,P:1};
 const candidates=moves.map(m=>{const target=g.board[m.to.r][m.to.c];return {m,score:(target?priority[target.t]*5:0)+(m.promote?4:0)+Math.random()*3};});
 candidates.sort((a,b)=>b.score-a.score);return candidates[0].m;
}
