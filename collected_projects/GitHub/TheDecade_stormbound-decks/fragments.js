"use strict";
/* Fragment statistics and guessed decks: a JavaScript port of stormbound/fragments.py (the Stormbound project, plan.md 12.16).
   A fragment is an incomplete list of the cards an opponent was seen playing. From a set of rows (the fragments and the known decks,
   each {cards: [names], faction: "ironclad"|..., id, title, kind: "fragment"|"deck"}) this counts how often each card, and each pair
   of cards, appears, and when the hand calculator meets cards that no known deck holds it builds guessed decks:
   the cards seen plus cards chosen by the statistics. Same formulas and tie-breaks as the Python code. */
const FR = (() => {
  const ALPHA = 2.0;   // P(b | a) is pulled towards the base rate of b by this many pseudo-games: one shared game is weak evidence
  const MAX_CARDS = 12;
  const FACTION_KEYS = ["ironclad", "shadowfen", "swarm", "winter"];
  const key2 = (a, b) => a < b ? a + "\u0001" + b : b + "\u0001" + a;

  class Corpus {
    constructor(rows) {
      this.rows = rows.filter(r => r.cards && r.cards.length);
      this.n = this.rows.length;
      this.count = new Map();
      this.pairs = new Map();
      this._scopes = {};
      for (const r of this.rows) {
        const cs = [...new Set(r.cards)].sort();
        for (const c of cs) this.count.set(c, (this.count.get(c) || 0) + 1);
        for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
          const k = key2(cs[i], cs[j]);
          this.pairs.set(k, (this.pairs.get(k) || 0) + 1);
        }
      }
    }
    /** Only the rows of one faction (rows whose faction is unknown are left out); no faction = every row. */
    scope(faction) {
      if (!faction) return this;
      if (!this._scopes[faction]) this._scopes[faction] = new Corpus(this.rows.filter(r => r.faction === faction));
      return this._scopes[faction];
    }
    cnt(card) { return this.count.get(card) || 0; }
    together(a, b) { return this.pairs.get(key2(a, b)) || 0; }
    /** Base rate of a card: the share of rows that hold it (with a small floor, so that no card is impossible). */
    p(card) { return (this.cnt(card) + 0.5) / (this.n + 1.0); }
    /** Smoothed P(b in a row | a in the row). */
    pGiven(b, a) { return (this.together(a, b) + ALPHA * this.p(b)) / (this.cnt(a) + ALPHA); }
    /** How much more often b comes with a than chance says (1 = no link, 2 = twice as often). */
    lift(b, a) { return this.pGiven(b, a) / this.p(b); }
    topCards(top = 20) {
      if (!this.n) return [];
      return [...this.count.entries()].sort((x, y) => y[1] - x[1]).slice(0, top).map(([card, n]) => ({ card, n, share: n / this.n }));
    }
    /** The cards that come with `card`: by "n" the most often, by "lift" the most "attracted" (needs minSupport rows). */
    goesWith(card, by = "n", top = 10, minSupport = 1) {
      const na = this.cnt(card), out = [];
      for (const [b, nb] of this.count) {
        const n = this.together(card, b);
        if (b === card || n < Math.max(1, minSupport)) continue;
        out.push({ card: b, n, p_given: na ? n / na : 0, lift: this.lift(b, card), of: nb });
      }
      out.sort((x, y) => (y[by] - x[by]) || (y.n - x.n) || (x.card < y.card ? -1 : x.card > y.card ? 1 : 0));
      return out.slice(0, top);
    }
    /** Chance that `card` is in the deck of an opponent seen with `seen`: the share of the rows that hold it, each row weighted by how many of
        the seen cards it shares (squared), pulled towards the card's base rate. */
    inclusion(seen, card) {
      let sw = 0, sc = 0;
      for (const r of this.rows) {
        const shared = seen.filter(c => r.cards.includes(c)).length;
        if (!shared) continue;
        const w = (shared / seen.length) ** 2;
        sw += w;
        if (r.cards.includes(card)) sc += w;
      }
      return (sc + ALPHA * this.p(card)) / (sw + ALPHA);
    }
    /** Naive-Bayes log score of `card` being in a deck that holds `seen`: popularity times the lifts. */
    score(seen, card) {
      let s = Math.log(this.p(card));
      for (const a of seen) s += Math.log(this.lift(card, a));
      return s;
    }
  }

  function cardInfo(corpus, card) {
    const n = corpus.cnt(card);
    return { card, n, of: corpus.n, share: corpus.n ? n / corpus.n : 0 };
  }

  /** Add cards of `pool` to `base` one at a time (the best score given everything chosen so far) up to `size`. */
  function fill(base, pool, corpus, size = MAX_CARDS) {
    const deck = base.slice(), rest = pool.filter(c => !base.includes(c));
    while (deck.length < size && rest.length) {
      let best = null, bs = -Infinity;
      for (const c of rest) {
        const s = Math.round(corpus.score(deck, c) * 1e9);  // scores equal to 9 decimals tie: the name decides (as in the Python code)
        if (best === null || s > bs || (s === bs && c > best)) { best = c; bs = s; }
      }
      deck.push(best);
      rest.splice(rest.indexOf(best), 1);
    }
    return deck;
  }

  /** Guess the decks an opponent can have when no known deck holds all the cards seen.
      seenIn: card names; cards: the card list ({name, faction, rarity}); rows: the corpus; labels: faction key -> display name.
      Returns {guesses: [{name, title, faction, archetype: "Guess", cards, basis}], note} (note: why there is none). */
  function guessDecks(seenIn, cards, rows, { k = 4, labels = {}, faction = null } = {}) {
    const byName = Object.fromEntries(cards.map(c => [c.name, c]));
    const seen = [...new Set(seenIn)];
    if (!seen.length) return { guesses: [], note: "no card seen" };
    if (seen.length > MAX_CARDS) return { guesses: [], note: `${seen.length} different cards seen: more than a deck holds, a card is wrong` };
    const unknown = seen.filter(c => !byName[c]);
    if (unknown.length) return { guesses: [], note: "unknown card " + unknown[0] };
    const found = [...new Set(seen.map(c => byName[c].faction).filter(f => f !== "neutral"))].sort();
    if (found.length > 1) return { guesses: [], note: "cards of more than one faction: " + found.map(f => labels[f] || f).join(", ") };
    const derived = found[0] || faction || null;  // the faction of the cards seen, else the one given (public at the start of a game)
    const corpus = new Corpus(rows);
    let facs = derived ? [derived] : FACTION_KEYS.slice();
    if (!derived) {  // only neutral cards: the faction is open, keep the two the data likes most
      const liking = f => { const sc = corpus.scope(f); return seen.reduce((a, c) => a + sc.cnt(c), 0) / (sc.n + 1.0); };
      facs.sort((a, b) => (liking(b) - liking(a)) || (a < b ? -1 : a > b ? 1 : 0));
      facs = facs.slice(0, 2);
    }
    const limit = derived ? k : Math.max(2, Math.floor(k / 2));
    const need = Math.ceil(seen.length / 2);
    const out = [];
    for (const f of facs) {
      const sc = corpus.scope(f), name = labels[f] || f;
      const pool = cards.filter(c => c.rarity && (c.faction === f || c.faction === "neutral") && !seen.includes(c.name)).map(c => c.name);
      const near = [];
      for (const r of sc.rows) {
        const shared = seen.filter(c => r.cards.includes(c)).length;
        if (shared >= need) near.push({ shared, len: r.cards.length, notDeck: r.kind !== "deck" ? 1 : 0, id: String(r.id), r });
      }
      near.sort((x, y) => (y.shared - x.shared) || (y.len - x.len) || (x.notDeck - y.notDeck) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
      const guesses = near.slice(0, 3).map(({ shared, r }) => {
        const extra = r.cards.filter(c => !seen.includes(c));
        return { deck: fill(fill(seen, extra, sc, MAX_CARDS), pool, sc), basis: `like ${r.title} (${shared} of ${seen.length} cards in common)` };
      });
      const stat = { deck: fill(seen, pool, sc), basis: `typical ${name} deck with these cards, from the card statistics` };
      const ordered = guesses.slice(0, 2).concat([stat], guesses.slice(2));
      const taken = [], keys = new Set();
      for (const { deck, basis } of ordered) {
        const key = deck.slice().sort().join("\u0001");
        if (keys.has(key) || taken.length >= limit) continue;
        keys.add(key);
        taken.push({ deck, basis });
      }
      taken.forEach(({ deck, basis }, i) => out.push({ name: `guess:${f}:${i + 1}`, title: `Guess ${out.length + 1}`, faction: f,
        archetype: "Guess", cards: deck, basis }));
    }
    return { guesses: out, note: "" };
  }

  return { Corpus, cardInfo, guessDecks, fill, FACTION_KEYS, MAX_CARDS };
})();
if (typeof module !== "undefined") module.exports = FR;
