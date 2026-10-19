import {shuffle} from './learn.js';
export const MASTERY_TARGET=3;
export function validateMastery(value,count){
 if(!value||value.version!==1||!Number.isInteger(value.clock)||value.clock<0||!Array.isArray(value.cards)||value.cards.length!==count)throw new Error('Invalid per-card mastery data.');
 const result=JSON.parse(JSON.stringify(value));
 if(result.roundNumber!==undefined&&(!Number.isInteger(result.roundNumber)||result.roundNumber<0))throw new Error('Invalid mastery round counter.');
 if(result.cards.some(c=>!c||!['streak','correct','incorrect','lastSeen'].every(k=>Number.isInteger(c[k])&&c[k]>=0)||c.streak>MASTERY_TARGET||c.streak>c.correct||c.lastSeen>result.clock||(c.manualMastered!==undefined&&typeof c.manualMastered!=='boolean')||(c.lastReviewRound!==undefined&&(!Number.isInteger(c.lastReviewRound)||c.lastReviewRound<0||c.lastReviewRound>(result.roundNumber||0)))))throw new Error('Invalid per-card mastery counters.');
 return result;
}
export function initializeMastery(state){
 if(state.mastery)return validateMastery(state.mastery,state.cards.length);
 const learned=new Set(state.learned||[]);
 const mastery={version:1,clock:0,legacyCredit:learned.size>0||!!state.round?.feedback,cards:state.cards.map((_,id)=>({streak:learned.has(id)?1:0,correct:learned.has(id)?1:0,incorrect:0,lastSeen:0}))};
 // Older versions recorded one successful answer, not three. Credit that
 // evidence without inventing a longer streak or deleting the old history.
 const r=state.round,id=r?.queue?.[0];
 if(r?.feedback&&Number.isInteger(id)&&mastery.cards[id]){
  if(!r.feedback.correct)recordMastery(mastery,id,false);
  else if(!learned.has(id))recordMastery(mastery,id,true);
 }
 return mastery;
}
export function isCardMastered(card){return card.manualMastered===true||card.streak>=MASTERY_TARGET;}
export function setManualMastery(mastery,id,mastered){
 const card=mastery.cards[id];if(!Number.isInteger(id)||!card||typeof mastered!=='boolean')throw new Error('Invalid manual mastery selection.');
 const wasManual=card.manualMastered===true;card.manualMastered=mastered;card.lastSeen=++mastery.clock;
 if(!mastered&&(!wasManual||card.streak>=MASTERY_TARGET))card.streak=0;
}
export function completeManualCard(round,id){
 if(!round)return false;const index=round.queue.indexOf(id);
 if(index>=0||[...(round.baseIds||[]),...(round.reviewIds||[]),...round.seen].includes(id)){round.manualIds ||= [];if(!round.manualIds.includes(id))round.manualIds.push(id);}
 if(index<0)return false;round.queue.splice(index,1);round.completed++;
 if(index===0){round.current=null;round.feedback=null;delete round.selection;}return true;
}
export function recordMastery(mastery,id,correct){
 const card=mastery.cards[id];if(!Number.isInteger(id)||!card||typeof correct!=='boolean')throw new Error('Invalid mastery answer.');
 const wasMastered=isCardMastered(card);
 card.lastSeen=++mastery.clock;
 if(correct){card.correct++;card.streak=Math.min(MASTERY_TARGET,card.streak+1);if(card.streak>=MASTERY_TARGET)card.manualMastered=false;}else{card.incorrect++;card.streak=0;card.manualMastered=false;}
 return {streak:card.streak,mastered:isCardMastered(card),newlyMastered:!wasMastered&&isCardMastered(card)};
}
export function masterySummary(mastery){
 const manual=mastery.cards.filter(c=>c.manualMastered===true).length;
 const verified=mastery.cards.filter(c=>c.manualMastered!==true&&c.streak>=MASTERY_TARGET).length;
 const mastered=manual+verified;
 const developing=mastery.cards.filter(c=>!isCardMastered(c)&&c.streak>0).length;
 return {mastered,manual,verified,developing,needsWork:mastery.cards.length-mastered-developing,total:mastery.cards.length};
}
function selectPastMistakes(cards,mastery,exclude,number,random){
 return shuffle(cards.map((_,id)=>id).filter(id=>!exclude.includes(id)&&mastery.cards[id].incorrect>0&&!mastery.cards[id].manualMastered&&(!mastery.cards[id].lastReviewRound||number-mastery.cards[id].lastReviewRound>=2)),random)
  .sort((a,b)=>(mastery.cards[a].lastReviewRound||0)-(mastery.cards[b].lastReviewRound||0)||mastery.cards[a].lastSeen-mastery.cards[b].lastSeen)
  .slice(0,3);
}
function interleavePastMistakes(base,reviews){
 const extras=[...reviews],queue=[];
 base.forEach((id,i)=>{queue.push(id);if((i+1)%3===0&&extras.length)queue.push(extras.shift());});
 return [...queue,...extras];
}
export function ensureRoundReviewMix(cards,mastery,round,random=Math.random){
 if(!round||Array.isArray(round.baseIds))return round;
 const baseIds=[...new Set([...round.seen,...round.queue,...(round.manualIds||[])])];
 if(baseIds.length!==round.total)return round;
 round.baseIds=baseIds;round.reviewIds=[];round.manualIds ||= [];
 if(!round.queue.length){round.roundNumber=mastery.roundNumber||0;return round;}
 const number=(mastery.roundNumber||0)+1;mastery.roundNumber=number;round.roundNumber=number;
 const reviewIds=selectPastMistakes(cards,mastery,baseIds,number,random);
 for(const id of reviewIds)mastery.cards[id].lastReviewRound=number;
 round.reviewIds=reviewIds;round.queue=interleavePastMistakes(round.queue,reviewIds);round.total+=reviewIds.length;
 return round;
}
export function newMasteryRound(cards,mastery,random=Math.random,onlyIds=null){
 const all=cards.map((_,id)=>id),number=(mastery.roundNumber||0)+1;
 mastery.roundNumber=number;
 const reviewIds=onlyIds===null?selectPastMistakes(cards,mastery,[],number,random):[];
 let pool=onlyIds!==null?all.filter(id=>onlyIds.includes(id)):all.filter(id=>!isCardMastered(mastery.cards[id]));
 if(!pool.length&&onlyIds===null)pool=all;
 const baseIds=shuffle(pool.filter(id=>!reviewIds.includes(id)),random).sort((a,b)=>mastery.cards[a].lastSeen-mastery.cards[b].lastSeen).slice(0,10);
 for(const id of reviewIds)mastery.cards[id].lastReviewRound=number;
 const queue=interleavePastMistakes(baseIds,reviewIds);
 return {queue,total:queue.length,completed:0,attempts:0,firstCorrect:0,seen:[],current:null,feedback:null,baseIds,reviewIds,manualIds:[],roundNumber:number};
}
