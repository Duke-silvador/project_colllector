"use strict";
/* "Deck types met": which types of decks the opponents play, guessed from the cards seen in each game (archetypes.js), as ranges;
   the games one by one; and my decks against those types (Won / Lost, no draws). The cards are taken as seen: cheap cards and long
   games are over-represented in what is seen, and this is not corrected yet. */
let PROFILES = null, PROFILE_ERRORS = [];
const TY = { tab: "types", level: "archetype" };
const LEVELS = [["faction", "Faction"], ["archetype", "Archetype"], ["type", "Type"]];

async function loadProfiles() {
  if (PROFILES) return;
  try { const r = AR.loadProfiles(await (await fetch("archetypes-bundled.json")).json(), CARDS); PROFILES = r.profiles; PROFILE_ERRORS = r.errors; }
  catch (e) { PROFILES = []; }
}

/** Every game with cards or a result: the saved fragments, and the games saved without one (card names, faction key, result, my deck). */
function gameRows() {
  const names = ids => (ids || []).filter(i => BYID[i]).map(i => BYID[i].name);
  const rows = state.fragments.map(f => ({ id: f.id, game: f.game, cards: names(f.cards), faction: f.faction, date: f.date || "", result: f.result || "", my_deck: f.my_deck || "", kind: "fragment" }));
  const have = new Set(state.fragments.map(f => f.game).filter(Boolean));
  for (const g of state.games) if (!have.has(g.game)) rows.push({ id: g.game, game: g.game, cards: names(g.cards), faction: g.faction || "", date: g.date || "", result: g.result || "", my_deck: g.my_deck || "", kind: "game" });
  return rows;
}
const pc0 = x => Math.round(100 * x) + "%";
const range = r => `${Math.round(100 * r.low)}–${Math.round(100 * r.high)}%`;
const num1 = x => (Math.round(x * 10) / 10).toString();

function renderTypes() {
  $("#app").innerHTML = `<div class="bar"><button class="ghost" id="back">‹ Decks</button><h1>Deck types met</h1>
    <div class="tabs always"><button id="ttypes">Types</button><button id="tgames">Games</button><button id="tmatch">Matchups</button></div></div>
    <div class="scroll" id="tybody"><p class="hint">loading…</p></div>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  for (const [id, t] of [["ttypes", "types"], ["tgames", "games"], ["tmatch", "match"]]) $("#" + id).onclick = () => { TY.tab = t; drawTypes(); };
  loadProfiles().then(() => { if (location.hash === "#/types") drawTypes(); });
}

function drawTypes() {
  const box = $("#tybody"); if (!box) return;
  for (const [id, t] of [["ttypes", "types"], ["tgames", "games"], ["tmatch", "match"]]) $("#" + id)?.classList.toggle("on", TY.tab === t);
  const rows = gameRows();
  box.innerHTML = TY.tab === "types" ? typesHtml(rows) : TY.tab === "games" ? gamesHtml(rows) : matchHtml(rows);
  box.onclick = e => {
    const l = e.target.closest("[data-lv]");
    if (l) { TY.level = l.dataset.lv; drawTypes(); }
  };
}

const NOTE = `<div class="note">Guessed from the cards seen in each game, not from full lists. <b>Visibility is not corrected yet:</b> a card only shows once it is played, so cheap cards and long games weigh more than they should. Ranges are 90% credible ranges: with few games they are wide.</div>`;
const noProfiles = () => `<div class="note"><b>No archetype profiles in the app yet.</b> The types come from the files in <code>data/decks/archetypes</code> of the PC project (core / common / uncommon card groups). Fill them in there, then run <code>scripts/export_ipad_decks.py</code> and push the app.${PROFILE_ERRORS.length ? `<br>Left out as invalid: ${PROFILE_ERRORS.map(esc).join("; ")}` : ""}</div>`;

function bar(r) {
  const lo = Math.round(100 * r.low), hi = Math.round(100 * r.high);
  return `<div class="rng"><i style="left:${lo}%;width:${Math.max(1, hi - lo)}%"></i><b style="left:${Math.round(100 * r.p)}%"></b></div>`;
}
function rangeRow(r, cls = "") {
  return `<div class="rrow ${cls}"><div class="rn">${esc(r.name)}<small>${num1(r.n)} game${r.n === 1 ? "" : "s"}</small></div>${bar(r)}<div class="rv">${pc0(r.p)}<small>${range(r)}</small></div></div>`;
}

function typesHtml(rows) {
  const withCards = rows.filter(r => r.cards.length);
  let h = NOTE;
  if (!PROFILES.length) h += noProfiles();
  if (!withCards.length) return h + `<div class="hint">No game with cards yet. In Battle tools, add the cards an opponent played, then press <b>New game</b> and record the result, or use <b>Create fragment</b>.</div>`;
  const o = AR.overview(rows, PROFILES, CARDS);
  h += `<p class="hint left">${o.games} game${o.games === 1 ? "" : "s"} with cards seen.</p>`;
  h += `<h3>Faction</h3>` + o.faction.filter(r => r.n > 0.05 || r.name !== AR.UNKNOWN).map(r => rangeRow(r)).join("");
  h += `<h3>Archetype</h3>` + o.archetype.filter(r => r.n >= 0.25).map(r => rangeRow(r)).join("");
  const sup = o.type.filter(r => r.supported), few = o.type.filter(r => !r.supported && r.n >= 0.25 && r.name !== AR.UNKNOWN);
  h += `<h3>Type</h3>` + (sup.map(r => rangeRow(r)).join("") || `<div class="hint left">No type has ${AR.MIN_GAMES_TYPE} games yet: see the archetypes above.</div>`);
  if (few.length) h += `<details class="few"><summary>${few.length} type${few.length === 1 ? "" : "s"} with too few games to say (under ${AR.MIN_GAMES_TYPE})</summary>${few.map(r => rangeRow(r, "dim")).join("")}</details>`;
  return h;
}

function gamesHtml(rows) {
  if (!rows.length) return NOTE + `<div class="hint">No game yet.</div>`;
  const sorted = rows.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return NOTE + (PROFILES.length ? "" : noProfiles()) + sorted.map(r => {
    const v = AR.classifyGame(r.cards, PROFILES, CARDS), t = Object.entries(v.type)[0], a = Object.entries(v.archetype)[0];
    const verdict = !r.cards.length ? `<span class="dim">no card seen</span>` : PROFILES.length ? `${esc(t[0])} <b>${pc0(t[1])}</b><small>${esc(a[0])} ${pc0(a[1])}${v.hybrid ? " · hybrid?" : ""}</small>` : `<span class="dim">no profiles</span>`;
    return `<details class="grow2"><summary><span class="rbadge ${r.result}">${r.result === "win" ? "W" : r.result === "loss" ? "L" : "·"}</span><span class="gf f-${r.faction}">${FACTIONS[r.faction] || "?"}</span><span class="gv">${verdict}</span><span class="dim gd">${esc(r.date)}</span></summary>
      <div class="mini" style="margin:6px 0 4px">${r.cards.map(c => `<span>${esc(c)}</span>`).join("") || `<span class="dim">no card</span>`}</div>
      <p class="hint left">${r.my_deck ? "Played with " + esc(r.my_deck) + "." : "No deck of mine was chosen."}${r.result ? "" : " No result saved."}</p></details>`;
  }).join("");
}

/** My decks against the opponent types: for each deck of mine, each category of the level gets the wins and losses (soft: a game counts
    for each category by the share the cards give it) and a 90% range of the win rate from a Beta(0.5 + wins, 0.5 + losses). */
function matchups(rows, level) {
  const decks = new Map();
  for (const r of rows) {
    if (r.result !== "win" && r.result !== "loss") continue;
    const key = r.my_deck || "", d = decks.get(key) || { name: key, w: 0, l: 0, cells: {} };
    decks.set(key, d);
    if (r.result === "win") d.w++; else d.l++;
    if (!r.cards.length) continue;
    for (const [cat, p] of Object.entries(AR.classifyGame(r.cards, PROFILES, CARDS)[level])) {
      const c = d.cells[cat] || (d.cells[cat] = { w: 0, l: 0 });
      if (r.result === "win") c.w += p; else c.l += p;
    }
  }
  const rate = (w, l) => ({ p: (0.5 + w) / (1 + w + l), low: AR.betaQuantile(0.05, 0.5 + w, 0.5 + l), high: AR.betaQuantile(0.95, 0.5 + w, 0.5 + l) });
  return [...decks.values()].sort((a, b) => (b.w + b.l) - (a.w + a.l) || (a.name < b.name ? -1 : 1)).map(d => ({
    name: d.name, w: d.w, l: d.l, ...rate(d.w, d.l),
    cells: Object.entries(d.cells).filter(([, c]) => c.w + c.l >= 0.5).map(([cat, c]) => ({ name: cat, w: c.w, l: c.l, ...rate(c.w, c.l) })).sort((a, b) => (b.w + b.l) - (a.w + a.l) || (a.name < b.name ? -1 : 1)) }));
}
function matchHtml(rows) {
  const done = rows.filter(r => r.result === "win" || r.result === "loss");
  let h = NOTE;
  if (!done.length) return h + `<div class="hint">No result saved yet. Choose your deck under <b>My decks</b>, play, then press <b>New game</b> in Battle tools and tap Won or Lost.</div>`;
  if (!PROFILES.length) h += noProfiles();
  h += `<div class="chips">${LEVELS.map(([k, n]) => `<button class="chip ${TY.level === k ? "on" : ""}" data-lv="${k}">${n}</button>`).join("")}</div>`;
  for (const d of matchups(rows, TY.level)) {
    h += `<h3><span class="dn">${d.name ? esc(d.name) : "No deck chosen"}</span> <span class="dim">${d.w} won, ${d.l} lost · ${pc0(d.p)} (${range(d)})</span></h3>`;
    h += d.cells.map(c => `<div class="rrow"><div class="rn">${esc(c.name)}<small>${num1(c.w)} won · ${num1(c.l)} lost</small></div>${bar(c)}<div class="rv">${pc0(c.p)}<small>${range(c)}</small></div></div>`).join("")
      || `<div class="hint left">No cards seen in these games: nothing to split by opponent.</div>`;
  }
  return h + `<p class="hint left">Win rate of my deck against each ${LEVELS.find(l => l[0] === TY.level)[1].toLowerCase()} of opponent, with a 90% range (categories under half a game are left out). A game with uncertain cards counts partly for each category it could be, so the numbers can be fractions.</p>`;
}
