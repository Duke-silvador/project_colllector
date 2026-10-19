import test from 'node:test';import assert from 'node:assert/strict';
import {rankTrickyQuestions,trickyPracticeIds,newTrickyRound,advanceTrickyRound} from './tricky.js';
import {initializeMastery,recordMastery,setManualMastery,completeManualCard} from './mastery.js';
import {makeQuestion,answerQuestion} from './learn.js';import {awardRoundReward,initializeRewards} from './rewards.js';import {createStudyBackup,parseStudyBackup} from './backup.js';
const trickyCards=[{term:'What is privacy?',definition:'Control over personal data'},{term:'What is consent?',definition:'Voluntary informed agreement'},{term:'Which duties matter? Select all that apply.',definition:'Be honest\nAvoid harm',type:'multi',answers:['Be honest','Avoid harm'],options:['Be honest','Avoid harm','Hide risks']}];
const newTrickyState=()=>({title:'Tricky test',cards:trickyCards,known:[],learned:[],mastery:initializeMastery({cards:trickyCards}),rewards:initializeRewards()});
function trickyAnswer(state,correct=true){const r=state.round,id=r.queue[0];r.current=makeQuestion(state.cards,id,()=>.5);const q=r.current,choice=q.type==='multi'?(correct?q.answers:[q.answers[0]]):correct?q.answer:q.options.find(option=>option!==q.answer);assert(answerQuestion(r,choice));recordMastery(state.mastery,id,r.feedback.correct);return r;}

test('tricky ranking sorts recorded misses descending including archived question versions, with honest current streaks',()=>{
 const state=newTrickyState();for(let i=0;i<5;i++)recordMastery(state.mastery,0,false);for(let i=0;i<5;i++)recordMastery(state.mastery,1,false);recordMastery(state.mastery,0,true);recordMastery(state.mastery,1,true);recordMastery(state.mastery,1,true);
 state.mastery.cards[2].previousVersions=[{mastery:{incorrect:3,previousVersions:[{mastery:{incorrect:4}}]}}];recordMastery(state.mastery,2,false);const before=JSON.stringify(state),rows=rankTrickyQuestions(state);assert.deepEqual(rows.map(row=>[row.id,row.totalIncorrect]),[[2,8],[0,5],[1,5]]);assert.equal(rows[0].earlierIncorrect,7);assert.equal(rows[0].incorrect,1);assert.equal(rows[1].streak,1);assert.equal(rows[2].streak,2);assert.equal(JSON.stringify(state),before);
});
test('questions with no recorded misses stay out; strengthened and manual cards retain their historical ranking',()=>{
 const state=newTrickyState();assert.deepEqual(rankTrickyQuestions(state),[]);recordMastery(state.mastery,0,false);for(let i=0;i<3;i++)recordMastery(state.mastery,0,true);recordMastery(state.mastery,1,false);setManualMastery(state.mastery,1,true);const rows=rankTrickyQuestions(state);assert.deepEqual(rows.map(row=>row.id),[1,0]);assert.equal(rows[0].manual,true);assert.equal(rows[0].verified,false);assert.equal(rows[1].verified,true);assert.equal(rows[1].totalIncorrect,1);
});
test('bulk strengthening selects up to ten highest-ranked questions below3/3 and offers rechecks when all are verified',()=>{
 const rows=Array.from({length:15},(_,id)=>({id,verified:id<2}));assert.deepEqual(trickyPracticeIds(rows),[2,3,4,5,6,7,8,9,10,11]);assert.deepEqual(trickyPracticeIds(rows.map(row=>({...row,verified:true}))),[0,1,2,3,4,5,6,7,8,9]);assert.deepEqual(trickyPracticeIds([]),[]);
});
test('a targeted strengthening round only includes requested questions and does not reset genuine streaks',()=>{
 const state=newTrickyState();recordMastery(state.mastery,0,true);const before=structuredClone(state.mastery.cards);state.round=newTrickyRound(state.cards,state.mastery,[0,2,0],()=>.5);assert.equal(state.round.total,2);assert.deepEqual(new Set(state.round.queue),new Set([0,2]));assert.deepEqual(state.round.reviewIds,[]);assert.deepEqual(state.round.practice,{kind:'tricky',target:3,ids:state.round.baseIds});assert.deepEqual(state.mastery.cards,before);assert.throws(()=>newTrickyRound(state.cards,state.mastery,[]));assert.throws(()=>newTrickyRound(state.cards,state.mastery,[99]));
});
test('misses and successful retries remain in the same strengthening round until three consecutive correct answers',()=>{
 const state=newTrickyState();state.round=newTrickyRound(state.cards,state.mastery,[0]);
 for(const [i,correct] of [false,true,true,true].entries()){trickyAnswer(state,correct);assert.equal(awardRoundReward(state),null);assert.equal(advanceTrickyRound(state.round,state.mastery),correct?0:null);assert.equal(state.round.completed,i===3?1:0);assert.equal(state.round.queue.length,i===3?0:1);assert.equal(state.round.attempts,i+1);}
 assert.equal(state.mastery.cards[0].streak,3);assert.equal(state.mastery.cards[0].correct,3);assert.equal(state.mastery.cards[0].incorrect,1);assert.equal(state.round.firstCorrect,0);assert.equal(awardRoundReward(state).xp,15);assert.equal(state.rewards.completedRounds,1);awardRoundReward(state);assert.equal(state.rewards.xp,15);
});
test('one miss resets a partially strengthened card and multi-answer selections must be completely correct',()=>{
 const state=newTrickyState();state.round=newTrickyRound(state.cards,state.mastery,[2]);for(const [index,correct] of [true,true,false,true,true,true].entries()){trickyAnswer(state,correct);state.round.selection=[state.cards[2].answers[0]];advanceTrickyRound(state.round,state.mastery);assert.equal(state.round.selection,undefined);assert.equal(state.round.completed,index===5?1:0);}assert.equal(state.mastery.cards[2].correct,5);assert.equal(state.mastery.cards[2].incorrect,1);assert.equal(state.mastery.cards[2].streak,3);assert.equal(state.round.firstCorrect,1);assert.equal(awardRoundReward(state).xp,20);
});
test('existing2/3 progress counts and verified rechecks finish after one correct answer without resetting history',()=>{
 for(const initial of [2,3]){const state=newTrickyState();for(let i=0;i<initial;i++)recordMastery(state.mastery,0,true);state.round=newTrickyRound(state.cards,state.mastery,[0]);trickyAnswer(state);advanceTrickyRound(state.round,state.mastery);assert.equal(state.round.completed,1);assert.equal(state.mastery.cards[0].correct,initial+1);assert.equal(state.mastery.cards[0].streak,3);}
});
test('full backups preserve the Tricky tab, active goals, and pending credited feedback without granting duplicate mastery',()=>{
 const state=newTrickyState();state.lastActivity='tricky';state.round=newTrickyRound(state.cards,state.mastery,[0]);trickyAnswer(state);const restored=parseStudyBackup(JSON.stringify(createStudyBackup(state)));assert.deepEqual(restored,state);assert.equal(restored.mastery.cards[0].streak,1);advanceTrickyRound(restored.round,restored.mastery);assert.equal(restored.round.completed,0);assert.deepEqual(restored.round.queue,[0]);assert.equal(restored.mastery.cards[0].correct,1);assert.deepEqual(restored.rewards,state.rewards);
 for(const mutate of [r=>r.practice.target=1,r=>r.practice.kind='fake',r=>r.practice.ids=[],r=>r.practice.ids=[99],r=>r.practice.ids=[0,0]]){const backup=createStudyBackup(state);mutate(backup.progress.round);assert.throws(()=>parseStudyBackup(JSON.stringify(backup)));}
});
test('manual marks never satisfy the strengthening goal without genuine3/3 answers',()=>{
 const state=newTrickyState();setManualMastery(state.mastery,0,true);state.round=newTrickyRound(state.cards,state.mastery,[0]);trickyAnswer(state);advanceTrickyRound(state.round,state.mastery);assert.equal(state.round.completed,0);assert.equal(state.mastery.cards[0].streak,1);assert.equal(state.mastery.cards[0].manualMastered,true);completeManualCard(state.round,0);assert.equal(state.round.completed,1);assert.equal(state.mastery.cards[0].streak,1);assert.deepEqual(state.round.manualIds,[0]);
});
