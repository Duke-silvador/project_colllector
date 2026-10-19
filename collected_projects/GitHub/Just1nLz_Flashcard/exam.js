import {makeQuestion,shuffle,isLearnAnswerCorrect,isAnswerProvided} from './learn.js';
export function createExam(cards,random=Math.random,now=new Date()){
 if(!cards.length)throw new Error('Import a study set before starting an exam.');
 return {questions:shuffle(cards.map((_,id)=>id),random).map(cardId=>{const q=makeQuestion(cards,cardId,random);return {...q,cardId,type:q.type==='multi'?'multi':q.options.length<2?'written':'choice'};}),answers:cards.map(()=>null),flagged:[],cursor:0,startedAt:now.toISOString(),submittedAt:null};
}
export function setExamAnswer(exam,index,answer){
 if(exam.submittedAt||!Number.isInteger(index)||index<0||index>=exam.questions.length)return false;
 const q=exam.questions[index];
 if(answer!==null){
  if(q.type==='multi'){
   if(!Array.isArray(answer)||new Set(answer).size!==answer.length||answer.some(option=>!q.options.includes(option)))return false;
  }else if(typeof answer!=='string'||(q.type!=='written'&&!q.options.includes(answer)))return false;
 }
 exam.answers[index]=Array.isArray(answer)?[...answer]:answer;return true;
}
export function scoreExam(exam){
 const rows=exam.questions.map((q,i)=>({index:i,cardId:q.cardId,prompt:q.prompt,answer:q.answer,chosen:Array.isArray(exam.answers[i])?[...exam.answers[i]]:exam.answers[i],correct:isLearnAnswerCorrect(q,exam.answers[i])}));
 const correct=rows.filter(r=>r.correct).length,unanswered=exam.questions.filter((q,i)=>!isAnswerProvided(q,exam.answers[i])).length,total=rows.length;
 return {rows,total,correct,unanswered,incorrect:total-correct-unanswered,percent:total?Math.round(correct/total*100):0};
}
export function submitExam(exam,now=new Date()){
 if(!exam.submittedAt)exam.submittedAt=now.toISOString();return scoreExam(exam);
}
export function validateExam(value,cards){
 if(!value||!Array.isArray(value.questions)||value.questions.length!==cards.length||!Array.isArray(value.answers)||value.answers.length!==value.questions.length)throw new Error('Invalid saved exam.');
 const e=JSON.parse(JSON.stringify(value)),ids=new Set();
 e.questions.forEach((q,i)=>{
  if(!q||!Number.isInteger(q.cardId)||q.cardId<0||q.cardId>=cards.length||ids.has(q.cardId)||typeof q.prompt!=='string'||typeof q.answer!=='string'||!['written','choice','multi'].includes(q.type)||!Array.isArray(q.options)||!q.options.length||q.options.some(o=>typeof o!=='string'||!o.trim())||new Set(q.options).size!==q.options.length)throw new Error('Invalid saved exam question or answer.');
  const card=cards[q.cardId],answer=e.answers[i];
  if(q.type==='multi'){
   if(card.type!=='multi'||!Array.isArray(q.answers)||q.answers.length<2||new Set(q.answers).size!==q.answers.length||q.answers.some(option=>typeof option!=='string'||!q.options.includes(option))||q.answer!==card.definition||q.answers.length!==card.answers.length||q.answers.some(option=>!card.answers.includes(option))||(answer!==null&&(!Array.isArray(answer)||new Set(answer).size!==answer.length||answer.some(option=>!q.options.includes(option)))))throw new Error('Invalid saved select-all exam answer.');
  }else if(card.type==='multi'||(q.type==='choice'&&(q.options.length<2||!q.options.includes(q.answer)))||(answer!==null&&(typeof answer!=='string'||(q.type==='choice'&&!q.options.includes(answer)))))throw new Error('Invalid saved exam question or answer.');
  ids.add(q.cardId);
 });
 if(!Number.isInteger(e.cursor)||e.cursor<0||e.cursor>=cards.length||!Array.isArray(e.flagged)||e.flagged.some(i=>!Number.isInteger(i)||i<0||i>=cards.length)||new Set(e.flagged).size!==e.flagged.length||!Number.isFinite(Date.parse(e.startedAt))||(e.submittedAt!==null&&(!Number.isFinite(Date.parse(e.submittedAt))||Date.parse(e.submittedAt)<Date.parse(e.startedAt))))throw new Error('Invalid saved exam progress.');
 return e;
}
