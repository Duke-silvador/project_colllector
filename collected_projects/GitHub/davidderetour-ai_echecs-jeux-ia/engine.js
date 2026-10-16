/* Échecs & Jeux IA — moteur autonome, sans dépendance externe.
   Réimplémentation pédagogique : cas rares Chess.com non exhaustivement reproduits. */
export const COLORS4=['red','blue','yellow','green'];
export const PIECE_NAMES={P:'pion',R:'tour',N:'cavalier',B:'fou',Q:'dame',K:'roi'};
export const VALUES={P:1,N:3,B:5,R:5,Q:9,K:20};
const seq='RNBQKBNR',top='RNBKQBNR',left='RNBQKBNR',right='RNBKQBNR';
export const valid=(g,r,c)=>r>=0&&c>=0&&r<g.size&&c<g.size&&(g.size===8||!((r<3||r>10)&&(c<3||c>10)));
const piece=(t,color)=>({t,color,moved:false,promoted:false,dead:false});
const dirs={white:[-1,0],black:[1,0],red:[-1,0],yellow:[1,0],blue:[0,1],green:[0,-1]};
const home={red:'bottom',yellow:'top',blue:'left',green:'right'};
const pos=(r,c)=>({r,c});
const get=(g,r,c)=>valid(g,r,c)?g.board[r][c]:null;
export const team=c=>c==='red'||c==='yellow'?'ry':'bg';
const friendly=(g,a,b)=>a===b||(g.mode.includes('teams')&&team(a)===team(b));
export function newChess(type='chess4',mode=type==='chess4'?'chesscom-ffa':'standard'){
 const size=type==='chess4'?14:8,colors=type==='chess4'?COLORS4:['white','black'];
 const g={kind:'chess',type,mode,size,colors,board:Array.from({length:size},()=>Array(size).fill(null)),turn:0,active:Object.fromEntries(colors.map(c=>[c,true])),scores:Object.fromEntries(colors.map(c=>[c,0])),ply:0,history:[],enPassant:null,over:null,lastCheckBy:{},options:{dead:'frozen'},message:'',lastMove:null};
 if(size===8){for(let c=0;c<8;c++){g.board[0][c]=piece(seq[c],'black');g.board[1][c]=piece('P','black');g.board[6][c]=piece('P','white');g.board[7][c]=piece(seq[c],'white');}return g;}
 for(let x=0;x<8;x++){
  const t=x+3;
  g.board[0][t]=piece(top[x],'yellow');g.board[1][t]=piece('P','yellow');
  g.board[13][t]=piece(seq[x],'red');g.board[12][t]=piece('P','red');
  g.board[t][0]=piece(left[x],'blue');g.board[t][1]=piece('P','blue');
  g.board[t][13]=piece(right[x],'green');g.board[t][12]=piece('P','green');
 }
 return g;
}
const copy=g=>JSON.parse(JSON.stringify(g));
const rayDirs={R:[[1,0],[-1,0],[0,1],[0,-1]],B:[[1,1],[1,-1],[-1,1],[-1,-1]]};
const allDirs=[...rayDirs.R,...rayDirs.B];
function promoRank(g,p,r,c){
 if(g.size===8)return p.color==='white'?r===0:r===7;
 const d=dirs[p.color],isTeam=g.mode.includes('teams');
 const dmax=g.mode==='house-a'?13:(isTeam?10:7); // advancement squares counted from start (piece row 13/0)
 if(p.color==='red')return r<=(13-dmax);
 if(p.color==='yellow')return r>=dmax;
 if(p.color==='blue')return c>=dmax;
 return c<=(13-dmax);
}
function pseudo(g,r,c,onlyAttacks=false){
 const p=get(g,r,c);if(!p||p.dead||g.active[p.color]===false)return [];
 const out=[];
 const add=(nr,nc,extra={})=>{
  if(!valid(g,nr,nc))return false;
  const hit=get(g,nr,nc);
  if(!hit||(!friendly(g,p.color,hit.color))){out.push({from:pos(r,c),to:pos(nr,nc),...extra});}
  return !hit;
 };
 if(p.t==='P'){
  const [dr,dc]=dirs[p.color];const side=dr!==0?[[0,-1],[0,1]]:[[-1,0],[1,0]];
  for(const [sr,sc] of side){const nr=r+dr+sr,nc=c+dc+sc;
   if(!valid(g,nr,nc))continue;
   const hit=get(g,nr,nc);
   if(onlyAttacks){out.push({from:pos(r,c),to:pos(nr,nc)});continue;}
   if(hit&&!friendly(g,p.color,hit.color))add(nr,nc);
   else if(g.enPassant&&nr===g.enPassant.target.r&&nc===g.enPassant.target.c&&g.enPassant.by!==p.color&&g.enPassant.expires>g.ply){
    out.push({from:pos(r,c),to:pos(nr,nc),enpassant:pos(g.enPassant.victim.r,g.enPassant.victim.c)});
   }
  }
  if(onlyAttacks)return out;
  const a=r+dr,b=c+dc;if(valid(g,a,b)&&!get(g,a,b)){
   add(a,b);const a2=a+dr,b2=b+dc;
   if(!p.moved&&valid(g,a2,b2)&&!get(g,a2,b2))add(a2,b2,{double:true});
  }
  return out;
 }
 if(p.t==='N'){
  for(const [dr,dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]])add(r+dr,c+dc);return out;
 }
 if(p.t==='K'){
  for(const [dr,dc] of allDirs)add(r+dr,c+dc);
  if(onlyAttacks||p.moved||inCheck(g,p.color))return out;
  const ranges=g.size===14?(home[p.color]==='bottom'||home[p.color]==='top'?[[0,-1],[0,1]]:[[-1,0],[1,0]]):[[0,-1],[0,1]];
  for(const [dr,dc] of ranges){let nr=r+dr,nc=c+dc,rook=null,clear=true;
   while(valid(g,nr,nc)){
    let q=get(g,nr,nc);
    if(q){if(q.t==='R'&&q.color===p.color&&!q.moved)rook=pos(nr,nc);else clear=false;break;}
    nr+=dr;nc+=dc;
   }
   if(!clear||!rook||!valid(g,r+2*dr,c+2*dc))continue;
   const k1=pos(r+dr,c+dc),k2=pos(r+2*dr,c+2*dc);
   if(attacked(g,k1.r,k1.c,p.color)||attacked(g,k2.r,k2.c,p.color))continue;
   out.push({from:pos(r,c),to:k2,castle:{rookFrom:rook,rookTo:k1}});
  }
  return out;
 }
 const slopes=p.t==='Q'?allDirs:rayDirs[p.t];
 for(const [dr,dc] of slopes){let nr=r+dr,nc=c+dc;while(valid(g,nr,nc)){
  if(!add(nr,nc))break; nr+=dr;nc+=dc;
 }}
 return out;
}
function attacked(g,r,c,kingColor){
 for(let i=0;i<g.size;i++)for(let j=0;j<g.size;j++){
  const p=g.board[i][j];if(!p||p.dead||friendly(g,p.color,kingColor)||g.active[p.color]===false)continue;
  if(pseudo(g,i,j,true).some(m=>m.to.r===r&&m.to.c===c))return true;
 }return false;
}
export function kingSquare(g,color){for(let r=0;r<g.size;r++)for(let c=0;c<g.size;c++)if(g.board[r][c]?.t==='K'&&g.board[r][c]?.color===color)return pos(r,c);return null;}
export function inCheck(g,color){const k=kingSquare(g,color);return k?attacked(g,k.r,k.c,color):false;}
function unchecked(g,m){
 const {r,c}=m.from,to=m.to,old=g.board[to.r][to.c],p=g.board[r][c];
 g.board[to.r][to.c]={...p,moved:true};g.board[r][c]=null;
 if(m.enpassant){g.board[m.enpassant.r][m.enpassant.c]=null;}
 if(m.castle){const a=m.castle.rookFrom,b=m.castle.rookTo;g.board[b.r][b.c]={...g.board[a.r][a.c],moved:true};g.board[a.r][a.c]=null;}
 if(p.t==='P'&&promoRank(g,p,to.r,to.c)){g.board[to.r][to.c]={...g.board[to.r][to.c],t:m.promotion||'Q',promoted:true};}
 return {captured:old};
}
export function legalMoves(g,color=g.colors[g.turn]){
 if(g.over||!g.active[color])return [];
 const moves=[];
 for(let r=0;r<g.size;r++)for(let c=0;c<g.size;c++){
  const p=g.board[r][c];if(!p||p.dead||p.color!==color)continue;
  for(const m of pseudo(g,r,c)){
   // Directly capturing a king is not a legal move, even in the simplified four-player engine.
   const hit=get(g,m.to.r,m.to.c);if(hit?.t==='K')continue;
   const trial=copy(g);unchecked(trial,m);
   if(!inCheck(trial,color))moves.push(m);
  }
 }
 return moves;
}
function advanceTurn(g){
 for(let i=0;i<g.colors.length;i++){
  g.turn=(g.turn+1)%g.colors.length;
  if(g.active[g.colors[g.turn]])return;
 }
}
function eliminate(g,color,why){
 g.active[color]=false;
 if(g.mode==='house-a'&&g.options.dead==='remove')for(let r=0;r<g.size;r++)for(let c=0;c<g.size;c++)if(g.board[r][c]?.color===color)g.board[r][c]=null;
 else if(g.mode==='house-a'&&g.options.dead==='transfer'){
  const winner=g.lastCheckBy[color]||g.colors[(g.turn-1+g.colors.length)%g.colors.length];
  for(let r=0;r<g.size;r++)for(let c=0;c<g.size;c++)if(g.board[r][c]?.color===color)g.board[r][c].color=winner;
 }else for(let r=0;r<g.size;r++)for(let c=0;c<g.size;c++)if(g.board[r][c]?.color===color)g.board[r][c].dead=true;
 if(g.mode==='chesscom-ffa'||g.mode==='house-b')g.scores[g.lastCheckBy[color]||g.colors[(g.turn-1+g.colors.length)%g.colors.length]]+=why==='mat'?20:0;
}
function finishIfNeeded(g){
 if(g.over)return;
 if(g.type==='chess2'){
  const color=g.colors[g.turn];const lm=legalMoves(g,color);
  if(!lm.length)g.over=inCheck(g,color)?{winner:g.colors[1-g.turn],reason:'Échec et mat'}:{winner:null,reason:'Pat'};
  return;
 }
 let loops=0;
 while(loops++<4&&g.active[g.colors[g.turn]]){
  let color=g.colors[g.turn],lm=legalMoves(g,color);
  if(lm.length)break;
  if(!inCheck(g,color)){
   if(g.mode==='chesscom-ffa')g.scores[color]+=20;
   if(g.mode.includes('teams')){g.over={winner:null,reason:'Pat : match nul'};return;}
  }
  const why=inCheck(g,color)?'mat':'pat';eliminate(g,color,why);g.message= color+' éliminé ('+why+')';
  if(g.mode==='chesscom-teams'){
   g.over={winner:team(color)==='ry'?'Bleu + Vert':'Rouge + Jaune',reason:'Un roi adverse est mat'};return;
  }
  if(g.mode==='house-teams'){
   const ry=COLORS4.filter(c=>team(c)==='ry'&&g.active[c]).length,bg=COLORS4.filter(c=>team(c)==='bg'&&g.active[c]).length;
   if(!ry||!bg){g.over={winner:ry?'Rouge + Jaune':'Bleu + Vert',reason:'Deux rois adverses éliminés'};return;}
  }
  advanceTurn(g);
 }
 const alive=g.colors.filter(c=>g.active[c]);
 if(alive.length<=1){
  let winner=alive[0]||null;
  if(g.mode==='chesscom-ffa'||g.mode==='house-b')winner=Object.entries(g.scores).sort((a,b)=>b[1]-a[1])[0][0];
  g.over={winner,reason:'Fin de partie'};
 }
}
export function playMove(g,m){
 const p=get(g,m.from.r,m.from.c);if(!p||p.color!==g.colors[g.turn])return null;
 const legal=legalMoves(g);const chosen=legal.find(x=>x.from.r===m.from.r&&x.from.c===m.from.c&&x.to.r===m.to.r&&x.to.c===m.to.c);
 if(!chosen)return null;
 const n=copy(g);n.history.push({board:g.board,turn:g.turn,active:g.active,scores:g.scores,ply:g.ply,enPassant:g.enPassant,over:g.over,lastCheckBy:g.lastCheckBy,message:g.message,lastMove:g.lastMove||null});if(n.history.length>40)n.history.shift();
 const captured=get(n,m.to.r,m.to.c),capturedEP=chosen.enpassant?get(n,chosen.enpassant.r,chosen.enpassant.c):null;
 const taking=captured||capturedEP;
 unchecked(n,{...chosen,promotion:['Q','R','B','N'].includes(m.promotion)?m.promotion:'Q'});n.lastMove={from:{...m.from},to:{...m.to},color:p.color,capture:!!taking};n.ply++;
 if(n.mode==='chesscom-ffa'||n.mode==='house-b'){
  if(taking&&!taking.dead)n.scores[p.color]+=taking.promoted?1:VALUES[taking.t];
  const count=n.colors.filter(c=>c!==p.color&&n.active[c]&&inCheck(n,c)).length;
  if(count>1)n.scores[p.color]+=n.mode==='house-b'?(count===2?5:20):(count===2?(p.t==='Q'?1:5):(p.t==='Q'?5:20));
 }
 for(const c of n.colors)if(c!==p.color&&n.active[c]&&inCheck(n,c))n.lastCheckBy[c]=p.color;
 if(p.t==='P'&&chosen.double){
  const [dr,dc]=dirs[p.color];n.enPassant={target:pos(m.from.r+dr,m.from.c+dc),victim:pos(chosen.to.r,chosen.to.c),by:p.color,expires:n.ply+(n.colors.length-1)};
 }else if(n.enPassant&&n.enPassant.expires<=n.ply)n.enPassant=null;
 advanceTurn(n);finishIfNeeded(n);return n;
}
export function undo(g){if(!g.history?.length)return null;const n=copy(g),s=n.history.pop();for(const [k,v] of Object.entries(s))n[k]=v;return n;}
const enemyCount=(g,color)=>g.colors.filter(c=>g.active[c]&&!friendly(g,color,c)).length;
function evaluate(g,color){
 if(g.over)return g.over.winner===color?100000:g.over.winner===null?0:-100000;
 let s=0;
 for(const row of g.board)for(const p of row)if(p&&!p.dead){
  const val={P:100,N:320,B:335,R:500,Q:900,K:2200}[p.t];
  s+=p.color===color?val:(!friendly(g,color,p.color)?-val/Math.max(1,enemyCount(g,color)):+val*.45);
 }
 if(g.type==='chess4')s+=(g.scores[color]||0)*38;
 if(inCheck(g,color))s-=160;
 return s;
}
const capturePoints=(g,m)=>{const q=get(g,m.to.r,m.to.c);return q?(q.dead?0:VALUES[q.t]*125):0;};
function moveHeuristic(g,m,color,style="balanced"){
 const q=get(g,m.to.r,m.to.c),p=get(g,m.from.r,m.from.c);
 let s=capturePoints(g,m)+(p.t==='P'?6:0)+(m.castle?32:0)+Math.random()*13;
 if(q&&q.t==='Q')s+=120;
 if(style==='offensive' && q)s+=VALUES[q.t]*43;
 if(style==='cautious' && q)s+=VALUES[q.t]*7;
 if(style==='explorer')s+=Math.random()*135;

 const n=playMove(g,m);if(!n)return -Infinity;
 if(n.over?.winner===color||n.over?.winner===team(color))s+=100000;
 if(inCheck(n,color))s-=1000;
 const attackers=n.colors.filter(c=>n.active[c]&&c!==color&&inCheck(n,c)).length;s+=attackers*55;
 const moved=get(n,m.to.r,m.to.c);if(moved){
  if(attacked(n,m.to.r,m.to.c,color))s-=({P:100,N:320,B:335,R:500,Q:900,K:1000}[moved.t]*(style==='cautious'?.90:style==='offensive'?.25:.50));
 }
 return s;
}
export function botChess(g,level=2,style="balanced"){
 const color=g.colors[g.turn],moves=legalMoves(g,color);if(!moves.length)return null;
 if(level<=1)return moves[Math.floor(Math.random()*moves.length)];
 // Calcul local court pour préserver la réactivité sur les téléphones anciens.
 const ranked=moves.map(m=>({m,score:moveHeuristic(g,m,color,style)})).sort((a,b)=>b.score-a.score);
 if(g.size===14){
  if(level===2)return ranked[Math.floor(Math.random()*Math.min(3,ranked.length))].m;
  if(level===3)return ranked[0].m;
  // Niveaux 4 et 5 : on évalue aussi la possibilité que le prochain adversaire capture notre pièce.
  let best=ranked[0],bestScore=-Infinity;
  for(const option of ranked.slice(0,level===4?4:level===5?7:10)){
   const next=playMove(g,option.m);if(!next)continue;
   let risk=0;for(const reply of legalMoves(next)){
    const q=get(next,reply.to.r,reply.to.c);
    if(q?.color===color)risk=Math.max(risk,VALUES[q.t]*115);
   }
   const score=option.score-risk*.9+evaluate(next,color)*.025;
   if(score>bestScore){bestScore=score;best=option;}
  }
  return best.m;
 }
 if(level===2)return ranked[0].m;
 // Mode difficile : on mesure les meilleures réponses adverses sur au plus 6 coups candidats.
 let chosen=ranked[0],best=-Infinity;
 for(const option of ranked.slice(0,Math.min(level>=6?11:level>=5?8:level>=4?7:6,ranked.length))){
  const next=playMove(g,option.m);if(!next)continue;
  if(next.over?.winner===color)return option.m;
  const replies=legalMoves(next);
  let danger=0;
  for(const reply of replies){
   const q=get(next,reply.to.r,reply.to.c);
   const takesKingSide=q?.color===color?(VALUES[q.t]||1)*100:0;
   if(takesKingSide>danger)danger=takesKingSide;
  }
  let v=option.score-danger*.8+evaluate(next,color)*.04;
  if(level>=4){
   const candidateReplies=replies.slice(0,level===4?8:level===5?16:22);let worst=0;
   for(const answer of candidateReplies){const follow=playMove(next,answer);if(!follow)continue;
    const loss=evaluate(next,color)-evaluate(follow,color);
    worst=Math.max(worst,loss);
   }
   v-=worst*(level===4?.05:.10);
  }
  if(v>best){best=v;chosen=option;}
 }
 return chosen.m;
}
export function moveText(g,m){const p=get(g,m.from.r,m.from.c);return `${p?PIECE_NAMES[p.t]:'Pièce'} ${String.fromCharCode(65+m.from.c)}${g.size-m.from.r} → ${String.fromCharCode(65+m.to.c)}${g.size-m.to.r}`;}
export function hintChess(g){const m=botChess(g,3);return m?moveText(g,m):'Aucun coup possible.';}
export function statusChess(g){
 if(g.over)return `Partie terminée : ${g.over.winner||'égalité'} — ${g.over.reason}`;
 const c=g.colors[g.turn];return `Au tour de ${c}${inCheck(g,c)?' — ÉCHEC !':''}`;
}
