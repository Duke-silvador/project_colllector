(() => {
  'use strict';
  if (window.__zombcashAssistantLoaded) return;
  window.__zombcashAssistantLoaded = true;

  const API = 'https://zombcash-bot.fadehost.app/api/assistant/chat';
  const POSITION_API = 'https://zombcash-bot.fadehost.app/api/profile/assistant-position';
  const SESSION_KEY = 'zombcash-survivor-token';
  const copy = {
    en:{button:'ASK AI',title:'ZOMBIECASH AI',sub:'The same community brain',welcome:'Hey survivor! Ask me about ZombieCash, the tools, Zombie Lab, Meme Radar, or anything else.',placeholder:'Ask the ZombieCash AI…',send:'SEND',close:'Close assistant',thinking:'Thinking…',error:'The assistant is temporarily unavailable. Please try again or join us on Telegram.',hint:'AI can make mistakes. Never treat token commentary as financial advice.'},
    ru:{button:'СПРОСИТЬ ИИ',title:'ИИ ZOMBIECASH',sub:'Тот же помощник сообщества',welcome:'Привет, выживший! Спрашивай о ZombieCash, наших инструментах, Zombie Lab, Meme Radar или о чём угодно.',placeholder:'Задай вопрос ИИ ZombieCash…',send:'ОТПРАВИТЬ',close:'Закрыть помощника',thinking:'Думаю…',error:'ИИ временно недоступен. Попробуй позже или напиши нам в Telegram.',hint:'ИИ может ошибаться. Комментарии о токенах — не финансовый совет.'},
    uk:{button:'ЗАПИТАТИ ШІ',title:'ШІ ZOMBIECASH',sub:'Той самий помічник спільноти',welcome:'Привіт, виживший! Запитуй про ZombieCash, наші інструменти, Zombie Lab, Meme Radar або будь-що інше.',placeholder:'Запитай ШІ ZombieCash…',send:'НАДІСЛАТИ',close:'Закрити помічника',thinking:'Думаю…',error:'ШІ тимчасово недоступний. Спробуй пізніше або напиши нам у Telegram.',hint:'ШІ може помилятися. Коментарі про токени — не фінансова порада.'},
    de:{button:'KI FRAGEN',title:'ZOMBIECASH KI',sub:'Der Community-Assistent',welcome:'Hallo Survivor! Frag mich über ZombieCash, unsere Tools, Zombie Lab, Meme Radar oder andere Themen.',placeholder:'ZombieCash KI fragen…',send:'SENDEN',close:'Assistent schließen',thinking:'Denke nach…',error:'Der Assistent ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.',hint:'KI kann Fehler machen. Token-Kommentare sind keine Finanzberatung.'},
    fr:{button:'DEMANDER À L’IA',title:'IA ZOMBIECASH',sub:'Le même assistant communautaire',welcome:'Salut survivant ! Pose tes questions sur ZombieCash, nos outils, Zombie Lab, Meme Radar ou autre chose.',placeholder:'Demander à l’IA ZombieCash…',send:'ENVOYER',close:'Fermer l’assistant',thinking:'Réflexion…',error:'L’assistant est temporairement indisponible. Réessaie plus tard.',hint:'L’IA peut se tromper. Les commentaires sur les tokens ne sont pas des conseils financiers.'},
    it:{button:'CHIEDI ALL’IA',title:'IA ZOMBIECASH',sub:'Lo stesso assistente della community',welcome:'Ciao survivor! Chiedimi di ZombieCash, dei nostri strumenti, Zombie Lab, Meme Radar o di altro.',placeholder:'Chiedi all’IA ZombieCash…',send:'INVIA',close:'Chiudi assistente',thinking:'Sto pensando…',error:'Assistente temporaneamente non disponibile. Riprova più tardi.',hint:'L’IA può sbagliare. I commenti sui token non sono consigli finanziari.'},
    ja:{button:'AIに質問',title:'ZOMBIECASH AI',sub:'コミュニティと同じAIアシスタント',welcome:'サバイバー、こんにちは！ZombieCash、各種ツール、Zombie Lab、Meme Radarなどについて質問してね。',placeholder:'ZombieCash AIに質問…',send:'送信',close:'アシスタントを閉じる',thinking:'考え中…',error:'AIは一時的に利用できません。後でもう一度お試しください。',hint:'AIの回答は誤る場合があります。トークンの解説は金融助言ではありません。'},
    'zh-CN':{button:'询问 AI',title:'ZOMBIECASH AI',sub:'与社区相同的 AI 助手',welcome:'幸存者你好！可以问我关于 ZombieCash、工具、Zombie Lab、Meme Radar 或其他问题。',placeholder:'向 ZombieCash AI 提问…',send:'发送',close:'关闭助手',thinking:'思考中…',error:'助手暂时不可用，请稍后再试。',hint:'AI 可能出错。代币评论不构成财务建议。'},
    tr:{button:'YAPAY ZEKÂYA SOR',title:'ZOMBIECASH AI',sub:'Toplulukla aynı yardımcı',welcome:'Selam survivor! ZombieCash, araçlarımız, Zombie Lab, Meme Radar veya başka konular hakkında sor.',placeholder:'ZombieCash AI’ya sor…',send:'GÖNDER',close:'Asistanı kapat',thinking:'Düşünüyor…',error:'Asistan geçici olarak kullanılamıyor. Lütfen sonra tekrar dene.',hint:'AI hata yapabilir. Token yorumları finansal tavsiye değildir.'},
    hi:{button:'AI से पूछें',title:'ZOMBIECASH AI',sub:'कम्युनिटी वाला ही सहायक',welcome:'नमस्ते सर्वाइवर! ZombieCash, टूल्स, Zombie Lab, Meme Radar या किसी भी विषय के बारे में पूछें।',placeholder:'ZombieCash AI से पूछें…',send:'भेजें',close:'सहायक बंद करें',thinking:'सोच रहा है…',error:'सहायक अभी उपलब्ध नहीं है। कृपया बाद में फिर प्रयास करें।',hint:'AI गलत हो सकता है। टोकन पर टिप्पणी वित्तीय सलाह नहीं है।'}
  };
  const getLang = () => {
    let lang = 'en';
    try { lang = localStorage.getItem('zombcash-language') || 'en'; } catch (_) {}
    return copy[lang] ? lang : (navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en');
  };
  const host = document.createElement('div');
  host.id = 'zombcash-floating-assistant';
  host.innerHTML = `
    <button class="zfa-launch" type="button" aria-expanded="false" aria-controls="zfa-panel"><span class="zfa-orb" aria-hidden="true">✳</span><span class="zfa-launch-label">ASK AI</span><span class="zfa-pulse" aria-hidden="true"></span></button>
    <section class="zfa-panel" id="zfa-panel" role="dialog" aria-label="ZombieCash AI assistant" aria-modal="false" hidden>
      <header class="zfa-head"><div class="zfa-avatar" aria-hidden="true">☣</div><div class="zfa-head-copy"><strong class="zfa-title">ZOMBIECASH AI</strong><small class="zfa-sub">The same community brain</small></div><button class="zfa-close" type="button" aria-label="Close assistant">×</button></header>
      <div class="zfa-messages" role="log" aria-live="polite"></div>
      <form class="zfa-form"><textarea rows="1" maxlength="1200" aria-label="Message" placeholder="Ask the ZombieCash AI…" required></textarea><button type="submit" aria-label="Send message">➤</button></form>
      <p class="zfa-hint"></p>
    </section>`;
  const style = document.createElement('style');
  style.textContent = `
  #zombcash-floating-assistant{--zfa-green:#a6ff54;--zfa-bg:#07100b;position:fixed;right:max(54px,calc(env(safe-area-inset-right) + 48px));bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px));z-index:2147483000;touch-action:none;font:500 14px/1.4 Rajdhani,system-ui,sans-serif;color:#eef8e9}
  #zombcash-floating-assistant *{box-sizing:border-box}
  #zombcash-floating-assistant .zfa-launch{position:relative;display:flex;align-items:center;justify-content:center;gap:0;width:46px;height:46px;min-height:46px;padding:0;border:1px solid #b2ff72;border-radius:50%;background:linear-gradient(135deg,#172b18,#07100b 72%);color:#c6ff9a;box-shadow:0 5px 18px #0008,0 0 12px #9bff4518;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;font:800 11px/1 Orbitron,system-ui,sans-serif;letter-spacing:1px;transition:transform .2s,box-shadow .2s}
  #zombcash-floating-assistant .zfa-launch:hover{transform:translateY(-2px);box-shadow:0 12px 35px #000b,0 0 30px #9bff4544}
  #zombcash-floating-assistant .zfa-orb{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#9bff4518;border:1px solid #9bff4570;font-size:18px}#zombcash-floating-assistant .zfa-launch-label{display:none!important}
  #zombcash-floating-assistant .zfa-pulse{position:absolute;top:2px;right:2px;width:6px;height:6px;border:1px solid #07100b;border-radius:50%;background:#9bff45;box-shadow:0 0 7px #9bff45}
  #zombcash-floating-assistant .zfa-panel{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(84px,calc(env(safe-area-inset-bottom) + 76px));width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 112px));min-height:min(340px,calc(100dvh - 140px));overflow:hidden;display:flex;flex-direction:column;border:1px solid #43613b;border-radius:18px;background:radial-gradient(ellipse at 100% 0,#1a3520 0,transparent 42%),#080e0a;box-shadow:0 24px 80px #000c,0 0 34px #9bff4518}
  #zombcash-floating-assistant .zfa-panel[hidden]{display:none!important}
  #zombcash-floating-assistant .zfa-head{display:flex;align-items:center;gap:11px;padding:15px;border-bottom:1px solid #9bff452b;background:#08110beF}
  #zombcash-floating-assistant .zfa-avatar{display:grid;place-items:center;flex:0 0 39px;height:39px;border:1px solid #9bff45;border-radius:12px;color:#9bff45;font-size:22px;box-shadow:inset 0 0 20px #9bff4516}
  #zombcash-floating-assistant .zfa-head-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}
  #zombcash-floating-assistant .zfa-title{font:800 11px/1.3 Orbitron,system-ui,sans-serif;letter-spacing:.5px;color:#e9f8df}
  #zombcash-floating-assistant .zfa-sub{font:600 13px/1.2 Rajdhani,system-ui,sans-serif;color:#9fb39b}
  #zombcash-floating-assistant .zfa-close{width:35px;height:35px;border:1px solid #344a30;border-radius:9px;background:#0c160d;color:#d8ebd0;font-size:24px;cursor:pointer}
  #zombcash-floating-assistant .zfa-messages{display:flex;flex:1;min-height:0;flex-direction:column;gap:12px;overflow:auto;padding:15px;scroll-behavior:smooth}
  #zombcash-floating-assistant .zfa-msg{max-width:92%;padding:10px 12px;border:1px solid #263c27;border-radius:12px 12px 12px 3px;background:#0e1910;color:#e1eddd;white-space:pre-wrap;overflow-wrap:anywhere;font:500 16px/1.45 Rajdhani,system-ui,sans-serif}
  #zombcash-floating-assistant .zfa-msg.user{align-self:flex-end;border-color:#537b37;border-radius:12px 12px 3px 12px;background:#162618;color:#d8ffc0}
  #zombcash-floating-assistant .zfa-msg.status{color:#a4c198;font-style:italic}
  #zombcash-floating-assistant .zfa-form{display:flex;align-items:flex-end;gap:8px;padding:12px;border-top:1px solid #9bff452b;background:#080e09}
  #zombcash-floating-assistant .zfa-form textarea{flex:1;min-width:0;max-height:110px;resize:vertical;padding:11px 12px;border:1px solid #354b30;border-radius:11px;background:#0b140c;color:#f1faec;font:500 16px/1.35 Rajdhani,system-ui,sans-serif;outline:none}
  #zombcash-floating-assistant .zfa-form textarea:focus{border-color:#9bff45}
  #zombcash-floating-assistant .zfa-form button{flex:0 0 43px;height:43px;border:1px solid #b4ff78;border-radius:11px;background:#a6ff54;color:#0a1407;font-size:20px;font-weight:900;cursor:pointer}
  #zombcash-floating-assistant .zfa-form button:disabled{opacity:.5;cursor:wait}
  #zombcash-floating-assistant .zfa-hint{margin:0;padding:0 14px 11px;background:#080e09;color:#72866e;font:500 11px/1.35 Rajdhani,system-ui,sans-serif}
  html:has(:fullscreen) #zombcash-floating-assistant,body.zfa-hide-assistant #zombcash-floating-assistant{display:none!important}
  @media(max-width:480px){#zombcash-floating-assistant{right:max(54px,calc(env(safe-area-inset-right) + 48px));bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px))}#zombcash-floating-assistant .zfa-launch{width:42px;height:42px;min-height:42px}#zombcash-floating-assistant .zfa-orb{width:26px;height:26px;font-size:16px}#zombcash-floating-assistant .zfa-pulse{top:1px;right:1px}#zombcash-floating-assistant .zfa-panel{right:max(10px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));width:calc(100vw - 20px);height:min(70dvh,560px);min-height:min(300px,calc(100dvh - 96px));border-radius:15px}}
  @media(prefers-reduced-motion:reduce){#zombcash-floating-assistant *{transition:none!important;scroll-behavior:auto!important}}
  `;
  document.head.append(style);
  document.body.append(host);
  const launch = host.querySelector('.zfa-launch');
  const panel = host.querySelector('.zfa-panel');
  const close = host.querySelector('.zfa-close');
  const messages = host.querySelector('.zfa-messages');
  const form = host.querySelector('.zfa-form');
  const input = form.querySelector('textarea');
  const send = form.querySelector('button');
  const addMessage = (text, kind='bot') => {
    const item = document.createElement('div');
    item.className = 'zfa-msg' + (kind === 'user' ? ' user' : kind === 'status' ? ' status' : '');
    item.textContent = text;
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  };
  let history = [];
  let busy = false;

  // Draggable on desktop and touch screens. Position persists in this browser.
  const POSITION_KEY = 'zombcash-ai-assistant-position-v1';
  let dragged = false;
  let dragStart = null;
  let suppressNextClick = false;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  function applySavedPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
      const rect = host.getBoundingClientRect();
      const x = clamp(saved.x, 8, window.innerWidth - rect.width - 8);
      const y = clamp(saved.y, 8, window.innerHeight - rect.height - 8);
      host.style.left = x + 'px';
      host.style.top = y + 'px';
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    } catch (_) {}
  }
  function currentPositionRatio() {
    const rect = host.getBoundingClientRect();
    const maxX = Math.max(1, window.innerWidth - rect.width);
    const maxY = Math.max(1, window.innerHeight - rect.height);
    return {xRatio:clamp(rect.left / maxX, 0, 1), yRatio:clamp(rect.top / maxY, 0, 1)};
  }
  function sessionToken() {
    try { return localStorage.getItem(SESSION_KEY) || ''; } catch (_) { return ''; }
  }
  async function savePosition() {
    const rect = host.getBoundingClientRect();
    const local = {x:Math.round(rect.left), y:Math.round(rect.top)};
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(local)); } catch (_) {}
    const token = sessionToken();
    if (!token) return;
    try {
      await fetch(POSITION_API, {
        method:'POST',
        headers:{'Authorization':'Bearer ' + token, 'Content-Type':'application/json'},
        body:JSON.stringify(currentPositionRatio()),
        cache:'no-store'
      });
    } catch (_) { /* local position remains available if sync is temporarily offline */ }
  }
  function applyPositionRatio(position) {
    if (!position || !Number.isFinite(position.xRatio) || !Number.isFinite(position.yRatio)) return false;
    const rect = host.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    const x = clamp(position.xRatio, 0, 1) * maxX;
    const y = clamp(position.yRatio, 0, 1) * maxY;
    host.style.left = Math.round(x) + 'px';
    host.style.top = Math.round(y) + 'px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    try { localStorage.setItem(POSITION_KEY, JSON.stringify({x:Math.round(x), y:Math.round(y)})); } catch (_) {}
    return true;
  }
  async function syncPositionFromAccount() {
    const token = sessionToken();
    if (!token) return;
    try {
      const response = await fetch(POSITION_API, {headers:{'Authorization':'Bearer ' + token}, cache:'no-store'});
      if (response.status === 401) return;
      if (!response.ok) return;
      const data = await response.json();
      if (data.position && applyPositionRatio(data.position)) return;
      // First signed-in visit: migrate the current browser's chosen location to the account.
      const local = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
      if (local && Number.isFinite(local.x) && Number.isFinite(local.y)) {
        const rect = host.getBoundingClientRect();
        const maxX = Math.max(1, window.innerWidth - rect.width);
        const maxY = Math.max(1, window.innerHeight - rect.height);
        await fetch(POSITION_API, {
          method:'POST',
          headers:{'Authorization':'Bearer ' + token, 'Content-Type':'application/json'},
          body:JSON.stringify({xRatio:clamp(local.x / maxX, 0, 1), yRatio:clamp(local.y / maxY, 0, 1)}),
          cache:'no-store'
        });
      }
    } catch (_) { /* do not block or break the assistant when account sync is offline */ }
  }
  launch.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    dragStart = {pointerId:event.pointerId, x:event.clientX, y:event.clientY, left:host.getBoundingClientRect().left, top:host.getBoundingClientRect().top};
    dragged = false;
    launch.style.cursor = 'grabbing';
    try { launch.setPointerCapture(event.pointerId); } catch (_) {}
  });
  launch.addEventListener('pointermove', event => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (!dragged && Math.hypot(dx, dy) < 7) return;
    dragged = true;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    const x = clamp(dragStart.left + dx, 8, window.innerWidth - rect.width - 8);
    const y = clamp(dragStart.top + dy, 8, window.innerHeight - rect.height - 8);
    host.style.left = x + 'px';
    host.style.top = y + 'px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  });
  const finishDrag = event => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    if (dragged) {
      savePosition();
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 0);
    }
    dragStart = null;
    launch.style.cursor = 'grab';
  };
  launch.addEventListener('pointerup', finishDrag);
  launch.addEventListener('pointercancel', finishDrag);
  launch.addEventListener('click', event => {
    if (suppressNextClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressNextClick = false; }
  }, true);
  window.addEventListener('resize', () => { if (sessionToken()) syncPositionFromAccount(); else applySavedPosition(); });
  applySavedPosition();
  syncPositionFromAccount();
  document.addEventListener('zombcash:survivorlogin', syncPositionFromAccount);
  function localize() {
    const t = copy[getLang()];
    launch.querySelector('.zfa-launch-label').textContent = t.button;
    launch.setAttribute('aria-label', t.button);
    panel.querySelector('.zfa-title').textContent = t.title;
    panel.querySelector('.zfa-sub').textContent = t.sub;
    close.setAttribute('aria-label', t.close);
    input.placeholder = t.placeholder;
    input.setAttribute('aria-label', t.placeholder);
    send.setAttribute('aria-label', t.send);
    panel.querySelector('.zfa-hint').textContent = t.hint;
    const welcome = messages.querySelector('[data-welcome]');
    if (welcome) welcome.textContent = t.welcome;
  }
  function openPanel() {
    panel.hidden = false;
    launch.setAttribute('aria-expanded','true');
    if (!messages.children.length) {
      const welcome = addMessage(copy[getLang()].welcome);
      welcome.dataset.welcome = 'true';
    }
    input.focus();
  }
  function closePanel() { panel.hidden = true; launch.setAttribute('aria-expanded','false'); launch.focus(); }
  launch.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  close.addEventListener('click', closePanel);
  document.addEventListener('zombcash:languagechange', localize);
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) { panel.hidden = true; launch.setAttribute('aria-expanded','false'); } });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true; input.disabled = true;
    addMessage(text,'user');
    history.push({role:'user',content:text});
    input.value = '';
    const t = copy[getLang()];
    const status = addMessage(t.thinking,'status');
    try {
      const response = await fetch(API, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-8),language:getLang(),page:location.pathname}),cache:'no-store'});
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.reply) throw new Error(data.error || 'Request failed');
      status.remove();
      addMessage(data.reply);
      history.push({role:'assistant',content:data.reply});
      history = history.slice(-8);
    } catch (_) {
      status.remove();
      addMessage(t.error);
      history.pop();
    } finally {
      busy = false; send.disabled = false; input.disabled = false; input.focus();
    }
  });
  localize();
})();
