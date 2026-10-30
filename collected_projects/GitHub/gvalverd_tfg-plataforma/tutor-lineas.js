"use strict";
/* ============ Vista: líneas de trabajo de la convocatoria ============ */
let lDraft = null, lDirty = false;
const NEED_LABELS = { code: "Programación y datos", stats: "Estadística", ml: "Aprendizaje automático", biz: "Negocio" };
function resetLines() { lDraft = null; lDirty = false; }
function startLines() { lDraft = clone(LINES.map(l => { const o = Object.assign({}, l); return o; })); lDirty = false; }
function setLDirty(v) { lDirty = v; const m = $("#ln-msg"); if (m && v) m.textContent = "Tienes cambios sin guardar."; const b = $("#ln-save"); if (b) b.disabled = !v; }
VIEWS.lineas = {
  render() { if (!lDraft) startLines(); renderLines(); },
  canLeave(silent) { if (!lDirty) return true; if (!silent) { const m = $("#ln-msg"); if (m) m.textContent = "Guarda o descarta los cambios antes de salir."; } return false; },
};
const paras = arr => (arr || []).join("\n\n");
const linesOf = arr => (arr || []).join("\n");

function renderLines() {
  const v = $("#v-lineas");
  v.innerHTML = `
    <div class="ed-head"><h2>Líneas de trabajo</h2>
      <p class="lead">Son los temas entre los que eliges para cada alumno. El recomendador compara el nivel que pide cada línea (de 0 a 5) con lo que el alumno responde, y suma su interés, sus preferencias y el sector que le motiva. Los textos de problema, objetivos y fases rellenan la propuesta en Word; escribe <code>{sector}</code> donde quieras que aparezca el sector del alumno.</p></div>
    <div class="ed-sticky">
      <button class="btn" type="button" id="ln-save" ${lDirty ? "" : "disabled"}>Guardar cambios</button>
      <button class="btn ghost small" type="button" id="ln-discard">Descartar cambios</button>
      <select id="ln-tpl" aria-label="Plantilla de líneas" style="padding:7px 8px;border:1.5px solid var(--line);background:var(--bg);color:var(--fg);font:inherit;font-size:14px">${PLANTILLAS.filter(p => p.lineas.length).map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("")}</select>
      <button class="btn ghost small" type="button" id="ln-tpl-load">Cargar sus líneas</button>
      <span class="msg" id="ln-msg" aria-live="polite">${lDirty ? "Tienes cambios sin guardar." : ""}</span>
    </div>
    ${lDraft.length ? "" : '<div class="notice">Esta convocatoria no tiene líneas. Añade la primera o carga las de una plantilla.</div>'}
    ${lDraft.map((l, i) => lineCard(l, i)).join("")}
    <div><button class="btn ghost" type="button" data-l="add">Añadir línea</button></div>`;
}
function lineCard(l, i) {
  const f = (k, label, val, rows, hint) => rows
    ? `<div class="q"><label for="ln-${i}-${k}">${label}</label><textarea id="ln-${i}-${k}" data-lf="${k}" data-li="${i}" rows="${rows}">${esc(val)}</textarea>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`
    : `<div class="q"><label for="ln-${i}-${k}">${label}</label><input id="ln-${i}-${k}" data-lf="${k}" data-li="${i}" value="${esc(val)}">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  return `<div class="line-card form-box">
    <div class="head"><span class="letter">${i + 1}</span><span class="t">${esc(l.name || "Nueva línea")}</span>
      <button class="iconbtn" type="button" data-l="up" data-li="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir línea">&uarr;</button>
      <button class="iconbtn" type="button" data-l="down" data-li="${i}" ${i === lDraft.length - 1 ? "disabled" : ""} aria-label="Bajar línea">&darr;</button>
      <button class="iconbtn del" type="button" data-l="del" data-li="${i}" aria-label="Eliminar línea">&times;</button></div>
    <div class="grid2">
      ${f("name", "Nombre (lo ven los alumnos)", l.name)}
      ${f("short", "Nombre corto (para el panel)", l.short)}
    </div>
    ${f("entregable", "Entregable", l.entregable)}
    <div><div class="qlabel" style="font-size:14px;font-weight:700;margin-bottom:6px">Nivel que pide (0 = nada, 5 = mucho)</div>
      <div class="need-row">${Object.entries(NEED_LABELS).map(([k, lab]) => `<label>${lab}<input type="number" min="0" max="5" step="0.5" data-ln="${k}" data-li="${i}" value="${esc((l.need || {})[k] ?? 2.5)}"></label>`).join("")}</div></div>
    <div><div class="qlabel" style="font-size:14px;font-weight:700;margin-bottom:6px">Sectores que encajan</div>
      <div class="chips">${SECTORS_DEF.map(s => `<label><input type="checkbox" data-ls="${s.k}" data-li="${i}" ${(l.sectors || []).includes(s.k) ? "checked" : ""}> ${esc(s.label)}</label>`).join("")}</div></div>
    ${f("titulo", "Título provisional", l.titulo, 2, "Usa {sector} para el sector del alumno, por ejemplo «… en {sector}».")}
    <div class="grid2">
      ${f("sector_def", "Sector si el alumno no indica ninguno", l.sector_def)}
      ${f("en", "Título en inglés", l.en)}
    </div>
    ${f("problema", "Problema a tratar (párrafos separados por una línea en blanco)", paras(l.problema), 6)}
    ${f("general", "Objetivo general", l.general, 2)}
    <div class="grid2">
      ${f("especificos", "Objetivos específicos (uno por línea)", linesOf(l.especificos), 5)}
      ${f("fases", "Fases de trabajo (una por línea)", linesOf(l.fases), 5)}
    </div>
  </div>`;
}
function newLineId(name) {
  let base = slug(name || "linea").slice(0, 24) || "linea", id = base, n = 2;
  while (lDraft.some(l => l.id === id)) id = `${base}-${n++}`;
  return id;
}
$("#v-lineas").addEventListener("input", e => {
  const el = e.target, i = +el.dataset.li; const l = lDraft[i]; if (!l) return;
  if (el.dataset.lf) {
    const k = el.dataset.lf;
    if (k === "problema") l.problema = el.value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    else if (k === "especificos" || k === "fases") l[k] = el.value.split("\n").map(x => x.trim()).filter(Boolean);
    else l[k] = el.value;
    if (k === "name") { const t = el.closest(".line-card").querySelector(".head .t"); if (t) t.textContent = el.value || "Nueva línea"; }
  } else if (el.dataset.ln) { l.need = l.need || {}; const n = parseFloat(String(el.value).replace(",", ".")); l.need[el.dataset.ln] = isFinite(n) ? Math.max(0, Math.min(5, n)) : 2.5; }
  else if (el.dataset.ls) { const s = new Set(l.sectors || []); el.checked ? s.add(el.dataset.ls) : s.delete(el.dataset.ls); l.sectors = [...s]; }
  else return;
  setLDirty(true);
});
$("#v-lineas").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "ln-save") return saveLines();
  if (b.id === "ln-discard") { startLines(); renderLines(); $("#ln-msg").textContent = "Cambios descartados."; return; }
  if (b.id === "ln-tpl-load") {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Pulsa otra vez: sustituye todas las líneas"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Cargar sus líneas"; } }, 4000); return; }
    const p = PLANTILLAS.find(x => x.id === $("#ln-tpl").value); lDraft = clone(p.lineas); setLDirty(true); renderLines();
    $("#ln-msg").textContent = `Cargadas las líneas de «${p.nombre}». Pulsa «Guardar cambios» para usarlas.`; return;
  }
  const a = b.dataset.l; if (!a) return; const i = +b.dataset.li;
  if (a === "del" && b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "¿Seguro?"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.innerHTML = "&times;"; } }, 3500); return; }
  if (a === "add") { lDraft.push({ id: newLineId("linea"), name: "", short: "", entregable: "", need: { code: 2.5, stats: 2.5, ml: 2.5, biz: 2.5 }, w: { code: 1, stats: 1, ml: 1, biz: 1 }, fav: {}, pref: {}, sectors: [], titulo: "", sector_def: "una empresa", en: "", problema: [], general: "", especificos: [], fases: [] }); }
  if (a === "del") lDraft.splice(i, 1);
  if (a === "up" && i > 0) [lDraft[i - 1], lDraft[i]] = [lDraft[i], lDraft[i - 1]];
  if (a === "down" && i < lDraft.length - 1) [lDraft[i + 1], lDraft[i]] = [lDraft[i], lDraft[i + 1]];
  setLDirty(true); renderLines();
  if (a === "add") { const f = document.getElementById(`ln-${lDraft.length - 1}-name`); if (f) f.focus(); }
});

async function saveLines() {
  const msg = $("#ln-msg");
  const out = clone(lDraft);
  const names = new Set();
  for (const [i, l] of out.entries()) {
    l.name = (l.name || "").trim(); l.short = (l.short || "").trim() || l.name;
    if (!l.name) { msg.textContent = `La línea ${i + 1} no tiene nombre.`; document.getElementById(`ln-${i}-name`)?.focus(); return; }
    if (names.has(l.name.toLowerCase())) { msg.textContent = `Hay dos líneas llamadas «${l.name}».`; document.getElementById(`ln-${i}-name`)?.focus(); return; }
    names.add(l.name.toLowerCase());
    if (!l.id) l.id = newLineId(l.name);
  }
  // Las respuestas guardan el nombre elegido en «primera/segunda opción»: si se renombra una línea, se actualizan.
  const renamed = {};
  for (const l of out) { const old = LINES.find(x => x.id === l.id); if (old && old.name !== l.name) renamed[old.name] = l.name; }
  $("#ln-save").disabled = true; msg.textContent = "Guardando…";
  const { data, error } = await client.from("convocatorias").update({ lineas: out }).eq("id", CONV.id).select().single();
  if (error) { $("#ln-save").disabled = false; msg.textContent = "No se pudo guardar: " + error.message; return; }
  let fixed = 0;
  if (Object.keys(renamed).length) {
    const { data: rows } = await client.from("respuestas").select("id, answers").eq("convocatoria_id", CONV.id);
    for (const r of rows || []) {
      const a = r.answers || {}; let ch = false;
      for (const k of LINE_OPTION_IDS) if (renamed[a[k]]) { a[k] = renamed[a[k]]; ch = true; }
      if (ch) { await client.from("respuestas").update({ answers: a }).eq("id", r.id); fixed++; if (students[r.id]) students[r.id].answers = fullAnswers(a); }
    }
  }
  replaceConv(data); startLines(); renderLines();
  $("#ln-msg").textContent = "Guardado." + (fixed ? ` Actualizadas ${fixed} respuestas con el nombre nuevo.` : "") + " Los alumnos verán las líneas nuevas al recargar la página.";
}
