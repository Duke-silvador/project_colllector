// LJSportMind Play: soccer mini-games controlled by the body (camera + on-device MediaPipe pose AI)
// or by touch / keyboard. Each game doubles as a small body test: kick power per foot, reaction
// time, jump height and left/right knee balance are kept in "Your body in play".
// Video never leaves the device; only scores and a few numbers are saved.

const PLAY_KEY = "ljsportmind_play";
const PLAY_MODE_KEY = "ljsportmind_play_mode";
const PLAY_W = 800;
const PLAY_H = 500;

const I18N_PLAY = {
  en: {
    tabPlay: "Play",
    playKicker: "Play",
    playTitle: "Train your body. Beat the keeper.",
    playModeBody: "Body (camera)",
    playModeTouch: "Touch",
    playNoteBody: "Your camera and on-device AI read your kicks, dives, jumps and knees. Video never leaves your device.",
    playNoteTouch: "Swipe, tap or use the keyboard. Switch to Body mode to play with your whole body.",
    gPenalty: "Penalty Kick", gPenaltySub: "5 shots. Pick your corner and beat the keeper.",
    gFreekick: "Free Kick", gFreekickSub: "Bend it over or around the wall.",
    gLongpass: "Long-Range Assist", gLongpassSub: "Hit the runner in stride and he scores.",
    gSave: "Keeper Reflex", gSaveSub: "Dive the right way. Measures your reaction time.",
    gHeader: "Header Timing", gHeaderSub: "Jump at the perfect moment to head it in.",
    gJuggle: "Keepy-Uppy", gJuggleSub: "Knees only. How long can you keep it up?",
    playBest: "Best: {n}",
    hPenaltyBody: "Stand 2–3 m from the camera, whole body in view. Swing your leg to shoot: the direction of your kick aims, its speed is power, and a higher kick goes higher.",
    hPenaltyTouch: "Swipe from the ball toward the goal: a longer swipe hits harder. Keyboard: arrows to aim, hold and release Space to shoot.",
    hFreekickBody: "Kick like a penalty. Lean left or right as you kick to bend the ball around the wall.",
    hFreekickTouch: "Swipe toward the goal. Curve your swipe to bend the ball around the wall. Keyboard: arrows to aim, Space to shoot.",
    hLongpassBody: "Watch the runner. Kick toward where he is going, with enough power to reach him.",
    hLongpassTouch: "Swipe toward where the runner will be. A longer swipe is a longer pass. Keyboard: arrows to aim, Space to pass.",
    hSaveBody: "Face the camera. Step and lean left or right to dive. Jump for shots down the middle.",
    hSaveTouch: "Tap the left or right side to dive, the middle to jump. Keyboard: ← → to dive, ↑ to jump.",
    hHeaderBody: "Jump when the ball reaches the glowing zone.",
    hHeaderTouch: "Tap the pitch (or press Space) to jump when the ball reaches the glowing zone.",
    hJuggleBody: "Raise a knee to hip height when the ball drops. Switch legs to use both.",
    hJuggleTouch: "Tap the left or right side (or ← →) to knee the ball when it drops into the zone.",
    playShot: "Shot {n} of {total}",
    playRound: "Round {n} of {total}",
    playScore: "Score {n}",
    playTouches: "Touches {n}",
    playGoal: "GOAL!",
    playSaved: "Saved by the keeper",
    playWide: "Wide",
    playOver: "Over the bar",
    playBlocked: "Blocked by the wall",
    playIntercepted: "Intercepted",
    playMissedRunner: "Missed the runner",
    playAssist: "Assist! GOAL!",
    playAssistSaved: "Good pass. Keeper saved it.",
    playTooLate: "Too late",
    playTooEarly: "Too early",
    playGreatSave: "Great save!",
    playConceded: "Goal conceded",
    playHeaderGoal: "Header! GOAL!",
    playDropped: "Dropped!",
    playGetReady: "Get ready…",
    playKickNow: "Kick!",
    playCalibrating: "Stand still, whole body in view…",
    playResult: "You scored {score} of {total}",
    playResultJuggle: "{n} touches",
    playNewBest: "New best!",
    playAgain: "Play again",
    playQuit: "Back to games",
    playShare: "Copy my score",
    playShareText: "I got {score} in {game} on LJSportMind. Made with LJSportMind by @ljsoccer01",
    playCopied: "Copied!",
    playBodyTitle: "Your body in play",
    bStrongFoot: "Stronger kicking foot: {foot} ({n}% more power)",
    bFootEven: "Both feet kick with similar power",
    bLeft: "left",
    bRight: "right",
    bReaction: "Reaction time: {ms} ms",
    bJump: "Jump: {n}% of your torso height",
    bKnees: "Knee touches: left {l}, right {r}",
    bShooting: "Shots on target: {n}%",
    bEmpty: "Play a few games and this fills in. Body mode adds kick power, jump and knee balance."
  },
  es: {
    tabPlay: "Jugar",
    playKicker: "Jugar",
    playTitle: "Entrena tu cuerpo. Gánale al portero.",
    playModeBody: "Cuerpo (cámara)",
    playModeTouch: "Táctil",
    playNoteBody: "Tu cámara y una IA en tu dispositivo leen tus patadas, estiradas, saltos y rodillas. El video nunca sale de tu dispositivo.",
    playNoteTouch: "Desliza, toca o usa el teclado. Cambia a modo Cuerpo para jugar con todo el cuerpo.",
    gPenalty: "Penalti", gPenaltySub: "5 tiros. Elige tu esquina y gánale al portero.",
    gFreekick: "Tiro libre", gFreekickSub: "Pásala por encima o alrededor de la barrera.",
    gLongpass: "Asistencia larga", gLongpassSub: "Encuentra al delantero en carrera y marca.",
    gSave: "Reflejos de portero", gSaveSub: "Lánzate al lado correcto. Mide tu tiempo de reacción.",
    gHeader: "Cabezazo a tiempo", gHeaderSub: "Salta en el momento justo para cabecearla.",
    gJuggle: "Dominadas", gJuggleSub: "Solo rodillas. ¿Cuánto aguantas?",
    playBest: "Récord: {n}",
    hPenaltyBody: "Colócate a 2–3 m de la cámara, con todo el cuerpo a la vista. Patea: la dirección apunta, la velocidad es la potencia y una patada más alta va más alta.",
    hPenaltyTouch: "Desliza desde el balón hacia la portería: cuanto más largo, más fuerte. Teclado: flechas para apuntar, mantén y suelta Espacio para tirar.",
    hFreekickBody: "Patea como en un penalti. Inclínate a la izquierda o a la derecha al patear para curvar el balón.",
    hFreekickTouch: "Desliza hacia la portería. Curva el deslizamiento para rodear la barrera. Teclado: flechas para apuntar, Espacio para tirar.",
    hLongpassBody: "Mira al delantero. Patea hacia donde va, con fuerza suficiente para alcanzarlo.",
    hLongpassTouch: "Desliza hacia donde estará el delantero. Más largo es un pase más largo. Teclado: flechas para apuntar, Espacio para pasar.",
    hSaveBody: "Ponte de frente a la cámara. Da un paso e inclínate a un lado para lanzarte. Salta en los tiros al centro.",
    hSaveTouch: "Toca la izquierda o la derecha para lanzarte, el centro para saltar. Teclado: ← → para lanzarte, ↑ para saltar.",
    hHeaderBody: "Salta cuando el balón llegue a la zona brillante.",
    hHeaderTouch: "Toca el campo (o pulsa Espacio) para saltar cuando el balón llegue a la zona brillante.",
    hJuggleBody: "Sube una rodilla a la altura de la cadera cuando el balón baje. Alterna las piernas.",
    hJuggleTouch: "Toca la izquierda o la derecha (o ← →) para golpear con la rodilla cuando el balón baje.",
    playShot: "Tiro {n} de {total}",
    playRound: "Ronda {n} de {total}",
    playScore: "Puntos {n}",
    playTouches: "Toques {n}",
    playGoal: "¡GOL!",
    playSaved: "Lo paró el portero",
    playWide: "Desviado",
    playOver: "Por encima del larguero",
    playBlocked: "Bloqueado por la barrera",
    playIntercepted: "Interceptado",
    playMissedRunner: "No llegó al delantero",
    playAssist: "¡Asistencia! ¡GOL!",
    playAssistSaved: "Buen pase. El portero la paró.",
    playTooLate: "Demasiado tarde",
    playTooEarly: "Demasiado pronto",
    playGreatSave: "¡Gran parada!",
    playConceded: "Gol en contra",
    playHeaderGoal: "¡Cabezazo! ¡GOL!",
    playDropped: "¡Se cayó!",
    playGetReady: "Prepárate…",
    playKickNow: "¡Patea!",
    playCalibrating: "Quédate quieto, con todo el cuerpo a la vista…",
    playResult: "Marcaste {score} de {total}",
    playResultJuggle: "{n} toques",
    playNewBest: "¡Nuevo récord!",
    playAgain: "Jugar otra vez",
    playQuit: "Volver a los juegos",
    playShare: "Copiar mi resultado",
    playShareText: "Hice {score} en {game} en LJSportMind. Hecho con LJSportMind por @ljsoccer01",
    playCopied: "¡Copiado!",
    playBodyTitle: "Tu cuerpo en el juego",
    bStrongFoot: "Pie más fuerte: {foot} ({n}% más potencia)",
    bFootEven: "Ambos pies patean con una potencia similar",
    bLeft: "izquierdo",
    bRight: "derecho",
    bReaction: "Tiempo de reacción: {ms} ms",
    bJump: "Salto: {n}% de la altura de tu torso",
    bKnees: "Toques de rodilla: izquierda {l}, derecha {r}",
    bShooting: "Tiros a puerta: {n}%",
    bEmpty: "Juega unas partidas y esto se completa. El modo Cuerpo añade potencia de patada, salto y equilibrio de rodillas."
  },
  zh: {
    tabPlay: "游戏",
    playKicker: "游戏",
    playTitle: "锻炼身体，攻破门将。",
    playModeBody: "身体（摄像头）",
    playModeTouch: "触控",
    playNoteBody: "你的摄像头和设备上的 AI 会识别你的踢球、扑救、跳跃和抬膝。视频绝不会离开你的设备。",
    playNoteTouch: "滑动、点击或使用键盘。切换到身体模式即可用全身来玩。",
    gPenalty: "点球", gPenaltySub: "5 次射门。选好角度，攻破门将。",
    gFreekick: "任意球", gFreekickSub: "越过或绕过人墙。",
    gLongpass: "长传助攻", gLongpassSub: "传到奔跑中的队友脚下，让他破门。",
    gSave: "门将反应", gSaveSub: "扑向正确方向，测出你的反应时间。",
    gHeader: "头球时机", gHeaderSub: "在最佳时刻起跳，把球顶进去。",
    gJuggle: "颠球", gJuggleSub: "只用膝盖，你能颠多久？",
    playBest: "最佳：{n}",
    hPenaltyBody: "站在距摄像头 2–3 米处，让全身入镜。抬腿射门：踢的方向决定角度，速度决定力量，抬得越高球越高。",
    hPenaltyTouch: "从球向球门滑动：滑得越长，力量越大。键盘：方向键瞄准，按住并松开空格键射门。",
    hFreekickBody: "像罚点球一样踢。踢的时候向左或向右倾身，让球绕过人墙。",
    hFreekickTouch: "向球门滑动。滑出弧线让球绕过人墙。键盘：方向键瞄准，空格键射门。",
    hLongpassBody: "看着队友，朝他跑去的方向踢，力量要足够传到他脚下。",
    hLongpassTouch: "向队友将要到达的位置滑动，滑得越长传得越远。键盘：方向键瞄准，空格键传球。",
    hSaveBody: "面向摄像头。向左或向右跨步倾身即可扑救，中路射门就跳起来。",
    hSaveTouch: "点击左侧或右侧扑救，点击中间跳起。键盘：← → 扑救，↑ 跳起。",
    hHeaderBody: "当球到达发光区域时跳起来。",
    hHeaderTouch: "当球到达发光区域时点击球场（或按空格键）起跳。",
    hJuggleBody: "球落下时把膝盖抬到髋部高度，左右腿交替。",
    hJuggleTouch: "球落入区域时点击左侧或右侧（或 ← →）用膝盖颠球。",
    playShot: "第 {n} 次射门，共 {total} 次",
    playRound: "第 {n} 轮，共 {total} 轮",
    playScore: "得分 {n}",
    playTouches: "颠球 {n} 次",
    playGoal: "进球！",
    playSaved: "被门将扑出",
    playWide: "偏出",
    playOver: "高出横梁",
    playBlocked: "被人墙挡出",
    playIntercepted: "被拦截",
    playMissedRunner: "没传到队友",
    playAssist: "助攻！进球！",
    playAssistSaved: "传得好，门将扑出了。",
    playTooLate: "太晚了",
    playTooEarly: "太早了",
    playGreatSave: "精彩扑救！",
    playConceded: "被进球了",
    playHeaderGoal: "头球！进球！",
    playDropped: "球掉了！",
    playGetReady: "准备…",
    playKickNow: "踢！",
    playCalibrating: "请站稳，让全身入镜…",
    playResult: "你得了 {score} 分（共 {total}）",
    playResultJuggle: "{n} 次",
    playNewBest: "新纪录！",
    playAgain: "再玩一次",
    playQuit: "返回游戏",
    playShare: "复制我的成绩",
    playShareText: "我在 LJSportMind 的{game}中得了 {score}。由 @ljsoccer01 的 LJSportMind 制作",
    playCopied: "已复制！",
    playBodyTitle: "游戏中的你",
    bStrongFoot: "更强的踢球脚：{foot}（力量高 {n}%）",
    bFootEven: "两只脚的踢球力量相近",
    bLeft: "左脚",
    bRight: "右脚",
    bReaction: "反应时间：{ms} 毫秒",
    bJump: "跳跃：躯干高度的 {n}%",
    bKnees: "膝盖颠球：左 {l} 次，右 {r} 次",
    bShooting: "射正率：{n}%",
    bEmpty: "多玩几局就会显示。身体模式还会加入踢球力量、跳跃和膝盖平衡。"
  },
  ar: {
    tabPlay: "العب",
    playKicker: "العب",
    playTitle: "درّب جسمك. اهزم الحارس.",
    playModeBody: "الجسم (الكاميرا)",
    playModeTouch: "اللمس",
    playNoteBody: "تقرأ كاميرتك وذكاء اصطناعي على جهازك ركلاتك وارتماءاتك وقفزاتك وركبتيك. لا يغادر الفيديو جهازك أبدًا.",
    playNoteTouch: "اسحب أو انقر أو استخدم لوحة المفاتيح. انتقل إلى وضع الجسم لتلعب بجسمك كله.",
    gPenalty: "ركلة جزاء", gPenaltySub: "5 تسديدات. اختر الزاوية واهزم الحارس.",
    gFreekick: "ركلة حرة", gFreekickSub: "مرّرها فوق الحائط أو حوله.",
    gLongpass: "تمريرة حاسمة طويلة", gLongpassSub: "مرّر للمهاجم وهو يركض ليسجّل.",
    gSave: "ردّة فعل الحارس", gSaveSub: "ارتمِ في الاتجاه الصحيح. يقيس زمن ردّة فعلك.",
    gHeader: "توقيت الرأسية", gHeaderSub: "اقفز في اللحظة المثالية لتسجّل برأسك.",
    gJuggle: "تنطيط الكرة", gJuggleSub: "بالركبتين فقط. إلى متى تصمد؟",
    playBest: "الأفضل: {n}",
    hPenaltyBody: "قف على بعد 2–3 م من الكاميرا بحيث يظهر جسمك كاملًا. أرجح ساقك لتسدد: اتجاه الركلة يحدد الزاوية، وسرعتها القوة، والركلة الأعلى تذهب أعلى.",
    hPenaltyTouch: "اسحب من الكرة نحو المرمى: السحب الأطول أقوى. لوحة المفاتيح: الأسهم للتصويب، واضغط مطولًا على المسافة ثم أفلتها للتسديد.",
    hFreekickBody: "اركل كما في ركلة الجزاء. مِل يسارًا أو يمينًا أثناء الركل لتلتف الكرة حول الحائط.",
    hFreekickTouch: "اسحب نحو المرمى. اجعل سحبك منحنيًا لتلتف الكرة حول الحائط. لوحة المفاتيح: الأسهم للتصويب والمسافة للتسديد.",
    hLongpassBody: "راقب المهاجم. اركل نحو المكان الذي يتجه إليه وبقوة كافية للوصول إليه.",
    hLongpassTouch: "اسحب نحو المكان الذي سيصل إليه المهاجم. السحب الأطول تمريرة أطول. لوحة المفاتيح: الأسهم للتصويب والمسافة للتمرير.",
    hSaveBody: "قف مواجهًا للكاميرا. اخطُ ومِل يسارًا أو يمينًا لترتمي. اقفز للتسديدات في المنتصف.",
    hSaveTouch: "انقر يسارًا أو يمينًا لترتمي، وفي المنتصف لتقفز. لوحة المفاتيح: ← → للارتماء و↑ للقفز.",
    hHeaderBody: "اقفز عندما تصل الكرة إلى المنطقة المضيئة.",
    hHeaderTouch: "انقر على الملعب (أو اضغط المسافة) لتقفز عندما تصل الكرة إلى المنطقة المضيئة.",
    hJuggleBody: "ارفع ركبتك إلى مستوى الورك عندما تهبط الكرة. بدّل بين الساقين.",
    hJuggleTouch: "انقر يسارًا أو يمينًا (أو ← →) لتضرب الكرة بركبتك عندما تهبط إلى المنطقة.",
    playShot: "التسديدة {n} من {total}",
    playRound: "الجولة {n} من {total}",
    playScore: "النقاط {n}",
    playTouches: "اللمسات {n}",
    playGoal: "هدف!",
    playSaved: "تصدّى لها الحارس",
    playWide: "بجانب المرمى",
    playOver: "فوق العارضة",
    playBlocked: "صدّها الحائط",
    playIntercepted: "تم اعتراضها",
    playMissedRunner: "لم تصل إلى المهاجم",
    playAssist: "تمريرة حاسمة! هدف!",
    playAssistSaved: "تمريرة جيدة. تصدّى الحارس.",
    playTooLate: "متأخر جدًا",
    playTooEarly: "مبكر جدًا",
    playGreatSave: "تصدٍّ رائع!",
    playConceded: "استقبلت هدفًا",
    playHeaderGoal: "رأسية! هدف!",
    playDropped: "سقطت الكرة!",
    playGetReady: "استعد…",
    playKickNow: "اركل!",
    playCalibrating: "قف ثابتًا بحيث يظهر جسمك كاملًا…",
    playResult: "سجّلت {score} من {total}",
    playResultJuggle: "{n} لمسة",
    playNewBest: "رقم قياسي جديد!",
    playAgain: "العب مجددًا",
    playQuit: "العودة إلى الألعاب",
    playShare: "انسخ نتيجتي",
    playShareText: "حققت {score} في {game} على LJSportMind. صُنع باستخدام LJSportMind من ‎@ljsoccer01",
    playCopied: "تم النسخ!",
    playBodyTitle: "جسمك في اللعب",
    bStrongFoot: "القدم الأقوى في الركل: {foot} (قوة أكبر بـ {n}%)",
    bFootEven: "القدمان تركلان بقوة متقاربة",
    bLeft: "اليسرى",
    bRight: "اليمنى",
    bReaction: "زمن ردّة الفعل: {ms} مللي ثانية",
    bJump: "القفز: {n}% من طول جذعك",
    bKnees: "لمسات الركبة: يسار {l}، يمين {r}",
    bShooting: "التسديدات على المرمى: {n}%",
    bEmpty: "العب بضع مباريات وستمتلئ هذه البطاقة. وضع الجسم يضيف قوة الركلة والقفز وتوازن الركبتين."
  }
};
Object.keys(I18N_PLAY).forEach((lang) => Object.assign(I18N[lang], I18N_PLAY[lang]));

const GAME_LIST = [
  { id: "penalty", name: "gPenalty", sub: "gPenaltySub", how: "hPenalty", icon: "🥅" },
  { id: "freekick", name: "gFreekick", sub: "gFreekickSub", how: "hFreekick", icon: "🎯" },
  { id: "longpass", name: "gLongpass", sub: "gLongpassSub", how: "hLongpass", icon: "📐" },
  { id: "save", name: "gSave", sub: "gSaveSub", how: "hSave", icon: "🧤" },
  { id: "header", name: "gHeader", sub: "gHeaderSub", how: "hHeader", icon: "🦘" },
  { id: "juggle", name: "gJuggle", sub: "gJuggleSub", how: "hJuggle", icon: "🔁" }
];

// ---- Saved stats ----

function loadPlay() {
  try {
    return JSON.parse(localStorage.getItem(PLAY_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function savePlay(play) {
  try {
    localStorage.setItem(PLAY_KEY, JSON.stringify(play));
  } catch {
    // storage unavailable; stats won't persist
  }
}

function pushCapped(list, value, max = 20) {
  const next = (Array.isArray(list) ? list : []).concat([value]);
  return next.slice(-max);
}

function avg(list) {
  return list && list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
}

function recordPlay(update) {
  const play = loadPlay();
  update(play);
  savePlay(play);
  return play;
}

// Plain-English summary for the AI Coach.
function playSummaryText() {
  const p = loadPlay();
  const parts = [];
  const best = p.best || {};
  const bestText = Object.keys(best).map((k) => `${k} ${best[k]}`).join(", ");
  if (bestText) parts.push(`Game bests: ${bestText}`);
  const kl = avg(p.kickL), kr = avg(p.kickR);
  if (kl && kr) parts.push(`average kick foot speed left ${kl.toFixed(1)} m/s, right ${kr.toFixed(1)} m/s`);
  if (p.reactions && p.reactions.length) parts.push(`goalkeeper reaction time ${Math.round(avg(p.reactions))} ms`);
  if (p.jumps && p.jumps.length) parts.push(`jump ${Math.round(avg(p.jumps))}% of torso height`);
  if (p.kneeL || p.kneeR) parts.push(`knee juggling touches left ${p.kneeL || 0} / right ${p.kneeR || 0}`);
  if (p.shotsTotal) parts.push(`${Math.round((100 * (p.shotsOn || 0)) / p.shotsTotal)}% of shots on target`);
  return parts.join("; ");
}

// ---- Drawing helpers ----

const C = {
  grassA: "#1f6b3a", grassB: "#237a42", line: "rgba(255,255,255,0.85)", net: "rgba(255,255,255,0.28)",
  post: "#f4f4f4", sky1: "#0a0e1a", sky2: "#16213a", gold: "#e9c77b", keeper: "#2bb673", defender: "#c0392b",
  mate: "#e9c77b", you: "#e9c77b", ink: "#f2f3f6", shadow: "rgba(0,0,0,0.35)"
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function ease(t) {
  return 1 - Math.pow(1 - t, 2);
}

function drawBall(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = C.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#cfd3dc");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b2233";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A simple player figure standing at (x, y) = feet position. lean in radians rotates around the feet.
function drawPlayer(ctx, x, y, h, color, { lean = 0, armsUp = 0, legUp = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = h * 0.09;
  // legs
  ctx.beginPath();
  ctx.moveTo(-h * 0.08, 0);
  ctx.lineTo(-h * 0.04, -h * 0.42);
  ctx.moveTo(h * 0.08 + legUp * h * 0.2, -legUp * h * 0.25);
  ctx.lineTo(h * 0.04, -h * 0.42);
  ctx.stroke();
  // body
  ctx.lineWidth = h * 0.16;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.45);
  ctx.lineTo(0, -h * 0.78);
  ctx.stroke();
  // arms
  ctx.lineWidth = h * 0.07;
  const ay = -h * 0.74;
  ctx.beginPath();
  ctx.moveTo(-h * 0.02, ay);
  ctx.lineTo(-h * 0.24, ay + h * (0.22 - armsUp * 0.5));
  ctx.moveTo(h * 0.02, ay);
  ctx.lineTo(h * 0.24, ay + h * (0.22 - armsUp * 0.5));
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(0, -h * 0.9, h * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStadium(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, PLAY_H * 0.4);
  sky.addColorStop(0, C.sky1);
  sky.addColorStop(1, C.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PLAY_W, PLAY_H * 0.4);
  // crowd dots
  ctx.fillStyle = "rgba(233,199,123,0.18)";
  for (let i = 0; i < 160; i++) {
    const x = (i * 97) % PLAY_W;
    const y = 30 + ((i * 53) % 90);
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawGrass(ctx, top) {
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? C.grassA : C.grassB;
    const y0 = top + ((PLAY_H - top) * i) / 10;
    ctx.fillRect(0, y0, PLAY_W, (PLAY_H - top) / 10 + 1);
  }
}

// Goal seen from behind the shooter.
const GOAL = { x0: 230, x1: 570, top: 120, bot: 262 };
const GOAL_CX = (GOAL.x0 + GOAL.x1) / 2;
const GOAL_HW = (GOAL.x1 - GOAL.x0) / 2;
const GOAL_H = GOAL.bot - GOAL.top;

function drawShootingScene(ctx) {
  drawStadium(ctx);
  drawGrass(ctx, PLAY_H * 0.4);
  // penalty box lines
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, GOAL.bot + 2);
  ctx.lineTo(PLAY_W - 60, GOAL.bot + 2);
  ctx.moveTo(150, GOAL.bot + 2);
  ctx.lineTo(80, PLAY_H * 0.75);
  ctx.lineTo(PLAY_W - 80, PLAY_H * 0.75);
  ctx.lineTo(PLAY_W - 150, GOAL.bot + 2);
  ctx.stroke();
  // net
  ctx.strokeStyle = C.net;
  ctx.lineWidth = 1;
  for (let x = GOAL.x0; x <= GOAL.x1; x += 17) {
    ctx.beginPath();
    ctx.moveTo(x, GOAL.top);
    ctx.lineTo(x, GOAL.bot);
    ctx.stroke();
  }
  for (let y = GOAL.top; y <= GOAL.bot; y += 14) {
    ctx.beginPath();
    ctx.moveTo(GOAL.x0, y);
    ctx.lineTo(GOAL.x1, y);
    ctx.stroke();
  }
  // posts
  ctx.strokeStyle = C.post;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(GOAL.x0, GOAL.bot);
  ctx.lineTo(GOAL.x0, GOAL.top);
  ctx.lineTo(GOAL.x1, GOAL.top);
  ctx.lineTo(GOAL.x1, GOAL.bot);
  ctx.stroke();
}

function drawBanner(ctx, text, color = C.gold) {
  if (!text) return;
  ctx.save();
  ctx.font = "800 44px -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(10,14,26,0.85)";
  ctx.strokeText(text, PLAY_W / 2, PLAY_H * 0.47);
  ctx.fillStyle = color;
  ctx.fillText(text, PLAY_W / 2, PLAY_H * 0.47);
  ctx.restore();
}

function drawMeter(ctx, power) {
  ctx.save();
  ctx.fillStyle = "rgba(10,14,26,0.7)";
  ctx.fillRect(PLAY_W - 46, PLAY_H - 190, 22, 160);
  const g = ctx.createLinearGradient(0, PLAY_H - 30, 0, PLAY_H - 190);
  g.addColorStop(0, "#8fd19e");
  g.addColorStop(0.7, C.gold);
  g.addColorStop(1, "#e05a4f");
  ctx.fillStyle = g;
  ctx.fillRect(PLAY_W - 43, PLAY_H - 33 - 154 * power, 16, 154 * power);
  ctx.restore();
}

function drawReticle(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x - 8, y);
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 22, y);
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x, y + 22);
  ctx.stroke();
  ctx.restore();
}

// ---- Games ----
// Each game: { total, hud(), onInput(evt, now), update(dt, now), draw(ctx, now), done, score, resultText() }
// Inputs: { type: "kick", aimX -1..1 (beyond ±1 is wide), aimY 0..1 (beyond 1 is high), power 0..1, curve -1..1 }
//         { type: "dive", dir: -1 | 1 }  { type: "jump" }  { type: "knee", side: "L" | "R" }

function makeShootingGame(kind, mode) {
  const g = {
    kind, total: 5, shot: 0, score: 0, done: false,
    phase: "aim", t: 0, banner: "", bannerColor: C.gold,
    aim: { x: 0, y: 0.45 }, meter: { on: false, v: 0, dir: 1 },
    keeper: { x: GOAL_CX, from: GOAL_CX, to: GOAL_CX, lean: 0 },
    ball: { x: PLAY_W / 2, y: PLAY_H - 50, r: 17 },
    flight: null,
    wall: null
  };

  function newWall() {
    const center = GOAL_CX + (Math.random() * 2 - 1) * GOAL_HW * 0.45;
    return { x0: center - 62, x1: center + 62, y: 340, h: 70 };
  }
  if (kind === "freekick") g.wall = newWall();

  function resetShot() {
    g.phase = "aim";
    g.ball = { x: PLAY_W / 2, y: PLAY_H - 50, r: 17 };
    g.keeper = { x: GOAL_CX, from: GOAL_CX, to: GOAL_CX, lean: 0 };
    g.flight = null;
    g.banner = "";
    if (kind === "freekick") g.wall = newWall();
  }

  g.hud = () => `${tf("playShot", { n: Math.min(g.shot + 1, g.total), total: g.total })} · ${tf("playScore", { n: g.score })}`;

  g.onInput = (evt) => {
    if (g.phase !== "aim" || evt.type !== "kick") return;
    const aimX = clamp(evt.aimX, -1.4, 1.4);
    const aimY = clamp(evt.aimY, 0, 1.35);
    const power = clamp(evt.power, 0.05, 1);
    const curve = kind === "freekick" ? clamp(evt.curve || 0, -1, 1) : 0;
    const tx = GOAL_CX + aimX * GOAL_HW;
    const ty = GOAL.bot - aimY * GOAL_H;
    const duration = 0.95 - power * 0.5;

    const wide = Math.abs(aimX) > 1.0;
    const over = aimY > 1.0;
    // Keeper guesses at the moment of the kick, leaning toward the middle on soft shots.
    const guess = Math.random() < 0.35 - power * 0.15 ? 0 : Math.random() < 0.5 ? -1 : 1;
    const keeperTo = GOAL_CX + guess * GOAL_HW * 0.62;
    let reach = GOAL_HW * (0.46 - power * 0.2);
    if (aimY > 0.72 && Math.abs(aimX) > 0.62) reach *= 0.55; // top corners
    const saved = !wide && !over && Math.abs(tx - keeperTo) < reach;

    let blocked = false;
    if (g.wall) {
      const midX = lerp(PLAY_W / 2, tx, 0.5) + curve * 120;
      const lift = aimY * 0.55 + power * 0.3;
      blocked = midX > g.wall.x0 - 12 && midX < g.wall.x1 + 12 && lift < 0.62;
    }

    const outcome = blocked ? "blocked" : wide ? "wide" : over ? "over" : saved ? "saved" : "goal";
    g.flight = { tx, ty, curve, duration, start: null, outcome };
    g.keeper.from = g.keeper.x;
    g.keeper.to = keeperTo;
    g.phase = "flight";
    g.t = 0;
    recordPlay((p) => {
      p.shotsTotal = (p.shotsTotal || 0) + 1;
      if (!wide && !over && !blocked) p.shotsOn = (p.shotsOn || 0) + 1;
    });
  };

  g.update = (dt) => {
    if (mode === "touch" && g.phase === "aim" && g.meter.on) {
      g.meter.v += g.meter.dir * dt * 1.6;
      if (g.meter.v >= 1) { g.meter.v = 1; g.meter.dir = -1; }
      if (g.meter.v <= 0) { g.meter.v = 0; g.meter.dir = 1; }
    }
    if (g.phase === "flight") {
      g.t += dt;
      const f = g.flight;
      const p = clamp(g.t / f.duration, 0, 1);
      let stopAt = 1;
      if (f.outcome === "blocked") stopAt = 0.5;
      const q = Math.min(p, stopAt);
      g.ball.x = lerp(PLAY_W / 2, f.tx, q) + f.curve * 120 * Math.sin(Math.PI * q);
      g.ball.y = lerp(PLAY_H - 50, f.ty, ease(q)) - Math.sin(Math.PI * q) * 40;
      g.ball.r = lerp(17, 7, q);
      g.keeper.x = lerp(g.keeper.from, g.keeper.to, ease(clamp(g.t / (f.duration * 0.9), 0, 1)));
      g.keeper.lean = clamp((g.keeper.to - GOAL_CX) / GOAL_HW, -1, 1) * 1.1 * ease(clamp(g.t / f.duration, 0, 1));
      if (p >= 1 || (f.outcome === "blocked" && p >= 0.5)) {
        if (f.outcome === "goal") g.score += 1;
        g.banner = t({ goal: "playGoal", saved: "playSaved", wide: "playWide", over: "playOver", blocked: "playBlocked" }[f.outcome]);
        g.bannerColor = f.outcome === "goal" ? C.gold : C.ink;
        g.phase = "result";
        g.t = 0;
      }
    } else if (g.phase === "result") {
      g.t += dt;
      if (g.t > 1.4) {
        g.shot += 1;
        if (g.shot >= g.total) g.done = true;
        else resetShot();
      }
    }
  };

  // Keyboard / touch aiming
  g.aimBy = (dx, dy) => {
    g.aim.x = clamp(g.aim.x + dx, -1.2, 1.2);
    g.aim.y = clamp(g.aim.y + dy, 0, 1.15);
  };
  g.meterStart = () => {
    if (g.phase === "aim") g.meter = { on: true, v: 0, dir: 1 };
  };
  g.meterRelease = () => {
    if (!g.meter.on) return;
    const power = g.meter.v;
    g.meter.on = false;
    g.onInput({ type: "kick", aimX: g.aim.x, aimY: g.aim.y, power: 0.25 + power * 0.75, curve: 0 });
  };

  g.draw = (ctx) => {
    drawShootingScene(ctx);
    const k = g.keeper;
    drawPlayer(ctx, k.x, GOAL.bot - 2, 92, C.keeper, { lean: k.lean, armsUp: g.phase === "aim" ? 0.4 : 1 });
    if (g.wall) {
      const w = g.wall;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const x = lerp(w.x0 + 16, w.x1 - 16, i / (n - 1));
        drawPlayer(ctx, x, w.y, 92, C.defender, { armsUp: 0.15 });
      }
    }
    drawBall(ctx, g.ball.x, g.ball.y, g.ball.r);
    if (mode === "touch" && g.phase === "aim") {
      drawReticle(ctx, GOAL_CX + g.aim.x * GOAL_HW, GOAL.bot - g.aim.y * GOAL_H);
      if (g.meter.on) drawMeter(ctx, g.meter.v);
    }
    if (g.phase === "result") drawBanner(ctx, g.banner, g.bannerColor);
  };

  g.resultText = () => tf("playResult", { score: g.score, total: g.total });
  return g;
}

// Top-down long pass to a runner. The pass has to land where the runner will be.
function makeLongPassGame(mode) {
  const ORIGIN = { x: PLAY_W / 2, y: PLAY_H - 40 };
  const g = { total: 5, round: 0, score: 0, done: false, phase: "wait", t: 0, banner: "", aim: { x: 0, y: 0.55 }, meter: { on: false, v: 0, dir: 1 } };

  function setup() {
    const side = Math.random() < 0.5 ? -1 : 1;
    g.runner = { x0: PLAY_W / 2 + side * 300, y0: 300, x1: PLAY_W / 2 + side * (40 + Math.random() * 80), y1: 110 + Math.random() * 30, dur: 2.6 + Math.random() * 0.6 };
    g.defenders = Array.from({ length: 3 }, () => ({ x: 170 + Math.random() * 460, y: 170 + Math.random() * 150 }));
    g.ball = { x: ORIGIN.x, y: ORIGIN.y, z: 0 };
    g.pass = null;
    g.phase = "wait";
    g.t = 0;
    g.runT = 0;
    g.banner = "";
  }
  setup();

  const runnerAt = (time) => {
    const r = g.runner;
    const p = clamp(time / r.dur, 0, 1);
    return { x: lerp(r.x0, r.x1, p), y: lerp(r.y0, r.y1, p) };
  };

  g.hud = () => `${tf("playRound", { n: Math.min(g.round + 1, g.total), total: g.total })} · ${tf("playScore", { n: g.score })}`;

  g.onInput = (evt) => {
    if (g.phase !== "run" || evt.type !== "kick") return;
    const angle = clamp(evt.aimX, -1.3, 1.3) * (55 * Math.PI) / 180;
    const dist = 140 + clamp(evt.power, 0, 1) * 330;
    const land = { x: ORIGIN.x + Math.sin(angle) * dist, y: ORIGIN.y - Math.cos(angle) * dist };
    const duration = 0.55 + dist / 520;
    const lofted = evt.power > 0.7 || evt.aimY > 0.55;
    const arrive = runnerAt(g.runT + duration);
    const reached = Math.hypot(arrive.x - land.x, arrive.y - land.y) < 48;
    // A low pass is cut out by any defender close to its path.
    const cut = !lofted && g.defenders.some((d) => {
      const vx = land.x - ORIGIN.x, vy = land.y - ORIGIN.y;
      const u = clamp(((d.x - ORIGIN.x) * vx + (d.y - ORIGIN.y) * vy) / (vx * vx + vy * vy), 0, 1);
      return Math.hypot(ORIGIN.x + u * vx - d.x, ORIGIN.y + u * vy - d.y) < 24;
    });
    const scored = reached && !cut && Math.random() < 0.85;
    g.pass = { land, duration, lofted, outcome: cut ? "cut" : !reached ? "miss" : scored ? "goal" : "saved" };
    g.phase = "pass";
    g.t = 0;
  };

  g.update = (dt) => {
    if (mode === "touch" && g.meter.on) {
      g.meter.v += g.meter.dir * dt * 1.4;
      if (g.meter.v >= 1) { g.meter.v = 1; g.meter.dir = -1; }
      if (g.meter.v <= 0) { g.meter.v = 0; g.meter.dir = 1; }
    }
    g.t += dt;
    if (g.phase === "wait" && g.t > 1.0) {
      g.phase = "run";
      g.t = 0;
    }
    if (g.phase === "run" || g.phase === "pass") g.runT += dt;
    if (g.phase === "run" && g.runT > g.runner.dur + 0.3) {
      g.banner = t("playTooLate");
      g.phase = "result";
      g.t = 0;
    }
    if (g.phase === "pass") {
      const p = clamp(g.t / g.pass.duration, 0, 1);
      const stop = g.pass.outcome === "cut" ? 0.45 : 1;
      const q = Math.min(p, stop);
      g.ball.x = lerp(ORIGIN.x, g.pass.land.x, q);
      g.ball.y = lerp(ORIGIN.y, g.pass.land.y, q);
      g.ball.z = g.pass.lofted ? Math.sin(Math.PI * q) * 40 : 0;
      if (p >= 1 || (g.pass.outcome === "cut" && p >= 0.45)) {
        if (g.pass.outcome === "goal") g.score += 1;
        g.banner = t({ goal: "playAssist", saved: "playAssistSaved", miss: "playMissedRunner", cut: "playIntercepted" }[g.pass.outcome]);
        g.phase = "result";
        g.t = 0;
      }
    }
    if (g.phase === "result" && g.t > 1.5) {
      g.round += 1;
      if (g.round >= g.total) g.done = true;
      else setup();
    }
  };

  g.aimBy = (dx, dy) => {
    g.aim.x = clamp(g.aim.x + dx, -1.2, 1.2);
    g.aim.y = clamp(g.aim.y + dy, 0, 1);
  };
  g.meterStart = () => {
    if (g.phase === "run") g.meter = { on: true, v: 0, dir: 1 };
  };
  g.meterRelease = () => {
    if (!g.meter.on) return;
    g.meter.on = false;
    g.onInput({ type: "kick", aimX: g.aim.x, aimY: g.aim.y, power: g.meter.v, curve: 0 });
  };

  g.draw = (ctx) => {
    drawGrass(ctx, 0);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3;
    ctx.strokeRect(150, 0, 500, 150);
    ctx.strokeRect(290, 0, 220, 55);
    ctx.beginPath();
    ctx.arc(PLAY_W / 2, PLAY_H + 40, 120, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.fillStyle = C.post;
    ctx.fillRect(345, 0, 110, 8);
    // keeper
    ctx.fillStyle = C.keeper;
    ctx.beginPath();
    ctx.arc(PLAY_W / 2, 22, 13, 0, Math.PI * 2);
    ctx.fill();
    g.defenders.forEach((d) => {
      ctx.fillStyle = C.defender;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
      ctx.fill();
    });
    const r = runnerAt(g.runT);
    ctx.fillStyle = C.mate;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 15, 0, Math.PI * 2);
    ctx.fill();
    // you
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y + 18, 15, 0, Math.PI * 2);
    ctx.fill();
    if (mode === "touch" && g.phase === "run") {
      const angle = g.aim.x * (55 * Math.PI) / 180;
      ctx.strokeStyle = C.gold;
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ORIGIN.x, ORIGIN.y);
      ctx.lineTo(ORIGIN.x + Math.sin(angle) * 200, ORIGIN.y - Math.cos(angle) * 200);
      ctx.stroke();
      ctx.setLineDash([]);
      if (g.meter.on) drawMeter(ctx, g.meter.v);
    }
    drawBall(ctx, g.ball.x, g.ball.y - g.ball.z, 10 + g.ball.z * 0.1);
    if (g.phase === "wait") drawBanner(ctx, t("playGetReady"), C.ink);
    if (g.phase === "result") drawBanner(ctx, g.banner, g.pass && g.pass.outcome === "goal" ? C.gold : C.ink);
  };

  g.resultText = () => tf("playResult", { score: g.score, total: g.total });
  return g;
}

// You are the keeper. Dive the right way after the shot, before the ball arrives.
function makeSaveGame() {
  const TARGETS = { L: { x: 175, y: 330, dir: -1 }, C: { x: 400, y: 300, dir: 0 }, R: { x: 625, y: 330, dir: 1 } };
  const g = { total: 8, round: 0, score: 0, done: false, phase: "wait", t: 0, banner: "", reactions: [] };

  function setup() {
    g.phase = "wait";
    g.t = 0;
    g.delay = 1.1 + Math.random() * 1.4;
    const keys = ["L", "R", "L", "R", "C"];
    g.target = TARGETS[keys[Math.floor(Math.random() * keys.length)]];
    g.flight = Math.max(0.48, 0.85 - g.round * 0.045);
    g.response = null;
    g.ball = { x: 400, y: 150, r: 7 };
    g.banner = "";
  }
  setup();

  g.hud = () => `${tf("playRound", { n: Math.min(g.round + 1, g.total), total: g.total })} · ${tf("playScore", { n: g.score })}`;

  g.onInput = (evt) => {
    if (g.response || (evt.type !== "dive" && evt.type !== "jump")) return;
    if (g.phase !== "wait" && g.phase !== "shot") return;
    g.response = { dir: evt.type === "jump" ? 0 : evt.dir, at: g.phase === "shot" ? g.t : -1 };
  };

  g.update = (dt) => {
    g.t += dt;
    if (g.phase === "wait" && g.t > g.delay) {
      g.phase = "shot";
      g.t = 0;
    }
    if (g.phase === "shot") {
      const p = clamp(g.t / g.flight, 0, 1);
      g.ball.x = lerp(400, g.target.x, p);
      g.ball.y = lerp(150, g.target.y, p);
      g.ball.r = lerp(7, 34, p * p);
      if (p >= 1) {
        const r = g.response;
        const early = r && r.at < 0.06;
        const ok = r && r.dir === g.target.dir;
        if (ok) {
          g.score += 1;
          if (!early) g.reactions.push(Math.round(r.at * 1000));
        }
        g.banner = t(ok ? "playGreatSave" : !r ? "playTooLate" : "playConceded");
        g.phase = "result";
        g.t = 0;
      }
    }
    if (g.phase === "result" && g.t > 1.3) {
      g.round += 1;
      if (g.round >= g.total) {
        g.done = true;
        if (g.reactions.length) recordPlay((p) => { p.reactions = pushCapped(p.reactions, Math.round(avg(g.reactions))); });
      } else setup();
    }
  };

  g.draw = (ctx) => {
    drawStadium(ctx);
    drawGrass(ctx, PLAY_H * 0.4);
    // the shooter far away
    drawPlayer(ctx, 400, 170, 60, C.defender, { legUp: g.phase === "shot" && g.t < 0.2 ? 1 : 0 });
    // the goal frame around you
    ctx.strokeStyle = C.post;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(60, PLAY_H);
    ctx.lineTo(60, 210);
    ctx.lineTo(PLAY_W - 60, 210);
    ctx.lineTo(PLAY_W - 60, PLAY_H);
    ctx.stroke();
    drawBall(ctx, g.ball.x, g.ball.y, g.ball.r);
    // you (from behind)
    const r = g.response;
    const dir = r ? r.dir : 0;
    const jump = r && r.dir === 0 ? -40 : 0;
    drawPlayer(ctx, 400 + dir * 150, PLAY_H - 10 + jump, 150, C.keeper, { lean: dir * 1.05, armsUp: 1 });
    if (g.phase === "wait" && g.t < 0.8) drawBanner(ctx, t("playGetReady"), C.ink);
    if (g.phase === "result") drawBanner(ctx, g.banner, g.banner === t("playGreatSave") ? C.gold : C.ink);
  };

  g.resultText = () => tf("playResult", { score: g.score, total: g.total });
  return g;
}

// Side view: a cross comes in; jump when it reaches the head zone.
function makeHeaderGame() {
  const HEAD = { x: 230, y: 250 };
  const g = { total: 8, round: 0, score: 0, done: false, phase: "wait", t: 0, banner: "", jumpT: -1 };

  function setup() {
    g.phase = "wait";
    g.t = 0;
    g.flight = 1.15 + Math.random() * 0.5;
    g.ball = { x: PLAY_W + 20, y: 140 };
    g.jumpT = -1;
    g.headed = null;
    g.banner = "";
  }
  setup();

  g.hud = () => `${tf("playRound", { n: Math.min(g.round + 1, g.total), total: g.total })} · ${tf("playScore", { n: g.score })}`;

  g.onInput = (evt) => {
    if (evt.type !== "jump" || g.jumpT >= 0 || g.phase !== "cross") return;
    g.jumpT = g.t;
  };

  g.update = (dt) => {
    g.t += dt;
    if (g.phase === "wait" && g.t > 0.9) {
      g.phase = "cross";
      g.t = 0;
    }
    if (g.phase === "cross") {
      const p = g.t / g.flight;
      if (!g.headed) {
        g.ball.x = lerp(PLAY_W + 20, HEAD.x, p);
        g.ball.y = lerp(140, HEAD.y, p) - Math.sin(Math.PI * Math.min(p, 1)) * 120;
        // The header connects if the jump happens 0.05–0.35 s before the ball reaches the head.
        if (g.jumpT >= 0 && p >= 0.98) {
          const lead = g.flight - g.jumpT;
          g.headed = lead >= 0.05 && lead <= 0.38 ? "goal" : lead > 0.38 ? "early" : "late";
          g.t = 0;
        } else if (p > 1.15) {
          g.headed = "late";
          g.t = 0;
        }
      } else {
        if (g.headed === "goal") {
          const q = clamp(g.t / 0.45, 0, 1);
          g.ball.x = lerp(HEAD.x, 50, q);
          g.ball.y = lerp(HEAD.y - 40, 330, q);
        } else {
          g.ball.x -= dt * 260;
          g.ball.y += dt * 220;
        }
        if (g.t > 0.5) {
          if (g.headed === "goal") g.score += 1;
          g.banner = t({ goal: "playHeaderGoal", early: "playTooEarly", late: "playTooLate" }[g.headed]);
          g.phase = "result";
          g.t = 0;
        }
      }
    }
    if (g.phase === "result" && g.t > 1.2) {
      g.round += 1;
      if (g.round >= g.total) g.done = true;
      else setup();
    }
  };

  g.draw = (ctx) => {
    drawStadium(ctx);
    drawGrass(ctx, PLAY_H * 0.4);
    // goal on the left
    ctx.strokeStyle = C.post;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(30, PLAY_H - 40);
    ctx.lineTo(30, 250);
    ctx.lineTo(95, 250);
    ctx.stroke();
    ctx.strokeStyle = C.net;
    ctx.lineWidth = 1;
    for (let y = 260; y < PLAY_H - 40; y += 14) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(95, y);
      ctx.stroke();
    }
    // head zone glow
    const glow = g.phase === "cross" && !g.headed ? 0.25 + 0.2 * Math.sin(g.t * 12) : 0.12;
    ctx.fillStyle = `rgba(233,199,123,${glow})`;
    ctx.beginPath();
    ctx.arc(HEAD.x, HEAD.y - 45, 46, 0, Math.PI * 2);
    ctx.fill();
    const jumping = g.jumpT >= 0 && g.phase === "cross" ? Math.max(0, Math.sin(Math.PI * clamp((g.t - g.jumpT) / 0.6, 0, 1))) : 0;
    drawPlayer(ctx, HEAD.x, PLAY_H - 40 - jumping * 70, 190, C.you, { armsUp: jumping });
    drawBall(ctx, g.ball.x, g.ball.y, 13);
    if (g.phase === "wait") drawBanner(ctx, t("playGetReady"), C.ink);
    if (g.phase === "result") drawBanner(ctx, g.banner, g.banner === t("playHeaderGoal") ? C.gold : C.ink);
  };

  g.resultText = () => tf("playResult", { score: g.score, total: g.total });
  return g;
}

// Knee juggling: keep the ball up; it gets a little faster as you go.
function makeJuggleGame() {
  const ZONE = 360;
  const FLOOR = 450;
  const g = { total: 0, score: 0, done: false, phase: "wait", t: 0, banner: "", ball: { x: 400, y: 80, vx: 0, vy: 0 }, knees: { L: 0, R: 0 }, flash: null };

  g.hud = () => tf("playTouches", { n: g.score });

  g.onInput = (evt) => {
    if (evt.type !== "knee" || g.phase !== "play") return;
    const b = g.ball;
    if (b.y < ZONE - 20 || b.vy < 0) return;
    b.vy = -(470 + Math.random() * 90 + Math.min(g.score, 30) * 4);
    b.vx = (evt.side === "L" ? -1 : 1) * (25 + Math.random() * 55);
    g.score += 1;
    g.knees[evt.side] += 1;
    g.flash = { side: evt.side, t: 0.25 };
  };

  g.update = (dt) => {
    g.t += dt;
    if (g.flash) g.flash.t -= dt;
    if (g.phase === "wait" && g.t > 1.0) {
      g.phase = "play";
      g.t = 0;
    }
    if (g.phase === "play") {
      const b = g.ball;
      const gravity = 900 + Math.min(g.score, 40) * 12;
      b.vy += gravity * dt;
      b.x += b.vx * dt;
      if (b.x < 260 || b.x > 540) {
        b.x = clamp(b.x, 260, 540);
        b.vx = -b.vx;
      }
      b.y += b.vy * dt;
      if (b.y > FLOOR) {
        g.banner = t("playDropped");
        g.phase = "result";
        g.t = 0;
        recordPlay((p) => {
          p.kneeL = (p.kneeL || 0) + g.knees.L;
          p.kneeR = (p.kneeR || 0) + g.knees.R;
        });
      }
    }
    if (g.phase === "result" && g.t > 1.2) g.done = true;
  };

  g.draw = (ctx) => {
    drawStadium(ctx);
    drawGrass(ctx, PLAY_H * 0.4);
    ctx.fillStyle = "rgba(233,199,123,0.14)";
    ctx.fillRect(220, ZONE - 20, 360, FLOOR - ZONE + 20);
    ctx.strokeStyle = "rgba(233,199,123,0.6)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(220, ZONE - 20);
    ctx.lineTo(580, ZONE - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    const lift = g.flash && g.flash.t > 0 ? g.flash.side : null;
    drawPlayer(ctx, 400, PLAY_H - 8, 220, C.you, { legUp: lift ? 0.8 : 0, lean: lift === "L" ? -0.05 : lift === "R" ? 0.05 : 0 });
    drawBall(ctx, g.ball.x, g.ball.y, 16);
    if (g.phase === "wait") drawBanner(ctx, t("playGetReady"), C.ink);
    if (g.phase === "result") drawBanner(ctx, g.banner, C.ink);
  };

  g.resultText = () => tf("playResultJuggle", { n: g.score });
  return g;
}

function createGame(id, mode) {
  if (id === "penalty") return makeShootingGame("penalty", mode);
  if (id === "freekick") return makeShootingGame("freekick", mode);
  if (id === "longpass") return makeLongPassGame(mode);
  if (id === "save") return makeSaveGame();
  if (id === "header") return makeHeaderGame();
  return makeJuggleGame();
}

// ---- Body input: turns pose landmarks into game events ----

const PI_IDX = { lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };

function createBodyInput(emit) {
  const s = { calib: [], base: null, prev: null, cooldown: { kick: 0, dive: 0, jump: 0, L: 0, R: 0 }, lastDive: 0, jumpPeak: 0, kneeUp: { L: false, R: false } };

  return {
    calibrated: () => !!s.base,
    process(lm, world, now, aspect) {
      const I = PI_IDX;
      const need = Object.values(I);
      if (!lm || !world || !need.every((i) => lm[i] && (lm[i].visibility === undefined || lm[i].visibility > 0.5))) return "hidden";
      const hipX = (lm[I.lHip].x + lm[I.rHip].x) / 2;
      const hipY = (lm[I.lHip].y + lm[I.rHip].y) / 2;
      const shY = (lm[I.lShoulder].y + lm[I.rShoulder].y) / 2;
      const shX = (lm[I.lShoulder].x + lm[I.rShoulder].x) / 2;
      const torso = Math.max(0.05, hipY - shY);
      const shoulderW = Math.max(0.03, Math.abs(lm[I.lShoulder].x - lm[I.rShoulder].x));

      if (!s.base) {
        s.calib.push({ hipX, hipY, torso, shoulderW });
        if (s.calib.length >= 30) {
          const m = (k) => s.calib.reduce((a, c) => a + c[k], 0) / s.calib.length;
          s.base = { hipX: m("hipX"), hipY: m("hipY"), torso: m("torso"), shoulderW: m("shoulderW") };
        }
        s.prev = { now, world, lm };
        return "calibrating";
      }

      const dt = Math.max(0.016, (now - s.prev.now) / 1000);
      // Kicks: 3D ankle speed (m/s) from world landmarks; direction from the image (screen is mirrored).
      ["L", "R"].forEach((side) => {
        const ai = side === "L" ? I.lAnkle : I.rAnkle;
        const other = side === "L" ? I.rAnkle : I.lAnkle;
        const a = world[ai], pa = s.prev.world[ai];
        const speed = Math.hypot(a.x - pa.x, a.y - pa.y, (a.z || 0) - (pa.z || 0)) / dt;
        const lifted = lm[other].y - lm[ai].y > 0.04;
        if (speed > 2.2 && lifted && now > s.cooldown.kick) {
          const vxScreen = -(lm[ai].x - s.prev.lm[ai].x) * aspect / dt;
          const vyUp = -(lm[ai].y - s.prev.lm[ai].y) / dt;
          const aimX = clamp((vxScreen / (Math.abs(vxScreen) + Math.abs(vyUp) + 0.4)) * 1.9, -1.35, 1.35);
          const aimY = clamp((lm[other].y - lm[ai].y) / s.base.torso * 1.3, 0, 1.3);
          const power = clamp((speed - 2) / 5, 0.1, 1);
          const lean = ((shX - hipX) * aspect) / (s.base.shoulderW * aspect);
          s.cooldown.kick = now + 900;
          recordPlay((p) => { p[side === "L" ? "kickL" : "kickR"] = pushCapped(p[side === "L" ? "kickL" : "kickR"], Math.round(speed * 10) / 10); });
          emit({ type: "kick", foot: side, aimX, aimY, power, curve: clamp(-lean * 3, -1, 1) });
        }
      });
      // Dives: hips shift sideways by more than half a shoulder width.
      const shift = -(hipX - s.base.hipX) / s.base.shoulderW;
      if (Math.abs(shift) > 0.55 && now > s.cooldown.dive) {
        s.cooldown.dive = now + 700;
        emit({ type: "dive", dir: shift > 0 ? 1 : -1 });
      }
      // Jumps: hips rise more than 12% of torso length above standing height.
      const rise = (s.base.hipY - hipY) / s.base.torso;
      if (rise > 0.12) {
        s.jumpPeak = Math.max(s.jumpPeak, rise);
        if (now > s.cooldown.jump) {
          s.cooldown.jump = now + 700;
          emit({ type: "jump" });
        }
      } else if (s.jumpPeak > 0 && rise < 0.04) {
        const peak = Math.round(s.jumpPeak * 100);
        s.jumpPeak = 0;
        recordPlay((p) => { p.jumps = pushCapped(p.jumps, peak); });
      }
      // Knee raises: knee comes up close to hip height (edge-triggered per leg).
      ["L", "R"].forEach((side) => {
        const k = lm[side === "L" ? I.lKnee : I.rKnee];
        const h = lm[side === "L" ? I.lHip : I.rHip];
        const up = (k.y - h.y) / s.base.torso < 0.32;
        if (up && !s.kneeUp[side] && now > s.cooldown[side]) {
          s.cooldown[side] = now + 260;
          emit({ type: "knee", side });
        }
        s.kneeUp[side] = up;
      });
      s.prev = { now, world, lm };
      return "ok";
    }
  };
}

// ---- Interface ----

const playMenu = document.getElementById("playMenu");
const playStage = document.getElementById("playStage");
const playCanvas = document.getElementById("playCanvas");
const playPrompt = document.getElementById("playPrompt");
const playResultBox = document.getElementById("playResult");
const playCam = document.getElementById("playCam");
const playVideo = document.getElementById("playVideo");
const playCamCanvas = document.getElementById("playCamCanvas");
let playMode = (() => {
  try {
    return localStorage.getItem(PLAY_MODE_KEY) || "touch";
  } catch {
    return "touch";
  }
})();
let current = null; // { id, game, raf, stream, body, last }
let poseLandmarker = null;

async function loadPose() {
  if (poseLandmarker) return poseLandmarker;
  const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
  const vision = await import(`${base}/vision_bundle.mjs`);
  const files = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
  poseLandmarker = await vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1
  });
  return poseLandmarker;
}

function renderModes() {
  document.querySelectorAll(".play-mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === playMode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === playMode));
  });
  document.getElementById("playNote").textContent = t(playMode === "body" ? "playNoteBody" : "playNoteTouch");
}

function renderGameGrid() {
  const grid = document.getElementById("gameGrid");
  const best = loadPlay().best || {};
  grid.innerHTML = "";
  GAME_LIST.forEach((gm) => {
    const card = el("button", "game-card");
    card.type = "button";
    card.append(el("span", "game-icon", gm.icon), el("strong", "", t(gm.name)), el("span", "game-sub", t(gm.sub)));
    if (best[gm.id] !== undefined) card.append(el("span", "game-best", tf("playBest", { n: best[gm.id] })));
    card.addEventListener("click", () => startGame(gm.id));
    grid.append(card);
  });
}

function renderPlayBody() {
  const list = document.getElementById("playBody");
  const p = loadPlay();
  list.innerHTML = "";
  const lines = [];
  const kl = avg(p.kickL), kr = avg(p.kickR);
  if (kl && kr) {
    const diff = Math.round((Math.abs(kl - kr) / Math.min(kl, kr)) * 100);
    lines.push(diff < 8 ? t("bFootEven") : tf("bStrongFoot", { foot: t(kl > kr ? "bLeft" : "bRight"), n: diff }));
  }
  if (p.reactions && p.reactions.length) lines.push(tf("bReaction", { ms: Math.round(avg(p.reactions)) }));
  if (p.jumps && p.jumps.length) lines.push(tf("bJump", { n: Math.round(avg(p.jumps)) }));
  if (p.kneeL || p.kneeR) lines.push(tf("bKnees", { l: p.kneeL || 0, r: p.kneeR || 0 }));
  if (p.shotsTotal) lines.push(tf("bShooting", { n: Math.round((100 * (p.shotsOn || 0)) / p.shotsTotal) }));
  if (!lines.length) lines.push(t("bEmpty"));
  lines.forEach((line) => list.append(el("li", "", line)));
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  playCanvas.width = PLAY_W * dpr;
  playCanvas.height = PLAY_H * dpr;
  playCanvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toCanvas(e) {
  const r = playCanvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * PLAY_W, y: ((e.clientY - r.top) / r.height) * PLAY_H };
}

async function startGame(id) {
  stopGame();
  const meta = GAME_LIST.find((g) => g.id === id);
  playMenu.hidden = true;
  playStage.hidden = false;
  playResultBox.hidden = true;
  document.getElementById("playGameName").textContent = t(meta.name);
  document.getElementById("playHowTo").textContent = t(meta.how + (playMode === "body" ? "Body" : "Touch"));
  fitCanvas();
  current = { id, game: createGame(id, playMode), raf: 0, stream: null, body: null, last: performance.now(), ended: false };
  playStage.scrollIntoView({ behavior: "smooth", block: "start" });

  if (playMode === "body") {
    const session = current;
    playPrompt.textContent = t("mvLoading");
    try {
      await loadPose();
      session.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
    } catch (err) {
      if (current !== session) return;
      playPrompt.textContent = t(poseLandmarker ? "mvCameraError" : "mvModelError");
      return;
    }
    if (current !== session) {
      session.stream.getTracks().forEach((tr) => tr.stop());
      return;
    }
    playVideo.srcObject = session.stream;
    await playVideo.play();
    playCam.hidden = false;
    session.body = createBodyInput((evt) => session.game.onInput(evt, performance.now()));
  } else {
    playPrompt.textContent = "";
  }
  loop();
}

function drawCam(lm) {
  const ctx = playCamCanvas.getContext("2d");
  playCamCanvas.width = playVideo.videoWidth || 320;
  playCamCanvas.height = playVideo.videoHeight || 240;
  ctx.clearRect(0, 0, playCamCanvas.width, playCamCanvas.height);
  if (!lm) return;
  const bones = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
  ctx.strokeStyle = "#e9c77b";
  ctx.lineWidth = 6;
  bones.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(lm[a].x * playCamCanvas.width, lm[a].y * playCamCanvas.height);
    ctx.lineTo(lm[b].x * playCamCanvas.width, lm[b].y * playCamCanvas.height);
    ctx.stroke();
  });
}

function loop() {
  const s = current;
  if (!s) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - s.last) / 1000);
  s.last = now;

  let status = "ok";
  if (s.body && playVideo.readyState >= 2) {
    const result = poseLandmarker.detectForVideo(playVideo, now);
    const lm = result.landmarks && result.landmarks[0];
    const world = result.worldLandmarks && result.worldLandmarks[0];
    drawCam(lm);
    status = s.body.process(lm, world, now, (playVideo.videoWidth || 4) / (playVideo.videoHeight || 3));
  }
  if (s.body) {
    playPrompt.textContent = status === "hidden" ? t("mvStepBack") : status === "calibrating" ? t("playCalibrating") : "";
  }

  // In body mode the game waits for calibration before it starts moving.
  if (!s.body || s.body.calibrated()) s.game.update(dt, now);
  const ctx = playCanvas.getContext("2d");
  s.game.draw(ctx, now);
  document.getElementById("playHud").textContent = s.game.hud();

  if (s.game.done && !s.ended) {
    s.ended = true;
    finishGame();
  }
  s.raf = requestAnimationFrame(loop);
}

function finishGame() {
  const s = current;
  const score = s.game.score;
  let newBest = false;
  recordPlay((p) => {
    p.best = p.best || {};
    if (p.best[s.id] === undefined || score > p.best[s.id]) {
      p.best[s.id] = score;
      newBest = true;
    }
    p.plays = (p.plays || 0) + 1;
  });
  const meta = GAME_LIST.find((g) => g.id === s.id);
  playResultBox.innerHTML = "";
  playResultBox.append(el("p", "play-result-score", s.game.resultText()));
  if (newBest && score > 0) playResultBox.append(el("p", "play-result-best", t("playNewBest")));
  const actions = el("div", "play-result-actions");
  const again = el("button", "", t("playAgain"));
  again.type = "button";
  again.addEventListener("click", () => startGame(s.id));
  const share = el("button", "secondary", t("playShare"));
  share.type = "button";
  share.addEventListener("click", async () => {
    const text = tf("playShareText", { score: s.id === "juggle" ? score : `${score}/${s.game.total}`, game: t(meta.name) });
    try {
      await navigator.clipboard.writeText(text);
      share.textContent = t("playCopied");
    } catch {
      // clipboard blocked; nothing to fall back to
    }
  });
  actions.append(again, share);
  playResultBox.append(actions);
  playResultBox.hidden = false;
}

function stopGame() {
  const s = current;
  current = null;
  if (!s) return;
  cancelAnimationFrame(s.raf);
  if (s.stream) s.stream.getTracks().forEach((tr) => tr.stop());
  playVideo.srcObject = null;
  playCam.hidden = true;
}

function backToMenu() {
  stopGame();
  playStage.hidden = true;
  playMenu.hidden = false;
  renderGameGrid();
  renderPlayBody();
}

// Touch: swipes kick, taps dive / jump / knee.
let swipe = null;
playCanvas.addEventListener("pointerdown", (e) => {
  if (!current || playMode !== "touch") return;
  playCanvas.setPointerCapture(e.pointerId);
  swipe = { start: toCanvas(e), path: [toCanvas(e)], at: performance.now() };
});
playCanvas.addEventListener("pointermove", (e) => {
  if (swipe) swipe.path.push(toCanvas(e));
});
playCanvas.addEventListener("pointerup", (e) => {
  if (!current || !swipe || playMode !== "touch") return;
  const s = swipe;
  swipe = null;
  const end = toCanvas(e);
  const dx = end.x - s.start.x, dy = end.y - s.start.y;
  const len = Math.hypot(dx, dy);
  const game = current.game;
  const id = current.id;
  if (id === "save") {
    if (end.x < PLAY_W / 3) game.onInput({ type: "dive", dir: -1 });
    else if (end.x > (PLAY_W * 2) / 3) game.onInput({ type: "dive", dir: 1 });
    else game.onInput({ type: "jump" });
    return;
  }
  if (id === "header") {
    game.onInput({ type: "jump" });
    return;
  }
  if (id === "juggle") {
    game.onInput({ type: "knee", side: end.x < PLAY_W / 2 ? "L" : "R" });
    return;
  }
  if (len < 25 || dy > -10) return; // kicks are upward swipes
  // Curve = how far the swipe bows away from its straight line (signed).
  let bow = 0;
  s.path.forEach((p) => {
    const cross = ((p.x - s.start.x) * dy - (p.y - s.start.y) * dx) / (len || 1);
    if (Math.abs(cross) > Math.abs(bow)) bow = cross;
  });
  if (id === "longpass") {
    game.onInput({ type: "kick", aimX: Math.atan2(dx, -dy) / ((55 * Math.PI) / 180), aimY: 0.3, power: clamp(len / 320, 0, 1), curve: 0 });
  } else {
    game.onInput({ type: "kick", aimX: dx / 230, aimY: clamp((-dy - 60) / 260, 0, 1.3), power: clamp(len / 330, 0.15, 1), curve: clamp(-bow / 70, -1, 1) });
  }
});

// Keyboard: arrows aim or dive / knee; Space shoots (hold for power) or jumps.
document.addEventListener("keydown", (e) => {
  if (!current || playMode !== "touch" || playStage.hidden) return;
  const game = current.game;
  const id = current.id;
  const keys = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, " ": 1 };
  if (!keys[e.key]) return;
  e.preventDefault();
  if (id === "save") {
    if (e.key === "ArrowLeft") game.onInput({ type: "dive", dir: -1 });
    if (e.key === "ArrowRight") game.onInput({ type: "dive", dir: 1 });
    if (e.key === "ArrowUp" || e.key === " ") game.onInput({ type: "jump" });
    return;
  }
  if (id === "header") {
    if (e.key === " " || e.key === "ArrowUp") game.onInput({ type: "jump" });
    return;
  }
  if (id === "juggle") {
    if (e.key === "ArrowLeft") game.onInput({ type: "knee", side: "L" });
    if (e.key === "ArrowRight") game.onInput({ type: "knee", side: "R" });
    return;
  }
  if (e.key === "ArrowLeft") game.aimBy(-0.12, 0);
  if (e.key === "ArrowRight") game.aimBy(0.12, 0);
  if (e.key === "ArrowUp") game.aimBy(0, 0.1);
  if (e.key === "ArrowDown") game.aimBy(0, -0.1);
  if (e.key === " " && !e.repeat) game.meterStart();
});
document.addEventListener("keyup", (e) => {
  if (!current || playMode !== "touch" || e.key !== " ") return;
  if (current.game.meterRelease) current.game.meterRelease();
});

document.querySelectorAll(".play-mode").forEach((b) => {
  b.addEventListener("click", () => {
    playMode = b.dataset.mode;
    try {
      localStorage.setItem(PLAY_MODE_KEY, playMode);
    } catch {
      // preference won't persist
    }
    renderModes();
    if (current) startGame(current.id);
  });
});

document.getElementById("playQuitBtn").addEventListener("click", backToMenu);

// Leaving the Play tab stops the camera.
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.tab !== "play" && current) backToMenu();
  });
});

function translatePlay() {
  document.querySelectorAll("#playPanel [data-i18n]").forEach((node) => (node.textContent = t(node.dataset.i18n)));
  document.querySelectorAll('.tab[data-tab="play"]').forEach((node) => (node.textContent = t("tabPlay")));
  renderModes();
  renderGameGrid();
  renderPlayBody();
  if (current) {
    const meta = GAME_LIST.find((g) => g.id === current.id);
    document.getElementById("playGameName").textContent = t(meta.name);
    document.getElementById("playHowTo").textContent = t(meta.how + (playMode === "body" ? "Body" : "Touch"));
  }
}

document.getElementById("langSelect").addEventListener("change", translatePlay);
translatePlay();
