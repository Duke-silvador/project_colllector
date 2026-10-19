import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createFlashcards,flashcardLayout,initializeFlashProgress,markFlashFamiliar,flashcardsFromImport,validateFlashcards} from './flashcards.js';
import {prepareStudyCards} from './source-upgrade.js';import {initializeMastery} from './mastery.js';import {migrateStudyCards} from './merge-progress.js';import {createStudyBackup,parseStudyBackup} from './backup.js';
const source=JSON.parse(readFileSync(new URL('./source-deck.json',import.meta.url))).cards;const cards=JSON.parse(readFileSync(new URL('./deck.json',import.meta.url))).cards;
test('Flashcards restores all94 original records in source order while Learn remains80 combined questions',()=>{
 const before=JSON.stringify(cards),entries=createFlashcards({cards},source);assert.equal(entries.length,94);assert.equal(cards.length,80);assert.equal(JSON.stringify(cards),before);
 assert.deepEqual(entries.map(entry=>entry.term),source.map(card=>card.term));assert.equal(entries[1].cardId,entries[2].cardId);assert.notEqual(entries[1].definition,entries[2].definition);assert.equal(entries[29].cardId,entries[33].cardId);
 assert.equal(flashcardLayout(entries[0]).answerLines[0].code,'B)');assert.equal(flashcardLayout(entries[2]).answerLines[0].code,'D)');
});
test('printed alternatives stay distinct across missing punctuation, abbreviations, and quoted text',()=>{
 const entries=createFlashcards({cards},source);for(const id of [0,1,5,29,33,80,83])assert.equal(flashcardLayout(entries[id]).options.length,4,`source card${id+1}`);
 assert.equal(flashcardLayout(entries[1]).answerLines[0].code,'B)');assert.match(flashcardLayout(entries[5]).options[0],/J\. Marion Sims/);
 assert.match(flashcardLayout(entries[80]).options[1],/e\.g\. 'priority,' 'round-robin,' etc\.\)/);assert.equal(flashcardLayout(entries[80]).answerLines[0].code,'C)');
 assert(!flashcardLayout(entries[0]).prompt.includes('Facebook has'));assert.match(flashcardLayout(entries[83]).prompt,/which of the following statements is the most correct\?$/);
});
test('native select-all and true-false flashcards retain their own labeled choices and answer rows',()=>{
 const entries=createFlashcards({cards},source);assert.deepEqual(flashcardLayout(entries[41]).options,['intimacy','solitude','iron cage','reserve']);assert.deepEqual(flashcardLayout(entries[41]).answerLines.map(answer=>answer.code),['A)','B)','D)']);
 assert.deepEqual(flashcardLayout(entries[35]).answerLines.map(answer=>answer.code),['B)','C)','D)']);assert.deepEqual(flashcardLayout(entries[15]).options,['True','False']);assert.equal(flashcardLayout(entries[15]).answerLines[0].code,'B)');
});
const original=[{term:'Which practices protect privacy? Encrypt data. Publish passwords.',definition:'Encrypt data.'},{term:'Which practices protect privacy? Collect less data. Sell private messages.',definition:'Collect less data.'},{term:'Define consent',definition:'Informed agreement'}];
function flashTestState(){const plan=prepareStudyCards(original),state={title:'Privacy',cards:plan.cards,known:[],learned:[],mastery:initializeMastery({cards:plan.cards}),rewards:{version:1,xp:150,completedRounds:2,recapShown:false}};state.flashcards=flashcardsFromImport(original,plan);initializeFlashProgress(state);return state;}
test('imported duplicates retain individual options and independent familiarity without changing Learn evidence',()=>{
 const state=flashTestState(),before=JSON.stringify([state.cards,state.mastery,state.rewards]);assert.equal(state.cards.length,2);assert.equal(state.flashcards.length,3);
 markFlashFamiliar(state,0,true);assert.deepEqual(state.flashKnown,[0]);assert.deepEqual(state.known,[]);markFlashFamiliar(state,1,true);assert.deepEqual(state.known,[0]);markFlashFamiliar(state,0,false);assert.deepEqual(state.flashKnown,[1]);assert.deepEqual(state.known,[]);assert.equal(JSON.stringify([state.cards,state.mastery,state.rewards]),before);
 assert.deepEqual(flashcardLayout(state.flashcards[0]).options,['Encrypt data.','Publish passwords.']);assert.deepEqual(flashcardLayout(state.flashcards[1]).options,['Collect less data.','Sell private messages.']);
});
test('old grouped familiarity migrates to original cards once and individual progress survives full backups',()=>{
 const state={cards,known:[1],learned:[],mastery:initializeMastery({cards})};initializeFlashProgress(state,source);assert.deepEqual(state.flashKnown,[1,2]);markFlashFamiliar(state,1,false);const backup=createStudyBackup(state),restored=parseStudyBackup(JSON.stringify(backup));initializeFlashProgress(restored,source);assert.deepEqual(restored.flashKnown,[2]);assert.deepEqual(restored.flashcards,state.flashcards);
});
test('archived custom duplicate sources can restore the individual Flashcards view',()=>{
 const state={cards:original,known:[],learned:[],mastery:initializeMastery({cards:original})};migrateStudyCards(state);const entries=createFlashcards(state);assert.equal(entries.length,3);assert.equal(entries[0].term,original[0].term);assert.equal(entries[1].term,original[1].term);
});
test('original-card references remap safely during a later Learn consolidation',()=>{
 const state={cards:original,known:[],learned:[],flashcards:original.map((card,cardId)=>({...card,cardId})),flashKnown:[1]};migrateStudyCards(state);assert.deepEqual(state.flashcards.map(entry=>entry.cardId),[0,0,1]);assert.deepEqual(state.flashKnown,[1]);assert.deepEqual(parseStudyBackup(JSON.stringify(createStudyBackup(state))).flashcards,state.flashcards);
});
test('malformed original card references and familiarity are rejected before backup restoration',()=>{
 const state=flashTestState();for(const mutate of [value=>value.flashcards[0].cardId=99,value=>value.flashKnown=[99],value=>value.flashcards=value.flashcards.slice(0,2)]){const bad=structuredClone(state);mutate(bad);assert.throws(()=>createStudyBackup(bad));}assert.throws(()=>validateFlashcards([],state.cards));
});
