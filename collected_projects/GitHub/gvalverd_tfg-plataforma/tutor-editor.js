"use strict";
/* ============ Editor de preguntas y textos (panel del tutor) ============ */
// Edita CONV.def de la convocatoria activa.
const TYPE_LABELS = { text: "Respuesta corta", area: "Respuesta larga", grade: "Nota + comentario", choice: "Opción única", email: "Correo" };
let draft = null, dirty = false;
const DIM_OPTS = { "": "No la usa", code: "Programación y datos", stats: "Estadística", ml: "Aprendizaje automático", biz: "Negocio" };
function startDraft() { draft = currentDefinition(); dirty = false; }
function resetEditor() { draft = null; dirty = false; }
VIEWS.preguntas = {
  render() { renderEditor(); },
  canLeave(silent) { if (!dirty) return true; if (!silent) { const m = $("#ed-msg"); if (m) { m.textContent = "Guarda o descarta los cambios antes de salir."; m.scrollIntoView({ block: "nearest" }); } } return false; },
};
function newQid() { let id; do { id = "p" + Math.random().toString(36).slice(2, 8); } while (draft.sections.some(s => s.q.some(q => q.id === id))); return id; }
function setDirty(v) {
  dirty = v;
  const m = $("#ed-msg"); if (m && v) m.textContent = "Tienes cambios sin guardar.";
  const b = $("#ed-save"); if (b) b.disabled = !v;
}
function letter(i) { return String.fromCharCode(65 + i); }

function renderEditor() {
  if (!draft) startDraft();
  QN = {}; let k = 0; for (const s of draft.sections) for (const q of s.q) QN[q.id] = ++k;
  let n = 0;
  const secCount = draft.sections.length;
  $("#v-preguntas").innerHTML = `
    <div class="ed-head">
      <h2>Preguntas y textos del cuestionario</h2>
      <p>Lo que cambies aquí lo verán los alumnos de esta convocatoria en cuanto guardes y recarguen la página. Las respuestas ya enviadas no se pierden: si retiras una pregunta, su respuesta se conserva aunque deje de mostrarse.</p>
      <p>Una pregunta puede mostrarse solo según la respuesta a otra anterior (por ejemplo, «¿En qué empresa trabajas?» solo si contestó que trabaja). Las preguntas de nota o de opción única pueden alimentar una dimensión del recomendador.</p>
    </div>
    <div class="ed-sticky">
      <button class="btn" type="button" id="ed-save" ${dirty ? "" : "disabled"}>Guardar cambios</button>
      <button class="btn ghost small" type="button" id="ed-discard">Descartar cambios</button>
      <select id="ed-tpl" aria-label="Plantilla" style="padding:7px 8px;border:1.5px solid var(--line);background:var(--bg);color:var(--fg);font:inherit;font-size:14px">${PLANTILLAS.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select>
      <button class="btn ghost small" type="button" id="ed-default">Cargar esta plantilla</button>
      <span class="msg" id="ed-msg" aria-live="polite">${dirty ? "Tienes cambios sin guardar." : ""}</span>
    </div>
    <div class="box">
      <h4>Textos de la página del alumno</h4>
      <div class="ed-field"><label for="ed-title">Título</label><input id="ed-title" data-e="intro" data-f="title" value="${esc(draft.intro.title)}"></div>
      <div class="ed-field"><label for="ed-text">Presentación</label><textarea id="ed-text" data-e="intro" data-f="text" rows="3">${esc(draft.intro.text)}</textarea></div>
      <div class="ed-field"><label for="ed-priv">Aviso de privacidad</label><textarea id="ed-priv" data-e="intro" data-f="privacy" rows="2">${esc(draft.intro.privacy)}</textarea></div>
    </div>
    ${draft.sections.map((s, si) => {
      const hasLocked = s.q.some(q => LOCKED_IDS.includes(q.id));
      return `
    <div class="ed-sec">
      <div class="ed-sec-head">
        <span class="letter">${letter(si)}</span>
        <input id="es-${si}" data-e="sec" data-si="${si}" value="${esc(s.t)}" aria-label="Título de la sección ${letter(si)}">
        <button class="iconbtn" type="button" data-a="sec-up" data-si="${si}" ${si === 0 ? "disabled" : ""} aria-label="Subir sección">&uarr;</button>
        <button class="iconbtn" type="button" data-a="sec-down" data-si="${si}" ${si === secCount - 1 ? "disabled" : ""} aria-label="Bajar sección">&darr;</button>
        <button class="iconbtn del" type="button" data-a="sec-del" data-si="${si}" ${hasLocked ? 'disabled title="Contiene el nombre o el correo"' : ""} aria-label="Eliminar sección">&times;</button>
      </div>
      ${s.q.map((q, qi) => editorQuestion(q, si, qi, ++n, s.q.length, secCount)).join("")}
      <div><button class="btn ghost small" type="button" data-a="q-add" data-si="${si}">Añadir pregunta a esta sección</button></div>
    </div>`; }).join("")}
    <div><button class="btn ghost" type="button" data-a="sec-add">Añadir sección</button></div>`;
}

function priorQuestions(si, qi) { const out = []; draft.sections.forEach((s, a) => s.q.forEach((q, b) => { if (a < si || (a === si && b < qi)) out.push(q); })); return out; }
function condEditor(q, si, qi) {
  if (LOCKED_IDS.includes(q.id)) return "";
  const prev = priorQuestions(si, qi).filter(p => !LOCKED_IDS.includes(p.id));
  if (!prev.length) return "";
  const c = q.cond || null, src = c ? prev.find(p => p.id === c.q) : null;
  const opsel = c ? `<select data-e="cop" data-si="${si}" data-qi="${qi}" aria-label="Condición">${Object.entries(COND_OPS).map(([k, v]) => `<option value="${k}" ${c.op === k ? "selected" : ""}>${v}</option>`).join("")}</select>` : "";
  let val = "";
  if (c && (c.op === "eq" || c.op === "neq")) {
    const opts = src && src.type === "choice" ? (LINE_OPTION_IDS.includes(src.id) ? LINE_NAMES : src.o || []) : null;
    val = opts ? `<select data-e="cv" data-si="${si}" data-qi="${qi}" aria-label="Valor">${opts.map(o => `<option ${String(c.v) === String(o) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : `<input data-e="cv" data-si="${si}" data-qi="${qi}" value="${esc(c.v)}" aria-label="Valor" placeholder="respuesta exacta">`;
  }
  return `<div class="ed-cond"><span>Mostrar</span>
    <select data-e="cq" data-si="${si}" data-qi="${qi}" aria-label="Mostrar la pregunta"><option value="">siempre</option>${prev.map(p => `<option value="${p.id}" ${c && c.q === p.id ? "selected" : ""}>si la ${QN[p.id]}. «${esc(String(p.t).slice(0, 48))}${p.t.length > 48 ? "…" : ""}»</option>`).join("")}</select>
    ${opsel}${val}</div>`;
}
let QN = {};
function editorQuestion(q, si, qi, n, qCount, secCount) {
  const locked = LOCKED_IDS.includes(q.id), lineOpts = LINE_OPTION_IDS.includes(q.id), reco = RECO_IDS.includes(q.id);
  const types = Object.entries(TYPE_LABELS).filter(([k]) => k !== "email" || q.id === "q2");
  let opts = "";
  if (q.type === "choice") {
    opts = lineOpts
      ? '<div class="ops"><label>Opciones: las líneas de la pestaña «Líneas» (las usa el recomendador)</label></div>'
      : `<div class="ops"><label for="eo-${q.id}">Opciones (una por línea)${CANON[q.id] ? " · puedes reescribirlas, pero mantén el orden" : ""}</label>
          <textarea id="eo-${q.id}" data-e="qopts" data-si="${si}" data-qi="${qi}" rows="${Math.max(3, (q.o || []).length)}">${esc((q.o || []).join("\n"))}</textarea></div>`;
  }
  return `
      <div class="ed-q">
        <span class="qn">${n}.</span>
        <div class="fields">
          <textarea id="eq-${q.id}" data-e="qt" data-si="${si}" data-qi="${qi}" rows="2" aria-label="Texto de la pregunta ${n}">${esc(q.t)}</textarea>
          <div class="row">
            <select id="ety-${q.id}" data-e="qtype" data-si="${si}" data-qi="${qi}" aria-label="Tipo de respuesta" ${locked || lineOpts ? "disabled" : ""}>${types.map(([k, v]) => `<option value="${k}" ${q.type === k ? "selected" : ""}>${v}</option>`).join("")}</select>
            ${locked ? '<span class="pill">Obligatoria</span>' : ""}
            ${reco ? '<span class="pill reco">La usa el recomendador</span>' : ""}
            ${!reco && !locked && (q.type === "grade" || q.type === "choice") ? `<select data-e="qdim" data-si="${si}" data-qi="${qi}" aria-label="Dimensión del recomendador">${Object.entries(DIM_OPTS).map(([k, v]) => `<option value="${k}" ${(q.dim || "") === k ? "selected" : ""}>${k ? "Recomendador: " + v : "Recomendador: no la usa"}</option>`).join("")}</select>` : ""}
          </div>
          ${opts}
          ${condEditor(q, si, qi)}
        </div>
        <div class="acts">
          <button class="iconbtn" type="button" data-a="q-up" data-si="${si}" data-qi="${qi}" ${si === 0 && qi === 0 ? "disabled" : ""} aria-label="Subir pregunta">&uarr;</button>
          <button class="iconbtn" type="button" data-a="q-down" data-si="${si}" data-qi="${qi}" ${si === secCount - 1 && qi === qCount - 1 ? "disabled" : ""} aria-label="Bajar pregunta">&darr;</button>
          <button class="iconbtn del" type="button" data-a="q-del" data-si="${si}" data-qi="${qi}" ${locked ? "disabled" : ""} aria-label="Eliminar pregunta">&times;</button>
        </div>
      </div>`;
}

$("#v-preguntas").addEventListener("input", e => {
  const el = e.target, si = +el.dataset.si, qi = +el.dataset.qi;
  switch (el.dataset.e) {
    case "intro": draft.intro[el.dataset.f] = el.value; break;
    case "sec": draft.sections[si].t = el.value; break;
    case "qt": draft.sections[si].q[qi].t = el.value; break;
    case "qopts": draft.sections[si].q[qi].o = el.value.split("\n"); break;
    case "qdim": { const q = draft.sections[si].q[qi]; if (el.value) q.dim = el.value; else delete q.dim; break; }
    case "cq": {
      const q = draft.sections[si].q[qi];
      if (!el.value) delete q.cond;
      else { const src = priorQuestions(si, qi).find(p => p.id === el.value); const first = src && src.type === "choice" ? ((LINE_OPTION_IDS.includes(src.id) ? LINE_NAMES : src.o) || [""])[0] : ""; q.cond = { q: el.value, op: "eq", v: first || "" }; }
      setDirty(true); renderEditor(); return;
    }
    case "cop": draft.sections[si].q[qi].cond.op = el.value; setDirty(true); renderEditor(); return;
    case "cv": draft.sections[si].q[qi].cond.v = el.value; break;
    case "qtype": {
      const q = draft.sections[si].q[qi]; q.type = el.value;
      if (q.type === "choice" && !(q.o && q.o.length)) q.o = ["Opción 1", "Opción 2"];
      if (q.type !== "choice") delete q.o;
      if (q.type !== "choice" && q.type !== "grade") delete q.dim;
      setDirty(true); renderEditor(); const f = document.getElementById("ety-" + q.id); if (f) f.focus(); return;
    }
    default: return;
  }
  setDirty(true);
});

$("#v-preguntas").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "ed-save") return saveDefinition();
  if (b.id === "ed-discard") { startDraft(); renderEditor(); $("#ed-msg").textContent = "Cambios descartados."; return; }
  if (b.id === "ed-default") {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Pulsa otra vez: sustituye todas las preguntas"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Cargar esta plantilla"; } }, 4000); return; }
    const p = PLANTILLAS.find(x => x.id === $("#ed-tpl").value); draft = clone(p.def); setDirty(true); renderEditor();
    $("#ed-msg").textContent = `Cargada la plantilla «${p.nombre}». Pulsa «Guardar cambios» para publicarla.`; return;
  }
  const a = b.dataset.a; if (!a) return;
  const si = +b.dataset.si, qi = +b.dataset.qi, secs = draft.sections;
  if ((a === "q-del" || a === "sec-del") && b.dataset.confirm !== "1") {
    b.dataset.confirm = "1"; b.textContent = "¿Seguro?";
    setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.innerHTML = "&times;"; } }, 3500); return;
  }
  let focus = null;
  if (a === "q-add") { const q = { id: newQid(), t: "Nueva pregunta", type: "area" }; secs[si].q.push(q); focus = "eq-" + q.id; }
  if (a === "q-del") { const gone = secs[si].q.splice(qi, 1)[0]; for (const s of secs) for (const x of s.q) if (x.cond && x.cond.q === gone.id) delete x.cond; }
  if (a === "q-up" || a === "q-down") {
    const q = secs[si].q.splice(qi, 1)[0];
    if (a === "q-up") { if (qi > 0) secs[si].q.splice(qi - 1, 0, q); else secs[si - 1].q.push(q); }
    else { if (qi < secs[si].q.length) secs[si].q.splice(qi + 1, 0, q); else secs[si + 1].q.unshift(q); }
    focus = "eq-" + q.id;
  }
  if (a === "sec-add") { secs.push({ t: "Nueva sección", q: [{ id: newQid(), t: "Nueva pregunta", type: "area" }] }); focus = "es-" + (secs.length - 1); }
  if (a === "sec-del") { const gone = new Set(secs.splice(si, 1)[0].q.map(x => x.id)); for (const s of secs) for (const x of s.q) if (x.cond && gone.has(x.cond.q)) delete x.cond; }
  if (a === "sec-up" && si > 0) { [secs[si - 1], secs[si]] = [secs[si], secs[si - 1]]; focus = "es-" + (si - 1); }
  if (a === "sec-down" && si < secs.length - 1) { [secs[si + 1], secs[si]] = [secs[si], secs[si + 1]]; focus = "es-" + (si + 1); }
  setDirty(true); renderEditor();
  if (focus) { const f = document.getElementById(focus); if (f) f.focus(); }
});

async function saveDefinition() {
  const msg = $("#ed-msg");
  const def = clone(draft);
  def.sections = def.sections.filter(s => s.q.length);
  for (const s of def.sections) {
    s.t = (s.t || "").trim() || "Sin título";
    for (const q of s.q) {
      q.t = (q.t || "").trim();
      if (q.type === "choice" && q.o) q.o = q.o.map(x => String(x).trim()).filter(Boolean);
      if (!q.t) { msg.textContent = "Hay una pregunta sin texto. Escríbelo o elimínala."; const f = document.getElementById("eq-" + q.id); if (f) f.focus(); return; }
      if (q.type === "choice" && !LINE_OPTION_IDS.includes(q.id) && (!q.o || q.o.length < 2)) { msg.textContent = `La pregunta «${q.t.slice(0, 40)}» necesita al menos dos opciones.`; const f = document.getElementById("eo-" + q.id); if (f) f.focus(); return; }
    }
  }
  if (!def.sections.length) { msg.textContent = "El cuestionario necesita al menos una sección con preguntas."; return; }
  // Una condición solo puede depender de una pregunta anterior
  const order = def.sections.flatMap(s => s.q.map(q => q.id));
  for (const s of def.sections) for (const q of s.q) if (q.cond && !(order.indexOf(q.cond.q) >= 0 && order.indexOf(q.cond.q) < order.indexOf(q.id))) delete q.cond;
  for (const id of LOCKED_IDS) if (!order.includes(id)) { msg.textContent = "El cuestionario debe conservar las preguntas de nombre y correo."; return; }
  $("#ed-save").disabled = true; msg.textContent = "Guardando…";
  const { data, error } = await client.from("convocatorias").update({ def }).eq("id", CONV.id).select().single();
  if (error) { $("#ed-save").disabled = false; msg.textContent = "No se pudo guardar: " + error.message; return; }
  replaceConv(data); startDraft(); renderEditor();
  $("#ed-msg").textContent = "Guardado. Los alumnos verán el cuestionario nuevo al recargar la página.";
  for (const id of Object.keys(students)) students[id].answers = fullAnswers(students[id].answers);
}
