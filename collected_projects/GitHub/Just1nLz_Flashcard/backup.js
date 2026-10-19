import {isLearnAnswerCorrect} from './learn.js';
import {validateMastery} from './mastery.js';
import {validateExam} from './exam.js';
import {parseCards} from './cards.js';
import {validateRewards,validateRoundReward} from './rewards.js';
import {validateFlashcards} from './flashcards.js';
function validateCardMigration(value,depth=0){
 if(!value||depth>10||value.version!==1||!['fromCount','toCount','mergedCount'].every(key=>Number.isInteger(value[key])&&value[key]>=0)||value.toCount>value.fromCount||value.mergedCount!==value.fromCount-value.toCount||(value.dismissed!==undefined&&typeof value.dismissed!=='boolean'))throw new Error('Invalid archived question update.');
 const result=JSON.parse(JSON.stringify(value));
 if(result.previousCards){result.previousCards=parseCards(JSON.stringify(result.previousCards));if(result.previousCards.length!==result.fromCount)throw new Error('Archived questions do not match their update.');}
 if(result.previousRound||result.previousExam){if(!result.previousCards)throw new Error('Missing questions for archived study history.');validateStudyState({cards:result.previousCards,round:result.previousRound,exam:result.previousExam});}
 if(result.previousMigration)result.previousMigration=validateCardMigration(result.previousMigration,depth+1);
 return result;
}
export function validateStudyState(input) {
  if(!input||typeof input!=='object')throw new Error('Backup has no study data.');
  const cards=parseCards(JSON.stringify(input.cards));
  const validId=id=>Number.isInteger(id)&&id>=0&&id<cards.length;
  function ids(value,label){if(value===undefined)return [];if(!Array.isArray(value)||value.some(id=>!validId(id))||new Set(value).size!==value.length)throw new Error(`Invalid ${label} in backup.`);return [...value];}
  const state={title:typeof input.title==='string'?input.title.slice(0,120):'My study set',cards,known:ids(input.known,'flashcard progress'),learned:ids(input.learned,'learning progress')};
  if(input.flashcards){state.flashcards=validateFlashcards(input.flashcards,cards);if(input.flashKnown!==undefined){if(!Array.isArray(input.flashKnown)||input.flashKnown.some(id=>!Number.isInteger(id)||id<0||id>=state.flashcards.length)||new Set(input.flashKnown).size!==input.flashKnown.length)throw new Error('Invalid original flashcard progress.');state.flashKnown=[...input.flashKnown];}}
  if(input.round){
    const r=JSON.parse(JSON.stringify(input.round));
    r.queue=ids(r.queue,'round queue');r.seen=ids(r.seen,'round history');
    if(r.baseIds!==undefined){r.baseIds=ids(r.baseIds,'core card IDs');r.reviewIds=ids(r.reviewIds,'past-mistake review IDs');r.manualIds=ids(r.manualIds,'manually completed IDs');const selected=[...r.baseIds,...r.reviewIds];if(new Set(selected).size!==selected.length||selected.length!==r.total||r.baseIds.length>10||r.reviewIds.length>3||r.queue.some(id=>!selected.includes(id))||r.seen.some(id=>!selected.includes(id))||r.manualIds.some(id=>!selected.includes(id)||r.queue.includes(id))||(r.roundNumber!==undefined&&(!Number.isInteger(r.roundNumber)||r.roundNumber<0)))throw new Error('Invalid round review mix in backup.');}
    if(!['total','completed','attempts','firstCorrect'].every(k=>Number.isInteger(r[k])&&r[k]>=0)||r.total>cards.length||r.completed>r.total||r.firstCorrect>r.seen.length||r.seen.length>r.total||r.attempts<r.seen.length||r.queue.length+r.completed!==r.total)throw new Error('Invalid round scores in backup.');
    if(r.practice!==undefined){if(!r.practice||r.practice.kind!=='tricky'||r.practice.target!==3||!Array.isArray(r.baseIds)||r.reviewIds.length)throw new Error('Invalid strengthening round.');r.practice.ids=ids(r.practice.ids,'strengthening questions');if(!r.practice.ids.length||r.practice.ids.length!==r.total||r.practice.ids.some(id=>!r.baseIds.includes(id)))throw new Error('Invalid strengthening targets.');}
    if(r.current){
      const q=r.current;
      if(!r.queue.length||typeof q.prompt!=='string'||typeof q.answer!=='string'||!Array.isArray(q.options)||!q.options.length||q.options.some(o=>typeof o!=='string'||!o.trim())||new Set(q.options).size!==q.options.length||(q.type!==undefined&&!['written','choice','multi'].includes(q.type)))throw new Error('Invalid current question in backup.');
      if(q.type==='multi'){
        const card=cards[r.queue[0]];
        if(card.type!=='multi'||!Array.isArray(q.answers)||q.answers.length<2||new Set(q.answers).size!==q.answers.length||q.answers.some(answer=>typeof answer!=='string'||!q.options.includes(answer))||q.answer!==card.definition||q.answers.length!==card.answers.length||q.answers.some(answer=>!card.answers.includes(answer)))throw new Error('Invalid current select-all question in backup.');
      }else if(cards[r.queue[0]].type==='multi'||!q.options.includes(q.answer))throw new Error('Invalid current question in backup.');
    }
    const validMultiSelection=choice=>Array.isArray(choice)&&new Set(choice).size===choice.length&&choice.every(answer=>r.current.options.includes(answer));
    if(r.selection!==undefined&&(!r.current||r.current.type!=='multi'||!validMultiSelection(r.selection)))throw new Error('Invalid pending select-all choices in backup.');
    if(r.feedback){
      if(!r.current||typeof r.feedback.correct!=='boolean')throw new Error('Invalid answer feedback in backup.');
      const q=r.current,choice=r.feedback.choice;
      const validChoice=q.type==='multi'?validMultiSelection(choice)&&choice.length>0:typeof choice==='string'&&Boolean(choice.trim())&&((q.type==='written'||q.options.length<2)||q.options.includes(choice));
      if(!validChoice||r.feedback.correct!==isLearnAnswerCorrect(q,choice))throw new Error('Invalid answer feedback in backup.');
    }
    if(r.reward){if(r.queue.length||r.completed!==r.total)throw new Error('Unfinished round cannot have a completion reward.');r.reward=validateRoundReward(r.reward);if(r.reward.total!==r.total||r.reward.assessed!==r.seen.length||r.reward.firstCorrect!==r.firstCorrect||r.reward.attempts!==r.attempts)throw new Error('Round reward does not match the saved answers.');}
    state.round=r;
  }
  if(input.mastery)state.mastery=validateMastery(input.mastery,cards.length);
  if(input.rewards)state.rewards=validateRewards(input.rewards);
  if(input.cardMigration){state.cardMigration=validateCardMigration(input.cardMigration);if(state.cardMigration.toCount!==cards.length)throw new Error('Question update archive does not match this study set.');}
  if(input.exam)state.exam=validateExam(input.exam,cards);
  if(['learn','exam','tricky'].includes(input.lastActivity))state.lastActivity=input.lastActivity;
  if(input.soundEnabled===true)state.soundEnabled=true;
  if(Number.isInteger(input.feedbackStreak)&&input.feedbackStreak>0)state.feedbackStreak=input.feedbackStreak;
  return state;
}
export function createStudyBackup(state, now=new Date()) {
  const clean=validateStudyState(state);
  return {format:'pocket-study-backup',version:1,exportedAt:now.toISOString(),title:clean.title,cards:clean.cards,progress:{known:clean.known,learned:clean.learned,round:clean.round||null,lastActivity:clean.lastActivity||'flash',exam:clean.exam||null,soundEnabled:clean.soundEnabled||false,feedbackStreak:clean.feedbackStreak||0,mastery:clean.mastery||null,rewards:clean.rewards||null,cardMigration:clean.cardMigration||null,flashcards:clean.flashcards||null,flashKnown:clean.flashKnown||[]}};
}
export function parseStudyBackup(text) {
  const data=JSON.parse(text);
  if(data.format!=='pocket-study-backup')return null;
  if(data.version!==1)throw new Error('This backup version is not supported. Update Pocket before restoring it.');
  if(!data.progress||!Array.isArray(data.progress.known)||!Array.isArray(data.progress.learned))throw new Error('Backup is missing progress. Nothing has been restored.');
  return validateStudyState({title:data.title,cards:data.cards,known:data.progress.known,learned:data.progress.learned,round:data.progress.round,lastActivity:data.progress.lastActivity,exam:data.progress.exam,soundEnabled:data.progress.soundEnabled,feedbackStreak:data.progress.feedbackStreak,mastery:data.progress.mastery,rewards:data.progress.rewards,cardMigration:data.progress.cardMigration,flashcards:data.progress.flashcards,flashKnown:data.progress.flashKnown});
}
