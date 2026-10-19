import {parseCards} from './cards.js';
import {prepareStudyCards} from './source-upgrade.js';

const flashSignature=card=>JSON.stringify([card.term,card.definition,card.type||'',card.answers||[]]);
export function validateFlashcards(value,cards){
 if(!Array.isArray(value)||!value.length||value.length>4000)throw new Error('Invalid original flashcards.');
 const entries=value.map(entry=>{
  if(!entry||!Number.isInteger(entry.cardId)||entry.cardId<0||entry.cardId>=cards.length)throw new Error('Invalid flashcard question reference.');
  return {...parseCards(JSON.stringify([entry]))[0],cardId:entry.cardId};
 });
 if(new Set(entries.map(entry=>entry.cardId)).size!==cards.length)throw new Error('Original flashcards must cover every Learn question.');
 return entries;
}
function flashSourceEntry(card,cardId){
 // Preserve the original prompt/choices; audited answer boundaries and the
 // corroborated source typo correction still apply to its answer side.
 const prepared=prepareStudyCards([card]).cards[0];
 return {...prepared,term:card.term,cardId};
}
export function createFlashcards(state,sourceCards=[]){
 if(state.flashcards)return validateFlashcards(state.flashcards,state.cards);
 const library=sourceCards.length?prepareStudyCards(sourceCards):null;
 const currentIds=new Map(state.cards.map((card,id)=>[flashSignature(card),id]));
 if(library&&library.cards.every(card=>currentIds.has(flashSignature(card)))&&library.cards.length===state.cards.length){
  return sourceCards.map((card,id)=>flashSourceEntry(card,currentIds.get(flashSignature(library.cards[library.oldToNew[id]]))));
 }
 const variants=new Map();
 if(library)library.cards.forEach((card,id)=>variants.set(flashSignature(card),library.groups[id].map(oldId=>sourceCards[oldId])));
 return state.cards.flatMap((card,id)=>{
  const originals=variants.get(flashSignature(card))||state.mastery?.cards[id]?.previousVersions?.map(version=>version.card);
  return originals?.length?originals.map(original=>flashSourceEntry(original,id)):[{...card,cardId:id}];
 });
}
export function flashcardsFromImport(originalCards,plan){
 return originalCards.map((card,id)=>flashSourceEntry(card,plan.oldToNew[id]));
}
export function initializeFlashProgress(state,sourceCards=[]){
 state.flashcards=createFlashcards(state,sourceCards);
 const valid=id=>Number.isInteger(id)&&id>=0&&id<state.flashcards.length;
 state.flashKnown=Array.isArray(state.flashKnown)?[...new Set(state.flashKnown.filter(valid))]:state.flashcards.flatMap((entry,id)=>(state.known||[]).includes(entry.cardId)?[id]:[]);
}
export function markFlashFamiliar(state,id,familiar){
 if(!Number.isInteger(id)||!state.flashcards[id])return;
 state.flashKnown=state.flashKnown.filter(value=>value!==id);if(familiar)state.flashKnown.push(id);
 const parent=state.flashcards[id].cardId;
 state.known=state.known.filter(value=>value!==parent);
 if(state.flashcards.every((entry,index)=>entry.cardId!==parent||state.flashKnown.includes(index)))state.known.push(parent);
}
function flashSentences(text){
 const protectedText=text.replace(/the ethical use of such Computer ethics is about computer security\./g,'the ethical use of such\nComputer ethics is about computer security.')
  .replace(/\b(?:e\.g|i\.e|etc)\.|\b(?:[A-Z]\.){2,}|\b(?:[A-Z]|Dr|Mr|Mrs|Ms|Prof|St)\.(?=\s+[A-Z])/g,match=>match.replaceAll('.','\u0001'));
 return protectedText.split(/\n|(?<=[.!?])\s+(?=[A-Z"“'])/).map(part=>part.replaceAll('\u0001','.').trim()).filter(Boolean);
}
export function flashcardLayout(card){
 const end=card.term.lastIndexOf('?'),tail=end>=0?card.term.slice(end+1).trim():'';
 let prompt=card.term,options=[];
 if(card.options?.length){options=[...card.options];prompt=end>=0?card.term.slice(0,end+1):card.term;}
 else if(end>=0&&tail&&!/^["'”’]*$/.test(tail)){
  const choices=tail.replace(/^select\s+all\s+that\s+apply[.!:]?\s*/i,'').replace(/\s*(?:T\/F|True False)\s*$/i,'').trim();
  const labels=[...choices.matchAll(/(?:^|\s)([A-Z])[).]\s+/g)];
  if(labels.length>=2&&labels.every((match,i)=>match[1]===String.fromCharCode(65+i))){options=labels.map((match,i)=>choices.slice(match.index+match[0].length,labels[i+1]?.index??choices.length).trim());}
  else options=flashSentences(choices);
  if(options.length>=2)prompt=card.term.slice(0,end+1);else options=[];
 }
 if(!options.length&&/^(?:t|f|true|false)$/i.test(card.definition)){options=['True','False'];prompt=card.term.replace(/\s*(?:T\/F|True False)\s*$/i,'');}
 if(card.type==='multi'&&!options.length)options=[...card.answers];
 if(card.type==='multi'&&!/select all/i.test(prompt))prompt+=' Select all that apply.';
 const clean=text=>text.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^t$/,'true').replace(/^f$/,'false');
 const answers=card.type==='multi'?card.answers:/^all$/i.test(card.definition)?options:[card.definition];
 const answerLines=answers.map(answer=>{
  const exact=options.findIndex(option=>clean(option)===clean(answer));
  const partial=exact<0?options.map((option,i)=>({i,key:clean(option)})).filter(option=>Math.min(clean(answer).length,option.key.length)>=10&&(option.key.endsWith(clean(answer))||clean(answer).endsWith(option.key)||option.key.startsWith(clean(answer))||clean(answer).startsWith(option.key))):[];
  const index=exact>=0?exact:partial.length===1?partial[0].i:-1;
  return {code:index>=0?`${String.fromCharCode(65+index)})`:null,text:answer};
 });
 return {prompt,options,answerLines};
}
