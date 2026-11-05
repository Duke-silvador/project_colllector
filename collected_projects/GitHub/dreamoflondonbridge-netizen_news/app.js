import {initial,mediaTypes,labels,buildSteps,buildQuizSteps,quizReady,gradeQuiz,prepareQuizzes,validate} from './data.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function icon(name){return `<svg class="ui-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;}
let activeNav='article';
const safeUrl=s=>{try{const u=new URL(s,location.href);return ['http:','https:','blob:'].includes(u.protocol)||(/^data:(image|video)\//.test(s))?esc(s):''}catch{return ''}};
const embedded=document.getElementById('embeddedArticle');
const packagedAssets=JSON.parse(document.getElementById('embeddedAssets')?.textContent||'{}');
function hydrateAssets(article){for(const block of article.blocks)if(packagedAssets[block.src])block.src=packagedAssets[block.src];return article;}
hydrateAssets(initial);
const storageKey=embedded?.dataset.storageKey||'school-news-v1';
const quizAnswers=new Map();
let readIndex=0,quizIndex=0;
let data=embedded?validate(JSON.parse(embedded.textContent)):structuredClone(initial),mode='read',index=0,reveal=0,panel=true,hidden=new Set(),compare=new Set(),concept=0;
try{const saved=localStorage.getItem(storageKey);if(saved)data=validate(JSON.parse(saved));}catch{toast('저장된 자료를 읽지 못해 예시 기사를 표시합니다.');}
hydrateAssets(data);prepareQuizzes(data);
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3500)}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(portableData()));$('#editorStatus').textContent='✓ 이 브라우저에 저장되었습니다.'}catch{toast('브라우저 저장 공간이 부족합니다. JSON으로 내보내 주세요.')}}
function media(b,summary=false){if(b.type==='video')return b.src?`<video controls preload="metadata" src="${safeUrl(b.src)}" aria-label="${esc(b.caption)}"></video>`:`<div class="video-empty"><b>▷</b>수업 영상 등록 대기<small style="display:block;margin-top:10px">편집에서 영상 파일 또는 직접 재생 URL을 추가하세요.</small></div>`;if(!b.src)return '<div class="hidden-media">편집에서 자료를 등록해 주세요.</div>';return `<img src="${safeUrl(b.src)}" alt="${esc(b.alt||b.caption)}" ${summary?'':`data-zoom="${esc(b.id)}"`} loading="lazy">`;}
function renderArticle(){const current=currentSteps()[index],lesson=data.lessons[current?.id]||{};$('#article').innerHTML='<div class="section-tag">⚑ 뉴스 탐험 <span style="margin:0 9px">|</span> 기사문 · 복합양식</div>'+data.blocks.map(b=>{const active=current?.id===b.id;const related=mode==='quiz'?(current?.kind==='quiz'&&quizState(current.id).submitted&&(data.quizzes[current.id].relatedIds||[]).includes(b.id)):(phases(lesson).slice(0,reveal).some(p=>p.key==='explanation')&&(lesson.relatedIds||[]).includes(b.id));let content='';if(b.type==='title')content=`<h1>${esc(b.text)}</h1>`;else if(b.type==='subtitle')content=`<h2 class="subtitle">${esc(b.text)}</h2><div class="byline"><strong>우리학교 학생기자단</strong><span>입력 2026.05.16 09:00</span><span class="tools"><button data-action="font" title="글자 크기 조절">가+</button><button data-action="print" title="인쇄">▤</button></span></div>`;else if(b.type==='lead')content=`<p class="article-lead">${esc(b.text)}</p>`;else if(b.type==='subheading')content=`<h2 class="article-subheading">${esc(b.text)}</h2>`;else if(b.type==='paragraph')content=`<p class="body">${esc(b.text)}</p>`;else content=`<figure><div class="media-wrap">${hidden.has(b.id)?'<div class="hidden-media">자료를 숨겼습니다 · 글만 읽고 비교해 보세요</div>':media(b)}<span class="media-label">${esc(labels[b.type])} · 수업용 예시</span></div><figcaption><div class="caption">${esc(b.caption)}</div><div class="source">${esc(b.source)}</div></figcaption><div class="media-actions"><button data-hide="${esc(b.id)}">${hidden.has(b.id)?'다시 보기':'자료 숨기기'}</button>${b.type!=='video'?`<button data-zoom="${esc(b.id)}">확대 ↗</button>`:''}<button data-compare="${esc(b.id)}">${compare.has(b.id)?'✓ 비교 선택':'＋ 비교'}</button></div></figure>`;return `<section class="block ${active?'focused':''} ${related?'related':''}" data-id="${esc(b.id)}">${content}</section>`}).join('')+'<div class="article-end">우리학교 학생기자단 · 수업용으로 작성한 예시 기사입니다.<br><br>이 기사에 사용된 글과 자료의 관계를 함께 생각해 보세요.</div><div id="summary"></div>';if(mode==='read'&&['summary','concept'].includes(current?.kind))renderSummary(current.kind);}
function renderSummary(kind){const mediaBlocks=data.blocks.filter(b=>mediaTypes.includes(b.type));$('#summary').innerHTML=kind==='summary'?`<section class="summary-area"><div class="section-tag">배움을 연결하다</div><h2>각 자료는 어떤 역할을 했을까요?</h2><p class="muted">기사에 등장한 ${mediaBlocks.length}개 자료를 순서대로 정리합니다.</p>${mediaBlocks.map((b,i)=>{const l=data.lessons[b.id]||{};return `<div class="summary-item"><div>${media(b,true)}</div><div><small>${i+1}. ${labels[b.type]}</small><h4>${esc(b.caption)}</h4><p><b>글과의 관계</b> ${esc(l.explanation||'등록된 설명이 없습니다.')}</p><p><b>표현 효과</b> ${esc(l.effect||'등록된 효과가 없습니다.')}</p></div></div>`}).join('')}</section>`:`<section class="summary-area"><div class="section-tag">오늘의 배움</div><h2>글과 자료가 만나, 더 풍부한 기사로</h2><p>각 자료는 글의 내용을 보충하며 서로 다른 방식으로 정보를 전달합니다.</p><table class="concept-table"><thead><tr><th>자료</th><th>특징과 표현 효과</th></tr></thead><tbody>${[['사진','실제 장면을 포착하여 현장감과 구체성을 높입니다.'],['그림','필요한 정보를 선택하고 단순화하여 이해를 돕습니다.'],['영상','움직임과 소리, 시간의 흐름을 함께 전달합니다.']].map(([t,d],i)=>`<tr><th>${t}</th><td>${concept>i?d:'다음 설명을 눌러 확인하세요.'}</td></tr>`).join('')}</tbody></table><button data-action="concept" ${concept>=3?'disabled':''}>${concept>=3?'모든 개념을 확인했습니다':'다음 설명 공개 ＋'}</button><p style="margin-top:30px;line-height:2">생각해 보기 · 같은 내용을 글로만 전달한다면 어떤 점이 달라질까요?<br>새로운 기사를 쓴다면 어떤 자료를 선택하고 싶나요?</p></section>`;}
function phases(l){return [{key:'question',title:'관찰 질문',text:l.question},{key:'explanation',title:'글과의 관계',text:l.explanation},{key:'effect',title:'표현 효과',text:l.effect},{key:'extra',title:'더 생각해 보기',text:l.extra}].filter(x=>x.text)}
function renderSide(){if(mode==='quiz'){renderQuizSide();return;}if(!panel){$('#sidebar').innerHTML='<button data-action="panel">학습 패널 다시 보기 →</button>';return;}const step=currentSteps()[index],l=data.lessons[step.id]||{},p=phases(l);$('#sidebar').innerHTML=`<div class="lesson-panel"><div class="lesson-number">${icon('book')} 기사 읽기 ${String(index+1).padStart(2,'0')} <button style="float:right;border:0;padding:0;background:none" data-action="panel" aria-label="학습 패널 숨기기">−</button></div><h3 class="lesson-title">${esc(step.name)}</h3>${step.kind==='block'?`<div class="lesson-phases" aria-label="설명 공개 단계">${p.map((phase,i)=>`<button data-reveal-stage="${i+1}" class="${i<reveal?'revealed':''}" aria-pressed="${i<reveal}"><span>${i+1}</span>${esc(phase.title)}</button>`).join('')}</div>`:''}${step.kind==='intro'?'<p>기사 전체를 읽고, 다음 버튼으로 제목·본문·자료를 차례로 살펴보세요.</p><p class="muted">설명을 하나씩 열어 선생님과 함께 분석할 수 있어요.</p><button class="primary" data-action="next">기사 분석 시작 →</button>':step.kind==='block'?`<p class="muted">${reveal===0?'먼저 강조된 부분을 관찰해 보세요. 설명은 버튼을 누를 때마다 공개됩니다.':''}</p>${p.slice(0,reveal).map(x=>`<div class="reveal-item"><small>${icon(x.key==='question'?'lens':x.key==='explanation'?'book':'bulb')}${x.title}</small><p>${esc(x.text)}</p></div>`).join('')}${!p.length?'<p>이 요소의 학습 내용을 편집 모드에서 추가해 주세요.</p>':''}<div class="panel-buttons"><button class="primary" data-action="reveal">${reveal<p.length?'다음 설명 ＋':'다음 학습 →'}</button><button data-action="all">설명 전체 보기</button></div>`:step.kind==='summary'?'<p>기사 속 자료를 순서대로 모았습니다. 각각 어떤 내용을 보충하는지 비교해 보세요.</p>':'<p>사진·그림·영상의 특징을 하나씩 공개하며 오늘 배운 내용을 정리합니다.</p><button data-action="concept">개념 설명 공개 ＋</button>'}<div class="side-note">← → 방향키로 진행할 수 있습니다.<br>→ 키는 설명을 공개한 뒤 다음 요소로 이동합니다.</div></div>`;}
function renderBar(){const steps=currentSteps();$('#learningBar').hidden=false;$('#learningBar').innerHTML=`<div class="progress"><i style="width:${(index+1)/steps.length*100}%"></i></div><button data-action="previous" ${index===0&&reveal===0?'disabled':''}>❮ 이전</button><select id="stepSelect" aria-label="${mode==='quiz'?'퀴즈':'기사 학습 요소'}로 이동">${steps.map((s,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(s.name)}</option>`).join('')}</select><span class="bar-count">${index+1} / ${steps.length}</span><button data-action="restart">${mode==='quiz'?'다시 도전':'처음부터'}</button><button data-action="fullscreen" class="fullscreen-button">전체 화면 ⛶</button><button data-action="panel">패널 ${panel?'숨기기':'보기'}</button>${mode==='quiz'?'<button class="quiz-return" data-quiz-action="question">문제 보기</button>':''}<button class="primary" data-action="next" ${index===steps.length-1?'disabled':''}>${mode==='quiz'?'다음 문제':'다음 단계'} ❯</button>`;}
function render(scroll=false){document.body.classList.add('learning');document.body.classList.toggle('quizzing',mode==='quiz');$('#readButton').classList.toggle('active',mode==='read');$('#learnButton').classList.toggle('active',mode==='quiz');index=Math.min(index,currentSteps().length-1);renderArticle();renderSide();renderBar();renderJourney();enhanceSelects(document);if(scroll){const s=currentSteps()[index];requestAnimationFrame(()=>{const el=mode==='quiz'&&innerWidth<=760?$('#sidebar'):s.id?[...document.querySelectorAll('.block')].find(x=>x.dataset.id===s.id):['summary','concept'].includes(s.kind)?$('#summary'):$('#article');el?.scrollIntoView({behavior:'smooth',block:'start'});});}}
function move(n){index=Math.max(0,Math.min(currentSteps().length-1,index+n));reveal=0;render(true)}
function nextReveal(){if(mode==='quiz'){move(1);return;}const s=currentSteps()[index],p=phases(data.lessons[s.id]||{});if(s.kind==='block'&&reveal<p.length){reveal++;render();}else if(s.kind==='concept'&&concept<3){concept++;render();}else move(1)}
$('#readButton').onclick=()=>setMode('read');$('#learnButton').onclick=()=>setMode('quiz');
document.addEventListener('click',async e=>{const el=e.target.closest('button,[data-zoom]');if(!el)return;const id=el.dataset.hide;if(id){hidden.has(id)?hidden.delete(id):hidden.add(id);render();return;}if(el.dataset.zoom){const b=data.blocks.find(x=>x.id===el.dataset.zoom);if(!b?.src)return;$('#imageDialog img').src=new URL(b.src,location.href).href;$('#imageDialog img').alt=b.alt||b.caption||'';$('#imageDialog p').textContent=b.caption||'';$('#imageDialog').showModal();return;}if(el.dataset.compare){const id=el.dataset.compare;if(compare.has(id))compare.delete(id);else compare.add(id);if(compare.size===2){const selected=data.blocks.filter(b=>compare.has(b.id));const d=document.createElement('dialog');d.innerHTML=`<button class="close">×</button><h2>자료 나란히 비교하기</h2><div class="compare-list">${selected.map(b=>`<div>${media(b,true)}<p>${esc(b.caption)}</p><p class="muted">${esc(data.lessons[b.id]?.effect)}</p></div>`).join('')}</div>`;document.body.append(d);d.querySelector('button').onclick=()=>{d.close();d.remove()};d.showModal();compare.clear()}else toast('비교할 다른 자료를 하나 더 선택하세요.');render();return;}const a=el.dataset.action;if(a==='learn')setMode('quiz');if(a==='next')move(1);if(a==='previous'){if(mode==='read'&&reveal>0){reveal--;render()}else move(-1)}if(a==='reveal')nextReveal();if(a==='all'){reveal=phases(data.lessons[currentSteps()[index].id]||{}).length;render()}if(a==='panel'){panel=!panel;renderSide();renderBar();enhanceSelects(document)}if(a==='restart'){if(mode==='quiz')quizAnswers.clear();index=0;reveal=0;concept=0;render(true)}if(a==='concept'){concept=Math.min(3,concept+1);render()}if(a==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('이 브라우저에서는 전체 화면을 사용할 수 없습니다.')}}if(a==='print')window.print();if(a==='font'){document.querySelectorAll('.body').forEach(p=>p.style.fontSize=p.style.fontSize?'':'20px')}});
$('#article').addEventListener('click',e=>{if(e.target.closest('button,img,video'))return;const id=e.target.closest('[data-id]')?.dataset.id;const i=currentSteps().findIndex(s=>s.id===id);if(i>=0){index=i;reveal=0;render()}});
document.addEventListener('change',e=>{if(e.target.id==='stepSelect'){index=Number(e.target.value);reveal=0;render(true)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')return;if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.closest('.pixel-select')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();nextReveal()}if(e.key==='ArrowLeft'){e.preventDefault();if(mode==='read'&&reveal){reveal--;render()}else move(-1)}});
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function field(id,key,label,value,lesson=false){const fieldId=esc(`${id}-${lesson?'lesson-':''}${key}`);const packed=key==='src'&&value?.startsWith('data:');return `<div class="editor-field"><label for="${fieldId}">${label}</label><textarea id="${fieldId}" data-field="${key}" data-owner="${esc(id)}" ${lesson?'data-lesson="true"':''} ${packed?'placeholder="기기 파일이 등록되어 있어요. 새 URL을 입력하면 교체됩니다."':''}>${packed?'':esc(value)}</textarea></div>`;}
function renderEditor(){const pars=data.blocks.filter(b=>['paragraph','lead'].includes(b.type));$('#editorBlocks').innerHTML=data.blocks.map((b,i)=>{const l=data.lessons[b.id]||{};return `<section class="editor-block"><div class="edit-row"><span class="block-number">${String(i+1).padStart(2,'0')}</span><strong>${icon(mediaTypes.includes(b.type)?b.type==='video'?'video':'picture':'news')}${labels[b.type]}</strong><button data-up="${esc(b.id)}" ${i===0?'disabled':''} aria-label="위로 이동">↑</button><button data-down="${esc(b.id)}" ${i===data.blocks.length-1?'disabled':''} aria-label="아래로 이동">↓</button><button data-delete="${esc(b.id)}">삭제</button></div>${mediaTypes.includes(b.type)?`${field(b.id,'src','자료 URL (영상은 MP4/WebM 등 직접 재생 주소)',b.src)}<label>또는 기기의 자료 파일 선택<input type="file" data-upload="${esc(b.id)}" accept="${b.type==='video'?'video/*':'image/*'}"></label>${field(b.id,'caption','캡션',b.caption)}${field(b.id,'source','출처',b.source)}${field(b.id,'alt','대체 텍스트',b.alt)}`:field(b.id,'text','기사 내용',b.text)}<details class="lesson-settings"><summary>${icon('book')} 기사 읽기 설명 편집 <span>펼치기 ＋</span></summary>${field(b.id,'question','관찰 질문 (비워 두면 생략)',l.question,true)}${field(b.id,'explanation','글과의 관계 / 학습 설명',l.explanation,true)}${field(b.id,'effect','표현 효과',l.effect,true)}${field(b.id,'extra','추가 설명 (선택)',l.extra,true)}<label>관련 기사 문단</label>${pars.filter(p=>p.id!==b.id).map(p=>`<label class="check"><input type="checkbox" data-related="${esc(b.id)}" value="${esc(p.id)}" ${(l.relatedIds||[]).includes(p.id)?'checked':''}>${esc(p.text?.slice(0,28))}…</label>`).join('')}</details>${renderQuizEditor(b,pars)}</section>`}).join('');renderPositions();enhanceSelects($('#editor'));}
function renderPositions(){const select=$('#addPosition'),previous=select.value;select.innerHTML='<option value="end">기사 맨 끝에</option><option value="start">기사 맨 앞에</option>'+data.blocks.map((b,i)=>`<option value="${esc(b.id)}">${i+1}. ${labels[b.type]} 뒤 · ${esc((b.text||b.caption||'').slice(0,18))}</option>`).join('');if([...select.options].some(o=>o.value===previous))select.value=previous;enhanceSelects($('#editor'));}
$('#addType').onchange=()=>{if($('#addType').value==='lead'){const subtitle=data.blocks.find(b=>b.type==='subtitle');if(subtitle)$('#addPosition').value=subtitle.id;}};
$('#editButton').onclick=()=>{renderEditor();$('#editor').showModal()};
$('#editorBlocks').addEventListener('input',e=>{const t=e.target;if(!t.dataset.field)return;const b=data.blocks.find(x=>x.id===t.dataset.owner);if(t.dataset.lesson){data.lessons[b.id]??={};data.lessons[b.id][t.dataset.field]=t.value}else b[t.dataset.field]=t.value;save();render()});
$('#editorBlocks').addEventListener('change',async e=>{const t=e.target;if(t.dataset.related){const l=data.lessons[t.dataset.related]??={};l.relatedIds=[...$('#editorBlocks').querySelectorAll('input[data-related]')].filter(x=>x.dataset.related===t.dataset.related&&x.checked).map(x=>x.value);save();render()}if(t.dataset.upload&&t.files[0]){const f=t.files[0];if(f.size>20*1024*1024){toast('파일은 20MB 이하로 선택하세요. 큰 영상은 URL로 등록해 주세요.');return;}const reader=new FileReader();reader.onload=()=>{data.blocks.find(b=>b.id===t.dataset.upload).src=reader.result;save();render();renderEditor()};reader.readAsDataURL(f)}});
$('#editorBlocks').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const id=t.dataset.up||t.dataset.down||t.dataset.delete,i=data.blocks.findIndex(b=>b.id===id);if(i<0)return;if(t.dataset.delete){if(!confirm('이 블록과 연결된 학습 설명을 삭제할까요?'))return;data.blocks.splice(i,1);delete data.lessons[id];delete data.quizzes[id];quizAnswers.delete(id);for(const q of Object.values(data.quizzes))if(q.relatedIds)q.relatedIds=q.relatedIds.filter(x=>x!==id);for(const l of Object.values(data.lessons))if(l.relatedIds)l.relatedIds=l.relatedIds.filter(x=>x!==id);}else{const j=i+(t.dataset.up?-1:1);[data.blocks[i],data.blocks[j]]=[data.blocks[j],data.blocks[i]];}save();renderEditor();render()});
$('#addButton').onclick=()=>{const type=$('#addType').value,id='block-'+crypto.randomUUID();const position=$('#addPosition').value;const insertion=position==='start'?0:position==='end'?data.blocks.length:Math.max(0,data.blocks.findIndex(b=>b.id===position)+1);data.blocks.splice(insertion,0,{id,type,...(mediaTypes.includes(type)?{src:'',caption:'새 자료',source:''}:{text:type==='lead'?'기사의 핵심 내용을 요약해 주세요.':type==='subheading'?'소제목을 입력해 주세요.':'새 내용을 입력해 주세요.'})});if(mediaTypes.includes(type))data.lessons[id]={question:'이 자료는 어떤 내용을 보여 주나요?',relatedIds:[]};save();renderEditor();render();[...$('#editorBlocks').children][insertion]?.scrollIntoView({behavior:'smooth'})};
$('#exportButton').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='우리학교-뉴스-수업.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const next=validate(JSON.parse(await f.text()));if(!confirm('현재 기사를 가져온 기사로 교체할까요?'))return;data=prepareQuizzes(hydrateAssets(next));readIndex=0;quizIndex=0;quizAnswers.clear();index=0;reveal=0;hidden.clear();save();renderEditor();render();toast('기사를 가져왔습니다.')}catch(err){toast('가져오기 실패: '+err.message)}e.target.value=''};
$('#resetButton').onclick=()=>{if(!confirm('편집한 내용을 예시 기사로 바꿀까요? 먼저 JSON 내보내기로 보관할 수 있습니다.'))return;data=structuredClone(initial);readIndex=0;quizIndex=0;quizAnswers.clear();index=0;reveal=0;hidden.clear();save();renderEditor();render()};
render();

$('#downloadHtmlButton').onclick=async()=>{
 try{
  if(!embedded){
   const response=await fetch('./school-news.html');if(!response.ok)throw Error('먼저 npm run build를 실행해 주세요.');
   const text=await response.text();downloadHtml(new DOMParser().parseFromString(text,'text/html'));
  }else downloadHtml(document.cloneNode(true));
 }catch(err){toast('파일 저장 실패: '+err.message)}
};
function downloadHtml(doc){
 const payload=doc.getElementById('embeddedArticle');
 payload.textContent=JSON.stringify(portableData()).replaceAll('<','\\u003c');
 payload.dataset.storageKey='school-news-'+crypto.randomUUID();
 doc.querySelectorAll('.pixel-select').forEach(widget=>widget.remove());
 doc.querySelectorAll('dialog').forEach(d=>d.removeAttribute('open'));
 doc.querySelector('#toast').style.display='none';
 doc.body.classList.remove('learning');
 const html='<!doctype html>\n'+doc.documentElement.outerHTML;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='우리학교-NEWS.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 toast('사이트 파일을 저장했습니다. 내려받은 HTML을 더블클릭해 열어 주세요.');
}

function renderJourney(){
 const percent=Math.round(index/Math.max(1,currentSteps().length-1)*100);
 $('#journeyPercent').textContent=percent+'%';$('#journeyFill').style.width=percent+'%';
 $('.journey-track').setAttribute('aria-valuenow',String(percent));$('.journey-label').textContent=mode==='quiz'?'퀴즈 진행':'읽기 진행';
 document.querySelectorAll('nav [data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav===activeNav));
}
function jumpToBlock(id){const block=[...document.querySelectorAll('#article [data-id]')].find(b=>b.dataset.id===id);block?.scrollIntoView({behavior:'smooth',block:'center'});}
document.addEventListener('click',e=>{
 const library=e.target.closest('[data-library-id]');if(library){$('#mediaDialog').close();const id=library.dataset.libraryId;setMode('read',false);const i=currentSteps().findIndex(s=>s.id===id);if(i>=0)index=i;render(true);return;}
 const jump=e.target.closest('[data-map-step]');if(jump){index=Number(jump.dataset.mapStep);reveal=0;$('#mapDialog').close();render(true);return;}
 const nav=e.target.closest('[data-nav]');if(!nav)return;
 const target=nav.dataset.nav;activeNav=target;
 if(target==='home'){setMode('read',false);render();window.scrollTo({top:0,behavior:'smooth'});}
 if(target==='article'){setMode('read',false);render();$('#article').scrollIntoView({behavior:'smooth'});}
 if(target==='media'){$('#mediaDialogList').innerHTML=resourceList();$('#mediaDialog').showModal();}
 if(target==='map'){renderJourney();$('#mapSteps').innerHTML=currentSteps().map((step,i)=>`<button data-map-step="${i}" class="${i===index?'current':''}"><span>${String(i+1).padStart(2,'0')}</span>${esc(step.name)}${i===index?' · 현재 위치':''}</button>`).join('');$('#mapDialog').showModal();}
 if(target==='structure'||target==='concept'){setMode('read',false);index=target==='structure'?Math.min(1,currentSteps().length-1):currentSteps().length-1;reveal=0;render(true);}
});

function portableData(){
 const copy=structuredClone(data);
 const bySource=new Map(Object.entries(packagedAssets).map(([key,value])=>[value,key]));
 for(const block of copy.blocks)if(bySource.has(block.src))block.src=bySource.get(block.src);
 return copy;
}

// Styled, keyboard-operable menus keep their native selects as the data source.
function enhanceSelects(scope){
 for(const select of scope.querySelectorAll('select')){
  if(!select.id)continue;
  const previous=document.getElementById(select.id+'-widget');previous?.remove();
  select.classList.add('native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const widget=document.createElement('div');widget.className='pixel-select';widget.id=select.id+'-widget';
  const option=select.selectedOptions[0];
  widget.innerHTML=`<button type="button" class="select-trigger" id="${select.id}-trigger" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-controls="${select.id}-choices" aria-label="${esc(select.getAttribute('aria-label')||select.labels?.[0]?.textContent||'선택')}"><span class="select-emblem">${icon(select.id==='stepSelect'?'map':select.id==='addType'?'picture':'flag')}</span><span class="select-value">${esc(option?.textContent)}</span><span class="select-chevron" aria-hidden="true">⌄</span></button><div class="select-menu" id="${select.id}-choices" role="listbox" aria-label="선택 항목" hidden>${[...select.options].map((o,i)=>`<button type="button" role="option" data-select-option="${i}" aria-selected="${o.selected}" ${o.disabled?'disabled':''}><span class="option-check">${o.selected?'✓':''}</span><span>${esc(o.textContent)}</span></button>`).join('')}</div>`;
  select.after(widget);
 }
}
function closeSelectMenus(except){for(const menu of document.querySelectorAll('.select-menu'))if(menu!==except){menu.hidden=true;menu.previousElementSibling.setAttribute('aria-expanded','false');}}
document.addEventListener('click',e=>{
 const trigger=e.target.closest('.select-trigger');
 if(trigger){const menu=trigger.nextElementSibling;const open=menu.hidden;closeSelectMenus(menu);menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('[aria-selected="true"]')?.focus();return;}
 const option=e.target.closest('[data-select-option]');
 if(option){const widget=option.closest('.pixel-select');const id=widget.id.slice(0,-7);const select=document.getElementById(id);select.selectedIndex=Number(option.dataset.selectOption);closeSelectMenus();select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById(id+'-trigger')?.focus();return;}
 if(!e.target.closest('.pixel-select'))closeSelectMenus();
 const phase=e.target.closest('[data-reveal-stage]');if(phase){reveal=Number(phase.dataset.revealStage);render();}
});
document.addEventListener('change',e=>{if(e.target.tagName==='SELECT')enhanceSelects(document);});
document.addEventListener('keydown',e=>{
 const widget=e.target.closest('.pixel-select');if(!widget)return;
 const menu=widget.querySelector('.select-menu'),trigger=widget.querySelector('.select-trigger');
 const options=[...menu.querySelectorAll('[role="option"]:not(:disabled)')];let position=options.indexOf(document.activeElement);
 if(['ArrowDown','ArrowUp','Home','End','Escape'].includes(e.key))e.preventDefault();
 if(e.key==='Escape'){menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();return;}
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  menu.hidden=false;trigger.setAttribute('aria-expanded','true');
  position=e.key==='Home'?0:e.key==='End'?options.length-1:position<0?(e.key==='ArrowUp'?options.length-1:0):(position+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
  options[position]?.focus();
 }
});

$('#helpButton').onclick=()=>$('#helpDialog').showModal();
const onlineClassroom=['http:','https:'].includes(location.protocol)&&!['localhost','127.0.0.1','::1'].includes(location.hostname);
$('#connectionStatus').textContent=onlineClassroom?'● 온라인 교실':'● 이 기기에서 이용 중';
$('#connectionStatus').title=onlineClassroom?'이 주소를 즐겨찾기하세요. 업데이트 후 새로고침하면 최신 기능을 사용할 수 있습니다.':'오프라인 파일 또는 개발용 서버에서 이용 중입니다.';

function currentSteps(){return mode==='quiz'?buildQuizSteps(data):buildSteps(data);}
function setMode(next,scroll=true){
 if(mode==='read')readIndex=index;else quizIndex=index;
 mode=next;index=next==='read'?readIndex:quizIndex;reveal=0;panel=true;
 render(scroll);
}
function quizState(id){
 const q=data.quizzes?.[id],block=data.blocks.find(b=>b.id===id);
 const signature=JSON.stringify([q,block?.type,block?.text,block?.caption,(q?.relatedIds||[]).map(related=>data.blocks.find(b=>b.id===related)?.text)]);let state=quizAnswers.get(id);
 if(!state||state.signature!==signature){state={signature,choice:null,submitted:false,correct:false};quizAnswers.set(id,state);}
 return state;
}
function renderQuizSide(){
 if(!panel){$('#sidebar').innerHTML='<button data-action="panel">퀴즈 패널 다시 보기 →</button>';return;}
 const steps=currentSteps(),step=steps[index];
 if(step.kind==='quiz-empty'){
  $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('flag')} 퀴즈 탐험</div><h3 class="lesson-title">이 기사에 퀴즈를 더해 볼까요?</h3><p>선생님 편집실에서 기사 요소별로 문제·보기·정답·해설을 등록해 주세요. 완성된 퀴즈만 기사에 배치된 순서대로 표시됩니다.</p><button class="primary" data-quiz-action="edit">퀴즈 만들러 가기</button><button data-quiz-action="reading">기사 읽기로 돌아가기</button></section>`;return;
 }
 if(step.kind==='quiz-summary'){
  const questions=steps.filter(s=>s.kind==='quiz'),states=questions.map(s=>quizState(s.id));
  const correct=states.filter(s=>s.submitted&&s.correct).length,review=states.filter(s=>s.submitted&&!s.correct).length,unanswered=states.filter(s=>!s.submitted).length;
  $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('check')} 탐험 마무리</div><h3 class="lesson-title">배운 내용을 돌아봐요</h3><div class="quiz-totals"><span>이해했어요 <b>${correct}</b></span><span>다시 살펴봐요 <b>${review}</b></span><span>아직 안 풀었어요 <b>${unanswered}</b></span></div><div class="quiz-review-list">${questions.map((s,i)=>{const state=quizState(s.id);return `<button data-quiz-jump="${i}"><span>${i+1}. ${esc(labels[data.blocks.find(b=>b.id===s.id).type])}</span><small>${!state.submitted?'아직 안 풀었어요':state.correct?'✓ 이해했어요':'↻ 다시 살펴봐요'}</small></button>`;}).join('')}</div><p class="muted">문제를 누르면 해당 기사 부분과 퀴즈로 돌아갑니다. 점수 대신 이해한 내용과 다시 살펴볼 내용을 확인해요.</p><button class="primary" data-action="restart">처음부터 다시 풀기</button><button data-quiz-action="reading">기사 읽기로 돌아가기</button></section>`;return;
 }
 const q=data.quizzes[step.id],state=quizState(step.id),number=steps.filter(s=>s.kind==='quiz').findIndex(s=>s.id===step.id)+1,total=steps.filter(s=>s.kind==='quiz').length;
 $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('flag')} 퀴즈 탐험 · ${number} / ${total}<button data-action="panel" aria-label="퀴즈 패널 숨기기">−</button></div><h3 class="lesson-title">${esc(labels[data.blocks.find(b=>b.id===step.id).type])} 살펴보기</h3><fieldset class="quiz-options"><legend>${esc(q.question)}</legend>${q.options.map((option,i)=>`<label class="quiz-choice ${state.choice===i?'chosen':''} ${state.submitted&&i===q.answer?'answer':''} ${state.submitted&&state.choice===i&&!state.correct?'incorrect':''}"><input type="radio" name="quiz-choice" value="${i}" data-quiz-choice="${i}" ${state.choice===i?'checked':''} ${state.submitted?'disabled':''}><span class="quiz-option-number">${i+1}</span><span>${esc(option)}</span></label>`).join('')}</fieldset>${state.submitted?`<div class="quiz-feedback ${state.correct?'correct':'review'}" role="status"><h4>${state.correct?'✓ 잘 찾았어요!':'한 번 더 살펴볼까요?'}</h4><p class="quiz-answer-line">정답은 ${q.answer+1}번 · ${esc(q.options[q.answer])}</p><p>${esc(q.explanation||'기사의 강조된 부분을 다시 확인해 보세요.')}</p></div>`:'<p class="quiz-instruction">기사에서 근거를 찾고, 알맞은 보기를 골라 주세요.</p>'}<div class="panel-buttons">${state.submitted?'<button class="primary" data-action="next">다음 문제 →</button><button data-quiz-action="retry">이 문제 다시 풀기</button>':`<button class="primary" data-quiz-action="check" ${state.choice===null?'disabled':''}>정답 확인</button>`}<button data-quiz-action="article">기사에서 근거 찾아보기 ↗</button></div><div class="side-note">기사 읽기에서는 설명을, 탐험하기에서는 퀴즈를 확인해요. 모드를 바꿔도 현재 문제의 선택은 유지됩니다.</div></section>`;
}
function resourceList(){return `<div class="media-library">${data.blocks.filter(b=>mediaTypes.includes(b.type)).map((b,i)=>`<button class="library-item" data-library-id="${esc(b.id)}"><span class="library-thumb">${b.type==='video'?icon('video'):b.src?`<img src="${safeUrl(b.src)}" alt="">`:icon('picture')}</span><span class="library-text"><b>${i+1}. ${labels[b.type]}</b><small>${esc(b.caption)}</small><em>기사에서 보기 ↗</em></span></button>`).join('')||'<p class="muted">등록된 자료가 없습니다.</p>'}</div>`;}
function ensureQuiz(id){return data.quizzes[id]??={enabled:true,question:'',options:['','','',''],answer:0,explanation:'',relatedIds:[]};}
function quizEditorField(id,key,label,value){return `<div class="editor-field"><label for="${esc(id+'-quiz-'+key)}">${label}</label><textarea id="${esc(id+'-quiz-'+key)}" data-quiz-field="${key}" data-owner="${esc(id)}">${esc(value)}</textarea></div>`;}
function renderQuizEditor(block,paragraphs){
 const q=data.quizzes[block.id],options=q?.options||['','','',''];
 return `<details class="lesson-settings quiz-settings"><summary>${icon('flag')} 탐험 퀴즈 편집 <span>${quizReady(q)?'등록됨':'선택 사항'} ＋</span></summary><label class="check quiz-enable"><input type="checkbox" data-quiz-enabled="${esc(block.id)}" ${q&&q.enabled!==false?'checked':''}>이 요소를 퀴즈로 사용</label>${quizEditorField(block.id,'question','퀴즈 질문',q?.question)}<div class="quiz-editor-options">${options.map((option,i)=>`<div class="editor-field"><label for="${esc(block.id+'-option-'+i)}">보기 ${i+1}</label><textarea id="${esc(block.id+'-option-'+i)}" data-quiz-option="${i}" data-owner="${esc(block.id)}">${esc(option)}</textarea></div>`).join('')}</div><div class="editor-field"><label for="quiz-answer-${esc(block.id)}">정답 선택</label><select id="quiz-answer-${esc(block.id)}" data-quiz-answer="${esc(block.id)}">${options.map((_,i)=>`<option value="${i}" ${(q?.answer??0)===i?'selected':''}>${i+1}번 보기</option>`).join('')}</select></div>${quizEditorField(block.id,'explanation','정답 해설',q?.explanation)}<label>정답 확인 후 함께 강조할 문단</label>${paragraphs.filter(p=>p.id!==block.id).map(p=>`<label class="check"><input type="checkbox" data-quiz-related="${esc(block.id)}" value="${esc(p.id)}" ${(q?.relatedIds||[]).includes(p.id)?'checked':''}>${esc(p.text?.slice(0,28))}…</label>`).join('')}<p class="quiz-editor-status" data-quiz-status="${esc(block.id)}">${quizReady(q)?'✓ 탐험하기에 표시됩니다.':'사용을 켜고 질문과 모든 보기를 입력하면 탐험하기에 표시됩니다.'}</p></details>`;
}
function quizEditorChanged(id){
 save();render();
 const details=[...$('#editorBlocks').querySelectorAll('.quiz-settings')].find(d=>d.querySelector('[data-quiz-enabled]')?.dataset.quizEnabled===id);
 if(details){details.querySelector('[data-quiz-enabled]').checked=data.quizzes[id].enabled!==false;details.querySelector('[data-quiz-status]').textContent=quizReady(data.quizzes[id])?'✓ 탐험하기에 표시됩니다.':'사용을 켜고 질문과 모든 보기를 입력하면 탐험하기에 표시됩니다.';}
}
$('#editorBlocks').addEventListener('input',e=>{
 const t=e.target;if(t.dataset.quizField){ensureQuiz(t.dataset.owner)[t.dataset.quizField]=t.value;quizEditorChanged(t.dataset.owner);}
 if(t.dataset.quizOption!==undefined){ensureQuiz(t.dataset.owner).options[Number(t.dataset.quizOption)]=t.value;quizEditorChanged(t.dataset.owner);}
});
$('#editorBlocks').addEventListener('change',e=>{
 const t=e.target;let id;
 if(t.dataset.quizEnabled){id=t.dataset.quizEnabled;ensureQuiz(id).enabled=t.checked;}
 if(t.dataset.quizAnswer){id=t.dataset.quizAnswer;ensureQuiz(id).answer=Number(t.value);}
 if(t.dataset.quizRelated){id=t.dataset.quizRelated;ensureQuiz(id).relatedIds=[...$('#editorBlocks').querySelectorAll('[data-quiz-related]')].filter(x=>x.dataset.quizRelated===id&&x.checked).map(x=>x.value);}
 if(id)quizEditorChanged(id);
});
document.addEventListener('change',e=>{
 if(e.target.dataset.quizChoice===undefined)return;
 const step=currentSteps()[index];if(mode!=='quiz'||step.kind!=='quiz')return;
 const state=quizState(step.id);if(state.submitted)return;state.choice=Number(e.target.value);render();
 $('#sidebar .quiz-choice.chosen input')?.focus();
});
document.addEventListener('click',e=>{
 const jump=e.target.closest('[data-quiz-jump]');if(jump){index=Number(jump.dataset.quizJump);render(true);return;}
 const button=e.target.closest('[data-quiz-action]');if(!button)return;
 const action=button.dataset.quizAction,step=currentSteps()[index];
 if(action==='reading'){setMode('read');return;}
 if(action==='edit'){renderEditor();$('#editor').showModal();return;}
 if(action==='question'){$('#sidebar').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(mode!=='quiz'||step.kind!=='quiz')return;
 const state=quizState(step.id);
 if(action==='check'&&state.choice!==null&&!state.submitted){state.correct=gradeQuiz(data.quizzes[step.id],state.choice);state.submitted=true;render();}
 if(action==='retry'){quizAnswers.delete(step.id);render();}
 if(action==='article')jumpToBlock(step.id);
});
