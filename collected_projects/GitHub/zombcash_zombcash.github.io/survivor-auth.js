/* Telegram-based Survivor registration. No Telegram or Supabase secrets are exposed here. */
(() => {
  'use strict';
  const API = 'https://zombcash-bot.fadehost.app';
  // Existing project bot; its domain must be linked in @BotFather before login works.
  const BOT_USERNAME = 'MemeCoinAIAgent_bot';
  const STORAGE_TOKEN = 'zombcash-survivor-token';
  const STORAGE_PROFILE = 'zombcash-survivor-profile';
  const translations = {
    en:{login:'LOGIN WITH TELEGRAM',profile:'SURVIVOR PROFILE',intro:'Join the outbreak. Track your activity and future rewards.',connect:'CONTINUE WITH TELEGRAM',loading:'VERIFYING TELEGRAM IDENTITY…',points:'SURVIVAL POINTS',joined:'JOINED',logout:'LOG OUT',close:'CLOSE',setup:'Registration setup is not finished yet. Please try again later.',error:'Telegram sign-in failed. Please try again.',privacy:'Your Telegram ID is used to identify your profile. It is not shown publicly.'},
    de:{login:'MIT TELEGRAM ANMELDEN',profile:'ÜBERLEBENDEN-PROFIL',intro:'Werde Teil des Ausbruchs. Verfolge Aktivität und künftige Belohnungen.',connect:'MIT TELEGRAM FORTFAHREN',loading:'TELEGRAM-IDENTITÄT WIRD GEPRÜFT…',points:'ÜBERLEBENSPUNKTE',joined:'BEIGETRETEN',logout:'ABMELDEN',close:'SCHLIESSEN',setup:'Die Registrierung ist noch nicht eingerichtet. Bitte später erneut versuchen.',error:'Telegram-Anmeldung fehlgeschlagen. Bitte erneut versuchen.',privacy:'Deine Telegram-ID identifiziert dein Profil und wird nicht öffentlich angezeigt.'},
    fr:{login:'CONNEXION AVEC TELEGRAM',profile:'PROFIL DU SURVIVANT',intro:'Rejoignez l’épidémie. Suivez votre activité et les futures récompenses.',connect:'CONTINUER AVEC TELEGRAM',loading:'VÉRIFICATION DE TELEGRAM…',points:'POINTS DE SURVIE',joined:'INSCRIPTION',logout:'DÉCONNEXION',close:'FERMER',setup:'L’inscription n’est pas encore configurée. Réessayez plus tard.',error:'Échec de la connexion Telegram. Réessayez.',privacy:'Votre identifiant Telegram sert à reconnaître votre profil et reste privé.'},
    it:{login:'ACCEDI CON TELEGRAM',profile:'PROFILO SOPRAVVISSUTO',intro:'Unisciti al focolaio. Tieni traccia dell’attività e delle future ricompense.',connect:'CONTINUA CON TELEGRAM',loading:'VERIFICA IDENTITÀ TELEGRAM…',points:'PUNTI SOPRAVVIVENZA',joined:'ISCRITTO',logout:'ESCI',close:'CHIUDI',setup:'La registrazione non è ancora configurata. Riprova più tardi.',error:'Accesso Telegram non riuscito. Riprova.',privacy:'Il tuo ID Telegram identifica il profilo e non viene mostrato pubblicamente.'},
    ja:{login:'TELEGRAMでログイン',profile:'サバイバープロフィール',intro:'アウトブレイクに参加して、活動履歴と今後の報酬を記録しよう。',connect:'TELEGRAMで続行',loading:'TELEGRAM IDを確認中…',points:'サバイバルポイント',joined:'登録日',logout:'ログアウト',close:'閉じる',setup:'登録設定はまだ完了していません。後でもう一度お試しください。',error:'Telegramログインに失敗しました。もう一度お試しください。',privacy:'Telegram IDはプロフィールの識別に使用され、公開されません。'},
    'zh-CN':{login:'使用 TELEGRAM 登录',profile:'幸存者档案',intro:'加入爆发行动，记录活动并为未来奖励做好准备。',connect:'继续使用 TELEGRAM',loading:'正在验证 TELEGRAM 身份…',points:'生存积分',joined:'加入时间',logout:'退出登录',close:'关闭',setup:'注册功能尚未完成配置，请稍后再试。',error:'Telegram 登录失败，请重试。',privacy:'Telegram ID 用于识别你的档案，不会公开显示。'},
    ru:{login:'ВОЙТИ ЧЕРЕЗ TELEGRAM',profile:'ПРОФИЛЬ ВЫЖИВШЕГО',intro:'Присоединяйся к вспышке. Учитывай активность и готовься к будущим наградам.',connect:'ПРОДОЛЖИТЬ ЧЕРЕЗ TELEGRAM',loading:'ПРОВЕРЯЕМ TELEGRAM…',points:'ОЧКИ ВЫЖИВАНИЯ',joined:'ДАТА РЕГИСТРАЦИИ',logout:'ВЫЙТИ',close:'ЗАКРЫТЬ',setup:'Регистрация ещё не настроена. Попробуй позже.',error:'Не удалось войти через Telegram. Попробуй ещё раз.',privacy:'Telegram ID используется для идентификации профиля и не показывается публично.'},
    tr:{login:'TELEGRAM İLE GİRİŞ',profile:'HAYATTA KALAN PROFİLİ',intro:'Salgına katıl. Etkinliğini ve gelecekteki ödüllerini takip et.',connect:'TELEGRAM İLE DEVAM ET',loading:'TELEGRAM KİMLİĞİ DOĞRULANIYOR…',points:'HAYATTA KALMA PUANLARI',joined:'KATILMA TARİHİ',logout:'ÇIKIŞ YAP',close:'KAPAT',setup:'Kayıt ayarları henüz tamamlanmadı. Lütfen sonra tekrar dene.',error:'Telegram girişi başarısız. Tekrar dene.',privacy:'Telegram kimliğin profilini tanımak için kullanılır ve herkese açık gösterilmez.'},
    hi:{login:'TELEGRAM से लॉग इन करें',profile:'सर्वाइवर प्रोफ़ाइल',intro:'आउटब्रेक में शामिल हों। गतिविधि और भविष्य के पुरस्कारों को ट्रैक करें।',connect:'TELEGRAM के साथ जारी रखें',loading:'TELEGRAM पहचान सत्यापित हो रही है…',points:'सर्वाइवल पॉइंट्स',joined:'जुड़ने की तारीख',logout:'लॉग आउट',close:'बंद करें',setup:'पंजीकरण सेटअप अभी पूरा नहीं हुआ है। कृपया बाद में फिर प्रयास करें।',error:'Telegram साइन-इन विफल हुआ। कृपया फिर प्रयास करें।',privacy:'आपकी Telegram ID प्रोफ़ाइल पहचानने के लिए उपयोग होती है और सार्वजनिक नहीं की जाती।'}
  };
  const identityTranslations = {
    en:{identity:"SURVIVOR IDENTITY",displayName:"PUBLIC DISPLAY NAME",displayHint:"This name appears in game leaderboards instead of your Telegram username. 3–24 characters.",showLeaderboard:"Show my profile in public leaderboards",showPresence:"Show my ONLINE status",saveSettings:"SAVE PROFILE SETTINGS",presenceHint:"ONLINE is shown while this site tab is open and visible.",saving:"SAVING PROFILE…",saved:"PROFILE SAVED",invalidName:"Display name must contain 3–24 characters."},
    de:{identity:"SURVIVOR-IDENTITÄT",displayName:"ÖFFENTLICHER ANZEIGENAME",displayHint:"Dieser Name erscheint in Ranglisten statt deines Telegram-Nutzernamens. 3–24 Zeichen.",showLeaderboard:"Mein Profil in öffentlichen Ranglisten zeigen",showPresence:"Meinen ONLINE-Status zeigen",saveSettings:"PROFIL SPEICHERN",presenceHint:"ONLINE wird angezeigt, solange dieser Tab geöffnet und sichtbar ist.",saving:"PROFIL WIRD GESPEICHERT…",saved:"PROFIL GESPEICHERT",invalidName:"Der Anzeigename muss 3–24 Zeichen lang sein."},
    fr:{identity:"IDENTITÉ DU SURVIVANT",displayName:"NOM PUBLIC",displayHint:"Ce nom apparaît dans les classements à la place de votre nom Telegram. 3 à 24 caractères.",showLeaderboard:"Afficher mon profil dans les classements publics",showPresence:"Afficher mon statut EN LIGNE",saveSettings:"ENREGISTRER LE PROFIL",presenceHint:"EN LIGNE s’affiche tant que cet onglet est ouvert et visible.",saving:"ENREGISTREMENT…",saved:"PROFIL ENREGISTRÉ",invalidName:"Le nom doit contenir de 3 à 24 caractères."},
    it:{identity:"IDENTITÀ DEL SOPRAVVISSUTO",displayName:"NOME PUBBLICO",displayHint:"Questo nome appare nelle classifiche al posto del nome Telegram. Da 3 a 24 caratteri.",showLeaderboard:"Mostra il profilo nelle classifiche pubbliche",showPresence:"Mostra il mio stato ONLINE",saveSettings:"SALVA PROFILO",presenceHint:"ONLINE viene mostrato finché questa scheda è aperta e visibile.",saving:"SALVATAGGIO…",saved:"PROFILO SALVATO",invalidName:"Il nome deve contenere da 3 a 24 caratteri."},
    ja:{identity:"サバイバーID",displayName:"公開表示名",displayHint:"Telegram名の代わりにゲームランキングに表示されます。3〜24文字。",showLeaderboard:"公開ランキングにプロフィールを表示",showPresence:"オンライン状態を表示",saveSettings:"プロフィールを保存",presenceHint:"このタブが開いて表示されている間、オンラインとして表示されます。",saving:"プロフィールを保存中…",saved:"プロフィールを保存しました",invalidName:"表示名は3〜24文字にしてください。"},
    "zh-CN":{identity:"幸存者身份",displayName:"公开显示名称",displayHint:"游戏排行榜将显示此名称，而不是 Telegram 用户名。3–24 个字符。",showLeaderboard:"在公开排行榜中显示我的档案",showPresence:"显示我的在线状态",saveSettings:"保存档案设置",presenceHint:"此标签页打开且可见时会显示在线。",saving:"正在保存档案…",saved:"档案已保存",invalidName:"显示名称必须为 3–24 个字符。"},
    ru:{identity:"ЛИЧНОСТЬ ВЫЖИВШЕГО",displayName:"ОТОБРАЖАЕМОЕ ИМЯ",displayHint:"Это имя будет показываться в игровых рейтингах вместо ника Telegram. От 3 до 24 символов.",showLeaderboard:"Показывать меня в общих таблицах лидеров",showPresence:"Показывать мой статус «ОНЛАЙН»",saveSettings:"СОХРАНИТЬ НАСТРОЙКИ",presenceHint:"Статус «ОНЛАЙН» отображается, пока вкладка сайта открыта и видима.",saving:"СОХРАНЯЕМ ПРОФИЛЬ…",saved:"ПРОФИЛЬ СОХРАНЁН",invalidName:"Имя должно содержать от 3 до 24 символов."},
    tr:{identity:"HAYATTA KALAN KİMLİĞİ",displayName:"GÖRÜNEN AD",displayHint:"Bu ad, oyun sıralamalarında Telegram kullanıcı adınızın yerine görünür. 3–24 karakter.",showLeaderboard:"Profilimi herkese açık sıralamalarda göster",showPresence:"ÇEVRİM İÇİ durumumu göster",saveSettings:"PROFİLİ KAYDET",presenceHint:"Bu sekme açık ve görünürken çevrim içi görünürsünüz.",saving:"PROFİL KAYDEDİLİYOR…",saved:"PROFİL KAYDEDİLDİ",invalidName:"Görünen ad 3–24 karakter olmalıdır."},
    hi:{identity:"सर्वाइवर पहचान",displayName:"दिखने वाला नाम",displayHint:"गेम लीडरबोर्ड में Telegram नाम की जगह यह नाम दिखेगा। 3–24 अक्षर।",showLeaderboard:"सार्वजनिक लीडरबोर्ड में मेरी प्रोफ़ाइल दिखाएँ",showPresence:"मेरा ऑनलाइन स्टेटस दिखाएँ",saveSettings:"प्रोफ़ाइल सेटिंग सेव करें",presenceHint:"यह टैब खुला और दिखाई देने पर आप ऑनलाइन दिखेंगे।",saving:"प्रोफ़ाइल सेव हो रही है…",saved:"प्रोफ़ाइल सेव हो गई",invalidName:"नाम 3–24 अक्षरों का होना चाहिए।"}
  };
  const it = key => (identityTranslations[lang()] || identityTranslations.en)[key] || identityTranslations.en[key] || key;

  const lang = () => {
    try { const code = localStorage.getItem('zombcash-language') || document.documentElement.lang || 'en'; return translations[code] ? code : 'en'; }
    catch (_) { return 'en'; }
  };
  const t = key => translations[lang()][key] || translations.en[key] || key;
  const loginWaiting = {"en":"Open Telegram and press Start. This page will finish login automatically.","de":"Öffne Telegram und tippe auf Start. Diese Seite schließt die Anmeldung automatisch ab.","fr":"Ouvrez Telegram et appuyez sur Démarrer. La connexion se terminera automatiquement ici.","it":"Apri Telegram e premi Avvia. L’accesso verrà completato automaticamente su questa pagina.","ja":"Telegramを開いて「Start」を押してください。このページで自動的にログインが完了します。","zh-CN":"打开 Telegram 并点击 Start。此页面将自动完成登录。","ru":"Откройте Telegram и нажмите «Запустить». Вход на этой странице завершится автоматически.","tr":"Telegram'ı açıp Başlat'a dokunun. Giriş bu sayfada otomatik tamamlanacak.","hi":"Telegram खोलें और Start दबाएँ। इस पेज पर लॉगिन अपने आप पूरा हो जाएगा。"};

  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let overlay, statusNode, bodyNode, widgetNode, isBusy = false, presenceOnline = false, presenceTimer = 0;
  const readProfile = () => { try { return JSON.parse(localStorage.getItem(STORAGE_PROFILE) || 'null'); } catch (_) { return null; } };
  const token = () => { try { return localStorage.getItem(STORAGE_TOKEN) || ''; } catch (_) { return ''; } };
  function updateCta() {
    const cta = document.querySelector('header.zombcash-shared-header .zsh-actions .zsh-login-button, header.zombcash-shared-header .zsh-actions .survivor-entry-button, .top-cta, .survivor-entry-button');
    if (!cta) return;
    const p = readProfile();
    cta.textContent = p ? '☣ ' + (p.publicDisplayName || p.firstName || 'SURVIVOR') : t('login');
    cta.classList.toggle('survivor-online', Boolean(p && presenceOnline && p.presenceVisible !== false));
    cta.setAttribute('aria-label', p ? t('profile') + (presenceOnline ? ' · ONLINE' : '') : t('login'));
    cta.href = '#survivor-profile';
  }
  function ensureModal() {
    if (overlay) return;
    const style = document.createElement('style');
    style.textContent = '.survivor-overlay[hidden]{display:none!important}.survivor-overlay{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:18px;background:#020603df;backdrop-filter:blur(7px)}.survivor-modal{position:relative;width:min(440px,100%);max-height:calc(100vh - 36px);max-height:calc(100dvh - 36px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#426341 #07100a;padding:26px;border:1px solid #6a9d42;background:linear-gradient(145deg,#101b12,#070b09);color:#edf5e5;box-shadow:0 22px 80px #000b;font-family:Rajdhani,system-ui,sans-serif}.survivor-modal h2{margin:0 0 10px;color:#9bff45;font:700 19px Orbitron,system-ui,sans-serif}.survivor-modal p{color:#b8c8b6;line-height:1.5}.survivor-modal .survivor-status{min-height:24px;color:#9bff45;font-size:14px}.survivor-modal .survivor-widget{display:flex;justify-content:center;min-height:46px;margin:20px 0}.survivor-modal .survivor-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.survivor-modal button{border:1px solid #426341;background:#0b120c;color:#b8f992;padding:10px 14px;cursor:pointer;font:700 11px Orbitron,system-ui,sans-serif}.survivor-modal .survivor-stats{border:1px solid #2b4930;padding:14px;margin-top:16px}.survivor-modal .survivor-points{font:700 26px Orbitron,system-ui,sans-serif;color:#9bff45}.survivor-modal .survivor-dashboard{display:grid;gap:12px}.survivor-modal .survivor-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.survivor-modal .survivor-stat-tile{border:1px solid #263b29;background:#080f0a;padding:12px;min-width:0}.survivor-modal .survivor-stat-tile span{display:block;color:#9aa996;font:600 9px Orbitron,system-ui,sans-serif;letter-spacing:.5px}.survivor-modal .survivor-stat-tile b{display:block;color:#9bff45;font:700 22px Orbitron,system-ui,sans-serif;margin:8px 0}.survivor-modal .survivor-stat-tile small{color:#9aa996}.survivor-modal .survivor-activity{border-top:1px solid #29402b;padding-top:10px}.survivor-modal .survivor-activity h3{font:700 10px Orbitron,system-ui,sans-serif;color:#9bff45}.survivor-modal .survivor-activity-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #17251a;color:#b9c8b5;font-size:13px}.survivor-modal .survivor-activity-row b{color:#9bff45;white-space:nowrap}@media(max-width:420px){.survivor-modal{padding:18px}.survivor-modal .survivor-stat-grid{grid-template-columns:1fr 1fr}}.survivor-modal .survivor-privacy{font-size:12px;color:#8e9c8d}.survivor-modal [hidden]{display:none!important}.survivor-entry-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;margin:10px 0 0;padding:10px 12px;border:1px solid #426341;background:#0b120c;color:#b8f992;font:700 10px Orbitron,system-ui,sans-serif;cursor:pointer;white-space:normal}.survivor-entry-button.survivor-online:after{content:"";display:inline-block;width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:#9bff45;box-shadow:0 0 8px #9bff45}';
    document.head.append(style);
    overlay = document.createElement('div');
    overlay.className = 'survivor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="survivor-modal" role="dialog" aria-modal="true" aria-labelledby="survivor-title"><h2 id="survivor-title"></h2><p id="survivor-intro"></p><div id="survivor-body"></div><p class="survivor-status" id="survivor-status" role="status"></p><p class="survivor-privacy" id="survivor-privacy"></p><div class="survivor-actions"><button type="button" id="survivor-logout" hidden></button><button type="button" id="survivor-close"></button></div></section>';
    document.body.append(overlay);
    statusNode = overlay.querySelector('#survivor-status');
    bodyNode = overlay.querySelector('#survivor-body');
    widgetNode = document.createElement('div'); widgetNode.className = 'survivor-widget';
    overlay.querySelector('#survivor-close').addEventListener('click', closeModal);
    overlay.querySelector('#survivor-logout').addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_TOKEN); localStorage.removeItem(STORAGE_PROFILE); } catch (_) {}
      updateCta(); renderModal(); statusNode.textContent = '';
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });
  }
  function closeModal() { if (overlay) overlay.hidden = true; }
  function renderModal() {
    ensureModal();
    const profile = readProfile();
    overlay.querySelector('#survivor-title').textContent = profile ? t('profile') : t('login');
    overlay.querySelector('#survivor-intro').textContent = profile ? ('WELCOME BACK, ' + (profile.publicDisplayName || profile.firstName || 'SURVIVOR')) : t('intro');
    overlay.querySelector('#survivor-close').textContent = t('close');
    overlay.querySelector('#survivor-logout').textContent = t('logout');
    overlay.querySelector('#survivor-logout').hidden = !profile;
    overlay.querySelector('#survivor-privacy').textContent = t('privacy');
    bodyNode.innerHTML = '';
    if (profile) {
      const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—';
      bodyNode.innerHTML = '<div class="survivor-dashboard">' +
        '<div class="survivor-stats"><div>' + safe(t('points')) + '</div><div class="survivor-points" id="survivor-live-points">' + safe(profile.points || 0) + ' SP</div><p>' + safe(t('joined')) + ': ' + safe(joined) + '</p></div>' +
        '<div class="survivor-stat-grid">' +
        '<div class="survivor-stat-tile"><span>REFERRALS</span><b id="survivor-referrals">—</b><small>verified survivors</small></div>' +
        '<div class="survivor-stat-tile"><span>SITE VISITS</span><b id="survivor-visits">—</b></div>' +
        '<div class="survivor-stat-tile"><span>MAKER SAVES</span><b id="survivor-maker-saves">—</b></div>' +
        '<div class="survivor-stat-tile"><span>GAMES COMPLETED</span><b id="survivor-games">—</b></div></div>' +
        '<section class="survivor-stats"><h3 style="margin:0 0 12px;color:#9bff45;font:700 11px Orbitron,system-ui,sans-serif">' + safe(it('identity')) + '</h3>' +
        '<label for="survivor-display-name" style="display:block;color:#b8c8b6;font-size:12px;margin-bottom:6px">' + safe(it('displayName')) + '</label>' +
        '<input id="survivor-display-name" maxlength="24" autocomplete="nickname" placeholder="e.g. GraveWalker" style="box-sizing:border-box;width:100%;padding:11px;border:1px solid #426341;background:#07100a;color:#edf5e5;font:600 14px Rajdhani,system-ui,sans-serif">' +
        '<p class="survivor-privacy">' + safe(it('displayHint')) + '</p>' +
        '<label style="display:flex;align-items:center;gap:9px;margin:12px 0;color:#dcebd6;font-size:13px"><input type="checkbox" id="survivor-leaderboard-visible" style="accent-color:#9bff45"> ' + safe(it('showLeaderboard')) + '</label>' +
        '<label style="display:flex;align-items:center;gap:9px;margin:10px 0;color:#dcebd6;font-size:13px"><input type="checkbox" id="survivor-presence-visible" style="accent-color:#9bff45"> ' + safe(it('showPresence')) + '</label>' +
        '<button type="button" id="survivor-save-settings" style="margin-top:8px;width:100%;background:#9bff45;color:#071007;border-color:#9bff45">' + safe(it('saveSettings')) + '</button>' +
        '<p class="survivor-privacy">' + safe(it('presenceHint')) + '</p></section>' +
        '<p class="survivor-privacy">Points have no monetary value and provide no benefits. Activity tracking only.</p></div>';
      statusNode.textContent = '';
      const nameInput = bodyNode.querySelector('#survivor-display-name');
      const leaderboardToggle = bodyNode.querySelector('#survivor-leaderboard-visible');
      const presenceToggle = bodyNode.querySelector('#survivor-presence-visible');
      if (nameInput) nameInput.value = profile.publicDisplayName || '';
      if (leaderboardToggle) leaderboardToggle.checked = profile.leaderboardVisible !== false;
      if (presenceToggle) presenceToggle.checked = profile.presenceVisible !== false;
      const saveSettings = bodyNode.querySelector('#survivor-save-settings');
      if (saveSettings) saveSettings.addEventListener('click', saveSurvivorSettings);
      loadSurvivorDashboard();
      return;
    }
    const label = document.createElement('p'); label.textContent = t('connect'); bodyNode.append(label, widgetNode);
    statusNode.textContent = '';
    widgetNode.innerHTML = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = t('connect');
    button.addEventListener('click', beginBotLogin);
    widgetNode.append(button);
  }
  async function beginBotLogin() {
    if (isBusy) return;
    isBusy = true;
    statusNode.textContent = t('loading');
    try {
      const response = await fetch(API + '/api/auth/telegram/start', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}', cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.nonce || !data.botUrl) {
        statusNode.textContent = response.status === 503 ? t('setup') : t('error');
        isBusy = false;
        return;
      }
      widgetNode.innerHTML = '';
      const link = document.createElement('a');
      link.href = data.botUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = t('connect');
      link.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border:1px solid #6a9d42;background:#9bff45;color:#071007;text-decoration:none;font:700 11px Orbitron,system-ui,sans-serif;';
      widgetNode.append(link);
      statusNode.textContent = loginWaiting[lang()] || loginWaiting.en;
      const expiresAt = Date.now() + 175000;
      while (Date.now() < expiresAt) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await fetch(API + '/api/auth/telegram/status?nonce=' + encodeURIComponent(data.nonce), {cache:'no-store'});
        const statusData = await statusResponse.json().catch(() => ({}));
        if (statusResponse.status === 410) {
          statusNode.textContent = t('error');
          return;
        }
        if (statusResponse.ok && statusData.status === 'complete' && statusData.token && statusData.profile) {
          localStorage.setItem(STORAGE_TOKEN, statusData.token);
          localStorage.setItem(STORAGE_PROFILE, JSON.stringify(statusData.profile));
          document.dispatchEvent(new CustomEvent('zombcash:survivorlogin'));
          updateCta();
          refreshProfile();
          renderModal();
          statusNode.textContent = '';
          return;
        }
      }
      statusNode.textContent = t('error');
    } catch (_) {
      statusNode.textContent = t('error');
    } finally {
      isBusy = false;
    }
  }
  async function loadSurvivorDashboard() {
    const auth = token();
    if (!auth || !bodyNode) return;
    const set = (id, value) => { const node = bodyNode.querySelector('#' + id); if (node) node.textContent = String(value); };
    try {
      const [profileResponse, activityResponse, referralResponse] = await Promise.all([
        fetch(API + '/api/profile', {headers:{'Authorization':'Bearer ' + auth}, cache:'no-store'}),
        fetch(API + '/api/profile/activity', {headers:{'Authorization':'Bearer ' + auth}, cache:'no-store'}),
        fetch(API + '/api/referrals/me', {headers:{'Authorization':'Bearer ' + auth}, cache:'no-store'})
      ]);
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        if (data.profile) {
          localStorage.setItem(STORAGE_PROFILE, JSON.stringify(data.profile));
          set('survivor-live-points', Number(data.profile.points || 0).toLocaleString() + ' SP');
          const nameInput = bodyNode.querySelector('#survivor-display-name');
          const leaderboardToggle = bodyNode.querySelector('#survivor-leaderboard-visible');
          const presenceToggle = bodyNode.querySelector('#survivor-presence-visible');
          if (nameInput && document.activeElement !== nameInput) nameInput.value = data.profile.publicDisplayName || '';
          if (leaderboardToggle) leaderboardToggle.checked = data.profile.leaderboardVisible !== false;
          if (presenceToggle) presenceToggle.checked = data.profile.presenceVisible !== false;
        }
      }
      let activity = [];
      if (activityResponse.ok) {
        const data = await activityResponse.json();
        activity = Array.isArray(data.activity) ? data.activity : [];
      }
      const count = type => activity.filter(row => row.event_type === type).length;
      set('survivor-visits', count('daily_visit'));
      set('survivor-maker-saves', count('maker_saved'));
      set('survivor-games', count('game_completed'));
      if (referralResponse.ok) {
        const data = await referralResponse.json();
        set('survivor-referrals', Number(data.verifiedReferrals || 0));
      } else set('survivor-referrals', '—');
      const list = bodyNode.querySelector('#survivor-activity-list');
      if (list) {
        list.innerHTML = '';
        if (!activity.length) list.textContent = 'No activity recorded yet.';
        activity.slice(0, 8).forEach(row => {
          const line = document.createElement('div'); line.className = 'survivor-activity-row';
          const label = document.createElement('span');
          const labels = {login:'Telegram login',daily_visit:'Site visit',maker_saved:'Zombie Maker save',game_completed:'Game completed',referral_claimed:'Referral linked'};
          const details = row.details && typeof row.details === 'object' ? row.details : {};
          const game = details.game ? ' · ' + String(details.game).toUpperCase() : '';
          label.textContent = (labels[row.event_type] || String(row.event_type || 'Activity').replace(/_/g, ' ')) + game;
          const value = document.createElement('b');
          const delta = Number(row.points_delta || 0);
          value.textContent = delta > 0 ? ('+' + delta + ' SP') : 'Tracked';
          line.append(label, value); list.append(line);
        });
      }
      updateCta();
    } catch (_) {
      const list = bodyNode.querySelector('#survivor-activity-list');
      if (list) list.textContent = 'Activity temporarily unavailable.';
    }
  }
  async function saveSurvivorSettings() {
    const nameInput = bodyNode.querySelector('#survivor-display-name');
    const leaderboardToggle = bodyNode.querySelector('#survivor-leaderboard-visible');
    const presenceToggle = bodyNode.querySelector('#survivor-presence-visible');
    const button = bodyNode.querySelector('#survivor-save-settings');
    const name = nameInput ? nameInput.value.trim().replace(/\\s+/g, ' ') : '';
    if (!name || name.length < 3 || name.length > 24) {
      statusNode.textContent = it('invalidName');
      return;
    }
    button.disabled = true;
    statusNode.textContent = it('saving');
    try {
      const response = await fetch(API + '/api/profile/settings', {
        method: 'POST',
        headers: {'Authorization':'Bearer ' + token(), 'Content-Type':'application/json'},
        body: JSON.stringify({
          publicDisplayName: name,
          leaderboardVisible: Boolean(leaderboardToggle && leaderboardToggle.checked),
          presenceVisible: Boolean(presenceToggle && presenceToggle.checked)
        }),
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not save profile settings.');
      const current = readProfile() || {};
      const next = Object.assign({}, current, data.profile);
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(next));
      presenceOnline = false;
      updateCta();
      statusNode.textContent = it('saved');
      document.dispatchEvent(new CustomEvent('zombcash:survivorprofileupdated'));
      if (presenceToggle && presenceToggle.checked) sendPresenceHeartbeat();
    } catch (error) {
      statusNode.textContent = error.message || 'Could not save profile settings.';
    } finally {
      button.disabled = false;
    }
  }
  async function sendPresenceHeartbeat() {
    if (!token() || document.visibilityState === 'hidden') return;
    try {
      const page = (location.pathname.split('/').pop() || 'site').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'site';
      const response = await fetch(API + '/api/presence/heartbeat?page=' + encodeURIComponent(page), {
        method: 'POST',
        headers: {'Authorization':'Bearer ' + token(), 'Content-Type':'application/json'},
        body: '{}',
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      presenceOnline = Boolean(response.ok && data.online);
    } catch (_) {
      presenceOnline = false;
    }
    updateCta();
  }
  function startPresenceHeartbeat() {
    if (presenceTimer) clearInterval(presenceTimer);
    sendPresenceHeartbeat();
    presenceTimer = setInterval(sendPresenceHeartbeat, 30000);
  }
  async function recordDailyVisit() {
    const day = new Date().toISOString().slice(0, 10);
    const profile = readProfile();
    if (!profile || !profile.telegramId) return;
    const key = 'zombcash-survivor-visit:' + String(profile.telegramId) + ':' + day;
    try { if (localStorage.getItem(key) === '1') return; } catch (_) {}
    try {
      const response = await fetch(API + '/api/survival/visit', {
        method: 'POST',
        headers: {'Authorization':'Bearer ' + token(), 'Content-Type':'application/json'},
        body: '{}',
        cache: 'no-store'
      });
      if (response.ok) { try { localStorage.setItem(key, '1'); } catch (_) {} }
    } catch (_) {}
  }
  async function refreshProfile() {
    if (!token()) return;
    try {
      const response = await fetch(API + '/api/profile', {headers:{'Authorization':'Bearer ' + token()}, cache:'no-store'});
      if (response.status === 401) { localStorage.removeItem(STORAGE_TOKEN); localStorage.removeItem(STORAGE_PROFILE); return; }
      if (response.ok) {
        const data = await response.json();
        if (data.profile) localStorage.setItem(STORAGE_PROFILE, JSON.stringify(data.profile));
        await recordDailyVisit();
      }
    } catch (_) {}
  }
  function init() {
    ensureModal();
    // Reuse the shared header's existing Telegram login control; never create a duplicate CTA.
    let cta = document.querySelector('header.zombcash-shared-header .zsh-actions .zsh-login-button, header.zombcash-shared-header .zsh-actions .survivor-entry-button, .top-cta, .survivor-entry-button');
    if (!cta) {
      cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'survivor-entry-button';
      const actions = document.querySelector('header.zombcash-shared-header .zsh-actions');
      const nav = document.querySelector('.nav, header nav') || document.querySelector('header') || document.querySelector('main');
      if (actions) actions.append(cta);
      else if (nav) nav.append(cta);
    }
    if (cta) cta.addEventListener('click', e => { e.preventDefault(); overlay.hidden = false; renderModal(); });
    document.addEventListener('zombcash:languagechange', () => { updateCta(); if (overlay && !overlay.hidden) renderModal(); });
    refreshProfile().finally(() => { updateCta(); startPresenceHeartbeat(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sendPresenceHeartbeat();
      else { presenceOnline = false; updateCta(); }
    });
    window.addEventListener('pagehide', () => { presenceOnline = false; updateCta(); });
    updateCta();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();