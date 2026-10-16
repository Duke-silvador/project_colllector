/* V2.5.2 — orientation et coordonnées. Purement visuel : aucun coup ni règle n'est modifié. */
export const ROTATION_MODES=['manual','white','camp','turn'];
export const VIEW_MODES=['flat','depth','cinema'];
export const normalizedQuarter=value=>((Math.trunc(Number(value)||0)%4)+4)%4;
export function displayedToOriginal(dr,dc,rows,cols,quarter=0){
 const q=normalizedQuarter(quarter);
 if(q%2 && rows!==cols)throw Error('Rotation de 90 degrés impossible sur un plateau rectangulaire.');
 if(q===0)return {r:dr,c:dc};
 if(q===1)return {r:rows-1-dc,c:dr};
 if(q===2)return {r:rows-1-dr,c:cols-1-dc};
 return {r:dc,c:cols-1-dr};
}
export function originalToDisplayed(r,c,rows,cols,quarter=0){
 const q=normalizedQuarter(quarter);
 if(q%2 && rows!==cols)throw Error('Rotation de 90 degrés impossible sur un plateau rectangulaire.');
 if(q===0)return {r,c};
 if(q===1)return {r:c,c:rows-1-r};
 if(q===2)return {r:rows-1-r,c:cols-1-c};
 return {r:cols-1-c,c:r};
}
export const squareName=(r,c,rows)=>`${String.fromCharCode(65+c)}${rows-r}`;
export function axisLabels(rows,cols,rotation){
 const q=normalizedQuarter(rotation),rotated=q%2===1;
 const visualRows=rotated?cols:rows,visualCols=rotated?rows:cols;
 const top=[],bottom=[],left=[],right=[];
 const horizontal=(dr,dc)=>{const p=displayedToOriginal(dr,dc,rows,cols,q);return rotated?String(rows-p.r):String.fromCharCode(65+p.c);};
 const vertical=(dr,dc)=>{const p=displayedToOriginal(dr,dc,rows,cols,q);return rotated?String.fromCharCode(65+p.c):String(rows-p.r);};
 for(let dc=0;dc<visualCols;dc++){top.push(horizontal(0,dc));bottom.push(horizontal(visualRows-1,dc));}
 for(let dr=0;dr<visualRows;dr++){left.push(vertical(dr,0));right.push(vertical(dr,visualCols-1));}
 return {top,bottom,left,right,rows:visualRows,cols:visualCols};
}
const FOUR_START={red:0,green:1,yellow:2,blue:3};
export function campRotation(game,color){
 if(game?.kind==='chess'&&game.type==='chess4')return FOUR_START[color]??0;
 return color==='black'||color==='B'?2:0;
}
export function resolveRotation(game,mode,manual,controllers={}){
 const dims=game?.kind==='chess'?[game.size,game.size]:[game?.board?.length,game?.board?.[0]?.length];
 let q=normalizedQuarter(manual);
 if(mode==='white')q=0;
 if(mode==='turn'){
  const color=game?.kind==='chess'?game.colors[game.turn]:game?.turn===0?'A':'B';
  q=campRotation(game,color);
 }
 if(mode==='camp'){
  const colors=game?.kind==='chess'?game.colors:['A','B'];
  const preferred=colors.find(c=>controllers[c]==='human')||colors[0];
  q=campRotation(game,preferred);
 }
 if(dims[0]!==dims[1]&&q%2)q=(q+1)%4; // Non carré : rotation 180° uniquement.
 return q;
}
