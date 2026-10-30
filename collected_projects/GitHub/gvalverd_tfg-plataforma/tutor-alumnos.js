"use strict";
/* ============ Vista: alumnos de la convocatoria activa ============ */
let students = {};       // id de fila -> { id, token, answers, tutor, origen, updatedAt }
let currentId = null;
let saveTimer = null, pendingId = null, loadedFor = null;
let openSecs = new Set(["A", "C", "E"]);

function resetStudents() { students = {}; currentId = null; loadedFor = null; clearTimeout(saveTimer); pendingId = null; }
function fromRow(r) { return { id: r.id, token: r.token, answers: fullAnswers(r.answers), tutor: Object.assign({ line: "", title: "", phone: "", notes: "" }, r.tutor || {}), origen: r.origen, updatedAt: r.updated_at }; }
function setState(t) { $("#store-state").textContent = t; }
function setSaved(t) { const el = $("#saved"); if (el) el.textContent = t; }
const lineById = id => LINES.find(l => l.id === id) || null;
const hasTutela = () => !!(CONV && /villanueva/i.test(CONV.universidad || "") && typeof TUTELA_B64 !== "undefined");

VIEWS.alumnos = {
  render() {
    $("#student-url").value = studentUrlFor(CONV);
    $("#sw-open").checked = !!CONV.abierta;
    if (loadedFor !== CONV.id) { loadedFor = CONV.id; $("#list").innerHTML = ""; $("#form-col").innerHTML = ""; $("#reco").innerHTML = ""; setState("Cargando…"); loadAll(false); }
    else select(currentId);
  },
};

/* ---------- Datos ---------- */
async function loadAll(keepCurrent) {
  const convId = CONV.id;
  const { data, error } = await client.from("respuestas").select("*").eq("convocatoria_id", convId).order("nombre");
  if (!CONV || CONV.id !== convId) return;
  if (error) { setState("No se pudieron cargar las respuestas: " + error.message); return; }
  const next = {};
  for (const r of data) next[r.id] = (pendingId === r.id && students[r.id]) ? students[r.id] : fromRow(r);
  students = next;
  if (!students[currentId]) currentId = Object.keys(students).sort((x, y) => (students[x].answers.q1 || "").localeCompare(students[y].answers.q1 || "", "es"))[0] || null;
  $("#n-alumnos").textContent = `(${data.length})`;
  setState(`Actualizado a las ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.`);
  if (keepCurrent) { renderList(); if (!pendingId) renderRecoKeepFocus(); } else select(currentId);
}
async function persist(id) {
  const rec = students[id]; if (!rec) return;
  const { data, error } = await client.from("respuestas").update({ nombre: (rec.answers.q1 || "").trim() || "Sin nombre", email: normEmail(rec.answers.q2), answers: rec.answers, tutor: rec.tutor, updated_at: new Date().toISOString() }).eq("id", id).select("updated_at").single();
  if (pendingId === id) pendingId = null;
  if (error) { setSaved(isDup(error) ? "No se ha guardado: ese correo ya lo tiene otro alumno." : "No se pudo guardar: " + error.message); return; }
  rec.updatedAt = data.updated_at; setSaved("Guardado");
}
function scheduleSave() { setSaved("Guardando…"); pendingId = currentId; clearTimeout(saveTimer); const id = currentId; saveTimer = setTimeout(() => persist(id), 700); }

const normEmail = e => (String(e || "").trim().toLowerCase()) || null;
const isDup = err => err && (err.code === "23505" || /duplicate|unique/i.test(err.message || ""));
const isEmpty = s => !(s.answers.q1 || "").trim() && !(s.answers.q2 || "").trim() && answeredCount(s.answers) === 0;
async function deleteStudents(ids) {
  if (!ids.length) return;
  const { error } = await client.from("respuestas").delete().in("id", ids);
  if (error) { setState("No se pudo eliminar: " + error.message); return; }
  for (const id of ids) delete students[id];
  if (!students[currentId]) currentId = Object.keys(students)[0] || null;
  $("#n-alumnos").textContent = `(${Object.keys(students).length})`;
  setState(ids.length === 1 ? "Ficha eliminada." : `${ids.length} fichas eliminadas.`);
  select(currentId);
}

/* ---------- Lista ---------- */
function renderList() {
  const q = ($("#search").value || "").toLowerCase();
  const ids = Object.keys(students).sort((x, y) => (students[x].answers.q1 || "").localeCompare(students[y].answers.q1 || "", "es"));
  const rows = ids.filter(id => (students[id].answers.q1 || "").toLowerCase().includes(q)).map(id => {
    const s = students[id]; const r = recommend(s.answers);
    const chosen = s.tutor.line ? lineById(s.tutor.line)?.short : null;
    const sug = chosen ? "Acordada: " + esc(chosen) : r.top ? "Sugerida: " + esc(r.top.short) : "Sin líneas";
    const when = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
    return `<div class="item-row" aria-current="${id === currentId}">
      <button class="item" type="button" data-id="${esc(id)}" aria-current="${id === currentId}">
        <span class="n">${esc(s.answers.q1 || "Sin nombre")}</span>
        <span class="l">${s.answers.q2 ? esc(s.answers.q2) + " · " : ""}${sug} · ${answeredCount(s.answers)}/${visibleQuestions(s.answers).length} · ${esc(when)}</span>
      </button>
      <button class="iconbtn del" type="button" data-del="${esc(id)}" aria-label="Eliminar a ${esc(s.answers.q1 || "este alumno")}" title="Eliminar">&times;</button>
    </div>`;
  });
  $("#list").innerHTML = rows.length ? rows.join("") : `<div style="padding:12px 0;color:var(--muted);font-size:14px">${ids.length ? "Ningún alumno coincide con la búsqueda." : "Aún no hay respuestas. Comparte el enlace para los alumnos."}</div>`;
  const empties = ids.filter(id => isEmpty(students[id]));
  const be = $("#btn-empty"); be.hidden = !empties.length; be.dataset.confirm = ""; be.textContent = `Eliminar fichas vacías (${empties.length})`;
}

/* ---------- Ficha ---------- */
function renderForm() {
  const col = $("#form-col"); const rec = students[currentId];
  if (!rec) {
    const url = studentUrlFor(CONV);
    col.innerHTML = `<div class="empty"><h2 style="font-size:24px">Todavía no hay respuestas</h2>
      <p style="margin:0;color:var(--muted);max-width:60ch">Envía a tus alumnos el enlace del cuestionario. Cada uno solo ve y edita lo suyo; aquí aparecerán todas las respuestas en cuanto las envíen. También puedes importar el Excel de Microsoft Forms o crear una ficha a mano.</p>
      <div class="linkrow" style="width:100%;max-width:560px"><input type="text" readonly value="${esc(url)}" style="background:var(--bg);color:var(--fg);border:1.5px solid var(--line)" aria-label="Enlace para los alumnos"><button class="btn small" type="button" data-act="copy-url">Copiar enlace</button></div></div>`;
    return;
  }
  const a = rec.answers;
  const origin = { web: "Enviado por el alumno", forms: "Importado de Forms", tutor: "Creado por el tutor", migracion: "Enviado por el alumno" }[rec.origen] || "";
  col.innerHTML = `
    <div class="student-head">
      <div><div class="eyebrow" style="color:var(--muted)">${esc(origin)}${rec.updatedAt ? " · " + esc(new Date(rec.updatedAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })) : ""}</div><h2 id="student-name">${esc(a.q1 || "Sin nombre")}</h2></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="saved" id="saved" aria-live="polite"></span>
        <button class="btn ghost small" type="button" id="btn-plink">Copiar enlace personal del alumno</button>
        <button class="btn danger small" type="button" id="btn-del">Eliminar ficha</button></div>
    </div>
    <form id="qform" autocomplete="off" novalidate>
      ${SECTIONS.map(s => `<details class="sec" data-sec="${s.k}" ${openSecs.has(s.k) ? "open" : ""}>
        <summary><span class="letter">${s.k}</span>${esc(s.t)}<span class="count" id="cnt-${s.k}"></span><svg class="tw" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></summary>
        <div class="sec-body"><fieldset>${s.q.map(q => qInput(q, a[q.id])).join("")}</fieldset></div>
      </details>`).join("")}
    </form>`;
  refreshCounts();
}

/* ---------- Recomendación ---------- */
function chevW(color) { return `<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2l6 6-6 6" fill="none" stroke="${color || "#ffbc00"}" stroke-width="2.6"/></svg>`; }
function titleFor(rec, r) { const lid = rec.tutor.line || (r.top && r.top.id); return (rec.tutor.title || (lid ? r.titleFor(lid) : "")).replace(/^./, c => c.toUpperCase()); }
function renderReco() {
  const box = $("#reco"); const rec = students[currentId];
  if (!rec) { box.innerHTML = `<div class="panel-dark"><div class="eyebrow">Recomendación</div><h3>Aparecerá aquí</h3><p style="margin:0;color:var(--band-muted);font-size:14px">Con las respuestas de cada alumno verás la línea que mejor encaja, por qué y el resto de opciones ordenadas.</p></div>`; return; }
  const r = recommend(rec.answers); const t = rec.tutor;
  if (!r.top) { box.innerHTML = `<div class="panel-dark"><div class="eyebrow">Recomendación</div><h3>Sin líneas de trabajo</h3><p style="margin:0;color:var(--band-muted);font-size:14px">Añade líneas en la pestaña «Líneas» para que el panel pueda recomendar una a cada alumno.</p></div>`; return; }
  const chosenId = t.line && lineById(t.line) ? t.line : r.top.id; const L = lineById(chosenId);
  const low = r.answered < Math.min(12, r.total * .4);
  box.innerHTML = `
    <div class="panel-dark">
      <div class="eyebrow">Línea recomendada · ${r.top.score}/100</div>
      <h3>${esc(r.top.name)}</h3>
      <ul class="why">${r.why.map(w => `<li>${chevW()}<span>${esc(w)}</span></li>`).join("")}${r.gaps.map(g => `<li class="gap">${chevW("#ffd57a")}<span>${esc(g)}</span></li>`).join("")}</ul>
      <div class="conf">${r.answered} de ${r.total} preguntas respondidas${low ? " · recomendación provisional, faltan datos" : ""}</div>
    </div>
    <div class="box"><h4>Encaje con ${LINES.length === 1 ? "la línea" : `las ${LINES.length} líneas`}</h4>
      <div class="ranking">${r.ranking.map((l, i) => `<div class="meter-row ${i === 0 ? "top" : ""}"><span class="name">${esc(l.short)}</span><span class="v">${l.score}</span><span class="bar" aria-hidden="true"><i style="width:${l.score}%"></i></span></div>`).join("")}</div></div>
    <div class="box"><h4>Propuesta de trabajo</h4>
      <dl class="kv"><dt>Alcance</dt><dd>${esc(r.scope)}</dd>${L && L.entregable ? `<dt>Entregable</dt><dd>${esc(L.entregable)}</dd>` : ""}</dl>
      <div class="flags">${r.flags.map(f => `<div class="flag ${f.c}">${esc(f.t)}</div>`).join("")}</div></div>
    <div class="box"><h4>Decisión del tutor${hasTutela() ? " y hoja de tutela" : ""}</h4>
      <div class="q"><label for="t-line">Línea acordada</label>
        <select id="t-line" data-t="line"><option value="">Usar la recomendada (${esc(r.top.short)})</option>${LINES.map(l => `<option value="${esc(l.id)}" ${t.line === l.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
      <div class="q"><label for="t-title">Título provisional</label><textarea id="t-title" data-t="title" rows="3">${esc(titleFor(rec, r))}</textarea></div>
      <div class="q"><label for="t-phone">Teléfono del alumno</label><input id="t-phone" type="text" data-t="phone" value="${esc(t.phone)}" placeholder="(+34) …"></div>
      <div class="q"><label for="t-notes">Notas de la entrevista (el alumno no las ve)</label><textarea id="t-notes" data-t="notes" rows="3">${esc(t.notes)}</textarea></div>
      <div class="downloads">
        ${hasTutela() ? `<button class="btn" type="button" id="dl-tutela">Hoja de tutela (.docx) ${chevSvg}</button>` : ""}
        <button class="btn ghost" type="button" id="dl-ficha">Ficha completa (.md) ${chevSvg}</button>
      </div>
      <div class="msg" id="dl-msg" aria-live="polite"></div></div>
    ${propuestaBox(rec)}`;
}
function renderRecoKeepFocus() { const act = document.activeElement; if (act && $("#reco").contains(act)) return; renderReco(); }
function refreshCounts() {
  const a = students[currentId]?.answers; if (!a) return;
  const form = $("#qform"); if (form) applyVisibility(form, a);
  for (const s of SECTIONS) { const [n, t] = secCount(s, a); const el = $("#cnt-" + s.k); if (el) el.textContent = `${n}/${t}`; }
}
function select(id) { currentId = id; renderList(); renderForm(); renderReco(); }

/* ---------- Eventos ---------- */
document.addEventListener("input", e => {
  if (currentTab !== "alumnos") return;
  const el = e.target; const rec = students[currentId]; if (!rec) return;
  if (el.closest("#qform") && el.dataset.q) {
    const id = applyInput(rec.answers, el);
    if (id === "q1") $("#student-name").textContent = el.value || "Sin nombre";
    refreshCounts(); renderList(); renderRecoKeepFocus(); scheduleSave();
  } else if (el.dataset.t) {
    rec.tutor[el.dataset.t] = el.value;
    if (el.dataset.t === "line") { rec.tutor.title = ""; rec.tutor.propuesta = null; renderReco(); renderList(); $("#t-line")?.focus(); }
    scheduleSave();
  }
});
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches("#qform details.sec")) { const k = e.target.dataset.sec; e.target.open ? openSecs.add(k) : openSecs.delete(k); } }, true);
$("#search").addEventListener("input", renderList);
document.addEventListener("click", async e => {
  if (currentTab !== "alumnos") return;
  const item = e.target.closest(".item"); if (item) { select(item.dataset.id); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.del) {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "¿Borrar?"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.innerHTML = "&times;"; } }, 3500); return; }
    return deleteStudents([b.dataset.del]);
  }
  if (b.id === "btn-empty") {
    const empties = Object.keys(students).filter(id => isEmpty(students[id]));
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = `Pulsa otra vez para borrar ${empties.length}`; return; }
    return deleteStudents(empties);
  }
  if (b.id === "btn-new") return showNewForm();
  if (b.id === "nw-cancel") { select(currentId); return; }
  if (b.id === "btn-import") return $("#file-import").click();
  if (b.id === "btn-csv") return exportCsv();
  if (b.id === "btn-refresh") return loadAll(true);
  if (b.id === "btn-copy-url" || b.dataset.act === "copy-url") return copyText(studentUrlFor(CONV), b);
  if (b.id === "btn-plink") { const u = new URL(studentUrlFor(CONV)); u.searchParams.set("t", students[currentId].token); return copyText(u.toString(), b); }
  if (b.id === "btn-del") {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Pulsa otra vez para eliminar"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Eliminar ficha"; } }, 4000); return; }
    return deleteStudents([currentId]);
  }
  if (b.id === "dl-tutela") return dlTutela();
  if (b.id === "dl-ficha") { downloadBlob(`Ficha_${CONV.tipo}_${fileName()}.md`, fichaMd(), "text/markdown;charset=utf-8"); $("#dl-msg").textContent = "Ficha descargada."; }
});
$("#sw-open").addEventListener("change", async e => {
  const v = e.target.checked;
  const { data, error } = await client.from("convocatorias").update({ abierta: v }).eq("id", CONV.id).select().single();
  if (error) { e.target.checked = !v; setState("No se pudo cambiar: " + error.message); return; }
  replaceConv(data);
  setState(v ? "Cuestionario abierto: los alumnos pueden enviar y editar." : "Cuestionario cerrado: los alumnos ya no pueden enviar cambios.");
});
window.addEventListener("focus", () => { if (client && currentTab === "alumnos" && CONV && !$("#v-alumnos").hidden && !pendingId) loadAll(true); });

function showNewForm() {
  if (currentTab !== "alumnos") showTab("alumnos");
  const dom = CONV.dominio_correo ? "nombre@" + CONV.dominio_correo : "nombre@universidad.edu";
  $("#form-col").innerHTML = `<form class="box" id="new-form" style="max-width:560px" novalidate>
      <h4>Nuevo alumno</h4>
      <div class="q"><label for="nw-name">Nombre y apellidos</label><input id="nw-name" type="text" required></div>
      <div class="q"><label for="nw-email">Correo universitario</label><input id="nw-email" type="email" required placeholder="${esc(dom)}"></div>
      <div class="toolbar"><button class="btn" type="submit">Crear ficha</button><button class="btn ghost" type="button" id="nw-cancel">Cancelar</button></div>
      <div class="msg" id="nw-msg" aria-live="polite"></div>
    </form>`;
  setTimeout(() => $("#nw-name").focus(), 0);
}
document.addEventListener("submit", async e => {
  if (e.target.id !== "new-form") return;
  e.preventDefault();
  const name = $("#nw-name").value.trim(), email = normEmail($("#nw-email").value), msg = $("#nw-msg");
  if (name.length < 2) { msg.textContent = "Escribe el nombre y apellidos."; $("#nw-name").focus(); return; }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escribe un correo válido."; $("#nw-email").focus(); return; }
  const dup = Object.keys(students).find(id => normEmail(students[id].answers.q2) === email);
  if (dup) { msg.textContent = "Ya hay una ficha con ese correo. Te la abro."; setTimeout(() => select(dup), 900); return; }
  const a = blankAnswers(); a.q1 = name; a.q2 = email;
  const id = await createStudent(a, "tutor");
  if (id) { openSecs.add("A"); select(id); }
  else msg.textContent = $("#store-state").textContent;
});
async function createStudent(answers, origen) {
  const a = answers || blankAnswers();
  if (a.q2) a.q2 = normEmail(a.q2) || "";
  const { data, error } = await client.from("respuestas").insert({ convocatoria_id: CONV.id, token: crypto.randomUUID(), nombre: (a.q1 || "").trim() || "Sin nombre", email: normEmail(a.q2), answers: a, origen: origen || "tutor" }).select().single();
  if (error) { setState(isDup(error) ? "Ya existe una ficha con ese correo." : "No se pudo crear la ficha: " + error.message); return null; }
  students[data.id] = fromRow(data);
  $("#n-alumnos").textContent = `(${Object.keys(students).length})`;
  return data.id;
}
function fileName() { return slug(students[currentId]?.answers.q1 || "alumno").replace(/-/g, "_"); }

/* ---------- Descargas ---------- */
function xmlEsc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
async function dlTutela() {
  const rec = students[currentId]; const msg = $("#dl-msg");
  if (typeof JSZip === "undefined") { msg.textContent = "No se pudo cargar el generador de Word. Recarga la página."; return; }
  if (!(rec.answers.q1 || "").trim()) { msg.textContent = "Falta el nombre del alumno."; return; }
  const r = recommend(rec.answers);
  const bin = atob(TUTELA_B64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const zip = await JSZip.loadAsync(bytes);
  let xml = await zip.file("word/document.xml").async("string");
  const map = { NOMBRE: rec.answers.q1, EMAIL: rec.answers.q2, TELEFONO: rec.tutor.phone, AREA: CONV.area, TITULO: titleFor(rec, r).trim(), TUTOR: TUTOR_NAME() };
  for (const [k, v] of Object.entries(map)) xml = xml.split("{{" + k + "}}").join(xmlEsc(v || ""));
  zip.file("word/document.xml", xml);
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  downloadBlob(`Hoja_tutela_${CONV.tipo}_${fileName()}.docx`, blob);
  msg.textContent = "Hoja de tutela descargada.";
}
function fichaMd() {
  const rec = students[currentId], a = rec.answers, r = recommend(a);
  const lineId = rec.tutor.line || (r.top && r.top.id); const L = lineById(lineId);
  const out = [`# Ficha ${CONV.tipo} · ${a.q1 || "Sin nombre"}`, "", `${CONV.nombre} · ${convLabel(CONV)}`, `Tutor: ${TUTOR_NAME()}`, rec.updatedAt ? `Actualizado: ${new Date(rec.updatedAt).toLocaleString("es-ES")}` : "", ""];
  if (r.top) out.push("## Recomendación", "", `- Línea recomendada: **${r.top.name}** (${r.top.score}/100)`, `- Línea acordada: **${L ? L.name : ""}**`, `- Título provisional: ${titleFor(rec, r)}`,
    `- Alcance: ${r.scope}`, L && L.entregable ? `- Entregable: ${L.entregable}` : "", "", "Por qué:", ...r.why.map(w => `- ${w}`), ...r.gaps.map(g => `- A vigilar: ${g}`), "", "Señales:", ...r.flags.map(f => `- ${f.t}`), "",
    "Encaje con las líneas:", ...r.ranking.map(l => `- ${l.name}: ${l.score}`), "");
  if (rec.tutor.notes) out.push("## Notas de la entrevista", "", rec.tutor.notes, "");
  for (const s of SECTIONS) {
    const qs = s.q.filter(q => isVisible(q, a)); if (!qs.length) continue;
    out.push(`## ${s.k}. ${s.t}`, ""); for (const q of qs) out.push(`**${QNUM[q.id]}. ${q.t}**`, "", answerText(q, a[q.id]) || "_Sin respuesta_", "");
  }
  return out.join("\n");
}
function exportCsv() {
  const ids = Object.keys(students);
  if (!ids.length) { setState("No hay alumnos que exportar."); return; }
  const head = ["Nombre", "Correo", "Origen", "Actualizado", "Línea recomendada", "Encaje", "Segunda línea", "Línea acordada", "Título provisional", "Alcance", "Teléfono", "Notas del tutor", ...QUESTIONS.map(q => `${QNUM[q.id]}. ${q.t}`)];
  const rows = ids.map(id => {
    const s = students[id], a = s.answers, r = recommend(a); const lid = s.tutor.line || (r.top && r.top.id);
    return [a.q1, a.q2, s.origen, s.updatedAt, r.top ? r.top.name : "", r.top ? r.top.score : "", r.ranking[1] ? r.ranking[1].name : "", lineById(lid)?.name || "", titleFor(s, r), r.scope, s.tutor.phone, s.tutor.notes, ...QUESTIONS.map(q => answerText(q, a[q.id]))];
  });
  const csv = "﻿" + [head, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  downloadBlob(`${slug(CONV.nombre)}_alumnos.csv`, csv, "text/csv;charset=utf-8");
}

/* ---------- Importar Excel de Microsoft Forms ---------- */
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^\s*\d+[\.\)]\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();
function matchColumn(headers, q) {
  const target = norm(q.t), pref = target.slice(0, 38); let best = -1, bestScore = 0;
  headers.forEach((h, i) => {
    const n = norm(h); if (!n) return; let sc = 0;
    if (n === target) sc = 3; else if (n.startsWith(pref) || target.startsWith(n.slice(0, 38))) sc = 2;
    else { const tw = new Set(target.split(" ").filter(w => w.length > 3)); const hw = n.split(" ").filter(w => w.length > 3); const inter = hw.filter(w => tw.has(w)).length; sc = tw.size ? inter / tw.size : 0; if (sc < .6) sc = 0; }
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best;
}
function pickOption(q, raw) { const v = norm(raw); if (!v) return ""; const ex = q.o.find(o => norm(o) === v); if (ex) return ex; return q.o.find(o => v.startsWith(norm(o).slice(0, 14)) || norm(o).startsWith(v.slice(0, 14))) || ""; }
$("#file-import").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (typeof XLSX === "undefined") { setState("No se pudo cargar el lector de Excel. Recarga la página."); return; }
  try {
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false });
    if (rows.length < 2) { setState("El archivo no tiene respuestas."); return; }
    const headers = rows[0].map(String);
    const cols = Object.fromEntries(QUESTIONS.map(q => [q.id, matchColumn(headers, q)]));
    if (cols.q1 < 0) { const ni = headers.findIndex(h => /^nombre$/i.test(h.trim())); if (ni >= 0) cols.q1 = ni; }
    if (cols.q2 < 0) { const ei = headers.findIndex(h => /correo/i.test(h)); if (ei >= 0) cols.q2 = ei; }
    const matched = Object.values(cols).filter(i => i >= 0).length;
    let added = 0, updated = 0, first = null;
    for (const row of rows.slice(1)) {
      if (!row.some(c => String(c).trim())) continue;
      const a = blankAnswers();
      for (const q of QUESTIONS) {
        const i = cols[q.id]; if (i < 0) continue; const raw = String(row[i] ?? "").trim();
        if (q.type === "grade") { const g = parseGrade(raw); a[q.id] = { grade: g === null ? "" : String(g), notTaken: isNotTaken(raw), comment: raw }; }
        else if (q.type === "choice") a[q.id] = pickOption(q, raw); else a[q.id] = raw;
      }
      if (!a.q1) continue;
      const em = normEmail(a.q2); if (em) a.q2 = em;
      const existing = (em && Object.keys(students).find(id => normEmail(students[id].answers.q2) === em))
        || Object.keys(students).find(id => !normEmail(students[id].answers.q2) && (students[id].answers.q1 || "").trim().toLowerCase() === a.q1.trim().toLowerCase());
      if (existing) { students[existing].answers = a; await persist(existing); updated++; first = first || existing; }
      else { const id = await createStudent(a, "forms"); if (id) { added++; first = first || id; } }
    }
    setState(`Importados ${added} nuevos y ${updated} actualizados. Se reconocieron ${matched} de ${QUESTIONS.length} preguntas.`);
    if (first) select(first); else renderList();
  } catch (err) { setState("No se pudo leer el archivo. Exporta las respuestas de Forms a Excel (.xlsx) y vuelve a intentarlo."); }
});
