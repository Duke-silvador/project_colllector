import { decimal } from './numbers.js?v=2.0.0-beta.2-hotfix.2';
export const DICE=Object.freeze([4,6,8,10,12,20,100]);
export function parseDice(formula){
    const m=/^(\d{1,2})\s*[dw]\s*(\d{1,3})(?:\s*([+-])\s*(\d{1,5}(?:[.,]\d{1,2})?))?$/i.exec(String(formula??'').trim().slice(0,500));
    if(!m)throw Error('Würfel: z. B. 1d8, 2d6+2 oder 1w100.');
    const count=Number(m[1]),sides=Number(m[2]);
    if(count<1||count>50)throw Error('Würfelanzahl: ganze Zahl 1 bis 50.');
    if(!DICE.includes(sides))throw Error('Erlaubt: W4, W6, W8, W10, W12, W20, W100.');
    const bonus=m[4]?decimal(m[4],0,99999.99,'Würfelbonus')*(m[3]==='-'?-1:1):0;
    return {count,sides,bonus,formula:`${count}d${sides}${bonus?(bonus>0?'+':'')+bonus:''}`};
}
