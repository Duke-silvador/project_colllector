import {isCardMastered,masterySummary,MASTERY_TARGET} from './mastery.js';

const ROUND_REWARD_BADGES=['perfect','strong','persistent','started','manual'];
const ROUND_REWARD_TITLES={perfect:'Clean sweep',strong:'Strong round',persistent:'Kept going',started:'Round complete',manual:'A step forward'};
function isRewardCount(value){return Number.isSafeInteger(value)&&value>=0;}
function rewardBadge(assessed,firstCorrect,attempts,manual,total){
 if(!assessed)return 'manual';
 if(!manual&&assessed===total&&firstCorrect===assessed)return 'perfect';
 if(!manual&&firstCorrect/assessed>=.8)return 'strong';
 if(attempts>assessed)return 'persistent';
 return 'started';
}
export function validateRewards(value){
 if(!value||value.version!==1||!isRewardCount(value.xp)||!isRewardCount(value.completedRounds)||typeof value.recapShown!=='boolean')throw new Error('Invalid Learn rewards.');
 return {version:1,xp:value.xp,completedRounds:value.completedRounds,recapShown:value.recapShown};
}
export function initializeRewards(value){
 if(value===undefined||value===null)return {version:1,xp:0,completedRounds:0,recapShown:false};
 return validateRewards(value);
}
export function validateRoundReward(value){
 if(!value||value.version!==1||!['xp','assessed','firstCorrect','attempts','manual','total'].every(key=>isRewardCount(value[key]))||!value.total||value.assessed>value.total||value.firstCorrect>value.assessed||value.attempts<value.assessed||value.manual>value.total||!ROUND_REWARD_BADGES.includes(value.badge)||typeof value.title!=='string')throw new Error('Invalid completed-round reward.');
 const xp=value.assessed?10+5*value.assessed+5*value.firstCorrect:0;
 const badge=rewardBadge(value.assessed,value.firstCorrect,value.attempts,value.manual,value.total);
 if(value.xp!==xp||value.badge!==badge||value.title!==ROUND_REWARD_TITLES[badge])throw new Error('Inconsistent completed-round reward.');
 return {version:1,xp:value.xp,assessed:value.assessed,firstCorrect:value.firstCorrect,attempts:value.attempts,manual:value.manual,total:value.total,badge:value.badge,title:value.title};
}
export function awardRoundReward(state){
 const round=state.round;
 if(round?.reward)return round.reward;
 if(!round||!Array.isArray(round.queue)||round.queue.length||!round.total)return null;
 const assessed=new Set(round.seen||[]).size,manual=new Set(round.manualIds||[]).size;
 const firstCorrect=round.firstCorrect||0,attempts=round.attempts||0,total=round.total;
 const xp=assessed?10+5*assessed+5*firstCorrect:0,badge=rewardBadge(assessed,firstCorrect,attempts,manual,total);
 const reward=validateRoundReward({version:1,xp,assessed,firstCorrect,attempts,manual,total,badge,title:ROUND_REWARD_TITLES[badge]});
 const rewards=initializeRewards(state.rewards);
 if(!isRewardCount(rewards.xp+xp)||!isRewardCount(rewards.completedRounds+1))throw new Error('Learn rewards exceed the supported total.');
 rewards.xp+=xp;rewards.completedRounds++;
 state.rewards=rewards;round.reward=reward;
 return reward;
}
export function rewardLevel(xp){return Math.floor(xp/250)+1;}
export function buildSetRecap(state){
 const items=state.mastery.cards.map((card,id)=>{
  const correct=card.correct,incorrect=card.incorrect,attempts=correct+incorrect;
  return {id,correct,incorrect,attempts,streak:card.streak,manualMastered:card.manualMastered===true,verified:card.manualMastered!==true&&card.streak>=MASTERY_TARGET,assessed:attempts>0,accuracy:attempts?Math.round(100*correct/attempts):null};
 });
 const counts=masterySummary(state.mastery),total=items.length;
 const assessed=items.filter(item=>item.assessed).length;
 const correct=items.reduce((sum,item)=>sum+item.correct,0),incorrect=items.reduce((sum,item)=>sum+item.incorrect,0),attempts=correct+incorrect;
 // A missed card still below mastery needs attention before an unseen card;
 // equal error counts prioritize the lower current streak and accuracy.
 const focusIds=items.filter(item=>!isCardMastered(item)).sort((a,b)=>b.incorrect-a.incorrect||a.streak-b.streak||(a.accuracy??-1)-(b.accuracy??-1)||a.id-b.id).map(item=>item.id);
 const maintenanceIds=items.filter(item=>item.verified&&item.incorrect>0).sort((a,b)=>b.incorrect-a.incorrect||(a.accuracy??100)-(b.accuracy??100)||a.id-b.id).map(item=>item.id);
 return {total,assessed,unassessed:total-assessed,complete:total>0&&assessed===total,correct,incorrect,attempts,accuracy:attempts?Math.round(100*correct/attempts):null,verified:counts.verified,manual:counts.manual,developing:counts.developing,needsWork:counts.needsWork,markedOnly:items.filter(item=>item.manualMastered&&!item.assessed).length,focusIds,maintenanceIds,manualIds:items.filter(item=>item.manualMastered).map(item=>item.id),unassessedIds:items.filter(item=>!item.assessed).map(item=>item.id),items};
}
