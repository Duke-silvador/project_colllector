"use strict";
/* Hand calculator engine: a JavaScript port of stormbound/hand_calc.py (the Stormbound project).
   Same draw rules (a played or cycled card goes back with weight 1, every other card w -> 1.6w + 100, weighted draws,
   hand refilled to 4) and the same importance-sampling simulation. A card that goes back to the hand when played (Counselor Ahmi)
   stays in the hand (`returned`). */
const HC = (() => {
  const HAND_SIZE = 4, WEIGHT_MULT = 1.6, WEIGHT_ADD = 100, BOOST = 1.5;

  function makeRng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const sum = a => { let s = 0; for (const x of a) s += x; return s; };

  function returnToDeck(deck, weights, card) {
    for (let i = 0; i < weights.length; i++) weights[i] = WEIGHT_MULT * weights[i] + WEIGHT_ADD;
    deck.push(card); weights.push(1);
  }
  function draw(deck, weights, need, rng, force) {
    const total = sum(weights);
    let i, w;
    if (force != null) { i = deck.indexOf(force); w = weights[i] / total; }
    else {
      const boosted = deck.map((c, k) => weights[k] * (need.has(c) ? BOOST : 1));
      const tb = sum(boosted), r = rng() * tb;
      let acc = 0; i = deck.length - 1;
      for (let k = 0; k < boosted.length; k++) { acc += boosted[k]; if (r < acc) { i = k; break; } }
      w = (weights[i] / total) / (boosted[i] / tb);
    }
    const card = deck.splice(i, 1)[0]; weights.splice(i, 1);
    return [card, w];
  }
  function cycle(hand, deck, weights, keep, needNow, needLater, rng, must) {
    const cands = hand.filter(c => !keep.has(c));
    if (!cands.length) return 1;
    const raw = cands.map(c => needLater.has(c) ? 1 / BOOST : 1), tot = sum(raw), r = rng() * tot;
    let acc = 0, k = cands.length - 1;
    for (let j = 0; j < raw.length; j++) { acc += raw[j]; if (r < acc) { k = j; break; } }
    const factor = (tot / cands.length) / raw[k], card = cands[k];
    hand.splice(hand.indexOf(card), 1);
    returnToDeck(deck, weights, card);
    const missing = [...must].filter(c => !hand.includes(c));
    if (missing.length > 1) return 0;
    const [drawn, f] = draw(deck, weights, needNow, rng, missing.length ? missing[0] : null);
    hand.push(drawn);
    return factor * f;
  }
  /* back[t]: the cards of turn t that went back to the hand when played (Counselor Ahmi with no surrounding units): they stay in
     the hand, never reach the deck, and the other cards of the deck are not reweighed for them. */
  function particle(cards, turns, rng, cycleFirst, later, back) {
    const order = cards.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const deck = order.slice(), weights = []; let w = 1;
    for (let i = 0; i < order.length; i++) { weights.push(w); w = WEIGHT_MULT * w + WEIGHT_ADD; }
    const hand = []; let weight = 1;
    for (let i = 0; i < HAND_SIZE; i++) { const [c, f] = draw(deck, weights, later[0], rng, null); hand.push(c); weight *= f; }
    for (let t = 0; t < turns.length; t++) {
      const seen = turns[t], s = new Set(seen);
      if (cycleFirst) {
        const f = cycle(hand, deck, weights, s, later[t], later[t + 1], rng, s);
        if (f === 0) return null;
        weight *= f;
      }
      if (seen.some(c => !hand.includes(c))) return null;
      for (const c of seen) { if (back[t].has(c)) continue; hand.splice(hand.indexOf(c), 1); returnToDeck(deck, weights, c); }
      if (!cycleFirst) weight *= cycle(hand, deck, weights, new Set(), later[t + 1], later[t + 1], rng, new Set());
      while (hand.length < HAND_SIZE && deck.length) { const [c, f] = draw(deck, weights, later[t + 1], rng, null); hand.push(c); weight *= f; }
    }
    return { weight, hand, deck, weights };
  }

  /** decks: {name: [cards]}; turns: [[cards seen]]; returned: [[cards of that turn that went back to the hand]]
      -> {decks:[{name,p,cards}], hand, next, best_hand, seen, turns, candidates} */
  function analyse(decks, turns, { n = 6000, seed = 1, cycleFirst = true, maxTotal = 60000, returned = [] } = {}) {
    turns = turns.map(t => t.filter(Boolean));
    const back = turns.map((t, i) => new Set((returned[i] || []).filter(c => t.includes(c))));
    const seenAll = new Set(turns.flat());
    const cand = {};
    for (const [name, cards] of Object.entries(decks)) if ([...seenAll].every(c => cards.includes(c))) cand[name] = cards;
    const names = Object.keys(cand);
    if (names.length && names.length * n > maxTotal) n = Math.max(1500, Math.floor(maxTotal / names.length));
    const later = []; for (let j = 0; j < turns.length + 2; j++) later.push(new Set(j < turns.length ? turns.slice(j).flat() : []));
    const rng = makeRng(seed), perDeck = {}, handsNow = {}, handsNext = {}, sets = {};
    for (const name of names) {
      let total = 0; const mh = {}, mn = {}, ms = {};
      for (let it = 0; it < n; it++) {
        const p = particle(cand[name], turns, rng, cycleFirst, later, back);
        if (!p || p.weight <= 0) continue;
        const { weight: w, hand, deck, weights } = p;
        total += w;
        for (const c of hand) mh[c] = (mh[c] || 0) + w;
        const key = hand.slice().sort().join("\u0001"); ms[key] = (ms[key] || 0) + w;
        const h2 = hand.slice(), d2 = deck.slice(), w2 = weights.slice();
        const c = h2[Math.floor(rng() * h2.length)];
        h2.splice(h2.indexOf(c), 1); returnToDeck(d2, w2, c);
        if (d2.length) {
          const tot2 = sum(w2), r = rng() * tot2; let acc = 0, i = d2.length - 1;
          for (let k = 0; k < w2.length; k++) { acc += w2[k]; if (r < acc) { i = k; break; } }
          h2.push(d2[i]);
        }
        for (const x of h2) mn[x] = (mn[x] || 0) + w;
      }
      perDeck[name] = total / n; handsNow[name] = mh; handsNext[name] = mn; sets[name] = ms;
    }
    const out = { turns: turns.length, candidates: names.length, decks: [], hand: {}, next: {}, seen: {} };
    const z = sum(Object.values(perDeck));
    if (!(z > 0)) return out;
    const best = {};
    for (const [name, lik] of Object.entries(perDeck).sort((a, b) => b[1] - a[1])) {
      if (lik <= 0) continue;
      const p = lik / z, tot = lik * n;
      out.decks.push({ name, p, cards: cand[name] });
      for (const [c, w] of Object.entries(handsNow[name])) out.hand[c] = (out.hand[c] || 0) + p * w / tot;
      for (const [c, w] of Object.entries(handsNext[name])) out.next[c] = (out.next[c] || 0) + p * w / tot;
      for (const [k, w] of Object.entries(sets[name])) best[k] = (best[k] || 0) + p * w / tot;
    }
    let bk = null, bp = -1; for (const [k, p] of Object.entries(best)) if (p > bp) { bk = k; bp = p; }
    if (bk !== null) out.best_hand = { cards: bk.split("\u0001"), p: bp };
    for (const c of [...seenAll].sort()) out.seen[c] = { p_hand: out.hand[c] || 0 };
    return out;
  }
  return { analyse, HAND_SIZE };
})();
