"use strict";
/* ============ Propuesta de TFG (descripción del proyecto) ============ */
// Formato basado en las propuestas de TFM de la UCM y el anexo IV de CUNEF.
// Los textos salen de la línea de trabajo (problema, objetivos, fases) de la convocatoria:
// curso, títulos (es/en), tipo, institución, tutor, estudiante, problema, objetivos, métodos y fases.
function propuestaAuto(rec) {
  const r = recommend(rec.answers), lineId = rec.tutor.line || (r.top && r.top.id), L = lineById(lineId) || {};
  const sector = sectorPhrase(r.sector, L);
  const problema = (L.problema || []).map(p => String(p).replace(/\{sector\}/g, sector));
  const q34 = String(rec.answers.q34 || "").trim(), q33 = String(rec.answers.q33 || rec.answers.m7 || "").trim();
  if (q34) problema.push(`Pregunta de negocio de partida propuesta por el estudiante: «${q34.replace(/[«»"]/g, "")}».`);
  const conDatos = q33 && !/^no\b/i.test(q33);
  const datos = conDatos ? `Fuente de datos indicada por el estudiante: ${q33}. Se verificará la autorización de uso y la confidencialidad antes de empezar.` : "Se trabajará con un conjunto de datos público adecuado a la pregunta, documentando su origen y licencia.";
  return {
    en: L.en || "", tipo: conDatos ? "Aplicado con empresa" : "Académico", institucion: CONV.universidad || "",
    problema: problema.join("\n\n"), general: L.general || "", especificos: (L.especificos || []).join("\n"), fases: (L.fases || []).join("\n"),
    datos, alcance: r.scope,
  };
}
function getProp(rec) { if (!rec.tutor.propuesta) rec.tutor.propuesta = propuestaAuto(rec); return rec.tutor.propuesta; }

function propuestaBox(rec) {
  const p = getProp(rec);
  const f = (id, label, val, rows) => rows
    ? `<div class="q"><label for="pp-${id}">${label}</label><textarea id="pp-${id}" data-p="${id}" rows="${rows}">${esc(val)}</textarea></div>`
    : `<div class="q"><label for="pp-${id}">${label}</label><input id="pp-${id}" type="text" data-p="${id}" value="${esc(val)}"></div>`;
  return `
    <div class="box" id="prop-box"><h4>Descripción del proyecto</h4>
      <p style="margin:0;font-size:13px;color:var(--muted)">Se rellena con la línea, el título y las respuestas del alumno. Edítala y descárgala en Word.</p>
      ${f("en", "Título en inglés", p.en)}
      ${f("tipo", "Tipo", p.tipo)}
      ${f("institucion", "Institución o empresa colaboradora", p.institucion)}
      ${f("problema", "Problema a tratar", p.problema, 7)}
      ${f("general", "Objetivo general", p.general, 3)}
      ${f("especificos", "Objetivos específicos (uno por línea)", p.especificos, 5)}
      ${f("fases", "Métodos y fases de trabajo (una por línea)", p.fases, 6)}
      ${f("datos", "Datos", p.datos, 3)}
      ${f("alcance", "Alcance previsto", p.alcance, 2)}
      <div class="downloads">
        <button class="btn" type="button" id="dl-prop">Propuesta de ${esc(CONV.tipo)} (.docx) ${chevSvg}</button>
        <button class="btn ghost small" type="button" id="prop-regen">Volver a generar la descripción</button>
      </div>
      <div class="msg" id="prop-msg" aria-live="polite"></div>
    </div>`;
}

document.addEventListener("input", e => {
  const el = e.target; if (currentTab !== "alumnos" || !el.dataset || !el.dataset.p) return;
  const rec = students[currentId]; if (!rec) return;
  getProp(rec)[el.dataset.p] = el.value; scheduleSave();
});
document.addEventListener("click", async e => {
  if (currentTab !== "alumnos") return;
  const b = e.target.closest("button"); if (!b) return;
  const rec = students[currentId]; if (!rec) return;
  if (b.id === "prop-regen") {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Pulsa otra vez: se sustituye lo que hayas editado"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Volver a generar la descripción"; } }, 4000); return; }
    rec.tutor.propuesta = propuestaAuto(rec); scheduleSave(); renderReco(); $("#prop-msg").textContent = "Descripción generada de nuevo."; return;
  }
  if (b.id === "dl-prop") {
    if (typeof JSZip === "undefined") { $("#prop-msg").textContent = "No se pudo cargar el generador de Word. Recarga la página."; return; }
    const blob = await buildPropuestaDocx(rec);
    downloadBlob(`Propuesta_${CONV.tipo}_${fileName()}.docx`, blob);
    $("#prop-msg").textContent = "Propuesta descargada.";
  }
});

/* ---------- Generación del Word ---------- */
function xe(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function run(text, o = {}) {
  const pr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}<w:sz w:val="${o.sz || 24}"/></w:rPr>`;
  return `<w:r>${pr}<w:t xml:space="preserve">${xe(text)}</w:t></w:r>`;
}
function para(runs, o = {}) {
  const pPr = `<w:pPr>${o.center ? '<w:jc w:val="center"/>' : o.justify ? '<w:jc w:val="both"/>' : ""}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 160}" w:line="276" w:lineRule="auto"/>${o.ind ? `<w:ind w:left="${o.ind}" w:hanging="360"/>` : ""}</w:pPr>`;
  return `<w:p>${pPr}${Array.isArray(runs) ? runs.join("") : runs}</w:p>`;
}
function field(label, value) { return para([run(label + ": ", { b: true }), run(value || "")], { after: 80 }); }
async function buildPropuestaDocx(rec) {
  const r = recommend(rec.answers), p = getProp(rec);
  const lineId = rec.tutor.line || (r.top && r.top.id), L = lineById(lineId);
  const tipoLargo = CONV.tipo === "TFM" ? "Trabajo de Fin de Máster" : "Trabajo de Fin de Grado";
  const cab = [CONV.universidad, CONV.titulacion, CONV.area].filter(Boolean).join(" · ");
  const titulo = titleFor(rec, r).trim();
  const lines = s => String(s || "").split("\n").map(x => x.trim()).filter(Boolean);
  const body = [
    cab ? para(run(cab, { b: true, sz: 22 }), { center: true, after: 120 }) : "",
    para(run(`Propuesta de ${CONV.tipo} (${tipoLargo})`, { b: true, sz: 30 }), { center: true, after: 480 }),
    field("Curso académico", CONV.curso),
    field("Título", titulo),
    field("Título en inglés", p.en),
    field("Línea de trabajo", L ? L.name : ""),
    field("Tipo", p.tipo),
    field("Institución", p.institucion),
    field("Tutor", TUTOR_NAME()),
    field("Estudiante", rec.answers.q1),
    para(run(""), { after: 80 }),
    para(run("Problema a tratar:", { b: true }), { before: 120 }),
    ...lines(p.problema).map(t => para(run(t), { justify: true })),
    para(run("Objetivos:", { b: true }), { before: 120 }),
    para(run(p.general), { justify: true }),
    para(run("Los objetivos específicos son:"), { justify: true }),
    ...lines(p.especificos).map((t, i) => para([run(`${i + 1}.\t`), run(t)], { justify: true, ind: 720, after: 80 })),
    para(run("Métodos y fases de trabajo:", { b: true }), { before: 200 }),
    ...lines(p.fases).map((t, i) => para([run(`${i + 1}.\t`), run(t)], { justify: true, ind: 720, after: 80 })),
    para(run("Datos:", { b: true }), { before: 200 }),
    para(run(p.datos), { justify: true }),
    para(run("Alcance previsto:", { b: true }), { before: 120 }),
    para(run(p.alcance), { justify: true }),
    para(run("Seguimiento:", { b: true }), { before: 120 }),
    para(run("Repositorio en GitHub con acceso del tutor, tablero de tareas y tutorías periódicas. Cada hito tendrá un entregable verificable en el repositorio."), { justify: true }),
  ].join("");
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", doc);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
