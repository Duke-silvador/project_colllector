const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const state={
  tasks:JSON.parse(localStorage.getItem('farrukh_mobile_tasks')||'null')||[],
  chat:JSON.parse(localStorage.getItem('farrukh_mobile_chat')||'[]'),
  tts:true
};
const save=()=>{localStorage.setItem('farrukh_mobile_tasks',JSON.stringify(state.tasks));localStorage.setItem('farrukh_mobile_chat',JSON.stringify(state.chat))};
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const safeUrl=u=>{try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)?x.href:'#'}catch{return '#'}};

function show(name){
  $$('.screen').forEach(x=>x.classList.toggle('active',x.id===name));
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-screen]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.screen)));

function setCoreState(mode='idle'){
  const label=$('#coreState');
  if(label) label.textContent=({idle:'ГОТОВ К ЗАПРОСУ',listening:'СЛУШАЮ',thinking:'ДУМАЮ',speaking:'ОТВЕЧАЮ',error:'НЕТ СВЯЗИ'})[mode]||'ГОТОВ К ЗАПРОСУ';
}

function renderTasks(){
  const box=$('#taskList'); if(!box) return;
  box.innerHTML=state.tasks.length?state.tasks.map((t,i)=>'<div class="task '+(t.done?'done':'')+'"><div class="task-left"><input type="checkbox" data-check="'+i+'" '+(t.done?'checked':'')+'><div><b>'+esc(t.text)+'</b><small>'+(t.priority==='high'?'Важная':'Обычная')+'</small></div></div><button data-del="'+i+'">×</button></div>').join(''):'<div class="coming"><div class="big-symbol">✓</div><h3>Задач пока нет</h3><p>Добавьте первую задачу — она появится здесь.</p></div>';
  save();
}
$('#taskList')?.addEventListener('change',e=>{if(e.target.dataset.check!==undefined){state.tasks[+e.target.dataset.check].done=e.target.checked;renderTasks()}});
$('#taskList')?.addEventListener('click',e=>{if(e.target.dataset.del!==undefined){state.tasks.splice(+e.target.dataset.del,1);renderTasks()}});
$('#addTask')?.addEventListener('click',()=>$('#taskModal').classList.add('show'));
$('#cancelTask')?.addEventListener('click',()=>$('#taskModal').classList.remove('show'));
$('#saveTask')?.addEventListener('click',()=>{const text=$('#taskText').value.trim();if(!text)return;state.tasks.unshift({text,priority:$('#taskPriority').value,done:false});$('#taskText').value='';$('#taskModal').classList.remove('show');renderTasks()});

function sourceHtml(sources=[]){
  if(!Array.isArray(sources)||!sources.length)return '';
  const chips=sources.slice(0,5).map((s,i)=>{
    const url=safeUrl(s.url||'');
    if(url==='#')return '';
    const title=esc((s.title||'Источник '+(i+1)).trim());
    return '<a class="source-chip" href="'+url+'" target="_blank" rel="noopener noreferrer">↗ '+title+'</a>';
  }).join('');
  return chips?'<div class="source-block"><span>ИСТОЧНИКИ</span><div class="source-chips">'+chips+'</div></div>':'';
}

function renderChat(){
  const box=$('#messages'); if(!box) return;
  box.innerHTML=state.chat.map(m=>
    '<div class="msg '+(m.role==='user'?'user':'ai')+'">'+esc(m.text)+(m.role!=='user'?sourceHtml(m.sources):'')+'</div>'
  ).join('');
  box.scrollTop=box.scrollHeight; save();
}

function historyForApi(){
  return state.chat
    .filter(m=>!m.temp && (m.role==='user'||m.role==='ai') && m.text)
    .slice(-12)
    .map(m=>({role:m.role==='ai'?'assistant':'user',content:String(m.text).slice(0,6000)}));
}

async function askAI(text){
  text=String(text||'').trim(); if(!text)return;
  const history=historyForApi();
  state.chat.push({role:'user',text}); renderChat(); show('chat'); setCoreState('thinking');
  state.chat.push({role:'ai',text:'Ищу и анализирую…',temp:true}); renderChat();
  try{
    const r=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:text,history,useWeb:true})
    });
    const d=await r.json();
    state.chat=state.chat.filter(x=>!x.temp);
    if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));
    const reply=d.reply||d.error||'Нет ответа';
    state.chat.push({
      role:'ai',
      text:reply,
      sources:Array.isArray(d.sources)?d.sources:[],
      webSearch:Boolean(d.webSearch),
      provider:d.provider||''
    });
    renderChat(); setCoreState('idle');
  }catch(e){
    state.chat=state.chat.filter(x=>!x.temp);
    state.chat.push({role:'ai',text:'Сейчас не удалось получить ответ от AI. Попробуйте ещё раз.'});
    renderChat(); setCoreState('error'); setTimeout(()=>setCoreState('idle'),1600);
  }
}
function sendFromHome(){const i=$('#homeInput');const t=i.value;i.value='';askAI(t)}
$('#homeSend')?.addEventListener('click',sendFromHome);
$('#homeInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendFromHome()}});
$('#sendBtn')?.addEventListener('click',()=>{const i=$('#msgInput');const t=i.value;i.value='';askAI(t)});
$('#msgInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#sendBtn').click()}});

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$('#talkBtn')?.addEventListener('click',()=>{
  if(!SR){alert('Голосовой ввод лучше всего работает в Chrome на Android.');return}
  const r=new SR();r.lang='ru-RU';r.continuous=false;r.interimResults=false;setCoreState('listening');
  r.onresult=e=>askAI(e.results[0][0].transcript);
  r.onerror=()=>{setCoreState('error');setTimeout(()=>setCoreState('idle'),1200)};
  r.onend=()=>{if($('#coreState')?.textContent==='СЛУШАЮ')setCoreState('idle')};
  r.start();
});

function addIng(name='',g='',p=''){
  const row=document.createElement('div');row.className='ingredient';
  row.innerHTML='<input placeholder="Продукт" value="'+esc(name)+'"><input class="g" type="number" placeholder="г" value="'+g+'"><input class="p" type="number" placeholder="₽/кг" value="'+p+'"><button>×</button>';
  $('#ingredients').appendChild(row);row.querySelectorAll('input').forEach(x=>x.oninput=calc);row.querySelector('button').onclick=()=>{row.remove();calc()}
}
function calc(){
  let total=0;$$('.ingredient').forEach(r=>{total+=(+r.querySelector('.g').value||0)/1000*(+r.querySelector('.p').value||0)});
  $('#totalCost').textContent=total.toFixed(2).replace('.',',')+' ₽';
  const sale=+$('#salePrice').value||0;$('#foodCost').textContent=sale?((total/sale)*100).toFixed(1)+'%':'—';$('#margin').textContent=sale?(sale-total).toFixed(2)+' ₽':'—';
}
$('#addIng')?.addEventListener('click',()=>addIng()); if($('#salePrice'))$('#salePrice').oninput=calc;
$('#askCost')?.addEventListener('click',()=>{const rows=[...$$('.ingredient')].map(r=>({name:r.children[0].value,grams:r.children[1].value,price:r.children[2].value}));askAI('Блюдо: '+($('#dishName').value||'без названия')+'. Ингредиенты: '+JSON.stringify(rows)+'. Себестоимость: '+$('#totalCost').textContent+'. Цена продажи: '+($('#salePrice').value||'не указана')+' ₽. Проанализируй food cost и предложи диапазон цены.')});

renderTasks();renderChat();setCoreState('idle');