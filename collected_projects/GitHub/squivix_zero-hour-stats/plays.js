// the plays: a sortie of the seat record named the way the Build orders tab words it ("Humvees -> supply
// harassment", "Dozer Drop -> tunnel deny", "Dragon Tank -> Supply Center + 2 Power Plants"), plus the
// structure items and their counted wording. One copy for the Build orders and Win rates tabs (2026-09-14):
// a page calls window.ZH_PLAYS(Z) once the dataset is ready and destructures what it uses; reset() after
// the Naming switch changes, since the names and keys follow F.merge.
window.ZH_PLAYS = function (Z) {
  const { D, F, CLS_COLOR } = Z;
  const UPGS = D.bo_upgrades || [];
  // a first move is a group crossing the 3/4 line to the opponent's side (a sortie of the seat record), written out as the units
  // that crossed - no intent read into it (the user, 2026-09-13: "less fudging, no arbitrary labels like rush or
  // harassment, just report the first units"); only the plays unambiguous by their composition keep a name.
  // a sortie's family = what the group's first order was at; the play / state cut (the user, 2026-09-13): a
  // PLAY left the base and did something - an order at their gatherers, dozer, base, army, a derrick, a garrison -
  // and reads "units -> target"; a crossing with no target (move, scout) is not a play; after the plays comes the
  // STATE - the rest of the units it had made by the clock, sitting in base and accumulating (every seat, 2026-09-14)
  // the wording (the user, 2026-09-13): a capturer met is "capture deny" (a derrick nearly always), their gatherers
  // "Supply Harassment", their army by where it stood - "Army at Opponent Base" / "Army in the Middle" (neutral: we do
  // not know if it is defence, attack or harassment, and a bare "Humvees" read as units made, not a play - the user,
  // 2026-09-13) - and the rest plainly, no "their"; every play and target in title case (the user, 2026-09-14)
  // a deny is an order at a structure of theirs going up or at the worker building it (crushing that worker IS the
  // deny; crushing one gathering is supply harassment - the user, 2026-09-14); the building behind a construct or a
  // deny is named from its template, never guessed: a first order the record cannot name leaves the play bare
  // a sortie in the "so" runs: 6 header ints (s, along, units, family, upgrade, target template), then a count and that
  // many structures of theirs it took down, a count and those it was ordered at, a count and that many (template, count,
  // carrier) composition entries - no padding since 2026-09-14 (it was 65% of the run), so a reader walks by the counts:
  // soAt(so, j) lays one out, soNext(so, j) is the next sortie's start
  const soAt = (so, j) => { const nd = so[j + 6], dAt = j + 7, nh = so[dAt + nd], hAt = dAt + nd + 1, nc = so[hAt + nh], cAt = hAt + nh + 1; return { dAt, nd, hAt, nh, cAt, nc, next: cAt + 3 * nc }; };
  const soNext = (so, j) => soAt(so, j).next;
  const SC = D.bo_comp || 4;
  const FAMILIES = D.bo_families || [];
  const TARGET = { army: 'Army', army_base: 'Army at Opponent Base', army_mid: 'Army in the Middle', gatherer_truck: 'Supply Harassment', gatherer_chinook: 'Supply Harassment', gatherer_worker: 'Supply Harassment', dozer: 'Dozer',
    capturer: 'Capture Deny', supply: 'Supply', production: 'Production', tech: 'Base', power: 'Power', defense: 'Defence', tunnel: 'Tunnel', tunnel_deny: 'Tunnel Deny', cc: 'CC',
    structure_other: 'Base', enemy_derrick: 'Derrick', neutral_derrick: 'Derrick', capture: 'Capture', neutral_tech: 'Tech Building', garrison: 'Garrison', garrison_held: 'Garrison Clear', garrisoned: 'Garrisoned Building', dock: 'Opponent Supplies' };   // garrison = gone into a neutral building; garrison_held = one they hold, hit by a unit that clears garrisons; garrisoned = one they hold, shot at by anything else (the user, 2026-09-14)
  // their workers met by a ground vehicle is a crush ("supply worker crush" - the user, 2026-09-14), by anything else "supply workers"
  // a "deny" at a civilian building of theirs (a Wood Tower they garrisoned - it never finishes, so a record before
  // 2026-09-14 read it as going up) is their garrison (the user, 2026-09-14)
  // a structure family with its template (a location order that landed by their War Factory, in records since
  // 2026-09-14) is named by the building, like an order at it - not "Production" beside it (the user, 2026-09-14)
  const STRUCT_FAM = new Set(['supply', 'production', 'tech', 'power', 'defense', 'tunnel', 'cc', 'structure_other', 'enemy_derrick']);
  const targetOf = (fam, tt, crusher) => fam === 'construct' ? (tt >= 0 ? 'Forward ' + itemOfT(tt).n : undefined) : fam === 'build_deny' ? (tt >= 0 ? (D.templates[tt].side === '?' ? 'Garrison' : itemOfT(tt).n + ' Scaffold Reset') : 'Scaffold Reset')   // a deny is a tunnel's; another structure's scaffold is reset (the user, 2026-09-14)
    : fam === 'gatherer_worker' ? (crusher ? 'Supply Worker Crush' : 'Supply Workers') : STRUCT_FAM.has(fam) && tt >= 0 ? itemOfT(tt).n : TARGET[fam];
  const CRUSHES = t => t.cls === 'vehicle' || (t.cls === 'economy' && /Dozer|Truck/.test(t.raw));   // dozers and supply trucks crush too (the user, 2026-09-14: "dozer -> supply workers crush")
  // the units, in title case with no shorthand beyond MD / Terror / RPG / Tech / Outpost (the user, 2026-09-13).
  // Plays unambiguous by what crossed keep a fixed name: a load in a Chinook is "<load> Drop" (MD Drop, Dozer Drop,
  // MD + Dozer Drop), a vehicle in a Helix "<load> Drop" (Dragon Tank Drop - infantry in a Helix is a bunker, not a
  // drop, and an evacuating Helix is not a play; the user: "a true helix drop would be something like a dragon
  // tank"), a load in a Technical "<load> Tech" (Terror Tech, RPG Tech, Terror + RPG Tech, RPG + Worker Tech = the
  // escorted worker building in their base), supply trucks sent over "Truck Rush" (trucks are never commanded
  // otherwise), terrorists on foot "Forward Terrorist", and Humvees - any number, any riders, Rangers and an
  // Ambulance along or not - "Humvees" (the user, 2026-09-13: the USA meta is a critical mass of vees with one ambo,
  // the default rather than a play; "Humvee (MD)" and "3+ Humvee + Ambulance" were one thing split, and a Ranger
  // alongside is not a different build either). Everything else is the
  // composition as it crossed: "Battle Master + Gattling Tank", "Technical" - counts capped at 3+ like the production chips,
  // and a load is named by kind only (how many MDs rode along split the builds for nothing - the user, 2026-09-13).
  // A worker, dozer or chinook on its own is never a move (it gathers or builds).
  const SHORT_UNIT = { 'Missile Defender': 'MD', 'Tunnel Defender': 'RPG', 'Listening Outpost': 'Outpost' };
  const LOAD_SHORT = { 'Terrorist': 'Terror' };   // only as a load ("Terror Tech"): a loose one is a Terrorist, "Terror" is not a unit (the user, 2026-09-14)
  // the generic name (t.n: a Nuke Battle Master is a Battle Master, an Assault Helix a Helix); the three Technical chassis are one Technical
  const RAW_N = [];   // per template: a regex test per call, and describeMoves calls it per unit per seat
  const rawName = ti => { let n = RAW_N[ti]; if (n === undefined) { const t = ti >= 0 ? D.templates[ti] : null; n = RAW_N[ti] = !t ? '' : /^Technical/.test(t.n) ? 'Technical' : t.n; } return n; };
  // a play is worded by the merged name, so a variant that plays differently is its own play: the Nuke
  // General's Battle Master crushing workers is not the vanilla one's (the user, 2026-09-14); the logic
  // above (rides, balls, lone units) keeps reading the raw name, which every variant shares
  const mergedName = ti => { const t = ti >= 0 ? D.templates[ti] : null; if (!t) return ''; const n = F.merge === 'all' ? t.n : F.merge === 'none' ? t.raw : t.m; return /^Technical/.test(n) ? 'Technical' : n; };
  const unitName = ti => { const n = mergedName(ti); return SHORT_UNIT[n] || n || 'units'; };
  const loadUnit = ti => { const n = unitName(ti); return LOAD_SHORT[n] || n; };
  // a load in a fixed order, so "Terror + RPG Tech" is one play whichever kind was more numerous
  const LOAD_ORDER = ['MD', 'Dozer', 'Terror', 'RPG', 'Worker'];
  const loadRank = n => { const i = LOAD_ORDER.indexOf(n); return i < 0 ? LOAD_ORDER.length : i; };
  const loadName = names => [...new Set(names)].sort((a, b) => loadRank(a) - loadRank(b) || (a < b ? -1 : a > b ? 1 : 0)).join(' + ');
  const FIXED = new Set(['Truck Rush', 'Forward Terrorist']);
  const HUMVEE_BALL = new Set(['Humvee', 'Ambulance', 'Ranger']);   // what rides with the vees without making another build
  const LONE = new Set(['Worker', 'Dozer', 'Chinook', 'Supply Truck']);   // the gatherers and builders
  const ARMY = new Set(['army', 'army_base', 'army_mid']);   // the families a vee ball meets without it being a play
  const cnt = k => k >= 3 ? '3+ ' : k > 1 ? `${k} ` : '';
  // a counted kind is plural - "2 RPGs", "3+ Battle Masters" (the user, 2026-09-14); a raw code name (the Naming switch) stays as it is
  const many = (k, name) => k > 1 && F.merge !== 'none' ? plurals(name) : name;
  const isVehicle = ti => { const t = D.templates[ti]; return !!t && t.cls !== 'infantry'; };
  // ents = [{ti, k, ci}] most numerous first (ci = the ride's template or -1); n = every unit in the group
  const playName = (ents, n, upg) => {
    const kinds = new Set(ents.map(e => rawName(e.ti))), rides = new Set(ents.filter(e => e.ci >= 0).map(e => rawName(e.ci)));
    const loads = pred => ents.filter(e => e.ci >= 0 && pred(rawName(e.ci), e)).map(e => loadUnit(e.ti));
    if ([...rides].some(r => /Chinook$/.test(r))) return `${loadName(loads(r => /Chinook$/.test(r)))} Drop`;
    if (rides.has('Helix') && ents.some(e => e.ci >= 0 && rawName(e.ci) === 'Helix' && isVehicle(e.ti)))
      return `${loadName(loads((r, e) => r === 'Helix' && isVehicle(e.ti)))} Drop`;
    if (rides.has('Technical')) { const l = loads(r => r === 'Technical'); return l.every(x => x === 'Worker') ? 'Worker Drop' : `${loadName(l)} Tech`; }   // a Technical driving workers out is a Worker Drop (the user, 2026-09-14)
    if (kinds.size === 1 && kinds.has('Supply Truck')) return 'Truck Rush';
    if (kinds.size === 1 && kinds.has('Terrorist')) return 'Forward Terrorist';
    if (kinds.has('Humvee') && ents.every(e => e.ci >= 0 ? rawName(e.ci) === 'Humvee' : HUMVEE_BALL.has(rawName(e.ti)))) return 'Humvees';
    if (kinds.size === 1 && !rides.size && LONE.has([...kinds][0])) return null;
    // the composition as it crossed: carriers with their load in brackets, then the rest, most numerous first
    const parts = [], seen = new Set();
    for (const e of ents) {
      if (e.ci >= 0) continue;
      const name = rawName(e.ti), load = ents.filter(x => x.ci >= 0 && rawName(x.ci) === name);
      load.forEach(x => seen.add(x));
      // a Helix is the unit its object upgrade made it (the user, 2026-09-13): the gatling cannon one is a "Gatlix",
      // the battle bunker one - or any Helix with infantry riding, firing out - a "Bunkerlix"
      if (name === 'Helix' && (/gat/i.test(upg) || /bunker/i.test(upg) || (load.length && load.every(x => !isVehicle(x.ti))))) { parts.push(`${cnt(e.k)}${many(e.k, /gat/i.test(upg) ? 'Gatlix' : 'Bunkerlix')}`); continue; }
      parts.push(`${cnt(e.k)}${many(e.k, unitName(e.ti))}${load.length ? ` (${loadName(load.map(x => loadUnit(x.ti)))})` : ''}`);
    }
    for (const e of ents) if (e.ci >= 0 && !seen.has(e)) parts.push(`${loadUnit(e.ti)} in ${unitName(e.ci)}`);
    const shown = ents.reduce((a, e) => a + e.k, 0);
    return parts.join(' + ') + (n > shown ? ' + More' : '');
  };
  let NAMED;   // composition signature -> name | null (the naming in force's store, see reset())
  // their structures a sortie took down by 5:00, or was ordered at (SH templates each, after the 6 header ints): what
  // the group did to their base names the play over its first order (the user, 2026-09-14: a Dragon Tank's first order
  // at a truck is incidental, the flamewall takes buildings) - "Dragon Tank -> Supply Center + 2 Power Plants"
  const SH = D.bo_hits || 0;
  const struck = (so, at, n) => { const out = new Map(); for (let e = at; e < at + n; e++) { const it = itemOfT(so[e]); out.set(it, (out.get(it) || 0) + 1); } return out; };
  const struckName = m => [...m].map(([it, n]) => counted(n, it)).join(' + ');
  const KEEP_FAM = new Set(['construct', 'build_deny', 'tunnel_deny', 'capture', 'garrison', 'dock']);   // a first order more telling than a structure merely shot at
  // a seat's moves, named once (sorties come in crossing order; the clocks pick from these per render)
  const movesOf = p => {
    const mvs = p._mv || (p._mv = []); if (mvs[SID]) return mvs[SID];   // a slot per naming, so a side filter's flip keeps both
    const so = p.so || [], mv = [];
    for (let j = 0; j < so.length;) {
      const n = so[j + 2], lay = soAt(so, j), cEnd = lay.cAt + 3 * lay.nc;
      // one name per composition signature: the same ints name the same move in every seat
      const upg = so[j + 4] >= 0 && UPGS[so[j + 4]] ? UPGS[so[j + 4]].raw : '';
      let key = n + '|' + upg; for (let e = lay.cAt; e < cEnd; e++) key += ',' + so[e];
      let name = NAMED.get(key);
      if (name === undefined) {
        const ents = [];
        for (let e = lay.cAt; e < cEnd; e += 3) ents.push({ ti: so[e], k: so[e + 1], ci: so[e + 2] });
        NAMED.set(key, name = ents.length ? playName(ents, n, upg) : null);
      }
      const j0 = j; j = lay.next;
      if (!name) continue;
      let crusher = false; for (let e = lay.cAt; e < cEnd; e += 3) { const t = D.templates[so[e]]; if (CRUSHES(t) && (so[e + 2] < 0 || /Dozer/.test(t.raw))) crusher = true; }   // a ground vehicle of its own, not riding; a dozer dropped from a Chinook lands to crush
      const fam = FAMILIES[so[j0 + 3]], fixed = moveHow({ name }) === 'play';
      let target = targetOf(fam, so[j0 + 5], crusher);
      if (SH) { const down = struck(so, lay.dAt, lay.nd), hit = struck(so, lay.hAt, lay.nh); if (down.size && !(KEEP_FAM.has(fam) && down.size === 1)) target = struckName(down); else if (hit.size && !KEEP_FAM.has(fam)) target = struckName(hit); }   // a deny that took its one structure down is still the deny
      if (target == null && !fixed) continue;   // crossed with no target: not a play (the state chip covers what it was)
      // vees at their army is just vees being vees (the user, 2026-09-14): not a play, the state fallback covers it
      if (name === 'Humvees' && ARMY.has(fam)) continue;
      // the vees keep coming: a second Humvees play is the same build, not a play of its own ("Humvees x2" - the
      // user, 2026-09-13), so it neither shows nor takes one of the first-plays slots
      if (mv.some(m => m.units === 'Humvees') && (name === 'Humvees' || /^(3\+ |\d )?(Ambulance|Ranger)( \+ (Ambulance|Ranger))?$/.test(name))) continue;   // the ambo or rangers catching up with them, too
      mv.push({ t: so[j0], n, along: so[j0 + 1], units: name, name: target ? `${name} \u2192 ${target}` : name });
    }
    return mvs[SID] = mv;
  };
  const moveName = m => m.name;
  const moveKey = m => m.name;   // by name, so a Dozer Drop is one build whichever USA general's Chinook flew it
  const moveHow = m => { const u = m.units || m.name; return u.endsWith(' Drop') || u.endsWith(' Tech') || FIXED.has(u) ? 'play' : 'units'; };
  let ITEM;   // key -> {n, raw, c, kind}
  // on this tab only, a building that does the same job on another side reads under one name (the user,
  // 2026-09-13: "Arms Dealer just label it as a WF, it's functionally the same; same with Supply Center and
  // Supply Stash") - the export and the other tabs keep the real names; per-template naming is left alone.
  // Only while the selection spans sides (or is unfiltered): with one side picked there is nothing to merge, and
  // GLA's own reads "Arms Dealer" again (the user, 2026-09-14). sameKey() stamps the caches built on these names.
  const SAME = { 'Arms Dealer': 'War Factory', 'Supply Stash': 'Supply Center' };
  const sameOn = () => { const sides = new Set(F.facs.map(id => D.factions[id].side)); return sides.size !== 1; };
  const sameKey = () => F.merge + (sameOn() ? '' : '|own');
  const same = n => sameOn() ? SAME[n] || n : n;
  let ITEM_T;   // template index -> its item under the naming in force (the key is built once per template, not per call - millions a click)
  const itemOfT = ti => {
    let it = ITEM_T[ti]; if (it) return it;
    const t = D.templates[ti], key = same(Z.keyOf(t));
    it = ITEM.get(key);
    if (!it) { it = { key, n: same(F.merge === 'all' ? t.n : F.merge === 'none' ? t.raw : t.m), raw: t.raw, c: CLS_COLOR[t.cls], kind: t.cls, r: t.r || '', cost: t.cost }; ITEM.set(key, it); }
    return ITEM_T[ti] = it;
  };
  // a counted structure: "2 War Factories", "3 Barracks" (the user, 2026-09-14: not "2 War Factory" next to "2 supplies");
  // a raw template name (the Naming switch) is a code name and stays as it is
  const PLURAL = new Map();   // name -> its plural: five regex tests per call, and describe() calls it per structure per seat
  const plurals = name => { let p = PLURAL.get(name); if (p === undefined) { p = /bus$/i.test(name) ? name + 'es' : /s$/i.test(name) ? name : /[^aeiou]y$/i.test(name) ? name.slice(0, -1) + 'ies' : /(x|z|ch|sh)$/i.test(name) ? name + 'es' : /\d$/.test(name) ? name : name + 's'; PLURAL.set(name, p); } return p; };
  const counted = (n, it) => n > 1 ? (it._cn || (it._cn = []))[n] || (it._cn[n] = `${n} ${it.raw === it.n ? it.n : plurals(it.n)}`) : it.n;   // the wording kept on the item (items are made anew per naming)

  // the naming changes the keys and the plays' words: a store of caches per naming (sameKey), switched by reset() -
  // a side filter flips sameOn() with every click on and off, and flushing cost the pages a pass over the whole
  // population each time (~800 ms on the win rates tab, 2026-09-14); the seats' moves sit in a slot per store (p._mv[SID])
  const STORES = new Map();
  let SID = -1;
  const reset = () => {
    const key = sameKey();
    let st = STORES.get(key);
    if (!st) STORES.set(key, st = { id: STORES.size, item: new Map(), itemT: [], named: new Map() });
    SID = st.id; ITEM = st.item; ITEM_T = st.itemT; NAMED = st.named;
  };
  reset();
  return { soAt, soNext, SC, UPGS, FAMILIES, TARGET, targetOf, CRUSHES, SHORT_UNIT, rawName, mergedName, unitName, LOAD_ORDER, loadRank, loadName, FIXED, HUMVEE_BALL, LONE, ARMY,
    cnt, isVehicle, playName, get NAMED() { return NAMED; }, SH, struck, struckName, KEEP_FAM, movesOf, moveName, moveKey, moveHow, plurals, counted, SAME, sameOn, sameKey, same, get ITEM() { return ITEM; }, get SID() { return SID; }, itemOfT, reset };
};
