(()=>{'use strict';
const by=id=>document.getElementById(id);
const casino=by('casino');if(!casino)return;
const panel=document.createElement('section');panel.className='panel';panel.id='guided-coach';panel.innerHTML='<div class="row" style="justify-content:space-between"><div><h2 style="margin:0">At-the-table academy <span class="tag">V25</span></h2><p class="small">Quick lessons while you practice with virtual cards.</p></div><label><input type="checkbox" id="guidedEnabled" checked> Guided lessons</label></div><div class="grid"><div class="lesson"><h3 id="guidedTitle">Start with the cards</h3><p id="guidedText">Deal a hand to get a lesson relevant to the current table.</p><p class="small" id="guidedNote">Practice guidance is educational and not a guaranteed optimal play.</p></div><div class="lesson"><h3>Count what you can see</h3><p>2–6: +1 · 7–9: 0 · 10–Ace: −1. Count only revealed cards, never the dealer hole card.</p><div class="row"><label>Your running count <input id="guidedGuess" type="number" style="max-width:110px"></label><button id="guidedCheck">Check</button></div><p id="guidedResult" aria-live="polite" class="small">Try an estimate during a hand.</p></div></div>';
const table=casino.querySelector('.table');table?.insertAdjacentElement('afterend',panel);
const state={last:'',enabled:true,attempts:0,correct:0};try{Object.assign(state,JSON.parse(localStorage.getItem('blackedge-guided-v25')||'{}'))}catch{}
by('guidedEnabled').checked=state.enabled;
function persist(){try{localStorage.setItem('blackedge-guided-v25',JSON.stringify({enabled:state.enabled,attempts:state.attempts,correct:state.correct}))}catch{}}
function coach(){if(!state.enabled)return;
const player=by('player')?.querySelectorAll('.card')||[],dealer=by('dealer')?.querySelectorAll('.card')||[];
const numbers=[...player].map(x=>x.textContent.trim());
let title='Start with the cards',msg='Deal a hand to begin.';
if(numbers.length){const up=dealer[0]?.textContent.trim()||'?';title='Read your hand';msg='Your '+numbers.length+' revealed cards are '+numbers.join(', ')+'. Dealer shows '+up+'. Look for a hard total, a usable Ace, or matching cards before choosing a move.';if(numbers.some(x=>x.startsWith('A')))msg+=' An Ace may count as 1 or 11.';if(numbers.length===2&&numbers[0][0]===numbers[1][0])msg+=' Matching ranks may qualify for a split in the full rules table.'}
if(state.last!==title+msg){state.last=title+msg;by('guidedTitle').textContent=title;by('guidedText').textContent=msg}}
by('guidedEnabled').onchange=()=>{state.enabled=by('guidedEnabled').checked;persist();panel.querySelector('.grid').style.display=state.enabled?'':'none';if(state.enabled){state.last='';coach()}};
panel.querySelector('.grid').style.display=state.enabled?'':'none';
by('guidedCheck').onclick=()=>{const raw=by('guidedGuess').value;if(raw===''){by('guidedResult').textContent='Enter a count first.';return}
const visible=[...document.querySelectorAll('#dealer .card:not(.back),#player .card,#seats .card:not(.back)')];let expected=0;for(const el of visible){const rank=el.textContent.trim().replace(/[♠♥♦♣]/g,'');if(['2','3','4','5','6'].includes(rank))expected++;else if(['10','J','Q','K','A'].includes(rank))expected--}
const got=Number(raw),ok=got===expected;state.attempts++;if(ok)state.correct++;persist();by('guidedResult').textContent=(ok?'Correct! ':'Not quite. ')+'The currently visible cards total '+expected+'. Accuracy '+state.correct+'/'+state.attempts+'. Note: this checks the displayed cards, not the entire shoe count.'};
const observer=new MutationObserver(()=>coach());const watch=casino.querySelector('.table');if(watch)observer.observe(watch,{childList:true,subtree:true,characterData:true});coach();
})();