/* AI Football Predictor - site account (Google sign-in). 8 nov 2026 (Jeremy): "la connexion au site doit servir à garder
   ses widgets, ses favoris, son club, les matchs suivis...". Session token in local storage (no cookie). */
(function () {
  if (window.AIFPAcct) return;
  var API = "https://afp-blog-production.up.railway.app/api/acct/";
  var CID = "377977599477-rt1evcbjtjovl4meur2skhrjmpc27lmb.apps.googleusercontent.com";
  var APP = "https://afp-app-production.up.railway.app";
  var FR = (document.documentElement.lang || "").slice(0, 2) === "fr" || location.pathname.indexOf("/fr/") === 0;
  var T = FR ? { in: "Se connecter", out: "Se déconnecter", title: "Ton compte AI Football Predictor", why: "Garde tes widgets, ton club et tes équipes favorites, les matchs et championnats que tu suis, sur tous tes appareils.", hi: "Connecté", err: "La connexion n'a pas marché. Réessaie.", del: "Supprimer mon compte", delq: "Supprimer ton compte et tout ce qui est sauvegardé ? C'est définitif.", priv: "Confidentialité", close: "Fermer", link: "Lier mon compte Telegram", tgok: "Compte Telegram lié : jeu, Premium et favoris communs" }
               : { in: "Sign in", out: "Sign out", title: "Your AI Football Predictor account", why: "Keep your widgets, your club and favourite teams, the matches and leagues you follow, on all your devices.", hi: "Signed in", err: "Sign-in did not work. Please try again.", del: "Delete my account", delq: "Delete your account and everything saved? This cannot be undone.", priv: "Privacy", close: "Close", link: "Link my Telegram account", tgok: "Telegram account linked: game, Premium and favourites shared" };
  function rd(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function wr(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var S = rd("aifp_acct"), D = rd("aifp_acct_data") || {}, frames = [];
  // 9 nov 2026 (Jeremy): a site account linked to an active Telegram Premium sees no Sorare banner (.aifp-sorb) on the site pages
  function premPaint() { var on = !!(S && S.prem && Date.parse(S.prem) > Date.now()), st = document.getElementById("aifp-prem"); if (on && !st) { st = document.createElement("style"); st.id = "aifp-prem"; st.textContent = ".aifp-sorb{display:none!important}"; document.head.appendChild(st); } else if (!on && st) st.remove(); }
  premPaint();
  function call(path, body) {
    return fetch(API + path, { method: body ? "POST" : "GET", headers: Object.assign({ "Content-Type": "application/json" }, S && S.token ? { "x-session": S.token } : {}), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { if (r.status === 401 && S) { S = null; wr("aifp_acct", null); paint(); } return r.json(); });
  }
  function tell(w) { // give the app (iframe) the session
    var msg = { afpAcct: S ? { token: S.token, user: S.user } : null };
    (w ? [w] : frames).forEach(function (x) { try { x.postMessage(msg, APP); } catch (e) {} });
  }
  addEventListener("message", function (e) {
    if (e.origin !== APP || !e.data || !e.data.afpAcct) return;
    var a = e.data.afpAcct;
    if (frames.indexOf(e.source) < 0) frames.push(e.source);
    if (a === "hello") tell(e.source);
    else if (a === "login") open();
    else if (a === "logout") logout();
  });
  function done(r) {
    if (!r || !r.ok) { msg(T.err); return; }
    S = { token: r.token, user: r.user }; D = r.data || {}; wr("aifp_acct", S); wr("aifp_acct_data", D);
    close(); paint(); tell(); fire(); refresh();
  }
  function fire() { try { dispatchEvent(new CustomEvent("aifp-acct", { detail: { user: S && S.user, data: D } })); } catch (e) {} }
  function logout() {
    if (S) call("logout", {}).catch(function () {});
    S = null; D = {}; wr("aifp_acct", null); wr("aifp_acct_data", null); premPaint();
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    close(); paint(); tell(); fire();
  }
  function del() {
    if (!S || !confirm(T.delq)) return;
    call("delete", {}).then(function () { logout(); }).catch(function () {});
  }
  function link() { // 8 nov 2026 (Jeremy): "fusionner son compte avec celui de Telegram": the Mini App confirms the code
    var w = null; try { w = window.open("about:blank", "_blank"); } catch (e) {}
    call("linkcode", {}).then(function (r) { if (r && r.ok) { if (w) w.location.href = r.url; else location.href = r.url; close(); } else if (w) w.close(); }).catch(function () { if (w) w.close(); });
  }
  var gsi = null;
  function loadGsi(cb) {
    if (window.google && google.accounts && google.accounts.id) return cb();
    if (!gsi) { gsi = document.createElement("script"); gsi.src = "https://accounts.google.com/gsi/client"; gsi.async = true; document.head.appendChild(gsi); }
    gsi.addEventListener("load", cb);
  }
  var css = ".aifp-acb{display:inline-flex;align-items:center;gap:7px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,.22);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;white-space:nowrap}.aifp-acb{flex-shrink:0}@media(max-width:760px){.aifp-acb .t{display:none}.aifp-acb{padding:6px 9px;gap:0}}.aifp-acb img{width:22px;height:22px;border-radius:50%;display:block}.aifp-acb:focus-visible{outline:2px solid #4aa3ff;outline-offset:2px}"
    + ".aifp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(3,6,10,.72);display:flex;align-items:center;justify-content:center;padding:20px}.aifp-md b,.aifp-md h2{color:#e8eef7}.aifp-md{max-height:90vh;overflow:auto;background:#0e1726;color:#e8eef7;border:1px solid #22324a;border-radius:16px;max-width:380px;width:100%;padding:22px 20px;font:15px/1.5 system-ui,-apple-system,sans-serif;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}"
    + ".aifp-md h2{font-size:18px;margin:0 0 8px}.aifp-md p{margin:0 0 16px;color:#9fb0c8;font-size:14px}.aifp-md .g{display:flex;justify-content:center;min-height:44px}.aifp-md .e{color:#ff8a8a;font-size:13px;margin-top:10px;min-height:18px}.aifp-md .l{display:flex;justify-content:space-between;margin-top:16px;font-size:13px}.aifp-md .l a,.aifp-md .l button{color:#8fb8ff !important;background:none;border:0;font:inherit;cursor:pointer;padding:0}.aifp-md .u{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:14px}.aifp-md .u img{width:42px;height:42px;border-radius:50%}.aifp-md .bt{display:block;width:100%;padding:12px;border-radius:12px;border:1px solid #2b3f5c !important;background:#15233a !important;color:#e8eef7 !important;font:inherit;font-weight:600;cursor:pointer;margin-top:8px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var ov = null;
  function msg(t) { var e = ov && ov.querySelector(".e"); if (e) e.textContent = t || ""; }
  function close() { if (ov) { ov.remove(); ov = null; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function open() {
    close(); refresh();
    ov = document.createElement("div"); ov.className = "aifp-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    var pv = FR ? "/fr/confidentialite/" : "/privacy/";
    ov.innerHTML = S
      ? '<div class="aifp-md"><div class="u">' + (S.user && S.user.picture ? '<img src="' + esc(S.user.picture) + '" alt="" referrerpolicy="no-referrer">' : "") + '<div style="text-align:left"><b>' + esc((S.user && S.user.name) || T.hi) + '</b><br><small style="color:#9fb0c8">' + esc((S.user && S.user.email) || "") + '</small></div></div><p>' + T.why + '</p>' + (S.tg ? '<p style="color:#2fd08a;margin:0 0 8px">✅ ' + T.tgok + '</p>' : '<button class="bt" data-a="link">🔗 ' + T.link + '</button>') + wlist() + '<button class="bt" data-a="out">' + T.out + '</button><div class="l"><button data-a="del">' + T.del + '</button><button data-a="x">' + T.close + "</button></div></div>"
      : '<div class="aifp-md"><h2>' + T.title + "</h2><p>" + T.why + '</p><div class="g" id="aifp-g"></div><div class="e"></div><div class="l"><a href="https://aifootpredictor.com' + pv + '">' + T.priv + '</a><button data-a="x">' + T.close + "</button></div></div>";
    ov.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (e.target === ov || a === "x") close(); else if (a === "out") logout(); else if (a === "del") del(); else if (a === "link") link(); else if (a === "wcopy" || a === "wdel") wact(a, Number(e.target.getAttribute("data-i")), e.target);
    });
    document.body.appendChild(ov);
    if (!S) loadGsi(function () {
      try {
        google.accounts.id.initialize({ client_id: CID, ux_mode: "popup", callback: function (r) { msg(""); call("google", { credential: r.credential, lang: FR ? "fr" : "en" }).then(done).catch(function () { msg(T.err); }); } });
        var g = document.getElementById("aifp-g"); if (g) google.accounts.id.renderButton(g, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", locale: FR ? "fr" : "en", width: 280 });
      } catch (e) { msg(T.err); }
    });
  }
  var btn = null;
  function paint() {
    if (!btn) return;
    btn.innerHTML = S ? ((S.user && S.user.picture ? '<img src="' + esc(S.user.picture) + '" alt="" referrerpolicy="no-referrer">' : "👤") + "<span class=\"t\">" + esc(((S.user && S.user.name) || T.hi).split(" ")[0]) + "</span>") : "👤<span class=\"t\">" + T.in + "</span>";
    btn.setAttribute("aria-label", S ? T.title : T.in);
  }
  function mount() {
    var nav = document.querySelector("header nav");
    if (!nav || btn) return;
    btn = document.createElement("button"); btn.type = "button"; btn.className = "aifp-acb"; btn.onclick = open;
    var last = nav.lastElementChild; nav.insertBefore(btn, last && /bt|btn/.test(last.className) ? last : null);
    paint();
  }
  // keep the saved data fresh (another device may have changed it)
  function refresh() { if (S) call("me").then(function (r) { if (r && r.ok) { D = r.data || {}; wr("aifp_acct_data", D); if (r.user) { S.user = { name: r.user.name, email: r.user.email, picture: r.user.picture }; S.tg = !!r.tg; S.prem = r.prem || null; wr("aifp_acct", S); paint(); premPaint(); } fire(); } }).catch(function () {}); }
  window.AIFPAcct = {
    user: function () { return S && S.user; }, token: function () { return S && S.token; }, open: open, logout: logout,
    get: function (k) { return D[k]; },
    set: function (k, v) { D[k] = v; wr("aifp_acct_data", D); if (S) { var it = {}; it[k] = v; return call("data", { items: it }); } return Promise.resolve({ ok: false, local: true }); }
  };
  // 8 nov 2026 (Jeremy, "garder ses widgets déjà créés"): save the widget being configured, list them in the account window
  var WT = FR ? { save: "💾 Garder ce widget", saved: "Gardé dans ton compte ✓", mine: "Mes widgets", none: "Aucun widget gardé pour l'instant : configure un widget puis touche « Garder ce widget ».", copy: "Copier", copied: "Copié ✓", rm: "Retirer" }
              : { save: "💾 Keep this widget", saved: "Kept in your account ✓", mine: "My widgets", none: "No widget kept yet: set up a widget, then tap « Keep this widget ».", copy: "Copy", copied: "Copied ✓", rm: "Remove" };
  var WN = { match: "Match", team: FR ? "Équipe" : "Team", table: FR ? "Classement" : "Table", live: "Live", articles: FR ? "Articles" : "Articles", badge: "Badge" };
  function wl() { var a = D.afp_widgets; return Array.isArray(a) ? a : []; }
  function wlabel(w) { return (WN[w.t] || w.t) + (w.team ? " · " + w.team : "") + (w.t === "table" && w.lg && w.lg.length ? " · " + w.lg.join(", ") : "") + (w.mlabel ? " · " + w.mlabel : "") + " · " + String(w.lang || "").toUpperCase() + " · " + (w.theme === "light" ? (FR ? "clair" : "light") : (FR ? "sombre" : "dark")); }
  function wlist() {
    var a = wl(), bs = "background:none;border:1px solid #2b3f5c;color:#8fb8ff;border-radius:8px;padding:4px 8px;font:inherit;font-size:12px;cursor:pointer";
    return '<div style="text-align:left;margin:4px 0 12px"><b style="font-size:14px">' + WT.mine + "</b>" + (a.length ? a.map(function (w, i) { return '<div style="display:flex;align-items:center;gap:6px;border:1px solid #22324a;border-radius:10px;padding:8px 10px;margin-top:6px;font-size:13px"><span style="flex:1">' + esc(wlabel(w)) + '</span><button data-a="wcopy" data-i="' + i + '" style="' + bs + '">' + WT.copy + '</button><button data-a="wdel" data-i="' + i + '" style="' + bs + '">' + WT.rm + "</button></div>"; }).join("") : '<p style="font-size:13px;margin:6px 0 0">' + WT.none + "</p>") + "</div>";
  }
  function wsave(w) { var a = wl().filter(function (x) { return x.code !== w.code; }); a.unshift(w); window.AIFPAcct.set("afp_widgets", a.slice(0, 30)); }
  function wact(a, i, el) {
    var l = wl(); if (!l[i]) return;
    if (a === "wcopy") { try { navigator.clipboard.writeText(l[i].code).then(function () { el.textContent = WT.copied; }); } catch (e) {} }
    else { l.splice(i, 1); window.AIFPAcct.set("afp_widgets", l); open(); }
  }
  function wmount() {
    var cp = document.getElementById("cpy"); if (!cp || !window.AFPCFG || document.getElementById("aifp-wsave")) return;
    var b = document.createElement("button"); b.id = "aifp-wsave"; b.type = "button"; b.className = cp.className; b.style.marginLeft = "8px"; b.textContent = WT.save;
    cp.parentNode.insertBefore(b, cp.nextSibling);
    b.onclick = function () {
      if (!S) { open(); return; }
      var C = window.AFPCFG, el = document.getElementById("afpcode"), cm = document.getElementById("cm");
      wsave({ t: C.t, m: C.m || "", team: C.team || "", lg: (C.lg || []).slice(), lang: C.lang, theme: C.theme, mlabel: C.t === "match" && cm && cm.selectedIndex >= 0 ? cm.options[cm.selectedIndex].text : "", code: el ? el.textContent : "", page: location.pathname, at: new Date().toISOString() });
      b.textContent = WT.saved; setTimeout(function () { b.textContent = WT.save; }, 2500);
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); wmount(); refresh(); }); else { mount(); wmount(); refresh(); }
})();
