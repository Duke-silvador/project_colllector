"use strict";
const FACTIONS = {
  winter: "Winter", ironclad: "Ironclad", shadowfen: "Shadowfen", swarm: "Swarm",
};
const DECK_SIZE = 12;
const KEY = "sb-decks-v1";

let CARDS = [], BYID = {};
let state = { decks: [], fragments: [], games: [], current: "" };  // fragments: incomplete lists of cards seen in a game, kept as statistics (not decks); games: results of games that have no fragment; current: id of the deck I play now; a deck with mine:true is one I play (not one I met)
let ui = { search: "", kind: "all", tab: "cards" };

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- storage ---------- */
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.decks)) state = s; } catch (e) {}
  if (!Array.isArray(state.fragments)) state.fragments = [];
  if (!Array.isArray(state.games)) state.games = [];
  if (typeof state.current !== "string") state.current = "";
}
/** The deck I play now (one of my decks), or undefined. */
const currentDeck = () => state.decks.find(d => d.mine && d.saved !== false && d.id === state.current);
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Could not save (storage full or blocked)"); }
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 1800);
}

/* ---------- routing ---------- */
function route() {
  if (location.hash === "#/tools") return renderTools();
  if (location.hash === "#/types") return renderTypes();
  const m = location.hash.match(/^#\/deck\/([^/]+)(\/edit)?$/);
  const d = m && state.decks.find(x => x.id === m[1]);
  if (d) { if (m[2] || d.saved === false) renderEditor(d.id); else renderView(d.id); } else renderList();
}
window.addEventListener("hashchange", () => { closeModal(); route(); });

/* ---------- modal ---------- */
function openModal(html) { const o = $("#overlay"); o.innerHTML = html; o.hidden = false; return o; }
function closeModal() { const o = $("#overlay"); o.hidden = true; o.innerHTML = ""; }
$("#overlay").addEventListener("pointerdown", e => { if (e.target.id === "overlay") closeModal(); });

/* ---------- deck list ---------- */
function groupDecks() {
  const t = {};
  for (const d of state.decks) {
    if (d.mine) continue;  // my own decks have their own section
    const a = (t[d.faction] ??= {}), b = (a[d.archetype || "—"] ??= {}), c = (b[d.type || "—"] ??= []);
    c.push(d);
  }
  return t;
}
const openKeys = new Set(JSON.parse(sessionStorage.getItem("sb-open") || "[]"));
function renderList() {
  const g = groupDecks();
  let h = `<div class="bar"><h1>Stormbound Decks</h1><button id="tools">⚔ Battle tools</button></div><div class="scroll">`;
  const mine = state.decks.filter(d => d.mine).sort((x, y) => y.updated - x.updated), cur = currentDeck();
  h += `<div class="mydecks"><h3>My decks <span class="dim">the decks I play; the one marked ● is used for Won / Lost</span></h3>` +
    (mine.map(d => `<div class="deckrow mine f-${d.faction}" data-id="${d.id}"><button class="use ${cur && cur.id === d.id ? "on" : ""}" data-use="${d.id}" aria-label="Play with this deck">${cur && cur.id === d.id ? "●" : "○"}</button>
      <span class="nm">${d.saved === false ? "Unsaved draft" : esc(d.name || "Untitled")}<small>${FACTIONS[d.faction]}${d.archetype ? " · " + esc(d.archetype) : ""}</small></span>
      <span class="meta ${d.cards.length === DECK_SIZE ? "full" : ""}">${d.cards.length}/${DECK_SIZE}</span></div>`).join("") || `<div class="hint left">No deck of mine yet.</div>`) +
    `<button id="newmine">+ My deck</button></div>`;
  if (!state.decks.some(d => !d.mine)) h += `<div class="empty">No decks yet.<br>Tap <b>+ New deck</b> to start.</div>`;
  for (const f of Object.keys(FACTIONS)) {
    if (!g[f]) continue;
    const n = Object.values(g[f]).flatMap(a => Object.values(a)).flat().length;
    h += `<details data-k="${f}" class="f-${f}" ${openKeys.has(f) ? "open" : ""}><summary><span class="dot"></span>${FACTIONS[f]}<span class="cnt">${n}</span></summary>`;
    for (const a of Object.keys(g[f]).sort()) {
      const ka = `${f}/${a}`, na = Object.values(g[f][a]).flat().length;
      h += `<details data-k="${esc(ka)}" ${openKeys.has(ka) ? "open" : ""}><summary>${esc(a)}<span class="cnt">${na}</span></summary>`;
      for (const t of Object.keys(g[f][a]).sort()) {
        const kt = `${ka}/${t}`;
        h += `<details data-k="${esc(kt)}" ${openKeys.has(kt) ? "open" : ""}><summary>${esc(t)}<span class="cnt">${g[f][a][t].length}</span></summary>`;
        for (const d of g[f][a][t].sort((x, y) => y.updated - x.updated)) {
          h += `<div class="deckrow" data-id="${d.id}"><span class="nm">${d.saved === false ? "Unsaved draft" : esc(d.name || "Untitled")}</span>
            <span class="meta ${d.cards.length === DECK_SIZE ? "full" : ""}">${d.cards.length}/${DECK_SIZE}</span></div>`;
        }
        h += `</details>`;
      }
      h += `</details>`;
    }
    h += `</details>`;
  }
  const nSaved = state.decks.filter(d => d.saved !== false).length, nFrag = state.fragments.length;
  h += `<div class="footer-tools"><button id="expc">Export for PC (${nSaved} deck${nSaved === 1 ? "" : "s"}, ${nFrag} fragment${nFrag === 1 ? "" : "s"})</button><button id="gh">Push to GitHub</button><button id="frags">Fragments (${nFrag})</button><button id="types">Deck types met</button><button id="exp">Export backup</button><button id="imp">Import deck / backup</button></div></div>
    <button class="primary fab" id="new">+ New deck</button>`;
  $("#app").innerHTML = h;
  $("#new").onclick = () => pickFaction(false);
  $("#newmine").onclick = () => pickFaction(true);
  $("#types").onclick = () => { location.hash = "#/types"; };
  $("#tools").onclick = () => { location.hash = "#/tools"; };
  $("#exp").onclick = exportBackup;
  $("#expc").onclick = () => exportForPc(state.decks.filter(d => d.saved !== false), state.fragments);
  $("#gh").onclick = githubDialog;
  $("#frags").onclick = fragmentsDialog;
  $("#imp").onclick = importBackup;
  $("#app").querySelectorAll("details").forEach(el => el.addEventListener("toggle", () => {
    el.open ? openKeys.add(el.dataset.k) : openKeys.delete(el.dataset.k);
    sessionStorage.setItem("sb-open", JSON.stringify([...openKeys]));
  }));
  $("#app").onclick = e => {
    const u = e.target.closest("[data-use]");
    if (u) { state.current = state.current === u.dataset.use ? "" : u.dataset.use; save(); return renderList(); }
    const r = e.target.closest(".deckrow"); if (r) location.hash = "#/deck/" + r.dataset.id;
  };  // a saved deck opens its view, a draft the editor (see route)
}

/* ---------- export for the PC: deck files in the convention of the Stormbound project's data/decks ---------- */
const FOLDER = { winter: "winter_pact", swarm: "swarm", ironclad: "ironclad", shadowfen: "shadowfen" };
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
function deckToFile(d) {
  const cards = d.cards.map(i => BYID[i].name);
  return { name: slug(d.name) || "deck", nickname: d.name, faction: FOLDER[d.faction], archetype: slug(d.archetype || ""), type: d.type || "",
    ...(d.mine ? { mine: true } : {}), v1: cards, card_pool: cards.slice(), source: { site: "ipad deck app", title: d.name, date: new Date().toISOString().slice(0, 10) } };
}
/** A fragment as the PC imports it (scripts/import_ipad_decks.py): card names, the faction folder name, the id of the game. */
function fragToFile(f) {
  return { id: f.id, game: f.game, cards: f.cards.filter(i => BYID[i]).map(i => BYID[i].name), faction: FOLDER[f.faction],
    turns_seen: f.turns || null, date: f.date, source: "ipad",
    ...(f.result ? { result: f.result } : {}), ...(f.my_deck ? { my_deck: f.my_deck, my_cards: (f.my_cards || []).filter(i => BYID[i]).map(i => BYID[i].name) } : {}) };
}
async function exportForPc(decks, frags = []) {
  if (!decks.length && !frags.length) return toast("No saved decks or fragments to export");
  const one = decks.length === 1 && !frags.length;  // one deck alone is a plain deck file
  const data = one ? deckToFile(decks[0]) : { format: "stormbound-ipad-decks", decks: decks.map(deckToFile), fragments: frags.map(fragToFile) };
  const fname = one ? data.name + ".json" : "ipad-decks-" + new Date().toISOString().slice(0, 10) + ".json";
  const file = new File([JSON.stringify(data, null, 2)], fname, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fname }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  toast(`Saved ${fname}`);
}

/* ---------- push to GitHub: only what is new (decks as files, fragments merged by game id) ---------- */
const GH_KEY = "sb-gh";
const ghCfg = () => { try { return JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch { return {}; } };
const b64 = s => { let b = ""; for (const x of new TextEncoder().encode(s)) b += String.fromCharCode(x); return btoa(b); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
async function ghApi(cfg, method, path, body) {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method, headers: { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (r.status === 404 && method === "GET") return null;
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${((await r.json().catch(() => ({}))).message) || r.statusText}`);
  return r.json();
}
/** Read a JSON file of the repo -> {data, sha} (null if missing). */
async function ghRead(cfg, path) { const j = await ghApi(cfg, "GET", path); return j && { data: JSON.parse(unb64(j.content)), sha: j.sha }; }
const ghWrite = (cfg, path, data, sha, msg) => ghApi(cfg, "PUT", path, { message: msg, content: b64(JSON.stringify(data, null, 2) + "\n"), sha: sha || undefined });
const listKey = a => a.map(norm).sort().join("|");

async function pushToGithub(cfg, log) {
  const decks = state.decks.filter(d => d.saved !== false), r = { newDeck: 0, newVer: 0, same: 0, newFrag: 0, upFrag: 0, sameFrag: 0 };
  for (const d of decks) {
    const f = deckToFile(d), path = `decks/${f.faction}/${f.archetype || "unsorted"}/${f.name}.json`;
    log(`Deck ${d.name}…`);
    const old = await ghRead(cfg, path);
    if (!old) { await ghWrite(cfg, path, f, null, `Add deck ${d.name}`); r.newDeck++; continue; }
    const vs = Object.keys(old.data).filter(k => /^v\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1));
    if (vs.some(k => listKey(old.data[k]) === listKey(f.v1))) { r.same++; continue; }  // this list is already a version
    const next = "v" + (+vs[vs.length - 1].slice(1) + 1);
    old.data[next] = f.v1; old.data.card_pool = [...new Set([...(old.data.card_pool || []), ...f.v1])];
    await ghWrite(cfg, path, old.data, old.sha, `Add ${next} of deck ${d.name}`); r.newVer++;
  }
  if (state.fragments.length) {
    log("Fragments…");
    const old = await ghRead(cfg, "fragments.json"), rows = old ? old.data.fragments || [] : [], key = x => x.game || x.id;
    const by = new Map(rows.map(x => [key(x), x]));
    for (const fr of state.fragments.map(fragToFile)) {
      const had = by.get(key(fr));
      if (!had) { by.set(key(fr), fr); r.newFrag++; }
      else if (listKey(had.cards) === listKey(fr.cards) && (had.result || "") === (fr.result || "") && (had.my_deck || "") === (fr.my_deck || "")) r.sameFrag++;
      else { by.set(key(fr), fr); r.upFrag++; }  // the same game, seen further
    }
    if (r.newFrag || r.upFrag) await ghWrite(cfg, "fragments.json", { format: "stormbound-ipad-decks", fragments: [...by.values()] }, old && old.sha, `Fragments: +${r.newFrag} new, ${r.upFrag} updated`);
  }
  return r;
}
function githubDialog() {
  const c = ghCfg();
  const o = openModal(`<div class="modal"><h2>Push to GitHub</h2>
    <p class="hint left">Adds only what is new: a deck with the same name and list is skipped, with another list it becomes its next version (v2, v3…); a fragment is matched by its game, so the same game is skipped or updated.</p>
    <div class="field"><label>Repository (owner/name)</label><input id="ghr" value="${esc(c.repo || "TheDecade/stormbound-data")}" autocapitalize="off" autocorrect="off"></div>
    <div class="field"><label>Token (fine-grained, this repo only, Contents: read and write)</label><input id="ght" type="password" value="${esc(c.token || "")}" autocapitalize="off" autocorrect="off"></div>
    <div class="hint left" id="ghs"></div>
    <div class="row"><button id="cancel">Close</button><button class="primary" id="go">Push now</button></div></div>`);
  $("#cancel").onclick = () => { o.hidden = true; };
  $("#go").onclick = async () => {
    const cfg = { repo: $("#ghr").value.trim(), token: $("#ght").value.trim() };
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo) || !cfg.token) return ($("#ghs").textContent = "Enter the repository and the token.");
    try { localStorage.setItem(GH_KEY, JSON.stringify(cfg)); } catch {}
    $("#go").disabled = true;
    try {
      const r = await pushToGithub(cfg, m => { $("#ghs").textContent = m; });
      $("#ghs").innerHTML = `Done. Decks: ${r.newDeck} new, ${r.newVer} new version${r.newVer === 1 ? "" : "s"}, ${r.same} already there. Fragments: ${r.newFrag} new, ${r.upFrag} updated, ${r.sameFrag} already there.`;
    } catch (e) { $("#ghs").textContent = "Failed: " + e.message; }
    $("#go").disabled = false;
  };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "stormbound-decks-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
}
const FACTION_KEYS = { winter: "winter", winter_pact: "winter", swarm: "swarm", ironclad: "ironclad", shadowfen: "shadowfen" };
const sameCI = (list, v) => list.find(x => norm(x) === norm(v)) || v;
/** A deck file of the Stormbound project (name, v1, v2..., card_pool; made by the web calculator) -> a deck of this app. */
function deckFromFile(s) {
  const vs = Object.keys(s).filter(k => /^v\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1));
  const names = vs.length ? s[vs[vs.length - 1]] : s.cards;
  if (!Array.isArray(names)) return null;
  const byName = Object.fromEntries(CARDS.map(c => [norm(c.name), c.id]));
  const ids = [...new Set(names.map(n => byName[norm(n)]).filter(Boolean))].slice(0, DECK_SIZE);
  if (!ids.length) return null;
  let faction = FACTION_KEYS[norm(String(s.faction || "")).replace(/ /g, "_")];
  if (!faction) {
    const cnt = {}; ids.forEach(i => { const f = BYID[i].faction; if (f !== "neutral") cnt[f] = (cnt[f] || 0) + 1; });
    faction = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  }
  if (!faction) return null;
  const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : "";
  const name = s.nickname || cap(String(s.name || "Imported deck").replace(/_/g, " "));
  return { id: uid(), name, faction, archetype: sameCI(uniq(state.decks.map(d => d.archetype)), cap(String(s.archetype || "").replace(/_/g, " "))),
    type: sameCI(uniq(state.decks.map(d => d.type)), String(s.type || "")), cards: ids, saved: true, updated: Date.now() };
}
function importBackup() {
  const i = document.createElement("input"); i.type = "file"; i.accept = "application/json,.json"; i.multiple = true;
  i.onchange = async () => {
    let n = 0, nf = 0, skipped = 0, bad = 0;
    for (const f of i.files) {
      try {
        const s = JSON.parse(await f.text());
        if (Array.isArray(s.decks)) {  // a backup of this app
          const have = new Set(state.decks.map(d => d.id));
          for (const d of s.decks) if (!have.has(d.id)) { state.decks.push(d); n++; }
          const haveF = new Set(state.fragments.map(x => x.id)), byName = Object.fromEntries(CARDS.map(c => [norm(c.name), c.id]));
          for (const fr of Array.isArray(s.fragments) ? s.fragments : []) {  // ids (a backup) or card names (an export for the PC)
            const cards = (fr.cards || []).map(x => BYID[x] ? x : byName[norm(x)]).filter(Boolean), fac = FACTION_KEYS[norm(String(fr.faction || "")).replace(/ /g, "_")];
            if (!fr.id || haveF.has(fr.id) || !cards.length || !fac) continue;
            const mineCards = (fr.my_cards || []).map(x => BYID[x] ? x : byName[norm(x)]).filter(Boolean);
            state.fragments.push({ id: fr.id, game: fr.game || "", cards, faction: fac, turns: fr.turns || fr.turns_seen || null, date: fr.date || new Date().toISOString().slice(0, 10), updated: fr.updated || Date.now(),
              ...(fr.result === "win" || fr.result === "loss" ? { result: fr.result } : {}), ...(fr.my_deck ? { my_deck: fr.my_deck, my_cards: mineCards } : {}) });
            nf++;
          }
          const haveG = new Set(state.games.map(x => x.game));
          for (const g of Array.isArray(s.games) ? s.games : []) if (g.game && !haveG.has(g.game)) state.games.push(g);
        } else {  // a deck file
          const d = deckFromFile(s); if (!d) throw 0;
          const key = x => x.faction + "|" + norm(x.name) + "|" + [...x.cards].sort().join();
          if (state.decks.some(x => key(x) === key(d))) { skipped++; continue; }
          state.decks.push(d); n++;
        }
      } catch (e) { bad++; }
    }
    save(); renderList();
    toast(`Imported ${n} deck${n === 1 ? "" : "s"}` + (nf ? `, ${nf} fragment${nf === 1 ? "" : "s"}` : "") + (skipped ? `, ${skipped} already there` : "") + (bad ? `, ${bad} not valid` : ""));
  };
  i.click();
}

/* ---------- fragments: the list, with a way to delete a wrong one ---------- */
function fragmentsDialog() {
  const draw = () => {
    const rows = state.fragments.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const o = openModal(`<div class="modal"><h2>Fragments (${rows.length})</h2>
      <p class="hint left">Incomplete lists of the cards an opponent played, kept as statistics only. They go to the PC with <b>Export for PC</b>.</p>
      ${rows.map(f => `<div class="frrow f-${f.faction}"><div><b>${FACTIONS[f.faction] || ""}</b> · ${f.cards.length} card${f.cards.length === 1 ? "" : "s"} · ${esc(f.date || "")}${f.result ? ` · <b>${f.result === "win" ? "Won" : "Lost"}</b>` : ""}${f.my_deck ? ` with ${esc(f.my_deck)}` : ""}
        <div class="dim">${esc(f.cards.filter(i => BYID[i]).map(i => BYID[i].name).join(", "))}</div></div>
        <button class="danger" data-del="${f.id}" aria-label="delete">✕</button></div>`).join("") || `<div class="hint">No fragment yet. In Battle tools, add the cards an opponent played, then <b>Create deck from played cards</b> → <b>Create fragment</b>.</div>`}
      <div class="actions"><button id="stats">Statistics</button><button id="cancel">Close</button></div></div>`);
    $("#cancel").onclick = () => { closeModal(); if (!location.hash || location.hash === "#/") renderList(); };
    $("#stats").onclick = statsDialog;
    o.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      if (!confirm("Delete this fragment?")) return;
      state.fragments = state.fragments.filter(f => f.id !== b.dataset.del); save(); draw();
    });
  };
  draw();
}

/* ---------- fragment statistics: which cards are used most, and what goes with what (fragments.js) ---------- */
function statsDialog() {
  const byName = Object.fromEntries(CARDS.map(c => [c.name, c]));
  const rows = state.fragments.map(f => ({ cards: f.cards.filter(i => BYID[i]).map(i => BYID[i].name), faction: f.faction, id: f.id, kind: "fragment" }));
  const corpus = new FR.Corpus(rows), st = { faction: "", card: "" }, pc = x => Math.round(100 * x) + "%";
  const o = openModal(`<div class="modal"><h2>Fragment statistics</h2>
    <p class="hint left">${rows.length} fragment${rows.length === 1 ? "" : "s"}. A card only shows once it is played, so cheap cards are seen more than expensive ones.</p>
    <div class="factions" id="sf" style="grid-template-columns:repeat(5,1fr)"><button type="button" class="sel" data-sf="">All</button>${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k}" data-sf="${k}">${n}</button>`).join("")}</div>
    <input class="tq" id="sq" type="search" placeholder="Pick a card: what does it go with?" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div id="ssg"></div>
    <div id="sres"></div>
    <div class="actions"><button id="cancel">Back</button></div></div>`);
  const chips = (title, items, label, tip) => `<h3>${title}</h3><div class="mini">${items.map(x =>
    `<span data-pick="${esc(x.card)}" title="${esc(tip(x))}">${esc(x.card)}<b>${label(x)}</b></span>`).join("") || `<span class="dim">nothing yet</span>`}</div>`;
  const drawRes = () => {
    let h = "";
    if (st.card && byName[st.card]) {
      const c = byName[st.card], sc = corpus.scope(st.faction || (c.faction !== "neutral" ? c.faction : null)), info = FR.cardInfo(sc, st.card);
      h += `<p><b>${esc(st.card)}</b>: in ${info.n} of ${info.of} fragment${info.of === 1 ? "" : "s"} (${pc(info.share)})</p>` +
        chips("Most often together", sc.goesWith(st.card, "n", 10), x => x.n, x => `together in ${x.n} fragments; when ${st.card} is there, ${pc(x.p_given)} also hold ${x.card}`) +
        chips("Attracted to it (seen together at least twice)", sc.goesWith(st.card, "lift", 10, 2), x => "×" + x.lift.toFixed(1), x => `${x.n} fragments together; ${x.lift.toFixed(1)} times more often than chance`);
    }
    h += chips(`Most used cards${st.faction ? " – " + FACTIONS[st.faction] : ""}`, corpus.scope(st.faction || null).topCards(20), x => x.n, x => `in ${pc(x.share)} of the fragments`);
    if (!rows.length) h = `<div class="hint">No fragment yet.</div>`;
    $("#sres").innerHTML = h;
  };
  o.querySelectorAll("[data-sf]").forEach(b => b.onclick = () => { st.faction = b.dataset.sf; o.querySelectorAll("[data-sf]").forEach(x => x.classList.toggle("sel", x === b)); drawRes(); });
  $("#sres").onclick = e => { const s = e.target.closest("[data-pick]"); if (s) { st.card = s.dataset.pick; $("#sq").value = st.card; $("#ssg").innerHTML = ""; drawRes(); } };
  $("#sq").addEventListener("input", () => {
    const toks = norm($("#sq").value).split(/\s+/).filter(Boolean);
    $("#ssg").innerHTML = !toks.length ? "" : CARDS.filter(c => toks.every(k => norm(c.name).includes(k))).slice(0, 6)
      .map(c => `<div class="sg" data-pick="${esc(c.name)}"><span class="nm">${esc(c.name)}</span><small>${esc(FACTIONS[c.faction] || "Neutral")}</small></div>`).join("") || `<div class="hint">No match</div>`;
  });
  $("#ssg").onclick = $("#sres").onclick;
  $("#cancel").onclick = fragmentsDialog;
  drawRes();
}

/* ---------- combo box (dropdown of existing + create new) ---------- */
function combo(host, { value, options, placeholder, onChange }) {
  host.classList.add("combo");
  host.innerHTML = `<input autocomplete="off" autocapitalize="words" placeholder="${esc(placeholder)}"><button type="button" class="caret">▾</button><div class="dd" hidden></div>`;
  const input = $("input", host), dd = $(".dd", host);
  input.value = value || "";
  const show = () => {
    const q = norm(input.value.trim()), opts = options();
    const list = opts.filter(o => !q || norm(o).includes(q));
    let h = list.map(o => `<div data-v="${esc(o)}">${esc(o)}</div>`).join("");
    if (q && !opts.some(o => norm(o) === q)) h += `<div class="new" data-v="${esc(input.value.trim())}">＋ Create “${esc(input.value.trim())}”</div>`;
    if (!h) h = `<div class="none">Type a name to create it</div>`;
    dd.innerHTML = h; dd.hidden = false;
  };
  input.addEventListener("focus", show);
  input.addEventListener("input", () => { show(); onChange(input.value.trim()); });
  input.addEventListener("blur", () => setTimeout(() => dd.hidden = true, 120));
  dd.addEventListener("pointerdown", e => {
    const it = e.target.closest("[data-v]"); if (!it) return;
    e.preventDefault(); input.value = it.dataset.v; dd.hidden = true; onChange(input.value); input.blur();
  });
  $(".caret", host).addEventListener("pointerdown", e => {
    e.preventDefault(); if (dd.hidden) { input.focus(); show(); } else { dd.hidden = true; input.blur(); }
  });
  return input;
}
const uniq = a => [...new Set(a.filter(x => x && x !== "—"))].sort((x, y) => x.localeCompare(y));

/* ---------- new deck: faction only ---------- */
function pickFaction(mine = false) {
  const o = openModal(`<div class="modal"><h2>${mine ? "New deck of mine" : "New deck"} – choose faction</h2><div class="factions">
    ${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k}" data-f="${k}">${n}</button>`).join("")}</div>
    <div class="actions"><button id="cancel">Cancel</button></div></div>`);
  $("#cancel").onclick = closeModal;
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    const d = { id: uid(), name: "", faction: b.dataset.f, archetype: "", type: "", cards: [], saved: false, updated: Date.now(), ...(mine ? { mine: true } : {}) };
    state.decks.push(d); save(); closeModal(); location.hash = "#/deck/" + d.id;
  });
}

/* ---------- save / edit deck details dialog ---------- */
function deckDialog(deck) {
  const isNew = false, draft = deck.saved === false;
  const v = { ...deck };
  const o = openModal(`<div class="modal"><h2>${draft ? "Save deck" : "Deck details"}</h2>
    <div class="field"><label>Faction</label><div class="factions">
      ${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k} ${v.faction === k ? "sel" : ""}" data-f="${k}">${n}</button>`).join("")}
    </div></div>
    <div class="field"><label>Nickname</label><input id="dn" autocomplete="off" placeholder="e.g. Goat spam" value="${esc(v.name)}"></div>
    <div class="field"><label>Archetype</label><div id="ca"></div></div>
    <div class="field"><label>Type</label><div id="ct"></div></div>
    <label class="hint left chk"><input type="checkbox" id="dmine"> A deck I play (listed under My decks, used for Won / Lost)</label>
    <div class="actions"><button class="danger" id="del" style="margin-right:auto">Delete</button>
      ${draft ? "" : `<button id="expone">Export for PC</button>`}
      <button id="cancel">Cancel</button><button class="primary" id="ok">Save</button></div></div>`);
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    v.faction = b.dataset.f;
    o.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("sel", x === b));
  });
  const others = (key, pred) => state.decks.filter(d => d !== deck && pred(d)).map(d => d[key]);
  combo($("#ca"), { value: v.archetype, placeholder: "Pick or create archetype…", onChange: x => v.archetype = x,
    options: () => { const same = uniq(others("archetype", d => d.faction === v.faction)); return same.concat(uniq(others("archetype", () => true)).filter(a => !same.includes(a))); } });
  combo($("#ct"), { value: v.type, placeholder: "Pick or create type…", onChange: x => v.type = x,
    options: () => { const same = uniq(others("type", d => d.faction === v.faction && (d.archetype || "") === (v.archetype || ""))); return same.concat(uniq(others("type", () => true)).filter(a => !same.includes(a))); } });
  $("#dmine").checked = !!deck.mine;
  $("#cancel").onclick = closeModal;
  if (!draft) $("#expone").onclick = () => exportForPc([deck]);
  $("#del").onclick = () => {
    if (confirm(`Delete “${deck.name || "Untitled"}”?`)) { state.decks = state.decks.filter(d => d !== deck); if (state.current === deck.id) state.current = ""; save(); closeModal(); location.hash = "#/"; renderList(); }
  };
  $("#ok").onclick = () => {
    v.name = $("#dn").value.trim();
    if (!v.faction) return toast("Pick a faction");
    if (!v.name) { $("#dn").focus(); return toast("Give the deck a nickname"); }
    if (isNew) {
      const d = { id: uid(), name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim(), cards: [], updated: Date.now() };
      state.decks.push(d); save(); closeModal(); location.hash = "#/deck/" + d.id;
    } else {
      deck.cards = deck.cards.filter(c => BYID[c].faction === "neutral" || BYID[c].faction === v.faction);
      Object.assign(deck, { name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim() });
      if ($("#dmine").checked) deck.mine = true; else { delete deck.mine; if (state.current === deck.id) state.current = ""; }
      deck.saved = true; deck.updated = Date.now(); save(); closeModal(); if (draft) { toast("Deck saved"); location.hash = "#/deck/" + deck.id; } else route();
    }
  };
  if (draft) setTimeout(() => $("#dn").focus(), 50);
}

/* ---------- editor ---------- */
const KINDS = [["all", "All"], ["unit", "Units"], ["spell", "Spells"], ["structure", "Structures"]];
const thumb = c => `img/t/${c.id}.webp`, full = c => `img/f/${c.id}.webp`;

function candidates(deck) {
  const toks = norm(ui.search).split(/\s+/).filter(Boolean);
  const list = CARDS.filter(c => (c.faction === "neutral" || c.faction === deck.faction) &&
    (ui.kind === "all" || c.type === ui.kind) &&
    toks.every(t => c._s.includes(t)));
  const q = norm(ui.search).trim();
  const rank = c => { const n = norm(c.name); return !q ? 0 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 3; };
  return list.sort((a, b) => rank(a) - rank(b) || a.mana - b.mana || a.name.localeCompare(b.name));
}

function renderEditor(id) {
  const deck = state.decks.find(d => d.id === id);
  const sub = [deck.archetype, deck.type].filter(Boolean).join(" · ");
  $("#app").innerHTML = `
    <div class="bar f-${deck.faction}">
      <button class="ghost" id="back">‹ ${deck.saved === false ? "Decks" : "Deck"}</button>
      <h1 id="title"><span class="dot"></span>${deck.saved === false ? "New deck" : esc(deck.name)} <span class="sub">${FACTIONS[deck.faction]}${sub ? " · " + esc(sub) : ""} ✎</span></h1>
      <button class="primary" id="savebtn">${deck.saved === false ? "Save" : "Details"}</button>
      <div class="tabs"><button id="tcards">Cards</button><button id="tdeck">Deck <span id="cnt1"></span></button></div>
    </div>
    <div class="editor ${ui.tab === "deck" ? "showdeck" : ""}">
      <div class="picker">
        <div class="searchrow"><input id="q" type="search" enterkeyhint="search" placeholder="Search name, ability, tribe…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(ui.search)}"></div>
        <div class="chips">${KINDS.map(([k, n]) => `<button class="chip ${ui.kind === k ? "on" : ""}" data-k="${k}">${n}</button>`).join("")}</div>
        <div class="grid" id="grid"></div>
      </div>
      <div class="side"><h3><span>Deck <span id="cnt2"></span></span><span id="avg" style="color:var(--muted);font-weight:400"></span></h3>
        <div class="curve" id="curve"></div><div class="dlist" id="dlist"></div></div>
    </div>`;
  const q = $("#q");
  $("#back").onclick = () => {
    if (deck.saved === false && !deck.cards.length) { state.decks = state.decks.filter(d => d !== deck); save(); }
    location.hash = deck.saved === false ? "#/" : "#/deck/" + deck.id;
  };
  $("#savebtn").onclick = () => deckDialog(deck);
  $("#title").onclick = () => deckDialog(deck);
  q.addEventListener("input", () => { ui.search = q.value; drawGrid(deck); });
  $(".chips").onclick = e => { const b = e.target.closest("[data-k]"); if (!b) return; ui.kind = b.dataset.k; $(".chips").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b)); drawGrid(deck); };
  $("#tcards").onclick = () => setTab("cards");
  $("#tdeck").onclick = () => setTab("deck");
  wireGrid(deck, q);
  wireDeckList(deck);
  drawGrid(deck); drawDeck(deck); setTabs();
}
function setTab(t) { ui.tab = t; $(".editor").classList.toggle("showdeck", t === "deck"); setTabs(); }
function setTabs() { $("#tcards")?.classList.toggle("on", ui.tab === "cards"); $("#tdeck")?.classList.toggle("on", ui.tab === "deck"); }

function drawGrid(deck) {
  const list = candidates(deck), have = new Set(deck.cards);
  $("#grid").innerHTML = list.length ? list.map(c =>
    `<div class="card ${have.has(c.id) ? "in" : ""}" data-id="${c.id}"><img width="256" height="256" src="${thumb(c)}" alt="${esc(c.name)}" loading="lazy" decoding="async"><span class="cm">${c.mana}</span><span class="cn">${esc(c.name)}</span><div class="tick">✓</div><button class="zoom" data-z="${c.id}" aria-label="Preview">⤢</button></div>`).join("")
    : `<div class="noresult">No cards match “${esc(ui.search)}”</div>`;
}

function wireGrid(deck, q) {
  const grid = $("#grid"); let timer = null, held = false;
  const cancel = () => clearTimeout(timer);
  grid.addEventListener("pointerdown", e => {
    const el = e.target.closest(".card"); held = false; if (!el || e.target.closest(".zoom")) return;
    timer = setTimeout(() => { held = true; navigator.vibrate?.(10); preview(deck, el.dataset.id); }, 450);
  });
  ["pointerup", "pointercancel", "pointerleave", "scroll"].forEach(ev => grid.addEventListener(ev, cancel, true));
  grid.addEventListener("contextmenu", e => e.preventDefault());
  grid.addEventListener("click", e => {
    const z = e.target.closest(".zoom");
    if (z) return preview(deck, z.dataset.z);
    const el = e.target.closest(".card"); if (!el) return;
    if (held) { held = false; return; }
    toggleCard(deck, el.dataset.id);
    if (ui.search) { ui.search = ""; q.value = ""; drawGrid(deck); q.focus(); }
  });
}
function toggleCard(deck, id) {
  const i = deck.cards.indexOf(id);
  if (i >= 0) deck.cards.splice(i, 1);
  else {
    if (deck.cards.length >= DECK_SIZE) return toast(`Deck is full (${DECK_SIZE} cards)`);
    deck.cards.push(id); navigator.vibrate?.(8);
  }
  deck.updated = Date.now(); save();
  $("#grid")?.querySelectorAll(`.card[data-id="${id}"]`).forEach(el => el.classList.toggle("in", i < 0));
  drawDeck(deck);
}

function drawDeck(deck) {
  const cs = deck.cards.map(i => BYID[i]).sort((a, b) => a.mana - b.mana || a.name.localeCompare(b.name));
  const n = deck.cards.length;
  $("#cnt1").textContent = `${n}/${DECK_SIZE}`; $("#cnt2").textContent = `${n}/${DECK_SIZE}`;
  $("#avg").textContent = n ? `avg ${(cs.reduce((s, c) => s + c.mana, 0) / n).toFixed(1)} mana` : "";
  const buckets = Array(9).fill(0); cs.forEach(c => buckets[Math.min(c.mana, 8)]++);
  const mx = Math.max(1, ...buckets);
  $("#curve").innerHTML = buckets.map((b, i) => `<div style="height:${Math.max(4, b / mx * 100)}%" title="${b}"><span>${i === 8 ? "8+" : i}</span></div>`).join("");
  $("#dlist").innerHTML = cs.length ? cs.map(c =>
    `<div class="drow" data-id="${c.id}"><span class="mana">${c.mana}</span><span class="n">${esc(c.name)}<div class="t">${c.faction === "neutral" ? "Neutral" : FACTIONS[c.faction]} · ${c.type}</div></span><button class="x" data-rm="${c.id}" aria-label="Remove">✕</button></div>`).join("")
    : `<div class="hint">Tap cards to add them.<br>Press and hold a card to preview it.</div>`;
}
function wireDeckList(deck) {
  $("#dlist").addEventListener("click", e => {
    const rm = e.target.closest("[data-rm]");
    if (rm) return toggleCard(deck, rm.dataset.rm);
    const r = e.target.closest(".drow"); if (r) preview(deck, r.dataset.id);
  });
}

function preview(deck, id, ro) {
  const c = BYID[id], inDeck = deck.cards.includes(id);
  const o = openModal(`<div class="preview"><img src="${full(c)}" alt="${esc(c.name)}">
    <div class="txt">${esc(c.name)} · ${c.mana} mana · ${c.rarity}${c.units.length ? " · " + esc(c.units.join(", ")) : ""}</div>
    <div class="pc"><button id="pc">Close</button>${ro ? "" : `<button class="primary" id="pa">${inDeck ? "Remove from deck" : "Add to deck"}</button>`}</div></div>`);
  $("#pc", o).onclick = closeModal;
  if (!ro) $("#pa", o).onclick = () => { closeModal(); toggleCard(deck, id); };
}

/* ---------- deck view (like the Stormbound decks web page) ---------- */
function renderView(id) {
  const deck = state.decks.find(d => d.id === id);
  const cs = deck.cards.map(i => BYID[i]).sort((a, b) => a.mana - b.mana || a.name.localeCompare(b.name));
  const units = cs.filter(c => c.type === "unit"), structs = cs.filter(c => c.type === "structure"), spells = cs.filter(c => c.type === "spell");
  const sum = (a, f) => a.reduce((t, c) => t + (f(c) || 0), 0);
  const unitStr = sum(units, c => c.str), n = cs.length;
  const curve = Array(9).fill(0); cs.forEach(c => curve[Math.min(c.mana, 8)]++);
  const mx = Math.max(1, ...curve);
  const rar = {}; cs.forEach(c => rar[c.rarity] = (rar[c.rarity] || 0) + 1);
  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  $("#app").innerHTML = `
    <div class="bar f-${deck.faction}"><button class="ghost" id="back">‹ Decks</button><h1>${esc(deck.name || "Untitled")}</h1>
      <button id="vdet">Details</button><button class="primary" id="vedit">Edit cards</button></div>
    <div class="scroll vview">
      <div class="badges f-${deck.faction}"><span class="fbadge">${FACTIONS[deck.faction]}</span>${deck.mine ? `<span class="badge ok">My deck</span>` : ""}${deck.archetype ? `<span class="badge">${esc(deck.archetype)}</span>` : ""}${deck.type ? `<span class="badge">${esc(deck.type)}</span>` : ""}
        <span class="badge ${n === DECK_SIZE ? "ok" : ""}">${n}/${DECK_SIZE} cards</span></div>
      ${n ? `<div class="vgrid">${cs.map(c => `<div class="pcard" data-id="${c.id}"><div class="pimg"><img width="256" height="256" src="${thumb(c)}" alt=""><span class="cm">${c.mana}</span>${c.str != null ? `<span class="cs">${c.str}</span>` : ""}${c.spd ? `<span class="cv">${c.spd}</span>` : ""}<span class="cn">${esc(c.name)}<small>${esc(c.units.length ? c.units.join(", ") : c.type)}</small></span></div></div>`).join("")}</div>`
        : `<div class="empty">No cards yet.<br>Tap <b>Edit cards</b> to add some.</div>`}
      <div class="vcols"><div><h3>Statistics</h3><div class="stats">
        ${stat(n ? (sum(cs, c => c.mana) / n).toFixed(2) : "–", "average mana")}${stat(units.length, "units")}${stat(spells.length, "spells")}${stat(structs.length, "structures")}
        ${stat(unitStr, "unit strength (total)")}${stat(units.length ? Math.round(unitStr / units.length) : 0, "strength per unit")}${stat(units.filter(c => c.spd >= 2).length, "fast units (speed 2+)")}${stat(sum(structs, c => c.str), "structure strength")}</div></div>
        <div><h3>Mana curve</h3><div class="vcurve">${curve.map((b, i) => `<div><i style="height:${b / mx * 100}%"></i><em>${b || ""}</em><span>${i === 8 ? "8+" : i}</span></div>`).join("")}</div>
        <p class="hint left">Rarity: ${Object.entries(rar).map(([k, v]) => `${v} ${k}`).join(", ") || "–"}</p></div></div>
    </div>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  $("#vedit").onclick = () => { location.hash = "#/deck/" + deck.id + "/edit"; };
  $("#vdet").onclick = () => deckDialog(deck);
  $(".vgrid")?.addEventListener("click", e => { const c = e.target.closest("[data-id]"); if (c) preview(deck, c.dataset.id, true); });
}

/* ---------- boot ---------- */
(async function () {
  load();
  CARDS = await (await fetch("cards.json")).json();
  CARDS.forEach(c => { BYID[c.id] = c; c._s = norm([c.name, c.ability, c.units.join(" "), c.type, c.rarity].join(" ")); });
  if (document.readyState !== "complete") await new Promise(r => addEventListener("load", r));  // tools.js and the other scripts load after this one: route only when all are there
  route();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
