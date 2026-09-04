let P=null,S=[],cur=null,favs=JSON.parse(localStorage.getItem('favs')||'[]'),fs=+(localStorage.getItem('fs')||19);const $=x=>document.getElementById(x);fetch('data/sermons.json?v=20260904-archive1', {cache:'no-store'}).then(r=>r.json()).then(x=>{P=x;S=x.sermons;bind();render(S);font();archiveBindStatic();archiveQuote();archiveRecentRender();archiveOpenFromUrl()});function bind(){$('q').oninput=e=>{let q=e.target.value.toLowerCase();$('listTitle').textContent=q?'검색 결과':'설교 목록';render(S.filter(s=>(s.title+s.scripture+s.content.join(' ')).toLowerCase().includes(q)))};$('today').onclick=()=>open(S[Math.floor(Math.random()*S.length)].number);$('fav').onclick=()=>{$('listTitle').textContent='즐겨찾기';render(S.filter(s=>favs.includes(s.number)))};$('all').onclick=()=>{$('q').value='';$('listTitle').textContent='설교 목록';render(S)};$('auditBtn').onclick=showAudit;$('auditBack').onclick=showHome;$('back').onclick=showHome;$('star').onclick=()=>{favs=favs.includes(cur)?favs.filter(x=>x!==cur):[...favs,cur];localStorage.setItem('favs',JSON.stringify(favs));star()};$('minus').onclick=()=>setfs(fs-1);$('plus').onclick=()=>setfs(fs+1);$('reset').onclick=()=>setfs(19);$('prev').onclick=()=>nav(-1);$('next').onclick=()=>nav(1);$('dark').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light')};if(localStorage.getItem('theme')==='dark')document.body.classList.add('dark');if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js')}function render(a){$('count').textContent=a.length+'편';$('list').innerHTML='';a.forEach(s=>{let b=document.createElement('button');b.className='item'+(archiveRead.includes(s.number)?' read-item':'');let im=s.image?`<img src="${s.image}" alt="">`:`<span class="ph">말씀</span>`;b.innerHTML=`<span class=n>${String(s.number).padStart(3,'0')}</span>${im}<span><h3>${s.title}</h3><p>${s.scripture||''}</p>${archiveRead.includes(s.number)?'<span class="read-mark">✓ 읽음</span>':''}</span><b>${favs.includes(s.number)?'★':''}</b>`;b.onclick=()=>open(s.number);$('list').appendChild(b)})}function open(n){cur=n;let s=S.find(x=>x.number===n);$('num').textContent='설교 '+String(s.number).padStart(3,'0');$('title').textContent=s.title;$('verse').textContent=s.scripture||'';$('body').innerHTML=s.content.map(p=>{
    const t=(p||'').trim();
    const isCircle=/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(t);
    const isHeading=/^(첫째|둘째|셋째|넷째|다섯째|여섯째|일곱째|여덟째|아홉째|열째)[,.]?\s/.test(t)
      || /^\d+\.\s+[^\d]/.test(t);
    const cls=isCircle?'circlep':(isHeading?'headingp':'');
    return `<p class="${cls}">${esc(p)}</p>`;
  }).join('');if(s.image){$('hero').src=s.image;$('hero').hidden=false}else $('hero').hidden=true;if(s.url){$('sourceLink').href=s.url;$('sourceLink').parentElement.hidden=false}else $('sourceLink').parentElement.hidden=true;star();$('home').hidden=true;$('audit').hidden=true;$('detail').hidden=false;scrollTo(0,0)}function esc(x){return x.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}function star(){$('star').textContent=favs.includes(cur)?'★':'☆'}function showHome(){$('detail').hidden=true;$('audit').hidden=true;$('home').hidden=false;try{history.replaceState(null,'',ARCHIVE_SITE_URL)}catch(e){};render(S);archiveRecentRender()}function showAudit(){

  $('home').hidden=true;

  $('detail').hidden=true;

  $('audit').hidden=false;

  $('auditContent').innerHTML=`

    <section class="intro-block">

      <h3>저자 · 손상기 목사</h3>

      <img class="author-photo"

           src="images/author-son-sang-ki.jpeg"

           alt="손상기 목사">

      <p>

        『시냇가에 심은 나무』는 故 손상기 목사의 원로목사 추대기념 설교집입니다.

        43년의 목회 여정 가운데 전해진 말씀을 모아 1997년 10월 발간되었습니다.

      </p>

    </section>

    <section class="intro-block">

      <h3>약력</h3>

      <div class="intro-text">

        <p>※ 이곳에 설교집에 수록된 손상기 목사 약력을 넣습니다.</p>

      </div>

    </section>

    <section class="intro-block">

      <h3>감사의 글</h3>

      <p class="intro-kicker">For the Lord – 하나님께 드리는 감사</p>

      <blockquote>

        우리가 살아도 주를 위하여 살고 죽어도 주를 위하여 죽나니,

        그러므로 사나 죽으나 우리가 주의 것이로다.

        <br>— 로마서 14:8

      </blockquote>

      <div class="intro-text">

        <p>※ 이곳에 손상기 목사의 「감사의 글」 전문을 넣습니다.</p>

      </div>

    </section>

    <section class="intro-block">

      <h3>출간 축하의 글</h3>

      <div class="congrats-card">

        <h4>내가 보는 손상기 목사</h4>

        <p class="byline">이중태 목사 · 증경총회장 · 강변교회 원로목사</p>

        <p>※ 이곳에 축사 전문을 넣습니다.</p>

      </div>

      <div class="congrats-card">

        <h4>내가 좋아하는 손상기 목사님을 말한다</h4>

        <p class="byline">이만신 목사 · 증경총회장 · 중앙성결교회 담임목사</p>

        <p>※ 이곳에 축사 전문을 넣습니다.</p>

      </div>

    </section>

    <section class="intro-block publication">

      <h3>설교집 발행 정보</h3>

      <p><strong>제목</strong> 『시냇가에 심은 나무』</p>

      <p><strong>발행일</strong> 1997년 10월</p>

      <p><strong>발행인</strong> 손상기 목사 원로목사 추대기념 설교집 출판위원회</p>

      <p><strong>발행처</strong> 기독교대한성결교회 대광교회</p>

    </section>

  `;

  $('home').hidden=true;

  scrollTo(0,0);

}function setfs(n){fs=Math.max(15,Math.min(29,n));localStorage.setItem('fs',fs);font()}function font(){document.documentElement.style.setProperty('--fs',fs+'px')}function nav(d){let i=S.findIndex(s=>s.number===cur);if(S[i+d])open(S[i+d].number)}
/* ===== TTS ===== */
let ttsRate=+(localStorage.getItem('ttsRate')||1.0);
let ttsQueue=[];
let ttsIndex=0;
let ttsActive=false;
let ttsPaused=false;
let ttsCurrentUtterance=null;

function ttsSupported(){
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function ttsStop(){
  if(ttsSupported()) speechSynthesis.cancel();
  ttsActive=false;
  ttsPaused=false;
  ttsQueue=[];
  ttsIndex=0;
  ttsCurrentUtterance=null;
  document.querySelectorAll('#body p.tts-reading').forEach(p=>p.classList.remove('tts-reading'));
  ttsUpdateUI();
}

function ttsPauseResume(){
  if(!ttsSupported() || !ttsActive) return;
  if(speechSynthesis.paused){
    speechSynthesis.resume();
    ttsPaused=false;
  }else{
    speechSynthesis.pause();
    ttsPaused=true;
  }
  ttsUpdateUI();
}

function ttsPickVoice(){
  const voices=speechSynthesis.getVoices();
  return voices.find(v=>/^ko(-|_)/i.test(v.lang))
      || voices.find(v=>/Korean|한국/i.test(v.name))
      || voices[0]
      || null;
}

function ttsTextForParagraph(p){
  const text=p.textContent.trim();
  if(!text) return '';
  if(text.startsWith('※ 편집자 주:')) return '';
  if(text.startsWith('※ 편집자 후기:')) return '';
  if(p.closest('.editor-note')) return '';
  return text;
}

function ttsBuildQueue(){
  const area=document.getElementById('body');
  if(!area) return [];
  return [...area.querySelectorAll(':scope > p')]
    .map(p=>({p,text:ttsTextForParagraph(p)}))
    .filter(x=>x.text);
}

function ttsSpeakNext(){
  if(!ttsSupported()) return;
  if(!ttsActive) return;
  if(ttsIndex>=ttsQueue.length){
    ttsStop();
    return;
  }

  const item=ttsQueue[ttsIndex];
  document.querySelectorAll('#body p.tts-reading').forEach(p=>p.classList.remove('tts-reading'));
  item.p.classList.add('tts-reading');

  const u=new SpeechSynthesisUtterance(item.text);
  u.lang='ko-KR';
  u.rate=ttsRate;
  u.pitch=1;
  const voice=ttsPickVoice();
  if(voice) u.voice=voice;

  u.onend=()=>{
    if(!ttsActive) return;
    ttsIndex++;
    ttsSpeakNext();
  };
  u.onerror=()=>{
    if(!ttsActive) return;
    ttsIndex++;
    ttsSpeakNext();
  };

  ttsCurrentUtterance=u;
  speechSynthesis.speak(u);
  ttsUpdateUI();
}

function ttsStart(){
  if(!ttsSupported()){
    alert('이 기기 또는 브라우저에서는 음성 읽기를 지원하지 않습니다.');
    return;
  }
  ttsStop();
  ttsQueue=ttsBuildQueue();
  if(!ttsQueue.length) return;
  ttsIndex=0;
  ttsActive=true;
  ttsPaused=false;
  ttsSpeakNext();
}

function ttsSetRate(rate){
  ttsRate=rate;
  localStorage.setItem('ttsRate',String(rate));
  document.querySelectorAll('[data-tts-rate]').forEach(b=>{
    b.classList.toggle('active', +b.dataset.ttsRate===ttsRate);
  });
  // 재생 중 속도 변경 시 현재 문단부터 다시 시작
  if(ttsActive){
    const currentIndex=ttsIndex;
    speechSynthesis.cancel();
    ttsIndex=currentIndex;
    ttsPaused=false;
    setTimeout(()=>ttsSpeakNext(),80);
  }
  ttsUpdateUI();
}

function ttsUpdateUI(){
  const play=document.getElementById('ttsPlay');
  const pause=document.getElementById('ttsPause');
  const stop=document.getElementById('ttsStop');
  const status=document.getElementById('ttsStatus');

  if(play) play.textContent=ttsActive?'▶ 처음부터':'▶ 처음부터 듣기';
  if(pause){
    pause.disabled=!ttsActive;
    pause.textContent=(ttsActive && ttsPaused)?'▶ 계속':'⏸ 일시정지';
  }
  if(stop) stop.disabled=!ttsActive;
  if(status){
    if(!ttsSupported()) status.textContent='이 브라우저는 TTS를 지원하지 않습니다.';
    else if(ttsActive){
      status.textContent=`읽는 중 · ${ttsIndex+1}/${ttsQueue.length} 문단 · ${ttsRate.toFixed(1)}x`;
    }else{
      status.textContent=`기기 내장 한국어 음성 · ${ttsRate.toFixed(1)}x`;
    }
  }
  document.querySelectorAll('[data-tts-rate]').forEach(b=>{
    b.classList.toggle('active', +b.dataset.ttsRate===ttsRate);
  });
}

function ttsMount(){
  const article=document.querySelector('#detail article');
  const body=document.getElementById('body');
  if(!article || !body) return;

  let box=document.getElementById('ttsBox');
  if(!box){
    box=document.createElement('section');
    box.id='ttsBox';
    box.className='tts-box';
    box.innerHTML=`
      <div class="tts-title">🔊 설교 듣기</div>
      <div class="tts-controls">
        <button id="ttsPlay" type="button">▶ 처음부터 듣기</button>
        <button id="ttsPause" type="button" disabled>⏸ 일시정지</button>
        <button id="ttsStop" type="button" disabled>■ 정지</button>
      </div>
      <div class="tts-speed">
        <span class="tts-speed-label">읽기 속도</span>
        <button type="button" data-tts-rate="0.8">0.8x</button>
        <button type="button" data-tts-rate="1">1.0x</button>
        <button type="button" data-tts-rate="1.2">1.2x</button>
        <button type="button" data-tts-rate="1.4">1.4x</button>
      </div>
      <div id="ttsStatus" class="tts-status"></div>
    `;
    body.insertAdjacentElement('beforebegin',box);

    box.querySelector('#ttsPlay').onclick=ttsStart;
    box.querySelector('#ttsPause').onclick=ttsPauseResume;
    box.querySelector('#ttsStop').onclick=ttsStop;
    box.querySelectorAll('[data-tts-rate]').forEach(b=>{
      b.onclick=()=>ttsSetRate(+b.dataset.ttsRate);
    });
  }
  ttsUpdateUI();
}

if(ttsSupported()){
  speechSynthesis.onvoiceschanged=()=>ttsUpdateUI();
}
window.addEventListener('pagehide',ttsStop);

;(()=>{
  const previousOpen=open;
  open=function(n){
    ttsStop();
    previousOpen(n);
    archiveRemember(Number(n));
    try{history.replaceState(null,'',ARCHIVE_SITE_URL+'?sermon='+encodeURIComponent(n));}catch(e){}
    ttsMount();

    const area=document.getElementById('body');
    if(!area) return;

    [...area.querySelectorAll('p')].forEach(p=>{
      const t=p.textContent.trim();
      if(/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(t)){
        p.classList.remove('headingp');
        p.classList.add('circlep');
      }
    });

    if(Number(n)!==102) return;
    if(area.querySelector('.editor-note')) return;

    const paragraphs=[...area.querySelectorAll('p')];
    const first=paragraphs.find(p=>
      p.textContent.includes('※ 편집자 후기:') ||
      p.textContent.includes('설교집 편집 및 블로깅을 마치며')
    );
    if(!first) return;

    const marker='설교집 편집 및 블로깅을 마치며';
    const full=first.textContent.trim();

    const note=document.createElement('section');
    note.className='editor-note';

    const heading=document.createElement('h3');
    heading.className='editor-note-title';
    heading.textContent=marker;
    note.appendChild(heading);

    let sermonEnd='';
    let noteStart='';

    if(full.includes(marker)){
      const pos=full.indexOf(marker);
      sermonEnd=full.slice(0,pos)
        .replace(/^※\s*편집자\s*후기:\s*/,'')
        .trim();
      noteStart=full.slice(pos+marker.length)
        .replace(/^[.…·\s\-:]+/,'')
        .trim();
    }else{
      noteStart=full.replace(/^※\s*편집자\s*후기:\s*/,'').trim();
    }

    if(noteStart){
      const p=document.createElement('p');
      p.textContent=noteStart;
      note.appendChild(p);
    }

    let move=false;
    paragraphs.forEach(p=>{
      if(p===first){
        move=true;
        return;
      }
      if(move){
        if(p.textContent.includes('아들, 블로그 편집자')){
          p.classList.add('editor-signature');
        }
        note.appendChild(p);
      }
    });

    if(sermonEnd){
      first.textContent=sermonEnd;
      first.insertAdjacentElement('afterend',note);
    }else{
      first.replaceWith(note);
    }
  };
})();
/* ===== 디지털 아카이브 기능 ===== */
const ARCHIVE_SITE_URL='https://harrysohny.github.io/sermon-book/';
let archiveRead=JSON.parse(localStorage.getItem('sermonRead')||'[]');
let archiveRecent=JSON.parse(localStorage.getItem('sermonRecent')||'[]');
function archiveTodayIndex(max){const d=new Date();const key=+(String(d.getFullYear())+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'));return max?key%max:0}
function archiveQuote(){const box=$('dailyQuote');if(!box||!S.length)return;const sermon=S[archiveTodayIndex(S.length)];const candidates=(sermon.content||[]).filter(p=>{const t=(p||'').trim();return t.length>=28&&t.length<=125&&!t.startsWith('※')&&!/^(첫째|둘째|셋째|넷째|다섯째|[①②③④⑤⑥⑦⑧⑨⑩])/.test(t)});const text=candidates.length?candidates[archiveTodayIndex(candidates.length)]:((sermon.content||[]).find(x=>(x||'').trim().length>20)||sermon.title);$('dailyQuoteText').textContent='“'+text.trim()+'”';$('dailyQuoteOpen').textContent='설교 '+String(sermon.number).padStart(3,'0')+' · '+sermon.title;$('dailyQuoteOpen').onclick=()=>open(sermon.number);box.hidden=false}
function archiveRemember(n){if(!archiveRead.includes(n))archiveRead=[...archiveRead,n];archiveRecent=[n,...archiveRecent.filter(x=>x!==n)].slice(0,3);localStorage.setItem('sermonRead',JSON.stringify(archiveRead));localStorage.setItem('sermonRecent',JSON.stringify(archiveRecent));archiveRecentRender()}
function archiveRecentRender(){const section=$('recentSection'),list=$('recentList');if(!section||!list||!S.length)return;const rows=archiveRecent.map(n=>S.find(s=>s.number===n)).filter(Boolean);section.hidden=!rows.length;list.innerHTML='';rows.forEach(s=>{const b=document.createElement('button');b.className='recent-item';b.innerHTML='<span class="recent-num">'+String(s.number).padStart(3,'0')+'</span><span class="recent-title">'+esc(s.title)+'</span><span class="read-badge">✓ 읽음</span>';b.onclick=()=>open(s.number);list.appendChild(b)})}
async function archiveShare(title,url){const shareData={title:title||document.title,text:title||document.title,url:url||ARCHIVE_SITE_URL};if(navigator.share){try{await navigator.share(shareData);return}catch(e){if(e&&e.name==='AbortError')return}}archiveCopy(shareData.url)}
function archiveCurrentUrl(){return cur?ARCHIVE_SITE_URL+'?sermon='+encodeURIComponent(cur):ARCHIVE_SITE_URL}
async function archiveCopy(url){const u=url||archiveCurrentUrl();try{await navigator.clipboard.writeText(u);alert('주소를 복사했습니다.')}catch(e){prompt('아래 주소를 복사해 주세요.',u)}}
function archiveContact(openIt){const modal=$('contactModal');if(modal)modal.hidden=!openIt}
function archiveBindStatic(){if($('shareSermon'))$('shareSermon').onclick=()=>{const s=S.find(x=>x.number===cur);archiveShare(s?(s.title+' · 시냇가에 심은 나무'):'시냇가에 심은 나무',archiveCurrentUrl())};if($('copySermonLink'))$('copySermonLink').onclick=()=>archiveCopy();if($('footerShare'))$('footerShare').onclick=()=>archiveShare('시냇가에 심은 나무',ARCHIVE_SITE_URL);if($('contactBtn'))$('contactBtn').onclick=()=>archiveContact(true);if($('contactClose'))$('contactClose').onclick=()=>archiveContact(false);if($('contactCopy'))$('contactCopy').onclick=()=>archiveCopy();const modal=$('contactModal');if(modal)modal.addEventListener('click',e=>{if(e.target===modal)archiveContact(false)})}
function archiveOpenFromUrl(){try{const n=+(new URL(location.href).searchParams.get('sermon')||0);if(n&&S.some(s=>s.number===n))setTimeout(()=>open(n),80)}catch(e){}}

document.addEventListener('click',e=>{
  const id=e.target && e.target.id;
  if(id==='back' || id==='auditBack' || id==='auditBtn'){
    ttsStop();
  }
});
