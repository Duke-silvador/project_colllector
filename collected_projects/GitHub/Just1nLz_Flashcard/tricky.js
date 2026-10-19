import {MASTERY_TARGET,newMasteryRound} from './mastery.js';
function earlierTrickyMisses(card,depth=0){
 if(depth>=20||!Array.isArray(card.previousVersions))return 0;
 return card.previousVersions.reduce((sum,version)=>{const old=version?.mastery;if(!old)return sum;return sum+(Number.isSafeInteger(old.incorrect)&&old.incorrect>0?old.incorrect:0)+earlierTrickyMisses(old,depth+1);},0);
}
export function rankTrickyQuestions(state){
 return state.mastery.cards.map((card,id)=>{
  const earlier=earlierTrickyMisses(card),attempts=card.correct+card.incorrect;
  return {id,incorrect:card.incorrect,earlierIncorrect:earlier,totalIncorrect:card.incorrect+earlier,correct:card.correct,streak:card.streak,manual:card.manualMastered===true,verified:card.streak>=MASTERY_TARGET,accuracy:attempts?Math.round(card.correct/attempts*100):null};
 }).filter(row=>row.totalIncorrect>0).sort((a,b)=>b.totalIncorrect-a.totalIncorrect||a.streak-b.streak||(a.accuracy??-1)-(b.accuracy??-1)||a.id-b.id);
}
export function trickyPracticeIds(rows){
 const pending=rows.filter(row=>!row.verified);
 return (pending.length?pending:rows).slice(0,10).map(row=>row.id);
}
export function newTrickyRound(cards,mastery,ids,random=Math.random){
 const selected=[...new Set(ids)].slice(0,10);
 if(!selected.length||selected.some(id=>!Number.isInteger(id)||id<0||id>=cards.length))throw new Error('Select at least one valid tricky question.');
 const round=newMasteryRound(cards,mastery,random,selected);
 round.practice={kind:'tricky',target:MASTERY_TARGET,ids:[...round.baseIds]};
 return round;
}
export function advanceTrickyRound(round,mastery){
 if(round.practice?.kind!=='tricky'||!round.feedback||!round.queue.length)return null;
 const id=round.queue.shift(),correct=round.feedback.correct;
 if(correct&&mastery.cards[id].streak>=MASTERY_TARGET)round.completed++;else round.queue.push(id);
 round.current=null;round.feedback=null;delete round.selection;
 return correct?id:null;
}
