"use strict";
/* Battle tools page: hand calculator (port of the Stormbound project's /tools page) + "create a deck from the played cards". */
const HKEY = "sb-hand-v1";
let BUNDLED = null;
let T = { turns: [{ cards: [], done: false }], off: [], cycle: "first", game: uid(), guess: true, faction: "" };  // game: one id a game, so saving its fragment again updates it; guess: build decks from the fragments when no known deck fits
let H = { last: null, seq: 0, openDeck: null, tab: "in" };
try {
  const j = JSON.parse(localStorage.getItem(HKEY) || "null");
  if (j && Array.isArray(j.turns) && j.turns.length) T = { turns: j.turns, off: j.off || [], cycle: j.cycle || "first", game: j.game || uid(), guess: j.guess !== false, faction: FACTIONS[j.faction] ? j.faction : "" };
} catch (e) {}
const hsave = () => { try { localStorage.setItem(HKEY, JSON.stringify(T)); } catch (e) {} };
const pct = (x, d = 0) => (100 * x).toFixed(d) + "%";
const confirmedTurns = () => { const out = []; for (const t of T.turns) { if (!t.done) break; out.push(t.cards); } return out; };
/* Cards that change the hand when played. The calculator asks about them when the card is added to a turn:
   "return": the card goes back to the hand (it never reaches the deck), so the opponent keeps it for certain. */
const HAND_FX = {
  "Counselor Ahmi": { kind: "return", q: "No surrounding units, so it went back to the hand?", yes: "back in its hand", no: "not back in its hand" },
};
const fxOf = id => HAND_FX[BYID[id].name];
const fxAnswer = (t, id) => (t.fx || {})[id];
const pendingFx = t => t.cards.filter(id => fxOf(id) && !fxAnswer(t, id));
/** For every confirmed turn: the names of the cards that went back to the hand when played. */
const confirmedBack = () => { const out = []; for (const t of T.turns) { if (!t.done) break; out.push(t.cards.filter(id => fxAnswer(t, id) === "yes").map(id => BYID[id].name)); } return out; };
const playedCards = () => [...new Set(T.turns.flatMap(t => t.cards))].filter(id => BYID[id]);
const facName = f => FACTIONS[f] || "Neutral";

async function loadBundled() {
  if (BUNDLED) return;
  try { BUNDLED = await (await fetch("decks-bundled.json")).json(); } catch (e) { BUNDLED = {}; }
}
/** name -> {title, faction, archetype, cards (card names)}: the bundled decks plus your own saved 12-card decks. */
function candidatePool() {
  const out = {};
  for (const [k, d] of Object.entries(BUNDLED || {})) if (!T.faction || d.faction === T.faction) out[k] = d;  // the opponent faction is public: only its decks
  for (const d of state.decks) if (!d.mine && d.saved !== false && d.cards.length === DECK_SIZE && (!T.faction || d.faction === T.faction))
    out["u:" + d.id] = { title: "★ " + (d.name || "Untitled"), faction: d.faction, archetype: d.archetype || "—", cards: d.cards.map(i => BYID[i].name) };
  return out;
}
const nameOf = id => BYID[id].name;
/** What the card statistics are computed from for a guess: the saved fragments and the known decks (card names). */
function corpusRows(pool) {
  const rows = state.fragments.map(f => ({ cards: f.cards.filter(i => BYID[i]).map(nameOf), faction: f.faction, id: f.id, title: "fragment " + String(f.id).slice(0, 6), kind: "fragment" }));
  for (const [name, d] of Object.entries(pool)) rows.push({ cards: d.cards, faction: d.faction, id: name, title: d.title, kind: "deck" });
  return rows;
}
const poolInfo = () => { const mine = state.decks.filter(d => d.saved !== false && !d.mine);
  const ok = mine.filter(d => d.cards.length === DECK_SIZE).length, bundled = Object.keys(BUNDLED || {}).length;
  return `Candidates: ${bundled} project decks + ${ok} of your ${mine.length} saved deck${mine.length === 1 ? "" : "s"}` +
    (mine.length > ok ? ` (${mine.length - ok} skipped: fewer than ${DECK_SIZE} cards, they would skew the odds)` : "") + ".";
};

function renderTools() {
  loadBundled().then(() => { if (location.hash === "#/tools") { drawInput(); recalc(); } });
  $("#app").innerHTML = `
    <div class="bar"><button class="ghost" id="back">‹ Decks</button><h1>Hand calculator</h1>
      <div class="tabs"><button id="hin">Cards</button><button id="hout">Result</button></div></div>
    <div class="tools ${H.tab === "out" ? "showres" : ""}"><div class="tcol" id="tin"></div><div class="tcol" id="tout"></div></div>
    <div class="bottom"><div class="handbar" id="handbar" hidden></div><div class="deckbar" id="deckbar"></div></div>`;
  $("#back").onclick = () => { location.hash = "#/"; };
  $("#hin").onclick = () => setHTab("in"); $("#hout").onclick = () => setHTab("out");
  setHTab(H.tab); drawInput(); drawResult();
  recalc();
}
function setHTab(t) {
  H.tab = t; $(".tools")?.classList.toggle("showres", t === "out");
  $("#hin")?.classList.toggle("on", t === "in"); $("#hout")?.classList.toggle("on", t === "out");
}

/* ---------- the turns ---------- */
function drawDeckBar() {
  const bar = $("#deckbar"); if (!bar) return;
  const rows = [];
  T.turns.forEach((t, i) => t.cards.forEach(id => { if (BYID[id] && !rows.some(r => r.id === id)) rows.push({ id, turn: i + 1 }); }));
  bar.innerHTML = `<div class="dbh"><b>Deck so far</b> <span class="dim">${rows.length}/${DECK_SIZE} cards seen played</span></div>` +
    (rows.length ? `<div class="dbrow">${rows.map(({ id, turn }) => { const c = BYID[id];
      return `<div class="dbc"><div class="dbi"><img src="${thumb(c)}" alt="" width="256" height="256"><span class="cm">${c.mana}</span><span class="tn">T${turn}</span><span class="cn">${esc(c.name)}</span></div></div>`; }).join("")}</div>`
      : `<div class="dim dbe">No card yet: the cards you add as played appear here.</div>`);
}
function drawInput() {
  drawDeckBar(); drawHandBar();
  const box = $("#tin"); if (!box) return;
    const myDecks = state.decks.filter(d => d.mine && d.saved !== false), cur = currentDeck();
  let h = (myDecks.length ? `<div class="field"><label>I play with</label><select id="hmy"><option value="">– no deck chosen –</option>${myDecks.map(d => `<option value="${d.id}" ${cur && cur.id === d.id ? "selected" : ""}>${esc(d.name || "Untitled")} (${FACTIONS[d.faction]})</option>`).join("")}</select></div>`
      : `<p class="hint left">Add your own decks on the first page (<b>My decks</b>) to record Won / Lost against the deck you play.</p>`) +
    `<div class="field"><label>Opponent faction (public at the start of a game)</label><div class="factions">${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k} ${T.faction === k ? "sel" : ""}" data-fac="${k}">${n}</button>`).join("")}</div></div><p class="hint left">Add the cards the opponent played each turn, then tap <b>Done</b>. Cards seen played are in its deck for sure.</p><div id="turns">`;
  T.turns.forEach((t, i) => {
    h += `<div class="turn ${t.done ? "done" : ""}"><div class="thead"><b>Turn ${i + 1}</b><div class="tchips">` +
      (t.cards.map((id, k) => `<span class="pick f-${BYID[id].faction}"><span class="m">${BYID[id].mana}</span>${esc(nameOf(id))}${fxAnswer(t, id) === "yes" ? " ↩" : ""}${t.done ? "" : `<button data-rm="${i}:${k}" aria-label="remove">✕</button>`}</span>`).join("") ||
        `<span class="dim">${t.done ? "no card seen" : "no card yet"}</span>`) +
      `</div><button class="chip ${t.done ? "" : "on"}" data-done="${i}">${t.done ? "Edit" : "Done"}</button></div>`;
    if (!t.done) h += t.cards.filter(fxOf).map(id => { const fx = fxOf(id), a = fxAnswer(t, id);
      return a ? `<div class="fxq done"><span>${a === "yes" ? "↩" : "•"} ${esc(nameOf(id))}: ${esc(a === "yes" ? fx.yes : fx.no)}</span><button data-fx="${id}:${a === "yes" ? "no" : "yes"}">Change</button></div>`
        : `<div class="fxq"><span><b>${esc(nameOf(id))}</b>: ${esc(fx.q)}</span><button class="primary" data-fx="${id}:yes">Yes, back in hand</button><button data-fx="${id}:no">No</button></div>`; }).join("");
    if (!t.done) h += `<input class="tq" id="tq" type="search" placeholder="Search a card the opponent played…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div id="sugg"></div>`;
    h += `</div>`;
  });
  h += `</div><div class="bar2"><button id="hundo">Undo last turn</button><button id="hnew">New game</button>
    <select id="hcycle"><option value="first">Cycle: before it plays</option><option value="after">Cycle: after it plays</option></select></div>
    <button class="primary wide" id="hmake">Create deck from played cards (${playedCards().length})</button>
    <p class="hint left">${esc(poolInfo())} Fragments saved: ${state.fragments.length}. An opponent with another deck is guessed from them.</p>
    <label class="hint left chk"><input type="checkbox" id="hguess"> Show the guessed decks</label>`;
  box.innerHTML = h;
  if ($("#hmy")) $("#hmy").onchange = e => { state.current = e.target.value; save(); };
  $("#hguess").checked = T.guess !== false;
  $("#hguess").onchange = e => { T.guess = e.target.checked; hsave(); drawHandBar(); };
  $("#hcycle").value = T.cycle;
  $("#hcycle").onchange = e => { T.cycle = e.target.value; hsave(); recalc(); };
  const q = $("#tq");
  if (q) q.addEventListener("input", () => drawSugg(q));
  box.onclick = e => {
    const ff = e.target.closest("[data-fac]"), rm = e.target.closest("[data-rm]"), dn = e.target.closest("[data-done]"), sg = e.target.closest("[data-add]"), fx = e.target.closest("[data-fx]");
    if (ff) { T.faction = T.faction === ff.dataset.fac ? "" : ff.dataset.fac; hsave(); drawInput(); recalc(); }
    else if (rm) { const [i, k] = rm.dataset.rm.split(":").map(Number), t = T.turns[i]; if (t.fx) delete t.fx[t.cards[k]]; t.cards.splice(k, 1); hsave(); drawInput(); }
    else if (fx) {
      const [id, ans] = fx.dataset.fx.split(":"), t = T.turns.find(x => !x.done);
      t.fx = t.fx || {}; t.fx[id] = ans; hsave(); drawInput(); $("#tq")?.focus();
    } else if (dn) {
      const i = +dn.dataset.done, t = T.turns[i];
      if (!t.done && pendingFx(t).length) return toast(`${nameOf(pendingFx(t)[0])}: answer the question first`);
      if (t.done) { t.done = false; T.turns = T.turns.slice(0, i + 1); }
      else { t.done = true; if (i === T.turns.length - 1) T.turns.push({ cards: [], done: false }); }
      hsave(); drawInput(); recalc(); if (!t.done) $("#tq")?.focus();
    } else if (sg) {
      const t = T.turns.find(x => !x.done); t.cards.push(sg.dataset.add); hsave(); drawInput(); $("#tq")?.focus();
    }
  };
  $("#hundo").onclick = () => {
    const done = T.turns.filter(t => t.done); if (!done.length) return;
    T.turns = T.turns.slice(0, done.length - 1); T.turns.push({ cards: [], done: false }); hsave(); drawInput(); recalc();
  };
  $("#hnew").onclick = () => { if (!playedCards().length) return resetGame(); resultDialog(); };
  $("#hmake").onclick = makeDeckDialog;
}
function resetGame() {
  T.turns = [{ cards: [], done: false }]; T.game = uid(); T.faction = ""; H.openDeck = null; hsave(); drawInput(); recalc();
}
/** The faction of the game: the cards seen decide, else the one picked; "" when open or when the cards mix factions. */
function gameFaction() {
  const fs = [...new Set(playedCards().map(i => BYID[i].faction).filter(f => f !== "neutral"))];
  return fs.length > 1 ? "" : fs[0] || T.faction || "";
}
/** Save how the game ended (win | loss) with the deck I played: on the game's fragment when it has one (or can have one), else as a game record. */
function recordGame(result) {
  const my = currentDeck(), ids = playedCards().slice(0, DECK_SIZE), fac = gameFaction(), day = new Date().toISOString().slice(0, 10);
  const mine = my ? { my_deck: my.name || "Untitled", my_cards: my.cards.slice() } : {};
  const at = state.fragments.findIndex(f => f.game === T.game);
  if (ids.length && fac) {  // the cards seen are kept as a fragment, as Create fragment would
    const had = at >= 0 ? state.fragments[at] : null, lastWithCards = T.turns.reduce((m, t, i) => t.cards.length ? i + 1 : m, 0);
    const rec = { ...(had || {}), id: had ? had.id : uid(), game: T.game, cards: ids, faction: fac, date: had ? had.date : day,
      turns: Math.max(T.turns.filter(t => t.done).length, lastWithCards), updated: Date.now(), result, ...mine };
    if (!my) { delete rec.my_deck; delete rec.my_cards; }
    if (at >= 0) state.fragments[at] = rec; else state.fragments.push(rec);
    state.games = state.games.filter(g => g.game !== T.game);
  } else {
    const rec = { game: T.game, cards: ids, faction: fac, date: day, result, updated: Date.now(), ...mine };
    const k = state.games.findIndex(g => g.game === T.game);
    if (k >= 0) state.games[k] = rec; else state.games.push(rec);
  }
  save();
}
function resultDialog() {
  const my = currentDeck(), n = playedCards().length;
  const o = openModal(`<div class="modal"><h2>How did the game end?</h2>
    <p class="hint left">${my ? `You played <b>${esc(my.name || "Untitled")}</b>.` : `No deck of yours is chosen: the result is saved without a deck.`} ${n} card${n === 1 ? "" : "s"} seen from the opponent${gameFaction() ? ` (${FACTIONS[gameFaction()]})` : ", faction not known"}.</p>
    <div class="actions res"><button class="primary" id="rwin">Won</button><button class="danger" id="rloss">Lost</button></div>
    <div class="actions"><button id="rcancel">Back to the game</button><button id="rskip">Skip: don't save a result</button></div></div>`);
  $("#rcancel").onclick = closeModal;
  $("#rskip").onclick = () => { closeModal(); resetGame(); };
  for (const [id, r, word] of [["rwin", "win", "Won"], ["rloss", "loss", "Lost"]]) $("#" + id).onclick = () => {
    recordGame(r); closeModal(); resetGame(); toast(`${word} saved${my ? " with " + (my.name || "Untitled") : ""}`);
  };
}
function drawSugg(q) {
  const t = T.turns.find(x => !x.done), toks = norm(q.value).split(/\s+/).filter(Boolean), sg = $("#sugg");
  if (!toks.length) { sg.innerHTML = ""; return; }
  const list = CARDS.filter(c => !t.cards.includes(c.id) && (!T.faction || c.faction === "neutral" || c.faction === T.faction) && toks.every(k => norm(c.name + " " + c.units.join(" ")).includes(k)))
    .sort((a, b) => (norm(a.name).startsWith(toks[0]) ? 0 : 1) - (norm(b.name).startsWith(toks[0]) ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 8);
  sg.innerHTML = list.map(c => `<div class="sg" data-add="${c.id}"><img src="${thumb(c)}" alt="" width="36" height="36"><span class="m">${c.mana}</span><span class="nm">${esc(c.name)}</span><small>${facName(c.faction)}</small></div>`).join("")
    || `<div class="hint">No match</div>`;
}

/* ---------- the answer ---------- */
function recalc() {
  const turns = confirmedTurns(), my = ++H.seq;
  if (!BUNDLED || !turns.some(t => t.length)) { H.last = null; drawResult(); return; }
  $("#tout") && ($("#tout").innerHTML = `<p class="hint">thinking…</p>`);
  setTimeout(() => {
    if (my !== H.seq) return;
    const pool = candidatePool(), decks = {}, names = turns.map(t => t.map(nameOf)), opts = { cycleFirst: T.cycle !== "after", returned: confirmedBack() };
    for (const [n, d] of Object.entries(pool)) decks[n] = d.cards;
    let res = HC.analyse(decks, names, opts);
    res.pool = Object.keys(decks).length; res.poolMeta = pool;
    if (!res.candidates) {  // no known deck holds the cards seen: guess decks from the fragments and the known decks
      const rows = corpusRows(pool).filter(r => !T.faction || !r.faction || r.faction === T.faction), g = FR.guessDecks(names.flat(), CARDS, rows, { labels: FACTIONS });
      if (g.guesses.length) {
        const meta = {}, gd = {};
        g.guesses.forEach(x => { meta[x.name] = x; gd[x.name] = x.cards; });
        res = HC.analyse(gd, names, opts);
        Object.assign(res, { pool: g.guesses.length, poolMeta: meta, guessed: true,
          fragments: rows.filter(r => r.kind === "fragment").length, knownDecks: rows.filter(r => r.kind === "deck").length });
      } else res.guessNote = g.note;
    }
    H.last = res; drawResult();
  }, 30);
}
function probCard(name, p, seen) {
  const c = CARDS.find(x => x.name === name);
  const kind = c.units.length ? c.units.join(", ") : c.type;
  return `<div class="pcard ${seen ? "seen" : ""}" data-cid="${c.id}"><div class="pimg"><img src="${thumb(c)}" alt="" width="256" height="256" draggable="false"><span class="cm">${c.mana}</span>` +
    (c.str != null ? `<span class="cs">${c.str}</span>` : "") + (c.spd ? `<span class="cv">${c.spd}</span>` : "") +
    `<span class="cn">${esc(name)}<small>${esc(kind)}</small></span></div>
    <div class="pbar"><i style="width:${Math.min(100, p * 100)}%"></i><span>${pct(p)}</span></div></div>`;
}
/** Three guessed decks from the cards seen (every card played, this turn too), the known decks and the fragments; each card has the chance it is in the deck. */
function guessedDecks() {
  const seen = playedCards().map(nameOf);
  if (!seen.length) return { guesses: [], note: "" };
  const rows = corpusRows(candidatePool()).filter(r => !T.faction || !r.faction || r.faction === T.faction);
  const g = FR.guessDecks(seen, CARDS, rows, { k: 3, labels: FACTIONS, faction: T.faction || null });
  const corpus = new FR.Corpus(rows);
  if (g.guesses.length && g.guesses.length < 3) {  // too little data for three different decks: vary the first one, leaving out the cards it is surest of
    const first = g.guesses[0], f = first.faction, sc = corpus.scope(f), have = new Set(g.guesses.map(x => x.cards.slice().sort().join("|")));
    const pool = CARDS.filter(c => c.rarity && (c.faction === f || c.faction === "neutral") && !seen.includes(c.name)).map(c => c.name);
    const skip = new Set();
    for (const x of g.guesses) x.cards.filter(c => !seen.includes(c)).slice(0, 4).forEach(c => skip.add(c));
    for (let tries = 0; tries < 6 && g.guesses.length < 3; tries++) {
      const deck = FR.fill(seen, pool.filter(c => !skip.has(c)), sc), key = deck.slice().sort().join("|");
      deck.filter(c => !seen.includes(c)).slice(0, 4).forEach(c => skip.add(c));
      if (have.has(key)) continue;
      have.add(key);
      g.guesses.push({ name: `guess:${f}:v${tries}`, faction: f, archetype: "Guess", cards: deck, basis: "another likely build, leaving out the cards the first guess is surest of" });
    }
  }
  g.guesses = g.guesses.slice(0, 3).map((x, i) => {
    const sc = corpus.scope(x.faction);
    return { ...x, title: "Guess " + (i + 1), list: x.cards.map(c => ({ name: c, p: seen.includes(c) ? 1 : sc.inclusion(seen, c) }))
      .sort((a, b) => b.p - a.p || (a.name < b.name ? -1 : 1)) };
  });
  return g;
}
const cidOf = name => (CARDS.find(c => c.name === name) || {}).id;
function addPlayed(id) {
  const t = T.turns.find(x => !x.done); if (!t) return;
  const n = T.turns.indexOf(t) + 1;
  if (t.cards.includes(id)) return toast(`${nameOf(id)} is already in turn ${n}`);
  t.cards.push(id); hsave(); drawInput(); toast(`${nameOf(id)} added to turn ${n}`);
}
/** The whole card with its stats and ability (a long press on a card of the hand bar). */
function cardPopup(id) {
  const c = BYID[id], t = T.turns.find(x => !x.done), n = t ? T.turns.indexOf(t) + 1 : 0;
  const o = openModal(`<div class="preview"><img src="${full(c)}" alt="${esc(c.name)}" draggable="false">
    <div class="txt"><b>${esc(c.name)}</b><br>${facName(c.faction)} · ${esc(c.type)} · ${esc(c.rarity)} · ${c.mana} mana${c.str != null ? ` · strength ${c.str}` : ""}${c.spd ? ` · speed ${c.spd}` : ""}${c.units.length ? `<br>${esc(c.units.join(", "))}` : ""}</div>
    ${c.ability ? `<div class="txt ab">${esc(c.ability)}</div>` : ""}
    <div class="pc"><button id="pc">Close</button>${t ? `<button class="primary" id="pa">Add to turn ${n}</button>` : ""}</div></div>`);
  $("#pc", o).onclick = closeModal;
  if (t) $("#pa", o).onclick = () => { closeModal(); addPlayed(id); };
}
let hold = null;
function drawHandBar() {
  const bar = $("#handbar"); if (!bar) return;
  const r = H.last, hasHand = r && r.decks && r.decks.length;
  const g = T.guess !== false ? guessedDecks() : { guesses: [], note: "" };
  if (!hasHand && !g.guesses.length && !g.note) { bar.innerHTML = ""; bar.hidden = true; return; }
  bar.hidden = false;
  const seen = new Set(confirmedTurns().flat().map(nameOf)), played = new Set(playedCards().map(nameOf));
  const chip = (c, p, cls) => `<span class="${cls}" data-cid="${cidOf(c)}">${esc(c)}<b>${pct(p)}</b></span>`;
  let h = "";
  if (hasHand && !r.guessed) {  // known decks that fit
    const nT = confirmedTurns().length;
    h += `<div class="hbs"><div class="dbh"><b>Which deck?</b> <span class="dim">${r.decks.length} of ${r.pool} candidates fit, after ${nT} turn${nT > 1 ? "s" : ""}</span></div>` +
      r.decks.slice(0, 8).map(d => { const m = r.poolMeta[d.name], open = H.openDeck === d.name;
        return `<div class="drow2 ${open ? "on" : ""}" data-dk="${esc(d.name)}"><div class="nm">${esc(m.title)}<small>${facName(m.faction)} · ${esc(m.archetype)}</small></div>` +
          `<div class="track"><i style="width:${d.p * 100}%"></i></div><div class="v">${pct(d.p)}</div></div>` +
          (open ? `<div class="mini" style="margin:2px 6px 8px">${d.cards.map(c => chip(c, r.hand[c] || 0, seen.has(c) ? "seen" : "")).join("")}</div>` : ""); }).join("") +
      (r.decks.length > 8 ? `<p class="hint left">+ ${r.decks.length - 8} less likely decks</p>` : "") + `</div>`;
  }
  if (T.guess !== false && (g.guesses.length || g.note)) {  // guessed decks: only this section follows the toggle
    h += `<div class="hbs"><div class="dbh"><b>Guessed decks</b> <span class="dim">from the ${played.size} card${played.size === 1 ? "" : "s"} seen, your decks and ${state.fragments.length} fragment${state.fragments.length === 1 ? "" : "s"}; % = chance the card is in the deck. Tap a card to add it to the turn, hold for details</span></div>` +
      (g.guesses.length ? g.guesses.map((d, i) => { const open = (H.openGuess ?? 0) === i;
        return `<div class="drow2 grow ${open ? "on" : ""}" data-gk="${i}"><div class="nm">${esc(d.title)}<small>${facName(d.faction)} · ${esc(d.basis)}</small></div></div>` +
          (open ? `<div class="mini gchips">${d.list.map(x => chip(x.name, x.p, played.has(x.name) ? "seen" : "")).join("")}</div>` : ""); }).join("")
        : `<p class="hint left">No deck guessed: ${esc(g.note)}.</p>`) + `</div>`;
  }
  if (hasHand) {
    const ranked = Object.entries(r.hand).sort((a, b) => b[1] - a[1]);
    const hand = r.best_hand ? r.best_hand.cards.slice().sort((a, b) => (r.hand[b] || 0) - (r.hand[a] || 0)) : ranked.slice(0, HC.HAND_SIZE).map(x => x[0]);
    const others = ranked.filter(([c]) => !hand.includes(c)).slice(0, 6);
    h += `<div class="hbs"><div class="dbh"><b>Most probable hand now</b>${r.best_hand ? ` <span class="dim">exact hand ${pct(r.best_hand.p, 1)}</span>` : ""}${r.guessed ? ` <span class="dim">(from guessed decks)</span>` : ""}</div>
      <div class="hbrow">${hand.map(c => probCard(c, r.hand[c] || 0, seen.has(c))).join("")}</div></div>
    <div class="hbs"><div class="dbh"><b>Other cards it could hold</b></div>
      <div class="hbrow">${others.map(([c, p]) => probCard(c, p, seen.has(c))).join("")}</div></div>`;
  }
  bar.innerHTML = h;
  bar.onclick = e => {
    if (hold && hold.fired) { hold = null; return; }  // the long press already opened the card
    const card = e.target.closest("[data-cid]"), d = e.target.closest("[data-dk]"), gk = e.target.closest("[data-gk]");
    if (card) addPlayed(card.dataset.cid);
    else if (d) { H.openDeck = H.openDeck === d.dataset.dk ? null : d.dataset.dk; drawHandBar(); }
    else if (gk) { const i = +gk.dataset.gk; H.openGuess = (H.openGuess ?? 0) === i ? -1 : i; drawHandBar(); }
  };
  bar.onpointerdown = e => {
    const el = e.target.closest("[data-cid]"); if (!el) return;
    clearTimeout(hold && hold.t); hold = { fired: false };
    hold.t = setTimeout(() => { hold.fired = true; cardPopup(el.dataset.cid); }, 450);
  };
  const end = () => hold && clearTimeout(hold.t);
  bar.onpointerup = end; bar.onpointercancel = end; bar.onpointermove = e => { if (hold && !hold.fired && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) end(); };
  bar.oncontextmenu = e => { if (e.target.closest("[data-cid]")) e.preventDefault(); };
}
function drawResult() {
  drawHandBar();
  const box = $("#tout"); if (!box) return;
  const r = H.last, n = confirmedTurns().length;
  if (!r) { box.innerHTML = `<p class="hint">${n ? "No card seen yet: nothing to work from." : "Add the cards of turn 1 and tap Done."}</p>`; return; }
  const seen = new Set(confirmedTurns().flat().map(nameOf));
  if (!r.decks.length) {
    const why = r.guessed ? "No known deck holds all these cards, and none of the guessed decks can have produced these plays with a cycle every turn."
      : r.candidates ? `${r.candidates} deck(s) hold all the cards seen, but none can have produced these plays with a cycle every turn.` : "No candidate deck holds all these cards.";
    box.innerHTML = `<div class="note"><b>No candidate deck fits.</b> ${why}${r.guessNote ? ` No deck could be guessed: ${esc(r.guessNote)}.` : ""} The opponent has a deck this tool does not know, or a card is wrong (use Edit on a turn). Create a fragment or a deck from the played cards to remember it.</div>`;
    return;
  }
  let h = "";
  if (r.guessed) h += `<div class="note"><b>No known deck holds these cards: these are guesses.</b> Each guess is the cards seen plus cards chosen from your ${r.fragments} saved fragment${r.fragments === 1 ? "" : "s"} and ${r.knownDecks} known decks (which cards go together). The cards not seen yet are not facts, so the hand estimate is only as good as the guess. <b>Create fragment</b> after the game improves the next one.</div>`;
  h += `<h3>After its next cycle</h3><div class="mini">${Object.entries(r.next).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, p]) => `<span class="${seen.has(c) ? "seen" : ""}">${esc(c)}<b>${pct(p)}</b></span>`).join("")}</div>`;
  h += `<h3>Cards seen: in the hand again?</h3><div class="mini">${Object.entries(r.seen).sort((a, b) => b[1].p_hand - a[1].p_hand).map(([c, v]) => `<span class="seen">${esc(c)}<b>${pct(v.p_hand)}</b></span>`).join("")}</div>
    <p class="hint left">Gold: seen played, so in the deck for certain. Assumes the opponent cycles a card every turn; estimated from simulated games, so small percentages move a little between runs.</p>`;
  box.innerHTML = h;
  box.onclick = e => { const d = e.target.closest("[data-dk]"); if (d) { H.openDeck = H.openDeck === d.dataset.dk ? null : d.dataset.dk; drawResult(); } };
}

/* ---------- create a deck from the played cards ---------- */
function makeDeckDialog() {
  const ids = playedCards();
  if (!ids.length) return toast("No card played yet");
  const facs = [...new Set(ids.map(i => BYID[i].faction).filter(f => f !== "neutral"))];
  const top = H.last && H.last.decks && H.last.decks[0];
  const v = { faction: facs.length === 1 ? facs[0] : T.faction || (top ? H.last.poolMeta[top.name].faction : ""), name: "", archetype: "", type: "" };
  const cut = ids.length > DECK_SIZE;
  const o = openModal(`<div class="modal"><h2>Deck from played cards (${Math.min(ids.length, DECK_SIZE)})</h2>
    <div class="mini" style="margin-bottom:12px">${ids.map(i => `<span class="seen">${esc(nameOf(i))}<b>${BYID[i].mana}</b></span>`).join("")}</div>
    ${facs.length > 1 ? `<p class="hint left">These cards come from more than one faction: check the faction.</p>` : ""}
    ${cut ? `<p class="hint left">More than ${DECK_SIZE} cards: only the first ${DECK_SIZE} are kept.</p>` : ""}
    <div class="field"><label>Faction</label><div class="factions">${Object.entries(FACTIONS).map(([k, n]) => `<button type="button" class="f-${k} ${v.faction === k ? "sel" : ""}" data-f="${k}">${n}</button>`).join("")}</div></div>
    <div class="field"><label>Nickname</label><input id="dn" autocomplete="off" placeholder="e.g. Frost opponent"></div>
    <div class="field"><label>Archetype</label><div id="ca"></div></div>
    <div class="field"><label>Type</label><div id="ct"></div></div>
    <p class="hint left"><b>Create fragment</b> keeps these cards as statistics only (not a deck) and needs just the faction: no nickname, archetype or type. Tap it again in the same game to update the fragment.</p>
    <div class="actions"><button id="cancel">Cancel</button><button id="frag">Create fragment</button><button class="primary" id="ok">Save deck</button></div></div>`);
  o.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { v.faction = b.dataset.f; o.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("sel", x === b)); });
  const opts = key => () => { const same = uniq(state.decks.filter(d => d.faction === v.faction).map(d => d[key])); return same.concat(uniq(state.decks.map(d => d[key])).filter(a => !same.includes(a))); };
  combo($("#ca"), { value: "", placeholder: "Pick or create archetype…", onChange: x => v.archetype = x, options: opts("archetype") });
  combo($("#ct"), { value: "", placeholder: "Pick or create type…", onChange: x => v.type = x, options: opts("type") });
  $("#cancel").onclick = closeModal;
  $("#frag").onclick = () => {
    if (facs.length > 1) return toast("These cards come from more than one faction: a fragment holds one");
    if (!v.faction) return toast("Pick a faction");
    if (facs.length === 1 && facs[0] !== v.faction) return toast(`These cards are ${FACTIONS[facs[0]]}, not ${FACTIONS[v.faction]}`);
    const lastWithCards = T.turns.reduce((m, t, i) => t.cards.length ? i + 1 : m, 0);
    const rec = { id: uid(), game: T.game, cards: ids.slice(0, DECK_SIZE), faction: v.faction, date: new Date().toISOString().slice(0, 10),
      turns: Math.max(T.turns.filter(t => t.done).length, lastWithCards), updated: Date.now() };
    const at = state.fragments.findIndex(f => f.game === T.game);
    if (at >= 0) { const had = state.fragments[at]; state.fragments[at] = { ...had, ...rec, id: had.id, date: had.date }; } else state.fragments.push(rec);
    save(); closeModal(); drawInput();
    toast(`${at >= 0 ? "Fragment updated" : "Fragment saved"}: ${rec.cards.length} card${rec.cards.length === 1 ? "" : "s"}, ${FACTIONS[v.faction]} (${state.fragments.length} in all)`);
  };
  $("#ok").onclick = () => {
    v.name = $("#dn").value.trim();
    if (!v.faction) return toast("Pick a faction");
    if (!v.name) { $("#dn").focus(); return toast("Give the deck a nickname"); }
    state.decks.push({ id: uid(), name: v.name, faction: v.faction, archetype: v.archetype.trim(), type: v.type.trim(),
      cards: ids.slice(0, DECK_SIZE), saved: true, updated: Date.now() });
    save(); closeModal(); drawInput(); toast(`Saved deck “${v.name}”`);
  };
}
