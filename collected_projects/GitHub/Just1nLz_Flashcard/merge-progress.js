import {consolidateCards} from './duplicates.js';
import {initializeMastery} from './mastery.js';

const cloneMigrationData=value=>JSON.parse(JSON.stringify(value));

function validateMigrationPlan(cards,plan){
 if(!plan||!Array.isArray(plan.cards)||!Array.isArray(plan.groups)||plan.cards.length!==plan.groups.length||!Array.isArray(plan.oldToNew)||plan.oldToNew.length!==cards.length)throw new Error('Invalid question merge plan.');
 const visited=new Set();
 plan.groups.forEach((group,newId)=>{
  if(!Array.isArray(group)||!group.length)throw new Error('Invalid question merge group.');
  group.forEach(oldId=>{
   if(!Number.isInteger(oldId)||oldId<0||oldId>=cards.length||visited.has(oldId)||plan.oldToNew[oldId]!==newId)throw new Error('Invalid question merge mapping.');
   visited.add(oldId);
  });
 });
 if(visited.size!==cards.length)throw new Error('Question merge plan omits existing cards.');
}

/**
 * Consolidate a deck without treating an old single-answer result as evidence
 * that the learner can recall all answers. The state object is updated in
 * place. Unaffected question histories, completed rewards, and pending answers
 * survive; interrupted rounds and exams are retained as recoverable archives.
 */
export function migrateStudyCards(state,plan=consolidateCards(state.cards)){
 validateMigrationPlan(state.cards,plan);
 const changed=JSON.stringify(state.cards)!==JSON.stringify(plan.cards);
 if(!changed)return {state,changed:false,roundRestarted:false,examArchived:false,updatedIds:[]};

 // Initialize legacy history against the original deck before changing IDs.
 const oldCards=cloneMigrationData(state.cards),oldMastery=initializeMastery(state);
 const updatedIds=plan.groups.flatMap((group,id)=>group.length>1||JSON.stringify(oldCards[group[0]])!==JSON.stringify(plan.cards[id])?[id]:[]);
 const changedOldIds=new Set(updatedIds.flatMap(id=>plan.groups[id]));
 const remapMigrationIds=ids=>[...new Set((ids||[]).map(id=>plan.oldToNew[id]))];
 const mastery={...cloneMigrationData(oldMastery),cards:plan.groups.map((group,id)=>{
  if(!updatedIds.includes(id))return cloneMigrationData(oldMastery.cards[group[0]]);
  return {streak:0,correct:0,incorrect:0,lastSeen:0,manualMastered:false,
   previousVersions:group.map(cardId=>({cardId,card:cloneMigrationData(oldCards[cardId]),mastery:cloneMigrationData(oldMastery.cards[cardId])}))};
 })};
 const migration={version:1,fromCount:oldCards.length,toCount:plan.cards.length,mergedCount:oldCards.length-plan.cards.length};
 if(state.cardMigration)migration.previousMigration=cloneMigrationData(state.cardMigration);
 let roundRestarted=false;
 if(state.round){
  const ids=['queue','seen','baseIds','reviewIds','manualIds'].flatMap(key=>state.round[key]||[]);
  if(ids.some(id=>changedOldIds.has(id))){
   migration.previousRound=cloneMigrationData(state.round);
   roundRestarted=state.round.queue.length>0;
   state.round=null;
  }else{
   // Preserve the actual prompt, choices, selection, feedback, and scores.
   // Only numerical card references move when a preceding group collapses.
   for(const key of ['queue','seen','baseIds','reviewIds','manualIds']){
    if(Array.isArray(state.round[key]))state.round[key]=remapMigrationIds(state.round[key]);
   }
   if(state.round.practice?.kind==='tricky')state.round.practice.ids=remapMigrationIds(state.round.practice.ids);
  }
 }
 const examArchived=Boolean(state.exam);
 if(examArchived){migration.previousExam=cloneMigrationData(state.exam);delete state.exam;}
 if(migration.previousRound||migration.previousExam)migration.previousCards=oldCards;
 state.cards=cloneMigrationData(plan.cards);
 if(Array.isArray(state.flashcards))state.flashcards=state.flashcards.map(card=>({...card,cardId:plan.oldToNew[card.cardId]}));
 state.known=remapMigrationIds(state.known);
 state.learned=remapMigrationIds(state.learned);
 state.mastery=mastery;
 // The combined answer set needs a new full-set recap milestone. Earned XP
 // and completed-round totals still belong to the learner's earlier work.
 if(state.rewards&&updatedIds.length)state.rewards={...state.rewards,recapShown:false};
 state.cardMigration=migration;
 return {state,changed:true,roundRestarted,examArchived,updatedIds};
}
