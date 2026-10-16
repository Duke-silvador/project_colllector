/* M800 : adaptations numériques indépendantes (pas une connexion au plateau Millennium). */
export const M800=[
 {id:'chess2',name:'Échecs classiques',emoji:'♟️',sub:'Deux armées, un roi à protéger'},
 {id:'checkers',name:'Dames anglaises',emoji:'🔴',sub:'Prises obligatoires et dames'},
 {id:'reversi',name:'Reversi',emoji:'⚫',sub:'Retourne les jetons adverses'},
 {id:'connect4',name:'Quatre en ligne',emoji:'🟡',sub:'Aligne quatre jetons'},
 {id:'fox',name:'Renard et oies',emoji:'🦊',sub:'Un renard face à quatre oies'},
 {id:'saut',name:'Sauterelle',emoji:'🐸',sub:'Avance et saute les pions'},
 {id:'nim',name:'Nim',emoji:'🔢',sub:'Retire des pions dans une pile'},
 {id:'north',name:'Northcote',emoji:'↕️',sub:'Les pions se rapprochent'},
];
const copy=g=>JSON.parse(JSON.stringify(g));
const within=(r,c,rows=8,cols=8)=>r>=0&&c>=0&&r<rows&&c<cols;
const other=c=>c===0?1:0;
const dirs4=[[1,1],[1,-1],[-1,1],[-1,-1]];
const dirs8=[[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[0,-1],[1,0],[-1,0]];
export function newMini(id){
 let g={kind:'mini',id,board:Array.from({length:8},()=>Array(8).fill(null)),turn:0,over:null,history:[],message:'',chain:null,rule:'normal',ply:0};
 if(id==='connect4'){g.board=Array.from({length:6},()=>Array(7).fill(null));}
 if(id==='reversi'){for(const [r,c,v] of [[3,3,0],[4,4,0],[3,4,1],[4,3,1]])g.board[r][c]=v;}
 if(id==='checkers')for(let r=0;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1&&(r<=2||r>=5))g.board[r][c]={player:r>=5?0:1,king:false};
 if(id==='fox'){g.board[7][2]='F';for(const c of [1,3,5,7])g.board[0][c]='G';}
 if(id==='saut'){for(let c=0;c<8;c++){g.board[0][c]=1;g.board[7][c]=0;}}
 if(id==='nim'){g.piles=[1,3,5,7];g.board=null;}
 if(id==='north'){g.board=Array.from({length:8},()=>Array(8).fill(null));for(let c=0;c<8;c++){g.board[7][c]=0;g.board[0][c]=1;}}
 return g;
}
const flips=(g,r,c,p)=>{
 if(g.board[r][c]!==null)return [];
 const all=[];
 for(const [dr,dc] of dirs8){const a=[];let x=r+dr,y=c+dc;
  while(within(x,y)&&g.board[x][y]===other(p)){a.push({r:x,c:y});x+=dr;y+=dc;}
  if(a.length&&within(x,y)&&g.board[x][y]===p)all.push(...a);
 }return all;
};
function checkersCaptures(g,p,r,c){
 let q=g.board[r][c],out=[];if(!q||q.player!==p)return out;
 for(const [dr,dc] of dirs4){if(!q.king&&dr!==(p===0?-1:1))continue;
  const nr=r+dr,nc=c+dc,tr=r+2*dr,tc=c+2*dc;
  if(within(tr,tc)&&g.board[nr][nc]?.player===other(p)&&g.board[tr][tc]===null)out.push({from:{r,c},to:{r:tr,c:tc},jump:{r:nr,c:nc}});
 }return out;
}
export function legalMini(g){
 if(g.over)return [];
 const p=g.turn,b=g.board,out=[];
 if(g.id==='nim')return g.piles.flatMap((n,pile)=>Array.from({length:n},(_,i)=>({pile,count:i+1})));
 if(g.id==='connect4')return b[0].map((x,col)=>x===null?{col}:null).filter(Boolean);
 if(g.id==='reversi'){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(flips(g,r,c,p).length)out.push({r,c});return out;
 }
 if(g.id==='north'){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===p){
   let nr=r+(p===0?-1:1);while(within(nr,c)&&b[nr][c]===null){out.push({from:{r,c},to:{r:nr,c}});nr+=(p===0?-1:1);}
  }return out;
 }
 if(g.id==='fox'){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===(p===0?'F':'G')){
   for(const [dr,dc] of dirs4){if(p===1&&dr!==1)continue;const nr=r+dr,nc=c+dc;
    if(within(nr,nc)&&b[nr][nc]===null)out.push({from:{r,c},to:{r:nr,c:nc}});
   }
  }return out;
 }
 if(g.id==='saut'){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===p&&(!g.chain||(g.chain.r===r&&g.chain.c===c))){
   for(const [dr,dc] of dirs8){const nr=r+dr,nc=c+dc;if(!within(nr,nc))continue;
    if(b[nr][nc]===null&&!g.chain)out.push({from:{r,c},to:{r:nr,c:nc}});
    else if(b[nr][nc]!==null&&within(nr+dr,nc+dc)&&b[nr+dr][nc+dc]===null)out.push({from:{r,c},to:{r:nr+dr,c:nc+dc},jump:true});
   }
  }return out;
 }
 if(g.id==='checkers'){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.player===p&&(!g.chain||(g.chain.r===r&&g.chain.c===c)))out.push(...checkersCaptures(g,p,r,c));
  if(out.length||g.chain)return out;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.player===p){
   const q=b[r][c];for(const [dr,dc] of dirs4){if(!q.king&&dr!==(p===0?-1:1))continue;
    const nr=r+dr,nc=c+dc;if(within(nr,nc)&&b[nr][nc]===null)out.push({from:{r,c},to:{r:nr,c:nc}});
   }
  }return out;
 }
 return [];
}
function winLine(b,r,c,p){for(const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]){
 let n=1;for(const sign of [1,-1])for(let k=1;k<4;k++){let nr=r+dr*k*sign,nc=c+dc*k*sign;if(!within(nr,nc,6,7)||b[nr][nc]!==p)break;n++;}
 if(n>=4)return true;
 }return false;}
const boardFull=b=>b.every(row=>row.every(x=>x!==null));
function end(g,winner,reason){g.over={winner,reason};}
function finishTurn(g){g.chain=null;g.turn=other(g.turn);}
export function playMini(g,m){
 const opts=legalMini(g);
 const chosen=opts.find(o=>JSON.stringify(o)===JSON.stringify(m));if(!chosen)return null;
 const n=copy(g);n.history.push({board:g.board,turn:g.turn,chain:g.chain,over:g.over,message:g.message,piles:g.piles,ply:g.ply});
 const p=g.turn,b=n.board;n.ply++;
 if(g.id==='nim'){
  n.piles[m.pile]-=m.count;
  if(n.piles.every(x=>x===0))end(n,n.rule==='last-loses'?other(p):p,n.rule==='last-loses'?'Dernier pion perd':'Dernier pion gagne');else finishTurn(n);
 }else if(g.id==='connect4'){
  for(let r=5;r>=0;r--)if(b[r][m.col]===null){b[r][m.col]=p;if(winLine(b,r,m.col,p))end(n,p,'Quatre jetons alignés');break;}
  if(!n.over){if(boardFull(b))end(n,null,'Égalité');else finishTurn(n);}
 }else if(g.id==='reversi'){
  b[m.r][m.c]=p;for(const {r,c} of flips(g,m.r,m.c,p))b[r][c]=p;
  n.turn=other(p);let next=legalMini(n);
  if(!next.length){n.turn=p;next=legalMini(n);if(!next.length){const a=b.flat().filter(x=>x===0).length,z=b.flat().filter(x=>x===1).length;end(n,a===z?null:a>z?0:1,`Score ${a} – ${z}`);}else n.message='Adversaire bloqué : il passe son tour.';}
 }else if(g.id==='north'){
  b[m.to.r][m.to.c]=p;b[m.from.r][m.from.c]=null;finishTurn(n);
  if(!legalMini(n).length)end(n,n.rule==='last-loses'?n.turn:p,'Plus aucun déplacement');
 }else if(g.id==='fox'){
  b[m.to.r][m.to.c]=b[m.from.r][m.from.c];b[m.from.r][m.from.c]=null;finishTurn(n);
  if(p===0){let fr=m.to.r, geese=b.flatMap((row,r)=>row.map((v,c)=>v==='G'?r:null).filter(x=>x!==null));if(fr<Math.min(...geese))end(n,0,'Le renard a dépassé toutes les oies');}
  if(!n.over&&!legalMini(n).length)end(n,other(n.turn),'Adversaire bloqué');
 }else if(g.id==='saut'){
  b[m.to.r][m.to.c]=p;b[m.from.r][m.from.c]=null;
  // Simple enchaînement facultatif : bouton « Finir le tour » disponible après saut.
  if(m.jump){n.chain={...m.to};if(!legalMini(n).length)finishTurn(n);}else finishTurn(n);
  const target=p===0?0:7;if(b[target].every(x=>x===p))end(n,p,'Zone adverse conquise');
 }else if(g.id==='checkers'){
  const q=b[m.from.r][m.from.c];b[m.to.r][m.to.c]=q;b[m.from.r][m.from.c]=null;
  if(m.jump)b[m.jump.r][m.jump.c]=null;
  let promoted=false;
  if(!q.king&&m.to.r===(p===0?0:7)){q.king=true;promoted=true;}
  if(m.jump&&!promoted&&checkersCaptures(n,p,m.to.r,m.to.c).length){n.chain={...m.to};}
  else finishTurn(n);
  if(!n.chain){const opponent=n.turn,hasPieces=b.some(row=>row.some(z=>z?.player===opponent));if(!hasPieces||!legalMini(n).length)end(n,p,'Toutes les pièces prises ou bloquées');}
 }
 return n;
}
export function finishChain(g){if(g.id!=='saut'||!g.chain)return g;const n=copy(g);finishTurn(n);return n;}
export function undoMini(g){if(!g.history?.length)return null;const n=copy(g),s=n.history.pop();for(const [k,v] of Object.entries(s))n[k]=v;return n;}
function miniScore(g,m){
 const p=g.turn;let score=Math.random()*4;
 if(g.id==='nim'){
  const np=[...g.piles];np[m.pile]-=m.count;
  let xor=np.reduce((acc,n)=>acc^n,0);
  score+=(xor===0?100:0)+(np.every(x=>x===0)?120:0);
 }
 if(g.id==='connect4'){
  const n=playMini(g,m);if(n.over?.winner===p)return 100000;
  for(const m2 of legalMini(n)){const r=playMini(n,m2);if(r.over?.winner===other(p))score-=10000;}
  score+=(3-Math.abs(m.col-3))*7;
 }
 if(g.id==='reversi')score+=flips(g,m.r,m.c,p).length*8+(m.r===0||m.r===7?10:0)+(m.c===0||m.c===7?10:0);
 if(g.id==='checkers')score+=(m.jump?100:0)+(m.to.r-m.from.r)*(p===0?-3:3)+((m.to.c===0||m.to.c===7)?-1:0);
 if(g.id==='fox')score+=p===0?(m.from.r-m.to.r)*6:((m.to.c>=2&&m.to.c<=5)?4:0);
 if(g.id==='saut')score+=(m.to.r-m.from.r)*(p===0?-5:5)+(m.jump?9:0);
 if(g.id==='north')score+=Math.abs(m.to.r-m.from.r)*3;
 return score;
}
export function botMini(g,level=2){const moves=legalMini(g);if(!moves.length)return null;
 if(level<=1)return moves[Math.floor(Math.random()*moves.length)];
 return moves.map(m=>({m,s:miniScore(g,m)})).sort((a,b)=>b.s-a.s)[0].m;
}
export function statusMini(g){
 const label=g.id==='fox'?['Renard','Oies']:['Rouge','Bleu'];
 return g.over?`Terminé : ${g.over.winner===null?'égalité':label[g.over.winner]+' gagne'} — ${g.over.reason}`:`Au tour de ${label[g.turn]}${g.chain?' — saut supplémentaire possible':''}`;
}
export const MINI_RULES={
 checkers:'Sur les cases foncées, déplace un pion d’une case en diagonale vers l’avant. Sauter une pièce adverse est obligatoire. Enchaîne les prises. Au fond, ton pion devient une dame qui peut aussi reculer. Jeu de dames anglaises (64 cases).',
 reversi:'Pose un jeton pour entourer un ou plusieurs jetons adverses en ligne droite ou diagonale : les jetons entourés changent de couleur. Le plus grand nombre de jetons gagne.',
 connect4:'Choisis une colonne : ton jeton tombe en bas. Aligne quatre jetons horizontalement, verticalement ou en diagonale.',
 fox:'Le renard se déplace d’une case en diagonale dans les deux sens. Les quatre oies avancent d’une case en diagonale sans reculer. Les oies cherchent à bloquer le renard ; le renard essaie de les dépasser.',
 saut:'Avance d’une case dans toutes les directions, ou saute par-dessus une pièce voisine pour atterrir sur la case libre juste derrière. Plusieurs sauts peuvent se suivre. Rejoins la zone opposée avec tous tes pions.',
 nim:'Choisis une seule pile et retire un ou plusieurs pions. Version DG : le dernier qui prend gagne ; version DP : le dernier qui prend perd.',
 north:'Déplace un pion vers l’adversaire, uniquement dans sa colonne et sans dépasser l’autre pion. Celui qui ne peut plus avancer perd en version DG ; en version DP, c’est l’inverse.',
};
