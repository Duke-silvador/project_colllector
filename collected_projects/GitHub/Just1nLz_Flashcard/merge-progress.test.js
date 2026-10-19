import test from 'node:test';
import assert from 'node:assert/strict';
import {consolidateCards} from './duplicates.js';
import {migrateStudyCards} from './merge-progress.js';
import {initializeMastery,recordMastery} from './mastery.js';
import {makeQuestion} from './learn.js';
import {createExam} from './exam.js';

const migrationTestCards=()=>[
 {term:'Which actions protect privacy?',definition:'Encrypt sensitive files'},
 {term:'Define informed consent',definition:'Permission given with knowledge of relevant facts'},
 {term:'Which actions protect privacy?',definition:'Collect only necessary data'},
 {term:'Define accountability',definition:'Taking responsibility for decisions'},
 {term:'Define transparency',definition:'Openness about decisions and data use'}
];
const migrationTestState=()=>{
 const cards=migrationTestCards();
 const state={title:'Ethics',cards,known:[0,3,2,4],learned:[3,2,0],rewards:{version:1,xp:230,completedRounds:3,recapShown:true},soundEnabled:true,feedbackStreak:2};
 state.mastery=initializeMastery(state);state.mastery.roundNumber=7;
 for(let i=0;i<3;i++)recordMastery(state.mastery,0,true);
 recordMastery(state.mastery,2,false);
 recordMastery(state.mastery,2,true);
 state.mastery.cards[3].manualMastered=true;
 state.mastery.cards[3].lastReviewRound=5;
 return state;
};

test('a deck without consolidation leaves every state field exactly unchanged',()=>{
 const state=migrationTestState();state.cards[2].term='Which action minimizes data collection?';
 const before=structuredClone(state),result=migrateStudyCards(state);
 assert.equal(result.changed,false);assert.equal(result.state,state);assert.deepEqual(state,before);
 assert.deepEqual(result.updatedIds,[]);assert.equal(result.roundRestarted,false);assert.equal(result.examArchived,false);
});

test('merging distinct answer keys preserves unrelated mastery and rewards but requires full-answer reassessment',()=>{
 const state=migrationTestState(),before=structuredClone(state),plan=consolidateCards(state.cards),result=migrateStudyCards(state,plan);
 assert.equal(result.changed,true);assert.deepEqual(result.updatedIds,[0]);assert.equal(state.cards.length,4);
 assert.deepEqual(state.known,[0,2,3]);assert.deepEqual(state.learned,[2,0]);
 assert.deepEqual(state.rewards,{...before.rewards,recapShown:false});assert.equal(state.feedbackStreak,2);assert.equal(state.soundEnabled,true);
 assert.equal(state.mastery.clock,before.mastery.clock);assert.equal(state.mastery.roundNumber,7);
 assert.deepEqual(state.mastery.cards[2],before.mastery.cards[3]);assert.deepEqual(state.mastery.cards[3],before.mastery.cards[4]);
 assert.deepEqual(state.mastery.cards[0],{streak:0,correct:0,incorrect:0,lastSeen:0,manualMastered:false,previousVersions:[
  {cardId:0,card:before.cards[0],mastery:before.mastery.cards[0]},
  {cardId:2,card:before.cards[2],mastery:before.mastery.cards[2]}
 ]});
 assert.deepEqual(state.cardMigration,{version:1,fromCount:5,toCount:4,mergedCount:1});
 assert.equal(migrateStudyCards(state).changed,false);assert.deepEqual(state.rewards,{...before.rewards,recapShown:false});
});

test('unaffected in-progress round remaps IDs and retains exact pending feedback, options, selection, and scores',()=>{
 const state=migrationTestState(),current=makeQuestion(state.cards,3,()=>.5);
 state.round={queue:[3,4],total:3,completed:1,attempts:2,firstCorrect:1,seen:[1,3],current,feedback:{choice:current.options.find(option=>option!==current.answer),correct:false},baseIds:[1,3,4],reviewIds:[],manualIds:[],roundNumber:7};
 const before=structuredClone(state.round),result=migrateStudyCards(state);
 assert.equal(result.roundRestarted,false);assert.equal(result.examArchived,false);
 assert.deepEqual(state.round,{...before,queue:[2,3],seen:[1,2],baseIds:[1,2,3]});
 assert.equal(state.cardMigration.previousRound,undefined);
});

test('a round containing a merged question is archived without earning an interrupted-round reward',()=>{
 const state=migrationTestState(),current=makeQuestion(state.cards,0,()=>.5);
 state.round={queue:[0,4],total:3,completed:1,attempts:2,firstCorrect:1,seen:[3,0],current,feedback:{choice:current.options.find(option=>option!==current.answer),correct:false},baseIds:[0,3,4],reviewIds:[],manualIds:[],roundNumber:7};
 const before=structuredClone(state),result=migrateStudyCards(state);
 assert.equal(result.roundRestarted,true);assert.equal(state.round,null);
 assert.deepEqual(state.cardMigration.previousRound,before.round);assert.deepEqual(state.cardMigration.previousCards,before.cards);
 assert.deepEqual(state.rewards,{...before.rewards,recapShown:false});assert.equal(state.mastery.cards[0].correct,0);assert.equal(state.mastery.cards[0].incorrect,0);
});

test('a merged card already completed or manually skipped also prevents an old round from claiming the new schema',()=>{
 const state=migrationTestState();
 state.round={queue:[4],total:2,completed:1,attempts:0,firstCorrect:0,seen:[],current:null,feedback:null,baseIds:[0,4],reviewIds:[],manualIds:[0],roundNumber:7};
 assert.equal(migrateStudyCards(state).roundRestarted,true);assert.equal(state.round,null);
 assert.deepEqual(state.cardMigration.previousRound.manualIds,[0]);
});

test('full-set exam and its original card IDs survive in an archive instead of being rescored as select-all answers',()=>{
 const state=migrationTestState();state.exam=createExam(state.cards,()=>.5,new Date('2026-10-17T12:00:00Z'));
 state.exam.answers[0]=state.exam.questions[0].answer;
 const exam=structuredClone(state.exam),cards=structuredClone(state.cards),result=migrateStudyCards(state);
 assert.equal(result.examArchived,true);assert.equal(state.exam,undefined);
 assert.deepEqual(state.cardMigration.previousExam,exam);assert.deepEqual(state.cardMigration.previousCards,cards);
});

test('legacy evidence is initialized before merging and archived rather than fabricated as multi-answer proficiency',()=>{
 const cards=migrationTestCards(),current=makeQuestion(cards,0,()=>.5);
 const state={cards,known:[4],learned:[0,3],round:{queue:[0],seen:[0],total:1,completed:0,attempts:1,firstCorrect:0,current,feedback:{choice:current.options.find(option=>option!==current.answer),correct:false}}};
 migrateStudyCards(state);
 assert.equal(state.mastery.cards[0].streak,0);assert.equal(state.mastery.cards[0].correct,0);
 assert.equal(state.mastery.cards[0].previousVersions[0].mastery.correct,1);
 assert.equal(state.mastery.cards[0].previousVersions[0].mastery.incorrect,1);
 assert.equal(state.mastery.cards[0].previousVersions[0].mastery.streak,0);
 assert.equal(state.mastery.cards[2].streak,1);assert.equal(state.mastery.cards[2].correct,1);
 assert.equal(state.rewards,undefined);
});

test('later deck upgrades preserve earlier migration archives and full nested per-card histories',()=>{
 const state=migrationTestState();state.cardMigration={version:1,fromCount:6,toCount:5,mergedCount:1,previousRound:{queue:[5]}};
 state.mastery.cards[0].previousVersions=[{cardId:5,card:{term:'Earlier question',definition:'Earlier answer'},mastery:{streak:1,correct:1,incorrect:0,lastSeen:0}}];
 const before=structuredClone(state);migrateStudyCards(state);
 assert.deepEqual(state.cardMigration.previousMigration,before.cardMigration);
 assert.deepEqual(state.mastery.cards[0].previousVersions[0].mastery.previousVersions,before.mastery.cards[0].previousVersions);
});

test('invalid mapping is rejected before any state mutation',()=>{
 const state=migrationTestState(),before=structuredClone(state),plan=consolidateCards(state.cards);plan.oldToNew[4]=0;
 assert.throws(()=>migrateStudyCards(state,plan),/mapping/);assert.deepEqual(state,before);
});
