// Cathy 视频 Worker —— R2 视频上传/播放 + 教练视频页（每教练独立链接/语言/留言串）
// 绑定：VIDEOS (r2_bucket -> cathy-videos)、AI (Workers AI，留言翻译)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// ===== 教练页多语言 =====
// ===== Service Worker 源码：视频请求本地缓存（含 Range 切片），其它请求直通 =====
const SW_SRC = `
const C = 'cv1';
// iOS Safari 对 SW 提供的媒体流不稳定（底线：视频必须能播）——iOS 一律直通网络
const iOS = /iP(hone|ad|od)/.test(self.navigator.userAgent) || (self.navigator.platform === 'MacIntel' && self.navigator.maxTouchPoints > 1);
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (iOS || u.origin !== location.origin || !u.pathname.startsWith('/video/')) return;
  e.respondWith((async () => {
    try {
      const cache = await caches.open(C);
      const range = e.request.headers.get('range');
      const hit = await cache.match(u.pathname);
      if (hit) {
        const blob = await hit.blob();
        if (!blob.size) return fetch(e.request);
        const type = hit.headers.get('Content-Type') || 'video/mp4';
        if (range) {
          const m = range.match(/bytes=(\\d+)-(\\d*)/);
          if (m) {
            const s = +m[1], en = m[2] ? Math.min(+m[2], blob.size - 1) : blob.size - 1;
            const part = blob.slice(s, en + 1);
            return new Response(part, { status: 206, headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + s + '-' + en + '/' + blob.size, 'Content-Length': String(part.size) } });
          }
        }
        return new Response(blob, { headers: { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(blob.size) } });
      }
      const r = await fetch(e.request);
      if (!range && r.ok) cache.put(u.pathname, r.clone());
      return r;
    } catch (err) {
      return fetch(e.request);
    }
  })());
});
`;

const COACH_I18N = {
  zh: { title: 'Cathy 比赛视频', sub: '每场对阵的视频与讨论', comments: '留言', send: '发送', namePh: '留言…', none: '还没有视频', general: '总体留言', coach: '教练', family: '家长', loading: '加载中…', auto: '页面会自动更新新视频', tip: '先选你的语言，留言自动互译。点 🌐 看原文。', other: '其他语言…', langPh: '输入你的语言（如 Hrvatski）', student: '学员', refresh: '刷新', updated: '已更新', newV: '个新视频', cmtsOf: '条留言', videosHere: '这个链接里的比赛视频', update: '有新版本，点击更新', boutCmt: '本场留言', clipCmt: '片段留言', vidFail: '视频加载失败', loadFail: '加载失败', noVoice: '不支持语音录制', noMic: '麦克风不可用', voice: '语音留言', del: '删除',
    tabVideos: '📹 视频', tabResults: '🏆 成绩', tabJourney: '📖 历程',
    rEvents: '赛事', rMedals: '年度奖牌', rPlace: '名次', rOpp: '对手',
    bioTitle: '📖 击剑生涯档案', philTitle: '📜 家长对花剑的理解与期望', philNote: '仅代表家长对花剑项目的理解 · 供教练参考，专业安排以教练为准，不代表对训练的要求',
    cEvList: '📋 赛事记录', medYear: '赛季', medN: '场次', medWL: '胜-负', medTotal: '总计',
    medTitle: '赛季统计', medT8Hint: 'T8 = 进前八的次数', medWin: '胜率', medFoot: '口径：按日历年统计全部赛事 · 🥇🥈🥉 = 前三名场次 · T8 = 进前八 · 胜率 = 逐剑胜负（仅美国赛事有逐剑数据）', ovTitle: '生涯总览', ovRec: '总战绩',
    plTitle: '名次走势（按年龄组分图）', plNote: '纵轴：名次等距刻度，每格一轮（32→16→8→4→2→1），超过 32 名不统计 · 金银铜点=进前三 · 悬停看赛事名',
    plBest: '最好', plLast: '最近', trUp: '进步', trDown: '回落', trFlat: '持平', plDot: ' 场 · 最好 ',
    oppTitle: '对手记录', oppRep: '🔁 交手 ≥2 次：', oppFoot: '口径：仅美国赛事逐剑数据 · 胜率 ≥60% 绿 / ≥40% 黄 / 其余红 · 年龄按出生年推算',
    jEvents: '场次', jYears: '剑龄', jSince: '2021.09 起', jYr: '第', jYrS: '年', jMedals: '奖牌', jCtry: '国家/地区', jWin: '胜率', jUp: '跳打', upLbl: '跳打',
    oName: '对手', oClub: '俱乐部', oAge: '年龄', oN: '交手', oW: '胜', oL: '负', oPct: '胜率', oppNote: '仅美国赛事逐剑数据 · 共 ', oppTail: ' 位对手', poolLbl: '分组赛 Pool', deLbl: '淘汰赛 DE', noOpp: '暂无对阵数据', noPlace: '暂无足够名次数据', placeNote: '纵轴：名次（越靠上越好，对数刻度）· 圆点颜色：🥇金 🥈银 🥉铜',
    agAdult: '成人组', agOther: '其他', agSuf: '岁组', agPre: '', eventsW: ' 场', wSuffix: '胜', lSuffix: '负' },
  'zh-TW': { title: 'Cathy 比賽影片', sub: '每場對陣的影片與討論', comments: '留言', send: '發送', namePh: '留言…', none: '還沒有影片', general: '總體留言', coach: '教練', family: '家長', loading: '載入中…', auto: '頁面會自動更新新影片', tip: '先選你的語言，留言自動互譯。點 🌐 看原文。', other: '其他語言…', langPh: '輸入你的語言', student: '學員', refresh: '重新整理', updated: '已更新', newV: '個新影片', cmtsOf: '則留言', videosHere: '這個連結裡的比賽影片', update: '有新版本，點擊更新', boutCmt: '本場留言', clipCmt: '片段留言', vidFail: '影片載入失敗', loadFail: '載入失敗', noVoice: '不支援語音錄製', noMic: '麥克風不可用', voice: '語音留言', del: '刪除',
    tabVideos: '📹 影片', tabResults: '🏆 成績', tabJourney: '📖 歷程', rEvents: '賽事', rMedals: '年度獎牌', rPlace: '名次', rOpp: '對手', bioTitle: '📖 擊劍生涯檔案', philTitle: '📜 家長對花劍的理解與期望',
    medTitle: '賽季統計', medT8Hint: 'T8 = 進前八的次數', medWin: '勝率', medFoot: '口徑：按日曆年統計全部賽事 · 🥇🥈🥉 = 前三名場次 · T8 = 進前八 · 勝率 = 逐劍勝負（僅美國賽事有逐劍數據）', ovTitle: '生涯總覽', ovRec: '總戰績',
    plTitle: '名次走勢（按年齡組分圖）', plNote: '縱軸：名次等距刻度，每格一輪（32→16→8→4→2→1），超過 32 名不統計 · 金銀銅點=進前三 · 懸停看賽事名',
    plBest: '最好', plLast: '最近', trUp: '進步', trDown: '回落', trFlat: '持平', plDot: ' 場 · 最好 ',
    oppTitle: '對手記錄', oppRep: '🔁 交手 ≥2 次：', oppFoot: '口徑：僅美國賽事逐劍數據 · 勝率 ≥60% 綠 / ≥40% 黃 / 其餘紅',
    jEvents: '場次', jYears: '劍齡', jSince: '2021.09 起', jYr: '第', jYrS: '年', jMedals: '獎牌', jCtry: '國家/地區', jWin: '勝率', jUp: '跳打', upLbl: '跳打' },
  en: { title: "Cathy's Bout Videos", sub: 'Videos and discussion per bout', comments: 'Comments', send: 'Send', namePh: 'Write a comment…', none: 'No videos yet', general: 'General comments', coach: 'Coach', family: 'Family', loading: 'Loading…', auto: 'This page updates automatically', tip: 'Pick your language above — comments auto-translate both ways. 🌐 shows the original.', other: 'Other language…', langPh: 'Type your language (e.g. Hrvatski)', student: 'Your student', refresh: 'Refresh', updated: 'Updated', newV: 'new since last visit', cmtsOf: 'comments', videosHere: 'bout videos under this link', update: 'Update available — tap to refresh', boutCmt: 'match comments', clipCmt: 'clip comments', vidFail: 'Video failed to load', loadFail: 'Load failed', noVoice: 'Voice recording not supported', noMic: 'Mic unavailable', voice: 'Voice note', del: 'Delete',
    tabVideos: '📹 Videos', tabResults: '🏆 Results', tabJourney: '📖 Journey',
    rEvents: 'Events', rMedals: 'Medals', rPlace: 'Ranking', rOpp: 'Opponents',
    bioTitle: '📖 Fencing Journey', philTitle: "📜 Parents' view on foil", philNote: "The family's understanding of foil — for the coach's reference only; training decisions remain the coach's",
    cEvList: '📋 Event history', medYear: 'Season', medN: 'Events', medWL: 'W-L', medTotal: 'Total',
    medTitle: 'Season stats', medT8Hint: 'T8 = top-8 finishes', medWin: 'Win%', medFoot: 'Calendar-year stats, all events · 🥇🥈🥉 = podium finishes · T8 = top-8 · Win% = individual bouts (US events only)', ovTitle: 'Career overview', ovRec: 'record',
    plTitle: 'Ranking trend by age group', plNote: 'Y-axis: equal spacing per round (32→16→8→4→2→1); placements beyond 32 are excluded · medal-colored dots = podium · hover a dot for the event name',
    plBest: 'Best', plLast: 'Latest', trUp: 'improving', trDown: 'declining', trFlat: 'steady', plDot: ' events · best ',
    oppTitle: 'Opponents', oppRep: '🔁 Rematches (≥2 bouts): ', oppFoot: 'US events bout data only · win% colors: ≥60% green / ≥40% amber / else red · age estimated from birth year',
    jEvents: 'events', jYears: 'fencing yr', jSince: 'since 2021.09', jYr: 'Yr ', jYrS: '', jMedals: 'medals', jCtry: 'countries', jWin: 'win rate', jUp: 'up-age', upLbl: 'up',
    oName: 'Opponent', oClub: 'Club', oAge: 'Age', oN: 'Bouts', oW: 'W', oL: 'L', oPct: 'Win%', oppNote: 'US events bout data · ', oppTail: ' opponents', poolLbl: 'Pools', deLbl: 'DE', noOpp: 'No bout data yet', noPlace: 'Not enough ranking data', placeNote: 'Y-axis: placement (higher is better, log scale) · dot colors: 🥇gold 🥈silver 🥉bronze',
    agAdult: 'Senior', agOther: 'Other', agSuf: '', agPre: 'U', eventsW: ' events', wSuffix: 'W', lSuffix: 'L' },
  it: { title: 'Video dei match di Cathy', sub: 'Video e discussione per ogni assalto', comments: 'Commenti', send: 'Invia', namePh: 'Scrivi un commento…', none: 'Nessun video ancora', general: 'Commenti generali', coach: 'Coach', family: 'Famiglia', loading: 'Caricamento…', auto: 'La pagina si aggiorna automaticamente', tip: 'Scegli la tua lingua — i commenti si traducono automaticamente. 🌐 mostra l’originale.', other: 'Altra lingua…', langPh: 'Scrivi la tua lingua', student: 'allieva', refresh: 'Aggiorna', updated: 'Aggiornato', newV: 'nuovi dalla tua ultima visita', cmtsOf: 'commenti', videosHere: 'video dei match in questo link', update: 'Nuova versione — tocca per aggiornare', boutCmt: 'commenti sul match', clipCmt: 'commenti sul video', vidFail: 'Video non caricato', loadFail: 'Caricamento fallito', noVoice: 'Registrazione vocale non supportata', noMic: 'Microfono non disponibile' },
  fr: { title: 'Vidéos des matchs de Cathy', sub: 'Vidéos et discussion par assaut', comments: 'Commentaires', send: 'Envoyer', namePh: 'Écrire un commentaire…', none: 'Pas encore de vidéos', general: 'Commentaires généraux', coach: 'Coach', family: 'Famille', loading: 'Chargement…', auto: 'La page se met à jour automatiquement', tip: 'Choisissez votre langue — les commentaires sont traduits automatiquement. 🌐 affiche l’original.', other: 'Autre langue…', langPh: 'Tapez votre langue', student: 'élève', refresh: 'Actualiser', updated: 'Actualisé', newV: 'nouvelles depuis votre dernière visite', cmtsOf: 'commentaires', videosHere: 'vidéos de matchs sous ce lien', update: 'Nouvelle version — touchez pour actualiser', boutCmt: 'commentaires du match', clipCmt: 'commentaires de la vidéo', vidFail: 'Échec du chargement de la vidéo', loadFail: 'Échec du chargement', noVoice: 'Enregistrement vocal non pris en charge', noMic: 'Micro indisponible' },
  es: { title: 'Videos de combates de Cathy', sub: 'Vídeos y discusión por asalto', comments: 'Comentarios', send: 'Enviar', namePh: 'Escribe un comentario…', none: 'Aún no hay vídeos', general: 'Comentarios generales', coach: 'Entrenador', family: 'Familia', loading: 'Cargando…', auto: 'La página se actualiza automáticamente', tip: 'Elige tu idioma — los comentarios se traducen automáticamente. 🌐 muestra el original.', other: 'Otro idioma…', langPh: 'Escribe tu idioma', student: 'alumna', refresh: 'Actualizar', updated: 'Actualizado', newV: 'nuevos desde tu última visita', cmtsOf: 'comentarios', videosHere: 'videos de combates en este enlace', update: 'Nueva versión — toca para actualizar', boutCmt: 'comentarios del combate', clipCmt: 'comentarios del clip', vidFail: 'Error al cargar el vídeo', loadFail: 'Error de carga', noVoice: 'Grabación de voz no compatible', noMic: 'Micrófono no disponible' },
  ar: { title: 'فيديوهات مباريات كاثي', sub: 'فيديوهات ومناقشة لكل نزال', comments: 'التعليقات', send: 'إرسال', namePh: 'اكتب تعليقاً…', none: 'لا توجد فيديوهات بعد', general: 'تعليقات عامة', coach: 'المدرب', family: 'العائلة', loading: 'جارٍ التحميل…', auto: 'تتحدث الصفحة تلقائياً', tip: 'اختر لغتك — تُترجم التعليقات تلقائياً. اضغط 🌐 للأصل.', other: 'لغة أخرى…', langPh: 'اكتب لغتك', student: 'الطالبة', refresh: 'تحديث', updated: 'تم التحديث', newV: 'جديدة منذ زيارتك الأخيرة', cmtsOf: 'تعليقات', videosHere: 'فيديوهات المباريات في هذا الرابط', update: 'إصدار جديد — اضغط للتحديث', boutCmt: 'تعليقات المباراة', clipCmt: 'تعليقات المقطع', vidFail: 'فشل تحميل الفيديو', loadFail: 'فشل التحميل', noVoice: 'التسجيل الصوتي غير مدعوم', noMic: 'الميكروفون غير متاح' },
  de: { title: 'Cathys Gefechtsvideos', sub: 'Videos und Diskussion pro Gefecht', comments: 'Kommentare', send: 'Senden', namePh: 'Kommentar schreiben…', none: 'Noch keine Videos', general: 'Allgemeine Kommentare', coach: 'Trainer', family: 'Familie', loading: 'Lädt…', auto: 'Die Seite aktualisiert sich automatisch', tip: 'Sprache oben wählen — Kommentare werden automatisch übersetzt. 🌐 zeigt das Original.', other: 'Andere Sprache…', langPh: 'Ihre Sprache eingeben', student: 'Schülerin', refresh: 'Aktualisieren', updated: 'Aktualisiert', newV: 'neu seit deinem letzten Besuch', cmtsOf: 'Kommentare', videosHere: 'Gefechtsvideos unter diesem Link', update: 'Neue Version — zum Aktualisieren tippen', boutCmt: 'Kommentare zum Gefecht', clipCmt: 'Kommentare zum Clip', vidFail: 'Video konnte nicht geladen werden', loadFail: 'Laden fehlgeschlagen', noVoice: 'Sprachaufnahme nicht unterstützt', noMic: 'Mikrofon nicht verfügbar' },
  ja: { title: 'Cathyの試合動画', sub: '各試合の動画とディスカッション', comments: 'コメント', send: '送信', namePh: 'コメントを入力…', none: 'まだ動画がありません', general: '全体へのコメント', coach: 'コーチ', family: '家族', loading: '読み込み中…', auto: 'ページは自動更新されます', tip: '上で言語を選択 — コメントは自動で相互翻訳。🌐で原文表示。', other: 'その他の言語…', langPh: '言語を入力', student: '生徒', refresh: '更新', updated: '更新済み', newV: '前回の訪問以降の新着', cmtsOf: '件のコメント', videosHere: 'このリンク内の試合動画', update: '新しいバージョン — タップして更新', boutCmt: 'この試合へのコメント', clipCmt: 'この動画へのコメント', vidFail: '動画を読み込めません', loadFail: '読み込み失敗', noVoice: '音声録音はサポートされていません', noMic: 'マイクが使えません' },
  ko: { title: 'Cathy 경기 영상', sub: '경기별 영상과 토론', comments: '댓글', send: '보내기', namePh: '댓글을 입력하세요…', none: '아직 영상이 없습니다', general: '전체 댓글', coach: '코치', family: '가족', loading: '로딩 중…', auto: '페이지가 자동으로 업데이트됩니다', tip: '위에서 언어 선택 — 댓글 자동 번역. 🌐 원문 보기.', other: '기타 언어…', langPh: '언어를 입력하세요', student: '학생', refresh: '새로고침', updated: '업데이트됨', newV: '마지막 방문 이후 새 영상', cmtsOf: '댓글', videosHere: '이 링크의 경기 영상', update: '새 버전 — 탭하여 새로고침', boutCmt: '이 경기 댓글', clipCmt: '이 영상 댓글', vidFail: '영상 로드 실패', loadFail: '로드 실패', noVoice: '음성 녹음을 지원하지 않습니다', noMic: '마이크 사용 불가' },
  ru: { title: 'Видео боёв Cathy', sub: 'Видео и обсуждение каждого боя', comments: 'Комментарии', send: 'Отправить', namePh: 'Написать комментарий…', none: 'Видео пока нет', general: 'Общие комментарии', coach: 'Тренер', family: 'Семья', loading: 'Загрузка…', auto: 'Страница обновляется автоматически', tip: 'Выберите язык — комментарии переводятся автоматически. 🌐 — оригинал.', other: 'Другой язык…', langPh: 'Введите ваш язык', student: 'ученица', refresh: 'Обновить', updated: 'Обновлено', newV: 'новых с прошлого визита', cmtsOf: 'комментариев', videosHere: 'видео боёв по этой ссылке', update: 'Новая версия — нажмите для обновления', boutCmt: 'комментарии к бою', clipCmt: 'комментарии к видео', vidFail: 'Видео не загрузилось', loadFail: 'Ошибка загрузки', noVoice: 'Голосовые сообщения не поддерживаются', noMic: 'Микрофон недоступен' },
  hu: { title: 'Cathy mérkőzés videói', sub: 'Videók és beszélgetés mérkőzésenként', comments: 'Hozzászólások', send: 'Küldés', namePh: 'Írj hozzászólást…', none: 'Még nincs videó', general: 'Általános hozzászólások', coach: 'Edző', family: 'Család', loading: 'Betöltés…', auto: 'Az oldal automatikusan frissül', tip: 'Válaszd ki a nyelved — a hozzászólások automatikusan fordulnak. 🌐 az eredetihez.', other: 'Más nyelv…', langPh: 'Írd be a nyelved', student: 'tanítvány', refresh: 'Frissítés', updated: 'Frissítve', newV: 'új a legutóbbi látogatás óta', cmtsOf: 'hozzászólás', videosHere: 'mérkőzés videók ezen a linken', update: 'Új verzió — koppints a frissítéshez', boutCmt: 'mérkőzés hozzászólások', clipCmt: 'videó hozzászólásai', vidFail: 'A videó nem tölthető be', loadFail: 'Betöltés sikertelen', noVoice: 'A hangfelvétel nem támogatott', noMic: 'A mikrofon nem érhető el' },
  pt: { title: 'Vídeos dos combates da Cathy', sub: 'Vídeos e discussão por combate', comments: 'Comentários', send: 'Enviar', namePh: 'Escreva um comentário…', none: 'Ainda não há vídeos', general: 'Comentários gerais', coach: 'Treinador', family: 'Família', loading: 'A carregar…', auto: 'A página atualiza-se automaticamente', tip: 'Escolha o seu idioma — os comentários são traduzidos automaticamente. 🌐 mostra o original.', other: 'Outro idioma…', langPh: 'Escreva o seu idioma', student: 'aluna', refresh: 'Atualizar', updated: 'Atualizado', newV: 'novos desde a última visita', cmtsOf: 'comentários', videosHere: 'vídeos de combates neste link', update: 'Nova versão — toque para atualizar', boutCmt: 'comentários do combate', clipCmt: 'comentários do clipe', vidFail: 'Falha ao carregar o vídeo', loadFail: 'Falha ao carregar', noVoice: 'Gravação de voz não suportada', noMic: 'Microfone indisponível' },
  uk: { title: 'Відео поєдинків Cathy', sub: 'Відео та обговорення кожного поєдинку', comments: 'Коментарі', send: 'Надіслати', namePh: 'Написати коментар…', none: 'Відео поки немає', general: 'Загальні коментарі', coach: 'Тренер', family: 'Родина', loading: 'Завантаження…', auto: 'Сторінка оновлюється автоматично', tip: 'Оберіть мову — коментарі перекладаються автоматично. 🌐 — оригінал.', other: 'Інша мова…', langPh: 'Введіть вашу мову', student: 'учениця', refresh: 'Оновити', updated: 'Оновлено', newV: 'нових з останнього візиту', cmtsOf: 'коментарів', videosHere: 'відео поєдинків за цим посиланням', update: 'Нова версія — натисніть для оновлення', boutCmt: 'коментарі до поєдинку', clipCmt: 'коментарі до відео', vidFail: 'Відео не завантажилось', loadFail: 'Помилка завантаження', noVoice: 'Голосові повідомлення не підтримуються', noMic: 'Мікрофон недоступний' },
  pl: { title: 'Wideo walk Cathy', sub: 'Wideo i dyskusja dla każdej walki', comments: 'Komentarze', send: 'Wyślij', namePh: 'Napisz komentarz…', none: 'Brak wideo', general: 'Komentarze ogólne', coach: 'Trener', family: 'Rodzina', loading: 'Ładowanie…', auto: 'Strona aktualizuje się automatycznie', tip: 'Wybierz język — komentarze tłumaczą się automatycznie. 🌐 pokazuje oryginał.', other: 'Inny język…', langPh: 'Wpisz swój język', student: 'uczennica', refresh: 'Odśwież', updated: 'Zaktualizowano', newV: 'nowe od ostatniej wizyty', cmtsOf: 'komentarzy', videosHere: 'wideo walk pod tym linkiem', update: 'Nowa wersja — dotknij, aby odświeżyć', boutCmt: 'komentarze do walki', clipCmt: 'komentarze do klipu', vidFail: 'Nie udało się wczytać wideo', loadFail: 'Błąd ładowania', noVoice: 'Nagrywanie głosu nieobsługiwane', noMic: 'Mikrofon niedostępny' },
  fa: { title: 'ویدیوهای مبارزه کتی', sub: 'ویدیو و بحث برای هر مبارزه', comments: 'نظرات', send: 'ارسال', namePh: 'نظر بنویسید…', none: 'هنوز ویدیویی نیست', general: 'نظرات کلی', coach: 'مربی', family: 'خانواده', loading: 'در حال بارگذاری…', auto: 'صفحه به‌صورت خودکار به‌روزرسانی می‌شود', tip: 'زبان خود را انتخاب کنید — نظرات خودکار ترجمه می‌شوند. 🌐 متن اصلی.', other: 'زبان دیگر…', langPh: 'زبان خود را بنویسید', student: 'شاگرد', refresh: 'به‌روزرسانی', updated: 'به‌روزرسانی شد', newV: 'جدید از آخرین بازدید', cmtsOf: 'نظر', videosHere: 'ویدیوهای مبارزه در این لینک', update: 'نسخه جدید — برای به‌روزرسانی بزنید', boutCmt: 'نظرات این مبارزه', clipCmt: 'نظرات این ویدیو', vidFail: 'ویدیو بارگیری نشد', loadFail: 'بارگیری ناموفق', noVoice: 'ضبط صدا پشتیبانی نمی‌شود', noMic: 'میکروفون در دسترس نیست' },
  ro: { title: 'Videoclipuri meciuri Cathy', sub: 'Videoclipuri și discuții pentru fiecare asalt', comments: 'Comentarii', send: 'Trimite', namePh: 'Scrie un comentariu…', none: 'Încă nu sunt videoclipuri', general: 'Comentarii generale', coach: 'Antrenor', family: 'Familie', loading: 'Se încarcă…', auto: 'Pagina se actualizează automat', tip: 'Alege limba — comentariile se traduc automat. 🌐 arată originalul.', other: 'Altă limbă…', langPh: 'Scrie limba ta', student: 'elevă', refresh: 'Reîmprospătare', updated: 'Actualizat', newV: 'noi de la ultima vizită', cmtsOf: 'comentarii', videosHere: 'videoclipuri de meciuri pe acest link', update: 'Versiune nouă — atinge pentru reîmprospătare', boutCmt: 'comentarii despre meci', clipCmt: 'comentarii despre clip', vidFail: 'Videoclipul nu s-a încărcat', loadFail: 'Încărcare eșuată', noVoice: 'Înregistrarea vocală nu este acceptată', noMic: 'Microfon indisponibil' },
  tr: { title: "Cathy'nin Maç Videoları", sub: 'Her maç için video ve tartışma', comments: 'Yorumlar', send: 'Gönder', namePh: 'Yorum yazın…', none: 'Henüz video yok', general: 'Genel yorumlar', coach: 'Antrenör', family: 'Aile', loading: 'Yükleniyor…', auto: 'Sayfa otomatik güncellenir', tip: 'Dilinizi seçin — yorumlar otomatik çevrilir. 🌐 orijinali gösterir.', other: 'Diğer dil…', langPh: 'Dilinizi yazın', student: 'öğrenci', refresh: 'Yenile', updated: 'Güncellendi', newV: 'son ziyaretten beri yeni', cmtsOf: 'yorum', videosHere: 'bu linkteki maç videoları', update: 'Yeni sürüm — yenilemek için dokunun', boutCmt: 'maç yorumları', clipCmt: 'video yorumları', vidFail: 'Video yüklenemedi', loadFail: 'Yükleme başarısız', noVoice: 'Ses kaydı desteklenmiyor', noMic: 'Mikrofon kullanılamıyor' }
};
const LANG_NAME = {
  zh: '中文', 'zh-TW': '繁體中文', en: 'English', it: 'italiano', fr: 'français',
  es: 'español', ar: 'العربية', de: 'Deutsch', ja: '日本語', ko: '한국어',
  ru: 'русский', hu: 'magyar', pt: 'português', uk: 'українська', pl: 'polski',
  fa: 'فارسی', ro: 'română', tr: 'Türkçe'
};
// 击剑主流语言选项（顺序 = 常见度）
const LANG_OPTIONS = ['en', 'it', 'fr', 'zh', 'zh-TW', 'ja', 'ko', 'ru', 'hu', 'es', 'ar', 'de', 'pt', 'uk', 'pl', 'fa', 'ro', 'tr'];
// 项目名本地化：只翻「性别+剑种」短语，赛事名/人名保持原文
const EV_I18N = {
  zh: { "Women's Foil": '女子花剑', "Men's Foil": '男子花剑', "Women's Epee": '女子重剑', "Men's Epee": '男子重剑', "Women's Sabre": '女子佩剑', "Men's Sabre": '男子佩剑' },
  'zh-TW': { "Women's Foil": '女子花劍', "Men's Foil": '男子花劍', "Women's Epee": '女子重劍', "Men's Epee": '男子重劍', "Women's Sabre": '女子佩劍', "Men's Sabre": '男子佩劍' },
  it: { "Women's Foil": 'fioretto femminile', "Men's Foil": 'fioretto maschile', "Women's Epee": 'spada femminile', "Men's Epee": 'spada maschile', "Women's Sabre": 'sciabola femminile', "Men's Sabre": 'sciabola maschile' },
  fr: { "Women's Foil": 'fleuret femmes', "Men's Foil": 'fleuret hommes', "Women's Epee": 'épée femmes', "Men's Epee": 'épée hommes', "Women's Sabre": 'sabre femmes', "Men's Sabre": 'sabre hommes' },
  es: { "Women's Foil": 'florete femenino', "Men's Foil": 'florete masculino', "Women's Epee": 'espada femenina', "Men's Epee": 'espada masculina', "Women's Sabre": 'sable femenino', "Men's Sabre": 'sable masculino' },
  de: { "Women's Foil": 'Damenflorett', "Men's Foil": 'Herrenflorett', "Women's Epee": 'Damendegen', "Men's Epee": 'Herrendegen', "Women's Sabre": 'Damensäbel', "Men's Sabre": 'Herrensäbel' },
  ja: { "Women's Foil": '女子フルーレ', "Men's Foil": '男子フルーレ', "Women's Epee": '女子エペ', "Men's Epee": '男子エペ', "Women's Sabre": '女子サーベル', "Men's Sabre": '男子サーベル' },
  ko: { "Women's Foil": '여자 플뢰레', "Men's Foil": '남자 플뢰레', "Women's Epee": '여자 에페', "Men's Epee": '남자 에페', "Women's Sabre": '여자 사브르', "Men's Sabre": '남자 사브르' },
  ru: { "Women's Foil": 'женская рапира', "Men's Foil": 'мужская рапира', "Women's Epee": 'женская шпага', "Men's Epee": 'мужская шпага', "Women's Sabre": 'женская сабля', "Men's Sabre": 'мужская сабля' },
  hu: { "Women's Foil": 'női tőr', "Men's Foil": 'férfi tőr', "Women's Epee": 'női párbajtőr', "Men's Epee": 'férfi párbajtőr', "Women's Sabre": 'női kard', "Men's Sabre": 'férfi kard' },
  pt: { "Women's Foil": 'florete feminino', "Men's Foil": 'florete masculino', "Women's Epee": 'espada feminina', "Men's Epee": 'espada masculina', "Women's Sabre": 'sabre feminino', "Men's Sabre": 'sabre masculino' },
  uk: { "Women's Foil": 'жіноча рапіра', "Men's Foil": 'чоловіча рапіра', "Women's Epee": 'жіноча шпага', "Men's Epee": 'чоловіча шпага', "Women's Sabre": 'жіноча шабля', "Men's Sabre": 'чоловіча шабля' },
  pl: { "Women's Foil": 'floret kobiet', "Men's Foil": 'floret mężczyzn', "Women's Epee": 'szpada kobiet', "Men's Epee": 'szpada mężczyzn', "Women's Sabre": 'szabla kobiet', "Men's Sabre": 'szabla mężczyzn' },
  fa: { "Women's Foil": 'فلوره زنان', "Men's Foil": 'فلوره مردان', "Women's Epee": 'اپه زنان', "Men's Epee": 'اپه مردان', "Women's Sabre": 'سابر زنان', "Men's Sabre": 'سابر مردان' },
  ro: { "Women's Foil": 'floretă feminin', "Men's Foil": 'floretă masculin', "Women's Epee": 'spadă feminin', "Men's Epee": 'spadă masculin', "Women's Sabre": 'sabie feminin', "Men's Sabre": 'sabie masculin' },
  tr: { "Women's Foil": 'kadınlar flöre', "Men's Foil": 'erkekler flöre', "Women's Epee": 'kadınlar epe', "Men's Epee": 'erkekler epe', "Women's Sabre": 'kadınlar kılıç', "Men's Sabre": 'erkekler kılıç' },
  ar: { "Women's Foil": 'سلاح الشيش سيدات', "Men's Foil": 'سلاح الشيش رجال', "Women's Epee": 'سلاح المبارزة سيدات', "Men's Epee": 'سلاح المبارزة رجال', "Women's Sabre": 'سلاح السيف سيدات', "Men's Sabre": 'سلاح السيف رجال' }
};
// 家庭模式（家长 / Cathy 端）与对话功能的补充文案
const FAM_I18N = {
  zh: { famTitle: 'Cathy 家庭 · 教练对话', famTip: '每位教练一个对话窗口，教练之间互相看不到。发送前选好是 Cathy 还是家长在说话。', all: '全部', pickCoach: '先选一位教练再回复', keyMissing: '这台设备还没有家庭钥匙，请从击剑助手里打开', noCmt: '还没有留言', newc: '新', newCmts: '条新留言', sendFail: '发送失败，请重试', family: '家长', notSynced: '这个视频还没同步到教练页。请返回击剑助手，确认视频已「共享」后再打开。' },
  en: { famTitle: 'Cathy · Family & Coaches', famTip: 'One conversation per coach; coaches cannot see each other. Choose whether Cathy or a parent is speaking before you send.', all: 'All', pickCoach: 'Pick a coach to reply', keyMissing: 'This device has no family key — open it from the Cathy app', noCmt: 'No comments yet', newc: 'new', newCmts: 'new comments', sendFail: 'Send failed, please retry', notSynced: 'This video has not been shared yet.' }
};
FAM_I18N['zh-TW'] = FAM_I18N.zh;
// 点评标签：优点/问题/步法/进攻/防守/时机/距离/战术（key 固定，按语言显示）
const TAG_I18N = {
  zh: { good: '优点', issue: '问题', footwork: '步法', attack: '进攻', defense: '防守', timing: '时机', distance: '距离', tactic: '战术' },
  'zh-TW': { good: '優點', issue: '問題', footwork: '步法', attack: '進攻', defense: '防守', timing: '時機', distance: '距離', tactic: '戰術' },
  en: { good: 'Good', issue: 'Issue', footwork: 'Footwork', attack: 'Attack', defense: 'Defense', timing: 'Timing', distance: 'Distance', tactic: 'Tactics' },
  it: { good: 'Bene', issue: 'Da correggere', footwork: 'Gioco di gambe', attack: 'Attacco', defense: 'Difesa', timing: 'Tempo', distance: 'Distanza', tactic: 'Tattica' },
  fr: { good: 'Bien', issue: 'À corriger', footwork: 'Jeu de jambes', attack: 'Attaque', defense: 'Défense', timing: 'Timing', distance: 'Distance', tactic: 'Tactique' },
  es: { good: 'Bien', issue: 'A corregir', footwork: 'Juego de pies', attack: 'Ataque', defense: 'Defensa', timing: 'Tiempo', distance: 'Distancia', tactic: 'Táctica' },
  de: { good: 'Gut', issue: 'Verbessern', footwork: 'Beinarbeit', attack: 'Angriff', defense: 'Verteidigung', timing: 'Timing', distance: 'Distanz', tactic: 'Taktik' },
  ja: { good: '良い点', issue: '課題', footwork: 'フットワーク', attack: '攻撃', defense: '防御', timing: 'タイミング', distance: '距離', tactic: '戦術' },
  ko: { good: '좋은 점', issue: '개선점', footwork: '풋워크', attack: '공격', defense: '수비', timing: '타이밍', distance: '거리', tactic: '전술' },
  ru: { good: 'Хорошо', issue: 'Ошибка', footwork: 'Работа ног', attack: 'Атака', defense: 'Защита', timing: 'Тайминг', distance: 'Дистанция', tactic: 'Тактика' },
  hu: { good: 'Jó', issue: 'Hiba', footwork: 'Lábmunka', attack: 'Támadás', defense: 'Védekezés', timing: 'Időzítés', distance: 'Táv', tactic: 'Taktika' },
  pt: { good: 'Bom', issue: 'A corrigir', footwork: 'Jogo de pés', attack: 'Ataque', defense: 'Defesa', timing: 'Tempo', distance: 'Distância', tactic: 'Tática' },
  uk: { good: 'Добре', issue: 'Помилка', footwork: 'Робота ніг', attack: 'Атака', defense: 'Захист', timing: 'Таймінг', distance: 'Дистанція', tactic: 'Тактика' },
  pl: { good: 'Dobrze', issue: 'Błąd', footwork: 'Praca nóg', attack: 'Atak', defense: 'Obrona', timing: 'Timing', distance: 'Dystans', tactic: 'Taktyka' },
  fa: { good: 'خوب', issue: 'مشکل', footwork: 'کار پا', attack: 'حمله', defense: 'دفاع', timing: 'زمان‌بندی', distance: 'فاصله', tactic: 'تاکتیک' },
  ro: { good: 'Bine', issue: 'De corectat', footwork: 'Mișcarea picioarelor', attack: 'Atac', defense: 'Apărare', timing: 'Timing', distance: 'Distanță', tactic: 'Tactică' },
  tr: { good: 'İyi', issue: 'Düzeltilecek', footwork: 'Ayak çalışması', attack: 'Saldırı', defense: 'Savunma', timing: 'Zamanlama', distance: 'Mesafe', tactic: 'Taktik' },
  ar: { good: 'جيد', issue: 'ملاحظة', footwork: 'حركة القدمين', attack: 'هجوم', defense: 'دفاع', timing: 'التوقيت', distance: 'المسافة', tactic: 'الخطة' }
};
// 校验语言代码/自定义语言名
function validLang(l) { return typeof l === 'string' && /^[a-zA-Z\u4e00-\u9fff\u0600-\u06ff\- ]{2,30}$/.test(l) && l.length <= 30; }
// 非内置语言的 UI 文案：AI 翻译一次后缓存到 R2
async function getUILang(env, lang) {
  if (COACH_I18N[lang]) return COACH_I18N[lang];
  const cacheKey = `coach/ui_v3_${encodeURIComponent(lang)}.json`;
  const cached = await readJson(env, cacheKey);
  if (cached) return cached;
  try {
    const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [
        { role: 'system', content: `Translate this JSON's values into ${LANG_NAME[lang] || lang}. Keep keys unchanged. Output ONLY valid JSON.` },
        { role: 'user', content: JSON.stringify(COACH_I18N.en) }
      ],
      max_tokens: 2500
    });
    const raw = (res && res.response || '').trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const ui = m ? JSON.parse(m[0]) : null;
    if (ui && ui.title) { await writeJson(env, cacheKey, ui); return ui; }
  } catch (e) {}
  return COACH_I18N.en;
}

async function readJson(env, key) {
  const o = await env.VIDEOS.get(key);
  if (!o) return null;
  try { return JSON.parse(await o.text()); } catch (e) { return null; }
}
async function writeJson(env, key, obj) {
  await env.VIDEOS.put(key, JSON.stringify(obj), { httpMetadata: { contentType: 'application/json' } });
}

// ===== 家庭钥匙 + 教练名单（存 R2，不进公开仓库）=====
// coach/family.json = { hash }（家庭钥匙 SHA-256）；coach/registry.json = [{ id, token, name, lang, createdAt }]
// coach/family_reads.json = { "<coachId>|<boutId>": ISO 时间 }（家长端已读位置）
const TOKEN_RE = /^[a-z0-9]{16,64}$/i;
async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// 家庭钥匙开关：用户决定不需要（2026-09-30），设为 false 时家长端操作不再校验钥匙；改回 true 即恢复
const FAMILY_KEY_REQUIRED = false;
async function famOK(env, fk) {
  if (!FAMILY_KEY_REQUIRED) return true;
  if (typeof fk !== 'string' || fk.length < 32 || fk.length > 128) return false;
  const f = await readJson(env, 'coach/family.json');
  return !!(f && f.hash && f.hash === await sha256hex(fk));
}
function newToken() { return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function getReg(env) { return (await readJson(env, 'coach/registry.json')) || []; }
// 家长端操作某教练线程：按 coachId（或旧的 token）在名单里找
async function regCoach(env, body) {
  const reg = await getReg(env);
  return reg.find(c => (body.coachId && c.id === body.coachId) || (body.token && c.token === body.token)) || null;
}

async function translate(env, text, targetLang, maxTokens, properNounMode) {
  if (!env.AI || !text) return text;
  const sys = properNounMode
    ? `Translate the following fencing tournament name / category / city into ${LANG_NAME[targetLang] || targetLang || 'English'}. Translate the whole phrase including the tournament name itself (transliterate brand names if needed, e.g. 京跃杯 = Jingyue Cup). Output ONLY the translation, no explanation, no quotes. Keep age groups (U8/U10/Y-14/Cadet), weapon names (Foil), scores and numbers unchanged.`
    : `You translate messages between a fencing coach and a young fencer's family (foil/épée/sabre). Translate the user's text into ${LANG_NAME[targetLang] || targetLang || 'English'}, using correct fencing terminology (e.g. Italian "parata" = parry, "stoccata" = hit/touch, "affondo" = lunge; 防守/格挡 = parry, 弓步 = lunge). Output ONLY the translation, no explanation, no quotes. Keep names/numbers/scores as-is. If the text is already in the target language, output it unchanged. FORMATTING RULES: if the text contains 【...】 section markers, keep the 【】 brackets exactly and translate only the title inside. Preserve paragraph breaks (blank lines), list numbering, and Q：/A： or 问：/答： prefixes exactly.`;
  try {
    const res = await env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: text }
      ],
      max_tokens: maxTokens || 512
    });
    const t = (res && res.response) ? res.response.trim() : '';
    return t || text;
  } catch (e) { return text; }
}

function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

      const reqUrl = new URL(request.url);

      // ===== Service Worker：视频本地缓存 =====
      if (request.method === 'GET' && reqUrl.pathname === '/sw.js') {
        return new Response(SW_SRC, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
      }

      // ===== 教练视频页 =====
      if (request.method === 'GET' && reqUrl.pathname.startsWith('/coach/')) {
        const token = decodeURIComponent(reqUrl.pathname.slice('/coach/'.length)).replace(/\/+$/, '');
        if (!/^[a-z0-9]{16,64}$/i.test(token)) return new Response('invalid link', { status: 403 });
        const meta = await readJson(env, `coach/meta_${token}.json`);
        if (!meta) return new Response('link expired or invalid', { status: 404 });
        const t = await getUILang(env, meta.lang || 'en');
        return new Response(renderCoachPage(token, meta, t), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      }

      // 教练页数据（feed + 该教练的留言串）
      if (request.method === 'GET' && reqUrl.pathname.startsWith('/coach-data/')) {
        const token = decodeURIComponent(reqUrl.pathname.slice('/coach-data/'.length)).replace(/\/+$/, '');
        if (!/^[a-z0-9]{16,64}$/i.test(token)) return json({ error: 'invalid' }, 403);
        const meta = await readJson(env, `coach/meta_${token}.json`);
        if (!meta) return json({ error: 'invalid' }, 404);
        let feed = await readJson(env, 'coach/feed.json') || { videos: [] };
        const comments = await readJson(env, `coach/comments_${token}.json`) || [];
        // 家长留言显示为教练语言版本；同语言直接显示原文，缺翻译时现翻并缓存回写
        const lang = meta.lang || 'en';
        const familyLang = feed.familyLang || 'zh';
        // 内容级翻译：理念 / 档案 / 中文赛事名 → 教练语言，译文缓存进 feed.tx（每语言翻一次）
        // zh-* 一律不翻；ja/ko 目标语本身含汉字，不能用「含中文=失败」校验
        if (feed && !String(lang).startsWith('zh')) {
          const cjk = /[\u4e00-\u9fff]/;
          feed.tx = feed.tx || {};
          const tx = feed.tx[lang] = feed.tx[lang] || {};
          let fdirty = false;
          const cjkTarget = /^(ja|ko|yue)/.test(lang);
          // CJK 目标语（日/韩）译文天然含汉字，不能查「含中文」——改查「译文≠原文」，原样回吐视为失败
          const okTx = (r, src) => r && r.trim() !== '' && (cjkTarget ? String(r).trim() !== String(src || '').trim() : !cjk.test(r));
          const jobs = [];
          if (feed.philosophy && cjk.test(feed.philosophy.text || '') && (tx.philosophyAt !== feed.philosophy.updatedAt || tx.philV !== 2)) {
            jobs.push(async () => {
              const r = await translate(env, feed.philosophy.text, lang, 2048);
              if (okTx(r, feed.philosophy.text)) { tx.philosophy = r; tx.philosophyAt = feed.philosophy.updatedAt || ''; tx.philV = 2; fdirty = true; }
            });
          }
          if (feed.bio && cjk.test(feed.bio.text || '') && (tx.bioAt !== (feed.bio.generatedAt || feed.bio.updatedAt) || tx.bioV !== 2)) {
            jobs.push(async () => {
              const r = await translate(env, feed.bio.text, lang, 2048);
              if (okTx(r, feed.bio.text)) { tx.bio = r; tx.bioAt = feed.bio.generatedAt || feed.bio.updatedAt || ''; tx.bioV = 2; fdirty = true; }
            });
          }
          const txfN = async (s, mt) => {
            // 中文引号/括号容易让模型整句回吐原文，先转 ASCII
            const src = String(s).replace(/[“”「」『』]/g, '"').replace(/[（）]/g, m => m === '（' ? '(' : ')');
            const r = await translate(env, src, lang, mt || 128, true);
            return okTx(r, src) ? r : null;
          };
          // 视频卡上的中文赛事/项目名
          tx.videos = tx.videos || {};
          for (const v of feed.videos || []) {
            if (!v || !v.id) continue;
            const cv = tx.videos[v.id];
            const cvBad = (val, src) => !val || (cjkTarget ? String(val).trim() === String(src || '').trim() : cjk.test(val));
            if (cv && !cvBad(cv.tournament, v.tournament) && !cvBad(cv.event, v.event)) continue; // 已有有效译文
            if (!cjk.test((v.tournament || '') + (v.event || ''))) continue;
            jobs.push(async () => {
              const ve = tx.videos[v.id] = tx.videos[v.id] || {};
              let ch = false;
              if (v.tournament && cjk.test(v.tournament) && cvBad(ve.tournament, v.tournament)) { const r = await txfN(v.tournament); if (r) { ve.tournament = r; ch = true; } }
              if (v.event && cjk.test(v.event) && cvBad(ve.event, v.event)) { const r = await txfN(v.event); if (r) { ve.event = r; ch = true; } }
              if (ch) fdirty = true;
            });
          }
          tx.career = tx.career || {};
          // 赛事字段批量翻：编号清单一次调用翻全部未翻字段（逐条翻 26x4 次调用必超时）
          jobs.push(async () => {
            const sBad = (val, src) => !val || (cjkTarget ? String(val).trim() === String(src || '').trim() : cjk.test(val));
            const stuck = [];
            for (let i = 0; i < (feed.career || []).length; i++) {
              const e = feed.career[i], ce = tx.career[i] || {};
              for (const f of ['name', 'event', 'level', 'city']) {
                if (e && typeof e[f] === 'string' && cjk.test(e[f]) && sBad(ce[f], e[f])) stuck.push({ i, f, s: e[f] });
              }
            }
            if (!stuck.length) return;
            // 一次最多 20 条防输出截断，多的下轮再翻
            const chunk = stuck.slice(0, 20);
            const list = chunk.map((x, n) => `${n + 1}. ${x.s}`).join('\n');
            const batch = await translate(env, list, lang, 2048, true);
            if (!batch || batch === list) return;
            const lines = String(batch).split(/\n+/).map(l => l.replace(/^\s*\d+[.、)）]?\s*/, '').trim());
            chunk.forEach((x, n) => {
              const v = lines[n];
              if (v && v.trim() !== '' && (cjkTarget ? v !== x.s : !cjk.test(v))) { tx.career[x.i] = tx.career[x.i] || {}; tx.career[x.i][x.f] = v; fdirty = true; }
            });
          });
          // 请求内限时跑翻译（避免一个请求几十次 AI 调用超时→整页无数据），剩余后台跑
          const t0 = Date.now();
          while (jobs.length && Date.now() - t0 < 8000) { try { await jobs.shift()(); } catch (e) {} }
          // 后台任务边跑边存（一次写几十条可能被 waitUntil 中途掐掉，最后才写会全丢）
          const rest = jobs.length;
          const finish = async () => {
            while (jobs.length) {
              try { await jobs.shift()(); } catch (e) {}
              if (fdirty) { try { await writeJson(env, 'coach/feed.json', feed); fdirty = false; } catch (e) {} }
            }
          };
          if (rest && ctx && ctx.waitUntil) { ctx.waitUntil(finish()); }
          else if (rest) { await finish(); }
          else if (fdirty) { try { await writeJson(env, 'coach/feed.json', feed); } catch (e) {} }
          // 返回译文版（client 不用改）
          const tFeed = Object.assign({}, feed);
          if (tx.philosophy && feed.philosophy) tFeed.philosophy = Object.assign({}, feed.philosophy, { text: tx.philosophy });
          if (tx.bio && feed.bio) tFeed.bio = Object.assign({}, feed.bio, { text: tx.bio });
          if (Object.keys(tx.career).length) tFeed.career = (feed.career || []).map((e, i) => tx.career[i] ? Object.assign({}, e, tx.career[i]) : e);
          if (Object.keys(tx.videos).length) tFeed.videos = (feed.videos || []).map(v => (v && tx.videos[v.id]) ? Object.assign({}, v, tx.videos[v.id]) : v);
          feed = tFeed;
        }
        let dirty = false;
        const shown = [];
        const cmtJobs = [];
        for (const c of comments) {
          if (c.author !== 'coach' && lang !== familyLang && c.text && c.text !== '🎤') {
            c.translations = c.translations || {};
            if (!c.translations[lang]) {
              // 限时补翻：新语言第一次打开可能几十条留言，逐条翻会超时
              cmtJobs.push(async () => { c.translations[lang] = await translate(env, c.text, lang); dirty = true; });
            }
            shown.push({ ...c, display: c.translations[lang] || c.text, orig: c.translations[lang] ? c.text : null });
          } else {
            shown.push({ ...c, display: c.text, orig: null });
          }
        }
        if (cmtJobs.length) {
          const ct0 = Date.now();
          while (cmtJobs.length && Date.now() - ct0 < 6000) { try { await cmtJobs.shift()(); } catch (e) {} }
          const crest = cmtJobs.length;
          const cfinish = async () => { while (cmtJobs.length) { try { await cmtJobs.shift()(); } catch (e) {} } if (dirty) await writeJson(env, `coach/comments_${token}.json`, comments); };
          if (crest && ctx && ctx.waitUntil) ctx.waitUntil(cfinish());
          else if (crest) await cfinish();
          else if (dirty) { try { await writeJson(env, `coach/comments_${token}.json`, comments); } catch (e) {} }
        }
        return json({ meta, feed, comments: shown, v: PAGE_VERSION });
      }

      // 家庭模式页面（家长 / Cathy）：钥匙放在网址 # 后面，只在浏览器里用，不经过服务器日志
      if (request.method === 'GET' && (reqUrl.pathname === '/family' || reqUrl.pathname === '/family/')) {
        const feed = await readJson(env, 'coach/feed.json') || {};
        const lang = COACH_I18N[feed.familyLang] ? feed.familyLang : 'zh';
        return new Response(renderCoachPage(null, { name: '', lang }, COACH_I18N[lang], 'family'), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      }

      // GET /video/<key> — R2 视频流式播放（支持 Range 拖进度，key 为不可猜随机串）
      if (request.method === 'GET' && reqUrl.pathname.startsWith('/video/')) {
        const key = decodeURIComponent(reqUrl.pathname.slice('/video/'.length));
        if (!key || key.includes('..')) return new Response('forbidden', { status: 403 });
        if (!env.VIDEOS) return new Response('videos not configured', { status: 503 });
        const obj = request.headers.get('Range')
          ? await env.VIDEOS.get(key, { range: request.headers })
          : await env.VIDEOS.get(key);
        if (!obj) return new Response('not found', { status: 404 });
        const h = new Headers();
        obj.writeHttpMetadata(h);
        h.set('Access-Control-Allow-Origin', '*');
        h.set('Accept-Ranges', 'bytes');
        h.set('Cache-Control', 'public, max-age=86400');
        let status = 200;
        if (obj.range && request.headers.get('Range')) {
          status = 206;
          const r = obj.range;
          let start, end;
          if (r.suffix !== undefined) { start = Math.max(0, obj.size - r.suffix); end = obj.size - 1; }
          else { start = r.offset || 0; end = start + (r.length || obj.size) - 1; }
          h.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
          h.set('Content-Length', String(end - start + 1));
        } else {
          h.set('Content-Length', String(obj.size));
        }
        return new Response(obj.body, { status, headers: h });
      }

      // POST /video-part?key=&uploadId=&part= — multipart 分片上传（原始二进制 body）
      if (request.method === 'POST' && reqUrl.pathname === '/video-part') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const key = reqUrl.searchParams.get('key') || '';
        const uploadId = reqUrl.searchParams.get('uploadId') || '';
        const part = parseInt(reqUrl.searchParams.get('part') || '0', 10);
        if (!key || key.includes('..') || !uploadId || !part) return json({ error: 'bad request' }, 400);
        const data = await request.arrayBuffer();
        if (data.byteLength > 30 * 1024 * 1024) return json({ error: 'chunk too large' }, 413);
        const mpu = env.VIDEOS.resumeMultipartUpload(key, uploadId);
        const r = await mpu.uploadPart(part, data);
        return json({ etag: r.etag, partNumber: r.partNumber });
      }

      if (request.method !== 'POST') return new Response('OK', { headers: CORS_HEADERS });

      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'invalid body' }, 400); }

      if (body.action === 'video_init') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const name = String(body.name || 'video').slice(0, 120);
        const ext = (name.match(/\.[a-z0-9]+$/i) || ['.mp4'])[0].toLowerCase();
        const rand = [...crypto.getRandomValues(new Uint8Array(20))].map(b => b.toString(16).padStart(2, '0')).join('');
        const key = `videos/${rand}${ext}`;
        const mpu = await env.VIDEOS.createMultipartUpload(key, {
          httpMetadata: { contentType: body.contentType || 'video/mp4' },
          customMetadata: { name: encodeURIComponent(name) }
        });
        return json({ key, uploadId: mpu.uploadId });
      }

      if (body.action === 'video_complete') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const { key, uploadId, parts } = body;
        if (!key || !uploadId || !Array.isArray(parts) || !parts.length) return json({ error: 'bad request' }, 400);
        const mpu = env.VIDEOS.resumeMultipartUpload(key, uploadId);
        await mpu.complete(parts);
        return json({ ok: true, key, url: `${reqUrl.origin}/video/${key}` });
      }

      if (body.action === 'video_abort') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const mpu = env.VIDEOS.resumeMultipartUpload(body.key || '', body.uploadId || '');
        try { await mpu.abort(); } catch (e) {}
        return json({ ok: true });
      }

      if (body.action === 'video_stat') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const key = String(body.key || '');
        if (!key.startsWith('videos/')) return json({ error: 'forbidden' }, 403);
        const obj = await env.VIDEOS.head(key);
        return json({ exists: !!obj, size: obj ? obj.size : 0 });
      }

      // ===== 家庭钥匙：首次初始化（仅在未设置时可用）=====
      if (body.action === 'family_init') {
        if (await readJson(env, 'coach/family.json')) return json({ error: 'already initialized' }, 403);
        const fk = String(body.fk || '');
        if (fk.length < 32 || fk.length > 128) return json({ error: 'bad key' }, 400);
        await writeJson(env, 'coach/family.json', { hash: await sha256hex(fk), createdAt: new Date().toISOString() });
        return json({ ok: true });
      }

      // ===== 以下家长端操作全部需要家庭钥匙 =====
      const FAMILY_ACTIONS = ['family_data', 'family_seen', 'coach_create', 'coach_import', 'coach_rename', 'coach_revoke', 'coach_rotate', 'coach_register', 'feed_save', 'video_delete', 'comments_get'];
      if (FAMILY_ACTIONS.includes(body.action) && !(await famOK(env, body.fk))) return json({ error: 'family key required' }, 401);

      // 家长端数据：feed + 教练名单 + 全部教练的留言（每条带 coachId）+ 已读位置
      if (body.action === 'family_data') {
        const reg = await getReg(env);
        const feed = await readJson(env, 'coach/feed.json') || { videos: [] };
        const comments = [];
        for (const c of reg) {
          const list = (await readJson(env, `coach/comments_${c.token}.json`)) || [];
          list.forEach(x => comments.push(Object.assign({}, x, { coachId: c.id })));
        }
        const coaches = [];
        for (const c of reg) {
          const m = await readJson(env, `coach/meta_${c.token}.json`) || {};
          coaches.push({ id: c.id, token: c.token, name: m.name || c.name, lang: m.lang || c.lang || 'en', createdAt: c.createdAt, lastSeen: m.lastSeen || null });
        }
        const reads = (await readJson(env, 'coach/family_reads.json')) || {};
        return json({ feed, coaches, comments, reads, v: PAGE_VERSION });
      }

      // 家长端已读：keys = ["<coachId>|<boutId>", ...]
      if (body.action === 'family_seen') {
        const keys = Array.isArray(body.keys) ? body.keys.filter(k => typeof k === 'string' && k.length < 400).slice(0, 50) : [];
        if (!keys.length) return json({ ok: true });
        const reads = (await readJson(env, 'coach/family_reads.json')) || {};
        const now = new Date().toISOString();
        keys.forEach(k => { reads[k] = now; });
        await writeJson(env, 'coach/family_reads.json', reads);
        return json({ ok: true, ts: now });
      }

      // ===== 教练链接管理（家庭钥匙）=====
      if (body.action === 'coach_create') {
        const name = String(body.name || '').slice(0, 60).trim();
        const lang = validLang(String(body.lang || '')) ? String(body.lang) : 'en';
        if (!name) return json({ error: 'bad request' }, 400);
        const token = newToken();
        const now = new Date().toISOString();
        await writeJson(env, `coach/meta_${token}.json`, { name, lang, createdAt: now });
        const reg = await getReg(env);
        const c = { id: 'co_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), token, name, lang, createdAt: now };
        reg.push(c);
        await writeJson(env, 'coach/registry.json', reg);
        return json({ ok: true, coach: c });
      }

      // 把已有教练（旧 token）登记进名单（迁移用，幂等）
      if (body.action === 'coach_import') {
        const reg = await getReg(env);
        const added = [];
        for (const x of (Array.isArray(body.coaches) ? body.coaches : [])) {
          const token = String(x.token || '');
          if (!TOKEN_RE.test(token) || reg.some(c => c.token === token)) continue;
          const meta = await readJson(env, `coach/meta_${token}.json`);
          if (!meta) continue;
          const c = { id: 'co_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), token, name: meta.name || String(x.name || ''), lang: meta.lang || 'en', createdAt: x.createdAt || meta.createdAt || new Date().toISOString() };
          reg.push(c); added.push(c);
        }
        await writeJson(env, 'coach/registry.json', reg);
        return json({ ok: true, added: added.length, coaches: reg });
      }

      if (body.action === 'coach_rename') {
        const name = String(body.name || '').slice(0, 60).trim();
        const reg = await getReg(env);
        const c = reg.find(x => x.id === body.coachId);
        if (!c || !name) return json({ error: 'bad request' }, 400);
        c.name = name;
        const meta = await readJson(env, `coach/meta_${c.token}.json`);
        if (meta) { meta.name = name; await writeJson(env, `coach/meta_${c.token}.json`, meta); }
        await writeJson(env, 'coach/registry.json', reg);
        return json({ ok: true });
      }

      if (body.action === 'coach_revoke') {
        const reg = await getReg(env);
        const c = reg.find(x => x.id === body.coachId);
        if (!c) return json({ error: 'not found' }, 404);
        await env.VIDEOS.delete(`coach/meta_${c.token}.json`);
        await writeJson(env, 'coach/registry.json', reg.filter(x => x.id !== c.id));
        return json({ ok: true });
      }

      // 换新链接：留言和设置搬到新 token，旧链接立即失效
      if (body.action === 'coach_rotate') {
        const reg = await getReg(env);
        const c = reg.find(x => x.id === body.coachId);
        if (!c) return json({ error: 'not found' }, 404);
        const old = c.token, token = newToken();
        const meta = (await readJson(env, `coach/meta_${old}.json`)) || { name: c.name, lang: c.lang || 'en', createdAt: c.createdAt };
        const list = (await readJson(env, `coach/comments_${old}.json`)) || [];
        await writeJson(env, `coach/comments_${token}.json`, list);
        await writeJson(env, `coach/meta_${token}.json`, meta);
        c.token = token;
        await writeJson(env, 'coach/registry.json', reg);
        await env.VIDEOS.delete(`coach/meta_${old}.json`);
        await env.VIDEOS.delete(`coach/comments_${old}.json`);
        return json({ ok: true, coach: c });
      }

      // 旧接口：App 本地生成 token 后登记（保留兼容，需家庭钥匙）
      if (body.action === 'coach_register') {
        const token = String(body.token || '');
        const name = String(body.name || '').slice(0, 60);
        const lang = String(body.lang || 'en');
        if (!TOKEN_RE.test(token) || !name || !COACH_I18N[lang]) return json({ error: 'bad request' }, 400);
        await writeJson(env, `coach/meta_${token}.json`, { name, lang, createdAt: new Date().toISOString() });
        return json({ ok: true });
      }

      // 教练自助切换语言（内置 18 种 + 自定义语言名）
      if (body.action === 'coach_setlang') {
        const token = String(body.token || '');
        const lang = String(body.lang || '');
        if (!TOKEN_RE.test(token) || !validLang(lang)) return json({ error: 'bad request' }, 400);
        const meta = await readJson(env, `coach/meta_${token}.json`);
        if (!meta) return json({ error: 'invalid link' }, 404);
        meta.lang = lang;
        await writeJson(env, `coach/meta_${token}.json`, meta);
        return json({ ok: true });
      }

      // 教练页打开后回写 lastSeen，用于「自上次访问新增视频」标记
      if (body.action === 'coach_seen') {
        const token = String(body.token || '');
        if (!TOKEN_RE.test(token)) return json({ error: 'bad request' }, 400);
        const meta = await readJson(env, `coach/meta_${token}.json`);
        if (!meta) return json({ error: 'invalid link' }, 404);
        meta.lastSeen = new Date().toISOString();
        await writeJson(env, `coach/meta_${token}.json`, meta);
        return json({ ok: true });
      }

      if (body.action === 'feed_save') {
        const feed = body.feed;
        if (!feed || !Array.isArray(feed.videos)) return json({ error: 'bad request' }, 400);
        // 旧版客户端不带 philosophy/bio/opponents/career 字段——整体覆盖会把这些清空，这里做字段级保留
        const old = await readJson(env, 'coach/feed.json');
        if (old) {
          ['philosophy', 'bio', 'opponents', 'tx'].forEach(k => {
            if (feed[k] == null && old[k] != null) feed[k] = old[k];
          });
          if ((!Array.isArray(feed.career) || !feed.career.length) && Array.isArray(old.career) && old.career.length) feed.career = old.career;
          if (feed.familyLang == null && old.familyLang != null) feed.familyLang = old.familyLang;
        }
        feed.updatedAt = new Date().toISOString();
        await writeJson(env, 'coach/feed.json', feed);
        return json({ ok: true });
      }

      if (body.action === 'video_delete') {
        if (!env.VIDEOS) return json({ error: 'videos not configured' }, 503);
        const key = String(body.key || '');
        if (!key.startsWith('videos/') || key.includes('..')) return json({ error: 'forbidden' }, 403);
        await env.VIDEOS.delete(key);
        return json({ ok: true });
      }

      // 定位留言所属线程：教练用自己的 token；家长/Cathy 必须带家庭钥匙 + coachId
      async function threadOf(asFamily) {
        if (asFamily) {
          if (!(await famOK(env, body.fk))) return { err: json({ error: 'family key required' }, 401) };
          const c = await regCoach(env, body);
          if (!c) return { err: json({ error: 'coach not found' }, 404) };
          const meta = await readJson(env, `coach/meta_${c.token}.json`);
          if (!meta) return { err: json({ error: 'invalid link' }, 404) };
          return { token: c.token, meta };
        }
        const token = String(body.token || '');
        if (!TOKEN_RE.test(token)) return { err: json({ error: 'bad request' }, 400) };
        const meta = await readJson(env, `coach/meta_${token}.json`);
        if (!meta) return { err: json({ error: 'invalid link' }, 404) };
        return { token, meta };
      }

      // 留言：author 'coach'（教练页）/ 'family'（家长）/ 'cathy'（Cathy 本人），可带语音 audioUrl
      if (body.action === 'comment_add') {
        const text = String(body.text || '').slice(0, 2000).trim();
        const audioUrl = String(body.audioUrl || '');
        const author = ['family', 'cathy'].includes(body.author) ? body.author : 'coach';
        const videoId = typeof body.videoId === 'string' ? body.videoId.slice(0, 300) : null;
        if (!text && !audioUrl) return json({ error: 'bad request' }, 400);
        if (audioUrl && !audioUrl.startsWith(`${reqUrl.origin}/video/`)) return json({ error: 'bad audio url' }, 400);
        const th = await threadOf(author !== 'coach');
        if (th.err) return th.err;
        const { token, meta } = th;
        const coachLang = meta.lang || 'en';
        const feed = await readJson(env, 'coach/feed.json') || {};
        const familyLang = feed.familyLang || 'zh';
        const rec = {
          id: 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          videoId, author, text,
          ts: new Date().toISOString()
        };
        if (audioUrl) rec.audioUrl = audioUrl;
        // 打点点评：视频时间点（秒）+ 标签（可多选）
        if (typeof body.vt === 'number' && isFinite(body.vt) && body.vt >= 0 && body.vt < 86400) rec.vt = +body.vt.toFixed(2);
        if (typeof body.tag === 'string' && /^[a-z]{2,12}$/.test(body.tag)) rec.tag = body.tag;
        if (Array.isArray(body.tags)) rec.tags = body.tags.filter(t => typeof t === 'string' && /^[a-z]{2,12}$/.test(t)).slice(0, 6);
        if (typeof body.replyTo === 'string' && /^[a-z0-9_]{4,40}$/i.test(body.replyTo)) rec.replyTo = body.replyTo;
        rec.lang = author === 'coach' ? coachLang : familyLang;
        // 双向翻译：家长/Cathy 留言 → 翻成教练语言；教练留言 → 翻成家长语言
        if (author !== 'coach' && coachLang !== familyLang && text && text !== '🎤') {
          rec.translations = { [coachLang]: await translate(env, text, coachLang) };
          rec.coachText = rec.translations[coachLang];
        }
        if (author === 'coach' && coachLang !== familyLang && text && text !== '🎤') {
          const tt = await translate(env, text, familyLang);
          rec.translations = Object.assign(rec.translations || {}, { [familyLang]: tt });
          rec.familyText = tt;
          if (familyLang === 'zh') rec.zhText = tt;
        }
        const list = (await readJson(env, `coach/comments_${token}.json`)) || [];
        list.push(rec);
        if (list.length > 500) list.splice(0, list.length - 500);
        await writeJson(env, `coach/comments_${token}.json`, list);
        return json({ ok: true, comment: rec });
      }

      if (body.action === 'comment_del' || body.action === 'comment_tags') {
        const id = String(body.id || '');
        if (!/^[a-z0-9_]{4,40}$/i.test(id)) return json({ error: 'bad request' }, 400);
        const th = await threadOf(!!(body.fam || body.fk));
        if (th.err) return th.err;
        const key = `coach/comments_${th.token}.json`;
        const list = (await readJson(env, key)) || [];
        if (body.action === 'comment_del') {
          const kept = list.filter(c => c.id !== id);
          if (kept.length !== list.length) await writeJson(env, key, kept);
          return json({ ok: true });
        }
        const tags = Array.isArray(body.tags) ? body.tags.filter(t => typeof t === 'string' && /^[a-z]{2,12}$/.test(t)).slice(0, 8) : [];
        const c = list.find(c => c.id === id);
        if (c) { c.tags = tags; delete c.tag; await writeJson(env, key, list); }
        return json({ ok: true, tags });
      }

      if (body.action === 'comments_get') {
        const c = await regCoach(env, body);
        if (!c) return json({ error: 'coach not found' }, 404);
        const list = (await readJson(env, `coach/comments_${c.token}.json`)) || [];
        return json({ comments: list });
      }

      return json({ error: 'unknown action' }, 400);
    } catch (e) {
      return json({ error: e.message || 'internal error' }, 500);
    }
  }
};

// ===== 教练页 HTML =====
// 版本指纹：页面代码变了就自动变（用于已打开页面的「点击更新」提示）
const _pvSrc = renderCoachPage.toString() + esc.toString() + JSON.stringify(COACH_I18N) + JSON.stringify(EV_I18N) + JSON.stringify(TAG_I18N) + LANG_OPTIONS.join(',');
let _pvH = 0; for (let i = 0; i < _pvSrc.length; i++) _pvH = (_pvH * 31 + _pvSrc.charCodeAt(i)) >>> 0;
const PAGE_VERSION = _pvSrc.length.toString(36) + _pvH.toString(36);
// 布局：教练主页（教练名为主、学员副标）→ 赛事(可带官方链接,吸顶) → 对阵 → 视频片段缩略图 → 折叠留言
function renderCoachPage(token, meta, t, mode) {
  mode = mode === 'family' ? 'family' : 'coach';
  t = Object.assign({}, COACH_I18N.en, t, FAM_I18N[meta.lang] || FAM_I18N.en, mode === 'family' ? {} : { family: t.family || COACH_I18N.en.family });
  const title = mode === 'family' ? t.famTitle : 'Coach ' + meta.name + ' — ' + t.title;
  return `<!DOCTYPE html><html lang="${esc(meta.lang)}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;margin:0;background:#f1f5f9;color:#1e293b}
  .wrap{max-width:640px;margin:0 auto;padding:12px}
  .langbar{display:flex;flex-direction:column;align-items:flex-end;margin-bottom:6px}
  .langbar select{font-size:0.85rem;padding:4px 8px;border:1px solid #d1d5db;border-radius:8px;background:#fff}
  .langbar select.pulse{animation:pulse 1.6s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.55)}70%{box-shadow:0 0 0 10px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}
  .langhint{display:none;position:relative;margin-top:6px;background:#0f172a;color:#fff;font-size:0.78rem;padding:6px 12px;border-radius:10px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
  .langhint::before{content:'';position:absolute;top:-6px;right:34px;border:6px solid transparent;border-bottom-color:#0f172a;border-top:none}
  .hd{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:14px;padding:16px 16px 12px;box-shadow:0 2px 8px rgba(30,58,138,.25)}
  .cname{font-size:1.35rem;font-weight:800;letter-spacing:.2px}
  .csub{font-size:0.82rem;opacity:.85;margin-top:3px}
  .stu{display:flex;align-items:center;gap:12px;background:#fff;border-radius:12px;padding:10px 14px;margin-top:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .stu .av{width:42px;height:42px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex:none}
  .stu .sname{font-weight:700;font-size:0.95rem}
  .stu .smeta{font-size:0.75rem;color:#64748b;margin-top:1px}
  .newb{display:inline-block;margin-top:8px;background:#22c55e;color:#fff;font-size:0.72rem;font-weight:700;padding:2px 10px;border-radius:999px}
  .tip{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:10px;padding:8px 10px;font-size:0.76rem;margin:10px 0;line-height:1.5}
  .statusbar{display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:#64748b;margin:2px 2px 10px}
  .statusbar button{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer}
  .tgroup{margin-bottom:16px}
  .thead{position:sticky;top:0;z-index:5;background:#f1f5f9;padding:6px 0}
  .tname{font-weight:800;font-size:0.95rem}
  .tname a{color:#1d4ed8;text-decoration:none}
  .tname a:active{text-decoration:underline}
  .tmeta{font-size:0.72rem;color:#64748b;margin-top:1px}
  .bout{background:#fff;border-radius:12px;padding:10px 12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .bhead{font-weight:700;font-size:0.85rem;margin-bottom:8px;color:#0f172a}
  .vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  .vcell{position:relative;border-radius:10px;overflow:hidden;background:#000;aspect-ratio:16/9;cursor:pointer}
  .vcell video{width:100%;height:100%;object-fit:cover;display:block}
  .vcell img.vth{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .vcell img.vth:not([src]){display:none}
  .vcell video.thv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.01;pointer-events:none}
  .vcell video.thv.show{opacity:1}
  .vcell.nothumb{background:linear-gradient(135deg,#1e293b,#334155)}
  .segc{cursor:pointer}
  .seglab{display:inline-block;background:#e2e8f0;color:#475569;font-size:0.62rem;font-weight:700;padding:0 6px;border-radius:6px;margin-right:4px}
  .vcell .pov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.6rem;background:rgba(0,0,0,.18)}
  .vcell .dur{position:absolute;right:5px;bottom:5px;background:rgba(0,0,0,.72);color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:6px}
  .vcell .newtag{position:absolute;left:5px;top:5px;background:#ef4444;color:#fff;font-size:0.62rem;font-weight:700;padding:1px 6px;border-radius:6px}
  .vcell .vname{position:absolute;left:5px;bottom:5px;right:5px;color:#fff;font-size:0.62rem;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ytcell{display:block;border-radius:10px;background:#fee2e2;color:#991b1b;text-align:center;padding:16px 8px;font-weight:600;text-decoration:none;font-size:0.8rem}
  .cbtn{margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:5px 10px;font-size:0.76rem;color:#475569;cursor:pointer;width:100%;text-align:left}
  .cbody{display:none;margin-top:6px}
  .cbody.open{display:block}
  .vwrap{display:flex;flex-direction:column;gap:4px}
  .vbtn{border:1px solid #e2e8f0;background:#f8fafc;border-radius:7px;font-size:0.68rem;color:#475569;padding:3px 0;cursor:pointer}
  .vbtn.on{background:#dbeafe;border-color:#93c5fd;color:#1d4ed8}

  .cmt{font-size:0.84rem;padding:6px 8px;border-radius:8px;margin-bottom:4px}
  .cmt.coach{background:#eff6ff}.cmt.family{background:#f0fdf4}
  .cmt .who{font-size:0.68rem;color:#94a3b8;margin-bottom:2px}
  .cmt .tr{cursor:pointer;font-size:0.7rem;color:#3b82f6;margin-left:4px}
  .cmt .orig{margin-top:2px;padding:4px 6px;background:#f8fafc;border-radius:6px;font-size:0.78rem;color:#64748b}
  .box{display:flex;gap:6px;margin-top:6px}
  .box input{flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;box-sizing:border-box}
  .box button{padding:8px 12px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:0.85rem;cursor:pointer}
  .box .mic{background:#dcfce7;color:#166534}
  .apcbtns{display:flex;gap:8px;margin-top:8px}
  .apcbtns button{flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:12px 8px;font-size:.9rem;font-weight:600;cursor:pointer;min-height:48px}
  .rect{color:#ef4444;font-weight:700;align-self:center;flex:1;font-size:.95rem}
  .gen{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin:14px 0}
  .note{font-size:0.72rem;color:#94a3b8;text-align:center;margin:16px 0}
  .empty{background:#fff;border-radius:12px;padding:24px;text-align:center;color:#94a3b8;font-size:0.85rem}
  .car{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:14px;overflow:hidden}
  .car summary{padding:12px;cursor:pointer;font-weight:700;font-size:0.9rem;list-style:none}
  .car summary::-webkit-details-marker{display:none}
  .car .carn{font-size:0.72rem;color:#64748b;font-weight:400}
  .car .cary{padding:8px 12px 2px;font-size:0.68rem;color:#94a3b8;font-weight:700;border-top:1px solid #f1f5f9}
  .car .carr{display:flex;gap:8px;padding:7px 12px;border-top:1px solid #f8fafc;font-size:0.78rem;align-items:baseline}
  .car .card-d{color:#94a3b8;flex:none;width:44px}
  .car .card-p{flex:none;min-width:56px;font-weight:700;color:#1d4ed8}
  .car .card-b{flex:1;min-width:0}
  .car .card-c{color:#94a3b8;flex:none;font-size:0.7rem}
  .upd{display:none;position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:0.82rem;font-weight:600;padding:9px 18px;border-radius:999px;box-shadow:0 4px 14px rgba(37,99,235,.4);cursor:pointer;z-index:999;white-space:nowrap}
  /* ===== 分析播放器（点评用）===== */
  .ap{display:none;position:fixed;inset:0;background:#020617;z-index:100;overflow:auto}
  .apbox{max-width:640px;margin:0 auto;padding:12px 12px 30px;position:relative;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
  .apstick{position:sticky;top:0;z-index:60;background:rgba(2,6,23,.97);padding-top:4px;border-radius:12px}
  .apv{position:relative;background:#000;border-radius:12px;overflow:hidden;touch-action:none}
  .apv video{width:100%;display:block;max-height:52vh}
  .apflash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:2.4rem;opacity:0;pointer-events:none;transition:opacity .35s}
  .apload{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e2e8f0;font-size:.9rem;background:rgba(2,6,23,.55);pointer-events:none;z-index:5}
  .apreset{position:absolute;right:8px;bottom:8px;background:rgba(37,99,235,.9);color:#fff;border:none;border-radius:999px;padding:7px 14px;font-size:.78rem;font-weight:600;z-index:6;display:none;cursor:pointer}
  .apseek{position:relative;height:20px;margin-top:6px}
  .apseek input{width:100%;-webkit-appearance:none;appearance:none;height:4px;background:#334155;border-radius:4px;outline:none;margin:8px 0}
  .apmarks{position:absolute;left:0;right:0;top:7px;height:8px;pointer-events:none}
  .apmark{position:absolute;width:8px;height:8px;border-radius:50%;background:#ef4444;transform:translateX(-50%);pointer-events:auto;cursor:pointer}
  .aptime{color:#94a3b8;font-size:.72rem;text-align:right}
  .apctl{display:flex;gap:6px;margin-top:8px}
  .apctl button{background:#1e293b;color:#e2e8f0;border:none;border-radius:12px;padding:16px 4px;font-size:1.05rem;font-weight:600;flex:1;cursor:pointer;min-height:52px;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:none}
  .apctl button:active,.apctl button.hold{background:#2563eb;color:#fff}
  .apsp{display:flex;gap:6px;justify-content:center;margin-top:6px}
  .apsp button{background:#0f172a;color:#94a3b8;border:1px solid #334155;border-radius:999px;padding:7px 14px;font-size:.85rem;cursor:pointer;min-height:36px}
  .apsp button.on{background:#2563eb;color:#fff;border-color:#2563eb}
  .aplbl{color:#64748b;font-size:.75rem;align-self:center;margin:0 2px 0 8px}
  .apvol{display:flex;align-items:center;gap:8px;margin-top:8px;color:#94a3b8;font-size:.82rem}
  .apvol input{flex:1}
  .aptags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .aptags button{background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:999px;padding:7px 12px;font-size:.82rem;cursor:pointer;min-height:36px}
  .aptags button.on{background:#065f46;border-color:#10b981;color:#fff}
  .apclose{position:fixed;top:10px;right:12px;background:#334155;color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:1rem;z-index:101;cursor:pointer}
  .tag{display:inline-block;background:#e0e7ff;color:#3730a3;font-size:.66rem;font-weight:600;padding:0 7px;border-radius:999px;margin-right:4px}
  .anchor{color:#2563eb;font-size:.72rem;font-weight:700;margin-right:4px;cursor:pointer}
  .au{display:flex;align-items:center;gap:8px;margin:4px 0}
  .aub{background:#2563eb;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:.8rem;cursor:pointer;flex-shrink:0;padding:0}
  .aubar{flex:1;height:4px;background:#e2e8f0;border-radius:4px;overflow:hidden}
  .aupg{height:100%;background:#2563eb;width:0;transition:width .3s linear}
  .autm{font-size:.68rem;color:#64748b;min-width:62px;text-align:right;white-space:nowrap}
  .cmtcog{float:right;color:#94a3b8;cursor:pointer;padding:0 2px 0 10px;font-size:.85rem;font-weight:700}
  .cmtmenu{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;padding-top:6px;border-top:1px dashed #e2e8f0}
  .cmtmenu button{background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:999px;padding:5px 12px;font-size:.75rem;cursor:pointer;min-height:32px}
  .cmtmenu button.on{background:#065f46;border-color:#10b981;color:#fff}
  .cmtmenu button.del{background:#fee2e2;color:#b91c1c;border-color:#fecaca}
  .cmt.cathy{background:#fdf2f8}
  .cmt.unread{box-shadow:inset 3px 0 0 #ef4444}
  .wn{font-weight:700}
  .tocn{color:#64748b}
  .rep{float:right;color:#2563eb;cursor:pointer;padding:0 8px;font-weight:700;font-size:.9rem}
  .ub{display:inline-block;background:#ef4444;color:#fff;font-size:.64rem;font-weight:700;padding:0 6px;border-radius:999px;margin-left:4px;line-height:16px;vertical-align:middle}
  .apclips,.aptabs,.apscope{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
  .apclips:empty,.aptabs:empty{display:none}
  .apclips button,.aptabs button,.apscope button{background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:999px;padding:7px 12px;font-size:.82rem;cursor:pointer;min-height:36px;display:inline-flex;align-items:center;gap:6px}
  .apclips button.on,.apscope button.on{background:#2563eb;border-color:#2563eb;color:#fff}
  .aptabs button.on{background:#fff;color:#0f172a;border-color:#fff;font-weight:700}
  .ctabs{display:flex;gap:6px;margin:10px 0 12px}
  .ctabs button{flex:1;background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:10px;padding:9px 4px;font-size:.85rem;cursor:pointer;min-height:40px}
  .ctabs button.on{background:#2563eb;color:#fff;border-color:#2563eb;font-weight:700}
  .rsub{display:flex;gap:5px;margin:0 0 10px}
  .rsub button{flex:1;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:7px 2px;font-size:.78rem;cursor:pointer;min-height:34px}
  .rsub button.on{background:#1e293b;color:#fff;border-color:#1e293b;font-weight:700}
  .rq{font-weight:700;font-size:13px;color:#1e40af;margin:12px 0 4px}
  .ra{font-size:12.5px;line-height:1.75;color:#374151;margin-bottom:10px;white-space:pre-line}
  svg.cchart{width:100%;height:auto;display:block}
  .aptabs i{width:9px;height:9px;border-radius:50%;display:inline-block}
  .apempty{color:#64748b;font-size:.82rem;padding:10px 2px}
  .apcomp{position:sticky;bottom:0;background:rgba(2,6,23,.97);padding:8px 0 calc(8px + env(safe-area-inset-bottom));margin-top:8px;z-index:50;border-top:1px solid #1e293b}
  .apto{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .apto .idn{display:inline-flex;border:1px solid #334155;border-radius:999px;overflow:hidden}
  .apto .idn button{background:transparent;color:#cbd5e1;border:none;padding:8px 14px;font-size:.82rem;cursor:pointer}
  .apto .idn button.on{background:#db2777;color:#fff}
  .apto .idn button[data-k=family].on{background:#16a34a}
  .apto .tolab{color:#cbd5e1;font-size:.82rem}
  .apto .anc{background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:999px;padding:8px 12px;font-size:.8rem;cursor:pointer;margin-left:auto}
  .apto .anc.on{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
  body.embed .apclose{display:none}
  body.embed .ap .apbox{padding-top:58px}
  body.embed .wrap{padding-top:58px}
  .apcomp .aptags{display:none}
  .apcomp.composing .aptags{display:flex}
  .apcomp .apcbtns{margin-top:6px}
</style></head><body><div class="wrap">
${mode === 'family' ? '' : `<div class="langbar"><span>🌐 <select id="langSel" onchange="setLang(this.value)">${LANG_OPTIONS.map(l => `<option value="${esc(l)}"${meta.lang === l ? ' selected' : ''}>${esc(LANG_NAME[l])}</option>`).join('')}<option value="__custom"${LANG_OPTIONS.includes(meta.lang) ? '' : ' selected'}>${esc(t.other)}</option></select></span>
<div class="langhint" id="langHint">Choose your language / 选择语言 ▲<span onclick="dismissHint()" style="cursor:pointer; margin-left:8px; opacity:.7; padding:0 3px;" title="dismiss">✕</span></div></div>`}
<div class="hd">
  <div class="cname">${mode === 'family' ? '👨‍👩‍👧 ' + esc(t.famTitle) : '🛡 Coach ' + esc(meta.name)}</div>
  <span class="newb" id="newBadge" style="display:none"></span>
</div>
<div class="stu">
  <div class="av">🤺</div>
  <div><div class="sname" id="stuName">Cathy He</div><div class="smeta" id="stuLine">Foil · Vancouver · ${esc(t.videosHere)}</div></div>
</div>
<div class="tip">${mode === 'family' ? '💬 ' + esc(t.famTip) : '🤖 ' + esc(t.tip)}</div>
<div class="statusbar"><span id="upd"></span><button onclick="load(true)">⟳ ${esc(t.refresh)}</button></div>
<div class="ctabs">
  <button class="on" data-ct="v" onclick="switchCoachTab('v')">${esc(t.tabVideos || '📹 Videos')}</button>
  <button data-ct="r" onclick="switchCoachTab('r')">${esc(t.tabResults || '🏆 Results')}</button>
  <button data-ct="j" onclick="switchCoachTab('j')">${esc(t.tabJourney || '📖 Journey')}</button>
</div>
<div id="ctab-v"><div id="list"><div class="empty">${esc(t.loading)}</div></div></div>
<div id="ctab-r" style="display:none">
  <div class="rsub">
    <button class="on" data-rs="list" onclick="switchResSub('list')">${esc(t.rEvents || 'Events')}</button>
    <button data-rs="medals" onclick="switchResSub('medals')">${esc(t.rMedals || 'Medals')}</button>
    <button data-rs="place" onclick="switchResSub('place')">${esc(t.rPlace || 'Ranking')}</button>
    <button data-rs="opp" onclick="switchResSub('opp')">${esc(t.rOpp || 'Opponents')}</button>
  </div>
  <div id="career"></div>
  <div id="resSubBody"></div>
</div>
<div id="ctab-j" style="display:none"><div id="jstats"></div><div id="bio"></div><div id="phil"></div></div>
<div class="note">Cathy Fencing · ${esc(t.auto)}</div>
</div>
<div class="ap" id="ap" oncontextmenu="return false"><div class="apbox">
<button class="apclose" onclick="closeAnalysis()">✕</button>
<div class="apstick">
<div class="apv"><video id="apVideo" playsinline preload="auto" onclick="apToggle()"></video><div class="apload" id="apLoad" style="display:none">⏳ ${esc(t.loading)}</div><button class="apreset" id="apReset" onclick="apZoomReset()">⟲ 1x</button><div class="apflash" id="apFlash"></div></div>
<div class="apseek"><input type="range" id="apSeek" min="0" max="1000" value="0" oninput="apSeekIn(this)"><div class="apmarks" id="apMarks"></div></div>
<div class="aptime" id="apTime">0:00 / 0:00</div>
<div class="apctl">
  <button id="apBack" onpointerdown="hStart('s',-1,this)" onpointerup="hEnd(this)" onpointerleave="hEnd(this)" onpointercancel="hEnd(this)" oncontextmenu="return false">⏪ 5s</button>
  <button id="apFrB" onpointerdown="hStart('f',-1,this)" onpointerup="hEnd(this)" onpointerleave="hEnd(this)" onpointercancel="hEnd(this)" oncontextmenu="return false" title="点=退1帧 · 按住=连续退">⏮</button>
  <button id="apPlayBtn" onclick="apToggle()">▶</button>
  <button id="apFrF" onpointerdown="hStart('f',1,this)" onpointerup="hEnd(this)" onpointerleave="hEnd(this)" onpointercancel="hEnd(this)" oncontextmenu="return false" title="点=进1帧 · 按住=连续进">⏭</button>
  <button id="apFwd" onpointerdown="hStart('s',1,this)" onpointerup="hEnd(this)" onpointerleave="hEnd(this)" onpointercancel="hEnd(this)" oncontextmenu="return false">5s ⏩</button>
</div>
<div class="apsp" id="apSp"></div>
</div>
<div class="apvol" id="apVolRow">🔊 <input type="range" id="apVol" min="0" max="100" value="80" oninput="apVolIn(this)"></div>
<div class="apclips" id="apClips"></div>
<div class="aptabs" id="apTabs"></div>
<div class="apscope" id="apScope"></div>
<div class="cmts" id="apCmts" style="margin-top:8px"></div>
<div class="apcomp">
<div class="apto" id="apTo"></div>
<div class="aptags" id="apTags"></div>
<div class="apcbtns"><button onclick="apShowTxt()">💬 ${esc(t.comments)}</button><button onclick="apStartRec()">🎤 ${esc(t.voice || 'Voice')}</button></div>
<div class="box" id="apTxtBox" style="display:none;margin-top:6px"><input id="apInput" placeholder="${esc(t.namePh)}" oncontextmenu="event.stopPropagation()" onkeydown="if(event.keyCode===13&&!event.isComposing)apSend()"><button onclick="apSend()">${esc(t.send)}</button></div>
<div class="box" id="apRecBox" style="display:none;margin-top:6px"><span class="rect" id="apRecT">● 0:00</span><button onclick="apStopRec()">⏹ ${esc(t.send)}</button><button onclick="apCancelRec()" style="background:#475569">✕</button></div>
</div>
</div></div>
<div class="upd" id="updBar" onclick="location.reload()">🔄 ${esc(t.update || 'Update available — tap to refresh')}</div>
<script>
const TOKEN = ${JSON.stringify(token)};
const MODE = ${JSON.stringify(mode)};
const QS = new URLSearchParams(location.search);
const EMBED = QS.get("embed") === "1";
let FK = "";
if(MODE === "family"){
  const m = location.hash.match(/fk=([A-Za-z0-9_-]+)/);
  if(m){ FK = m[1]; try{ localStorage.setItem("cf_fk", FK); }catch(e){} try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){} }
  else { try{ FK = localStorage.getItem("cf_fk") || ""; }catch(e){} }
}
// 统一请求：教练端带 token，家长端带家庭钥匙
function api(body){
  const b = Object.assign({}, body, MODE === "family" ? { fk: FK, fam: 1 } : { token: TOKEN });
  return fetch("/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
}
let COACHES = [], READS = {}, IDENT = "cathy";
try{ IDENT = localStorage.getItem("cf_ident") === "family" ? "family" : "cathy"; }catch(e){}
const PAL = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2"];
function coachOf(id){ return COACHES.find(c => c.id === id); }
function coachColor(id){ const i = COACHES.findIndex(c => c.id === id); return PAL[(i < 0 ? 0 : i) % PAL.length]; }
const byTs = (a, b) => (a.ts || "").localeCompare(b.ts || "");
// 家长端显示：教练留言显示翻译，家长/Cathy 留言显示原文
function famShow(c){
  if(c.author === "coach"){ const tr = c.familyText || c.zhText || ""; return Object.assign({}, c, { display: tr || c.text, orig: tr && tr !== c.text ? c.text : null }); }
  return Object.assign({}, c, { display: c.text, orig: null });
}
// 片段 → 对阵：留言挂在片段（videoId = 片段 id）或整场（videoId = b:...）
let vidB = {}, boutClips = {};
function indexBouts(){
  vidB = {}; boutClips = {};
  vids.forEach(v => { const b = "b:" + (v.tournament || "—") + "~" + bcmtKey(v); vidB[v.id] = b; (boutClips[b] = boutClips[b] || []).push(v.id); });
}
function bOf(c){ return (c.videoId && String(c.videoId).indexOf("b:") === 0) ? c.videoId : vidB[c.videoId]; }
// 未读：家长端 = 教练的新留言（服务器记录已读位置，多台设备同步）；教练端 = 家长/Cathy 的新留言（本机记录）
let LREAD = {};
try{ LREAD = JSON.parse(localStorage.getItem("cr_" + TOKEN) || "{}"); }catch(e){}
function isUnread(c){
  const b = bOf(c);
  if(!b || String(c.id).indexOf("tmp_") === 0) return false;
  if(MODE === "family") return c.author === "coach" && (c.ts || "") > (READS[c.coachId + "|" + b] || "");
  return c.author !== "coach" && (c.ts || "") > (LREAD[b] || "");
}
function markRead(bcid){
  if(!bcid) return;
  const now = new Date().toISOString();
  if(MODE === "family"){
    const keys = COACHES.filter(co => (apCoach === "all" || apCoach === co.id) && cmts.some(c => c.coachId === co.id && bOf(c) === bcid && isUnread(c))).map(co => co.id + "|" + bcid);
    if(!keys.length) return;
    keys.forEach(k => { READS[k] = now; });
    api({ action: "family_seen", keys }).catch(function(){});
  } else {
    if(!cmts.some(c => bOf(c) === bcid && isUnread(c))) return;
    LREAD[bcid] = now;
    try{ localStorage.setItem("cr_" + TOKEN, JSON.stringify(LREAD)); }catch(e){}
  }
  render();
}
function whoLabel(c){
  if(c.author === "cathy") return "<b class='wn' style='color:#db2777'>Cathy</b>";
  if(c.author === "family") return "<b class='wn' style='color:#15803d'>" + escH(T.family) + "</b>";
  if(MODE === "family"){ const co = coachOf(c.coachId); return "<b class='wn' style='color:" + coachColor(c.coachId) + "'>🎓 " + escH(co ? co.name : T.coach) + "</b>"; }
  return "<b class='wn' style='color:#1d4ed8'>" + escH(T.coach) + "</b>";
}
function markColor(c){
  if(c.author === "cathy") return "#db2777";
  if(c.author === "family") return "#16a34a";
  return MODE === "family" ? coachColor(c.coachId) : "#ef4444";
}
const PAGE_VER = ${JSON.stringify(PAGE_VERSION)};
const T = ${JSON.stringify(t)};
const EV = ${JSON.stringify(EV_I18N[meta.lang] || {})};
const TAGS = ${JSON.stringify(TAG_I18N[meta.lang] || TAG_I18N.en)};
const TAG_ORDER = ["good","issue","footwork","attack","defense","timing","distance","tactic"];
function fmtT(s){ s=Math.max(0,s||0); return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0"); }
// 项目名本地化：只替换「性别+剑种」，赛事名/人名不动
function locEvent(s){ return String(s||"").replace(/(Women's|Men's) (Foil|Epee|Sabre)/g, x => EV[x] || x); }
let vids = [], cmts = [], lastSeen = 0, boutVid = {};
const openCmts = {};
// 首开引导：气泡+脉冲指向语言选择器，点掉或选语言后不再出现
const hintKey = "langHinted_" + TOKEN;
function dismissHint(){
  try{ localStorage.setItem(hintKey, "1"); }catch(e){}
  const lh = document.getElementById("langHint"), sel = document.getElementById("langSel");
  if(lh) lh.style.display = "none";
  if(sel) sel.classList.remove("pulse");
}
try{
  if(!localStorage.getItem(hintKey)){
    const lh = document.getElementById("langHint"), sel = document.getElementById("langSel");
    if(lh && sel){ lh.style.display = "block"; sel.classList.add("pulse"); lh.onclick = dismissHint; }
  }
}catch(e){}
function escH(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\\'":"&#39;"}[c]))}
function ago(ts){
  if(!ts) return "";
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if(s < 90) return Math.max(1, Math.round(s)) + "m";
  if(s < 3600) return Math.round(s/60) + "m";
  if(s < 86400) return Math.round(s/3600) + "h";
  return Math.round(s/86400) + "d";
}
let firstLoad = true;
if(EMBED) document.body.classList.add("embed");
// 从 App 点进来但视频还没同步到服务器：提示并每 2 秒重试，最多 5 次
function waitDeepLink(dv, n){
  const list = document.getElementById("list");
  if(vids.some(x => x.id === dv)){ openAnalysis(dv, QS.get("s") === "bout" ? "bout" : "clip"); return; }
  if(n >= 5){ list.insertAdjacentHTML("afterbegin", "<div class='empty' style='color:#b45309'>" + escH(T.notSynced) + "</div>"); return; }
  if(n === 0) list.insertAdjacentHTML("afterbegin", "<div class='empty' id='dlWait'>⏳ " + escH(T.loading) + "</div>");
  setTimeout(async function(){ await load(true); const w = document.getElementById("dlWait"); if(w && vids.some(x => x.id === dv)) w.remove(); waitDeepLink(dv, n + 1); }, 2000);
}
async function load(manual){
  try{
    let d;
    if(MODE === "family"){
      const r = await api({ action: "family_data" });
      if(r.status === 401) throw new Error(T.keyMissing);
      if(!r.ok) throw new Error("HTTP " + r.status);
      d = await r.json();
      COACHES = d.coaches || []; READS = d.reads || {};
      d.comments = (d.comments || []).map(famShow);
      lastSeen = Infinity;
    } else {
      const r = await fetch("/coach-data/" + TOKEN);
      if(!r.ok) throw new Error("HTTP " + r.status);
      d = await r.json();
      // 只取打开页面时的「上次访问」，避免 15 秒后 NEW / 未读标记被刷掉
      if(firstLoad) lastSeen = d.meta && d.meta.lastSeen ? new Date(d.meta.lastSeen).getTime() : 0;
    }
    if(!d.feed) throw new Error("no feed");
    const stu = d.feed.student;
    if(stu){
      const age = stu.birth ? Math.floor((Date.now() - new Date(stu.birth).getTime()) / 31557600000) : null;
      document.getElementById("stuName").textContent = stu.name || "Cathy He";
      document.getElementById("stuLine").textContent = [stu.weapon, stu.birth ? "🎂 " + stu.birth + (age ? " (" + age + ")" : "") : "", stu.home, T.videosHere].filter(Boolean).join(" · ");
    }
    vids = d.feed.videos || [];
    CUR_FEED = d.feed || {};
    renderCareer(CUR_FEED.career);
    renderJStats(CUR_FEED.career);
    renderBio(d.feed.bio);
    renderPhil(d.feed.philosophy);
    cmts = d.comments || [];
    indexBouts();
    render();
    if(MODE === "coach") warmVideoCache();
    document.getElementById("upd").textContent = T.updated + " " + new Date().toLocaleTimeString().slice(0,5);
    if(d.v && d.v !== PAGE_VER) document.getElementById("updBar").style.display = "block";
    if(firstLoad){
      firstLoad = false;
      // 首次加载后回写 lastSeen，下次访问可标 NEW
      if(MODE === "coach" && manual !== true) api({ action: "coach_seen" }).catch(function(){});
      // 从击剑助手点进来：直接打开指定视频 / 对阵
      const dv = QS.get("v");
      if(dv && vids.some(x => x.id === dv)) openAnalysis(dv, QS.get("s") === "bout" ? "bout" : "clip");
      else if(dv) waitDeepLink(dv, 0);
    }
  }catch(e){
    if(!vids.length) document.getElementById("list").innerHTML = "<div class='empty' style='color:#b91c1c'>" + escH(T.loadFail || "Load failed") + ": " + escH(e.message) + "</div>";
    else document.getElementById("upd").textContent = (T.loadFail || "Load failed") + " · " + new Date().toLocaleTimeString().slice(0,5);
  }
}
let renderedSig = "";
// ===== 教练页三栏：视频 / 成绩 / 历程 =====
function switchCoachTab(k){
  document.querySelectorAll('.ctabs button').forEach(function(b){ b.classList.toggle('on', b.dataset.ct === k); });
  ['v','r','j'].forEach(function(x){ var el = document.getElementById('ctab-' + x); if (el) el.style.display = (x === k) ? '' : 'none'; });
}
// ===== 训练理念（feed.philosophy：家长对花剑训练的理解与期望）=====
function renderPhil(p){
  var el = document.getElementById("phil");
  if(!el) return;
  var text = p && p.text ? p.text : "";
  if(!text){ el.innerHTML = ""; return; }
  el.innerHTML = '<div class="car" style="border-left:4px solid #2563eb; background:#f8fafc; border-radius:10px; padding:12px 14px; margin-bottom:10px;">'
    + '<div style="font-weight:700; font-size:14px; margin-bottom:4px;">' + escH(T.philTitle || "Training Philosophy") + '</div>'
    + '<div style="font-size:11px; color:#64748b; margin-bottom:10px;">' + escH(T.philNote || "") + '</div>'
    + '<div style="font-size:13px; line-height:1.8; white-space:pre-line;">' + escH(text) + '</div></div>';
}
// ===== 击剑之路（feed.bio：AI 生成的生涯介绍）=====
function renderBio(bio){
  var el = document.getElementById("bio");
  if(!el) return;
  var text = bio && bio.text ? bio.text : "";
  if(!text){ el.innerHTML = ""; return; }
  var upd = bio.generatedAt ? '<div style="font-size:10px; color:#94a3b8; margin-top:6px;">' + escH(bio.generatedAt.slice(0,10)) + '</div>' : "";
  // 【小节标题】渲染成蓝竖线标题，段落分层清晰
  var bioHtml = text.split(/\\n{2,}/).map(function(para, pi){
    var m = para.match(/^【(.+?)】\\s*\\n?([\\s\\S]*)$/);
    if (m) return '<div style="margin:' + (pi ? '14' : '8') + 'px 0 4px;"><div style="font-weight:700; font-size:13px; color:#1d4ed8; border-left:3px solid #2563eb; padding-left:8px;">' + escH(m[1]) + '</div>' + (m[2].trim() ? '<div style="margin-top:5px; font-size:12.5px; line-height:1.75; color:#374151; white-space:pre-line;">' + escH(m[2].trim()) + '</div>' : '') + '</div>';
    if (pi === 0 && para.length < 60) return '<div style="font-weight:800; font-size:15px; color:#1f2937; margin-bottom:8px;">' + escH(para) + '</div>';
    return '<div style="margin-bottom:8px; font-size:12.5px; line-height:1.75; color:#374151; white-space:pre-line;">' + escH(para) + '</div>';
  }).join('');
  el.innerHTML = '<div class="car" style="padding:12px 14px; margin-bottom:10px; border-radius:10px;"><div style="font-weight:700; font-size:14px; margin-bottom:6px;">📖 击剑生涯档案</div><div style="padding:4px 0;">' + bioHtml + '</div>' + upd + '</div>';
}
// ===== 生涯档案（App 同款卡片 UI：深色头部 + 国旗 + 分组明细）=====
var CTRY_ISO = {"usa":"us","united states":"us","美国":"us","canada":"ca","加拿大":"ca","china":"cn","中国":"cn","france":"fr","法国":"fr","japan":"jp","日本":"jp","poland":"pl","波兰":"pl","croatia":"hr","克罗地亚":"hr","spain":"es","西班牙":"es","italy":"it","意大利":"it","germany":"de","德国":"de","korea":"kr","south korea":"kr","韩国":"kr","uk":"gb","great britain":"gb","英国":"gb","hong kong":"hk","香港":"hk","austria":"at","hungary":"hu","czech":"cz","ukraine":"ua","sweden":"se","switzerland":"ch","netherlands":"nl","belgium":"be","portugal":"pt","denmark":"dk","norway":"no","finland":"fi","greece":"gr","israel":"il","egypt":"eg","brazil":"br","mexico":"mx","argentina":"ar","chile":"cl","peru":"pe","colombia":"co","singapore":"sg","malaysia":"my","thailand":"th","vietnam":"vn","australia":"au","turkey":"tr","romania":"ro","russia":"ru"};
function flagImg(country, px){
  var k = String(country||"").trim().toLowerCase();
  var iso = CTRY_ISO[k] || (/^[a-z]{2}$/.test(k) ? k : null);
  if(!iso) return "";
  var w = px || 18;
  return '<img src="https://flagcdn.com/w40/' + iso + '.png" srcset="https://flagcdn.com/w80/' + iso + '.png 2x" width="' + w + '" title="' + escH(country||"") + '" alt="' + iso + '" style="display:inline-block;vertical-align:-3px;border-radius:2px;margin-right:5px;border:1px solid rgba(0,0,0,.15);">';
}
// Cathy 出生日期（跳打判断用）
var CATHY_BIRTH = "2014-03-13";
function ageAt(dateStr){
  var ds = String(dateStr||"");
  if(ds.length===7) ds += "-01"; if(ds.length===4) ds += "-01-01";
  var d = new Date(ds), b = new Date(CATHY_BIRTH);
  if(isNaN(d)||isNaN(b)) return null;
  var a = d.getFullYear()-b.getFullYear();
  if(d.getMonth()<b.getMonth() || (d.getMonth()===b.getMonth() && d.getDate()<b.getDate())) a--;
  return a;
}
// 跳打：参赛组别年龄上限 > 当时所属组别
function upBadge(e){
  var cap = cAgeGroup(e);
  if(!cap || cap >= 99) return null;
  var age = ageAt(e.date);
  if(age == null) return null;
  var own = age<=10?10:age<=12?12:age<=14?14:age<=16?17:age<=19?20:99;
  return cap > own ? {group:cap, age:age} : null;
}
function renderCareer(list){
  var el = document.getElementById("career");
  if(!el) return;
  if(!list || !list.length){ el.innerHTML = ""; return; }
  // 按赛事名分组（一场赛事可能有多个项目行）
  var groups = {}, order = [];
  list.forEach(function(e){
    var k = (e.name||"").trim() || "—";
    if(!groups[k]){ groups[k] = {name:k, items:[], latest:"", country:e.country||"", city:e.city||"", level:e.level||""}; order.push(k); }
    var g = groups[k];
    g.items.push(e);
    if((e.date||"") > g.latest) g.latest = e.date;
    if(!g.country && e.country) g.country = e.country;
    if(!g.city && e.city) g.city = e.city;
  });
  var gl = order.map(function(k){ return groups[k]; }).sort(function(a,b){ return b.latest.localeCompare(a.latest); });
  var h = '', lastY = '';
  gl.forEach(function(g){
    var y = g.latest.slice(0,4) || "—";
    if(y !== lastY){ lastY = y; h += '<div style="margin:14px 0 8px; font-size:13px; font-weight:700; color:#64748b;">' + escH(y) + '</div>'; }
    var loc = [g.city, g.country].filter(Boolean).join(", ");
    h += '<div class="car" style="margin-bottom:12px; padding:0; overflow:hidden;">'
      + '<div style="background:#1e293b; color:#fff; padding:9px 13px;">'
      + '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">'
      + '<div style="font-weight:700; font-size:13px;">' + flagImg(g.country, 18) + escH(g.name) + '</div>'
      + '<div style="font-size:10px; opacity:.8; flex-shrink:0;">' + escH(g.latest) + '</div></div>'
      + '<div style="font-size:10px; opacity:.75; margin-top:2px;">' + escH(loc) + (g.level ? ' · ' + escH(g.level) : '') + '</div></div>'
      + '<div style="padding:6px 13px 10px;">';
    g.items.forEach(function(e){
      var p = parseInt(e.place,10);
      var ptxt = p===1 ? '🥇' : p===2 ? '🥈' : p===3 ? '🥉' : (e.place || '—');
      var wl = (e.wins!=null||e.losses!=null) ? ' · ' + (e.wins||0) + escH(T.wSuffix||'W') + (e.losses||0) + escH(T.lSuffix||'L') : '';
      var up = upBadge(e);
      h += '<div style="display:flex; gap:8px; align-items:center; padding:6px 0; border-top:1px solid #f1f5f9;">'
        + '<div style="flex:none; min-width:44px; font-weight:800; font-size:13px;">' + escH(String(ptxt)) + (p && p>3 && e.total ? '<span style="font-weight:400; font-size:10px; color:#64748b;">/' + e.total + '</span>' : '') + '</div>'
        + '<div style="flex:1; min-width:0;"><span style="font-size:12px; font-weight:600;">' + escH(e.event || '') + '</span>'
        + (up ? '<span title="' + up.age + 'y at U' + up.group + '" style="margin-left:6px; font-size:9px; padding:1px 6px; border-radius:8px; background:#f3e8ff; color:#7c3aed;">⬆' + (T.upLbl || 'up') + '</span>' : '')
        + '<div style="font-size:10px; color:#64748b; margin-top:1px;">' + escH(e.date || '') + escH(wl) + '</div></div></div>';
    });
    h += '</div></div>';
  });
  el.innerHTML = h;
}
// ===== 历程页顶部统计卡（App 同款）=====
function renderJStats(list){
  var el = document.getElementById("jstats");
  if(!el) return;
  list = list || [];
  if(!list.length){ el.innerHTML = ""; return; }
  var st = {ev:0,g:0,s:0,b:0,cc:{},up:0,w:0,l:0};
  list.forEach(function(e){
    st.ev++;
    var p = parseInt(e.place,10);
    if(p===1)st.g++;else if(p===2)st.s++;else if(p===3)st.b++;
    if(e.country) st.cc[e.country]=1;
    if(upBadge(e)) st.up++;
    st.w += e.wins||0; st.l += e.losses||0;
  });
  var nb = st.w + st.l;
  var fy = Math.floor((Date.now() - new Date("2021-09-01").getTime()) / 31557600000) + 1;
  var cell = function(num, lbl, gold){
    return '<div style="flex:1; min-width:86px; background:' + (gold ? 'linear-gradient(135deg,#fef3c7,#fffbeb)' : '#fff') + '; border:1px solid #e2e8f0; border-radius:10px; padding:9px 12px; text-align:center;">'
      + '<div style="font-size:15px; font-weight:800; color:#1e293b;">' + num + '</div>'
      + '<div style="font-size:10px; color:#64748b; margin-top:1px;">' + lbl + '</div></div>';
  };
  el.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:7px; margin-bottom:14px;">'
    + cell(st.ev, escH(T.jEvents||'events'))
    + cell(escH(T.jYr||'') + fy + escH(T.jYrS||''), escH(T.jYears||'fencing yr') + ' · ' + escH(T.jSince||'since 2021.09'), true)
    + cell('🥇'+st.g+' 🥈'+st.s+' 🥉'+st.b, escH(T.jMedals||'medals'))
    + cell(Object.keys(st.cc).length, escH(T.jCtry||'countries'))
    + cell(nb ? Math.round(st.w/nb*100)+'%' : '—', escH(T.jWin||'win rate'))
    + (st.up ? cell('⬆'+st.up, escH(T.jUp||'up-age')) : '')
    + '</div>';
}
// ===== 成绩栏子视图：赛事(上面的列表) / 年度奖牌 / 名次 / 对手 =====
var CUR_FEED = {};
function firstNum(s){ var t = "", i = 0; s = String(s || ""); while(i < s.length && !(s[i] >= "0" && s[i] <= "9")) i++; while(i < s.length && s[i] >= "0" && s[i] <= "9"){ t += s[i]; i++; } return t ? parseInt(t, 10) : null; }
function cAgeGroup(e){
  var ev = String((e && (e.age_group || e.event)) || "").toUpperCase();
  if(ev.indexOf("CADET") >= 0 || ev.indexOf("CDT") >= 0) return 17;
  if(ev.indexOf("JUNIOR") >= 0 || ev.indexOf("JNR") >= 0) return 20;
  if(ev.indexOf("SENIOR") >= 0 || ev.indexOf("VET") >= 0 || ev.indexOf("DIV") >= 0) return 99;
  return firstNum(ev);
}
function cAgeLabel(g){ return g == null ? (T.agOther || "Other") : g >= 99 ? (T.agAdult || "Senior") : (T.agPre || "") + g + (T.agSuf || ""); }
function switchResSub(m){
  document.querySelectorAll('.rsub button').forEach(function(b){ b.classList.toggle('on', b.dataset.rs === m); });
  var career = document.getElementById("career"), sub = document.getElementById("resSubBody");
  if(career) career.style.display = (m === "list") ? "" : "none";
  if(!sub) return;
  var list = CUR_FEED.career || [];
  if(m === "list") sub.innerHTML = "";
  else if(m === "medals") sub.innerHTML = resMedalsHtml(list);
  else if(m === "place") sub.innerHTML = resPlaceHtml(list);
  else if(m === "opp") sub.innerHTML = resOppHtml();
}
function resMedalsHtml(list){
  var by = {};
  list.forEach(function(e){
    var y = String(e.date || "").slice(0,4) || "—";
    var o = by[y] = by[y] || { n:0, g:0, s:0, b:0, t8:0, w:0, l:0 };
    o.n++;
    var p = parseInt(e.place, 10);
    if(p === 1) o.g++; else if(p === 2) o.s++; else if(p === 3) o.b++;
    if(p && p <= 8) o.t8++;
    o.w += e.wins || 0; o.l += e.losses || 0;
  });
  var ys = Object.keys(by).sort().reverse();
  var h = '<div style="font-size:14px; font-weight:700; margin:2px 0 8px;">' + escH(T.medTitle || 'Season stats') + ' <span style="font-size:10px; font-weight:400; color:#64748b;">' + escH(T.medT8Hint || 'T8 = top-8 finishes') + '</span></div>'
    + '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:12.5px;">'
    + '<tr style="text-align:center; color:#64748b; font-size:11px;"><th style="padding:6px 8px; border-bottom:2px solid #e5e7eb; text-align:left;">' + escH(T.medYear || 'Season') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">' + escH(T.medN || 'Events') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">🥇</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">🥈</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">🥉</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">T8</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb;">' + escH(T.medWin || 'Win%') + '</th></tr>';
  ys.forEach(function(y){
    var s = by[y], n = s.w + s.l;
    h += '<tr><td style="padding:7px 8px; border-bottom:1px solid #f1f5f9; font-weight:700;">' + escH(y) + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + s.n + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (s.g || '—') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (s.s || '—') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (s.b || '—') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (s.t8 || '—') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (n ? Math.round(s.w/n*100) + '%' : '—') + '</td></tr>';
  });
  // 生涯总览（App 同款汇总框）
  var tot = { ev:0, g:0, s:0, b:0, w:0, l:0, cc:{}, up:0 };
  list.forEach(function(e){
    tot.ev++;
    var p = parseInt(e.place,10);
    if(p===1)tot.g++;else if(p===2)tot.s++;else if(p===3)tot.b++;
    if(e.country) tot.cc[e.country]=1;
    tot.w += e.wins||0; tot.l += e.losses||0;
    if(upBadge(e)) tot.up++;
  });
  var tn = tot.w + tot.l;
  h += '</table></div>'
    + '<div style="font-size:10.5px; color:#64748b; margin-top:6px; line-height:1.7;">' + escH(T.medFoot || '') + '</div>'
    + '<div style="margin-top:12px; padding:11px 13px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; font-size:12px; color:#374151; line-height:1.9;">'
    + '<b>' + escH(T.ovTitle || 'Career overview') + '</b> · ' + tot.ev + ' ' + escH(T.jEvents || 'events') + ' · 🥇' + tot.g + ' 🥈' + tot.s + ' 🥉' + tot.b + ' · ' + Object.keys(tot.cc).length + ' ' + escH(T.jCtry || 'countries') + ' · ' + escH(T.ovRec || 'record') + ' ' + (tn ? tot.w + escH(T.wSuffix||'W') + '-' + tot.l + escH(T.lSuffix||'L') + ' (' + Math.round(tot.w/tn*100) + '%)' : '—') + (tot.up ? ' · ⬆' + escH(T.jUp || 'up-age') + ' ' + tot.up : '')
    + '</div>';
  return h;
}
function resPlaceHtml(list){
  var items = [];
  list.forEach(function(e){
    var p = parseInt(e.place, 10);
    if(!(p >= 1 && p <= 32) || !e.date) return;
    var ds = String(e.date);
    if(ds.length === 7) ds += "-01";
    if(ds.length === 4) ds += "-01-01";
    var d = new Date(ds);
    if(isNaN(d)) return;
    items.push({ d: d.getTime(), p: p, g: cAgeGroup(e), name: e.name || '', total: e.total || null });
  });
  if(!items.length) return '<div class="empty">' + escH(T.noPlace || 'No data') + '</div>';
  items.sort(function(a, b){ return a.d - b.d; });
  var groups = {};
  items.forEach(function(x){ var k = x.g == null ? 99 : x.g; (groups[k] = groups[k] || []).push(x); });
  var names = Object.keys(groups).map(Number).sort(function(a, b){ return b - a; });
  var colors = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#14b8a6','#ec4899','#84cc16'];
  var W = 400, H = 240, pad = { t:26, r:14, b:44, l:38 };
  var xMin = items[0].d, xMax = items[items.length-1].d;
  function xS(t){ return pad.l + (t - xMin) / ((xMax - xMin) || 1) * (W - pad.l - pad.r); }
  function yS(v){ return pad.t + Math.log(Math.max(1, v)) / Math.LN2 / 5 * (H - pad.t - pad.b); }
  function medalC(p){ return p === 1 ? '#eab308' : p === 2 ? '#94a3b8' : p === 3 ? '#b45309' : '#64748b'; }
  var yGrid = '';
  [1,2,4,8,16,32].forEach(function(v){
    var y = yS(v).toFixed(1);
    yGrid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/><text x="4" y="' + (+y + 3) + '" font-size="10" fill="#94a3b8">' + v + '</text>';
  });
  var xTicks = '';
  for(var yy = new Date(xMin).getFullYear(); yy <= new Date(xMax).getFullYear(); yy++){
    var x = xS(new Date(yy, 0, 1).getTime());
    xTicks += '<text x="' + x.toFixed(1) + '" y="' + (H - pad.b + 16) + '" font-size="10" fill="#94a3b8" text-anchor="middle">' + yy + '</text>';
  }
  var out = '';
  var fmtD = function(t){ var dd = new Date(t); return dd.getFullYear() + '-' + ('0' + (dd.getMonth()+1)).slice(-2); };
  names.forEach(function(g, gi){
    var pts = groups[g].slice().sort(function(a, b){ return a.d - b.d; });
    var color = colors[gi % colors.length];
    var path = pts.map(function(x, i){ return (i ? 'L' : 'M') + xS(x.d).toFixed(1) + ',' + yS(x.p).toFixed(1); }).join(' ');
    var dots = pts.map(function(x){ return '<circle cx="' + xS(x.d).toFixed(1) + '" cy="' + yS(x.p).toFixed(1) + '" r="5" fill="' + medalC(x.p) + '" stroke="white" stroke-width="1.5"><title>' + escH(x.name || '') + ' ' + x.p + (x.total ? '/' + x.total : '') + '</title></circle>'; }).join('');
    var lbls = pts.map(function(x){ return '<text x="' + xS(x.d).toFixed(1) + '" y="' + (yS(x.p) - 9).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + medalC(x.p) + '">' + x.p + '</text>'; }).join('');
    var best = pts.reduce(function(a, b){ return a.p <= b.p ? a : b; });
    var last = pts[pts.length - 1], first = pts[0];
    var trend = last.p < first.p ? '📈 ' + (T.trUp || 'improving') : last.p > first.p ? '📉 ' + (T.trDown || 'declining') : '➡️ ' + (T.trFlat || 'steady');
    var bm = best.p === 1 ? '🥇' : best.p === 2 ? '🥈' : best.p === 3 ? '🥉' : '';
    out += '<div style="margin-bottom:14px;">'
      + '<div style="display:flex; align-items:baseline; gap:7px; margin-bottom:5px;"><span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:' + color + ';"></span><b style="font-size:13px;">' + escH(cAgeLabel(g)) + '</b><span style="font-size:10px; color:#64748b;">' + pts.length + escH(T.plDot || ' events · best ') + Math.min.apply(null, pts.map(function(x){ return x.p; })) + '</span></div>'
      + '<svg class="cchart" viewBox="0 0 ' + W + ' ' + H + '">' + yGrid + xTicks
      + '<line x1="' + pad.l + '" y1="' + (H - pad.b) + '" x2="' + (W - pad.r) + '" y2="' + (H - pad.b) + '" stroke="#d1d5db"/>'
      + '<line x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (H - pad.b) + '" stroke="#d1d5db"/>'
      + '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' + dots + lbls + '</svg>'
      + '<div style="font-size:10.5px; color:#64748b; margin-top:4px; line-height:1.7;">'
      + escH(T.plBest || 'Best') + ': <b style="color:' + medalC(best.p) + '">' + bm + '#' + best.p + (best.total ? '/' + best.total : '') + '</b> · ' + escH(best.name || '') + '（' + fmtD(best.d) + '）<br>'
      + escH(T.plLast || 'Latest') + ': #' + last.p + (last.total ? '/' + last.total : '') + ' · ' + escH(last.name || '') + '（' + fmtD(last.d) + '）· ' + trend
      + '</div></div>';
  });
  return '<div style="font-size:14px; font-weight:700; margin:2px 0 4px;">' + escH(T.plTitle || 'Ranking trend') + '</div>'
    + '<div style="font-size:11px; color:#64748b; margin-bottom:12px;">' + escH(T.plNote || T.placeNote || '') + '</div>' + out;
}
function resOppHtml(){
  var list = CUR_FEED.opponents || [];
  if(!list.length) return '<div class="empty">' + escH(T.noOpp || 'No data') + '</div>';
  var nowY = new Date().getFullYear();
  var pw = 0, pl = 0, dw = 0, dl = 0;
  var rows = list.slice().sort(function(a, b){ return (b.w + b.l) - (a.w + a.l) || b.w - a.w; });
  list.forEach(function(o){ pw += o.pw || 0; pl += o.pl || 0; dw += o.dw || 0; dl += o.dl || 0; });
  var pct = function(w, l){ return (w + l) ? Math.round(w / (w + l) * 100) + '%' : '—'; };
  var rep = rows.filter(function(o){ return o.w + o.l >= 2; });
  var h = '<div style="font-size:14px; font-weight:700; margin:2px 0 10px;">' + escH(T.oppTitle || 'Opponents') + ' <span style="font-size:10px; font-weight:400; color:#64748b;">' + escH(T.oppNote || '') + rows.length + escH(T.oppTail || '') + '</span></div>'
    + '<div style="display:flex; gap:8px; margin-bottom:10px;">'
    + '<div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 10px; font-size:12px;"><b>' + escH(T.poolLbl||'Pools') + '</b><br>' + pw + escH(T.wSuffix||'W') + ' ' + pl + escH(T.lSuffix||'L') + ' · ' + pct(pw, pl) + '</div>'
    + '<div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px 10px; font-size:12px;"><b>' + escH(T.deLbl||'DE') + '</b><br>' + dw + escH(T.wSuffix||'W') + ' ' + dl + escH(T.lSuffix||'L') + ' · ' + pct(dw, dl) + '</div></div>'
    + (rep.length ? '<div style="font-size:11px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:7px 9px; margin-bottom:10px;">' + escH(T.oppRep || '🔁 Rematches: ') + rep.map(function(o){ return escH(o.name) + '（' + o.w + escH(T.wSuffix||'W') + o.l + escH(T.lSuffix||'L') + '）'; }).join(' · ') + '</div>' : '')
    + '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:12px;">'
    + '<tr style="text-align:left; color:#64748b; font-size:11px;"><th style="padding:6px 8px; border-bottom:2px solid #e5e7eb;">' + escH(T.oName || 'Opponent') + '</th><th style="padding:6px 6px; border-bottom:2px solid #e5e7eb;">' + escH(T.oClub || 'Club') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb; text-align:center;">' + escH(T.oAge || 'Age') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb; text-align:center;">' + escH(T.oN || 'Bouts') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb; text-align:center;">' + escH(T.oW || 'W') + '</th><th style="padding:6px 4px; border-bottom:2px solid #e5e7eb; text-align:center;">' + escH(T.oL || 'L') + '</th><th style="padding:6px 6px; border-bottom:2px solid #e5e7eb; text-align:center;">' + escH(T.oPct || 'Win%') + '</th></tr>';
  rows.forEach(function(o){
    var by = firstNum(o.birth), age = by ? nowY - by : null;
    var tot = o.w + o.l, pc = Math.round(o.w / tot * 100);
    var pcC = pc >= 60 ? '#16a34a' : pc >= 40 ? '#d97706' : '#dc2626';
    h += '<tr><td style="padding:7px 8px; border-bottom:1px solid #f1f5f9; font-weight:600;">' + escH(o.name) + '</td>'
      + '<td style="padding:7px 6px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#64748b;">' + escH(o.club || '') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + (age ? age + 'y' : '—') + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center;">' + tot + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center; color:#16a34a; font-weight:700;">' + o.w + '</td>'
      + '<td style="padding:7px 4px; border-bottom:1px solid #f1f5f9; text-align:center; color:#dc2626;">' + o.l + '</td>'
      + '<td style="padding:7px 6px; border-bottom:1px solid #f1f5f9; text-align:center; color:' + pcC + '; font-weight:700;">' + pc + '%</td></tr>';
  });
  return h + '</table></div><div style="font-size:10.5px; color:#64748b; margin-top:6px; line-height:1.7;">' + escH(T.oppFoot || '') + '</div>';
}
function boutKey(v){ return [v.event||"", v.bout||"", v.opponent||"", v.score||""].join("|") || v.id; }
// 对阵级留言 id 的 bout 部分：全部为空时退化为视频 id，避免串组
function bcmtKey(v){
  const k = [v.event||"", v.bout||"", v.opponent||"", v.score||""].join("~");
  return k === "~~~" ? "#" + v.id : k;
}
// ===== 分析播放器：无遮挡控制条 + 打点点评 =====
let apVid = null, apV = null, apTags = [], apStepN = 5, apZoom = 1;
let apScope = "clip", apCoach = "all", apAnchor = true, apBcid = null, apHL = new Set();
// 默认打开：先看这个片段（有未读的教练 → 最近留言的教练），再看整场，最后第一位教练
function pickCoach(b, vid){
  if(COACHES.length === 1) return COACHES[0].id;
  const pick = list => {
    const u = list.filter(isUnread).sort(byTs).pop();
    if(u) return u.coachId;
    const l = list.filter(c => c.author === "coach").sort(byTs).pop();
    return l ? l.coachId : null;
  };
  const inB = cmts.filter(c => bOf(c) === b && c.coachId && c.coachId !== "me");
  return (vid && pick(inB.filter(c => c.videoId === vid))) || pick(inB) || (COACHES.length ? COACHES[0].id : "all");
}
let acCtx = null, acGain = null, acSrc = null;
function openAnalysis(vid, scope, keepCoach){
  const v = vids.find(x => x.id === vid);
  if(!v) return;
  if(v.youtube){ window.open(v.url, "_blank"); return; }
  const sameBout = apVid && vidB[apVid] === vidB[vid];
  if(!sameBout) apHL = new Set();
  apVid = vid; apTags = [];
  apScope = scope === "bout" ? "bout" : "clip";
  apBcid = vidB[vid];
  if(MODE === "family" && !(keepCoach && sameBout)) apCoach = pickCoach(apBcid, apScope === "clip" ? vid : null);
  if(!sameBout && !rec){
    document.querySelector(".apcomp").classList.remove("composing");
    document.getElementById("apTxtBox").style.display = "none";
  }
  document.getElementById("ap").style.display = "block";
  apV = document.getElementById("apVideo");
  const ld = document.getElementById("apLoad");
  const ldShow = function(){ if(apV && (apV.seeking || apV.readyState < 3)) ld.style.display = "flex"; };
  const ldHide = function(){ if(!apV || (!apV.seeking && apV.readyState >= 3)) ld.style.display = "none"; };
  if(apV.dataset.src !== v.url){
    apV.dataset.src = v.url;
    ld.style.display = "flex";
    apV.removeAttribute("poster");
    // 先用列表缩略图的首帧做海报，视频加载前不黑屏
    const th = thGet(v.id);
    if(th && th.i) apV.poster = th.i;
    apV.src = v.url; apV.load();   // 走原地址；已缓存的部分由 Service Worker 本地应答
  }
  else ldHide();
  apV.onloadstart = ldShow;
  apV.onwaiting  = ldShow;
  apV.onseeking  = ldShow;
  apV.oncanplay  = ldHide;
  apV.onplaying  = ldHide;
  apV.onseeked   = ldHide;
  apV.onerror    = ldHide;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  document.getElementById("apVolRow").style.display = iOS ? "none" : "flex";
  if(!iOS) apVolIn(document.getElementById("apVol"));
  apV.ontimeupdate = apTick; apV.onloadedmetadata = apTick;
  apV.onended = function(){ document.getElementById("apPlayBtn").textContent = "▶"; };
  const sp = document.getElementById("apSp");
  sp.innerHTML = [0.25,0.5,1,1.5,2].map(x => "<button data-sp='" + x + "' onclick='apSpeed(" + x + ",this)'>" + x + "x</button>").join("");
  sp.querySelector("[data-sp='1']").classList.add("on"); apSpd = 1;

  document.getElementById("apTags").innerHTML = TAG_ORDER.map(k =>
    "<button data-tag='" + k + "' onclick='apTagSet(this)'>" + escH(TAGS[k] || k) + "</button>").join("");
  apRenderCmts();
}
function closeAnalysis(){
  document.getElementById("ap").style.display = "none";
  if(apV) apV.pause();
  if(auO) auO.pause();
  apVid = null;
  if(EMBED && QS.get("v")){ try{ parent.postMessage({ type: "cf-close" }, "*"); }catch(e){} }
}
function apWake(){ if(acCtx && acCtx.state === "suspended") acCtx.resume().catch(function(){}); }
function apToggle(){
  apWake();
  if(Date.now() - (window._pzT || 0) < 500) return;   // 捏合缩放刚结束，忽略误触单击
  const b = document.getElementById("apPlayBtn");
  if(apV.paused){ apV.play().catch(function(){}); b.textContent = "❚❚"; apFlash("▶"); }
  else { apV.pause(); b.textContent = "▶"; apFlash("❚❚"); }
}
function apFlash(s){
  const f = document.getElementById("apFlash");
  f.textContent = s; f.style.opacity = 1;
  setTimeout(function(){ f.style.opacity = 0; }, 400);
}
function apSkip(dir){
  if(!apV || !apV.duration) return;
  apV.currentTime = Math.max(0, Math.min(apV.duration, apV.currentTime + dir * apStepN));
  apFlash((dir < 0 ? "-" : "+") + apStepN + "s");
}
function apStep(dir){ if(!apV) return; apV.pause(); document.getElementById("apPlayBtn").textContent = "▶"; apV.currentTime = Math.max(0, apV.currentTime + dir / 25); }
// 点按跳秒=跳后自动播放（前后对称）；按住前进=变速播放，按住后退=大步连续回扫
let hT = null, hI = null, hBtn = null, apSpd = 1;
function hStart(mode, dir, btn){
  apWake();
  hEnd();
  hBtn = btn;
  if(btn) btn.classList.add('hold');
  if(!apV) return;
  if(mode === 'f') apStep(dir);
  else {                                                    // 点按跳秒：跳完自动播放
    apSkip(dir);
    apV.playbackRate = apSpd;
    apV.play().catch(function(){});
    document.getElementById("apPlayBtn").textContent = "❚❚";
  }
  if(dir > 0){
    hT = setTimeout(function(){                             // 按住前进：变速播放，画面流畅移动
      apV.playbackRate = mode === 'f' ? 0.25 : 4;
      apV.play().catch(function(){});
      document.getElementById("apPlayBtn").textContent = "❚❚";
    }, 350);
  } else {
    const dt = mode === 'f' ? 0.08 : apStepN / 8;           // 回退步幅：帧键≈0.5x倒放，跳秒≈4x回扫
    hT = setTimeout(function(){
      apV.pause();
      document.getElementById("apPlayBtn").textContent = "▶";
      hI = setInterval(function(){
        if(!apV) return;
        apV.currentTime = Math.max(0, apV.currentTime - dt);
      }, 150);
    }, 350);
  }
}
function hEnd(){
  clearTimeout(hT); clearInterval(hI); hT = hI = null;
  if(apV && !apV.paused){ apV.playbackRate = apSpd; apV.pause(); document.getElementById("apPlayBtn").textContent = "▶"; }
  if(hBtn){ hBtn.classList.remove('hold'); hBtn = null; }
}

let pzX = 0, pzY = 0;
function apXf(){
  const box = document.querySelector(".apv");
  if(!box || !apV) return;
  const mx = Math.max(0, (apZoom - 1) / 2) * box.clientWidth;
  const my = Math.max(0, (apZoom - 1) / 2) * box.clientHeight;
  pzX = Math.max(-mx, Math.min(mx, pzX)); pzY = Math.max(-my, Math.min(my, pzY));
  apV.style.transform = apZoom > 1.02 ? "translate(" + pzX + "px," + pzY + "px) scale(" + apZoom + ")" : "";
  const r = document.getElementById("apReset");
  if(r) r.style.display = apZoom > 1.02 ? "block" : "none";
}
function apZoomReset(){
  apZoom = 1; pzX = pzY = 0;
  const misc = document.getElementById("apMisc");
  if(misc) misc.querySelectorAll("[data-z]").forEach(b => b.classList.toggle("on", b.dataset.z === "1"));
  apXf();
}

// ===== 最近视频后台静默预载（走普通 fetch，由 Service Worker 写入本地缓存） =====
async function warmVideoCache(){
  try{
    if(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return;  // iOS 不预热：SW 在该平台直通
    if(!("serviceWorker" in navigator)) return;
    await navigator.serviceWorker.ready;
    const cache = await caches.open("cv-videos");
    for(const v of vids.slice(0, 3)){                     // 最近 3 个默默下载
      if(!v.url || v.youtube) continue;
      if(!(await cache.match(new URL(v.url).pathname))) fetch(v.url).catch(function(){});
    }
  }catch(e){}
}
// 双指捏合缩放 + 放大后单指拖动平移（只动视频画面）
(function(){
  const box = document.querySelector(".apv");
  if(!box) return;
  let d0 = 0, z0 = 1, pinching = false, panning = false, moved = false, sx = 0, sy = 0, px0 = 0, py0 = 0;
  const dist = function(e){ return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); };
  box.addEventListener("touchstart", function(e){
    if(e.touches.length === 2){ pinching = true; panning = false; d0 = dist(e); z0 = apZoom; }
    else if(e.touches.length === 1 && apZoom > 1.02){ panning = true; moved = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY; px0 = pzX; py0 = pzY; }
  }, {passive:true});
  box.addEventListener("touchmove", function(e){
    if(pinching && e.touches.length === 2){
      e.preventDefault();
      apZoom = Math.max(1, Math.min(3, z0 * dist(e) / d0));
      apXf();
    } else if(panning && e.touches.length === 1){
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if(!moved && Math.abs(dx) + Math.abs(dy) < 8) return;   // 轻点不当作拖动
      moved = true;
      e.preventDefault();
      pzX = px0 + dx; pzY = py0 + dy;
      apXf();
    }
  }, {passive:false});
  box.addEventListener("touchend", function(e){
    if(e.touches.length < 2){ if(pinching) window._pzT = Date.now(); pinching = false; }
    if(e.touches.length === 0){ if(panning && moved) window._pzT = Date.now(); panning = false; }
  }, {passive:true});
})();
function apSpeed(x, btn){ apSpd = x; if(apV) apV.playbackRate = x; btn.parentNode.querySelectorAll("[data-sp]").forEach(b => b.classList.toggle("on", b === btn)); }
// 背景音量：iOS 忽略 video.volume，用 WebAudio 增益节点控制（失败则退回 volume）
function apVolIn(el){
  const v = el.value / 100;
  if(!apV) return;
  try{
    if(!acCtx){
      acCtx = new (window.AudioContext || window.webkitAudioContext)();
      acSrc = acCtx.createMediaElementSource(apV);
      acGain = acCtx.createGain();
      acSrc.connect(acGain); acGain.connect(acCtx.destination);
    }
    apWake();
    acGain.gain.value = v;
  }catch(e){ apV.volume = v; }
}
function apSeekIn(el){ if(apV && apV.duration) apV.currentTime = el.value / 1000 * apV.duration; }
function apSeekTo(t){ if(apV) apV.currentTime = t; }
function apTick(){
  if(!apV || !apV.duration) return;
  const ld = document.getElementById("apLoad");
  if(ld && !apV.seeking && apV.readyState >= 3) ld.style.display = "none";   // 兜底：画面在动就关掉加载层
  document.getElementById("apSeek").value = Math.round(apV.currentTime / apV.duration * 1000);
  document.getElementById("apTime").textContent = fmtT(apV.currentTime) + " / " + fmtT(apV.duration);
  // 进度条上的点评红点
  document.getElementById("apMarks").innerHTML = cmts.filter(c => c.videoId === apVid && c.vt != null && (MODE !== "family" || apCoach === "all" || c.coachId === apCoach))
    .map(c => "<span class='apmark' style='left:" + Math.min(99, c.vt / apV.duration * 100) + "%;background:" + markColor(c) + "' onclick='apSeekTo(" + c.vt + ")' title='" + fmtT(c.vt) + "'></span>").join("");
  const at = document.getElementById("apAncT");
  if(at && apAnchor) at.textContent = fmtT(apV.currentTime);
}
function apTagSet(btn){
  btn.classList.toggle("on");
  const k = btn.dataset.tag;
  if(btn.classList.contains("on")) apTags.push(k);
  else apTags = apTags.filter(x => x !== k);
}
// 面板里的留言：范围 = 本片段 / 整场；家长端再按教练标签过滤
function panelCmts(scope, coach){
  return cmts.filter(c => (scope === "clip" ? c.videoId === apVid : bOf(c) === apBcid) && (MODE !== "family" || coach === "all" || c.coachId === coach)).sort(byTs);
}
function apRenderCmts(){
  const el = document.getElementById("apCmts");
  if(!el || !apVid) return;
  if(el.querySelector(".cmtmenu")) return;      // 留言菜单打开时跳过本轮刷新，不打断标签编辑/删除
  const clips = boutClips[apBcid] || [apVid];
  const inCoach = c => MODE !== "family" || apCoach === "all" || c.coachId === apCoach;
  document.getElementById("apClips").innerHTML = clips.length > 1 ? clips.map((id, i) => {
    const n = cmts.filter(c => c.videoId === id && inCoach(c)).length;
    return "<button class='" + (id === apVid ? "on" : "") + "' data-vid='" + escH(id) + "' onclick='openAnalysis(this.dataset.vid, apScope, true)'>🎬 " + (i + 1) + (n ? " · " + n : "") + "</button>";
  }).join("") : "";
  const tabs = document.getElementById("apTabs");
  if(MODE === "family" && COACHES.length > 1){
    tabs.innerHTML = COACHES.map(co => {
      const u = cmts.filter(c => c.coachId === co.id && bOf(c) === apBcid && isUnread(c)).length;
      const n = cmts.filter(c => c.coachId === co.id && bOf(c) === apBcid).length;
      return "<button class='" + (apCoach === co.id ? "on" : "") + "' data-co='" + escH(co.id) + "' onclick='apSetCoach(this.dataset.co)'><i style='background:" + coachColor(co.id) + "'></i>" + escH(co.name) + (n ? " · " + n : "") + (u ? "<b class='ub'>" + u + "</b>" : "") + "</button>";
    }).join("") + "<button class='" + (apCoach === "all" ? "on" : "") + "' data-co='all' onclick='apSetCoach(this.dataset.co)'>" + escH(T.all) + "</button>";
  } else tabs.innerHTML = "";
  const nClip = panelCmts("clip", apCoach).length, nBout = panelCmts("bout", apCoach).length;
  document.getElementById("apScope").innerHTML =
    "<button class='" + (apScope === "clip" ? "on" : "") + "' data-s='clip' onclick='apSetScope(this.dataset.s)'>" + escH(T.clipCmt) + " · " + nClip + "</button>" +
    "<button class='" + (apScope === "bout" ? "on" : "") + "' data-s='bout' onclick='apSetScope(this.dataset.s)'>" + escH(T.boutCmt) + " · " + nBout + "</button>";
  const list = panelCmts(apScope, apCoach);
  list.forEach(c => { if(isUnread(c)) apHL.add(c.id); });     // 本次打开期间保留「新」高亮
  el.innerHTML = list.length ? list.map(c => cmtHtml(c, true)).join("") : "<div class='apempty'>" + escH(T.noCmt) + "</div>";
  renderTo();
  auSync(); auTickA();
  markRead(apBcid);
}
function apSetCoach(id){ apCoach = id; apRenderCmts(); apTick(); }
function apSetScope(s){ apScope = s === "bout" ? "bout" : "clip"; apRenderCmts(); }
function apSetIdent(k){ IDENT = k === "family" ? "family" : "cathy"; try{ localStorage.setItem("cf_ident", IDENT); }catch(e){} renderTo(); }
function apToggleAnchor(){ apAnchor = !apAnchor; renderTo(); }
// 发送区：家长端 = 身份（Cathy / 家长）+ 发给哪位教练；两端都有「⏱ 挂在当前时间」开关（关掉 = 整场留言）
function renderTo(){
  const el = document.getElementById("apTo");
  if(!el) return;
  let h = "";
  if(MODE === "family"){
    h += "<span class='idn'>" + ["cathy", "family"].map(k => "<button class='" + (IDENT === k ? "on" : "") + "' data-k='" + k + "' onclick='apSetIdent(this.dataset.k)'>" + (k === "cathy" ? "Cathy" : escH(T.family)) + "</button>").join("") + "</span>";
    const co = coachOf(apCoach);
    h += "<span class='tolab'>" + (co ? "→ <b style='color:" + coachColor(co.id) + "'>" + escH(co.name) + "</b>" : escH(T.pickCoach)) + "</span>";
  }
  h += "<button class='anc" + (apAnchor ? " on" : "") + "' onclick='apToggleAnchor()'>⏱ <span id='apAncT'>" + (apAnchor ? fmtT(apV ? apV.currentTime : 0) : escH(T.boutCmt)) + "</span></button>";
  el.innerHTML = h;
}
// 发送目标：家长端必须先选定教练；挂点 = 当前片段 + 时间，不挂 = 整场
function sendTarget(){
  const t = {};
  if(MODE === "family"){
    if(!coachOf(apCoach)){ alert(T.pickCoach); return null; }
    t.coachId = apCoach; t.author = IDENT;
  } else t.author = "coach";
  if(apAnchor && apV){ t.videoId = apVid; t.vt = +apV.currentTime.toFixed(2); }
  else t.videoId = apBcid;
  return t;
}
async function apSend(){
  const input = document.getElementById("apInput");
  const text = input.value.trim();
  if(!text) return;
  const tg = sendTarget();
  if(!tg) return;
  input.value = ""; input.disabled = true;
  cmts.push(Object.assign({ id: "tmp_" + Date.now(), text, display: text, tags: apTags.slice(), ts: new Date().toISOString() }, tg));
  apRenderCmts(); render();
  try{
    const r = await api(Object.assign({ action: "comment_add", text, tags: apTags }, tg));
    if(!r.ok) throw new Error("HTTP " + r.status);
    await load(true);
  }catch(e){
    input.value = text;
    cmts = cmts.filter(c => String(c.id).indexOf("tmp_") !== 0);
    apRenderCmts(); render();
    alert(T.sendFail || "Send failed");
  }
  input.disabled = false; input.focus();
}
// 分析面板留言：💬文字 / 🎤语音 两个按钮各展开一条操作栏
function apShowTxt(){
  document.querySelector(".apcomp").classList.add("composing");
  document.getElementById("apTxtBox").style.display = "flex";
  document.getElementById("apRecBox").style.display = "none";
  document.getElementById("apInput").focus();
}
let recTimer = null, recStartT = 0, recCancel = false, recTg = null;
async function apStartRec(){
  if(rec) return;
  if(!navigator.mediaDevices || !window.MediaRecorder){ alert(T.noVoice || "Voice recording not supported"); return; }
  recTg = sendTarget();
  if(!recTg) return;
  if(apV){ apV.pause(); document.getElementById("apPlayBtn").textContent = "▶"; }
  const rb = document.getElementById("apRecBox"), rt = document.getElementById("apRecT");
  rb.style.display = "flex";
  document.querySelector(".apcomp").classList.add("composing");
  document.getElementById("apTxtBox").style.display = "none";
  rt.textContent = "● …";
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recChunks = []; recCancel = false;
    rec.ondataavailable = e => { if(e.data && e.data.size) recChunks.push(e.data); };
    rec.onstop = async () => {
      clearInterval(recTimer); recTimer = null;
      stream.getTracks().forEach(t => t.stop());
      if(recCancel){ rec = null; rb.style.display = "none"; return; }
      rt.textContent = "⏳";
      try{
        const blob = new Blob(recChunks, { type: rec.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? ".m4a" : ".webm";
        const init = await (await fetch("/", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"video_init", name:"voice"+ext, contentType:blob.type }) })).json();
        const pr = await fetch("/video-part?key=" + encodeURIComponent(init.key) + "&uploadId=" + encodeURIComponent(init.uploadId) + "&part=1", { method:"POST", headers:{"Content-Type":"application/octet-stream"}, body: blob });
        const part = await pr.json();
        const comp = await (await fetch("/", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"video_complete", key:init.key, uploadId:init.uploadId, parts:[part] }) })).json();
        if(comp.url){
          cmts.push(Object.assign({ id:"tmp_"+Date.now(), text:"", audioUrl:comp.url, tags:apTags.slice(), ts:new Date().toISOString() }, recTg));
          apRenderCmts(); render();
          const r = await api(Object.assign({ action:"comment_add", text:"🎤", audioUrl:comp.url, tags:apTags }, recTg));
          if(!r.ok) throw new Error("HTTP " + r.status);
          await load(true);
        }
      }catch(e){ cmts = cmts.filter(c => String(c.id).indexOf("tmp_") !== 0); apRenderCmts(); alert(T.sendFail || "Send failed"); }
      rb.style.display = "none"; rec = null;
    };
    recStartT = Date.now();
    recTimer = setInterval(function(){
      rt.textContent = "● " + fmtT(Math.floor((Date.now() - recStartT) / 1000));
    }, 500);
    rec.start();
    rt.textContent = "● 0:00";
  }catch(e){ rb.style.display = "none"; alert((T.noMic || "Mic unavailable") + " (" + (e.name || e.message || e) + ")"); }
}
function apStopRec(){ if(rec) rec.stop(); }
function apCancelRec(){ recCancel = true; if(rec) rec.stop(); else document.getElementById("apRecBox").style.display = "none"; }
function render(){
  const list = document.getElementById("list");
  const sig = vids.map(v => v.id + ":" + (v.tournament||"")).join("|");
  if(sig !== renderedSig){
    renderedSig = sig;
    boutVid = {};
    if(!vids.length){
      list.innerHTML = "<div class='empty'>" + escH(T.none) + "</div>";
    } else {
      const groups = {};
      const order = [];
      vids.forEach(v => {
        const tk = v.tournament || "—";
        if(!groups[tk]){ groups[tk] = { date: v.date||"", place: v.place||"", tUrl: v.tUrl||"", bouts: {}, bord: [] }; order.push(tk); }
        const bk = tk + "||" + boutKey(v);
        if(!groups[tk].bouts[bk]){ groups[tk].bouts[bk] = { label: [v.event, v.bout, v.opponent ? "vs " + v.opponent : "", v.score].filter(Boolean).join(" · "), vids: [] }; groups[tk].bord.push(bk); }
        groups[tk].bouts[bk].vids.push(v);
        boutVid[v.id] = bk;
      });
      order.sort((a,b) => (groups[b].date||"").localeCompare(groups[a].date||""));
      let newCount = 0;
      vids.forEach(v => { if(v.uploadedAt && new Date(v.uploadedAt).getTime() > lastSeen) newCount++; });
      const nb = document.getElementById("newBadge");
      if(newCount){ nb.textContent = "● " + newCount + " " + T.newV; nb.style.display = "inline-block"; }
      else nb.style.display = "none";
      list.innerHTML = order.map(tname => {
        const g = groups[tname];
        const isNew = t => t && new Date(t).getTime() > lastSeen;
        const head = g.tUrl
          ? "<div class='tname'>🏆 <a href='" + escH(g.tUrl) + "' target='_blank' rel='noopener'>" + escH(tname) + " ↗</a></div>"
          : "<div class='tname'>🏆 " + escH(tname) + "</div>";
        const metaLine = [g.date, g.place].filter(Boolean).join(" · ");
        return "<div class='tgroup'><div class='thead'>" + head +
          (metaLine ? "<div class='tmeta'>" + escH(metaLine) + "</div>" : "") + "</div>" +
          g.bord.map(bk => {
            const b = g.bouts[bk];
            const bid = escH(bk);
            // 对阵级留言挂在稳定 key：b:赛事~回合~对手~比分（与家长端公式一致）
            const bcid = "b:" + tname + "~" + bcmtKey(b.vids[0]);
            const n = cmts.filter(c => bOf(c) === bcid).length;
            return "<div class='bout' data-bkey='" + bid + "' data-bcid='" + escH(bcid) + "'><div class='bhead'>" + escH(locEvent(b.label || b.vids[0].name)) + "</div>" +
              "<div class='vgrid'>" + b.vids.map(v => {
                const isN = isNew(v.uploadedAt);
                const vc = cmts.filter(c => c.videoId === v.id).length;
                const cell = v.youtube
                  ? "<a class='ytcell' href='" + escH(v.url) + "' target='_blank' rel='noopener'>▶ " + escH(v.name) + "</a>"
                  : "<div class='vcell' data-vid='" + escH(v.id) + "' data-src='" + escH(v.url) + "' onclick='openAnalysis(this.dataset.vid)'>" +
                    "<img class='vth' alt=''>" +
                    "<div class='pov'>▶</div><div class='dur'></div>" +
                    (isN ? "<div class='newtag'>NEW</div>" : "") +
                    "<div class='vname'>" + escH(v.name) + "</div></div>";
                return "<div class='vwrap'>" + cell +
                  "<button class='vbtn' data-vid='" + escH(v.id) + "' onclick='openAnalysis(this.dataset.vid)'>💬 " + vc + "</button></div>";
              }).join("") + "</div>" +
              "<button class='cbtn' data-vid='" + escH(b.vids[0].id) + "' data-s='bout' onclick='openAnalysis(this.dataset.vid, this.dataset.s)'>💬 " + n + " " + escH(T.boutCmt) + "</button></div>";
          }).join("") + "</div>";
      }).join("");
    }
  }
  // 计数 + 未读：对阵按钮 = 整场（含各片段），片段按钮 = 该片段
  let unTotal = 0;
  document.querySelectorAll(".bout").forEach(el => {
    const bcid = el.dataset.bcid;
    const bc = cmts.filter(c => bOf(c) === bcid).sort(byTs);
    const un = bc.filter(isUnread).length;
    unTotal += un;
    const btn = el.querySelector(".cbtn");
    if(btn) btn.innerHTML = "💬 " + bc.length + " " + escH(T.boutCmt) + (un ? " <span class='ub'>" + un + " " + escH(T.newc) + "</span>" : (bc.length ? " · " + ago(bc[bc.length-1].ts) : ""));
    el.querySelectorAll(".vbtn").forEach(b => {
      const l3 = cmts.filter(c => c.videoId === b.dataset.vid);
      const u3 = l3.filter(isUnread).length;
      b.innerHTML = "💬 " + l3.length + (u3 ? " <span class='ub'>" + u3 + "</span>" : (l3.length ? " · " + ago(l3[l3.length-1].ts) : ""));
    });
  });
  if(MODE === "family"){
    const nb = document.getElementById("newBadge");
    if(unTotal){ nb.textContent = "● " + unTotal + " " + T.newCmts; nb.style.display = "inline-block"; } else nb.style.display = "none";
  }
  if(EMBED){ try{ parent.postMessage({ type: "cf-unread", n: unTotal }, "*"); }catch(e){} }
  // 分析面板打开时同步刷新其留言
  if(apVid) apRenderCmts();
  thumbsKick();
}
function openAt(vid, vt){
  openAnalysis(vid, apScope, true);
  if(!apV || isNaN(vt)) return;
  const go = function(){ apSeekTo(vt); };
  if(apV.readyState >= 1) go(); else apV.addEventListener("loadedmetadata", go, { once: true });
}
// ===== 缩略图：排队加载（同时最多 2 个，避免 iPhone 同时加载太多视频而报错）→ 截首帧存本地 → 释放视频 =====
const THUMBS = {};
let thQ = [], thRun = 0;
function fmtDur(d){ return Math.floor(d/60) + ":" + String(Math.round(d%60)).padStart(2,"0"); }
function thGet(id){
  if(THUMBS[id]) return THUMBS[id];
  try{ const s = localStorage.getItem("cth_" + id); if(s) return (THUMBS[id] = JSON.parse(s)); }catch(e){}
  return null;
}
function thPut(id, o){
  THUMBS[id] = o;
  try{ localStorage.setItem("cth_" + id, JSON.stringify(o)); }catch(e){}
}
function thApply(cell, o){
  const im = cell.querySelector("img.vth");
  if(im && o.i && im.getAttribute("src") !== o.i) im.src = o.i;
  const d = cell.querySelector(".dur");
  if(d && isFinite(o.d)) d.textContent = fmtDur(o.d);
}
function thumbsKick(){
  document.querySelectorAll(".vcell[data-src]").forEach(function(c){
    const o = thGet(c.dataset.vid);
    if(o) thApply(c, o);
    if((!o || !o.i) && !c.dataset.q){ c.dataset.q = "1"; thQ.push(c); }
  });
  thPump();
}
function thPump(){
  while(thRun < 2 && thQ.length){
    const c = thQ.shift();
    if(!c.isConnected) continue;
    thRun++;
    thLoad(c, 0).then(function(){ thRun--; thPump(); });
  }
}
function thLoad(cell, tries){
  return new Promise(function(res){
    const id = cell.dataset.vid;
    const had = thGet(id);
    if(had && had.i){ thApply(cell, had); return res(); }
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.className = "thv";
    let done = false;
    const end = function(keepVideo){
      if(done) return;
      done = true;
      clearTimeout(to);
      if(!keepVideo){ v.removeAttribute("src"); try{ v.load(); }catch(e){} v.remove(); }
    };
    const grab = function(){
      if(done) return;
      try{
        const w = 240, h = Math.round(w * ((v.videoHeight / v.videoWidth) || 0.5625));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const g = cv.getContext("2d");
        g.drawImage(v, 0, 0, w, h);
        // iPhone 偶尔画出全黑：这种情况不存图，直接把视频元素留作缩略图（已显示首帧）
        const px = g.getImageData(0, 0, w, h).data;
        let sum = 0;
        for(let k = 0; k < px.length; k += 400) sum += px[k] + px[k+1] + px[k+2];
        if(sum / (px.length / 400) < 12 && !v.dataset.later && isFinite(v.duration) && v.duration > 1){
          // 开头是黑画面（如屏幕录像）：往后跳一点再截一次
          v.dataset.later = "1";
          v.addEventListener("seeked", function(){ setTimeout(grab, 150); }, { once: true });
          v.currentTime = Math.min(2, v.duration / 3);
          return;
        }
        if(sum / (px.length / 400) < 12){ v.classList.add("show"); THUMBS[id] = { d: v.duration }; thApply(cell, THUMBS[id]); end(true); return res(); }
        thPut(id, { i: cv.toDataURL("image/jpeg", 0.6), d: v.duration });
        thApply(cell, THUMBS[id]);
      }catch(e){ v.classList.add("show"); end(true); return res(); }
      end(false); res();
    };
    v.addEventListener("loadedmetadata", function(){
      const d = cell.querySelector(".dur");
      if(d && isFinite(v.duration)) d.textContent = fmtDur(v.duration);
    }, { once: true });
    v.addEventListener("loadeddata", function(){ setTimeout(grab, 120); }, { once: true });
    v.addEventListener("error", function(){
      end(false);
      if(tries < 1) setTimeout(function(){ thLoad(cell, tries + 1).then(res); }, 1500);
      else { cell.classList.add("nothumb"); res(); }
    }, { once: true });
    const to = setTimeout(function(){ end(false); cell.classList.add("nothumb"); res(); }, 25000);
    cell.insertBefore(v, cell.firstChild);
    v.src = cell.dataset.src + "#t=0.1";
  });
}
function cmtHtml(c, inPanel){
  const shown = c.display || c.text;
  const hasOrig = c.orig && c.orig !== shown;
  const tagList = Array.isArray(c.tags) && c.tags.length ? c.tags : (c.tag ? [c.tag] : []);
  const tag = tagList.map(k => "<span class='tag'>" + escH(TAGS[k] || k) + "</span>").join("");
  const anch = c.vt != null ? "<span class='anchor'>⏱" + fmtT(c.vt) + "</span>" : "";
  const clips = boutClips[bOf(c)] || [];
  const ci = clips.indexOf(c.videoId);
  // 整场视图里，片段留言标 🎬N；点当前片段的留言跳到时间点，点其他片段的留言切到那个片段
  const seg = inPanel && apScope === "bout" && ci >= 0 && clips.length > 1 ? "<span class='seglab'>🎬" + (ci + 1) + "</span>" : "";
  const canSeek = inPanel && c.videoId === apVid && c.vt != null;
  let click = "";
  if(canSeek) click = " onclick='apSeekTo(" + c.vt + ")' style='cursor:pointer'";
  else if(inPanel && ci >= 0 && c.videoId !== apVid) click = " data-vid='" + escH(c.videoId) + "' data-vt='" + (c.vt != null ? c.vt : "") + "' onclick='openAt(this.dataset.vid, parseFloat(this.dataset.vt))' style='cursor:pointer'";
  let to = "";
  if(MODE === "family" && c.author !== "coach" && apCoach === "all"){ const co = coachOf(c.coachId); if(co) to = " <span class='tocn'>→ " + escH(co.name) + "</span>"; }
  const rep = MODE === "family" && inPanel && apCoach === "all" && c.author === "coach" ? "<span class='rep' data-co='" + escH(c.coachId) + "' onclick='event.stopPropagation();apSetCoach(this.dataset.co);apShowTxt()' title='Reply'>↩</span>" : "";
  const hl = isUnread(c) || (inPanel && apHL.has(c.id));
  return "<div class='cmt " + c.author + (hl ? " unread" : "") + "' data-cid='" + escH(c.id) + "'" + click + "><div class='who'>" + seg + tag + anch + whoLabel(c) + to + " · " + ago(c.ts) +
    "<span class='cmtcog' onclick='event.stopPropagation();cmtMenu(this)' title='⋯'>⋯</span>" + rep +
    (hasOrig ? "<span class='tr' onclick='event.stopPropagation();toggleOrig(this)' title='查看原文 / Original'>🌐</span>" : "") + "</div>" +
    (hasOrig ? "<div class='orig' style='display:none'>" + escH(c.orig) + "</div>" : "") +
    (c.audioUrl ? "<div class='au'><button class='aub' id='auB_" + auSan(c.id) + "' data-key='" + auSan(c.id) + "' data-url='" + escH(c.audioUrl) + "'" + (canSeek ? " data-vt='" + c.vt + "'" : "") + " onclick='event.stopPropagation();auPlay(this)'>▶</button><div class='aubar'><div class='aupg' id='auP_" + auSan(c.id) + "'></div></div><span class='autm' id='auT_" + auSan(c.id) + "'>0:00</span></div>" : "") +
    (shown && shown !== "🎤" ? escH(shown) : "") + "</div>";
}
// ===== 语音留言统一播放器：全局一个 Audio 实例，点另一个自动停、轮询重建不打断播放 =====
let auO = null, auKey = null;
function auSan(id){ return String(id).replace(/[^a-zA-Z0-9_]/g, "_"); }
function auPlay(btn){
  const key = btn.dataset.key, url = btn.dataset.url;
  const vt = parseFloat(btn.dataset.vt || "");
  if(!isNaN(vt) && apV){ apV.pause(); document.getElementById("apPlayBtn").textContent = "▶"; apV.currentTime = vt; }   // 语音定位：跳到它说的那个视频点
  if(auO && auKey === key){ if(auO.paused) auO.play().catch(function(){}); else auO.pause(); auSync(); return; }
  if(!auO){
    auO = new Audio();
    auO.addEventListener("timeupdate", auTickA);
    auO.addEventListener("loadedmetadata", auTickA);
    auO.addEventListener("ended", function(){ auSync(); });
  }
  auO.pause();
  auKey = key;
  auO.src = url;
  auO.play().catch(function(){});
  auSync();
}
function auTickA(){
  if(!auO || !auKey) return;
  const tm = document.getElementById("auT_" + auKey), pg = document.getElementById("auP_" + auKey);
  if(tm) tm.textContent = fmtT(auO.currentTime) + " / " + (isFinite(auO.duration) ? fmtT(auO.duration) : "…");
  if(pg && isFinite(auO.duration) && auO.duration > 0) pg.style.width = Math.min(100, auO.currentTime / auO.duration * 100) + "%";
}
function auSync(){
  document.querySelectorAll(".aub").forEach(function(b){ b.textContent = "▶"; });
  const b = document.getElementById("auB_" + auKey);
  if(b && auO) b.textContent = auO.paused ? "▶" : "❚❚";
}
// ===== 留言 ⋯ 菜单：删除 + 勾选标签（服务端保存） =====
function cmtMenu(btn){
  const host = btn.closest(".cmt");
  const c = cmts.find(x => x.id === host.dataset.cid);
  if(!c) return;
  const had = host.querySelector(".cmtmenu");
  if(had){ had.remove(); render(); if(apVid) apRenderCmts(); return; }
  document.querySelectorAll(".cmtmenu").forEach(function(e){ e.remove(); });
  const cur = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
  const m = document.createElement("div");
  m.className = "cmtmenu";
  m.innerHTML = TAG_ORDER.map(k => "<button data-tag='" + k + "'" + (cur.includes(k) ? " class='on'" : "") + ">" + escH(TAGS[k] || k) + "</button>").join("") +
    "<button class='del'>" + escH(T.del || "Delete") + "</button>";
  m.addEventListener("click", function(e){
    e.stopPropagation();
    const b = e.target.closest("button");
    if(!b) return;
    if(b.classList.contains("del")) cmtDel(host); else cmtTagToggle(host, b);
  });
  host.appendChild(m);
}
function cmtTagToggle(host, btn){
  const id = host.dataset.cid;
  const c = cmts.find(x => x.id === id);
  if(!c) return;
  btn.classList.toggle("on");
  const tags = Array.from(host.querySelectorAll(".cmtmenu button.on[data-tag]")).map(b => b.dataset.tag);
  c.tags = tags; delete c.tag;
  api({ action: "comment_tags", id, tags, coachId: c.coachId }).catch(function(){});
  render(); if(apVid) apRenderCmts();
}
function cmtDel(host){
  if(!confirm((T.del || "Delete") + "?")) return;
  const m = host.querySelector(".cmtmenu"); if(m) m.remove();   // 先关菜单，否则刷新守卫挡住本次渲染
  const id = host.dataset.cid;
  const c0 = cmts.find(c => c.id === id);
  cmts = cmts.filter(c => c.id !== id);
  api({ action: "comment_del", id, coachId: c0 && c0.coachId }).catch(function(){});
  render(); if(apVid) apRenderCmts();
}
function toggleOrig(el){
  const o = el.parentNode.parentNode.querySelector(".orig");
  if(o) o.style.display = (o.style.display === "block") ? "none" : "block";
}
async function setLang(v){
  if(v === "__custom"){
    v = prompt(T.langPh || "Your language?");
    if(!v || !v.trim()) return;
    v = v.trim();
  }
  dismissHint();
  try{
    await api({ action: "coach_setlang", lang: v });
    location.reload();
  }catch(e){}
}
let rec = null, recChunks = [];
load();
if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(function(){});
let pollN = 0;
setInterval(function(){ pollN++; if(apVid || pollN % 3 === 0) load(true); }, 5000);
</script></body></html>`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
