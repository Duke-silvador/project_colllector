"use strict";
/* ============ Vista: ajustes de la convocatoria y cotutores ============ */
VIEWS.ajustes = {
  render() {
    const c = CONV, own = isOwner();
    const sel = (id, vals, cur) => `<select id="${id}">${vals.map(v => `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("")}</select>`;
    $("#v-ajustes").innerHTML = `
      <div class="ed-head"><h2>Ajustes y cotutores</h2><p class="lead">Datos de la convocatoria, enlace para los alumnos y profesores con los que la compartes.</p></div>
      <div class="msg" id="aj-msg" aria-live="polite"></div>
      <div class="box">
        <h4>Enlace para los alumnos</h4>
        <div class="linkrow"><input id="aj-url" type="text" readonly value="${esc(studentUrlFor(c))}" style="background:var(--surface);color:var(--fg)"><button class="btn small" type="button" id="aj-copy">Copiar</button></div>
        <label class="switch"><input type="checkbox" id="aj-open" ${c.abierta ? "checked" : ""}> Cuestionario abierto</label>
      </div>
      <form class="box form-box" id="aj-form" novalidate>
        <h4>Datos de la convocatoria</h4>
        <div class="grid2">
          <div class="q"><label for="aj-nombre">Nombre</label><input id="aj-nombre" value="${esc(c.nombre)}"></div>
          <div class="q"><label for="aj-tipo">Tipo</label>${sel("aj-tipo", ["TFG", "TFM"], c.tipo)}</div>
          <div class="q"><label for="aj-uni">Universidad o escuela</label><input id="aj-uni" value="${esc(c.universidad)}"></div>
          <div class="q"><label for="aj-tit">Titulación</label><input id="aj-tit" value="${esc(c.titulacion)}"></div>
          <div class="q"><label for="aj-area">Área</label><input id="aj-area" value="${esc(c.area)}"></div>
          <div class="q"><label for="aj-curso">Curso</label><input id="aj-curso" value="${esc(c.curso)}"></div>
          <div class="q"><label for="aj-dom">Dominio del correo de los alumnos</label><input id="aj-dom" value="${esc(c.dominio_correo)}" placeholder="alumnos.universidad.edu"></div>
          <div class="q"><label for="aj-slug">Dirección del enlace</label><input id="aj-slug" value="${esc(c.slug)}"><span class="hint">Si la cambias, el enlace anterior dejará de funcionar.</span></div>
        </div>
        <div class="toolbar"><button class="btn" type="submit" id="aj-save">Guardar datos</button></div>
      </form>
      <div class="box">
        <h4>Tutores de esta convocatoria</h4>
        <p class="lead" style="font-size:14px">Todos los tutores ven a todos los alumnos, editan las fichas y reciben el aviso de cada respuesta. ${own ? "Si el profesor aún no tiene cuenta, le llegará una invitación y verá la convocatoria en cuanto se apruebe su cuenta." : "Solo quien creó la convocatoria puede añadir o quitar tutores."}</p>
        <div id="aj-tutores"><span class="lead">Cargando…</span></div>
        ${own ? `<form id="aj-add" class="linkrow" novalidate><input id="aj-add-email" type="email" placeholder="correo del profesor" aria-label="Correo del cotutor" style="background:var(--bg);color:var(--fg);border:1.5px solid var(--line)"><button class="btn small" type="submit">Añadir cotutor</button></form>` : ""}
      </div>
      ${own ? `<div class="box"><h4>Eliminar convocatoria</h4>
        <p class="lead" style="font-size:14px">Se borran la convocatoria, sus preguntas, sus líneas y todas las respuestas de sus alumnos. No se puede deshacer. Exporta antes el CSV si quieres conservarlas.</p>
        <div class="toolbar"><button class="btn danger small" type="button" id="aj-del">Eliminar convocatoria</button></div></div>` : ""}`;
    loadTutores();
  },
};
async function loadTutores() {
  const { data, error } = await client.rpc("tfg_conv_tutores", { p_conv: CONV.id });
  const box = $("#aj-tutores"); if (!box) return;
  if (error) { box.innerHTML = `<span class="msg">No se pudieron cargar: ${esc(error.message)}</span>`; return; }
  const own = isOwner();
  box.innerHTML = `<table class="tbl"><thead><tr><th>Profesor</th><th>Papel</th><th></th></tr></thead><tbody>${(data || []).map(t => `
    <tr><td><strong>${esc(t.nombre || t.email)}</strong><br><span class="lead" style="font-size:13px">${esc(t.email)}${t.universidad ? " · " + esc(t.universidad) : ""}</span></td>
      <td>${t.rol === "propietario" ? '<span class="pill">Creador</span>' : t.pendiente ? '<span class="pill warn">Invitado, sin cuenta aprobada</span>' : '<span class="pill ok">Cotutor</span>'}</td>
      <td>${own && t.rol !== "propietario" ? `<button class="btn ghost small" type="button" data-quitar="${esc(t.email)}">Quitar</button>` : ""}</td></tr>`).join("")}</tbody></table>`;
}
document.addEventListener("submit", async e => {
  if (e.target.id === "aj-form") {
    e.preventDefault(); const msg = $("#aj-msg");
    const s = slug($("#aj-slug").value.trim());
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(s)) { msg.textContent = "La dirección del enlace debe tener al menos 3 letras o números."; return; }
    if ($("#aj-nombre").value.trim().length < 3) { msg.textContent = "Escribe un nombre para la convocatoria."; return; }
    const upd = { nombre: $("#aj-nombre").value.trim(), tipo: $("#aj-tipo").value, universidad: $("#aj-uni").value.trim(), titulacion: $("#aj-tit").value.trim(), area: $("#aj-area").value.trim(), curso: $("#aj-curso").value.trim(), dominio_correo: $("#aj-dom").value.trim().replace(/^@/, "").toLowerCase(), slug: s };
    $("#aj-save").disabled = true; msg.textContent = "Guardando…";
    const { data, error } = await client.from("convocatorias").update(upd).eq("id", CONV.id).select().single();
    $("#aj-save").disabled = false;
    if (error) { msg.textContent = /duplicate|unique|23505/i.test(error.message + error.code) ? "Esa dirección ya la usa otra convocatoria." : "No se pudo guardar: " + error.message; return; }
    replaceConv(data); VIEWS.ajustes.render(); $("#aj-msg").textContent = "Datos guardados.";
  }
  if (e.target.id === "aj-add") {
    e.preventDefault(); const msg = $("#aj-msg"); const email = $("#aj-add-email").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escribe el correo del profesor."; return; }
    const { data, error } = await client.rpc("tfg_conv_add_tutor", { p_conv: CONV.id, p_email: email });
    if (error) { msg.textContent = "No se pudo añadir: " + error.message; return; }
    msg.textContent = data === "añadido" ? `${email} ya es cotutor y le hemos avisado por correo.` : `Hemos invitado a ${email}. Verá la convocatoria en cuanto cree su cuenta y se apruebe.`;
    $("#aj-add-email").value = ""; loadTutores();
  }
});
document.addEventListener("change", async e => {
  if (e.target.id !== "aj-open") return;
  const v = e.target.checked;
  const { data, error } = await client.from("convocatorias").update({ abierta: v }).eq("id", CONV.id).select().single();
  if (error) { e.target.checked = !v; $("#aj-msg").textContent = "No se pudo cambiar: " + error.message; return; }
  replaceConv(data); $("#aj-msg").textContent = v ? "Cuestionario abierto." : "Cuestionario cerrado: los alumnos ya no pueden enviar cambios.";
});
document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "aj-copy") return copyText($("#aj-url").value, b);
  if (b.dataset.quitar) {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "¿Quitar?"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Quitar"; } }, 3500); return; }
    const { error } = await client.rpc("tfg_conv_quitar_tutor", { p_conv: CONV.id, p_email: b.dataset.quitar });
    $("#aj-msg").textContent = error ? "No se pudo quitar: " + error.message : `${b.dataset.quitar} ya no es tutor de esta convocatoria.`;
    return loadTutores();
  }
  if (b.id === "aj-del") {
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = `Pulsa otra vez para borrar «${CONV.nombre}» y sus alumnos`; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Eliminar convocatoria"; } }, 5000); return; }
    const { error } = await client.from("convocatorias").delete().eq("id", CONV.id);
    if (error) { $("#aj-msg").textContent = "No se pudo eliminar: " + error.message; return; }
    convs = convs.filter(c => c.id !== CONV.id); setConvocatoria(null); resetStudents(); showTab("convocatorias", true);
  }
});

/* ============ Vista: profesores (solo administrador) ============ */
VIEWS.admin = {
  async render() {
    const v = $("#v-admin");
    v.innerHTML = `<div class="ed-head"><h2>Profesores</h2><p class="lead">Aprueba a los profesores que se registran. Hasta que los apruebes no ven nada ni pueden crear convocatorias. Al aprobarlos les llega un correo y, si alguien les había invitado como cotutores, ya ven esas convocatorias.</p></div><div class="msg" id="ad-msg" aria-live="polite"></div><div id="ad-list"><span class="lead">Cargando…</span></div>`;
    const { data, error } = await client.rpc("tfg_admin_tutores");
    if (error) { $("#ad-list").innerHTML = `<div class="warnbox">No se pudo cargar la lista: ${esc(error.message)}</div>`; return; }
    const pill = s => s === "aprobado" ? '<span class="pill ok">Aprobado</span>' : s === "rechazado" ? '<span class="pill bad">Rechazado</span>' : '<span class="pill warn">Pendiente</span>';
    $("#ad-list").innerHTML = `<table class="tbl"><thead><tr><th>Profesor</th><th>Universidad</th><th>Alta</th><th>Estado</th><th></th></tr></thead><tbody>${(data || []).map(t => `
      <tr><td><strong>${esc(t.nombre || "Sin nombre")}</strong><br><span class="lead" style="font-size:13px">${esc(t.email)}</span></td>
        <td>${esc(t.universidad)}</td><td>${esc(new Date(t.created_at).toLocaleDateString("es-ES"))}</td><td>${pill(t.estado)}${t.es_admin ? ' <span class="pill">Admin</span>' : ""}</td>
        <td>${t.id === profile.id ? "" : `<div class="toolbar">${t.estado !== "aprobado" ? `<button class="btn small" type="button" data-estado="aprobado" data-tid="${esc(t.id)}">Aprobar</button>` : ""}${t.estado !== "rechazado" ? `<button class="btn ghost small" type="button" data-estado="rechazado" data-tid="${esc(t.id)}">${t.estado === "aprobado" ? "Retirar acceso" : "Rechazar"}</button>` : ""}</div>`}</td></tr>`).join("")}</tbody></table>`;
  },
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-estado]"); if (!b) return;
  b.disabled = true;
  const { error } = await client.rpc("tfg_admin_estado", { p_tutor: b.dataset.tid, p_estado: b.dataset.estado });
  if (error) { b.disabled = false; $("#ad-msg").textContent = "No se pudo cambiar: " + error.message; return; }
  await VIEWS.admin.render();
  $("#ad-msg").textContent = b.dataset.estado === "aprobado" ? "Profesor aprobado. Le hemos avisado por correo." : "Acceso retirado.";
});
