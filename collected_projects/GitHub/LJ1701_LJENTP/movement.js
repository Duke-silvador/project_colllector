// LJSportMind Movement Memory: on-device pose tracking (MediaPipe) measures a short squat and
// single-leg balance test. The first check is the user's movement baseline (from LJ M.E.M.O.);
// each check is scored against what their chosen activity needs (from LJ R.E.A.C.H.).
// Video never leaves the device: only the numbers below are saved with the profile.

const MP_VERSION = "0.10.35";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MP_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// MediaPipe pose landmark indices (left/right are the person's own sides).
const LM = { nose: 0, lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 };
const BODY_POINTS = Object.values(LM);
const SKELETON = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

const MOVE_STEPS = [
  { kind: "scan", key: "mvStepScan", secs: 5 },
  { kind: "squat", key: "mvStepSquat", secs: 20 },
  { kind: "balanceL", key: "mvStepLeft", secs: 10 },
  { kind: "balanceR", key: "mvStepRight", secs: 10 }
];

// What each activity asks of the body. General guides, not medical clearance.
const MOVE_GOALS = {
  soccer: [["hipTiltAbs", "<=", 3], ["depth", "<=", 100], ["symmetry", "<=", 10], ["kneeRatio", ">=", 0.85], ["holdMin", ">=", 8], ["holdDiff", "<=", 2]],
  running: [["hipTiltAbs", "<=", 3], ["holdMin", ">=", 8], ["holdDiff", "<=", 2], ["kneeRatio", ">=", 0.85], ["symmetry", "<=", 10]],
  strength: [["shoulderTiltAbs", "<=", 3], ["depth", "<=", 95], ["kneeRatio", ">=", 0.9], ["symmetry", "<=", 8]],
  everyday: [["shoulderTiltAbs", "<=", 3], ["depth", "<=", 120], ["holdMin", ">=", 5]]
};

const MOVE_HISTORY_MAX = 20;

// ---- Measurement (pure functions) ----

// Angle at b in degrees, in 3D (MediaPipe world landmarks are in metres).
function angleAt(a, b, c) {
  const v1 = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)];
  const v2 = [c.x - b.x, c.y - b.y, (c.z || 0) - (b.z || 0)];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const cos = dot / (Math.hypot(...v1) * Math.hypot(...v2) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function bodyVisible(lm) {
  return !!lm && BODY_POINTS.every((i) => lm[i] && (lm[i].visibility === undefined || lm[i].visibility > 0.5));
}

// One frame -> the few numbers the tests need. Knee angles use the 3D world landmarks, because
// facing the camera most of a squat's bend points toward the lens; widths and heights use the image.
function frameFeatures(lm, world, aspect) {
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const shoulderMid = mid(lm[LM.lShoulder], lm[LM.rShoulder]);
  const hipMid = mid(lm[LM.lHip], lm[LM.rHip]);
  return {
    lKnee: angleAt(world[LM.lHip], world[LM.lKnee], world[LM.lAnkle]),
    rKnee: angleAt(world[LM.rHip], world[LM.rKnee], world[LM.rAnkle]),
    kneeWidth: Math.abs(lm[LM.lKnee].x - lm[LM.rKnee].x),
    ankleWidth: Math.abs(lm[LM.lAnkle].x - lm[LM.rAnkle].x),
    torso: Math.hypot((shoulderMid.x - hipMid.x) * aspect, shoulderMid.y - hipMid.y),
    shoulderWidth: Math.abs(lm[LM.lShoulder].x - lm[LM.rShoulder].x) * aspect,
    hipX: hipMid.x * aspect,
    lAnkleY: lm[LM.lAnkle].y,
    rAnkleY: lm[LM.rAnkle].y,
    // Posture, for the still scan. In an unmirrored camera image the person's left side has the larger x.
    // Positive tilt = the person's left side sits lower; positive offset/shift = toward the person's left.
    shoulderTilt: tiltDeg(lm[LM.lShoulder], lm[LM.rShoulder], aspect),
    hipTilt: tiltDeg(lm[LM.lHip], lm[LM.rHip], aspect),
    headOffset: ((lm[LM.nose].x - shoulderMid.x) * aspect) / (Math.abs(lm[LM.lShoulder].x - lm[LM.rShoulder].x) * aspect || 1),
    weightShift: ((hipMid.x - (lm[LM.lAnkle].x + lm[LM.rAnkle].x) / 2) * aspect) / (Math.abs(lm[LM.lShoulder].x - lm[LM.rShoulder].x) * aspect || 1)
  };
}

function tiltDeg(left, right, aspect) {
  const dx = Math.abs(left.x - right.x) * aspect || 1e-6;
  return (Math.atan((left.y - right.y) / dx) * 180) / Math.PI;
}

function median(xs) {
  const sorted = xs.slice().sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

// Still body scan: medians are robust to a stray frame; steadiness is how little the hips drift.
function analyzeScan(frames) {
  if (frames.length < 5) return null;
  const round1 = (x) => Math.round(x * 10) / 10;
  const hips = frames.map((f) => f.hipX / (f.shoulderWidth || 1));
  const mean = hips.reduce((a, b) => a + b, 0) / hips.length;
  const drift = Math.sqrt(hips.reduce((a, b) => a + (b - mean) ** 2, 0) / hips.length);
  return {
    shoulderTilt: round1(median(frames.map((f) => f.shoulderTilt))),
    hipTilt: round1(median(frames.map((f) => f.hipTilt))),
    headOffset: Math.round(100 * median(frames.map((f) => f.headOffset))),
    weightShift: Math.round(100 * median(frames.map((f) => f.weightShift))),
    standingKnee: Math.round(100 * median(frames.map((f) => (f.ankleWidth ? f.kneeWidth / f.ankleWidth : 1)))) / 100,
    steadiness: round1(drift * 100)
  };
}

// Reps go down below 130 degrees of knee bend and finish back above 160.
function analyzeSquat(frames) {
  const reps = [];
  let current = null;
  for (const f of frames) {
    const avg = (f.lKnee + f.rKnee) / 2;
    if (!current && avg < 130) current = { start: f.t, bottom: f };
    if (current) {
      if ((f.lKnee + f.rKnee) / 2 < (current.bottom.lKnee + current.bottom.rKnee) / 2) current.bottom = f;
      if (avg > 160) {
        reps.push({ ...current, end: f.t });
        current = null;
      }
    }
  }
  if (!reps.length) return { reps: 0 };
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    reps: reps.length,
    depth: Math.round(mean(reps.map((r) => (r.bottom.lKnee + r.bottom.rKnee) / 2))),
    symmetry: Math.round(mean(reps.map((r) => Math.abs(r.bottom.lKnee - r.bottom.rKnee)))),
    kneeRatio: Math.round(100 * mean(reps.map((r) => (r.bottom.ankleWidth ? r.bottom.kneeWidth / r.bottom.ankleWidth : 1)))) / 100,
    tempo: Math.round(10 * mean(reps.map((r) => (r.end - r.start) / 1000))) / 10
  };
}

// Standing leg = side; the other foot counts as lifted once it rises 15% of torso length.
function analyzeBalance(frames, side) {
  let best = 0, runStart = null;
  const xs = [];
  for (const f of frames) {
    const stand = side === "L" ? f.lAnkleY : f.rAnkleY;
    const lift = side === "L" ? f.rAnkleY : f.lAnkleY;
    const lifted = stand - lift > 0.15 * f.torso;
    if (lifted) {
      if (runStart === null) runStart = f.t;
      best = Math.max(best, f.t - runStart);
      xs.push(f.hipX / (f.shoulderWidth || 1));
    } else {
      runStart = null;
    }
  }
  const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const sd = xs.length ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) : 0;
  return { hold: Math.round(best / 100) / 10, sway: Math.round(sd * 1000) / 10 };
}

function buildMoveSnapshot(results, goal, at) {
  const squat = results.squat || { reps: 0 };
  const l = results.balanceL || { hold: 0, sway: 0 };
  const r = results.balanceR || { hold: 0, sway: 0 };
  const scan = results.scan || null;
  return {
    at,
    goal,
    shoulderTilt: scan ? scan.shoulderTilt : null,
    hipTilt: scan ? scan.hipTilt : null,
    headOffset: scan ? scan.headOffset : null,
    weightShift: scan ? scan.weightShift : null,
    standingKnee: scan ? scan.standingKnee : null,
    steadiness: scan ? scan.steadiness : null,
    reps: squat.reps,
    depth: squat.reps ? squat.depth : null,
    symmetry: squat.reps ? squat.symmetry : null,
    kneeRatio: squat.reps ? squat.kneeRatio : null,
    tempo: squat.reps ? squat.tempo : null,
    holdL: l.hold,
    holdR: r.hold,
    swayL: l.sway,
    swayR: r.sway,
    holdMin: Math.min(l.hold, r.hold),
    holdDiff: Math.round(Math.abs(l.hold - r.hold) * 10) / 10
  };
}

function moveReadiness(snap, goal) {
  const checks = (MOVE_GOALS[goal] || MOVE_GOALS.everyday).map(([metric, op, target]) => {
    const value = metric.endsWith("Abs")
      ? (snap[metric.slice(0, -3)] === null || snap[metric.slice(0, -3)] === undefined ? null : Math.abs(snap[metric.slice(0, -3)]))
      : snap[metric];
    const ok = value !== null && value !== undefined && (op === "<=" ? value <= target : value >= target);
    return { metric, op, target, value, ok };
  });
  return { checks, met: checks.filter((c) => c.ok).length, total: checks.length };
}

function nextMoveHistory(list, snap) {
  const history = (Array.isArray(list) ? list : []).concat([snap]);
  return history.length > MOVE_HISTORY_MAX ? [history[0], ...history.slice(-(MOVE_HISTORY_MAX - 1))] : history;
}

// Plain-English summary for the AI Coach, independent of the interface language.
function moveSummaryText(list) {
  if (!Array.isArray(list) || !list.length) return "";
  const posture = (s) => s.shoulderTilt === null || s.shoulderTilt === undefined ? "no body scan" :
    `body scan standing still: shoulder tilt ${s.shoulderTilt} deg and hip tilt ${s.hipTilt} deg (positive = left side lower), head offset ${s.headOffset}% of shoulder width and weight shift ${s.weightShift}% (positive = toward their left), standing knee/ankle width ratio ${s.standingKnee}, hip drift while still ${s.steadiness}%`;
  const fmt = (s) => `${posture(s)}; squat reps ${s.reps}, knee angle at bottom ${s.depth ?? "n/a"} deg (lower is deeper), left-right knee difference ${s.symmetry ?? "n/a"} deg, knee/ankle width ratio ${s.kneeRatio ?? "n/a"} (below 0.85 suggests knees caving in), single-leg balance left ${s.holdL}s / right ${s.holdR}s, hip sway left ${s.swayL}% / right ${s.swayR}%`;
  const base = list[0], now = list[list.length - 1];
  const ready = moveReadiness(now, now.goal);
  let text = `Goal activity: ${now.goal}. Latest check (${String(now.at).slice(0, 10)}): ${fmt(now)}. Meets ${ready.met} of ${ready.total} general readiness checks for that activity.`;
  if (list.length > 1) text += ` Baseline (${String(base.at).slice(0, 10)}): ${fmt(base)}.`;
  return text;
}

if (typeof module !== "undefined") {
  module.exports = { angleAt, frameFeatures, analyzeScan, analyzeSquat, analyzeBalance, buildMoveSnapshot, moveReadiness, nextMoveHistory, moveSummaryText, MOVE_GOALS };
}

// ---- Interface ----

if (typeof document !== "undefined") {
  const I18N_MOVE = {
    en: {
      mvTitle: "Movement Memory",
      mvGoalLabel: "What are you getting ready for?",
      mvGoalSoccer: "Playing soccer",
      mvGoalRunning: "Running",
      mvGoalStrength: "Gym and strength training",
      mvGoalEveryday: "Everyday activity and work",
      mvConsent: "I understand this is not a medical assessment, and I'll stop if anything hurts.",
      mvConsentNeeded: "Tick the box above to start.",
      mvPrivacy: "Video never leaves your device.",
      mvStart: "Start movement check",
      mvCancel: "Stop",
      mvLoading: "Loading the movement AI…",
      mvCameraError: "Couldn't open the camera. Allow camera access and try again.",
      mvModelError: "Couldn't load the movement AI. Check your connection and try again.",
      mvGetReady: "Get ready… {n}",
      mvStepSquat: "Face the camera with your whole body in view. Do 5 slow squats.",
      mvStepScan: "Body scan: stand still facing the camera, arms relaxed at your sides.",
      mvScanTitle: "Body scan (standing still)",
      mvExercisesTitle: "Exercises",
      mvShoulders: "Shoulders",
      mvHips: "Hips",
      mvHead: "Head",
      mvWeight: "Weight",
      mvKneesStanding: "Knees",
      mvStillness: "Stillness",
      mvShouldersLevel: "Shoulders level",
      mvHipsLevel: "Hips level",
      mvLevel: "level",
      mvLower: "{side} side {n}° lower",
      mvCentred: "centred",
      mvToward: "{n}% toward your {side}",
      mvLeft: "left",
      mvLeftSide: "left",
      mvRightSide: "right",
      mvRight: "right",
      mvKneesInLine: "in line with your feet",
      mvKneesIn: "angled inward ({v})",
      mvSteady1: "very steady",
      mvSteady2: "steady",
      mvSteady3: "noticeable sway",
      mvStepLeft: "Stand on your LEFT leg. Lift your right foot.",
      mvStepRight: "Now stand on your RIGHT leg. Lift your left foot.",
      mvStepBack: "Step back until your whole body, head to feet, is in view.",
      mvReps: "Reps: {n}",
      mvSecondsLeft: "{n}s left",
      mvResultsTitle: "Your movement check ({date})",
      mvReps2: "Squat reps",
      mvDepth: "Squat depth (knee angle at the bottom, lower is deeper)",
      mvSymmetry: "Left–right knee difference",
      mvKnee: "Knee alignment (knee width ÷ ankle width)",
      mvHoldL: "Balance on left leg",
      mvHoldR: "Balance on right leg",
      mvHoldMin: "Single-leg balance, weaker side",
      mvHoldDiff: "Balance difference between legs",
      mvNotMeasured: "not measured",
      mvReadyFor: "Ready for {goal}: {met} of {total} checks met",
      mvAim: "aim {op} {v}",
      mvBaselineSet: "Baseline set. Check again in 1–2 weeks to track your progress.",
      mvSinceBaseline: "Since your movement baseline ({date}):",
      mvChange: "{label}: {a} → {b}",
      mvAskAi: "Ask AI Coach about my movement",
      mvAskQuestion: "Explain my latest movement check against my baseline and what I'm getting ready for. What should I work on first?",
      mvDisclaimer: "A guide, not medical advice. Injured? See a physio or doctor."
    },
    es: {
      mvTitle: "Memoria de Movimiento",
      mvGoalLabel: "¿Para qué te estás preparando?",
      mvGoalSoccer: "Jugar al fútbol",
      mvGoalRunning: "Correr",
      mvGoalStrength: "Gimnasio y fuerza",
      mvGoalEveryday: "Actividad diaria y trabajo",
      mvConsent: "Entiendo que no es una evaluación médica y pararé si algo me duele.",
      mvConsentNeeded: "Marca la casilla de arriba para empezar.",
      mvPrivacy: "El video nunca sale de tu dispositivo.",
      mvStart: "Empezar prueba de movimiento",
      mvCancel: "Parar",
      mvLoading: "Cargando la IA de movimiento…",
      mvCameraError: "No se pudo abrir la cámara. Permite el acceso a la cámara e inténtalo de nuevo.",
      mvModelError: "No se pudo cargar la IA de movimiento. Revisa tu conexión e inténtalo de nuevo.",
      mvGetReady: "Prepárate… {n}",
      mvStepSquat: "Ponte de frente a la cámara con todo el cuerpo a la vista. Haz 5 sentadillas lentas.",
      mvStepScan: "Escaneo corporal: quédate quieto de frente a la cámara, con los brazos relajados a los lados.",
      mvScanTitle: "Escaneo corporal (de pie, quieto)",
      mvExercisesTitle: "Ejercicios",
      mvShoulders: "Hombros",
      mvHips: "Cadera",
      mvHead: "Cabeza",
      mvWeight: "Peso",
      mvKneesStanding: "Rodillas",
      mvStillness: "Estabilidad",
      mvShouldersLevel: "Hombros nivelados",
      mvHipsLevel: "Cadera nivelada",
      mvLevel: "nivelados",
      mvLower: "lado {side} {n}° más bajo",
      mvCentred: "centrado",
      mvToward: "{n}% hacia tu {side}",
      mvLeft: "izquierda",
      mvLeftSide: "izquierdo",
      mvRightSide: "derecho",
      mvRight: "derecha",
      mvKneesInLine: "alineadas con los pies",
      mvKneesIn: "hacia dentro ({v})",
      mvSteady1: "muy estable",
      mvSteady2: "estable",
      mvSteady3: "balanceo notable",
      mvStepLeft: "Apóyate en tu pierna IZQUIERDA. Levanta el pie derecho.",
      mvStepRight: "Ahora apóyate en tu pierna DERECHA. Levanta el pie izquierdo.",
      mvStepBack: "Aléjate hasta que se vea todo tu cuerpo, de la cabeza a los pies.",
      mvReps: "Repeticiones: {n}",
      mvSecondsLeft: "Quedan {n} s",
      mvResultsTitle: "Tu prueba de movimiento ({date})",
      mvReps2: "Repeticiones de sentadilla",
      mvDepth: "Profundidad de sentadilla (ángulo de rodilla abajo; menor es más profunda)",
      mvSymmetry: "Diferencia de rodillas izquierda–derecha",
      mvKnee: "Alineación de rodillas (ancho de rodillas ÷ ancho de tobillos)",
      mvHoldL: "Equilibrio sobre la pierna izquierda",
      mvHoldR: "Equilibrio sobre la pierna derecha",
      mvHoldMin: "Equilibrio sobre una pierna, lado más débil",
      mvHoldDiff: "Diferencia de equilibrio entre piernas",
      mvNotMeasured: "sin medir",
      mvReadyFor: "Listo para {goal}: {met} de {total} criterios cumplidos",
      mvAim: "objetivo {op} {v}",
      mvBaselineSet: "Punto de partida fijado. Repite en 1–2 semanas para seguir tu progreso.",
      mvSinceBaseline: "Desde tu punto de partida de movimiento ({date}):",
      mvChange: "{label}: {a} → {b}",
      mvAskAi: "Preguntar al Coach IA sobre mi movimiento",
      mvAskQuestion: "Explica mi última prueba de movimiento comparada con mi punto de partida y con aquello para lo que me preparo. ¿En qué debería trabajar primero?",
      mvDisclaimer: "Una guía, no un consejo médico. ¿Lesionado? Consulta a un fisioterapeuta o médico."
    },
    zh: {
      mvTitle: "动作记忆",
      mvGoalLabel: "你在为什么做准备？",
      mvGoalSoccer: "踢足球",
      mvGoalRunning: "跑步",
      mvGoalStrength: "健身和力量训练",
      mvGoalEveryday: "日常活动和工作",
      mvConsent: "我了解这不是医学评估，如有疼痛我会立即停止。",
      mvConsentNeeded: "请先勾选上方的方框。",
      mvPrivacy: "视频绝不会离开你的设备。",
      mvStart: "开始动作测试",
      mvCancel: "停止",
      mvLoading: "正在加载动作 AI…",
      mvCameraError: "无法打开摄像头。请允许访问摄像头后重试。",
      mvModelError: "无法加载动作 AI。请检查网络后重试。",
      mvGetReady: "准备… {n}",
      mvStepSquat: "面向摄像头，让全身都在画面中。慢慢做 5 个深蹲。",
      mvStepScan: "身体扫描：面向摄像头静止站立，双臂自然放在身体两侧。",
      mvScanTitle: "身体扫描（静止站立）",
      mvExercisesTitle: "练习",
      mvShoulders: "肩膀",
      mvHips: "髋部",
      mvHead: "头部",
      mvWeight: "重心",
      mvKneesStanding: "膝盖",
      mvStillness: "稳定性",
      mvShouldersLevel: "肩膀水平",
      mvHipsLevel: "髋部水平",
      mvLevel: "水平",
      mvLower: "{side}侧低 {n}°",
      mvCentred: "居中",
      mvToward: "偏向你的{side}侧 {n}%",
      mvLeft: "左",
      mvLeftSide: "左",
      mvRightSide: "右",
      mvRight: "右",
      mvKneesInLine: "与双脚对齐",
      mvKneesIn: "向内倾 ({v})",
      mvSteady1: "非常稳",
      mvSteady2: "稳",
      mvSteady3: "晃动明显",
      mvStepLeft: "用左腿站立，抬起右脚。",
      mvStepRight: "现在用右腿站立，抬起左脚。",
      mvStepBack: "请后退，直到从头到脚都在画面中。",
      mvReps: "次数：{n}",
      mvSecondsLeft: "剩余 {n} 秒",
      mvResultsTitle: "你的动作测试（{date}）",
      mvReps2: "深蹲次数",
      mvDepth: "深蹲深度（最低点膝关节角度，越小越深）",
      mvSymmetry: "左右膝盖差异",
      mvKnee: "膝盖对齐（膝宽 ÷ 踝宽）",
      mvHoldL: "左腿平衡",
      mvHoldR: "右腿平衡",
      mvHoldMin: "单腿平衡（较弱一侧）",
      mvHoldDiff: "两腿平衡差异",
      mvNotMeasured: "未测量",
      mvReadyFor: "{goal}准备度：满足 {total} 项中的 {met} 项",
      mvAim: "目标 {op} {v}",
      mvBaselineSet: "基线已设定。1–2 周后再测一次，追踪你的进步。",
      mvSinceBaseline: "与你的动作基线（{date}）相比：",
      mvChange: "{label}：{a} → {b}",
      mvAskAi: "向 AI 教练询问我的动作",
      mvAskQuestion: "请结合我的基线和我正在准备的活动，解释我最近一次动作测试。我应该先练什么？",
      mvDisclaimer: "仅供参考，不是医疗建议。受伤了？请咨询理疗师或医生。"
    },
    ar: {
      mvTitle: "ذاكرة الحركة",
      mvGoalLabel: "لماذا تستعد؟",
      mvGoalSoccer: "لعب كرة القدم",
      mvGoalRunning: "الجري",
      mvGoalStrength: "النادي الرياضي وتمارين القوة",
      mvGoalEveryday: "النشاط اليومي والعمل",
      mvConsent: "أفهم أن هذا ليس تقييمًا طبيًا، وسأتوقف إذا شعرت بأي ألم.",
      mvConsentNeeded: "ضع علامة في المربع أعلاه للبدء.",
      mvPrivacy: "لا يغادر الفيديو جهازك أبدًا.",
      mvStart: "ابدأ اختبار الحركة",
      mvCancel: "إيقاف",
      mvLoading: "جارٍ تحميل ذكاء الحركة الاصطناعي…",
      mvCameraError: "تعذّر فتح الكاميرا. اسمح بالوصول إلى الكاميرا وحاول مرة أخرى.",
      mvModelError: "تعذّر تحميل ذكاء الحركة الاصطناعي. تحقق من اتصالك وحاول مرة أخرى.",
      mvGetReady: "استعد… {n}",
      mvStepSquat: "قف مواجهًا للكاميرا بحيث يظهر جسمك كاملًا. أدِّ 5 تمارين قرفصاء ببطء.",
      mvStepScan: "مسح الجسم: قف ثابتًا مواجهًا للكاميرا، وذراعاك مسترخيتان بجانبك.",
      mvScanTitle: "مسح الجسم (وقوف ثابت)",
      mvExercisesTitle: "التمارين",
      mvShoulders: "الكتفان",
      mvHips: "الوركان",
      mvHead: "الرأس",
      mvWeight: "توزيع الوزن",
      mvKneesStanding: "الركبتان",
      mvStillness: "الثبات",
      mvShouldersLevel: "استواء الكتفين",
      mvHipsLevel: "استواء الوركين",
      mvLevel: "مستويان",
      mvLower: "الجانب {side} أخفض بـ {n}°",
      mvCentred: "في المنتصف",
      mvToward: "{n}% نحو جهتك {side}",
      mvLeft: "اليسرى",
      mvLeftSide: "الأيسر",
      mvRightSide: "الأيمن",
      mvRight: "اليمنى",
      mvKneesInLine: "على خط واحد مع القدمين",
      mvKneesIn: "مائلتان للداخل ({v})",
      mvSteady1: "ثابت جدًا",
      mvSteady2: "ثابت",
      mvSteady3: "تمايل ملحوظ",
      mvStepLeft: "قف على ساقك اليسرى. ارفع قدمك اليمنى.",
      mvStepRight: "الآن قف على ساقك اليمنى. ارفع قدمك اليسرى.",
      mvStepBack: "تراجع حتى يظهر جسمك كاملًا من الرأس إلى القدمين.",
      mvReps: "التكرارات: {n}",
      mvSecondsLeft: "متبقٍ {n} ث",
      mvResultsTitle: "اختبار حركتك ({date})",
      mvReps2: "تكرارات القرفصاء",
      mvDepth: "عمق القرفصاء (زاوية الركبة في الأسفل، الأقل أعمق)",
      mvSymmetry: "الفرق بين الركبتين يسارًا ويمينًا",
      mvKnee: "استقامة الركبتين (عرض الركبتين ÷ عرض الكاحلين)",
      mvHoldL: "التوازن على الساق اليسرى",
      mvHoldR: "التوازن على الساق اليمنى",
      mvHoldMin: "التوازن على ساق واحدة، الجانب الأضعف",
      mvHoldDiff: "فرق التوازن بين الساقين",
      mvNotMeasured: "لم يُقس",
      mvReadyFor: "الجاهزية لـ{goal}: {met} من {total} معايير متحققة",
      mvAim: "الهدف {op} {v}",
      mvBaselineSet: "تم تحديد نقطة البداية. أعد الفحص بعد أسبوع أو أسبوعين لتتابع تقدمك.",
      mvSinceBaseline: "منذ نقطة بداية حركتك ({date}):",
      mvChange: "{label}: {a} ← {b}",
      mvAskAi: "اسأل مدرب الذكاء الاصطناعي عن حركتي",
      mvAskQuestion: "اشرح آخر اختبار حركة لي مقارنةً بنقطة بدايتي وبما أستعد له. على ماذا أعمل أولًا؟",
      mvDisclaimer: "إرشاد وليس نصيحة طبية. مصاب؟ راجع أخصائي علاج طبيعي أو طبيبًا."
    }
  };
  Object.keys(I18N_MOVE).forEach((lang) => Object.assign(I18N[lang], I18N_MOVE[lang]));

  const GOAL_KEYS = { soccer: "mvGoalSoccer", running: "mvGoalRunning", strength: "mvGoalStrength", everyday: "mvGoalEveryday" };
  const METRIC_FMT = {
    depth: { key: "mvDepth", unit: "°" },
    symmetry: { key: "mvSymmetry", unit: "°" },
    kneeRatio: { key: "mvKnee", unit: "" },
    holdMin: { key: "mvHoldMin", unit: " s" },
    holdDiff: { key: "mvHoldDiff", unit: " s" },
    holdL: { key: "mvHoldL", unit: " s" },
    holdR: { key: "mvHoldR", unit: " s" },
    reps: { key: "mvReps2", unit: "" },
    shoulderTilt: { key: "mvShoulders", unit: "°" },
    hipTilt: { key: "mvHips", unit: "°" },
    shoulderTiltAbs: { key: "mvShouldersLevel", unit: "°" },
    hipTiltAbs: { key: "mvHipsLevel", unit: "°" }
  };

  // Plain-language reading of the still scan.
  function tiltWords(v) {
    if (Math.abs(v) <= 2) return t("mvLevel");
    return tf("mvLower", { side: t(v > 0 ? "mvLeftSide" : "mvRightSide"), n: Math.abs(v) });
  }
  function shiftWords(v) {
    if (Math.abs(v) <= 8) return t("mvCentred");
    return tf("mvToward", { n: Math.abs(v), side: t(v > 0 ? "mvLeft" : "mvRight") });
  }
  function scanRows(snap) {
    return [
      ["mvShoulders", tiltWords(snap.shoulderTilt)],
      ["mvHips", tiltWords(snap.hipTilt)],
      ["mvHead", shiftWords(snap.headOffset)],
      ["mvWeight", shiftWords(snap.weightShift)],
      ["mvKneesStanding", snap.standingKnee >= 0.85 ? t("mvKneesInLine") : tf("mvKneesIn", { v: snap.standingKnee })],
      ["mvStillness", t(snap.steadiness <= 2 ? "mvSteady1" : snap.steadiness <= 5 ? "mvSteady2" : "mvSteady3")]
    ];
  }

  const mvGoal = document.getElementById("mvGoal");
  const mvConsent = document.getElementById("mvConsent");
  const mvStartBtn = document.getElementById("mvStartBtn");
  const mvStage = document.getElementById("mvStage");
  const mvVideo = document.getElementById("mvVideo");
  const mvCanvas = document.getElementById("mvCanvas");
  const mvPrompt = document.getElementById("mvPrompt");
  const mvMsg = document.getElementById("mvMsg");
  const mvResults = document.getElementById("mvResults");
  let landmarker = null;
  let running = null; // { stop() }
  let mvMsgKey = "";

  function showMvMsg(key) {
    mvMsgKey = key;
    mvMsg.textContent = key ? t(key) : "";
    mvMsg.hidden = !key;
  }

  async function loadLandmarker() {
    if (landmarker) return landmarker;
    const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    landmarker = await vision.PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MP_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1
    });
    return landmarker;
  }

  function drawPose(lm) {
    const ctx = mvCanvas.getContext("2d");
    mvCanvas.width = mvVideo.videoWidth;
    mvCanvas.height = mvVideo.videoHeight;
    ctx.clearRect(0, 0, mvCanvas.width, mvCanvas.height);
    if (!lm) return;
    ctx.strokeStyle = "#e9c77b";
    ctx.fillStyle = "#c9974a";
    ctx.lineWidth = 4;
    SKELETON.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * mvCanvas.width, lm[a].y * mvCanvas.height);
      ctx.lineTo(lm[b].x * mvCanvas.width, lm[b].y * mvCanvas.height);
      ctx.stroke();
    });
    BODY_POINTS.forEach((i) => {
      ctx.beginPath();
      ctx.arc(lm[i].x * mvCanvas.width, lm[i].y * mvCanvas.height, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Runs the three steps in order; each gets a 3-second countdown, then records for its duration.
  function runCheck(stream) {
    return new Promise((resolve, reject) => {
      const frames = { scan: [], squat: [], balanceL: [], balanceR: [] };
      let stepIndex = 0;
      let phaseStart = performance.now();
      let phase = "countdown";
      let stopped = false;
      let raf = 0;

      running = {
        stop() {
          stopped = true;
          cancelAnimationFrame(raf);
          reject(new Error("stopped"));
        }
      };

      const loop = () => {
        if (stopped) return;
        const now = performance.now();
        const step = MOVE_STEPS[stepIndex];
        let lm = null, world = null;
        if (mvVideo.readyState >= 2) {
          const result = landmarker.detectForVideo(mvVideo, now);
          lm = result.landmarks && result.landmarks[0];
          world = result.worldLandmarks && result.worldLandmarks[0];
        }
        drawPose(lm);
        const visible = bodyVisible(lm) && !!world;
        const aspect = mvVideo.videoWidth / (mvVideo.videoHeight || 1);

        if (phase === "countdown") {
          const left = 3 - Math.floor((now - phaseStart) / 1000);
          mvPrompt.textContent = `${t(step.key)}\n${tf("mvGetReady", { n: Math.max(left, 1) })}`;
          if (left <= 0) {
            phase = "record";
            phaseStart = now;
          }
        } else {
          if (visible) frames[step.kind].push({ t: now - phaseStart, ...frameFeatures(lm, world, aspect) });
          const secsLeft = Math.ceil(step.secs - (now - phaseStart) / 1000);
          let status = tf("mvSecondsLeft", { n: Math.max(secsLeft, 0) });
          if (step.kind === "squat") status = `${tf("mvReps", { n: analyzeSquat(frames.squat).reps })} · ${status}`;
          mvPrompt.textContent = `${visible ? t(step.key) : t("mvStepBack")}\n${status}`;
          if (secsLeft <= 0) {
            stepIndex += 1;
            if (stepIndex >= MOVE_STEPS.length) {
              running = null;
              return resolve({
                scan: analyzeScan(frames.scan),
                squat: analyzeSquat(frames.squat),
                balanceL: analyzeBalance(frames.balanceL, "L"),
                balanceR: analyzeBalance(frames.balanceR, "R")
              });
            }
            phase = "countdown";
            phaseStart = now;
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
  }

  async function startCheck() {
    if (!mvConsent.checked) return showMvMsg("mvConsentNeeded");
    showMvMsg("mvLoading");
    mvStartBtn.disabled = true;
    let stream = null;
    try {
      await loadLandmarker();
    } catch {
      mvStartBtn.disabled = false;
      return showMvMsg("mvModelError");
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
    } catch {
      mvStartBtn.disabled = false;
      return showMvMsg("mvCameraError");
    }
    showMvMsg("");
    mvVideo.srcObject = stream;
    await mvVideo.play();
    mvStage.hidden = false;
    mvStage.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const results = await runCheck(stream);
      saveMoveCheck(buildMoveSnapshot(results, mvGoal.value, new Date().toISOString()));
    } catch {
      // stopped by the user
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      mvVideo.srcObject = null;
      mvStage.hidden = true;
      mvStartBtn.disabled = false;
    }
  }

  function saveMoveCheck(snap) {
    const data = loadPassport() || { ...collectProfile(), updatedAt: new Date().toISOString() };
    data.movement = nextMoveHistory(data.movement, snap);
    data.movementGoal = snap.goal;
    data.updatedAt = new Date().toISOString();
    savePassport(data);
    uploadProfile(data);
    renderMovement();
    mvResults.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fmtValue(metric, value) {
    if (value === null || value === undefined) return t("mvNotMeasured");
    return `${value}${METRIC_FMT[metric].unit}`;
  }

  function renderMovement() {
    const data = loadPassport();
    if (data && data.movementGoal && GOAL_KEYS[data.movementGoal]) mvGoal.value = data.movementGoal;
    mvResults.innerHTML = "";
    const list = data && Array.isArray(data.movement) ? data.movement : [];
    if (!list.length) return;
    const now = list[list.length - 1];
    const base = list[0];
    const day = (iso) => new Date(iso).toLocaleDateString(currentLang);

    const card = el("div", "mv-result");
    card.append(el("h4", "", tf("mvResultsTitle", { date: day(now.at) })));
    if (now.shoulderTilt !== null && now.shoulderTilt !== undefined) {
      card.append(el("p", "mv-subhead", t("mvScanTitle")));
      const scanList = el("ul", "mv-metrics");
      scanRows(now).forEach(([key, words]) => {
        const li = el("li", "");
        li.append(el("span", "", t(key)), el("strong", "", words));
        scanList.append(li);
      });
      card.append(scanList);
    }
    card.append(el("p", "mv-subhead", t("mvExercisesTitle")));
    const table = el("ul", "mv-metrics");
    ["reps", "depth", "symmetry", "kneeRatio", "holdL", "holdR"].forEach((m) => {
      const li = el("li", "");
      li.append(el("span", "", t(METRIC_FMT[m].key)), el("strong", "", fmtValue(m, now[m])));
      table.append(li);
    });
    card.append(table);

    const goal = mvGoal.value;
    const ready = moveReadiness(now, goal);
    card.append(el("p", "mv-ready", tf("mvReadyFor", { goal: t(GOAL_KEYS[goal]).toLowerCase(), met: ready.met, total: ready.total })));
    const checks = el("ul", "mv-checks");
    ready.checks.forEach((c) => {
      const op = c.op === "<=" ? "≤" : "≥";
      checks.append(el("li", c.ok ? "have" : "gap", `${c.ok ? "✓" : "○"} ${t(METRIC_FMT[c.metric].key)}: ${fmtValue(c.metric, c.value)} (${tf("mvAim", { op, v: c.target + METRIC_FMT[c.metric].unit })})`));
    });
    card.append(checks);

    if (list.length < 2) {
      card.append(el("p", "mv-memory", t("mvBaselineSet")));
    } else {
      card.append(el("p", "mv-memory", tf("mvSinceBaseline", { date: day(base.at) })));
      const changes = el("ul", "mem-list");
      ["shoulderTilt", "hipTilt", "depth", "symmetry", "kneeRatio", "holdL", "holdR"].forEach((m) => {
        if (base[m] !== now[m]) changes.append(el("li", "", tf("mvChange", { label: t(METRIC_FMT[m].key), a: fmtValue(m, base[m]), b: fmtValue(m, now[m]) })));
      });
      card.append(changes);
    }

    const ask = el("button", "secondary", t("mvAskAi"));
    ask.type = "button";
    ask.addEventListener("click", () => {
      openCoach();
      askAssistant(t("mvAskQuestion"));
    });
    const actions = el("div", "actions");
    actions.append(ask);
    card.append(actions, el("p", "warning", t("mvDisclaimer")));
    mvResults.append(card);
  }

  function translateMovement() {
    document.querySelectorAll("#moveSection [data-i18n]").forEach((node) => (node.textContent = t(node.dataset.i18n)));
    showMvMsg(mvMsgKey);
    renderMovement();
  }

  mvStartBtn.addEventListener("click", startCheck);
  document.getElementById("mvCancelBtn").addEventListener("click", () => running && running.stop());
  mvGoal.addEventListener("change", () => {
    const data = loadPassport();
    if (data) savePassport({ ...data, movementGoal: mvGoal.value });
    renderMovement();
  });
  document.getElementById("langSelect").addEventListener("change", translateMovement);
  translateMovement();
}
