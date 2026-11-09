"use strict";
/* Deck-type guessing from the cards seen in a game: a JavaScript port of stormbound/archetypes.py (the Stormbound project, plan.md 12.16).
   A profile (an archetype file: data/decks/archetypes/<name>.json) says what a type of deck looks like:
     {format: "archetype", name, title, faction, archetype (rush|tempo|midrange|control|combo, or two joined by "/"), type,
      groups: {"0": [core cards], "1": [common], "2": [uncommon], ...}, weights: {"0": 1.0, "1": 0.6, ...}}
   The group numbers are depth levels; a card is in one group only; a card in no group is off-list. A level without a weight gets the
   weight of the level before it times FALL. Same formulas, constants and tie-breaks as the Python code (tests/test_archetypes_parity.py
   runs both on the same cases). Nothing here names a card. The visibility correction (a card only shows once played) is not applied. */
const AR = (() => {
  const ARCHETYPES = ["rush", "tempo", "midrange", "control", "combo"];
  const FACTION_NAMES = { winter_pact: "Winter Pact", winter: "Winter Pact", swarm: "Swarm of the East", ironclad: "Ironclad Union", shadowfen: "Shadowfen Cabal" };
  const UNKNOWN = "Unknown";
  const Q_TOP = 0.95, Q_OFF = 0.03, Q_OTHER = 0.10, FALL = 0.5, POS = 0.6, NEG = 0.15, TOTAL = 3.0;
  const PRIOR_UNKNOWN = 0.15, PRIOR_A = 0.5, MIN_GAMES_TYPE = 3, LEVEL = 0.90;

  /** The display name of a faction key of cards.json ("winter" -> "Winter Pact"; "neutral" -> "Neutral"). */
  const cardFaction = f => (f === "neutral" || !f) ? "Neutral" : (FACTION_NAMES[f] || f);
  /** The key of cards.json for a faction name ("Winter Pact" -> "winter"). */
  const factionKey = name => { const n = String(name).toLowerCase(); return n.startsWith("winter") ? "winter" : n.startsWith("swarm") ? "swarm" : n.startsWith("ironclad") ? "ironclad" : n.startsWith("shadowfen") ? "shadowfen" : null; };

  function factionName(s) {
    const key = String(s).trim().toLowerCase().replace(/ /g, "_");
    if (FACTION_NAMES[key]) return FACTION_NAMES[key];
    const hit = Object.values(FACTION_NAMES).find(v => v.toLowerCase() === String(s).trim().toLowerCase());
    return hit || String(s);
  }

  class Profile {
    constructor(o) { Object.assign(this, o); }
    get archetype() { return this.archetypes.join("/"); }
    weight(card) { const lv = this.levelOf.get(card); return lv === undefined ? 0.0 : this.weightOf.get(lv); }
    q(card) { return Q_OFF + (Q_TOP - Q_OFF) * this.weight(card); }
  }

  /** A Profile from the JSON of an archetype file. `cards` (the card list, with faction keys) is optional: with it the cards and the faction are checked. */
  function parseProfile(data, cards = null) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("an archetype needs a name");
    const raw = data.archetype;
    const archs = (Array.isArray(raw) ? raw : String(raw == null ? "" : raw).split("/")).map(a => String(a).trim().toLowerCase()).filter(Boolean);
    if (!archs.length || archs.length > 2 || archs.some(a => !ARCHETYPES.includes(a)))
      throw new Error(`${name}: archetype must be one of ${ARCHETYPES.join(", ")} (or two of them for a hybrid), got ${JSON.stringify(raw)}`);
    const groups = data.groups;
    if (!groups || typeof groups !== "object" || Array.isArray(groups) || !Object.keys(groups).length) throw new Error(`${name}: groups must be an object {level: [cards]}`);
    const levelOf = new Map(), keys = [];
    for (const [key, list] of Object.entries(groups)) {
      const lv = Number(String(key).trim());
      if (String(key).trim() === "" || !Number.isInteger(lv)) throw new Error(`${name}: group ${JSON.stringify(key)} is not a number`);
      if (lv < 0 || !Array.isArray(list)) throw new Error(`${name}: group ${key} must be a list of cards, with a level of 0 or more`);
      keys.push(lv);
      for (const c of list) {
        if (levelOf.has(c)) throw new Error(`${name}: ${JSON.stringify(c)} is in more than one group`);
        levelOf.set(c, lv);
      }
    }
    const top = Math.max(...levelOf.values(), ...keys);
    const given = new Map(Object.entries(data.weights || {}).map(([k, v]) => [Number(k), Number(v)]));
    if ([...given.values()].some(w => !(w > 0.0 && w <= 1.0))) throw new Error(`${name}: a weight must be above 0 and at most 1`);
    const weightOf = new Map();
    let prev = null;
    for (let lv = 0; lv <= top; lv++) {
      const w = given.has(lv) ? given.get(lv) : (prev === null ? 1.0 : prev * FALL);
      weightOf.set(lv, w); prev = w;
    }
    const faction = factionName(data.faction || "");
    const prof = new Profile({ name, title: String(data.title || name), faction, archetypes: archs, type: String(data.type || name), levelOf, weightOf });
    if (cards) {
      const byName = new Map(cards.map(c => [c.name, c])), facs = new Set();
      for (const c of levelOf.keys()) {
        if (!byName.has(c)) throw new Error(`${name}: unknown card ${JSON.stringify(c)}`);
        facs.add(cardFaction(byName.get(c).faction));
      }
      facs.delete("Neutral");
      if (facs.size > 1) throw new Error(`${name}: cards of more than one faction (${[...facs].sort().join(", ")})`);
      if (facs.size && !facs.has(faction)) throw new Error(`${name}: faction is ${faction} but its cards are ${[...facs].sort().join(", ")}`);
    }
    return prof;
  }

  /** Every valid archetype file of a list (the bundle): files that are not archetypes and the placeholder example are skipped; a bad one is reported in `errors`. */
  function loadProfiles(list, cards = null, includeExamples = false) {
    const profiles = [], errors = [];
    for (const d of list || []) {
      if (!d || d.format !== "archetype" || (d.example && !includeExamples)) continue;
      try { profiles.push(parseProfile(d, cards)); } catch (e) { errors.push(e.message); }
    }
    return { profiles, errors };
  }

  // ---------------------------------------------------------------- one game
  const squeeze = x => TOTAL * Math.tanh(x / TOTAL);
  const clamp = e => Math.max(-NEG, Math.min(POS, e));

  /** The verdict of one game from the cards seen (names). Same result shape as classify_game in Python. */
  function classifyGame(seenIn, profiles, cards = null) {
    const byName = cards ? new Map(cards.map(c => [c.name, c])) : null;
    const seen = [...new Set(seenIn.filter(c => c && (!byName || byName.has(c))))];
    let note = "";
    let factions = new Set();
    if (byName) { factions = new Set(seen.map(c => cardFaction(byName.get(c).faction))); factions.delete("Neutral"); }
    if (factions.size > 1)
      return { faction: { [UNKNOWN]: 1.0 }, archetype: { [UNKNOWN]: 1.0 }, type: { [UNKNOWN]: 1.0 }, faction_certain: false, hybrid: false, profiles: [], seen: seen.length, note: "cards of more than one faction seen: a card is wrong" };
    const fixed = factions.size ? [...factions][0] : null;
    const cand = profiles.filter(p => !fixed || p.faction === fixed);
    if (!seen.length) note = "no card seen";
    const back = {};
    for (const c of seen) back[c] = (cand.reduce((s, x) => s + x.q(c), 0) + Q_OTHER) / (cand.length + 1);
    const scores = {}, detail = {};
    for (const p of cand) {
      let s = 0.0; const d = {};
      for (const c of seen) { const e = clamp(Math.log(p.q(c) / back[c])); d[c] = e; s += e; }
      scores[p.name] = squeeze(s); detail[p.name] = d;
    }
    const rest = cand.length ? (1.0 - PRIOR_UNKNOWN) / cand.length : 0.0;
    const mass = {};
    for (const p of cand) mass[p.name] = rest * Math.exp(scores[p.name]);
    let us = 0.0; for (const c of seen) us += clamp(Math.log(Q_OTHER / back[c]));
    const unk = squeeze(us);
    mass[UNKNOWN] = cand.length ? PRIOR_UNKNOWN * Math.exp(unk) : 1.0;
    const z = Object.values(mass).reduce((a, b) => a + b, 0), post = {};
    for (const [k, v] of Object.entries(mass)) post[k] = v / z;
    const out = { faction: {}, archetype: {}, type: {} };
    for (const p of cand) {
      const w = post[p.name];
      out.faction[p.faction] = (out.faction[p.faction] || 0.0) + w;
      for (const a of p.archetypes) out.archetype[a] = (out.archetype[a] || 0.0) + w / p.archetypes.length;
      out.type[p.title] = (out.type[p.title] || 0.0) + w;
    }
    const u = post[UNKNOWN];
    if (fixed) out.faction = { [fixed]: 1.0 }; else out.faction[UNKNOWN] = u;
    out.archetype[UNKNOWN] = u; out.type[UNKNOWN] = u;
    const top = Object.entries(post).filter(([k]) => k !== UNKNOWN).map(([, w]) => w).sort((a, b) => b - a);
    const archTop = Object.entries(out.archetype).filter(([k]) => k !== UNKNOWN).map(([k, v]) => [v, k]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0));
    const hybrid = archTop.length > 1 && archTop[1][0] >= 0.25 * archTop[0][0] && archTop[1][0] >= 0.1;
    if (!cand.length && seen.length) note = note || "no profile for this faction yet";
    const sorted = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
    return { faction: sorted(out.faction), archetype: sorted(out.archetype), type: sorted(out.type), faction_certain: !!fixed, hybrid,
      profiles: cand.slice().sort((a, b) => post[b.name] - post[a.name]).map(p => ({ name: p.name, title: p.title, p: post[p.name], cards: detail[p.name] })),
      seen: seen.length, note, top_p: top.length ? top[0] : 0.0 };
  }

  // ---------------------------------------------------------------- the Beta ranges
  function lgamma(x) {  // Lanczos approximation (g = 7), good to about 1e-15 for x > 0
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = c[0]; const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const tiny = 1e-30, qab = a + b, qap = a + 1.0, qam = a - 1.0;
    let c = 1.0, d = 1.0 - qab * x / qap;
    d = 1.0 / (Math.abs(d) > tiny ? d : tiny);
    let h = d;
    for (let m = 1; m < 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1.0 + aa * d; d = 1.0 / (Math.abs(d) > tiny ? d : tiny);
      c = 1.0 + aa / c; c = Math.abs(c) > tiny ? c : tiny;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1.0 + aa * d; d = 1.0 / (Math.abs(d) > tiny ? d : tiny);
      c = 1.0 + aa / c; c = Math.abs(c) > tiny ? c : tiny;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1.0) < 1e-12) break;
    }
    return h;
  }
  /** Regularised incomplete beta function I_x(a, b). */
  function betaCdf(x, a, b) {
    if (x <= 0.0) return 0.0;
    if (x >= 1.0) return 1.0;
    const lnFront = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1.0 - x);
    if (x < (a + 1.0) / (a + b + 2.0)) return Math.exp(lnFront) * betacf(a, b, x) / a;
    return 1.0 - Math.exp(lnFront) * betacf(b, a, 1.0 - x) / b;
  }
  function betaQuantile(p, a, b) {
    let lo = 0.0, hi = 1.0;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (betaCdf(mid, a, b) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  /** Credible range of one category that holds nK of n games' worth of probability among k categories (Dirichlet marginal). */
  function interval(nK, n, k, level = LEVEL, a = PRIOR_A) {
    const A = a + nK, B = a * (k - 1) + (n - nK), tail = (1.0 - level) / 2;
    return { p: A / (A + B), low: betaQuantile(tail, A, B), high: betaQuantile(1.0 - tail, A, B), n: nK };
  }

  // ---------------------------------------------------------------- many games
  /** The overview of many games (rows {cards: [names], ...}). Same shape as overview in Python:
      {games, visibility_corrected: false, faction: [...], archetype: [...], type: [...]}, each a list of {name, p, low, high, n, supported} sorted by p. */
  function overview(games, profiles, cards = null, level = LEVEL) {
    const verdicts = games.filter(g => g.cards && g.cards.length).map(g => classifyGame(g.cards, profiles, cards));
    const n = verdicts.length, out = { games: n, visibility_corrected: false };
    const names = {
      faction: [...new Set(profiles.map(p => p.faction))].sort().concat([UNKNOWN]),
      archetype: ARCHETYPES.filter(a => profiles.some(p => p.archetypes.includes(a))).concat([UNKNOWN]),
      type: [...new Set(profiles.map(p => p.title))].sort().concat([UNKNOWN]),
    };
    for (const [lv, cats] of Object.entries(names)) {
      const counts = {};
      for (const c of cats) counts[c] = 0.0;
      for (const v of verdicts) for (const [c, w] of Object.entries(v[lv])) counts[c] = (counts[c] || 0.0) + w;
      const k = Object.keys(counts).length, rows = [];
      for (const [c, nk] of Object.entries(counts)) rows.push({ name: c, ...interval(nk, n, k, level), supported: lv !== "type" || nk >= MIN_GAMES_TYPE });
      out[lv] = rows.sort((a, b) => (b.p - a.p) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    }
    return out;
  }

  return { ARCHETYPES, UNKNOWN, MIN_GAMES_TYPE, LEVEL, Profile, parseProfile, loadProfiles, classifyGame, overview, interval, betaCdf, betaQuantile, lgamma, cardFaction, factionKey, factionName };
})();
if (typeof module !== "undefined") module.exports = AR;
