// Learn questions use the deck's answer key. Distractors come from other cards.
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const isBoolean = answer => /^(t|f|true|false)$/i.test(answer.trim());
function allCorrectPracticeDistractors(card){
 const answers=card.answers;
 if(card.term.includes('Choosing Passwords: Security and Human Factors')&&answers.length===4&&['Reduce lockouts','Modify the lifetime limits','Make password management easier for the user','Allow a user to have much longer passwords, of a universal format'].every(answer=>answers.includes(answer)))return [
  'The author suggests passwords should be in different formats, for different devices.',
  'The author suggests computer systems should restrict password formats to make programming more convenient.'
 ];
 if(card.term.startsWith('Which of the following research topics have the potential to expose real people to harm?')&&answers.length===4&&['credit card fraud','spam','viruses','botnet'].every(answer=>answers.includes(answer)))return [
  'Comparing sorting algorithms using generated, non-personal numbers.',
  'Comparing font styles in fictional mockups without human participants.'
 ];
 return [];
}
export function makeQuestion(cards, id, random = Math.random) {
  const {term, definition} = cards[id];
  if (cards[id].type === 'multi') {
    const answers = [...cards[id].answers];
    const printedOptions=cards[id].options;
    if (Array.isArray(printedOptions)&&printedOptions.some(option=>!answers.includes(option))) return {type:'multi',prompt:term,answer:definition,answers,options:shuffle(printedOptions,random)};
    const practiceOptions=allCorrectPracticeDistractors(cards[id]);
    if(practiceOptions.length)return {type:'multi',prompt:term,answer:definition,answers,options:shuffle([...answers,...practiceOptions],random)};
    const seen = new Set(answers.map(normalize));
    const words = new Set((term + ' ' + definition).toLowerCase().match(/[a-z]{4,}/g) || []);
    const candidates = shuffle(cards, random).filter(card => {
      const key = normalize(card.definition);
      if (card.type === 'multi' || isBoolean(card.definition) || /^all$/i.test(card.definition) || seen.has(key) || answers.some(answer => key.includes(normalize(answer)) || normalize(answer).includes(key))) return false;
      seen.add(key); return true;
    }).map(card => ({answer:card.definition,score:(card.term.toLowerCase().match(/[a-z]{4,}/g) || []).filter(word => words.has(word)).length})).sort((a,b)=>b.score-a.score);
    return {type:'multi',prompt:term,answer:definition,answers,options:shuffle([...answers,...candidates.slice(0,3).map(candidate=>candidate.answer)],random)};
  }
  if (isBoolean(definition)) return {
    prompt: term.replace(/\s*(T\/F|True False)\s*$/i, ''),
    answer: /^(t|true)$/i.test(definition) ? 'True' : 'False', options: ['True', 'False']
  };
  // "All" answers need their original listed choices to remain meaningful.
  if (/^all$/i.test(definition)) return {
    prompt: term, answer: 'All of the listed options',
    options: shuffle(['All of the listed options', 'Only the first listed option', 'Only the last listed option', 'None of the listed options'], random)
  };
  const end = term.lastIndexOf('?');
  const prompt = end >= 0 ? term.slice(0, end + 1) : term;
  const correct = normalize(definition);
  const words = new Set((term + ' ' + definition).toLowerCase().match(/[a-z]{4,}/g) || []);
  const seen = new Set([correct]);
  const candidates = shuffle(cards, random).filter(card => {
    const key = normalize(card.definition);
    if (card.type === 'multi' || isBoolean(card.definition) || /^all$/i.test(card.definition) || seen.has(key) || key.includes(correct) || correct.includes(key)) return false;
    seen.add(key); return true;
  }).map(card => ({answer: card.definition, score: (card.term.toLowerCase().match(/[a-z]{4,}/g) || []).filter(word => words.has(word)).length})).sort((a,b)=>b.score-a.score);
  const options=shuffle([definition, ...candidates.slice(0,3).map(c=>c.answer)],random);
  return {prompt,answer:definition,options,type:options.length<2?'written':'choice'};
}
export function ensureQuestionDistractors(question,cards,id,random=Math.random){
 if(question.type!=='multi'||question.options.some(option=>!question.answers.includes(option)))return false;
 const fresh=makeQuestion(cards,id,random);
 const additions=fresh.options.filter(option=>!question.options.includes(option)&&!question.answers.includes(option));
 if(!additions.length)return false;
 question.options=shuffle([...question.options,...additions],random);
 return true;
}
export function newRound(cards, learned = [], random = Math.random) {
  const queue = shuffle(cards.map((_,id)=>id).filter(id=>!learned.includes(id)),random).slice(0,10);
  return {queue, total:queue.length, completed:0, attempts:0, firstCorrect:0, seen:[], current:null, feedback:null};
}
export function isLearnAnswerCorrect(question,choice){
  if(question.type==='multi')return Array.isArray(choice)&&choice.length===question.answers.length&&new Set(choice).size===choice.length&&choice.every(answer=>question.answers.includes(answer));
  if(typeof choice!=='string')return false;
  const written=question.type==='written'||question.options.length<2;
  const clean=text=>text.trim().toLowerCase().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
  return written?clean(choice)===clean(question.answer):choice===question.answer;
}
export function isAnswerProvided(question,value){
  return question.type==='multi'?Array.isArray(value)&&value.length>0:typeof value==='string'&&Boolean(value.trim());
}
export function answerQuestion(round, choice) {
  if (!round.current || round.feedback) return false;
  const id = round.queue[0], correct = isLearnAnswerCorrect(round.current,choice);
  if(round.current.type==='multi'){
    if(!Array.isArray(choice)||!choice.length||new Set(choice).size!==choice.length||choice.some(answer=>!round.current.options.includes(answer)))return false;
  }else{
    const written=round.current.type==='written'||round.current.options.length<2;
    if(typeof choice!=='string'||!choice.trim()||(!written&&!round.current.options.includes(choice)))return false;
  }
  round.attempts++;
  if (!round.seen.includes(id)) {round.seen.push(id);if(correct)round.firstCorrect++;}
  round.feedback = {choice:Array.isArray(choice)?[...choice]:choice, correct};
  return true;
}
export function advanceRound(round) {
  if (!round.feedback) return null;
  const id = round.queue.shift(), correct = round.feedback.correct;
  if (correct) round.completed++;
  else round.queue.push(id);
  round.current=null;round.feedback=null;
  delete round.selection;
  return correct ? id : null;
}
