import {installLearnSwipe} from './swipe.js';
import {initializeRewards,validateRoundReward,awardRoundReward,buildSetRecap} from './rewards.js';
import {rankTrickyQuestions,trickyPracticeIds,newTrickyRound,advanceTrickyRound} from './tricky.js';
import {MASTERY_TARGET,initializeMastery,recordMastery,masterySummary,newMasteryRound,isCardMastered,setManualMastery,completeManualCard,ensureRoundReviewMix} from './mastery.js';
import {createExam,setExamAnswer,scoreExam,submitExam,validateExam} from './exam.js';
import {createStudyBackup, parseStudyBackup, validateStudyState} from './backup.js';
import {parsePdfPages} from './pdf-layout.js';
import {makeQuestion, answerQuestion, advanceRound,isAnswerProvided,ensureQuestionDistractors} from './learn.js';
import {parseCards} from './cards.js';
import {prepareStudyCards} from './source-upgrade.js';
import {migrateStudyCards} from './merge-progress.js';
import {initializeFlashProgress,flashcardsFromImport,validateFlashcards,markFlashFamiliar,flashcardLayout} from './flashcards.js';
const $ = id => document.getElementById(id);
const storageKey = 'pocket-ethics-v1';
const recoveryKey=storageKey+'-recovery';
let recoveryAvailable=false;
function keepRecovery(reason,onlyIfMissing=false){try{const data=localStorage.getItem(storageKey);if(data&&(!onlyIfMissing||!localStorage.getItem(recoveryKey))){localStorage.setItem(recoveryKey,JSON.stringify({createdAt:new Date().toISOString(),reason,data}));}recoveryAvailable=!!localStorage.getItem(recoveryKey);}catch{}}
keepRecovery('Before app update',true);
let toastLater='';
let originalFlashCards=[];
let state = {cards:[], known:[]}, mode = 'all', order = [], index = 0, flipped = false;
try { const saved = JSON.parse(localStorage.getItem(storageKey)); if(saved){state.cards=parseCards(JSON.stringify(saved.cards));state.known=Array.isArray(saved.known)?saved.known.filter(n=>Number.isInteger(n)&&n>=0&&n<state.cards.length):[];state.lastActivity=saved.lastActivity;state.soundEnabled=saved.soundEnabled===true;state.feedbackStreak=Number.isInteger(saved.feedbackStreak)?saved.feedbackStreak:0;if(saved.exam){try{state.exam=validateExam(saved.exam,state.cards);}catch{toastLater='Saved exam could not be loaded; your other study progress is intact.';}}state.title=typeof saved.title==='string'?saved.title:'Computer Ethics';state.learned=saved.learned;state.mastery=saved.mastery;const r=saved.round;if(r&&Array.isArray(r.queue)&&r.queue.every(id=>Number.isInteger(id)&&id>=0&&id<state.cards.length)&&Array.isArray(r.seen)&&['total','completed','attempts','firstCorrect'].every(k=>Number.isInteger(r[k])&&r[k]>=0)&&(!r.current||(typeof r.current.prompt==='string'&&typeof r.current.answer==='string'&&Array.isArray(r.current.options))))state.round=r;} } catch { /* Empty or unavailable storage: start clean. */ }
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.flashcards){state.flashcards=validateFlashcards(saved.flashcards,state.cards);state.flashKnown=saved.flashKnown;}}catch{toastLater='Original flashcard layout will be restored; your Learn progress is intact.';}
state.title ||= 'Computer Ethics';
let activity = 'flash', recapOpen=false;
try{const saved=JSON.parse(localStorage.getItem(storageKey));state.rewards=initializeRewards(saved?.rewards);if(state.round?.reward)validateRoundReward(state.round.reward);}catch{state.rewards=initializeRewards();if(state.round)delete state.round.reward;toastLater='Reward history could not be read; your cards and study progress are intact.';}
state.learned = Array.isArray(state.learned) ? state.learned.filter(id=>Number.isInteger(id)&&id>=0&&id<state.cards.length) : [];
try{state.mastery=initializeMastery(state);}catch{state.mastery=initializeMastery({...state,mastery:null});toastLater='Mastery counters could not be read; your previous study history is kept.';}
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.cardMigration)state.cardMigration=saved.cardMigration;}catch{}
if(state.cards.length)upgradeSavedQuestions();
if(state.cards.length){ensureRoundReviewMix(state.cards,state.mastery,state.round);save();}
function upgradeSavedQuestions(){
 const plan=prepareStudyCards(state.cards);
 if(!plan.changed)return;
 keepRecovery('Before combining repeated questions');
 const result=migrateStudyCards(state,plan);
 toastLater=`${plan.mergedCount?`${plan.mergedCount} repeated questions combined. `:''}Select-all cards now need all correct answers together. Other mastery and XP are kept.${result.roundRestarted?' Your updated round starts fresh; its previous answers are archived.':''}${result.examArchived?' Your earlier exam is archived in the full backup.':''}`;
}
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{toast('Storage unavailable. Export a backup to keep your cards.');}}
function rebuild(){order=state.flashcards.map((_,i)=>i).filter(i=>mode==='all'||!state.flashKnown.includes(i));index=0;flipped=false;render();}
function render(){
 $('deck-title').textContent=state.title;document.title=`Pocket • ${state.title}`;
 const id=order[index],card=state.flashcards[id],count=state.flashKnown.length,progress=card&&state.mastery.cards[card.cardId];
 $('card-mastery').textContent=card?(progress.manualMastered?'Learn question: marked mastered by you':`Learn question mastery: ${progress.streak}/${MASTERY_TARGET}${isCardMastered(progress)?' · mastered':''}`):'';
 $('flash-mode-description').textContent=`${state.flashcards.length} individual flashcards · ${state.cards.length} Learn questions. Repeated prompts stay separate here; Learn combines their correct answers.`;
 $('total').textContent=state.flashcards.length;$('remaining').textContent=state.flashcards.length-count;
 $('mastery').textContent=`${count} marked familiar`;$('progress').style.width=`${state.flashcards.length?count/state.flashcards.length*100:0}%`;
 $('position').textContent=card?`CARD ${index+1} OF ${order.length}`:state.flashcards.length?'All caught up':'Ready when you are';
 $('side').textContent=card?(flipped?'CORRECT ANSWER':'QUESTION'):state.flashcards.length?'WELL DONE':'LET’S GET STARTED';
 $('card-text').replaceChildren();
 if(card){
  const layout=flashcardLayout(card),heading=document.createElement('span');heading.className='flash-question';heading.textContent=layout.prompt;
  if(flipped){
   layout.answerLines.forEach(answer=>{const row=document.createElement('span');row.className='flash-answer-line';if(answer.code){const code=document.createElement('strong');code.className='flash-choice-code';code.textContent=answer.code;row.append(code);}const text=document.createElement('span');text.textContent=answer.text;row.append(text);$('card-text').append(row);});
  }else{
   $('card-text').append(heading);
   if(layout.options.length){const list=document.createElement('span');list.className='flash-choice-list';layout.options.forEach((option,n)=>{const row=document.createElement('span');row.className='flash-choice';const code=document.createElement('strong');code.className='flash-choice-code';code.textContent=`${String.fromCharCode(65+n)})`;const text=document.createElement('span');text.textContent=option;row.append(code,text);list.append(row);});$('card-text').append(list);}
  }
  $('card').setAttribute('aria-label',`${flipped?'Correct answer':'Question'}: ${$('card-text').textContent}. Tap to flip.`);
 }else{$('card-text').textContent=state.flashcards.length?'A little practice goes a long way.':'Your next study session starts here.';$('card').setAttribute('aria-label','Import cards to begin');}
 $('flip-hint').textContent=card?(flipped?'How well did you remember?':'Tap anywhere to reveal'):state.flashcards.length?'Switch to All cards to study again':'Import your cards to begin';
 $('card').classList.toggle('answer',flipped);$('card').classList.toggle('long',!!card&&(flipped?card.definition:card.term).length>220);$('answer-actions').hidden=!card||!flipped;
 $('prev').disabled=order.length<2;$('next').disabled=order.length<2;$('shuffle').disabled=order.length<2;
 $('all').classList.toggle('active',mode==='all');$('review').classList.toggle('active',mode==='review');
 $('all').setAttribute('aria-pressed',mode==='all');$('review').setAttribute('aria-pressed',mode==='review');
}
function move(step){if(!order.length)return;index=(index+step+order.length)%order.length;flipped=false;render();}
$('card').onclick=()=>{if(order.length){flipped=!flipped;render();}else if(!state.cards.length)$('import-dialog').showModal();syncLearnActions();};
$('prev').onclick=()=>move(-1);$('next').onclick=()=>move(1);
$('all').onclick=()=>{mode='all';rebuild();};$('review').onclick=()=>{mode='review';rebuild();};
$('shuffle').onclick=()=>{for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}index=0;flipped=false;render();toast('Cards shuffled');};
$('known').onclick=()=>{const id=order[index];markFlashFamiliar(state,id,true);save();if(mode==='review'){order.splice(index,1);if(index>=order.length)index=0;flipped=false;render();}else move(1);};
$('again').onclick=()=>{markFlashFamiliar(state,order[index],false);save();move(1);};
let importGeneration=0, reviewedText='', reviewedBackup=null,reviewedFlashcards=null;
function invalidatePreview(){reviewedText='';reviewedBackup=null;reviewedFlashcards=null;$('backup-preview').hidden=true;$('import').textContent='Use these cards';$('import-preview').hidden=true;$('confirm-review').checked=false;$('import').disabled=true;}
function reviewImport(){
 let backup=null;try{backup=parseStudyBackup($('import-text').value);}catch(e){if($('import-text').value.trim().startsWith('{'))throw e;}
 let cards=backup?backup.cards:parseCards($('import-text').value);if(cards.length>2000)throw new Error('Import up to 2,000 cards at a time.');
 let merged=0;
 if(!backup){const raw=cards,plan=prepareStudyCards(raw);let data;try{data=JSON.parse($('import-text').value);}catch{}cards=plan.cards;merged=plan.mergedCount;reviewedFlashcards=data?.flashcards?validateFlashcards(data.flashcards,cards):flashcardsFromImport(raw,plan);if(plan.changed)$('import-text').value=JSON.stringify({cards,flashcards:reviewedFlashcards},null,2);}
 reviewedBackup=backup;$('import').textContent=backup?'Restore cards & progress':'Use these cards';$('backup-preview').hidden=!backup;$('backup-preview').textContent=backup?`Full backup: ${backup.flashKnown?.length??backup.known.length} marked familiar, ${backup.learned.length} previously learned${backup.mastery?`, ${masterySummary(backup.mastery).verified} verified mastered, ${masterySummary(backup.mastery).manual} manually mastered`:''}${backup.rewards?`, ${backup.rewards.xp} XP and ${backup.rewards.completedRounds} completed rounds`:''}${backup.round?`, round ${backup.round.completed}/${backup.round.total} cards complete (${backup.round.attempts} attempts)`:''}${backup.exam?`, saved exam (${backup.exam.submittedAt?'submitted':backup.exam.questions.filter((question,i)=>isAnswerProvided(question,backup.exam.answers[i])).length+' answered'})`:''}. Your cards and progress will be restored together.`:'';
 reviewedText=$('import-text').value;$('preview-count').textContent=`Review all ${cards.length} cards${merged?` · ${merged} repeated questions combined`:''}`;$('preview-cards').replaceChildren();
 cards.forEach((card,i)=>{const item=document.createElement('article');const question=document.createElement('strong');question.textContent=`${i+1}. ${card.term}`;const answer=document.createElement('p');answer.textContent=card.definition;item.append(question,answer);$('preview-cards').append(item);});
 $('import-preview').hidden=false;$('confirm-review').checked=false;$('import').disabled=true;
 return cards;
}
$('manage').onclick=()=>{$('set-title').value=state.title;$('restore-recovery').hidden=!recoveryAvailable;$('import-dialog').showModal();syncLearnActions();};
$('import-text').oninput=()=>{importGeneration++;invalidatePreview();};
$('preview-import').onclick=()=>{try{const cards=reviewImport();$('import-status').textContent=`${cards.length} pairs found. Review below, then check the confirmation box.`;}catch(e){invalidatePreview();$('import-status').textContent=e.message;}};
$('confirm-review').onchange=()=>{$('import').disabled=!$('confirm-review').checked||reviewedText!==$('import-text').value;};
$('import').onclick=()=>{try{
 if(!$('confirm-review').checked||reviewedText!==$('import-text').value)throw new Error('Review the cards and confirm the question / answer pairs first.');
 const cards=parseCards(reviewedText), backup=reviewedBackup;if(state.cards.length&&!confirm(backup?'Restore this backup, replacing this device’s current cards and progress?':'Replace your current cards and reset study progress? Export a full backup first if needed.'))return;
 keepRecovery('Before restoring backup or replacing set');state=backup||{title:$('set-title').value.trim()||'My study set',cards,flashcards:reviewedFlashcards,flashKnown:[],known:[],learned:[]};if(backup)state.title=$('set-title').value.trim()||state.title;state.mastery=initializeMastery(state);state.rewards=initializeRewards(state.rewards);upgradeSavedQuestions();initializeFlashProgress(state,originalFlashCards);recapOpen=false;ensureRoundReviewMix(state.cards,state.mastery,state.round);mode='all';rebuild();setActivity(['learn','exam','tricky'].includes(backup?.lastActivity)?backup.lastActivity:'flash');save();$('import-dialog').close();$('import-status').textContent='';invalidatePreview();toast(backup?'Cards and study progress restored':`${cards.length} cards imported`);
 }catch(e){$('import-status').textContent=e.message;}};
$('import-file').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;const generation=++importGeneration;invalidatePreview();
 try{if(file.size>10*1024*1024)throw new Error('Choose a text / JSON file smaller than 10 MB.');const text=await file.text();if(generation!==importGeneration)return;$('import-text').value=text;let title=file.name.replace(/\.[^.]+$/,'');try{const data=JSON.parse(text);if(typeof data.title==='string')title=data.title;}catch{}$('set-title').value=title.slice(0,120);const cards=reviewImport();$('import-status').textContent=reviewedBackup?'Full study backup loaded. Review and confirm to restore cards and progress.':`${cards.length} pairs loaded. Review and confirm before importing.`;}catch(e){if(generation===importGeneration)$('import-status').textContent=e.message;}finally{event.target.value='';}
};
$('pdf-file').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;const generation=++importGeneration;invalidatePreview();$('pdf-file').disabled=true;$('import-status').textContent='Reading PDF on your device…';
 try{
  const pages=await PocketPDF.readPdf(file,message=>{if(generation===importGeneration)$('import-status').textContent=message;});
  if(generation!==importGeneration)return;
  const result=parsePdfPages(pages),plan=prepareStudyCards(result.cards);const title=file.name.replace(/\.pdf$/i,'').slice(0,120);
  $('set-title').value=title;$('import-text').value=JSON.stringify({title,cards:plan.cards,flashcards:flashcardsFromImport(result.cards,plan)},null,2);reviewImport();
  $('import-status').textContent=`${result.cards.length} pairs extracted (${result.format}); ${plan.cards.length} study cards after combining ${plan.mergedCount} repeats. Review every question and answer before importing. ${[...result.warnings,...plan.warnings].join(' ')}`;
 }catch(e){if(generation===importGeneration){invalidatePreview();$('import-status').textContent=`PDF not imported: ${e.message}`;}}
 finally{$('pdf-file').disabled=false;event.target.value='';}
};
function exportCards(){if(!state.cards.length){$('import-status').textContent='Import cards before exporting a backup.';return false;}return true;}
$('export').onclick=()=>{if(!exportCards())return;const url=URL.createObjectURL(new Blob([JSON.stringify({title:state.title,cards:state.cards,flashcards:state.flashcards},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=(state.title.replace(/[^a-z0-9_-]+/gi,'-')||'study-set')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('export-progress').onclick=()=>{
 try{const backup=createStudyBackup(state);const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pocket-full-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('import-status').textContent='Full backup downloaded: original flashcards, familiarity, Learn mastery, rewards, unfinished round, and saved exam. Save it to Files or iCloud Drive.';}catch(e){$('import-status').textContent=`Could not export backup: ${e.message}`;}
};
$('restore-recovery').onclick=()=>{
 try{const saved=JSON.parse(localStorage.getItem(recoveryKey));if(!saved)throw new Error('No local recovery snapshot is available.');const restored=validateStudyState(JSON.parse(saved.data));if(!confirm(`Restore the local snapshot from ${new Date(saved.createdAt).toLocaleString()}? This replaces your current cards and progress.`))return;keepRecovery('Before local recovery');state=restored;state.mastery=initializeMastery(state);state.rewards=initializeRewards(state.rewards);upgradeSavedQuestions();initializeFlashProgress(state,originalFlashCards);recapOpen=false;ensureRoundReviewMix(state.cards,state.mastery,state.round);mode='all';rebuild();setActivity(['learn','exam','tricky'].includes(state.lastActivity)?state.lastActivity:'flash');save();invalidatePreview();$('import-dialog').close();toast('Local cards and progress recovered');}catch(e){$('import-status').textContent=`Recovery failed: ${e.message}`;}
};
$('export-pdf').onclick=()=>{
 if(!exportCards())return;const popup=window.open('','_blank');if(!popup){$('import-status').textContent='Allow pop-ups for this site to open the printable PDF view.';return;}
 const doc=popup.document;doc.title=state.title;const style=doc.createElement('style');style.textContent='body{font:14px/1.6 system-ui,sans-serif;margin:32px;color:#111}h1{font-size:24px}article{margin-bottom:24px;border-bottom:1px solid #bbb;padding-bottom:15px;white-space:pre-wrap;overflow-wrap:anywhere}p{margin:6px 0}@media print{button,.print-help{display:none}article{break-inside:avoid}body{margin:12mm}}';doc.head.append(style);
 const heading=doc.createElement('h1');heading.textContent=state.title;doc.body.append(heading);const help=doc.createElement('p');help.className='print-help';help.textContent='Choose Print, then Save as PDF. On iPhone, use the print preview Share menu to Save to Files. This Question: / Answer: format can be imported again.';doc.body.append(help);const print=doc.createElement('button');print.textContent='Print / Save as PDF';print.onclick=()=>popup.print();doc.body.append(print);
 state.cards.forEach((card,i)=>{const article=doc.createElement('article');const q=doc.createElement('p');q.textContent=`Question: ${card.term}`;article.append(q);if(card.type==='multi'){const type=doc.createElement('p');type.textContent='Type: Select all that apply';article.append(type);}for(const answer of card.type==='multi'?card.answers:[card.definition]){const a=doc.createElement('p');a.textContent=`Answer: ${answer}`;article.append(a);}doc.body.append(article);});popup.focus();
};
document.addEventListener('keydown',e=>{if(activity!=='flash'||$('import-dialog').open||['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('card').click();}if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);});
if(!state.cards.length){try{const response=await fetch('./deck.json');if(!response.ok)throw new Error('Deck unavailable');state.cards=parseCards(await response.text());state.mastery=initializeMastery({...state,mastery:null});save();}catch{toast('Could not load the included deck. Use Manage cards to import a backup.');}}
try{const source=await fetch('./source-deck.json');if(source.ok)originalFlashCards=parseCards(await source.text());}catch{}
initializeFlashProgress(state,originalFlashCards);save();
rebuild();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-status').textContent='Ready for offline study';}).catch(()=>{$('offline-status').textContent='Offline cache unavailable · export a backup';});}

function setActivity(value){
 activity=value;state.lastActivity=value;save();
 $('flash-panel').hidden=value!=='flash';$('learn-panel').hidden=value!=='learn';$('exam-panel').hidden=value!=='exam';$('tricky-panel').hidden=value!=='tricky';
 for(const [id,active] of [['flash-mode',value==='flash'],['learn-mode',value==='learn'],['exam-mode',value==='exam'],['tricky-mode',value==='tricky']]){ $(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',active); }
 if(value==='learn'){if(!state.round)state.round=newMasteryRound(state.cards,state.mastery);renderLearn();}
 if(value==='exam')renderExam();
 if(value==='tricky')renderTricky();
 syncLearnActions();
}
function renderLearn(){
 $('learn-question-panel').classList.remove('next-card-enter');
 const round=state.round;
 const strengthening=round?.practice?.kind==='tricky';
 $('tricky-practice-notice').hidden=!strengthening;
 if(strengthening){const verified=round.practice.ids.filter(id=>state.mastery.cards[id].streak>=MASTERY_TARGET).length;$('tricky-practice-progress').textContent=`${verified} of ${round.total} questions at 3/3. Each question stays until three consecutive correct answers; existing streaks count. A wrong answer resets only that question to 0/3.`;}
 $('sound-toggle').textContent=state.soundEnabled?'Sound: on':'Sound: off';$('sound-toggle').setAttribute('aria-pressed',!!state.soundEnabled);$('learn-streak').textContent=state.feedbackStreak>1?`${state.feedbackStreak} correct across cards`:'';
 if(!round){syncLearnActions();return;}
 syncLearnActions();
 const finished=!round.queue.length;
 const reward=awardRoundReward(state);
 const recap=buildSetRecap(state);
 if(finished&&recap.complete&&!state.rewards.recapShown&&activity==='learn'){recapOpen=true;state.rewards.recapShown=true;}
 renderLearningRewards(recap);
 $('learn-question-panel').hidden=finished;$('learn-summary').hidden=!finished;
 renderMasteryOverview();
 $('learn-round-mix').textContent=`${round.baseIds?.length??round.total} core cards + ${round.reviewIds?.length||0} past-mistake reviews · ${round.total} total` ;
 if(strengthening)$('learn-round-mix').textContent=`${round.total} tricky questions · focused practice to 3/3 · no unrelated questions`;
 $('learn-count').textContent=`${round.completed} / ${round.total} completed this round`;
 $('learn-score').textContent=`${masterySummary(state.mastery).mastered} / ${state.cards.length} mastered`;
 $('learn-progress').style.width=`${round.total?round.completed/round.total*100:0}%`;
 if(finished){
  const allDone=masterySummary(state.mastery).mastered===state.cards.length;
  $('summary-title').textContent=!state.cards.length?'Import cards to start learning':allDone?(masterySummary(state.mastery).manual?'Collection complete: verified and self-marked mastery.':'Every card meets the mastery standard!'):'Round complete. Keep building mastery.';
  if(strengthening)$('summary-title').textContent='Strengthening round finished';
  const verified=round.seen.filter(id=>state.mastery.cards[id].streak>=MASTERY_TARGET&&!state.mastery.cards[id].manualMastered).length;
  $('summary-detail').textContent=round.total?`${round.seen.length?`${round.firstCorrect} of ${round.seen.length} assessed cards correct on the first try (${Math.round(round.firstCorrect/round.seen.length*100)}%).`:'No answers were assessed.'} ${round.attempts} total answer attempts. ${verified} of this round’s assessed cards meet the 3-in-a-row standard. ${round.manualIds?.length||0} cards were manually marked mastered; unattempted cards do not add correct answers or inflate accuracy. Other cards will return in later rounds.`:'Your next study session is ready when you are.';
  if(strengthening){const reached=round.practice.ids.filter(id=>state.mastery.cards[id].streak>=MASTERY_TARGET).length;$('summary-detail').textContent=`${reached} of ${round.total} selected questions now meet the 3-in-a-row standard. ${round.attempts} answer attempts; ${round.firstCorrect} of ${round.seen.length} assessed questions correct on the first encounter. ${round.manualIds?.length||0} manually completed; manual marks do not count as verified strengthening. Historical mistake counts stay in your ranking so you can see what has improved.`;}
  $('next-round').textContent=allDone?'Review mastered cards':'Next mastery round →';$('next-round').disabled=!state.cards.length;
  $('summary-recap').textContent=recap.complete?'✓ Every card assessed — see your full recap ↓':'See your set progress and focus cards ↓';
  $('round-reward').hidden=!reward;
  if(reward){$('round-reward-badge').textContent=reward.badge==='perfect'?'★':reward.badge==='persistent'?'↗':'✦';$('round-reward-title').textContent=reward.title;$('round-reward-xp').textContent=reward.xp?`+${reward.xp} XP earned`:'Round completed — your choices are saved';$('round-reward-detail').textContent=reward.assessed?`10 XP for finishing + ${reward.assessed*5} XP for assessed cards + ${reward.firstCorrect*5} XP for first-try answers`:'Manual marks do not earn answer XP. Assess cards to check your recall.';}
  save();
  return;
 }
 if(!round.current)round.current=makeQuestion(state.cards,round.queue[0]);
 const q=round.current, feedback=round.feedback;
 if(!feedback)ensureQuestionDistractors(q,state.cards,round.queue[0]);
 const cardProgress=state.mastery.cards[round.queue[0]],cardMastered=isCardMastered(cardProgress);
 $('learn-card-mastery').textContent=cardProgress.manualMastered?`MANUALLY MASTERED · actual streak ${cardProgress.streak}/3`:`THIS CARD: ${cardProgress.streak}/${MASTERY_TARGET} consecutive correct${cardMastered?' · MASTERED':''}`;
 for(const id of ['learn-manual-mastered','learn-manual-footer']){$(id).disabled=!!cardProgress.manualMastered;$(id).textContent=cardProgress.manualMastered?'✓ Marked by you':'I mastered this';}
 const isReview=!!round.reviewIds?.includes(round.queue[0]);$('learn-history-badge').hidden=!isReview;$('learn-history-badge').textContent=`↺ PAST MISTAKE REVIEW · missed ${cardProgress.incorrect} time${cardProgress.incorrect===1?'':'s'}${cardProgress.streak>=MASTERY_TARGET?' · mastery recheck':''}`;
 $('learn-question-panel').classList.toggle('past-mistake-card',isReview);
 if(!feedback)$('learn-question-panel').classList.remove('celebrate-answer','retry-answer');
 const multi=q.type==='multi',written=q.type==='written'||(!multi&&q.options.length<2);
 $('learn-format-notice').className=`answer-format ${multi?'answer-format-multi':written?'answer-format-written':'answer-format-single'}`;
 $('learn-format-icon').textContent=multi?'☑':written?'✎':'◉';
 $('learn-format-title').textContent=multi?`Select exactly ${q.answers.length} answers`:written?'Write your answer':'Choose ONE answer';
 $('learn-format-detail').textContent=multi?`There are ${q.answers.length} correct answers. Select them all, then tap Check answers.`:written?'Type your answer, then tap Check answer.':'Only one option is correct. Tap your choice to check it.';
 const selection=multi?(feedback?feedback.choice:(round.selection||[])):[];
 $('learn-written-label').hidden=!written||!!feedback;$('learn-check').hidden=!(written||multi)||!!feedback;
 $('learn-check').textContent=multi?'Check selected answers':'Check answer';$('learn-check').disabled=multi&&!selection.length;
 $('learn-multi-hint').hidden=!multi;if(multi)$('learn-multi-hint').textContent=`${selection.length} of ${q.answers.length} answers selected. A missing correct answer or an extra incorrect choice counts as a miss.`;
 $('learn-kind').textContent=multi?`SELECT ALL THAT APPLY · ${q.answers.length} CORRECT ANSWERS`:written?'WRITE YOUR ANSWER':q.options.length===2&&q.options.includes('True')&&q.options.includes('False')?'TRUE OR FALSE':'CHOOSE ONE ANSWER';
 $('learn-question').textContent=q.prompt;
 $('learn-options').replaceChildren();
 if(!written)q.options.forEach((option,i)=>{
  const button=document.createElement('button');button.className='learn-option';
  const selected=multi&&selection.includes(option),correctOption=multi?q.answers.includes(option):option===q.answer;
  if(multi){button.setAttribute('role','checkbox');button.setAttribute('aria-checked',selected);button.classList.toggle('multi-selected',selected&&!feedback);}
  const letter=document.createElement('span');letter.className='option-letter';letter.textContent=multi?(selected?'☑':'☐'):String.fromCharCode(65+i);letter.setAttribute('aria-hidden','true');
  const text=document.createElement('span');text.textContent=option;button.append(letter,text);
  button.disabled=!!feedback;
  if(feedback){if(correctOption){button.classList.add('correct');const badge=document.createElement('strong');badge.className='answer-badge';badge.textContent=multi&&!selected?'↗ MISSED CORRECT ANSWER':'✓ CORRECT ANSWER';button.append(badge);}else if(multi?selected:option===feedback.choice){button.classList.add('incorrect');const badge=document.createElement('strong');badge.className='answer-badge';badge.textContent='✕ YOUR ANSWER';button.append(badge);}}
  button.onclick=()=>{if(!multi){submitLearnChoice(option);return;}round.selection=selected?selection.filter(answer=>answer!==option):[...selection,option];save();renderLearn();$('learn-options').children[i].focus({preventScroll:true});};
  $('learn-options').append(button);
 });
 $('learn-question-panel').classList.toggle('result-correct',!!feedback?.correct);
 $('learn-question-panel').classList.toggle('result-incorrect',!!feedback&&!feedback.correct);
 $('learn-feedback').replaceChildren();
 if(feedback){
  const icon=document.createElement('span');icon.className='result-icon';icon.textContent=feedback.correct?'✓':'✕';icon.setAttribute('aria-hidden','true');
  const content=document.createElement('div');const heading=document.createElement('strong');heading.className='result-heading';heading.textContent=feedback.correct?'Correct — you’ve got it!':'Not quite — let’s make it stick.';
  const label=document.createElement('p');label.className='result-label';label.textContent='REMEMBER THIS ANSWER';
  const answer=document.createElement('p');answer.className='memory-answer';answer.textContent=multi?q.answers.map(text=>'• '+text).join('\n'):q.answer;
  const cue=document.createElement('p');cue.className='memory-cue';cue.textContent=feedback.correct?(cardProgress.manualMastered?'Marked mastered by you; actual answer history remains recorded separately.':cardProgress.streak>=MASTERY_TARGET?'3 correct in a row for this card — mastery reached. You can still review it.':`${cardProgress.streak}/3 correct in a row for this card. It will return in a later round until you reach 3/3.`):'This card’s streak reset to 0/3. Read the answer aloud; it will return later in this round, then in future rounds until mastered.';
  if(strengthening)cue.textContent=feedback.correct?(cardProgress.streak>=MASTERY_TARGET?'3 correct in a row — this question meets the strengthening goal.':`${cardProgress.streak}/3 correct in a row. This question returns within this strengthening round until 3/3.`):'Streak reset to 0/3. Explain the correct answer aloud, then recall it again when this question returns. It stays in this round until 3/3.';
  content.append(heading,label,answer,cue);$('learn-feedback').append(icon,content);
 }
 $('learn-feedback').className=feedback?(feedback.correct?'feedback-correct':'feedback-incorrect'):'';
 syncLearnActions();
 save();
}
function renderLearningRewards(recap){
 const rewards=state.rewards,level=Math.floor(rewards.xp/250)+1;
 $('reward-level').textContent=`✦ Level ${level}`;
 $('reward-total').textContent=`${rewards.xp} XP · ${rewards.completedRounds} round${rewards.completedRounds===1?'':'s'} complete`;
 $('reward-level-progress').style.width=`${rewards.xp%250/250*100}%`;
 $('reward-level-next').textContent=`${250-rewards.xp%250} XP to level ${level+1} · XP rewards practice; mastery still needs 3 in a row`;
 $('open-set-recap').textContent=`${recap.complete?'✓ Set recap':'Set recap'} · ${recap.assessed}/${recap.total} assessed`;
 $('open-set-recap').setAttribute('aria-expanded',recapOpen);
 $('set-recap').hidden=!recapOpen;
 if(recapOpen)renderSetRecap(recap);
}
function renderTricky(){
 const rows=rankTrickyQuestions(state),targets=trickyPracticeIds(rows),pending=rows.filter(row=>!row.verified).length;
 $('tricky-stats').textContent=`${rows.length} questions with recorded mistakes · ${rows.reduce((sum,row)=>sum+row.totalIncorrect,0)} total misses · ${pending} still below 3/3`;
 $('tricky-empty').hidden=!!rows.length;
 $('strengthen-tricky').disabled=!targets.length;
 $('strengthen-tricky').textContent=targets.length?`${pending?'Strengthen':'Recheck'} ${targets.length} ${pending?'priority':'tricky'} question${targets.length===1?'':'s'}`:'No tricky questions yet';
 $('tricky-list').replaceChildren();
 rows.forEach((row,index)=>{
  const article=document.createElement('article');article.className='tricky-item';article.dataset.cardId=row.id;
  const header=document.createElement('div');header.className='tricky-item-heading';const rank=document.createElement('strong');rank.className='tricky-rank';rank.textContent=`#${index+1}`;const misses=document.createElement('strong');misses.className='tricky-misses';misses.textContent=`${row.totalIncorrect} miss${row.totalIncorrect===1?'':'es'}`;header.append(rank,misses);
  const question=document.createElement('h4'),card=state.cards[row.id],end=card.term.lastIndexOf('?');question.textContent=end>=0?card.term.slice(0,end+1):card.term;
  const status=document.createElement('p');status.className=`tricky-status${row.verified?' tricky-verified':''}`;status.textContent=`${row.verified?'✓ Verified at 3/3':row.manual?'Marked mastered by you; still needs verification':'Building recall'} · ${row.streak}/3 consecutive correct`;
  const counts=document.createElement('p');counts.className='tricky-counts';counts.textContent=`${row.incorrect} current-format misses${row.earlierIncorrect?` + ${row.earlierIncorrect} from earlier question versions`:''} · ${row.correct} correct${row.accuracy===null?'':` · ${row.accuracy}% current-format accuracy`}`;
  const review=document.createElement('details');review.className='tricky-answer';const label=document.createElement('summary');label.textContent='Review the correct answer';const answer=document.createElement('p');answer.textContent=card.definition;const tip=document.createElement('small');tip.textContent='Read it once, explain why it is correct, then hide the answer and recall it before practicing.';review.append(label,answer,tip);
  const practice=document.createElement('button');practice.type='button';practice.className='primary';practice.textContent=row.verified?'Recheck this question':'Strengthen this question';practice.onclick=()=>startTrickyPractice([row.id]);
  article.append(header,question,status,counts,review,practice);$('tricky-list').append(article);
 });
}
function startTrickyPractice(ids){
 if(!ids.length)return;
 if(state.round?.queue.length&&!confirm('Replace your unfinished Learn round with focused tricky-question practice? Recorded answers, mastery, and XP will stay saved.'))return;
 keepRecovery('Before strengthening tricky questions');recapOpen=false;state.round=newTrickyRound(state.cards,state.mastery,ids);save();setActivity('learn');showNextLearnCard();
}
function renderSetRecap(recap=buildSetRecap(state)){
 $('recap-title').textContent=recap.complete?'Every card assessed. Here’s your recap.':'Your set so far';
 $('recap-coverage').textContent=`${recap.assessed} of ${recap.total} cards assessed in Learn. ${recap.unassessed?`${recap.unassessed} still untested${recap.markedOnly?` (${recap.markedOnly} manually marked mastered)`:''}.`:'You have worked through the whole set. Use the priorities below for your next pass.'}`;
 $('recap-coverage-progress').style.width=`${recap.total?recap.assessed/recap.total*100:0}%`;
 $('recap-stats').replaceChildren();
 for(const [value,label] of [[recap.verified,'Verified at 3/3'],[recap.manual,'Manually mastered'],[recap.focusIds.length,'Focus cards'],[recap.accuracy===null?'—':`${recap.accuracy}%`,'Recorded answer accuracy']]){const stat=document.createElement('div'),number=document.createElement('strong'),caption=document.createElement('span');number.textContent=value;caption.textContent=label;stat.append(number,caption);$('recap-stats').append(stat);}
 $('recap-explanation').textContent=`${recap.correct} correct and ${recap.incorrect} incorrect recorded answers, including retries. This is your cumulative Learn history, not a new exam score. Manual marks are separate from verified mastery. Earlier app versions may contribute one known success per learned card; missing older mistakes cannot be reconstructed.`;
 $('practice-recap-focus').disabled=!recap.focusIds.length;$('practice-recap-focus').textContent=recap.focusIds.length?`Practice ${Math.min(10,recap.focusIds.length)} focus cards`:'No unmastered focus cards';
 $('practice-recap-untested').hidden=!recap.unassessedIds.length;$('practice-recap-untested').textContent=`Assess ${Math.min(10,recap.unassessedIds.length)} untested cards`;
 $('recap-exam').disabled=!recap.total;
 $('recap-focus-heading').textContent=recap.focusIds.length?'Where to focus next':recap.manual?'Verify your manually mastered cards':'Your mastery is looking strong';
 $('recap-focus-note').textContent=recap.focusIds.length?'Most-missed unmastered cards come first, followed by lower streaks and cards you have not assessed. Expand a question to review its answer.':recap.manual?'You have no unmastered cards. Manual marks record your judgment; use an exam to check recall across the set.':'Every card has reached 3 correct in a row. Revisit past mistakes below or use an exam to check your recall.';
 $('recap-focus-list').replaceChildren();
 for(const id of recap.focusIds)appendRecapCard($('recap-focus-list'),recap.items[id]);
 $('recap-all-title').textContent=`Review all ${recap.total} cards · ${recap.maintenanceIds.length} mastered cards with past mistakes`;
 if($('recap-all-details').open)renderAllRecapCards(recap);
}
function appendRecapCard(container,item){
 const details=document.createElement('details');details.className=`recap-card${item.incorrect&&!item.verified&&!item.manualMastered?' recap-needs-work':''}`;
 details.dataset.cardId=item.id;
 const summary=document.createElement('summary'),tag=document.createElement('strong'),question=document.createElement('span'),counts=document.createElement('small'),answer=document.createElement('p');
 tag.textContent=item.manualMastered?'✓ MANUALLY MASTERED':item.verified?'✓ VERIFIED 3/3':!item.assessed?'NOT YET ASSESSED':item.incorrect?'↺ NEEDS PRACTICE':'BUILDING MASTERY';
 question.textContent=`${item.id+1}. ${state.cards[item.id].term}`;
 counts.textContent=`${item.correct} correct · ${item.incorrect} incorrect · streak ${item.streak}/3${item.accuracy===null?'':` · ${item.accuracy}% recorded accuracy`}`;
 answer.textContent=`Answer: ${state.cards[item.id].definition}`;answer.className='recap-answer';summary.append(tag,question,counts);details.append(summary,answer);container.append(details);
}
function renderAllRecapCards(recap=buildSetRecap(state)){$('recap-all-list').replaceChildren();recap.items.forEach(item=>appendRecapCard($('recap-all-list'),item));}
function startRecapPractice(untested=false){
 const recap=buildSetRecap(state),ids=(untested?recap.unassessedIds:recap.focusIds).slice(0,10);if(!ids.length)return;
 if(state.round?.queue.length&&!confirm('Replace your unfinished Learn round with these focus cards? Your recorded answers, mastery, and rewards will stay saved.'))return;
 keepRecovery('Before starting recap practice');recapOpen=false;state.round=newMasteryRound(state.cards,state.mastery,Math.random,ids);save();setActivity('learn');showNextLearnCard();
}
$('flash-mode').onclick=()=>setActivity('flash');$('learn-mode').onclick=()=>setActivity('learn');
$('tricky-mode').onclick=()=>setActivity('tricky');
$('strengthen-tricky').onclick=()=>startTrickyPractice(trickyPracticeIds(rankTrickyQuestions(state)));
$('tricky-go-learn').onclick=()=>setActivity('learn');
$('back-to-tricky').onclick=()=>{setActivity('tricky');$('tricky-panel').scrollIntoView({block:'start',behavior:'instant'});};
$('learn-next').onclick=advanceLearnCard;
$('learn-question').tabIndex=-1;
$('restart-learn').onclick=()=>{if(confirm('Restart this round? Per-card mastery streaks and previous progress will stay saved.')){state.round=state.round?.practice?.kind==='tricky'?newTrickyRound(state.cards,state.mastery,state.round.practice.ids):newMasteryRound(state.cards,state.mastery);save();renderLearn();}};
$('next-round').onclick=()=>{recapOpen=false;state.round=newMasteryRound(state.cards,state.mastery);save();renderLearn();showNextLearnCard();};
$('open-set-recap').onclick=()=>{recapOpen=!recapOpen;renderLearningRewards(buildSetRecap(state));if(recapOpen){$('set-recap').scrollIntoView({block:'start',behavior:'instant'});$('recap-title').focus({preventScroll:true});}};
$('summary-recap').onclick=()=>{recapOpen=true;renderLearningRewards(buildSetRecap(state));$('set-recap').scrollIntoView({block:'start',behavior:'instant'});$('recap-title').focus({preventScroll:true});};
$('close-set-recap').onclick=()=>{recapOpen=false;renderLearningRewards(buildSetRecap(state));$('open-set-recap').focus();};
$('recap-all-details').ontoggle=()=>{if($('recap-all-details').open)renderAllRecapCards();};
$('practice-recap-focus').onclick=()=>startRecapPractice();$('practice-recap-untested').onclick=()=>startRecapPractice(true);
$('recap-exam').onclick=()=>{setActivity('exam');$('exam-panel').scrollIntoView({block:'start',behavior:'instant'});};

if(['learn','exam','tricky'].includes(state.lastActivity))setActivity(state.lastActivity);
if(toastLater)toast(toastLater);

let answerAudio;
function playAnswerSound(correct){
 if(!state.soundEnabled)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;answerAudio ||= new Audio();answerAudio.resume().catch(()=>{});const start=answerAudio.currentTime;const tones=correct?[523,659,784]:[220,165];tones.forEach((frequency,i)=>{const oscillator=answerAudio.createOscillator(),gain=answerAudio.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start+i*.09);gain.gain.linearRampToValueAtTime(.09,start+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.001,start+i*.09+.16);oscillator.connect(gain);gain.connect(answerAudio.destination);oscillator.start(start+i*.09);oscillator.stop(start+i*.09+.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});}catch{/* Visual feedback stays available when audio is unsupported. */}
}
function animateLearnResult(correct){
 const panel=$('learn-question-panel');panel.classList.remove('celebrate-answer','retry-answer');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 void panel.offsetWidth;panel.classList.add(correct?'celebrate-answer':'retry-answer');
 clearTimeout(animateLearnResult.timer);animateLearnResult.timer=setTimeout(()=>panel.classList.remove('celebrate-answer','retry-answer'),900);
}
$('sound-toggle').onclick=()=>{state.soundEnabled=!state.soundEnabled;save();renderLearn();if(state.soundEnabled)playAnswerSound(true);};
$('exam-mode').onclick=()=>setActivity('exam');
function beginExam(){
 if(state.exam&&!confirm('Start a fresh full-set exam? This replaces the saved exam only. Your Learn and flashcard progress will stay.'))return;
 try{state.exam=createExam(state.cards);save();renderExam();$('exam-question').focus({preventScroll:true});}catch(e){toast(e.message);}
}
$('start-exam').onclick=beginExam;$('retake-exam').onclick=beginExam;$('discard-exam').onclick=beginExam;
function renderExam(){
 const exam=state.exam;
 $('exam-set-size').textContent=`${state.cards.length} questions · no time limit · answers revealed after submission`;
 $('start-exam').disabled=!state.cards.length;
 $('exam-start').hidden=!!exam;$('exam-taking').hidden=!exam||!!exam.submittedAt;$('exam-results').hidden=!exam?.submittedAt;
 if(!exam)return;
 if(exam.submittedAt){renderExamResults();return;}
 const i=exam.cursor,q=exam.questions[i],selected=exam.answers[i];
 if(ensureQuestionDistractors(q,state.cards,q.cardId))save();
 const answered=exam.questions.filter((question,n)=>isAnswerProvided(question,exam.answers[n])).length;
 $('exam-position').textContent=`QUESTION ${i+1} OF ${exam.questions.length}`;
 $('exam-count').textContent=`${answered} answered · ${exam.flagged.length} flagged`;
 $('exam-progress').style.width=`${answered/exam.questions.length*100}%`;
 $('exam-kind').textContent=q.type==='multi'?`SELECT ALL THAT APPLY · ${q.answers.length} CORRECT ANSWERS`:q.type==='written'?'WRITE YOUR ANSWER':q.options.length===2&&q.options.includes('True')&&q.options.includes('False')?'TRUE OR FALSE':'CHOOSE ONE ANSWER';
 $('exam-multi-hint').hidden=q.type!=='multi';
 if(q.type==='multi')$('exam-multi-hint').textContent=`Select exactly ${q.answers.length} answers. ${selected?.length||0} of ${q.answers.length} selected. Each selected option must be correct; results appear after submitting the exam.`;
 $('exam-question').textContent=q.prompt;$('exam-options').replaceChildren();
 $('exam-written-label').hidden=q.type!=='written';$('exam-written').value=selected||'';
 if(q.type==='choice'||q.type==='multi')q.options.forEach((option,n)=>{const multi=q.type==='multi',chosen=multi?Array.isArray(selected)&&selected.includes(option):option===selected;const button=document.createElement('button');button.type='button';button.className='learn-option exam-option';button.classList.toggle('selected',chosen);if(multi){button.setAttribute('role','checkbox');button.setAttribute('aria-checked',chosen);}else button.setAttribute('aria-pressed',chosen);const letter=document.createElement('span');letter.className='option-letter';letter.textContent=multi?(chosen?'☑':'☐'):String.fromCharCode(65+n);letter.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=option;button.append(letter,label);if(chosen){const badge=document.createElement('strong');badge.className='answer-badge';badge.textContent='● SELECTED';button.append(badge);}button.onclick=()=>{const answer=multi?(chosen?selected.filter(value=>value!==option):[...(selected||[]),option]):option;if(setExamAnswer(exam,i,answer)){save();renderExam();$('exam-options').children[n].focus({preventScroll:true});}};$('exam-options').append(button);});
 $('exam-prev').disabled=i===0;$('exam-next').disabled=i===exam.questions.length-1;
 $('exam-clear').disabled=!isAnswerProvided(q,selected);
 const flagged=exam.flagged.includes(i);$('exam-flag').textContent=flagged?'⚑ Flagged':'Flag for review';$('exam-flag').setAttribute('aria-pressed',flagged);
 $('exam-map-summary').textContent=`Question navigator · ${answered}/${exam.questions.length} answered`;
 renderExamGrid();
}
function renderExamGrid(){
 const exam=state.exam;$('exam-grid').replaceChildren();
 exam.questions.forEach((q,i)=>{const button=document.createElement('button');const answered=isAnswerProvided(q,exam.answers[i]),flagged=exam.flagged.includes(i);button.textContent=`${i+1}${flagged?' ⚑':answered?' ✓':''}`;button.className=answered?'map-answered':'';button.classList.toggle('map-current',exam.cursor===i);button.classList.toggle('map-flagged',flagged);button.setAttribute('aria-label',`Question ${i+1}, ${answered?'answered':'unanswered'}${flagged?', flagged':''}`);if(exam.cursor===i)button.setAttribute('aria-current','step');button.onclick=()=>{exam.cursor=i;save();renderExam();$('exam-question').focus({preventScroll:true});};$('exam-grid').append(button);});
}
$('exam-written').oninput=()=>{const exam=state.exam;if(!exam)return;setExamAnswer(exam,exam.cursor,$('exam-written').value||null);save();const answered=exam.questions.filter((question,i)=>isAnswerProvided(question,exam.answers[i])).length;$('exam-count').textContent=`${answered} answered · ${exam.flagged.length} flagged`;$('exam-progress').style.width=`${answered/exam.questions.length*100}%`;$('exam-clear').disabled=!$('exam-written').value;$('exam-map-summary').textContent=`Question navigator · ${answered}/${exam.questions.length} answered`;renderExamGrid();};
function moveExam(step){if(!state.exam||state.exam.submittedAt)return;state.exam.cursor=Math.max(0,Math.min(state.exam.questions.length-1,state.exam.cursor+step));save();renderExam();$('exam-question').focus({preventScroll:true});}
$('exam-prev').onclick=()=>moveExam(-1);$('exam-next').onclick=()=>moveExam(1);
$('exam-clear').onclick=()=>{if(state.exam&&setExamAnswer(state.exam,state.exam.cursor,null)){save();renderExam();}};
$('exam-flag').onclick=()=>{const exam=state.exam;if(!exam||exam.submittedAt)return;exam.flagged=exam.flagged.includes(exam.cursor)?exam.flagged.filter(i=>i!==exam.cursor):[...exam.flagged,exam.cursor];save();renderExam();};
$('submit-exam').onclick=()=>{const exam=state.exam;if(!exam||exam.submittedAt)return;const unanswered=exam.questions.filter((question,i)=>!isAnswerProvided(question,exam.answers[i])).length;if(!confirm(unanswered?`Submit with ${unanswered} unanswered question${unanswered===1?'':'s'}? Unanswered questions count as incorrect.`:'Submit your exam? You will see the score and answers, and this attempt will be locked.'))return;submitExam(exam);save();renderExam();$('exam-percent').focus({preventScroll:true});};
function renderExamResults(){
 const result=scoreExam(state.exam),percent=result.percent;
 $('exam-percent').textContent=`${percent}%`;$('exam-percent').tabIndex=-1;
 $('exam-level').textContent=percent>=85?'Strong recall':percent>=65?'Developing recall':'More practice will help';
 $('exam-score-detail').textContent=`${result.correct} correct · ${result.incorrect} incorrect · ${result.unanswered} unanswered · ${result.total} total`;
 $('exam-result-note').textContent=`${percent>=85?'Revisit the questions you missed to strengthen the gaps.':percent>=65?'Review the missed cards, then try a new exam.':'Use Learn to build recall, then test yourself again.'} These are study-set practice bands (85% / 65%), not a prediction of your real test grade. Scores follow the set’s answer key.`;
 const missed=result.rows.filter(r=>!r.correct);$('practice-exam-missed').disabled=!missed.length;$('practice-exam-missed').textContent=missed.length?`Learn ${Math.min(10,missed.length)} missed card${missed.length===1?'':'s'}`:'No missed cards';
 const rows=$('exam-missed-only').checked?missed:result.rows;$('exam-review-count').textContent=rows.length?`Showing ${rows.length} ${$('exam-missed-only').checked?'incorrect / unanswered':'total'} questions`:'All questions answered correctly. Turn off the filter to review the full exam.';$('exam-review').replaceChildren();
 rows.forEach(row=>{const article=document.createElement('article');article.className=`exam-review-item ${row.correct?'review-correct':'review-incorrect'}`;const badge=document.createElement('strong');badge.className='review-result-label';badge.textContent=`${row.correct?'✓ CORRECT':(Array.isArray(row.chosen)?row.chosen.length:row.chosen?.trim())?'✕ INCORRECT':'— UNANSWERED'} · QUESTION ${row.index+1}`;const question=document.createElement('h4');question.textContent=row.prompt;const chosen=document.createElement('p');chosen.className=row.correct?'review-chosen':'review-wrong';chosen.textContent=`Your answer: ${Array.isArray(row.chosen)?(row.chosen.length?row.chosen.join('\n'):'Not answered'):(row.chosen?.trim()?row.chosen:'Not answered')}`;const correct=document.createElement('p');correct.className='review-answer';correct.textContent=`Correct answer: ${row.answer}`;article.append(badge,question,chosen,correct);$('exam-review').append(article);});
}
$('exam-missed-only').onchange=renderExamResults;
$('practice-exam-missed').onclick=()=>{
 if(!state.exam?.submittedAt)return;const ids=scoreExam(state.exam).rows.filter(r=>!r.correct).map(r=>r.cardId);if(!ids.length)return;
 if(state.round?.queue.length&&!confirm('Replace your unfinished Learn round with up to 10 missed exam cards? Your learned-card progress will stay.'))return;
 keepRecovery('Before practicing missed exam cards');state.round=newMasteryRound(state.cards,state.mastery,Math.random,ids);save();setActivity('learn');
};
function renderMasteryOverview(){
 const summary=masterySummary(state.mastery);$('mastery-migration-note').hidden=!state.mastery.legacyCredit;
 const update=state.cardMigration;$('question-update-note').hidden=!update||update.dismissed;
 if(update)$('question-update-detail').textContent=`Question update: ${update.fromCount} → ${update.toCount} cards, with ${update.mergedCount} repeats combined. Select-all questions need all correct answers together, so their mastery starts fresh. Unchanged questions and XP are kept. Previous answers${update.previousExam?' and the earlier exam':''} are archived in your full backup.${update.previousRound?' A round containing updated questions was archived; its recorded answers are kept.':''}`;
 $('mastery-overview-text').textContent=`${summary.mastered} mastered (${summary.verified} verified, ${summary.manual} manual) · ${summary.developing} building mastery · ${summary.needsWork} at 0/3 · ${summary.total} total`;
 $('set-mastery-progress').style.width=`${summary.total?summary.mastered/summary.total*100:0}%`;
 if($('mastery-details').open)renderMasteryList();
}
function renderMasteryList(){
 $('mastery-list').replaceChildren();
 state.cards.forEach((card,id)=>{const progress=state.mastery.cards[id];const item=document.createElement('article');const badge=document.createElement('strong');badge.textContent=`${progress.manualMastered?'✓ MANUALLY MASTERED':isCardMastered(progress)?'✓ MASTERED':'IN PRACTICE'} · actual streak ${progress.streak}/3`;const question=document.createElement('p');question.textContent=`${id+1}. ${card.term}`;const counts=document.createElement('small');counts.textContent=`${progress.correct} correct · ${progress.incorrect} incorrect recorded${progress.previousVersions?.length?" · previous single-answer history archived; assess all answers together":" (older history has at most one credited success)"}`;const action=document.createElement('button');action.className='quiet mastery-list-action';action.textContent=isCardMastered(progress)?'Return to practice':'I mastered this';action.onclick=()=>applyManualMastery(id,!isCardMastered(state.mastery.cards[id]));item.append(badge,question,counts,action);if(progress.streak>=MASTERY_TARGET&&!progress.manualMastered){const skip=document.createElement('button');skip.className='quiet mastery-list-action';skip.textContent='I mastered this (skip automatic reviews)';skip.onclick=()=>applyManualMastery(id,true);item.append(skip);}$('mastery-list').append(item);});
}
$('mastery-details').ontoggle=()=>{if($('mastery-details').open)renderMasteryList();};

function submitLearnChoice(choice){
 const round=state.round;if(!round)return;
 if(answerQuestion(round,choice)){
  recordMastery(state.mastery,round.queue[0],round.feedback.correct);
  state.feedbackStreak=round.feedback.correct?(state.feedbackStreak||0)+1:0;
  playAnswerSound(round.feedback.correct);save();renderLearn();animateLearnResult(round.feedback.correct);
  $('learn-feedback').focus({preventScroll:true});$('learn-feedback').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
}
$('learn-check').onclick=()=>{const multi=state.round?.current?.type==='multi',choice=multi?state.round.selection||[]:$('learn-written').value;if(!isAnswerProvided(state.round.current,choice)){toast(multi?'Select at least one answer before checking.':'Type your answer before checking.');return;}submitLearnChoice(choice);};

$('dismiss-mastery-note').onclick=()=>{state.mastery.legacyCredit=false;save();renderMasteryOverview();};
$('dismiss-question-update').onclick=()=>{if(state.cardMigration)state.cardMigration.dismissed=true;save();renderMasteryOverview();};

function syncLearnActions(){
 const round=state.round,active=activity==='learn'&&!!round?.queue.length&&!$('import-dialog').open,ready=active&&!!round.feedback,multiPending=active&&round.current?.type==='multi'&&!round.feedback;
 $('learn-swipe-actions').hidden=!(ready||multiPending);$('learn-next').disabled=!ready;$('learn-next').hidden=!ready;
 $('learn-check-footer').hidden=!multiPending;$('learn-check-footer').disabled=!round?.selection?.length;
 $('learn-swipe-actions').setAttribute('aria-label',multiPending?'Select-all answer submission':'Answered question navigation');
 document.body.classList.toggle('learn-answer-ready',ready||multiPending);
 if(ready){const strengthening=round.practice?.kind==='tricky',streak=state.mastery.cards[round.queue[0]].streak;$('learn-action-result').textContent=round.feedback.correct?(strengthening?`✓ Correct · ${streak}/3 for this question`:'✓ Correct — ready for the next card'):'↺ Correct answer shown — keep practicing';$('learn-next').textContent=round.queue.length===1&&round.feedback.correct&&(!strengthening||streak>=MASTERY_TARGET)?'Finish round →':'Next question →';$('learn-action-hint').textContent=strengthening&&streak<MASTERY_TARGET?'This question returns until 3/3 · swipe left to continue':'Swipe left on the card to continue';}
 if(multiPending){const required=round.current.answers.length;$('learn-action-result').textContent=`${round.selection?.length||0} of ${required} answers selected`;$('learn-action-hint').textContent=`Select exactly ${required}, then check`;}
}
function advanceLearnCard(){
 if(activity!=='learn'||!state.round?.feedback||$('import-dialog').open)return;
 $('learn-written').value='';
 const learned=state.round.practice?.kind==='tricky'?advanceTrickyRound(state.round,state.mastery):advanceRound(state.round);if(learned!==null&&!state.learned.includes(learned))state.learned.push(learned);
 save();renderLearn();
 showNextLearnCard();
}
function showNextLearnCard(){
 const finished=!state.round.queue.length,target=finished?$('learn-summary'):$('learn-question-panel');
 if(finished){$('summary-title').tabIndex=-1;$('summary-title').focus({preventScroll:true});}else $('learn-question').focus({preventScroll:true});
 target.scrollIntoView({block:'start',behavior:'instant'});
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!finished){target.classList.remove('next-card-enter');void target.offsetWidth;target.classList.add('next-card-enter');}
}
$('import-dialog').addEventListener('close',syncLearnActions);
installLearnSwipe($('learn-question-panel'),{
 canAdvance:()=>activity==='learn'&&!!state.round?.feedback&&!$('import-dialog').open,
 getToken:()=>`${state.round?.queue[0]}:${state.round?.attempts}`,
 onNext:advanceLearnCard
});
syncLearnActions();

function applyManualMastery(id,mastered){
 if(!state.mastery.cards[id])return;
 keepRecovery('Before manually changing mastery');
 const wasCurrent=state.round?.queue[0]===id;
 if(mastered&&wasCurrent&&state.round.feedback?.correct&&!state.learned.includes(id))state.learned.push(id);
 setManualMastery(state.mastery,id,mastered);
 const removed=mastered&&completeManualCard(state.round,id);
 save();render();if(state.round)renderLearn();
 if(activity==='learn'&&wasCurrent&&removed)showNextLearnCard();
 toast(mastered?'Marked mastered by you. Undo with “Return to practice” in the mastery list.':`Returned to practice at ${state.mastery.cards[id].streak}/3. Past scores are unchanged.`);
}
$('learn-manual-mastered').onclick=()=>{if(state.round?.queue.length)applyManualMastery(state.round.queue[0],true);};
$('learn-manual-footer').onclick=$('learn-manual-mastered').onclick;
$('learn-check-footer').onclick=()=>$('learn-check').click();
