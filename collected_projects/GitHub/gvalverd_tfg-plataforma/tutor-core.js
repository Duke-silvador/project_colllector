"use strict";
/* ============ Núcleo del panel: acceso, convocatorias y navegación ============ */
const client = makeClient();
let profile = null;          // fila de tutores del usuario
let convs = [];              // convocatorias visibles (propias y compartidas)
let myRoles = {};            // convocatoria_id -> 'propietario' | 'cotutor'
let currentTab = "convocatorias";
const VIEWS = {};            // tab -> { render(), canLeave?() }
const LAST_CONV_KEY = "tfg-panel-conv";
const ls2 = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

const TUTOR_NAME = () => (profile && (profile.nombre || profile.email)) || "";
const isOwner = () => CONV && myRoles[CONV.id] === "propietario";
function studentUrlFor(c) { const u = new URL("./", location.href); u.searchParams.set("c", c.slug); return u.toString(); }

/* ---------- Pantallas ---------- */
const SCREENS = ["login", "register", "pending", "pwd"];
function showScreen(id) {
  for (const s of SCREENS) $("#" + s).hidden = s !== id;
  const inPanel = !id;
  $("#tabs").hidden = !inPanel; $("#band-actions").hidden = !inPanel;
  if (!inPanel) for (const v of document.querySelectorAll('[id^="v-"]')) v.hidden = true;
}
function updateBand() {
  if (CONV) {
    $("#band-eyebrow").textContent = convLabel(CONV) || "Convocatoria";
    $("#band-title").textContent = CONV.nombre;
    $("#band-text").textContent = myRoles[CONV.id] === "cotutor" ? "Convocatoria compartida contigo como cotutor." : "Respuestas de tus alumnos, línea recomendada y documentos de propuesta.";
  } else {
    $("#band-eyebrow").textContent = "Plataforma de TFG y TFM";
    $("#band-title").textContent = "Panel del tutor";
    $("#band-text").textContent = "Crea una convocatoria y comparte su enlace con tus alumnos.";
  }
  const pick = $("#conv-pick");
  pick.innerHTML = (convs.length ? "" : '<option value="">Sin convocatorias</option>') + convs.map(c => `<option value="${esc(c.id)}" ${CONV && CONV.id === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("");
  pick.hidden = !convs.length;
  for (const b of document.querySelectorAll("#tabs [data-need-conv]")) b.hidden = !CONV;
  $("#tab-admin").hidden = !(profile && profile.es_admin);
  $("#btn-new").hidden = currentTab !== "alumnos" || !CONV;
  $("#btn-import").hidden = currentTab !== "alumnos" || !CONV;
}

function showTab(tab, force) {
  if (!force && VIEWS[currentTab] && VIEWS[currentTab].canLeave && !VIEWS[currentTab].canLeave()) return false;
  if (tab !== "convocatorias" && tab !== "admin" && !CONV) tab = "convocatorias";
  if (tab === "admin" && !(profile && profile.es_admin)) tab = "convocatorias";
  currentTab = tab;
  for (const b of document.querySelectorAll("#tabs [data-tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  for (const v of document.querySelectorAll('[id^="v-"]')) v.hidden = v.id !== "v-" + tab;
  updateBand();
  if (VIEWS[tab]) VIEWS[tab].render();
  try { history.replaceState(null, "", location.pathname + (CONV && tab !== "convocatorias" && tab !== "admin" ? `#c=${CONV.slug}&v=${tab}` : tab === "admin" ? "#admin" : "")); } catch (e) {}
  return true;
}

/* ---------- Datos ---------- */
async function loadConvs() {
  const [{ data, error }, { data: roles }] = await Promise.all([
    client.from("convocatorias").select("*").order("created_at", { ascending: false }),
    client.from("convocatoria_tutores").select("convocatoria_id, rol").eq("tutor_id", profile.id),
  ]);
  if (error) { convs = []; return error; }
  convs = data || [];
  myRoles = Object.fromEntries((roles || []).map(r => [r.convocatoria_id, r.rol]));
  return null;
}
function selectConv(id, tab) {
  const c = convs.find(x => x.id === id) || null;
  if (VIEWS[currentTab] && VIEWS[currentTab].canLeave && !VIEWS[currentTab].canLeave()) { updateBand(); return; }
  setConvocatoria(c);
  if (c) ls2.set(LAST_CONV_KEY, c.id);
  if (typeof resetStudents === "function") resetStudents();
  if (typeof resetEditor === "function") resetEditor();
  if (typeof resetLines === "function") resetLines();
  showTab(tab || (c ? "alumnos" : "convocatorias"), true);
}
// Sustituye la convocatoria activa por la versión guardada (tras editar ajustes, preguntas o líneas)
function replaceConv(row) {
  const i = convs.findIndex(c => c.id === row.id);
  if (i >= 0) convs[i] = row; else convs.unshift(row);
  if (CONV && CONV.id === row.id) setConvocatoria(row);
  updateBand();
}

/* ---------- Vista: convocatorias ---------- */
const PLANTILLA_INFO = {
  "tfg-ba": "39 preguntas pensadas para TFG de grado (asignaturas, programación, intereses) y seis líneas de análisis de negocio.",
  "tfm-ba": "Versión para máster: experiencia profesional, acceso a datos de empresa y preguntas que se adaptan a cada respuesta.",
  "vacia": "Solo nombre y correo. Añades tú las preguntas y las líneas.",
};
VIEWS.convocatorias = {
  render() {
    const v = $("#v-convocatorias");
    const cards = convs.map(c => {
      const rol = myRoles[c.id] === "propietario" ? "" : '<span class="pill">Cotutor</span>';
      return `<button class="conv-card" type="button" data-conv="${esc(c.id)}" aria-current="${CONV && CONV.id === c.id}">
        <span class="t">${esc(c.nombre)}</span>
        <span class="m">${esc(convLabel(c))}</span>
        <span class="s">${c.abierta ? '<span class="pill ok">Abierta</span>' : '<span class="pill">Cerrada</span>'}${rol}<span class="pill" data-count="${esc(c.id)}">…</span></span>
      </button>`;
    }).join("");
    const opts = PLANTILLAS.map(p => `<option value="tpl:${p.id}">${esc(p.nombre)}</option>`).join("")
      + convs.map(c => `<option value="dup:${esc(c.id)}">Copiar preguntas y líneas de «${esc(c.nombre)}»</option>`).join("");
    v.innerHTML = `
      <div class="ed-head"><h2>Convocatorias</h2>
        <p class="lead">Una convocatoria es un grupo de alumnos con su cuestionario y sus líneas de trabajo: por ejemplo, «TFG de Análisis de Negocios 2026/27». Cada una tiene su propio enlace para los alumnos y puedes compartirla con otros profesores como cotutores.</p></div>
      ${convs.length ? `<div class="conv-grid">${cards}</div>` : `<div class="notice">Aún no tienes convocatorias. Crea la primera con el formulario de abajo.</div>`}
      <form class="box form-box" id="new-conv" novalidate>
        <h4>Nueva convocatoria</h4>
        <div class="grid2">
          <div class="q"><label for="nc-nombre">Nombre</label><input id="nc-nombre" required placeholder="TFG Análisis de Negocios 2026/27"></div>
          <div class="q"><label for="nc-tipo">Tipo</label><select id="nc-tipo"><option>TFG</option><option>TFM</option></select></div>
          <div class="q"><label for="nc-uni">Universidad o escuela</label><input id="nc-uni" value="${esc(profile.universidad || "")}"></div>
          <div class="q"><label for="nc-tit">Titulación</label><input id="nc-tit" placeholder="Grado en ADE"></div>
          <div class="q"><label for="nc-area">Área</label><input id="nc-area" placeholder="Análisis de Negocios"></div>
          <div class="q"><label for="nc-curso">Curso</label><input id="nc-curso" placeholder="2026/27"></div>
          <div class="q"><label for="nc-dom">Dominio del correo de los alumnos</label><input id="nc-dom" placeholder="alumnos.universidad.edu"><span class="hint">Opcional. Solo sirve para avisar al alumno si escribe otro correo.</span></div>
          <div class="q"><label for="nc-slug">Dirección del enlace</label><input id="nc-slug" placeholder="se rellena sola"><span class="hint" id="nc-slug-hint"></span></div>
        </div>
        <div class="q"><label for="nc-base">Empezar desde</label><select id="nc-base">${opts}</select><span class="hint" id="nc-base-hint"></span></div>
        <div class="toolbar"><button class="btn" type="submit" id="nc-btn">Crear convocatoria</button></div>
        <div class="msg" id="nc-msg" aria-live="polite"></div>
      </form>
      <form class="box form-box" id="profile-form" novalidate>
        <h4>Tu perfil</h4>
        <p class="lead" style="font-size:14px">Tu nombre aparece como tutor en la propuesta y en la hoja de tutela.</p>
        <div class="grid2">
          <div class="q"><label for="pf-nombre">Nombre y apellidos</label><input id="pf-nombre" value="${esc(profile.nombre || "")}"></div>
          <div class="q"><label for="pf-uni">Universidad o escuela</label><input id="pf-uni" value="${esc(profile.universidad || "")}"></div>
        </div>
        <div class="toolbar"><button class="btn ghost small" type="submit">Guardar perfil</button><span class="msg" id="pf-msg" aria-live="polite"></span></div>
      </form>`;
    this.baseHint(); this.slugHint();
    this.counts();
  },
  baseHint() {
    const val = $("#nc-base").value; const h = $("#nc-base-hint");
    if (val.startsWith("tpl:")) { const id = val.slice(4); h.textContent = PLANTILLA_INFO[id] || ""; const p = PLANTILLAS.find(x => x.id === id); if (p && p.tipo) $("#nc-tipo").value = p.tipo; }
    else h.textContent = "Se copian las preguntas, los textos y las líneas. Los alumnos no se copian.";
  },
  autoSlug() {
    const parts = [$("#nc-uni").value.split(/\s+/).filter(w => w.length > 3).slice(-1)[0] || "", $("#nc-tipo").value, $("#nc-area").value || $("#nc-nombre").value, ($("#nc-curso").value.match(/\d{2}(?=\D*$)|\d{4}/g) || []).join("")];
    return slug(parts.filter(Boolean).join(" ")).slice(0, 60);
  },
  slugHint() {
    const s = $("#nc-slug").value.trim() || this.autoSlug();
    $("#nc-slug-hint").textContent = s ? "Los alumnos entrarán en " + studentUrlFor({ slug: s }) : "";
  },
  async counts() {
    if (!convs.length) return;
    const { data } = await client.from("respuestas").select("convocatoria_id");
    const n = {}; for (const r of data || []) n[r.convocatoria_id] = (n[r.convocatoria_id] || 0) + 1;
    for (const el of document.querySelectorAll("[data-count]")) { const k = n[el.dataset.count] || 0; el.textContent = k === 1 ? "1 alumno" : `${k} alumnos`; }
  },
};
document.addEventListener("input", e => {
  if (!e.target.closest("#new-conv")) return;
  if (e.target.id === "nc-base") VIEWS.convocatorias.baseHint();
  VIEWS.convocatorias.slugHint();
});
document.addEventListener("change", e => { if (e.target.id === "nc-base" || e.target.id === "nc-tipo") { VIEWS.convocatorias.baseHint(); VIEWS.convocatorias.slugHint(); } });
document.addEventListener("submit", async e => {
  if (e.target.id === "new-conv") {
    e.preventDefault();
    const msg = $("#nc-msg"), nombre = $("#nc-nombre").value.trim();
    if (nombre.length < 3) { msg.textContent = "Escribe un nombre para la convocatoria."; $("#nc-nombre").focus(); return; }
    const s = slug($("#nc-slug").value.trim() || VIEWS.convocatorias.autoSlug());
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(s)) { msg.textContent = "La dirección del enlace debe tener al menos 3 letras o números."; $("#nc-slug").focus(); return; }
    const base = $("#nc-base").value; let def, lineas;
    if (base.startsWith("tpl:")) { const p = PLANTILLAS.find(x => x.id === base.slice(4)); def = clone(p.def); lineas = clone(p.lineas); }
    else { const c = convs.find(x => x.id === base.slice(4)); def = clone(c.def); lineas = clone(c.lineas); }
    $("#nc-btn").disabled = true; msg.textContent = "Creando…";
    const row = { slug: s, nombre, tipo: $("#nc-tipo").value, universidad: $("#nc-uni").value.trim(), titulacion: $("#nc-tit").value.trim(), area: $("#nc-area").value.trim(), curso: $("#nc-curso").value.trim(), dominio_correo: $("#nc-dom").value.trim().replace(/^@/, "").toLowerCase(), def, lineas, created_by: profile.id, abierta: true };
    const { data, error } = await client.from("convocatorias").insert(row).select().single();
    $("#nc-btn").disabled = false;
    if (error) { msg.textContent = /duplicate|unique|23505/i.test(error.message + error.code) ? "Esa dirección ya la usa otra convocatoria. Cambia la dirección del enlace." : "No se pudo crear: " + error.message; return; }
    myRoles[data.id] = "propietario"; convs.unshift(data);
    selectConv(data.id, "ajustes");
    const m = $("#aj-msg"); if (m) m.textContent = "Convocatoria creada. Revisa los datos, copia el enlace para los alumnos y añade cotutores si los hay.";
  }
  if (e.target.id === "profile-form") {
    e.preventDefault();
    const { error } = await client.rpc("tfg_actualizar_perfil", { p_nombre: $("#pf-nombre").value, p_universidad: $("#pf-uni").value });
    if (error) { $("#pf-msg").textContent = "No se pudo guardar: " + error.message; return; }
    profile.nombre = $("#pf-nombre").value.trim(); profile.universidad = $("#pf-uni").value.trim();
    $("#pf-msg").textContent = "Perfil guardado.";
  }
});

/* ---------- Navegación general ---------- */
document.addEventListener("click", async e => {
  const card = e.target.closest("[data-conv]"); if (card) { selectConv(card.dataset.conv); return; }
  const tab = e.target.closest("#tabs [data-tab]"); if (tab) { showTab(tab.dataset.tab); return; }
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "btn-logout" || b.hasAttribute("data-logout")) { await client.auth.signOut(); location.href = location.pathname; return; }
  if (b.id === "btn-pwd") return showPwd(false);
  if (b.id === "p-cancel") { showScreen(null); showTab(currentTab, true); return; }
  if (b.id === "btn-forgot") return forgot();
  if (b.id === "go-register") { showScreen("register"); $("#r-name").focus(); return; }
  if (b.id === "go-login") { showScreen("login"); return; }
  if (b.id === "pend-retry") return enterPanel();
});
$("#conv-pick").addEventListener("change", e => selectConv(e.target.value, currentTab === "convocatorias" || currentTab === "admin" ? "alumnos" : currentTab));

/* ---------- Acceso ---------- */
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault(); const btn = $("#l-btn"); btn.disabled = true; $("#l-msg").textContent = "Entrando…";
  const { error } = await client.auth.signInWithPassword({ email: $("#l-email").value.trim(), password: $("#l-pass").value });
  btn.disabled = false;
  if (error) { $("#l-msg").textContent = /confirm/i.test(error.message) ? "Aún no has confirmado tu correo. Abre el enlace que te enviamos al registrarte." : "Correo o contraseña incorrectos."; return; }
  $("#l-msg").textContent = ""; enterPanel();
});
$("#reg-form").addEventListener("submit", async e => {
  e.preventDefault(); const msg = $("#r-msg");
  const nombre = $("#r-name").value.trim(), uni = $("#r-uni").value.trim(), email = $("#r-email").value.trim().toLowerCase(), p1 = $("#r-p1").value, p2 = $("#r-p2").value;
  if (nombre.length < 3) { msg.textContent = "Escribe tu nombre y apellidos."; return; }
  if (uni.length < 2) { msg.textContent = "Escribe tu universidad o escuela."; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escribe un correo válido."; return; }
  if (p1.length < 10) { msg.textContent = "La contraseña debe tener al menos 10 caracteres."; return; }
  if (p1 !== p2) { msg.textContent = "Las dos contraseñas no coinciden."; return; }
  $("#r-btn").disabled = true; msg.textContent = "Creando la cuenta…";
  const { data, error } = await client.auth.signUp({ email, password: p1, options: { data: { nombre, universidad: uni }, emailRedirectTo: new URL("tutor.html", location.href).toString() } });
  $("#r-btn").disabled = false;
  if (error) { msg.textContent = /registered|exists/i.test(error.message) ? "Ya hay una cuenta con ese correo. Entra o recupera la contraseña." : "No se pudo crear la cuenta: " + error.message; return; }
  if (data && data.session) { enterPanel(); return; }
  $("#reg-form").innerHTML = `<div class="success"><div class="eyebrow">Cuenta creada</div><h2>Revisa tu correo</h2><p>Te hemos enviado un enlace para confirmar ${esc(email)}. Después, el administrador aprobará tu cuenta y recibirás otro correo.</p></div>`;
});

let recovering = false;
function showPwd(recovery) {
  recovering = recovery; showScreen("pwd");
  $("#pwd-title").textContent = recovery ? "Elige una contraseña nueva" : "Cambiar contraseña";
  $("#p-cancel").hidden = recovery; $("#p-msg").textContent = ""; $("#p-1").value = ""; $("#p-2").value = "";
  setTimeout(() => $("#p-1").focus(), 0);
}
$("#pwd-form").addEventListener("submit", async e => {
  e.preventDefault();
  const p1 = $("#p-1").value, p2 = $("#p-2").value, msg = $("#p-msg");
  if (p1.length < 10) { msg.textContent = "La contraseña debe tener al menos 10 caracteres."; return; }
  if (p1 !== p2) { msg.textContent = "Las dos contraseñas no coinciden."; return; }
  $("#p-btn").disabled = true; msg.textContent = "Guardando…";
  const { error } = await client.auth.updateUser({ password: p1 });
  $("#p-btn").disabled = false;
  if (error) { msg.textContent = /different|same/i.test(error.message) ? "La nueva contraseña debe ser distinta de la anterior." : "No se pudo cambiar: " + error.message; return; }
  msg.textContent = "Contraseña cambiada.";
  setTimeout(() => { history.replaceState(null, "", location.pathname); recovering = false; enterPanel(); }, 900);
});
async function forgot() {
  const email = $("#l-email").value.trim(), msg = $("#l-msg");
  if (!email) { msg.textContent = "Escribe tu correo arriba y vuelve a pulsar «¿Has olvidado la contraseña?»."; $("#l-email").focus(); return; }
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: new URL("tutor.html", location.href).toString() });
  msg.textContent = error ? "No se pudo enviar el correo: " + error.message : "Si la cuenta existe, te llegará un correo con un enlace para elegir una contraseña nueva.";
}

async function enterPanel() {
  const { data: p, error } = await client.rpc("tfg_mi_perfil");
  if (error || !p) { showScreen("login"); $("#l-msg").textContent = "No se encontró tu perfil de tutor. Vuelve a entrar en unos segundos."; return; }
  profile = p;
  if (p.estado !== "aprobado") {
    showScreen("pending");
    $("#pend-title").textContent = p.estado === "rechazado" ? "Cuenta no aprobada" : "Cuenta pendiente de aprobación";
    $("#pend-text").textContent = p.estado === "rechazado" ? "El administrador no ha aprobado esta cuenta. Si crees que es un error, escríbele." : "El administrador ha recibido tu solicitud. Te llegará un correo en cuanto la apruebe.";
    return;
  }
  showScreen(null);
  const err = await loadConvs();
  if (err) { $("#v-convocatorias").hidden = false; $("#v-convocatorias").innerHTML = `<div class="warnbox">No se pudieron cargar las convocatorias: ${esc(err.message)}</div>`; return; }
  const h = new URLSearchParams(location.hash.slice(1));
  const wantSlug = h.get("c"), wantTab = h.get("v");
  if (location.hash === "#admin" && profile.es_admin) { setConvocatoria(convs.find(c => c.id === ls2.get(LAST_CONV_KEY)) || null); showTab("admin", true); return; }
  const target = (wantSlug && convs.find(c => c.slug === wantSlug)) || convs.find(c => c.id === ls2.get(LAST_CONV_KEY)) || (convs.length === 1 ? convs[0] : null);
  if (target) selectConv(target.id, wantTab && VIEWS[wantTab] ? wantTab : "alumnos");
  else { setConvocatoria(null); showTab("convocatorias", true); }
}

async function boot() {
  if (!client) { showScreen("login"); $("#login-form").innerHTML = `<div class="warnbox"><strong>Falta configurar Supabase.</strong> Pon la dirección del proyecto y la clave «anon» en <code>config.js</code> y vuelve a publicar.</div>`; return; }
  client.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") showPwd(true); });
  const isRecovery = /type=recovery/.test(location.hash) || /type=recovery/.test(location.search);
  const { data } = await client.auth.getSession();
  if (isRecovery || recovering) { if (!recovering) showPwd(true); return; }
  if (data.session) enterPanel();
  else showScreen(location.hash === "#registro" ? "register" : "login");
}
window.addEventListener("beforeunload", e => { const v = VIEWS[currentTab]; if (v && v.canLeave && !v.canLeave(true)) { e.preventDefault(); e.returnValue = ""; } });
