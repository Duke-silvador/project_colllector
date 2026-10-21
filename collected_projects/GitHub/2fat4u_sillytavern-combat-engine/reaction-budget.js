const integer=(v,min,max)=>{if(v===''||v==null||typeof v==='boolean'||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)throw Error('Reaktionsbudget: ungültige ganze Zahl.');return Number(v);};
export function reactionMode(a){const mode=a?.reactionControl??'inherit';return mode==='inherit'?(['basic','advanced'].includes(a?.control)?'auto':'manual'):mode;}
export function reactionFieldsFrom(input={}){
 const reactionsPerTurn=input.reactionsPerTurn==null||input.reactionsPerTurn===''?null:integer(input.reactionsPerTurn,0,20);
 return {reactionsPerTurn,reactionSpent:integer(input.reactionSpent??Number(Boolean(input.reactionUsed)),0,1000000),reactionReserved:integer(input.reactionReserved??Number(Boolean(input.reactionReserve)),0,1000000)};
}
export function reactionBudget(s,a){
 const total=a?.reactionsPerTurn??s.rules.reactionsPerTurn??1,spent=Math.max(a?.reactionSpent??0,a?.reactionUsed?1:0),remaining=Math.max(0,total-spent),reserved=Math.min(remaining,Math.max(a?.reactionReserved??0,a?.reactionReserve?1:0));
 return {total,spent,remaining,reserved,available:a?.reactionCost==='extra'?remaining:reserved};
}
function sync(s,a){const b=reactionBudget(s,{...a,reactionUsed:false,reactionReserve:false});a.reactionUsed=b.remaining===0;a.reactionReserve=b.reserved>0;}
export function consumeReaction(s,a){const b=reactionBudget(s,a);if(!b.available)throw Error('Keine Reaktion mehr verfügbar.');a.reactionSpent=b.spent+1;a.reactionReserved=Math.max(0,Math.max(a.reactionReserved??0,a.reactionReserve?1:0)-(a.reactionCost==='extra'?0:1));sync(s,a);}
export function reserveReaction(s,a){const b=reactionBudget(s,a);if(b.reserved>=b.remaining)throw Error('Alle verfügbaren Reaktionen sind bereits reserviert.');a.reactionReserved=b.reserved+1;sync(s,a);}
export function resetReactions(a,turn=-1){a.reactionSpent=0;a.reactionReserved=0;a.reactionUsed=false;a.reactionReserve=false;a.reactionTurn=turn;}
export function reactionsOff(s,a){return !s.rules.reactionsEnabled||a?.reactionControl==='off'||reactionBudget(s,a).total===0;}
