import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeMastery,recordMastery,setManualMastery,newMasteryRound} from './mastery.js';
import {makeQuestion,answerQuestion,advanceRound} from './learn.js';
import {awardRoundReward,buildSetRecap,initializeRewards,rewardLevel,validateRewards,validateRoundReward} from './rewards.js';

const rewardCards=Array.from({length:5},(_,id)=>({term:`Question ${id}`,definition:`Answer ${id}`}));
function rewardState(round={}){return {cards:rewardCards,mastery:initializeMastery({cards:rewardCards}),round:{queue:[],total:5,completed:5,attempts:5,firstCorrect:5,seen:[0,1,2,3,4],manualIds:[],...round}};}

test('completed round earns explicit effort and first-answer XP exactly once, including after reload',()=>{
 const state=rewardState();const reward=awardRoundReward(state);
 assert.deepEqual(reward,{version:1,xp:60,assessed:5,firstCorrect:5,attempts:5,manual:0,total:5,badge:'perfect',title:'Clean sweep'});
 assert.equal(state.rewards.completedRounds,1);assert.equal(state.rewards.xp,60);
 assert.equal(awardRoundReward(state),reward);assert.equal(state.rewards.xp,60);
 const reloaded=JSON.parse(JSON.stringify(state));awardRoundReward(reloaded);
 assert.deepEqual(reloaded.rewards,state.rewards);assert.deepEqual(reloaded.round.reward,reward);
 reloaded.round={...state.round,reward:undefined};awardRoundReward(reloaded);
 assert.equal(reloaded.rewards.completedRounds,2);assert.equal(reloaded.rewards.xp,120);
});
test('unfinished and empty rounds receive no award',()=>{
 const active=rewardState({queue:[4],completed:4});assert.equal(awardRoundReward(active),null);assert.equal(active.rewards,undefined);
 const empty=rewardState({total:0,completed:0,attempts:0,firstCorrect:0,seen:[]});assert.equal(awardRoundReward(empty),null);
});
test('retries receive encouragement without extra answer XP or perfect credit',()=>{
 const state=rewardState({attempts:20,firstCorrect:2});const reward=awardRoundReward(state);
 assert.equal(reward.xp,45);assert.equal(reward.badge,'persistent');assert.equal(reward.assessed,5);assert.equal(reward.attempts,20);
 const stronger=rewardState({firstCorrect:4,attempts:6});assert.equal(awardRoundReward(stronger).badge,'strong');
});
test('manual completion celebrates the round but does not fabricate assessment or perfect credit',()=>{
 const manual=rewardState({attempts:0,firstCorrect:0,seen:[],manualIds:[0,1,2,3,4]});
 const reward=awardRoundReward(manual);assert.equal(reward.xp,0);assert.equal(reward.badge,'manual');assert.equal(reward.assessed,0);assert.equal(manual.rewards.completedRounds,1);
 const mixed=rewardState({attempts:4,firstCorrect:4,seen:[0,1,2,3],manualIds:[4]});
 assert.equal(awardRoundReward(mixed).xp,50);assert.equal(mixed.round.reward.badge,'started');
 const overlap=rewardState({attempts:5,firstCorrect:5,seen:[0,1,2,3,4],manualIds:[4]});
 assert.notEqual(awardRoundReward(overlap).badge,'perfect');
});
test('reward persistence clones values and rejects malformed or inconsistent awards',()=>{
 const fresh=initializeRewards();assert.deepEqual(fresh,{version:1,xp:0,completedRounds:0,recapShown:false});
 const saved={version:1,xp:251,completedRounds:3,recapShown:true};assert.deepEqual(validateRewards(saved),saved);assert.notEqual(initializeRewards(saved),saved);assert.equal(rewardLevel(saved.xp),2);
 for(const invalid of [{...saved,xp:-1},{...saved,completedRounds:1.2},{...saved,recapShown:'yes'},{}])assert.throws(()=>validateRewards(invalid));
 const reward=awardRoundReward(rewardState());assert.deepEqual(validateRoundReward(reward),reward);
 for(const invalid of [{...reward,xp:999},{...reward,assessed:6},{...reward,attempts:4},{...reward,badge:'manual'},{...reward,title:'Fake trophy'},{...reward,manual:6}])assert.throws(()=>validateRoundReward(invalid));
});
test('full-set recap uses actual answers; manual-only mastery does not complete coverage',()=>{
 const state=rewardState();setManualMastery(state.mastery,0,true);recordMastery(state.mastery,1,false);recordMastery(state.mastery,1,true);
 let recap=buildSetRecap(state);assert.equal(recap.assessed,1);assert.equal(recap.unassessed,4);assert.equal(recap.complete,false);assert.equal(recap.markedOnly,1);assert.equal(recap.manual,1);assert.equal(recap.accuracy,50);assert.equal(recap.items[0].accuracy,null);
 for(const id of [0,2,3,4])recordMastery(state.mastery,id,true);
 recap=buildSetRecap(state);assert.equal(recap.complete,true);assert.equal(recap.assessed,5);assert.equal(recap.unassessed,0);assert.equal(recap.markedOnly,0);assert.equal(recap.correct,5);assert.equal(recap.incorrect,1);assert.equal(recap.accuracy,83);
});
test('recap ranks missed unmastered cards and separates verified maintenance from manual selections',()=>{
 const state=rewardState(),m=state.mastery;
 recordMastery(m,0,false);recordMastery(m,0,true);
 recordMastery(m,1,false);recordMastery(m,1,false);recordMastery(m,1,true);
 recordMastery(m,2,true);recordMastery(m,2,true);
 recordMastery(m,3,false);for(let i=0;i<3;i++)recordMastery(m,3,true);
 setManualMastery(m,4,true);
 const recap=buildSetRecap(state);assert.deepEqual(recap.focusIds,[1,0,2]);assert.deepEqual(recap.maintenanceIds,[3]);assert.deepEqual(recap.manualIds,[4]);assert.equal(recap.verified,1);assert.equal(recap.developing,3);assert.equal(recap.items[3].streak,3);
});
test('empty recap never claims full coverage or invents an accuracy score',()=>{
 const state={cards:[],mastery:initializeMastery({cards:[]})};const recap=buildSetRecap(state);
 assert.equal(recap.complete,false);assert.equal(recap.accuracy,null);assert.deepEqual(recap.focusIds,[]);
});
test('the bundled 80-card Learn workflow earns one receipt per round and unlocks an accurate full-set recap',()=>{
 const cards=JSON.parse(readFileSync(new URL('./deck.json',import.meta.url))).cards;
 assert.equal(cards.length,80);
 let state={title:'Computer Ethics',cards,known:[],learned:[],mastery:initializeMastery({cards}),rewards:initializeRewards()};
 const attempted=new Set(),evidence=cards.map(()=>({correct:0,incorrect:0}));
 let missedId=null,rounds=0,expectedXp=0,totalAttempts=0;
 assert.equal(buildSetRecap(state).complete,false);
 while(!buildSetRecap(state).complete){
  assert(rounds<20,'set coverage stalled');
  state.round=newMasteryRound(cards,state.mastery,()=>.5);
  assert.equal(awardRoundReward(state),null);
  const rewardsBefore=structuredClone(state.rewards),roundIds=new Set(state.round.queue);
  let roundAttempts=0;
  while(state.round.queue.length){
   const round=state.round,id=round.queue[0];round.current=makeQuestion(cards,id,()=>.5);
   const answerWrong=missedId===null;
   const question=round.current,expected=question.type==='multi'?question.answers:question.answer;
   const choice=answerWrong?(question.type==='multi'?[question.answers[0]]:(question.options.find(option=>option!==question.answer)||'An incorrect written answer')):expected;
   assert.equal(answerQuestion(round,choice),true);
   const correct=round.feedback.correct;
   assert.equal(correct,!answerWrong);
   if(answerWrong)missedId=id;
   attempted.add(id);evidence[id][correct?'correct':'incorrect']++;totalAttempts++;roundAttempts++;
   recordMastery(state.mastery,id,correct);
   // Duplicate taps cannot increase attempts, evidence, XP, or completed rounds.
   assert.equal(answerQuestion(round,choice),false);
   assert.equal(awardRoundReward(state),null);
   assert.deepEqual(state.rewards,rewardsBefore);
   const beforeAdvance=buildSetRecap(state);
   assert.equal(beforeAdvance.assessed,attempted.size);
   assert.equal(beforeAdvance.complete,attempted.size===cards.length);
   const doneId=advanceRound(round);
   if(correct){assert.equal(doneId,id);if(!state.learned.includes(id))state.learned.push(id);}else assert.equal(doneId,null);
   assert.equal(round.completed+round.queue.length,round.total);
   assert.equal(round.attempts,roundAttempts);
   assert(roundAttempts<=roundIds.size+1,'an incorrect card failed to return for its retry');
  }
  const reward=awardRoundReward(state);rounds++;
  assert.equal(reward.assessed,roundIds.size);
  assert.equal(reward.attempts,roundIds.size+(rounds===1?1:0));
  assert.equal(reward.firstCorrect,roundIds.size-(rounds===1?1:0));
  assert.equal(reward.xp,10+5*reward.assessed+5*reward.firstCorrect);
  expectedXp+=reward.xp;
  assert.equal(state.rewards.xp,expectedXp);
  assert.equal(state.rewards.completedRounds,rounds);
  if(rounds===1){const recap=buildSetRecap(state);assert.equal(recap.complete,false);assert(recap.focusIds.includes(missedId));assert.equal(recap.items[missedId].incorrect,1);}
  const receipt=structuredClone(reward),savedRewards=structuredClone(state.rewards);
  state=JSON.parse(JSON.stringify(state));
  state.rewards=validateRewards(state.rewards);
  assert.deepEqual(validateRoundReward(state.round.reward),receipt);
  assert.deepEqual(awardRoundReward(state),receipt);
  assert.deepEqual(state.rewards,savedRewards);
 }
 const recap=buildSetRecap(state);
 assert.equal(recap.assessed,cards.length);assert.equal(recap.unassessed,0);assert.equal(recap.complete,true);
 assert.equal(recap.correct,totalAttempts-1);assert.equal(recap.incorrect,1);
 assert.equal(recap.attempts,totalAttempts);assert.equal(recap.markedOnly,0);assert.equal(recap.manual,0);
 for(const item of recap.items){assert.equal(item.correct,evidence[item.id].correct);assert.equal(item.incorrect,evidence[item.id].incorrect);}
 assert([...recap.focusIds,...recap.maintenanceIds].includes(missedId),'the earlier mistake disappeared from focus and maintenance review');
 assert.equal(state.rewards.xp,expectedXp);assert.equal(state.rewards.completedRounds,rounds);
});
