// Shared by the explorer pages: the dataset, the filter rail, the filter bar
// and the population filter. Each page adds its own aggregation and charts.
// buildable.json lists what each faction's own menus can queue; without it the pages fall back
// to a side + general-prefix guess
window.ZH_BUILD = fetch('buildable.json').then(r => r.ok ? r.json() : null).catch(() => null);
// mapinfo.json carries per-map facts (slots, [RANK], supply spots, oils) for the map picker's
// narrowing controls; without it the picker is search-only
window.ZH_MAPINFO = fetch('mapinfo.json').then(r => r.ok ? r.json() : null).catch(() => null);
window.ZH_READY = Promise.all([window.ZH_DATA, window.ZH_BUILD, window.ZH_MAPINFO]).then(async function ([D, B, MI]) {
  // the veil's phase line (data.js owns it); each blocking step below announces itself and lets it paint first
  const L = window.ZH_LOAD || { step() { return Promise.resolve(); } };
  await L.step('indexing ' + D.games.length.toLocaleString('en-US') + ' games\u2026', .85);

  const CLASSES = [
    ['infantry', 'Infantry', 'var(--s-inf)'],
    ['vehicle', 'Vehicles', 'var(--s-veh)'],
    ['aircraft', 'Aircraft', 'var(--s-air)'],
    ['economy', 'Economy', 'var(--s-eco)'],
    ['other', 'Other', 'var(--s-oth)'],
  ];
  const CLS_COLOR = Object.fromEntries(CLASSES.map(c => [c[0], c[2]]));
  CLS_COLOR.structure = 'var(--s-str)';
  const SIDES = ['USA', 'China', 'GLA'];
  // community shorthands for the filter bar, keyed by the catalog's faction name
  const SHORT = {
    'USA': 'vUSA', 'USA Air Force': 'Air', 'USA Laser': 'Laser', 'USA Superweapon': 'SWG',
    'GLA': 'vGLA', 'GLA Toxin': 'Tox', 'GLA Demolition': 'Demo', 'GLA Stealth': 'Stealth',
    'China': 'vChina', 'China Infantry': 'Inf', 'China Nuke': 'Nuke', 'China Tank': 'Tank',
  };
  const shortName = f => SHORT[f.name] || f.name;
  // what the community calls a unit, keyed by its display name (user, 2026-09-12: "ambo, lix,
  // vee, etc"); a search matches these beside the display name, the name a rename replaced and
  // the raw template. A rider row ("Missile Defender (in Humvee)") or a package ("Combat Bike +
// RPG") searches as its parts, so "vee md" finds the MD inside the Humvee.
  const NICK = {
    'Ambulance': 'ambo', 'Helix': 'lix', 'Humvee': 'vee hummer', 'Missile Defender': 'md', 'Tank Hunter': 'th',
    'Rocket Buggy': 'buggy', 'Battle Master': 'bm', 'Gatling Tank': 'gat gattling', 'Gattling Cannon': 'gat gattling',
    'Quad Cannon': 'quad', 'Scorpion': 'scorp', 'Marauder': 'mara', 'Toxin Truck': 'tox truck', 'Bomb Truck': 'bt',
    'Combat Bike': 'bike', 'Demo Bike': 'bike suicide bike terror bike', 'Terrorist': 'terror terr', 'Tunnel Defender': 'rpg', 'RPG Trooper': 'rpg',
    'Rebel': 'reb', 'Pathfinder': 'pf sniper', 'Colonel Burton': 'burton', 'Jarmen Kell': 'jk jarmen', 'Black Lotus': 'lotus bl',
    'Inferno Cannon': 'inferno', 'Overlord': 'ol lord', 'Emperor Tank': 'emperor', 'Dragon Tank': 'dragon', 'Troop Crawler': 'tc crawler',
    'Listening Outpost': 'outpost lo', 'Raptor': 'rap', 'King Raptor': 'kr', 'Stealth Fighter': 'sf', 'Comanche': 'comm', 'Chinook': 'nook',
    'Combat Chinook': 'combat nook', 'Paladin': 'pally', 'Crusader': 'crus', 'Tomahawk': 'tommy toma', 'Microwave Tank': 'micro',
    'Sentry Drone': 'sentry drone', 'Technical': 'tech', 'Battle Bus': 'bus', 'Scud Launcher': 'scud', 'Stinger Site': 'stinger',
    'Tunnel Network': 'tunnel', 'Demo Trap': 'trap', 'Fire Base': 'firebase fb', 'Patriot Battery': 'patriot pat', 'Speaker Tower': 'speaker',
    'Supply Truck': 'truck', 'Angry Mob': 'mob', 'Mini Gunner': 'mini', 'Redguard': 'red guard rg', 'Hijacker': 'jacker', 'Saboteur': 'sab',
    'Radar Van': 'van', 'Nuclear Missile Launcher': 'silo nuke silo', 'Scud Storm': 'storm', 'Particle Cannon Uplink': 'particle cannon pc uplink',
    'Command Center': 'cc', 'War Factory': 'wf', 'Barracks': 'rax', 'Arms Dealer': 'ad arms', 'Supply Stash': 'stash', 'Black Market': 'market',
    'Strategy Center': 'strat', 'Internet Center': 'ic', 'Propaganda Center': 'prop propaganda', 'Power Plant': 'power pp',
    'Supply Drop Zone': 'drop zone sdz', 'Laser Tank': 'laser', 'Laser Defense Turret': 'laser turret', 'Alpha Aurora': 'aurora alpha',
    'Assault Helix': 'lix', 'Assault Troop Crawler': 'tc crawler atc', 'Attack Outpost': 'outpost', 'Toxin Rebel': 'reb tox rebel',
    'Advanced Demo Trap': 'trap', 'EMP Patriot': 'patriot emp pat system', 'Nuke Cannon': 'nuke',
  };
  // one lowercase haystack per unit: display name, the name a rename replaced, raw template, nicknames of each part
  const nickOf = n => { const b = n.replace(/\s*\(.*\)$/, '').replace(/\)$/, ''); return (NICK[n] || '') + ' ' + (NICK[b] || ''); };
  const searchText = t => [t.n, t.o || '', t.raw || '', ...String(t.n + ' + ' + (t.o || '')).split(/ \+ | \(in /).map(nickOf)].join(' ').toLowerCase();
  // every word of the query has to appear somewhere in the haystack: "vee md" finds "Humvee + MD"
  const searchHit = (hay, q) => q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
  const FACS = Object.entries(D.factions).map(([id, f]) => ({ id: +id, ...f }));
  const SOURCES = [...new Set(D.games.map(g => g.s))].sort();
  const EVENTS = (D.events || []).map((name, id) => ({ id, name, games: 0 }));
  for (const g of D.games) if (g.ev != null) EVENTS[g.ev].games++;
  // the lists are kept in name order; the rail sorts them by count with a stable sort, so ties fall back to the name without a
  // string compare per comparison (locale compares on 10k players per click were a visible share of it)
  const byName = (a, b) => a.name.localeCompare(b.name);
  EVENTS.sort(byName);
  let evQuery = '';
  // maps are keyed by engine CRC in the export: one entry however the file was named
  const MAPS = (D.maps || []).map((m, id) => ({ id, name: m.n, crc: m.c, games: 0, info: (MI && MI.maps[m.c]) || {} }));
  for (const g of D.games) if (g.mp != null) MAPS[g.mp].games++;
  MAPS.sort(byName);
  let mapQuery = '';
  // narrowing controls for the map list: not filters themselves, they only shape which maps are listed.
  // Economy = money a player can reach: the map's supply cash (docks and piles, after the map's own
  // scripts set warehouse values) plus $20k per oil derrick (a derrick pays $1k/min, so ~20 minutes of
  // holding it), split between the players actually in the game - not the map's slots: an 8-slot map
  // played 1v1 crossmap is all that money for two people (Twilight Flame is the richest map in the set,
  // not a lean one). The split is the map's usual head count in this dataset, or the Format filter's
  // when one is picked. Snowy Drought / TD are "standard", Liquid Gold "big money", Blue Hole "really
  // big money". Size = the ground path between the spawns, in world units (a cell is 10): what a rush
  // has to cover, rather than how much terrain the map has; a 1v1 on a map with more spawns is normally
  // played crossmap, so that takes the farthest pair, and a team game the closest.
  const OIL_VALUE = 20000;
  const ECO_TIERS = [['lean', 'lean', 0, 95e3, 'under $95k per player: Flash Fire, Scorched Earth, Twilight Flame'],
    ['std', 'standard', 95e3, 150e3, '$95-150k per player: Tournament Desert, Snowy Drought, Vendetta, Drallim Desert'],
    ['big', 'big money', 150e3, 220e3, '$150-220k per player: Liquid Gold, Arabia, Arctic Arena, Oxygen'],
    ['huge', 'really big money', 220e3, Infinity, 'over $220k per player: Blue Hole, Twilight Flame crossmap, Defcon 6']];
  const CASH_TIERS = [['c60', '< $60k', 0, 60e3, 'supply cash per player, oil not counted'],
    ['c80', '60-80k', 60e3, 80e3, 'supply cash per player, oil not counted'],
    ['c100', '80-100k', 80e3, 100e3, 'supply cash per player, oil not counted'],
    ['c120', '100-120k', 100e3, 120e3, 'supply cash per player, oil not counted'],
    ['c999', '120k+', 120e3, Infinity, 'supply cash per player, oil not counted']];   // TD $82k, Snowy $94k, Twilight Flame $180k
  const SIZE_TIERS = [['small', 'small', 0, 1600, 'spawns under 1600 apart: Tournament Desert, Blossoming Valley, Scorched Earth'],
    ['medium', 'medium', 1600, 2000, '1600-2000: Vendetta, Liquid Gold, Blue Hole, Snowy Drought'],
    ['large', 'large', 2000, 2300, '2000-2300: Drallim Desert, Canyon of the Dead, Mountain Mayhem, Arctic Arena'],
    ['huge', 'huge', 2300, Infinity, 'over 2300: Akas Magic, Arabia, Toxic Lake, Twilight Flame crossmap']];
  const tierOf = (tiers, v) => v == null ? null : tiers.find(([, , lo, hi]) => v >= lo && v < hi)[0];
  const tierLabel = (tiers, id) => (tiers.find(t => t[0] === id) || [])[1];
  {   // how many players a map's games usually have here (its modal seat count)
    const seats = new Map();
    for (const g of D.games) if (g.mp != null) { const c = seats.get(g.mp) || new Map(); c.set(g.p.length, (c.get(g.p.length) || 0) + 1); seats.set(g.mp, c); }
    MAPS.forEach(m => { const c = seats.get(m.id); m.usual = c ? [...c].sort((a, b) => b[1] - a[1])[0][0] : null; });
  }
  const fmtSeats = k => { const m = /^(\d+)v(\d+)$/.exec(k || ''); return m ? +m[1] + +m[2] : null; };
  const mapSeats = m => (F.fmt.length === 1 && fmtSeats(F.fmt[0])) || m.usual || m.info.slots || 2;
  // economy / size / their tiers depend on the head count, so they are read fresh, not cached on the map
  // openness: mapinfo `open`, the share of the field (the ground between the spawns, the supply spots and the oil
  // derricks) a ground unit can stand on - Sand Scorpion is not comparable to Farmlands of the Fallen, and it is the
  // obstacles between the bases and the contested spots that count, not the map's edges (the user, 2026-09-14)
  const OPEN_TIERS = [['open', 'open', 95, Infinity, 'almost no obstacles between the bases and the contested spots: Farmlands of the Fallen, Tournament Desert, Vendetta, Snowy Drought'],
    ['broken', 'broken', 90, 95, 'some cliffs or water in the way: Black Hell, Natural Threats, Bitter Winter, Lone Eagle'],
    ['closed', 'closed', 80, 90, 'mounds, cliffs and chokes shape the routes: Sand Scorpion, Thermopylae, Final Crusade, Alpine Assault'],
    ['walled', 'walled', 0, 80, 'a fifth of the field or more is impassable: Flash Effect, Tournament Island']];
  const mapFacets = m => {
    const i = m.info, per = mapSeats(m);
    const eco = i.cash == null ? null : (i.cash + (i.oil || 0) * OIL_VALUE) / per;
    const dist = per <= 2 && i.far != null ? i.far : i.dist;
    return { per, eco, dist, f: { slots: i.slots == null ? null : String(i.slots), oil: i.oil == null ? null : String(i.oil),
      eco: tierOf(ECO_TIERS, eco), cash: i.cash == null ? null : tierOf(CASH_TIERS, i.cash / per),
      size: dist == null ? null : tierOf(SIZE_TIERS, dist), open: i.open == null ? null : tierOf(OPEN_TIERS, i.open) } };
  };
  const MAPF_DEF = { slots: [], rank: false, eco: [], size: [], cash: [], oil: [], open: [] };
  let mapFacet = JSON.parse(JSON.stringify(MAPF_DEF));
  const mapPick = loadPage('zh-mappick', 1, { simple: true, open: false });
  const facetCount = () => Object.values(mapFacet).reduce((n, v) => n + (v === true ? 1 : v.length || 0), 0);
  // resolved player identities (the curated layer's projection, never header names);
  // filters key on the identity id so they survive a re-export
  const PLAYERS = (D.players || []).map((p, idx) => ({ idx, id: p.i, name: p.n, games: 0 }));
  for (const g of D.games) for (const p of g.p) if (p.pl != null) PLAYERS[p.pl].games++;
  PLAYERS.sort(byName);
  const PLAYER_BY_ID = new Map(PLAYERS.map(p => [p.id, p]));
  const pidOf = p => p.pl == null ? -1 : D.players[p.pl].i;
  let plQuery = '', oplQuery = '';
  // games under 3 min are lag tests and quits, never counted (user, 2026-09-12: was 2). The slider runs from
  // that floor to the longest game in the data, rounded up to a half hour; the top
  // end means no upper bound.
  const LEN_MIN = 3;
  const LEN_MAX = 180;   // the slider's right end means no upper bound, so the few games past 3 hours only come in there
  // marks on the length slider a thumb snaps to when it comes close
  const LEN_MARKS = [[60, '1 h'], [120, '2 h']].filter(([m]) => m < LEN_MAX), LEN_SNAP = 3;
  const TOTAL_PG = D.games.reduce((n, g) => n + (g.t < LEN_MIN ? 0 : g.p.filter(p => p.f != null && D.factions[p.f]).length), 0);
  // starting-cash and format chips come from what the data holds; values with fewer
  // than 10 games fold into 'other'
  const tally = key => { const c = new Map(); for (const g of D.games) c.set(g[key], (c.get(g[key]) || 0) + 1); return c; };
  const CASH = [...tally('c')].filter(([v, n]) => v != null && n >= 10).sort((a, b) => a[0] - b[0]);
  const cashOther = D.games.filter(g => !CASH.some(([v]) => v === g.c)).length;
  const cashKey = g => CASH.some(([v]) => v === g.c) ? String(g.c) : 'other';
  const FMTS = [...tally('k')].filter(([v]) => v != null).sort((a, b) => b[1] - a[1]);

  const ELO = [
    ['u1400', '< 1400', e => e < 1400],
    ['1400', '1400s', e => e >= 1400 && e < 1500],
    ['1500', '1500s', e => e >= 1500 && e < 1600],
    ['1600', '1600s', e => e >= 1600 && e < 1700],
    ['1700', '1700s', e => e >= 1700 && e < 1800],
    ['1800', '1800s', e => e >= 1800 && e < 1900],
    ['1900', '1900s', e => e >= 1900 && e < 2000],
    ['2000', '2000+', e => e >= 2000],
  ];
  const eloBucket = e => e == null ? 'none' : (ELO.find(b => b[2](e)) || ['none'])[0];
  const eloIdx = e => { if (e == null) return -1; for (let i = 0; i < ELO.length; i++) if (ELO[i][2](e)) return i; return -1; };   // index into ELO, -1 = none
  const eloId = i => i < 0 ? 'none' : ELO[i][0];
  // Which rating counts as high level, and which GameReplays listings do.
  const HIGH_ELO = 1600, LOW_ELO = 1300;
  const highLevel = (p, g) => g.s === 'gamereplays'
    ? g.ev != null && !/^listing: (member|silver)/.test(D.events[g.ev])
    : p.e != null && p.e >= HIGH_ELO;
  // low level is a rating under LOW_ELO (the band between is neither); GameReplays games are never low,
  // whatever the listing, and a seat with no rating is neither
  const lowLevel = (p, g) => g.s !== 'gamereplays' && p.e != null && p.e < LOW_ELO;
  const LEVELS = [['high', 'High level', highLevel], ['low', 'Low level', lowLevel], ['all', 'All', null]];
  // smart: a general's variant merges with its base only when the INI says it is
  // the same unit at another price (t.m, from the export's variant table); all: every
  // variant merges (t.n); none: one row per template (t.raw).
  const MERGE = [['smart', 'Merge identical variants'], ['all', 'Merge all variants'], ['none', 'Per template']];

  // --- filter state, shared by every page through localStorage -----------
  const FDEF = {
    facs: [], opp: [], sources: [], tmin: '', tmax: '', elo: [], oppElo: [], result: [], events: [], maps: [], players: [], oppPlayers: [],
    classes: ['infantry', 'vehicle', 'aircraft', 'economy', 'other'], level: 'all', cash: [], fmt: [], merge: 'smart',
    noncombat: false,   // hide units with no weapon that removes hit points (combat page)
  };
  // filters live for the browser tab (sessionStorage): a reload keeps them, a click on another page's link
  // clears them so every page opens blank (the user, 2026-09-14; before that a level preset kept coming back
  // on its own from localStorage); the page's own controls still persist
  const PAGE = /winrates/.test(location.pathname) ? 'winrates' : /combat/.test(location.pathname) ? 'combat' : /buildorders/.test(location.pathname) ? 'buildorders' : /posture/.test(location.pathname) ? 'posture' : 'units';
  const FKEY = 'zh-filters-' + PAGE;
  // a page's own starting filters; posture began with USA vanilla picked (its Build Orders Space plot mixes
  // the factions' openings into one cloud) until the user asked for nothing picked (2026-09-14)
  const PAGE_DEFAULTS = {};
  let F = { ...FDEF, ...(PAGE_DEFAULTS[PAGE] || {}) };
  try {
    for (const k of Object.keys(localStorage)) if (/^zh-filters(-|$)/.test(k)) localStorage.removeItem(k);   // the old cross-page store
    const saved = JSON.parse(sessionStorage.getItem(FKEY) || 'null'); if (saved && saved.v === 1) F = { ...FDEF, ...(PAGE_DEFAULTS[PAGE] || {}), ...saved.f };
  } catch (e) { /* no storage */ }
  function persist() { try { sessionStorage.setItem(FKEY, JSON.stringify({ v: 1, f: F })); } catch (e) { /* ignore */ } }
  // events are GameReplays brackets and listings: nothing to pick once that source is excluded
  const eventsApply = () => !F.sources.length || F.sources.includes('gamereplays');
  // the page's own controls (chart modes, sorts, tops...) - one object the page mutates in place, kept so
  // the "reset charts" button in the filter bar can put it back to the page's defaults
  const PSTATE = { key: null, version: 0, def: null, S: null };
  const clone = v => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  function loadPage(key, version, def) {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && saved.v === version) return { ...def, ...saved.s }; } catch (e) { /* no storage */ }
    return { ...def };
  }
  // what a page gets as Z.loadPage: the same, and the object is the one the reset button restores
  function loadPageState(key, version, def) { const S = loadPage(key, version, def); Object.assign(PSTATE, { key, version, def: clone(def), S }); return S; }
  function persistPage(key, version, S) { try { localStorage.setItem(key, JSON.stringify({ v: version, s: S })); } catch (e) { /* ignore */ } syncReset(); }
  const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);   // key order aside
  // at its defaults when every key the defaults name is at its default; a page's own extras (migration
  // stamps like buildorders' unitsPart, set on load) do not count
  const pageIsDefault = () => !PSTATE.S || canon(Object.fromEntries(Object.keys(PSTATE.def).map(k => [k, PSTATE.S[k]]))) === canon(PSTATE.def);
  function resetPage() {
    if (!PSTATE.S) return;
    for (const k of Object.keys(PSTATE.S)) delete PSTATE.S[k];
    Object.assign(PSTATE.S, clone(PSTATE.def));
    persistPage(PSTATE.key, PSTATE.version, PSTATE.S);
  }
  function syncReset() { const b = document.querySelector('#active [data-resetcharts]'); if (b) b.disabled = pageIsDefault(); }

  function keyOf(t) { return F.merge === 'smart' ? t.m : F.merge === 'all' ? t.n : t.raw; }
  // --- the opposition and the population filter -------------------------
  // Every seat carries, computed once here, what the filters ask about the seats it is
  // up against: everyone not on its team (everyone else when the header carries no
  // teams - 1v1 and free-for-all). om = a bitmask of those seats' indices in g.p,
  // of = their faction when they share one (else null), oe = their mean rating, ow =
  // their shared result (null when unknown or split). Numbers on the seat, not arrays:
  // a stored object per seat doubled the heap at 146k games.
  let NSEATS = 0;
  for (const g of D.games) for (let i = 0; i < g.p.length; i++) {
    const p = g.p[i];
    let om = 0, f = null, nf = 0, es = 0, ne = 0, w = null, nw = 0, split = false;
    for (let j = 0; j < g.p.length; j++) {
      if (j === i) continue;
      const q = g.p[j];
      if (p.tm != null && q.tm != null && q.tm === p.tm) continue;
      om |= 1 << j;
      if (q.f != null && D.factions[q.f]) { nf++; f = q.f; }
      if (q.e != null) { es += q.e; ne++; }
      if (nw === 0) w = q.w; else if (q.w !== w) split = true;
      nw++;
    }
    p.om = om; p.of = nf === 1 ? f : null; p.oe = ne ? es / ne : null;
    p.ow = nw && !split && (w === 0 || w === 1) ? w : null;
    p.ei = eloIdx(p.e); p.oei = eloIdx(p.oe);   // rating buckets (index into ELO, -1 = unrated), asked for on every pass
    NSEATS++;
  }
  // the opposition as one object for code outside the hot loops: list = the seats, fs =
  // their factions. One shared object, refilled per call - do not keep it across calls.
  const SCR = { list: [], fs: [], f: null, e: null, w: null };
  function opposition(g, i) {
    const p = g.p[i], s = SCR; s.list.length = 0; s.fs.length = 0;
    for (let j = 0; j < g.p.length; j++) if ((p.om >> j) & 1) { const q = g.p[j]; s.list.push(q); if (q.f != null && D.factions[q.f]) s.fs.push(q.f); }
    s.f = p.of; s.e = p.oe; s.w = p.ow;
    return s;
  }
  // The population filter is evaluated once per filter change into a mask with a
  // word per seat (in D.games order, every seat in g.p counted), and every consumer -
  // the rail's facet counts, each page's aggregation - reads its bits. A seat passes a
  // page's population when the bits that page cares about are all set:
  const M_SEAT = 1;       // a seat with a known faction
  const M_POP = 2;        // level, source, cash, length, rating, opponent rating - and the page's own condition (bind opts.only)
  const M_MATCH = 4;      // the Matchup filters (own faction, opponents' faction)
  const M_RESULT = 8;     // the Result filter
  const M_PLAYERS = 16, M_OPPPL = 32, M_EVENTS = 64, M_MAPS = 128, M_FMT = 256;   // one per rail list, so its counts can leave its own filter out
  const M_FACET = M_PLAYERS | M_OPPPL | M_EVENTS | M_MAPS | M_FMT;
  const M_ALL = M_SEAT | M_POP | M_MATCH | M_RESULT | M_FACET;
  let MASK = null, maskKey = null;
  // the filters the mask depends on: everything but the unit-level ones (classes, merge)
  let onlyKey = null;   // bind opts.onlyKey: the page's condition state, part of the mask cache key
  const maskKeyOf = () => JSON.stringify([F.facs, F.opp, F.sources, F.tmin, F.tmax, F.elo, F.oppElo, F.result, F.events, F.maps, F.players, F.oppPlayers, F.level, F.cash, F.fmt, onlyKey ? onlyKey() : null]);
  // the last MASKS_KEEP masks by key (half a megabyte each): a filter toggled off is back to a mask already
  // computed, and so is a click through a few states and back - the pass over the seats (~25 ms) is saved
  const MASKS = new Map(), MASKS_KEEP = 12;
  const memo = (m, key, make, keep) => {   // a Map as an LRU: a hit moves to the back, the front goes when it overflows
    let v = m.get(key);
    if (v !== undefined) { m.delete(key); m.set(key, v); return v; }
    v = make(); m.set(key, v);
    if (m.size > keep) m.delete(m.keys().next().value);
    return v;
  };
  function mask() {
    const key = maskKeyOf();
    if (key === maskKey) return MASK;
    MASK = memo(MASKS, key, () => computeMask(F, only, new Uint16Array(NSEATS)), MASKS_KEEP);
    maskKey = key;
    return MASK;
  }
  // the mask with every rail filter at its default and no page condition: a page's "usual" baseline, computed once
  let DMASK = null;
  const maskDefault = () => DMASK || (DMASK = computeMask({ ...FDEF }, null, new Uint16Array(NSEATS)));
  function computeMask(F, only, MASK) {
    const set = a => a.length ? new Set(a) : null;
    const facs = set(F.facs), opp = set(F.opp), sources = set(F.sources), cash = set(F.cash), elo = set(F.elo), oppElo = set(F.oppElo),
      result = set(F.result), players = set(F.players), oppPlayers = set(F.oppPlayers), events = set(F.events), maps = set(F.maps), fmt = set(F.fmt);
    const tmin = F.tmin !== '' ? +F.tmin : -Infinity, tmax = F.tmax !== '' ? +F.tmax : Infinity;
    const lvl = (LEVELS.find(l => l[0] === F.level) || LEVELS[2])[2];   // null = all
    let si = 0;
    for (const g of D.games) {
      const ev = g.ev == null ? -1 : g.ev, mp = g.mp == null ? -1 : g.mp;
      const gpop = g.t >= LEN_MIN && g.t >= tmin && g.t <= tmax && (!sources || sources.has(g.s)) && (!cash || cash.has(cashKey(g)));
      const gfacet = (!events || events.has(ev) ? M_EVENTS : 0) | (!maps || maps.has(mp) ? M_MAPS : 0) | (!fmt || fmt.has(g.k) ? M_FMT : 0);
      for (let i = 0; i < g.p.length; i++) {
        const p = g.p[i];
        if (p.f == null || !D.factions[p.f]) { MASK[si++] = 0; continue; }
        let m = M_SEAT | gfacet;
        // every seat must qualify for "high level": a one-sided cut would make the pool "1600+ vs anyone", which wins more than it loses
        let ok = gpop && (!elo || elo.has(eloId(p.ei))) && (!oppElo || oppElo.has(eloId(p.oei))) && (!lvl || lvl(p, g)) && (!only || only(p, g));
        if (ok && lvl) for (let j = 0; j < g.p.length; j++) if ((p.om >> j) & 1 && !lvl(g.p[j], g)) { ok = false; break; }   // every opponent too
        if (ok) m |= M_POP;
        let oppOk = !opp, oppPlOk = !oppPlayers;
        if (!oppOk || !oppPlOk) for (let j = 0; j < g.p.length; j++) {
          if (!((p.om >> j) & 1)) continue;
          const q = g.p[j];
          if (!oppOk && q.f != null && opp.has(q.f) && D.factions[q.f]) oppOk = true;
          if (!oppPlOk && oppPlayers.has(pidOf(q))) oppPlOk = true;
        }
        if ((!facs || facs.has(p.f)) && oppOk) m |= M_MATCH;
        if (!result || result.has(p.w === 1 ? 'won' : p.w === 0 ? 'lost' : 'none')) m |= M_RESULT;
        if (!players || players.has(pidOf(p))) m |= M_PLAYERS;
        if (oppPlOk) m |= M_OPPPL;
        MASK[si++] = m;
      }
    }
    return MASK;
  }
  // baseline population: the uniform sample, no filters
  const inSample = g => !g.x && g.t >= LEN_MIN;

  // Captured tech = anything the player's own build menus cannot queue: another side's units, another general's
  // variant (a China Infantry player with Emperor tanks got hold of a Tank general's war factory), a unit their
  // general dropped (an Air Force Paladin), tech-building units, cut content. The pages show it only when a single
  // faction is picked, where "captured" is unambiguous; across factions a King Raptor and a captured King Raptor
  // would sit side by side, so those orders are left out instead.
  const OWN = B ? Object.fromEntries(Object.entries(B.factions).map(([f, names]) => [f, new Set(names)])) : null;
  // fallback without the table: another side, or another general's prefix on the raw name (Tank_ChinaTankEmperor)
  const GEN_PREFIX = { SupW: 5, Lazr: 6, AirF: 7, AFG: 7, Tank: 8, Infa: 9, Nuke: 10, Chem: 11, Demo: 12, Slth: 13 };
  D.templates.forEach(t => { const m = /^(?:GC_)?([A-Za-z]+)_/.exec(t.raw); t.gen = m && GEN_PREFIX[m[1]] != null ? GEN_PREFIX[m[1]] : null; });
  // "Fake Barracks", not "Fake GLA Barracks" (the user, 2026-09-14); the exporter names them so since then, this covers an older export
  D.templates.forEach(t => { if (t.n) t.n = t.n.replace(/^Fake GLA /, 'Fake '); if (t.m) t.m = t.m.replace(/^Fake GLA /, 'Fake '); });
  // Boss general and Generals Challenge (GC_) tech only exists on a few challenge-style maps: the pages leave those orders out
  D.templates.forEach(t => { t.challenge = /^(Boss_|GC_)/.test(t.raw); });
  // per template: t.own = a bit per faction id that can queue it, t.ci = its class index, t.sb = its side's bit,
  // so the aggregation loops (a few million runs per click) test bits instead of looking up sets and strings
  const CLS_INDEX = Object.fromEntries(CLASSES.map((c, i) => [c[0], i])); CLS_INDEX.structure = CLASSES.length;
  const SIDE_BIT = { USA: 1, China: 2, GLA: 4 };
  D.templates.forEach(t => {
    let own = 0;
    for (const f of FACS) {
      const ok = OWN ? !!(OWN[f.id] && OWN[f.id].has(t.raw)) : t.side === '?' || (t.side === f.side && (t.gen == null || t.gen === f.id));
      if (ok) own |= 1 << f.id;
    }
    t.own = own; t.ci = CLS_INDEX[t.cls] == null ? CLS_INDEX.other : CLS_INDEX[t.cls]; t.sb = SIDE_BIT[t.side] || 8;
  });
  // the combat page's templates get the same bits; a package (hull+tag) is a faction's own only when
  // both the hull and the rider are (a USA Humvee with an RPG aboard came out of a captured GLA barracks).
  // The tags are the combat export's rider tags; the rider sits in the hull's general when that general has its own copy.
  const RIDERS = { md: 'AmericaInfantryMissileDefender', rpg: 'GLAInfantryTunnelDefender', tankhunter: 'ChinaInfantryTankHunter', terror: 'GLAInfantryTerrorist',
    mini: 'ChinaInfantryMiniGunner', redguard: 'ChinaInfantryRedguard', rebel: 'GLAInfantryRebel', ranger: 'AmericaInfantryRanger', pathfinder: 'AmericaInfantryPathfinder',
    hijacker: 'GLAInfantryHijacker', worker: 'GLAInfantryWorker' };
  (D.ctemplates || []).forEach(t => {
    const [hull, tag] = t.raw.split('+'), gen = (/^(?:GC_)?[A-Za-z]+_/.exec(hull) || [''])[0], rider = tag && RIDERS[tag];
    const has = (f, name) => OWN ? !!(OWN[f.id] && OWN[f.id].has(name)) : t.side === f.side;
    let own = 0;
    for (const f of FACS) if (has(f, hull) && (!rider || has(f, gen + rider) || has(f, rider))) own |= 1 << f.id;
    // nothing queues a drone (an upgrade spawns it) or a spawned defender: on nobody's build list, it is its own side's
    if (!own) for (const f of FACS) if (f.side === t.side) own |= 1 << f.id;
    t.own = own;
  });
  const captured = (t, p) => !((t.own >> p.f) & 1);
  const showCaptured = () => F.facs.length === 1;

  // --- formatting ----------------------------------------------------------
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtPct = v => (v * 100).toFixed(v * 100 >= 10 ? 0 : 1) + '%';
  const fmtPct1 = v => (v * 100).toFixed(1) + '%';
  // grouped like toLocaleString('en-US') (up to 3 decimals), by hand: the locale call is ~10 us and a render
  // of every play row made 50k of them (half a second of one click, 2026-09-14)
  const fmtInt = v => {
    const n = Math.round(v * 1000) / 1000, a = Math.abs(n), i = Math.floor(a), f = a - i;
    let s = String(i);
    if (s.length > 3) { let o = ''; for (let e = s.length; e > 0; e -= 3) o = s.slice(Math.max(0, e - 3), e) + (o ? ',' + o : ''); s = o; }
    if (f) s += String(Math.round(f * 1000) / 1000).slice(1);
    return (n < 0 ? '-' : '') + s;
  };
  const fmtMoney = v => '$' + Math.round(v).toLocaleString('en-US');
  const fmtCash = v => v >= 1e6 ? `$${v / 1e6}M` : v >= 1e3 ? `$${v / 1e3}k` : `$${v}`;
  const fmtMoneyK = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'k' : fmtMoney(v);   // compact, for tiles
  const fmtPts = v => (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v * 100).toFixed(1);
  // Wilson 95% interval for k of n
  function wilson(k, n) {
    if (!n) return [0, 0];
    const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [(c - h) / d, (c + h) / d];
  }
  const quant = (sorted, f) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))] : 0;
  const mean = arr => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; };
  // the f-quantile of an unsorted typed array's first n entries, by quickselect (reorders them): a sort per
  // statistic was most of an aggregation at 250k seats
  function select(a, n, f) {
    if (!n) return 0;
    let k = Math.min(n - 1, Math.floor(n * f)), lo = 0, hi = n - 1;
    while (lo < hi) {
      const pivot = a[(lo + hi) >> 1]; let i = lo, j = hi;
      while (i <= j) { while (a[i] < pivot) i++; while (a[j] > pivot) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
      if (k <= j) hi = j; else if (k >= i) lo = i; else break;
    }
    return a[k];
  }

  // --- rail ---------------------------------------------------------------
  function chip(label, pressed, attrs, color) {
    return `<button class="chip" aria-pressed="${pressed}" ${attrs}>${color ? `<i class="sw" style="--c:${color}"></i>` : ''}${esc(label)}</button>`;
  }
  let hidden = new Set();
  let only = null;   // a page's extra condition on a seat (win rates: it needs a result), so the rail's counts match its tiles
  // faceted counts for the rail's lists: how many games each entry has under every
  // OTHER active filter, so after picking a player the opponent list reads "who he
  // faced, how often". Player lists count seats, the game-level lists count games.
  const FACETS = ['players', 'oppPlayers', 'events', 'maps', 'fmt'];
  let facets = null;
  const FACET_MEMO = new Map();   // by mask key, as the masks: the counts of a state seen before come back for free
  function facet() {
    const M = mask();
    return memo(FACET_MEMO, maskKey, () => facetOf(M), MASKS_KEEP);
  }
  function facetOf(M) {
    const need = M_SEAT | M_POP;
    // "passes every other list's filter" per list; counters indexed by the export's ids, folded into Maps keyed like the chips at the end
    const oP = M_FACET & ~M_PLAYERS, oO = M_FACET & ~M_OPPPL, oE = M_FACET & ~M_EVENTS, oM = M_FACET & ~M_MAPS, oF = M_FACET & ~M_FMT;
    const NP = (D.players || []).length, NE = (D.events || []).length + 2, NM = (D.maps || []).length + 1;   // events: +1 = none (unlisted GameReplays), +2 = none (other sources)
    const cP = new Uint32Array(NP), cO = new Uint32Array(NP), cE = new Uint32Array(NE), cM = new Uint32Array(NM), cF = new Map();
    let si = 0;
    for (const g of D.games) {
      const ev = g.ev == null ? (g.s === 'gamereplays' ? NE - 2 : NE - 1) : g.ev, mp = g.mp == null ? NM - 1 : g.mp;
      let seen = 0;   // a game counts once however many seats pass
      for (let i = 0; i < g.p.length; i++) {
        const m = M[si++];
        if ((m & need) !== need) continue;
        const p = g.p[i];
        if ((m & oP) === oP && p.pl != null) cP[p.pl]++;
        if ((m & oO) === oO) for (let j = 0; j < g.p.length; j++) if ((p.om >> j) & 1 && g.p[j].pl != null) cO[g.p[j].pl]++;
        if (!(seen & M_EVENTS) && (m & oE) === oE) { seen |= M_EVENTS; cE[ev]++; }
        if (!(seen & M_MAPS) && (m & oM) === oM) { seen |= M_MAPS; cM[mp]++; }
        if (!(seen & M_FMT) && (m & oF) === oF) { seen |= M_FMT; cF.set(g.k, (cF.get(g.k) || 0) + 1); }
      }
    }
    const c = { players: new Map(), oppPlayers: new Map(), events: new Map(), maps: new Map(), fmt: cF };
    for (let i = 0; i < NP; i++) { if (cP[i]) c.players.set(D.players[i].i, cP[i]); if (cO[i]) c.oppPlayers.set(D.players[i].i, cO[i]); }
    for (let i = 0; i < NE; i++) if (cE[i]) c.events.set(i === NE - 2 ? -1 : i === NE - 1 ? null : i, cE[i]);
    for (let i = 0; i < NM; i++) if (cM[i]) c.maps.set(i === NM - 1 ? -1 : i, cM[i]);
    return c;
  }
  const cnt = (k, id) => facets[k].get(id) || 0;

  function renderRail() {
    facets = facet();
    const facChips = who => SIDES.map(side => `
      <div class="side-row"><button class="lbl side" data-side="${side}" data-who="${who}" aria-pressed="${FACS.filter(f => f.side === side).every(f => F[who].includes(f.id))}" title="all ${side} factions">${side}</button><div class="chips">
        ${FACS.filter(f => f.side === side).map(f => chip(f.general ? f.name.replace(side + ' ', '') : 'Vanilla', F[who].includes(f.id), `data-${who}="${f.id}"`)).join('')}
      </div></div>`).join('');
    const grp = (name, html) => hidden.has(name) ? '' : html;
    $('rail').innerHTML = `
      <div class="grp">
        <div class="grp-h"><span class="lbl">Level</span></div>
        <div class="chips">${LEVELS.filter(([k]) => k !== 'low' || F.level === 'low').map(([k, l]) => chip(l, F.level === k, `data-level="${k}"`)).join('')}</div>
        <div class="hint">High: everyone GeneralsOnline ${HIGH_ELO}+, or a GameReplays tournament / expert / gold / ROTW game.</div>
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Faction played</span><button class="act" data-clear="facs">any</button></div>
        ${facChips('facs')}
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Against</span><button class="act" data-clear="opp">any</button></div>
        ${facChips('opp')}
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Player ELO</span><button class="act" data-clear="elo">any</button></div>
        <div class="chips">${ELO.map(([k, l]) => chip(l, F.elo.includes(k), `data-elo="${k}"`)).join('')}${chip('Unrated', F.elo.includes('none'), 'data-elo="none"')}</div>
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Opponent ELO</span><button class="act" data-clear="oppElo">any</button></div>
        <div class="chips">${ELO.map(([k, l]) => chip(l, F.oppElo.includes(k), `data-oppelo="${k}"`)).join('')}${chip('Unrated', F.oppElo.includes('none'), 'data-oppelo="none"')}</div>
      </div>
      ${PLAYERS.length ? `<div class="grp">
        <div class="grp-h"><span class="lbl">Player</span><button class="act" data-clear="players">any</button></div>
        <input id="plq" class="search" type="search" placeholder="find a player\u2026" value="${esc(plQuery)}" autocomplete="off">
        <div class="chips scroll" id="plchips">${playerChips('players')}</div>
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Opponent</span><button class="act" data-clear="oppPlayers">any</button></div>
        <input id="oplq" class="search" type="search" placeholder="find an opponent\u2026" value="${esc(oplQuery)}" autocomplete="off">
        <div class="chips scroll" id="oplchips">${playerChips('oppPlayers')}</div>
      </div>` : ''}
      <div class="grp">
        <div class="grp-h"><span class="lbl">Starting cash</span><button class="act" data-clear="cash">any</button></div>
        <div class="chips">${CASH.map(([v, n]) => chip(`${fmtCash(v)} (${fmtInt(n)})`, F.cash.includes(String(v)), `data-cash="${v}"`)).join('')}${cashOther ? chip(`other (${fmtInt(cashOther)})`, F.cash.includes('other'), 'data-cash="other"') : ''}</div>
      </div>
      <div class="grp">
        <div class="grp-h"><span class="lbl">Game length</span><button class="act" data-clear-len="1">any</button></div>
        <div class="dual" id="dual">
          <div class="track"></div><div class="fill" id="tfill"></div>
          ${LEN_MARKS.map(([m, l]) => `<div class="tick" style="left:${((m - LEN_MIN) / (LEN_MAX - LEN_MIN) * 100).toFixed(2)}%"><i></i><span>${l}</span></div>`).join('')}
          <input id="tmin" type="range" min="${LEN_MIN}" max="${LEN_MAX}" step="1" value="${F.tmin === '' ? LEN_MIN : F.tmin}" aria-label="shortest game, minutes">
          <input id="tmax" type="range" min="${LEN_MIN}" max="${LEN_MAX}" step="1" value="${F.tmax === '' ? LEN_MAX : F.tmax}" aria-label="longest game, minutes">
        </div>
        <div class="range-lbl"><span id="tmin-l"></span><span id="tmax-l"></span></div>
        <div class="hint">In-game clock. Games under ${LEN_MIN} min are never counted.</div>
      </div>
      ${grp('result', `<div class="grp">
        <div class="grp-h"><span class="lbl">Result</span><button class="act" data-clear="result">any</button></div>
        <div class="chips">${chip('Won', F.result.includes('won'), 'data-result="won"')}${chip('Lost', F.result.includes('lost'), 'data-result="lost"')}${chip('No record', F.result.includes('none'), 'data-result="none"')}</div>
      </div>`)}
      ${grp('classes', `<div class="grp">
        <div class="grp-h"><span class="lbl">Unit classes</span><button class="act" data-combat="1">combat only</button></div>
        <div class="chips">${CLASSES.map(([k, l, c]) => chip(l, F.classes.includes(k), `data-cls="${k}"`, c)).join('')}</div>
        ${PAGE === 'combat' ? `<div class="chips" style="margin-top:5px">${chip('Combat units only', F.noncombat, 'data-nc="1"')}</div>
        <div class="hint">Economy = workers, dozers, supply trucks, Chinooks. Combat units only drops everything with no weapon that removes hit points (ambulance, hacker, radar van, ECM, every economy unit) from the rows and the totals; they still show as what a picked unit hit.</div>`
        : `<div class="hint">Economy = workers, dozers, supply trucks, Chinooks.</div>`}
      </div>`)}
      ${MAPS.length ? `<div class="grp">
        <div class="grp-h"><span class="lbl">Map</span><button class="act" data-clear="maps">any</button></div>
        <input id="mapq" class="search" type="search" placeholder="find a map\u2026" value="${esc(mapQuery)}" autocomplete="off">
        ${MI ? `<details class="map-narrow" id="mapnarrow"${mapPick.open ? ' open' : ''}><summary>narrow the list${facetCount() ? ` <b>${facetCount()}</b>` : ''}</summary><div class="map-tools" id="maptools">${mapFacetControls()}</div></details>` : ''}
        <div class="map-tools" id="mapall">${mapAll()}</div>
        <div class="chips scroll" id="mapchips">${mapChips()}</div>
      </div>` : ''}
      <div class="grp">
        <div class="grp-h"><span class="lbl">Source</span><button class="act" data-clear="sources">any</button></div>
        <div class="chips">${SOURCES.map(s => chip(s, F.sources.includes(s), `data-src="${s}"`)).join('')}</div>
      </div>
      ${eventsApply() ? `<div class="grp">
        <div class="grp-h"><span class="lbl">Event</span><button class="act" data-clear="events">any</button></div>
        <input id="evq" class="search" type="search" placeholder="find an event\u2026" value="${esc(evQuery)}" autocomplete="off">
        <div class="chips scroll" id="evchips">${eventChips()}</div>
        <div class="hint">GameReplays bracket or listing tier; counts follow the other filters.</div>
      </div>` : ''}
      ${FMTS.length > 1 ? `<div class="grp">
        <div class="grp-h"><span class="lbl">Format</span><button class="act" data-clear="fmt">any</button></div>
        <div class="chips">${FMTS.map(([v]) => chip(`${v} (${fmtInt(cnt('fmt', v))})`, F.fmt.includes(v), `data-fmt="${v}"`)).join('')}</div>
        <div class="hint">Players are the seats that play; observers don't count.</div>
      </div>` : ''}
      <div class="grp">
        <div class="grp-h"><span class="lbl">Naming</span></div>
        <div class="chips">${MERGE.map(([k, l]) => chip(l, F.merge === k, `data-merge="${k}"`)).join('')}</div>
        <div class="hint">Identical: a general's variant joins its base only when it plays the same (Battle Master (Nuke) stands alone). All: every variant joins. Per template: one row each.</div>
      </div>`;
    syncLength(); syncMapAll();
  }
  function eventChips() {
    const q = evQuery.trim().toLowerCase();
    const on = id => F.events.includes(id);
    const list = EVENTS.filter(e => (cnt('events', e.id) || on(e.id)) && (!q || e.name.toLowerCase().includes(q)));
    // by count under the other filters - a fixed order, so a click never moves the chip under the mouse (picks used to
    // jump to the top: annoying to unpick, and the neighbours swapped; the user, 2026-09-14); a pick stays listed at 0
    list.sort((a, b) => cnt('events', b.id) - cnt('events', a.id));
    const noEvent = cnt('events', -1);
    const row = (label, n, pressed, id) => `<button class="chip" aria-pressed="${pressed}" data-event="${id}"><span>${esc(label)}</span><small>${fmtInt(n)}</small></button>`;
    return list.map(e => row(e.name, cnt('events', e.id), on(e.id), e.id)).join('')
      + (!q && (noEvent || on(-1)) ? row('No event', noEvent, on(-1), -1) : '')
      + (q && !list.length ? '<span class="hint">no event matches</span>' : '');
  }
  const SHOW = 150;   // the list is thousands long: top games until a search narrows it
  function playerChips(who) {
    const q = (who === 'players' ? plQuery : oplQuery).trim().toLowerCase();
    const on = id => F[who].includes(id);
    let list = PLAYERS.filter(p => (cnt(who, p.id) || on(p.id)) && (!q || p.name.toLowerCase().includes(q)));
    const total = list.length;
    // by count, a fixed order (see eventChips); a pick below the window is still listed, after it
    list.sort((a, b) => cnt(who, b.id) - cnt(who, a.id));
    if (!q) list = list.filter((p, i) => i < SHOW || on(p.id));
    const attr = who === 'players' ? 'data-player' : 'data-oppplayer';
    return list.map(p => `<button class="chip" aria-pressed="${on(p.id)}" ${attr}="${p.id}"><span>${esc(p.name)}</span><small>${fmtInt(cnt(who, p.id))}</small></button>`).join('')
      + (!q && total > SHOW ? `<span class="hint">top ${SHOW} of ${fmtInt(total)} \u00b7 search for the rest</span>` : '')
      + (q && !list.length ? '<span class="hint">no player matches</span>' : '');
  }
  function mapFacetControls() {
    // one row per facet; several values in a row are OR-ed, rows are AND-ed
    const row = (key, label, opts) => `<div class="mf"><span>${label}</span>${opts.map(([v, l, title]) =>
      `<button class="fc" aria-pressed="${mapFacet[key].includes(String(v))}" data-mf="${key}" data-v="${v}" title="${esc(title || '')}">${l}</button>`).join('')}</div>`;
    const values = key => [...new Set(MAPS.filter(m => m.games && m.info[key] != null).map(m => +m.info[key]))].sort((a, b) => a - b);
    // a dropdown where the values run long (oil: 0-8 and up): one value or any (the user, 2026-09-14)
    const pick = (key, label, opts) => `<div class="mf"><span>${label}</span><select class="fsel" data-mfsel="${key}" aria-label="${label}"><option value="">any</option>${opts.map(v =>
      `<option value="${v}"${mapFacet[key][0] === String(v) ? ' selected' : ''}>${v}</option>`).join('')}</select></div>`;
    const tiers = tiers => tiers.map(t => [t[0], t[1], t[4]]);
    return `<div class="mf-h"><button class="act" data-mfmode>${mapPick.simple ? 'exact' : 'simple'}</button>${facetCount() ? '<button class="act" data-mfreset>reset</button>' : ''}</div>`
      + row('slots', 'players', values('slots').map(v => [v, v + 'p']))
      + (mapPick.simple ? row('eco', 'economy', tiers(ECO_TIERS))
        : row('cash', 'cash', tiers(CASH_TIERS)) + pick('oil', 'oil', values('oil')))
      + row('size', 'size', tiers(SIZE_TIERS))
      + row('open', 'openness', tiers(OPEN_TIERS))
      + `<label class="ck"><input type="checkbox" data-mfrank${mapFacet.rank ? ' checked' : ''}> [RANK] maps only</label>`;
  }
  function syncMapAll() {
    const el = $('mapall'); if (!el) return;
    el.innerHTML = mapAll(); const i = el.querySelector('input'); i.indeterminate = i.hasAttribute('data-mixed');
  }
  function refreshMapTools() {
    if (!$('maptools')) return;
    $('maptools').innerHTML = mapFacetControls(); $('mapchips').innerHTML = mapChips(); syncMapAll();
    const n = facetCount(), sum = $('mapnarrow').querySelector('summary');
    sum.innerHTML = 'narrow the list' + (n ? ` <b>${n}</b>` : '');
  }
  const mapFacts = m => { const i = m.info, x = mapFacets(m); return [i.slots != null ? i.slots + ' slots' + (m.usual && m.usual !== i.slots ? `, played ${m.usual}p here` : '') : '',
    i.cash != null ? `$${Math.round(i.cash / 1000)}k in ${i.supply} supply` : '', i.oil != null ? i.oil + ' oil' : '',
    x.eco != null ? `${tierLabel(ECO_TIERS, x.f.eco)} economy ($${Math.round(x.eco / 1000)}k per player)` : '',
    x.dist != null ? `spawns ${i.far != null ? i.dist + '-' + i.far : i.dist} apart (${i.far != null ? (x.per <= 2 ? 'crossmap: ' : 'closest: ') : ''}${tierLabel(SIZE_TIERS, x.f.size)})` : '',
    i.open != null ? `${tierLabel(OPEN_TIERS, x.f.open)} terrain (${i.open}% of the field passable)` : '', i.rank ? '[RANK]' : '']
    .filter(Boolean).join(' \u00b7 '); };
  // a map search, for the rail's list and the map card's pick: every word of the query is in the name, or is the start
  // of the name's initials ("td" finds Tournament Desert, "sd" Snowy Drought), or a run of words spells a short word of
  // the name by its initials ("tournament desert" finds TD Nobugscars) (the user, 2026-09-14)
  const mapWords = n => n.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  function mapHit(m, q) {
    const words = mapWords(q); if (!words.length) return true;
    if (!m.sw) { m.sw = mapWords(m.name); m.sl = m.sw.join(' '); m.sa = m.sw.map(w => w[0]).join(''); m.sab = new Set(m.sw.filter(w => w.length >= 2 && w.length <= 4)); }
    for (let i = 0; i < words.length;) {
      let run = 0;
      for (let k = Math.min(4, words.length - i); k >= 2; k--) if (m.sab.has(words.slice(i, i + k).map(w => w[0]).join(''))) { run = k; break; }
      if (run) { i += run; continue; }
      const w = words[i++];
      if (!m.sl.includes(w) && !(w.length >= 2 && m.sa.startsWith(w))) return false;
    }
    return true;
  }
  // does a map pass the narrowing: the rows AND-ed, the values of a row OR-ed (the map card's pick applies the same)
  function mapFacetHit(m) {
    const keys = mapPick.simple ? ['slots', 'eco', 'size', 'open'] : ['slots', 'cash', 'oil', 'size', 'open'];
    const narrowed = keys.some(k => mapFacet[k].length);
    return (!mapFacet.rank || !!m.info.rank)
      && (!narrowed || (f => keys.every(k => !mapFacet[k].length || (f[k] != null && mapFacet[k].includes(f[k]))))(mapFacets(m).f));
  }
  // a click or check on a narrowing control, wherever it is drawn (the rail, the map card's pick): the state and the rail follow
  function mapFacetAct(d, el) {
    if (d.mf !== undefined) toggle(mapFacet[d.mf], d.v);
    else if (d.mfmode !== undefined) { mapPick.simple = !mapPick.simple; persistPage('zh-mappick', 1, mapPick); }
    else if (d.mfreset !== undefined) mapFacet = JSON.parse(JSON.stringify(MAPF_DEF));
    else if (d.mfrank !== undefined) mapFacet.rank = !!(el && el.checked);
    else if (d.mfsel !== undefined) mapFacet[d.mfsel] = el && el.value ? [el.value] : [];
    else return false;
    refreshMapTools();
    if (api.onMapFacet) api.onMapFacet();
    return true;
  }
  function listedMaps() {
    const on = id => F.maps.includes(id);
    return MAPS.filter(m => (cnt('maps', m.id) || on(m.id)) && mapHit(m, mapQuery) && mapFacetHit(m));
  }
  // the box above the map list: checked when every listed map is picked, mixed when some are
  function mapAll() {
    const list = listedMaps(), on = list.filter(m => F.maps.includes(m.id)).length;
    return `<label class="ck"><input type="checkbox" data-mapall${on && on === list.length ? ' checked' : ''}${on && on < list.length ? ' data-mixed' : ''}> all listed <small>${fmtInt(list.length)}</small></label>`;
  }
  function mapChips() {
    const tq = mapQuery.trim().toLowerCase(), q = tq || Object.values(mapFacet).some(v => v === true || v.length > 0);
    const on = id => F.maps.includes(id);
    let list = listedMaps();
    const total = list.length;
    // by count, a fixed order (see eventChips); a pick below the window is still listed, after it
    list.sort((a, b) => cnt('maps', b.id) - cnt('maps', a.id));
    // like the player lists: the top of the list until a search narrows it (a thousand rows re-laid out per click was most of the click)
    if (!tq) list = list.filter((m, i) => i < SHOW || on(m.id));
    const noMap = cnt('maps', -1);
    const row = (label, n, pressed, id, title) => `<button class="chip" aria-pressed="${pressed}" data-map="${id}" title="${esc(title || '')}"><span>${esc(label)}</span><small>${fmtInt(n)}</small></button>`;
    return list.map(m => row(m.name, cnt('maps', m.id), on(m.id), m.id, mapFacts(m))).join('')
      + (!q && (noMap || on(-1)) ? row('Unknown map', noMap, on(-1), -1) : '')
      + (!tq && total > SHOW ? `<span class="hint">top ${SHOW} of ${fmtInt(total)} \u00b7 search or narrow for the rest</span>` : '')
      + (q && !list.length ? '<span class="hint">no map matches</span>' : '');
  }
  function syncLength() {
    const lo = F.tmin === '' ? LEN_MIN : +F.tmin, hi = F.tmax === '' ? LEN_MAX : +F.tmax;
    const pct = v => (v - LEN_MIN) / (LEN_MAX - LEN_MIN) * 100;
    $('tfill').style.left = pct(lo) + '%'; $('tfill').style.right = (100 - pct(hi)) + '%';
    $('tmin-l').textContent = lo + ' min';
    $('tmax-l').textContent = hi === LEN_MAX ? 'any' : hi + ' min';
  }
  function seg(el, options, current, attr) {
    el.innerHTML = options.map(([k, l]) => `<button aria-pressed="${String(k) === String(current)}" ${attr}="${k}">${esc(l)}</button>`).join('');
  }

  // Selected ELO buckets as contiguous runs: [['1600\u20131899', ['1600','1700','1800']], ['unrated', ['none']]]
  function eloRuns(sel) {
    const order = ELO.map(b => b[0]);
    const idx = order.map((k, i) => sel.includes(k) ? i : -1).filter(i => i >= 0);
    const runs = [];
    for (const i of idx) { const r = runs[runs.length - 1]; if (r && r[r.length - 1] === i - 1) r.push(i); else runs.push([i]); }
    const lo = i => i === 0 ? null : 1400 + (i - 1) * 100;
    const hi = i => i === order.length - 1 ? null : 1400 + i * 100;
    const out = runs.map(r => {
      const a = lo(r[0]), b = hi(r[r.length - 1]);
      const label = a == null && b == null ? 'any rating' : a == null ? `< ${b}` : b == null ? `${a}+` : r.length === 1 ? `${a}s` : `${a}\u2013${b - 1}`;
      return [label, r.map(i => order[i])];
    });
    if (sel.includes('none')) out.push(['unrated', ['none']]);
    return out;
  }

  // The filter bar: groups of removable parts. A part is {t, key, val, pre}; pre is the
  // separator drawn before it inside the chip. Removing a part calls removeFilter(key, val).
  function activeFilters() {
    const groups = [];
    const grp = (k, parts) => { if (parts.length) groups.push({ k, parts }); };
    if (F.level !== 'all') grp('Level', [{ t: F.level + ' level', key: 'level' }]);
    const facParts = who => {
      const parts = [], done = new Set();
      for (const side of SIDES) {
        const ids = FACS.filter(f => f.side === side).map(f => f.id);
        if (ids.every(id => F[who].includes(id))) { parts.push({ t: 'any ' + side, key: 'side:' + who, val: side }); ids.forEach(id => done.add(id)); }
      }
      for (const id of F[who]) if (!done.has(id)) parts.push({ t: shortName(D.factions[id]), key: who, val: id });
      return parts;
    };
    // always "X vs Y": an unconstrained side reads as a plain "any", so "1600+"
    // alone never implies both players and "vs 1600+" never stands alone
    const any = pre => ({ t: 'any', plain: true, pre });
    const vs = (a, b) => {
      if (!a.length && !b.length) return [];
      a.forEach((p, i) => { p.pre = i ? ',' : ''; }); b.forEach((p, i) => { p.pre = i ? ',' : 'vs'; });
      return (a.length ? a : [any('')]).concat(b.length ? b : [any('vs')]);
    };
    grp('Matchup', vs(facParts('facs'), facParts('opp')));
    const eloParts = who => eloRuns(F[who]).map(([t, keys]) => ({ t, key: who, val: keys }));
    grp('ELO', vs(eloParts('elo'), eloParts('oppElo')));
    const plParts = who => F[who].map(id => ({ t: (PLAYER_BY_ID.get(id) || { name: '#' + id }).name, key: who, val: id }));
    grp('Player', vs(plParts('players'), plParts('oppPlayers')));
    const list = (k, arr, text, key) => grp(k, arr.map((v, i) => ({ t: text(v), key, val: v, pre: i ? ',' : '' })));
    if (!hidden.has('result')) list('Result', F.result, v => v === 'none' ? 'no record' : v, 'result');
    list('Source', F.sources, v => v, 'sources');
    list('Event', F.events, id => id < 0 ? 'no event' : EVENTS.find(e => e.id === id).name, 'events');
    // a long map pick (the picker's "pick all listed") collapses to a count; removing it clears the whole pick
    if (F.maps.length > 6) grp('Map', [{ t: `${F.maps.length} maps`, key: 'allmaps' }]);
    else list('Map', F.maps, id => id < 0 ? 'unknown' : MAPS.find(m => m.id === id).name, 'maps');
    list('Cash', F.cash, v => v === 'other' ? 'other' : fmtCash(+v), 'cash');
    list('Format', F.fmt, v => v, 'fmt');
    if (F.tmin !== '' || F.tmax !== '') grp('Length', [{ t: F.tmin !== '' && F.tmax !== '' ? `${F.tmin}\u2013${F.tmax} min` : F.tmin !== '' ? `${F.tmin}+ min` : `under ${F.tmax} min`, key: 'length' }]);
    const without = hidden.has('classes') ? [] : CLASSES.filter(([k]) => !F.classes.includes(k)).map(([k, l]) => ({ t: l, key: 'classes', val: k }));
    without.forEach((p, i) => { p.pre = i ? ',' : ''; });
    grp('Without', without);
    if (F.noncombat) grp('Units', [{ t: 'combat only', key: 'noncombat' }]);
    if (F.merge !== 'smart') grp('Naming', [{ t: F.merge === 'all' ? 'merge all variants' : 'per template', key: 'merge' }]);
    return groups;
  }
  function renderActive() {
    const groups = activeFilters();
    $('active').innerHTML = `<span class="lbl">Filters</span>` + (!groups.length ? `<span class="none">none \u00b7 ${D.subset ? 'the whole subset' : 'whole dataset'}</span>` : groups.map((g, gi) =>
      `<span class="fchip"><span class="k">${esc(g.k)}</span>${g.parts.map((p, pi) =>
        `${p.pre ? `<span class="sep">${esc(p.pre)}</span>` : ''}${p.plain ? `<span class="pv plain">${esc(p.t)}</span>` : `<button class="pv" data-rm="${gi}:${pi}" title="remove" aria-label="remove ${esc(g.k)} ${esc(p.t)}">${esc(p.t)}</button>`}`).join('')}</span>`).join('')
      + `<button class="clear" data-clearall="1">clear all</button>`)
      + (PSTATE.S ? `<button class="clear reset" data-resetcharts="1"${pageIsDefault() ? ' disabled' : ''} title="put every chart on this page back to its default settings">reset charts</button>` : '');
  }
  function removeFilter({ key, val }) {
    if (key === 'level') F.level = 'all';
    else if (key === 'length') { F.tmin = ''; F.tmax = ''; }
    else if (key.startsWith('side:')) { const who = key.slice(5); const ids = FACS.filter(f => f.side === val).map(f => f.id); F[who] = F[who].filter(id => !ids.includes(id)); }
    else if (key === 'elo' || key === 'oppElo') F[key] = F[key].filter(k => !val.includes(k));
    else if (key === 'classes') F.classes.push(val);
    else if (key === 'merge') F.merge = 'smart';
    else if (key === 'noncombat') F.noncombat = false;
    else if (key === 'allmaps') F.maps = [];
    else toggle(F[key], val);
  }
  function clearAll() {
    Object.assign(F, { facs: [], opp: [], sources: [], tmin: '', tmax: '', elo: [], oppElo: [], result: [], events: [], maps: [], players: [], oppPlayers: [], classes: [...FDEF.classes], merge: 'smart', level: 'all', cash: [], fmt: [], noncombat: false });
  }

  // --- events ---------------------------------------------------------------
  function toggle(arr, v) { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  let pending = 0;
  // Wire the rail and the filter bar. onChange runs after any filter change; the
  // page's own controls inside <main> go through onMain(dataset) -> true if handled.
  // --- export: PNG per chart, PDF of the page --------------------------------
  // Libraries load on first use.
  const H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const libs = {};
  const loadLib = url => libs[url] || (libs[url] = new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = url; el.onload = res;
    el.onerror = () => { delete libs[url]; rej(new Error('could not load ' + url)); };
    document.head.appendChild(el);
  }));
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const today = () => new Date().toISOString().slice(0, 10);
  const pageName = () => document.querySelector('header nav a[aria-current]').textContent.toLowerCase();
  async function saveFile(filename, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  // html2canvas draws inline SVG as an image, where the page stylesheet no longer applies: copy the computed style in.
  // It also cannot parse color-mix()/color() values, so those are normalised to rgb through a canvas context.
  const prepClone = doc => {
    const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linejoin', 'opacity', 'font-size', 'font-family'];
    doc.querySelectorAll('svg, svg *').forEach(el => { const cs = doc.defaultView.getComputedStyle(el); props.forEach(k => el.style.setProperty(k, cs.getPropertyValue(k))); });
    // color-mix() computes to color(srgb r g b [/ a]) in Chromium
    const rgb = v => v.replace(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g,
      (m, r, g, b, a) => `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a == null ? 1 : a})`);
    doc.querySelectorAll('body *').forEach(el => {
      const cs = doc.defaultView.getComputedStyle(el);
      ['background-color', 'color'].forEach(k => { const v = cs.getPropertyValue(k); if (v.includes('color(')) el.style.setProperty(k, rgb(v)); });
    });
  };
  async function rasterise(el, opts) {
    await loadLib(H2C);
    const bg = getComputedStyle(el).backgroundColor;
    return window.html2canvas(el, {
      scale: 2, backgroundColor: bg === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.body).backgroundColor : bg, logging: false,
      ignoreElements: n => n.classList && (n.classList.contains('ctl') || n.classList.contains('snap') || n.classList.contains('loading') || n.id === 'tip'),
      onclone: prepClone, ...opts,
    });
  }
  const toBlob = (canvas, type, q) => new Promise(res => canvas.toBlob(res, type, q));
  const filterText = () => { const g = activeFilters(); return g.length ? g.map(x => x.k + ' ' + x.parts.map(p => (p.pre ? p.pre + ' ' : '') + p.t).join(' ')).join(' \u00b7 ') : (D.subset ? 'no filters, the whole subset' : 'no filters, whole dataset'); };
  async function exportCard(card, btn) {
    const title = card.querySelector('.card-h h2').textContent.trim();
    // caption under the chart so the image carries its context; removed after the capture
    const cap = document.createElement('div'); cap.className = 'snap-cap';
    cap.innerHTML = `<span>${esc(filterText())}</span><span>Zero Hour Stats \u00b7 ${esc(pageName())} \u00b7 ${today()}</span>`;
    card.appendChild(cap);
    btn.disabled = true; btn.textContent = '\u2026';
    try {
      const canvas = await rasterise(card);
      await saveFile(`zh-${slug(pageName())}-${slug(title)}-${today()}.png`, await toBlob(canvas, 'image/png'));
    } catch (e) { console.error(e); alert('image export failed: ' + e.message); }
    finally { cap.remove(); btn.disabled = false; btn.textContent = 'PNG'; }
  }
  async function exportPdf(btn, raster) {
    if (!raster && window.self === window.top) { window.print(); return; }   // standalone: the browser's own dialog, vector text
    // framed by the viewer, where print() may be sandboxed away: rasterise the print view into an A4 PDF
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'rendering\u2026';
    document.body.classList.add('printing');
    try {
      await Promise.all([loadLib(H2C), loadLib(JSPDF)]);
      window.scrollTo(0, 0);
      const canvas = await rasterise(document.body, { backgroundColor: '#fff', width: document.body.getBoundingClientRect().width, height: document.body.scrollHeight });   // body is special-cased to the viewport width otherwise
      // page breaks land on a row/tile/card-header boundary when one falls in the lower half of the page
      const scale = canvas.width / document.body.getBoundingClientRect().width, top = document.body.getBoundingClientRect().top;
      const cuts = [...document.querySelectorAll('header, .active, .tiles, .row, .lift, .wr, .mix-row, .facet, .hm-wrap, .curve, .foot, .card')]
        .map(el => Math.round((el.getBoundingClientRect().bottom - top) * scale) + 4 * scale).sort((a, b) => a - b);
      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const margin = 12, pw = 210 - 2 * margin, ph = 297 - 2 * margin;
      const mmPerPx = pw / canvas.width, pagePx = Math.floor(ph / mmPerPx);
      const slice = document.createElement('canvas'); slice.width = canvas.width;
      for (let y = 0, i = 0; y < canvas.height; i++) {
        let h = Math.min(pagePx, canvas.height - y);
        if (h === pagePx) { const c = cuts.filter(v => v > y + pagePx / 2 && v <= y + pagePx); if (c.length) h = c[c.length - 1] - y; }
        slice.height = h; slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (i) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', .92), 'JPEG', margin, margin, pw, h * mmPerPx);
        y += h;
      }
      await saveFile(`zero-hour-stats-${slug(pageName())}-${today()}.pdf`, pdf.output('blob'));
    } catch (e) { console.error(e); alert('PDF export failed: ' + e.message); }
    finally { document.body.classList.remove('printing'); btn.disabled = false; btn.textContent = label; }
  }
  // dark by default; the toggle's choice is kept per browser and stamped on <html> before first paint
  function bindTheme() {
    const b = document.querySelector('header .theme');
    if (!b) return;
    const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    const label = () => {
      const light = document.documentElement.dataset.theme === 'light';
      b.innerHTML = light ? MOON : SUN;
      b.title = light ? 'switch to dark' : 'switch to light';
      b.setAttribute('aria-label', b.title);
    };
    b.addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('zh-theme', t); } catch (e) { /* private window: the choice lasts the page */ }
      label();
    });
    label();
  }
  // --- the tour: a few words over each part of the page -----------------------
  // Steps spotlight one element at a time (a box over it, the rest dimmed) with a line of text and Next.
  // The common steps below, then any of the page's own (window.ZH_TOUR: [{sel | h2, text}], h2 = the start
  // of a card title; none today - the tour is about the filters, not the cards). Starts from the header's
  // Tour button, from ?tour on the URL, and once by itself on a browser's first visit (localStorage zh-tour)
  const TOUR_COMMON = [
    { sel: '#rail .grp:nth-of-type(2)', text: 'Filter by matchup here.' },
    { sel: '#rail #dual', up: '.grp', text: 'Game length here; maps and starting cash below.' },
    { sel: '#active', text: 'What is filtering right now. The x drops one.' },
    { sel: '#stamp .subset', text: () => window.ZH_SUBSET && window.ZH_SUBSET.active   // a link can open the site on a random share of the games
        ? 'You are not seeing all the data: this is a random share of the games. Pick all here.'
        : 'Fewer games load faster. Pick a share, or all.' },
  ];
  const TOUR_END = [];
  function tourTarget(step) {
    let el = null;
    if (step.h2) el = [...document.querySelectorAll('main .card')].find(c => { const h = c.querySelector('h2'); return h && h.textContent.trim().toLowerCase().startsWith(step.h2.toLowerCase()); });
    else el = document.querySelector(step.sel);
    if (el && step.up) el = el.closest(step.up) || el;
    if (!el || el.offsetParent === null) return null;   // hidden or absent: skipped
    // a card taller than the screen: its title bar carries the spot, the card shows under it
    if (el.classList.contains('card') && el.offsetHeight > window.innerHeight * .7) el = el.querySelector('.card-h') || el;
    return el;
  }
  let tourOn = false;
  function startTour() {
    if (tourOn) return;
    try { localStorage.setItem('zh-tour', '1'); } catch (e) { /* fine */ }
    const steps = TOUR_COMMON.concat(window.ZH_TOUR || [], TOUR_END).filter(tourTarget);
    if (!steps.length) return;
    tourOn = true;
    const root = document.createElement('div'); root.id = 'tour';
    root.innerHTML = '<div class="dim"></div><div class="spot"></div><div class="box"><div class="t"></div><div class="nav"><span class="n"></span><button type="button" class="back" title="back">&lsaquo;</button><button type="button" class="next">Next</button><button type="button" class="x" title="end the tour">&times;</button></div></div>';
    document.body.appendChild(root);
    const dim = root.querySelector('.dim'), spot = root.querySelector('.spot'), box = root.querySelector('.box');
    let i = 0;
    const end = () => { tourOn = false; root.remove(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); document.removeEventListener('keydown', keys); };
    const place = () => {
      const el = tourTarget(steps[i]); if (!el) { root.classList.add('lost'); return; }
      root.classList.remove('lost');
      const r = el.getBoundingClientRect(), pad = 6;
      const x1 = r.left - pad, y1 = r.top - pad, x2 = r.right + pad, y2 = r.bottom + pad;
      spot.style.left = x1 + 'px'; spot.style.top = y1 + 'px'; spot.style.width = (x2 - x1) + 'px'; spot.style.height = (y2 - y1) + 'px';
      // the dim layer with the target cut out (an even-odd polygon: the screen, then the hole)
      dim.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px)`;
      // the box beside the target: to its right when there is room, else under it, else above; kept on screen
      const bw = box.offsetWidth, bh = box.offsetHeight, W = window.innerWidth, H = window.innerHeight, gap = 12;
      let x, y;
      if (r.right + gap + bw < W - 8) { x = r.right + gap; y = r.top; }
      else if (r.bottom + gap + bh < H - 8) { x = r.left; y = r.bottom + gap; }
      else if (r.top - gap - bh > 8) { x = r.left; y = r.top - gap - bh; }
      else { x = r.left - gap - bw; y = r.top; }
      box.style.left = Math.max(8, Math.min(W - bw - 8, x)) + 'px'; box.style.top = Math.max(8, Math.min(H - bh - 8, y)) + 'px';
    };
    const show = () => {
      const step = steps[i], el = tourTarget(step);
      if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      root.querySelector('.t').textContent = typeof step.text === 'function' ? step.text() : step.text;
      root.querySelector('.n').textContent = (i + 1) + ' / ' + steps.length;
      root.querySelector('.back').disabled = i === 0;
      root.querySelector('.next').textContent = i === steps.length - 1 ? 'Done' : 'Next';
      // after the scroll settles (a frame is enough: instant scrolling)
      requestAnimationFrame(place);
    };
    const go = d => { i += d; if (i < 0) i = 0; if (i >= steps.length) { end(); return; } show(); };
    const keys = e => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight' || e.key === 'Enter') go(1); else if (e.key === 'ArrowLeft') go(-1); else return; e.preventDefault(); };
    root.querySelector('.next').addEventListener('click', () => go(1));
    root.querySelector('.back').addEventListener('click', () => go(-1));
    root.querySelector('.x').addEventListener('click', end);
    root.addEventListener('click', e => { if (!e.target.closest('.box')) go(1); });   // the dimmed page: a click moves on
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true); document.addEventListener('keydown', keys);
    show();
  }
  function bindTour() {
    const pr = document.querySelector('header .print'); if (!pr) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tour'; b.textContent = 'Tour'; b.title = 'a short tour of the page';
    pr.after(b);
    b.addEventListener('click', startTour);
    let auto = false;
    try { auto = new URLSearchParams(location.search).has('tour') || !localStorage.getItem('zh-tour'); } catch (e) { auto = new URLSearchParams(location.search).has('tour'); }
    if (!auto) return;
    // once the page is up: the veil gone and its first cards drawn
    const tick = setInterval(() => { if (document.getElementById('loading')) return; clearInterval(tick); setTimeout(startTour, 700); }, 250);
  }
  function bindExport() {
    bindTheme();
    bindTour();
    const pr = document.querySelector('header .print');
    if (pr) pr.addEventListener('click', () => exportPdf(pr));
    window.addEventListener('beforeprint', () => document.body.classList.add('printing'));
    window.addEventListener('afterprint', () => document.body.classList.remove('printing'));
    document.querySelectorAll('.card .card-h').forEach(h => {
      if (!h.querySelector('h2')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'snap'; b.title = 'save this chart as an image'; b.textContent = 'PNG';
      b.addEventListener('click', () => exportCard(h.parentElement, b));
      h.insertBefore(b, h.querySelector('h2').nextSibling);   // next to the title, where it fits at any width
    });
  }

  function bind(onChange, onMain, opts) {
    hidden = new Set((opts && opts.hide) || []);
    only = (opts && opts.only) || null; onlyKey = (opts && opts.onlyKey) || null; maskKey = null; MASKS.clear(); FACET_MEMO.clear();   // the page's condition is part of the mask (opts.onlyKey names its state, so a change of it invalidates the cache)
    const changed = () => { persist(); renderRail(); onChange(); };
    api.update = fn => { fn(F); if (F.elo.length || F.oppElo.length) F.level = 'all'; changed(); };   // pages mutate filters through this
    $('rail').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.side) {
        const ids = FACS.filter(f => f.side === d.side).map(f => f.id);
        const all = ids.every(id => F[d.who].includes(id));
        F[d.who] = all ? F[d.who].filter(id => !ids.includes(id)) : [...new Set([...F[d.who], ...ids])];
      }
      else if (mapFacetAct(d, b)) return;   // map-list narrowing: no filter change
      else if (d.facs) toggle(F.facs, +d.facs);
      else if (d.opp) toggle(F.opp, +d.opp);
      else if (d.level) { F.level = d.level; if (d.level !== 'all') { F.elo = []; F.oppElo = []; } }   // a preset over the rating filters: one or the other
      else if (d.cls) toggle(F.classes, d.cls);
      else if (d.src) { toggle(F.sources, d.src); if (!eventsApply()) F.events = []; }
      else if (d.elo) { toggle(F.elo, d.elo); F.level = 'all'; }
      else if (d.oppelo) { toggle(F.oppElo, d.oppelo); F.level = 'all'; }
      else if (d.result) toggle(F.result, d.result);
      else if (d.event) toggle(F.events, +d.event);
      else if (d.map) toggle(F.maps, +d.map);
      else if (d.player) toggle(F.players, +d.player);
      else if (d.oppplayer) toggle(F.oppPlayers, +d.oppplayer);
      else if (d.cash) toggle(F.cash, d.cash);
      else if (d.fmt) toggle(F.fmt, d.fmt);
      else if (d.merge) F.merge = d.merge;
      else if (d.clear) F[d.clear] = [];
      else if (d.clearLen) { F.tmin = ''; F.tmax = ''; }
      else if (d.combat) { F.classes = ['infantry', 'vehicle', 'aircraft']; if (PAGE === 'combat') F.noncombat = true; }
      else if (d.nc) F.noncombat = !F.noncombat;
      else return;
      changed();
    });
    $('rail').addEventListener('toggle', e => {
      if (e.target.id === 'mapnarrow') { mapPick.open = e.target.open; persistPage('zh-mappick', 1, mapPick); }
    }, true);   // toggle does not bubble
    // the length slider: the labels and the fill follow the thumb; the page renders when it is let go (a render per
    // input event, at hundreds of ms each on the big pages, held the thumb back - the user, 2026-09-14), or 200 ms
    // after the last keyboard step
    let dragging = false, moved = false;
    const release = () => { const go = dragging && moved; dragging = moved = false; if (go) { clearTimeout(pending); pending = 0; persist(); onChange(); } };
    $('rail').addEventListener('pointerdown', e => { if (e.target.id === 'tmin' || e.target.id === 'tmax') { dragging = true; moved = false; } });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    $('rail').addEventListener('input', e => {
      if (e.target.id === 'evq') { evQuery = e.target.value; $('evchips').innerHTML = eventChips(); return; }
      if (e.target.id === 'mapq') { mapQuery = e.target.value; $('mapchips').innerHTML = mapChips(); syncMapAll(); return; }
      if (e.target.dataset.mfrank !== undefined || e.target.dataset.mfsel !== undefined) { mapFacetAct(e.target.dataset, e.target); return; }
      if (e.target.dataset.mapall !== undefined) {   // the box above the list: every listed map in or out of the pick
        const ids = listedMaps().map(m => m.id);
        F.maps = e.target.checked ? [...new Set([...F.maps, ...ids])] : F.maps.filter(id => !ids.includes(id));
        changed(); return;
      }
      if (e.target.id === 'plq') { plQuery = e.target.value; $('plchips').innerHTML = playerChips('players'); return; }
      if (e.target.id === 'oplq') { oplQuery = e.target.value; $('oplchips').innerHTML = playerChips('oppPlayers'); return; }
      if (e.target.id !== 'tmin' && e.target.id !== 'tmax') return;
      // thumbs may not cross; the ends of the track mean "no bound"
      // the marks pull a dragged thumb in; the keyboard steps a minute at a time and must be able to walk past them
      const snap = v => { if (dragging) for (const [m] of LEN_MARKS) if (Math.abs(v - m) <= LEN_SNAP) return m; return v; };
      let lo = snap(+$('tmin').value), hi = snap(+$('tmax').value);
      $('tmin').value = lo; $('tmax').value = hi;
      if (lo > hi) { if (e.target.id === 'tmin') { hi = lo; $('tmax').value = hi; } else { lo = hi; $('tmin').value = lo; } }
      F.tmin = lo === LEN_MIN ? '' : String(lo); F.tmax = hi === LEN_MAX ? '' : String(hi);
      syncLength();
      if (dragging) { moved = true; return; }
      clearTimeout(pending); pending = setTimeout(() => { pending = 0; persist(); onChange(); }, 200);
    });
    document.querySelector('main').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.rm != null) { const [gi, pi] = d.rm.split(':').map(Number); removeFilter(activeFilters()[gi].parts[pi]); changed(); }
      else if (d.clearall) { clearAll(); changed(); }
      else if (d.resetcharts) { resetPage(); onChange(); }
      else if (onMain && onMain(d)) onChange();
    });
    $('stamp').textContent = (D.stamp.match(/Generated (\S+)/) || [])[1] ? 'sample of ' + fmtInt(D.games.length) + ' games \u00b7 ' + D.stamp.match(/Generated (\S+)/)[1].slice(0, 10) : '';
    // the games on the page: all of them, or a random share (?games= or ?pct= on the URL, data.js). Always in the
    // header, with a picker: a smaller share loads faster and a shared link can name one
    {
      const SUB = window.ZH_SUBSET, sub = D.subset, el = document.createElement('span'); el.className = 'subset';
      const shares = [50, 25, 10, 5, 1];
      const cur = sub ? sub.pct : 0, custom = sub && !shares.some(p => Math.abs(p - cur) < .05);
      const pctOf = p => p >= 10 ? String(Math.round(p)) : p >= 1 ? p.toFixed(1) : p.toFixed(2);
      el.innerHTML = (sub ? `random <b>${fmtInt(sub.n)}</b> of ${fmtInt(sub.total)} games \u00b7 seed ${sub.seed}` : `showing <b>all</b> ${fmtInt(SUB ? SUB.total : D.games.length)} games`)
        + ` <select class="share" title="how many of the games to load: a random share loads faster">`
        + `<option value="all"${sub ? '' : ' selected'}>all games</option>`
        + (custom ? `<option value="${cur}" selected>${pctOf(cur)}%</option>` : '')
        + shares.map(p => `<option value="${p}"${sub && Math.abs(p - cur) < .05 ? ' selected' : ''}>${p}%</option>`).join('') + `</select>`;
      $('stamp').prepend(el);
      el.querySelector('.share').addEventListener('change', e => { const v = e.target.value; if (v === 'all') { if (sub) SUB.clear(); } else if (!sub || Math.abs(+v - cur) >= .05) SUB.set(+v); });
      if (sub) document.querySelectorAll('header nav a, header h1 a').forEach(a => a.setAttribute('href', SUB.link(a.getAttribute('href'))));   // the other pages open on the same draw
    }
    renderRail();
    onChange();
    // first paint is done: drop the veil, and raise it again on the way to another page - unless the page's first
    // render runs a pass in slices (opts.keepVeil): it drops the veil itself when the cards are drawn (veilDown)
    bindExport();
    if (!(opts && opts.keepVeil)) veilDown();
    const here = document.querySelector('header nav a[aria-current]').getAttribute('href');
    document.querySelectorAll('header nav a, header h1 a, a.xref').forEach(a => a.addEventListener('click', e => {   // a.xref: a card's link to another page's card
      const to = a.getAttribute('href').split('#')[0];
      if (to === here) { if (!a.hash) e.preventDefault(); return; }   // the page's own tab does nothing - no reload (the user, 2026-09-14); a link to one of its cards still jumps there
      try { for (const k of Object.keys(sessionStorage)) if (/^zh-filters-/.test(k)) sessionStorage.removeItem(k); } catch (e) { /* no storage */ }   // the next page opens blank
      const name = document.querySelector(`header nav a[href="${to}"]`).textContent.toLowerCase();
      const v = document.createElement('div'); v.className = 'loading'; v.id = 'loading';
      v.innerHTML = `<div class="disp">ZERO HOUR <span>STATS</span></div><div class="spin"></div><div class="msg">loading ${esc(name)}\u2026</div>`;
      document.body.appendChild(v);
      // same text as the next page's veil, and the spinner's phase is wall-clock time
      // there too, so the hand-over between documents reads as one spinner
      v.querySelector('.spin').style.animationDelay = -(Date.now() % 800) + 'ms';
    }));
  }

  // --- work in slices ---------------------------------------------------------
  // a heavy pass (describing every seat, reading every seat's opening) runs in slices between tasks off a message
  // port - a paint fits between them and a hidden tab does not clamp them the way it clamps timers - with a strip
  // along the bottom saying what is being done and how far it is. chunked(n, step, opts): step(i0, i1) does that
  // range, the slices sized to ~40 ms by what the last one took; resolves when done, or with false when cancelled
  // (opts.token: a function that says whether the job is still wanted - a later click supersedes it)
  const port = new MessageChannel(), tasks = [];
  port.port1.onmessage = () => { const fn = tasks.shift(); if (fn) fn(); };
  const later = fn => { tasks.push(fn); port.port2.postMessage(0); };
  const task = () => new Promise(later);
  async function chunked(n, step, opts) {
    const o = opts || {}, want = o.token || (() => true), SLICE = o.ms || 40;
    let i = 0, size = o.first || 2000;
    while (i < n) {
      if (!want()) return false;
      const t0 = performance.now(), i1 = Math.min(n, i + size);
      step(i, i1); i = i1;
      const dt = performance.now() - t0;
      size = Math.max(200, Math.min(n, Math.round(size * (dt > 1 ? SLICE / dt : 4))));
      if (o.at) o.at(i / n);
      if (i < n) await task();
    }
    return true;
  }
  // the strip: working(label) shows it, workingAt(frac) fills its bar, working(null) takes it away
  function working(label) {
    let el = $('working');
    if (!el) { el = document.createElement('div'); el.id = 'working'; el.innerHTML = '<span class="spin"></span><span class="msg"></span><span class="prog"><i></i></span>'; document.body.appendChild(el); }
    el.hidden = !label;
    document.body.classList.toggle('working', !!label);   // the cards dim: what they show is the state before the click
    if (label) { el.querySelector('.msg').textContent = label; el.querySelector('.prog i').style.width = '0%'; }
  }
  function workingAt(f) { const el = $('working'); if (el && !el.hidden) el.querySelector('.prog i').style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + '%'; }

  // the one progress element of the app: a spinner, what is happening, and how far when that is known.
  // progressHTML makes it, progressSet updates every one under root (the tickers call it)
  const progressHTML = (label, frac) => `<span class="progress"><i class="spin"></i><span class="msg">${esc(label)}</span>${frac == null ? '' : `<b class="pct">${Math.round(frac * 100)}%</b>`}</span>`;
  function progressSet(root, label, frac) {
    for (const p of root.querySelectorAll('.progress')) {
      p.querySelector('.msg').textContent = label;
      let b = p.querySelector('.pct');
      if (frac == null) { if (b) b.remove(); continue; }
      if (!b) { b = document.createElement('b'); b.className = 'pct'; p.appendChild(b); }
      b.textContent = Math.round(frac * 100) + '%';
    }
  }
  function veilDown() {
    const veil = $('loading');
    if (veil) setTimeout(() => veil.remove(), 0);   // not rAF: it stalls in a hidden tab
    if (window.performance && performance.mark) performance.mark('zh-ready');   // first paint done: performance.getEntriesByName('zh-ready')
  }

  // --- tooltip --------------------------------------------------------------
  function moveTip(e) {
    const tip = $('tip'); const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { $('tip').hidden = true; }
  function showTip(e, html) { const tip = $('tip'); tip.innerHTML = html; tip.hidden = false; moveTip(e); }
  // attach a hover tooltip to every .row-like element under root; html(el) builds it
  function tips(root, selector, html) {
    root.querySelectorAll(selector).forEach(el => {
      el.addEventListener('mouseenter', e => showTip(e, html(el)));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });
  }

  const api = {
    D, F, CLASSES, CLS_INDEX, CLS_COLOR, SIDES, FACS, SOURCES, EVENTS, MAPS, ELO, eloBucket, eloId, HIGH_ELO, LOW_ELO, highLevel, lowLevel, LEVELS, MERGE,
    LEN_MIN, LEN_MAX, TOTAL_PG, CASH, cashKey, FMTS, shortName, NICK, searchText, searchHit,
    PLAYERS, PLAYER_BY_ID, pidOf, keyOf, opposition, mask, maskKey: () => (mask(), maskKey), maskDefault, M_SEAT, M_POP, M_MATCH, M_RESULT, M_FACET, M_ALL, inSample, captured, showCaptured, loadPage: loadPageState, persistPage,
    $, esc, fmtPct, fmtPct1, fmtInt, fmtMoney, fmtMoneyK, fmtCash, fmtPts, wilson, quant, select, mean,
    chip, seg, facet, renderRail, renderActive, bind, tips, showTip, moveTip, hideTip, exportCard, exportPdf,
    mapFacetControls, mapFacetHit, mapFacetAct, mapFacts, facetCount, mapHit, onMapFacet: null,   // the map narrowing, for a page that draws it too (the map card's pick)
    later, task, chunked, working, workingAt, memo, veilDown, progressHTML, progressSet,
  };
  window.ZH = api;
  if (window.performance && performance.mark) performance.mark('zh-indexed');   // seats and templates precomputed
  await L.step('drawing\u2026', .94);
  return api;
});
