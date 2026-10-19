import test from 'node:test';import assert from 'node:assert/strict';
import {createStudyBackup,parseStudyBackup,validateStudyState} from './backup.js';
import {newRound,makeQuestion,answerQuestion,advanceRound} from './learn.js';
import {awardRoundReward,initializeRewards} from './rewards.js';
import {initializeMastery} from './mastery.js';
const cards=[{term:'Ethics?',definition:'Moral principles'},{term:'Privacy?',definition:'Control of personal information'},{term:'Duty?',definition:'An obligation'}];
function progress(){const r=newRound(cards,[],()=>.5);r.current=makeQuestion(cards,r.queue[0]);answerQuestion(r,r.current.answer);const learned=advanceRound(r);r.current=makeQuestion(cards,r.queue[0]);answerQuestion(r,r.current.options.find(x=>x!==r.current.answer));return {title:'My ethics set',cards,known:[0,2],learned:[learned],round:r,lastActivity:'learn'};}
test('full backup round trips mastery, scores, missed-card queue, choices, and pending feedback exactly',()=>{const state=progress();const restored=parseStudyBackup(JSON.stringify(createStudyBackup(state)));assert.deepEqual(restored,state);advanceRound(restored.round);assert.equal(restored.round.queue.length,2);assert.equal(restored.round.attempts,2);});
test('legacy state without Learn fields migrates without losing self-marked familiarity',()=>{assert.deepEqual(validateStudyState({cards,known:[1]}),{title:'My study set',cards,known:[1],learned:[]});});
test('card-only exports are distinguished from full progress backups',()=>{assert.equal(parseStudyBackup(JSON.stringify({cards,title:'Old export'})),null);});
test('invalid or newer-version backups are rejected before restoration',()=>{const backup=createStudyBackup(progress());for(const change of [b=>b.version=2,b=>b.progress.known=[99],b=>b.progress.round.current.options=[],b=>b.progress.round.feedback.correct=!b.progress.round.feedback.correct,b=>delete b.progress]){const copy=structuredClone(backup);change(copy);assert.throws(()=>parseStudyBackup(JSON.stringify(copy)));}});
test('rewards, completion receipt, and full-set recap flag survive a backup without duplicate XP',()=>{
 const state={title:'Rewards',cards,known:[],learned:[0,1,2],mastery:initializeMastery({cards}),round:{queue:[],total:3,completed:3,attempts:4,firstCorrect:2,seen:[0,1,2],current:null,feedback:null},rewards:initializeRewards()};
 awardRoundReward(state);state.rewards.recapShown=true;
 const restored=parseStudyBackup(JSON.stringify(createStudyBackup(state)));assert.deepEqual(restored,state);awardRoundReward(restored);assert.deepEqual(restored.rewards,state.rewards);assert.equal(restored.rewards.xp,35);
});
test('backup rejects malformed reward state and completion receipts on unfinished rounds',()=>{
 const backup=createStudyBackup(progress());backup.progress.rewards={version:1,xp:-10,completedRounds:0,recapShown:false};assert.throws(()=>parseStudyBackup(JSON.stringify(backup)));
 delete backup.progress.rewards;backup.progress.round.reward={version:1,xp:10,assessed:0,firstCorrect:0,attempts:0,manual:3,total:3,badge:'manual',title:'A step forward'};assert.throws(()=>parseStudyBackup(JSON.stringify(backup)));
});

test('merged question history and archived original round/exam survive full backup restoration',async()=>{
 const {migrateStudyCards}=await import('./merge-progress.js');const {prepareStudyCards}=await import('./source-upgrade.js');const {createExam}=await import('./exam.js');
 const {readFileSync}=await import('node:fs');const original=JSON.parse(readFileSync(new URL('./source-deck.json',import.meta.url))).cards;
 const round={queue:[1],total:1,completed:0,attempts:0,firstCorrect:0,seen:[],current:makeQuestion(original,1),feedback:null};
 const state={title:'Original ethics',cards:original,known:[1,2,4],learned:[1,2],mastery:initializeMastery({cards:original,learned:[1,2]}),round,exam:createExam(original),rewards:{version:1,xp:710,completedRounds:7,recapShown:true}};
 answerQuestion(round,round.current.options.find(option=>option!==round.current.answer));
 migrateStudyCards(state,prepareStudyCards(original));
 const restored=parseStudyBackup(JSON.stringify(createStudyBackup(state)));
 assert.equal(restored.cards.length,80);assert.deepEqual(restored.cardMigration,state.cardMigration);assert.deepEqual(restored.mastery,state.mastery);assert.deepEqual(restored.rewards,state.rewards);
 assert.equal(restored.cardMigration.previousRound.feedback.correct,false);assert.equal(restored.cardMigration.previousExam.questions.length,94);assert.equal(restored.cardMigration.previousCards.length,94);
 const invalid=createStudyBackup(state);invalid.progress.cardMigration.toCount=79;invalid.progress.cardMigration.mergedCount=15;assert.throws(()=>parseStudyBackup(JSON.stringify(invalid)),/does not match/);
});
