"use strict";
/* ============ Estado del cuestionario de la convocatoria activa ============ */
const CFG = window.TFG_CONFIG || {};
const LOCKED_IDS = ["q1", "q2"];
const LINE_OPTION_IDS = ["q29", "q30"];
const clone = o => JSON.parse(JSON.stringify(o));
const SECTORS = SECTORS_DEF.map(s => ({ k: s.k, re: new RegExp(s.re, "i"), label: s.label }));
// Opciones originales de las preguntas que lee el recomendador (se traducen por posición).
const CANON = Object.fromEntries(TEMPLATE_TFG.sections.flatMap(s => s.q).filter(q => q.type === "choice" && !LINE_OPTION_IDS.includes(q.id)).map(q => [q.id, q.o.slice()]));
const BUILTIN_DIM_IDS = ["q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q16", "q17", "q19", "q20", "q22", "q32"];
const RECO_IDS = ["q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q16", "q17", "q19", "q20", "q22", "q23", "q27", "q28", "q29", "q30", "q31", "q32", "q33", "q34", "q37"];
const DIM_LABELS = { code: "Programación y datos", stats: "Estadística", ml: "Aprendizaje automático", biz: "Negocio" };

let CONV = null;                 // datos públicos de la convocatoria
let LINES = [], LINE_NAMES = [];
let SECTIONS = [], QUESTIONS = [], QNUM = {}, INTRO = {};

function setLines(lines) {
  LINES = (Array.isArray(lines) && lines.length ? lines : []).map(l => Object.assign({ short: l.name, need: {}, w: {}, fav: {}, pref: {}, sectors: [], problema: [], especificos: [], fases: [] }, l));
  LINE_NAMES = LINES.map(l => l.name);
}
function setDefinition(def) {
  const d = def && Array.isArray(def.sections) && def.sections.length ? def : TEMPLATE_VACIA;
  SECTIONS = d.sections.map((s, i) => ({ k: String.fromCharCode(65 + i), t: s.t || "", q: (s.q || []).map(q => {
    const out = { id: q.id, t: q.t || "", type: q.type || "text" };
    if (q.dim) out.dim = q.dim;
    if (q.cond && q.cond.q) out.cond = { q: q.cond.q, op: q.cond.op || "eq", v: q.cond.v ?? "" };
    if (LINE_OPTION_IDS.includes(q.id)) { out.type = "choice"; out.o = LINE_NAMES.slice(); }
    else if (out.type === "choice") out.o = (q.o || []).filter(x => String(x).trim()).map(String);
    if (LOCKED_IDS.includes(q.id)) { out.type = q.id === "q2" ? "email" : "text"; delete out.cond; }
    return out;
  }) }));
  QUESTIONS = SECTIONS.flatMap(s => s.q);
  QNUM = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, i + 1]));
  INTRO = Object.assign({ title: "Cuestionario inicial", text: "", privacy: "Solo tus tutores verán tus respuestas." }, d.intro || {});
}
function currentDefinition() { return { version: 2, intro: clone(INTRO), sections: SECTIONS.map(s => ({ t: s.t, q: clone(s.q) })) }; }
function setConvocatoria(conv) {
  CONV = conv || null;
  setLines(conv && conv.lineas);
  setDefinition(conv && conv.def);
}
setConvocatoria(null);

/* ============ Preguntas condicionales ============ */
const COND_OPS = { eq: "es", neq: "no es", filled: "tiene respuesta", empty: "está vacía" };
function answerValue(v) { return v && typeof v === "object" ? (v.notTaken ? "No cursada" : String(v.grade ?? "")) : String(v ?? ""); }
function isVisible(q, a) {
  if (!q.cond || !q.cond.q || !QNUM[q.cond.q]) return true;
  const src = QUESTIONS.find(x => x.id === q.cond.q);
  if (src && !isVisible(src, a)) return false;
  const v = answerValue(a[q.cond.q]).trim();
  switch (q.cond.op) {
    case "neq": return v !== "" && v !== String(q.cond.v);
    case "filled": return v !== "";
    case "empty": return v === "";
    default: return v === String(q.cond.v);
  }
}
const visibleQuestions = a => QUESTIONS.filter(q => isVisible(q, a));

/* ============ Motor de recomendación ============ */
function parseGrade(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? Math.max(0, Math.min(10, v)) : null;
  const m = String(v).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n >= 0 && n <= 10 ? n : null;
}
const isNotTaken = s => /no\s*(la\s*)?(he\s*)?cursad|no\s*cursad|no la he hecho|^\s*-\s*$|^n\/?a$/i.test(String(s || ""));
const filled = s => typeof s === "string" ? s.trim().length > 0 : s !== null && s !== undefined;
const mean = arr => { const v = arr.filter(x => x !== null && x !== undefined && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const clamp01 = x => Math.max(0, Math.min(1, x));
function canonize(a) {
  const b = Object.assign({}, a);
  for (const id of Object.keys(CANON)) {
    const q = QUESTIONS.find(x => x.id === id);
    if (!q || !b[id]) continue;
    const i = (q.o || []).indexOf(b[id]);
    b[id] = i >= 0 && i < CANON[id].length ? CANON[id][i] : b[id];
  }
  return b;
}
function gradeOf(a, id) { const g = a[id]; if (!g || g.notTaken) return null; return parseGrade(g.grade); }
function sectorsOf(a) { const txt = [a.q31, a.q33, a.q34, a.m4, a.m7].filter(x => typeof x === "string").join(" "); return SECTORS.filter(s => s.re.test(txt)); }
function sectorPhrase(sector, line) {
  if (!sector) return line && line.sector_def ? line.sector_def : "una empresa";
  return sector.k === "pyme" ? "las pymes" : `el sector de ${sector.label}`;
}
function lineTitle(line, phrase) { return String(line.titulo || line.name || "").replace("{sector}", phrase).replace(/^./, c => c.toUpperCase()); }

function recommend(raw) {
  const a = canonize(raw || {});
  const vis = new Set(visibleQuestions(raw || {}).map(q => q.id));
  const has = id => vis.has(id);
  const idx = id => { const o = CANON[id]; return has(id) && a[id] && o ? o.indexOf(a[id]) : -1; };
  const py = idx("q16"), sql = idx("q17"), git = idx("q23");
  const gN = id => { if (!has(id)) return null; const g = gradeOf(a, id); return g === null ? null : clamp01((g - 4) / 5.5); };
  const longTxt = (id, n) => has(id) && filled(a[id]) && String(a[id]).trim().length >= n && !/^no\b|^nunca|^ninguno/i.test(String(a[id]).trim());
  const parts = {
    code: [py >= 0 ? py / 3 : null, sql >= 0 ? sql / 3 : null, gN("q6"), gN("q7"), gN("q9")],
    stats: [gN("q8"), gN("q12"), longTxt("q20", 40) ? .75 : (has("q20") && filled(a.q20) ? .45 : null)],
    ml: [gN("q10"), gN("q11"), longTxt("q19", 40) ? .85 : (has("q19") && filled(a.q19) ? .3 : null), py >= 2 ? .7 : (py >= 0 ? .25 : null)],
    biz: [gN("q13"), ["Definir el problema de negocio", "Diseñar recomendaciones empresariales"].includes(a.q22) ? .85 : null, a.q32 === "Investigación y análisis empresarial" ? .7 : null],
  };
  // Preguntas añadidas por el tutor con una dimensión asignada
  for (const q of QUESTIONS) {
    if (!q.dim || !parts[q.dim] || BUILTIN_DIM_IDS.includes(q.id) || !has(q.id)) continue;
    if (q.type === "grade") parts[q.dim].push(gN(q.id));
    else if (q.type === "choice" && q.o && q.o.length > 1) { const i = q.o.indexOf(raw[q.id]); if (i >= 0) parts[q.dim].push(i / (q.o.length - 1)); }
  }
  const dims = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, mean(v)]));
  const known = Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v === null ? .5 : v]));
  const sectors = sectorsOf(a);
  const hoursLow = a.q37 === "Menos de 3" || a.q27 === "No, necesito acordar otra dedicación";
  const hoursHigh = a.q37 === "Entre 6 y 8" || a.q37 === "Más de 8";
  const hasData = longTxt("q33", 6) || raw.m6 === "Sí";

  if (!LINES.length) return { ranking: [], top: null, dims, scope: "", why: [], gaps: [], flags: [], answered: answeredCount(raw), total: visibleQuestions(raw).length, titleFor: () => "" };

  const scored = LINES.map(L => {
    const need = {}, w = {};
    for (const d of ["code", "stats", "ml", "biz"]) { need[d] = clamp01((L.need[d] ?? 2.5) / 5); w[d] = L.w && L.w[d] !== undefined ? L.w[d] : 1; }
    let wsum = 0, short = 0;
    for (const d of ["code", "stats", "ml", "biz"]) { wsum += w[d]; short += w[d] * Math.max(0, need[d] - known[d]); }
    const fit = clamp01(1 - (short / (wsum || 1)) * 2.6);
    const interest = a.q29 === L.name ? 1 : a.q30 === L.name ? .55 : 0;
    const pref = a.q32 ? ((L.pref || {})[a.q32] ?? .5) : .5;
    const fav = a.q22 ? ((L.fav || {})[a.q22] ?? .2) : .4;
    const sec = sectors.some(s => (L.sectors || []).includes(s.k)) ? 1 : 0;
    const timePen = hoursLow && need.code >= .6 ? .12 : 0;
    const raw2 = 0.34 * interest + 0.34 * fit + 0.12 * pref + 0.10 * fav + 0.10 * sec - timePen;
    return { L, id: L.id, name: L.name, short: L.short || L.name, score: Math.round(clamp01(raw2) * 100), fit, interest, pref, fav, sec, need };
  }).sort((x, y) => y.score - x.score || y.fit - x.fit);

  const top = scored[0];
  const techLevel = known.code * .5 + known.ml * .3 + known.stats * .2;
  let scope;
  if (top.need.code >= .6) scope = techLevel >= .65 ? "Ambicioso: modelo base, modelo mejorado y evaluación económica" : techLevel >= .45 ? "Estándar: modelo interpretable y evaluación de negocio bien argumentada" : "Acotado: análisis descriptivo y modelo sencillo; reforzar Python en las primeras semanas";
  else scope = techLevel >= .55 ? "Estándar con prototipo funcional" : "Acotado con metodología sólida";
  if (hoursLow) scope += ". Dedicación baja: recortar alcance desde el principio";

  const why = [], gaps = [];
  if (top.interest === 1) why.push("Es su primera opción en el cuestionario.");
  else if (top.interest > 0) why.push("Es su segunda opción en el cuestionario.");
  else if (a.q29) { const l = LINES.find(x => x.name === a.q29); if (l) why.push(`Su primera opción fue «${l.short || l.name}», pero su perfil encaja mejor aquí.`); }
  if (top.fit >= .8) why.push("Su nivel técnico cubre lo que pide esta línea.");
  else if (top.fit >= .55) why.push("Su nivel técnico es suficiente con un alcance ajustado.");
  const secHit = sectors.find(s => (top.L.sectors || []).includes(s.k));
  if (secHit) why.push(`Le motiva el sector ${secHit.label}, que encaja con esta línea.`);
  if (a.q32 && top.pref >= .9) why.push(`Prefiere un trabajo «${a.q32.split(":")[0].toLowerCase()}».`);
  if (a.q22 && top.fav >= .9) why.push(`Lo que más le gusta es «${a.q22.toLowerCase()}».`);
  for (const d of ["code", "stats", "ml", "biz"]) {
    if (dims[d] !== null && top.need[d] - dims[d] > .15) gaps.push({ code: "Programación y SQL por debajo de lo que pide la línea.", stats: "Base estadística justa para esta línea.", ml: "Poca experiencia entrenando modelos.", biz: "Perfil de negocio a reforzar en la parte de recomendaciones." }[d]);
  }
  const flags = [];
  if (hoursLow) flags.push({ t: "Dedicación prevista baja (menos de 3 h o no garantiza 3-5 h).", c: "bad" });
  else if (hoursHigh) flags.push({ t: "Dedicación alta: puede asumir un alcance más ambicioso.", c: "ok" });
  if (git === 0 || git === 1) flags.push({ t: "No ha trabajado con commits: dedicar la semana 1 a Git y GitHub.", c: "" });
  else if (git >= 2) flags.push({ t: "Ya usa Git: puede arrancar el repositorio sin formación previa.", c: "ok" });
  if (hasData) flags.push({ t: "Dice tener acceso a datos o a una empresa: verificar autorización y confidencialidad.", c: "ok" });
  else flags.push({ t: "Sin datos propios: usar un dataset público adecuado a la línea.", c: "" });
  if (has("q34") && !filled(a.q34)) flags.push({ t: "No ha propuesto pregunta de negocio: trabajarla en la primera tutoría.", c: "" });
  if (a.q28) flags.push({ t: `Prefiere tutorías: ${String(a.q28).toLowerCase()}.`, c: "ok" });

  const sectorUse = secHit || sectors[0] || null;
  return {
    ranking: scored.map(({ id, name, short, score, fit }) => ({ id, name, short, score, fit })),
    top: { id: top.id, name: top.name, short: top.short, score: top.score },
    dims, scope, why, gaps, flags, answered: answeredCount(raw), total: visibleQuestions(raw).length,
    sector: sectorUse,
    titleFor: lineId => { const L = LINES.find(l => l.id === lineId) || top.L; return lineTitle(L, sectorPhrase(sectorUse, L)); },
  };
}

/* ============ Utilidades de interfaz compartidas ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const chevSvg = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const slug = s => (s || "alumno").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "alumno";
function blankAnswers() { const a = {}; for (const q of QUESTIONS) a[q.id] = q.type === "grade" ? { grade: "", notTaken: false, comment: "" } : ""; return a; }
function normalizeAnswers(a) { const b = blankAnswers(); for (const q of QUESTIONS) { const v = a ? a[q.id] : undefined; if (v === undefined || v === null) continue; if (q.type === "grade") b[q.id] = typeof v === "object" ? { grade: v.grade ?? "", notTaken: !!v.notTaken, comment: v.comment ?? "" } : { grade: "", notTaken: false, comment: String(v) }; else b[q.id] = typeof v === "string" ? v : (typeof v === "object" ? answerText(q, v) : String(v)); } return b; }
function keepExtra(d) { const o = {}; for (const k of Object.keys(d || {})) if (!QNUM[k]) o[k] = d[k]; return o; }
function fullAnswers(d) { return Object.assign(normalizeAnswers(d), keepExtra(d)); }
function isAnswered(q, v) { return q.type === "grade" ? !!(v && (v.notTaken || String(v.grade ?? "") !== "" || filled(v.comment))) : filled(v); }
function secCount(sec, a) { const vis = sec.q.filter(q => isVisible(q, a)); return [vis.filter(q => isAnswered(q, a[q.id])).length, vis.length]; }
function answeredCount(a) { return visibleQuestions(a).filter(q => isAnswered(q, a[q.id])).length; }
function answerText(q, v) {
  if (q.type === "grade") { if (!v) return ""; if (typeof v !== "object") return String(v); if (v.notTaken) return "No cursada" + (v.comment ? ` · ${v.comment}` : ""); return [v.grade !== "" && v.grade !== undefined ? `Nota ${v.grade}` : "", v.comment].filter(Boolean).join(" · "); }
  return typeof v === "object" && v ? answerText({ type: "grade" }, v) : (v || "");
}
function qInput(q, val) {
  const n = `<span class="num">${QNUM[q.id]}.</span>`;
  if (q.type === "text" || q.type === "email") return `<div class="q" data-qwrap="${q.id}"><label for="${q.id}">${n}${esc(q.t)}</label><input id="${q.id}" type="${q.type}" value="${esc(val)}" data-q="${q.id}"${q.id === "q1" || q.id === "q2" ? " required" : ""}></div>`;
  if (q.type === "area") return `<div class="q" data-qwrap="${q.id}"><label for="${q.id}">${n}${esc(q.t)}</label><textarea id="${q.id}" data-q="${q.id}" rows="2">${esc(val)}</textarea></div>`;
  if (q.type === "grade") {
    const g = val || {};
    return `<div class="q" data-qwrap="${q.id}"><div class="qlabel" id="${q.id}-l">${n}${esc(q.t)}</div>
      <div class="grade" role="group" aria-labelledby="${q.id}-l">
        <input id="${q.id}-g" type="number" min="0" max="10" step="0.1" placeholder="Nota" value="${esc(g.grade)}" data-q="${q.id}" data-f="grade" aria-label="Nota (0 a 10)" ${g.notTaken ? "disabled" : ""}>
        <label class="chk"><input id="${q.id}-nt" type="checkbox" data-q="${q.id}" data-f="notTaken" ${g.notTaken ? "checked" : ""}> No cursada</label>
        <input class="gcomment" id="${q.id}-c" type="text" placeholder="Comentario (lenguaje, temas, proyecto…)" value="${esc(g.comment)}" data-q="${q.id}" data-f="comment" aria-label="Comentario">
      </div></div>`;
  }
  if (q.type === "choice") {
    return `<div class="q" role="radiogroup" aria-labelledby="${q.id}-l" data-qwrap="${q.id}"><div class="qlabel" id="${q.id}-l">${n}${esc(q.t)}</div><div class="opts">${(q.o || []).map((o, i) =>
      `<label class="opt"><input type="radio" id="${q.id}-${i}" name="${q.id}" value="${esc(o)}" data-q="${q.id}" ${val === o ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div></div>`;
  }
  return "";
}
// Muestra u oculta las preguntas condicionales del formulario según las respuestas.
function applyVisibility(root, a) {
  for (const q of QUESTIONS) { const el = root.querySelector(`[data-qwrap="${q.id}"]`); if (el) el.hidden = !isVisible(q, a); }
}
function applyInput(a, el) {
  const id = el.dataset.q; if (!id) return null;
  const q = QUESTIONS.find(x => x.id === id); if (!q) return null;
  if (q.type === "grade") {
    const f = el.dataset.f;
    a[id] = a[id] && typeof a[id] === "object" ? a[id] : { grade: "", notTaken: false, comment: "" };
    a[id][f] = f === "notTaken" ? el.checked : el.value;
    if (f === "notTaken") { const g = document.getElementById(id + "-g"); if (g) g.disabled = el.checked; }
  } else a[id] = el.value;
  return id;
}
function configReady() { return CFG.SUPABASE_URL && !/TU-PROYECTO/.test(CFG.SUPABASE_URL) && CFG.SUPABASE_ANON_KEY && !/TU_CLAVE/.test(CFG.SUPABASE_ANON_KEY); }
function makeClient() { if (!configReady() || !window.supabase) return null; return window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
function downloadBlob(filename, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = "Copiado"; setTimeout(() => btn.textContent = o, 1500); } }
  catch (e) { const i = document.createElement("textarea"); i.value = text; document.body.appendChild(i); i.select(); try { document.execCommand("copy"); } catch (_) {} i.remove(); }
}
function convLabel(c) { return [c.tipo, c.universidad, c.titulacion, c.curso].filter(Boolean).join(" · "); }
