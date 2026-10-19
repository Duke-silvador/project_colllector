import test from 'node:test';
import assert from 'node:assert/strict';
import {makeQuestion,newRound,answerQuestion,advanceRound,isLearnAnswerCorrect,isAnswerProvided} from './learn.js';
import {createExam,setExamAnswer,scoreExam,validateExam} from './exam.js';
import {createStudyBackup,parseStudyBackup,validateStudyState} from './backup.js';
import {initializeMastery,recordMastery,isCardMastered} from './mastery.js';

const cards=[
 {term:'Which practices protect privacy?',definition:'Limit collection\nProtect personal data',type:'multi',answers:['Limit collection','Protect personal data']},
 {term:'What can undermine privacy?',definition:'Unnecessary tracking'},
 {term:'What is confidentiality?',definition:'Restricting access to authorized people'},
 {term:'Which duties matter?',definition:'Be honest\nAvoid harm',type:'multi',answers:['Be honest','Avoid harm']}
];
const multiRound=()=>{const round=newRound(cards,[],()=>.99);round.current=makeQuestion(cards,round.queue[0]);return round;};

test('select-all grading requires exactly every correct choice in any order',()=>{
 const q=makeQuestion(cards,0);
 assert.equal(q.type,'multi');assert.equal(q.answer,cards[0].definition);
 assert(isLearnAnswerCorrect(q,[...q.answers].reverse()));
 for(const selection of [[q.answers[0]],[...q.answers,q.options.find(option=>!q.answers.includes(option))],[q.answers[0],q.answers[0]],[],q.answer,null])assert.equal(isLearnAnswerCorrect(q,selection),false);
 assert(isAnswerProvided(q,[q.answers[0]]));assert.equal(isAnswerProvided(q,[]),false);assert.equal(isAnswerProvided(q,q.answer),false);
 assert(isAnswerProvided({type:'written'},' An answer '));assert.equal(isAnswerProvided({type:'written'},' '),false);
});

test('select-all options use printed choices when supplied and never use combined multi answers as distractors',()=>{
 const explicit={...cards[0],options:[...cards[0].answers,'Share data publicly']};
 assert.deepEqual(new Set(makeQuestion([explicit,...cards.slice(1)],0).options),new Set(explicit.options));
 const q=makeQuestion(cards,0);assert(q.answers.every(answer=>q.options.includes(answer)));assert.equal(new Set(q.options).size,q.options.length);
 assert(!q.options.includes(cards[3].definition));
 const regular=makeQuestion(cards,1);assert(!regular.options.includes(cards[0].definition));assert(!regular.options.includes(cards[3].definition));
});

test('pending toggles do not grade, invalid submissions do not count, and committed choices are copied',()=>{
 const round=multiRound();assert.equal(round.current.type,'multi');
 round.selection=[round.current.answers[0]];
 assert.equal(round.attempts,0);assert.equal(round.feedback,null);
 for(const selection of [[],['not an option'],[round.current.answers[0],round.current.answers[0]],round.current.answer])assert.equal(answerQuestion(round,selection),false);
 assert.equal(round.attempts,0);
 const selected=[...round.current.answers];assert(answerQuestion(round,selected));selected.pop();
 assert.deepEqual(round.feedback.choice,round.current.answers);assert(round.feedback.correct);
 assert.equal(answerQuestion(round,round.current.answers),false);assert.equal(round.attempts,1);
 advanceRound(round);assert.equal(round.selection,undefined);
});

test('incomplete select-all answers requeue and mastery still requires three consecutive complete answers',()=>{
 const mastery=initializeMastery({cards});const round=multiRound();
 answerQuestion(round,[round.current.answers[0]]);recordMastery(mastery,0,round.feedback.correct);
 assert.equal(advanceRound(round),null);assert.equal(round.queue.at(-1),0);assert.equal(mastery.cards[0].incorrect,1);
 for(let streak=1;streak<=3;streak++){
  const one={queue:[0],total:1,completed:0,attempts:0,firstCorrect:0,seen:[],feedback:null,current:makeQuestion(cards,0)};
  assert(answerQuestion(one,[...one.current.answers].reverse()));recordMastery(mastery,0,one.feedback.correct);advanceRound(one);
  assert.equal(mastery.cards[0].streak,streak);assert.equal(isCardMastered(mastery.cards[0]),streak===3);
 }
});

test('Learn backups round trip pending select-all choices and checked feedback',()=>{
 const state={title:'Privacy',cards,known:[],learned:[],round:multiRound(),lastActivity:'learn'};
 state.round.selection=[state.round.current.answers[0]];
 const pending=parseStudyBackup(JSON.stringify(createStudyBackup(state)));assert.deepEqual(pending,state);
 answerQuestion(state.round,state.round.selection);
 assert.deepEqual(parseStudyBackup(JSON.stringify(createStudyBackup(state))),state);
 for(const change of [copy=>copy.round.selection.push(copy.round.selection[0]),copy=>copy.round.feedback.choice=['fake'],copy=>copy.round.current.answers=['fake'],copy=>copy.round.feedback.correct=true]){
  const copy=structuredClone(state);change(copy);assert.throws(()=>validateStudyState(copy));
 }
});

test('exam select-all edits remain ungraded until submit, clone arrays, and count empty selections as unanswered',()=>{
 const exam=createExam(cards,()=>.99),index=exam.questions.findIndex(q=>q.cardId===0),q=exam.questions[index];
 assert.equal(q.type,'multi');assert.equal(exam.submittedAt,null);
 for(const selection of [['fake'],[q.answers[0],q.answers[0]],q.answer])assert.equal(setExamAnswer(exam,index,selection),false);
 assert(setExamAnswer(exam,index,[q.answers[0]]));assert.equal(scoreExam(exam).incorrect,1);
 assert(setExamAnswer(exam,index,[]));assert.equal(scoreExam(exam).unanswered,cards.length);
 const selected=[...q.answers].reverse();assert(setExamAnswer(exam,index,selected));selected.pop();
 assert.equal(scoreExam(exam).correct,1);assert.deepEqual(exam.answers[index],[...q.answers].reverse());
 assert.equal(exam.submittedAt,null);assert(!Object.hasOwn(exam,'score'));assert(!Object.hasOwn(exam.questions[index],'correct'));
 assert.deepEqual(validateExam(exam,cards),exam);
 const state={title:'Privacy',cards,known:[],learned:[],exam,lastActivity:'exam'};
 assert.deepEqual(parseStudyBackup(JSON.stringify(createStudyBackup(state))),state);
 for(const change of [copy=>copy.questions[index].answers=['fake'],copy=>copy.questions[index].answer='fake',copy=>copy.answers[index]=[q.answers[0],q.answers[0]],copy=>copy.questions[index].type='choice']){
  const copy=structuredClone(exam);change(copy);assert.throws(()=>validateExam(copy,cards));
 }
});

test('manually completing a pending select-all question clears its ungraded selection',async()=>{
 const {completeManualCard,setManualMastery}=await import('./mastery.js');
 const cards=[{term:'Which statements apply?',definition:'Alpha\nBeta',type:'multi',answers:['Alpha','Beta'],options:['Alpha','Beta','Gamma']}];
 const mastery=initializeMastery({cards}),round={queue:[0],total:1,completed:0,attempts:0,firstCorrect:0,seen:[],current:makeQuestion(cards,0),feedback:null,selection:['Alpha']};
 setManualMastery(mastery,0,true);assert(completeManualCard(round,0));assert.equal(round.selection,undefined);assert.equal(round.attempts,0);assert.equal(mastery.cards[0].correct,0);
 const restored=parseStudyBackup(JSON.stringify(createStudyBackup({cards,known:[],learned:[],mastery,round})));assert.equal(restored.round.selection,undefined);assert.equal(restored.mastery.cards[0].manualMastered,true);
});

test('all-correct PDF questions gain incorrect practice choices without changing source keys or Flashcards choices',async()=>{
 const {readFileSync}=await import('node:fs');const deck=JSON.parse(readFileSync(new URL('./deck.json',import.meta.url))).cards;const source=JSON.parse(readFileSync(new URL('./source-deck.json',import.meta.url))).cards;const before=JSON.stringify(deck);
 const ids=deck.flatMap((card,id)=>card.type==='multi'&&card.options?.every(option=>card.answers.includes(option))?[id]:[]);assert.equal(ids.length,2);
 for(const id of ids){const card=deck[id],question=makeQuestion(deck,id,()=>.5);assert.equal(question.answers.length,4);assert.equal(question.options.length,6);assert.equal(card.options.length,4);assert(question.options.some(option=>!question.answers.includes(option)));assert(isLearnAnswerCorrect(question,card.answers));assert(!isLearnAnswerCorrect(question,question.options));assert(!isLearnAnswerCorrect(question,card.answers.slice(1)));if(card.term.includes('Choosing Passwords'))for(const option of question.options.filter(option=>!card.answers.includes(option)))assert(source.some(original=>original.term.includes(option)),'password practice distractors must come from printed source choices');}
 assert.equal(JSON.stringify(deck),before);
});
test('unanswered saved all-correct snapshots gain choices once while preserving their selection and scores',async()=>{
 const {ensureQuestionDistractors}=await import('./learn.js');const {readFileSync}=await import('node:fs');const deck=JSON.parse(readFileSync(new URL('./deck.json',import.meta.url))).cards;const id=deck.findIndex(card=>card.type==='multi'&&card.term.includes('role of the computer scientist'));
 const card=deck[id],round={queue:[id],total:1,completed:0,attempts:0,firstCorrect:0,seen:[],current:{type:'multi',prompt:card.term,answer:card.definition,answers:[...card.answers],options:[...card.options]},feedback:null,selection:[card.answers[0]]};const before=structuredClone(round);
 assert(ensureQuestionDistractors(round.current,deck,id,()=>.5));const copy=structuredClone(round);assert(!ensureQuestionDistractors(round.current,deck,id));assert.deepEqual(round,copy);assert.deepEqual({...round,current:null},{...before,current:null});assert.deepEqual({...round.current,options:[]},{...before.current,options:[]});
 const restored=parseStudyBackup(JSON.stringify(createStudyBackup({cards:deck,known:[],learned:[],round})));assert.deepEqual(restored.round,round);
});
test('new exams use extra choices for all-correct source questions and still require exact answers',async()=>{
 const {readFileSync}=await import('node:fs');const deck=JSON.parse(readFileSync(new URL('./deck.json',import.meta.url))).cards;const exam=createExam(deck,()=>.5);const index=exam.questions.findIndex(question=>question.prompt.includes('role of the computer scientist'));const question=exam.questions[index];assert.equal(question.options.length,6);assert(setExamAnswer(exam,index,question.options));assert.equal(scoreExam(exam).rows[index].correct,false);assert(setExamAnswer(exam,index,question.answers));assert.equal(scoreExam(exam).rows[index].correct,true);assert.deepEqual(validateExam(exam,deck),exam);
});
